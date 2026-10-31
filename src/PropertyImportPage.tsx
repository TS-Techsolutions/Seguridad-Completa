import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, Download, Eye, FileSpreadsheet, Play, Save, Trash2, UploadCloud, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { downloadEditableImport } from './editable-import-download'
import type { ScreenSpec } from './types'
import { cleanTextSpacing, hasRepeatedSpaces } from './text-values'

type UploadStatus = 'PENDIENTE' | 'PROCESADO' | 'ELIMINADO'
type State = 'ACTIVO' | 'INACTIVO'
type PropertyColumn = (typeof expectedColumns)[number]
type PropertyValues = Record<PropertyColumn, string>
type PropertyImportRow = { sourceRow: number; values: PropertyValues; issues: string[] }
type UploadRecord = {
  id: string
  description: string
  fileName: string
  loadedAt: string
  user: string
  status: UploadStatus
  reviewed: boolean
  rows: PropertyImportRow[]
}
type SectionRow = { id: string; description: string; state: State }
type StructureDetail = { id: string; description: string; state: State }
type StructureRow = { id: string; description: string; state: State; details?: StructureDetail[] }
type DivisionOption = { key: string; label: string }
type CustomerRecord = { id: string; businessName: string; state: State }
type BillingHistory = { id: string; owner: string; tenant: string; billedTo: 'PROPIETARIO' | 'INQUILINO'; billedToName?: string; from: string; until: string }
type PropertyRecord = {
  id: string
  description: string
  sectionId: string
  divisionKey: string
  cadastralCode: string
  housingUnit: string
  usableArea: string
  payer: string
  waterMeterCode: string
  generationMode: 'AUTOMATICA' | 'INDIVIDUAL'
  state: State
  billingHistory: BillingHistory[]
  sourceUploadId?: string
}

const uploadsKey = 'saga.property-import.uploads'
const propertyKey = 'saga.property-detail'
const expectedColumns = ['Descripción', 'Sección', 'División', 'Código Catastral', 'Unidad Habitacional', 'Area Util', 'Quién Paga', 'Código Medidor', 'Tipo Generación', 'Propietario', 'Inquilino', 'Se Factura A', 'Desde'] as const
const requiredColumns: PropertyColumn[] = ['Descripción', 'Sección', 'División', 'Unidad Habitacional', 'Area Util', 'Tipo Generación', 'Propietario', 'Se Factura A', 'Desde']

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

function text(value: unknown) {
  return String(value ?? '').replace(/\uFFFD/g, '').trim().replace(/\.0$/, '')
}

function readJson<T>(key: string, fallback: T): T {
  try { const value = JSON.parse(localStorage.getItem(key) ?? 'null'); return value ?? fallback } catch { return fallback }
}

function sections() {
  return readJson<SectionRow[]>('saga.property-sections', []).filter(section => section.state === 'ACTIVO')
}

function divisions() {
  const structures = readJson<Record<string, StructureRow[]>>('saga.property-type-structure', {})
  return Object.entries(structures).flatMap(([type, rows]) => (Array.isArray(rows) ? rows : []).filter(row => row.state === 'ACTIVO').flatMap(parent => {
    const details = (Array.isArray(parent.details) ? parent.details : []).filter(detail => detail.state === 'ACTIVO')
    return details.length
      ? details.map(detail => ({ key: `${type}|${parent.id}|${detail.id}`, label: `${parent.description} - ${detail.description}` }))
      : [{ key: `${type}|${parent.id}|`, label: parent.description }]
  })).filter((option, index, all) => all.findIndex(candidate => normalize(candidate.label) === normalize(option.label)) === index)
}

function dateText(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(value)
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) return `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${String(parsed.y).padStart(4, '0')}`
  }
  const raw = text(value)
  const match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/)
  if (!match) return raw
  const year = match[3].length === 2 ? `20${match[3]}` : match[3]
  return `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${year}`
}

function validDate(value: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false
  const [day, month, year] = value.split('/').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function generationMode(value: string): PropertyRecord['generationMode'] | '' {
  const normalized = normalize(value)
  if (['A', 'AUTOMATICA', 'AUTOMATICO'].includes(normalized)) return 'AUTOMATICA'
  if (['I', 'INDIVIDUAL'].includes(normalized)) return 'INDIVIDUAL'
  return ''
}

function parseWorkbook(file: File): Promise<PropertyImportRow[]> {
  return file.arrayBuffer().then(buffer => {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) throw new Error('El archivo no contiene hojas para procesar.')
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true })
    const headerRow = matrix.findIndex(row => row.some(cell => normalize(cell) === 'DESCRIPCION'))
    if (headerRow < 0) throw new Error('No se encontró la fila de encabezados de la plantilla de inmuebles.')
    const header = matrix[headerRow]
    const indexes = Object.fromEntries(expectedColumns.map(column => [column, header.findIndex(cell => normalize(cell) === normalize(column))])) as Record<PropertyColumn, number>
    const missing = requiredColumns.filter(column => indexes[column] < 0)
    if (missing.length) throw new Error(`Faltan columnas obligatorias: ${missing.join(', ')}.`)
    return matrix.slice(headerRow + 1).map((row, index) => {
      const values = Object.fromEntries(expectedColumns.map(column => {
        const value = indexes[column] < 0 ? '' : row[indexes[column]]
        return [column, column === 'Desde' ? dateText(value) : text(value)]
      })) as PropertyValues
      return { sourceRow: headerRow + index + 2, values, issues: [] }
    }).filter(row => expectedColumns.some(column => row.values[column]))
  })
}

function validateRows(rows: PropertyImportRow[], excludedUploadId?: string) {
  const configuredSections = sections()
  const configuredDivisions = divisions()
  const customerNames = new Set(readJson<CustomerRecord[]>('saga.customers', []).map(customer => normalize(customer.businessName)).filter(Boolean))
  const properties = readJson<PropertyRecord[]>(propertyKey, []).filter(row => row.sourceUploadId !== excludedUploadId)
  const existingCodes = new Set(properties.map(row => normalize(row.cadastralCode)).filter(Boolean))
  const codeCounts = rows.reduce<Record<string, number>>((result, row) => {
    const code = normalize(row.values['Código Catastral'])
    if (code) result[code] = (result[code] ?? 0) + 1
    return result
  }, {})
  return rows.map(row => {
    const values = row.values
    const issues: string[] = []
    const code = normalize(values['Código Catastral'])
    ;(['Descripción', 'Sección', 'División', 'Unidad Habitacional', 'Quién Paga', 'Propietario', 'Inquilino', 'Se Factura A'] as PropertyColumn[])
      .forEach(column => { if (hasRepeatedSpaces(values[column])) issues.push(`${column} contiene espacios repetidos; corrige la información antes de procesar`) })
    if (!values.Descripción) issues.push('Descripción obligatoria')
    if (!values.Sección) issues.push('Sección obligatoria')
    else if (!configuredSections.some(section => normalize(section.description) === normalize(values.Sección))) issues.push('Sección no registrada o inactiva')
    if (!values.División) issues.push('División obligatoria')
    else if (!configuredDivisions.some(division => normalize(division.label) === normalize(values.División))) issues.push('División no registrada o inactiva')
    if (code && codeCounts[code] > 1) issues.push('Código Catastral repetido en el archivo')
    if (code && existingCodes.has(code)) issues.push('Código Catastral ya registrado')
    if (!values['Unidad Habitacional']) issues.push('Unidad Habitacional obligatoria')
    if (!/^\d+(?:[.,]\d{1,6})?$/.test(values['Area Util']) || Number(values['Area Util'].replace(',', '.')) <= 0) issues.push('Area Util debe ser mayor a cero y admitir hasta 6 decimales')
    if (!generationMode(values['Tipo Generación'])) issues.push('Tipo Generación esperado: A o I')
    if (!values.Propietario) issues.push('Propietario obligatorio')
    else if (!customerNames.has(normalize(values.Propietario))) issues.push('Propietario no existe en Registro Clientes')
    if (!values['Se Factura A']) issues.push('Se Factura A obligatorio')
    else if (!customerNames.has(normalize(values['Se Factura A']))) issues.push('Se Factura A no existe en Registro Clientes')
    if (!values.Desde) issues.push('Fecha Inicio obligatoria')
    else if (!validDate(values.Desde)) issues.push('Fecha Inicio debe tener el formato DD/MM/AAAA')
    return { ...row, issues: [...new Set(issues)] }
  })
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function propertyFromRow(row: PropertyImportRow, uploadId: string): PropertyRecord {
  const values = row.values
  const section = sections().find(item => normalize(item.description) === normalize(values.Sección))!
  const division = divisions().find(item => normalize(item.label) === normalize(values.División))!
  const billedToName = cleanTextSpacing(values['Se Factura A'])
  const billedTo = billedToName && normalize(billedToName) === normalize(values.Inquilino) ? 'INQUILINO' : 'PROPIETARIO'
  return {
    id: crypto.randomUUID(),
    description: cleanTextSpacing(values.Descripción),
    sectionId: section.id,
    divisionKey: division.key,
    cadastralCode: values['Código Catastral'],
    housingUnit: cleanTextSpacing(values['Unidad Habitacional']),
    usableArea: values['Area Util'].replace(',', '.'),
    payer: cleanTextSpacing(values['Quién Paga']),
    waterMeterCode: values['Código Medidor'],
    generationMode: generationMode(values['Tipo Generación']) || 'AUTOMATICA',
    state: 'ACTIVO',
    billingHistory: [{ id: crypto.randomUUID(), owner: cleanTextSpacing(values.Propietario), tenant: cleanTextSpacing(values.Inquilino), billedTo, billedToName, from: values.Desde, until: '' }],
    sourceUploadId: uploadId,
  }
}

function persistUploads(records: UploadRecord[], setter: (records: UploadRecord[]) => void) {
  setter(records)
  localStorage.setItem(uploadsKey, JSON.stringify(records))
}

export function PropertyImportPage({ screen }: { screen: ScreenSpec }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<UploadRecord[]>(() => readJson(uploadsKey, []))
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewRows, setPreviewRows] = useState<PropertyImportRow[]>([])
  const [previewDirty, setPreviewDirty] = useState(false)
  const [previewMessage, setPreviewMessage] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const configuredSections = useMemo(sections, [previewId])
  const configuredDivisions = useMemo(divisions, [previewId])
  const selectedPreview = uploads.find(record => record.id === previewId)
  const selectedDelete = uploads.find(record => record.id === deleteId)

  const upload = async () => {
    if (!description.trim()) { setMessage(''); setError('Ingresa la descripción del archivo.'); return }
    if (!file) { setMessage(''); setError('Selecciona el archivo de inmuebles.'); return }
    setBusy(true)
    try {
      const parsed = await parseWorkbook(file)
      if (!parsed.length) throw new Error('El archivo no contiene inmuebles para cargar.')
      const record: UploadRecord = { id: crypto.randomUUID(), description: description.trim(), fileName: file.name, loadedAt: new Date().toISOString(), user: 'Jorge', status: 'PENDIENTE', reviewed: false, rows: validateRows(parsed) }
      persistUploads([record, ...uploads], setUploads)
      setDescription(''); setFile(null); if (fileInput.current) fileInput.current.value = ''
      setError(''); setMessage('Archivo cargado con estado PENDIENTE. Revísalo con la lupa antes de procesarlo.')
    } catch (uploadError) {
      setMessage(''); setError(uploadError instanceof Error ? uploadError.message : 'No se pudo leer el archivo.')
    } finally { setBusy(false) }
  }

  const openPreview = (record: UploadRecord) => {
    if (record.status === 'ELIMINADO') return
    const rows = validateRows(record.rows, record.id)
    persistUploads(uploads.map(item => item.id === record.id ? { ...item, reviewed: true, rows } : item), setUploads)
    setPreviewRows(rows); setPreviewDirty(false); setPreviewMessage(''); setPreviewId(record.id); setError(''); setMessage('')
  }

  const updatePreviewCell = (sourceRow: number, column: PropertyColumn, value: string) => {
    if (!selectedPreview || selectedPreview.status !== 'PENDIENTE') return
    const clean = column === 'Tipo Generación' ? value.toUpperCase() : column === 'Desde' ? dateText(value) : text(value)
    const edited = previewRows.map(row => row.sourceRow === sourceRow ? { ...row, values: { ...row.values, [column]: clean } } : row)
    setPreviewRows(validateRows(edited, selectedPreview.id)); setPreviewDirty(true); setPreviewMessage('')
  }

  const savePreviewChanges = () => {
    if (!selectedPreview || selectedPreview.status !== 'PENDIENTE') return
    const rows = validateRows(previewRows, selectedPreview.id)
    const issueCount = rows.filter(row => row.issues.length).length
    persistUploads(uploads.map(item => item.id === selectedPreview.id ? { ...item, reviewed: true, rows } : item), setUploads)
    setPreviewRows(rows); setPreviewDirty(false); setPreviewMessage(issueCount ? `Cambios guardados. Aún existen ${issueCount} filas con inconsistencias.` : 'Cambios guardados. El archivo está listo para procesarse.')
  }

  const process = (record: UploadRecord) => {
    if (record.status !== 'PENDIENTE') return
    if (!record.reviewed) { setMessage(''); setError('Primero revisa la información con el ícono de la lupa.'); return }
    const rows = validateRows(record.rows, record.id)
    const issueCount = rows.filter(row => row.issues.length).length
    if (issueCount) { persistUploads(uploads.map(item => item.id === record.id ? { ...item, rows } : item), setUploads); setMessage(''); setError(`No se puede procesar: existen ${issueCount} filas con inconsistencias.`); return }
    const current = readJson<PropertyRecord[]>(propertyKey, []).filter(property => property.sourceUploadId !== record.id)
    const imported = rows.map(row => propertyFromRow(row, record.id))
    localStorage.setItem(propertyKey, JSON.stringify([...imported, ...current]))
    persistUploads(uploads.map(item => item.id === record.id ? { ...item, rows, status: 'PROCESADO' as const } : item), setUploads)
    setError(''); setMessage(`${imported.length} inmuebles fueron procesados correctamente.`)
  }

  const confirmDelete = () => {
    if (!selectedDelete) return
    localStorage.setItem(propertyKey, JSON.stringify(readJson<PropertyRecord[]>(propertyKey, []).filter(property => property.sourceUploadId !== selectedDelete.id)))
    persistUploads(uploads.map(item => item.id === selectedDelete.id ? { ...item, status: 'ELIMINADO' as const, reviewed: false, rows: [] } : item), setUploads)
    setDeleteId(null); setPreviewId(current => current === selectedDelete.id ? null : current); setError(''); setMessage('El archivo y todos los inmuebles que incorporó fueron eliminados.')
  }

  return <div className="page screen-page account-migration-page property-import-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header account-migration-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div><a className="primary-action account-example-download" href="/Ejemplo%20Inmuebles.xlsx" download="Ejemplo Inmuebles.xlsx"><Download />Descargar Plantilla</a></section>

    <section className="account-upload-box"><div className="account-upload-fields"><label><span>Descripción</span><input value={description} onChange={event => { setDescription(event.target.value); setError(''); setMessage('') }} maxLength={160} placeholder="Identifica el origen o propósito de la carga" /></label><label className={`account-file-picker ${file ? 'selected' : ''}`}><input ref={fileInput} type="file" accept=".xls,.xlsx,.csv" onChange={(event: ChangeEvent<HTMLInputElement>) => { setFile(event.target.files?.[0] ?? null); setError(''); setMessage('') }} />{file ? <FileSpreadsheet /> : <UploadCloud />}<span><strong>{file ? file.name : 'Adjuntar archivo de inmuebles'}</strong><small>{file ? 'Haz clic para reemplazar el archivo' : 'Archivos XLS, XLSX o CSV'}</small></span></label></div><button type="button" className="primary-action" onClick={upload} disabled={busy}><UploadCloud />{busy ? 'Validando…' : 'Cargar archivo'}</button></section>
    <div className="import-requirements-note"><CheckCircle2 /><span><strong>Campos opcionales al importar:</strong> Código Catastral y Código Medidor, incluso cuando la compañía facture agua. Los inmuebles podrán cargarse y estos datos se completarán posteriormente desde Detalle Inmuebles.</span></div>
    {error && <div className="account-migration-feedback error" role="alert"><AlertTriangle />{error}</div>}{message && <div className="account-migration-feedback success" role="status"><CheckCircle2 />{message}</div>}

    <section className="account-files-box"><h2>Archivos Cargados</h2><div className="account-files-scroll"><table><thead><tr><th>Descripción</th><th>Archivo</th><th>Fecha</th><th>Usuario</th><th>Estado</th><th aria-label="Revisar" /><th aria-label="Descargar" /><th aria-label="Procesar" /><th aria-label="Eliminar" /></tr></thead><tbody>{uploads.map(record => <tr key={record.id}><td><strong>{record.description}</strong></td><td>{record.fileName}</td><td>{displayDate(record.loadedAt)}</td><td>{record.user}</td><td><span className={`account-upload-status ${record.status.toLowerCase()}`}>{record.status}</span></td><td><button type="button" className="account-row-action inspect" disabled={record.status === 'ELIMINADO'} title="Revisar y editar información" aria-label={`Revisar y editar ${record.fileName}`} onClick={() => openPreview(record)}><Eye /></button></td><td><button type="button" className="account-row-action download" disabled={record.status === 'ELIMINADO'} title="Descargar archivo con las correcciones guardadas" aria-label={`Descargar ${record.fileName}`} onClick={() => downloadEditableImport(record.fileName, expectedColumns, record.rows)}><Download /></button></td><td><button type="button" className="account-row-action process" disabled={record.status !== 'PENDIENTE'} title="Procesar información" aria-label={`Procesar ${record.fileName}`} onClick={() => process(record)}><Play /></button></td><td><button type="button" className="account-row-action delete" disabled={record.status === 'ELIMINADO'} title="Eliminar carga" aria-label={`Eliminar ${record.fileName}`} onClick={() => setDeleteId(record.id)}><Trash2 /></button></td></tr>)}{!uploads.length && <tr><td colSpan={9} className="account-files-empty">No existen archivos cargados.</td></tr>}</tbody></table></div></section>

    {selectedPreview && <div className="account-preview-backdrop" role="dialog" aria-modal="true" aria-label={`Revisión de ${selectedPreview.fileName}`}><section className="account-preview-modal property-preview-modal"><header><div><span>Revisión del archivo</span><h2>{selectedPreview.fileName}</h2><p>{previewRows.length} filas · {previewRows.filter(row => row.issues.length).length} con inconsistencias</p></div><button type="button" aria-label="Cerrar revisión" onClick={() => setPreviewId(null)}><X /></button></header>{previewRows.some(row => row.issues.length) && <div className="account-preview-note"><AlertTriangle />Se encontraron {previewRows.filter(row => row.issues.length).length} filas con inconsistencias. Edita directamente las celdas marcadas en color naranja antes de procesar.</div>}<div className="account-preview-grid"><table><thead><tr><th>Fila</th>{expectedColumns.map(column => <th key={column}>{column}</th>)}<th>Observaciones</th></tr></thead><tbody>{previewRows.map(row => <tr key={row.sourceRow} className={row.issues.length ? 'has-issues' : ''}><td>{row.sourceRow}</td>{expectedColumns.map(column => <td key={column}>{selectedPreview.status === 'PENDIENTE' ? <PropertyCellEditor column={column} row={row} sectionOptions={configuredSections} divisionOptions={configuredDivisions} onChange={value => updatePreviewCell(row.sourceRow, column, value)} /> : row.values[column] || '—'}</td>)}<td>{row.issues.length ? row.issues.join(' · ') : 'Correcto'}</td></tr>)}</tbody></table></div><footer><div className={`account-preview-save-state ${previewRows.some(row => row.issues.length) ? 'warning' : 'ready'}`}>{previewMessage || (previewDirty ? 'Existen cambios sin guardar.' : previewRows.some(row => row.issues.length) ? 'Corrige las inconsistencias y guarda los cambios.' : 'La información está validada.')}</div><button type="button" className="quiet-button" onClick={() => setPreviewId(null)}>Cerrar</button>{selectedPreview.status === 'PENDIENTE' && <button type="button" className="quiet-button account-save-changes" disabled={!previewDirty} onClick={savePreviewChanges}><Save />Guardar cambios</button>}{selectedPreview.status === 'PENDIENTE' && <button type="button" className="primary-action" disabled={previewDirty || previewRows.some(row => row.issues.length)} onClick={() => { setPreviewId(null); process(selectedPreview) }}><Play />Procesar información</button>}</footer></section></div>}
    {selectedDelete && <div className="account-delete-backdrop" role="alertdialog" aria-modal="true" aria-label="Confirmar eliminación"><section className="account-delete-modal"><span><AlertTriangle /></span><h2>¿Eliminar el archivo cargado?</h2><p>Se eliminará <strong>{selectedDelete.fileName}</strong> y todos los inmuebles que este documento haya incorporado.</p><div><button type="button" className="quiet-button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger-action" onClick={confirmDelete}><Trash2 />Sí, eliminar</button></div></section></div>}
  </div>
}

function PropertyCellEditor({ column, row, sectionOptions, divisionOptions, onChange }: { column: PropertyColumn; row: PropertyImportRow; sectionOptions: SectionRow[]; divisionOptions: DivisionOption[]; onChange: (value: string) => void }) {
  const value = row.values[column]
  const label = `${column} fila ${row.sourceRow}`
  if (column === 'Sección') return <select aria-label={label} value={value} onChange={event => onChange(event.target.value)}><option value="">Seleccionar</option>{value && !sectionOptions.some(option => option.description === value) && <option value={value}>{value} (no configurada)</option>}{sectionOptions.map(option => <option key={option.id} value={option.description}>{option.description}</option>)}</select>
  if (column === 'División') return <select aria-label={label} value={value} onChange={event => onChange(event.target.value)}><option value="">Seleccionar</option>{value && !divisionOptions.some(option => option.label === value) && <option value={value}>{value} (no configurada)</option>}{divisionOptions.map(option => <option key={option.key} value={option.label}>{option.label}</option>)}</select>
  if (column === 'Tipo Generación') return <select aria-label={label} value={value.toUpperCase()} onChange={event => onChange(event.target.value)}><option value="">Seleccionar</option><option value="A">A · Automática</option><option value="I">I · Individual</option></select>
  return <input aria-label={label} value={value} inputMode={column === 'Area Util' ? 'decimal' : column === 'Desde' ? 'numeric' : 'text'} placeholder={column === 'Desde' ? 'DD/MM/AAAA' : undefined} maxLength={column === 'Desde' ? 10 : undefined} onChange={event => onChange(event.target.value)} />
}
