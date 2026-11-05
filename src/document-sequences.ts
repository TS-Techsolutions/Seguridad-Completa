export type DocumentSequenceSettings = {
  expenseStart?: number
  voucherStarts: Record<string, number>
  checkbookStarts: Record<string, number>
  updatedAt?: string
  updatedBy?: string
}

export const documentSequencesChangedEvent = 'saga:document-sequences-changed'

export function documentSequenceStorageKey(companyId: string) {
  return `saga.document-sequences:${companyId}`
}

export function normalizeSequence(value: unknown, fallback = 1) {
  const parsed = Math.trunc(Number(value))
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 999999 ? parsed : fallback
}

export function readDocumentSequences(companyId: string): DocumentSequenceSettings {
  try {
    const value = JSON.parse(localStorage.getItem(documentSequenceStorageKey(companyId)) ?? '{}') as Partial<DocumentSequenceSettings>
    return {
      expenseStart: value.expenseStart ? normalizeSequence(value.expenseStart) : undefined,
      voucherStarts: Object.fromEntries(Object.entries(value.voucherStarts ?? {}).map(([key, number]) => [key, normalizeSequence(number)])),
      checkbookStarts: Object.fromEntries(Object.entries(value.checkbookStarts ?? {}).map(([key, number]) => [key, normalizeSequence(number)])),
      updatedAt: value.updatedAt,
      updatedBy: value.updatedBy,
    }
  } catch {
    return { voucherStarts: {}, checkbookStarts: {} }
  }
}

export function saveDocumentSequences(companyId: string, settings: DocumentSequenceSettings) {
  localStorage.setItem(documentSequenceStorageKey(companyId), JSON.stringify(settings))
  window.dispatchEvent(new CustomEvent(documentSequencesChangedEvent, { detail: { companyId } }))
}

export function configuredExpenseStart(companyId: string) {
  return normalizeSequence(readDocumentSequences(companyId).expenseStart ?? 1)
}

export function configuredVoucherStart(companyId: string, voucherType: string) {
  return normalizeSequence(readDocumentSequences(companyId).voucherStarts[voucherType] ?? 1)
}

export function configuredCheckbookStart(companyId: string, bankAccountId: string) {
  return normalizeSequence(readDocumentSequences(companyId).checkbookStarts[bankAccountId] ?? 1)
}
