import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronRight, FileText, GitCompareArrows, Pencil, Plus, Save, Scale, Trash2 } from 'lucide-react'
import { api } from './api'
import { DocumentEditorHeader } from './DocumentEditorHeader'
import { accountingVoucherStorageKey, getNextVoucherNumber, type AccountingVoucherRecord } from './AccountingVoucherPage'
import { applyCustomerAdvanceCrossing, ensureCustomerAdvances, type CustomerAdvanceRecord } from './customer-advance-records'
import {
  readAuthorizedCustomerAdvanceCrossings,
  readCustomerAdvanceCrossingDrafts,
  saveAuthorizedCustomerAdvanceCrossings,
  saveCustomerAdvanceCrossingDrafts,
  type CustomerAdvanceCrossingAccountingLine,
  type CustomerAdvanceCrossingDraft,
  type CustomerAdvanceCrossingPayload,
} from './customer-advance-crossing-records'
import { applyAdvanceCrossingToReceivables, ensureCustomerReceivables, type CustomerReceivableRecord } from './customer-receivables'
import type { CustomerRow } from './CustomerRegistryPage'
import { formatFullDateInput } from './date-input'
import { validateOperationDate } from './operation-date-rules'
import { SearchableDatalistInput } from './SearchableDatalistInput'
import type { Context, ScreenSpec } from './types'

type Account = { Codigo: string; 'Descripción': string; Tipo: string; Estado: string }
type Assignments = Record<string, string>
type Tab = 'CROSSING' | 'ACCOUNTING'

function readJson<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback } }
function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim() }
function money(value: number) { return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) }
function todayDisplay() { return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()) }
function displayDateToIso(value: string) { const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value); return match ? `${match[3]}-${match[2]}-${match[1]}` : value }
function numeric(value: string | number) { const parsed = Number(String(value).replace(',', '.')); return Number.isFinite(parsed) ? Math.max(0, parsed) : 0 }
function customerLabel(row: CustomerRow) { return `${row.businessName} · ${row.identification}` }
function accountLabel(row: Account) { return `${row.Codigo} · ${row['Descripción']}` }

function readAccounts() {
  return readJson<Account[]>('saga.accounting.plan', []).filter(row => row.Tipo.toLocaleUpperCase('es') === 'AUXILIAR' && row.Estado.toLocaleUpperCase('es') !== 'INACTIVO').sort((a, b) => a.Codigo.localeCompare(b.Codigo, 'es', { numeric: true }))
}

function nextNumber(companyId: string) {
  const numbers = [...readCustomerAdvanceCrossingDrafts(companyId), ...readAuthorizedCustomerAdvanceCrossings(companyId)].map(row => Number(/(\d+)$/.exec(row.number)?.[1] ?? 0))
  return `CAC-${String(Math.max(0, ...numbers) + 1).padStart(6, '0')}`
}

export function CustomerAdvanceCrossingPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <CustomerAdvanceCrossingManager key={context.data.company.id} screen={screen} context={context.data} />
}

function CustomerAdvanceCrossingManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const accounts = useMemo(readAccounts, [])
  const assignments = useMemo(() => readJson<Assignments>(`saga.accounting.account-assignments:${context.company.id}`, {}), [context.company.id])
  const customers = useMemo(() => readJson<CustomerRow[]>('saga.customers', []).filter(row => row.state === 'ACTIVO').sort((a, b) => a.businessName.localeCompare(b.businessName, 'es')), [])
  const [advanceRecords, setAdvanceRecords] = useState(() => ensureCustomerAdvances(context.company.id))
  const [receivableRecords, setReceivableRecords] = useState(() => ensureCustomerReceivables(context.company.id))
  const [drafts, setDrafts] = useState(() => readCustomerAdvanceCrossingDrafts(context.company.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [number, setNumber] = useState(() => nextNumber(context.company.id))
  const [date, setDate] = useState(todayDisplay)
  const [customerInput, setCustomerInput] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [detail, setDetail] = useState('')
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState<Set<string>>(new Set())
  const [selectedReceivableIds, setSelectedReceivableIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<Tab>('CROSSING')
  const [accountingLines, setAccountingLines] = useState<CustomerAdvanceCrossingAccountingLine[]>([])
  const [editingLineId, setEditingLineId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const selectedCustomer = customers.find(row => row.id === customerId)
  const customerAdvances = useMemo(() => advanceRecords.filter(row => row.status === 'ACTIVO' && row.balance > 0 && row.customerId === customerId), [advanceRecords, customerId])
  const customerReceivables = useMemo(() => receivableRecords.filter(row => row.balance > 0 && (row.customerId === customerId || (selectedCustomer && (normalize(row.identification ?? '') === normalize(selectedCustomer.identification) || normalize(row.businessName ?? '') === normalize(selectedCustomer.businessName))))), [receivableRecords, customerId, selectedCustomer])
  const selectedAdvances = customerAdvances.filter(row => selectedAdvanceIds.has(row.id))
  const selectedReceivables = customerReceivables.filter(row => selectedReceivableIds.has(row.id))
  const advancesTotal = Number(selectedAdvances.reduce((sum, row) => sum + row.balance, 0).toFixed(2))
  const receivablesTotal = Number(selectedReceivables.reduce((sum, row) => sum + row.balance, 0).toFixed(2))
  const total = Number(Math.min(advancesTotal, receivablesTotal).toFixed(2))
  const totalDebit = Number(accountingLines.reduce((sum, row) => sum + numeric(row.debit), 0).toFixed(2))
  const totalCredit = Number(accountingLines.reduce((sum, row) => sum + numeric(row.credit), 0).toFixed(2))
  const accountingMatches = total > 0 && Math.abs(advancesTotal - receivablesTotal) < .005 && Math.abs(totalDebit - totalCredit) < .005 && Math.abs(totalDebit - total) < .005
  const sourceSignature = JSON.stringify({ advances: selectedAdvances.map(row => [row.id, row.balance, row.typeId]), receivables: selectedReceivables.map(row => [row.id, row.balance]), customerId, detail })

  useEffect(() => {
    if (!formOpen) return
    const description = detail.trim() || `Cruce de Anticipos ${number}`
    const lines: CustomerAdvanceCrossingAccountingLine[] = [
      ...selectedAdvances.map(row => ({ id: `advance-${row.id}`, accountCode: assignments[`ADVANCE_TYPE:${row.typeId}`] ?? '', contactId: customerId, contactName: selectedCustomer?.businessName ?? row.customerName, debit: row.balance, credit: 0, description, automatic: true })),
      ...selectedReceivables.map(row => ({ id: `receivable-${row.id}`, accountCode: assignments.CUSTOMERS_RECEIVABLE ?? '', contactId: customerId, contactName: selectedCustomer?.businessName ?? row.businessName ?? '', debit: 0, credit: row.balance, description, automatic: true })),
    ]
    setAccountingLines(lines)
    setEditingLineId(null)
  }, [sourceSignature, assignments, customerId, formOpen, number, selectedCustomer])

  const persistDrafts = (rows: CustomerAdvanceCrossingDraft[]) => { setDrafts(rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))); saveCustomerAdvanceCrossingDrafts(context.company.id, rows) }
  const resetForm = () => { setEditingId(null); setNumber(nextNumber(context.company.id)); setDate(todayDisplay()); setCustomerInput(''); setCustomerId(''); setDetail(''); setSelectedAdvanceIds(new Set()); setSelectedReceivableIds(new Set()); setAccountingLines([]); setActiveTab('CROSSING'); setError(''); setDeleteConfirm(false) }
  const openNew = () => { resetForm(); setMessage(''); setFormOpen(true) }
  const selectCustomer = (value: string) => {
    setCustomerInput(value)
    const customer = customers.find(row => customerLabel(row) === value)
    setCustomerId(customer?.id ?? '')
    setSelectedAdvanceIds(new Set()); setSelectedReceivableIds(new Set()); setError('')
  }

  const payload = (): CustomerAdvanceCrossingPayload => ({ selectedAdvanceIds: [...selectedAdvanceIds], selectedReceivableIds: [...selectedReceivableIds], accountingLines })
  const saveDraft = () => {
    const now = new Date().toISOString()
    const id = editingId ?? crypto.randomUUID()
    const row: CustomerAdvanceCrossingDraft = { id, companyId: context.company.id, number, date, customerId, customerName: selectedCustomer?.businessName ?? '', detail: detail.trim(), total, status: 'GUARDADO', payload: payload(), createdAt: drafts.find(item => item.id === id)?.createdAt ?? now, updatedAt: now }
    persistDrafts([row, ...drafts.filter(item => item.id !== id)])
    setEditingId(id); setMessage(`El cruce ${number} quedó guardado como borrador.`)
  }

  const openDraft = (row: CustomerAdvanceCrossingDraft) => {
    const customer = customers.find(item => item.id === row.customerId)
    setEditingId(row.id); setNumber(row.number); setDate(row.date); setCustomerId(row.customerId); setCustomerInput(customer ? customerLabel(customer) : row.customerName); setDetail(row.detail)
    setSelectedAdvanceIds(new Set(row.payload.selectedAdvanceIds)); setSelectedReceivableIds(new Set(row.payload.selectedReceivableIds)); setAccountingLines(row.payload.accountingLines); setActiveTab('CROSSING'); setError(''); setMessage(''); setFormOpen(true)
  }

  const deleteDraft = () => {
    if (editingId) persistDrafts(drafts.filter(row => row.id !== editingId))
    resetForm(); setFormOpen(false); setMessage(editingId ? `El borrador ${number} fue eliminado.` : 'El cruce en proceso fue descartado.')
  }

  const toggleAdvance = (id: string) => setSelectedAdvanceIds(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleReceivable = (id: string) => setSelectedReceivableIds(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleAllAdvances = () => setSelectedAdvanceIds(selectedAdvanceIds.size === customerAdvances.length ? new Set() : new Set(customerAdvances.map(row => row.id)))
  const toggleAllReceivables = () => setSelectedReceivableIds(selectedReceivableIds.size === customerReceivables.length ? new Set() : new Set(customerReceivables.map(row => row.id)))
  const updateLine = (id: string, field: keyof CustomerAdvanceCrossingAccountingLine, value: string) => setAccountingLines(current => current.map(row => row.id === id ? { ...row, [field]: field === 'debit' || field === 'credit' ? numeric(value) : value } : row))
  const addLine = () => setAccountingLines(current => [...current, { id: crypto.randomUUID(), accountCode: '', contactId: customerId, contactName: selectedCustomer?.businessName ?? '', debit: 0, credit: 0, description: detail.trim(), automatic: false }])

  const generate = () => {
    setError('')
    const dateError = validateOperationDate(displayDateToIso(date))
    if (dateError) { setError(dateError); return }
    if (!selectedCustomer) { setError('Selecciona un Cliente activo.'); return }
    if (!selectedAdvances.length) { setActiveTab('CROSSING'); setError('Selecciona al menos un Anticipo pendiente.'); return }
    if (!selectedReceivables.length) { setActiveTab('CROSSING'); setError('Selecciona al menos una Expensa o Factura pendiente.'); return }
    if (Math.abs(advancesTotal - receivablesTotal) >= .005) { setActiveTab('CROSSING'); setError(`Los valores seleccionados no coinciden. Anticipos: ${money(advancesTotal)} · Facturas: ${money(receivablesTotal)} · Diferencia: ${money(Math.abs(advancesTotal - receivablesTotal))}.`); return }
    const currentAdvances = ensureCustomerAdvances(context.company.id)
    const staleAdvance = selectedAdvances.find(row => currentAdvances.find(item => item.id === row.id)?.balance !== row.balance)
    const currentReceivables = ensureCustomerReceivables(context.company.id)
    const staleReceivable = selectedReceivables.find(row => currentReceivables.find(item => item.id === row.id)?.balance !== row.balance)
    if (staleAdvance || staleReceivable) { setError('Los saldos cambiaron mientras se preparaba el cruce. Refresca la pantalla y vuelve a seleccionar la información.'); return }
    const missingAdvanceAccount = selectedAdvances.find(row => !assignments[`ADVANCE_TYPE:${row.typeId}`] && !accounts.some(account => account.Codigo === accountingLines.find(line => line.id === `advance-${row.id}`)?.accountCode))
    if (missingAdvanceAccount) { setActiveTab('ACCOUNTING'); setError(`Configura la cuenta contable del anticipo ${missingAdvanceAccount.typeName} en Asignación de Cuentas Contables o selecciónala directamente en esta línea.`); return }
    if (!assignments.CUSTOMERS_RECEIVABLE) { setActiveTab('ACCOUNTING'); setError('Configura Cuenta x Cobrar Clientes en Asignación de Cuentas Contables.'); return }
    if (accountingLines.some(line => !accounts.some(account => account.Codigo === line.accountCode))) { setActiveTab('ACCOUNTING'); setError('Todas las líneas deben utilizar una cuenta contable Auxiliar activa.'); return }
    if (!accountingMatches) { setActiveTab('ACCOUNTING'); setError(`Asiento no Cuadra. Debe: ${money(totalDebit)} · Haber: ${money(totalCredit)} · Cruce: ${money(total)}.`); return }

    const crossingId = editingId ?? crypto.randomUUID()
    const voucherId = crypto.randomUUID()
    const now = new Date().toISOString()
    const generated = { id: crossingId, companyId: context.company.id, number, date, customerId, customerName: selectedCustomer.businessName, detail: detail.trim(), total, status: 'GENERADO' as const, payload: payload(), accountingVoucherId: voucherId, user: context.actor.name, createdAt: now }
    saveAuthorizedCustomerAdvanceCrossings(context.company.id, [generated, ...readAuthorizedCustomerAdvanceCrossings(context.company.id)])
    setAdvanceRecords(applyCustomerAdvanceCrossing({ companyId: context.company.id, crossingId, applications: selectedAdvances.map(row => ({ advanceId: row.id, value: row.balance })) }))
    setReceivableRecords(applyAdvanceCrossingToReceivables({ companyId: context.company.id, crossingId, applications: selectedReceivables.map(row => ({ receivableId: row.id, value: row.balance })), appliedAt: now }))

    const voucherKey = accountingVoucherStorageKey(context.company.id)
    const vouchers = readJson<Array<Record<string, unknown>>>(voucherKey, [])
    localStorage.setItem(voucherKey, JSON.stringify([{ id: voucherId, number: getNextVoucherNumber(vouchers as AccountingVoucherRecord[], 'CRUCE_ANTICIPO_CLIENTE', undefined, context.company.id), date, type: 'CRUCE_ANTICIPO_CLIENTE', description: detail.trim() || `Cruce Anticipo Cliente ${number}`, debit: totalDebit.toFixed(2), credit: totalCredit.toFixed(2), status: 'AUTORIZADO', sourceAdvanceCrossingId: crossingId, lines: accountingLines.map(line => ({ accountCode: line.accountCode, contactId: line.contactId, contactName: line.contactName, debit: line.debit, credit: line.credit, description: line.description })) }, ...vouchers]))
    persistDrafts(drafts.filter(row => row.id !== editingId))
    setFormOpen(false); setEditingId(null); setMessage(`El cruce ${number} fue generado y creó un Asiento Contable de tipo Cruce Anticipo Cliente.`)
    window.open(`/vista-previa/cruce-anticipos-clientes/${encodeURIComponent(crossingId)}`, '_blank', 'noopener,noreferrer')
  }

  return <div className="page screen-page bank-deposit-page advance-crossing-page">
    <DocumentEditorHeader screen={screen} formOpen={formOpen} formTitle="Nuevo Cruce de Anticipos" sectionLabel="Cuentas por Cobrar" onClose={() => setFormOpen(false)} actions={<><button type="button" className="deposit-save" onClick={saveDraft}><Save />Guardar Borrador</button><button type="button" className="deposit-delete" onClick={() => setDeleteConfirm(true)}><Trash2 />Eliminar</button><button type="button" className="deposit-generate" onClick={generate}><CheckCircle2 />Generar Cruce</button></>} listAction={<button type="button" className="primary-action" onClick={openNew}><Plus />Nuevo Cruce</button>} />
    {error && <div className="bank-deposit-feedback error" role="alert"><AlertTriangle />{error}</div>}{message && <div className="bank-deposit-feedback success" role="status"><CheckCircle2 />{message}</div>}
    {deleteConfirm && <div className="deposit-delete-backdrop" role="dialog" aria-modal="true"><section><Trash2 /><h2>¿Eliminar {editingId ? 'el borrador' : 'el cruce en proceso'}?</h2><p>La información registrada será descartada.</p><footer><button type="button" className="quiet-button" onClick={() => setDeleteConfirm(false)}>Cancelar</button><button type="button" onClick={deleteDraft}>Sí, Eliminar</button></footer></section></div>}

    {!formOpen ? <section className="panel pending-deposits-card"><header><div><GitCompareArrows /><span><h2>Cruce de Anticipos Pendientes de Completar</h2><p>Borradores guardados que todavía no han generado un asiento contable.</p></span></div><strong>{drafts.length}<small>{drafts.length === 1 ? 'pendiente' : 'pendientes'}</small></strong></header><div><table><thead><tr><th aria-label="Editar" /><th># Cruce Anticipo</th><th>Fecha Emisión</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead><tbody>{drafts.map(row => <tr key={row.id}><td><button type="button" onClick={() => openDraft(row)} aria-label={`Editar cruce ${row.number}`}><Pencil /></button></td><td><strong>{row.number}</strong></td><td>{row.date || '—'}</td><td>{row.customerName || 'Pendiente de seleccionar'}</td><td>{money(row.total)}</td><td><span className="advance-crossing-draft-status">Guardado</span></td></tr>)}{!drafts.length && <tr><td colSpan={6}><div className="pending-deposits-empty"><GitCompareArrows /><strong>No existen cruces pendientes</strong><span>Selecciona Nuevo Cruce para iniciar el primer registro.</span></div></td></tr>}</tbody></table></div></section> : <>
      <section className="panel deposit-data-card"><header><div><GitCompareArrows /><span><h2>Datos del Cruce</h2><p>Aplicación de anticipos contra cartera pendiente del mismo cliente.</p></span></div></header><div className="deposit-data-grid advance-crossing-data-grid"><label><span># Cruce</span><input value={number} readOnly /></label><label><span>Fecha</span><input value={date} onChange={event => setDate(formatFullDateInput(event.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} /></label><label className="advance-crossing-customer"><span>Cliente</span><SearchableDatalistInput list="advance-crossing-customer-options" value={customerInput} onChange={event => selectCustomer(event.target.value)} onClear={() => selectCustomer('')} clearLabel="Borrar cliente" placeholder="Escribe para filtrar los clientes" /><datalist id="advance-crossing-customer-options">{customers.map(row => <option key={row.id} value={customerLabel(row)} />)}</datalist></label><label className="deposit-detail-field"><span>Detalle</span><textarea value={detail} onChange={event => setDetail(event.target.value)} maxLength={120} /><small>{detail.length}/120 caracteres</small></label><label><span>Total</span><input className="deposit-total" value={money(total)} readOnly /></label></div></section>
      <section className="panel deposit-tabs-card advance-crossing-tabs"><nav><button type="button" className={activeTab === 'CROSSING' ? 'active' : ''} onClick={() => setActiveTab('CROSSING')}><GitCompareArrows />Cruce Anticipo</button><button type="button" className={activeTab === 'ACCOUNTING' ? 'active' : ''} onClick={() => setActiveTab('ACCOUNTING')}><Scale />Contabilidad</button></nav>
        {activeTab === 'CROSSING' ? <div className="advance-crossing-selection"><section><header><div><strong>Anticipos Pendientes</strong><span>Anticipos disponibles del cliente seleccionado.</span></div></header><div><table><thead><tr><th><input type="checkbox" checked={customerAdvances.length > 0 && selectedAdvanceIds.size === customerAdvances.length} onChange={toggleAllAdvances} aria-label="Seleccionar todos los anticipos" /></th><th>Recaudación</th><th>Total</th><th>Cobrado</th><th>Saldo</th></tr></thead><tbody>{customerAdvances.map(row => <tr key={row.id} className={selectedAdvanceIds.has(row.id) ? 'selected' : ''}><td><input type="checkbox" checked={selectedAdvanceIds.has(row.id)} onChange={() => toggleAdvance(row.id)} /></td><td><strong>{row.collectionNumber} - {row.issueDate}</strong><small>{row.typeName} · {row.description}</small></td><td>{money(row.originalAmount)}</td><td>{money(row.originalAmount - row.balance)}</td><td>{money(row.balance)}</td></tr>)}{!customerAdvances.length && <tr><td colSpan={5}><div className="advance-crossing-empty">{selectedCustomer ? 'El cliente no tiene anticipos pendientes.' : 'Selecciona un cliente para consultar sus anticipos.'}</div></td></tr>}</tbody><tfoot><tr><td colSpan={4}>Total seleccionado</td><td>{money(advancesTotal)}</td></tr></tfoot></table></div></section><section><header><div><strong>Facturas Pendientes</strong><span>Documentos con saldo pendiente del cliente seleccionado.</span></div></header><div><table><thead><tr><th><input type="checkbox" checked={customerReceivables.length > 0 && selectedReceivableIds.size === customerReceivables.length} onChange={toggleAllReceivables} aria-label="Seleccionar todas las obligaciones" /></th><th>Factura/Expensa</th><th>Total</th><th>Cobrado</th><th>Saldo</th></tr></thead><tbody>{customerReceivables.map(row => <tr key={row.id} className={selectedReceivableIds.has(row.id) ? 'selected' : ''}><td><input type="checkbox" checked={selectedReceivableIds.has(row.id)} onChange={() => toggleReceivable(row.id)} /></td><td><strong>{row.receiptNumber}</strong><small>{row.issueDate}</small></td><td>{money(row.originalAmount)}</td><td>{money(row.collectedAmount)}</td><td>{money(row.balance)}</td></tr>)}{!customerReceivables.length && <tr><td colSpan={5}><div className="advance-crossing-empty">{selectedCustomer ? 'El cliente no tiene Expensas o Facturas pendientes.' : 'Selecciona un cliente para consultar su cartera.'}</div></td></tr>}</tbody><tfoot><tr><td colSpan={4}>Total seleccionado</td><td>{money(receivablesTotal)}</td></tr></tfoot></table></div></section></div> : <div className="deposit-accounting"><header><div><strong>Asiento Contable</strong><span>Debe, Haber y Total del Cruce deben coincidir.</span></div><button type="button" className="quiet-button" onClick={addLine}><Plus />Agregar Línea</button></header><div><table><thead><tr><th>Acciones</th><th>Cuenta Contable</th><th>Contacto</th><th>Debe</th><th>Haber</th><th>Descripción</th></tr></thead><tbody>{accountingLines.map(line => { const editing = editingLineId === line.id; return <tr key={line.id}><td><div className="deposit-line-actions"><button type="button" onClick={() => setEditingLineId(editing ? null : line.id)}>{editing ? <Check /> : <Pencil />}</button>{!line.automatic && <button type="button" onClick={() => setAccountingLines(current => current.filter(row => row.id !== line.id))}><Trash2 /></button>}</div></td><td>{editing ? <SearchableDatalistInput list="advance-crossing-account-options" value={line.accountCode} onChange={event => updateLine(line.id, 'accountCode', event.target.value)} onClear={() => updateLine(line.id, 'accountCode', '')} clearLabel="Borrar cuenta" placeholder="Filtrar Plan Contable" /> : <span><strong>{line.accountCode || '—'}</strong><small>{accounts.find(row => row.Codigo === line.accountCode)?.['Descripción']}</small></span>}</td><td>{line.contactName || '—'}</td><td className={!accountingMatches ? 'mismatch' : ''}>{editing ? <input inputMode="decimal" value={line.debit || ''} onChange={event => updateLine(line.id, 'debit', event.target.value)} /> : line.debit ? money(line.debit) : '—'}</td><td className={!accountingMatches ? 'mismatch' : ''}>{editing ? <input inputMode="decimal" value={line.credit || ''} onChange={event => updateLine(line.id, 'credit', event.target.value)} /> : line.credit ? money(line.credit) : '—'}</td><td>{editing ? <input value={line.description} onChange={event => updateLine(line.id, 'description', event.target.value)} maxLength={180} /> : line.description}</td></tr>})}{!accountingLines.length && <tr><td colSpan={6}><div className="deposit-accounting-empty"><FileText /><span>Selecciona anticipos y documentos para armar el asiento.</span></div></td></tr>}<tr className={!accountingMatches ? 'deposit-accounting-total mismatch' : 'deposit-accounting-total'}><td colSpan={3}>Totales</td><td>{money(totalDebit)}</td><td>{money(totalCredit)}</td><td>Cruce: {money(total)}</td></tr></tbody></table><datalist id="advance-crossing-account-options">{accounts.map(row => <option key={row.Codigo} value={row.Codigo}>{accountLabel(row)}</option>)}</datalist></div></div>}
      </section>
    </>}
  </div>
}
