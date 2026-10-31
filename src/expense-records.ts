export type ExpenseType = 'ORDINARIA' | 'EXTRAORDINARIA' | 'AGUA'
export type ExpenseGenerationType = 'AUTOMATICA' | 'INDIVIDUAL'
export type ExpenseStatus = 'VIGENTE' | 'ANULADA' | 'PENDIENTE_COMPLETAR' | 'BORRADA'

export type IssuedExpenseLine = {
  id: string
  propertyId: string
  propertyDescription: string
  itemId: string
  itemDescription: string
  conceptText: string
  valueMode: 'MT2' | 'FIJO' | 'NA'
  squareMeters: number | null
  quantity: number
  unitPrice: number | null
  total: number
}

export type IssuedExpenseRecord = {
  id: string
  companyId: string
  month: string
  year: string
  issueDate: string
  receiptNumber: string
  identification: string
  businessName: string
  address?: string
  phone: string
  email: string
  expenseType: ExpenseType
  generationType: ExpenseGenerationType
  total: number
  pdfFileName: string
  createdAt: string
  status: ExpenseStatus
  lines?: IssuedExpenseLine[]
  voidedAt?: string
  voidedBy?: string
  deletedAt?: string
  deletedBy?: string
}

const storageKey = (companyId: string) => `saga.issued-expenses:${companyId}`
const individualDraftStorageKey = (companyId: string) => `saga.individual-expense-drafts:${companyId}`
const receiptPrefix = '001-001-'

function receiptSequence(receiptNumber: string) {
  const match = receiptNumber.match(/(\d{6})$/)
  return match ? Number(match[1]) : 0
}

function normalizedReceiptNumber(receiptNumber: string) {
  const sequence = receiptSequence(receiptNumber)
  return sequence > 0 ? `${receiptPrefix}${String(sequence).padStart(6, '0')}` : receiptNumber
}

function normalizedStatus(status: unknown): ExpenseStatus {
  if (status === 'ANULADA' || status === 'PENDIENTE_COMPLETAR' || status === 'BORRADA') return status
  return 'VIGENTE'
}

export function readIssuedExpenses(companyId: string): IssuedExpenseRecord[] {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(companyId)) ?? '[]')
    return (Array.isArray(saved) ? saved as IssuedExpenseRecord[] : [])
      .map(record => {
        const receiptNumber = normalizedReceiptNumber(record.receiptNumber)
        return {
          ...record,
          receiptNumber,
          pdfFileName: `${receiptNumber}.pdf`,
          status: normalizedStatus(record.status),
        }
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  } catch {
    return []
  }
}

export function voidIssuedExpense(companyId: string, recordId: string, user: string) {
  const next = readIssuedExpenses(companyId).map(record => record.id === recordId
    && record.status === 'VIGENTE'
    ? { ...record, status: 'ANULADA' as const, voidedAt: new Date().toISOString(), voidedBy: user }
    : record)
  localStorage.setItem(storageKey(companyId), JSON.stringify(next))
  return next
}

export function voidIssuedExpenseRange(companyId: string, fromReceipt: string, toReceipt: string, user: string) {
  const records = readIssuedExpenses(companyId)
  const ordered = [...records].sort((left, right) => left.receiptNumber.localeCompare(right.receiptNumber, 'es', { numeric: true }))
  const fromIndex = ordered.findIndex(record => record.receiptNumber === fromReceipt)
  const toIndex = ordered.findIndex(record => record.receiptNumber === toReceipt)
  if (fromIndex < 0 || toIndex < 0) return { records, count: 0 }
  const start = Math.min(fromIndex, toIndex)
  const end = Math.max(fromIndex, toIndex)
  const selectedIds = new Set(ordered.slice(start, end + 1).map(record => record.id))
  const voidedAt = new Date().toISOString()
  let count = 0
  const next = records.map(record => {
    if (!selectedIds.has(record.id) || record.status !== 'VIGENTE') return record
    count += 1
    return { ...record, status: 'ANULADA' as const, voidedAt, voidedBy: user }
  })
  localStorage.setItem(storageKey(companyId), JSON.stringify(next))
  return { records: next, count }
}

export function appendIssuedExpenses(companyId: string, records: IssuedExpenseRecord[]) {
  const next = [...records, ...readIssuedExpenses(companyId)]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  localStorage.setItem(storageKey(companyId), JSON.stringify(next))
  return next
}

export function upsertIssuedExpense(companyId: string, record: IssuedExpenseRecord) {
  const current = readIssuedExpenses(companyId)
  const next = [record, ...current.filter(item => item.id !== record.id)]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  localStorage.setItem(storageKey(companyId), JSON.stringify(next))
  return next
}

export function markIssuedExpenseDeleted(companyId: string, recordId: string, user: string) {
  const next = readIssuedExpenses(companyId).map(record => record.id === recordId
    ? { ...record, status: 'BORRADA' as const, deletedAt: new Date().toISOString(), deletedBy: user }
    : record)
  localStorage.setItem(storageKey(companyId), JSON.stringify(next))
  return next
}

export function nextReceiptNumber(companyId: string, offset = 0) {
  let reservedNumbers: string[] = []
  try {
    const drafts = JSON.parse(localStorage.getItem(individualDraftStorageKey(companyId)) ?? '[]') as Array<{ receiptNumber?: string }>
    reservedNumbers = Array.isArray(drafts) ? drafts.map(draft => draft.receiptNumber ?? '') : []
  } catch { reservedNumbers = [] }
  const currentSequence = [...readIssuedExpenses(companyId).map(record => record.receiptNumber), ...reservedNumbers]
    .reduce((highest, receiptNumber) => Math.max(highest, receiptSequence(receiptNumber)), 0)
  return `${receiptPrefix}${String(currentSequence + offset + 1).padStart(6, '0')}`
}
