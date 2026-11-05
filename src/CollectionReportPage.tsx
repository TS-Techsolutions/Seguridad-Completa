import { Fragment, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Banknote, ChevronDown, ChevronRight, RotateCcw, Search, X } from 'lucide-react'
import { api } from './api'
import { readAuthorizedCollections, type AuthorizedCollection } from './collection-records'
import type { CustomerRow } from './CustomerRegistryPage'
import { formatFullDateInput } from './date-input'
import type { Context, ScreenSpec } from './types'

const allOption = 'Todos'

type CollectionReportRow = {
  record: AuthorizedCollection
  cash: number
  check: number
  transfer: number
  deposit: number
  card: number
}

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim()
}

function dateValue(value: string, endOfDay = false) {
  const display = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (display) {
    const date = new Date(Number(display[3]), Number(display[2]) - 1, Number(display[1]), endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
    return date.getFullYear() === Number(display[3]) && date.getMonth() === Number(display[2]) - 1 && date.getDate() === Number(display[1]) ? date : null
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function dateDisplay(date: Date) {
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function initialDates() {
  const today = new Date()
  const previousMonthDays = new Date(today.getFullYear(), today.getMonth(), 0).getDate()
  const previous = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    Math.min(today.getDate(), previousMonthDays),
  )
  return { from: dateDisplay(previous), to: dateDisplay(today) }
}

function money(value: number) {
  return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function SearchableCombo({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(true)
  const unique = useMemo(() => Array.from(new Set([allOption, ...options])).sort((left, right) => left === allOption ? -1 : right === allOption ? 1 : left.localeCompare(right, 'es')), [options])
  const visible = showAll ? unique : unique.filter(option => normalize(option).includes(normalize(value)))
  return <label className="collection-report-filter"><span>{label}</span><div className="collection-report-combo" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false) }}>
    <input role="combobox" aria-label={label} aria-expanded={open} aria-autocomplete="list" value={value} onFocus={event => { event.currentTarget.select(); setOpen(true); setShowAll(true) }} onChange={event => { onChange(event.target.value); setOpen(true); setShowAll(false) }} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }} placeholder={`Escribe para filtrar ${label.toLocaleLowerCase('es')}`} />
    {value && <button type="button" className="collection-report-combo-clear" aria-label={`Borrar ${label}`} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(''); setOpen(true); setShowAll(true) }}><X /></button>}
    <button type="button" className="collection-report-combo-toggle" aria-label={`Desplegar ${label}`} onMouseDown={event => event.preventDefault()} onClick={() => { setOpen(current => !current); setShowAll(true) }}><ChevronDown className={open ? 'open' : ''} /></button>
    {open && <div className="collection-report-options" role="listbox" aria-label={`Opciones de ${label}`}>{visible.map(option => <button type="button" role="option" aria-selected={normalize(option) === normalize(value)} key={option} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(option); setOpen(false); setShowAll(true) }}>{option}</button>)}{!visible.length && <span>Sin coincidencias</span>}</div>}
  </div></label>
}

function paymentTotal(record: AuthorizedCollection, type: AuthorizedCollection['payload']['paymentMethods'][number]['type']) {
  return Number((record.payload.paymentMethods ?? []).filter(method => method.saved && method.type === type).reduce((sum, method) => sum + Number(method.value || 0), 0).toFixed(2))
}

function buildRow(record: AuthorizedCollection): CollectionReportRow {
  return {
    record,
    cash: paymentTotal(record, 'EFECTIVO'),
    check: paymentTotal(record, 'CHEQUE'),
    transfer: paymentTotal(record, 'TRANSFERENCIA'),
    deposit: paymentTotal(record, 'DEPOSITO'),
    card: paymentTotal(record, 'TARJETA_CREDITO'),
  }
}

export function CollectionReportPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <CollectionReportManager key={context.data.company.id} screen={screen} context={context.data} />
}

function CollectionReportManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const dates = useMemo(initialDates, [])
  const collections = useMemo(() => readAuthorizedCollections(context.company.id), [context.company.id])
  const customers = useMemo(() => readJson<CustomerRow[]>('saga.customers', []).sort((left, right) => left.businessName.localeCompare(right.businessName, 'es')), [])
  const [draftFrom, setDraftFrom] = useState(dates.from)
  const [draftTo, setDraftTo] = useState(dates.to)
  const [draftCustomer, setDraftCustomer] = useState(allOption)
  const [draftNumber, setDraftNumber] = useState(allOption)
  const [filters, setFilters] = useState({ from: dates.from, to: dates.to, customer: allOption, number: allOption })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)

  const numberOptions = useMemo(() => collections
    .filter(record => normalize(draftCustomer || allOption) === normalize(allOption) || normalize(record.customerName) === normalize(draftCustomer))
    .map(record => record.number)
    .sort((left, right) => right.localeCompare(left, 'es', { numeric: true })), [collections, draftCustomer])

  const rows = useMemo(() => {
    if (!hasGenerated) return []
    const from = dateValue(filters.from)
    const to = dateValue(filters.to, true)
    if (!from || !to) return []
    return collections.filter(record => {
      const issued = dateValue(record.issueDate)
      return Boolean(issued && issued.getTime() >= from.getTime() && issued.getTime() <= to.getTime()
        && (normalize(filters.customer) === normalize(allOption) || normalize(record.customerName) === normalize(filters.customer))
        && (normalize(filters.number) === normalize(allOption) || normalize(record.number) === normalize(filters.number)))
    }).map(buildRow).sort((left, right) => (dateValue(right.record.issueDate)?.getTime() ?? 0) - (dateValue(left.record.issueDate)?.getTime() ?? 0) || right.record.number.localeCompare(left.record.number, 'es', { numeric: true }))
  }, [collections, filters, hasGenerated])
  const totals = useMemo(() => rows.reduce((result, row) => ({
    cash: result.cash + row.cash,
    check: result.check + row.check,
    transfer: result.transfer + row.transfer,
    deposit: result.deposit + row.deposit,
    card: result.card + row.card,
    total: result.total + row.record.total,
  }), { cash: 0, check: 0, transfer: 0, deposit: 0, card: 0, total: 0 }), [rows])

  const runSearch = () => {
    const from = dateValue(draftFrom)
    const to = dateValue(draftTo, true)
    if (!from || !to) { setError('Ingresa las fechas Desde y Hasta en formato DD/MM/AAAA.'); return }
    if (from.getTime() > to.getTime()) { setError('La Fecha Desde no puede ser posterior a la Fecha Hasta.'); return }
    const customer = draftCustomer || allOption
    const number = draftNumber || allOption
    if (normalize(customer) !== normalize(allOption) && !customers.some(item => normalize(item.businessName) === normalize(customer))) { setError('Selecciona un Cliente de la lista o utiliza Todos.'); return }
    if (normalize(number) !== normalize(allOption) && !numberOptions.some(item => normalize(item) === normalize(number))) { setError('Selecciona una Recaudación válida para el cliente indicado.'); return }
    setFilters({ from: draftFrom, to: draftTo, customer, number }); setHasGenerated(true); setExpanded(new Set()); setError('')
  }

  const clear = () => {
    const reset = initialDates()
    setDraftFrom(reset.from); setDraftTo(reset.to); setDraftCustomer(allOption); setDraftNumber(allOption)
    setFilters({ from: reset.from, to: reset.to, customer: allOption, number: allOption }); setHasGenerated(false); setExpanded(new Set()); setError('')
  }

  const changeCustomer = (customer: string) => { setDraftCustomer(customer); setDraftNumber(allOption) }
  const toggle = (id: string) => setExpanded(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })

  return <div className="page screen-page collection-report-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Cuentas por Cobrar</b></div><h1>{screen.titulo_original}</h1></div></section>

    <section className="panel collection-report-filters" aria-label="Filtros de recaudaciones">
      <label className="collection-report-filter"><span>Fecha Desde</span><input aria-label="Fecha Desde" inputMode="numeric" maxLength={10} value={draftFrom} onChange={event => setDraftFrom(formatFullDateInput(event.target.value))} placeholder="DD/MM/AAAA" /></label>
      <label className="collection-report-filter"><span>Fecha Hasta</span><input aria-label="Fecha Hasta" inputMode="numeric" maxLength={10} value={draftTo} onChange={event => setDraftTo(formatFullDateInput(event.target.value))} placeholder="DD/MM/AAAA" /></label>
      <SearchableCombo label="Cliente" value={draftCustomer} options={customers.map(customer => customer.businessName)} onChange={changeCustomer} />
      <SearchableCombo label="# Recaudación" value={draftNumber} options={numberOptions} onChange={setDraftNumber} />
      <div className="collection-report-actions"><button type="button" className="quiet-button" onClick={clear}><RotateCcw />Limpiar</button><button type="button" className="primary-action" onClick={runSearch}><Search />Generar búsqueda</button></div>
      {error && <div className="collection-report-error" role="alert">{error}</div>}
    </section>

    <section className="panel collection-report-results">
      <header><div><h2>Recaudaciones</h2><span>{rows.length} {rows.length === 1 ? 'recaudación encontrada' : 'recaudaciones encontradas'} · {filters.from} al {filters.to}</span></div><strong>{money(rows.reduce((sum, row) => sum + row.record.total, 0))}<small>Total recaudado</small></strong></header>
      <div className="collection-report-table"><table><thead><tr><th># Recaudación</th><th>Fecha Emisión</th><th>Clientes</th><th>Descripción</th><th>Efectivo</th><th>Cheque</th><th>Transferencia</th><th>Depósito</th><th>Tarjeta Crédito</th><th>Total</th></tr></thead><tbody>
        {rows.map(row => {
          const open = expanded.has(row.record.id)
          const values = row.record.payload.receiptValues ?? []
          return <Fragment key={row.record.id}>
            <tr className="collection-report-main-row"><td><button type="button" onClick={() => toggle(row.record.id)} aria-expanded={open}><span>{open ? <ChevronDown /> : <ChevronRight />}</span><strong>{row.record.number}</strong></button></td><td>{row.record.issueDate}</td><td>{row.record.customerName}</td><td>{row.record.payload.detail || '—'}</td><td className="collection-report-money">{money(row.cash)}</td><td className="collection-report-money">{money(row.check)}</td><td className="collection-report-money">{money(row.transfer)}</td><td className="collection-report-money">{money(row.deposit)}</td><td className="collection-report-money">{money(row.card)}</td><td className="collection-report-money total">{money(row.record.total)}</td></tr>
            {values.map(value => <tr key={`pdf-${row.record.id}-${value.id}`} hidden data-pdf-export-only="true"><td>Detalle</td><td>{value.kind === 'ANTICIPO' ? 'Anticipo' : 'Expensa/Factura'}</td><td>{value.document}</td><td>{value.detail || '—'}</td><td /><td /><td /><td /><td /><td>{money(value.value)}</td></tr>)}
            {open && <tr className="collection-report-detail-row" data-excel-export-skip="true" data-pdf-export-skip="true"><td colSpan={10}><div><header><strong>Detalle de valores cancelados y anticipos</strong><span>{values.length} {values.length === 1 ? 'línea' : 'líneas'}</span></header><table><thead><tr><th>Tipo</th><th>Expensa/Factura o Anticipo</th><th>Descripción</th><th>Valor</th></tr></thead><tbody>{values.map(value => <tr key={`${row.record.id}-${value.id}`}><td><span className={`collection-report-kind ${value.kind.toLocaleLowerCase('es')}`}>{value.kind === 'ANTICIPO' ? 'Anticipo' : 'Expensa/Factura'}</span></td><td><strong>{value.document}</strong></td><td>{value.detail || '—'}</td><td className="collection-report-money">{money(value.value)}</td></tr>)}{!values.length && <tr><td colSpan={4}>Esta recaudación no contiene un detalle histórico disponible.</td></tr>}</tbody><tfoot><tr><td colSpan={3}>Total Recaudación</td><td>{money(row.record.total)}</td></tr></tfoot></table></div></td></tr>}
          </Fragment>
        })}
        {!rows.length && <tr><td colSpan={10}><div className="collection-report-empty"><Banknote /><strong>{hasGenerated ? 'No existen recaudaciones para los filtros seleccionados' : 'Reporte pendiente de generar'}</strong><span>{hasGenerated ? 'Ajusta el rango de fechas, cliente o número de recaudación.' : 'Selecciona los filtros y presiona Generar búsqueda para mostrar la información.'}</span></div></td></tr>}
      </tbody><tfoot><tr hidden data-excel-export-only="true"><td>SUMATORIA</td><td /><td /><td /><td>{money(totals.cash)}</td><td>{money(totals.check)}</td><td>{money(totals.transfer)}</td><td>{money(totals.deposit)}</td><td>{money(totals.card)}</td><td>{money(totals.total)}</td></tr></tfoot></table></div>
    </section>
  </div>
}
