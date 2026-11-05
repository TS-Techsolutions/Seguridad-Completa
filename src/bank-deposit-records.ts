export type BankDepositAccountingLine = {
  id: string
  accountCode: string
  contactId: string
  contactName: string
  debit: number
  credit: number
  description: string
  automatic: boolean
}

export type BankDepositPayload = {
  selectedCollectionIds: string[]
  accountingLines: BankDepositAccountingLine[]
  activeTab: 'DETAIL' | 'ACCOUNTING'
}

export type BankDepositDraft = {
  id: string
  companyId: string
  number: string
  date: string
  bankAccountId: string
  depositSlip: string
  detail: string
  total: number
  status: 'GUARDADO'
  payload: BankDepositPayload
  createdAt: string
  updatedAt: string
}

export type AuthorizedBankDeposit = Omit<BankDepositDraft, 'status' | 'updatedAt'> & {
  status: 'GENERADO' | 'ANULADO_PARCIAL' | 'ANULADO'
  accountingVoucherId: string
  user: string
}

export function bankDepositDraftStorageKey(companyId: string) {
  return `saga.banking.deposit-drafts:${companyId}`
}

export function authorizedBankDepositStorageKey(companyId: string) {
  return `saga.banking.authorized-deposits:${companyId}`
}

export function readBankDepositDrafts(companyId: string) {
  try {
    const value = JSON.parse(localStorage.getItem(bankDepositDraftStorageKey(companyId)) ?? '[]')
    return Array.isArray(value) ? value as BankDepositDraft[] : []
  } catch {
    return []
  }
}

export function saveBankDepositDrafts(companyId: string, rows: BankDepositDraft[]) {
  localStorage.setItem(bankDepositDraftStorageKey(companyId), JSON.stringify(rows))
}

export function readAuthorizedBankDeposits(companyId: string) {
  try {
    const value = JSON.parse(localStorage.getItem(authorizedBankDepositStorageKey(companyId)) ?? '[]')
    return Array.isArray(value) ? value as AuthorizedBankDeposit[] : []
  } catch {
    return []
  }
}

export function saveAuthorizedBankDeposits(companyId: string, rows: AuthorizedBankDeposit[]) {
  localStorage.setItem(authorizedBankDepositStorageKey(companyId), JSON.stringify(rows))
}
