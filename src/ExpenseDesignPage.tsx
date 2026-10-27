import { useState, type ChangeEvent, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, CheckCircle2, ChevronRight, Eye, FileText, ImagePlus, Pencil, RotateCcw, Save, ShieldCheck, X } from 'lucide-react'
import { api } from './api'
import type { Context, ScreenSpec } from './types'

type BlockId = 'company' | 'customer' | 'detail' | 'payment' | 'legal' | 'signatures'
type FieldId = 'owner' | 'address' | 'ownerId' | 'phone' | 'email'
type ColumnId = 'concept' | 'aliquot' | 'quantity' | 'unitPrice' | 'total'
type DesignStatus = 'BORRADOR' | 'ACTIVO'
type DesignConfig = {
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
  fields: Record<FieldId, boolean>
  columns: Array<{ id: ColumnId; label: string; visible: boolean }>
}

const blockLabels: Record<BlockId, string> = { company: 'Encabezado de la empresa', customer: 'Datos del propietario e inmueble', detail: 'Detalle de servicios', payment: 'Forma de pago y totales', legal: 'Texto legal', signatures: 'Firmas' }
const fieldLabels: Record<FieldId, string> = { owner: 'Propietario', address: 'Dirección', ownerId: 'RUC / C.I. propietario', phone: 'Teléfono', email: 'Email' }

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
    fields: { owner: true, address: true, ownerId: true, phone: true, email: true },
    columns: [
      { id: 'concept', label: 'Concepto del servicio', visible: true }, { id: 'aliquot', label: 'Mt2', visible: true },
      { id: 'quantity', label: 'Cantidad', visible: true }, { id: 'unitPrice', label: 'Precio unitario', visible: true }, { id: 'total', label: 'Total', visible: true },
    ],
  }
}

function storageKey(companyId: string) {
  return `saga.expense-design:${companyId}`
}

function loadDesign(company: Context['company']) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(company.id)) ?? 'null') as DesignConfig | null
    const base = defaultDesign(company)
    if (saved?.companyId !== company.id) return base
    return {
      ...base,
      ...saved,
      blockTexts: { ...base.blockTexts, ...(saved.blockTexts ?? {}) },
      fields: (Object.keys(base.fields) as FieldId[]).reduce((result, field) => ({ ...result, [field]: saved.fields?.[field] ?? base.fields[field] }), {} as Record<FieldId, boolean>),
      columns: (saved.columns?.length ? saved.columns : base.columns).map(column => column.id === 'aliquot' ? { ...column, label: 'Mt2' } : column),
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
  const [design, setDesign] = useState<DesignConfig>(() => loadDesign(company))
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState(false)
  const [editingBlock, setEditingBlock] = useState<BlockId | null>(null)
  const [blockText, setBlockText] = useState('')

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
    setEditingBlock(block)
    setBlockText(design.blockTexts[block])
  }

  const saveBlockText = () => {
    if (!editingBlock) return
    setDesign(current => ({ ...current, blockTexts: { ...current.blockTexts, [editingBlock]: blockText.trim() } }))
    setEditingBlock(null)
  }

  return <div className="page screen-page expense-design-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header expense-design-header"><div><div className="screen-id"><span>{screen.id}</span><b>Plantilla por cliente</b></div><h1>{screen.titulo_original}</h1></div><div className="expense-design-actions"><button type="button" className="quiet-button" onClick={() => setPreview(true)}><Eye />Vista Previa</button><button type="button" className="quiet-button" onClick={() => persist('BORRADOR')}><Save />Guardar Borrador</button><button type="button" className="primary-action" onClick={() => persist('ACTIVO')}><CheckCircle2 />Activar Diseño</button></div></section>

    <div className="expense-tenant-lock"><ShieldCheck /><div><span>Diseño asignado exclusivamente a</span><strong>{company.name}</strong><small>Empresa ID: {company.id} · La plantilla se almacena separada de los demás clientes.</small></div><b className={design.status.toLowerCase()}>{design.status} · V{design.version}</b></div>
    {message && <div className="expense-design-message" role="status">{message}</div>}

    <div className="expense-designer-layout">
      <aside className="expense-design-controls">
        <section><h2>Formato</h2><label><span>Título del documento</span><input value={design.title} onChange={event => setDesign(current => ({ ...current, title: event.target.value }))} /></label><div className="expense-control-pair"><label><span>Tipografía</span><select value={design.fontFamily} onChange={event => setDesign(current => ({ ...current, fontFamily: event.target.value }))}><option value="Georgia, serif">Clásica</option><option value="Arial, sans-serif">Moderna</option><option value="'Courier New', monospace">Monoespaciada</option></select></label><label><span>Color destacado</span><input type="color" value={design.accent} onChange={event => setDesign(current => ({ ...current, accent: event.target.value }))} /></label></div><label className="expense-logo-input"><ImagePlus /><span><strong>{design.logo ? 'Reemplazar logotipo' : 'Cargar logotipo'}</strong><small>PNG, JPG o SVG</small></span><input type="file" accept="image/*" onChange={loadLogo} /></label></section>

        <section><h2>Bloques y orden</h2><div className="expense-block-list">{design.blocks.map((block, index) => <div key={block.id}><label><input type="checkbox" checked={block.visible} onChange={() => setDesign(current => ({ ...current, blocks: current.blocks.map(item => item.id === block.id ? { ...item, visible: !item.visible } : item) }))} /><span>{blockLabels[block.id]}</span></label><button type="button" className={design.blockTexts[block.id] ? 'has-text' : ''} onClick={() => openBlockText(block.id)} aria-label={`Editar texto de ${blockLabels[block.id]}`} title="Agregar o editar texto"><Pencil /></button><button type="button" disabled={index === 0} onClick={() => moveBlock(index, -1)} aria-label={`Subir ${blockLabels[block.id]}`}><ArrowUp /></button><button type="button" disabled={index === design.blocks.length - 1} onClick={() => moveBlock(index, 1)} aria-label={`Bajar ${blockLabels[block.id]}`}><ArrowDown /></button></div>)}</div></section>

        <section><h2>Datos visibles</h2><div className="expense-check-grid">{(Object.keys(fieldLabels) as FieldId[]).map(field => <label key={field}><input type="checkbox" checked={design.fields[field]} onChange={() => setDesign(current => ({ ...current, fields: { ...current.fields, [field]: !current.fields[field] } }))} />{fieldLabels[field]}</label>)}</div></section>

        <section><h2>Columnas del detalle</h2><div className="expense-column-list">{design.columns.map(column => <label key={column.id}><input type="checkbox" checked={column.visible} disabled={column.id === 'concept' || column.id === 'total'} onChange={() => setDesign(current => ({ ...current, columns: current.columns.map(item => item.id === column.id ? { ...item, visible: !item.visible } : item) }))} /><input value={column.label} onChange={event => setDesign(current => ({ ...current, columns: current.columns.map(item => item.id === column.id ? { ...item, label: event.target.value } : item) }))} /></label>)}</div></section>

        <section><h2>Texto legal o informativo</h2><textarea rows={5} value={design.legalText} onChange={event => setDesign(current => ({ ...current, legalText: event.target.value }))} /></section>
        <button type="button" className="expense-reset" onClick={reset}><RotateCcw />Restablecer diseño base</button>
      </aside>

      <main className="expense-canvas-area"><div className="expense-canvas-title"><div><FileText /><span><strong>Vista previa A4</strong><small>Datos demostrativos; el documento final usará la información real de la expensa.</small></span></div><span>{company.name}</span></div><ExpensePreview design={design} company={company} /></main>
    </div>

    {preview && <div className="expense-preview-backdrop" role="dialog" aria-modal="true" aria-label="Vista previa de expensa"><div className="expense-preview-dialog"><header><div><span>Vista previa del diseño</span><strong>{company.name} · Versión {design.version}</strong></div><button type="button" onClick={() => setPreview(false)}>Cerrar</button></header><div><ExpensePreview design={design} company={company} large /></div><footer><button type="button" className="quiet-button" onClick={() => window.print()}>Imprimir / Guardar PDF</button><button type="button" className="primary-action" onClick={() => setPreview(false)}>Volver al Editor</button></footer></div></div>}

    {editingBlock && <div className="expense-block-text-backdrop" role="dialog" aria-modal="true" aria-label={`Editar texto de ${blockLabels[editingBlock]}`}><section className="expense-block-text-dialog"><header><div><span>Texto adicional del bloque</span><h2>{blockLabels[editingBlock]}</h2></div><button type="button" aria-label="Cerrar editor de texto" onClick={() => setEditingBlock(null)}><X /></button></header><div><label><span>Texto</span><textarea rows={6} maxLength={600} value={blockText} onChange={event => setBlockText(event.target.value)} placeholder="Escribe el texto que deseas mostrar dentro de este bloque. Déjalo vacío para no agregar información." /></label><small>{blockText.length}/600 caracteres</small></div><footer><button type="button" className="quiet-button" onClick={() => setEditingBlock(null)}>Cancelar</button><button type="button" className="primary-action" onClick={saveBlockText}>Guardar Texto</button></footer></section></div>}
  </div>
}

function ExpensePreview({ design, company, large = false }: { design: DesignConfig; company: Context['company']; large?: boolean }) {
  const enabledColumns = design.columns.filter(column => column.visible)
  const style = { '--expense-accent': design.accent, '--expense-font': design.fontFamily } as CSSProperties
  const blocks: Record<BlockId, React.ReactNode> = {
    company: <header className="expense-document-header"><div className="expense-document-company">{design.logo ? <img src={design.logo} alt="Logotipo" /> : <span>LOGO</span>}<div><strong>{company.name.toUpperCase()}</strong><small>R.U.C.: {company.ruc}</small><small>Dirección principal del cliente</small><small>Teléfono: (04) 500 0000 · administracion@cliente.com</small></div></div><div className="expense-document-number"><strong>{design.title || 'COMPROBANTE DE EXPENSAS'}</strong><b>001-001-000001</b><small>Documento Complementario</small></div></header>,
    customer: <section className="expense-document-customer"><div><p><b>FECHA:</b><span>GUAYAQUIL, 01 DE OCTUBRE DEL 2026</span></p>{design.fields.owner && <p><b>PROPIETARIO:</b><span>CLIENTE PROPIETARIO DE EJEMPLO</span></p>}{design.fields.address && <p><b>DIRECCIÓN:</b><span>TORRE A, PISO 10, DEPARTAMENTO 1006</span></p>}</div><div>{design.fields.ownerId && <p><b>RUC / C.I. PROP.:</b><span>0999999999001</span></p>}{design.fields.phone && <p><b>TELÉFONO:</b><span>099 999 9999</span></p>}{design.fields.email && <p><b>EMAIL:</b><span>cliente@correo.com</span></p>}</div></section>,
    detail: <section className="expense-document-detail"><table><thead><tr>{enabledColumns.map(column => <th key={column.id}>{column.label}</th>)}</tr></thead><tbody>{['Expensas departamento mes octubre 2026', 'Administración y mantenimiento', 'Expensas parqueadero mes octubre 2026', 'Seguridad y vigilancia'].map((concept, index) => <tr key={concept}>{enabledColumns.map(column => <td key={column.id}>{column.id === 'concept' ? concept : column.id === 'aliquot' ? (index % 2 ? '' : ['189,85', '5,44'][index / 2]) : column.id === 'quantity' ? '1,00' : column.id === 'unitPrice' ? ['251,67', '10,00', '85,31', '27,63'][index] : ['251,67', '10,00', '85,31', '27,63'][index]}</td>)}</tr>)}</tbody></table></section>,
    payment: <section className="expense-document-payment"><div><p><b>SON:</b> TRESCIENTOS SETENTA Y CUATRO CON 61/100 DÓLARES</p><table><thead><tr><th>Forma de pago</th><th>Plazo</th><th>Unidad</th><th>Valor</th></tr></thead><tbody><tr><td>OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO</td><td>10</td><td>Día(s)</td><td>374,61</td></tr></tbody></table></div><table><tbody><tr><td>Subtotal</td><td>406,49</td></tr><tr><td>Descuento</td><td>31,88</td></tr><tr><td>IVA</td><td>0,00</td></tr><tr><th>VALOR TOTAL $</th><th>374,61</th></tr></tbody></table></section>,
    legal: <section className="expense-document-legal">{design.legalText}</section>,
    signatures: <section className="expense-document-signatures"><div><span /><b>RECIBÍ CONFORME</b><small>CLIENTE PROPIETARIO</small></div><div><span /><b>ENTREGADO POR</b><small>ADMINISTRACIÓN</small></div></section>,
  }
  return <article className={`expense-document ${large ? 'large' : ''}`} style={style}>{design.blocks.filter(block => block.visible).map(block => <div key={block.id} className={`expense-block-${block.id}`}>{blocks[block.id]}{design.blockTexts[block.id] && <p className="expense-block-custom-text">{design.blockTexts[block.id]}</p>}</div>)}</article>
}
