import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronRight, FileText, HandCoins, Pencil, Plus, RotateCcw, Save, Scale, Trash2 } from 'lucide-react'
import { api } from './api'
import { DocumentEditorHeader } from './DocumentEditorHeader'
import { accountingVoucherStorageKey, getNextVoucherNumber, type AccountingVoucherRecord } from './AccountingVoucherPage'
import {
  readAuthorizedCustomerAdvanceCrossingAnnulments,
  readCustomerAdvanceCrossingAnnulmentDrafts,
  saveAuthorizedCustomerAdvanceCrossingAnnulments,
  saveCustomerAdvanceCrossingAnnulmentDrafts,
  type CustomerAdvanceCrossingAnnulmentDraft,
  type CustomerAdvanceCrossingAnnulmentPayload,
} from './customer-advance-crossing-annulment-records'
import {
  readAuthorizedCustomerAdvanceCrossings,
  saveAuthorizedCustomerAdvanceCrossings,
  type AuthorizedCustomerAdvanceCrossing,
  type CustomerAdvanceCrossingAccountingLine,
} from './customer-advance-crossing-records'
import { ensureCustomerAdvances, releaseCustomerAdvanceCrossing } from './customer-advance-records'
import { ensureCustomerReceivables, releaseAdvanceCrossingFromReceivables } from './customer-receivables'
import type { CustomerRow } from './CustomerRegistryPage'
import { formatFullDateInput } from './date-input'
import { validateOperationDate } from './operation-date-rules'
import { SearchableDatalistInput } from './SearchableDatalistInput'
import type { Context, ScreenSpec } from './types'

type Account = { Codigo: string; 'Descripción': string; Tipo: string; Estado: string }
type Tab = 'DETAIL' | 'ACCOUNTING'

function readJson<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback } }
function money(value: number) { return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) }
function todayDisplay() { return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()) }
function displayDateToIso(value: string) { const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value); return match ? `${match[3]}-${match[2]}-${match[1]}` : value }
function numeric(value: string | number) { const parsed = Number(String(value).replace(',', '.')); return Number.isFinite(parsed) ? Math.max(0, parsed) : 0 }
function customerLabel(row: CustomerRow) { return `${row.identification} · ${row.businessName}` }
function crossingLabel(row: AuthorizedCustomerAdvanceCrossing) { return `${row.number} - ${row.date}` }
function accountLabel(row: Account) { return `${row.Codigo} · ${row['Descripción']}` }

function readCustomers() {
  return readJson<CustomerRow[]>('saga.customers', []).filter(row => row.state === 'ACTIVO').sort((a, b) => a.businessName.localeCompare(b.businessName, 'es'))
}

function readAccounts() {
  return readJson<Account[]>('saga.accounting.plan', []).filter(row => row.Tipo.toLocaleUpperCase('es') === 'AUXILIAR' && row.Estado.toLocaleUpperCase('es') !== 'INACTIVO').sort((a, b) => a.Codigo.localeCompare(b.Codigo, 'es', { numeric: true }))
}

function nextNumber(companyId: string) {
  const values = [...readCustomerAdvanceCrossingAnnulmentDrafts(companyId), ...readAuthorizedCustomerAdvanceCrossingAnnulments(companyId)].map(row => Number(/(\d+)$/.exec(row.number)?.[1] ?? 0))
  return `ANU-CAC-${String(Math.max(0, ...values) + 1).padStart(6, '0')}`
}

export function CustomerAdvanceCrossingAnnulmentPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <CustomerAdvanceCrossingAnnulmentManager key={context.data.company.id} screen={screen} context={context.data} />
}

function CustomerAdvanceCrossingAnnulmentManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const customers = useMemo(readCustomers, [])
  const accounts = useMemo(readAccounts, [])
  const [drafts, setDrafts] = useState(() => readCustomerAdvanceCrossingAnnulmentDrafts(context.company.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [number, setNumber] = useState(() => nextNumber(context.company.id))
  const [date, setDate] = useState(todayDisplay)
  const [customerInput, setCustomerInput] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [detail, setDetail] = useState('')
  const [crossingInput, setCrossingInput] = useState('')
  const [crossingId, setCrossingId] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('DETAIL')
  const [accountingLines, setAccountingLines] = useState<CustomerAdvanceCrossingAccountingLine[]>([])
  const [editingLineId, setEditingLineId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const restoring = useRef(false)

  const crossings = readAuthorizedCustomerAdvanceCrossings(context.company.id)
  const advances = ensureCustomerAdvances(context.company.id)
  const receivables = ensureCustomerReceivables(context.company.id)
  const selectedCustomer = customers.find(row => row.id === customerId)
  const eligibleCrossings = crossings.filter(row => row.status === 'GENERADO' && row.customerId === customerId)
  const crossingToConfirm = eligibleCrossings.find(row => crossingLabel(row) === crossingInput)
  const selectedCrossing = crossings.find(row => row.id === crossingId)
  const selectedAdvances = selectedCrossing?.payload.selectedAdvanceIds.map(id => advances.find(row => row.id === id)).filter((row): row is NonNullable<typeof row> => Boolean(row)) ?? []
  const selectedReceivables = selectedCrossing?.payload.selectedReceivableIds.map(id => receivables.find(row => row.id === id)).filter((row): row is NonNullable<typeof row> => Boolean(row)) ?? []
  const total = Number(selectedCrossing?.total ?? 0)
  const totalDebit = Number(accountingLines.reduce((sum, row) => sum + numeric(row.debit), 0).toFixed(2))
  const totalCredit = Number(accountingLines.reduce((sum, row) => sum + numeric(row.credit), 0).toFixed(2))
  const accountingMatches = total > 0 && Math.abs(totalDebit - totalCredit) < .005 && Math.abs(totalDebit - total) < .005

  const advanceValue = (id: string) => Number(selectedCrossing?.payload.accountingLines.find(line => line.id === `advance-${id}`)?.debit ?? 0)
  const receivableValue = (id: string) => Number(selectedCrossing?.payload.accountingLines.find(line => line.id === `receivable-${id}`)?.credit ?? 0)

  useEffect(() => {
    if (restoring.current) { restoring.current = false; return }
    const automatic = selectedCrossing?.payload.accountingLines.map(line => ({
      ...line,
      id: `annul-${selectedCrossing.id}-${line.id}`,
      debit: Number(line.credit.toFixed(2)),
      credit: Number(line.debit.toFixed(2)),
      description: `Anulación ${selectedCrossing.number} · ${line.description}`,
      automatic: true,
    })) ?? []
    setAccountingLines(current => [...automatic, ...current.filter(line => !line.automatic)])
    setEditingLineId(null)
  }, [crossingId])

  const persistDrafts = (rows: CustomerAdvanceCrossingAnnulmentDraft[]) => {
    const ordered = [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    setDrafts(ordered); saveCustomerAdvanceCrossingAnnulmentDrafts(context.company.id, ordered)
  }

  const reset = () => {
    setEditingId(null); setNumber(nextNumber(context.company.id)); setDate(todayDisplay()); setCustomerInput(''); setCustomerId(''); setDetail('')
    setCrossingInput(''); setCrossingId(''); setActiveTab('DETAIL'); setAccountingLines([]); setEditingLineId(null); setDeleteConfirm(false); setError(''); setMessage('')
  }
  const openNew = () => { reset(); setFormOpen(true) }
  const payload = (): CustomerAdvanceCrossingAnnulmentPayload => ({ crossingId, accountingLines, activeTab })

  const saveDraft = () => {
    const now = new Date().toISOString()
    const current = drafts.find(row => row.id === editingId)
    const row: CustomerAdvanceCrossingAnnulmentDraft = {
      id: editingId ?? crypto.randomUUID(), companyId: context.company.id, number, date, customerId,
      customerName: selectedCustomer?.businessName ?? customerInput.trim(), detail: detail.trim(), total,
      status: 'GUARDADA', payload: payload(), createdAt: current?.createdAt ?? now, updatedAt: now,
    }
    persistDrafts(editingId ? drafts.map(item => item.id === editingId ? row : item) : [row, ...drafts])
    setEditingId(row.id); setError(''); setMessage(`La anulación ${number} fue guardada como borrador.`)
  }

  const openDraft = (row: CustomerAdvanceCrossingAnnulmentDraft) => {
    const customer = customers.find(item => item.id === row.customerId)
    const crossing = crossings.find(item => item.id === row.payload.crossingId)
    restoring.current = true
    setEditingId(row.id); setNumber(row.number); setDate(row.date); setCustomerId(row.customerId); setCustomerInput(customer ? customerLabel(customer) : row.customerName)
    setDetail(row.detail); setCrossingId(row.payload.crossingId); setCrossingInput(crossing ? crossingLabel(crossing) : '')
    setActiveTab(row.payload.activeTab); setAccountingLines(row.payload.accountingLines); setEditingLineId(null); setDeleteConfirm(false); setError(''); setMessage(''); setFormOpen(true)
  }

  const deleteDraft = () => {
    if (editingId) persistDrafts(drafts.filter(row => row.id !== editingId))
    setFormOpen(false); setDeleteConfirm(false); setMessage(editingId ? `El borrador ${number} fue eliminado.` : 'La anulación en proceso fue eliminada sin dejar registros.')
  }

  const selectCustomer = (value: string) => {
    const customer = customers.find(row => customerLabel(row) === value)
    setCustomerInput(value); setCustomerId(customer?.id ?? ''); setCrossingInput(''); setCrossingId(''); setAccountingLines([]); setError('')
  }

  const confirmCrossing = () => {
    if (!crossingToConfirm) { setError('Selecciona un Cruce de Anticipo Cliente vigente antes de confirmarlo.'); return }
    setCrossingId(crossingToConfirm.id); setCrossingInput(crossingLabel(crossingToConfirm)); setError('')
  }

  const updateLine = (id: string, field: 'accountCode' | 'debit' | 'credit' | 'description', value: string) => {
    setAccountingLines(current => current.map(line => line.id === id ? { ...line, [field]: field === 'debit' || field === 'credit' ? numeric(value) : value } : line)); setError('')
  }

  const addLine = () => {
    const line: CustomerAdvanceCrossingAccountingLine = { id: crypto.randomUUID(), accountCode: '', contactId: customerId, contactName: selectedCustomer?.businessName ?? '', debit: 0, credit: 0, description: detail.trim(), automatic: false }
    setAccountingLines(current => [...current, line]); setEditingLineId(line.id)
  }

  const generate = () => {
    setError('')
    const dateError = validateOperationDate(displayDateToIso(date))
    if (dateError) { setError(dateError); return }
    if (!selectedCustomer) { setError('Selecciona un Cliente activo.'); return }
    if (!selectedCrossing) { setActiveTab('DETAIL'); setError('Selecciona un Cruce de Anticipo Cliente vigente para anular.'); return }
    const currentCrossing = readAuthorizedCustomerAdvanceCrossings(context.company.id).find(row => row.id === selectedCrossing.id)
    if (!currentCrossing || currentCrossing.status !== 'GENERADO') { setActiveTab('DETAIL'); setError(`El cruce ${selectedCrossing.number} ya fue anulado. Actualiza la pantalla y vuelve a intentarlo.`); return }
    if (accountingLines.some(line => !accounts.some(account => account.Codigo === line.accountCode))) { setActiveTab('ACCOUNTING'); setError('Todas las líneas deben utilizar una cuenta contable Auxiliar activa.'); return }
    if (!accountingMatches) { setActiveTab('ACCOUNTING'); setError(`Asiento no Cuadra. Debe: ${money(totalDebit)} · Haber: ${money(totalCredit)} · Anulación: ${money(total)}.`); return }

    const annulmentId = editingId ?? crypto.randomUUID()
    const voucherId = crypto.randomUUID()
    const now = new Date().toISOString()
    const generated = {
      id: annulmentId, companyId: context.company.id, number, date, customerId: selectedCustomer.id, customerName: selectedCustomer.businessName,
      detail: detail.trim(), total, status: 'GENERADA' as const, payload: payload(), accountingVoucherId: voucherId, user: context.actor.name, createdAt: now,
    }
    saveAuthorizedCustomerAdvanceCrossingAnnulments(context.company.id, [generated, ...readAuthorizedCustomerAdvanceCrossingAnnulments(context.company.id)])
    saveAuthorizedCustomerAdvanceCrossings(context.company.id, readAuthorizedCustomerAdvanceCrossings(context.company.id).map(row => row.id === currentCrossing.id ? { ...row, status: 'ANULADO' as const } : row))
    releaseCustomerAdvanceCrossing({ companyId: context.company.id, crossingId: currentCrossing.id, applications: selectedAdvances.map(row => ({ advanceId: row.id, value: advanceValue(row.id) })) })
    releaseAdvanceCrossingFromReceivables({ companyId: context.company.id, crossingId: currentCrossing.id, applications: selectedReceivables.map(row => ({ receivableId: row.id, value: receivableValue(row.id) })), releasedAt: now })

    const voucherKey = accountingVoucherStorageKey(context.company.id)
    const vouchers = readJson<Array<Record<string, unknown>>>(voucherKey, [])
    localStorage.setItem(voucherKey, JSON.stringify([{
      id: voucherId, number: getNextVoucherNumber(vouchers as AccountingVoucherRecord[], 'ANULACION_CRUCE_ANTICIPO_CLIENTE', undefined, context.company.id), date, type: 'ANULACION_CRUCE_ANTICIPO_CLIENTE', description: detail.trim() || `Anulación Cruce de Anticipo Clientes ${selectedCrossing.number}`,
      debit: totalDebit.toFixed(2), credit: totalCredit.toFixed(2), status: 'AUTORIZADO', sourceAdvanceCrossingAnnulmentId: annulmentId,
      sourceAdvanceCrossingId: selectedCrossing.id, lines: accountingLines.map(line => ({ accountCode: line.accountCode, contactId: line.contactId, contactName: line.contactName, debit: line.debit, credit: line.credit, description: line.description })),
    }, ...vouchers]))

    persistDrafts(drafts.filter(row => row.id !== editingId)); setFormOpen(false); setEditingId(null)
    setMessage(`La anulación ${number} fue generada. Las Facturas y los Anticipos quedaron libres para utilizarse nuevamente.`)
    window.open(`/vista-previa/anulaciones-cruce-anticipos-clientes/${encodeURIComponent(annulmentId)}`, '_blank', 'noopener,noreferrer')
  }

  return <div className="page screen-page deposit-annulment-page collection-annulment-page advance-crossing-annulment-page">
    <DocumentEditorHeader screen={screen} formOpen={formOpen} formTitle="Nueva Anulación de Cruce de Anticipo Clientes" sectionLabel="Cuentas por cobrar" onClose={() => setFormOpen(false)} actions={<><button type="button" className="deposit-save" onClick={saveDraft}><Save />Guardar Borrador</button><button type="button" className="deposit-delete" onClick={() => setDeleteConfirm(true)}><Trash2 />Eliminar</button><button type="button" className="deposit-generate" onClick={generate}><RotateCcw />Generar Anulación</button></>} listAction={<button type="button" className="primary-action" onClick={openNew}><Plus />Nueva Anulación</button>} />
    {error && <div className="bank-deposit-feedback error" role="alert"><AlertTriangle />{error}</div>}
    {message && <div className="bank-deposit-feedback success" role="status"><CheckCircle2 />{message}</div>}
    {deleteConfirm && <div className="deposit-delete-backdrop" role="dialog" aria-modal="true"><section><Trash2 /><h2>¿Eliminar {editingId ? 'el borrador' : 'la anulación en proceso'}?</h2><p>La información registrada será descartada.</p><footer><button type="button" className="quiet-button" onClick={() => setDeleteConfirm(false)}>Cancelar</button><button type="button" onClick={deleteDraft}>Sí, Eliminar</button></footer></section></div>}

    {!formOpen ? <section className="panel pending-deposits-card"><header><div><RotateCcw /><span><h2>Anulaciones de Cruce de Anticipo Clientes Pendientes de Completar</h2><p>Borradores que todavía no han liberado la cartera ni los anticipos.</p></span></div><strong>{drafts.length}<small>{drafts.length === 1 ? 'pendiente' : 'pendientes'}</small></strong></header><div><table><thead><tr><th aria-label="Editar" /><th>Fecha</th><th>Detalle</th><th>Cliente</th><th>Valor</th></tr></thead><tbody>{drafts.map(row => <tr key={row.id}><td><button type="button" onClick={() => openDraft(row)} aria-label={`Editar ${row.number}`}><Pencil /></button></td><td>{row.date || '—'}</td><td><strong>{row.detail || 'Sin detalle'}</strong><small>{row.number}</small></td><td>{row.customerName || 'Pendiente de seleccionar'}</td><td>{money(row.total)}</td></tr>)}{!drafts.length && <tr><td colSpan={5}><div className="pending-deposits-empty"><RotateCcw /><strong>No existen anulaciones pendientes</strong><span>Selecciona Nueva Anulación para iniciar el primer registro.</span></div></td></tr>}</tbody></table></div></section> : <>
      <section className="panel deposit-data-card"><header><div><RotateCcw /><span><h2>Datos de la Anulación</h2><p>Información general del reverso del Cruce de Anticipo Cliente.</p></span></div></header><div className="deposit-data-grid collection-annulment-data-grid">
        <label><span># Anulación</span><input value={number} readOnly /></label>
        <label><span>Fecha</span><input value={date} onChange={event => setDate(formatFullDateInput(event.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} /></label>
        <label className="collection-annulment-customer"><span>Cliente</span><SearchableDatalistInput list="crossing-annulment-customers" value={customerInput} onChange={event => selectCustomer(event.target.value)} onClear={() => selectCustomer('')} clearLabel="Borrar cliente" placeholder="Escribe para filtrar los clientes" /><datalist id="crossing-annulment-customers">{customers.map(customer => <option key={customer.id} value={customerLabel(customer)} />)}</datalist><small>{customers.length} clientes activos</small></label>
        <label className="deposit-detail-field"><span>Detalle</span><textarea value={detail} onChange={event => setDetail(event.target.value)} maxLength={160} /><small>{detail.length}/160 caracteres</small></label>
      </div></section>
      <section className="panel deposit-tabs-card"><nav><button type="button" className={activeTab === 'DETAIL' ? 'active' : ''} onClick={() => setActiveTab('DETAIL')}><FileText />Detalle</button><button type="button" className={activeTab === 'ACCOUNTING' ? 'active' : ''} onClick={() => setActiveTab('ACCOUNTING')}><Scale />Contabilidad</button></nav>
        {activeTab === 'DETAIL' ? <div className="collection-annulment-detail"><header><div><strong>Cruce de Anticipo Cliente a Anular</strong><span>Se muestran únicamente los cruces vigentes del cliente seleccionado.</span></div><b>{selectedCrossing ? money(total) : 'Pendiente'}</b></header><div className="collection-annulment-selector"><SearchableDatalistInput disabled={!selectedCustomer} list="crossing-annulment-options" value={crossingInput} onChange={event => { setCrossingInput(event.target.value); if (crossingId) setCrossingId(''); setError('') }} onClear={() => { setCrossingInput(''); setCrossingId('') }} clearLabel="Borrar cruce" placeholder={selectedCustomer ? 'Escribe o despliega los cruces vigentes' : 'Primero selecciona un cliente'} /><datalist id="crossing-annulment-options">{eligibleCrossings.map(crossing => <option key={crossing.id} value={crossingLabel(crossing)} />)}</datalist><button type="button" disabled={!crossingToConfirm} onClick={confirmCrossing}><Check />Confirmar</button></div>
          {selectedCrossing ? <div className="collection-release-table"><h3><HandCoins />Valores que se liberarán al anular {selectedCrossing.number}</h3><table><thead><tr><th>Documento</th><th>Tipo</th><th>Detalle</th><th>Resultado</th><th>Valor</th></tr></thead><tbody>{selectedAdvances.map(row => <tr key={`advance-${row.id}`}><td><strong>{row.collectionNumber}</strong></td><td>Anticipo · {row.typeName}</td><td>{row.description || '—'}</td><td><span className="release-result pending">Disponible para nuevo cruce</span></td><td>{money(advanceValue(row.id))}</td></tr>)}{selectedReceivables.map(row => <tr key={`receivable-${row.id}`}><td><strong>{row.receiptNumber}</strong></td><td>Expensa/Factura</td><td>{row.businessName || selectedCrossing.customerName}</td><td><span className="release-result pending">Volverá a cartera pendiente</span></td><td>{money(receivableValue(row.id))}</td></tr>)}{!selectedAdvances.length && !selectedReceivables.length && <tr><td colSpan={5}>El cruce no tiene valores detallados.</td></tr>}</tbody><tfoot><tr><td colSpan={4}>Total del cruce</td><td>{money(total)}</td></tr></tfoot></table></div> : selectedCustomer && !eligibleCrossings.length ? <div className="deposit-detail-empty"><CheckCircle2 /><strong>No existen cruces disponibles</strong><span>El cliente no tiene Cruces de Anticipo vigentes para anular.</span></div> : null}
        </div> : <div className="deposit-accounting"><header><div><strong>Asiento Contable de Reverso</strong><span>Debe, Haber y Total de la Anulación deben coincidir.</span></div><button type="button" className="quiet-button" onClick={addLine}><Plus />Agregar Línea</button></header><div><table><thead><tr><th>Acciones</th><th>Cuenta Contable</th><th>Debe</th><th>Haber</th><th>Descripción</th></tr></thead><tbody>{accountingLines.map(line => { const editing = editingLineId === line.id; return <tr key={line.id}><td><div className="deposit-line-actions"><button type="button" onClick={() => setEditingLineId(editing ? null : line.id)} aria-label={editing ? 'Guardar línea' : 'Editar línea'}>{editing ? <Check /> : <Pencil />}</button>{!line.automatic && <button type="button" onClick={() => setAccountingLines(current => current.filter(item => item.id !== line.id))} aria-label="Eliminar línea"><Trash2 /></button>}</div></td><td>{editing ? <SearchableDatalistInput list="crossing-annulment-account-options" value={line.accountCode} onChange={event => updateLine(line.id, 'accountCode', event.target.value)} onClear={() => updateLine(line.id, 'accountCode', '')} clearLabel="Borrar cuenta" placeholder="Filtrar Plan Contable" /> : <span><strong>{line.accountCode || '—'}</strong><small>{accounts.find(row => row.Codigo === line.accountCode)?.['Descripción']}</small></span>}</td><td className={!accountingMatches ? 'mismatch' : ''}>{editing ? <input inputMode="decimal" value={line.debit || ''} onFocus={event => event.currentTarget.select()} onChange={event => updateLine(line.id, 'debit', event.target.value)} /> : line.debit ? money(line.debit) : '—'}</td><td className={!accountingMatches ? 'mismatch' : ''}>{editing ? <input inputMode="decimal" value={line.credit || ''} onFocus={event => event.currentTarget.select()} onChange={event => updateLine(line.id, 'credit', event.target.value)} /> : line.credit ? money(line.credit) : '—'}</td><td>{editing ? <input value={line.description} onChange={event => updateLine(line.id, 'description', event.target.value)} maxLength={180} /> : line.description}</td></tr>})}{!accountingLines.length && <tr><td colSpan={5}><div className="deposit-accounting-empty"><FileText /><span>Confirma un Cruce de Anticipo Cliente para generar el asiento de reverso.</span></div></td></tr>}<tr className={!accountingMatches ? 'deposit-accounting-total mismatch' : 'deposit-accounting-total'}><td colSpan={2}>Totales</td><td>{money(totalDebit)}</td><td>{money(totalCredit)}</td><td>Anulación: {money(total)}</td></tr></tbody></table><datalist id="crossing-annulment-account-options">{accounts.map(row => <option key={row.Codigo} value={row.Codigo}>{accountLabel(row)}</option>)}</datalist></div></div>}
      </section>
    </>}
  </div>
}
