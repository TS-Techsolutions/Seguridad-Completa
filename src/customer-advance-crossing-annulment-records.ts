import type { CustomerAdvanceCrossingAccountingLine } from './customer-advance-crossing-records'

export type CustomerAdvanceCrossingAnnulmentPayload = {
  crossingId: string
  accountingLines: CustomerAdvanceCrossingAccountingLine[]
  activeTab: 'DETAIL' | 'ACCOUNTING'
}

export type CustomerAdvanceCrossingAnnulmentDraft = {
  id: string
  companyId: string
  number: string
  date: string
  customerId: string
  customerName: string
  detail: string
  total: number
  status: 'GUARDADA'
  payload: CustomerAdvanceCrossingAnnulmentPayload
  createdAt: string
  updatedAt: string
}

export type AuthorizedCustomerAdvanceCrossingAnnulment = Omit<CustomerAdvanceCrossingAnnulmentDraft, 'status' | 'updatedAt'> & {
  status: 'GENERADA'
  accountingVoucherId: string
  user: string
}

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}

export function crossingAnnulmentDraftStorageKey(companyId: string) {
  return `saga.cxc.customer-advance-crossing-annulment-drafts:${companyId}`
}

export function crossingAnnulmentStorageKey(companyId: string) {
  return `saga.cxc.customer-advance-crossing-annulments:${companyId}`
}

export function readCustomerAdvanceCrossingAnnulmentDrafts(companyId: string) {
  return readJson<CustomerAdvanceCrossingAnnulmentDraft[]>(crossingAnnulmentDraftStorageKey(companyId), [])
}

export function saveCustomerAdvanceCrossingAnnulmentDrafts(companyId: string, rows: CustomerAdvanceCrossingAnnulmentDraft[]) {
  localStorage.setItem(crossingAnnulmentDraftStorageKey(companyId), JSON.stringify(rows))
}

export function readAuthorizedCustomerAdvanceCrossingAnnulments(companyId: string) {
  return readJson<AuthorizedCustomerAdvanceCrossingAnnulment[]>(crossingAnnulmentStorageKey(companyId), [])
}

export function saveAuthorizedCustomerAdvanceCrossingAnnulments(companyId: string, rows: AuthorizedCustomerAdvanceCrossingAnnulment[]) {
  localStorage.setItem(crossingAnnulmentStorageKey(companyId), JSON.stringify(rows))
}
