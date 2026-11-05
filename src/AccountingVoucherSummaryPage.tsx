import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ArrowUpDown, Ban, ChevronRight, FileText, Pencil, Search } from 'lucide-react'
import { api } from './api'
import { readAccountingVouchers, voucherTypeLabels, type AccountingVoucherRecord } from './AccountingVoucherPage'
import { standardVoucherTypes } from './AccountingVoucherTypesPage'
import { formatFullDateInput, isoToDisplayDate } from './date-input'
import type { Context, ScreenSpec } from './types'

type SortKey = 'type' | 'number' | 'date' | 'contact' | 'detail' | 'total' | 'status' | 'modified' | 'user'
type Direction = 'asc' | 'desc'

function typeLabel(type: string) { return (voucherTypeLabels as Record<string, string>)[type] ?? type.toLocaleLowerCase('es').split('_').filter(Boolean).map(word => word.charAt(0).toLocaleUpperCase('es') + word.slice(1)).join(' ') }
function money(value: number) { return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) }
function isoDate(row: AccountingVoucherRecord) { const value = row.dateIso ?? row.date; const display = /^\d{2}\/\d{2}\/\d{4}$/.test(value); return display ? `${value.slice(6)}-${value.slice(3, 5)}-${value.slice(0, 2)}` : value }
function displayDate(row: AccountingVoucherRecord) { return isoToDisplayDate(isoDate(row)) }
function latestChange(row: AccountingVoucherRecord) { return String(row.annulledAt ?? row.eliminatedAt ?? row.updatedAt ?? row.createdAt ?? row.dateIso ?? row.date) }
function displayDateTime(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? isoToDisplayDate(value) : new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(parsed) }
function actor(row: AccountingVoucherRecord) { return String(row.annulledBy ?? row.eliminatedBy ?? row.modifiedBy ?? row.user ?? '—') }
function total(row: AccountingVoucherRecord) { return Number(row.total ?? row.debit ?? 0) }
function toDisplayDate(date: Date) { return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}` }
function toIso(value: string) { const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value); return match ? `${match[3]}-${match[2]}-${match[1]}` : '' }
function defaultDates() { const now = new Date(); const previousMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate(); const previous = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), previousMonthLastDay)); return { from: toDisplayDate(previous), to: toDisplayDate(now) } }

export function AccountingVoucherSummaryPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <AccountingVoucherSummaryManager key={context.data.company.id} screen={screen} context={context.data} />
}

function AccountingVoucherSummaryManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const defaults = defaultDates()
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [type, setType] = useState('TODOS')
  const [processed, setProcessed] = useState(false)
  const [rows, setRows] = useState<AccountingVoucherRecord[]>([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [direction, setDirection] = useState<Direction>('desc')
  const [error, setError] = useState('')
  const types = useMemo(() => Array.from(new Set([...standardVoucherTypes.map(row => row.code), ...rows.map(row => row.type)])).sort((left, right) => typeLabel(left).localeCompare(typeLabel(right), 'es')), [rows])

  const process = () => {
    const fromIso = toIso(from), toIsoValue = toIso(to)
    if (!fromIso || !toIsoValue) { setError('Ingresa fechas válidas con formato DD/MM/AAAA.'); return }
    if (fromIso > toIsoValue) { setError('Fecha Desde no puede ser posterior a Fecha Hasta.'); return }
    setRows(readAccountingVouchers(context.company.id).filter(row => { const date = isoDate(row); return date >= fromIso && date <= toIsoValue && (type === 'TODOS' || row.type === type) })); setProcessed(true); setError('')
  }
  const rowValue = (row: AccountingVoucherRecord, key: SortKey) => key === 'type' ? typeLabel(row.type) : key === 'number' ? row.number : key === 'date' ? isoDate(row) : key === 'contact' ? row.contactName ?? '' : key === 'detail' ? row.description : key === 'total' ? total(row) : key === 'status' ? row.status : key === 'modified' ? latestChange(row) : actor(row)
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return rows.filter(row => !term || [typeLabel(row.type), row.number, displayDate(row), row.contactName, row.description, money(total(row)), row.status, displayDateTime(latestChange(row)), actor(row)].join(' ').toLocaleLowerCase('es').includes(term)).sort((left, right) => { const a = rowValue(left, sortKey), b = rowValue(right, sortKey); const comparison = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'es', { numeric: true }); return direction === 'asc' ? comparison : -comparison })
  }, [rows, search, sortKey, direction])
  const sort = (key: SortKey) => { if (sortKey === key) setDirection(current => current === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setDirection('asc') } }
  const SortIcon = ({ column }: { column: SortKey }) => sortKey !== column ? <ArrowUpDown /> : direction === 'asc' ? <ArrowUp /> : <ArrowDown />
  const edit = (row: AccountingVoucherRecord) => window.open(`/contabilidad/financiero/comprobantes-contables/modificacion-comp-contable?voucher=${encodeURIComponent(row.id)}`, '_blank', 'noopener,noreferrer')
  const annul = (row: AccountingVoucherRecord) => window.open(`/contabilidad/financiero/comprobantes-contables/anulacion-comp-contable?voucher=${encodeURIComponent(row.id)}`, '_blank', 'noopener,noreferrer')

  const headers: Array<[SortKey, string]> = [['type', 'Tipo Comprobante'], ['number', '# Comprobante'], ['date', 'Fecha Emisión'], ['contact', 'Proveedor/Cliente'], ['detail', 'Detalle'], ['total', 'Total'], ['status', 'Estado'], ['modified', 'Última Modificación'], ['user', 'Usuario']]
  return <div className="page screen-page voucher-summary-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div></section>
    <section className="voucher-summary-filters"><div><label><span>Fecha Desde</span><input inputMode="numeric" maxLength={10} value={from} onFocus={event => event.currentTarget.select()} onChange={event => setFrom(formatFullDateInput(event.target.value))} placeholder="DD/MM/AAAA" /></label><label><span>Fecha Hasta</span><input inputMode="numeric" maxLength={10} value={to} onFocus={event => event.currentTarget.select()} onChange={event => setTo(formatFullDateInput(event.target.value))} placeholder="DD/MM/AAAA" /></label><label><span>Tipo Comprobante</span><select value={type} onChange={event => setType(event.target.value)}><option value="TODOS">Todos</option>{types.map(value => <option key={value} value={value}>{typeLabel(value)}</option>)}</select></label><button type="button" onClick={process}>Procesar</button></div>{error && <p role="alert">{error}</p>}</section>
    <section className="voucher-summary-card"><header><label><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar en todos los campos" aria-label="Buscar en el resumen de comprobantes" /></label><div><span>{processed ? `${filtered.length} registros` : 'Reporte pendiente de procesar'}</span></div></header><div className="voucher-summary-table"><table><thead><tr><th data-export-skip="true">Acciones</th>{headers.map(([key, label]) => <th key={key}><button type="button" onClick={() => sort(key)}>{label}<SortIcon column={key} /></button></th>)}</tr></thead><tbody>{processed && filtered.map(row => { const actionable = row.status.toLocaleUpperCase('es') === 'AUTORIZADO' && Array.isArray(row.lines) && row.type !== 'ANULACION_COMP_CONTABLE'; return <tr key={row.id}><td data-export-skip="true"><div className="voucher-summary-actions"><button type="button" disabled={!actionable} onClick={() => edit(row)} title="Modificar comprobante" aria-label={`Modificar ${row.number}`}><Pencil /></button><button type="button" disabled={!actionable} onClick={() => annul(row)} title="Anular comprobante" aria-label={`Anular ${row.number}`}><Ban /></button></div></td><td>{typeLabel(row.type)}</td><td><strong>{row.number}</strong></td><td>{displayDate(row)}</td><td>{row.contactName || '—'}</td><td>{row.description || '—'}</td><td>{money(total(row))}</td><td><span className={`voucher-summary-status ${row.status.toLocaleLowerCase('es').replace(/\s+/g, '-')}`}>{row.status}</span></td><td>{displayDateTime(latestChange(row))}</td><td>{actor(row)}</td></tr> })}{!processed && <tr><td colSpan={10}><div className="voucher-summary-empty"><FileText /><strong>Reporte pendiente de procesar</strong><span>Configura los filtros y selecciona Procesar.</span></div></td></tr>}{processed && !filtered.length && <tr><td colSpan={10}><div className="voucher-summary-empty"><Search /><strong>Sin resultados</strong><span>No existen comprobantes para los filtros seleccionados.</span></div></td></tr>}</tbody></table></div></section>
  </div>
}
