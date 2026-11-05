import { useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Check, ChevronRight, Landmark, Pencil, Plus, Search } from 'lucide-react'
import { api } from './api'
import { ecuadorBanks } from './CustomerRegistryPage'
import { formatFullDateInput } from './date-input'
import { SearchableDatalistInput } from './SearchableDatalistInput'
import type { Context, ScreenSpec } from './types'

type BankAccountState = 'ACTIVA' | 'INACTIVA'
type BankAccountType = 'AHORRO' | 'CORRIENTE'
export type BankAccountRecord = {
  id: string
  bank: string
  type: BankAccountType
  accountNumber: string
  holder: string
  openingDate: string
  signatoryName: string
  accountCode: string
  state: BankAccountState
  createdAt: string
  updatedAt: string
}
type AccountPlanRow = { Codigo: string; 'Descripción': string; Tipo: string; Estado: string }
type BankAccountDraft = Omit<BankAccountRecord, 'id' | 'createdAt' | 'updatedAt'>

const emptyDraft: BankAccountDraft = { bank: '', type: 'CORRIENTE', accountNumber: '', holder: '', openingDate: '', signatoryName: '', accountCode: '', state: 'ACTIVA' }

export function bankAccountStorageKey(companyId: string) {
  return `saga.banking.accounts:${companyId}`
}

export function readBankAccounts(companyId: string) {
  try {
    const value = JSON.parse(localStorage.getItem(bankAccountStorageKey(companyId)) ?? '[]')
    return Array.isArray(value) ? value as BankAccountRecord[] : []
  } catch {
    return []
  }
}

function readAccounts() {
  try {
    const value = JSON.parse(localStorage.getItem('saga.accounting.plan') ?? '[]')
    return (Array.isArray(value) ? value as AccountPlanRow[] : [])
      .filter(account => account.Tipo.toLocaleUpperCase('es') === 'AUXILIAR' && account.Estado.toLocaleUpperCase('es') !== 'INACTIVO')
      .sort((left, right) => left.Codigo.localeCompare(right.Codigo, 'es', { numeric: true }))
  } catch {
    return []
  }
}

function accountLabel(account: AccountPlanRow) {
  return `${account.Codigo} · ${account['Descripción']}`
}

function validDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return false
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
  return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[1])
}

export function BankAccountsPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <BankAccountsManager key={context.data.company.id} screen={screen} context={context.data} />
}

function BankAccountsManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const accounts = useMemo(readAccounts, [])
  const [rows, setRows] = useState(() => readBankAccounts(context.company.id))
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<BankAccountDraft>(emptyDraft)
  const [bankInput, setBankInput] = useState('')
  const [accountInput, setAccountInput] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const normalizedSearch = search.trim().toLocaleLowerCase('es')
  const filtered = rows.filter(row => !normalizedSearch || [row.bank, row.type, row.accountNumber, row.holder, row.openingDate, row.signatoryName, accountLabel(accounts.find(account => account.Codigo === row.accountCode) ?? { Codigo: row.accountCode, 'Descripción': '', Tipo: '', Estado: '' }), row.state].join(' ').toLocaleLowerCase('es').includes(normalizedSearch))

  const openNew = () => {
    setEditingId(null)
    setDraft(emptyDraft)
    setBankInput('')
    setAccountInput('')
    setError('')
    setMessage('')
    setFormOpen(true)
  }

  const openEdit = (row: BankAccountRecord) => {
    setEditingId(row.id)
    setDraft({ bank: row.bank, type: row.type, accountNumber: row.accountNumber, holder: row.holder, openingDate: row.openingDate, signatoryName: row.signatoryName, accountCode: row.accountCode, state: row.state })
    setBankInput(row.bank)
    setAccountInput(accounts.find(account => account.Codigo === row.accountCode) ? accountLabel(accounts.find(account => account.Codigo === row.accountCode)!) : row.accountCode)
    setError('')
    setMessage('')
    setFormOpen(true)
  }

  const selectBank = (value: string) => {
    setBankInput(value)
    setDraft(current => ({ ...current, bank: ecuadorBanks.includes(value) ? value : '' }))
    setError('')
  }

  const selectAccount = (value: string) => {
    setAccountInput(value)
    const account = accounts.find(option => accountLabel(option) === value)
    setDraft(current => ({ ...current, accountCode: account?.Codigo ?? '' }))
    setError('')
  }

  const save = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.bank) { setError('Selecciona un Banco de la lista.'); return }
    if (!draft.accountNumber.trim()) { setError('Ingresa el # de Cuenta.'); return }
    if (!draft.holder.trim()) { setError('Ingresa el Titular de la cuenta.'); return }
    if (!validDate(draft.openingDate)) { setError('La Fecha Apertura debe tener el formato DD/MM/AAAA y ser una fecha válida.'); return }
    if (!draft.signatoryName.trim()) { setError('Ingresa el Nombre Firmante.'); return }
    if (!draft.accountCode) { setError('Selecciona una Cuenta Contable auxiliar activa.'); return }
    if (rows.some(row => row.id !== editingId && row.bank === draft.bank && row.accountNumber.trim() === draft.accountNumber.trim())) { setError('Ya existe una cuenta registrada con el mismo Banco y # de Cuenta.'); return }
    const now = new Date().toISOString()
    const previous = rows.find(row => row.id === editingId)
    const record: BankAccountRecord = { id: editingId ?? crypto.randomUUID(), ...draft, accountNumber: draft.accountNumber.trim(), holder: draft.holder.trim(), signatoryName: draft.signatoryName.trim(), createdAt: previous?.createdAt ?? now, updatedAt: now }
    const next = editingId ? rows.map(row => row.id === editingId ? record : row) : [record, ...rows]
    setRows(next)
    localStorage.setItem(bankAccountStorageKey(context.company.id), JSON.stringify(next))
    setFormOpen(false)
    setError('')
    setMessage(`La cuenta bancaria fue ${editingId ? 'actualizada' : 'registrada'} correctamente.`)
  }

  return <div className="page screen-page bank-accounts-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header bank-accounts-header"><div><div className="screen-id"><span>{screen.id}</span><b>Bancos</b></div><h1>{screen.titulo_original}</h1></div><div className="bank-accounts-header-actions">{!formOpen && <label className="screen-table-search"><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar en todas las columnas" aria-label="Buscar cuentas bancarias" /></label>}{!formOpen && <button type="button" className="primary-action" onClick={openNew}><Plus />Nueva Cuenta</button>}</div></section>
    {message && <div className="bank-account-feedback"><Check />{message}</div>}

    {formOpen ? <form className="panel bank-account-form" onSubmit={save}>
      <header><div><Landmark /><span><h2>{editingId ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}</h2><p>Información operativa y cuenta contable asociada.</p></span></div><button type="button" className="quiet-button" onClick={() => setFormOpen(false)}><ArrowLeft />Volver</button></header>
      {error && <div className="bank-account-error" role="alert"><AlertTriangle />{error}</div>}
      <div className="bank-account-form-grid">
        <label><span>Banco <b>Obligatorio</b></span><SearchableDatalistInput list="ecuador-banks-bank-accounts" value={bankInput} onChange={event => selectBank(event.target.value)} onClear={() => selectBank('')} clearLabel="Borrar banco" placeholder="Escribe para filtrar bancos" autoComplete="off" /></label>
        <datalist id="ecuador-banks-bank-accounts">{ecuadorBanks.map(bank => <option value={bank} key={bank} />)}</datalist>
        <label><span>Tipo <b>Obligatorio</b></span><select value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value as BankAccountType })}><option value="AHORRO">Ahorro</option><option value="CORRIENTE">Corriente</option></select></label>
        <label><span># Cuenta <b>Obligatorio</b></span><input value={draft.accountNumber} onChange={event => setDraft({ ...draft, accountNumber: event.target.value.replace(/[^\d-]/g, '') })} inputMode="numeric" maxLength={30} /></label>
        <label><span>Titular <b>Obligatorio</b></span><input value={draft.holder} onChange={event => setDraft({ ...draft, holder: event.target.value })} maxLength={120} /></label>
        <label><span>Fecha Apertura <b>Obligatorio</b></span><input value={draft.openingDate} onChange={event => setDraft({ ...draft, openingDate: formatFullDateInput(event.target.value) })} inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} /></label>
        <label><span>Nombre Firmante <b>Obligatorio</b></span><input value={draft.signatoryName} onChange={event => setDraft({ ...draft, signatoryName: event.target.value })} maxLength={120} /></label>
        <label className="bank-account-code-field"><span>Cuenta Contable <b>Obligatorio</b></span><SearchableDatalistInput list="bank-account-plan-options" value={accountInput} onChange={event => selectAccount(event.target.value)} onClear={() => selectAccount('')} clearLabel="Borrar cuenta contable" placeholder="Escribe para filtrar el Plan Contable" autoComplete="off" /></label>
        <datalist id="bank-account-plan-options">{accounts.map(account => <option key={account.Codigo} value={accountLabel(account)} />)}</datalist>
        <label className="bank-account-state-field"><span>Estado</span><button type="button" role="switch" aria-checked={draft.state === 'ACTIVA'} className={`bank-account-state-toggle ${draft.state === 'ACTIVA' ? 'active' : ''}`} onClick={() => setDraft({ ...draft, state: draft.state === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA' })}><i /><b>{draft.state === 'ACTIVA' ? 'Activa' : 'Inactiva'}</b></button></label>
      </div>
      <footer><button type="button" className="quiet-button" onClick={() => setFormOpen(false)}>Cancelar</button><button type="submit" className="primary-action"><Check />Guardar Cuenta</button></footer>
    </form> : <section className="panel bank-accounts-list">
      <header><div><Landmark /><span><h2>Cuentas Bancarias</h2><p>Cuentas configuradas para la compañía activa.</p></span></div><strong>{filtered.length}<small>{filtered.length === 1 ? 'cuenta' : 'cuentas'}</small></strong></header>
      <div className="bank-accounts-table"><table><thead><tr><th aria-label="Editar" /><th>Banco</th><th>Tipo</th><th># Cuenta</th><th>Titular</th><th>Fecha Apertura</th><th>Nombre Firmante</th><th>Cuenta Contable</th><th>Estado</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td><button type="button" className="row-action" aria-label={`Editar cuenta ${row.accountNumber}`} title="Editar cuenta" onClick={() => openEdit(row)}><Pencil /></button></td><td><strong>{row.bank}</strong></td><td>{row.type === 'AHORRO' ? 'Ahorro' : 'Corriente'}</td><td>{row.accountNumber}</td><td>{row.holder}</td><td>{row.openingDate}</td><td>{row.signatoryName}</td><td>{accounts.find(account => account.Codigo === row.accountCode) ? accountLabel(accounts.find(account => account.Codigo === row.accountCode)!) : row.accountCode}</td><td><span className={`status s-${row.state === 'ACTIVA' ? 'activo' : 'inactivo'}`}><i />{row.state === 'ACTIVA' ? 'Activa' : 'Inactiva'}</span></td></tr>)}{!filtered.length && <tr><td colSpan={9}><div className="bank-accounts-empty"><Landmark /><strong>{rows.length ? 'No existen coincidencias' : 'No existen cuentas bancarias registradas'}</strong><span>{rows.length ? 'Prueba con otro criterio de búsqueda.' : 'Selecciona Nueva Cuenta para registrar la primera.'}</span></div></td></tr>}</tbody></table></div>
    </section>}
  </div>
}
