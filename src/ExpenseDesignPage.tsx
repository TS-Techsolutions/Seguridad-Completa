import { useState, type ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, CheckCircle2, ChevronRight, Eye, FileText, ImagePlus, Pencil, RotateCcw, Save, ShieldCheck, X } from 'lucide-react'
import { api } from './api'
import { ExpenseDocument, type ExpenseDocumentData } from './ExpenseDocument'
import type { Context, ScreenSpec } from './types'

export type BlockId = 'company' | 'customer' | 'detail' | 'payment' | 'legal' | 'signatures'
export type FieldId = 'owner' | 'address' | 'ownerId' | 'phone' | 'email'
export type ColumnId = 'concept' | 'aliquot' | 'quantity' | 'unitPrice' | 'total'
export type CompanyFieldId = 'businessName' | 'ruc' | 'address' | 'phone' | 'email'
type DesignStatus = 'BORRADOR' | 'ACTIVO'
export type DesignConfig = {
  companyId: string
  companyName: string
  version: number
  status: DesignStatus
  updatedAt: string
  title: string
  fontFamily: string
  accent: string
  logo: string
  legalText: string
  blocks: Array<{ id: BlockId; visible: boolean }>
  blockTexts: Record<BlockId, string>
  companyFields: Record<CompanyFieldId, boolean>
  fields: Record<FieldId, boolean>
  columns: Array<{ id: ColumnId; label: string; visible: boolean }>
}

const blockLabels: Record<BlockId, string> = { company: 'Encabezado de la empresa', customer: 'Datos del cliente e inmueble', detail: 'Detalle de servicios', payment: 'Forma de pago y totales', legal: 'Texto legal', signatures: 'Firmas' }
const fieldLabels: Record<FieldId, string> = { owner: 'Cliente', address: 'Dirección', ownerId: 'Identificación', phone: 'Teléfono', email: 'Email' }
const companyFieldLabels: Record<CompanyFieldId, string> = { businessName: 'Razón Social', ruc: 'RUC', address: 'Dirección', phone: 'Teléfono', email: 'Email' }

const previewData: ExpenseDocumentData = {
  receiptNumber: '001-001-000001', documentType: 'Documento Complementario', issueDate: 'GUAYAQUIL, 01 DE OCTUBRE DEL 2026',
  owner: 'CLIENTE DE EJEMPLO', ownerId: '0999999999001', address: 'TORRE A, PISO 10, DEPARTAMENTO 1006', phone: '099 999 9999', email: 'cliente@correo.com',
  companyAddress: 'Dirección principal del cliente', companyPhone: 'Teléfono: (04) 500 0000', companyEmail: 'administracion@cliente.com',
  amountInWords: 'TRESCIENTOS SETENTA Y CUATRO CON 61/100 DÓLARES', paymentMethod: 'OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO', paymentTerm: '10', paymentUnit: 'Día(s)',
  subtotal: '406,49', discount: '31,88', tax: '0,00', total: '374,61',
  lines: [
    { id: 'sample-1', concept: 'Expensas departamento mes octubre 2026', aliquot: '189,85', quantity: '1,00', unitPrice: '251,67', total: '251,67' },
    { id: 'sample-2', concept: 'Administración y mantenimiento', aliquot: '', quantity: '1,00', unitPrice: '10,00', total: '10,00' },
    { id: 'sample-3', concept: 'Expensas parqueadero mes octubre 2026', aliquot: '5,44', quantity: '1,00', unitPrice: '85,31', total: '85,31' },
    { id: 'sample-4', concept: 'Seguridad y vigilancia', aliquot: '', quantity: '1,00', unitPrice: '27,63', total: '27,63' },
  ],
}

function defaultDesign(company: Context['company']): DesignConfig {
  return {
    companyId: company.id,
    companyName: company.name,
    version: 1,
    status: 'BORRADOR',
    updatedAt: '',
    title: 'COMPROBANTE DE EXPENSAS',
    fontFamily: 'Georgia, serif',
    accent: '#e54848',
    logo: '',
    legalText: 'Documento complementario emitido por la administración del inmueble. Conserve este comprobante como respaldo de los valores detallados.',
    blocks: [
      { id: 'company', visible: true }, { id: 'customer', visible: true }, { id: 'detail', visible: true },
      { id: 'payment', visible: true }, { id: 'legal', visible: true }, { id: 'signatures', visible: true },
    ],
    blockTexts: { company: '', customer: '', detail: '', payment: '', legal: '', signatures: '' },
    companyFields: { businessName: true, ruc: true, address: true, phone: true, email: true },
    fields: { owner: true, address: true, ownerId: true, phone: true, email: true },
    columns: [
      { id: 'concept', label: 'Concepto del servicio', visible: true }, { id: 'aliquot', label: 'Mt2', visible: true },
      { id: 'quantity', label: 'Valor Unitario', visible: true }, { id: 'unitPrice', label: 'Precio unitario', visible: true }, { id: 'total', label: 'Total', visible: true },
    ],
  }
}

function storageKey(companyId: string) {
  return `saga.expense-design:${companyId}`
}

export function loadExpenseDesign(company: Context['company']) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(company.id)) ?? 'null') as DesignConfig | null
    const base = defaultDesign(company)
    if (saved?.companyId !== company.id) return base
    return {
      ...base,
      ...saved,
      blockTexts: { ...base.blockTexts, ...(saved.blockTexts ?? {}) },
      companyFields: (Object.keys(base.companyFields) as CompanyFieldId[]).reduce((result, field) => ({ ...result, [field]: saved.companyFields?.[field] ?? base.companyFields[field] }), {} as Record<CompanyFieldId, boolean>),
      fields: (Object.keys(base.fields) as FieldId[]).reduce((result, field) => ({ ...result, [field]: saved.fields?.[field] ?? base.fields[field] }), {} as Record<FieldId, boolean>),
      columns: (saved.columns?.length ? saved.columns : base.columns).map(column => {
        if (column.id === 'aliquot') return { ...column, label: 'Mt2' }
        if (column.id === 'quantity' && column.label.trim().toLocaleLowerCase('es') === 'cantidad') return { ...column, label: 'Valor Unitario' }
        return column
      }),
    }
  } catch {
    return defaultDesign(company)
  }
}

export function ExpenseDesignPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <ExpenseDesigner key={context.data.company.id} screen={screen} company={context.data.company} />
}

function ExpenseDesigner({ screen, company }: { screen: ScreenSpec; company: Context['company'] }) {
  const [design, setDesign] = useState<DesignConfig>(() => loadExpenseDesign(company))
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState(false)
  const [editingBlock, setEditingBlock] = useState<BlockId | null>(null)
  const [blockText, setBlockText] = useState('')
  const [editingCompanyHeader, setEditingCompanyHeader] = useState(false)
  const [companyHeaderDraft, setCompanyHeaderDraft] = useState(() => ({ fields: { ...design.companyFields }, text: design.blockTexts.company }))

  const persist = (status: DesignStatus) => {
    const next = { ...design, companyId: company.id, companyName: company.name, status, version: status === 'ACTIVO' ? design.version + 1 : design.version, updatedAt: new Date().toISOString() }
    localStorage.setItem(storageKey(company.id), JSON.stringify(next))
    setDesign(next)
    setMessage(status === 'ACTIVO' ? `Diseño v${next.version} activado únicamente para ${company.name}.` : `Borrador guardado para ${company.name}.`)
  }

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= design.blocks.length) return
    const blocks = [...design.blocks]
    ;[blocks[index], blocks[target]] = [blocks[target], blocks[index]]
    setDesign(current => ({ ...current, blocks }))
  }

  const loadLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setMessage('Selecciona un archivo de imagen válido.'); return }
    const reader = new FileReader()
    reader.onload = () => setDesign(current => ({ ...current, logo: String(reader.result ?? '') }))
    reader.readAsDataURL(file)
  }

  const reset = () => {
    setDesign(defaultDesign(company))
    setMessage('Se restauró el diseño base en el editor. Guarda o activa para aplicarlo al cliente.')
  }

  const openBlockText = (block: BlockId) => {
    if (block === 'company') {
      setCompanyHeaderDraft({ fields: { ...design.companyFields }, text: design.blockTexts.company })
      setEditingCompanyHeader(true)
      return
    }
    setEditingBlock(block)
    setBlockText(design.blockTexts[block])
  }

  const saveBlockText = () => {
    if (!editingBlock) return
    setDesign(current => ({ ...current, blockTexts: { ...current.blockTexts, [editingBlock]: blockText.trim() } }))
    setEditingBlock(null)
  }

  const saveCompanyHeader = () => {
    setDesign(current => ({ ...current, companyFields: { ...companyHeaderDraft.fields }, blockTexts: { ...current.blockTexts, company: companyHeaderDraft.text.trim() } }))
    setEditingCompanyHeader(false)
  }

  return <div className="page screen-page expense-design-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header expense-design-header"><div><div className="screen-id"><span>{screen.id}</span><b>Plantilla por cliente</b></div><h1>{screen.titulo_original}</h1></div><div className="expense-design-actions"><button type="button" className="quiet-button" onClick={() => setPreview(true)}><Eye />Vista Previa</button><button type="button" className="quiet-button" onClick={() => persist('BORRADOR')}><Save />Guardar Borrador</button><button type="button" className="primary-action" onClick={() => persist('ACTIVO')}><CheckCircle2 />Activar Diseño</button></div></section>

    <div className="expense-tenant-lock"><ShieldCheck /><div><span>Diseño asignado exclusivamente a</span><strong>{company.name}</strong><small>Empresa ID: {company.id} · La plantilla se almacena separada de los demás clientes.</small></div><b className={design.status.toLowerCase()}>{design.status} · V{design.version}</b></div>
    {message && <div className="expense-design-message" role="status">{message}</div>}

    <div className="expense-designer-layout">
      <aside className="expense-design-controls">
        <section><h2>Formato</h2><label><span>Título del documento</span><input value={design.title} onChange={event => setDesign(current => ({ ...current, title: event.target.value }))} /></label><div className="expense-control-pair"><label><span>Tipografía</span><select value={design.fontFamily} onChange={event => setDesign(current => ({ ...current, fontFamily: event.target.value }))}><option value="Georgia, serif">Clásica</option><option value="Arial, sans-serif">Moderna</option><option value="'Courier New', monospace">Monoespaciada</option></select></label><label><span>Color destacado</span><input type="color" value={design.accent} onChange={event => setDesign(current => ({ ...current, accent: event.target.value }))} /></label></div><label className="expense-logo-input"><ImagePlus /><span><strong>{design.logo ? 'Reemplazar logotipo' : 'Cargar logotipo'}</strong><small>PNG, JPG o SVG</small></span><input type="file" accept="image/*" onChange={loadLogo} /></label></section>

        <section><h2>Bloques y orden</h2><div className="expense-block-list">{design.blocks.map((block, index) => <div key={block.id}><label><input type="checkbox" checked={block.visible} onChange={() => setDesign(current => ({ ...current, blocks: current.blocks.map(item => item.id === block.id ? { ...item, visible: !item.visible } : item) }))} /><span>{blockLabels[block.id]}</span></label><button type="button" className={design.blockTexts[block.id] || block.id === 'company' ? 'has-text' : ''} onClick={() => openBlockText(block.id)} aria-label={block.id === 'company' ? 'Editar Encabezado de la empresa' : `Editar texto de ${blockLabels[block.id]}`} title={block.id === 'company' ? 'Configurar campos del encabezado' : 'Agregar o editar texto'}><Pencil /></button><button type="button" disabled={index === 0} onClick={() => moveBlock(index, -1)} aria-label={`Subir ${blockLabels[block.id]}`}><ArrowUp /></button><button type="button" disabled={index === design.blocks.length - 1} onClick={() => moveBlock(index, 1)} aria-label={`Bajar ${blockLabels[block.id]}`}><ArrowDown /></button></div>)}</div></section>

        <section><h2>Datos visibles</h2><div className="expense-check-grid">{(Object.keys(fieldLabels) as FieldId[]).map(field => <label key={field}><input type="checkbox" checked={design.fields[field]} onChange={() => setDesign(current => ({ ...current, fields: { ...current.fields, [field]: !current.fields[field] } }))} />{fieldLabels[field]}</label>)}</div></section>

        <section><h2>Columnas del detalle</h2><div className="expense-column-list">{design.columns.map(column => <label key={column.id}><input type="checkbox" checked={column.visible} disabled={column.id === 'concept' || column.id === 'total'} onChange={() => setDesign(current => ({ ...current, columns: current.columns.map(item => item.id === column.id ? { ...item, visible: !item.visible } : item) }))} /><input value={column.label} onChange={event => setDesign(current => ({ ...current, columns: current.columns.map(item => item.id === column.id ? { ...item, label: event.target.value } : item) }))} /></label>)}</div></section>

        <section><h2>Texto legal o informativo</h2><textarea rows={5} value={design.legalText} onChange={event => setDesign(current => ({ ...current, legalText: event.target.value }))} /></section>
        <button type="button" className="expense-reset" onClick={reset}><RotateCcw />Restablecer diseño base</button>
      </aside>

      <main className="expense-canvas-area"><div className="expense-canvas-title"><div><FileText /><span><strong>Vista previa A4</strong><small>Datos demostrativos; el documento final usará la información real de la expensa.</small></span></div><span>{company.name}</span></div><ExpenseDocument design={design} company={company} data={previewData} /></main>
    </div>

    {preview && <div className="expense-preview-backdrop" role="dialog" aria-modal="true" aria-label="Vista previa de expensa"><div className="expense-preview-dialog"><header><div><span>Vista previa del diseño</span><strong>{company.name} · Versión {design.version}</strong></div><button type="button" onClick={() => setPreview(false)}>Cerrar</button></header><div><ExpenseDocument design={design} company={company} data={previewData} large /></div><footer><button type="button" className="quiet-button" onClick={() => window.print()}>Imprimir / Guardar PDF</button><button type="button" className="primary-action" onClick={() => setPreview(false)}>Volver al Editor</button></footer></div></div>}

    {editingBlock && <div className="expense-block-text-backdrop" role="dialog" aria-modal="true" aria-label={`Editar texto de ${blockLabels[editingBlock]}`}><section className="expense-block-text-dialog"><header><div><span>Texto adicional del bloque</span><h2>{blockLabels[editingBlock]}</h2></div><button type="button" aria-label="Cerrar editor de texto" onClick={() => setEditingBlock(null)}><X /></button></header><div><label><span>Texto</span><textarea rows={6} maxLength={600} value={blockText} onChange={event => setBlockText(event.target.value)} placeholder="Escribe el texto que deseas mostrar dentro de este bloque. Déjalo vacío para no agregar información." /></label><small>{blockText.length}/600 caracteres</small></div><footer><button type="button" className="quiet-button" onClick={() => setEditingBlock(null)}>Cancelar</button><button type="button" className="primary-action" onClick={saveBlockText}>Guardar Texto</button></footer></section></div>}
    {editingCompanyHeader && <div className="expense-block-text-backdrop" role="dialog" aria-modal="true" aria-label="Editar Encabezado de la empresa"><section className="expense-block-text-dialog expense-company-header-dialog"><header><div><span>Datos tomados de Configuración General</span><h2>Encabezado de la empresa</h2></div><button type="button" aria-label="Cerrar configuración del encabezado" onClick={() => setEditingCompanyHeader(false)}><X /></button></header><div><p>Selecciona los campos de la pantalla Compañía que se mostrarán en la expensa.</p><div className="expense-company-header-fields">{(Object.keys(companyFieldLabels) as CompanyFieldId[]).map(field => <label key={field}><input type="checkbox" checked={companyHeaderDraft.fields[field]} onChange={() => setCompanyHeaderDraft(current => ({ ...current, fields: { ...current.fields, [field]: !current.fields[field] } }))} /><span>{companyFieldLabels[field]}</span></label>)}</div><label><span>Texto adicional</span><textarea rows={4} maxLength={600} value={companyHeaderDraft.text} onChange={event => setCompanyHeaderDraft(current => ({ ...current, text: event.target.value }))} placeholder="Opcional: agrega una nota debajo del encabezado." /></label><small>{companyHeaderDraft.text.length}/600 caracteres</small></div><footer><button type="button" className="quiet-button" onClick={() => setEditingCompanyHeader(false)}>Cancelar</button><button type="button" className="primary-action" onClick={saveCompanyHeader}>Guardar Encabezado</button></footer></section></div>}
  </div>
}
