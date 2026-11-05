import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, GitBranch, RotateCcw, Search, X } from 'lucide-react'
import { api } from './api'
import { depositSelectionKey, readAnnulledDepositSelectionKeys } from './bank-deposit-annulment-records'
import { readAuthorizedBankDeposits } from './bank-deposit-records'
import { readAuthorizedCollections } from './collection-records'
import { formatFullDateInput } from './date-input'
import { readIssuedExpenses } from './expense-records'
import type { Context, ScreenSpec } from './types'

const allOption = 'Todos'

type FilterKind = 'ALL' | 'EXPENSE' | 'COLLECTION' | 'DEPOSIT'
type FilterOption = { id: string; label: string }
type TraceRow = {
  id: string
  documentId: string
  documentNumber: string
  collectionId: string
  collectionNumber: string
  depositId: string
  depositNumber: string
  documentDate: string
  collectionDate: string
  depositDate: string
}

function dateDisplay(date: Date) { return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) }
function dateValue(value: string, endOfDay = false) { const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value); if (!match) return null; const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0); return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[1]) ? date : null }
function initialDates() { const today = new Date(); const previousMonthDays = new Date(today.getFullYear(), today.getMonth(), 0).getDate(); const previous = new Date(today.getFullYear(), today.getMonth() - 1, Math.min(today.getDate(), previousMonthDays)); return { from: dateDisplay(previous), to: dateDisplay(today) } }

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim()
}

function uniqueOptions(options: FilterOption[]) {
  const seen = new Set<string>()
  return options.filter(option => {
    const key = normalize(option.label)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).sort((left, right) => left.label.localeCompare(right.label, 'es', { numeric: true }))
}

function SearchableFilter({ label, value, options, onChange }: { label: string; value: string; options: FilterOption[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(true)
  const labels = useMemo(() => [allOption, ...uniqueOptions(options).map(option => option.label)], [options])
  const visible = showAll ? labels : labels.filter(option => normalize(option).includes(normalize(value)))
  return <label className="tracking-filter"><span>{label}</span><div className="tracking-combo" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false) }}>
    <input role="combobox" aria-label={label} aria-expanded={open} aria-autocomplete="list" value={value} onFocus={event => { event.currentTarget.select(); setOpen(true); setShowAll(true) }} onChange={event => { onChange(event.target.value); setOpen(true); setShowAll(false) }} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }} placeholder={`Escribe para filtrar ${label.toLocaleLowerCase('es')}`} />
    {value && <button type="button" className="tracking-combo-clear" aria-label={`Borrar ${label}`} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(allOption); setOpen(true); setShowAll(true) }}><X /></button>}
    <button type="button" className="tracking-combo-toggle" aria-label={`Desplegar ${label}`} onMouseDown={event => event.preventDefault()} onClick={() => { setOpen(current => !current); setShowAll(true) }}><ChevronDown className={open ? 'open' : ''} /></button>
    {open && <div className="tracking-options" role="listbox" aria-label={`Opciones de ${label}`}>{visible.map(option => <button type="button" role="option" aria-selected={normalize(option) === normalize(value)} key={option} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(option); setOpen(false); setShowAll(true) }}>{option}</button>)}{!visible.length && <span>Sin coincidencias</span>}</div>}
  </div></label>
}

function buildTrackingData(companyId: string) {
  const expenses = readIssuedExpenses(companyId).filter(expense => !['ANULADA', 'BORRADA'].includes(expense.status))
  const collections = readAuthorizedCollections(companyId).filter(collection => collection.status === 'GENERADA')
  const deposits = readAuthorizedBankDeposits(companyId).filter(deposit => deposit.status !== 'ANULADO')
  const annulledSelections = readAnnulledDepositSelectionKeys(companyId)
  const linkedDocumentIds = new Set<string>()
  const rows: TraceRow[] = []

  collections.forEach(collection => {
    const deposit = deposits.find(candidate => candidate.payload.selectedCollectionIds.includes(collection.id)
      && !annulledSelections.has(depositSelectionKey(candidate.id, collection.id)))
    const values = collection.payload.receiptValues ?? []
    if (!values.length) {
      rows.push({ id: `collection:${collection.id}`, documentId: '', documentNumber: '-', collectionId: collection.id, collectionNumber: collection.number, depositId: deposit?.id ?? '', depositNumber: deposit?.number ?? '-', documentDate: '', collectionDate: collection.issueDate, depositDate: deposit?.date ?? '' })
      return
    }
    values.forEach(value => {
      if (value.kind === 'DOCUMENTO') linkedDocumentIds.add(value.id)
      rows.push({
        id: `${collection.id}:${value.kind}:${value.id}`,
        documentId: value.kind === 'DOCUMENTO' ? value.id : '',
        documentNumber: value.document || '-',
        collectionId: collection.id,
        collectionNumber: collection.number,
        depositId: deposit?.id ?? '',
        depositNumber: deposit?.number ?? '-',
        documentDate: expenses.find(expense => expense.id === value.id)?.issueDate ?? (value.kind === 'ANTICIPO' ? collection.issueDate : ''),
        collectionDate: collection.issueDate,
        depositDate: deposit?.date ?? '',
      })
    })
  })

  expenses.filter(expense => !linkedDocumentIds.has(expense.id)).forEach(expense => rows.push({
    id: `expense:${expense.id}`,
    documentId: expense.id,
    documentNumber: expense.receiptNumber,
    collectionId: '',
    collectionNumber: '-',
    depositId: '',
    depositNumber: '-',
    documentDate: expense.issueDate,
    collectionDate: '',
    depositDate: '',
  }))

  const expenseOptions = uniqueOptions([
    ...expenses.map(expense => ({ id: expense.id, label: `${expense.receiptNumber} - ${expense.businessName}` })),
    ...collections.flatMap(collection => (collection.payload.receiptValues ?? []).filter(value => value.kind === 'DOCUMENTO').map(value => ({ id: value.id, label: `${value.document} - ${collection.customerName}` }))),
  ])
  const collectionOptions = uniqueOptions(collections.map(collection => ({ id: collection.id, label: `${collection.number} - ${collection.issueDate} - ${collection.customerName}` })))
  const depositOptions = uniqueOptions(deposits.map(deposit => ({ id: deposit.id, label: `${deposit.number} - ${deposit.date} - ${deposit.detail || 'Sin detalle'}` })))

  return { rows, expenseOptions, collectionOptions, depositOptions }
}

export function CxcTrackingReportPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <CxcTrackingReportManager key={context.data.company.id} screen={screen} context={context.data} />
}

function CxcTrackingReportManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const data = useMemo(() => buildTrackingData(context.company.id), [context.company.id])
  const dates = useMemo(initialDates, [])
  const [expense, setExpense] = useState(allOption)
  const [collection, setCollection] = useState(allOption)
  const [deposit, setDeposit] = useState(allOption)
  const [from, setFrom] = useState(dates.from)
  const [to, setTo] = useState(dates.to)
  const [applied, setApplied] = useState<{ kind: FilterKind; id: string; from: string; to: string } | null>(null)
  const [error, setError] = useState('')

  const setExclusive = (kind: Exclude<FilterKind, 'ALL'>, value: string) => {
    if (kind === 'EXPENSE') { setExpense(value); setCollection(allOption); setDeposit(allOption) }
    if (kind === 'COLLECTION') { setExpense(allOption); setCollection(value); setDeposit(allOption) }
    if (kind === 'DEPOSIT') { setExpense(allOption); setCollection(allOption); setDeposit(value) }
    setError('')
  }

  const runSearch = () => {
    const fromDate = dateValue(from)
    const toDate = dateValue(to, true)
    if (!fromDate || !toDate) { setError('Ingresa Fecha Desde y Fecha Hasta en formato DD/MM/AAAA.'); return }
    if (fromDate.getTime() > toDate.getTime()) { setError('La Fecha Desde no puede ser posterior a la Fecha Hasta.'); return }
    const selections = [
      { kind: 'EXPENSE' as const, value: expense, options: data.expenseOptions },
      { kind: 'COLLECTION' as const, value: collection, options: data.collectionOptions },
      { kind: 'DEPOSIT' as const, value: deposit, options: data.depositOptions },
    ].filter(item => item.value && normalize(item.value) !== normalize(allOption))
    if (selections.length > 1) { setError('Selecciona solamente Expensa, Recaudación o Depósito.'); return }
    if (!selections.length) { setApplied({ kind: 'ALL', id: '', from, to }); setError(''); return }
    const selected = selections[0]
    const option = selected.options.find(item => normalize(item.label) === normalize(selected.value))
    if (!option) { setError(`Selecciona una opción válida en ${selected.kind === 'EXPENSE' ? 'Expensa' : selected.kind === 'COLLECTION' ? 'Recaudación' : 'Depósito'}.`); return }
    setApplied({ kind: selected.kind, id: option.id, from, to }); setError('')
  }

  const clear = () => { const reset = initialDates(); setExpense(allOption); setCollection(allOption); setDeposit(allOption); setFrom(reset.from); setTo(reset.to); setApplied(null); setError('') }
  const rows = useMemo(() => {
    if (!applied) return []
    const fromDate = dateValue(applied.from)
    const toDate = dateValue(applied.to, true)
    if (!fromDate || !toDate) return []
    const matchesDate = (row: TraceRow) => {
      const relevant = applied.kind === 'EXPENSE' ? [row.documentDate] : applied.kind === 'COLLECTION' ? [row.collectionDate] : applied.kind === 'DEPOSIT' ? [row.depositDate] : [row.documentDate, row.collectionDate, row.depositDate]
      return relevant.some(value => { const date = dateValue(value); return Boolean(date && date.getTime() >= fromDate.getTime() && date.getTime() <= toDate.getTime()) })
    }
    return data.rows.filter(row => matchesDate(row) && (applied.kind === 'EXPENSE' ? row.documentId === applied.id : applied.kind === 'COLLECTION' ? row.collectionId === applied.id : applied.kind === 'DEPOSIT' ? row.depositId === applied.id : true))
  }, [applied, data.rows])

  return <div className="page screen-page cxc-tracking-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Cuentas por Cobrar</b></div><h1>{screen.titulo_original}</h1></div></section>
    <section className="panel tracking-filters" aria-label="Filtros de seguimiento CxC">
      <SearchableFilter label="Expensa" value={expense} options={data.expenseOptions} onChange={value => setExclusive('EXPENSE', value)} />
      <SearchableFilter label="Recaudación" value={collection} options={data.collectionOptions} onChange={value => setExclusive('COLLECTION', value)} />
      <SearchableFilter label="Depósito" value={deposit} options={data.depositOptions} onChange={value => setExclusive('DEPOSIT', value)} />
      <label className="tracking-date-filter tracking-date-from"><span>Fecha Desde</span><input aria-label="Fecha Desde" inputMode="numeric" maxLength={10} value={from} onFocus={event => event.currentTarget.select()} onChange={event => { setFrom(formatFullDateInput(event.target.value)); setError('') }} placeholder="DD/MM/AAAA" /></label>
      <label className="tracking-date-filter tracking-date-to"><span>Fecha Hasta</span><input aria-label="Fecha Hasta" inputMode="numeric" maxLength={10} value={to} onFocus={event => event.currentTarget.select()} onChange={event => { setTo(formatFullDateInput(event.target.value)); setError('') }} placeholder="DD/MM/AAAA" /></label>
      <div className="tracking-actions"><button type="button" className="quiet-button" onClick={clear}><RotateCcw />Limpiar</button><button type="button" className="primary-action" onClick={runSearch}><Search />Generar búsqueda</button></div>
      {error && <div className="tracking-error" role="alert">{error}</div>}
    </section>
    <section className="panel tracking-results">
      <header><div><GitBranch /><span><h2>Seguimiento CxC</h2><p>{applied ? `${rows.length} ${rows.length === 1 ? 'relación encontrada' : 'relaciones encontradas'}` : 'Selecciona un filtro para consultar la trazabilidad'}</p></span></div></header>
      <div className="tracking-table"><table><thead><tr><th># Expensa/Factura</th><th># Recaudación</th><th># Depósito</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.documentNumber || '-'}</strong></td><td>{row.collectionNumber || '-'}</td><td>{row.depositNumber || '-'}</td></tr>)}{!rows.length && <tr><td colSpan={3}><div className="tracking-empty"><GitBranch /><strong>{applied ? 'No existe información relacionada' : 'Reporte pendiente de generar'}</strong><span>{applied ? 'No se encontraron vínculos para el filtro seleccionado.' : 'Selecciona Expensa, Recaudación o Depósito y presiona Generar búsqueda.'}</span></div></td></tr>}</tbody></table></div>
    </section>
  </div>
}
