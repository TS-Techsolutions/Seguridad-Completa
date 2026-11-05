import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronRight, ExternalLink, FileX2, RotateCcw, Scale, X } from 'lucide-react'
import { api } from './api'
import { accountingVoucherStorageKey, getNextVoucherNumber, readAccountingVouchers, voucherTypeLabels, type AccountingVoucherLine, type AccountingVoucherRecord } from './AccountingVoucherPage'
import { standardVoucherTypes } from './AccountingVoucherTypesPage'
import { dateInputToIsoOrDraft, formatFullDateInput, isoToDisplayDate } from './date-input'
import { validateOperationDate } from './operation-date-rules'
import { SearchableDatalistInput } from './SearchableDatalistInput'
import type { Context, ScreenSpec } from './types'

function typeLabel(type: string) { return (voucherTypeLabels as Record<string, string>)[type] ?? type.toLocaleLowerCase('es').split('_').filter(Boolean).map(word => word.charAt(0).toLocaleUpperCase('es') + word.slice(1)).join(' ') }
function voucherLabel(row: AccountingVoucherRecord) { return `${row.number} · ${isoToDisplayDate(row.dateIso ?? row.date)} · ${row.description || typeLabel(row.type)}` }
function money(value: number) { return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) }
function todayDisplay() { const now = new Date(); return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}` }

type AnnulmentGuide = { title: string; route?: string; message: string }
function specificAnnulmentGuide(type: string): AnnulmentGuide | null {
  if (type === 'DEPOSITO') return { title: 'Anulación de Depósito', route: '/bancos/depositos/anulacion-de-deposito', message: 'El depósito debe anularse desde su proceso operativo para liberar las recaudaciones y generar correctamente el asiento de reverso.' }
  if (type === 'RECAUDACION') return { title: 'Anulación de Recaudación', route: '/cxc/recaudaciones/anulacion-de-recaudacion', message: 'La recaudación debe anularse desde su proceso operativo para devolver los valores a cartera y anular los anticipos relacionados.' }
  if (type === 'CRUCE_ANTICIPO_CLIENTE') return { title: 'Anulación Cruce de Anticipo Clientes', route: '/cxc/ajustes/anulacion-cruce-de-anticipos-clientes', message: 'El cruce debe anularse desde su proceso operativo para liberar nuevamente los anticipos y documentos de cartera.' }
  if (type === 'EGRESO' || type.startsWith('COMPRA_')) return { title: 'Anulación de Egreso', route: '/bancos/egresos/anulacion-de-egreso', message: 'El egreso debe anularse desde su proceso operativo para liberar facturas, anticipos y el documento bancario correspondiente.' }
  if (type === 'EXPENSA') return { title: 'Consulta General de Expensas', route: '/administracion-inmuebles/expensas/consulta-general', message: 'La expensa debe anularse desde el proceso de Expensas para actualizar su estado, la cartera del cliente y el asiento contable relacionado.' }
  if (type.startsWith('ANULACION_')) return { title: 'Comprobante de anulación', message: 'Este comprobante ya corresponde a un reverso. No se permite generar una segunda anulación contable desde esta pantalla.' }
  return null
}

export function AccountingVoucherAnnulmentPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <AccountingVoucherAnnulmentManager key={context.data.company.id} screen={screen} context={context.data} />
}

function AccountingVoucherAnnulmentManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const storageKey = accountingVoucherStorageKey(context.company.id)
  const [rows, setRows] = useState<AccountingVoucherRecord[]>(() => readAccountingVouchers(context.company.id))
  const available = rows.filter(row => row.status.toLocaleUpperCase('es') === 'AUTORIZADO' && Array.isArray(row.lines) && row.type !== 'ANULACION_COMP_CONTABLE')
  const requestedId = new URLSearchParams(window.location.search).get('voucher') ?? ''
  const requested = available.find(row => row.id === requestedId)
  const requestedGuide = requested ? specificAnnulmentGuide(requested.type) : null
  const types = useMemo(() => Array.from(new Set([...standardVoucherTypes.map(row => row.code), ...available.map(row => row.type)])).filter(type => type !== 'ANULACION_COMP_CONTABLE').sort((left, right) => typeLabel(left).localeCompare(typeLabel(right), 'es')), [rows])
  const [type, setType] = useState(requested?.type ?? '')
  const [voucherInput, setVoucherInput] = useState(requested ? voucherLabel(requested) : '')
  const [voucherId, setVoucherId] = useState(requested?.id ?? '')
  const [editing, setEditing] = useState(Boolean(requested && !requestedGuide))
  const [date, setDate] = useState(todayDisplay())
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [processAlert, setProcessAlert] = useState<AnnulmentGuide | null>(requestedGuide)
  const filtered = available.filter(row => row.type === type).sort((left, right) => (right.dateIso ?? right.date).localeCompare(left.dateIso ?? left.date))
  const selected = available.find(row => row.id === voucherId)
  const reversedLines: AccountingVoucherLine[] = (selected?.lines ?? []).map(line => ({ ...line, id: crypto.randomUUID(), debit: Number(line.credit || 0), credit: Number(line.debit || 0), description: `Anulación ${selected?.number}: ${line.description}` }))
  const total = reversedLines.reduce((sum, line) => sum + Number(line.debit || 0), 0)

  const changeType = (value: string) => { setType(value); setVoucherInput(''); setVoucherId(''); setError(''); setMessage('') }
  const chooseVoucher = (value: string) => { const row = filtered.find(item => voucherLabel(item) === value); setVoucherInput(value); setVoucherId(row?.id ?? ''); setProcessAlert(row ? specificAnnulmentGuide(row.type) : null); setError('') }
  const start = () => { if (!selected) { setError('Selecciona el # Comprobante que deseas anular.'); return }; const guide = specificAnnulmentGuide(selected.type); if (guide) { setProcessAlert(guide); return }; setEditing(true); setDate(todayDisplay()); setReason(''); setConfirmed(false); setError('') }
  const close = () => { setEditing(false); setReason(''); setConfirmed(false); setError('') }
  const generate = () => {
    if (!selected) { setError('No se encontró el comprobante original.'); return }
    const guide = specificAnnulmentGuide(selected.type)
    if (guide) { setProcessAlert(guide); setEditing(false); return }
    const dateIso = dateInputToIsoOrDraft(date)
    const dateError = validateOperationDate(dateIso)
    if (dateError) { setError(dateError); return }
    if (!reason.trim()) { setError('Ingresa el motivo de la anulación.'); return }
    if (!confirmed) { setError('Confirma que comprendes el impacto del reverso contable.'); return }
    const debit = reversedLines.reduce((sum, line) => sum + line.debit, 0)
    const credit = reversedLines.reduce((sum, line) => sum + line.credit, 0)
    if (!reversedLines.length || Math.abs(debit - credit) >= .005 || debit <= 0) { setError('Asiento no Cuadra. El reverso contable no puede ser generado.'); return }
    const now = new Date().toISOString()
    const reversalId = crypto.randomUUID()
    const reversalNumber = getNextVoucherNumber(rows, 'ANULACION_COMP_CONTABLE', undefined, context.company.id)
    const original: AccountingVoucherRecord = { ...selected, status: 'ANULADO', annulledAt: now, annulledBy: context.actor.name, annulmentReason: reason.trim(), reversalVoucherId: reversalId, reversalVoucherNumber: reversalNumber }
    const reversal: AccountingVoucherRecord = { id: reversalId, number: reversalNumber, date: dateIso, dateIso, type: 'ANULACION_COMP_CONTABLE', description: reason.trim(), debit: debit.toFixed(2), credit: credit.toFixed(2), total: debit, status: 'AUTORIZADO', contactId: selected.contactId, contactName: selected.contactName, contactKind: selected.contactKind, lines: reversedLines, manualEntry: true, user: context.actor.name, createdAt: now, updatedAt: now, annulsVoucherId: selected.id, annulledVoucherNumber: selected.number, documentStatus: 'ANULADO' }
    const next = [reversal, original, ...rows.filter(row => row.id !== selected.id)]
    setRows(next); localStorage.setItem(storageKey, JSON.stringify(next)); setEditing(false); setType(''); setVoucherInput(''); setVoucherId(''); setMessage(`${selected.number} fue anulado. Se generó el reverso ${reversalNumber}.`); setError(''); window.open(`/vista-previa/comprobantes-contables/${encodeURIComponent(reversalId)}`, '_blank', 'noopener,noreferrer')
  }

  if (!editing) return <div className="page screen-page voucher-reprint-page voucher-annulment-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header voucher-reprint-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div></section>
    {message && <div className="voucher-feedback"><CheckCircle2 />{message}</div>}{error && <div className="voucher-reprint-feedback" role="alert"><AlertTriangle />{error}</div>}
    {processAlert && <div className="voucher-process-alert-backdrop" role="presentation"><section className="voucher-process-alert" role="alertdialog" aria-modal="true" aria-labelledby="voucher-process-alert-title"><button type="button" className="voucher-process-alert-close" onClick={() => setProcessAlert(null)} aria-label="Cerrar alerta"><X /></button><AlertTriangle /><div><span>Proceso de anulación específico</span><h2 id="voucher-process-alert-title">Utiliza {processAlert.title}</h2><p>{processAlert.message}</p><p>El reverso contable aislado queda bloqueado para evitar inconsistencias entre contabilidad, cartera y el proceso de origen.</p></div><footer><button type="button" className="quiet-button" onClick={() => setProcessAlert(null)}>Cerrar</button>{processAlert.route && <button type="button" className="voucher-annulment-action" onClick={() => window.open(processAlert.route, '_blank', 'noopener,noreferrer')}><ExternalLink />Ir a {processAlert.title}</button>}</footer></section></div>}
    <section className="voucher-reprint-card"><header><FileX2 /><strong>Anulación de Comprobante Contable</strong></header><div className="voucher-reprint-fields"><label><span>Tipo de Comprobante</span><select value={type} onChange={event => changeType(event.target.value)}><option value="">Seleccionar tipo</option>{types.map(value => <option key={value} value={value}>{typeLabel(value)}</option>)}</select></label><label><span># Comprobante</span><SearchableDatalistInput disabled={!type} list="voucher-annulment-options" value={voucherInput} onChange={event => chooseVoucher(event.target.value)} onClear={() => chooseVoucher('')} clearLabel="Borrar comprobante" placeholder={type ? 'Escribe para filtrar los comprobantes' : 'Primero selecciona el tipo'} /><datalist id="voucher-annulment-options">{filtered.map(row => <option key={row.id} value={voucherLabel(row)} />)}</datalist></label><button type="button" className="voucher-annulment-action" disabled={!selected} onClick={start}><FileX2 />Anular</button></div><footer><RotateCcw /><span>{selected ? `Se construirá el reverso contable de ${selected.number}.` : `${available.length} comprobantes autorizados disponibles para anular.`}</span></footer></section>
  </div>

  return <div className="page screen-page accounting-voucher-page voucher-annulment-editor">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div></section>
    <section className="voucher-editor-actions"><button type="button" className="voucher-save-draft" onClick={close}><X />Cancelar</button><button type="button" className="voucher-annulment-action" onClick={generate}><FileX2 />Generar Anulación</button></section>
    {error && <div className="voucher-error" role="alert"><AlertTriangle />{error}</div>}
    <section className="voucher-data-card"><header><div><FileX2 /><span><h2>Datos de la Anulación</h2><p>El original se conservará y se generará un comprobante reverso.</p></span></div><button type="button" onClick={close} aria-label="Cerrar anulación"><X /></button></header><div className="voucher-data-grid"><label><span># Comprobante Original</span><input readOnly value={selected?.number ?? ''} /></label><label><span>Tipo</span><input readOnly value={selected ? typeLabel(selected.type) : ''} /></label><label><span>Fecha Efectiva <b>Obligatorio</b></span><input inputMode="numeric" maxLength={10} value={date} onFocus={event => event.currentTarget.select()} onChange={event => setDate(formatFullDateInput(event.target.value))} placeholder="DD/MM/AAAA" /></label><label><span>Proveedor/Cliente</span><input readOnly value={selected?.contactName ?? '—'} /></label><label className="wide"><span>Motivo <b>Obligatorio</b></span><textarea rows={2} maxLength={180} value={reason} onChange={event => { setReason(event.target.value); setError('') }} /></label><label><span>Total Reverso</span><input readOnly value={money(total)} /></label></div><label className="voucher-annulment-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>Confirmo que la anulación publicará un asiento reverso y conservará el comprobante original.</span></label></section>
    <section className="voucher-accounting-card"><nav><button type="button" className="active"><Scale />Contabilidad</button></nav><div className="voucher-accounting-toolbar"><div><strong>Asiento Reverso</strong><span>Debe y Haber se intercambian respecto del comprobante original.</span></div></div><div className="voucher-accounting-table"><table><thead><tr><th>Cuenta Contable</th><th>Contacto</th><th>Debe</th><th>Haber</th><th>Descripción</th></tr></thead><tbody>{reversedLines.map(line => <tr key={line.id}><td>{line.accountCode}</td><td>{line.contactName || selected?.contactName || '—'}</td><td>{line.debit ? money(line.debit) : '—'}</td><td>{line.credit ? money(line.credit) : '—'}</td><td>{line.description}</td></tr>)}</tbody><tfoot><tr><td colSpan={2}>Totales</td><td>{money(total)}</td><td>{money(total)}</td><td>Asiento cuadrado</td></tr></tfoot></table></div></section>
  </div>
}
