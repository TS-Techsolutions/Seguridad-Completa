import type { BankDepositAccountingLine } from './bank-deposit-records'

export type DepositAnnulmentSelection = { depositId: string; collectionId: string }

export type DepositAnnulmentPayload = {
  selections: DepositAnnulmentSelection[]
  accountingLines: BankDepositAccountingLine[]
  activeTab: 'DETAIL' | 'ACCOUNTING'
}

export type DepositAnnulmentDraft = {
  id: string
  companyId: string
  number: string
  date: string
  bankAccountId: string
  detail: string
  total: number
  status: 'GUARDADA'
  payload: DepositAnnulmentPayload
  createdAt: string
  updatedAt: string
}

export type AuthorizedDepositAnnulment = Omit<DepositAnnulmentDraft, 'status' | 'updatedAt'> & {
  status: 'GENERADA'
  accountingVoucherId: string
  user: string
}

export function depositAnnulmentDraftStorageKey(companyId: string) {
  return `saga.banking.deposit-annulment-drafts:${companyId}`
}

export function authorizedDepositAnnulmentStorageKey(companyId: string) {
  return `saga.banking.authorized-deposit-annulments:${companyId}`
}

export const BANK_DEPOSIT_AVAILABILITY_EVENT = 'saga:bank-deposit-availability-changed'

export function readDepositAnnulmentDrafts(companyId: string) {
  try {
    const value = JSON.parse(localStorage.getItem(depositAnnulmentDraftStorageKey(companyId)) ?? '[]')
    return Array.isArray(value) ? value as DepositAnnulmentDraft[] : []
  } catch { return [] }
}

export function saveDepositAnnulmentDrafts(companyId: string, rows: DepositAnnulmentDraft[]) {
  localStorage.setItem(depositAnnulmentDraftStorageKey(companyId), JSON.stringify(rows))
}

export function readAuthorizedDepositAnnulments(companyId: string) {
  try {
    const value = JSON.parse(localStorage.getItem(authorizedDepositAnnulmentStorageKey(companyId)) ?? '[]')
    return Array.isArray(value) ? value as AuthorizedDepositAnnulment[] : []
  } catch { return [] }
}

export function saveAuthorizedDepositAnnulments(companyId: string, rows: AuthorizedDepositAnnulment[]) {
  localStorage.setItem(authorizedDepositAnnulmentStorageKey(companyId), JSON.stringify(rows))
  window.dispatchEvent(new CustomEvent(BANK_DEPOSIT_AVAILABILITY_EVENT, { detail: { companyId } }))
}

export function depositSelectionKey(depositId: string, collectionId: string) {
  return `${depositId}::${collectionId}`
}

export function readAnnulledDepositSelectionKeys(companyId: string) {
  return new Set(readAuthorizedDepositAnnulments(companyId)
    .flatMap(row => row.payload.selections)
    .map(selection => depositSelectionKey(selection.depositId, selection.collectionId)))
}
