import { useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Ban, ChevronRight, History, ShieldAlert } from 'lucide-react'
import { api } from './api'
import { readIssuedExpenses, voidIssuedExpenseRange, type IssuedExpenseRecord } from './expense-records'
import type { Context, ScreenSpec } from './types'

type MassVoidHistory = {
  id: string
  fromReceipt: string
  toReceipt: string
  voidedAt: string
  reason: string
  user: string
}

function historyKey(companyId: string) { return `saga.mass-expense-voids:${companyId}` }

function readHistory(companyId: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(historyKey(companyId)) ?? '[]')
    return (Array.isArray(saved) ? saved as MassVoidHistory[] : []).sort((left, right) => right.voidedAt.localeCompare(left.voidedAt))
  } catch { return [] }
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function MassExpenseVoidPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <MassExpenseVoidManager key={context.data.company.id} screen={screen} context={context.data} />
}

function MassExpenseVoidManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const [expenses, setExpenses] = useState<IssuedExpenseRecord[]>(() => readIssuedExpenses(context.company.id))
  const [history, setHistory] = useState<MassVoidHistory[]>(() => readHistory(context.company.id))
  const [fromReceipt, setFromReceipt] = useState('')
  const [toReceipt, setToReceipt] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const orderedExpenses = useMemo(() => expenses
    .filter(expense => expense.status === 'VIGENTE' || expense.status === 'ANULADA')
    .sort((left, right) => left.receiptNumber.localeCompare(right.receiptNumber, 'es', { numeric: true })), [expenses])
  const selectedRange = useMemo(() => {
    const fromIndex = orderedExpenses.findIndex(item => item.receiptNumber === fromReceipt)
    const toIndex = orderedExpenses.findIndex(item => item.receiptNumber === toReceipt)
    if (fromIndex < 0 || toIndex < 0) return []
    return orderedExpenses.slice(Math.min(fromIndex, toIndex), Math.max(fromIndex, toIndex) + 1)
  }, [fromReceipt, orderedExpenses, toReceipt])
  const pendingCount = selectedRange.filter(item => item.status === 'VIGENTE').length

  const requestVoid = (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (!fromReceipt || !toReceipt) { setError('Selecciona las expensas Desde y Hasta del rango.'); return }
    if (!reason.trim()) { setError('Ingresa el motivo de la anulación.'); return }
    if (reason.trim().length > 100) { setError('El motivo no puede superar los 100 caracteres.'); return }
    if (!pendingCount) { setError('El rango seleccionado no contiene expensas generadas pendientes de anular.'); return }
    setError('')
    setConfirmationOpen(true)
  }

  const confirmVoid = () => {
    const result = voidIssuedExpenseRange(context.company.id, fromReceipt, toReceipt, context.actor.name)
    if (!result.count) { setConfirmationOpen(false); setError('No fue posible anular expensas en el rango seleccionado.'); return }
    const record: MassVoidHistory = { id: crypto.randomUUID(), fromReceipt, toReceipt, voidedAt: new Date().toISOString(), reason: reason.trim(), user: context.actor.name }
    const nextHistory = [record, ...history].sort((left, right) => right.voidedAt.localeCompare(left.voidedAt))
    localStorage.setItem(historyKey(context.company.id), JSON.stringify(nextHistory))
    setExpenses(result.records)
    setHistory(nextHistory)
    setFromReceipt('')
    setToReceipt('')
    setReason('')
    setConfirmationOpen(false)
    setMessage(`Se anularon ${result.count} expensas del rango seleccionado.`)
  }

  return <div className="page screen-page mass-expense-void-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Proceso de expensas</b></div><h1>{screen.titulo_original}</h1></div></section>

    <form className="mass-void-form" onSubmit={requestVoid}>
      <header><span><ShieldAlert /></span><div><h2>Anular rango de expensas</h2><small>Selecciona un rango inclusivo de comprobantes y registra el motivo de la anulación.</small></div></header>
      <div className="mass-void-fields">
        <fieldset><legend>Rango Expensas</legend><label><span>Desde</span><select value={fromReceipt} disabled={!orderedExpenses.length} onChange={event => { setFromReceipt(event.target.value); setError('') }}><option value="">Seleccionar</option>{orderedExpenses.map(item => <option key={`from-${item.id}`} value={item.receiptNumber}>{item.receiptNumber} · {item.status === 'ANULADA' ? 'Anulada' : 'Generada'}</option>)}</select></label><label><span>Hasta</span><select value={toReceipt} disabled={!orderedExpenses.length} onChange={event => { setToReceipt(event.target.value); setError('') }}><option value="">Seleccionar</option>{orderedExpenses.map(item => <option key={`to-${item.id}`} value={item.receiptNumber}>{item.receiptNumber} · {item.status === 'ANULADA' ? 'Anulada' : 'Generada'}</option>)}</select></label></fieldset>
        <label className="mass-void-reason"><span>Motivo <b>Obligatorio</b></span><input value={reason} maxLength={100} onChange={event => { setReason(event.target.value); setError('') }} placeholder="Motivo de la anulación" /><small>{reason.length}/100 caracteres</small></label>
        <button type="submit" className="mass-void-submit" disabled={!orderedExpenses.length}><Ban />Anular Expensas</button>
      </div>
      {!orderedExpenses.length && <div className="mass-void-notice"><AlertTriangle />No existen expensas generadas para seleccionar.</div>}
      {error && <div className="mass-void-error" role="alert"><AlertTriangle />{error}</div>}
      {message && <div className="mass-void-success" role="status">{message}</div>}
    </form>

    <section className="mass-void-history"><header><div><h2>Histórico de Anulaciones Masivas</h2><span>Procesos registrados desde el más reciente.</span></div></header><div><table><thead><tr><th>Rango Expensas</th><th>Fecha de Anulación</th><th>Motivo</th><th>Usuario</th></tr></thead><tbody>{history.map(item => <tr key={item.id}><td><strong>{item.fromReceipt}</strong><span>hasta</span><strong>{item.toReceipt}</strong></td><td>{displayDate(item.voidedAt)}</td><td>{item.reason}</td><td>{item.user}</td></tr>)}{!history.length && <tr><td colSpan={4}><div className="mass-void-empty"><History /><strong>No existen anulaciones masivas</strong><span>Los rangos anulados aparecerán en esta tabla.</span></div></td></tr>}</tbody></table></div></section>

    {confirmationOpen && <div className="mass-void-backdrop" role="presentation" onMouseDown={() => setConfirmationOpen(false)}><section className="mass-void-confirm" role="alertdialog" aria-modal="true" aria-labelledby="mass-void-title" onMouseDown={event => event.stopPropagation()}><span><AlertTriangle /></span><h2 id="mass-void-title">Confirmar anulación masiva</h2><p>Se anularán <strong>{pendingCount} expensas</strong> entre <strong>{fromReceipt}</strong> y <strong>{toReceipt}</strong>.</p><small>Las expensas permanecerán en Consulta General con estado Anulada.</small><div><button type="button" onClick={() => setConfirmationOpen(false)}>Cancelar</button><button type="button" className="confirm" onClick={confirmVoid}><Ban />Confirmar Anulación</button></div></section></div>}
  </div>
}
