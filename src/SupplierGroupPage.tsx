import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, ChevronRight, FolderTree, Pencil, Plus, Search, X } from 'lucide-react'
import type { ScreenSpec } from './types'
import { SearchableDatalistInput } from './SearchableDatalistInput'

type SupplierGroupState = 'ACTIVO' | 'INACTIVO'
type SupplierGroup = {
  id: string
  description: string
  accountCode: string
  accountDescription: string
  advanceAccountCode?: string
  advanceAccountDescription?: string
  state: SupplierGroupState
}
type Account = { Codigo: string; 'Descripción': string; Tipo: string; Estado: string }

const groupKey = 'saga.supplier-groups'
const planKey = 'saga.accounting.plan'

function readJson<T>(key: string, fallback: T): T {
  try { const value = JSON.parse(localStorage.getItem(key) ?? 'null'); return value ?? fallback } catch { return fallback }
}

function readGroups() { return readJson<SupplierGroup[]>(groupKey, []) }
function readAccounts() {
  return readJson<Account[]>(planKey, []).filter(account =>
    account.Estado.toLocaleUpperCase('es') !== 'INACTIVO'
    && account.Tipo.toLocaleUpperCase('es') === 'AUXILIAR',
  )
}

export function SupplierGroupPage({ screen }: { screen: ScreenSpec }) {
  const [groups, setGroups] = useState<SupplierGroup[]>(readGroups)
  const accounts = readAccounts()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [accountCode, setAccountCode] = useState('')
  const [advanceAccountCode, setAdvanceAccountCode] = useState('')
  const [state, setState] = useState<SupplierGroupState>('ACTIVO')
  const [error, setError] = useState('')
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return !term ? groups : groups.filter(group => `${group.description} ${group.accountCode} ${group.accountDescription} ${group.advanceAccountCode ?? ''} ${group.advanceAccountDescription ?? ''} ${group.state}`.toLocaleLowerCase('es').includes(term))
  }, [groups, search])
  const selectedAdvanceAccount = useMemo(() => accounts.find(item => item.Codigo === advanceAccountCode), [accounts, advanceAccountCode])

  const openNew = () => { setEditingId(null); setDescription(''); setAccountCode(''); setAdvanceAccountCode(''); setState('ACTIVO'); setError(''); setFormOpen(true) }
  const openEdit = (group: SupplierGroup) => { setEditingId(group.id); setDescription(group.description); setAccountCode(group.accountCode); setAdvanceAccountCode(group.advanceAccountCode ?? ''); setState(group.state); setError(''); setFormOpen(true) }
  const save = (event: FormEvent) => {
    event.preventDefault()
    if (!description.trim()) { setError('Ingresa la descripción del grupo.'); return }
    if (!accountCode.trim()) { setError('Selecciona la cuenta contable.'); return }
    const account = accounts.find(item => item.Codigo === accountCode)
    if (!account) { setError('Selecciona una cuenta contable de tipo Auxiliar.'); return }
    const advanceAccount = selectedAdvanceAccount
    if (advanceAccountCode.trim() && !advanceAccount) { setError('Selecciona una cuenta contable de anticipos de tipo Auxiliar.'); return }
    const duplicate = groups.some(group => group.id !== editingId && group.description.trim().toLocaleLowerCase('es') === description.trim().toLocaleLowerCase('es'))
    if (duplicate) { setError('Ya existe un grupo de proveedores con esta descripción.'); return }
    const record: SupplierGroup = {
      id: editingId ?? crypto.randomUUID(),
      description: description.trim(),
      accountCode: accountCode.trim(),
      accountDescription: account?.['Descripción'] ?? '',
      advanceAccountCode: advanceAccountCode.trim(),
      advanceAccountDescription: advanceAccount?.['Descripción'] ?? '',
      state,
    }
    const next = editingId ? groups.map(group => group.id === editingId ? record : group) : [record, ...groups]
    localStorage.setItem(groupKey, JSON.stringify(next))
    setGroups(next)
    setFormOpen(false)
  }

  return <div className="page screen-page supplier-group-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header supplier-group-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div><button type="button" className="primary-action" onClick={openNew}><Plus />Nuevo Grupo</button></section>
    <section className="supplier-group-toolbar"><label><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar grupo de proveedores" aria-label="Buscar grupo de proveedores" /></label></section>
    <section className="supplier-group-table"><table><thead><tr><th aria-label="Editar" /><th>Descripción</th><th>Cta. Contable</th><th>Cta. Contable Anticipos</th><th>Estado</th></tr></thead><tbody>{filtered.map(group => <tr key={group.id}><td><button type="button" className="supplier-group-edit" onClick={() => openEdit(group)} aria-label={`Editar ${group.description}`} title="Editar"><Pencil /></button></td><td><strong>{group.description}</strong></td><td><span>{group.accountCode}</span>{group.accountDescription && <small>{group.accountDescription}</small>}</td><td><span>{group.advanceAccountCode || '—'}</span>{group.advanceAccountDescription && <small>{group.advanceAccountDescription}</small>}</td><td><span className={`supplier-group-state ${group.state.toLowerCase()}`}><i />{group.state === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></td></tr>)}{!filtered.length && <tr><td colSpan={5}><div className="supplier-group-empty"><FolderTree /><strong>{groups.length ? 'No existen coincidencias' : 'No existen grupos de proveedores'}</strong><span>{groups.length ? 'Prueba con otro criterio de búsqueda.' : 'Selecciona Nuevo Grupo para registrar el primero.'}</span></div></td></tr>}</tbody></table></section>

    {formOpen && <div className="supplier-group-backdrop" role="dialog" aria-modal="true" aria-label={editingId ? 'Editar grupo de proveedores' : 'Nuevo grupo de proveedores'}><form className="supplier-group-form" onSubmit={save}><header><div><span>{editingId ? 'Modificar registro' : 'Nuevo registro'}</span><h2>{editingId ? 'Editar Grupo de Proveedores' : 'Nuevo Grupo de Proveedores'}</h2></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Cerrar"><X /></button></header><div><label><span>Descripción <b>Obligatorio</b></span><input autoFocus value={description} onChange={event => { setDescription(event.target.value); setError('') }} /></label><label><span>Cta. Contable <b>Obligatorio</b></span><SearchableDatalistInput list="supplier-group-account-options" value={accountCode} onChange={event => { setAccountCode(event.target.value); setError('') }} onClear={() => { setAccountCode(''); setError('') }} clearLabel="Borrar cuenta contable" placeholder="Escribe para filtrar el Plan Contable" /><datalist id="supplier-group-account-options">{accounts.map(account => <option key={account.Codigo} value={account.Codigo}>{account['Descripción']}</option>)}</datalist><small>{accounts.length ? 'Selecciona una cuenta Auxiliar creada en el Plan Contable.' : 'El Plan Contable no contiene cuentas Auxiliares activas.'}</small></label><label><span>Cta. Contable Anticipos</span><SearchableDatalistInput list="supplier-group-advance-account-options" value={advanceAccountCode} onChange={event => { setAdvanceAccountCode(event.target.value); setError('') }} onClear={() => { setAdvanceAccountCode(''); setError('') }} clearLabel="Borrar cuenta contable de anticipos" placeholder="Escribe para filtrar el Plan Contable" /><datalist id="supplier-group-advance-account-options">{accounts.map(account => <option key={account.Codigo} value={account.Codigo}>{account['Descripción']}</option>)}</datalist><small>{advanceAccountCode ? selectedAdvanceAccount?.['Descripción'] ?? 'Selecciona una cuenta Auxiliar válida del Plan Contable.' : accounts.length ? 'Escribe el código para filtrar las cuentas Auxiliares disponibles.' : 'El Plan Contable no contiene cuentas Auxiliares activas.'}</small></label><label><span>Estado</span><select value={state} onChange={event => setState(event.target.value as SupplierGroupState)}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label>{error && <div className="supplier-group-error" role="alert"><AlertTriangle />{error}</div>}</div><footer><button type="button" className="quiet-button" onClick={() => setFormOpen(false)}>Cancelar</button><button type="submit" className="primary-action">Guardar</button></footer></form></div>}
  </div>
}
