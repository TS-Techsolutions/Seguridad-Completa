import { useMemo, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronRight, Pencil, Plus, Search, X } from 'lucide-react'
import type { ScreenSpec } from './types'
import { displayVat, vatConfigurationChangedEvent, vatConfigurationStorageKey, type VatConfiguration, type VatState } from './vat-configuration-store'

type Account = {
  Codigo: string
  'Descripción': string
  Tipo: string
  Estado: string
}

type VatRow = VatConfiguration
type VatDraft = { value: string; accountCode: string; state: VatState }
type DropdownPosition = { top: number; left: number; width: number; maxHeight: number }

const planKey = 'saga.accounting.plan'
const emptyDraft: VatDraft = { value: '', accountCode: '', state: 'ACTIVO' }

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null')
    return value ?? fallback
  } catch { return fallback }
}

function readAccounts() {
  return readJson<Account[]>(planKey, [])
    .filter(account => account.Estado?.toLocaleUpperCase('es') !== 'INACTIVO')
    .sort((left, right) => left.Codigo.localeCompare(right.Codigo, 'es', { numeric: true }))
}

function AccountCombobox({ accounts, value, onChange }: { accounts: Account[]; value: string; onChange: (value: string) => void }) {
  const selected = accounts.find(account => account.Codigo === value)
  const selectedLabel = selected ? `${selected.Codigo} · ${selected['Descripción']}` : ''
  const [query, setQuery] = useState(selectedLabel)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<DropdownPosition | null>(null)
  const filterTerm = query === selectedLabel ? '' : query.trim().toLocaleLowerCase('es')
  const visibleAccounts = useMemo(() => accounts.filter(account =>
    !filterTerm || `${account.Codigo} ${account['Descripción']} ${account.Tipo}`.toLocaleLowerCase('es').includes(filterTerm),
  ), [accounts, filterTerm])

  const showOptions = (input: HTMLInputElement) => {
    const bounds = input.parentElement?.getBoundingClientRect() ?? input.getBoundingClientRect()
    setPosition({
      top: bounds.bottom + 6,
      left: bounds.left,
      width: bounds.width,
      maxHeight: Math.max(140, window.innerHeight - bounds.bottom - 16),
    })
    setOpen(true)
  }

  const selectAccount = (account: Account) => {
    onChange(account.Codigo)
    setQuery(`${account.Codigo} · ${account['Descripción']}`)
    setOpen(false)
  }

  const options = open && position ? <div className="vat-account-options" role="listbox" style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}>
    {visibleAccounts.map(account => <button type="button" role="option" aria-selected={account.Codigo === value} className={account.Codigo === value ? 'selected' : ''} key={account.Codigo} onMouseDown={event => event.preventDefault()} onClick={() => selectAccount(account)}>
      <strong>{account.Codigo}</strong><span>{account['Descripción']}</span><small>{account.Tipo}</small>
    </button>)}
    {!visibleAccounts.length && <div className="vat-account-empty">No existen cuentas que coincidan con el filtro.</div>}
  </div> : null

  return <div className="vat-account-combobox" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOpen(false)
      setQuery(selectedLabel)
    }
  }}>
    <div><Search /><input role="combobox" aria-expanded={open} aria-autocomplete="list" value={query} disabled={!accounts.length} placeholder={accounts.length ? 'Escribe para filtrar el Plan Contable' : 'No existen cuentas contables'} onFocus={event => { showOptions(event.currentTarget); event.currentTarget.select() }} onChange={event => { setQuery(event.target.value); showOptions(event.currentTarget); if (value) onChange('') }} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }} />{query && <button type="button" className="searchable-combo-clear" aria-label="Borrar cuenta contable" title="Borrar cuenta contable" onMouseDown={event => event.preventDefault()} onClick={() => { setQuery(''); onChange(''); setOpen(true) }}><X /></button>}<ChevronDown className={open ? 'open' : ''} /></div>
    {options && createPortal(options, document.body)}
  </div>
}

export function VatConfigurationPage({ screen }: { screen: ScreenSpec }) {
  const storageKey = vatConfigurationStorageKey()
  const accounts = useMemo(readAccounts, [])
  const [rows, setRows] = useState<VatRow[]>(() => readJson<VatRow[]>(storageKey, []).sort((left, right) => left.value - right.value))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<VatDraft>({ ...emptyDraft })
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const persist = (next: VatRow[]) => {
    const ordered = [...next].sort((left, right) => left.value - right.value)
    setRows(ordered)
    localStorage.setItem(storageKey, JSON.stringify(ordered))
    window.dispatchEvent(new Event(vatConfigurationChangedEvent))
  }

  const openNew = () => {
    setCreating(true); setEditingId(null); setDraft({ ...emptyDraft }); setError(''); setMessage('')
  }

  const openEdit = (row: VatRow) => {
    setCreating(false); setEditingId(row.id); setDraft({ value: String(row.value), accountCode: row.accountCode, state: row.state }); setError(''); setMessage('')
  }

  const cancel = () => {
    setCreating(false); setEditingId(null); setDraft({ ...emptyDraft }); setError('')
  }

  const save = (event: FormEvent) => {
    event.preventDefault()
    const normalizedValue = draft.value.trim().replace(',', '.')
    if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(normalizedValue)) { setError('Ingresa un Valor IVA válido con máximo dos decimales.'); return }
    const value = Number(normalizedValue)
    if (!Number.isFinite(value) || value < 0 || value > 100) { setError('El Valor IVA debe estar entre 0 y 100.'); return }
    if (!draft.accountCode || !accounts.some(account => account.Codigo === draft.accountCode)) { setError('Selecciona una Cta. Contable válida del Plan Contable.'); return }
    if (rows.some(row => row.value === value && row.id !== editingId)) { setError(`Ya existe una configuración para el IVA ${displayVat(value)}.`); return }
    const row: VatRow = { id: editingId ?? crypto.randomUUID(), value, accountCode: draft.accountCode, state: draft.state }
    persist(editingId ? rows.map(current => current.id === editingId ? row : current) : [...rows, row])
    setCreating(false); setEditingId(null); setDraft({ ...emptyDraft }); setError(''); setMessage(`La configuración del IVA ${displayVat(value)} fue guardada correctamente.`)
  }

  const toggleState = (row: VatRow) => {
    const state: VatState = row.state === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'
    persist(rows.map(current => current.id === row.id ? { ...current, state } : current))
    setMessage(`El IVA ${displayVat(row.value)} quedó ${state === 'ACTIVO' ? 'Activo' : 'Inactivo'}.`)
    setError('')
  }

  const query = search.trim().toLocaleLowerCase('es')
  const filteredRows = rows.filter(row => {
    const account = accounts.find(item => item.Codigo === row.accountCode)
    return !query || `${row.value} ${displayVat(row.value)} ${row.accountCode} ${account?.['Descripción'] ?? ''} ${row.state}`.toLocaleLowerCase('es').includes(query)
  })
  const showEditor = creating || Boolean(editingId)

  return <div className="page screen-page vat-configuration-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header vat-configuration-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div><div className="vat-header-actions"><label className="screen-table-search"><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar en todas las columnas" aria-label="Buscar configuraciones IVA" /></label><button type="button" className="primary-action" onClick={openNew}><Plus />Nuevo Registro</button></div></section>

    {message && <div className="vat-feedback" role="status"><CheckCircle2 />{message}</div>}
    {error && <div className="vat-error" role="alert"><AlertTriangle />{error}</div>}

    <section className="vat-configuration-panel">
      <header><div><strong>Valores de IVA</strong><span>Configura el porcentaje, la cuenta contable y su estado.</span></div><b>{rows.length} {rows.length === 1 ? 'registro' : 'registros'}</b></header>
      <div className="vat-table-scroll"><table><thead><tr><th aria-label="Editar" /><th>Valor IVA</th><th>Cta. Contable</th><th>Estado</th></tr></thead><tbody>
        {showEditor && <tr className="vat-editor-row"><td><div className="vat-row-actions"><button type="submit" form="vat-configuration-form" className="save" aria-label="Guardar configuración IVA" title="Guardar"><Check /></button><button type="button" onClick={cancel} aria-label="Cancelar edición" title="Cancelar"><X /></button></div></td><td><form id="vat-configuration-form" onSubmit={save}><input autoFocus inputMode="decimal" maxLength={6} value={draft.value} onChange={event => { setDraft(current => ({ ...current, value: event.target.value })); setError('') }} placeholder="Ej. 15,00" aria-label="Valor IVA" /><span>%</span></form></td><td><AccountCombobox key={editingId ?? 'new'} accounts={accounts} value={draft.accountCode} onChange={value => { setDraft(current => ({ ...current, accountCode: value })); setError('') }} /></td><td><button type="button" role="switch" aria-checked={draft.state === 'ACTIVO'} className={`vat-state-toggle ${draft.state === 'ACTIVO' ? 'active' : ''}`} onClick={() => setDraft(current => ({ ...current, state: current.state === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' }))}><i /><span>{draft.state === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></button></td></tr>}
        {filteredRows.map(row => { const account = accounts.find(item => item.Codigo === row.accountCode); return <tr key={row.id} className={editingId === row.id ? 'editing-source' : undefined}><td><button type="button" className="vat-edit-button" onClick={() => openEdit(row)} aria-label={`Editar IVA ${displayVat(row.value)}`} title="Editar"><Pencil /></button></td><td><strong>{displayVat(row.value)}</strong></td><td><span className="vat-account-display"><b>{row.accountCode}</b><small>{account?.['Descripción'] ?? 'Cuenta no disponible en el Plan Contable'}</small></span></td><td><button type="button" role="switch" aria-checked={row.state === 'ACTIVO'} className={`vat-state-toggle ${row.state === 'ACTIVO' ? 'active' : ''}`} onClick={() => toggleState(row)}><i /><span>{row.state === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></button></td></tr> })}
        {!filteredRows.length && !showEditor && <tr><td colSpan={4}><div className="vat-empty"><AlertTriangle /><strong>{rows.length ? 'No existen coincidencias' : 'No existen valores de IVA configurados'}</strong><span>{rows.length ? 'Prueba con otro criterio de búsqueda.' : 'Selecciona Nuevo Registro para crear la primera configuración.'}</span></div></td></tr>}
      </tbody></table></div>
      {!accounts.length && <div className="vat-plan-warning"><AlertTriangle /><span><strong>No existen cuentas activas en el Plan Contable.</strong> Crea o procesa el plan antes de registrar valores de IVA.</span></div>}
    </section>
  </div>
}
