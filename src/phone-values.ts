const leadingSpreadsheetMarker = /^\s*['’‘´`]+\s*/u

export function cleanPhoneValue(value: string | null | undefined) {
  return String(value ?? '').replace(leadingSpreadsheetMarker, '')
}

function isPhoneProperty(key: string) {
  const normalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
  return normalized.includes('phone') || normalized.includes('telefono')
}

export function cleanPhoneProperties<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => cleanPhoneProperties(item)) as T
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    typeof item === 'string' && isPhoneProperty(key) ? cleanPhoneValue(item) : cleanPhoneProperties(item),
  ])) as T
}
