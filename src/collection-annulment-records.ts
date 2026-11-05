import type { CollectionAccountingLine } from './collection-records'

export type CollectionAnnulmentPayload = {
  collectionId: string
  accountingLines: CollectionAccountingLine[]
  activeTab: 'DETAIL' | 'ACCOUNTING'
}

export type CollectionAnnulmentDraft = {
  id: string
  companyId: string
  number: string
  date: string
  customerId: string
  customerName: string
  detail: string
  total: number
  status: 'GUARDADA'
  payload: CollectionAnnulmentPayload
  createdAt: string
  updatedAt: string
}

export type AuthorizedCollectionAnnulment = Omit<CollectionAnnulmentDraft, 'status' | 'updatedAt'> & {
  status: 'GENERADA'
  accountingVoucherId: string
  user: string
}

export function collectionAnnulmentDraftStorageKey(companyId: string) {
  return `saga.cxc.collection-annulment-drafts:${companyId}`
}

export function authorizedCollectionAnnulmentStorageKey(companyId: string) {
  return `saga.cxc.authorized-collection-annulments:${companyId}`
}

export function readCollectionAnnulmentDrafts(companyId: string) {
  try {
    const value = JSON.parse(localStorage.getItem(collectionAnnulmentDraftStorageKey(companyId)) ?? '[]')
    return Array.isArray(value) ? value as CollectionAnnulmentDraft[] : []
  } catch { return [] }
}

export function saveCollectionAnnulmentDrafts(companyId: string, rows: CollectionAnnulmentDraft[]) {
  localStorage.setItem(collectionAnnulmentDraftStorageKey(companyId), JSON.stringify(rows))
}

export function readAuthorizedCollectionAnnulments(companyId: string) {
  try {
    const value = JSON.parse(localStorage.getItem(authorizedCollectionAnnulmentStorageKey(companyId)) ?? '[]')
    return Array.isArray(value) ? value as AuthorizedCollectionAnnulment[] : []
  } catch { return [] }
}

export function saveAuthorizedCollectionAnnulments(companyId: string, rows: AuthorizedCollectionAnnulment[]) {
  localStorage.setItem(authorizedCollectionAnnulmentStorageKey(companyId), JSON.stringify(rows))
}
