import type { IssuedExpenseRecord } from './expense-records'

export type PreExpenseKind = 'ORDINARIA' | 'EXTRAORDINARIA' | 'AGUA'

export type PreExpenseBatch = {
  id: string
  companyId: string
  kind: PreExpenseKind
  issueDate: string
  generatedAt: string
  records: IssuedExpenseRecord[]
}
const storageKey = (companyId: string) => `saga.pre-expense-batches:${companyId}`

export function readPreExpenseBatches(companyId: string): PreExpenseBatch[] {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(companyId)) ?? '[]')
    return (Array.isArray(saved) ? saved as PreExpenseBatch[] : [])
      .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))
  } catch {
    return []
  }
}

export function readPreExpenseBatch(companyId: string, batchId: string) {
  return readPreExpenseBatches(companyId).find(batch => batch.id === batchId)
}

export function savePreExpenseBatch(batch: PreExpenseBatch) {
  const next = [batch, ...readPreExpenseBatches(batch.companyId).filter(item => item.id !== batch.id)].slice(0, 10)
  localStorage.setItem(storageKey(batch.companyId), JSON.stringify(next))
  return batch
}
