import type { IssuedExpenseRecord } from './expense-records'

export type PreExpenseKind = 'ORDINARIA' | 'EXTRAORDINARIA' | 'AGUA'
export type PreBillingDocument = 'EXPENSE' | 'INVOICE'

export type PreExpenseBatch = {
  id: string
  companyId: string
  kind: PreExpenseKind
  issueDate: string
  generatedAt: string
  records: IssuedExpenseRecord[]
  documentMode?: PreBillingDocument
}
const storageKey = (companyId: string, documentMode: PreBillingDocument) => documentMode === 'INVOICE'
  ? `saga.pre-invoice-batches:${companyId}`
  : `saga.pre-expense-batches:${companyId}`

export function readPreExpenseBatches(companyId: string, documentMode: PreBillingDocument = 'EXPENSE'): PreExpenseBatch[] {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(companyId, documentMode)) ?? '[]')
    return (Array.isArray(saved) ? saved as PreExpenseBatch[] : [])
      .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))
  } catch {
    return []
  }
}

export function readPreExpenseBatch(companyId: string, batchId: string, documentMode: PreBillingDocument = 'EXPENSE') {
  return readPreExpenseBatches(companyId, documentMode).find(batch => batch.id === batchId)
}

export function savePreExpenseBatch(batch: PreExpenseBatch) {
  const documentMode = batch.documentMode ?? 'EXPENSE'
  const next = [batch, ...readPreExpenseBatches(batch.companyId, documentMode).filter(item => item.id !== batch.id)].slice(0, 10)
  localStorage.setItem(storageKey(batch.companyId, documentMode), JSON.stringify(next))
  return batch
}
