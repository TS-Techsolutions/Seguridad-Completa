export type CollectionDraftStatus = 'GUARDADA'

export type CollectionAccountingLine = {
  id: string
  accountCode: string
  debit: number
  credit: number
  description: string
  automatic: boolean
}

export type CollectionDraftPayload = {
  customerInput: string
  detail: string
  sendEmail: boolean
  activeTab: 'VALUES' | 'PAYMENT' | 'ACCOUNTING'
  selectedObligationIds: string[]
  obligationValues: Record<string, string>
  advances: Array<{ id: string; typeId: string; description: string; value: string }>
  paymentMethods: Array<{
    id: string
    type: 'EFECTIVO' | 'CHEQUE' | 'TRANSFERENCIA' | 'DEPOSITO' | 'TARJETA_CREDITO' | ''
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
  }>
  accountingLines: CollectionAccountingLine[]
  receiptValues?: Array<{ id: string; document: string; detail: string; value: number; kind: 'DOCUMENTO' | 'ANTICIPO' }>
}

export type CollectionDraft = {
  id: string
  companyId: string
  number: string
  issueDate: string
  customerId: string
  customerName: string
  total: number
  status: CollectionDraftStatus
  payload?: CollectionDraftPayload
  createdAt: string
  updatedAt: string
  sourceImportUploadId?: string
  sourceImportRow?: number
}

export type AuthorizedCollection = {
  id: string
  companyId: string
  number: string
  issueDate: string
  customerId: string
  customerName: string
  total: number
  status: 'GENERADA' | 'ANULADA'
  accountingVoucherId: string
  emailStatus: 'NO_SOLICITADO' | 'PENDIENTE'
  payload: CollectionDraftPayload
  createdAt: string
  user: string
}

export function collectionDraftStorageKey(companyId: string) {
  return `saga.cxc.collection-drafts:${companyId}`
}

export const COLLECTION_DRAFTS_CHANGED_EVENT = 'saga:collection-drafts-changed'

export function readCollectionDrafts(companyId: string) {
  try {
    const stored = JSON.parse(localStorage.getItem(collectionDraftStorageKey(companyId)) ?? '[]')
    if (!Array.isArray(stored)) return []
    return stored.filter((item): item is CollectionDraft => Boolean(
      item && typeof item.id === 'string' && item.companyId === companyId
      && typeof item.number === 'string' && typeof item.issueDate === 'string'
      && typeof item.customerName === 'string' && Number.isFinite(Number(item.total))
      && item.status === 'GUARDADA',
    )).map(item => ({ ...item, total: Number(item.total) }))
  } catch {
    return []
  }
}

export function saveCollectionDrafts(companyId: string, records: CollectionDraft[]) {
  localStorage.setItem(collectionDraftStorageKey(companyId), JSON.stringify(records))
  window.dispatchEvent(new CustomEvent(COLLECTION_DRAFTS_CHANGED_EVENT, { detail: { companyId } }))
}

export function authorizedCollectionStorageKey(companyId: string) {
  return `saga.cxc.authorized-collections:${companyId}`
}

export const AUTHORIZED_COLLECTIONS_CHANGED_EVENT = 'saga:authorized-collections-changed'

export function readAuthorizedCollections(companyId: string) {
  try {
    const stored = JSON.parse(localStorage.getItem(authorizedCollectionStorageKey(companyId)) ?? '[]')
    return Array.isArray(stored) ? stored as AuthorizedCollection[] : []
  } catch {
    return []
  }
}

export function saveAuthorizedCollections(companyId: string, records: AuthorizedCollection[]) {
  localStorage.setItem(authorizedCollectionStorageKey(companyId), JSON.stringify(records))
  window.dispatchEvent(new CustomEvent(AUTHORIZED_COLLECTIONS_CHANGED_EVENT, { detail: { companyId } }))
}
