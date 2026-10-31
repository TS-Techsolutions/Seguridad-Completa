import { useRef, useState, type ChangeEvent } from 'react'
import { AlertTriangle, CheckCircle2, Download, Eye, FileSpreadsheet, Play, Save, Trash2, UploadCloud, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { downloadEditableImport } from './editable-import-download'

type ImportStatus = 'PENDIENTE' | 'PROCESADO' | 'ELIMINADO'
type ImportRow = { sourceRow: number; values: Record<string, string>; issues: string[] }
type ImportRecord = {
  id: string
  description: string
  fileName: string
  loadedAt: string
  user: string
  status: ImportStatus
  reviewed: boolean
  columns: string[]
  rows: ImportRow[]
}

const storageKey = (screenId: string) => `saga.hr.imports.${screenId}`
const normalize = (value: unknown) => String(value ?? '').trim()
const normalizedKey = (value: string) => value.trim().toLocaleLowerCase('es')

function readUploads(screenId: string): ImportRecord[] {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(screenId)) ?? '[]')
    return Array.isArray(stored)
      ? stored.filter(record => Array.isArray(record?.columns) && Array.isArray(record?.rows))
      : []
  } catch {
    return []
  }
}

function validateRows(rows: ImportRow[], columns: string[]) {
  const identifier = columns[0]
  const counts = rows.reduce<Record<string, number>>((current, row) => {
    const value = normalizedKey(row.values[identifier] ?? '')
    if (value) current[value] = (current[value] ?? 0) + 1
    return current
  }, {})

  return rows.map(row => {
    const value = normalize(row.values[identifier])
    const issues: string[] = []
    if (!value) issues.push(`${identifier} es obligatorio`)
    if (value && counts[normalizedKey(value)] > 1) issues.push(`${identifier} está repetido en el archivo`)
    return { ...row, issues }
  })
}

async function parseWorkbook(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: false })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error('El archivo no contiene hojas para procesar.')
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false })
  const headerIndex = matrix.findIndex(row => row.some(cell => normalize(cell)))
  if (headerIndex < 0) throw new Error('El archivo no contiene información.')

  const seen = new Map<string, number>()
  const columns = matrix[headerIndex].map((cell, index) => {
    const initial = normalize(cell) || `Columna ${index + 1}`
    const key = normalizedKey(initial)
    const occurrence = (seen.get(key) ?? 0) + 1
    seen.set(key, occurrence)
    return occurrence === 1 ? initial : `${initial} (${occurrence})`
  })
  const rows = matrix.slice(headerIndex + 1).map((cells, index) => ({
    sourceRow: headerIndex + index + 2,
    values: Object.fromEntries(columns.map((column, columnIndex) => [column, normalize(cells[columnIndex])])),
    issues: [],
  })).filter(row => columns.some(column => row.values[column]))
  if (!rows.length) throw new Error('El archivo no contiene filas para cargar.')
  return { columns, rows: validateRows(rows, columns) }
}

export function HumanTalentImportPanel({ screenId, title, description }: { screenId: string; title: string; description: string }) {
  const [uploads, setUploads] = useState<ImportRecord[]>(() => readUploads(screenId))
  const [uploadDescription, setUploadDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([])
  const [previewDirty, setPreviewDirty] = useState(false)
  const [previewMessage, setPreviewMessage] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const persist = (next: ImportRecord[]) => {
    localStorage.setItem(storageKey(screenId), JSON.stringify(next))
    setUploads(next)
  }
  const selectedPreview = uploads.find(record => record.id === previewId)
  const selectedDelete = uploads.find(record => record.id === deleteId)

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null)
    setError('')
    setMessage('')
  }
  const upload = async () => {
    if (!uploadDescription.trim()) { setError('Ingresa una descripción para identificar la carga.'); return }
    if (!file) { setError('Selecciona el archivo que deseas cargar.'); return }
    setBusy(true)
    try {
      const parsed = await parseWorkbook(file)
      const record: ImportRecord = {
        id: crypto.randomUUID(), description: uploadDescription.trim(), fileName: file.name,
        loadedAt: new Date().toISOString(), user: 'Jorge', status: 'PENDIENTE', reviewed: false,
        columns: parsed.columns, rows: parsed.rows,
      }
      persist([record, ...uploads])
      setUploadDescription(''); setFile(null); setError('')
      if (inputRef.current) inputRef.current.value = ''
      setMessage('Archivo cargado con estado PENDIENTE. Revísalo con la lupa, guarda las correcciones y luego procésalo.')
    } catch (uploadError) {
      setMessage('')
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo leer el archivo.')
    } finally {
      setBusy(false)
    }
  }
  const openPreview = (record: ImportRecord) => {
    if (record.status === 'ELIMINADO') return
    const rows = validateRows(record.rows, record.columns)
    persist(uploads.map(item => item.id === record.id ? { ...item, reviewed: true, rows } : item))
    setPreviewRows(rows); setPreviewDirty(false); setPreviewMessage(''); setPreviewId(record.id)
  }
  const updateCell = (sourceRow: number, column: string, value: string) => {
    if (!selectedPreview || selectedPreview.status !== 'PENDIENTE') return
    const rows = previewRows.map(row => row.sourceRow === sourceRow
      ? { ...row, values: { ...row.values, [column]: value } }
      : row)
    setPreviewRows(validateRows(rows, selectedPreview.columns)); setPreviewDirty(true); setPreviewMessage('')
  }
  const savePreview = () => {
    if (!selectedPreview || selectedPreview.status !== 'PENDIENTE') return
    const rows = validateRows(previewRows, selectedPreview.columns)
    const issueCount = rows.filter(row => row.issues.length).length
    persist(uploads.map(item => item.id === selectedPreview.id ? { ...item, reviewed: true, rows } : item))
    setPreviewRows(rows); setPreviewDirty(false)
    setPreviewMessage(issueCount ? `Cambios guardados. Aún existen ${issueCount} filas con inconsistencias.` : 'Cambios guardados. El archivo está listo para procesarse.')
  }
  const processRecord = (record: ImportRecord) => {
    const rows = validateRows(record.rows, record.columns)
    if (!record.reviewed) { setError('Debes revisar el archivo con la lupa antes de procesarlo.'); return }
    if (rows.some(row => row.issues.length)) { setError('Corrige y guarda todas las inconsistencias antes de procesar.'); return }
    persist(uploads.map(item => item.id === record.id ? { ...item, rows, status: 'PROCESADO' } : item))
    setError(''); setMessage('La información fue procesada correctamente.')
  }
  const confirmDelete = () => {
    if (!selectedDelete) return
    persist(uploads.map(item => item.id === selectedDelete.id ? { ...item, status: 'ELIMINADO' } : item))
    setDeleteId(null); setPreviewId(current => current === selectedDelete.id ? null : current)
    setMessage('El archivo cargado fue eliminado.'); setError('')
  }

  const issueCount = previewRows.filter(row => row.issues.length).length
  return <div className="hr-stack hr-import-workflow">
    <section className="hr-info"><FileSpreadsheet/><div><strong>{title}</strong><span>{description}</span></div></section>
    <section className="account-upload-box"><div className="account-upload-fields"><label><span>Descripción</span><input value={uploadDescription} onChange={event => { setUploadDescription(event.target.value); setError(''); setMessage('') }} maxLength={160} placeholder="Identifica el origen o propósito de la carga" /></label><label className={`account-file-picker ${file ? 'selected' : ''}`}><input ref={inputRef} type="file" accept=".xls,.xlsx,.csv" onChange={chooseFile}/>{file ? <FileSpreadsheet/> : <UploadCloud/>}<span><strong>{file?.name ?? 'Adjuntar archivo'}</strong><small>{file ? 'Haz clic para reemplazar el archivo' : 'Archivos XLS, XLSX o CSV'}</small></span></label></div><button type="button" className="primary-action" disabled={busy} onClick={upload}><UploadCloud/>{busy ? 'Validando…' : 'Cargar archivo'}</button></section>
    {error && <div className="account-migration-feedback error" role="alert"><AlertTriangle/>{error}</div>}
    {message && <div className="account-migration-feedback success"><CheckCircle2/>{message}</div>}
    <section className="account-files-box"><h2>Archivos Cargados</h2><div className="account-files-scroll"><table><thead><tr><th>Descripción</th><th>Archivo</th><th>Fecha</th><th>Usuario</th><th>Estado</th><th aria-label="Revisar"/><th aria-label="Descargar"/><th aria-label="Procesar"/><th aria-label="Eliminar"/></tr></thead><tbody>{uploads.map(record => <tr key={record.id}><td><strong>{record.description}</strong></td><td>{record.fileName}</td><td>{new Date(record.loadedAt).toLocaleString('es-EC')}</td><td>{record.user}</td><td><span className={`account-upload-status ${record.status.toLowerCase()}`}>{record.status}</span></td><td><button type="button" className="account-row-action inspect" disabled={record.status === 'ELIMINADO'} title="Revisar y editar información" aria-label={`Revisar y editar ${record.fileName}`} onClick={() => openPreview(record)}><Eye/></button></td><td><button type="button" className="account-row-action download" disabled={record.status === 'ELIMINADO'} title="Descargar archivo con las correcciones guardadas" aria-label={`Descargar ${record.fileName}`} onClick={() => downloadEditableImport(record.fileName, record.columns, record.rows)}><Download/></button></td><td><button type="button" className="account-row-action process" disabled={record.status !== 'PENDIENTE'} title="Procesar información" aria-label={`Procesar ${record.fileName}`} onClick={() => processRecord(record)}><Play/></button></td><td><button type="button" className="account-row-action delete" disabled={record.status === 'ELIMINADO'} title="Eliminar carga" aria-label={`Eliminar ${record.fileName}`} onClick={() => setDeleteId(record.id)}><Trash2/></button></td></tr>)}{!uploads.length && <tr><td colSpan={9} className="account-files-empty">No existen archivos cargados.</td></tr>}</tbody></table></div></section>
    {selectedPreview && <div className="account-preview-backdrop" role="dialog" aria-modal="true" aria-label={`Revisión de ${selectedPreview.fileName}`}><section className="account-preview-modal"><header><div><span>Revisión del archivo</span><h2>{selectedPreview.fileName}</h2><p>{previewRows.length} filas · {issueCount} con inconsistencias</p></div><button type="button" aria-label="Cerrar revisión" onClick={() => setPreviewId(null)}><X/></button></header>{issueCount > 0 && <div className="account-preview-note"><AlertTriangle/>Se encontraron {issueCount} filas con inconsistencias. Edita las celdas marcadas y guarda los cambios antes de procesar.</div>}<div className="account-preview-grid"><table><thead><tr><th>Fila</th>{selectedPreview.columns.map(column => <th key={column}>{column}</th>)}<th>Observaciones</th></tr></thead><tbody>{previewRows.map(row => <tr key={row.sourceRow} className={row.issues.length ? 'has-issues' : ''}><td>{row.sourceRow}</td>{selectedPreview.columns.map(column => <td key={column}>{selectedPreview.status === 'PENDIENTE' ? <input value={row.values[column] ?? ''} aria-label={`${column}, fila ${row.sourceRow}`} onChange={event => updateCell(row.sourceRow, column, event.target.value)}/> : row.values[column] || '—'}</td>)}<td>{row.issues.length ? row.issues.join(' · ') : 'Correcto'}</td></tr>)}</tbody></table></div><footer><div className={`account-preview-save-state ${issueCount ? 'warning' : 'ready'}`}>{previewMessage || (previewDirty ? 'Existen cambios sin guardar.' : issueCount ? 'Corrige las inconsistencias y guarda los cambios.' : 'La información está validada.')}</div><button type="button" className="quiet-button" onClick={() => setPreviewId(null)}>Cerrar</button>{selectedPreview.status === 'PENDIENTE' && <button type="button" className="quiet-button account-save-changes" disabled={!previewDirty} onClick={savePreview}><Save/>Guardar cambios</button>}{selectedPreview.status === 'PENDIENTE' && <button type="button" className="primary-action" disabled={previewDirty || issueCount > 0} onClick={() => { setPreviewId(null); processRecord({ ...selectedPreview, rows: previewRows, reviewed: true }) }}><Play/>Procesar información</button>}</footer></section></div>}
    {selectedDelete && <div className="account-delete-backdrop" role="alertdialog" aria-modal="true" aria-label="Confirmar eliminación"><section className="account-delete-modal"><span><AlertTriangle/></span><h2>¿Eliminar el archivo cargado?</h2><p>Se eliminará <strong>{selectedDelete.fileName}</strong> y la información que se haya procesado desde este documento.</p><div><button type="button" className="quiet-button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger-action" onClick={confirmDelete}><Trash2/>Sí, eliminar</button></div></section></div>}
  </div>
}
