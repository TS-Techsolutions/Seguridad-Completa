import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Mail, Megaphone, Plus, RotateCcw, Search, Send, Trash2, UserRoundX, UsersRound, X } from 'lucide-react'
import { api } from './api'
import { buildCustomerPortfolioRows, type PortfolioRow } from './CustomerPortfolioReportPage'
import type { CustomerRow } from './CustomerRegistryPage'
import { formatFullDateInput } from './date-input'
import { ensureCustomerReceivables } from './customer-receivables'
import { readDebtCollectionEmailTemplate } from './OrdinaryExpenseEmailTemplatePage'
import type { Context, ScreenSpec } from './types'

type CampaignStatus = 'PROCESADA' | 'ENVIO_PARCIAL' | 'ENVIADA'
type CampaignHistory = {
  id: string
  date: string
  name: string
  cutoff: string
  description: string
  status: CampaignStatus
  recipients: number
  excluded: number
  sent: number
  user: string
}
type CampaignRecipient = {
  id: string
  customerId?: string
  identification: string
  name: string
  emails: string[]
  rows: PortfolioRow[]
  balance: number
  selected: boolean
  deliveryStatus?: 'PENDIENTE'
}
type ExcludedRecipient = CampaignRecipient & { reason: string }
type SentRecipient = CampaignRecipient & { sentAt: string; status: 'ENVIADO' | 'ENTREGADO'; subject: string }
type CampaignOutboxItem = {
  id: string
  campaignId: string
  campaignName: string
  cutoff: string
  customerId?: string
  customerName: string
  to: string[]
  cc: string[]
  subject: string
  body: string
  portfolioRows: PortfolioRow[]
  balance: number
  status: 'PENDIENTE' | 'ENVIADO' | 'ENTREGADO' | 'REBOTADO' | 'ERROR'
  createdAt: string
  user: string
}

const customerStorageKey = 'saga.customers'

function historyStorageKey(companyId: string) { return `saga.debt-collection-campaigns:${companyId}` }
function outboxStorageKey(companyId: string) { return `saga.debt-collection-email-outbox:${companyId}` }
function readJson<T>(key: string, fallback: T): T { try { const value = JSON.parse(localStorage.getItem(key) ?? 'null'); return value ?? fallback } catch { return fallback } }
function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim() }
function money(value: number) { return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) }
function todayDisplay() { const now = new Date(); return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}` }
function validDate(value: string) { const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value); if (!match) return false; const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])); return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[1]) }
function uniqueEmails(values: string[]) { return Array.from(new Set(values.map(value => value.trim().toLocaleLowerCase('es')).filter(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))) }
function applyTemplate(value: string, variables: Record<string, string>) { return Object.entries(variables).reduce((result, [token, replacement]) => result.replaceAll(`{{${token}}}`, replacement), value) }
function escapeHtml(value: string) { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;') }
function statusLabel(status: CampaignStatus) { return status === 'ENVIADA' ? 'Enviada' : status === 'ENVIO_PARCIAL' ? 'Envío parcial' : 'Procesada' }

function portfolioTable(rows: PortfolioRow[], cutoff: string) {
  const body = rows.map(row => `<tr><td>${escapeHtml(row.issueDate)}</td><td>${escapeHtml(row.receiptNumber)}</td><td>${escapeHtml(row.propertyName)}</td><td style="text-align:right">${escapeHtml(money(row.total))}</td><td style="text-align:right">${escapeHtml(money(row.cancelled))}</td><td style="text-align:right"><strong>${escapeHtml(money(row.balance))}</strong></td><td>${escapeHtml(row.detail)}</td></tr>`).join('')
  return `<h3>Estado de cartera al ${escapeHtml(cutoff)}</h3><table style="width:100%;border-collapse:collapse"><thead><tr><th>Fecha</th><th># Expensa/Factura</th><th>Inmueble</th><th>Total</th><th>Cancelado</th><th>Saldo</th><th>Detalle</th></tr></thead><tbody>${body}</tbody></table>`
}

function RecipientSearch({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const visible = options.filter(option => !value || normalize(option).includes(normalize(value)))
  return <div className="campaign-recipient-search" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false) }}>
    <Search />
    <input value={value} placeholder="Buscar cliente" role="combobox" aria-expanded={open} aria-autocomplete="list" onFocus={event => { event.currentTarget.select(); setOpen(true) }} onChange={event => { onChange(event.target.value); setOpen(true) }} />
    {value && <button type="button" className="campaign-search-clear" title="Limpiar búsqueda" aria-label="Limpiar búsqueda" onMouseDown={event => event.preventDefault()} onClick={() => { onChange(''); setOpen(true) }}><X /></button>}
    <button type="button" className="campaign-search-toggle" aria-label="Mostrar clientes" onMouseDown={event => event.preventDefault()} onClick={() => setOpen(current => !current)}><ChevronDown /></button>
    {open && <div className="campaign-recipient-options" role="listbox">{visible.map(option => <button type="button" key={option} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(option); setOpen(false) }}>{option}</button>)}{!visible.length && <span>Sin coincidencias</span>}</div>}
  </div>
}

export function DebtCollectionCampaignPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <DebtCollectionCampaignManager key={context.data.company.id} screen={screen} context={context.data} />
}

function DebtCollectionCampaignManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const [history, setHistory] = useState<CampaignHistory[]>(() => readJson<CampaignHistory[]>(historyStorageKey(context.company.id), []).sort((a, b) => b.date.localeCompare(a.date)))
  const [formOpen, setFormOpen] = useState(false)
  const [campaignId, setCampaignId] = useState('')
  const [name, setName] = useState('')
  const [cutoff, setCutoff] = useState(todayDisplay())
  const [description, setDescription] = useState('')
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([])
  const [excluded, setExcluded] = useState<ExcludedRecipient[]>([])
  const [sent, setSent] = useState<SentRecipient[]>([])
  const [processed, setProcessed] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const visibleRecipients = useMemo(() => recipients.filter(recipient => !search || normalize(recipient.name).includes(normalize(search))), [recipients, search])
  const selectableVisibleRecipients = visibleRecipients.filter(recipient => !recipient.deliveryStatus)
  const allVisibleSelected = selectableVisibleRecipients.length > 0 && selectableVisibleRecipients.every(recipient => recipient.selected)

  useEffect(() => {
    if (!formOpen || !campaignId) return
    const synchronizeConfirmedDeliveries = () => {
      const confirmed = readJson<CampaignOutboxItem[]>(outboxStorageKey(context.company.id), []).filter(item => item.campaignId === campaignId && (item.status === 'ENVIADO' || item.status === 'ENTREGADO'))
      if (!confirmed.length) return
      const confirmedByCustomer = new Map(confirmed.map(item => [item.customerId || normalize(item.customerName), item]))
      setRecipients(current => {
        const delivered = current.filter(recipient => confirmedByCustomer.has(recipient.customerId || normalize(recipient.name)))
        if (delivered.length) setSent(previous => {
          const known = new Set(previous.map(item => item.id))
          return [...delivered.filter(item => !known.has(item.id)).map((recipient): SentRecipient => {
            const delivery = confirmedByCustomer.get(recipient.customerId || normalize(recipient.name))!
            return { ...recipient, selected: false, deliveryStatus: undefined, sentAt: delivery.createdAt, status: delivery.status as 'ENVIADO' | 'ENTREGADO', subject: delivery.subject }
          }), ...previous]
        })
        return current.filter(recipient => !confirmedByCustomer.has(recipient.customerId || normalize(recipient.name)))
      })
      setHistory(current => {
        const next = current.map(record => record.id === campaignId ? { ...record, sent: confirmed.length, status: 'ENVIADA' as const } : record)
        localStorage.setItem(historyStorageKey(context.company.id), JSON.stringify(next))
        return next
      })
    }
    synchronizeConfirmedDeliveries()
    const interval = window.setInterval(synchronizeConfirmedDeliveries, 2500)
    return () => window.clearInterval(interval)
  }, [campaignId, context.company.id, formOpen])

  const persistHistory = (records: CampaignHistory[]) => {
    const ordered = [...records].sort((left, right) => right.date.localeCompare(left.date))
    setHistory(ordered)
    localStorage.setItem(historyStorageKey(context.company.id), JSON.stringify(ordered))
  }

  const openNew = () => {
    setCampaignId(''); setName(''); setCutoff(todayDisplay()); setDescription(''); setRecipients([]); setExcluded([]); setSent([]); setProcessed(false); setSearch(''); setError(''); setMessage(''); setFormOpen(true)
  }

  const processCampaign = () => {
    setError(''); setMessage('')
    if (!name.trim()) { setError('Ingresa el Nombre de la Campaña.'); return }
    if (!validDate(cutoff)) { setError('Ingresa una Fecha de Corte válida en formato DD/MM/AAAA.'); return }
    ensureCustomerReceivables(context.company.id)
    const rows = buildCustomerPortfolioRows(context.company.id, cutoff)
    const customers = readJson<CustomerRow[]>(customerStorageKey, []).filter(customer => customer.state === 'ACTIVO')
    const groups = new Map<string, PortfolioRow[]>()
    rows.forEach(row => groups.set(row.clientKey, [...(groups.get(row.clientKey) ?? []), row]))
    const nextRecipients = Array.from(groups.entries()).map(([key, clientRows]): CampaignRecipient => {
      const first = clientRows[0]
      const customer = customers.find(item => normalize(item.identification) === key) ?? customers.find(item => normalize(item.businessName) === normalize(first.clientName))
      return {
        id: customer?.id ?? key,
        customerId: customer?.id,
        identification: customer?.identification ?? '',
        name: customer?.businessName ?? first.clientName,
        emails: uniqueEmails([customer?.email ?? '', customer?.assistantEmail ?? '']),
        rows: clientRows,
        balance: Number(clientRows.reduce((total, row) => total + row.balance, 0).toFixed(2)),
        selected: false,
      }
    }).sort((left, right) => left.name.localeCompare(right.name, 'es'))
    if (!nextRecipients.length) { setError(`No existen clientes con saldo pendiente a la fecha de corte ${cutoff}.`); return }
    const id = campaignId || crypto.randomUUID()
    const now = new Date().toISOString()
    const summary: CampaignHistory = { id, date: now, name: name.trim(), cutoff, description: description.trim(), status: 'PROCESADA', recipients: nextRecipients.length, excluded: 0, sent: 0, user: context.actor.name }
    persistHistory([summary, ...history.filter(record => record.id !== id)])
    setCampaignId(id); setRecipients(nextRecipients); setExcluded([]); setSent([]); setProcessed(true)
    setMessage(`Se encontraron ${nextRecipients.length} clientes con cartera pendiente al ${cutoff}. Selecciona los destinatarios de la campaña.`)
  }

  const toggleRecipient = (id: string) => setRecipients(current => current.map(recipient => recipient.id === id && !recipient.deliveryStatus ? { ...recipient, selected: !recipient.selected } : recipient))
  const toggleAllVisible = () => { const ids = new Set(selectableVisibleRecipients.map(recipient => recipient.id)); setRecipients(current => current.map(recipient => ids.has(recipient.id) ? { ...recipient, selected: !allVisibleSelected } : recipient)) }
  const excludeRecipient = (id: string) => {
    const recipient = recipients.find(item => item.id === id)
    if (!recipient) return
    setRecipients(current => current.filter(item => item.id !== id))
    setExcluded(current => [...current, { ...recipient, selected: false, reason: '' }].sort((a, b) => a.name.localeCompare(b.name, 'es')))
  }
  const restoreRecipient = (id: string) => {
    const recipient = excluded.find(item => item.id === id)
    if (!recipient) return
    setExcluded(current => current.filter(item => item.id !== id))
    const { reason: _reason, ...restored } = recipient
    setRecipients(current => [...current, restored].sort((a, b) => a.name.localeCompare(b.name, 'es')))
  }

  const sendCampaign = () => {
    setError(''); setMessage('')
    const selected = recipients.filter(recipient => recipient.selected && !recipient.deliveryStatus)
    if (!selected.length) { setError('Selecciona al menos un cliente destinatario antes de enviar la campaña.'); return }
    const withoutEmail = selected.filter(recipient => !recipient.emails.length)
    if (withoutEmail.length) { setError(`No se puede enviar la campaña. Registra el Email o Email Asistente de: ${withoutEmail.map(item => item.name).join(', ')}.`); return }
    const template = readDebtCollectionEmailTemplate()
    const now = new Date().toISOString()
    const [, month, year] = cutoff.split('/')
    const outbox = readJson<CampaignOutboxItem[]>(outboxStorageKey(context.company.id), [])
    const dispatches = selected.map((recipient): CampaignOutboxItem => {
      const variables = { RAZON_SOCIAL: recipient.name, COMPROBANTE: 'Estado de cartera', MES: month, ANIO: year, FECHA: cutoff, VALOR: money(recipient.balance) }
      return {
        id: crypto.randomUUID(), campaignId, campaignName: name.trim(), cutoff, customerId: recipient.customerId, customerName: recipient.name,
        to: recipient.emails, cc: uniqueEmails(template.copyEmails), subject: applyTemplate(template.subject, variables),
        body: `${applyTemplate(template.body, variables)}${portfolioTable(recipient.rows, cutoff)}`,
        portfolioRows: recipient.rows, balance: recipient.balance, status: 'PENDIENTE', createdAt: now, user: context.actor.name,
      }
    })
    localStorage.setItem(outboxStorageKey(context.company.id), JSON.stringify([...dispatches, ...outbox]))
    const sentIds = new Set(selected.map(recipient => recipient.id))
    const nextRecipients = recipients.map(recipient => sentIds.has(recipient.id) ? { ...recipient, selected: false, deliveryStatus: 'PENDIENTE' as const } : recipient)
    setRecipients(nextRecipients)
    const existing = history.find(record => record.id === campaignId)
    const summary: CampaignHistory = { id: campaignId, date: existing?.date ?? now, name: name.trim(), cutoff, description: description.trim(), status: 'ENVIADA', recipients: existing?.recipients ?? selected.length, excluded: excluded.length, sent: existing?.sent ?? 0, user: context.actor.name }
    persistHistory([summary, ...history.filter(record => record.id !== campaignId)])
    setMessage(`Se prepararon ${selected.length} correos con la plantilla Modificar Email Gestión Cobranza y el detalle individual de cartera de cada cliente. Aparecerán en Enviados únicamente cuando el servicio de correo confirme el envío.`)
  }

  return <div className="page screen-page debt-collection-campaign-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header campaign-screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Gestión de Cobranza</b></div><h1>{formOpen ? 'Nueva Campaña' : screen.titulo_original}</h1></div>{formOpen ? <button type="button" className="quiet-button" onClick={() => setFormOpen(false)}><ArrowLeft />Volver</button> : <button type="button" className="primary-action" onClick={openNew}><Plus />Nueva Campaña</button>}</section>

    {!formOpen ? <section className="campaign-history-card"><header><div><Megaphone /><span><h2>Histórico de Campañas</h2><p>Campañas procesadas y enviadas, desde la más reciente.</p></span></div><b>{history.length} {history.length === 1 ? 'campaña' : 'campañas'}</b></header><div className="campaign-table-scroll"><table><thead><tr><th>Fecha</th><th>Nombre Campaña</th><th>Fecha Corte</th><th>Estado</th></tr></thead><tbody>{history.map(record => <tr key={record.id}><td>{new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(record.date))}</td><td><strong>{record.name}</strong></td><td>{record.cutoff}</td><td><span className={`campaign-status ${record.status.toLowerCase()}`}>{statusLabel(record.status)}</span></td></tr>)}{!history.length && <tr><td colSpan={4}><div className="campaign-empty"><Megaphone /><strong>No existen campañas registradas</strong><span>Utiliza Nueva Campaña para iniciar la gestión de cobranza.</span></div></td></tr>}</tbody></table></div></section>
      : <>
        <section className="campaign-form-card"><div className="campaign-form-grid"><label>Nombre Campaña <span>Máx. 30 caracteres</span><input maxLength={30} value={name} onFocus={event => event.currentTarget.select()} onChange={event => { setName(event.target.value); setError(''); setMessage('') }} /></label><label>Fecha de Corte <span>DD/MM/AAAA</span><input inputMode="numeric" maxLength={10} value={cutoff} onFocus={event => event.currentTarget.select()} onChange={event => { setCutoff(formatFullDateInput(event.target.value)); setError(''); setMessage('') }} /></label><label className="campaign-description">Descripción <span>Máx. 120 caracteres</span><input maxLength={120} value={description} onFocus={event => event.currentTarget.select()} onChange={event => setDescription(event.target.value)} /></label><button type="button" className="campaign-process-button" onClick={processCampaign}><RotateCcw />Procesar</button></div></section>
        {error && <div className="campaign-feedback error" role="alert"><AlertTriangle />{error}</div>}
        {message && <div className="campaign-feedback success" role="status"><CheckCircle2 />{message}</div>}
        <section className="campaign-panels">
          <article className="campaign-panel recipients"><header><div><UsersRound /><span><h2>Destinatarios</h2><p>{recipients.length} clientes pendientes</p></span></div>{processed && <button type="button" className="campaign-send-button" onClick={sendCampaign}><Send />Enviar Campaña</button>}</header>{processed && <RecipientSearch value={search} options={recipients.map(recipient => recipient.name)} onChange={setSearch} />}<div className="campaign-panel-list">{processed && recipients.length > 0 && <div className="campaign-select-all"><label><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />Seleccionar todos</label><span>{visibleRecipients.filter(item => item.selected).length} seleccionados</span></div>}{visibleRecipients.map(recipient => <div className={`campaign-recipient-row${recipient.deliveryStatus ? ' pending-delivery' : ''}`} key={recipient.id}><input type="checkbox" checked={recipient.selected} disabled={Boolean(recipient.deliveryStatus)} aria-label={`Seleccionar ${recipient.name}`} onChange={() => toggleRecipient(recipient.id)} /><div><strong>{recipient.name}</strong><span>{recipient.emails.join(' · ') || 'Sin correo configurado'}</span><small>{recipient.deliveryStatus ? 'Pendiente de confirmación del servicio de correo' : `${recipient.rows.length} obligaciones · Saldo ${money(recipient.balance)}`}</small></div><button type="button" className="campaign-exclude-button" disabled={Boolean(recipient.deliveryStatus)} title="Excluir de la campaña" aria-label={`Excluir ${recipient.name}`} onClick={() => excludeRecipient(recipient.id)}><X /></button></div>)}{(!processed || !visibleRecipients.length) && <div className="campaign-panel-empty"><UsersRound /><span>{processed ? 'No hay destinatarios que coincidan.' : 'Procesa la campaña para identificar destinatarios.'}</span></div>}</div></article>
          <article className="campaign-panel excluded"><header><div><UserRoundX /><span><h2>Excluidos</h2><p>{excluded.length} clientes excluidos</p></span></div></header><div className="campaign-panel-list"><div className="campaign-excluded-head"><span>Propietario</span><span>Motivo</span></div>{excluded.map(recipient => <div className="campaign-excluded-row" key={recipient.id}><button type="button" title="Devolver a Destinatarios" aria-label={`Devolver ${recipient.name} a destinatarios`} onClick={() => restoreRecipient(recipient.id)}><Trash2 /></button><strong>{recipient.name}</strong><input maxLength={30} value={recipient.reason} placeholder="Motivo" onChange={event => setExcluded(current => current.map(item => item.id === recipient.id ? { ...item, reason: event.target.value } : item))} /></div>)}{!excluded.length && <div className="campaign-panel-empty"><UserRoundX /><span>Los clientes excluidos aparecerán aquí.</span></div>}</div></article>
          <article className="campaign-panel sent"><header><div><Mail /><span><h2>Enviados</h2><p>{sent.length} envíos confirmados</p></span></div></header><div className="campaign-panel-list">{sent.map(recipient => <div className="campaign-sent-row" key={`${recipient.id}-${recipient.sentAt}`}><CheckCircle2 /><div><strong>{recipient.name}</strong><span>{recipient.emails.join(' · ')}</span><small>{recipient.status === 'ENTREGADO' ? 'Entregado' : 'Enviado'} · {money(recipient.balance)}</small></div></div>)}{!sent.length && <div className="campaign-panel-empty"><Mail /><span>Aquí aparecerán sólo los clientes con envío confirmado.</span></div>}</div></article>
        </section>
      </>}
  </div>
}
