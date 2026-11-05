import { Fragment, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, GitCompareArrows, RotateCcw, Search, X } from 'lucide-react'
import { api } from './api'
import { ensureCustomerAdvances } from './customer-advance-records'
import { readAuthorizedCustomerAdvanceCrossings, type AuthorizedCustomerAdvanceCrossing } from './customer-advance-crossing-records'
import { ensureCustomerReceivables } from './customer-receivables'
import type { CustomerRow } from './CustomerRegistryPage'
import { formatFullDateInput } from './date-input'
import type { Context, ScreenSpec } from './types'

const allOption = 'Todos'
type DetailRow = { id: string; kind: 'ANTICIPO' | 'DOCUMENTO'; document: string; date: string; description: string; value: number }
type ReportRow = { record: AuthorizedCustomerAdvanceCrossing; advances: DetailRow[]; documents: DetailRow[]; advanceTotal: number; documentTotal: number }

function readJson<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback } }
function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim() }
function money(value: number) { return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) }
function dateValue(value: string, endOfDay = false) { const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value); if (!match) return null; const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0); return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[1]) ? date : null }
function dateDisplay(date: Date) { return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) }
function initialDates() { const today = new Date(); return { from: dateDisplay(new Date(today.getFullYear(), today.getMonth(), 1)), to: dateDisplay(today) } }

function SearchableCombo({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(true)
  const unique = useMemo(() => Array.from(new Set([allOption, ...options])).sort((a, b) => a === allOption ? -1 : b === allOption ? 1 : a.localeCompare(b, 'es')), [options])
  const visible = showAll ? unique : unique.filter(option => normalize(option).includes(normalize(value)))
  return <label className="collection-report-filter"><span>{label}</span><div className="collection-report-combo" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false) }}><input role="combobox" aria-label={label} aria-expanded={open} value={value} onFocus={event => { event.currentTarget.select(); setOpen(true); setShowAll(true) }} onChange={event => { onChange(event.target.value); setOpen(true); setShowAll(false) }} placeholder={`Escribe para filtrar ${label.toLocaleLowerCase('es')}`} />{value && <button type="button" className="collection-report-combo-clear" aria-label={`Borrar ${label}`} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(''); setOpen(true); setShowAll(true) }}><X /></button>}<button type="button" className="collection-report-combo-toggle" aria-label={`Desplegar ${label}`} onMouseDown={event => event.preventDefault()} onClick={() => { setOpen(current => !current); setShowAll(true) }}><ChevronDown /></button>{open && <div className="collection-report-options" role="listbox">{visible.map(option => <button type="button" key={option} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(option); setOpen(false); setShowAll(true) }}>{option}</button>)}{!visible.length && <span>Sin coincidencias</span>}</div>}</div></label>
}

export function CustomerAdvanceCrossingReportPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <CustomerAdvanceCrossingReportManager key={context.data.company.id} screen={screen} context={context.data} />
}

function CustomerAdvanceCrossingReportManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const dates = useMemo(initialDates, [])
  const crossings = useMemo(() => readAuthorizedCustomerAdvanceCrossings(context.company.id), [context.company.id])
  const customers = useMemo(() => readJson<CustomerRow[]>('saga.customers', []).filter(row => row.state === 'ACTIVO').sort((a, b) => a.businessName.localeCompare(b.businessName, 'es')), [])
  const advances = useMemo(() => ensureCustomerAdvances(context.company.id), [context.company.id])
  const receivables = useMemo(() => ensureCustomerReceivables(context.company.id), [context.company.id])
  const [draftFrom, setDraftFrom] = useState(dates.from)
  const [draftTo, setDraftTo] = useState(dates.to)
  const [draftCustomer, setDraftCustomer] = useState(allOption)
  const [draftNumber, setDraftNumber] = useState(allOption)
  const [filters, setFilters] = useState({ from: dates.from, to: dates.to, customer: allOption, number: allOption })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [hasGenerated, setHasGenerated] = useState(false)
  const [error, setError] = useState('')

  const numberOptions = useMemo(() => crossings.filter(row => normalize(draftCustomer || allOption) === normalize(allOption) || normalize(row.customerName) === normalize(draftCustomer)).map(row => row.number).sort((a, b) => b.localeCompare(a, 'es', { numeric: true })), [crossings, draftCustomer])
  const rows = useMemo(() => {
    if (!hasGenerated) return []
    const from = dateValue(filters.from)
    const to = dateValue(filters.to, true)
    if (!from || !to) return []
    return crossings.filter(record => { const issued = dateValue(record.date); return Boolean(issued && issued.getTime() >= from.getTime() && issued.getTime() <= to.getTime() && (normalize(filters.customer) === normalize(allOption) || normalize(record.customerName) === normalize(filters.customer)) && (normalize(filters.number) === normalize(allOption) || normalize(record.number) === normalize(filters.number))) }).map(record => {
      const advanceRows = record.payload.selectedAdvanceIds.map(id => { const source = advances.find(row => row.id === id); const line = record.payload.accountingLines.find(row => row.id === `advance-${id}`); return { id: `a-${id}`, kind: 'ANTICIPO' as const, document: source?.collectionNumber ?? 'Anticipo', date: source?.issueDate ?? '—', description: source ? `${source.typeName} · ${source.description}` : line?.description ?? '—', value: Number(line?.debit ?? 0) } })
      const documentRows = record.payload.selectedReceivableIds.map(id => { const source = receivables.find(row => row.id === id); const line = record.payload.accountingLines.find(row => row.id === `receivable-${id}`); return { id: `d-${id}`, kind: 'DOCUMENTO' as const, document: source?.receiptNumber ?? 'Expensa/Factura', date: source?.issueDate ?? '—', description: line?.description ?? record.detail ?? '—', value: Number(line?.credit ?? 0) } })
      return { record, advances: advanceRows, documents: documentRows, advanceTotal: Number(advanceRows.reduce((sum, row) => sum + row.value, 0).toFixed(2)), documentTotal: Number(documentRows.reduce((sum, row) => sum + row.value, 0).toFixed(2)) }
    }).sort((a, b) => (dateValue(b.record.date)?.getTime() ?? 0) - (dateValue(a.record.date)?.getTime() ?? 0) || b.record.number.localeCompare(a.record.number, 'es', { numeric: true }))
  }, [advances, crossings, filters, hasGenerated, receivables])

  const runSearch = () => {
    const from = dateValue(draftFrom); const to = dateValue(draftTo, true)
    if (!from || !to) { setError('Ingresa las fechas Desde y Hasta en formato DD/MM/AAAA.'); return }
    if (from.getTime() > to.getTime()) { setError('La Fecha Desde no puede ser posterior a la Fecha Hasta.'); return }
    const customer = draftCustomer || allOption; const number = draftNumber || allOption
    if (normalize(customer) !== normalize(allOption) && !customers.some(row => normalize(row.businessName) === normalize(customer))) { setError('Selecciona un Cliente de la lista o utiliza Todos.'); return }
    if (normalize(number) !== normalize(allOption) && !numberOptions.some(item => normalize(item) === normalize(number))) { setError('Selecciona un número de Cruce válido para el cliente indicado.'); return }
    setFilters({ from: draftFrom, to: draftTo, customer, number }); setHasGenerated(true); setExpanded(new Set()); setError('')
  }
  const clear = () => { const reset = initialDates(); setDraftFrom(reset.from); setDraftTo(reset.to); setDraftCustomer(allOption); setDraftNumber(allOption); setFilters({ from: reset.from, to: reset.to, customer: allOption, number: allOption }); setHasGenerated(false); setExpanded(new Set()); setError('') }
  const changeCustomer = (value: string) => { setDraftCustomer(value); setDraftNumber(allOption) }
  const toggle = (id: string) => setExpanded(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const grandTotal = rows.reduce((sum, row) => sum + row.record.total, 0)

  return <div className="page screen-page collection-report-page advance-crossing-report-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div><section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Cuentas por Cobrar</b></div><h1>{screen.titulo_original}</h1></div></section>
    <section className="panel collection-report-filters" aria-label="Filtros de cruces de anticipos"><label className="collection-report-filter"><span>Fecha Desde</span><input aria-label="Fecha Desde" inputMode="numeric" maxLength={10} value={draftFrom} onChange={event => setDraftFrom(formatFullDateInput(event.target.value))} placeholder="DD/MM/AAAA" /></label><label className="collection-report-filter"><span>Fecha Hasta</span><input aria-label="Fecha Hasta" inputMode="numeric" maxLength={10} value={draftTo} onChange={event => setDraftTo(formatFullDateInput(event.target.value))} placeholder="DD/MM/AAAA" /></label><SearchableCombo label="Cliente" value={draftCustomer} options={customers.map(row => row.businessName)} onChange={changeCustomer} /><SearchableCombo label="# Cruce" value={draftNumber} options={numberOptions} onChange={setDraftNumber} /><div className="collection-report-actions"><button type="button" className="quiet-button" onClick={clear}><RotateCcw />Limpiar</button><button type="button" className="primary-action" onClick={runSearch}><Search />Generar búsqueda</button></div>{error && <div className="collection-report-error" role="alert">{error}</div>}</section>
    <section className="panel collection-report-results"><header><div><h2>Cruces de Anticipos Clientes</h2><span>{rows.length} {rows.length === 1 ? 'cruce encontrado' : 'cruces encontrados'} · {filters.from} al {filters.to}</span></div><strong>{money(grandTotal)}<small>Total cruzado</small></strong></header><div className="collection-report-table"><table><thead><tr><th># Cruce</th><th>Fecha Emisión</th><th>Cliente</th><th>Descripción</th><th>Anticipos</th><th>Expensas/Facturas</th><th>Total</th></tr></thead><tbody>{rows.map(row => { const open = expanded.has(row.record.id); const details = [...row.advances, ...row.documents]; return <Fragment key={row.record.id}><tr className="collection-report-main-row"><td><button type="button" onClick={() => toggle(row.record.id)} aria-expanded={open}><span>{open ? <ChevronDown /> : <ChevronRight />}</span><strong>{row.record.number}</strong></button></td><td>{row.record.date}</td><td>{row.record.customerName}</td><td>{row.record.detail || '—'}</td><td className="collection-report-money">{money(row.advanceTotal)}</td><td className="collection-report-money">{money(row.documentTotal)}</td><td className="collection-report-money total">{money(row.record.total)}</td></tr>{open && <tr className="collection-report-detail-row" data-excel-export-skip="true"><td colSpan={7}><div><header><strong>Detalle de Anticipos y Expensas/Facturas cruzadas</strong><span>{details.length} {details.length === 1 ? 'línea' : 'líneas'}</span></header><table><thead><tr><th>Tipo</th><th>Documento</th><th>Fecha</th><th>Descripción</th><th>Valor</th></tr></thead><tbody>{details.map(detail => <tr key={detail.id}><td><span className={`collection-report-kind ${detail.kind === 'ANTICIPO' ? 'anticipo' : 'documento'}`}>{detail.kind === 'ANTICIPO' ? 'Anticipo' : 'Expensa/Factura'}</span></td><td><strong>{detail.document}</strong></td><td>{detail.date}</td><td>{detail.description}</td><td className="collection-report-money">{money(detail.value)}</td></tr>)}</tbody><tfoot><tr><td colSpan={4}>Total Cruce</td><td>{money(row.record.total)}</td></tr></tfoot></table></div></td></tr>}</Fragment> })}{!rows.length && <tr><td colSpan={7}><div className="collection-report-empty"><GitCompareArrows /><strong>{hasGenerated ? 'No existen cruces para los filtros seleccionados' : 'Reporte pendiente de generar'}</strong><span>{hasGenerated ? 'Ajusta el rango de fechas, cliente o número de cruce.' : 'Selecciona los filtros y presiona Generar búsqueda para mostrar la información.'}</span></div></td></tr>}</tbody><tfoot>{rows.length > 0 && <tr><td colSpan={6}>TOTAL</td><td className="collection-report-money total">{money(grandTotal)}</td></tr>}</tfoot></table></div></section>
  </div>
}
