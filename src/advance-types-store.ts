import { activeCompanyStorageKey } from './api'

export type AdvanceTypeState = 'ACTIVO' | 'INACTIVO'
export type AdvanceType = {
  id: string
  type: string
  state: AdvanceTypeState
  createdAt: string
  updatedAt: string
}

export const advanceTypesChangedEvent = 'saga:advance-types-changed'

export function advanceTypesStorageKey() {
  const companyId = localStorage.getItem(activeCompanyStorageKey) ?? 'cmp-demo-ecuador'
  return `saga.accounting.advance-types:${companyId}`
}

export function readAdvanceTypes() {
  try {
    const stored = JSON.parse(localStorage.getItem(advanceTypesStorageKey()) ?? '[]')
    if (!Array.isArray(stored)) return []
    return stored.filter((item): item is AdvanceType => Boolean(
      item && typeof item.id === 'string' && typeof item.type === 'string'
      && (item.state === 'ACTIVO' || item.state === 'INACTIVO'),
    ))
  } catch {
    return []
  }
}

export function saveAdvanceTypes(records: AdvanceType[]) {
  localStorage.setItem(advanceTypesStorageKey(), JSON.stringify(records))
  window.dispatchEvent(new CustomEvent(advanceTypesChangedEvent))
}
