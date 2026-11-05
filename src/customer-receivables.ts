import { readAuthorizedCollections } from './collection-records'
import { readIssuedExpenses } from './expense-records'

export type CustomerReceivableStatus = 'PENDIENTE' | 'CANCELADA'

export type CustomerReceivableRecord = {
  id: string
  expenseId: string
  receiptNumber: string
  customerId?: string
  identification?: string
  businessName?: string
  issueDate: string
  originalAmount: number
  balance: number
  collectedAmount: number
  status: CustomerReceivableStatus
  appliedCollectionIds: string[]
  appliedAdvanceCrossingIds?: string[]
  createdAt: string
  updatedAt: string
  sourceUploadId?: string
  sourceDocument?: string
}

export type ReceivablePayment = {
  expenseId: string
  receiptNumber: string
  issueDate: string
  originalAmount: number
  value: number
}

export function customerReceivableStorageKey(companyId: string) {
  return `saga.customer-receivables:${companyId}`
}

export function readCustomerReceivables(companyId: string): CustomerReceivableRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(customerReceivableStorageKey(companyId)) ?? '[]')
    return Array.isArray(value) ? value as CustomerReceivableRecord[] : []
  } catch {
    return []
  }
}

export function saveCustomerReceivables(companyId: string, records: CustomerReceivableRecord[]) {
  localStorage.setItem(customerReceivableStorageKey(companyId), JSON.stringify(records))
}

function amount(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Number(Math.max(0, parsed).toFixed(2)) : 0
}

export function ensureCustomerReceivables(companyId: string): CustomerReceivableRecord[] {
  const current = readCustomerReceivables(companyId)
  const knownExpenseIds = new Set(current.map(record => record.expenseId))
  const collections = readAuthorizedCollections(companyId).filter(collection => collection.status === 'GENERADA')
  const now = new Date().toISOString()
  const missing = readIssuedExpenses(companyId)
    .filter(expense => expense.status === 'VIGENTE' && !knownExpenseIds.has(expense.id))
    .map(expense => {
      const applications = collections.flatMap(collection => (collection.payload.receiptValues ?? [])
        .filter(value => value.kind === 'DOCUMENTO' && value.id === expense.id && value.value > 0)
        .map(value => ({ collection, value: amount(value.value) })))
      const paid = Math.min(amount(expense.total), amount(applications.reduce((sum, application) => sum + application.value, 0)))
      const balance = amount(expense.total - paid)
      const firstApplication = applications[0]?.collection
      return {
        id: crypto.randomUUID(),
        expenseId: expense.id,
        receiptNumber: expense.receiptNumber,
        customerId: firstApplication?.customerId,
        identification: expense.identification,
        businessName: expense.businessName,
        issueDate: expense.issueDate,
        originalAmount: amount(expense.total),
        balance,
        collectedAmount: paid,
        status: balance <= 0 ? 'CANCELADA' as const : 'PENDIENTE' as const,
        appliedCollectionIds: Array.from(new Set(applications.map(application => application.collection.id))),
        createdAt: expense.createdAt || now,
        updatedAt: paid > 0 ? applications[applications.length - 1]?.collection.createdAt ?? now : now,
      }
    })
  if (!missing.length) return current
  const next = [...missing, ...current]
  saveCustomerReceivables(companyId, next)
  return next
}

export function applyCollectionToReceivables({
  companyId,
  collectionId,
  customer,
  payments,
  appliedAt,
}: {
  companyId: string
  collectionId: string
  customer: { id: string; identification: string; businessName: string }
  payments: ReceivablePayment[]
  appliedAt: string
}) {
  const current = ensureCustomerReceivables(companyId)
  const paymentByExpense = new Map(payments.filter(payment => payment.value > 0).map(payment => [payment.expenseId, payment]))
  const updatedExpenseIds = new Set<string>()
  const next = current.map(record => {
    const payment = paymentByExpense.get(record.expenseId)
    if (!payment || record.appliedCollectionIds?.includes(collectionId)) return record
    updatedExpenseIds.add(record.expenseId)
    const originalAmount = amount(record.originalAmount || payment.originalAmount)
    const currentBalance = Math.min(originalAmount, amount(record.balance))
    const appliedValue = Math.min(currentBalance, amount(payment.value))
    const balance = amount(currentBalance - appliedValue)
    return {
      ...record,
      receiptNumber: record.receiptNumber || payment.receiptNumber,
      customerId: record.customerId || customer.id,
      identification: record.identification || customer.identification,
      businessName: record.businessName || customer.businessName,
      issueDate: record.issueDate || payment.issueDate,
      originalAmount,
      balance,
      collectedAmount: amount(originalAmount - balance),
      status: balance <= 0 ? 'CANCELADA' as const : 'PENDIENTE' as const,
      appliedCollectionIds: [...(record.appliedCollectionIds ?? []), collectionId],
      updatedAt: appliedAt,
    }
  })

  paymentByExpense.forEach((payment, expenseId) => {
    if (updatedExpenseIds.has(expenseId) || next.some(record => record.expenseId === expenseId)) return
    const originalAmount = amount(payment.originalAmount)
    const balance = amount(originalAmount - Math.min(originalAmount, amount(payment.value)))
    next.unshift({
      id: crypto.randomUUID(),
      expenseId,
      receiptNumber: payment.receiptNumber,
      customerId: customer.id,
      identification: customer.identification,
      businessName: customer.businessName,
      issueDate: payment.issueDate,
      originalAmount,
      balance,
      collectedAmount: amount(originalAmount - balance),
      status: balance <= 0 ? 'CANCELADA' : 'PENDIENTE',
      appliedCollectionIds: [collectionId],
      createdAt: appliedAt,
      updatedAt: appliedAt,
    })
  })

  saveCustomerReceivables(companyId, next)
  return next
}


export function releaseCollectionFromReceivables({
  companyId,
  collectionId,
  releasedAt,
}: {
  companyId: string
  collectionId: string
  releasedAt: string
}) {
  const collection = readAuthorizedCollections(companyId).find(record => record.id === collectionId)
  if (!collection) return readCustomerReceivables(companyId)
  const releasedByExpense = new Map((collection.payload.receiptValues ?? [])
    .filter(value => value.kind === 'DOCUMENTO' && value.value > 0)
    .map(value => [value.id, amount(value.value)]))
  const next = readCustomerReceivables(companyId).map(record => {
    const releasedValue = releasedByExpense.get(record.expenseId)
    if (!releasedValue || !record.appliedCollectionIds?.includes(collectionId)) return record
    const originalAmount = amount(record.originalAmount)
    const balance = Math.min(originalAmount, amount(record.balance + releasedValue))
    return {
      ...record,
      balance,
      collectedAmount: amount(originalAmount - balance),
      status: 'PENDIENTE' as const,
      appliedCollectionIds: record.appliedCollectionIds.filter(id => id !== collectionId),
      updatedAt: releasedAt,
    }
  })
  saveCustomerReceivables(companyId, next)
  return next
}


export function applyAdvanceCrossingToReceivables({
  companyId,
  crossingId,
  applications,
  appliedAt,
}: {
  companyId: string
  crossingId: string
  applications: Array<{ receivableId: string; value: number }>
  appliedAt: string
}) {
  const valueByReceivable = new Map(applications.map(item => [item.receivableId, Math.max(0, Number(item.value.toFixed(2)))]))
  const next = ensureCustomerReceivables(companyId).map(record => {
    const value = valueByReceivable.get(record.id)
    if (!value || record.appliedAdvanceCrossingIds?.includes(crossingId)) return record
    const applied = Math.min(record.balance, value)
    const balance = Number(Math.max(0, record.balance - applied).toFixed(2))
    return {
      ...record,
      balance,
      collectedAmount: Number(Math.max(0, record.originalAmount - balance).toFixed(2)),
      status: balance <= 0 ? 'CANCELADA' as const : 'PENDIENTE' as const,
      appliedAdvanceCrossingIds: [...(record.appliedAdvanceCrossingIds ?? []), crossingId],
      updatedAt: appliedAt,
    }
  })
  saveCustomerReceivables(companyId, next)
  return next
}

export function releaseAdvanceCrossingFromReceivables({
  companyId,
  crossingId,
  applications,
  releasedAt,
}: {
  companyId: string
  crossingId: string
  applications: Array<{ receivableId: string; value: number }>
  releasedAt: string
}) {
  const valueByReceivable = new Map(applications.map(item => [item.receivableId, Math.max(0, Number(item.value.toFixed(2)))]))
  const next = ensureCustomerReceivables(companyId).map(record => {
    const value = valueByReceivable.get(record.id)
    if (!value || !record.appliedAdvanceCrossingIds?.includes(crossingId)) return record
    const balance = Number(Math.min(record.originalAmount, record.balance + value).toFixed(2))
    return {
      ...record,
      balance,
      collectedAmount: Number(Math.max(0, record.originalAmount - balance).toFixed(2)),
      status: 'PENDIENTE' as const,
      appliedAdvanceCrossingIds: record.appliedAdvanceCrossingIds.filter(id => id !== crossingId),
      updatedAt: releasedAt,
    }
  })
  saveCustomerReceivables(companyId, next)
  return next
}
