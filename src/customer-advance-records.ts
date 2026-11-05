import { readAuthorizedCollections, type AuthorizedCollection } from './collection-records'
import { readAuthorizedCollectionAnnulments } from './collection-annulment-records'

export type CustomerAdvanceRecord = {
  id: string
  companyId: string
  collectionId: string
  collectionNumber: string
  issueDate: string
  sourceValueId: string
  typeId: string
  typeName: string
  customerId: string
  customerName: string
  description: string
  originalAmount: number
  balance: number
  status: 'ACTIVO' | 'ANULADO'
  createdAt: string
  annulmentId?: string
  annulledAt?: string
  appliedCrossingIds?: string[]
  sourceUploadId?: string
  sourceDocument?: string
}

export function customerAdvanceStorageKey(companyId: string) {
  return `saga.cxc.customer-advances:${companyId}`
}

export function readCustomerAdvances(companyId: string): CustomerAdvanceRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(customerAdvanceStorageKey(companyId)) ?? '[]')
    return Array.isArray(value) ? value as CustomerAdvanceRecord[] : []
  } catch { return [] }
}

export function saveCustomerAdvances(companyId: string, rows: CustomerAdvanceRecord[]) {
  localStorage.setItem(customerAdvanceStorageKey(companyId), JSON.stringify(rows))
}

function recordsFromCollection(collection: AuthorizedCollection): CustomerAdvanceRecord[] {
  const advanceById = new Map((collection.payload.advances ?? []).map(advance => [advance.id, advance]))
  const annulment = collection.status === 'ANULADA'
    ? readAuthorizedCollectionAnnulments(collection.companyId).find(record => record.payload.collectionId === collection.id)
    : undefined
  return (collection.payload.receiptValues ?? []).filter(value => value.kind === 'ANTICIPO' && value.value > 0).map(value => {
    const source = advanceById.get(value.id)
    const typeName = value.document.replace(/^Anticipo\s*-\s*/i, '').trim() || 'Sin tipo'
    return {
      id: `${collection.id}:${value.id}`,
      companyId: collection.companyId,
      collectionId: collection.id,
      collectionNumber: collection.number,
      issueDate: collection.issueDate,
      sourceValueId: value.id,
      typeId: source?.typeId ?? '',
      typeName,
      customerId: collection.customerId,
      customerName: collection.customerName,
      description: value.detail,
      originalAmount: Number(value.value.toFixed(2)),
      balance: collection.status === 'ANULADA' ? 0 : Number(value.value.toFixed(2)),
      status: collection.status === 'ANULADA' ? 'ANULADO' as const : 'ACTIVO' as const,
      createdAt: collection.createdAt,
      annulmentId: annulment?.id,
      annulledAt: annulment?.createdAt,
    }
  })
}

export function ensureCustomerAdvances(companyId: string) {
  const current = readCustomerAdvances(companyId)
  const canonical = readAuthorizedCollections(companyId).flatMap(recordsFromCollection)
  const canonicalById = new Map(canonical.map(record => [record.id, record]))
  const known = new Set(current.map(record => record.id))
  const missing = canonical.filter(record => !known.has(record.id))
  const normalized = current.map(record => {
    const source = canonicalById.get(record.id)
    return {
      ...record,
      issueDate: record.issueDate || source?.issueDate || '',
      annulmentId: record.annulmentId || source?.annulmentId,
      annulledAt: record.annulledAt || source?.annulledAt,
    }
  })
  const next = [...missing, ...normalized]
  if (!missing.length && normalized.every((record, index) => record.issueDate === current[index]?.issueDate && record.annulledAt === current[index]?.annulledAt)) return current
  saveCustomerAdvances(companyId, next)
  return next
}

export function registerAdvancesFromCollection(companyId: string, collectionId: string) {
  const current = ensureCustomerAdvances(companyId)
  const collection = readAuthorizedCollections(companyId).find(record => record.id === collectionId)
  if (!collection) return current
  const incoming = recordsFromCollection(collection)
  const incomingIds = new Set(incoming.map(record => record.id))
  const next = [...incoming, ...current.filter(record => !incomingIds.has(record.id))]
  saveCustomerAdvances(companyId, next)
  return next
}

export function annulAdvancesForCollection({
  companyId,
  collectionId,
  annulmentId,
  annulledAt,
}: {
  companyId: string
  collectionId: string
  annulmentId: string
  annulledAt: string
}) {
  const next = ensureCustomerAdvances(companyId).map(record => record.collectionId === collectionId ? {
    ...record,
    balance: 0,
    status: 'ANULADO' as const,
    annulmentId,
    annulledAt,
  } : record)
  saveCustomerAdvances(companyId, next)
  return next.filter(record => record.collectionId === collectionId)
}

export function applyCustomerAdvanceCrossing({
  companyId,
  crossingId,
  applications,
}: {
  companyId: string
  crossingId: string
  applications: Array<{ advanceId: string; value: number }>
}) {
  const valueByAdvance = new Map(applications.map(item => [item.advanceId, Math.max(0, Number(item.value.toFixed(2)))]))
  const next = ensureCustomerAdvances(companyId).map(record => {
    const value = valueByAdvance.get(record.id)
    if (!value || record.appliedCrossingIds?.includes(crossingId)) return record
    const balance = Number(Math.max(0, record.balance - Math.min(record.balance, value)).toFixed(2))
    return { ...record, balance, appliedCrossingIds: [...(record.appliedCrossingIds ?? []), crossingId] }
  })
  saveCustomerAdvances(companyId, next)
  return next
}

export function releaseCustomerAdvanceCrossing({
  companyId,
  crossingId,
  applications,
}: {
  companyId: string
  crossingId: string
  applications: Array<{ advanceId: string; value: number }>
}) {
  const valueByAdvance = new Map(applications.map(item => [item.advanceId, Math.max(0, Number(item.value.toFixed(2)))]))
  const next = ensureCustomerAdvances(companyId).map(record => {
    const value = valueByAdvance.get(record.id)
    if (!value || !record.appliedCrossingIds?.includes(crossingId)) return record
    const balance = Number(Math.min(record.originalAmount, record.balance + value).toFixed(2))
    return { ...record, balance, appliedCrossingIds: record.appliedCrossingIds.filter(id => id !== crossingId) }
  })
  saveCustomerAdvances(companyId, next)
  return next
}
