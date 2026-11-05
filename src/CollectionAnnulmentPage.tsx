import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronRight, FileText, HandCoins, Pencil, Plus, RotateCcw, Save, Scale, Trash2 } from 'lucide-react'
import { api } from './api'
import { DocumentEditorHeader } from './DocumentEditorHeader'
import { accountingVoucherStorageKey, getNextVoucherNumber, type AccountingVoucherRecord } from './AccountingVoucherPage'
import { readAnnulledDepositSelectionKeys, depositSelectionKey } from './bank-deposit-annulment-records'
import { readAuthorizedBankDeposits } from './bank-deposit-records'
import {
  readAuthorizedCollectionAnnulments,
  readCollectionAnnulmentDrafts,
  saveAuthorizedCollectionAnnulments,
  saveCollectionAnnulmentDrafts,
  type CollectionAnnulmentDraft,
  type CollectionAnnulmentPayload,
} from './collection-annulment-records'
import { readAuthorizedCollections, saveAuthorizedCollections, type AuthorizedCollection, type CollectionAccountingLine } from './collection-records'
import { releaseCollectionFromReceivables } from './customer-receivables'
import { annulAdvancesForCollection } from './customer-advance-records'
import { type CustomerRow } from './CustomerRegistryPage'
import { formatFullDateInput } from './date-input'
import { validateOperationDate } from './operation-date-rules'
import { SearchableDatalistInput } from './SearchableDatalistInput'
import type { Context, ScreenSpec } from './types'

type Account = { Codigo: string; 'Descripción': string; Tipo: string; Estado: string }
type Tab = 'DETAIL' | 'ACCOUNTING'

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}

function money(value: number) {
  return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function todayDisplay() {
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
}

function displayDateToIso(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value
}

function numeric(value: string | number) {
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function readCustomers() {
  return readJson<CustomerRow[]>('saga.customers', [])
    .filter(customer => customer.state === 'ACTIVO')
    .sort((left, right) => left.businessName.localeCompare(right.businessName, 'es'))
}

function customerLabel(customer: CustomerRow) {
  return `${customer.identification} · ${customer.businessName}`
}

function collectionLabel(collection: AuthorizedCollection) {
  return `${collection.number} - ${collection.issueDate}`
}

function readAccounts() {
  return readJson<Account[]>('saga.accounting.plan', [])
    .filter(account => account.Tipo.toLocaleUpperCase('es') === 'AUXILIAR' && account.Estado.toLocaleUpperCase('es') !== 'INACTIVO')
    .sort((left, right) => left.Codigo.localeCompare(right.Codigo, 'es', { numeric: true }))
}

function accountLabel(account: Account) {
  return `${account.Codigo} · ${account['Descripción']}`
}

function nextNumber(companyId: string) {
  const numbers = [...readCollectionAnnulmentDrafts(companyId), ...readAuthorizedCollectionAnnulments(companyId)]
    .map(row => Number(/(\d+)$/.exec(row.number)?.[1] ?? 0))
  return `ANU-REC-${String(Math.max(0, ...numbers) + 1).padStart(6, '0')}`
}

export function CollectionAnnulmentPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <CollectionAnnulmentManager key={context.data.company.id} screen={screen} context={context.data} />
}

function CollectionAnnulmentManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const customers = useMemo(readCustomers, [])
  const accounts = useMemo(readAccounts, [])
  const [drafts, setDrafts] = useState(() => readCollectionAnnulmentDrafts(context.company.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [number, setNumber] = useState(() => nextNumber(context.company.id))
  const [date, setDate] = useState(todayDisplay)
  const [customerInput, setCustomerInput] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [detail, setDetail] = useState('')
  const [collectionInput, setCollectionInput] = useState('')
  const [collectionId, setCollectionId] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('DETAIL')
  const [accountingLines, setAccountingLines] = useState<CollectionAccountingLine[]>([])
  const [editingLineId, setEditingLineId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const restoring = useRef(false)

  const collections = readAuthorizedCollections(context.company.id)
  const deposits = readAuthorizedBankDeposits(context.company.id)
  const annulledDepositKeys = readAnnulledDepositSelectionKeys(context.company.id)
  const depositedCollectionIds = new Set(deposits.flatMap(deposit => deposit.payload.selectedCollectionIds
    .filter(id => !annulledDepositKeys.has(depositSelectionKey(deposit.id, id)))))
  const selectedCustomer = customers.find(customer => customer.id === customerId)
  const eligibleCollections = collections.filter(collection => collection.status === 'GENERADA'
    && collection.customerId === customerId && !depositedCollectionIds.has(collection.id))
  const collectionToConfirm = eligibleCollections.find(collection => collectionLabel(collection) === collectionInput)
  const selectedCollection = collections.find(collection => collection.id === collectionId)
  const releaseValues = selectedCollection?.payload.receiptValues ?? []
  const total = Number(selectedCollection?.total ?? 0)
  const totalDebit = Number(accountingLines.reduce((sum, line) => sum + Number(line.debit || 0), 0).toFixed(2))
  const totalCredit = Number(accountingLines.reduce((sum, line) => sum + Number(line.credit || 0), 0).toFixed(2))
  const accountingMatches = total > 0 && totalDebit === totalCredit && totalDebit === Number(total.toFixed(2))

  useEffect(() => {
    if (restoring.current) { restoring.current = false; return }
    const automatic = selectedCollection?.payload.accountingLines.map(line => ({
      ...line,
      id: `annul-${selectedCollection.id}-${line.id}`,
      debit: Number(line.credit.toFixed(2)),
      credit: Number(line.debit.toFixed(2)),
      description: `Anulación ${selectedCollection.number} · ${line.description}`,
      automatic: true,
    })) ?? []
    setAccountingLines(current => [...automatic, ...current.filter(line => !line.automatic)])
    setEditingLineId(null)
  }, [collectionId])

  const persistDrafts = (rows: CollectionAnnulmentDraft[]) => {
    const ordered = [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    setDrafts(ordered)
    saveCollectionAnnulmentDrafts(context.company.id, ordered)
  }

  const reset = () => {
    setEditingId(null); setNumber(nextNumber(context.company.id)); setDate(todayDisplay())
    setCustomerInput(''); setCustomerId(''); setDetail(''); setCollectionInput(''); setCollectionId('')
    setActiveTab('DETAIL'); setAccountingLines([]); setEditingLineId(null); setDeleteConfirm(false); setError(''); setMessage('')
  }

  const openNew = () => { reset(); setFormOpen(true) }
  const payload = (): CollectionAnnulmentPayload => ({ collectionId, accountingLines, activeTab })

  const saveDraft = () => {
    const now = new Date().toISOString()
    const current = drafts.find(row => row.id === editingId)
    const row: CollectionAnnulmentDraft = {
      id: editingId ?? crypto.randomUUID(), companyId: context.company.id, number, date, customerId,
      customerName: selectedCustomer?.businessName ?? customerInput.trim(), detail: detail.trim(), total,
      status: 'GUARDADA', payload: payload(), createdAt: current?.createdAt ?? now, updatedAt: now,
    }
    persistDrafts(editingId ? drafts.map(item => item.id === editingId ? row : item) : [row, ...drafts])
    setEditingId(row.id); setError(''); setMessage(`La anulación ${number} fue guardada como borrador.`)
  }

  const openDraft = (row: CollectionAnnulmentDraft) => {
    const customer = customers.find(item => item.id === row.customerId)
    const collection = collections.find(item => item.id === row.payload.collectionId)
    restoring.current = true
    setEditingId(row.id); setNumber(row.number); setDate(row.date); setCustomerId(row.customerId)
    setCustomerInput(customer ? customerLabel(customer) : row.customerName); setDetail(row.detail)
    setCollectionId(row.payload.collectionId); setCollectionInput(collection ? collectionLabel(collection) : '')
    setActiveTab(row.payload.activeTab); setAccountingLines(row.payload.accountingLines); setEditingLineId(null)
    setDeleteConfirm(false); setError(''); setMessage(''); setFormOpen(true)
  }

  const deleteDraft = () => {
    if (editingId) persistDrafts(drafts.filter(row => row.id !== editingId))
    setFormOpen(false); setDeleteConfirm(false)
    setMessage(editingId ? `El borrador ${number} fue eliminado.` : 'La anulación en proceso fue eliminada sin dejar registros.')
  }

  const selectCustomer = (value: string) => {
    const customer = customers.find(row => customerLabel(row) === value)
    setCustomerInput(value); setCustomerId(customer?.id ?? ''); setCollectionInput(''); setCollectionId('')
    setAccountingLines([]); setError('')
  }

  const confirmCollection = () => {
    if (!collectionToConfirm) { setError('Selecciona una Recaudación sin depósito antes de confirmarla.'); return }
    setCollectionId(collectionToConfirm.id); setCollectionInput(collectionLabel(collectionToConfirm)); setError('')
  }

  const updateLine = (id: string, field: 'accountCode' | 'debit' | 'credit' | 'description', value: string) => {
    setAccountingLines(current => current.map(line => line.id === id ? {
      ...line, [field]: field === 'debit' || field === 'credit' ? numeric(value) : value,
    } : line)); setError('')
  }

  const addLine = () => {
    const line: CollectionAccountingLine = { id: crypto.randomUUID(), accountCode: '', debit: 0, credit: 0, description: '', automatic: false }
    setAccountingLines(current => [...current, line]); setEditingLineId(line.id)
  }

  const generate = () => {
    setError('')
    const dateError = validateOperationDate(displayDateToIso(date))
    if (dateError) { setError(dateError); return }
    if (!selectedCustomer) { setError('Selecciona un Cliente activo.'); return }
    if (!selectedCollection) { setActiveTab('DETAIL'); setError('Selecciona una Recaudación vigente para anular.'); return }
    const currentCollection = readAuthorizedCollections(context.company.id).find(collection => collection.id === selectedCollection.id)
    if (!currentCollection || currentCollection.status !== 'GENERADA') { setActiveTab('DETAIL'); setError(`La recaudación ${selectedCollection.number} ya fue anulada. Actualiza la pantalla y vuelve a intentarlo.`); return }
    const currentDeposits = readAuthorizedBankDeposits(context.company.id)
    const currentAnnulledKeys = readAnnulledDepositSelectionKeys(context.company.id)
    const hasActiveDeposit = currentDeposits.some(deposit => deposit.payload.selectedCollectionIds.includes(selectedCollection.id)
      && !currentAnnulledKeys.has(depositSelectionKey(deposit.id, selectedCollection.id)))
    if (hasActiveDeposit) { setActiveTab('DETAIL'); setError(`La recaudación ${selectedCollection.number} tiene un Depósito asociado. Primero debe anularse el depósito.`); return }
    if (accountingLines.some(line => !accounts.some(account => account.Codigo === line.accountCode))) { setActiveTab('ACCOUNTING'); setError('Todas las líneas deben utilizar una cuenta contable Auxiliar activa.'); return }
    if (!accountingMatches) { setActiveTab('ACCOUNTING'); setError(`Asiento no Cuadra. Debe: ${money(totalDebit)} · Haber: ${money(totalCredit)} · Anulación: ${money(total)}.`); return }

    const annulmentId = editingId ?? crypto.randomUUID()
    const voucherId = crypto.randomUUID()
    const now = new Date().toISOString()
    const generated = {
      id: annulmentId, companyId: context.company.id, number, date, customerId: selectedCustomer.id,
      customerName: selectedCustomer.businessName, detail: detail.trim(), total, status: 'GENERADA' as const,
      payload: payload(), accountingVoucherId: voucherId, user: context.actor.name, createdAt: now,
    }
    saveAuthorizedCollectionAnnulments(context.company.id, [generated, ...readAuthorizedCollectionAnnulments(context.company.id)])
    saveAuthorizedCollections(context.company.id, readAuthorizedCollections(context.company.id)
      .map(collection => collection.id === currentCollection.id ? { ...collection, status: 'ANULADA' as const } : collection))
    releaseCollectionFromReceivables({ companyId: context.company.id, collectionId: selectedCollection.id, releasedAt: now })
    annulAdvancesForCollection({ companyId: context.company.id, collectionId: selectedCollection.id, annulmentId, annulledAt: now })

    const voucherKey = accountingVoucherStorageKey(context.company.id)
    const vouchers = readJson<Array<Record<string, unknown>>>(voucherKey, [])
    localStorage.setItem(voucherKey, JSON.stringify([{
      id: voucherId, number: getNextVoucherNumber(vouchers as AccountingVoucherRecord[], 'ANULACION_RECAUDACION', undefined, context.company.id), date, type: 'ANULACION_RECAUDACION',
      description: detail.trim() || `Anulación de Recaudación ${selectedCollection.number}`,
      debit: totalDebit.toFixed(2), credit: totalCredit.toFixed(2), status: 'AUTORIZADO',
      sourceCollectionAnnulmentId: annulmentId, sourceCollectionId: selectedCollection.id,
      lines: accountingLines.map(line => ({ accountCode: line.accountCode, debit: line.debit, credit: line.credit, description: line.description })),
    }, ...vouchers]))

    persistDrafts(drafts.filter(row => row.id !== editingId)); setFormOpen(false); setEditingId(null)
    setMessage(`La anulación ${number} fue generada. La cartera y los valores de la recaudación quedaron liberados.`)
    window.open(`/vista-previa/anulaciones-recaudacion/${encodeURIComponent(annulmentId)}`, '_blank', 'noopener,noreferrer')
  }

  return <div className="page screen-page deposit-annulment-page collection-annulment-page">
    <DocumentEditorHeader screen={screen} formOpen={formOpen} formTitle="Nueva Anulación de Recaudación" sectionLabel="Cuentas por cobrar" onClose={() => setFormOpen(false)} actions={<><button type="button" className="deposit-save" onClick={saveDraft}><Save />Guardar Borrador</button><button type="button" className="deposit-delete" onClick={() => setDeleteConfirm(true)}><Trash2 />Eliminar</button><button type="button" className="deposit-generate" onClick={generate}><RotateCcw />Generar Anulación</button></>} listAction={<button type="button" className="primary-action" onClick={openNew}><Plus />Nueva Anulación</button>} />
    {error && <div className="bank-deposit-feedback error" role="alert"><AlertTriangle />{error}</div>}
    {message && <div className="bank-deposit-feedback success" role="status"><CheckCircle2 />{message}</div>}
    {deleteConfirm && <div className="deposit-delete-backdrop" role="dialog" aria-modal="true"><section><Trash2 /><h2>¿Eliminar {editingId ? 'el borrador' : 'la anulación en proceso'}?</h2><p>La información registrada será descartada.</p><footer><button type="button" className="quiet-button" onClick={() => setDeleteConfirm(false)}>Cancelar</button><button type="button" onClick={deleteDraft}>Sí, Eliminar</button></footer></section></div>}

    {!formOpen ? <section className="panel pending-deposits-card"><header><div><RotateCcw /><span><h2>Anulaciones Pendientes de Completar</h2><p>Borradores que todavía no han liberado la cartera.</p></span></div><strong>{drafts.length}<small>{drafts.length === 1 ? 'pendiente' : 'pendientes'}</small></strong></header><div><table><thead><tr><th aria-label="Editar" /><th>Fecha</th><th>Detalle</th><th>Cliente</th><th>Valor</th></tr></thead><tbody>{drafts.map(row => <tr key={row.id}><td><button type="button" onClick={() => openDraft(row)} aria-label={`Editar ${row.number}`}><Pencil /></button></td><td>{row.date || '—'}</td><td><strong>{row.detail || 'Sin detalle'}</strong><small>{row.number}</small></td><td>{row.customerName || 'Pendiente de seleccionar'}</td><td>{money(row.total)}</td></tr>)}{!drafts.length && <tr><td colSpan={5}><div className="pending-deposits-empty"><RotateCcw /><strong>No existen anulaciones pendientes</strong><span>Selecciona Nueva Anulación para iniciar el primer registro.</span></div></td></tr>}</tbody></table></div></section> : <>
      <section className="panel deposit-data-card"><header><div><RotateCcw /><span><h2>Datos de la Anulación</h2><p>Información general del reverso de la recaudación.</p></span></div></header><div className="deposit-data-grid collection-annulment-data-grid">
        <label><span># Anulación</span><input value={number} readOnly /></label>
        <label><span>Fecha</span><input value={date} onChange={event => setDate(formatFullDateInput(event.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} /></label>
        <label className="collection-annulment-customer"><span>Cliente</span><SearchableDatalistInput list="collection-annulment-customers" value={customerInput} onChange={event => selectCustomer(event.target.value)} onClear={() => selectCustomer('')} clearLabel="Borrar cliente" placeholder="Escribe para filtrar los clientes" /><datalist id="collection-annulment-customers">{customers.map(customer => <option key={customer.id} value={customerLabel(customer)} />)}</datalist><small>{customers.length} clientes activos</small></label>
        <label className="deposit-detail-field"><span>Detalle</span><textarea value={detail} onChange={event => setDetail(event.target.value)} maxLength={160} /><small>{detail.length}/160 caracteres</small></label>
      </div></section>
      <section className="panel deposit-tabs-card"><nav><button type="button" className={activeTab === 'DETAIL' ? 'active' : ''} onClick={() => setActiveTab('DETAIL')}><FileText />Detalle</button><button type="button" className={activeTab === 'ACCOUNTING' ? 'active' : ''} onClick={() => setActiveTab('ACCOUNTING')}><Scale />Contabilidad</button></nav>
        {activeTab === 'DETAIL' ? <div className="collection-annulment-detail"><header><div><strong>Recaudación a Anular</strong><span>Solo se muestran recaudaciones del cliente que no tienen un depósito activo.</span></div><b>{selectedCollection ? money(total) : 'Pendiente'}</b></header><div className="collection-annulment-selector"><SearchableDatalistInput disabled={!selectedCustomer} list="collection-annulment-options" value={collectionInput} onChange={event => { setCollectionInput(event.target.value); if (collectionId) setCollectionId(''); setError('') }} onClear={() => { setCollectionInput(''); setCollectionId('') }} clearLabel="Borrar recaudación" placeholder={selectedCustomer ? 'Escribe o despliega las recaudaciones sin depósito' : 'Primero selecciona un cliente'} /><datalist id="collection-annulment-options">{eligibleCollections.map(collection => <option key={collection.id} value={collectionLabel(collection)} />)}</datalist><button type="button" disabled={!collectionToConfirm} onClick={confirmCollection}><Check />Confirmar</button></div>
          {selectedCollection ? <div className="collection-release-table"><h3><HandCoins />Valores afectados por la anulación de {selectedCollection.number}</h3><table><thead><tr><th>Documento</th><th>Tipo</th><th>Detalle</th><th>Resultado</th><th>Valor</th></tr></thead><tbody>{releaseValues.map(value => <tr key={`${value.kind}-${value.id}`}><td><strong>{value.document}</strong></td><td>{value.kind === 'ANTICIPO' ? 'Anticipo' : 'Expensa/Factura'}</td><td>{value.detail || '—'}</td><td><span className={value.kind === 'ANTICIPO' ? 'release-result annulled' : 'release-result pending'}>{value.kind === 'ANTICIPO' ? 'Será anulado' : 'Volverá a cartera pendiente'}</span></td><td>{money(value.value)}</td></tr>)}{!releaseValues.length && <tr><td colSpan={5}>La recaudación no tiene valores detallados.</td></tr>}</tbody><tfoot><tr><td colSpan={4}>Total de la recaudación</td><td>{money(total)}</td></tr></tfoot></table></div> : selectedCustomer && !eligibleCollections.length ? <div className="deposit-detail-empty"><CheckCircle2 /><strong>No existen recaudaciones disponibles</strong><span>Las recaudaciones del cliente están anuladas o tienen un depósito activo.</span></div> : null}
        </div> : <div className="deposit-accounting"><header><div><strong>Asiento Contable de Reverso</strong><span>Debe, Haber y Total de la Anulación deben coincidir.</span></div><button type="button" className="quiet-button" onClick={addLine}><Plus />Agregar Línea</button></header><div><table><thead><tr><th>Acciones</th><th>Cuenta Contable</th><th>Debe</th><th>Haber</th><th>Descripción</th></tr></thead><tbody>{accountingLines.map(line => { const editing = editingLineId === line.id; return <tr key={line.id}><td><div className="deposit-line-actions"><button type="button" onClick={() => setEditingLineId(editing ? null : line.id)} aria-label={editing ? 'Guardar línea' : 'Editar línea'}>{editing ? <Check /> : <Pencil />}</button>{!line.automatic && <button type="button" onClick={() => setAccountingLines(current => current.filter(item => item.id !== line.id))} aria-label="Eliminar línea"><Trash2 /></button>}</div></td><td>{editing ? <SearchableDatalistInput list="collection-annulment-account-options" value={line.accountCode} onChange={event => updateLine(line.id, 'accountCode', event.target.value)} onClear={() => updateLine(line.id, 'accountCode', '')} clearLabel="Borrar cuenta" placeholder="Filtrar Plan Contable" /> : <span><strong>{line.accountCode || '—'}</strong><small>{accounts.find(row => row.Codigo === line.accountCode)?.['Descripción']}</small></span>}</td><td className={!accountingMatches ? 'mismatch' : ''}>{editing ? <input inputMode="decimal" value={line.debit || ''} onChange={event => updateLine(line.id, 'debit', event.target.value)} /> : line.debit ? money(line.debit) : '—'}</td><td className={!accountingMatches ? 'mismatch' : ''}>{editing ? <input inputMode="decimal" value={line.credit || ''} onChange={event => updateLine(line.id, 'credit', event.target.value)} /> : line.credit ? money(line.credit) : '—'}</td><td>{editing ? <input value={line.description} onChange={event => updateLine(line.id, 'description', event.target.value)} maxLength={180} /> : line.description}</td></tr>})}{!accountingLines.length && <tr><td colSpan={5}><div className="deposit-accounting-empty"><FileText /><span>Confirma una recaudación para generar el asiento de reverso.</span></div></td></tr>}<tr className={!accountingMatches ? 'deposit-accounting-total mismatch' : 'deposit-accounting-total'}><td colSpan={2}>Totales</td><td>{money(totalDebit)}</td><td>{money(totalCredit)}</td><td>Anulación: {money(total)}</td></tr></tbody></table><datalist id="collection-annulment-account-options">{accounts.map(row => <option key={row.Codigo} value={row.Codigo}>{accountLabel(row)}</option>)}</datalist></div></div>}
      </section>
    </>}
  </div>
}
