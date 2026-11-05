import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import { activeCompanyStorageKey } from './api'
import { advanceTypesChangedEvent, readAdvanceTypes, type AdvanceType } from './advance-types-store'
import type { ScreenSpec } from './types'

type Account = {
  Codigo: string
  'Descripción': string
  Tipo: string
  Estado: string
}

type AssignmentCode = string
type AccountAssignments = Record<AssignmentCode, string>
type ConfigurationType = { code: AssignmentCode; label: string; detail?: string }
type DropdownPosition = { top: number; left: number; width: number; maxHeight: number }

const planKey = 'saga.accounting.plan'
const baseConfigurationTypes: ConfigurationType[] = [
  { code: 'CUSTOMERS_RECEIVABLE', label: 'Cuenta x Cobrar Clientes' },
  { code: 'SUPPLIERS_PAYABLE', label: 'Cuenta x Pagar Proveedores' },
  { code: 'GENERAL_CASH', label: 'Caja General' },
  { code: 'PETTY_CASH', label: 'Caja Chica' },
]
const emptyAssignments: AccountAssignments = { CUSTOMERS_RECEIVABLE: '', SUPPLIERS_PAYABLE: '', GENERAL_CASH: '', PETTY_CASH: '' }

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null')
    return value ?? fallback
  } catch {
    return fallback
  }
}

function readAuxiliaryAccounts() {
  return readJson<Account[]>(planKey, [])
    .filter(account => account.Tipo.toLocaleUpperCase('es') === 'AUXILIAR')
    .sort((left, right) => left.Codigo.localeCompare(right.Codigo, 'es', { numeric: true }))
}

function assignmentStorageKey() {
  const companyId = localStorage.getItem(activeCompanyStorageKey) ?? 'cmp-demo-ecuador'
  return `saga.accounting.account-assignments:${companyId}`
}

function AccountCombobox({
  id,
  accounts,
  value,
  onChange,
}: {
  id: string
  accounts: Account[]
  value: string
  onChange: (code: string) => void
}) {
  const selected = accounts.find(account => account.Codigo === value)
  const [query, setQuery] = useState(selected ? `${selected.Codigo} · ${selected['Descripción']}` : '')
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<DropdownPosition | null>(null)
  const normalizedQuery = query.trim().toLocaleLowerCase('es')
  const selectedLabel = selected ? `${selected.Codigo} · ${selected['Descripción']}` : ''
  const filterTerm = query === selectedLabel ? '' : normalizedQuery
  const visibleAccounts = useMemo(() => accounts.filter(account =>
    !filterTerm || `${account.Codigo} ${account['Descripción']} ${account.Estado}`.toLocaleLowerCase('es').includes(filterTerm),
  ), [accounts, filterTerm])

  const selectAccount = (account: Account) => {
    onChange(account.Codigo)
    setQuery(`${account.Codigo} · ${account['Descripción']}`)
    setOpen(false)
  }

  const showOptions = (input: HTMLInputElement) => {
    const bounds = input.parentElement?.getBoundingClientRect() ?? input.getBoundingClientRect()
    setPosition({
      top: bounds.bottom + 6,
      left: bounds.left,
      width: bounds.width,
      maxHeight: Math.max(120, window.innerHeight - bounds.bottom - 16),
    })
    setOpen(true)
  }

  const options = open && position ? <div
    id={`${id}-options`}
    className="account-assignment-options portal"
    role="listbox"
    style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}
  >
    {visibleAccounts.map(account => <button
      type="button"
      role="option"
      aria-selected={account.Codigo === value}
      className={account.Codigo === value ? 'selected' : ''}
      key={account.Codigo}
      onMouseDown={event => event.preventDefault()}
      onClick={() => selectAccount(account)}
    >
      <strong>{account.Codigo}</strong>
      <span>{account['Descripción']}</span>
      <small className={account.Estado.toLocaleUpperCase('es') === 'INACTIVO' ? 'inactive' : ''}>{account.Estado}</small>
    </button>)}
    {!visibleAccounts.length && <div className="account-assignment-no-options">No hay cuentas auxiliares que coincidan con la búsqueda.</div>}
  </div> : null

  return <div className="account-assignment-combobox" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOpen(false)
      setQuery(selectedLabel)
    }
  }}>
    <div className="account-assignment-input">
      <Search />
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-autocomplete="list"
        value={query}
        placeholder={accounts.length ? 'Escribe para filtrar el Plan Contable' : 'No existen cuentas auxiliares'}
        disabled={!accounts.length}
        onFocus={event => { showOptions(event.currentTarget); event.currentTarget.select() }}
        onChange={event => { setQuery(event.target.value); showOptions(event.currentTarget); if (value) onChange('') }}
        onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}
      />
      {query && <button type="button" className="searchable-combo-clear" aria-label="Borrar cuenta contable" title="Borrar cuenta contable" onMouseDown={event => event.preventDefault()} onClick={() => { setQuery(''); onChange(''); setOpen(true) }}><X /></button>}
      <ChevronDown className={open ? 'open' : ''} />
    </div>
    {options && createPortal(options, document.body)}
  </div>
}

export function AccountingAccountAssignmentPage({ screen }: { screen: ScreenSpec }) {
  const accounts = readAuxiliaryAccounts()
  const storageKey = assignmentStorageKey()
  const [advanceTypes, setAdvanceTypes] = useState<AdvanceType[]>(readAdvanceTypes)
  const [assignments, setAssignments] = useState<AccountAssignments>(() => ({ ...emptyAssignments, ...readJson<AccountAssignments>(storageKey, {}) }))
  const [savedAssignments, setSavedAssignments] = useState<AccountAssignments>(assignments)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const configurationTypes = useMemo<ConfigurationType[]>(() => [
    ...baseConfigurationTypes,
    ...advanceTypes
      .slice()
      .sort((left, right) => left.type.localeCompare(right.type, 'es'))
      .map(record => ({ code: `ADVANCE_TYPE:${record.id}`, label: record.type, detail: `Tipo de anticipo · ${record.state === 'ACTIVO' ? 'Activo' : 'Inactivo'}` })),
  ], [advanceTypes])
  const dirty = configurationTypes.some(item => assignments[item.code] !== savedAssignments[item.code])

  useEffect(() => {
    const refreshAdvanceTypes = () => setAdvanceTypes(readAdvanceTypes())
    window.addEventListener(advanceTypesChangedEvent, refreshAdvanceTypes)
    window.addEventListener('storage', refreshAdvanceTypes)
    return () => {
      window.removeEventListener(advanceTypesChangedEvent, refreshAdvanceTypes)
      window.removeEventListener('storage', refreshAdvanceTypes)
    }
  }, [])

  const changeAssignment = (code: AssignmentCode, accountCode: string) => {
    setAssignments(current => ({ ...current, [code]: accountCode }))
    setMessage('')
    setError('')
  }

  const save = () => {
    const invalid = configurationTypes.find(item => assignments[item.code] && !accounts.some(account => account.Codigo === assignments[item.code]))
    if (invalid) {
      setError(`Selecciona una cuenta auxiliar válida para ${invalid.label}.`)
      return
    }
    localStorage.setItem(storageKey, JSON.stringify(assignments))
    setSavedAssignments(assignments)
    setError('')
    setMessage('Las cuentas contables fueron guardadas para esta compañía.')
  }

  return <div className="page screen-page account-assignment-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header account-assignment-header">
      <div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div>
      <button type="button" className="primary-action" disabled={!dirty} onClick={save}>Guardar Configuración</button>
    </section>

    {message && <div className="account-assignment-feedback" role="status"><CheckCircle2 />{message}</div>}
    {error && <div className="account-assignment-error" role="alert"><AlertTriangle />{error}</div>}

    <section className="account-assignment-panel">
      <header><strong>Configuración contable</strong><span>{configurationTypes.length} tipos de configuración</span></header>
      <div className="account-assignment-table-scroll">
        <table>
          <thead><tr><th>Tipo de configuración</th><th>Cuenta contable</th></tr></thead>
          <tbody>{configurationTypes.map(item => {
            const selected = accounts.find(account => account.Codigo === assignments[item.code])
            return <tr key={item.code}>
              <td><strong>{item.label}</strong>{item.detail && <small className="account-assignment-type-detail">{item.detail}</small>}</td>
              <td>
                <AccountCombobox id={`assignment-${item.code}`} accounts={accounts} value={assignments[item.code]} onChange={value => changeAssignment(item.code, value)} />
                {selected && <small className="account-assignment-selected">Cuenta auxiliar · {selected.Estado}</small>}
              </td>
            </tr>
          })}</tbody>
        </table>
      </div>
      {!accounts.length && <div className="account-assignment-empty"><AlertTriangle /><span><strong>No existen cuentas auxiliares en el Plan Contable.</strong> Crea o procesa el plan contable antes de realizar las asignaciones.</span></div>}
    </section>
  </div>
}
