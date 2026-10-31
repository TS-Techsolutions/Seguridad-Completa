import { useRef, useState, type ChangeEvent } from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, Download, Eye, FileSpreadsheet, Network, Play, Save, Trash2, UploadCloud, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { downloadEditableImport } from './editable-import-download'
import type { ScreenSpec } from './types'

type UploadStatus = 'PENDIENTE' | 'PROCESADO' | 'ELIMINADO'
type AccountColumn = (typeof expectedColumns)[number]
type AccountValues = Record<AccountColumn, string>
type AccountRow = { sourceRow: number; values: AccountValues; issues: string[] }
type UploadRecord = {
  id: string
  description: string
  fileName: string
  loadedAt: string
  user: string
  status: UploadStatus
  reviewed: boolean
  rows: AccountRow[]
}
type ProcessedAccount = AccountValues & { sourceUploadId: string }
type AccountTreeNode = { row: AccountRow; children: AccountTreeNode[] }

const uploadsKey = 'saga.account-plan.uploads'
const planKey = 'saga.accounting.plan'
const expectedColumns = ['Codigo', 'Descripción', 'Tipo', 'Cta. Padre', 'Grupo', 'Estructura', 'Estado'] as const
const validTypes = new Set(['MAYOR', 'AUXILIAR'])
const validGroups = new Set(['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESOS ORDINARIOS', 'COSTO DE VENTAS'])
const validStructures = new Set(['TITULO', 'NIVEL 2', 'NIVEL 3', 'NIVEL 4', 'NIVEL 5', 'NIVEL 6'])
const validStates = new Set(['ACTIVO', 'INACTIVO'])
const structureLengths: Record<string, number> = { TITULO: 1, 'NIVEL 2': 2, 'NIVEL 3': 4, 'NIVEL 4': 6, 'NIVEL 5': 9, 'NIVEL 6': 11 }
const structureOrder = ['TITULO', 'NIVEL 2', 'NIVEL 3', 'NIVEL 4', 'NIVEL 5', 'NIVEL 6']

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

function text(value: unknown) {
  return String(value ?? '').trim().replace(/\.0$/, '')
}

function accountCode(value: unknown) {
  return text(value).replace(/[.,\s]/g, '')
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null')
    return value ?? fallback
  } catch {
    return fallback
  }
}

function persistUploads(records: UploadRecord[], setter: (value: UploadRecord[]) => void) {
  setter(records)
  localStorage.setItem(uploadsKey, JSON.stringify(records))
}

function parseWorkbook(file: File): Promise<AccountRow[]> {
  return file.arrayBuffer().then(buffer => {
    const workbook = XLSX.read(buffer, { type: 'array', raw: false })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!firstSheet) throw new Error('El archivo no contiene hojas para procesar.')
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: '', raw: false })
    const headerRow = matrix.findIndex(row => {
      const names = new Set(row.map(normalize))
      return names.has('CODIGO') && names.has('DESCRIPCION')
    })
    if (headerRow < 0) throw new Error('No se encontraron las columnas Codigo y Descripción.')
    const headerIndexes = Object.fromEntries(expectedColumns.map(column => [column, matrix[headerRow].findIndex(cell => normalize(cell) === normalize(column))])) as Record<(typeof expectedColumns)[number], number>
    const missing = expectedColumns.filter(column => headerIndexes[column] < 0)
    if (missing.length) throw new Error(`Faltan las columnas: ${missing.join(', ')}.`)
    return matrix.slice(headerRow + 1).map((row, index) => {
      const values = Object.fromEntries(expectedColumns.map(column => {
        const value = row[headerIndexes[column]]
        return [column, column === 'Codigo' || column === 'Cta. Padre' ? accountCode(value) : text(value)]
      })) as AccountValues
      return { sourceRow: headerRow + index + 2, values, issues: [] }
    }).filter(row => expectedColumns.some(column => row.values[column]))
  })
}

function validateRows(rows: AccountRow[], existingAccounts: ProcessedAccount[]) {
  const codes = rows.map(row => row.values.Codigo)
  const codeCounts = codes.reduce<Record<string, number>>((result, code) => ({ ...result, [code]: (result[code] ?? 0) + 1 }), {})
  const existingCodes = new Set(existingAccounts.map(row => row.Codigo))
  const availableCodes = new Set([...codes, ...existingCodes])
  const parentTypes = new Map([...existingAccounts.map(row => [row.Codigo, row.Tipo.toUpperCase()] as const), ...rows.map(row => [row.values.Codigo, row.values.Tipo.toUpperCase()] as const)])

  return rows.map(row => {
    const values = row.values
    const issues: string[] = []
    const code = values.Codigo
    const type = values.Tipo.toUpperCase()
    const group = values.Grupo.toUpperCase()
    const structure = values.Estructura.toUpperCase()
    const state = values.Estado.toUpperCase()
    const parent = values['Cta. Padre']

    if (!code) issues.push('Código obligatorio')
    else if (!/^\d+$/.test(code)) issues.push('El código debe contener solo números')
    if (!values['Descripción']) issues.push('Descripción obligatoria')
    if (!validTypes.has(type)) issues.push('Tipo esperado: MAYOR o AUXILIAR')
    if (!validGroups.has(group)) issues.push('Grupo no reconocido')
    if (!validStructures.has(structure)) issues.push('Estructura no reconocida')
    if (!validStates.has(state)) issues.push('Estado esperado: Activo o Inactivo')
    if (codeCounts[code] > 1) issues.push('Código repetido dentro del archivo')
    if (existingCodes.has(code)) issues.push('El código ya existe en un plan procesado')
    if (structure && structureLengths[structure] && code.length !== structureLengths[structure]) issues.push(`El código de ${structure} debe tener ${structureLengths[structure]} dígitos`)
    if (structure === 'TITULO' && parent) issues.push('Una cuenta TÍTULO no debe tener cuenta padre')
    if (structure !== 'TITULO' && !parent) issues.push('Cuenta padre obligatoria')
    if (parent && !availableCodes.has(parent)) issues.push('La cuenta padre no existe')
    if (parent && code && !code.startsWith(parent)) issues.push('El código no corresponde a la cuenta padre')
    if (parent && parentTypes.get(parent) === 'AUXILIAR') issues.push('Una cuenta AUXILIAR no puede tener cuentas hijas')
    const parentValues = rows.find(candidate => candidate.values.Codigo === parent)?.values ?? existingAccounts.find(candidate => candidate.Codigo === parent)
    const structureLevel = structureOrder.indexOf(structure)
    const parentLevel = structureOrder.indexOf(parentValues?.Estructura.toUpperCase() ?? '')
    if (parentValues && structureLevel > 0 && parentLevel !== structureLevel - 1) issues.push('La cuenta superior no corresponde al nivel anterior')
    if (parent && code) {
      const visited = new Set([code])
      let ancestor = parent
      while (ancestor) {
        if (visited.has(ancestor)) { issues.push('La jerarquía contiene una relación circular'); break }
        visited.add(ancestor)
        ancestor = rows.find(candidate => candidate.values.Codigo === ancestor)?.values['Cta. Padre'] ?? ''
      }
    }
    if (type === 'AUXILIAR' && rows.some(candidate => candidate.values['Cta. Padre'] === code)) issues.push('La cuenta AUXILIAR tiene cuentas hijas')
    return { ...row, issues: [...new Set(issues)] }
  })
}

function buildAccountTree(rows: AccountRow[]): AccountTreeNode[] {
  const nodes = rows.map(row => ({ row, children: [] as AccountTreeNode[] }))
  const firstByCode = new Map<string, AccountTreeNode>()
  nodes.forEach(node => { if (node.row.values.Codigo && !firstByCode.has(node.row.values.Codigo)) firstByCode.set(node.row.values.Codigo, node) })
  const roots: AccountTreeNode[] = []
  nodes.forEach(node => {
    const code = node.row.values.Codigo
    const parentCode = node.row.values['Cta. Padre']
    const parent = firstByCode.get(parentCode)
    const circular = node.row.issues.includes('La jerarquía contiene una relación circular')
    if (!parentCode || !parent || parent === node || circular) roots.push(node)
    else parent.children.push(node)
  })
  const seen = new Set<AccountTreeNode>()
  const visit = (node: AccountTreeNode) => { if (seen.has(node)) return; seen.add(node); node.children.forEach(visit) }
  roots.forEach(visit)
  nodes.forEach(node => { if (!seen.has(node)) { roots.push(node); visit(node) } })
  const sort = (items: AccountTreeNode[]) => { items.sort((a, b) => a.row.values.Codigo.localeCompare(b.row.values.Codigo, 'es', { numeric: true })); items.forEach(item => sort(item.children)) }
  sort(roots)
  return roots
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function AccountPlanMigrationPage({ screen }: { screen: ScreenSpec }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<UploadRecord[]>(() => readJson(uploadsKey, []))
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewRows, setPreviewRows] = useState<AccountRow[]>([])
  const [previewDirty, setPreviewDirty] = useState(false)
  const [previewMessage, setPreviewMessage] = useState('')
  const [diagramId, setDiagramId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const planRows = () => readJson<ProcessedAccount[]>(planKey, [])
  const selectedPreview = uploads.find(record => record.id === previewId)
  const selectedDiagram = uploads.find(record => record.id === diagramId)
  const selectedDelete = uploads.find(record => record.id === deleteId)

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null)
    setError('')
    setMessage('')
  }

  const upload = async () => {
    if (!description.trim()) { setMessage(''); setError('Ingresa la descripción del archivo.'); return }
    if (!file) { setMessage(''); setError('Selecciona el archivo del plan contable.'); return }
    setBusy(true)
    try {
      const parsed = await parseWorkbook(file)
      if (!parsed.length) throw new Error('El archivo no contiene cuentas para cargar.')
      const validated = validateRows(parsed, planRows())
      const record: UploadRecord = { id: crypto.randomUUID(), description: description.trim(), fileName: file.name, loadedAt: new Date().toISOString(), user: 'Jorge', status: 'PENDIENTE', reviewed: false, rows: validated }
      persistUploads([record, ...uploads], setUploads)
      setDescription('')
      setFile(null)
      if (fileInput.current) fileInput.current.value = ''
      setError('')
      setMessage('Archivo cargado con estado PENDIENTE. Revísalo con la lupa antes de procesarlo.')
    } catch (uploadError) {
      setMessage('')
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo leer el archivo.')
    } finally {
      setBusy(false)
    }
  }

  const openPreview = (record: UploadRecord) => {
    if (record.status === 'ELIMINADO') return
    const existing = planRows().filter(row => row.sourceUploadId !== record.id)
    const rows = validateRows(record.rows, existing)
    const next = uploads.map(item => item.id === record.id ? { ...item, reviewed: true, rows } : item)
    persistUploads(next, setUploads)
    setPreviewRows(rows)
    setPreviewDirty(false)
    setPreviewMessage('')
    setPreviewId(record.id)
    setError('')
    setMessage('')
  }

  const updatePreviewCell = (sourceRow: number, column: AccountColumn, value: string) => {
    if (!selectedPreview || selectedPreview.status !== 'PENDIENTE') return
    const cleanValue = column === 'Codigo' || column === 'Cta. Padre' ? accountCode(value) : value
    const edited = previewRows.map(row => row.sourceRow === sourceRow ? { ...row, values: { ...row.values, [column]: cleanValue } } : row)
    const existing = planRows().filter(row => row.sourceUploadId !== selectedPreview.id)
    setPreviewRows(validateRows(edited, existing))
    setPreviewDirty(true)
    setPreviewMessage('')
  }

  const savePreviewChanges = () => {
    if (!selectedPreview || selectedPreview.status !== 'PENDIENTE') return
    const existing = planRows().filter(row => row.sourceUploadId !== selectedPreview.id)
    const rows = validateRows(previewRows, existing)
    const issueCount = rows.filter(row => row.issues.length).length
    const next = uploads.map(item => item.id === selectedPreview.id ? { ...item, reviewed: true, rows } : item)
    persistUploads(next, setUploads)
    setPreviewRows(rows)
    setPreviewDirty(false)
    setPreviewMessage(issueCount ? `Cambios guardados. Aún existen ${issueCount} filas con inconsistencias.` : 'Cambios guardados. El archivo está listo para procesarse.')
  }

  const openDiagram = (record: UploadRecord) => {
    if (record.status === 'ELIMINADO') return
    const existing = planRows().filter(row => row.sourceUploadId !== record.id)
    const rows = validateRows(record.rows, existing)
    const next = uploads.map(item => item.id === record.id ? { ...item, rows } : item)
    persistUploads(next, setUploads)
    setDiagramId(record.id)
    setError('')
    setMessage('')
  }

  const process = (record: UploadRecord) => {
    if (record.status !== 'PENDIENTE') return
    if (!record.reviewed) { setMessage(''); setError('Primero revisa la información con el ícono de la lupa.'); return }
    const existing = planRows().filter(row => row.sourceUploadId !== record.id)
    const rows = validateRows(record.rows, existing)
    const issueCount = rows.filter(row => row.issues.length).length
    if (issueCount) {
      const next = uploads.map(item => item.id === record.id ? { ...item, rows } : item)
      persistUploads(next, setUploads)
      setMessage('')
      setError(`No se puede procesar: existen ${issueCount} filas con inconsistencias.`)
      return
    }
    const processed = rows.map(row => ({ ...row.values, sourceUploadId: record.id }))
    localStorage.setItem(planKey, JSON.stringify([...existing, ...processed]))
    const next = uploads.map(item => item.id === record.id ? { ...item, rows, status: 'PROCESADO' as const } : item)
    persistUploads(next, setUploads)
    setError('')
    setMessage(`${processed.length} cuentas fueron procesadas correctamente.`)
  }

  const confirmDelete = () => {
    if (!selectedDelete) return
    const remainingPlan = planRows().filter(row => row.sourceUploadId !== selectedDelete.id)
    localStorage.setItem(planKey, JSON.stringify(remainingPlan))
    const next = uploads.map(item => item.id === selectedDelete.id ? { ...item, status: 'ELIMINADO' as const, reviewed: false, rows: [] } : item)
    persistUploads(next, setUploads)
    setDeleteId(null)
    setPreviewId(current => current === selectedDelete.id ? null : current)
    setDiagramId(current => current === selectedDelete.id ? null : current)
    setError('')
    setMessage('El archivo y toda la información asociada fueron eliminados.')
  }

  return <div className="page screen-page account-migration-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header account-migration-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div><a className="primary-action account-example-download" href="/Ejemplo%20Plan%20Contable.xls" download><Download />Descargar Plan Contable de Ejemplo</a></section>

    <section className="account-upload-box">
      <div className="account-upload-fields"><label><span>Descripción</span><input value={description} onChange={event => { setDescription(event.target.value); setError(''); setMessage('') }} maxLength={160} placeholder="Identifica el origen o propósito de la carga" /></label><label className={`account-file-picker ${file ? 'selected' : ''}`}><input ref={fileInput} type="file" accept=".xls,.xlsx,.csv" onChange={chooseFile} />{file ? <FileSpreadsheet /> : <UploadCloud />}<span><strong>{file ? file.name : 'Adjuntar plan contable'}</strong><small>{file ? 'Haz clic para reemplazar el archivo' : 'Archivos XLS, XLSX o CSV'}</small></span></label></div>
      <button type="button" className="primary-action" onClick={upload} disabled={busy}><UploadCloud />{busy ? 'Validando…' : 'Cargar archivo'}</button>
    </section>

    {error && <div className="account-migration-feedback error" role="alert"><AlertTriangle />{error}</div>}
    {message && <div className="account-migration-feedback success" role="status"><CheckCircle2 />{message}</div>}

    <section className="account-files-box"><h2>Archivos Cargados</h2><div className="account-files-scroll"><table><thead><tr><th>Descripción</th><th>Archivo</th><th>Fecha</th><th>Usuario</th><th>Estado</th><th aria-label="Revisar" /><th aria-label="Descargar" /><th aria-label="Procesar" /><th aria-label="Diagrama" /><th aria-label="Eliminar" /></tr></thead><tbody>{uploads.map(record => <tr key={record.id}><td><strong>{record.description}</strong></td><td>{record.fileName}</td><td>{displayDate(record.loadedAt)}</td><td>{record.user}</td><td><span className={`account-upload-status ${record.status.toLowerCase()}`}>{record.status}</span></td><td><button type="button" className="account-row-action inspect" disabled={record.status === 'ELIMINADO'} title="Revisar y editar información" aria-label={`Revisar y editar ${record.fileName}`} onClick={() => openPreview(record)}><Eye /></button></td><td><button type="button" className="account-row-action download" disabled={record.status === 'ELIMINADO'} title="Descargar archivo con las correcciones guardadas" aria-label={`Descargar ${record.fileName}`} onClick={() => downloadEditableImport(record.fileName, expectedColumns, record.rows)}><Download /></button></td><td><button type="button" className="account-row-action process" disabled={record.status !== 'PENDIENTE'} title="Procesar información" aria-label={`Procesar ${record.fileName}`} onClick={() => process(record)}><Play /></button></td><td><button type="button" className="account-row-action diagram" disabled={record.status === 'ELIMINADO'} title="Ver diagrama de cuentas" aria-label={`Ver diagrama de ${record.fileName}`} onClick={() => openDiagram(record)}><Network /></button></td><td><button type="button" className="account-row-action delete" disabled={record.status === 'ELIMINADO'} title="Eliminar carga" aria-label={`Eliminar ${record.fileName}`} onClick={() => setDeleteId(record.id)}><Trash2 /></button></td></tr>)}{!uploads.length && <tr><td colSpan={10} className="account-files-empty">No existen archivos cargados.</td></tr>}</tbody></table></div></section>

    {selectedPreview && <div className="account-preview-backdrop" role="dialog" aria-modal="true" aria-label={`Revisión de ${selectedPreview.fileName}`}><section className="account-preview-modal"><header><div><span>Revisión del archivo</span><h2>{selectedPreview.fileName}</h2><p>{previewRows.length} filas · {previewRows.filter(row => row.issues.length).length} con inconsistencias</p></div><button type="button" aria-label="Cerrar revisión" onClick={() => setPreviewId(null)}><X /></button></header>{previewRows.filter(row => row.issues.length).length > 0 && <div className="account-preview-note"><AlertTriangle />Edita directamente {previewRows.filter(row => row.issues.length).length} las celdas. Las filas en color naranja contienen datos que deben corregirse antes de procesar.</div>}<div className="account-preview-grid"><table><thead><tr><th>Fila</th>{expectedColumns.map(column => <th key={column}>{column}</th>)}<th>Observaciones</th></tr></thead><tbody>{previewRows.map(row => <tr key={row.sourceRow} className={row.issues.length ? 'has-issues' : ''}><td>{row.sourceRow}</td>{expectedColumns.map(column => <td key={column}>{selectedPreview.status === 'PENDIENTE' ? <AccountCellEditor column={column} row={row} onChange={value => updatePreviewCell(row.sourceRow, column, value)} /> : row.values[column] || '—'}</td>)}<td>{row.issues.length ? row.issues.join(' · ') : 'Correcto'}</td></tr>)}</tbody></table></div><footer><div className={`account-preview-save-state ${previewRows.some(row => row.issues.length) ? 'warning' : 'ready'}`}>{previewMessage || (previewDirty ? 'Existen cambios sin guardar.' : previewRows.some(row => row.issues.length) ? 'Corrige las inconsistencias y guarda los cambios.' : 'La información está validada.')}</div><button type="button" className="quiet-button" onClick={() => setPreviewId(null)}>Cerrar</button>{selectedPreview.status === 'PENDIENTE' && <button type="button" className="quiet-button account-save-changes" disabled={!previewDirty} onClick={savePreviewChanges}><Save />Guardar cambios</button>}{selectedPreview.status === 'PENDIENTE' && <button type="button" className="primary-action" disabled={previewDirty || previewRows.some(row => row.issues.length)} title={previewDirty ? 'Guarda los cambios antes de procesar.' : previewRows.some(row => row.issues.length) ? 'Corrige todas las inconsistencias antes de procesar.' : 'Procesar información'} onClick={() => { setPreviewId(null); process(selectedPreview) }}><Play />Procesar información</button>}</footer></section></div>}

    {selectedDiagram && <div className="account-preview-backdrop" role="dialog" aria-modal="true" aria-label={`Diagrama de ${selectedDiagram.fileName}`}><section className="account-tree-modal"><header><div><span>Diagrama del plan contable</span><h2>{selectedDiagram.fileName}</h2><p>{selectedDiagram.rows.length} cuentas · {selectedDiagram.rows.filter(row => row.issues.length).length} con observaciones de jerarquía o datos</p></div><button type="button" aria-label="Cerrar diagrama" onClick={() => setDiagramId(null)}><X /></button></header><div className="account-tree-legend"><span><i className="correct" />Ubicación correcta</span><span><i className="issue" />Cuenta con inconsistencias</span><span>Selecciona un nodo azul para expandir o contraer su nivel.</span></div><AccountTreeDiagram rows={selectedDiagram.rows} /><footer><button type="button" className="quiet-button" onClick={() => setDiagramId(null)}>Cerrar</button>{selectedDiagram.status === 'PENDIENTE' && !selectedDiagram.reviewed && <button type="button" className="quiet-button" onClick={() => { setDiagramId(null); openPreview(selectedDiagram) }}><Eye />Revisar tabla</button>}{selectedDiagram.status === 'PENDIENTE' && selectedDiagram.reviewed && <button type="button" className="primary-action" onClick={() => { setDiagramId(null); process(selectedDiagram) }}><Play />Procesar información</button>}</footer></section></div>}

    {selectedDelete && <div className="account-delete-backdrop" role="alertdialog" aria-modal="true" aria-label="Confirmar eliminación"><section className="account-delete-modal"><span><AlertTriangle /></span><h2>¿Eliminar el archivo cargado?</h2><p>Se eliminará <strong>{selectedDelete.fileName}</strong> y toda la información que este documento haya incorporado en las tablas.</p><div><button type="button" className="quiet-button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger-action" onClick={confirmDelete}><Trash2 />Sí, eliminar</button></div></section></div>}
  </div>
}

function AccountCellEditor({ column, row, onChange }: { column: AccountColumn; row: AccountRow; onChange: (value: string) => void }) {
  const value = row.values[column]
  const label = `${column} fila ${row.sourceRow}`
  if (column === 'Tipo') return <select aria-label={label} value={value.toUpperCase()} onChange={event => onChange(event.target.value)}><option value="">Seleccionar</option><option value="MAYOR">Mayor</option><option value="AUXILIAR">Auxiliar</option></select>
  if (column === 'Grupo') return <select aria-label={label} value={value.toUpperCase()} onChange={event => onChange(event.target.value)}><option value="">Seleccionar</option>{[...validGroups].map(option => <option value={option} key={option}>{option.charAt(0) + option.slice(1).toLocaleLowerCase('es')}</option>)}</select>
  if (column === 'Estructura') return <select aria-label={label} value={value.toUpperCase()} onChange={event => onChange(event.target.value)}><option value="">Seleccionar</option>{structureOrder.map(option => <option value={option} key={option}>{option}</option>)}</select>
  if (column === 'Estado') return <select aria-label={label} value={value.toUpperCase()} onChange={event => onChange(event.target.value)}><option value="">Seleccionar</option><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select>
  return <input aria-label={label} value={value} inputMode={column === 'Codigo' || column === 'Cta. Padre' ? 'numeric' : 'text'} onChange={event => onChange(event.target.value)} />
}

type DiagramSourceNode = { id: string; label: string; issue: boolean; issues: string[]; children: DiagramSourceNode[] }
type DiagramLayoutNode = DiagramSourceNode & { x: number; y: number; depth: number }
type DiagramEdge = { parent: DiagramLayoutNode; child: DiagramLayoutNode }

function AccountTreeDiagram({ rows }: { rows: AccountRow[] }) {
  const rootId = 'PUC-ROOT'
  const toSource = (node: AccountTreeNode): DiagramSourceNode => ({
    id: `${node.row.sourceRow}:${node.row.values.Codigo}`,
    label: `${node.row.values.Codigo || 'SIN CÓDIGO'}-${node.row.values['Descripción'] || 'Sin descripción'}`,
    issue: node.row.issues.length > 0,
    issues: node.row.issues,
    children: node.children.map(toSource),
  })
  const root: DiagramSourceNode = { id: rootId, label: 'PUC', issue: false, issues: [], children: buildAccountTree(rows).map(toSource) }
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([rootId]))
  const allBranchIds = new Set<string>([rootId])
  const collectBranches = (node: DiagramSourceNode) => { if (node.children.length) allBranchIds.add(node.id); node.children.forEach(collectBranches) }
  root.children.forEach(collectBranches)

  const visibleNodes: DiagramLayoutNode[] = []
  const edges: DiagramEdge[] = []
  let nextLeafY = 58
  let maxDepth = 0
  const position = (node: DiagramSourceNode, depth: number): DiagramLayoutNode => {
    maxDepth = Math.max(maxDepth, depth)
    const visibleChildren = expanded.has(node.id) ? node.children : []
    const childLayouts = visibleChildren.map(child => position(child, depth + 1))
    const y = childLayouts.length ? (childLayouts[0].y + childLayouts[childLayouts.length - 1].y) / 2 : nextLeafY
    if (!childLayouts.length) nextLeafY += 76
    const layout = { ...node, x: 105 + depth * 300, y, depth }
    visibleNodes.push(layout)
    childLayouts.forEach(child => edges.push({ parent: layout, child }))
    return layout
  }
  position(root, 0)
  const height = Math.max(470, nextLeafY + 20)
  const width = Math.max(1120, 105 + (maxDepth + 2) * 300)
  const toggle = (node: DiagramLayoutNode) => {
    if (!node.children.length) return
    setExpanded(current => { const next = new Set(current); if (next.has(node.id)) next.delete(node.id); else next.add(node.id); return next })
  }
  const curvedPath = (fromX: number, fromY: number, toX: number, toY: number) => `M ${fromX} ${fromY} C ${fromX + (toX - fromX) * .45} ${fromY}, ${toX - (toX - fromX) * .45} ${toY}, ${toX} ${toY}`

  return <div className="account-tree-diagram"><div className="account-tree-diagram-toolbar"><div><strong>{visibleNodes.length - 1} cuentas visibles</strong><span>{rows.length} cuentas en total</span></div><button type="button" onClick={() => setExpanded(new Set([rootId]))}>Contraer</button><button type="button" onClick={() => setExpanded(new Set(allBranchIds))}>Expandir todo</button></div><div className="account-tree-svg-scroll"><svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="Diagrama horizontal del plan contable"><g className="account-diagram-edges">{edges.map(edge => <path key={`${edge.parent.id}-${edge.child.id}`} className={edge.child.issue ? 'issue' : ''} d={curvedPath(edge.parent.x, edge.parent.y, edge.child.x, edge.child.y)} />)}{visibleNodes.flatMap(node => { if (expanded.has(node.id) || !node.children.length) return []; const count = Math.min(node.children.length, 12); return Array.from({ length: count }, (_, index) => { const spread = (index - (count - 1) / 2) * 11; return <path className="stub" key={`${node.id}-stub-${index}`} d={curvedPath(node.x, node.y, node.x + 190, node.y + spread)} /> }) })}</g><g className="account-diagram-nodes">{visibleNodes.map(node => { const shortened = node.label.length > 42 ? `${node.label.slice(0, 39)}…` : node.label; const canExpand = node.children.length > 0; return <g key={node.id} className={`${node.issue ? 'issue' : ''} ${canExpand ? 'expandable' : ''} ${expanded.has(node.id) ? 'expanded' : ''}`} transform={`translate(${node.x} ${node.y})`} role={canExpand ? 'button' : undefined} tabIndex={canExpand ? 0 : undefined} aria-label={canExpand ? `${node.label}, ${node.children.length} cuentas subordinadas` : node.label} onClick={() => toggle(node)} onKeyDown={event => { if (canExpand && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); toggle(node) } }}><title>{node.label}{node.issues.length ? ` · ${node.issues.join(' · ')}` : ''}</title><text className="account-diagram-label" x="-10" y="4" textAnchor="end">{shortened}</text><circle r={node.id === rootId ? 6 : 5} />{canExpand && <text className="account-diagram-count" x="12" y="4">{node.children.length}</text>}</g>})}</g></svg></div></div>
}
