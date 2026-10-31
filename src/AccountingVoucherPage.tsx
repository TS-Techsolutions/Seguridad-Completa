import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronRight, FileText, Plus, Save } from 'lucide-react'
import { api } from './api'
import type { Context, ScreenSpec } from './types'
import { readOperationStartDate, validateOperationDate } from './operation-date-rules'
import { dateInputToIsoOrDraft, isoToDisplayDate } from './date-input'

type VoucherType = 'ASIENTO_INICIAL' | 'DIARIO' | 'INGRESO' | 'EGRESO' | 'AJUSTE' | 'EXPENSA'
type VoucherRow = { id: string; number: string; date: string; type: VoucherType; description: string; debit: string; credit: string; status: string }

const legacyStorageKey = 'saga.accounting.vouchers.v3'
const typeLabels: Record<VoucherType, string> = { ASIENTO_INICIAL: 'Asiento Inicial', DIARIO: 'Diario', INGRESO: 'Ingreso', EGRESO: 'Egreso', AJUSTE: 'Ajuste', EXPENSA: 'Expensa' }

export function accountingVoucherStorageKey(companyId: string) { return `${legacyStorageKey}:${companyId}` }

function readRows(companyId: string) {
  try {
    const key = accountingVoucherStorageKey(companyId)
    const scoped = localStorage.getItem(key)
    if (scoped) { const rows = JSON.parse(scoped); return Array.isArray(rows) ? rows as VoucherRow[] : [] }
    if (companyId === 'cmp-demo-ecuador') {
      const legacy = JSON.parse(localStorage.getItem(legacyStorageKey) ?? '[]')
      const rows = Array.isArray(legacy) ? legacy as VoucherRow[] : []
      localStorage.setItem(key, JSON.stringify(rows))
      return rows
    }
    return []
  } catch { return [] }
}

export function AccountingVoucherPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <AccountingVoucherManager key={context.data.company.id} screen={screen} company={context.data.company} />
}

function AccountingVoucherManager({ screen, company }: { screen: ScreenSpec; company: Context['company'] }) {
  const storageKey = accountingVoucherStorageKey(company.id)
  const [rows, setRows] = useState<VoucherRow[]>(() => readRows(company.id))
  const [creating, setCreating] = useState(false)
  const [type, setType] = useState<VoucherType>('DIARIO')
  const [date, setDate] = useState(readOperationStartDate)
  const [description, setDescription] = useState('')
  const [debit, setDebit] = useState('0.00')
  const [credit, setCredit] = useState('0.00')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const startDate = readOperationStartDate()

  const save = (event: FormEvent) => {
    event.preventDefault()
    const dateError = validateOperationDate(date, type === 'ASIENTO_INICIAL')
    if (dateError) { setError(dateError); return }
    if (!description.trim()) { setError('Ingresa la descripción del comprobante.'); return }
    if (Number(debit) <= 0 || Number(debit) !== Number(credit)) { setError('Los débitos y créditos deben ser iguales y mayores a cero.'); return }
    const row: VoucherRow = { id: crypto.randomUUID(), number: `BOR-${String(rows.length + 1).padStart(5, '0')}`, date, type, description: description.trim(), debit, credit, status: 'BORRADOR' }
    const next = [row, ...rows]
    setRows(next); localStorage.setItem(storageKey, JSON.stringify(next)); setCreating(false); setError(''); setMessage('Comprobante guardado como borrador.')
  }

  return <div className="page screen-page accounting-voucher-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div><button className="primary-action" type="button" onClick={() => { setCreating(true); setMessage(''); setError('') }}><Plus />Nuevo comprobante</button></section>
    <div className="voucher-rule"><FileText /><div><strong>Inicio de Operaciones: {isoToDisplayDate(startDate)}</strong><span>Todos los procesos respetan esta fecha. Solo el tipo Asiento Inicial admite una fecha del mes calendario anterior.</span></div></div>
    {message && <div className="voucher-feedback"><CheckCircle2 />{message}</div>}
    {creating && <form className="panel voucher-form" onSubmit={save}><header><h2>Datos del comprobante</h2><span>Nuevo borrador</span></header>{error && <div className="voucher-error" role="alert"><AlertTriangle />{error}</div>}<div className="voucher-form-grid">
      <label>Tipo contable <span>Obligatorio</span><select value={type} onChange={event => { setType(event.target.value as VoucherType); setError('') }}>{Object.entries(typeLabels).filter(([value]) => value !== 'EXPENSA').map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Fecha <span>Obligatorio</span><input inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={isoToDisplayDate(date)} onChange={event => { setDate(dateInputToIsoOrDraft(event.target.value)); setError('') }} /></label>
      <label className="wide">Descripción <span>Obligatorio</span><textarea rows={3} value={description} onChange={event => { setDescription(event.target.value); setError('') }} /></label>
      <label>Débitos <span>Obligatorio</span><input inputMode="decimal" value={debit} onChange={event => setDebit(event.target.value.replace(',','.').replace(/[^\d.]/g,''))} /></label>
      <label>Créditos <span>Obligatorio</span><input inputMode="decimal" value={credit} onChange={event => setCredit(event.target.value.replace(',','.').replace(/[^\d.]/g,''))} /></label>
    </div><footer><button type="button" className="quiet-button" onClick={() => setCreating(false)}>Cancelar</button><button className="primary-action"><Save />Guardar borrador</button></footer></form>}
    <section className="panel voucher-list"><header><div><h2>Comprobantes contables</h2><span>{rows.length} registros</span></div></header><div className="hr-table"><table><thead><tr><th>Número</th><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Débitos</th><th>Créditos</th><th>Estado</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.number}</strong></td><td>{row.date}</td><td>{typeLabels[row.type]}</td><td>{row.description}</td><td>{row.debit}</td><td>{row.credit}</td><td>{row.status}</td></tr>)}{!rows.length && <tr><td colSpan={7}><div className="voucher-empty"><FileText /><strong>Sin comprobantes registrados</strong><span>Selecciona Nuevo comprobante para crear el primer borrador.</span></div></td></tr>}</tbody></table></div></section>
  </div>
}
