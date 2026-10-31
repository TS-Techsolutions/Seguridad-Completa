const repeatedWhitespace = /\s{2,}/u
const structuredNameFields = new Set([
  'businessName', 'legal_name', 'trade_name', 'owner', 'tenant', 'billedToName', 'contactPerson', 'contact',
])

export function hasRepeatedSpaces(value: string | null | undefined) {
  return repeatedWhitespace.test(String(value ?? ''))
}

export function cleanTextSpacing(value: string | null | undefined) {
  return String(value ?? '').trim().replace(/\s+/gu, ' ')
}

export function comparableText(value: string | null | undefined) {
  return cleanTextSpacing(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleUpperCase('es')
}

export function cleanStructuredNameProperties<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => cleanStructuredNameProperties(item)) as T
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    typeof item === 'string' && structuredNameFields.has(key) ? cleanTextSpacing(item) : cleanStructuredNameProperties(item),
  ])) as T
}
