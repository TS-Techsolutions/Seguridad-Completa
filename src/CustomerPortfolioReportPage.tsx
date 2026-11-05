import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, RotateCcw, Search, UsersRound, X } from 'lucide-react'
import { api } from './api'
import { formatFullDateInput } from './date-input'
import { readIssuedExpenses, type IssuedExpenseRecord } from './expense-records'
import type { CustomerRow } from './CustomerRegistryPage'
import type { Context, ScreenSpec } from './types'

type PropertyRow = { id: string; description: string; cadastralCode: string }
type ReceivableRecord = { expenseId: string; originalAmount: number; balance: number }
export type PortfolioRow = {
  id: string; expenseId: string; clientKey: string; clientName: string; propertyName: string; cadastralCode: string
  receiptNumber: string; issueDate: string; total: number; cancelled: number; balance: number; detail: string; overdueDays: number
}
type AppliedFilters = { cutoff: string; customer: string; property: string; cadastral: string }
type ExpenseGroup = { key: string; rows: PortfolioRow[]; total: number; cancelled: number; balance: number; detail: string; overdueDays: number }

const allOption = 'Todos'

function readJson<T>(key: string, fallback: T): T {
  try { const value = JSON.parse(localStorage.getItem(key) ?? 'null'); return value ?? fallback } catch { return fallback }
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim()
}

function todayDisplay() {
  const now = new Date()
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
}

function dateValue(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
  return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[1]) ? date : null
}

function dateRank(value: string) { return dateValue(value)?.getTime() ?? 0 }
function money(value: number) { return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) }
function clientKey(expense: IssuedExpenseRecord) { return normalize(expense.identification || expense.businessName) }

export function buildCustomerPortfolioRows(companyId: string, cutoff: string) {
  const cutoffDate = dateValue(cutoff)
  if (!cutoffDate) return []
  const properties = readJson<PropertyRow[]>('saga.property-detail', [])
  const receivables = readJson<ReceivableRecord[]>(`saga.customer-receivables:${companyId}`, [])
  const receivableByExpense = new Map(receivables.map(item => [item.expenseId, item]))
  const propertyById = new Map(properties.map(property => [property.id, property]))
  const propertyByName = new Map(properties.map(property => [normalize(property.description), property]))
  const rows: PortfolioRow[] = []

  readIssuedExpenses(companyId)
    .filter(expense => expense.status === 'VIGENTE' && dateRank(expense.issueDate) <= cutoffDate.getTime())
    .forEach(expense => {
      const groupedLines = new Map<string, NonNullable<IssuedExpenseRecord['lines']>>()
      const lines = Array.isArray(expense.lines) ? expense.lines : []
      lines.forEach(line => {
        const key = line.propertyId || normalize(line.propertyDescription) || '__NO_PROPERTY__'
        groupedLines.set(key, [...(groupedLines.get(key) ?? []), line])
      })
      if (!groupedLines.size) groupedLines.set('__NO_PROPERTY__', [])
      const receivable = receivableByExpense.get(expense.id)
      const originalAmount = Number(receivable?.originalAmount ?? expense.total)
      const currentBalance = Math.max(0, Number(receivable?.balance ?? expense.total))
      const paidAmount = Math.max(0, originalAmount - currentBalance)
      const groups = Array.from(groupedLines.entries())
      groups.forEach(([propertyKey, propertyLines], index) => {
        const property = propertyById.get(propertyKey) ?? propertyByName.get(normalize(propertyLines[0]?.propertyDescription ?? ''))
        const groupTotal = propertyLines.length ? Number(propertyLines.reduce((sum, line) => sum + Number(line.total || 0), 0).toFixed(2)) : Number(expense.total)
        const weight = expense.total > 0 ? groupTotal / expense.total : 1 / groups.length
        const cancelled = Number(Math.min(groupTotal, paidAmount * weight).toFixed(2))
        const balance = Number(Math.max(0, groupTotal - cancelled).toFixed(2))
        if (balance <= 0) return
        const details = Array.from(new Set(propertyLines.map(line => line.conceptText || line.itemDescription).filter(Boolean)))
        const elapsed = Math.floor((cutoffDate.getTime() - dateRank(expense.issueDate)) / 86_400_000)
        rows.push({
          id: `${expense.id}-${propertyKey}-${index}`, expenseId: expense.id, clientKey: clientKey(expense), clientName: expense.businessName,
          propertyName: property?.description || propertyLines[0]?.propertyDescription || 'Sin inmueble asociado', cadastralCode: property?.cadastralCode?.trim() || '—',
          receiptNumber: expense.receiptNumber, issueDate: expense.issueDate, total: groupTotal, cancelled, balance,
          detail: details.join(' · ') || '—', overdueDays: Math.max(0, elapsed),
        })
      })
    })

  return rows.sort((left, right) => left.clientName.localeCompare(right.clientName, 'es') || dateRank(right.issueDate) - dateRank(left.issueDate))
}

function SearchableCombo({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(true)
  const uniqueOptions = useMemo(() => Array.from(new Set([allOption, ...options])).sort((left, right) => left === allOption ? -1 : right === allOption ? 1 : left.localeCompare(right, 'es')), [options])
  const visibleOptions = showAll ? uniqueOptions : uniqueOptions.filter(option => normalize(option).includes(normalize(value)))
  return <label className="customer-portfolio-filter-label"><span>{label}</span><div className="customer-portfolio-combo" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false) }}>
    <input role="combobox" aria-label={label} aria-expanded={open} aria-autocomplete="list" value={value} onFocus={event => { setOpen(true); setShowAll(true); event.currentTarget.select() }} onChange={event => { onChange(event.target.value); setOpen(true); setShowAll(false) }} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }} placeholder="Escribe para filtrar" />
    {value && <button type="button" className="customer-portfolio-combo-clear" aria-label={`Borrar ${label}`} title={`Borrar ${label}`} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(''); setOpen(true); setShowAll(true) }}><X /></button>}
    <button type="button" className="customer-portfolio-combo-toggle" aria-label={`Desplegar ${label}`} onMouseDown={event => event.preventDefault()} onClick={() => { setOpen(current => !current); setShowAll(true) }}><ChevronDown className={open ? 'open' : ''} /></button>
    {open && <div className="customer-portfolio-options" role="listbox" aria-label={`Opciones de ${label}`}>{visibleOptions.map(option => <button type="button" role="option" aria-selected={normalize(option) === normalize(value)} className={normalize(option) === normalize(value) ? 'selected' : ''} key={option} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(option); setOpen(false); setShowAll(true) }}>{option}</button>)}{!visibleOptions.length && <span>Sin coincidencias</span>}</div>}
  </div></label>
}

function sumRows(rows: PortfolioRow[]) {
  return rows.reduce((total, row) => ({ total: total.total + row.total, cancelled: total.cancelled + row.cancelled, balance: total.balance + row.balance }), { total: 0, cancelled: 0, balance: 0 })
}

function groupExpenses(rows: PortfolioRow[]) {
  const map = new Map<string, PortfolioRow[]>()
  rows.forEach(row => map.set(row.expenseId, [...(map.get(row.expenseId) ?? []), row]))
  return Array.from(map.entries()).map(([key, expenseRows]): ExpenseGroup => {
    const totals = sumRows(expenseRows)
    return { key, rows: expenseRows, ...totals, detail: Array.from(new Set(expenseRows.map(row => row.detail))).join(' · '), overdueDays: Math.max(...expenseRows.map(row => row.overdueDays)) }
  }).sort((left, right) => dateRank(right.rows[0].issueDate) - dateRank(left.rows[0].issueDate))
}

function DetailRow({ row, nested = false }: { row: PortfolioRow; nested?: boolean }) {
  return <tr className={nested ? 'customer-portfolio-property-row' : undefined}><td><span className={nested ? 'customer-portfolio-property-name' : undefined}>{row.propertyName}</span></td><td>{row.cadastralCode}</td><td>{nested ? '—' : row.receiptNumber}</td><td>{nested ? '—' : row.issueDate}</td><td className="money-cell">{money(row.total)}</td><td className="money-cell">{money(row.cancelled)}</td><td className="money-cell balance">{money(row.balance)}</td><td className="customer-portfolio-detail">{row.detail}</td><td className="days-cell">{nested ? '—' : row.overdueDays}</td></tr>
}

export function CustomerPortfolioReportPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <CustomerPortfolioReportManager key={context.data.company.id} screen={screen} context={context.data} />
}

function CustomerPortfolioReportManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const initialFilters = useMemo<AppliedFilters>(() => ({ cutoff: todayDisplay(), customer: allOption, property: allOption, cadastral: '' }), [])
  const [draftFilters, setDraftFilters] = useState<AppliedFilters>(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(initialFilters)
  const [filterError, setFilterError] = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set())
  const customers = useMemo(() => readJson<CustomerRow[]>('saga.customers', []).sort((left, right) => left.businessName.localeCompare(right.businessName, 'es')), [])
  const properties = useMemo(() => readJson<PropertyRow[]>('saga.property-detail', []).sort((left, right) => left.description.localeCompare(right.description, 'es')), [])
  const rows = useMemo(() => hasGenerated ? buildCustomerPortfolioRows(context.company.id, appliedFilters.cutoff) : [], [context.company.id, appliedFilters.cutoff, hasGenerated])
  const filteredRows = useMemo(() => rows.filter(row => {
    const matchesCustomer = normalize(appliedFilters.customer) === normalize(allOption) || normalize(row.clientName) === normalize(appliedFilters.customer)
    const matchesProperty = normalize(appliedFilters.property) === normalize(allOption) || normalize(row.propertyName) === normalize(appliedFilters.property)
    const matchesCadastral = !normalize(appliedFilters.cadastral) || normalize(row.cadastralCode).includes(normalize(appliedFilters.cadastral))
    return matchesCustomer && matchesProperty && matchesCadastral
  }), [rows, appliedFilters])
  const groups = useMemo(() => {
    const result = new Map<string, { name: string; rows: PortfolioRow[] }>()
    filteredRows.forEach(row => {
      const existing = result.get(row.clientKey)
      if (existing) existing.rows.push(row)
      else result.set(row.clientKey, { name: row.clientName, rows: [row] })
    })
    return Array.from(result.entries())
  }, [filteredRows])
  const portfolioBalance = useMemo(() => Number(filteredRows.reduce((sum, row) => sum + row.balance, 0).toFixed(2)), [filteredRows])
  const clientMode = normalize(appliedFilters.property) === normalize(allOption) && !normalize(appliedFilters.cadastral)
  const runSearch = () => {
    if (!dateValue(draftFilters.cutoff)) { setFilterError('Ingresa una Fecha de Corte válida en formato DD/MM/AAAA.'); return }
    setFilterError('')
    setAppliedFilters({ ...draftFilters, customer: draftFilters.customer || allOption, property: draftFilters.property || allOption })
    setHasGenerated(true)
    setExpandedClients(new Set()); setExpandedExpenses(new Set())
  }
  const resetFilters = () => {
    const reset = { ...initialFilters, cutoff: todayDisplay() }
    setDraftFilters(reset); setAppliedFilters(reset); setHasGenerated(false); setFilterError(''); setExpandedClients(new Set()); setExpandedExpenses(new Set())
  }
  const toggleSet = (setter: (value: Set<string>) => void, current: Set<string>, key: string) => {
    const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); setter(next)
  }

  return <div className="page screen-page customer-portfolio-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header customer-portfolio-header"><div><div className="screen-id"><span>{screen.id}</span><b>Cuentas por Cobrar</b></div><h1>{screen.titulo_original}</h1></div></section>

    <section className="panel customer-portfolio-filters" aria-label="Filtros de cartera">
      <label className="customer-portfolio-filter-label"><span>Fecha de Corte</span><input aria-label="Fecha de Corte" inputMode="numeric" maxLength={10} value={draftFilters.cutoff} onChange={event => setDraftFilters({ ...draftFilters, cutoff: formatFullDateInput(event.target.value) })} placeholder="DD/MM/AAAA" /></label>
      <SearchableCombo label="Cliente" value={draftFilters.customer} options={customers.map(customer => customer.businessName)} onChange={customer => setDraftFilters({ ...draftFilters, customer })} />
      <SearchableCombo label="Inmueble" value={draftFilters.property} options={properties.map(property => property.description)} onChange={property => setDraftFilters({ ...draftFilters, property })} />
      <label className="customer-portfolio-filter-label"><span>Código Catastral</span><input aria-label="Código Catastral" value={draftFilters.cadastral} onChange={event => setDraftFilters({ ...draftFilters, cadastral: event.target.value })} placeholder="Escribe para filtrar" /></label>
      <div className="customer-portfolio-filter-actions"><button type="button" className="quiet-button customer-portfolio-reset" onClick={resetFilters}><RotateCcw />Limpiar</button><button type="button" className="primary-action customer-portfolio-apply" onClick={runSearch}><Search />Generar búsqueda</button></div>
      {filterError && <div className="customer-portfolio-date-error" role="alert">{filterError}</div>}
    </section>

    <section className="panel customer-portfolio-results">
      <header><div><h2>Cartera de Clientes</h2><span>{filteredRows.length} {filteredRows.length === 1 ? 'obligación' : 'obligaciones'} con saldo · corte al {appliedFilters.cutoff}</span></div><strong>{money(portfolioBalance)}<small>Saldo total</small></strong></header>
      <div className="customer-portfolio-table-wrap"><table><thead><tr><th>Inmueble</th><th>Código Catastral</th><th># Expensa/Factura</th><th>Fecha Emisión</th><th>Total</th><th>Cancelado</th><th>Saldo</th><th>Detalle Expensa/Factura</th><th>Días Vencidos</th></tr></thead><tbody>
        {groups.map(([key, group]) => {
          const expanded = expandedClients.has(key)
          const totals = sumRows(group.rows)
          const expenseGroups = groupExpenses(group.rows)
          let body: ReactNode
          if (clientMode) body = expenseGroups.map(expense => {
            const first = expense.rows[0]
            const expanded = expandedExpenses.has(expense.key)
            const propertyNames = Array.from(new Set(expense.rows.map(row => row.propertyName)))
            const cadastralCodes = Array.from(new Set(expense.rows.map(row => row.cadastralCode).filter(code => code !== '—')))
            return <Fragment key={expense.key}><tr className="customer-portfolio-expense-row"><td><button type="button" onClick={() => toggleSet(setExpandedExpenses, expandedExpenses, expense.key)} aria-expanded={expanded}><span className="customer-portfolio-chevron">{expanded ? <ChevronDown /> : <ChevronRight />}</span>{propertyNames.length === 1 ? propertyNames[0] : `${propertyNames.length} inmuebles`}</button></td><td>{cadastralCodes.length === 1 ? cadastralCodes[0] : cadastralCodes.length ? 'Varios' : '—'}</td><td><strong>{first.receiptNumber}</strong></td><td>{first.issueDate}</td><td className="money-cell">{money(expense.total)}</td><td className="money-cell">{money(expense.cancelled)}</td><td className="money-cell balance">{money(expense.balance)}</td><td className="customer-portfolio-detail">{expense.detail}</td><td className="days-cell">{expense.overdueDays}</td></tr>{expanded && expense.rows.map(row => <DetailRow key={row.id} row={row} nested />)}</Fragment>
          })
          else body = group.rows.map(row => <DetailRow key={row.id} row={row} />)
          return <Fragment key={key}><tr className="customer-portfolio-client-row"><td colSpan={9}><button type="button" onClick={() => toggleSet(setExpandedClients, expandedClients, key)} aria-expanded={expanded}><span className="customer-portfolio-chevron">{expanded ? <ChevronDown /> : <ChevronRight />}</span><UsersRound /><span><strong>{group.name}</strong><small>{expenseGroups.length} {expenseGroups.length === 1 ? 'comprobante' : 'comprobantes'}</small></span></button></td></tr>{expanded && <>{body}<tr className="customer-portfolio-client-total"><td colSpan={6}>Saldo total de la deuda de {group.name}</td><td className="money-cell">{money(totals.balance)}</td><td colSpan={2} /></tr></>}</Fragment>
        })}
        {!groups.length && <tr><td colSpan={9}><div className="customer-portfolio-empty"><UsersRound /><strong>{hasGenerated ? 'No existe cartera para los filtros seleccionados' : 'Reporte pendiente de generar'}</strong><span>{hasGenerated ? 'Se muestran las obligaciones que mantienen saldo hasta la fecha de corte indicada.' : 'Selecciona los filtros y presiona Generar búsqueda para mostrar la información.'}</span></div></td></tr>}
      </tbody><tfoot><tr className="customer-portfolio-client-total customer-portfolio-grand-total"><td colSpan={6}>SALDO TOTAL</td><td className="money-cell">{money(portfolioBalance)}</td><td colSpan={2} /></tr></tfoot></table></div>
    </section>
  </div>
}
