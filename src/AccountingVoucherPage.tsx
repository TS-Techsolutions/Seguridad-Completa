import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, CheckCircle2, ChevronRight, FileText, Pencil, Plus, Save, Scale, Trash2, X } from 'lucide-react'
import { api } from './api'
import type { CustomerRow } from './CustomerRegistryPage'
import type { Context, ScreenSpec } from './types'
import { dateInputToIsoOrDraft, formatFullDateInput, isoToDisplayDate } from './date-input'
import { validateOperationDate } from './operation-date-rules'
import { SearchableDatalistInput } from './SearchableDatalistInput'
import { configuredVoucherStart } from './document-sequences'
import { DocumentEditorHeader } from './DocumentEditorHeader'

export type VoucherType = 'ASIENTO_INICIAL' | 'DIARIO' | 'INGRESO' | 'EGRESO' | 'AJUSTE' | 'EXPENSA' | 'RECAUDACION' | 'DEPOSITO' | 'ANULACION_COMP_CONTABLE' | 'ANULACION_DEPOSITO' | 'ANULACION_RECAUDACION' | 'CRUCE_ANTICIPO_CLIENTE' | 'ANULACION_CRUCE_ANTICIPO_CLIENTE' | 'COMPRA_EMPLEADOS' | 'COMPRA_CAJA_CHICA' | 'COMPRA_DEVOLUCION_CLIENTE' | 'COMPRA_PROVEEDORES' | 'ANULACION_EGRESO_EFECTIVO' | 'ANULACION_EGRESO_CHEQUE' | 'ANULACION_EGRESO_DEBITO' | 'ANULACION_EGRESO_TARJETA_CREDITO' | 'ANULACION_EGRESO_TRANSFERENCIA' | 'AJUSTE_CARTERA'
export type AccountingVoucherLine = { id: string; accountCode: string; contactId: string; contactName: string; debit: number; credit: number; description: string }
export type AccountingVoucherRecord = {
  id: string; number: string; date: string; dateIso?: string; type: VoucherType | string; description: string; debit: string; credit: string; total?: number; status: string
  contactId?: string; contactName?: string; contactKind?: 'CLIENTE' | 'PROVEEDOR'; lines?: AccountingVoucherLine[]; manualEntry?: boolean; user?: string; createdAt?: string; updatedAt?: string
  [key: string]: unknown
}

type Account = { Codigo: string; 'Descripción': string; Tipo: string; Estado: string }
type ContactOption = { key: string; id: string; name: string; identification: string; kind: 'CLIENTE' | 'PROVEEDOR' }

const legacyStorageKey = 'saga.accounting.vouchers.v3'
const accountPlanKey = 'saga.accounting.plan'
const customerKey = 'saga.customers'
const providerKey = 'saga.providers'

export const voucherTypeLabels: Record<VoucherType, string> = { ASIENTO_INICIAL: 'Asiento Inicial', DIARIO: 'Diario', INGRESO: 'Ingreso', EGRESO: 'Egreso', AJUSTE: 'Ajuste', EXPENSA: 'Expensa', RECAUDACION: 'Recaudación', DEPOSITO: 'Depósito', ANULACION_COMP_CONTABLE: 'Anulación Comprobante Contable', ANULACION_DEPOSITO: 'Anulación Depósito', ANULACION_RECAUDACION: 'Anulación Recaudación', CRUCE_ANTICIPO_CLIENTE: 'Cruce Anticipo Cliente', ANULACION_CRUCE_ANTICIPO_CLIENTE: 'Anulación Cruce de Anticipo Clientes', COMPRA_EMPLEADOS: 'Compra – Empleados', COMPRA_CAJA_CHICA: 'Compra – Caja Chica', COMPRA_DEVOLUCION_CLIENTE: 'Compra – Devolución Cliente', COMPRA_PROVEEDORES: 'Compra – Proveedores', ANULACION_EGRESO_EFECTIVO: 'Anulación Egreso – Efectivo', ANULACION_EGRESO_CHEQUE: 'Anulación Egreso – Cheque', ANULACION_EGRESO_DEBITO: 'Anulación Egreso – Débito', ANULACION_EGRESO_TARJETA_CREDITO: 'Anulación Egreso – Tarjeta de Crédito', ANULACION_EGRESO_TRANSFERENCIA: 'Anulación Egreso – Transferencia', AJUSTE_CARTERA: 'Ajuste de Cartera' }
export const voucherPrefixes: Record<VoucherType, string> = { ASIENTO_INICIAL: 'AIN', DIARIO: 'DIA', INGRESO: 'ING', EGRESO: 'EGR', AJUSTE: 'AJU', EXPENSA: 'EXP', RECAUDACION: 'REC', DEPOSITO: 'DEP', ANULACION_COMP_CONTABLE: 'ANC', ANULACION_DEPOSITO: 'AND', ANULACION_RECAUDACION: 'ANR', CRUCE_ANTICIPO_CLIENTE: 'CAC', ANULACION_CRUCE_ANTICIPO_CLIENTE: 'ACA', COMPRA_EMPLEADOS: 'CEM', COMPRA_CAJA_CHICA: 'CCC', COMPRA_DEVOLUCION_CLIENTE: 'CDC', COMPRA_PROVEEDORES: 'CPR', ANULACION_EGRESO_EFECTIVO: 'AEE', ANULACION_EGRESO_CHEQUE: 'AEC', ANULACION_EGRESO_DEBITO: 'AED', ANULACION_EGRESO_TARJETA_CREDITO: 'AET', ANULACION_EGRESO_TRANSFERENCIA: 'ATR', AJUSTE_CARTERA: 'AJC' }

export function accountingVoucherStorageKey(companyId: string) { return `${legacyStorageKey}:${companyId}` }
export function readAccountingVouchers(companyId: string): AccountingVoucherRecord[] {
  try {
    const key = accountingVoucherStorageKey(companyId)
    const scoped = localStorage.getItem(key)
    if (scoped) { const rows = JSON.parse(scoped); return Array.isArray(rows) ? rows as AccountingVoucherRecord[] : [] }
    if (companyId === 'cmp-demo-ecuador') {
      const legacy = JSON.parse(localStorage.getItem(legacyStorageKey) ?? '[]')
      const rows = Array.isArray(legacy) ? legacy as AccountingVoucherRecord[] : []
      localStorage.setItem(key, JSON.stringify(rows)); return rows
    }
    return []
  } catch { return [] }
}

function readJson<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? '') as T } catch { return fallback } }
function todayIso() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` }
function money(value: number) { return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) }
function normalizeAmount(value: string) { const cleaned = value.replace(',', '.').replace(/[^\d.]/g, ''); const [whole, ...decimals] = cleaned.split('.'); return decimals.length ? `${whole}.${decimals.join('').slice(0, 2)}` : whole }
function displayDate(row: AccountingVoucherRecord) { return isoToDisplayDate(row.dateIso ?? row.date) }
function contactLabel(row: ContactOption) { return `${row.identification} · ${row.name} · ${row.kind === 'CLIENTE' ? 'Cliente' : 'Proveedor'}` }
function accountLabel(row: Account) { return `${row.Codigo} · ${row['Descripción']}` }
function typeLabel(type: string) { return (voucherTypeLabels as Record<string, string>)[type] ?? type }
function readAccounts() { return readJson<Account[]>(accountPlanKey, []).filter(row => row.Tipo?.toLocaleUpperCase('es') === 'AUXILIAR' && row.Estado?.toLocaleUpperCase('es') !== 'INACTIVO').sort((left, right) => left.Codigo.localeCompare(right.Codigo, 'es', { numeric: true })) }
function readContacts() {
  const customers = readJson<CustomerRow[]>(customerKey, []).filter(row => row.state === 'ACTIVO').map(row => ({ key: `CLIENTE:${row.id}`, id: row.id, name: row.businessName, identification: row.identification, kind: 'CLIENTE' as const }))
  const providers = readJson<CustomerRow[]>(providerKey, []).filter(row => row.state === 'ACTIVO').map(row => ({ key: `PROVEEDOR:${row.id}`, id: row.id, name: row.businessName, identification: row.identification, kind: 'PROVEEDOR' as const }))
  return [...customers, ...providers].sort((left, right) => left.name.localeCompare(right.name, 'es'))
}
export function getNextVoucherNumber(rows: AccountingVoucherRecord[], type: VoucherType, excludedId?: string, companyId?: string) {
  const prefix = voucherPrefixes[type]
  const highest = rows.filter(row => row.id !== excludedId && row.type === type).reduce((maximum, row) => { const match = new RegExp(`^${prefix}-(\\d+)$`, 'i').exec(row.number); return Math.max(maximum, Number(match?.[1] ?? 0)) }, 0)
  const next = Math.max(highest + 1, companyId ? configuredVoucherStart(companyId, type) : 1)
  return `${prefix}-${String(next).padStart(6, '0')}`
}

export function AccountingVoucherPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <AccountingVoucherManager key={context.data.company.id} screen={screen} context={context.data} />
}

function AccountingVoucherManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const storageKey = accountingVoucherStorageKey(context.company.id)
  const [rows, setRows] = useState<AccountingVoucherRecord[]>(() => readAccountingVouchers(context.company.id))
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [type, setType] = useState<VoucherType>('DIARIO')
  const [number, setNumber] = useState('')
  const [date, setDate] = useState(isoToDisplayDate(todayIso()))
  const [contactInput, setContactInput] = useState('')
  const [contact, setContact] = useState<ContactOption | null>(null)
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<AccountingVoucherLine[]>([])
  const [editingLineId, setEditingLineId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const accounts = useMemo(readAccounts, [formOpen])
  const contacts = useMemo(readContacts, [formOpen])
  const drafts = rows.filter(row => row.status.toLocaleUpperCase('es') === 'BORRADOR' && (row.manualEntry || Array.isArray(row.lines))).sort((left, right) => (right.updatedAt ?? right.date).localeCompare(left.updatedAt ?? left.date))
  const totalDebit = lines.reduce((sum, row) => sum + Number(row.debit || 0), 0)
  const totalCredit = lines.reduce((sum, row) => sum + Number(row.credit || 0), 0)
  const balanced = lines.length > 0 && Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0
  const total = balanced ? totalDebit : Math.max(totalDebit, totalCredit)
  const dateIso = dateInputToIsoOrDraft(date)

  const persist = (next: AccountingVoucherRecord[]) => { setRows(next); localStorage.setItem(storageKey, JSON.stringify(next)) }
  const resetForm = () => { setFormOpen(false); setEditingId(null); setType('DIARIO'); setNumber(''); setDate(isoToDisplayDate(todayIso())); setContactInput(''); setContact(null); setDescription(''); setLines([]); setEditingLineId(null); setError(''); setConfirmDelete(false) }
  const openNew = () => { setEditingId(null); setType('DIARIO'); setNumber(getNextVoucherNumber(rows, 'DIARIO', undefined, context.company.id)); setDate(isoToDisplayDate(todayIso())); setContactInput(''); setContact(null); setDescription(''); setLines([]); setEditingLineId(null); setError(''); setMessage(''); setFormOpen(true) }
  const openDraft = (row: AccountingVoucherRecord) => { const selected = contacts.find(item => item.id === row.contactId && item.kind === row.contactKind) ?? null; setEditingId(row.id); setType(row.type as VoucherType); setNumber(row.number); setDate(displayDate(row)); setContact(selected); setContactInput(selected ? contactLabel(selected) : row.contactName ?? ''); setDescription(row.description ?? ''); setLines(row.lines ?? []); setEditingLineId(null); setError(''); setMessage(''); setFormOpen(true) }
  const chooseType = (nextType: VoucherType) => { setType(nextType); setNumber(getNextVoucherNumber(rows, nextType, editingId ?? undefined, context.company.id)); setError('') }
  const chooseContact = (value: string) => { const selected = contacts.find(item => contactLabel(item) === value) ?? null; setContactInput(value); setContact(selected); setLines(current => current.map(line => ({ ...line, contactId: selected?.id ?? '', contactName: selected?.name ?? '' }))); setError('') }
  const addLine = () => { const line: AccountingVoucherLine = { id: crypto.randomUUID(), accountCode: '', contactId: contact?.id ?? '', contactName: contact?.name ?? '', debit: 0, credit: 0, description: description.trim() }; setLines(current => [...current, line]); setEditingLineId(line.id); setError('') }
  const updateLine = (id: string, field: keyof AccountingVoucherLine, value: string | number) => setLines(current => current.map(line => line.id === id ? { ...line, [field]: value } : line))
  const saveLine = (line: AccountingVoucherLine) => {
    if (!accounts.some(account => account.Codigo === line.accountCode)) { setError('Selecciona una Cuenta Contable auxiliar válida para la línea.'); return }
    if ((line.debit > 0 && line.credit > 0) || (line.debit <= 0 && line.credit <= 0)) { setError('Cada línea debe tener un valor mayor a cero solamente en Debe o en Haber.'); return }
    if (!line.description.trim()) { setError('Ingresa la Descripción de la línea contable.'); return }
    setEditingLineId(null); setError('')
  }
  const validLines = () => lines.length > 0 && lines.every(line => accounts.some(account => account.Codigo === line.accountCode) && Boolean(line.description.trim()) && ((line.debit > 0) !== (line.credit > 0)))
  const validateHeader = (requireComplete: boolean) => { const operationError = validateOperationDate(dateIso, type === 'ASIENTO_INICIAL'); if (operationError) return operationError; if (requireComplete && !contact) return 'Selecciona un Proveedor/Cliente válido.'; if (requireComplete && !description.trim()) return 'Ingresa el Detalle del comprobante.'; if (requireComplete && !validLines()) return 'Completa y guarda al menos una línea contable válida.'; return '' }
  const makeRecord = (status: 'BORRADOR' | 'AUTORIZADO'): AccountingVoucherRecord => { const previous = editingId ? rows.find(row => row.id === editingId) : undefined; const now = new Date().toISOString(); return { ...previous, id: editingId ?? crypto.randomUUID(), number, date: dateIso, dateIso, type, description: description.trim(), debit: totalDebit.toFixed(2), credit: totalCredit.toFixed(2), total, status, contactId: contact?.id ?? '', contactName: contact?.name ?? contactInput.trim(), contactKind: contact?.kind, lines, manualEntry: true, user: previous?.user ?? context.actor.name, createdAt: previous?.createdAt ?? now, updatedAt: now } }
  const saveDraft = () => { const validation = validateHeader(false); if (validation) { setError(validation); return }; const record = makeRecord('BORRADOR'); persist([record, ...rows.filter(row => row.id !== record.id)]); setMessage(`El comprobante ${record.number} quedó guardado como borrador.`); resetForm() }
  const generate = () => { const validation = validateHeader(true); if (validation) { setError(validation); return }; if (!balanced) { setError(`Asiento no Cuadra. Diferencia: ${money(Math.abs(totalDebit - totalCredit))}. Revisa los valores resaltados en Debe y Haber.`); return }; const record = makeRecord('AUTORIZADO'); persist([record, ...rows.filter(row => row.id !== record.id)]); resetForm(); setMessage(`El comprobante ${record.number} fue autorizado correctamente.`); window.open(`/vista-previa/comprobantes-contables/${encodeURIComponent(record.id)}`, '_blank', 'noopener,noreferrer') }
  const deleteVoucher = () => { if (editingId) persist(rows.filter(row => row.id !== editingId)); const deletedNumber = number; resetForm(); setMessage(editingId ? `El borrador ${deletedNumber} fue eliminado.` : 'El comprobante sin guardar fue descartado.') }

  return <div className="page screen-page accounting-voucher-page">
    <DocumentEditorHeader screen={screen} formOpen={formOpen} formTitle="Nuevo Comprobante" sectionLabel="Núcleo contable" onClose={resetForm} actions={<><button type="button" className="voucher-save-draft" onClick={saveDraft}><Save />Guardar Borrador</button><button type="button" className="voucher-delete" onClick={() => setConfirmDelete(true)}><Trash2 />Eliminar</button><button type="button" className="voucher-generate" onClick={generate}><CheckCircle2 />Generar Comprobante</button></>} listAction={<button className="primary-action" type="button" onClick={openNew}><Plus />Nuevo Comprobante</button>} />
    {message && <div className="voucher-feedback" role="status"><CheckCircle2 />{message}</div>}
    {!formOpen ? <section className="voucher-pending-card"><header><div><FileText /><span><h2>Comprobantes Pendientes de Completar</h2><p>Borradores que conservan su numeración hasta ser autorizados o eliminados.</p></span></div><strong>{drafts.length}<small>{drafts.length === 1 ? 'pendiente' : 'pendientes'}</small></strong></header><div className="voucher-pending-table"><table><thead><tr><th aria-label="Editar" /><th>Tipo Comprobante</th><th># Comprobante</th><th>Fecha Emisión</th><th>Proveedor/Cliente</th><th>Detalle</th><th>Total</th><th>Estado</th></tr></thead><tbody>{drafts.map(row => <tr key={row.id}><td><button type="button" className="row-action" onClick={() => openDraft(row)} title={`Editar ${row.number}`} aria-label={`Editar ${row.number}`}><Pencil /></button></td><td>{typeLabel(row.type)}</td><td><strong>{row.number}</strong></td><td>{displayDate(row)}</td><td>{row.contactName || '—'}</td><td>{row.description || '—'}</td><td>{money(Number(row.total ?? row.debit ?? 0))}</td><td><span className="status s-borrador"><i />Guardado</span></td></tr>)}{!drafts.length && <tr><td colSpan={8}><div className="voucher-empty"><FileText /><strong>Sin comprobantes pendientes</strong><span>Selecciona Nuevo Comprobante para registrar un asiento contable.</span></div></td></tr>}</tbody></table></div></section> : <>
      {error && <div className="voucher-error" role="alert"><AlertTriangle />{error}</div>}
      <section className="voucher-data-card"><header><div><FileText /><span><h2>Datos del Comprobante</h2><p>La numeración se asigna de forma independiente para cada Tipo.</p></span></div><button type="button" onClick={resetForm} aria-label="Cerrar y volver a comprobantes pendientes" title="Cerrar"><X /></button></header><div className="voucher-data-grid">
        <label><span>Tipo <b>Obligatorio</b></span><select value={type} onChange={event => chooseType(event.target.value as VoucherType)}>{Object.entries(voucherTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span># Comprobante</span><input value={number} readOnly /></label>
        <label><span>Fecha <b>Obligatorio</b></span><input inputMode="numeric" maxLength={10} value={date} onFocus={event => event.currentTarget.select()} onChange={event => { setDate(formatFullDateInput(event.target.value)); setError('') }} placeholder="DD/MM/AAAA" /></label>
        <label><span>Proveedor/Cliente <b>Obligatorio</b></span><SearchableDatalistInput list="voucher-contact-options" value={contactInput} onChange={event => chooseContact(event.target.value)} onClear={() => chooseContact('')} clearLabel="Borrar contacto" placeholder="Escribe para filtrar clientes o proveedores" /><datalist id="voucher-contact-options">{contacts.map(row => <option key={row.key} value={contactLabel(row)} />)}</datalist></label>
        <label className="wide"><span>Detalle <b>Obligatorio</b></span><textarea rows={2} maxLength={180} value={description} onChange={event => { const value = event.target.value; setDescription(value); setError('') }} /></label>
        <label><span>Total</span><input className={!balanced && lines.length ? 'mismatch' : ''} value={money(total)} readOnly /></label>
      </div></section>
      <section className="voucher-accounting-card"><nav><button type="button" className="active"><Scale />Contabilidad</button></nav><div className="voucher-accounting-toolbar"><div><strong>Detalle Contable</strong><span>Debe y Haber deben ser iguales antes de generar el comprobante.</span></div><button type="button" className="quiet-button" onClick={addLine}><Plus />Nueva Línea</button></div><div className="voucher-accounting-table"><table><thead><tr><th>Acciones</th><th>Cuenta Contable</th><th>Contacto</th><th>Debe</th><th>Haber</th><th>Descripción</th></tr></thead><tbody>{lines.map(line => { const editing = editingLineId === line.id; return <tr key={line.id}><td><div className="voucher-line-actions"><button type="button" onClick={() => editing ? saveLine(line) : setEditingLineId(line.id)} title={editing ? 'Grabar línea' : 'Editar línea'} aria-label={editing ? 'Grabar línea' : 'Editar línea'}>{editing ? <Check /> : <Pencil />}</button><button type="button" onClick={() => { setLines(current => current.filter(item => item.id !== line.id)); if (editingLineId === line.id) setEditingLineId(null) }} title="Eliminar línea" aria-label="Eliminar línea"><Trash2 /></button></div></td><td>{editing ? <SearchableDatalistInput list="voucher-account-options" value={line.accountCode} onChange={event => updateLine(line.id, 'accountCode', event.target.value)} onClear={() => updateLine(line.id, 'accountCode', '')} clearLabel="Borrar cuenta" placeholder="Escribe para filtrar el Plan Contable" /> : <span><strong>{line.accountCode || '—'}</strong><small>{accounts.find(account => account.Codigo === line.accountCode)?.['Descripción']}</small></span>}</td><td>{line.contactName || contact?.name || '—'}</td><td className={!balanced && lines.length ? 'mismatch' : ''}>{editing ? <input inputMode="decimal" value={line.debit || ''} onFocus={event => event.currentTarget.select()} onChange={event => updateLine(line.id, 'debit', Number(normalizeAmount(event.target.value)) || 0)} /> : line.debit ? money(line.debit) : '—'}</td><td className={!balanced && lines.length ? 'mismatch' : ''}>{editing ? <input inputMode="decimal" value={line.credit || ''} onFocus={event => event.currentTarget.select()} onChange={event => updateLine(line.id, 'credit', Number(normalizeAmount(event.target.value)) || 0)} /> : line.credit ? money(line.credit) : '—'}</td><td>{editing ? <input value={line.description} maxLength={180} onChange={event => updateLine(line.id, 'description', event.target.value)} /> : line.description || '—'}</td></tr> })}{!lines.length && <tr><td colSpan={6}><div className="voucher-accounting-empty"><Scale /><strong>Asiento contable en blanco</strong><span>Selecciona Nueva Línea para empezar a construir el comprobante.</span></div></td></tr>}</tbody><tfoot><tr className={!balanced && lines.length ? 'mismatch' : ''}><td colSpan={3}>Totales</td><td>{money(totalDebit)}</td><td>{money(totalCredit)}</td><td>{balanced ? 'Asiento cuadrado' : `Diferencia ${money(Math.abs(totalDebit - totalCredit))}`}</td></tr></tfoot></table><datalist id="voucher-account-options">{accounts.map(account => <option key={account.Codigo} value={account.Codigo}>{accountLabel(account)}</option>)}</datalist></div></section>
    </>}
    {confirmDelete && <div className="voucher-confirm-backdrop" role="alertdialog" aria-modal="true" aria-label="Confirmar eliminación"><section><span><AlertTriangle /></span><h2>¿Eliminar {number}?</h2><p>{editingId ? 'El borrador y todas sus líneas contables se eliminarán.' : 'Se descartará la información ingresada sin crear ningún registro.'}</p><div><button type="button" className="quiet-button" onClick={() => setConfirmDelete(false)}>Cancelar</button><button type="button" className="voucher-delete-confirm" onClick={deleteVoucher}><Trash2 />Eliminar</button></div></section></div>}
  </div>
}
