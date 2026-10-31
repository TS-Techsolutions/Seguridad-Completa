import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, ChevronRight, FolderTree, Pencil, Plus, Search, X } from 'lucide-react'
import type { ScreenSpec } from './types'
import {
  normalizeStructureTypeName,
  propertyStructuresStorageKey,
  readPropertyStructures,
  readStructureTypes,
  selectedStructureTypeStorageKey,
  type StructureTypeRecord,
  type StructureTypeState,
  writeStructureTypes,
} from './structure-types'

function associatedStructureCount(typeName: string) {
  return readPropertyStructures()[typeName]?.length ?? 0
}

export function StructureTypesPage({ screen }: { screen: ScreenSpec }) {
  const [records, setRecords] = useState<StructureTypeRecord[]>(readStructureTypes)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [state, setState] = useState<StructureTypeState>('ACTIVO')
  const [error, setError] = useState('')
  const filtered = useMemo(() => {
    const term = normalizeStructureTypeName(search)
    return term ? records.filter(record => normalizeStructureTypeName(`${record.name} ${record.state}`).includes(term)) : records
  }, [records, search])

  const openNew = () => { setEditingId(null); setName(''); setState('ACTIVO'); setError(''); setFormOpen(true) }
  const openEdit = (record: StructureTypeRecord) => { setEditingId(record.id); setName(record.name); setState(record.state); setError(''); setFormOpen(true) }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextName = name.trim()
    if (!nextName) { setError('Ingresa el nombre del tipo de estructura.'); return }
    if (records.some(record => record.id !== editingId && normalizeStructureTypeName(record.name) === normalizeStructureTypeName(nextName))) {
      setError('Ya existe un tipo de estructura con ese nombre.'); return
    }
    const previous = records.find(record => record.id === editingId)
    const associatedCount = previous ? associatedStructureCount(previous.name) : 0
    if (previous && state === 'INACTIVO' && associatedCount > 0) {
      setError(`No puedes inactivar ${previous.name} porque tiene ${associatedCount} ${associatedCount === 1 ? 'estructura asociada' : 'estructuras asociadas'}.`); return
    }

    if (previous && previous.name !== nextName) {
      const structures = readPropertyStructures()
      const previousRows = structures[previous.name] ?? []
      const targetRows = structures[nextName] ?? []
      if (previousRows.length && targetRows.length) {
        setError('No se puede cambiar el nombre porque el nuevo tipo ya tiene estructuras asociadas.'); return
      }
      const migrated = { ...structures, [nextName]: previousRows }
      delete migrated[previous.name]
      localStorage.setItem(propertyStructuresStorageKey, JSON.stringify(migrated))
      if (localStorage.getItem(selectedStructureTypeStorageKey) === previous.name) localStorage.setItem(selectedStructureTypeStorageKey, nextName)
    }

    const record: StructureTypeRecord = { id: editingId ?? crypto.randomUUID(), name: nextName, state }
    const next = editingId ? records.map(item => item.id === editingId ? record : item) : [record, ...records]
    writeStructureTypes(next)
    setRecords(next)
    setFormOpen(false)
  }

  return <div className="page screen-page structure-types-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header structure-types-header"><div><div className="screen-id"><span>{screen.id}</span><b>Configuración General</b></div><h1>{screen.titulo_original}</h1></div><button type="button" className="primary-action" onClick={openNew}><Plus />Nuevo Tipo</button></section>
    <section className="structure-types-toolbar"><label><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar tipo de estructura" aria-label="Buscar tipo de estructura" /></label></section>
    <section className="structure-types-table"><table><thead><tr><th aria-label="Editar" /><th>Tipo</th><th>Estado</th></tr></thead><tbody>{filtered.map(record => <tr key={record.id}><td><button type="button" className="structure-type-edit" onClick={() => openEdit(record)} aria-label={`Editar ${record.name}`} title="Editar"><Pencil /></button></td><td><strong>{record.name}</strong></td><td><span className={`structure-type-state ${record.state.toLowerCase()}`}><i />{record.state === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></td></tr>)}{!filtered.length && <tr><td colSpan={3}><div className="structure-types-empty"><FolderTree /><strong>{records.length ? 'No existen coincidencias' : 'No existen tipos de estructura'}</strong><span>{records.length ? 'Prueba con otro criterio de búsqueda.' : 'Selecciona Nuevo Tipo para registrar el primero.'}</span></div></td></tr>}</tbody></table></section>

    {formOpen && <div className="structure-types-backdrop" role="dialog" aria-modal="true" aria-label={editingId ? 'Editar tipo de estructura' : 'Nuevo tipo de estructura'}><form className="structure-types-form" onSubmit={save}><header><div><span>{editingId ? 'Modificar registro' : 'Nuevo registro'}</span><h2>{editingId ? 'Editar Tipo de Estructura' : 'Nuevo Tipo de Estructura'}</h2></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Cerrar"><X /></button></header><div><label><span>Tipo <b>Obligatorio</b></span><input autoFocus maxLength={80} value={name} onChange={event => { setName(event.target.value); setError('') }} /></label><label><span>Estado</span><select value={state} onChange={event => { setState(event.target.value as StructureTypeState); setError('') }}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label>{error && <div className="structure-types-error" role="alert"><AlertTriangle />{error}</div>}</div><footer><button type="button" className="quiet-button" onClick={() => setFormOpen(false)}>Cancelar</button><button type="submit" className="primary-action">Guardar</button></footer></form></div>}
  </div>
}
