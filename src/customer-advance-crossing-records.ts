export type CustomerAdvanceCrossingAccountingLine = {
  id: string
  accountCode: string
  contactId: string
  contactName: string
  debit: number
  credit: number
  description: string
  automatic: boolean
}

export type CustomerAdvanceCrossingPayload = {
  selectedAdvanceIds: string[]
  selectedReceivableIds: string[]
  accountingLines: CustomerAdvanceCrossingAccountingLine[]
}

export type CustomerAdvanceCrossingDraft = {
  id: string
  companyId: string
  number: string
  date: string
  customerId: string
  customerName: string
  detail: string
  total: number
  status: 'GUARDADO'
  payload: CustomerAdvanceCrossingPayload
  createdAt: string
  updatedAt: string
}

export type AuthorizedCustomerAdvanceCrossing = {
  id: string
  companyId: string
  number: string
  date: string
  customerId: string
  customerName: string
  detail: string
  total: number
  status: 'GENERADO' | 'ANULADO'
  payload: CustomerAdvanceCrossingPayload
  accountingVoucherId: string
  user: string
  createdAt: string
}

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}

export function customerAdvanceCrossingDraftStorageKey(companyId: string) {
  return `saga.cxc.customer-advance-crossing-drafts:${companyId}`
}

export function customerAdvanceCrossingStorageKey(companyId: string) {
  return `saga.cxc.customer-advance-crossings:${companyId}`
}

export function readCustomerAdvanceCrossingDrafts(companyId: string) {
  return readJson<CustomerAdvanceCrossingDraft[]>(customerAdvanceCrossingDraftStorageKey(companyId), [])
}

export function saveCustomerAdvanceCrossingDrafts(companyId: string, rows: CustomerAdvanceCrossingDraft[]) {
  localStorage.setItem(customerAdvanceCrossingDraftStorageKey(companyId), JSON.stringify(rows))
}

export function readAuthorizedCustomerAdvanceCrossings(companyId: string) {
  return readJson<AuthorizedCustomerAdvanceCrossing[]>(customerAdvanceCrossingStorageKey(companyId), [])
}

export function saveAuthorizedCustomerAdvanceCrossings(companyId: string, rows: AuthorizedCustomerAdvanceCrossing[]) {
  localStorage.setItem(customerAdvanceCrossingStorageKey(companyId), JSON.stringify(rows))
}
