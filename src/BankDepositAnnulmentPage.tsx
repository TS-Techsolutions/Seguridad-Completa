import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronRight, FileText, Landmark, Pencil, Plus, RotateCcw, Save, Scale, Trash2 } from 'lucide-react'
import { api } from './api'
import { accountingVoucherStorageKey, getNextVoucherNumber, type AccountingVoucherRecord } from './AccountingVoucherPage'
import { readBankAccounts, type BankAccountRecord } from './BankAccountsPage'
import { DocumentEditorHeader } from './DocumentEditorHeader'
import {
  depositSelectionKey,
  readAnnulledDepositSelectionKeys,
  readAuthorizedDepositAnnulments,
  readDepositAnnulmentDrafts,
  saveAuthorizedDepositAnnulments,
  saveDepositAnnulmentDrafts,
  type DepositAnnulmentDraft,
  type DepositAnnulmentPayload,
  type DepositAnnulmentSelection,
} from './bank-deposit-annulment-records'
import { readAuthorizedBankDeposits, saveAuthorizedBankDeposits, type AuthorizedBankDeposit, type BankDepositAccountingLine } from './bank-deposit-records'
import { readAuthorizedCollections, type AuthorizedCollection } from './collection-records'
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

function readAccounts() {
  return readJson<Account[]>('saga.accounting.plan', [])
    .filter(row => row.Tipo.toLocaleUpperCase('es') === 'AUXILIAR' && row.Estado.toLocaleUpperCase('es') !== 'INACTIVO')
    .sort((left, right) => left.Codigo.localeCompare(right.Codigo, 'es', { numeric: true }))
}

function accountLabel(account: Account) { return `${account.Codigo} · ${account['Descripción']}` }

function bankLabel(account: BankAccountRecord) {
  return `${account.bank} · ${account.type === 'AHORRO' ? 'Ahorro' : 'Corriente'} · ${account.accountNumber} · ${account.holder}`
}

function nextAnnulmentNumber(companyId: string) {
  const numbers = [...readDepositAnnulmentDrafts(companyId), ...readAuthorizedDepositAnnulments(companyId)]
    .map(row => Number(/(\d+)$/.exec(row.number)?.[1] ?? 0))
  return `ANU-DEP-${String(Math.max(0, ...numbers) + 1).padStart(6, '0')}`
}

function selectionFromKey(value: string): DepositAnnulmentSelection {
  const [depositId, collectionId] = value.split('::')
  return { depositId, collectionId }
}

export function BankDepositAnnulmentPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <BankDepositAnnulmentManager key={context.data.company.id} screen={screen} context={context.data} />
}

function BankDepositAnnulmentManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const accounts = useMemo(readAccounts, [])
  const bankAccounts = useMemo(() => readBankAccounts(context.company.id).filter(row => row.state === 'ACTIVA'), [context.company.id])
  const deposits = useMemo(() => readAuthorizedBankDeposits(context.company.id), [context.company.id])
  const collections = useMemo(() => readAuthorizedCollections(context.company.id), [context.company.id])
  const [drafts, setDrafts] = useState(() => readDepositAnnulmentDrafts(context.company.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [number, setNumber] = useState(() => nextAnnulmentNumber(context.company.id))
  const [date, setDate] = useState(todayDisplay)
  const [bankInput, setBankInput] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [detail, setDetail] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<Tab>('DETAIL')
  const [accountingLines, setAccountingLines] = useState<BankDepositAccountingLine[]>([])
  const [editingLineId, setEditingLineId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const restoring = useRef(false)

  const annulledKeys = readAnnulledDepositSelectionKeys(context.company.id)
  const collectionById = new Map(collections.map(row => [row.id, row]))
  const selectedBank = bankAccounts.find(row => row.id === bankAccountId)
  const visibleDeposits = deposits.filter(deposit => deposit.bankAccountId === bankAccountId && deposit.payload.selectedCollectionIds
    .some(collectionId => !annulledKeys.has(depositSelectionKey(deposit.id, collectionId))))
  const entriesForDeposit = (deposit: AuthorizedBankDeposit) => deposit.payload.selectedCollectionIds
    .filter(collectionId => !annulledKeys.has(depositSelectionKey(deposit.id, collectionId)))
    .map(collectionId => collectionById.get(collectionId))
    .filter((row): row is AuthorizedCollection => Boolean(row))
  const selectedEntries = deposits.flatMap(deposit => deposit.payload.selectedCollectionIds.map(collectionId => {
    const key = depositSelectionKey(deposit.id, collectionId)
    const collection = collectionById.get(collectionId)
    return selectedKeys.has(key) && collection ? { key, deposit, collection } : null
  }).filter((row): row is { key: string; deposit: AuthorizedBankDeposit; collection: AuthorizedCollection } => Boolean(row)))
  const total = Number(selectedEntries.reduce((sum, row) => sum + Number(row.collection.total || 0), 0).toFixed(2))
  const totalDebit = Number(accountingLines.reduce((sum, line) => sum + Number(line.debit || 0), 0).toFixed(2))
  const totalCredit = Number(accountingLines.reduce((sum, line) => sum + Number(line.credit || 0), 0).toFixed(2))
  const accountingMatches = total > 0 && totalDebit === totalCredit && totalDebit === total
  const sourceSignature = JSON.stringify(Array.from(selectedKeys).sort())

  useEffect(() => {
    if (restoring.current) { restoring.current = false; return }
    const automatic = selectedEntries.flatMap(({ deposit, collection }) => deposit.payload.accountingLines
      .filter(line => line.id === `cash-${collection.id}` || line.id === `bank-${collection.id}`)
      .map(line => ({
        ...line,
        id: `annul-${deposit.id}-${line.id}`,
        debit: Number(line.credit.toFixed(2)),
        credit: Number(line.debit.toFixed(2)),
        description: `Anulación ${deposit.number} · ${line.description}`,
        automatic: true,
      })))
    setAccountingLines(current => [...automatic, ...current.filter(line => !line.automatic)])
    setEditingLineId(null)
  }, [sourceSignature])

  const persistDrafts = (rows: DepositAnnulmentDraft[]) => {
    const ordered = [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    setDrafts(ordered)
    saveDepositAnnulmentDrafts(context.company.id, ordered)
  }

  const reset = () => {
    setEditingId(null); setNumber(nextAnnulmentNumber(context.company.id)); setDate(todayDisplay())
    setBankInput(''); setBankAccountId(''); setDetail(''); setSelectedKeys(new Set()); setActiveTab('DETAIL')
    setAccountingLines([]); setEditingLineId(null); setDeleteConfirm(false); setError(''); setMessage('')
  }

  const openNew = () => { reset(); setFormOpen(true) }
  const payload = (): DepositAnnulmentPayload => ({ selections: Array.from(selectedKeys).map(selectionFromKey), accountingLines, activeTab })

  const saveDraft = () => {
    const now = new Date().toISOString()
    const current = drafts.find(row => row.id === editingId)
    const row: DepositAnnulmentDraft = {
      id: editingId ?? crypto.randomUUID(), companyId: context.company.id, number, date, bankAccountId,
      detail: detail.trim(), total, status: 'GUARDADA', payload: payload(), createdAt: current?.createdAt ?? now, updatedAt: now,
    }
    persistDrafts(editingId ? drafts.map(item => item.id === editingId ? row : item) : [row, ...drafts])
    setEditingId(row.id); setError(''); setMessage(`La anulación ${number} fue guardada como borrador.`)
  }

  const openDraft = (row: DepositAnnulmentDraft) => {
    const bank = bankAccounts.find(item => item.id === row.bankAccountId)
    restoring.current = true
    setEditingId(row.id); setNumber(row.number); setDate(row.date); setBankAccountId(row.bankAccountId)
    setBankInput(bank ? bankLabel(bank) : ''); setDetail(row.detail)
    setSelectedKeys(new Set(row.payload.selections.map(selection => depositSelectionKey(selection.depositId, selection.collectionId))))
    setActiveTab(row.payload.activeTab); setAccountingLines(row.payload.accountingLines); setEditingLineId(null)
    setDeleteConfirm(false); setError(''); setMessage(''); setFormOpen(true)
  }

  const deleteDraft = () => {
    if (editingId) persistDrafts(drafts.filter(row => row.id !== editingId))
    setFormOpen(false); setDeleteConfirm(false)
    setMessage(editingId ? `El borrador ${number} fue eliminado.` : 'La anulación en proceso fue eliminada sin dejar registros.')
  }

  const selectBank = (value: string) => {
    const bank = bankAccounts.find(row => bankLabel(row) === value)
    setBankInput(value); setBankAccountId(bank?.id ?? ''); setSelectedKeys(new Set()); setAccountingLines([]); setError('')
  }

  const toggleEntry = (depositId: string, collectionId: string) => {
    const key = depositSelectionKey(depositId, collectionId)
    setSelectedKeys(current => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next })
    setError('')
  }

  const toggleDeposit = (deposit: AuthorizedBankDeposit) => {
    const keys = entriesForDeposit(deposit).map(collection => depositSelectionKey(deposit.id, collection.id))
    const allSelected = keys.length > 0 && keys.every(key => selectedKeys.has(key))
    setSelectedKeys(current => { const next = new Set(current); keys.forEach(key => allSelected ? next.delete(key) : next.add(key)); return next })
  }

  const allVisibleKeys = visibleDeposits.flatMap(deposit => entriesForDeposit(deposit).map(collection => depositSelectionKey(deposit.id, collection.id)))
  const allSelected = allVisibleKeys.length > 0 && allVisibleKeys.every(key => selectedKeys.has(key))
  const toggleAll = () => setSelectedKeys(current => { const next = new Set(current); allVisibleKeys.forEach(key => allSelected ? next.delete(key) : next.add(key)); return next })

  const updateLine = (id: string, field: 'accountCode' | 'debit' | 'credit' | 'description', value: string) => {
    setAccountingLines(current => current.map(line => line.id === id ? { ...line, [field]: field === 'debit' || field === 'credit' ? numeric(value) : value } : line))
    setError('')
  }

  const addLine = () => {
    const line: BankDepositAccountingLine = { id: crypto.randomUUID(), accountCode: '', contactId: '', contactName: '', debit: 0, credit: 0, description: '', automatic: false }
    setAccountingLines(current => [...current, line]); setEditingLineId(line.id)
  }

  const generate = () => {
    setError('')
    const dateError = validateOperationDate(displayDateToIso(date))
    if (dateError) { setError(dateError); return }
    if (!selectedBank) { setError('Selecciona una Cuenta Bancaria activa.'); return }
    if (!selectedKeys.size) { setActiveTab('DETAIL'); setError('Selecciona al menos una Recaudación de un Depósito para anular.'); return }
    const currentAnnulled = readAnnulledDepositSelectionKeys(context.company.id)
    const duplicated = Array.from(selectedKeys).find(key => currentAnnulled.has(key))
    if (duplicated) { setActiveTab('DETAIL'); setError('Una de las recaudaciones seleccionadas ya fue anulada. Actualiza la pantalla y vuelve a intentarlo.'); return }
    if (accountingLines.some(line => !accounts.some(account => account.Codigo === line.accountCode))) { setActiveTab('ACCOUNTING'); setError('Todas las líneas deben utilizar una cuenta contable Auxiliar activa.'); return }
    if (!accountingMatches) { setActiveTab('ACCOUNTING'); setError(`Asiento no Cuadra. Debe: ${money(totalDebit)} · Haber: ${money(totalCredit)} · Anulación: ${money(total)}.`); return }

    const annulmentId = editingId ?? crypto.randomUUID()
    const voucherId = crypto.randomUUID()
    const now = new Date().toISOString()
    const generated = {
      id: annulmentId, companyId: context.company.id, number, date, bankAccountId: selectedBank.id,
      detail: detail.trim(), total, status: 'GENERADA' as const, payload: payload(), accountingVoucherId: voucherId,
      user: context.actor.name, createdAt: now,
    }
    const annulments = [generated, ...readAuthorizedDepositAnnulments(context.company.id)]
    saveAuthorizedDepositAnnulments(context.company.id, annulments)

    const allAnnulledKeys = new Set(annulments.flatMap(row => row.payload.selections.map(selection => depositSelectionKey(selection.depositId, selection.collectionId))))
    saveAuthorizedBankDeposits(context.company.id, readAuthorizedBankDeposits(context.company.id).map(deposit => {
      const annulledCount = deposit.payload.selectedCollectionIds.filter(collectionId => allAnnulledKeys.has(depositSelectionKey(deposit.id, collectionId))).length
      return { ...deposit, status: annulledCount === 0 ? 'GENERADO' as const : annulledCount === deposit.payload.selectedCollectionIds.length ? 'ANULADO' as const : 'ANULADO_PARCIAL' as const }
    }))

    const voucherKey = accountingVoucherStorageKey(context.company.id)
    const vouchers = readJson<Array<Record<string, unknown>>>(voucherKey, [])
    localStorage.setItem(voucherKey, JSON.stringify([{
      id: voucherId, number: getNextVoucherNumber(vouchers as AccountingVoucherRecord[], 'ANULACION_DEPOSITO', undefined, context.company.id), date, type: 'ANULACION_DEPOSITO', description: detail.trim() || `Anulación de Depósito ${number}`,
      debit: totalDebit.toFixed(2), credit: totalCredit.toFixed(2), status: 'AUTORIZADO', sourceDepositAnnulmentId: annulmentId,
      lines: accountingLines.map(line => ({ accountCode: line.accountCode, contactId: line.contactId, contactName: line.contactName, debit: line.debit, credit: line.credit, description: line.description })),
    }, ...vouchers]))

    persistDrafts(drafts.filter(row => row.id !== editingId)); setFormOpen(false); setEditingId(null)
    setMessage(`La anulación ${number} fue generada y creó un Asiento Contable de tipo Anulación Depósito. Las recaudaciones anuladas quedaron liberadas para incluirlas en un nuevo depósito.`)
    window.open(`/vista-previa/anulaciones-deposito/${encodeURIComponent(annulmentId)}`, '_blank', 'noopener,noreferrer')
  }

  const draftDepositNumbers = (row: DepositAnnulmentDraft) => Array.from(new Set(row.payload.selections.map(selection => deposits.find(deposit => deposit.id === selection.depositId)?.number).filter(Boolean))).join(' · ') || 'Pendiente'

  return <div className="page screen-page deposit-annulment-page">
    <DocumentEditorHeader screen={screen} formOpen={formOpen} formTitle="Nueva Anulación de Depósito" sectionLabel="Bancos" onClose={() => setFormOpen(false)} actions={<><button type="button" className="deposit-save" onClick={saveDraft}><Save />Guardar Borrador</button><button type="button" className="deposit-delete" onClick={() => setDeleteConfirm(true)}><Trash2 />Eliminar</button><button type="button" className="deposit-generate" onClick={generate}><RotateCcw />Generar Anulación</button></>} listAction={<button type="button" className="primary-action" onClick={openNew}><Plus />Nueva Anulación</button>} />
    {error && <div className="bank-deposit-feedback error" role="alert"><AlertTriangle />{error}</div>}
    {message && <div className="bank-deposit-feedback success" role="status"><CheckCircle2 />{message}</div>}
    {deleteConfirm && <div className="deposit-delete-backdrop" role="dialog" aria-modal="true"><section><Trash2 /><h2>¿Eliminar {editingId ? 'el borrador' : 'la anulación en proceso'}?</h2><p>La información registrada será descartada.</p><footer><button type="button" className="quiet-button" onClick={() => setDeleteConfirm(false)}>Cancelar</button><button type="button" onClick={deleteDraft}>Sí, Eliminar</button></footer></section></div>}

    {!formOpen ? <section className="panel pending-deposits-card"><header><div><RotateCcw /><span><h2>Anulaciones Pendientes de Completar</h2><p>Borradores guardados que todavía no han generado el asiento de reverso.</p></span></div><strong>{drafts.length}<small>{drafts.length === 1 ? 'pendiente' : 'pendientes'}</small></strong></header><div><table><thead><tr><th aria-label="Editar" /><th>Fecha</th><th>Detalle</th><th># Depósito</th><th>Cuenta Bancaria</th></tr></thead><tbody>{drafts.map(row => { const bank = bankAccounts.find(item => item.id === row.bankAccountId); return <tr key={row.id}><td><button type="button" onClick={() => openDraft(row)} aria-label={`Editar anulación ${row.number}`}><Pencil /></button></td><td>{row.date || '—'}</td><td><strong>{row.detail || 'Sin detalle'}</strong><small>{row.number}</small></td><td>{draftDepositNumbers(row)}</td><td>{bank ? `${bank.bank} · ${bank.accountNumber}` : 'Pendiente de seleccionar'}</td></tr>})}{!drafts.length && <tr><td colSpan={5}><div className="pending-deposits-empty"><RotateCcw /><strong>No existen anulaciones pendientes</strong><span>Selecciona Nueva Anulación para iniciar el primer registro.</span></div></td></tr>}</tbody></table></div></section> : <>
      <section className="panel deposit-data-card"><header><div><RotateCcw /><span><h2>Datos de la Anulación</h2><p>Información general del reverso del depósito.</p></span></div></header><div className="deposit-data-grid annulment-data-grid">
        <label><span># Anulación</span><input value={number} readOnly /></label>
        <label><span>Fecha</span><input value={date} onChange={event => setDate(formatFullDateInput(event.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} /></label>
        <label className="deposit-bank-field"><span>Cuenta Bancaria</span><SearchableDatalistInput list="annulment-bank-options" value={bankInput} onChange={event => selectBank(event.target.value)} onClear={() => selectBank('')} clearLabel="Borrar cuenta bancaria" placeholder="Escribe para filtrar las cuentas" /><datalist id="annulment-bank-options">{bankAccounts.map(row => <option key={row.id} value={bankLabel(row)} />)}</datalist><small>{bankAccounts.length ? `${bankAccounts.length} cuentas activas disponibles` : 'No existen cuentas bancarias activas.'}</small></label>
        <label className="deposit-detail-field"><span>Detalle</span><textarea value={detail} onChange={event => setDetail(event.target.value)} maxLength={160} /><small>{detail.length}/160 caracteres</small></label>
      </div></section>
      <section className="panel deposit-tabs-card"><nav><button type="button" className={activeTab === 'DETAIL' ? 'active' : ''} onClick={() => setActiveTab('DETAIL')}><FileText />Detalle</button><button type="button" className={activeTab === 'ACCOUNTING' ? 'active' : ''} onClick={() => setActiveTab('ACCOUNTING')}><Scale />Contabilidad</button></nav>
        {activeTab === 'DETAIL' ? <div className="annulment-detail-tab"><header><div><strong>Depósitos realizados</strong><span>Selecciona una o todas las recaudaciones del depósito que deseas revertir.</span></div><b>{selectedKeys.size} seleccionadas</b></header><div><table><thead><tr><th><input type="checkbox" checked={allSelected} disabled={!allVisibleKeys.length} onChange={toggleAll} aria-label="Seleccionar todas las recaudaciones" /></th><th>Depósito / Recaudación</th><th>Fecha</th><th>Cliente</th><th>Valor</th></tr></thead><tbody>{visibleDeposits.map(deposit => { const entries = entriesForDeposit(deposit); const groupSelected = entries.length > 0 && entries.every(collection => selectedKeys.has(depositSelectionKey(deposit.id, collection.id))); return [<tr className="annulment-deposit-group" key={deposit.id}><td><input type="checkbox" checked={groupSelected} onChange={() => toggleDeposit(deposit)} aria-label={`Seleccionar depósito ${deposit.number}`} /></td><td><strong>{deposit.number}</strong><small>{deposit.detail || 'Sin detalle'}</small></td><td>{deposit.date}</td><td>{entries.length} {entries.length === 1 ? 'recaudación' : 'recaudaciones'}</td><td>{money(entries.reduce((sum, collection) => sum + collection.total, 0))}</td></tr>, ...entries.map(collection => { const key = depositSelectionKey(deposit.id, collection.id); return <tr className="annulment-collection-row" key={key}><td><input type="checkbox" checked={selectedKeys.has(key)} onChange={() => toggleEntry(deposit.id, collection.id)} aria-label={`Seleccionar ${collection.number}`} /></td><td><span>{collection.number}</span><small>{collection.payload.detail || 'Sin detalle registrado'}</small></td><td>{collection.issueDate}</td><td>{collection.customerName}</td><td>{money(collection.total)}</td></tr> })]})}{!selectedBank && <tr><td colSpan={5}><div className="deposit-detail-empty"><Landmark /><strong>Selecciona una Cuenta Bancaria</strong><span>Se mostrarán los depósitos realizados en esa cuenta.</span></div></td></tr>}{selectedBank && !visibleDeposits.length && <tr><td colSpan={5}><div className="deposit-detail-empty"><CheckCircle2 /><strong>No existen depósitos disponibles para anular</strong><span>Todos los depósitos de esta cuenta ya fueron anulados o aún no existen registros.</span></div></td></tr>}</tbody><tfoot><tr><td colSpan={4}>Total Anulación</td><td>{money(total)}</td></tr></tfoot></table></div></div> : <div className="deposit-accounting"><header><div><strong>Asiento Contable de Reverso</strong><span>Debe, Haber y Total de la Anulación deben coincidir.</span></div><button type="button" className="quiet-button" onClick={addLine}><Plus />Agregar Línea</button></header><div><table><thead><tr><th>Acciones</th><th>Cuenta Contable</th><th>Contacto</th><th>Debe</th><th>Haber</th><th>Descripción</th></tr></thead><tbody>{accountingLines.map(line => { const editing = editingLineId === line.id; return <tr key={line.id}><td><div className="deposit-line-actions"><button type="button" onClick={() => setEditingLineId(editing ? null : line.id)} aria-label={editing ? 'Guardar línea' : 'Editar línea'}>{editing ? <Check /> : <Pencil />}</button>{!line.automatic && <button type="button" onClick={() => setAccountingLines(current => current.filter(item => item.id !== line.id))} aria-label="Eliminar línea"><Trash2 /></button>}</div></td><td>{editing ? <SearchableDatalistInput list="annulment-account-options" value={line.accountCode} onChange={event => updateLine(line.id, 'accountCode', event.target.value)} onClear={() => updateLine(line.id, 'accountCode', '')} clearLabel="Borrar cuenta" placeholder="Filtrar Plan Contable" /> : <span><strong>{line.accountCode || '—'}</strong><small>{accounts.find(row => row.Codigo === line.accountCode)?.['Descripción']}</small></span>}</td><td>{line.contactName || '—'}</td><td className={!accountingMatches ? 'mismatch' : ''}>{editing ? <input inputMode="decimal" value={line.debit || ''} onChange={event => updateLine(line.id, 'debit', event.target.value)} /> : line.debit ? money(line.debit) : '—'}</td><td className={!accountingMatches ? 'mismatch' : ''}>{editing ? <input inputMode="decimal" value={line.credit || ''} onChange={event => updateLine(line.id, 'credit', event.target.value)} /> : line.credit ? money(line.credit) : '—'}</td><td>{editing ? <input value={line.description} onChange={event => updateLine(line.id, 'description', event.target.value)} maxLength={180} /> : line.description}</td></tr>})}{!accountingLines.length && <tr><td colSpan={6}><div className="deposit-accounting-empty"><FileText /><span>Selecciona recaudaciones para generar el asiento de reverso.</span></div></td></tr>}<tr className={!accountingMatches ? 'deposit-accounting-total mismatch' : 'deposit-accounting-total'}><td colSpan={3}>Totales</td><td>{money(totalDebit)}</td><td>{money(totalCredit)}</td><td>Anulación: {money(total)}</td></tr></tbody></table><datalist id="annulment-account-options">{accounts.map(row => <option key={row.Codigo} value={row.Codigo}>{accountLabel(row)}</option>)}</datalist></div></div>}
      </section>
    </>}
  </div>
}
