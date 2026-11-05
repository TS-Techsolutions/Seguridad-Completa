import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, CheckCircle2, ChevronRight, FilePenLine, Pencil, Plus, RotateCcw, Save, Scale, Trash2, X } from 'lucide-react'
import { api } from './api'
import { accountingVoucherStorageKey, getNextVoucherNumber, readAccountingVouchers, voucherTypeLabels, type AccountingVoucherLine, type AccountingVoucherRecord, type VoucherType } from './AccountingVoucherPage'
import { standardVoucherTypes } from './AccountingVoucherTypesPage'
import type { CustomerRow } from './CustomerRegistryPage'
import { dateInputToIsoOrDraft, formatFullDateInput, isoToDisplayDate } from './date-input'
import { validateOperationDate } from './operation-date-rules'
import { SearchableDatalistInput } from './SearchableDatalistInput'
import type { Context, ScreenSpec } from './types'

type Account = { Codigo: string; 'Descripción': string; Tipo: string; Estado: string }
type ContactOption = { key: string; id: string; name: string; identification: string; kind: 'CLIENTE' | 'PROVEEDOR' }

function readJson<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? '') as T } catch { return fallback } }
function money(value: number) { return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) }
function typeLabel(type: string) { return (voucherTypeLabels as Record<string, string>)[type] ?? type.toLocaleLowerCase('es').split('_').filter(Boolean).map(word => word.charAt(0).toLocaleUpperCase('es') + word.slice(1)).join(' ') }
function voucherLabel(row: AccountingVoucherRecord) { return `${row.number} · ${isoToDisplayDate(row.dateIso ?? row.date)} · ${row.description || typeLabel(row.type)}` }
function contactLabel(row: ContactOption) { return `${row.identification} · ${row.name} · ${row.kind === 'CLIENTE' ? 'Cliente' : 'Proveedor'}` }
function accountLabel(row: Account) { return `${row.Codigo} · ${row['Descripción']}` }
function cleanAmount(value: string) { const cleaned = value.replace(',', '.').replace(/[^d.]/g, ''); const [whole, ...decimals] = cleaned.split('.'); return decimals.length ? `${whole}.${decimals.join('').slice(0, 2)}` : whole }
function readAccounts() { return readJson<Account[]>('saga.accounting.plan', []).filter(row => row.Tipo?.toLocaleUpperCase('es') === 'AUXILIAR' && row.Estado?.toLocaleUpperCase('es') !== 'INACTIVO').sort((left, right) => left.Codigo.localeCompare(right.Codigo, 'es', { numeric: true })) }
function readContacts() {
  const customers = readJson<CustomerRow[]>('saga.customers', []).filter(row => row.state === 'ACTIVO').map(row => ({ key: `CLIENTE:${row.id}`, id: row.id, name: row.businessName, identification: row.identification, kind: 'CLIENTE' as const }))
  const providers = readJson<CustomerRow[]>('saga.providers', []).filter(row => row.state === 'ACTIVO').map(row => ({ key: `PROVEEDOR:${row.id}`, id: row.id, name: row.businessName, identification: row.identification, kind: 'PROVEEDOR' as const }))
  return [...customers, ...providers].sort((left, right) => left.name.localeCompare(right.name, 'es'))
}

export function AccountingVoucherModificationPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <AccountingVoucherModificationManager key={context.data.company.id} screen={screen} context={context.data} />
}

function AccountingVoucherModificationManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const storageKey = accountingVoucherStorageKey(context.company.id)
  const [rows, setRows] = useState<AccountingVoucherRecord[]>(() => readAccountingVouchers(context.company.id))
  const authorized = rows.filter(row => row.status.toLocaleUpperCase('es') === 'AUTORIZADO' && Array.isArray(row.lines))
  const types = useMemo(() => Array.from(new Set([...standardVoucherTypes.map(row => row.code), ...authorized.map(row => row.type)])).sort((left, right) => typeLabel(left).localeCompare(typeLabel(right), 'es')), [rows])
  const accounts = useMemo(readAccounts, [])
  const contacts = useMemo(readContacts, [])
  const requestedId = new URLSearchParams(window.location.search).get('voucher') ?? ''
  const requested = authorized.find(row => row.id === requestedId)
  const requestedContact = requested ? contacts.find(row => row.id === requested.contactId && row.kind === requested.contactKind) ?? contacts.find(row => row.name === requested.contactName) ?? null : null
  const [filterType, setFilterType] = useState(requested?.type ?? '')
  const [voucherInput, setVoucherInput] = useState(requested ? voucherLabel(requested) : '')
  const [selectedId, setSelectedId] = useState(requested?.id ?? '')
  const [editing, setEditing] = useState(Boolean(requested))
  const [type, setType] = useState<VoucherType>((requested?.type as VoucherType) ?? 'DIARIO')
  const [number, setNumber] = useState(requested?.number ?? '')
  const [date, setDate] = useState(requested ? isoToDisplayDate(requested.dateIso ?? requested.date) : '')
  const [contactInput, setContactInput] = useState(requestedContact ? contactLabel(requestedContact) : requested?.contactName ?? requested?.lines?.[0]?.contactName ?? '')
  const [contact, setContact] = useState<ContactOption | null>(requestedContact)
  const [description, setDescription] = useState(requested?.description ?? '')
  const [lines, setLines] = useState<AccountingVoucherLine[]>(() => (requested?.lines ?? []).map(line => ({ ...line })))
  const [editingLineId, setEditingLineId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const filtered = authorized.filter(row => row.type === filterType).sort((left, right) => (right.dateIso ?? right.date).localeCompare(left.dateIso ?? left.date) || right.number.localeCompare(left.number, 'es', { numeric: true }))
  const selected = authorized.find(row => row.id === selectedId)
  const totalDebit = lines.reduce((sum, row) => sum + Number(row.debit || 0), 0)
  const totalCredit = lines.reduce((sum, row) => sum + Number(row.credit || 0), 0)
  const balanced = lines.length > 0 && totalDebit > 0 && Math.abs(totalDebit - totalCredit) < .005
  const total = balanced ? totalDebit : Math.max(totalDebit, totalCredit)

  const persist = (next: AccountingVoucherRecord[]) => { setRows(next); localStorage.setItem(storageKey, JSON.stringify(next)) }
  const changeFilterType = (value: string) => { setFilterType(value); setVoucherInput(''); setSelectedId(''); setError(''); setMessage('') }
  const chooseVoucher = (value: string) => { setVoucherInput(value); setSelectedId(filtered.find(row => voucherLabel(row) === value)?.id ?? ''); setError('') }
  const startModification = () => {
    if (!selected) { setError('Selecciona el # Comprobante que deseas modificar.'); return }
    const selectedContact = contacts.find(row => row.id === selected.contactId && row.kind === selected.contactKind) ?? contacts.find(row => row.name === selected.contactName) ?? null
    setType(selected.type as VoucherType); setNumber(selected.number); setDate(isoToDisplayDate(selected.dateIso ?? selected.date)); setContact(selectedContact); setContactInput(selectedContact ? contactLabel(selectedContact) : selected.contactName ?? selected.lines?.[0]?.contactName ?? ''); setDescription(selected.description ?? ''); setLines((selected.lines ?? []).map(line => ({ ...line }))); setEditingLineId(null); setError(''); setMessage(''); setEditing(true)
  }
  const closeEditor = () => { setEditing(false); setEditingLineId(null); setError('') }
  const changeType = (value: VoucherType) => { setType(value); setNumber(value === selected?.type ? selected.number : getNextVoucherNumber(rows, value, undefined, context.company.id)); setError('') }
  const chooseContact = (value: string) => { const chosen = contacts.find(row => contactLabel(row) === value) ?? null; setContactInput(value); setContact(chosen); setLines(current => current.map(line => ({ ...line, contactId: chosen?.id ?? '', contactName: chosen?.name ?? '' }))); setError('') }
  const updateLine = (id: string, field: keyof AccountingVoucherLine, value: string | number) => setLines(current => current.map(line => line.id === id ? { ...line, [field]: value } : line))
  const addLine = () => { const line: AccountingVoucherLine = { id: crypto.randomUUID(), accountCode: '', contactId: contact?.id ?? '', contactName: contact?.name ?? '', debit: 0, credit: 0, description: description.trim() }; setLines(current => [...current, line]); setEditingLineId(line.id); setError('') }
  const saveLine = (line: AccountingVoucherLine) => {
    if (!accounts.some(row => row.Codigo === line.accountCode)) { setError('Selecciona una Cuenta Contable auxiliar válida para la línea.'); return }
    if ((line.debit > 0) === (line.credit > 0)) { setError('Cada línea debe registrar un valor mayor a cero únicamente en Debe o Haber.'); return }
    if (!line.description.trim()) { setError('Ingresa la Descripción de la línea contable.'); return }
    setEditingLineId(null); setError('')
  }
  const processModification = () => {
    if (!selected) { setError('No se encontró el comprobante original.'); return }
    const dateIso = dateInputToIsoOrDraft(date)
    const dateError = validateOperationDate(dateIso, type === 'ASIENTO_INICIAL')
    if (dateError) { setError(dateError); return }
    if (!contact) { setError('Selecciona un Proveedor/Cliente válido.'); return }
    if (!description.trim()) { setError('Ingresa el Detalle del comprobante.'); return }
    if (!lines.length || lines.some(line => !accounts.some(account => account.Codigo === line.accountCode) || !line.description.trim() || ((line.debit > 0) === (line.credit > 0)))) { setError('Completa y guarda todas las líneas contables antes de reprocesar.'); return }
    if (!balanced) { setError(`Asiento no Cuadra. Diferencia: ${money(Math.abs(totalDebit - totalCredit))}. Revisa los valores resaltados en Debe y Haber.`); return }
    const changedType = type !== selected.type
    const replacementId = changedType ? crypto.randomUUID() : selected.id
    const now = new Date().toISOString()
    const removed: AccountingVoucherRecord = { ...selected, status: 'Eliminado x Usuario', eliminatedAt: now, eliminatedBy: context.actor.name, replacedById: replacementId, replacementNumber: number }
    const replacement: AccountingVoucherRecord = { id: replacementId, number: changedType ? getNextVoucherNumber(rows, type, undefined, context.company.id) : selected.number, date: dateIso, dateIso, type, description: description.trim(), debit: totalDebit.toFixed(2), credit: totalCredit.toFixed(2), total, status: 'AUTORIZADO', contactId: contact.id, contactName: contact.name, contactKind: contact.kind, lines, manualEntry: true, user: context.actor.name, createdAt: changedType ? now : selected.createdAt ?? now, updatedAt: now, modifiedBy: context.actor.name, replacesVoucherId: changedType ? selected.id : undefined, originalVoucherNumber: selected.number, originalVoucherType: selected.type }
    const next = changedType ? [replacement, removed, ...rows.filter(row => row.id !== selected.id)] : [replacement, ...rows.filter(row => row.id !== selected.id)]
    persist(next); setEditing(false); setFilterType(type); setVoucherInput(voucherLabel(replacement)); setSelectedId(replacement.id); setMessage(changedType ? `${selected.number} quedó Eliminado x Usuario. El nuevo comprobante es ${replacement.number}.` : `${replacement.number} fue modificado y reprocesado correctamente.`); setError(''); window.open(`/vista-previa/comprobantes-contables/${encodeURIComponent(replacement.id)}`, '_blank', 'noopener,noreferrer')
  }

  if (!editing) return <div className="page screen-page voucher-reprint-page voucher-modification-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header voucher-reprint-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div></section>
    {message && <div className="voucher-feedback"><CheckCircle2 />{message}</div>}{error && <div className="voucher-reprint-feedback" role="alert"><AlertTriangle />{error}</div>}
    <section className="voucher-reprint-card"><header><FilePenLine /><strong>Modificación de Comprobante Contable</strong></header><div className="voucher-reprint-fields"><label><span>Tipo de Comprobante</span><select value={filterType} onChange={event => changeFilterType(event.target.value)}><option value="">Seleccionar tipo</option>{types.map(value => <option key={value} value={value}>{typeLabel(value)}</option>)}</select></label><label><span># Comprobante</span><SearchableDatalistInput disabled={!filterType} list="voucher-modification-number-options" value={voucherInput} onChange={event => chooseVoucher(event.target.value)} onClear={() => chooseVoucher('')} clearLabel="Borrar comprobante" placeholder={filterType ? 'Escribe para filtrar los comprobantes' : 'Primero selecciona el tipo'} /><datalist id="voucher-modification-number-options">{filtered.map(row => <option key={row.id} value={voucherLabel(row)} />)}</datalist></label><button type="button" className="voucher-reprint-action" disabled={!selected} onClick={startModification}><Pencil />Modificar</button></div><footer><RotateCcw /><span>{selected ? `Se editará ${selected.number} y se volverá a validar el asiento.` : filterType ? filtered.length ? `${filtered.length} comprobantes autorizados disponibles.` : `No existen comprobantes autorizados de ${typeLabel(filterType)} con detalle contable.` : `${authorized.length} comprobantes autorizados disponibles para modificar.`}</span></footer></section>
  </div>

  return <div className="page screen-page accounting-voucher-page voucher-modification-editor">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div></section>
    <section className="voucher-editor-actions"><button type="button" className="voucher-save-draft" onClick={closeEditor}><X />Cancelar</button><button type="button" className="voucher-generate" onClick={processModification}><Save />Reprocesar Comprobante</button></section>
    {error && <div className="voucher-error" role="alert"><AlertTriangle />{error}</div>}
    {selected && type !== selected.type && <div className="voucher-modification-warning"><AlertTriangle /><span><strong>Cambio de Tipo de Comprobante</strong><small>{selected.number} quedará Eliminado x Usuario y se generará {number}.</small></span></div>}
    <section className="voucher-data-card"><header><div><FilePenLine /><span><h2>Información del Comprobante</h2><p>Edita los datos y reprocesa el asiento contable.</p></span></div><button type="button" onClick={closeEditor} aria-label="Cerrar modificación"><X /></button></header><div className="voucher-data-grid">
      <label><span>Tipo <b>Obligatorio</b></span><select value={type} onChange={event => changeType(event.target.value as VoucherType)}>{Object.entries(voucherTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span># Comprobante</span><input readOnly value={number} /></label>
      <label><span>Fecha <b>Obligatorio</b></span><input inputMode="numeric" maxLength={10} value={date} onFocus={event => event.currentTarget.select()} onChange={event => { setDate(formatFullDateInput(event.target.value)); setError('') }} placeholder="DD/MM/AAAA" /></label>
      <label><span>Proveedor/Cliente <b>Obligatorio</b></span><SearchableDatalistInput list="voucher-modification-contact-options" value={contactInput} onChange={event => chooseContact(event.target.value)} onClear={() => chooseContact('')} clearLabel="Borrar contacto" placeholder="Escribe para filtrar clientes o proveedores" /><datalist id="voucher-modification-contact-options">{contacts.map(row => <option key={row.key} value={contactLabel(row)} />)}</datalist></label>
      <label className="wide"><span>Detalle <b>Obligatorio</b></span><textarea rows={2} maxLength={180} value={description} onChange={event => { setDescription(event.target.value); setError('') }} /></label>
      <label><span>Total</span><input readOnly className={!balanced ? 'mismatch' : ''} value={money(total)} /></label>
    </div></section>
    <section className="voucher-accounting-card"><nav><button type="button" className="active"><Scale />Contabilidad</button></nav><div className="voucher-accounting-toolbar"><div><strong>Detalle Contable</strong><span>Modifica, agrega o elimina líneas antes de reprocesar.</span></div><button type="button" className="quiet-button" onClick={addLine}><Plus />Nueva Línea</button></div><div className="voucher-accounting-table"><table><thead><tr><th>Acciones</th><th>Cuenta Contable</th><th>Contacto</th><th>Debe</th><th>Haber</th><th>Descripción</th></tr></thead><tbody>{lines.map(line => { const isEditing = editingLineId === line.id; return <tr key={line.id}><td><div className="voucher-line-actions"><button type="button" onClick={() => isEditing ? saveLine(line) : setEditingLineId(line.id)} aria-label={isEditing ? 'Grabar línea' : 'Editar línea'}>{isEditing ? <Check /> : <Pencil />}</button><button type="button" onClick={() => setLines(current => current.filter(row => row.id !== line.id))} aria-label="Eliminar línea"><Trash2 /></button></div></td><td>{isEditing ? <SearchableDatalistInput list="voucher-modification-account-options" value={line.accountCode} onChange={event => updateLine(line.id, 'accountCode', event.target.value)} onClear={() => updateLine(line.id, 'accountCode', '')} clearLabel="Borrar cuenta" placeholder="Escribe para filtrar el Plan Contable" /> : <span><strong>{line.accountCode || '—'}</strong><small>{accounts.find(account => account.Codigo === line.accountCode)?.['Descripción']}</small></span>}</td><td>{line.contactName || contact?.name || '—'}</td><td className={!balanced ? 'mismatch' : ''}>{isEditing ? <input inputMode="decimal" value={line.debit || ''} onFocus={event => event.currentTarget.select()} onChange={event => updateLine(line.id, 'debit', Number(cleanAmount(event.target.value)) || 0)} /> : line.debit ? money(line.debit) : '—'}</td><td className={!balanced ? 'mismatch' : ''}>{isEditing ? <input inputMode="decimal" value={line.credit || ''} onFocus={event => event.currentTarget.select()} onChange={event => updateLine(line.id, 'credit', Number(cleanAmount(event.target.value)) || 0)} /> : line.credit ? money(line.credit) : '—'}</td><td>{isEditing ? <input value={line.description} maxLength={180} onChange={event => updateLine(line.id, 'description', event.target.value)} /> : line.description}</td></tr> })}</tbody><tfoot><tr className={!balanced ? 'mismatch' : ''}><td colSpan={3}>Totales</td><td>{money(totalDebit)}</td><td>{money(totalCredit)}</td><td>{balanced ? 'Asiento cuadrado' : `Diferencia ${money(Math.abs(totalDebit - totalCredit))}`}</td></tr></tfoot></table><datalist id="voucher-modification-account-options">{accounts.map(row => <option key={row.Codigo} value={row.Codigo}>{accountLabel(row)}</option>)}</datalist></div></section>
  </div>
}
