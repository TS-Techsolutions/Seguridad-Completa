import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, HandCoins, RotateCcw, Search, X } from 'lucide-react'
import { api } from './api'
import { ensureCustomerAdvances, type CustomerAdvanceRecord } from './customer-advance-records'
import type { CustomerRow } from './CustomerRegistryPage'
import { formatFullDateInput } from './date-input'
import type { Context, ScreenSpec } from './types'

const allOption = 'Todos'

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim()
}

function todayDisplay() {
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
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

function money(value: number) {
  return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function SearchableCustomer({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(true)
  const uniqueOptions = useMemo(() => Array.from(new Set([allOption, ...options])).sort((left, right) => left === allOption ? -1 : right === allOption ? 1 : left.localeCompare(right, 'es')), [options])
  const visible = showAll ? uniqueOptions : uniqueOptions.filter(option => normalize(option).includes(normalize(value)))
  return <label className="advance-report-filter"><span>Cliente</span><div className="advance-report-combo" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false) }}>
    <input role="combobox" aria-label="Cliente" aria-expanded={open} value={value} onFocus={event => { event.currentTarget.select(); setOpen(true); setShowAll(true) }} onChange={event => { onChange(event.target.value); setOpen(true); setShowAll(false) }} placeholder="Escribe para filtrar clientes" />
    {value && <button type="button" className="advance-report-combo-clear" aria-label="Borrar Cliente" onMouseDown={event => event.preventDefault()} onClick={() => { onChange(''); setOpen(true); setShowAll(true) }}><X /></button>}
    <button type="button" className="advance-report-combo-toggle" aria-label="Desplegar Cliente" onMouseDown={event => event.preventDefault()} onClick={() => { setOpen(current => !current); setShowAll(true) }}><ChevronDown className={open ? 'open' : ''} /></button>
    {open && <div className="advance-report-options" role="listbox">{visible.map(option => <button type="button" role="option" aria-selected={normalize(option) === normalize(value)} key={option} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(option); setOpen(false); setShowAll(true) }}>{option}</button>)}{!visible.length && <span>Sin coincidencias</span>}</div>}
  </div></label>
}

export function CustomerAdvanceBalanceReportPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <CustomerAdvanceBalanceReportManager key={context.data.company.id} screen={screen} context={context.data} />
}

function CustomerAdvanceBalanceReportManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const customers = useMemo(() => readJson<CustomerRow[]>('saga.customers', []).filter(customer => customer.state === 'ACTIVO').sort((a, b) => a.businessName.localeCompare(b.businessName, 'es')), [])
  const [draftCutoff, setDraftCutoff] = useState(todayDisplay)
  const [draftCustomer, setDraftCustomer] = useState(allOption)
  const [cutoff, setCutoff] = useState(todayDisplay)
  const [customer, setCustomer] = useState(allOption)
  const [error, setError] = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)
  const advances = ensureCustomerAdvances(context.company.id)
  const rows = useMemo(() => {
    if (!hasGenerated) return []
    const cutoffDate = dateValue(cutoff, true)
    if (!cutoffDate) return []
    return advances.filter(record => {
      const issuedAt = dateValue(record.issueDate || record.createdAt)
      const annulledAt = record.annulledAt ? dateValue(record.annulledAt) : null
      const matchesDate = Boolean(issuedAt && issuedAt.getTime() <= cutoffDate.getTime() && (!annulledAt || annulledAt.getTime() > cutoffDate.getTime()))
      const matchesCustomer = normalize(customer) === normalize(allOption) || normalize(record.customerName) === normalize(customer)
      return matchesDate && matchesCustomer
    }).map(record => {
      const annulledAt = record.annulledAt ? dateValue(record.annulledAt) : null
      return annulledAt && annulledAt.getTime() > cutoffDate.getTime() ? { ...record, balance: record.originalAmount } : record
    }).sort((left, right) => (dateValue(right.issueDate)?.getTime() ?? 0) - (dateValue(left.issueDate)?.getTime() ?? 0) || left.customerName.localeCompare(right.customerName, 'es'))
  }, [advances, cutoff, customer, hasGenerated])
  const totals = rows.reduce((result, row) => ({ value: result.value + row.originalAmount, applied: result.applied + Math.max(0, row.originalAmount - row.balance), balance: result.balance + row.balance }), { value: 0, applied: 0, balance: 0 })

  const runSearch = () => {
    if (!dateValue(draftCutoff)) { setError('Ingresa una Fecha de Corte válida en formato DD/MM/AAAA.'); return }
    const selected = draftCustomer || allOption
    if (normalize(selected) !== normalize(allOption) && !customers.some(item => normalize(item.businessName) === normalize(selected))) { setError('Selecciona un Cliente de la lista o utiliza Todos.'); return }
    setCutoff(draftCutoff); setCustomer(selected); setHasGenerated(true); setError('')
  }

  const clear = () => {
    const today = todayDisplay()
    setDraftCutoff(today); setDraftCustomer(allOption); setCutoff(today); setCustomer(allOption); setHasGenerated(false); setError('')
  }

  return <div className="page screen-page advance-balance-report-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Cuentas por Cobrar</b></div><h1>{screen.titulo_original}</h1></div></section>
    <section className="panel advance-report-filters" aria-label="Filtros de anticipos">
      <label className="advance-report-filter"><span>Fecha de Corte</span><input aria-label="Fecha de Corte" inputMode="numeric" maxLength={10} value={draftCutoff} onChange={event => setDraftCutoff(formatFullDateInput(event.target.value))} placeholder="DD/MM/AAAA" /></label>
      <SearchableCustomer value={draftCustomer} options={customers.map(item => item.businessName)} onChange={setDraftCustomer} />
      <div className="advance-report-actions"><button type="button" className="quiet-button" onClick={clear}><RotateCcw />Limpiar</button><button type="button" className="primary-action" onClick={runSearch}><Search />Generar búsqueda</button></div>
      {error && <div className="advance-report-error" role="alert">{error}</div>}
    </section>
    <section className="panel advance-report-results">
      <header><div><h2>Saldo de Anticipos de Clientes</h2><span>{rows.length} {rows.length === 1 ? 'anticipo' : 'anticipos'} al {cutoff}</span></div><strong>{money(totals.balance)}<small>Saldo disponible</small></strong></header>
      <div className="advance-report-table"><table><thead><tr><th>Fecha Emisión</th><th>Cliente</th><th>Tipo Anticipo</th><th>Descripción</th><th>Recaudación</th><th>Valor Anticipo</th><th>Aplicado</th><th>Saldo</th></tr></thead><tbody>{rows.map((row: CustomerAdvanceRecord) => { const applied = Math.max(0, row.originalAmount - row.balance); return <tr key={row.id}><td>{row.issueDate || '—'}</td><td><strong>{row.customerName}</strong></td><td>{row.typeName || '—'}</td><td>{row.description || '—'}</td><td>{row.collectionNumber || '—'}</td><td className="advance-money">{money(row.originalAmount)}</td><td className="advance-money">{money(applied)}</td><td className="advance-money balance">{money(row.balance)}</td></tr>})}{!rows.length && <tr><td colSpan={8}><div className="advance-report-empty"><HandCoins /><strong>{hasGenerated ? 'No existen anticipos para los filtros seleccionados' : 'Reporte pendiente de generar'}</strong><span>{hasGenerated ? 'Se mostrarán los anticipos vigentes hasta la Fecha de Corte indicada.' : 'Selecciona los filtros y presiona Generar búsqueda para mostrar la información.'}</span></div></td></tr>}</tbody><tfoot><tr><td colSpan={5}>Totales</td><td>{money(totals.value)}</td><td>{money(totals.applied)}</td><td>{money(totals.balance)}</td></tr></tfoot></table></div>
    </section>
  </div>
}
