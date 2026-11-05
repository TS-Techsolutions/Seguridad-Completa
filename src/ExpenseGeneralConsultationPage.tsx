import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Ban, ChevronRight, FileDown, Mail, ReceiptText, Search, Send, X } from 'lucide-react'
import { api } from './api'
import { readIssuedExpenses, voidIssuedExpense, type IssuedExpenseRecord } from './expense-records'
import { displayExpenseMonth } from './expense-pdf-preview'
import { readExpenseEmailTemplate } from './OrdinaryExpenseEmailTemplatePage'
import type { CustomerRow } from './CustomerRegistryPage'
import type { Context, ScreenSpec } from './types'

function displayMoney(value: number) {
  return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function displayStatus(status: IssuedExpenseRecord['status']) {
  if (status === 'ANULADA') return 'Anulada'
  if (status === 'PENDIENTE_COMPLETAR') return 'Pendiente Completar'
  if (status === 'BORRADA') return 'Borrada'
  return 'Generada'
}

const customerStorageKey = 'saga.customers'

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ')
}

function readCustomers() {
  try {
    const value = JSON.parse(localStorage.getItem(customerStorageKey) ?? '[]')
    return Array.isArray(value) ? value as CustomerRow[] : []
  } catch { return [] }
}

function customerForExpense(expense: IssuedExpenseRecord, customers: CustomerRow[]) {
  return customers.find(customer => expense.identification && normalize(customer.identification) === normalize(expense.identification))
    ?? customers.find(customer => normalize(customer.businessName) === normalize(expense.businessName))
}

function uniqueEmails(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim().toLocaleLowerCase('es')).filter(Boolean)))
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function applyTemplate(value: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce((result, [token, replacement]) => result.replaceAll(`{{${token}}}`, replacement), value)
}

function emailHistoryStorageKey(companyId: string) {
  return `saga.expense-email-history:${companyId}`
}

export function ExpenseGeneralConsultationPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <ExpenseGeneralConsultationManager key={context.data.company.id} screen={screen} context={context.data} />
}

function ExpenseGeneralConsultationManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const [rows, setRows] = useState<IssuedExpenseRecord[]>(() => readIssuedExpenses(context.company.id))
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [pendingVoid, setPendingVoid] = useState<IssuedExpenseRecord | null>(null)
  const [pendingEmail, setPendingEmail] = useState<IssuedExpenseRecord | null>(null)
  const [clientEmail, setClientEmail] = useState('')
  const [assistantEmail, setAssistantEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    if (!query) return rows
    return rows.filter(row => [row.month, displayExpenseMonth(row.month), row.year, row.issueDate, row.receiptNumber, row.identification, row.businessName, row.phone, row.email, row.expenseType, row.generationType, row.total, row.status, displayStatus(row.status)]
      .join(' ').toLocaleLowerCase('es').includes(query))
  }, [rows, search])

  const prepareEmail = (row: IssuedExpenseRecord) => {
    const customer = customerForExpense(row, readCustomers())
    setPendingEmail(row)
    setClientEmail((customer?.email || row.email || '').trim())
    setAssistantEmail((customer?.assistantEmail || '').trim())
    setEmailError('')
    setMessage('')
  }

  const closeEmailDialog = () => {
    setPendingEmail(null)
    setClientEmail('')
    setAssistantEmail('')
    setEmailError('')
  }

  const sendExpenseEmail = () => {
    if (!pendingEmail) return
    const normalizedClientEmail = clientEmail.trim().toLocaleLowerCase('es')
    const normalizedAssistantEmail = assistantEmail.trim().toLocaleLowerCase('es')
    if (!normalizedClientEmail && !normalizedAssistantEmail) {
      setEmailError('Ingresa al menos el Email del cliente o el Email Asistente.')
      return
    }
    if (normalizedClientEmail && !validEmail(normalizedClientEmail)) {
      setEmailError('El Email del cliente no tiene un formato válido.')
      return
    }
    if (normalizedAssistantEmail && !validEmail(normalizedAssistantEmail)) {
      setEmailError('El Email Asistente no tiene un formato válido.')
      return
    }

    const recipients = uniqueEmails([normalizedClientEmail, normalizedAssistantEmail])
    const template = readExpenseEmailTemplate(pendingEmail.expenseType)
    const sentAt = new Date().toISOString()
    const period = `${pendingEmail.month.padStart(2, '0')}-${pendingEmail.year}`
    const variables = {
      RAZON_SOCIAL: pendingEmail.businessName,
      COMPROBANTE: pendingEmail.receiptNumber,
      MES: displayExpenseMonth(pendingEmail.month),
      ANIO: pendingEmail.year,
      FECHA: pendingEmail.issueDate,
      VALOR: displayMoney(pendingEmail.total),
    }
    const clientGroup = pendingEmail.identification.trim() || normalize(pendingEmail.businessName)
    const detail = {
      id: crypto.randomUUID(), period, expenseId: pendingEmail.id, receiptNumber: pendingEmail.receiptNumber,
      client: pendingEmail.businessName, emails: recipients, total: pendingEmail.total, user: context.actor.name,
      clientGroup, status: 'PENDIENTE',
    }
    const batch = {
      id: crypto.randomUUID(), period, expenseType: pendingEmail.expenseType, sentAt, expenseCount: 1, emailCount: 1,
      user: context.actor.name, status: 'PENDIENTE', copyEmails: template.copyEmails, templateSubject: template.subject,
      dispatches: [{
        clientGroup, client: pendingEmail.businessName, to: recipients, cc: template.copyEmails,
        subject: applyTemplate(template.subject, variables), body: applyTemplate(template.body, variables),
        expenseIds: [pendingEmail.id], attachmentFileName: pendingEmail.pdfFileName, status: 'PENDIENTE',
      }],
      details: [detail],
    }
    const historyKey = emailHistoryStorageKey(context.company.id)
    let currentHistory: unknown[] = []
    try {
      const saved = JSON.parse(localStorage.getItem(historyKey) ?? '[]')
      currentHistory = Array.isArray(saved) ? saved : []
    } catch { currentHistory = [] }
    localStorage.setItem(historyKey, JSON.stringify([batch, ...currentHistory]))
    const recipientText = recipients.join(' y ')
    const copies = template.copyEmails.length ? ` También se enviará copia a ${template.copyEmails.join(', ')}.` : ''
    setMessage(`El reenvío de la expensa ${pendingEmail.receiptNumber} quedó Pendiente para ${recipientText}. Se aplicó la plantilla ${pendingEmail.expenseType === 'ORDINARIA' ? 'Ordinaria' : pendingEmail.expenseType === 'EXTRAORDINARIA' ? 'Extraordinaria' : 'Agua'} y se adjuntó ${pendingEmail.pdfFileName}.${copies}`)
    closeEmailDialog()
  }

  const confirmVoid = () => {
    if (!pendingVoid || pendingVoid.status !== 'VIGENTE') return
    setRows(voidIssuedExpense(context.company.id, pendingVoid.id, context.actor.name))
    setMessage(`La expensa ${pendingVoid.receiptNumber} fue anulada correctamente.`)
    setPendingVoid(null)
  }

  return <div className="page screen-page expense-consultation-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header expense-consultation-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div><label className="screen-table-search"><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar en todas las columnas" aria-label="Buscar expensas" /></label></section>
    {message && <div className="expense-consultation-message" role="status">{message}<button type="button" onClick={() => setMessage('')}>Cerrar</button></div>}
    <section className="expense-consultation-table"><table><thead><tr><th>Mes</th><th>Año</th><th>Fecha Emisión</th><th># Comprobante</th><th>Estado</th><th>Identificación</th><th>Razón Social</th><th>Teléfono</th><th>Email</th><th>Tipo Expensa</th><th>Tipo Generación</th><th>Total</th><th>PDF</th><th>Enviar Email</th><th>Anular</th></tr></thead><tbody>
      {filteredRows.map(row => { const available = row.status === 'VIGENTE'; return <tr key={row.id} className={row.status === 'ANULADA' ? 'voided' : row.status === 'BORRADA' ? 'deleted' : row.status === 'PENDIENTE_COMPLETAR' ? 'pending-completion' : undefined}><td>{displayExpenseMonth(row.month)}</td><td>{row.year}</td><td>{row.issueDate}</td><td><strong>{row.receiptNumber}</strong></td><td><span className={`expense-status ${row.status.toLowerCase().replace('_', '-')}`}>{displayStatus(row.status)}</span></td><td>{row.identification || '—'}</td><td>{row.businessName}</td><td>{row.phone || '—'}</td><td>{row.email || '—'}</td><td><span className={`expense-kind ${row.expenseType.toLowerCase()}`}>{row.expenseType === 'ORDINARIA' ? 'Ordinaria' : row.expenseType === 'EXTRAORDINARIA' ? 'Extraordinaria' : 'Agua'}</span></td><td>{row.generationType === 'AUTOMATICA' ? 'Automática' : 'Individual'}</td><td><strong>{displayMoney(row.total)}</strong></td><td>{available ? <a className="expense-consultation-icon pdf" href={`/vista-previa/expensas/${encodeURIComponent(row.id)}`} target="_blank" rel="noreferrer" title={`Abrir vista previa de ${row.pdfFileName}`} aria-label={`Abrir PDF ${row.receiptNumber}`}><FileDown /></a> : <button type="button" className="expense-consultation-icon pdf" title={`PDF no disponible: ${displayStatus(row.status)}`} aria-label={`PDF no disponible ${row.receiptNumber}`} disabled><FileDown /></button>}</td><td><button type="button" className="expense-consultation-icon email" title={available ? 'Enviar por email' : `Envío no disponible: ${displayStatus(row.status)}`} aria-label={`Enviar por email ${row.receiptNumber}`} disabled={!available} onClick={() => prepareEmail(row)}><Mail /></button></td><td><button type="button" className="expense-void-button" disabled={!available} onClick={() => setPendingVoid(row)}><Ban />{row.status === 'ANULADA' ? 'Anulada' : row.status === 'BORRADA' ? 'Borrada' : row.status === 'PENDIENTE_COMPLETAR' ? 'Pendiente' : 'Anular'}</button></td></tr> })}
      {!filteredRows.length && <tr><td colSpan={15}><div className="expense-consultation-empty"><ReceiptText /><strong>{rows.length ? 'No existen coincidencias' : 'No existen expensas registradas'}</strong><span>{rows.length ? 'Prueba con otro criterio de búsqueda.' : 'Las expensas guardadas, generadas, anuladas o borradas aparecerán aquí.'}</span></div></td></tr>}
    </tbody></table></section>
    {pendingVoid && <div className="expense-void-backdrop" role="presentation" onMouseDown={() => setPendingVoid(null)}><section className="expense-void-dialog" role="alertdialog" aria-modal="true" aria-labelledby="void-expense-title" onMouseDown={event => event.stopPropagation()}><div className="expense-void-warning"><AlertTriangle /></div><h2 id="void-expense-title">Anular expensa</h2><p>¿Confirma la anulación de la expensa <strong>{pendingVoid.receiptNumber}</strong> de <strong>{pendingVoid.businessName}</strong>?</p><span>El comprobante permanecerá en el histórico como anulado y no podrá enviarse por correo.</span><div className="expense-void-actions"><button type="button" onClick={() => setPendingVoid(null)}>Cancelar</button><button type="button" className="confirm" onClick={confirmVoid}><Ban />Anular expensa</button></div></section></div>}
    {pendingEmail && <div className="expense-email-resend-backdrop" role="presentation" onMouseDown={closeEmailDialog}><section className="expense-email-resend-dialog" role="dialog" aria-modal="true" aria-labelledby="resend-expense-title" onMouseDown={event => event.stopPropagation()}><button type="button" className="expense-email-resend-close" aria-label="Cerrar confirmación de envío" onClick={closeEmailDialog}><X /></button><div className="expense-email-resend-icon"><Mail /></div><h2 id="resend-expense-title">Reenviar Expensa</h2><p>Confirma o edita los destinatarios antes de enviar la expensa <strong>{pendingEmail.receiptNumber}</strong>.</p><div className="expense-email-resend-summary"><span><b>Cliente</b>{pendingEmail.businessName}</span><span><b>Tipo</b>{pendingEmail.expenseType === 'ORDINARIA' ? 'Ordinaria' : pendingEmail.expenseType === 'EXTRAORDINARIA' ? 'Extraordinaria' : 'Agua'}</span></div><div className="expense-email-resend-fields"><label>Email del Cliente<input type="email" maxLength={150} value={clientEmail} onChange={event => { setClientEmail(event.target.value); setEmailError('') }} placeholder="cliente@correo.com" /></label><label>Email Asistente<input type="email" maxLength={150} value={assistantEmail} onChange={event => { setAssistantEmail(event.target.value); setEmailError('') }} placeholder="asistente@correo.com" /></label></div>{emailError && <div className="expense-email-resend-error" role="alert"><AlertTriangle />{emailError}</div>}<small>Los cambios aplican únicamente a este envío y no modifican el registro del cliente.</small><footer><button type="button" onClick={closeEmailDialog}>Cancelar</button><button type="button" className="confirm-email-send" onClick={sendExpenseEmail}><Send />Enviar Email</button></footer></section></div>}
  </div>
}
