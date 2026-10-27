export const companySettingsStorageKey = 'saga.security.company'
export const companySettingsChangedEvent = 'saga-company-settings-updated'
export const defaultOperationStartDate = '2026-10-01'
export type CompanyBillingType = 'EXPENSAS' | 'FACTURACION'
export type CompanyGenerationType = 'CLIENTE' | 'INMUEBLE'

export function readCompanyBillingType(): CompanyBillingType {
  try {
    const settings = JSON.parse(localStorage.getItem(companySettingsStorageKey) ?? '{}') as { billingType?: string }
    return settings.billingType === 'FACTURACION' ? 'FACTURACION' : 'EXPENSAS'
  } catch {
    return 'EXPENSAS'
  }
}

export function readCompanyGenerationType(): CompanyGenerationType {
  try {
    const settings = JSON.parse(localStorage.getItem(companySettingsStorageKey) ?? '{}') as { generationType?: string }
    return settings.generationType === 'INMUEBLE' ? 'INMUEBLE' : 'CLIENTE'
  } catch {
    return 'CLIENTE'
  }
}

export function readOperationStartDate() {
  try {
    const settings = JSON.parse(localStorage.getItem(companySettingsStorageKey) ?? '{}') as { operationStartDate?: string }
    return settings.operationStartDate && /^\d{4}-\d{2}-\d{2}$/.test(settings.operationStartDate)
      ? settings.operationStartDate
      : defaultOperationStartDate
  } catch {
    return defaultOperationStartDate
  }
}

function previousMonth(dateValue: string) {
  const [year, month] = dateValue.split('-').map(Number)
  const date = new Date(year, month - 2, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function validateOperationDate(dateValue: string, initialEntry = false) {
  const operationStartDate = readOperationStartDate()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return 'Selecciona una fecha válida.'
  if (dateValue >= operationStartDate) return ''
  if (initialEntry && dateValue.slice(0, 7) === previousMonth(operationStartDate)) return ''
  if (initialEntry) return `El Asiento Inicial solo puede registrarse desde el mes anterior al Inicio de Operaciones (${operationStartDate}).`
  return `La fecha no puede ser anterior al Inicio de Operaciones (${operationStartDate}).`
}
