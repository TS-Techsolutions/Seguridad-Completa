import { Fragment, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Clock3, RotateCcw, Search, X } from 'lucide-react'
import { api } from './api'
import { readAuthorizedCollectionAnnulments } from './collection-annulment-records'
import { readAuthorizedCollections } from './collection-records'
import type { CustomerRow } from './CustomerRegistryPage'
import { formatFullDateInput } from './date-input'
import { readIssuedExpenses } from './expense-records'
import type { Context, ScreenSpec } from './types'

type AgingRow = { id: string; customer: string; issueDate: string; number: string; value: number; collected: number; balance: number; days: number }
type AgingGroup = { customer: string; rows: AgingRow[]; buckets: number[]; total: number }
const allOption = 'Todos'

function readJson<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback } }
function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim() }
function money(value: number) { return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) }
function todayDisplay() { return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()) }
function dateValue(value: string, endOfDay = false) {
  const display = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (display) {
    const date = new Date(Number(display[3]), Number(display[2]) - 1, Number(display[1]), endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
    return date.getFullYear() === Number(display[3]) && date.getMonth() === Number(display[2]) - 1 && date.getDate() === Number(display[1]) ? date : null
  }
  const iso = new Date(value)
  return Number.isNaN(iso.getTime()) ? null : iso
}
function bucketIndex(days: number) { return days < 30 ? 0 : days < 60 ? 1 : days < 90 ? 2 : days < 120 ? 3 : days < 180 ? 4 : days < 365 ? 5 : 6 }

function buildRows(companyId: string, cutoff: string): AgingRow[] {
  const cutoffDate = dateValue(cutoff, true)
  if (!cutoffDate) return []
  const annulmentByCollection = new Map(readAuthorizedCollectionAnnulments(companyId).map(record => [record.payload.collectionId, record]))
  const activeAtCutoff = readAuthorizedCollections(companyId).filter(collection => {
    const issuedAt = dateValue(collection.issueDate)
    const annulment = annulmentByCollection.get(collection.id)
    const annulledAt = annulment ? dateValue(annulment.createdAt) : null
    return Boolean(issuedAt && issuedAt.getTime() <= cutoffDate.getTime() && (!annulledAt || annulledAt.getTime() > cutoffDate.getTime()))
  })
  const collectedByExpense = new Map<string, number>()
  activeAtCutoff.forEach(collection => (collection.payload.receiptValues ?? []).filter(value => value.kind === 'DOCUMENTO').forEach(value => {
    collectedByExpense.set(value.id, Number(((collectedByExpense.get(value.id) ?? 0) + Number(value.value || 0)).toFixed(2)))
  }))
  return readIssuedExpenses(companyId).flatMap(expense => {
    const issuedAt = dateValue(expense.issueDate)
    if (!issuedAt || issuedAt.getTime() > cutoffDate.getTime() || expense.status !== 'VIGENTE') return []
    const value = Number(Number(expense.total || 0).toFixed(2))
    const collected = Math.min(value, Number((collectedByExpense.get(expense.id) ?? 0).toFixed(2)))
    const balance = Number(Math.max(0, value - collected).toFixed(2))
    if (balance <= 0) return []
    const days = Math.max(0, Math.floor((cutoffDate.getTime() - issuedAt.getTime()) / 86_400_000))
    return [{ id: expense.id, customer: expense.businessName || 'Cliente sin nombre', issueDate: expense.issueDate, number: expense.receiptNumber, value, collected, balance, days }]
  }).sort((left, right) => left.customer.localeCompare(right.customer, 'es') || right.days - left.days)
}

function SearchableCustomer({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(true)
  const unique = useMemo(() => Array.from(new Set([allOption, ...options])).sort((a, b) => a === allOption ? -1 : b === allOption ? 1 : a.localeCompare(b, 'es')), [options])
  const visible = showAll ? unique : unique.filter(option => normalize(option).includes(normalize(value)))
  return <label className="aging-filter"><span>Cliente</span><div className="aging-combo" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false) }}><input role="combobox" aria-label="Cliente" aria-expanded={open} value={value} onFocus={event => { event.currentTarget.select(); setOpen(true); setShowAll(true) }} onChange={event => { onChange(event.target.value); setOpen(true); setShowAll(false) }} placeholder="Escribe para filtrar clientes" />{value && <button type="button" className="aging-combo-clear" aria-label="Borrar Cliente" onMouseDown={event => event.preventDefault()} onClick={() => { onChange(''); setOpen(true); setShowAll(true) }}><X /></button>}<button type="button" className="aging-combo-toggle" aria-label="Desplegar Cliente" onMouseDown={event => event.preventDefault()} onClick={() => { setOpen(current => !current); setShowAll(true) }}><ChevronDown className={open ? 'open' : ''} /></button>{open && <div className="aging-options" role="listbox">{visible.map(option => <button type="button" role="option" aria-selected={normalize(option) === normalize(value)} key={option} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(option); setOpen(false); setShowAll(true) }}>{option}</button>)}{!visible.length && <span>Sin coincidencias</span>}</div>}</div></label>
}

export function CustomerAgingReportPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <CustomerAgingReportManager key={context.data.company.id} screen={screen} context={context.data} />
}

function CustomerAgingReportManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const customers = useMemo(() => readJson<CustomerRow[]>('saga.customers', []).filter(customer => customer.state === 'ACTIVO').sort((a, b) => a.businessName.localeCompare(b.businessName, 'es')), [])
  const [draftCutoff, setDraftCutoff] = useState(todayDisplay)
  const [draftCustomer, setDraftCustomer] = useState(allOption)
  const [cutoff, setCutoff] = useState(todayDisplay)
  const [customer, setCustomer] = useState(allOption)
  const [error, setError] = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const rows = useMemo(() => hasGenerated ? buildRows(context.company.id, cutoff).filter(row => normalize(customer) === normalize(allOption) || normalize(row.customer) === normalize(customer)) : [], [context.company.id, cutoff, customer, hasGenerated])
  const groups = useMemo(() => {
    const grouped = new Map<string, AgingRow[]>()
    rows.forEach(row => grouped.set(row.customer, [...(grouped.get(row.customer) ?? []), row]))
    return Array.from(grouped.entries()).map(([name, customerRows]): AgingGroup => {
      const buckets = [0, 0, 0, 0, 0, 0, 0]
      customerRows.forEach(row => { buckets[bucketIndex(row.days)] += row.balance })
      return { customer: name, rows: customerRows, buckets: buckets.map(value => Number(value.toFixed(2))), total: Number(customerRows.reduce((sum, row) => sum + row.balance, 0).toFixed(2)) }
    }).sort((a, b) => a.customer.localeCompare(b.customer, 'es'))
  }, [rows])
  const bucketTotals = groups.reduce((totals, group) => totals.map((value, index) => value + group.buckets[index]), [0, 0, 0, 0, 0, 0, 0])
  const grandTotal = Number(groups.reduce((sum, group) => sum + group.total, 0).toFixed(2))

  const runSearch = () => {
    if (!dateValue(draftCutoff)) { setError('Ingresa una Fecha de Corte válida en formato DD/MM/AAAA.'); return }
    const selected = draftCustomer || allOption
    if (normalize(selected) !== normalize(allOption) && !customers.some(item => normalize(item.businessName) === normalize(selected))) { setError('Selecciona un Cliente de la lista o utiliza Todos.'); return }
    setCutoff(draftCutoff); setCustomer(selected); setHasGenerated(true); setExpanded(new Set()); setError('')
  }
  const clear = () => { const today = todayDisplay(); setDraftCutoff(today); setDraftCustomer(allOption); setCutoff(today); setCustomer(allOption); setHasGenerated(false); setExpanded(new Set()); setError('') }
  const toggle = (name: string) => setExpanded(current => { const next = new Set(current); if (next.has(name)) next.delete(name); else next.add(name); return next })

  return <div className="page screen-page customer-aging-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Cuentas por Cobrar</b></div><h1>{screen.titulo_original}</h1></div></section>
    <section className="panel aging-filters"><label className="aging-filter"><span>Fecha de Corte</span><input aria-label="Fecha de Corte" inputMode="numeric" maxLength={10} value={draftCutoff} onChange={event => setDraftCutoff(formatFullDateInput(event.target.value))} placeholder="DD/MM/AAAA" /></label><SearchableCustomer value={draftCustomer} options={customers.map(item => item.businessName)} onChange={setDraftCustomer} /><div className="aging-actions"><button type="button" className="quiet-button" onClick={clear}><RotateCcw />Limpiar</button><button type="button" className="primary-action" onClick={runSearch}><Search />Generar búsqueda</button></div>{error && <div className="aging-error" role="alert">{error}</div>}</section>
    <section className="panel aging-results"><header><div><h2>Antigüedad de Cartera</h2><span>{groups.length} {groups.length === 1 ? 'cliente' : 'clientes'} con deuda al {cutoff}</span></div><strong>{money(grandTotal)}<small>Saldo total</small></strong></header><div className="aging-table-wrap"><table><thead><tr><th>Cliente</th><th>30 D<small>0–29</small></th><th>60 D<small>30–59</small></th><th>90 D<small>60–89</small></th><th>120 D<small>90–119</small></th><th>180 D<small>120–179</small></th><th>365 D<small>180–364</small></th><th>+365 D<small>365 o más</small></th></tr></thead><tbody>{groups.map(group => { const open = expanded.has(group.customer); return <Fragment key={group.customer}><tr className="aging-client-row"><td><button type="button" onClick={() => toggle(group.customer)} aria-expanded={open}><span>{open ? <ChevronDown /> : <ChevronRight />}</span><strong>{group.customer}</strong></button></td>{group.buckets.map((value, index) => <td key={index}>{value ? money(value) : '—'}</td>)}</tr>{open && <tr className="aging-detail-row"><td colSpan={8}><div><table><thead><tr><th>Fecha</th><th># Expensa/Factura</th><th>Valor</th><th>Cobrado</th><th>Saldo</th><th>Días Vencidos</th></tr></thead><tbody>{group.rows.map(row => <tr key={row.id}><td>{row.issueDate}</td><td><strong>{row.number}</strong></td><td>{money(row.value)}</td><td>{money(row.collected)}</td><td>{money(row.balance)}</td><td>{row.days}</td></tr>)}</tbody><tfoot><tr><td colSpan={4}>Total de la Deuda</td><td>{money(group.total)}</td><td /></tr></tfoot></table></div></td></tr>}</Fragment>})}{!groups.length && <tr><td colSpan={8}><div className="aging-empty"><Clock3 /><strong>{hasGenerated ? 'No existe cartera para los filtros seleccionados' : 'Reporte pendiente de generar'}</strong><span>{hasGenerated ? 'Se mostrarán las obligaciones con saldo clasificadas por días vencidos.' : 'Selecciona los filtros y presiona Generar búsqueda para mostrar la información.'}</span></div></td></tr>}</tbody><tfoot><tr><td><strong>SALDO TOTAL</strong><small>{money(grandTotal)}</small></td>{bucketTotals.map((value, index) => <td key={index}>{money(value)}</td>)}</tr></tfoot></table></div></section>
  </div>
}
