import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronRight, FileText, Landmark, Pencil, Plus, Save, Scale, Trash2 } from 'lucide-react'
import { api } from './api'
import { accountingVoucherStorageKey, getNextVoucherNumber, type AccountingVoucherRecord } from './AccountingVoucherPage'
import { readBankAccounts, type BankAccountRecord } from './BankAccountsPage'
import {
  readAuthorizedBankDeposits,
  readBankDepositDrafts,
  saveAuthorizedBankDeposits,
  saveBankDepositDrafts,
  type BankDepositAccountingLine,
  type BankDepositDraft,
  type BankDepositPayload,
} from './bank-deposit-records'
import { AUTHORIZED_COLLECTIONS_CHANGED_EVENT, authorizedCollectionStorageKey, readAuthorizedCollections, type AuthorizedCollection } from './collection-records'
import { DocumentEditorHeader } from './DocumentEditorHeader'
import {
  authorizedDepositAnnulmentStorageKey,
  BANK_DEPOSIT_AVAILABILITY_EVENT,
  depositSelectionKey,
  readAnnulledDepositSelectionKeys,
} from './bank-deposit-annulment-records'
import { formatFullDateInput } from './date-input'
import { validateOperationDate } from './operation-date-rules'
import { SearchableDatalistInput } from './SearchableDatalistInput'
import type { Context, ScreenSpec } from './types'

type Account = { Codigo: string; 'Descripción': string; Tipo: string; Estado: string }
type Assignments = Record<string, string>
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

function readAccounts() {
  return readJson<Account[]>('saga.accounting.plan', [])
    .filter(row => row.Tipo.toLocaleUpperCase('es') === 'AUXILIAR' && row.Estado.toLocaleUpperCase('es') !== 'INACTIVO')
    .sort((left, right) => left.Codigo.localeCompare(right.Codigo, 'es', { numeric: true }))
}

function accountLabel(account: Account) {
  return `${account.Codigo} · ${account['Descripción']}`
}

function bankLabel(account: BankAccountRecord) {
  return `${account.bank} · ${account.type === 'AHORRO' ? 'Ahorro' : 'Corriente'} · ${account.accountNumber} · ${account.holder}`
}

function nextDepositNumber(companyId: string) {
  const numbers = [...readBankDepositDrafts(companyId), ...readAuthorizedBankDeposits(companyId)]
    .map(row => Number(/(\d+)$/.exec(row.number)?.[1] ?? 0))
  return `DEP-${String(Math.max(0, ...numbers) + 1).padStart(6, '0')}`
}

function collectionLabel(record: AuthorizedCollection) {
  return `${record.number} - ${record.issueDate} - ${record.customerName}`
}

export function BankDepositEntryPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <BankDepositEntryManager key={context.data.company.id} screen={screen} context={context.data} />
}

function BankDepositEntryManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const accounts = useMemo(readAccounts, [])
  const bankAccounts = useMemo(() => readBankAccounts(context.company.id).filter(row => row.state === 'ACTIVA'), [context.company.id])
  const collections = readAuthorizedCollections(context.company.id).filter(collection => collection.status === 'GENERADA')
  const assignments = useMemo(() => readJson<Assignments>(`saga.accounting.account-assignments:${context.company.id}`, {}), [context.company.id])
  const [drafts, setDrafts] = useState(() => readBankDepositDrafts(context.company.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [number, setNumber] = useState(() => nextDepositNumber(context.company.id))
  const [date, setDate] = useState(todayDisplay)
  const [bankInput, setBankInput] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [depositSlip, setDepositSlip] = useState('')
  const [detail, setDetail] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [collectionInput, setCollectionInput] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('DETAIL')
  const [accountingLines, setAccountingLines] = useState<BankDepositAccountingLine[]>([])
  const [editingLineId, setEditingLineId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [, refreshDepositAvailability] = useState(0)
  const restoring = useRef(false)

  useEffect(() => {
    const refresh = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.companyId !== context.company.id) return
      refreshDepositAvailability(value => value + 1)
    }
    const refreshFromStorage = (event: StorageEvent) => {
      if ([authorizedDepositAnnulmentStorageKey(context.company.id), authorizedCollectionStorageKey(context.company.id)].includes(event.key ?? '')) refreshDepositAvailability(value => value + 1)
    }
    window.addEventListener(BANK_DEPOSIT_AVAILABILITY_EVENT, refresh)
    window.addEventListener(AUTHORIZED_COLLECTIONS_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refreshFromStorage)
    return () => {
      window.removeEventListener(BANK_DEPOSIT_AVAILABILITY_EVENT, refresh)
      window.removeEventListener(AUTHORIZED_COLLECTIONS_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refreshFromStorage)
    }
  }, [context.company.id])

  const authorizedDeposits = readAuthorizedBankDeposits(context.company.id)
  const annulledSelectionKeys = readAnnulledDepositSelectionKeys(context.company.id)
  const depositedCollectionIds = new Set(authorizedDeposits.flatMap(row => row.payload.selectedCollectionIds
    .filter(collectionId => !annulledSelectionKeys.has(depositSelectionKey(row.id, collectionId)))))
  const availableCollections = collections.filter(row => !depositedCollectionIds.has(row.id) && !selectedIds.has(row.id))
  const selectedCollections = collections.filter(row => selectedIds.has(row.id))
  const collectionToConfirm = availableCollections.find(row => collectionLabel(row) === collectionInput)
  const selectedBank = bankAccounts.find(row => row.id === bankAccountId)
  const total = Number(selectedCollections.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2))
  const totalDebit = Number(accountingLines.reduce((sum, line) => sum + Number(line.debit || 0), 0).toFixed(2))
  const totalCredit = Number(accountingLines.reduce((sum, line) => sum + Number(line.credit || 0), 0).toFixed(2))
  const accountingMatches = total > 0 && totalDebit === totalCredit && totalDebit === total
  const sourceSignature = JSON.stringify({ ids: selectedCollections.map(row => row.id), bankAccountId, number })

  useEffect(() => {
    if (restoring.current) { restoring.current = false; return }
    const automatic: BankDepositAccountingLine[] = selectedCollections.flatMap(collection => [
      {
        id: `cash-${collection.id}`,
        accountCode: assignments.GENERAL_CASH ?? '',
        contactId: collection.customerId,
        contactName: collection.customerName,
        debit: 0,
        credit: Number(collection.total.toFixed(2)),
        description: `Caja General · ${collection.number} · ${collection.payload.detail || 'Recaudación'}`,
        automatic: true,
      },
      {
        id: `bank-${collection.id}`,
        accountCode: selectedBank?.accountCode ?? '',
        contactId: collection.customerId,
        contactName: collection.customerName,
        debit: Number(collection.total.toFixed(2)),
        credit: 0,
        description: `${collection.number} · ${collection.payload.detail || detail || 'Depósito bancario'}`,
        automatic: true,
      },
    ])
    setAccountingLines(current => [...automatic, ...current.filter(line => !line.automatic)])
    setEditingLineId(null)
  }, [sourceSignature, assignments.GENERAL_CASH, selectedBank?.accountCode])

  const persistDrafts = (rows: BankDepositDraft[]) => {
    const ordered = [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    setDrafts(ordered)
    saveBankDepositDrafts(context.company.id, ordered)
  }

  const resetForm = () => {
    setEditingId(null)
    setNumber(nextDepositNumber(context.company.id))
    setDate(todayDisplay())
    setBankInput('')
    setBankAccountId('')
    setDepositSlip('')
    setDetail('')
    setSelectedIds(new Set())
    setCollectionInput('')
    setActiveTab('DETAIL')
    setAccountingLines([])
    setEditingLineId(null)
    setDeleteConfirm(false)
    setError('')
    setMessage('')
  }

  const openNew = () => { resetForm(); setFormOpen(true) }

  const payload = (): BankDepositPayload => ({ selectedCollectionIds: Array.from(selectedIds), accountingLines, activeTab })

  const saveDraft = () => {
    const now = new Date().toISOString()
    const current = drafts.find(row => row.id === editingId)
    const row: BankDepositDraft = {
      id: editingId ?? crypto.randomUUID(), companyId: context.company.id, number, date, bankAccountId,
      depositSlip: depositSlip.trim(), detail: detail.trim(), total, status: 'GUARDADO', payload: payload(),
      createdAt: current?.createdAt ?? now, updatedAt: now,
    }
    persistDrafts(editingId ? drafts.map(item => item.id === editingId ? row : item) : [row, ...drafts])
    setEditingId(row.id)
    setError('')
    setMessage(`El depósito ${number} fue guardado como borrador.`)
  }

  const openDraft = (row: BankDepositDraft) => {
    const bank = bankAccounts.find(item => item.id === row.bankAccountId)
    restoring.current = true
    setEditingId(row.id)
    setNumber(row.number)
    setDate(row.date)
    setBankAccountId(row.bankAccountId)
    setBankInput(bank ? bankLabel(bank) : '')
    setDepositSlip(row.depositSlip)
    setDetail(row.detail)
    setSelectedIds(new Set(row.payload.selectedCollectionIds))
    setCollectionInput('')
    setActiveTab(row.payload.activeTab)
    setAccountingLines(row.payload.accountingLines)
    setEditingLineId(null)
    setError('')
    setMessage('')
    setFormOpen(true)
  }

  const deleteDraft = () => {
    if (editingId) persistDrafts(drafts.filter(row => row.id !== editingId))
    setFormOpen(false)
    setDeleteConfirm(false)
    setMessage(editingId ? `El borrador ${number} fue eliminado.` : 'El depósito en proceso fue eliminado sin dejar registros.')
  }

  const selectBank = (value: string) => {
    setBankInput(value)
    const bank = bankAccounts.find(row => bankLabel(row) === value)
    setBankAccountId(bank?.id ?? '')
    setError('')
  }

  const confirmCollection = () => {
    if (!collectionToConfirm) {
      setError('Selecciona una Recaudación pendiente de la lista antes de confirmarla.')
      return
    }
    setSelectedIds(current => new Set([...current, collectionToConfirm.id]))
    setCollectionInput('')
    setError('')
  }

  const removeCollection = (id: string) => {
    setSelectedIds(current => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
    setError('')
  }

  const toggleCollection = (id: string) => {
    if (selectedIds.has(id)) removeCollection(id)
    else setSelectedIds(current => new Set([...current, id]))
  }

  const updateLine = (id: string, field: 'accountCode' | 'debit' | 'credit' | 'description', value: string) => {
    setAccountingLines(current => current.map(line => line.id === id ? {
      ...line,
      [field]: field === 'debit' || field === 'credit' ? numeric(value) : value,
    } : line))
    setError('')
  }

  const addLine = () => {
    const line: BankDepositAccountingLine = { id: crypto.randomUUID(), accountCode: '', contactId: '', contactName: '', debit: 0, credit: 0, description: '', automatic: false }
    setAccountingLines(current => [...current, line])
    setEditingLineId(line.id)
  }

  const generate = () => {
    setError('')
    const dateError = validateOperationDate(displayDateToIso(date))
    if (dateError) { setError(dateError); return }
    if (!selectedBank) { setError('Selecciona una Cuenta Bancaria activa.'); return }
    if (!selectedIds.size) { setActiveTab('DETAIL'); setError('Selecciona al menos una Recaudación pendiente de depositar.'); return }
    const currentAnnulledKeys = readAnnulledDepositSelectionKeys(context.company.id)
    const currentDepositedIds = new Set(readAuthorizedBankDeposits(context.company.id).flatMap(row => row.payload.selectedCollectionIds
      .filter(collectionId => !currentAnnulledKeys.has(depositSelectionKey(row.id, collectionId)))))
    const duplicated = selectedCollections.find(row => currentDepositedIds.has(row.id))
    if (duplicated) { setActiveTab('DETAIL'); setError(`La recaudación ${duplicated.number} ya fue incluida en otro depósito. Actualiza la pantalla y vuelve a intentarlo.`); return }
    if (!assignments.GENERAL_CASH) { setActiveTab('ACCOUNTING'); setError('Configura Caja General en Asignación de Cuentas Contables.'); return }
    if (!selectedBank.accountCode) { setActiveTab('ACCOUNTING'); setError('La Cuenta Bancaria seleccionada no tiene una Cuenta Contable configurada.'); return }
    if (accountingLines.some(line => !accounts.some(account => account.Codigo === line.accountCode))) { setActiveTab('ACCOUNTING'); setError('Todas las líneas deben utilizar una cuenta contable Auxiliar activa.'); return }
    if (!accountingMatches) {
      setActiveTab('ACCOUNTING')
      setError(`Asiento no Cuadra. Debe: ${money(totalDebit)} · Haber: ${money(totalCredit)} · Depósito: ${money(total)}.`)
      return
    }

    const depositId = editingId ?? crypto.randomUUID()
    const voucherId = crypto.randomUUID()
    const now = new Date().toISOString()
    const generated = {
      id: depositId, companyId: context.company.id, number, date, bankAccountId: selectedBank.id,
      depositSlip: depositSlip.trim(), detail: detail.trim(), total, status: 'GENERADO' as const,
      payload: payload(), accountingVoucherId: voucherId, user: context.actor.name, createdAt: now,
    }
    saveAuthorizedBankDeposits(context.company.id, [generated, ...readAuthorizedBankDeposits(context.company.id)])

    const voucherKey = accountingVoucherStorageKey(context.company.id)
    const vouchers = readJson<Array<Record<string, unknown>>>(voucherKey, [])
    localStorage.setItem(voucherKey, JSON.stringify([{
      id: voucherId, number: getNextVoucherNumber(vouchers as AccountingVoucherRecord[], 'DEPOSITO', undefined, context.company.id), date, type: 'DEPOSITO',
      description: detail.trim() || `Depósito ${number} · ${selectedBank.bank} ${selectedBank.accountNumber}`,
      debit: totalDebit.toFixed(2), credit: totalCredit.toFixed(2), status: 'AUTORIZADO', sourceDepositId: depositId,
      lines: accountingLines.map(line => ({ accountCode: line.accountCode, contactId: line.contactId, contactName: line.contactName, debit: line.debit, credit: line.credit, description: line.description })),
    }, ...vouchers]))

    persistDrafts(drafts.filter(row => row.id !== editingId))
    setFormOpen(false)
    setEditingId(null)
    setMessage(`El depósito ${number} fue generado y creó un Asiento Contable de tipo Depósito.`)
    window.open(`/vista-previa/depositos/${encodeURIComponent(depositId)}`, '_blank', 'noopener,noreferrer')
  }

  return <div className="page screen-page bank-deposit-page">
    <DocumentEditorHeader screen={screen} formOpen={formOpen} formTitle="Nuevo Depósito" sectionLabel="Bancos" onClose={() => setFormOpen(false)} actions={<><button type="button" className="deposit-save" onClick={saveDraft}><Save />Guardar Borrador</button><button type="button" className="deposit-delete" onClick={() => setDeleteConfirm(true)}><Trash2 />Eliminar</button><button type="button" className="deposit-generate" onClick={generate}><CheckCircle2 />Generar Depósito</button></>} listAction={<button type="button" className="primary-action" onClick={openNew}><Plus />Nuevo Depósito</button>} />
    {error && <div className="bank-deposit-feedback error" role="alert"><AlertTriangle />{error}</div>}
    {message && <div className="bank-deposit-feedback success" role="status"><CheckCircle2 />{message}</div>}

    {deleteConfirm && <div className="deposit-delete-backdrop" role="dialog" aria-modal="true"><section><Trash2 /><h2>¿Eliminar {editingId ? 'el borrador' : 'el depósito en proceso'}?</h2><p>La información registrada en esta pantalla será descartada.</p><footer><button type="button" className="quiet-button" onClick={() => setDeleteConfirm(false)}>Cancelar</button><button type="button" onClick={deleteDraft}>Sí, Eliminar</button></footer></section></div>}

    {!formOpen ? <section className="panel pending-deposits-card"><header><div><Landmark /><span><h2>Depósitos Pendientes de Completar</h2><p>Borradores guardados que todavía no han generado un asiento contable.</p></span></div><strong>{drafts.length}<small>{drafts.length === 1 ? 'pendiente' : 'pendientes'}</small></strong></header><div><table><thead><tr><th aria-label="Editar" /><th>Fecha</th><th>Detalle</th><th>Cuenta Bancaria</th></tr></thead><tbody>{drafts.map(row => { const bank = bankAccounts.find(item => item.id === row.bankAccountId); return <tr key={row.id}><td><button type="button" onClick={() => openDraft(row)} aria-label={`Editar depósito ${row.number}`}><Pencil /></button></td><td>{row.date || '—'}</td><td><strong>{row.detail || 'Sin detalle'}</strong><small>{row.number}</small></td><td>{bank ? `${bank.bank} · ${bank.accountNumber}` : 'Pendiente de seleccionar'}</td></tr> })}{!drafts.length && <tr><td colSpan={4}><div className="pending-deposits-empty"><Landmark /><strong>No existen depósitos pendientes</strong><span>Selecciona Nuevo Depósito para iniciar el primer registro.</span></div></td></tr>}</tbody></table></div></section> : <>
      <section className="panel deposit-data-card"><header><div><Landmark /><span><h2>Datos del Depósito</h2><p>Información general del comprobante bancario.</p></span></div></header><div className="deposit-data-grid">
        <label><span># Depósito</span><input value={number} readOnly /></label>
        <label><span>Fecha</span><input value={date} onChange={event => setDate(formatFullDateInput(event.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} /></label>
        <label className="deposit-bank-field"><span>Cuenta Bancaria</span><SearchableDatalistInput list="deposit-bank-options" value={bankInput} onChange={event => selectBank(event.target.value)} onClear={() => selectBank('')} clearLabel="Borrar cuenta bancaria" placeholder="Escribe para filtrar las cuentas" /><datalist id="deposit-bank-options">{bankAccounts.map(row => <option key={row.id} value={bankLabel(row)} />)}</datalist><small>{bankAccounts.length ? `${bankAccounts.length} cuentas activas disponibles` : 'No existen cuentas bancarias activas.'}</small></label>
        <label><span># Papeleta</span><input value={depositSlip} onChange={event => setDepositSlip(event.target.value)} maxLength={40} /></label>
        <label className="deposit-detail-field"><span>Detalle</span><textarea value={detail} onChange={event => setDetail(event.target.value)} maxLength={160} /><small>{detail.length}/160 caracteres</small></label>
        <label><span>Total</span><input className="deposit-total" value={money(total)} readOnly /></label>
      </div></section>
      <section className="panel deposit-tabs-card"><nav><button type="button" className={activeTab === 'DETAIL' ? 'active' : ''} onClick={() => setActiveTab('DETAIL')}><FileText />Detalle</button><button type="button" className={activeTab === 'ACCOUNTING' ? 'active' : ''} onClick={() => setActiveTab('ACCOUNTING')}><Scale />Contabilidad</button></nav>
        {activeTab === 'DETAIL' && <div className="deposit-detail-tab progressive"><header><div><strong>Recaudaciones pendientes de depositar</strong><span>Busca y confirma cada recaudación. Al confirmar se habilita automáticamente una nueva línea.</span></div><b>{selectedIds.size} confirmadas</b></header><div><table><thead><tr><th>Recaudación</th><th>Valor</th><th>Acción</th></tr></thead><tbody>
          {selectedCollections.map(row => <tr key={row.id} className="selected"><td><strong>{collectionLabel(row)}</strong><small>{row.payload.detail || 'Sin detalle registrado'}</small></td><td>{money(row.total)}</td><td><button type="button" className="deposit-remove-collection" onClick={() => removeCollection(row.id)}><Trash2 />Quitar</button></td></tr>)}
          <tr className="deposit-collection-entry"><td><SearchableDatalistInput autoFocus disabled={!availableCollections.length} list="deposit-collection-options" value={collectionInput} onChange={event => { setCollectionInput(event.target.value); setError('') }} onClear={() => setCollectionInput('')} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); confirmCollection() } }} clearLabel="Borrar recaudación" placeholder={availableCollections.length ? 'Escribe para buscar una recaudación sin depósito' : 'No existen más recaudaciones pendientes'} /><datalist id="deposit-collection-options">{availableCollections.map(row => <option key={row.id} value={collectionLabel(row)} />)}</datalist><small>{availableCollections.length} {availableCollections.length === 1 ? 'recaudación disponible' : 'recaudaciones disponibles'}</small></td><td>{collectionToConfirm ? money(collectionToConfirm.total) : '—'}</td><td><button type="button" className="deposit-confirm-collection" disabled={!collectionToConfirm} onClick={confirmCollection}><Check />Confirmar</button></td></tr>
        </tbody><tfoot><tr><td>Total Depósito</td><td>{money(total)}</td><td /></tr></tfoot></table></div></div>}
        {activeTab === 'DETAIL' ? <div className="deposit-detail-tab"><header><div><strong>Recaudaciones pendientes de depositar</strong><span>Selecciona una o varias recaudaciones. Cada registro se puede incluir en un solo depósito.</span></div><b>{selectedIds.size} seleccionadas</b></header><div><table><thead><tr><th>Seleccionar</th><th>Recaudación</th><th>Valor</th></tr></thead><tbody>{availableCollections.map(row => <tr key={row.id} className={selectedIds.has(row.id) ? 'selected' : ''}><td><input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleCollection(row.id)} aria-label={`Seleccionar ${row.number}`} /></td><td><strong>{collectionLabel(row)}</strong><small>{row.payload.detail || 'Sin detalle registrado'}</small></td><td>{money(row.total)}</td></tr>)}{!availableCollections.length && <tr><td colSpan={3}><div className="deposit-detail-empty"><CheckCircle2 /><strong>No existen recaudaciones pendientes de depositar</strong><span>Las recaudaciones autorizadas aparecerán aquí hasta que sean incluidas en un depósito.</span></div></td></tr>}</tbody><tfoot><tr><td colSpan={2}>Total Depósito</td><td>{money(total)}</td></tr></tfoot></table></div></div> : <div className="deposit-accounting"><header><div><strong>Asiento Contable</strong><span>Debe, Haber y Total del Depósito deben coincidir.</span></div><button type="button" className="quiet-button" onClick={addLine}><Plus />Agregar Línea</button></header><div><table><thead><tr><th>Acciones</th><th>Cuenta Contable</th><th>Contacto</th><th>Debe</th><th>Haber</th><th>Descripción</th></tr></thead><tbody>{accountingLines.map(line => { const editing = line.id === editingLineId; return <tr key={line.id}><td><div className="deposit-line-actions"><button type="button" onClick={() => setEditingLineId(editing ? null : line.id)} aria-label={editing ? 'Guardar línea' : 'Editar línea'}>{editing ? <Check /> : <Pencil />}</button>{!line.automatic && <button type="button" onClick={() => setAccountingLines(current => current.filter(item => item.id !== line.id))} aria-label="Eliminar línea"><Trash2 /></button>}</div></td><td>{editing ? <SearchableDatalistInput list="deposit-account-options" value={line.accountCode} onChange={event => updateLine(line.id, 'accountCode', event.target.value)} onClear={() => updateLine(line.id, 'accountCode', '')} clearLabel="Borrar cuenta" placeholder="Filtrar Plan Contable" /> : <span><strong>{line.accountCode || '—'}</strong><small>{accounts.find(row => row.Codigo === line.accountCode)?.['Descripción']}</small></span>}</td><td>{line.contactName || '—'}</td><td className={!accountingMatches ? 'mismatch' : ''}>{editing ? <input inputMode="decimal" value={line.debit || ''} onChange={event => updateLine(line.id, 'debit', event.target.value)} /> : line.debit ? money(line.debit) : '—'}</td><td className={!accountingMatches ? 'mismatch' : ''}>{editing ? <input inputMode="decimal" value={line.credit || ''} onChange={event => updateLine(line.id, 'credit', event.target.value)} /> : line.credit ? money(line.credit) : '—'}</td><td>{editing ? <input value={line.description} onChange={event => updateLine(line.id, 'description', event.target.value)} maxLength={180} /> : line.description}</td></tr>})}{!accountingLines.length && <tr><td colSpan={6}><div className="deposit-accounting-empty"><FileText /><span>Selecciona recaudaciones para armar el asiento contable.</span></div></td></tr>}<tr className={!accountingMatches ? 'deposit-accounting-total mismatch' : 'deposit-accounting-total'}><td colSpan={3}>Totales</td><td>{money(totalDebit)}</td><td>{money(totalCredit)}</td><td>Depósito: {money(total)}</td></tr></tbody></table><datalist id="deposit-account-options">{accounts.map(row => <option key={row.Codigo} value={row.Codigo}>{accountLabel(row)}</option>)}</datalist></div></div>}
      </section>
    </>}
  </div>
}
