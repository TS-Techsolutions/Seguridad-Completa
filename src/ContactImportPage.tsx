import { useRef, useState, type ChangeEvent } from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, Download, Eye, FileSpreadsheet, Play, Save, Trash2, UploadCloud, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import type { CustomerRow } from './CustomerRegistryPage'
import { downloadEditableImport } from './editable-import-download'
import type { ScreenSpec } from './types'
import { cleanPhoneValue } from './phone-values'
import { cleanTextSpacing, comparableText, hasRepeatedSpaces } from './text-values'

type UploadStatus = 'PENDIENTE' | 'PROCESADO' | 'ELIMINADO'
type ContactColumn = (typeof expectedColumns)[number]
type ContactValues = Record<ContactColumn, string>
type ContactRow = { sourceRow: number; values: ContactValues; issues: string[] }
type UploadRecord = {
  id: string
  description: string
  fileName: string
  loadedAt: string
  user: string
  status: UploadStatus
  reviewed: boolean
  rows: ContactRow[]
}
type SupplierGroup = { id: string; description: string; state: string }

const uploadsKey = 'saga.contact-import.uploads'
const customerKey = 'saga.customers'
const providerKey = 'saga.providers'
const supplierGroupKey = 'saga.supplier-groups'
const expectedColumns = ['PROV CLIENTE', 'Tipo Documento', 'Identificación', 'Razón Social', 'Email', 'Email Asistente', 'Persona Contacto', 'Dirección', 'Teléfono', 'Grupo Proveedores'] as const
const requiredColumns: ContactColumn[] = ['PROV CLIENTE', 'Tipo Documento', 'Identificación', 'Razón Social']
const validTypes = new Set(['CLI', 'PROV'])
const validDocumentTypes = new Set(['CI', 'RUC', 'PASAPORTE'])

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

function text(value: unknown) {
  return String(value ?? '').replace(/\uFFFD/g, '').trim().replace(/\.0$/, '')
}

function documentType(value: unknown) {
  const normalized = normalize(value)
  if (['CI', 'CIUDADANIA', 'CEDULA', 'CEDULAIDENTIDAD'].includes(normalized)) return 'CI'
  if (normalized === 'RUC') return 'RUC'
  if (normalized === 'PASAPORTE') return 'PASAPORTE'
  return text(value).toUpperCase()
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

function activeSupplierGroups() {
  return readJson<SupplierGroup[]>(supplierGroupKey, []).filter(group => String(group.state).toUpperCase() === 'ACTIVO')
}

function parseWorkbook(file: File): Promise<ContactRow[]> {
  return file.arrayBuffer().then(buffer => {
    const workbook = XLSX.read(buffer, { type: 'array', raw: false })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!firstSheet) throw new Error('El archivo no contiene hojas para procesar.')
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: '', raw: false })
    const headerRow = matrix.findIndex(row => normalize(row[0]) === 'PROVCLIENTE')
    if (headerRow < 0) throw new Error('No se encontró la columna PROV CLIENTE en la primera columna de la plantilla.')
    const header = matrix[headerRow]
    const indexes = Object.fromEntries(expectedColumns.map(column => [column, header.findIndex(cell => normalize(cell) === normalize(column))])) as Record<ContactColumn, number>
    const missing = requiredColumns.filter(column => indexes[column] < 0)
    if (missing.length) throw new Error(`Faltan columnas obligatorias: ${missing.join(', ')}.`)
    return matrix.slice(headerRow + 1).map((row, index) => {
      const values = Object.fromEntries(expectedColumns.map(column => {
        const value = indexes[column] < 0 ? '' : row[indexes[column]]
        if (column === 'PROV CLIENTE') return [column, text(value).toUpperCase()]
        if (column === 'Tipo Documento') return [column, documentType(value)]
        return [column, text(value)]
      })) as ContactValues
      return { sourceRow: headerRow + index + 2, values, issues: [] }
    }).filter(row => expectedColumns.some(column => row.values[column]))
  })
}

function validateRows(rows: ContactRow[], excludedUploadId?: string) {
  const customers = readJson<CustomerRow[]>(customerKey, []).filter(row => row.sourceUploadId !== excludedUploadId)
  const providers = readJson<CustomerRow[]>(providerKey, []).filter(row => row.sourceUploadId !== excludedUploadId)
  const existingCustomerIds = new Set(customers.map(row => normalize(row.identification)))
  const existingProviderIds = new Set(providers.map(row => normalize(row.identification)))
  const existingCustomerNames = new Map(customers.map(row => [comparableText(row.businessName), normalize(row.identification)]))
  const existingProviderNames = new Map(providers.map(row => [comparableText(row.businessName), normalize(row.identification)]))
  const groupNames = new Set(activeSupplierGroups().map(group => normalize(group.description)))
  const counts = rows.reduce<Record<string, number>>((result, row) => {
    const key = `${normalize(row.values['PROV CLIENTE'])}:${normalize(row.values.Identificación)}`
    result[key] = (result[key] ?? 0) + 1
    return result
  }, {})
  const nameCounts = rows.reduce<Record<string, number>>((result, row) => {
    const name = comparableText(row.values['Razón Social'])
    const type = normalize(row.values['PROV CLIENTE'])
    if (name) result[`${type}:${name}`] = (result[`${type}:${name}`] ?? 0) + 1
    return result
  }, {})

  return rows.map(row => {
    const values = row.values
    const issues: string[] = []
    const type = normalize(values['PROV CLIENTE'])
    const id = normalize(values.Identificación)
    const key = `${type}:${id}`
    const nameKey = `${type}:${comparableText(values['Razón Social'])}`
    if (!validTypes.has(type)) issues.push('La primera columna debe contener CLI o PROV')
    if (!validDocumentTypes.has(documentType(values['Tipo Documento']))) issues.push('Tipo Documento esperado: C.I., RUC o Pasaporte')
    if (!values.Identificación) issues.push('Identificación obligatoria')
    if (!values['Razón Social']) issues.push('Razón Social obligatoria')
    if (hasRepeatedSpaces(values['Razón Social'])) issues.push('Razón Social contiene espacios repetidos; corrige la información antes de procesar')
    if (hasRepeatedSpaces(values['Persona Contacto'])) issues.push('Persona Contacto contiene espacios repetidos')
    if (id && counts[key] > 1) issues.push(`Identificación repetida para ${type || 'el mismo tipo'}`)
    if (comparableText(values['Razón Social']) && nameCounts[nameKey] > 1) issues.push('Razón Social duplicada o equivalente dentro del archivo')
    if (type === 'CLI' && existingCustomerIds.has(id)) issues.push('La identificación ya existe en Clientes')
    if (type === 'PROV' && existingProviderIds.has(id)) issues.push('La identificación ya existe en Proveedores')
    if (type === 'CLI' && existingCustomerNames.has(comparableText(values['Razón Social'])) && existingCustomerNames.get(comparableText(values['Razón Social'])) !== id) issues.push('Razón Social coincide con otro cliente registrado')
    if (type === 'PROV' && existingProviderNames.has(comparableText(values['Razón Social'])) && existingProviderNames.get(comparableText(values['Razón Social'])) !== id) issues.push('Razón Social coincide con otro proveedor registrado')
    if (values.Email && !/^\S+@\S+\.\S+$/.test(values.Email)) issues.push('Email no válido')
    if (values['Email Asistente'] && !/^\S+@\S+\.\S+$/.test(values['Email Asistente'])) issues.push('Email Asistente no válido')
    if (type === 'PROV' && values['Grupo Proveedores'] && !groupNames.has(normalize(values['Grupo Proveedores']))) issues.push('Grupo de Proveedores no registrado o inactivo')
    return { ...row, issues: [...new Set(issues)] }
  })
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function registryRow(row: ContactRow, uploadId: string): CustomerRow {
  const values = row.values
  const type = normalize(values['PROV CLIENTE'])
  const group = activeSupplierGroups().find(item => normalize(item.description) === normalize(values['Grupo Proveedores']))
  return {
    id: crypto.randomUUID(),
    documentType: documentType(values['Tipo Documento']) as CustomerRow['documentType'],
    identification: values.Identificación,
    businessName: cleanTextSpacing(values['Razón Social']),
    email: values.Email,
    assistantEmail: values['Email Asistente'],
    contactPerson: cleanTextSpacing(values['Persona Contacto']),
    isProvider: type === 'PROV',
    isCustomer: type === 'CLI',
    address: values.Dirección,
    phone: cleanPhoneValue(values.Teléfono),
    state: 'ACTIVO',
    supplierGroupId: type === 'PROV' ? group?.id ?? '' : '',
    bankName: '',
    bankAccountType: 'CORRIENTE',
    bankAccountNumber: '',
    sourceUploadId: uploadId,
  }
}

export function ContactImportPage({ screen }: { screen: ScreenSpec }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<UploadRecord[]>(() => readJson(uploadsKey, []))
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewRows, setPreviewRows] = useState<ContactRow[]>([])
  const [previewDirty, setPreviewDirty] = useState(false)
  const [previewMessage, setPreviewMessage] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const selectedPreview = uploads.find(record => record.id === previewId)
  const selectedDelete = uploads.find(record => record.id === deleteId)

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null)
    setError('')
    setMessage('')
  }

  const upload = async () => {
    if (!description.trim()) { setMessage(''); setError('Ingresa la descripción del archivo.'); return }
    if (!file) { setMessage(''); setError('Selecciona el archivo de Proveedores/Clientes.'); return }
    setBusy(true)
    try {
      const parsed = await parseWorkbook(file)
      if (!parsed.length) throw new Error('El archivo no contiene Proveedores o Clientes para cargar.')
      const record: UploadRecord = {
        id: crypto.randomUUID(), description: description.trim(), fileName: file.name,
        loadedAt: new Date().toISOString(), user: 'Jorge', status: 'PENDIENTE', reviewed: false,
        rows: validateRows(parsed),
      }
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
    const rows = validateRows(record.rows, record.id)
    const next = uploads.map(item => item.id === record.id ? { ...item, reviewed: true, rows } : item)
    persistUploads(next, setUploads)
    setPreviewRows(rows)
    setPreviewDirty(false)
    setPreviewMessage('')
    setPreviewId(record.id)
    setError('')
    setMessage('')
  }

  const updatePreviewCell = (sourceRow: number, column: ContactColumn, value: string) => {
    if (!selectedPreview || selectedPreview.status !== 'PENDIENTE') return
    const cleanValue = column === 'PROV CLIENTE' ? value.toUpperCase() : column === 'Tipo Documento' ? documentType(value) : column === 'Teléfono' ? cleanPhoneValue(value) : text(value)
    const edited = previewRows.map(row => row.sourceRow === sourceRow ? { ...row, values: { ...row.values, [column]: cleanValue } } : row)
    setPreviewRows(validateRows(edited, selectedPreview.id))
    setPreviewDirty(true)
    setPreviewMessage('')
  }

  const savePreviewChanges = () => {
    if (!selectedPreview || selectedPreview.status !== 'PENDIENTE') return
    const rows = validateRows(previewRows, selectedPreview.id)
    const issueCount = rows.filter(row => row.issues.length).length
    const next = uploads.map(item => item.id === selectedPreview.id ? { ...item, reviewed: true, rows } : item)
    persistUploads(next, setUploads)
    setPreviewRows(rows)
    setPreviewDirty(false)
    setPreviewMessage(issueCount ? `Cambios guardados. Aún existen ${issueCount} filas con inconsistencias.` : 'Cambios guardados. El archivo está listo para procesarse.')
  }

  const process = (record: UploadRecord) => {
    if (record.status !== 'PENDIENTE') return
    if (!record.reviewed) { setMessage(''); setError('Primero revisa la información con el ícono de la lupa.'); return }
    const rows = validateRows(record.rows, record.id)
    const issueCount = rows.filter(row => row.issues.length).length
    if (issueCount) {
      persistUploads(uploads.map(item => item.id === record.id ? { ...item, rows } : item), setUploads)
      setMessage('')
      setError(`No se puede procesar: existen ${issueCount} filas con inconsistencias.`)
      return
    }
    const currentCustomers = readJson<CustomerRow[]>(customerKey, []).filter(row => row.sourceUploadId !== record.id)
    const currentProviders = readJson<CustomerRow[]>(providerKey, []).filter(row => row.sourceUploadId !== record.id)
    const imported = rows.map(row => registryRow(row, record.id))
    const customers = imported.filter(row => row.isCustomer)
    const providers = imported.filter(row => row.isProvider)
    localStorage.setItem(customerKey, JSON.stringify([...customers, ...currentCustomers]))
    localStorage.setItem(providerKey, JSON.stringify([...providers, ...currentProviders]))
    const next = uploads.map(item => item.id === record.id ? { ...item, rows, status: 'PROCESADO' as const } : item)
    persistUploads(next, setUploads)
    setError('')
    setMessage(`${customers.length} clientes y ${providers.length} proveedores fueron procesados correctamente.`)
  }

  const confirmDelete = () => {
    if (!selectedDelete) return
    localStorage.setItem(customerKey, JSON.stringify(readJson<CustomerRow[]>(customerKey, []).filter(row => row.sourceUploadId !== selectedDelete.id)))
    localStorage.setItem(providerKey, JSON.stringify(readJson<CustomerRow[]>(providerKey, []).filter(row => row.sourceUploadId !== selectedDelete.id)))
    const next = uploads.map(item => item.id === selectedDelete.id ? { ...item, status: 'ELIMINADO' as const, reviewed: false, rows: [] } : item)
    persistUploads(next, setUploads)
    setDeleteId(null)
    setPreviewId(current => current === selectedDelete.id ? null : current)
    setError('')
    setMessage('El archivo y toda la información que incorporó fueron eliminados.')
  }

  return <div className="page screen-page account-migration-page contact-import-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header account-migration-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div><a className="primary-action account-example-download" href="/Ejemplo%20Proveedores-Clientes.xlsx" download="Ejemplo Proveedores-Clientes.xlsx"><Download />Descargar Plantilla</a></section>

    <section className="account-upload-box">
      <div className="account-upload-fields"><label><span>Descripción</span><input value={description} onChange={event => { setDescription(event.target.value); setError(''); setMessage('') }} maxLength={160} placeholder="Identifica el origen o propósito de la carga" /></label><label className={`account-file-picker ${file ? 'selected' : ''}`}><input ref={fileInput} type="file" accept=".xls,.xlsx,.csv" onChange={chooseFile} />{file ? <FileSpreadsheet /> : <UploadCloud />}<span><strong>{file ? file.name : 'Adjuntar archivo de Proveedores/Clientes'}</strong><small>{file ? 'Haz clic para reemplazar el archivo' : 'Archivos XLS, XLSX o CSV'}</small></span></label></div>
      <button type="button" className="primary-action" onClick={upload} disabled={busy}><UploadCloud />{busy ? 'Validando…' : 'Cargar archivo'}</button>
    </section>
    <div className="import-requirements-note"><CheckCircle2 /><span><strong>Campos obligatorios:</strong> Prov/Cliente, Tipo Documento, Identificación y Razón Social. Los demás campos son opcionales y pueden completarse posteriormente en el registro del cliente o proveedor.</span></div>

    {error && <div className="account-migration-feedback error" role="alert"><AlertTriangle />{error}</div>}
    {message && <div className="account-migration-feedback success" role="status"><CheckCircle2 />{message}</div>}

    <section className="account-files-box"><h2>Archivos Cargados</h2><div className="account-files-scroll"><table><thead><tr><th>Descripción</th><th>Archivo</th><th>Fecha</th><th>Usuario</th><th>Estado</th><th aria-label="Revisar" /><th aria-label="Descargar" /><th aria-label="Procesar" /><th aria-label="Eliminar" /></tr></thead><tbody>{uploads.map(record => <tr key={record.id}><td><strong>{record.description}</strong></td><td>{record.fileName}</td><td>{displayDate(record.loadedAt)}</td><td>{record.user}</td><td><span className={`account-upload-status ${record.status.toLowerCase()}`}>{record.status}</span></td><td><button type="button" className="account-row-action inspect" disabled={record.status === 'ELIMINADO'} title="Revisar y editar información" aria-label={`Revisar y editar ${record.fileName}`} onClick={() => openPreview(record)}><Eye /></button></td><td><button type="button" className="account-row-action download" disabled={record.status === 'ELIMINADO'} title="Descargar archivo con las correcciones guardadas" aria-label={`Descargar ${record.fileName}`} onClick={() => downloadEditableImport(record.fileName, expectedColumns, record.rows)}><Download /></button></td><td><button type="button" className="account-row-action process" disabled={record.status !== 'PENDIENTE'} title="Procesar información" aria-label={`Procesar ${record.fileName}`} onClick={() => process(record)}><Play /></button></td><td><button type="button" className="account-row-action delete" disabled={record.status === 'ELIMINADO'} title="Eliminar carga" aria-label={`Eliminar ${record.fileName}`} onClick={() => setDeleteId(record.id)}><Trash2 /></button></td></tr>)}{!uploads.length && <tr><td colSpan={9} className="account-files-empty">No existen archivos cargados.</td></tr>}</tbody></table></div></section>

    {selectedPreview && <div className="account-preview-backdrop" role="dialog" aria-modal="true" aria-label={`Revisión de ${selectedPreview.fileName}`}><section className="account-preview-modal contact-preview-modal"><header><div><span>Revisión del archivo</span><h2>{selectedPreview.fileName}</h2><p>{previewRows.length} filas · {previewRows.filter(row => row.issues.length).length} con inconsistencias</p></div><button type="button" aria-label="Cerrar revisión" onClick={() => setPreviewId(null)}><X /></button></header>{previewRows.some(row => row.issues.length) && <div className="account-preview-note"><AlertTriangle />Se encontraron {previewRows.filter(row => row.issues.length).length} filas con inconsistencias. Edita directamente las celdas marcadas en color naranja antes de procesar.</div>}<div className="account-preview-grid"><table><thead><tr><th>Fila</th>{expectedColumns.map(column => <th key={column}>{column}</th>)}<th>Observaciones</th></tr></thead><tbody>{previewRows.map(row => <tr key={row.sourceRow} className={row.issues.length ? 'has-issues' : ''}><td>{row.sourceRow}</td>{expectedColumns.map(column => <td key={column}>{selectedPreview.status === 'PENDIENTE' ? <ContactCellEditor column={column} row={row} onChange={value => updatePreviewCell(row.sourceRow, column, value)} /> : row.values[column] || '—'}</td>)}<td>{row.issues.length ? row.issues.join(' · ') : 'Correcto'}</td></tr>)}</tbody></table></div><footer><div className={`account-preview-save-state ${previewRows.some(row => row.issues.length) ? 'warning' : 'ready'}`}>{previewMessage || (previewDirty ? 'Existen cambios sin guardar.' : previewRows.some(row => row.issues.length) ? 'Corrige las inconsistencias y guarda los cambios.' : 'La información está validada.')}</div><button type="button" className="quiet-button" onClick={() => setPreviewId(null)}>Cerrar</button>{selectedPreview.status === 'PENDIENTE' && <button type="button" className="quiet-button account-save-changes" disabled={!previewDirty} onClick={savePreviewChanges}><Save />Guardar cambios</button>}{selectedPreview.status === 'PENDIENTE' && <button type="button" className="primary-action" disabled={previewDirty || previewRows.some(row => row.issues.length)} title={previewDirty ? 'Guarda los cambios antes de procesar.' : previewRows.some(row => row.issues.length) ? 'Corrige todas las inconsistencias antes de procesar.' : 'Procesar información'} onClick={() => { setPreviewId(null); process(selectedPreview) }}><Play />Procesar información</button>}</footer></section></div>}

    {selectedDelete && <div className="account-delete-backdrop" role="alertdialog" aria-modal="true" aria-label="Confirmar eliminación"><section className="account-delete-modal"><span><AlertTriangle /></span><h2>¿Eliminar el archivo cargado?</h2><p>Se eliminará <strong>{selectedDelete.fileName}</strong> y todos los Clientes o Proveedores que este documento haya incorporado.</p><div><button type="button" className="quiet-button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger-action" onClick={confirmDelete}><Trash2 />Sí, eliminar</button></div></section></div>}
  </div>
}

function ContactCellEditor({ column, row, onChange }: { column: ContactColumn; row: ContactRow; onChange: (value: string) => void }) {
  const value = row.values[column]
  const label = `${column} fila ${row.sourceRow}`
  if (column === 'PROV CLIENTE') return <select aria-label={label} value={value.toUpperCase()} onChange={event => onChange(event.target.value)}><option value="">Seleccionar</option><option value="CLI">CLI</option><option value="PROV">PROV</option></select>
  if (column === 'Tipo Documento') return <select aria-label={label} value={documentType(value)} onChange={event => onChange(event.target.value)}><option value="">Seleccionar</option><option value="CI">C.I.</option><option value="RUC">RUC</option><option value="PASAPORTE">Pasaporte</option></select>
  return <input aria-label={label} value={value} inputMode={column === 'Identificación' || column === 'Teléfono' ? 'text' : column.includes('Email') ? 'email' : 'text'} onChange={event => onChange(event.target.value)} />
}
