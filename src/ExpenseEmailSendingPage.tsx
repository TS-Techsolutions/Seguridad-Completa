import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, History, Mail, Send } from 'lucide-react'
import { api } from './api'
import { readIssuedExpenses, type ExpenseType, type IssuedExpenseRecord } from './expense-records'
import { readExpenseEmailTemplate, type ExpenseEmailTemplateKind } from './OrdinaryExpenseEmailTemplatePage'
import type { CustomerRow } from './CustomerRegistryPage'
import type { Context, ScreenSpec } from './types'

type EmailDeliveryStatus = 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'ENTREGADO' | 'REBOTADO' | 'ERROR'

type EmailExpenseDetail = {
  id: string
  period: string
  expenseId: string
  receiptNumber: string
  client: string
  emails: string[]
  total: number
  user: string
  clientGroup: string
  status: EmailDeliveryStatus
}

type EmailSendBatch = {
  id: string
  period: string
  expenseType: ExpenseEmailTemplateKind
  sentAt: string
  expenseCount: number
  emailCount: number
  user: string
  status: EmailDeliveryStatus
  copyEmails: string[]
  templateSubject: string
  dispatches: Array<{ clientGroup: string; client: string; to: string[]; cc: string[]; subject: string; body: string; expenseIds: string[]; status: EmailDeliveryStatus; providerMessageId?: string; confirmedAt?: string; errorMessage?: string }>
  details: EmailExpenseDetail[]
}

const customerStorageKey = 'saga.customers'
const typeLabels: Record<ExpenseEmailTemplateKind, string> = { ORDINARIA: 'Ordinaria', EXTRAORDINARIA: 'Extraordinaria', AGUA: 'Agua' }
const deliveryStatusLabels: Record<EmailDeliveryStatus, string> = { PENDIENTE: 'Pendiente', ENVIANDO: 'Enviando', ENVIADO: 'Enviado', ENTREGADO: 'Entregado', REBOTADO: 'Rebotado', ERROR: 'Error' }

function historyStorageKey(companyId: string) { return `saga.expense-email-history:${companyId}` }
function normalize(value: string) { return value.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ') }
function money(value: number) { return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) }
function displayDate(value: string) { return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
function validPeriod(value: string) { const match = value.match(/^(0[1-9]|1[0-2])-(\d{4})$/); return Boolean(match) }
function formatPeriodInput(value: string) { const digits = value.replace(/\D/g, '').slice(0, 6); return digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits }
function uniqueEmails(values: string[]) { return Array.from(new Set(values.map(value => value.trim().toLocaleLowerCase('es')).filter(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))) }
function applyTemplate(value: string, variables: Record<string, string>) { return Object.entries(variables).reduce((result, [token, replacement]) => result.replaceAll(`{{${token}}}`, replacement), value) }

function readCustomers() {
  try {
    const value = JSON.parse(localStorage.getItem(customerStorageKey) ?? '[]')
    return Array.isArray(value) ? value as CustomerRow[] : []
  } catch { return [] }
}

function readHistory(companyId: string) {
  try {
    const value = JSON.parse(localStorage.getItem(historyStorageKey(companyId)) ?? '[]')
    return (Array.isArray(value) ? value as EmailSendBatch[] : []).sort((left, right) => right.sentAt.localeCompare(left.sentAt))
  } catch { return [] }
}

function customerForExpense(expense: IssuedExpenseRecord, customers: CustomerRow[]) {
  return customers.find(customer => expense.identification && normalize(customer.identification) === normalize(expense.identification))
    ?? customers.find(customer => normalize(customer.businessName) === normalize(expense.businessName))
}

export function ExpenseEmailSendingPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <ExpenseEmailSendingManager key={context.data.company.id} screen={screen} context={context.data} />
}

function ExpenseEmailSendingManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const [period, setPeriod] = useState('')
  const [expenseType, setExpenseType] = useState<ExpenseEmailTemplateKind | ''>('')
  const [history, setHistory] = useState<EmailSendBatch[]>(() => readHistory(context.company.id))
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const ready = validPeriod(period) && Boolean(expenseType)

  const sendEmails = () => {
    setError(''); setMessage('')
    if (!ready || !expenseType) return
    const [month, year] = period.split('-')
    const expenses = readIssuedExpenses(context.company.id).filter(record => record.status === 'VIGENTE' && record.expenseType === expenseType as ExpenseType && record.month.padStart(2, '0') === month && record.year === year)
    if (!expenses.length) { setError(`No existen expensas ${typeLabels[expenseType].toLocaleLowerCase('es')} vigentes para ${period}.`); return }

    const customers = readCustomers()
    const missingRecipients: string[] = []
    const recipients = new Map<string, string[]>()
    expenses.forEach(expense => {
      const customer = customerForExpense(expense, customers)
      const clientGroup = expense.identification.trim() || normalize(expense.businessName)
      const emails = uniqueEmails([expense.email, customer?.email ?? '', customer?.assistantEmail ?? ''])
      recipients.set(clientGroup, uniqueEmails([...(recipients.get(clientGroup) ?? []), ...emails]))
      if (!emails.length) missingRecipients.push(customer?.businessName ?? expense.businessName)
    })
    if (missingRecipients.length) { setError(`No se puede completar el envío. Registra el Email o Email Asistente de: ${Array.from(new Set(missingRecipients)).join(', ')}.`); return }

    const template = readExpenseEmailTemplate(expenseType)
    const sentAt = new Date().toISOString()
    const details: EmailExpenseDetail[] = expenses.map(expense => {
      const customer = customerForExpense(expense, customers)
      const clientGroup = expense.identification.trim() || normalize(expense.businessName)
      return { id: crypto.randomUUID(), period, expenseId: expense.id, receiptNumber: expense.receiptNumber, client: customer?.businessName ?? expense.businessName, emails: recipients.get(clientGroup) ?? [], total: expense.total, user: context.actor.name, clientGroup, status: 'PENDIENTE' }
    })
    const dispatches = Array.from(recipients.entries()).map(([clientGroup, to]) => {
      const groupedDetails = details.filter(detail => detail.clientGroup === clientGroup)
      const variables = { RAZON_SOCIAL: groupedDetails[0]?.client ?? '', COMPROBANTE: groupedDetails.map(detail => detail.receiptNumber).join(', '), MES: month, ANIO: year, FECHA: displayDate(sentAt).split(',')[0], VALOR: money(groupedDetails.reduce((sum, detail) => sum + detail.total, 0)) }
      return { clientGroup, client: groupedDetails[0]?.client ?? '', to, cc: template.copyEmails, subject: applyTemplate(template.subject, variables), body: applyTemplate(template.body, variables), expenseIds: groupedDetails.map(detail => detail.expenseId), status: 'PENDIENTE' as const }
    })
    const batch: EmailSendBatch = { id: crypto.randomUUID(), period, expenseType, sentAt, expenseCount: details.length, emailCount: dispatches.length, user: context.actor.name, status: 'PENDIENTE', copyEmails: template.copyEmails, templateSubject: template.subject, dispatches, details }
    const next = [batch, ...history].sort((left, right) => right.sentAt.localeCompare(left.sentAt))
    setHistory(next)
    localStorage.setItem(historyStorageKey(context.company.id), JSON.stringify(next))
    setExpanded(current => new Set(current).add(batch.id))
    const copies = template.copyEmails.length ? ` Se incluyó copia a ${template.copyEmails.join(', ')}.` : ''
    setMessage(`Se prepararon ${details.length} expensas en ${recipients.size} correos agrupados por cliente. El lote permanecerá Pendiente hasta recibir la confirmación del servicio SMTP usando la plantilla ${typeLabels[expenseType]}.${copies}`)
  }

  const toggle = (id: string) => setExpanded(current => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const historyRows = useMemo(() => history.flatMap(batch => expanded.has(batch.id) ? batch.details : []), [history, expanded])

  return <div className="page screen-page expense-email-sending-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div></section>

    <section className="expense-email-filters">
      <div className="expense-email-filter-heading"><span><Mail /></span><div><h2>Envío de Expensas</h2><p>Selecciona el período y el tipo de expensa que deseas remitir.</p></div></div>
      <div className="expense-email-filter-fields">
        <label>Período <span>MM-AAAA</span><input inputMode="numeric" maxLength={7} placeholder="MM-AAAA" value={period} onChange={event => { setPeriod(formatPeriodInput(event.target.value)); setError(''); setMessage('') }} /></label>
        <label>Tipo Expensa<select value={expenseType} onChange={event => { setExpenseType(event.target.value as ExpenseEmailTemplateKind | ''); setError(''); setMessage('') }}><option value="">Seleccionar tipo</option><option value="ORDINARIA">Ordinaria</option><option value="EXTRAORDINARIA">Extraordinaria</option><option value="AGUA">Agua</option></select></label>
        {ready && <button type="button" className="primary-action expense-email-send" onClick={sendEmails}><Send />Enviar Email</button>}
      </div>
    </section>

    {error && <div className="expense-email-feedback error" role="alert"><AlertTriangle />{error}</div>}
    {message && <div className="expense-email-feedback success" role="status"><CheckCircle2 />{message}</div>}

    <section className="expense-email-history">
      <header><div><History /><span><h2>Histórico de Envíos</h2><p>Procesos ejecutados desde el más reciente.</p></span></div><b>{history.length} {history.length === 1 ? 'envío' : 'envíos'}</b></header>
      <div className="expense-email-history-scroll"><table><thead><tr><th aria-label="Expandir" /><th>Período</th><th>Tipo Expensa</th><th>Fecha de Envío</th><th>Expensas Enviadas</th><th>Estado</th><th>Usuario</th></tr></thead><tbody>
        {history.map(batch => { const status = batch.status ?? 'ENVIADO'; return <tr key={batch.id} className={expanded.has(batch.id) ? 'expanded' : undefined}><td><button type="button" className="expense-email-expand" aria-expanded={expanded.has(batch.id)} aria-label={`${expanded.has(batch.id) ? 'Contraer' : 'Expandir'} envío ${batch.period}`} onClick={() => toggle(batch.id)}>{expanded.has(batch.id) ? <ChevronDown /> : <ChevronRight />}</button></td><td><strong>{batch.period}</strong></td><td><span className={`expense-kind ${batch.expenseType.toLowerCase()}`}>{typeLabels[batch.expenseType]}</span></td><td>{displayDate(batch.sentAt)}</td><td>{batch.expenseCount}</td><td><span className={`email-delivery-status ${status.toLowerCase()}`}><i />{deliveryStatusLabels[status]}</span></td><td>{batch.user || batch.details[0]?.user || '—'}</td></tr> })}
        {!history.length && <tr><td colSpan={7}><div className="expense-email-empty"><Mail /><strong>No existen envíos registrados</strong><span>Los procesos de envío de expensas aparecerán en esta tabla.</span></div></td></tr>}
      </tbody></table></div>
    </section>

    {historyRows.length > 0 && <section className="expense-email-detail"><header><h2>Detalle de Expensas Enviadas</h2><span>Los correos principal y asistente se muestran completos.</span></header><div><table><thead><tr><th>Período</th><th># Expensa</th><th>Cliente</th><th>Email</th><th>Estado</th><th>Total</th></tr></thead><tbody>{history.filter(batch => expanded.has(batch.id)).map(batch => batch.details.map(detail => { const status = detail.status ?? batch.status ?? 'ENVIADO'; return <tr key={detail.id}><td>{detail.period}</td><td><strong>{detail.receiptNumber}</strong></td><td>{detail.client}</td><td>{detail.emails.join(' · ')}</td><td><span className={`email-delivery-status ${status.toLowerCase()}`}><i />{deliveryStatusLabels[status]}</span></td><td><strong>{money(detail.total)}</strong></td></tr> }))}</tbody></table></div></section>}
  </div>
}
