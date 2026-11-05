import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, ChevronRight, HandCoins, Pencil, Plus, Search, X } from 'lucide-react'
import type { ScreenSpec } from './types'
import { readAdvanceTypes, saveAdvanceTypes, type AdvanceType, type AdvanceTypeState } from './advance-types-store'

export function AdvanceTypesPage({ screen }: { screen: ScreenSpec }) {
  const [records, setRecords] = useState<AdvanceType[]>(readAdvanceTypes)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [type, setType] = useState('')
  const [state, setState] = useState<AdvanceTypeState>('ACTIVO')
  const [error, setError] = useState('')
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return records
      .filter(record => !term || `${record.type} ${record.state}`.toLocaleLowerCase('es').includes(term))
      .sort((left, right) => left.type.localeCompare(right.type, 'es'))
  }, [records, search])

  const openNew = () => {
    setEditingId(null)
    setType('')
    setState('ACTIVO')
    setError('')
    setFormOpen(true)
  }

  const openEdit = (record: AdvanceType) => {
    setEditingId(record.id)
    setType(record.type)
    setState(record.state)
    setError('')
    setFormOpen(true)
  }

  const save = (event: FormEvent) => {
    event.preventDefault()
    const normalizedType = type.trim().replace(/\s+/g, ' ')
    if (!normalizedType) {
      setError('Ingresa el tipo de anticipo.')
      return
    }
    if (records.some(record => record.id !== editingId && record.type.toLocaleLowerCase('es') === normalizedType.toLocaleLowerCase('es'))) {
      setError('Ya existe un tipo de anticipo con este nombre.')
      return
    }
    const now = new Date().toISOString()
    const previous = records.find(record => record.id === editingId)
    const record: AdvanceType = {
      id: editingId ?? crypto.randomUUID(),
      type: normalizedType,
      state,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    }
    const next = editingId
      ? records.map(item => item.id === editingId ? record : item)
      : [record, ...records]
    saveAdvanceTypes(next)
    setRecords(next)
    setFormOpen(false)
  }

  return <div className="page screen-page advance-types-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header advance-types-header">
      <div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div>
      <button type="button" className="primary-action" onClick={openNew}><Plus />Nuevo Tipo</button>
    </section>

    <section className="advance-types-toolbar">
      <label><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar tipo de anticipo" aria-label="Buscar tipo de anticipo" /></label>
    </section>

    <section className="advance-types-table">
      <table>
        <thead><tr><th aria-label="Editar" /><th>Tipo de Anticipo</th><th>Estado</th></tr></thead>
        <tbody>
          {filtered.map(record => <tr key={record.id}>
            <td><button type="button" className="advance-types-edit" onClick={() => openEdit(record)} aria-label={`Editar ${record.type}`} title="Editar"><Pencil /></button></td>
            <td><strong>{record.type}</strong></td>
            <td><span className={`advance-types-state ${record.state.toLowerCase()}`}><i />{record.state === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></td>
          </tr>)}
          {!filtered.length && <tr><td colSpan={3}><div className="advance-types-empty"><HandCoins /><strong>{records.length ? 'No existen coincidencias' : 'No existen tipos de anticipos'}</strong><span>{records.length ? 'Prueba con otro criterio de búsqueda.' : 'Selecciona Nuevo Tipo para registrar el primero.'}</span></div></td></tr>}
        </tbody>
      </table>
    </section>

    {formOpen && <div className="advance-types-backdrop" role="dialog" aria-modal="true" aria-label={editingId ? 'Editar tipo de anticipo' : 'Nuevo tipo de anticipo'}>
      <form className="advance-types-form" onSubmit={save}>
        <header><div><span>{editingId ? 'Modificar registro' : 'Nuevo registro'}</span><h2>{editingId ? 'Editar Tipo de Anticipo' : 'Nuevo Tipo de Anticipo'}</h2></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Cerrar"><X /></button></header>
        <div>
          <label><span>Tipo de Anticipo <b>Obligatorio</b></span><input autoFocus maxLength={100} value={type} onChange={event => { setType(event.target.value); setError('') }} placeholder="Ingresa el nombre del tipo" /></label>
          <label><span>Estado</span><select value={state} onChange={event => setState(event.target.value as AdvanceTypeState)}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label>
          {error && <div className="advance-types-error" role="alert"><AlertTriangle />{error}</div>}
        </div>
        <footer><button type="button" className="quiet-button" onClick={() => setFormOpen(false)}>Cancelar</button><button type="submit" className="primary-action">Guardar</button></footer>
      </form>
    </div>}
  </div>
}
