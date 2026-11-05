import { activeCompanyStorageKey } from './api'

export type VatState = 'ACTIVO' | 'INACTIVO'
export type VatConfiguration = { id: string; value: number; accountCode: string; state: VatState }

export const vatConfigurationChangedEvent = 'saga-vat-configuration-updated'

export function vatConfigurationStorageKey() {
  const companyId = localStorage.getItem(activeCompanyStorageKey) ?? 'cmp-demo-ecuador'
  return `saga.accounting.vat-configuration:${companyId}`
}

export function readVatConfigurations(): VatConfiguration[] {
  try {
    const stored = JSON.parse(localStorage.getItem(vatConfigurationStorageKey()) ?? '[]')
    return Array.isArray(stored)
      ? stored.filter((row): row is VatConfiguration => Boolean(row?.id) && Number.isFinite(row?.value))
        .sort((left, right) => left.value - right.value)
      : []
  } catch {
    return []
  }
}

export function readActiveVatConfigurations() {
  return readVatConfigurations().filter(row => row.state === 'ACTIVO')
}

export function displayVat(value: number) {
  return `${value.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}
