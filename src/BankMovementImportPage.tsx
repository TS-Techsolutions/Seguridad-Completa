import { useRef, useState, type ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronRight, Download, Eye, FileSpreadsheet, Play, Save, Trash2, UploadCloud, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { api } from './api'
import { readAuthorizedCollections, readCollectionDrafts, saveCollectionDrafts, type CollectionDraft, type CollectionDraftPayload } from './collection-records'
import { formatFullDateInput } from './date-input'
import { downloadEditableImport } from './editable-import-download'
import type { Context, ScreenSpec } from './types'

type UploadStatus = 'PENDIENTE' | 'PROCESADO' | 'ELIMINADO'
type BankMovementColumn = (typeof expectedColumns)[number]
type BankMovementValues = Record<BankMovementColumn, string>
type BankMovementRow = { sourceRow: number; values: BankMovementValues; issues: string[] }
type UploadRecord = {
  id: string
  description: string
  fileName: string
  loadedAt: string
  user: string
  status: UploadStatus
  reviewed: boolean
  rows: BankMovementRow[]
}
type BankMovementRecord = {
  id: string
  companyId: string
  processDate: string
  transaction: 'DEPOSITO' | 'TRANSFERENCIA'
  total: number
  reference: string
  sourceUploadId: string
  createdAt: string
}

const expectedColumns = ['FECHA PROCESO (DD/MM/AAAA)', 'TRANSACCIÓN', 'TOTAL', 'REFERENCIA'] as const

function uploadsKey(companyId: string) { return `saga.bank-movement-import.uploads:${companyId}` }
function recordsKey(companyId: string) { return `saga.bank-movement-import.records:${companyId}` }
function normalize(value: unknown) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() }
function text(value: unknown) { return String(value ?? '').replace(/\uFFFD/g, '').trim() }
function readJson<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback } }
function displayDate(value: string) { return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }

function transactionValue(value: unknown) {
  const normalized = normalize(value)
  if (normalized === 'DEPOSITO') return 'DEPOSITO'
  if (normalized === 'TRANSFERENCIA') return 'TRANSFERENCIA'
  return text(value).toUpperCase()
}

function dateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}/${value.getFullYear()}`
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) return `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${parsed.y}`
  }
  const raw = text(value)
  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(raw)
  if (iso) return `${iso[3].padStart(2, '0')}/${iso[2].padStart(2, '0')}/${iso[1]}`
  const display = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(raw)
  if (!display) return formatFullDateInput(raw)
  const year = display[3].length === 2 ? `20${display[3]}` : display[3]
  return `${display[1].padStart(2, '0')}/${display[2].padStart(2, '0')}/${year}`
}

function validDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return false
  const day = Number(match[1]); const month = Number(match[2]); const year = Number(match[3])
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function amountValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return text(value).replace(/\$/g, '').replace(/\s/g, '')
}

function parseAmount(value: string) {
  let normalized = amountValue(value)
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized.replace(/,/g, '')
  } else normalized = normalized.replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function tooManyDecimals(value: string) {
  const separator = Math.max(value.lastIndexOf('.'), value.lastIndexOf(','))
  return separator >= 0 && value.slice(separator + 1).replace(/\D/g, '').length > 2
}

function parseWorkbook(file: File): Promise<BankMovementRow[]> {
  return file.arrayBuffer().then(buffer => {
    const workbook = XLSX.read(buffer, { type: 'array', raw: true, cellDates: true })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!firstSheet) throw new Error('El archivo no contiene hojas para procesar.')
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: '', raw: true })
    const headerRow = matrix.findIndex(row => normalize(row[0]) === normalize(expectedColumns[0]))
    if (headerRow < 0) throw new Error(`No se encontró la columna ${expectedColumns[0]} en la primera columna de la plantilla.`)
    const header = matrix[headerRow]
    const indexes = Object.fromEntries(expectedColumns.map(column => [column, header.findIndex(cell => normalize(cell) === normalize(column))])) as Record<BankMovementColumn, number>
    const missing = expectedColumns.filter(column => indexes[column] < 0)
    if (missing.length) throw new Error(`Faltan columnas obligatorias: ${missing.join(', ')}.`)
    return matrix.slice(headerRow + 1).map((row, index) => {
      const values = {
        [expectedColumns[0]]: dateValue(row[indexes[expectedColumns[0]]]),
        TRANSACCIÓN: transactionValue(row[indexes.TRANSACCIÓN]),
        TOTAL: amountValue(row[indexes.TOTAL]),
        REFERENCIA: text(row[indexes.REFERENCIA]),
      } as BankMovementValues
      return { sourceRow: headerRow + index + 2, values, issues: [] }
    }).filter(row => expectedColumns.some(column => row.values[column]))
  })
}

function validateRows(companyId: string, rows: BankMovementRow[], excludedUploadId?: string) {
  const existing = readJson<BankMovementRecord[]>(recordsKey(companyId), []).filter(row => row.sourceUploadId !== excludedUploadId)
  const existingReferences = new Set(existing.map(row => `${row.transaction}:${normalize(row.reference)}`))
  const referenceCounts = rows.reduce<Record<string, number>>((result, row) => {
    const key = `${transactionValue(row.values.TRANSACCIÓN)}:${normalize(row.values.REFERENCIA)}`
    if (normalize(row.values.REFERENCIA)) result[key] = (result[key] ?? 0) + 1
    return result
  }, {})
  return rows.map(row => {
    const values = row.values
    const issues: string[] = []
    const transaction = transactionValue(values.TRANSACCIÓN)
    const referenceKey = `${transaction}:${normalize(values.REFERENCIA)}`
    const total = parseAmount(values.TOTAL)
    if (!values[expectedColumns[0]]) issues.push('Fecha Proceso obligatoria')
    else if (!validDate(values[expectedColumns[0]])) issues.push('Fecha Proceso inválida; utiliza DD/MM/AAAA')
    if (!['DEPOSITO', 'TRANSFERENCIA'].includes(transaction)) issues.push('Transacción esperada: DEPÓSITO o TRANSFERENCIA')
    if (!values.TOTAL) issues.push('Total obligatorio')
    else if (!Number.isFinite(total) || total <= 0) issues.push('Total debe ser un valor numérico mayor a cero')
    else if (tooManyDecimals(values.TOTAL)) issues.push('Total admite máximo 2 decimales')
    if (!values.REFERENCIA) issues.push('Referencia obligatoria')
    if (values.REFERENCIA && referenceCounts[referenceKey] > 1) issues.push('Referencia repetida para el mismo tipo de transacción dentro del archivo')
    if (values.REFERENCIA && existingReferences.has(referenceKey)) issues.push('La referencia ya fue procesada anteriormente')
    return { ...row, issues: [...new Set(issues)] }
  })
}

function registryRow(companyId: string, row: BankMovementRow, uploadId: string, createdAt: string): BankMovementRecord {
  return {
    id: crypto.randomUUID(), companyId, processDate: row.values[expectedColumns[0]], transaction: transactionValue(row.values.TRANSACCIÓN) as BankMovementRecord['transaction'],
    total: Number(parseAmount(row.values.TOTAL).toFixed(2)), reference: row.values.REFERENCIA.trim(), sourceUploadId: uploadId, createdAt,
  }
}

function nextCollectionSequence(companyId: string) {
  const sequences = [...readCollectionDrafts(companyId), ...readAuthorizedCollections(companyId)].map(record => Number(/(\d+)$/.exec(record.number)?.[1] ?? 0))
  return Math.max(0, ...sequences) + 1
}

function collectionDraftFromRow(companyId: string, row: BankMovementRow, uploadId: string, sequence: number, createdAt: string): CollectionDraft {
  const transaction = transactionValue(row.values.TRANSACCIÓN) as 'DEPOSITO' | 'TRANSFERENCIA'
  const reference = row.values.REFERENCIA.trim()
  const total = Number(parseAmount(row.values.TOTAL).toFixed(2))
  const payload: CollectionDraftPayload = {
    customerInput: '',
    detail: '',
    sendEmail: true,
    activeTab: 'VALUES',
    selectedObligationIds: [],
    obligationValues: {},
    advances: [],
    paymentMethods: [{
      id: crypto.randomUUID(),
      type: transaction,
      bank: '',
      accountNumber: '',
      checkNumber: '',
      holder: '',
      transactionNumber: transaction === 'TRANSFERENCIA' ? reference : '',
      detail: '',
      depositSlip: transaction === 'DEPOSITO' ? reference : '',
      cardType: 'DEBITO',
      cardNumber: '',
      voucherNumber: '',
      value: total.toFixed(2),
      saved: false,
    }],
    accountingLines: [],
  }
  return {
    id: crypto.randomUUID(),
    companyId,
    number: `REC-${String(sequence).padStart(6, '0')}`,
    issueDate: row.values[expectedColumns[0]],
    customerId: '',
    customerName: 'Cliente pendiente',
    total,
    status: 'GUARDADA',
    payload,
    createdAt,
    updatedAt: createdAt,
    sourceImportUploadId: uploadId,
    sourceImportRow: row.sourceRow,
  }
}

export function BankMovementImportPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <BankMovementImportManager key={context.data.company.id} screen={screen} context={context.data} />
}

function BankMovementImportManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const storageKey = uploadsKey(context.company.id)
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<UploadRecord[]>(() => readJson(storageKey, []))
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewRows, setPreviewRows] = useState<BankMovementRow[]>([])
  const [previewDirty, setPreviewDirty] = useState(false)
  const [previewMessage, setPreviewMessage] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const selectedPreview = uploads.find(record => record.id === previewId)
  const selectedDelete = uploads.find(record => record.id === deleteId)

  const persistUploads = (rows: UploadRecord[]) => { setUploads(rows); localStorage.setItem(storageKey, JSON.stringify(rows)) }
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => { setFile(event.target.files?.[0] ?? null); setError(''); setMessage('') }

  const upload = async () => {
    if (!description.trim()) { setMessage(''); setError('Ingresa la descripción del archivo.'); return }
    if (!file) { setMessage(''); setError('Selecciona el archivo de Depósitos/Transferencias.'); return }
    setBusy(true)
    try {
      const parsed = await parseWorkbook(file)
      if (!parsed.length) throw new Error('El archivo no contiene Depósitos o Transferencias para cargar.')
      const record: UploadRecord = {
        id: crypto.randomUUID(), description: description.trim(), fileName: file.name, loadedAt: new Date().toISOString(), user: context.actor.name,
        status: 'PENDIENTE', reviewed: false, rows: validateRows(context.company.id, parsed),
      }
      persistUploads([record, ...uploads]); setDescription(''); setFile(null)
      if (fileInput.current) fileInput.current.value = ''
      setError(''); setMessage('Archivo cargado con estado PENDIENTE. Revísalo con la lupa antes de procesarlo.')
    } catch (uploadError) {
      setMessage(''); setError(uploadError instanceof Error ? uploadError.message : 'No se pudo leer el archivo.')
    } finally { setBusy(false) }
  }

  const openPreview = (record: UploadRecord) => {
    if (record.status === 'ELIMINADO') return
    const rows = validateRows(context.company.id, record.rows, record.id)
    persistUploads(uploads.map(item => item.id === record.id ? { ...item, reviewed: true, rows } : item))
    setPreviewRows(rows); setPreviewDirty(false); setPreviewMessage(''); setPreviewId(record.id); setError(''); setMessage('')
  }

  const updatePreviewCell = (sourceRow: number, column: BankMovementColumn, value: string) => {
    if (!selectedPreview || selectedPreview.status !== 'PENDIENTE') return
    const cleanValue = column === expectedColumns[0] ? formatFullDateInput(value) : column === 'TRANSACCIÓN' ? transactionValue(value) : column === 'TOTAL' ? amountValue(value) : text(value)
    const edited = previewRows.map(row => row.sourceRow === sourceRow ? { ...row, values: { ...row.values, [column]: cleanValue } } : row)
    setPreviewRows(validateRows(context.company.id, edited, selectedPreview.id)); setPreviewDirty(true); setPreviewMessage('')
  }

  const savePreviewChanges = () => {
    if (!selectedPreview || selectedPreview.status !== 'PENDIENTE') return
    const rows = validateRows(context.company.id, previewRows, selectedPreview.id)
    const issueCount = rows.filter(row => row.issues.length).length
    persistUploads(uploads.map(item => item.id === selectedPreview.id ? { ...item, reviewed: true, rows } : item))
    setPreviewRows(rows); setPreviewDirty(false)
    setPreviewMessage(issueCount ? `Cambios guardados. Aún existen ${issueCount} filas con inconsistencias.` : 'Cambios guardados. El archivo está listo para procesarse.')
  }

  const process = (record: UploadRecord) => {
    if (record.status !== 'PENDIENTE') return
    if (!record.reviewed) { setMessage(''); setError('Primero revisa la información con el ícono de la lupa.'); return }
    const rows = validateRows(context.company.id, record.rows, record.id)
    const issueCount = rows.filter(row => row.issues.length).length
    if (issueCount) { persistUploads(uploads.map(item => item.id === record.id ? { ...item, rows } : item)); setMessage(''); setError(`No se puede procesar: existen ${issueCount} filas con inconsistencias.`); return }
    const current = readJson<BankMovementRecord[]>(recordsKey(context.company.id), []).filter(row => row.sourceUploadId !== record.id)
    const createdAt = new Date().toISOString()
    const imported = rows.map(row => registryRow(context.company.id, row, record.id, createdAt))
    const currentDrafts = readCollectionDrafts(context.company.id).filter(draft => draft.sourceImportUploadId !== record.id)
    const firstSequence = nextCollectionSequence(context.company.id)
    const importedDrafts = rows.map((row, index) => collectionDraftFromRow(context.company.id, row, record.id, firstSequence + index, createdAt))
    localStorage.setItem(recordsKey(context.company.id), JSON.stringify([...imported, ...current]))
    saveCollectionDrafts(context.company.id, [...importedDrafts, ...currentDrafts])
    persistUploads(uploads.map(item => item.id === record.id ? { ...item, rows, status: 'PROCESADO' as const } : item))
    setError(''); setMessage(`${imported.length} movimientos bancarios fueron procesados y generaron ${importedDrafts.length} Recaudaciones pendientes de completar.`)
  }

  const confirmDelete = () => {
    if (!selectedDelete) return
    localStorage.setItem(recordsKey(context.company.id), JSON.stringify(readJson<BankMovementRecord[]>(recordsKey(context.company.id), []).filter(row => row.sourceUploadId !== selectedDelete.id)))
    saveCollectionDrafts(context.company.id, readCollectionDrafts(context.company.id).filter(draft => draft.sourceImportUploadId !== selectedDelete.id))
    persistUploads(uploads.map(item => item.id === selectedDelete.id ? { ...item, status: 'ELIMINADO' as const, reviewed: false, rows: [] } : item))
    setDeleteId(null); setPreviewId(current => current === selectedDelete.id ? null : current); setError(''); setMessage('El archivo, sus movimientos bancarios y las Recaudaciones pendientes que creó fueron eliminados.')
  }

  return <div className="page screen-page account-migration-page contact-import-page bank-movement-import-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header account-migration-header"><div><div className="screen-id"><span>{screen.id}</span><b>Cuentas por Cobrar</b></div><h1>{screen.titulo_original}</h1></div><a className="primary-action account-example-download" href="/Ejemplo%20Deposito-Transferencia.xlsx" download="Ejemplo Deposito-Transferencia.xlsx"><Download />Descargar Plantilla</a></section>
    <section className="account-upload-box"><div className="account-upload-fields"><label><span>Descripción</span><input value={description} onChange={event => { setDescription(event.target.value); setError(''); setMessage('') }} maxLength={160} placeholder="Identifica el origen o propósito de la carga" /></label><label className={`account-file-picker ${file ? 'selected' : ''}`}><input ref={fileInput} type="file" accept=".xls,.xlsx,.csv" onChange={chooseFile} />{file ? <FileSpreadsheet /> : <UploadCloud />}<span><strong>{file ? file.name : 'Adjuntar archivo de Depósitos/Transferencias'}</strong><small>{file ? 'Haz clic para reemplazar el archivo' : 'Archivos XLS, XLSX o CSV'}</small></span></label></div><button type="button" className="primary-action" onClick={upload} disabled={busy}><UploadCloud />{busy ? 'Validando…' : 'Cargar archivo'}</button></section>
    {error && <div className="account-migration-feedback error" role="alert"><AlertTriangle />{error}</div>}
    {message && <div className="account-migration-feedback success" role="status"><CheckCircle2 />{message}</div>}
    <section className="account-files-box"><h2>Archivos Cargados</h2><div className="account-files-scroll"><table><thead><tr><th>Descripción</th><th>Archivo</th><th>Fecha</th><th>Usuario</th><th>Estado</th><th aria-label="Revisar" /><th aria-label="Descargar" /><th aria-label="Procesar" /><th aria-label="Eliminar" /></tr></thead><tbody>{uploads.map(record => <tr key={record.id}><td><strong>{record.description}</strong></td><td>{record.fileName}</td><td>{displayDate(record.loadedAt)}</td><td>{record.user}</td><td><span className={`account-upload-status ${record.status.toLowerCase()}`}>{record.status}</span></td><td><button type="button" className="account-row-action inspect" disabled={record.status === 'ELIMINADO'} title="Revisar y editar información" aria-label={`Revisar y editar ${record.fileName}`} onClick={() => openPreview(record)}><Eye /></button></td><td><button type="button" className="account-row-action download" disabled={record.status === 'ELIMINADO'} title="Descargar archivo con las correcciones guardadas" aria-label={`Descargar ${record.fileName}`} onClick={() => downloadEditableImport(record.fileName, expectedColumns, record.rows)}><Download /></button></td><td><button type="button" className="account-row-action process" disabled={record.status !== 'PENDIENTE'} title="Procesar información" aria-label={`Procesar ${record.fileName}`} onClick={() => process(record)}><Play /></button></td><td><button type="button" className="account-row-action delete" disabled={record.status === 'ELIMINADO'} title="Eliminar carga" aria-label={`Eliminar ${record.fileName}`} onClick={() => setDeleteId(record.id)}><Trash2 /></button></td></tr>)}{!uploads.length && <tr><td colSpan={9} className="account-files-empty">No existen archivos cargados.</td></tr>}</tbody></table></div></section>
    {selectedPreview && <div className="account-preview-backdrop" role="dialog" aria-modal="true" aria-label={`Revisión de ${selectedPreview.fileName}`}><section className="account-preview-modal contact-preview-modal"><header><div><span>Revisión del archivo</span><h2>{selectedPreview.fileName}</h2><p>{previewRows.length} filas · {previewRows.filter(row => row.issues.length).length} con inconsistencias</p></div><button type="button" aria-label="Cerrar revisión" onClick={() => setPreviewId(null)}><X /></button></header>{previewRows.some(row => row.issues.length) && <div className="account-preview-note"><AlertTriangle />Se encontraron {previewRows.filter(row => row.issues.length).length} filas con inconsistencias. Edita directamente las celdas marcadas en color naranja antes de procesar.</div>}<div className="account-preview-grid"><table><thead><tr><th>Fila</th>{expectedColumns.map(column => <th key={column}>{column}</th>)}<th>Observaciones</th></tr></thead><tbody>{previewRows.map(row => <tr key={row.sourceRow} className={row.issues.length ? 'has-issues' : ''}><td>{row.sourceRow}</td>{expectedColumns.map(column => <td key={column}>{selectedPreview.status === 'PENDIENTE' ? <BankMovementCellEditor column={column} row={row} onChange={value => updatePreviewCell(row.sourceRow, column, value)} /> : row.values[column] || '—'}</td>)}<td>{row.issues.length ? row.issues.join(' · ') : 'Correcto'}</td></tr>)}</tbody></table></div><footer><div className={`account-preview-save-state ${previewRows.some(row => row.issues.length) ? 'warning' : 'ready'}`}>{previewMessage || (previewDirty ? 'Existen cambios sin guardar.' : previewRows.some(row => row.issues.length) ? 'Corrige las inconsistencias y guarda los cambios.' : 'La información está validada.')}</div><button type="button" className="quiet-button" onClick={() => setPreviewId(null)}>Cerrar</button>{selectedPreview.status === 'PENDIENTE' && <button type="button" className="quiet-button account-save-changes" disabled={!previewDirty} onClick={savePreviewChanges}><Save />Guardar cambios</button>}{selectedPreview.status === 'PENDIENTE' && <button type="button" className="primary-action" disabled={previewDirty || previewRows.some(row => row.issues.length)} title={previewDirty ? 'Guarda los cambios antes de procesar.' : previewRows.some(row => row.issues.length) ? 'Corrige todas las inconsistencias antes de procesar.' : 'Procesar información'} onClick={() => { setPreviewId(null); process(selectedPreview) }}><Play />Procesar información</button>}</footer></section></div>}
    {selectedDelete && <div className="account-delete-backdrop" role="alertdialog" aria-modal="true" aria-label="Confirmar eliminación"><section className="account-delete-modal"><span><AlertTriangle /></span><h2>¿Eliminar el archivo cargado?</h2><p>Se eliminará <strong>{selectedDelete.fileName}</strong> y todos los Depósitos o Transferencias que este documento haya incorporado.</p><div><button type="button" className="quiet-button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger-action" onClick={confirmDelete}><Trash2 />Sí, eliminar</button></div></section></div>}
  </div>
}

function BankMovementCellEditor({ column, row, onChange }: { column: BankMovementColumn; row: BankMovementRow; onChange: (value: string) => void }) {
  const value = row.values[column]
  const label = `${column} fila ${row.sourceRow}`
  if (column === 'TRANSACCIÓN') return <select aria-label={label} value={transactionValue(value)} onChange={event => onChange(event.target.value)}><option value="">Seleccionar</option><option value="DEPOSITO">Depósito</option><option value="TRANSFERENCIA">Transferencia</option></select>
  return <input aria-label={label} value={value} inputMode={column === 'TOTAL' ? 'decimal' : column === expectedColumns[0] ? 'numeric' : 'text'} maxLength={column === expectedColumns[0] ? 10 : undefined} placeholder={column === expectedColumns[0] ? 'DD/MM/AAAA' : undefined} onFocus={event => event.currentTarget.select()} onChange={event => onChange(event.target.value)} />
}
