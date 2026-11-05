import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, CheckCircle2, CreditCard, FileText, HandCoins, Mail, Pencil, Plus, ReceiptText, Save, Scale, Trash2, X } from 'lucide-react'
import { api } from './api'
import { accountingVoucherStorageKey, getNextVoucherNumber, type AccountingVoucherRecord } from './AccountingVoucherPage'
import { readAdvanceTypes } from './advance-types-store'
import { formatFullDateInput } from './date-input'
import { COLLECTION_DRAFTS_CHANGED_EVENT, readAuthorizedCollections, readCollectionDrafts, saveAuthorizedCollections, saveCollectionDrafts, type CollectionAccountingLine, type CollectionDraft, type CollectionDraftPayload } from './collection-records'
import { applyCollectionToReceivables, ensureCustomerReceivables, readCustomerReceivables } from './customer-receivables'
import { registerAdvancesFromCollection } from './customer-advance-records'
import { readIssuedExpenses, type IssuedExpenseRecord } from './expense-records'
import { readCollectionEmailTemplate } from './OrdinaryExpenseEmailTemplatePage'
import { validateOperationDate } from './operation-date-rules'
import { SearchableDatalistInput } from './SearchableDatalistInput'
import { ecuadorBanks, type CustomerRow } from './CustomerRegistryPage'
import type { Context, ScreenSpec } from './types'
import { DocumentEditorHeader } from './DocumentEditorHeader'

type CollectionTab = 'VALUES' | 'PAYMENT' | 'ACCOUNTING'
type OpenObligation = {
  id: string
  number: string
  issueDate: string
  total: number
  collected: number
  balance: number
  detail: string
}
type CollectionAdvance = {
  id: string
  typeId: string
  description: string
  value: string
}
type Account = { Codigo: string; 'Descripción': string; Tipo: string; Estado: string }
type AccountAssignments = Record<string, string>
type PaymentMethodType = 'EFECTIVO' | 'CHEQUE' | 'TRANSFERENCIA' | 'DEPOSITO' | 'TARJETA_CREDITO'
type CollectionPaymentMethod = {
  id: string
  type: PaymentMethodType | ''
  bank: string
  accountNumber: string
  checkNumber: string
  holder: string
  transactionNumber: string
  detail: string
  depositSlip: string
  cardType: 'DEBITO' | 'CREDITO'
  cardNumber: string
  voucherNumber: string
  value: string
  saved: boolean
}

const paymentMethodOptions: Array<{ value: PaymentMethodType; label: string }> = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'DEPOSITO', label: 'Depósito' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta Crédito' },
]
type PaymentUpdate = <K extends keyof Omit<CollectionPaymentMethod, 'id'>>(id: string, field: K, value: CollectionPaymentMethod[K]) => void

const money = (value: number) => new Intl.NumberFormat('es-EC', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2,
}).format(value)

function displayDate(value: string) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : value || '—'
}

function todayDisplay() {
  const now = new Date()
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
}

function readCustomers() {
  try {
    const stored = JSON.parse(localStorage.getItem('saga.customers') ?? '[]')
    if (!Array.isArray(stored)) return []
    return (stored as CustomerRow[])
      .sort((left, right) => left.businessName.localeCompare(right.businessName, 'es'))
  } catch {
    return []
  }
}

function customerLabel(customer: CustomerRow) {
  return `${customer.identification} · ${customer.businessName}`
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim()
}

function numericValue(value: string) {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null')
    return value ?? fallback
  } catch {
    return fallback
  }
}

function displayDateToIso(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value
}

function readAccounts() {
  return readJson<Account[]>('saga.accounting.plan', [])
    .filter(account => account.Tipo.toLocaleUpperCase('es') === 'AUXILIAR' && account.Estado.toLocaleUpperCase('es') !== 'INACTIVO')
    .sort((left, right) => left.Codigo.localeCompare(right.Codigo, 'es', { numeric: true }))
}

function accountingAssignmentKey(companyId: string) {
  return `saga.accounting.account-assignments:${companyId}`
}

function applyTemplate(value: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce((result, [token, replacement]) => result.replaceAll(`{{${token}}}`, replacement), value)
}

function uniqueEmails(values: Array<string | undefined>) {
  return Array.from(new Set(values.map(value => String(value ?? '').trim().toLocaleLowerCase('es')).filter(value => /^\S+@\S+\.\S+$/.test(value))))
}

function obligationDetail(expense: IssuedExpenseRecord) {
  const concepts = Array.from(new Set((expense.lines ?? [])
    .map(line => line.conceptText || line.itemDescription)
    .filter(Boolean)))
  return concepts.join(' · ') || `Expensa ${expense.expenseType.toLocaleLowerCase('es')}`
}

function buildOpenObligations(companyId: string, customer: CustomerRow): OpenObligation[] {
  const receivables = readCustomerReceivables(companyId)
  const receivableByExpense = new Map(receivables.map(record => [record.expenseId, record]))
  const customerIdentification = normalize(customer.identification)
  const customerName = normalize(customer.businessName)

  return readIssuedExpenses(companyId)
    .filter(expense => expense.status === 'VIGENTE')
    .map(expense => {
      const receivable = receivableByExpense.get(expense.id)
      const belongsToCustomer = receivable?.customerId === customer.id
        || normalize(expense.identification) === customerIdentification
        || normalize(expense.businessName) === customerName
      if (!belongsToCustomer) return null
      const total = Math.max(0, Number(receivable?.originalAmount ?? expense.total))
      const balance = Math.max(0, Math.min(total, Number(receivable?.balance ?? expense.total)))
      if (balance <= 0) return null
      return {
        id: expense.id,
        number: expense.receiptNumber,
        issueDate: displayDate(expense.issueDate),
        total,
        collected: Math.max(0, total - balance),
        balance,
        detail: obligationDetail(expense),
      }
    })
    .filter((record): record is OpenObligation => Boolean(record))
    .sort((left, right) => right.number.localeCompare(left.number, 'es', { numeric: true }))
}

function BankField({ record, update }: { record: CollectionPaymentMethod; update: PaymentUpdate }) {
  return <label><span>Banco</span><SearchableDatalistInput list="collection-ecuador-banks" value={record.bank} disabled={record.saved} onChange={event => update(record.id, 'bank', event.target.value)} onClear={() => update(record.id, 'bank', '')} clearLabel="Borrar banco" placeholder="Escribe para filtrar bancos" /></label>
}

function PaymentValueField({ record, update }: { record: CollectionPaymentMethod; update: PaymentUpdate }) {
  return <label className="payment-value"><span>Valor</span><input aria-label={`Valor ${paymentMethodOptions.find(option => option.value === record.type)?.label ?? 'Método de Pago'}`} inputMode="decimal" value={record.value} disabled={record.saved} onFocus={event => event.currentTarget.select()} onChange={event => update(record.id, 'value', event.target.value.replace(',', '.').replace(/[^\d.]/g, ''))} onBlur={() => update(record.id, 'value', numericValue(record.value).toFixed(2))} /></label>
}

function newPaymentMethod(): CollectionPaymentMethod {
  return {
    id: crypto.randomUUID(),
    type: '',
    bank: '',
    accountNumber: '',
    checkNumber: '',
    holder: '',
    transactionNumber: '',
    detail: '',
    depositSlip: '',
    cardType: 'DEBITO',
    cardNumber: '',
    voucherNumber: '',
    value: '0.00',
    saved: false,
  }
}

function nextCollectionNumber(companyId: string) {
  const sequences = [...readCollectionDrafts(companyId), ...readAuthorizedCollections(companyId)].map(record => {
    const match = /(\d+)$/.exec(record.number)
    return match ? Number(match[1]) : 0
  })
  return `REC-${String(Math.max(0, ...sequences) + 1).padStart(6, '0')}`
}

export function CollectionEntryPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <CollectionEntryManager key={context.data.company.id} screen={screen} context={context.data} />
}

function CollectionEntryManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const [pendingCollections, setPendingCollections] = useState(() => readCollectionDrafts(context.company.id)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)))
  const customers = useMemo(readCustomers, [])
  const accounts = useMemo(readAccounts, [])
  const assignments = useMemo(() => readJson<AccountAssignments>(accountingAssignmentKey(context.company.id), {}), [context.company.id])
  const advanceTypes = useMemo(() => readAdvanceTypes()
    .filter(record => record.state === 'ACTIVO')
    .sort((left, right) => left.type.localeCompare(right.type, 'es')), [context.company.id])
  const [formOpen, setFormOpen] = useState(false)
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [collectionNumber, setCollectionNumber] = useState(() => nextCollectionNumber(context.company.id))
  const [issueDate, setIssueDate] = useState(todayDisplay)
  const [customerInput, setCustomerInput] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [detail, setDetail] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [activeTab, setActiveTab] = useState<CollectionTab>('VALUES')
  const [obligationChooserOpen, setObligationChooserOpen] = useState(false)
  const [selectedObligationIds, setSelectedObligationIds] = useState<Set<string>>(new Set())
  const [pendingObligationIds, setPendingObligationIds] = useState<Set<string>>(new Set())
  const [obligationValues, setObligationValues] = useState<Record<string, string>>({})
  const [advances, setAdvances] = useState<CollectionAdvance[]>([])
  const [paymentMethods, setPaymentMethods] = useState<CollectionPaymentMethod[]>([])
  const [accountingLines, setAccountingLines] = useState<CollectionAccountingLine[]>([])
  const [editingAccountingId, setEditingAccountingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    ensureCustomerReceivables(context.company.id)
  }, [context.company.id])
  useEffect(() => {
    const refreshDrafts = (event: Event) => {
      const companyId = (event as CustomEvent<{ companyId?: string }>).detail?.companyId
      if (companyId && companyId !== context.company.id) return
      setPendingCollections(readCollectionDrafts(context.company.id).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)))
    }
    window.addEventListener(COLLECTION_DRAFTS_CHANGED_EVENT, refreshDrafts)
    return () => window.removeEventListener(COLLECTION_DRAFTS_CHANGED_EVENT, refreshDrafts)
  }, [context.company.id])
  const selectedCustomer = customers.find(customer => customer.id === selectedCustomerId)
  const openObligations = useMemo(() => selectedCustomer
    ? buildOpenObligations(context.company.id, selectedCustomer)
    : [], [context.company.id, selectedCustomer])
  const selectedObligations = openObligations.filter(record => selectedObligationIds.has(record.id))
  const emailAddresses = [selectedCustomer?.email, selectedCustomer?.assistantEmail].filter(Boolean) as string[]
  const paymentTotals = paymentMethodOptions.map(option => [option.label, paymentMethods
    .filter(record => record.saved && record.type === option.value)
    .reduce((sum, record) => sum + numericValue(record.value), 0)] as const)
  const paymentGrandTotal = paymentTotals.reduce((sum, [, value]) => sum + value, 0)
  const obligationTotal = selectedObligations.reduce((sum, record) => sum + Math.min(record.balance, numericValue(obligationValues[record.id] ?? '0')), 0)
  const advanceTotal = advances.reduce((sum, record) => sum + numericValue(record.value), 0)
  const totalCollection = obligationTotal + advanceTotal
  const roundedCollectionTotal = Number(totalCollection.toFixed(2))
  const roundedPaymentTotal = Number(paymentGrandTotal.toFixed(2))
  const paymentDifference = Number(Math.abs(roundedCollectionTotal - roundedPaymentTotal).toFixed(2))
  const totalDebit = Number(accountingLines.reduce((sum, line) => sum + Number(line.debit || 0), 0).toFixed(2))
  const totalCredit = Number(accountingLines.reduce((sum, line) => sum + Number(line.credit || 0), 0).toFixed(2))
  const accountingMatches = roundedCollectionTotal > 0 && totalDebit === totalCredit && totalDebit === roundedCollectionTotal && roundedPaymentTotal === roundedCollectionTotal
  const allObligationsPending = openObligations.length > 0 && openObligations.every(record => pendingObligationIds.has(record.id))
  const someObligationsPending = openObligations.some(record => pendingObligationIds.has(record.id))
  const accountingSourceSignature = JSON.stringify({
    obligations: selectedObligations.map(record => [record.id, obligationValues[record.id] ?? '0']),
    advances: advances.map(record => [record.id, record.typeId, record.description, record.value]),
    customer: selectedCustomerId,
  })

  useEffect(() => {
    const automaticLines: CollectionAccountingLine[] = []
    if (roundedCollectionTotal > 0) automaticLines.push({
      id: `cash-${collectionNumber}`,
      accountCode: assignments.GENERAL_CASH ?? '',
      debit: roundedCollectionTotal,
      credit: 0,
      description: `Recaudación ${collectionNumber} · ${selectedCustomer?.businessName ?? 'Cliente'}`,
      automatic: true,
    })
    selectedObligations.forEach(record => automaticLines.push({
      id: `obligation-${record.id}`,
      accountCode: assignments.CUSTOMERS_RECEIVABLE ?? '',
      debit: 0,
      credit: Number(Math.min(record.balance, numericValue(obligationValues[record.id] ?? '0')).toFixed(2)),
      description: `${record.number} · ${record.detail}`,
      automatic: true,
    }))
    advances.filter(record => numericValue(record.value) > 0).forEach(record => {
      const advanceType = advanceTypes.find(type => type.id === record.typeId)
      automaticLines.push({
        id: `advance-${record.id}`,
        accountCode: assignments[`ADVANCE_TYPE:${record.typeId}`] ?? '',
        debit: 0,
        credit: Number(numericValue(record.value).toFixed(2)),
        description: record.description.trim() || `Anticipo · ${advanceType?.type ?? 'Sin tipo'}`,
        automatic: true,
      })
    })
    setAccountingLines(current => [...automaticLines, ...current.filter(line => !line.automatic)])
    setEditingAccountingId(null)
  }, [accountingSourceSignature, assignments.CUSTOMERS_RECEIVABLE, assignments.GENERAL_CASH, collectionNumber, roundedCollectionTotal])

  const openNew = () => {
    setCollectionNumber(nextCollectionNumber(context.company.id))
    setIssueDate(todayDisplay())
    setCustomerInput('')
    setSelectedCustomerId('')
    setDetail('')
    setSendEmail(true)
    setActiveTab('VALUES')
    setSelectedObligationIds(new Set())
    setPendingObligationIds(new Set())
    setObligationValues({})
    setAdvances([])
    setPaymentMethods([])
    setAccountingLines([])
    setEditingAccountingId(null)
    setEditingDraftId(null)
    setDeleteConfirm(false)
    setError('')
    setMessage('')
    setObligationChooserOpen(false)
    setFormOpen(true)
  }

  const payload = (): CollectionDraftPayload => ({
    customerInput,
    detail,
    sendEmail,
    activeTab,
    selectedObligationIds: Array.from(selectedObligationIds),
    obligationValues,
    advances,
    paymentMethods,
    accountingLines,
  })

  const persistDrafts = (records: CollectionDraft[]) => {
    const ordered = [...records].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    setPendingCollections(ordered)
    saveCollectionDrafts(context.company.id, ordered)
  }

  const saveDraft = () => {
    const now = new Date().toISOString()
    const current = pendingCollections.find(record => record.id === editingDraftId)
    const draft: CollectionDraft = {
      id: editingDraftId ?? crypto.randomUUID(),
      companyId: context.company.id,
      number: collectionNumber,
      issueDate,
      customerId: selectedCustomerId,
      customerName: selectedCustomer?.businessName ?? (customerInput.trim() || 'Cliente pendiente'),
      total: roundedCollectionTotal > 0 ? roundedCollectionTotal : roundedPaymentTotal,
      status: 'GUARDADA',
      payload: payload(),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      sourceImportUploadId: current?.sourceImportUploadId,
      sourceImportRow: current?.sourceImportRow,
    }
    persistDrafts(editingDraftId
      ? pendingCollections.map(record => record.id === editingDraftId ? draft : record)
      : [draft, ...pendingCollections])
    setEditingDraftId(draft.id)
    setError('')
    setMessage(`La recaudación ${collectionNumber} fue guardada como borrador.`)
  }

  const openDraft = (draft: CollectionDraft) => {
    const saved = draft.payload
    setEditingDraftId(draft.id)
    setCollectionNumber(draft.number)
    setIssueDate(draft.issueDate)
    setSelectedCustomerId(draft.customerId)
    setCustomerInput(saved?.customerInput ?? customerLabel(customers.find(customer => customer.id === draft.customerId) ?? ({ identification: '', businessName: draft.customerName } as CustomerRow)))
    setDetail(saved?.detail ?? '')
    setSendEmail(saved?.sendEmail ?? true)
    setActiveTab(saved?.activeTab ?? 'VALUES')
    setSelectedObligationIds(new Set(saved?.selectedObligationIds ?? []))
    setPendingObligationIds(new Set())
    setObligationValues(saved?.obligationValues ?? {})
    setAdvances(saved?.advances ?? [])
    setPaymentMethods(saved?.paymentMethods ?? [])
    setAccountingLines(saved?.accountingLines ?? [])
    setEditingAccountingId(null)
    setDeleteConfirm(false)
    setError('')
    setMessage('')
    setObligationChooserOpen(false)
    setFormOpen(true)
  }

  const discardCollection = () => {
    if (editingDraftId) persistDrafts(pendingCollections.filter(record => record.id !== editingDraftId))
    setFormOpen(false)
    setDeleteConfirm(false)
    setEditingDraftId(null)
    setError('')
    setMessage(editingDraftId
      ? `El borrador ${collectionNumber} fue eliminado.`
      : 'La recaudación en proceso fue eliminada sin dejar registros.')
  }

  const selectCustomer = (value: string) => {
    setCustomerInput(value)
    const customer = customers.find(item => customerLabel(item) === value)
    if ((customer?.id ?? '') !== selectedCustomerId) {
      const importedDraft = pendingCollections.find(record => record.id === editingDraftId)?.sourceImportUploadId
      const keepImportedPayment = Boolean(importedDraft && !selectedCustomerId && customer)
      setSelectedObligationIds(new Set())
      setPendingObligationIds(new Set())
      setObligationValues({})
      setAdvances([])
      if (!keepImportedPayment) setPaymentMethods([])
      setAccountingLines([])
      setEditingAccountingId(null)
      setObligationChooserOpen(false)
    }
    setSelectedCustomerId(customer?.id ?? '')
    setError('')
    setMessage('')
  }

  const openObligationChooser = () => {
    setPendingObligationIds(new Set(selectedObligationIds))
    setObligationChooserOpen(true)
  }

  const togglePendingObligation = (id: string) => {
    setPendingObligationIds(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllPendingObligations = () => {
    setPendingObligationIds(allObligationsPending
      ? new Set()
      : new Set(openObligations.map(record => record.id)))
  }

  const acceptObligations = () => {
    const acceptedIds = new Set(pendingObligationIds)
    setSelectedObligationIds(acceptedIds)
    setObligationValues(current => Object.fromEntries(openObligations
      .filter(record => acceptedIds.has(record.id))
      .map(record => [record.id, current[record.id] ?? record.balance.toFixed(2)])))
    setObligationChooserOpen(false)
  }

  const changeObligationValue = (record: OpenObligation, value: string) => {
    const cleaned = value.replace(',', '.').replace(/[^\d.]/g, '')
    if (!cleaned) {
      setObligationValues(current => ({ ...current, [record.id]: '' }))
      return
    }
    const parsed = Number(cleaned)
    if (!Number.isFinite(parsed)) return
    setObligationValues(current => ({ ...current, [record.id]: String(Math.min(record.balance, Math.max(0, parsed))) }))
  }

  const formatObligationValue = (record: OpenObligation) => {
    setObligationValues(current => ({ ...current, [record.id]: Math.min(record.balance, numericValue(current[record.id] ?? '0')).toFixed(2) }))
  }

  const addAdvance = () => {
    setAdvances(current => [...current, {
      id: crypto.randomUUID(),
      typeId: advanceTypes[0]?.id ?? '',
      description: '',
      value: '0.00',
    }])
  }

  const updateAdvance = (id: string, field: keyof Omit<CollectionAdvance, 'id'>, value: string) => {
    setAdvances(current => current.map(record => record.id === id ? { ...record, [field]: value } : record))
  }

  const addPaymentMethod = () => {
    setPaymentMethods(current => current.some(record => !record.saved) ? current : [...current, newPaymentMethod()])
  }

  const updatePaymentMethod = <K extends keyof Omit<CollectionPaymentMethod, 'id'>>(id: string, field: K, value: CollectionPaymentMethod[K]) => {
    setPaymentMethods(current => current.map(record => record.id === id ? { ...record, [field]: value } : record))
  }

  const savePaymentMethod = (id: string) => {
    setPaymentMethods(current => {
      const target = current.find(record => record.id === id)
      if (!target?.type || numericValue(target.value) <= 0) return current
      const saved = current.map(record => record.id === id
        ? { ...record, value: numericValue(record.value).toFixed(2), saved: true }
        : record)
      return saved.some(record => !record.saved) ? saved : [...saved, newPaymentMethod()]
    })
    setError('')
    setMessage('')
  }

  const updateAccountingLine = (id: string, field: keyof Pick<CollectionAccountingLine, 'accountCode' | 'debit' | 'credit' | 'description'>, value: string) => {
    setAccountingLines(current => current.map(line => line.id === id ? {
      ...line,
      [field]: field === 'debit' || field === 'credit' ? numericValue(value) : value,
    } : line))
    setError('')
    setMessage('')
  }

  const addAccountingLine = () => {
    const line: CollectionAccountingLine = { id: crypto.randomUUID(), accountCode: '', debit: 0, credit: 0, description: '', automatic: false }
    setAccountingLines(current => [...current, line])
    setEditingAccountingId(line.id)
    setError('')
    setMessage('')
  }

  const generateCollection = () => {
    setError('')
    setMessage('')
    if (!selectedCustomer) { setError('Selecciona un Cliente activo.'); return }
    const dateError = validateOperationDate(displayDateToIso(issueDate))
    if (dateError) { setError(dateError); return }
    if (roundedCollectionTotal <= 0) { setActiveTab('VALUES'); setError('Registra al menos una Expensa/Factura o un Anticipo con valor mayor a cero.'); return }
    if (paymentDifference > 0) {
      setActiveTab('PAYMENT')
      setError(`El Total Recaudación (${money(roundedCollectionTotal)}) no coincide con el Total de Método de Pago (${money(roundedPaymentTotal)}). Diferencia: ${money(paymentDifference)}.`)
      return
    }
    if (!assignments.GENERAL_CASH) { setActiveTab('ACCOUNTING'); setError('Configura Caja General en Asignación de Cuentas Contables.'); return }
    if (selectedObligations.length && !assignments.CUSTOMERS_RECEIVABLE) { setActiveTab('ACCOUNTING'); setError('Configura Cuenta x Cobrar Clientes en Asignación de Cuentas Contables.'); return }
    const missingAdvanceAccount = advances.find(record => numericValue(record.value) > 0 && !assignments[`ADVANCE_TYPE:${record.typeId}`])
    if (missingAdvanceAccount) {
      const advanceType = advanceTypes.find(record => record.id === missingAdvanceAccount.typeId)
      setActiveTab('ACCOUNTING')
      setError(`Configura la cuenta contable del anticipo ${advanceType?.type ?? 'seleccionado'} en Asignación de Cuentas Contables.`)
      return
    }
    if (accountingLines.some(line => !accounts.some(account => account.Codigo === line.accountCode))) {
      setActiveTab('ACCOUNTING')
      setError('Todas las líneas contables deben utilizar una cuenta Auxiliar activa.')
      return
    }
    if (!accountingMatches) {
      setActiveTab('ACCOUNTING')
      setError(`Asiento no Cuadra. Debe: ${money(totalDebit)} · Haber: ${money(totalCredit)} · Recaudación: ${money(roundedCollectionTotal)} · Métodos de Pago: ${money(roundedPaymentTotal)}.`)
      return
    }
    const recipients = uniqueEmails([selectedCustomer.email, selectedCustomer.assistantEmail])
    if (sendEmail && !recipients.length) { setError('El cliente no tiene Email ni Email Asistente válido para enviar la confirmación.'); return }

    const collectionId = editingDraftId ?? crypto.randomUUID()
    const voucherId = crypto.randomUUID()
    const now = new Date().toISOString()
    const currentPayload: CollectionDraftPayload = {
      ...payload(),
      receiptValues: [
        ...selectedObligations.map(record => ({
          id: record.id,
          document: record.number,
          detail: record.detail,
          value: Number(Math.min(record.balance, numericValue(obligationValues[record.id] ?? '0')).toFixed(2)),
          kind: 'DOCUMENTO' as const,
        })),
        ...advances.filter(record => numericValue(record.value) > 0).map(record => ({
          id: record.id,
          document: `Anticipo - ${advanceTypes.find(type => type.id === record.typeId)?.type ?? 'Sin tipo'}`,
          detail: record.description.trim() || 'Anticipo recibido',
          value: Number(numericValue(record.value).toFixed(2)),
          kind: 'ANTICIPO' as const,
        })),
      ],
    }
    const generated = {
      id: collectionId,
      companyId: context.company.id,
      number: collectionNumber,
      issueDate,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.businessName,
      total: roundedCollectionTotal,
      status: 'GENERADA' as const,
      accountingVoucherId: voucherId,
      emailStatus: sendEmail ? 'PENDIENTE' as const : 'NO_SOLICITADO' as const,
      payload: currentPayload,
      createdAt: now,
      user: context.actor.name,
    }
    saveAuthorizedCollections(context.company.id, [generated, ...readAuthorizedCollections(context.company.id)])
    registerAdvancesFromCollection(context.company.id, collectionId)

    applyCollectionToReceivables({
      companyId: context.company.id,
      collectionId,
      customer: {
        id: selectedCustomer.id,
        identification: selectedCustomer.identification,
        businessName: selectedCustomer.businessName,
      },
      payments: selectedObligations.map(record => ({
        expenseId: record.id,
        receiptNumber: record.number,
        issueDate: record.issueDate,
        originalAmount: record.total,
        value: Math.min(record.balance, numericValue(obligationValues[record.id] ?? '0')),
      })),
      appliedAt: now,
    })

    const voucherKey = accountingVoucherStorageKey(context.company.id)
    const vouchers = readJson<Array<Record<string, unknown>>>(voucherKey, [])
    localStorage.setItem(voucherKey, JSON.stringify([{
      id: voucherId,
      number: getNextVoucherNumber(vouchers as AccountingVoucherRecord[], 'RECAUDACION', undefined, context.company.id),
      date: issueDate,
      type: 'RECAUDACION',
      description: detail.trim() || `Recaudación ${collectionNumber} · ${selectedCustomer.businessName}`,
      debit: totalDebit.toFixed(2),
      credit: totalCredit.toFixed(2),
      status: 'AUTORIZADO',
      sourceCollectionId: collectionId,
      lines: accountingLines.map(line => ({ accountCode: line.accountCode, debit: line.debit, credit: line.credit, description: line.description })),
    }, ...vouchers]))

    if (sendEmail) {
      const template = readCollectionEmailTemplate()
      const [, month = '', year = ''] = issueDate.split('/')
      const variables = { RAZON_SOCIAL: selectedCustomer.businessName, COMPROBANTE: collectionNumber, MES: month, ANIO: year, FECHA: issueDate, VALOR: money(roundedCollectionTotal) }
      const outboxKey = `saga.collection-email-outbox:${context.company.id}`
      const outbox = readJson<Array<Record<string, unknown>>>(outboxKey, [])
      localStorage.setItem(outboxKey, JSON.stringify([{
        id: crypto.randomUUID(), collectionId, collectionNumber, createdAt: now, status: 'PENDIENTE',
        to: recipients, cc: uniqueEmails(template.copyEmails),
        subject: applyTemplate(template.subject, variables), body: applyTemplate(template.body, variables),
        attachmentFileName: `${collectionNumber}.pdf`, attachmentUrl: `/vista-previa/recaudaciones/${encodeURIComponent(collectionId)}`,
      }, ...outbox]))
    }

    persistDrafts(pendingCollections.filter(record => record.id !== editingDraftId))
    setFormOpen(false)
    setEditingDraftId(null)
    setMessage(`La recaudación ${collectionNumber} fue generada, actualizó los saldos de cartera y creó un Asiento Contable de tipo Recaudación.${sendEmail ? ' El correo quedó preparado para envío con la plantilla Modificar Email Recaudaciones.' : ''}`)
    window.open(`/vista-previa/recaudaciones/${encodeURIComponent(collectionId)}`, '_blank', 'noopener,noreferrer')
  }

  return <div className="page screen-page collection-entry-page">
    <DocumentEditorHeader screen={screen} formOpen={formOpen} formTitle="Nueva Recaudación" sectionLabel="Cuentas por cobrar" onClose={() => setFormOpen(false)} actions={<><button type="button" className="collection-save-draft" onClick={saveDraft}><Save />Guardar Borrador</button><button type="button" className="collection-delete" onClick={() => setDeleteConfirm(true)}><Trash2 />Eliminar</button><button type="button" className="collection-generate" onClick={generateCollection}><CheckCircle2 />Generar Recaudación</button></>} listAction={<button type="button" className="primary-action" onClick={openNew}><Plus />Nueva Recaudación</button>} />

    {error && <div className="collection-entry-feedback error" role="alert"><AlertTriangle />{error}</div>}
    {message && <div className="collection-entry-feedback success" role="status"><CheckCircle2 />{message}</div>}

    {deleteConfirm && <div className="collection-delete-backdrop" role="dialog" aria-modal="true" aria-labelledby="collection-delete-title"><section className="collection-delete-dialog"><span><Trash2 /></span><h2 id="collection-delete-title">¿Eliminar {editingDraftId ? 'el borrador' : 'la recaudación en proceso'}?</h2><p>{editingDraftId ? 'Se eliminará el borrador y toda la información registrada.' : 'La recaudación se descartará sin dejar ningún registro.'}</p><footer><button type="button" className="quiet-button" onClick={() => setDeleteConfirm(false)}>Cancelar</button><button type="button" className="collection-confirm-delete" onClick={discardCollection}>Sí, Eliminar</button></footer></section></div>}

    {formOpen ? <section className="collection-entry-workspace">
      <div className="collection-entry-main-column">
        <div className="collection-entry-form-card">
        <header><div><strong>Datos de la Recaudación</strong><span>Información general del comprobante y del cliente.</span></div></header>
        <div className="collection-entry-form-grid">
          <label><span>Número de Recaudación</span><input value={collectionNumber} readOnly aria-readonly="true" /></label>
          <label><span>Fecha Emisión</span><input value={issueDate} onChange={event => { setIssueDate(formatFullDateInput(event.target.value)); setError(''); setMessage('') }} placeholder="DD/MM/AAAA" data-date-format="DD/MM/AAAA" inputMode="numeric" /></label>
          <label className="collection-entry-customer"><span>Cliente</span><SearchableDatalistInput list="collection-customer-options" value={customerInput} onChange={event => selectCustomer(event.target.value)} onClear={() => selectCustomer('')} clearLabel="Borrar cliente" placeholder="Escribe para filtrar los clientes" autoComplete="off" /><datalist id="collection-customer-options">{customers.map(customer => <option key={customer.id} value={customerLabel(customer)} />)}</datalist><small>{customers.length ? `${customers.length} clientes disponibles` : 'No existen clientes registrados.'}</small></label>
          <label className="collection-entry-detail"><span>Detalle de Recaudación</span><textarea maxLength={120} value={detail} onChange={event => setDetail(event.target.value)} placeholder="Ingresa el detalle de la recaudación" /><small>{detail.length}/120 caracteres</small></label>
          <label><span>Total Recaudación</span><input className="collection-entry-readonly-total" value={money(totalCollection)} readOnly aria-readonly="true" /></label>
          <div className="collection-entry-email-toggle"><span>Enviar Email</span><label><input type="checkbox" checked={sendEmail} onChange={event => setSendEmail(event.target.checked)} /><i aria-hidden="true" /><b>{sendEmail ? 'Sí' : 'No'}</b></label></div>
          <div className="collection-entry-email-addresses"><span><Mail />Dirección de Correo</span>{selectedCustomer ? <div>{emailAddresses.length ? emailAddresses.map(email => <em key={email}>{email}</em>) : <small>El cliente seleccionado no tiene correos configurados.</small>}</div> : <small>Selecciona un cliente para mostrar su Email y Email Asistente.</small>}</div>
        </div>
        </div>

        <section className="collection-entry-tabs-card">
          <nav aria-label="Detalle de la recaudación">
            <button type="button" className={activeTab === 'VALUES' ? 'active' : ''} onClick={() => setActiveTab('VALUES')}><FileText />Valores a Cancelar</button>
            <button type="button" className={activeTab === 'PAYMENT' ? 'active' : ''} onClick={() => setActiveTab('PAYMENT')}><CreditCard />Método de Pago</button>
            <button type="button" className={activeTab === 'ACCOUNTING' ? 'active' : ''} onClick={() => setActiveTab('ACCOUNTING')}><Scale />Contabilidad</button>
          </nav>

          {activeTab === 'VALUES' && <div className="collection-values-tab">
            <div className="collection-values-toolbar"><div><strong>Valores pendientes del cliente</strong><span>Selecciona las facturas o expensas que se cancelarán con esta recaudación.</span></div><button type="button" className="primary-action" disabled={!selectedCustomer} onClick={openObligationChooser}><ReceiptText />Facturas</button></div>

            <div className="collection-selected-values"><table><thead><tr><th># Expensa/Factura</th><th>Fecha Emisión</th><th>Total</th><th>Valor Cobrado</th><th>Saldo</th><th>Detalle</th><th>Valor</th></tr></thead><tbody>
              {selectedObligations.map(record => <tr key={record.id}><td><strong>{record.number}</strong></td><td>{record.issueDate}</td><td>{money(record.total)}</td><td>{money(record.collected)}</td><td><b>{money(record.balance)}</b></td><td>{record.detail}</td><td><label><input aria-label={`Valor a cancelar ${record.number}`} inputMode="decimal" value={obligationValues[record.id] ?? record.balance.toFixed(2)} onFocus={event => event.currentTarget.select()} onChange={event => changeObligationValue(record, event.target.value)} onBlur={() => formatObligationValue(record)} /><small>Máximo {money(record.balance)}</small></label></td></tr>)}
              {!selectedObligations.length && <tr><td colSpan={7}><div className="collection-selected-empty"><ReceiptText /><strong>Sin documentos seleccionados</strong><span>Utiliza el botón Facturas para agregar valores pendientes.</span></div></td></tr>}
            </tbody><tfoot><tr><td colSpan={6}>Total Facturas</td><td>{money(obligationTotal)}</td></tr></tfoot></table></div>

            <section className="collection-advances">
              <header><div><strong>Anticipo</strong><span>Registra uno o más anticipos recibidos del cliente.</span></div><button type="button" className="quiet-button" disabled={!advanceTypes.length} onClick={addAdvance}><Plus />Registrar Anticipo</button></header>
              <div><table><thead><tr><th>Tipo Anticipo</th><th>Descripción</th><th>Valor</th><th aria-label="Eliminar" /></tr></thead><tbody>
                {advances.map(record => <tr key={record.id}><td><select aria-label="Tipo Anticipo" value={record.typeId} onChange={event => updateAdvance(record.id, 'typeId', event.target.value)}><option value="" disabled>Selecciona un tipo</option>{advanceTypes.map(type => <option value={type.id} key={type.id}>{type.type}</option>)}</select></td><td><input aria-label="Descripción del anticipo" value={record.description} onChange={event => updateAdvance(record.id, 'description', event.target.value)} placeholder="Detalle del anticipo" /></td><td><input aria-label="Valor del anticipo" inputMode="decimal" value={record.value} onFocus={event => event.currentTarget.select()} onChange={event => updateAdvance(record.id, 'value', event.target.value.replace(',', '.').replace(/[^\d.]/g, ''))} onBlur={() => updateAdvance(record.id, 'value', numericValue(record.value).toFixed(2))} /></td><td><button type="button" aria-label="Eliminar anticipo" title="Eliminar anticipo" onClick={() => setAdvances(current => current.filter(item => item.id !== record.id))}><Trash2 /></button></td></tr>)}
                {!advances.length && <tr><td colSpan={4}><div className="collection-advances-empty">{advanceTypes.length ? 'No existen anticipos registrados en esta recaudación.' : 'Primero registra un Tipo de Anticipo activo en Configuración Financiera.'}</div></td></tr>}
              </tbody><tfoot><tr><td colSpan={2}>Total Anticipos</td><td>{money(advanceTotal)}</td><td /></tr></tfoot></table></div>
            </section>

            <div className="collection-values-summary"><span>{selectedObligations.length} {selectedObligations.length === 1 ? 'documento seleccionado' : 'documentos seleccionados'} · {advances.length} {advances.length === 1 ? 'anticipo' : 'anticipos'}</span><strong>Total Recaudación {money(totalCollection)}</strong></div>
          </div>}

          {activeTab === 'PAYMENT' && <div className="collection-payment-tab">
            <header><div><strong>Métodos de Pago</strong><span>Registra uno o varios métodos utilizados por el cliente.</span></div><button type="button" className="primary-action" disabled={paymentMethods.some(record => !record.saved)} onClick={addPaymentMethod}><Plus />Registrar Método de Pago</button></header>
            <div className="collection-payment-methods">
              {paymentMethods.map((record, index) => <section className={`collection-payment-line ${record.saved ? 'saved' : 'editing'}`} key={record.id}>
                <label className="payment-method-picker"><span>Método {index + 1}</span><select aria-label={`Método de Pago ${index + 1}`} value={record.type} disabled={record.saved} onChange={event => updatePaymentMethod(record.id, 'type', event.target.value as PaymentMethodType | '')}><option value="">Selecciona método</option>{paymentMethodOptions.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
                {record.type === 'EFECTIVO' && <><label className="payment-detail"><span>Detalle</span><input value={record.detail} disabled={record.saved} onChange={event => updatePaymentMethod(record.id, 'detail', event.target.value)} /></label><PaymentValueField record={record} update={updatePaymentMethod} /></>}
                {record.type === 'CHEQUE' && <><BankField record={record} update={updatePaymentMethod} /><label><span># Cuenta</span><input inputMode="numeric" value={record.accountNumber} disabled={record.saved} onChange={event => updatePaymentMethod(record.id, 'accountNumber', event.target.value.replace(/\D/g, ''))} /></label><label><span># Cheque</span><input inputMode="numeric" value={record.checkNumber} disabled={record.saved} onChange={event => updatePaymentMethod(record.id, 'checkNumber', event.target.value.replace(/\D/g, ''))} /></label><label><span>Titular</span><input value={record.holder} disabled={record.saved} onChange={event => updatePaymentMethod(record.id, 'holder', event.target.value)} /></label><PaymentValueField record={record} update={updatePaymentMethod} /></>}
                {record.type === 'TRANSFERENCIA' && <><BankField record={record} update={updatePaymentMethod} /><label><span># Transacción</span><input value={record.transactionNumber} disabled={record.saved} onChange={event => updatePaymentMethod(record.id, 'transactionNumber', event.target.value)} /></label><label className="payment-detail"><span>Detalle</span><input value={record.detail} disabled={record.saved} onChange={event => updatePaymentMethod(record.id, 'detail', event.target.value)} /></label><PaymentValueField record={record} update={updatePaymentMethod} /></>}
                {record.type === 'DEPOSITO' && <><label><span># Papeleta</span><input value={record.depositSlip} disabled={record.saved} onChange={event => updatePaymentMethod(record.id, 'depositSlip', event.target.value)} /></label><label className="payment-detail"><span>Detalle</span><input value={record.detail} disabled={record.saved} onChange={event => updatePaymentMethod(record.id, 'detail', event.target.value)} /></label><PaymentValueField record={record} update={updatePaymentMethod} /></>}
                {record.type === 'TARJETA_CREDITO' && <><BankField record={record} update={updatePaymentMethod} /><label><span>Tipo Tarjeta</span><select value={record.cardType} disabled={record.saved} onChange={event => updatePaymentMethod(record.id, 'cardType', event.target.value as CollectionPaymentMethod['cardType'])}><option value="DEBITO">Débito</option><option value="CREDITO">Crédito</option></select></label><label><span># Tarjeta</span><input inputMode="numeric" value={record.cardNumber} disabled={record.saved} onChange={event => updatePaymentMethod(record.id, 'cardNumber', event.target.value.replace(/\D/g, ''))} /></label><label><span># Voucher</span><input value={record.voucherNumber} disabled={record.saved} onChange={event => updatePaymentMethod(record.id, 'voucherNumber', event.target.value)} /></label><PaymentValueField record={record} update={updatePaymentMethod} /></>}
                <div className="collection-payment-line-actions"><button type="button" className="save" disabled={record.saved || !record.type || numericValue(record.value) <= 0} onClick={() => savePaymentMethod(record.id)}><Check /><span>{record.saved ? 'Guardado' : 'Guardar'}</span></button><button type="button" className="delete" aria-label={`Eliminar método de pago ${index + 1}`} title="Eliminar método de pago" onClick={() => setPaymentMethods(current => current.filter(item => item.id !== record.id))}><Trash2 /></button></div>
              </section>)}
              {!paymentMethods.length && <div className="collection-payment-empty"><CreditCard /><strong>Sin métodos registrados</strong><span>Utiliza Registrar Método de Pago para agregar el primer valor.</span></div>}
            </div>
            <footer><span>{paymentMethods.filter(record => record.saved).length} {paymentMethods.filter(record => record.saved).length === 1 ? 'método registrado' : 'métodos registrados'}</span><strong>Total Método de Pago {money(paymentGrandTotal)}</strong></footer>
            <datalist id="collection-ecuador-banks">{ecuadorBanks.map(bank => <option value={bank} key={bank} />)}</datalist>
          </div>}
          {activeTab === 'ACCOUNTING' && <div className="collection-accounting"><div className="collection-accounting-toolbar"><div><strong>Asiento Contable</strong><span>Debe, Haber, Total Recaudación y Total de Método de Pago deben coincidir.</span></div><button type="button" className="quiet-button" onClick={addAccountingLine}><Plus />Agregar Línea</button></div><div className="collection-accounting-table"><table><thead><tr><th>Acciones</th><th>Cuenta Contable</th><th>Debe</th><th>Haber</th><th>Descripción</th></tr></thead><tbody>
            {accountingLines.map(line => { const editing = editingAccountingId === line.id; return <tr key={line.id}><td><div className="collection-accounting-actions"><button type="button" onClick={() => setEditingAccountingId(editing ? null : line.id)} aria-label={editing ? 'Guardar cambios contables' : 'Editar línea contable'}>{editing ? <Check /> : <Pencil />}</button>{!line.automatic && <button type="button" onClick={() => setAccountingLines(current => current.filter(item => item.id !== line.id))} aria-label="Eliminar línea contable"><Trash2 /></button>}</div></td><td>{editing ? <SearchableDatalistInput list="collection-account-options" value={line.accountCode} onChange={event => updateAccountingLine(line.id, 'accountCode', event.target.value)} onClear={() => updateAccountingLine(line.id, 'accountCode', '')} clearLabel="Borrar cuenta contable" placeholder="Filtrar Plan Contable" /> : <span>{line.accountCode || '—'}<small>{accounts.find(account => account.Codigo === line.accountCode)?.['Descripción']}</small></span>}</td><td className={!accountingMatches ? 'mismatch' : ''}>{editing ? <input aria-label={`Debe ${line.description}`} inputMode="decimal" value={line.debit || ''} onChange={event => updateAccountingLine(line.id, 'debit', event.target.value)} /> : line.debit ? money(line.debit) : '—'}</td><td className={!accountingMatches ? 'mismatch' : ''}>{editing ? <input aria-label={`Haber ${line.description}`} inputMode="decimal" value={line.credit || ''} onChange={event => updateAccountingLine(line.id, 'credit', event.target.value)} /> : line.credit ? money(line.credit) : '—'}</td><td>{editing ? <input aria-label="Descripción contable" maxLength={160} value={line.description} onChange={event => updateAccountingLine(line.id, 'description', event.target.value)} /> : line.description}</td></tr> })}
            {!accountingLines.length && <tr><td colSpan={5}><div className="collection-accounting-empty"><FileText /><span>Selecciona valores a cancelar o anticipos para generar el asiento.</span></div></td></tr>}
            <tr className={`collection-accounting-total ${!accountingMatches ? 'mismatch' : ''}`}><td colSpan={2}>Totales</td><td>{money(totalDebit)}</td><td>{money(totalCredit)}</td><td>Recaudación: {money(roundedCollectionTotal)} · Métodos: {money(roundedPaymentTotal)}</td></tr>
          </tbody></table><datalist id="collection-account-options">{accounts.map(account => <option key={account.Codigo} value={account.Codigo}>{account['Descripción']}</option>)}</datalist></div></div>}
        </section>
      </div>

      <aside className="collection-payment-card">
        <header><strong>Total de Método de Pago</strong><span>Resumen de valores registrados.</span></header>
        <div>{paymentTotals.map(([label, value]) => <p key={label}><span>{label}</span><strong>{money(value)}</strong></p>)}</div>
        <footer><span>Total</span><strong>{money(paymentTotals.reduce((sum, [, value]) => sum + value, 0))}</strong></footer>
      </aside>

      {obligationChooserOpen && <div className="collection-obligation-backdrop" role="dialog" aria-modal="true" aria-label="Facturas y expensas pendientes">
        <section className="collection-obligation-modal">
          <header><div><span>Valores a Cancelar</span><h2>Facturas pendientes</h2><p>{selectedCustomer?.businessName} · {openObligations.length} documentos con saldo</p></div><button type="button" aria-label="Cerrar valores pendientes" onClick={() => setObligationChooserOpen(false)}><X /></button></header>
          <div className="collection-obligation-grid"><table><thead><tr><th><input type="checkbox" aria-label="Seleccionar todas las facturas y expensas" checked={allObligationsPending} ref={element => { if (element) element.indeterminate = someObligationsPending && !allObligationsPending }} disabled={!openObligations.length} onChange={toggleAllPendingObligations} /></th><th># Expensa/Factura</th><th>Fecha Emisión</th><th>Total</th><th>Valor Cobrado</th><th>Saldo</th><th>Detalle</th></tr></thead><tbody>
            {openObligations.map(record => <tr key={record.id} className={pendingObligationIds.has(record.id) ? 'selected' : ''}><td><input type="checkbox" aria-label={`Seleccionar ${record.number}`} checked={pendingObligationIds.has(record.id)} onChange={() => togglePendingObligation(record.id)} /></td><td><strong>{record.number}</strong></td><td>{record.issueDate}</td><td>{money(record.total)}</td><td>{money(record.collected)}</td><td><b>{money(record.balance)}</b></td><td>{record.detail}</td></tr>)}
            {!openObligations.length && <tr><td colSpan={7}><div className="collection-obligation-empty"><ReceiptText /><strong>No existen valores pendientes</strong><span>El cliente seleccionado no tiene facturas o expensas con saldo por cancelar.</span></div></td></tr>}
          </tbody></table></div>
          <footer><span>{pendingObligationIds.size} seleccionados · {money(openObligations.filter(record => pendingObligationIds.has(record.id)).reduce((sum, record) => sum + record.balance, 0))}</span><button type="button" className="primary-action" onClick={acceptObligations}><Check />Aceptar</button></footer>
        </section>
      </div>}
    </section> : <section className="collection-entry-card">
      <header><div><strong>Recaudaciones Pendientes de Completar</strong><span>{pendingCollections.length} {pendingCollections.length === 1 ? 'recaudación guardada' : 'recaudaciones guardadas'}</span></div></header>
      <div className="collection-entry-table-scroll">
        <table>
          <thead><tr><th aria-label="Editar" /><th>Número</th><th>Fecha Emisión</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead>
          <tbody>
            {pendingCollections.map(collection => <tr key={collection.id}>
              <td><button type="button" className="collection-draft-edit" aria-label={`Editar ${collection.number}`} title="Editar borrador" onClick={() => openDraft(collection)}><Pencil /></button></td>
              <td><strong>{collection.number}</strong></td>
              <td>{displayDate(collection.issueDate)}</td>
              <td>{collection.customerName}</td>
              <td className="collection-entry-total">{money(collection.total)}</td>
              <td><span className="collection-entry-status"><i />Guardada</span></td>
            </tr>)}
            {!pendingCollections.length && <tr><td colSpan={6}><div className="collection-entry-empty"><HandCoins /><strong>No existen recaudaciones pendientes</strong><span>Las recaudaciones guardadas sin completar aparecerán en esta tabla.</span></div></td></tr>}
          </tbody>
        </table>
      </div>
    </section>}
  </div>
}
