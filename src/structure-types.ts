export type StructureTypeState = 'ACTIVO' | 'INACTIVO'

export type StructureTypeRecord = {
  id: string
  name: string
  state: StructureTypeState
}

export const structureTypesStorageKey = 'saga.property-structure-types'
export const structureTypesChangedEvent = 'saga:property-structure-types-changed'
export const propertyStructuresStorageKey = 'saga.property-type-structure'
export const selectedStructureTypeStorageKey = 'saga.property-structure-type'

const defaultStructureTypes: StructureTypeRecord[] = [
  { id: 'STRUCTURE-TYPE-BUILDING', name: 'Edificio', state: 'ACTIVO' },
  { id: 'STRUCTURE-TYPE-DEVELOPMENT', name: 'Urbanización', state: 'ACTIVO' },
]

export function readStructureTypes(): StructureTypeRecord[] {
  try {
    const stored = JSON.parse(localStorage.getItem(structureTypesStorageKey) ?? 'null')
    if (Array.isArray(stored) && stored.length) {
      return stored.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string').map((item): StructureTypeRecord => ({
        id: item.id,
        name: item.name.trim(),
        state: item.state === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
      })).filter(item => item.name)
    }
  } catch { /* Use the initial catalog when local data is invalid. */ }
  localStorage.setItem(structureTypesStorageKey, JSON.stringify(defaultStructureTypes))
  return defaultStructureTypes
}

export function writeStructureTypes(records: StructureTypeRecord[]) {
  localStorage.setItem(structureTypesStorageKey, JSON.stringify(records))
  window.dispatchEvent(new CustomEvent(structureTypesChangedEvent))
}

export function normalizeStructureTypeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es')
}

export function readPropertyStructures(): Record<string, unknown[]> {
  try {
    const stored = JSON.parse(localStorage.getItem(propertyStructuresStorageKey) ?? '{}')
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {}
    return Object.fromEntries(Object.entries(stored).map(([key, rows]) => [key, Array.isArray(rows) ? rows : []]))
  } catch { return {} }
}
