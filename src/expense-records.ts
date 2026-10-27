export type ExpenseType = 'ORDINARIA' | 'EXTRAORDINARIA'
export type ExpenseGenerationType = 'AUTOMATICA' | 'INDIVIDUAL'
export type ExpenseStatus = 'VIGENTE' | 'ANULADA'

export type IssuedExpenseRecord = {
  id: string
  companyId: string
  month: string
  year: string
  issueDate: string
  receiptNumber: string
  identification: string
  businessName: string
  phone: string
  email: string
  expenseType: ExpenseType
  generationType: ExpenseGenerationType
  total: number
  pdfFileName: string
  createdAt: string
  status: ExpenseStatus
  voidedAt?: string
  voidedBy?: string
}

const storageKey = (companyId: string) => `saga.issued-expenses:${companyId}`

export function readIssuedExpenses(companyId: string): IssuedExpenseRecord[] {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(companyId)) ?? '[]')
    return (Array.isArray(saved) ? saved as IssuedExpenseRecord[] : [])
      .map(record => ({ ...record, status: record.status === 'ANULADA' ? 'ANULADA' as const : 'VIGENTE' as const }))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  } catch {
    return []
  }
}

export function voidIssuedExpense(companyId: string, recordId: string, user: string) {
  const next = readIssuedExpenses(companyId).map(record => record.id === recordId
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
    if (!selectedIds.has(record.id) || record.status === 'ANULADA') return record
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

export function nextReceiptNumber(companyId: string, year: string, month: string, offset = 0) {
  const sequence = readIssuedExpenses(companyId).length + offset + 1
  return `EXP-${year}${month}-${String(sequence).padStart(6, '0')}`
}
