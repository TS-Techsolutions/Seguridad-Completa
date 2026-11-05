import { useRef, useState, type ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronRight, Download, Eye, FileSpreadsheet, Play, Save, Trash2, UploadCloud, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { api } from './api'
import { readAdvanceTypes } from './advance-types-store'
import type { CustomerRow } from './CustomerRegistryPage'
import { ensureCustomerAdvances, saveCustomerAdvances, type CustomerAdvanceRecord } from './customer-advance-records'
import { ensureCustomerReceivables, saveCustomerReceivables, type CustomerReceivableRecord } from './customer-receivables'
import { formatFullDateInput } from './date-input'
import { downloadEditableImport } from './editable-import-download'
import { appendIssuedExpenses, readIssuedExpenses, removeIssuedExpensesBySourceUpload, type IssuedExpenseRecord } from './expense-records'
import { cleanTextSpacing, comparableText } from './text-values'
import type { Context, ScreenSpec } from './types'

type UploadStatus = 'PENDIENTE' | 'PROCESADO' | 'ELIMINADO'
type ImportMode = 'ADVANCE' | 'RECEIVABLE'
type AdvanceColumn = (typeof expectedColumns)[number]
type AdvanceValues = Record<AdvanceColumn, string>
type AdvanceRow = { sourceRow: number; values: AdvanceValues; issues: string[] }
type UploadRecord = { id: string; description: string; fileName: string; loadedAt: string; user: string; status: UploadStatus; reviewed: boolean; rows: AdvanceRow[] }

const customerKey = 'saga.customers'
const expectedColumns = ['DOCUMENTO', 'FECHA FORMATO (DD/MM/AAAA)', 'RUC_CODIGO', 'CLIENTE', 'TOTAL', 'COMENTARIO'] as const
const requiredColumns: AdvanceColumn[] = ['DOCUMENTO', 'FECHA FORMATO (DD/MM/AAAA)', 'RUC_CODIGO', 'CLIENTE', 'TOTAL']

function normalize(value: unknown) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() }
function text(value: unknown) { return String(value ?? '').replace(/\uFFFD/g, '').trim().replace(/\.0$/, '') }
function readJson<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback } }
function uploadsKey(companyId: string, mode: ImportMode) { return `saga.cxc.${mode === 'ADVANCE' ? 'customer-advance' : 'customer-aging'}-import.uploads:${companyId}` }
function persistUploads(companyId: string, mode: ImportMode, records: UploadRecord[], setter: (value: UploadRecord[]) => void) { setter(records); localStorage.setItem(uploadsKey(companyId, mode), JSON.stringify(records)) }

function dateText(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}/${value.getFullYear()}`
  const raw = text(value)
  const match = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/.exec(raw)
  if (!match) return raw
  const day = Number(match[1]); const month = Number(match[2]); const year = match[3].length === 2 ? (Number(match[3]) <= 69 ? 2000 : 1900) + Number(match[3]) : Number(match[3])
  const parsed = new Date(year, month - 1, day)
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return raw
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

function validDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return false
  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
  return parsed.getFullYear() === Number(match[3]) && parsed.getMonth() === Number(match[2]) - 1 && parsed.getDate() === Number(match[1])
}

function amountText(value: unknown) { const raw = text(value).replace(/\s/g, '').replace(',', '.'); const parsed = Number(raw); return Number.isFinite(parsed) ? parsed.toFixed(2) : raw }

function parseWorkbook(file: File): Promise<AdvanceRow[]> {
  return file.arrayBuffer().then(buffer => {
    const workbook = XLSX.read(buffer, { type: 'array', raw: true, cellDates: true })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!firstSheet) throw new Error('El archivo no contiene hojas para procesar.')
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: '', raw: true, blankrows: false })
    const headerRow = matrix.findIndex(row => normalize(row[0]) === 'DOCUMENTO')
    if (headerRow < 0) throw new Error('No se encontró la columna DOCUMENTO en la plantilla.')
    const header = matrix[headerRow]
    const indexes = Object.fromEntries(expectedColumns.map(column => [column, header.findIndex(cell => normalize(cell) === normalize(column))])) as Record<AdvanceColumn, number>
    const missing = requiredColumns.filter(column => indexes[column] < 0)
    if (missing.length) throw new Error(`Faltan columnas obligatorias: ${missing.join(', ')}.`)
    const sheetStartRow = firstSheet['!ref'] ? XLSX.utils.decode_range(firstSheet['!ref']).s.r : 0
    return matrix.slice(headerRow + 1).map((row, index) => {
      const values = Object.fromEntries(expectedColumns.map(column => {
        const raw = indexes[column] < 0 ? '' : row[indexes[column]]
        if (column === 'FECHA FORMATO (DD/MM/AAAA)') return [column, dateText(raw)]
        if (column === 'TOTAL') return [column, amountText(raw)]
        return [column, text(raw)]
      })) as AdvanceValues
      return { sourceRow: sheetStartRow + headerRow + index + 2, values, issues: [] }
    }).filter(row => expectedColumns.some(column => row.values[column]))
  })
}

function activeCustomers() { return readJson<CustomerRow[]>(customerKey, []).filter(row => row.state === 'ACTIVO') }
function customerFor(row: AdvanceRow) { const identification = normalize(row.values.RUC_CODIGO); return activeCustomers().find(customer => normalize(customer.identification) === identification) }

function validateRows(companyId: string, rows: AdvanceRow[], mode: ImportMode, excludedUploadId?: string) {
  const customers = activeCustomers()
  const existingDocuments = new Set((mode === 'ADVANCE'
    ? ensureCustomerAdvances(companyId).filter(record => record.sourceUploadId !== excludedUploadId).map(record => record.sourceDocument ?? '')
    : readIssuedExpenses(companyId).filter(record => record.sourceUploadId !== excludedUploadId).map(record => record.sourceDocument ?? record.receiptNumber))
    .map(normalize).filter(Boolean))
  const documentCounts = rows.reduce<Record<string, number>>((result, row) => { const key = normalize(row.values.DOCUMENTO); if (key) result[key] = (result[key] ?? 0) + 1; return result }, {})
  return rows.map(row => {
    const values = row.values; const issues: string[] = []; const document = normalize(values.DOCUMENTO); const identification = normalize(values.RUC_CODIGO)
    const customer = customers.find(item => normalize(item.identification) === identification); const amountPattern = /^\d+(?:\.\d{1,2})?$/; const amount = Number(values.TOTAL)
    if (!values.DOCUMENTO) issues.push('Documento obligatorio')
    if (document && documentCounts[document] > 1) issues.push('Documento repetido dentro del archivo')
    if (document && existingDocuments.has(document)) issues.push('El documento ya fue procesado en otra carga')
    if (!validDate(values['FECHA FORMATO (DD/MM/AAAA)'])) issues.push('Fecha inválida; utiliza DD/MM/AAAA')
    if (!values.RUC_CODIGO) issues.push('RUC_CODIGO obligatorio')
    if (!values.CLIENTE) issues.push('Cliente obligatorio')
    if (!customer) issues.push('La identificación no corresponde a un cliente activo registrado')
    if (customer && comparableText(customer.businessName) !== comparableText(values.CLIENTE)) issues.push('El nombre del cliente no coincide con la identificación registrada')
    if (!amountPattern.test(values.TOTAL) || !Number.isFinite(amount) || amount <= 0) issues.push('Total obligatorio, mayor a cero y con máximo dos decimales')
    return { ...row, issues: [...new Set(issues)] }
  })
}

function displayDate(value: string) { return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }

function advanceRecord(row: AdvanceRow, upload: UploadRecord, context: Context): CustomerAdvanceRecord {
  const customer = customerFor(row); const configuredTypes = readAdvanceTypes().filter(type => type.state === 'ACTIVO'); const singleType = configuredTypes.length === 1 ? configuredTypes[0] : undefined
  const document = row.values.DOCUMENTO.trim(); const amount = Number(row.values.TOTAL)
  return { id: `advance-import:${upload.id}:${row.sourceRow}`, companyId: context.company.id, collectionId: '', collectionNumber: '', issueDate: row.values['FECHA FORMATO (DD/MM/AAAA)'], sourceValueId: `import:${document}`, typeId: singleType?.id ?? '', typeName: singleType?.type ?? 'Anticipo cargado', customerId: customer?.id ?? '', customerName: customer?.businessName ?? cleanTextSpacing(row.values.CLIENTE), description: cleanTextSpacing(row.values.COMENTARIO) || `Anticipo histórico ${document}`, originalAmount: Number(amount.toFixed(2)), balance: Number(amount.toFixed(2)), status: 'ACTIVO', createdAt: upload.loadedAt, sourceUploadId: upload.id, sourceDocument: document }
}

function importedExpense(row: AdvanceRow, upload: UploadRecord, context: Context): IssuedExpenseRecord {
  const customer = customerFor(row); const document = row.values.DOCUMENTO.trim(); const amount = Number(row.values.TOTAL)
  const [, month, year] = row.values['FECHA FORMATO (DD/MM/AAAA)'].split('/')
  const detail = cleanTextSpacing(row.values.COMENTARIO) || `Cartera histórica ${document}`
  return {
    id: `receivable-import:${upload.id}:${row.sourceRow}`,
    companyId: context.company.id,
    month,
    year,
    issueDate: row.values['FECHA FORMATO (DD/MM/AAAA)'],
    receiptNumber: document,
    identification: customer?.identification ?? row.values.RUC_CODIGO.trim(),
    businessName: customer?.businessName ?? cleanTextSpacing(row.values.CLIENTE),
    address: customer?.address ?? '',
    phone: customer?.phone ?? '',
    email: customer?.email ?? '',
    expenseType: 'ORDINARIA',
    generationType: 'INDIVIDUAL',
    total: Number(amount.toFixed(2)),
    pdfFileName: '',
    createdAt: upload.loadedAt,
    status: 'VIGENTE',
    sourceUploadId: upload.id,
    sourceDocument: document,
    importedReceivable: true,
    lines: [{ id: `receivable-line:${upload.id}:${row.sourceRow}`, propertyId: '', propertyDescription: '', itemId: '', itemDescription: detail, conceptText: detail, valueMode: 'FIJO', squareMeters: null, quantity: 1, unitPrice: Number(amount.toFixed(2)), total: Number(amount.toFixed(2)) }],
  }
}

function importedReceivable(expense: IssuedExpenseRecord, upload: UploadRecord, customer: CustomerRow | undefined): CustomerReceivableRecord {
  return {
    id: `receivable-balance:${expense.id}`,
    expenseId: expense.id,
    receiptNumber: expense.receiptNumber,
    customerId: customer?.id,
    identification: expense.identification,
    businessName: expense.businessName,
    issueDate: expense.issueDate,
    originalAmount: expense.total,
    balance: expense.total,
    collectedAmount: 0,
    status: 'PENDIENTE',
    appliedCollectionIds: [],
    createdAt: upload.loadedAt,
    updatedAt: upload.loadedAt,
    sourceUploadId: upload.id,
    sourceDocument: expense.sourceDocument,
  }
}

export function CustomerAdvanceImportPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <CustomerAdvanceImportManager key={context.data.company.id} screen={screen} context={context.data} mode="ADVANCE" />
}

export function CustomerReceivableImportPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <CustomerAdvanceImportManager key={context.data.company.id} screen={screen} context={context.data} mode="RECEIVABLE" />
}

function CustomerAdvanceImportManager({ screen, context, mode }: { screen: ScreenSpec; context: Context; mode: ImportMode }) {
  const companyId = context.company.id; const fileInput = useRef<HTMLInputElement>(null)
  const loadSubject = mode === 'ADVANCE' ? 'Anticipos de Clientes' : 'Antigüedad de Cartera'
  const [uploads, setUploads] = useState<UploadRecord[]>(() => readJson(uploadsKey(companyId, mode), [])); const [description, setDescription] = useState(''); const [file, setFile] = useState<File | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null); const [previewRows, setPreviewRows] = useState<AdvanceRow[]>([]); const [previewDirty, setPreviewDirty] = useState(false); const [previewMessage, setPreviewMessage] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('')
  const selectedPreview = uploads.find(record => record.id === previewId); const selectedDelete = uploads.find(record => record.id === deleteId)
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => { setFile(event.target.files?.[0] ?? null); setError(''); setMessage('') }
  const upload = async () => {
    if (!description.trim()) { setMessage(''); setError('Ingresa la descripción del archivo.'); return }
    if (!file) { setMessage(''); setError(`Selecciona el archivo de ${loadSubject}.`); return }
    setBusy(true)
    try {
      const parsed = await parseWorkbook(file); if (!parsed.length) throw new Error('El archivo no contiene anticipos para cargar.')
      const record: UploadRecord = { id: crypto.randomUUID(), description: description.trim(), fileName: file.name, loadedAt: new Date().toISOString(), user: context.actor.name, status: 'PENDIENTE', reviewed: false, rows: validateRows(companyId, parsed, mode) }
      persistUploads(companyId, mode, [record, ...uploads], setUploads); setDescription(''); setFile(null); if (fileInput.current) fileInput.current.value = ''
      setError(''); setMessage('Archivo cargado con estado PENDIENTE. Revísalo con la lupa antes de procesarlo.')
    } catch (uploadError) { setMessage(''); setError(uploadError instanceof Error ? uploadError.message : 'No se pudo leer el archivo.') } finally { setBusy(false) }
  }
  const openPreview = (record: UploadRecord) => {
    if (record.status === 'ELIMINADO') return
    const rows = validateRows(companyId, record.rows, mode, record.id); persistUploads(companyId, mode, uploads.map(item => item.id === record.id ? { ...item, reviewed: true, rows } : item), setUploads)
    setPreviewRows(rows); setPreviewDirty(false); setPreviewMessage(''); setPreviewId(record.id); setError(''); setMessage('')
  }
  const updatePreviewCell = (sourceRow: number, column: AdvanceColumn, value: string) => {
    if (!selectedPreview || selectedPreview.status !== 'PENDIENTE') return
    let cleanValue = text(value); if (column === 'FECHA FORMATO (DD/MM/AAAA)') cleanValue = formatFullDateInput(value); if (column === 'TOTAL') cleanValue = value.replace(',', '.').replace(/[^\d.]/g, '')
    const edited = previewRows.map(row => row.sourceRow === sourceRow ? { ...row, values: { ...row.values, [column]: cleanValue } } : row)
    setPreviewRows(validateRows(companyId, edited, mode, selectedPreview.id)); setPreviewDirty(true); setPreviewMessage('')
  }
  const savePreviewChanges = () => {
    if (!selectedPreview || selectedPreview.status !== 'PENDIENTE') return
    const rows = validateRows(companyId, previewRows, mode, selectedPreview.id); const issueCount = rows.filter(row => row.issues.length).length
    persistUploads(companyId, mode, uploads.map(item => item.id === selectedPreview.id ? { ...item, reviewed: true, rows } : item), setUploads); setPreviewRows(rows); setPreviewDirty(false)
    setPreviewMessage(issueCount ? `Cambios guardados. Aún existen ${issueCount} filas con inconsistencias.` : 'Cambios guardados. El archivo está listo para procesarse.')
  }
  const process = (record: UploadRecord) => {
    if (record.status !== 'PENDIENTE') return
    if (!record.reviewed) { setMessage(''); setError('Primero revisa la información con el ícono de la lupa.'); return }
    const rows = validateRows(companyId, record.rows, mode, record.id); const issueCount = rows.filter(row => row.issues.length).length
    if (issueCount) { persistUploads(companyId, mode, uploads.map(item => item.id === record.id ? { ...item, rows } : item), setUploads); setMessage(''); setError(`No se puede procesar: existen ${issueCount} filas con inconsistencias.`); return }
    if (mode === 'ADVANCE') {
      const current = ensureCustomerAdvances(companyId).filter(item => item.sourceUploadId !== record.id); const imported = rows.map(row => advanceRecord(row, { ...record, rows }, context))
      saveCustomerAdvances(companyId, [...imported, ...current]); setMessage(`${imported.length} anticipos de clientes quedaron disponibles y pendientes de cruzar.`)
    } else {
      const currentReceivables = ensureCustomerReceivables(companyId).filter(item => item.sourceUploadId !== record.id)
      removeIssuedExpensesBySourceUpload(companyId, record.id)
      const expenses = rows.map(row => importedExpense(row, { ...record, rows }, context)); appendIssuedExpenses(companyId, expenses)
      const receivables = expenses.map((expense, index) => importedReceivable(expense, { ...record, rows }, customerFor(rows[index])))
      saveCustomerReceivables(companyId, [...receivables, ...currentReceivables]); setMessage(`${receivables.length} obligaciones quedaron registradas como cartera pendiente de cancelar.`)
    }
    persistUploads(companyId, mode, uploads.map(item => item.id === record.id ? { ...item, rows, status: 'PROCESADO' as const } : item), setUploads); setError('')
  }
  const confirmDelete = () => {
    if (!selectedDelete) return
    if (mode === 'ADVANCE') saveCustomerAdvances(companyId, ensureCustomerAdvances(companyId).filter(item => item.sourceUploadId !== selectedDelete.id))
    else { saveCustomerReceivables(companyId, ensureCustomerReceivables(companyId).filter(item => item.sourceUploadId !== selectedDelete.id)); removeIssuedExpensesBySourceUpload(companyId, selectedDelete.id) }
    persistUploads(companyId, mode, uploads.map(item => item.id === selectedDelete.id ? { ...item, status: 'ELIMINADO' as const, reviewed: false, rows: [] } : item), setUploads)
    setDeleteId(null); setPreviewId(current => current === selectedDelete.id ? null : current); setError(''); setMessage(mode === 'ADVANCE' ? 'El archivo y todos los anticipos de clientes que incorporó fueron eliminados.' : 'El archivo y toda la cartera pendiente que incorporó fueron eliminados.')
  }
  return <div className="page screen-page account-migration-page contact-import-page customer-advance-import-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header account-migration-header"><div><div className="screen-id"><span>{screen.id}</span><b>Cuentas por Cobrar</b></div><h1>{screen.titulo_original}</h1></div><a className="primary-action account-example-download" href="/Ejemplo%20Anticipo%20Clientes.xlsx" download="Ejemplo Anticipo Clientes.xlsx"><Download />Descargar Plantilla</a></section>
    <section className="account-upload-box"><div className="account-upload-fields"><label><span>Descripción</span><input value={description} onChange={event => { setDescription(event.target.value); setError(''); setMessage('') }} maxLength={160} placeholder="Identifica el origen o propósito de la carga" /></label><label className={`account-file-picker ${file ? 'selected' : ''}`}><input ref={fileInput} type="file" accept=".xls,.xlsx,.csv" onChange={chooseFile} />{file ? <FileSpreadsheet /> : <UploadCloud />}<span><strong>{file ? file.name : `Adjuntar archivo de ${loadSubject}`}</strong><small>{file ? 'Haz clic para reemplazar el archivo' : 'Archivos XLS, XLSX o CSV'}</small></span></label></div><button type="button" className="primary-action" onClick={upload} disabled={busy}><UploadCloud />{busy ? 'Validando…' : 'Cargar archivo'}</button></section>
    {error && <div className="account-migration-feedback error" role="alert"><AlertTriangle />{error}</div>}{message && <div className="account-migration-feedback success" role="status"><CheckCircle2 />{message}</div>}
    <section className="account-files-box"><h2>Archivos Cargados</h2><div className="account-files-scroll"><table><thead><tr><th>Descripción</th><th>Archivo</th><th>Fecha</th><th>Usuario</th><th>Estado</th><th aria-label="Revisar" /><th aria-label="Descargar" /><th aria-label="Procesar" /><th aria-label="Eliminar" /></tr></thead><tbody>{uploads.map(record => <tr key={record.id}><td><strong>{record.description}</strong></td><td>{record.fileName}</td><td>{displayDate(record.loadedAt)}</td><td>{record.user}</td><td><span className={`account-upload-status ${record.status.toLowerCase()}`}>{record.status}</span></td><td><button type="button" className="account-row-action inspect" disabled={record.status === 'ELIMINADO'} title="Revisar y editar información" onClick={() => openPreview(record)}><Eye /></button></td><td><button type="button" className="account-row-action download" disabled={record.status === 'ELIMINADO'} title="Descargar archivo revisado" onClick={() => downloadEditableImport(record.fileName, expectedColumns, record.rows)}><Download /></button></td><td><button type="button" className="account-row-action process" disabled={record.status !== 'PENDIENTE'} title="Procesar información" onClick={() => process(record)}><Play /></button></td><td><button type="button" className="account-row-action delete" disabled={record.status === 'ELIMINADO'} title="Eliminar carga" onClick={() => setDeleteId(record.id)}><Trash2 /></button></td></tr>)}{!uploads.length && <tr><td colSpan={9} className="account-files-empty">No existen archivos cargados.</td></tr>}</tbody></table></div></section>
    {selectedPreview && <div className="account-preview-backdrop" role="dialog" aria-modal="true"><section className="account-preview-modal contact-preview-modal"><header><div><span>Revisión del archivo</span><h2>{selectedPreview.fileName}</h2><p>{previewRows.length} filas · {previewRows.filter(row => row.issues.length).length} con inconsistencias</p></div><button type="button" aria-label="Cerrar revisión" onClick={() => setPreviewId(null)}><X /></button></header>{previewRows.some(row => row.issues.length) && <div className="account-preview-note"><AlertTriangle />Se encontraron {previewRows.filter(row => row.issues.length).length} filas con inconsistencias. Edita directamente las celdas marcadas en color naranja antes de procesar.</div>}<div className="account-preview-grid"><table><thead><tr><th>Fila</th>{expectedColumns.map(column => <th key={column}>{column}</th>)}<th>Observaciones</th></tr></thead><tbody>{previewRows.map(row => <tr key={row.sourceRow} className={row.issues.length ? 'has-issues' : ''}><td>{row.sourceRow}</td>{expectedColumns.map(column => <td key={column}>{selectedPreview.status === 'PENDIENTE' ? <input aria-label={`${column} fila ${row.sourceRow}`} value={row.values[column]} inputMode={column === 'TOTAL' ? 'decimal' : column === 'FECHA FORMATO (DD/MM/AAAA)' ? 'numeric' : 'text'} maxLength={column === 'FECHA FORMATO (DD/MM/AAAA)' ? 10 : undefined} onChange={event => updatePreviewCell(row.sourceRow, column, event.target.value)} onBlur={() => { if (column === 'TOTAL' && Number(row.values.TOTAL) > 0) updatePreviewCell(row.sourceRow, column, Number(row.values.TOTAL).toFixed(2)) }} /> : row.values[column] || '—'}</td>)}<td>{row.issues.length ? row.issues.join(' · ') : 'Correcto'}</td></tr>)}</tbody></table></div><footer><div className={`account-preview-save-state ${previewRows.some(row => row.issues.length) ? 'warning' : 'ready'}`}>{previewMessage || (previewDirty ? 'Existen cambios sin guardar.' : previewRows.some(row => row.issues.length) ? 'Corrige las inconsistencias y guarda los cambios.' : 'La información está validada.')}</div><button type="button" className="quiet-button" onClick={() => setPreviewId(null)}>Cerrar</button>{selectedPreview.status === 'PENDIENTE' && <button type="button" className="quiet-button account-save-changes" disabled={!previewDirty} onClick={savePreviewChanges}><Save />Guardar cambios</button>}{selectedPreview.status === 'PENDIENTE' && <button type="button" className="primary-action" disabled={previewDirty || previewRows.some(row => row.issues.length)} onClick={() => { setPreviewId(null); process(selectedPreview) }}><Play />Procesar información</button>}</footer></section></div>}
    {selectedDelete && <div className="account-delete-backdrop" role="alertdialog" aria-modal="true"><section className="account-delete-modal"><span><AlertTriangle /></span><h2>¿Eliminar el archivo cargado?</h2><p>Se eliminará <strong>{selectedDelete.fileName}</strong> y {mode === 'ADVANCE' ? 'todos los anticipos de clientes' : 'toda la cartera pendiente'} que este documento haya incorporado.</p><div><button type="button" className="quiet-button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger-action" onClick={confirmDelete}><Trash2 />Sí, eliminar</button></div></section></div>}
  </div>
}
