import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, CheckCircle2, ChevronRight, FileText, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { api } from './api'
import { accountingVoucherStorageKey } from './AccountingVoucherPage'
import { formatFullDateInput } from './date-input'
import { markIssuedExpenseDeleted, nextReceiptNumber, readIssuedExpenses, upsertIssuedExpense, type IssuedExpenseLine, type IssuedExpenseRecord } from './expense-records'
import { validateOperationDate } from './operation-date-rules'
import type { Context, ScreenSpec } from './types'

type Customer = { id: string; identification: string; businessName: string; address: string; phone: string; email: string; state: string }
type SubItem = { id: string; description: string; accountCode: string }
type ExpenseItem = { id: string; description: string; expenseText?: string; valueMode: 'MT2' | 'FIJO' | 'NA'; value: string; accountCode: string; recurrence: string; state: string; subItems?: SubItem[] }
type Account = { Codigo: string; 'Descripción': string; Tipo: string; Estado: string }
type ChargeLine = { id: string; itemId: string; itemDescription: string; subItemId: string; subItemDescription: string; detail: string; quantity: number; unitValue: number; total: number; accountCode: string }
type ChargeDraft = { itemDescription: string; subItemDescription: string; detail: string; quantity: string; unitValue: string }
type AccountingLine = { id: string; accountCode: string; debit: number; credit: number; description: string; automatic: boolean }
type ReceivableRecord = { id: string; expenseId: string; receiptNumber: string; customerId: string; identification: string; businessName: string; issueDate: string; originalAmount: number; balance: number; status: 'PENDIENTE'; createdAt: string }
type VoucherLine = { accountCode: string; debit: number; credit: number; description: string }
type ExpenseVoucher = { id: string; number: string; date: string; type: 'EXPENSA'; description: string; debit: string; credit: string; status: 'AUTORIZADO'; sourceExpenseId: string; lines: VoucherLine[] }
type IndividualExpenseDraft = {
  id: string
  receiptNumber: string
  issueDate: string
  customerInput: string
  selectedCustomerId: string
  headerDetail: string
  activeTab: 'DETAIL' | 'ACCOUNTING'
  lines: ChargeLine[]
  pendingLine: ChargeDraft
  accountingLines: AccountingLine[]
  createdAt: string
  updatedAt: string
}

const emptyCharge: ChargeDraft = { itemDescription: '', subItemDescription: '', detail: '', quantity: '1', unitValue: '' }
const money = (value: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value)

function readJson<T>(key: string, fallback: T): T {
  try { const value = JSON.parse(localStorage.getItem(key) ?? 'null'); return value ?? fallback } catch { return fallback }
}

function todayDisplay() {
  const now = new Date()
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
}

function displayDateToIso(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value
}

function customerLabel(customer: Customer) { return `${customer.identification} · ${customer.businessName}` }
function itemLabel(item: ExpenseItem) { return item.description }
function subItemLabel(item: SubItem) { return item.description }

function toIssuedExpenseLines(lines: ChargeLine[]): IssuedExpenseLine[] {
  return lines.map(line => ({
    id: line.id, propertyId: '', propertyDescription: '', itemId: line.itemId,
    itemDescription: line.subItemDescription ? `${line.itemDescription} · ${line.subItemDescription}` : line.itemDescription,
    conceptText: line.detail, valueMode: 'FIJO', squareMeters: null, quantity: line.quantity,
    unitPrice: line.unitValue, total: line.total,
  }))
}

function accountingAssignmentKey(companyId: string) { return `saga.accounting.account-assignments:${companyId}` }
function expenseItemKey(companyId: string) { return `saga.property-expense-items:${companyId}` }
function receivableKey(companyId: string) { return `saga.customer-receivables:${companyId}` }
function individualDraftKey(companyId: string) { return `saga.individual-expense-drafts:${companyId}` }

function readCustomers() {
  return readJson<Customer[]>('saga.customers', [])
    .filter(customer => customer.state === 'ACTIVO')
    .sort((left, right) => left.businessName.localeCompare(right.businessName, 'es'))
}

function readItems(companyId: string) {
  return readJson<ExpenseItem[]>(expenseItemKey(companyId), [])
    .filter(item => item.state === 'ACTIVO')
    .map(item => ({ ...item, subItems: Array.isArray(item.subItems) ? item.subItems : [] }))
    .sort((left, right) => left.description.localeCompare(right.description, 'es'))
}

function readAccounts() {
  return readJson<Account[]>('saga.accounting.plan', [])
    .filter(account => account.Tipo === 'AUXILIAR' && account.Estado !== 'INACTIVO')
    .sort((left, right) => left.Codigo.localeCompare(right.Codigo, 'es', { numeric: true }))
}

export function IndividualExpenseGenerationPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <IndividualExpenseManager key={context.data.company.id} screen={screen} context={context.data} />
}

function IndividualExpenseManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const customers = useMemo(readCustomers, [])
  const items = useMemo(() => readItems(context.company.id), [context.company.id])
  const accounts = useMemo(readAccounts, [])
  const assignments = readJson<{ CUSTOMERS_RECEIVABLE?: string }>(accountingAssignmentKey(context.company.id), {})
  const draftStorageKey = individualDraftKey(context.company.id)
  const [drafts, setDrafts] = useState<IndividualExpenseDraft[]>(() =>
    readJson<IndividualExpenseDraft[]>(draftStorageKey, []).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  )
  const [formOpen, setFormOpen] = useState(false)
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [receiptNumber, setReceiptNumber] = useState(() => nextReceiptNumber(context.company.id))
  const [issueDate, setIssueDate] = useState(todayDisplay)
  const [customerInput, setCustomerInput] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [headerDetail, setHeaderDetail] = useState('')
  const [activeTab, setActiveTab] = useState<'DETAIL' | 'ACCOUNTING'>('DETAIL')
  const [lines, setLines] = useState<ChargeLine[]>([])
  const [charge, setCharge] = useState<ChargeDraft>({ ...emptyCharge })
  const [accountingLines, setAccountingLines] = useState<AccountingLine[]>([])
  const [editingAccountingId, setEditingAccountingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const selectedCustomer = customers.find(customer => customer.id === selectedCustomerId)
  const selectedItem = items.find(item => item.description === charge.itemDescription)
  const availableSubItems = selectedItem?.subItems ?? []
  const total = Number(lines.reduce((sum, line) => sum + line.total, 0).toFixed(2))
  const totalDebit = Number(accountingLines.reduce((sum, line) => sum + Number(line.debit || 0), 0).toFixed(2))
  const totalCredit = Number(accountingLines.reduce((sum, line) => sum + Number(line.credit || 0), 0).toFixed(2))
  const accountingMatches = total > 0 && totalDebit === totalCredit && totalDebit === total
  const issued = readIssuedExpenses(context.company.id).filter(expense => expense.generationType === 'INDIVIDUAL')

  const persistDrafts = (nextDrafts: IndividualExpenseDraft[]) => {
    const ordered = [...nextDrafts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    setDrafts(ordered)
    localStorage.setItem(draftStorageKey, JSON.stringify(ordered))
  }

  const rebuildAccounting = (nextLines: ChargeLine[]) => {
    const expenseTotal = Number(nextLines.reduce((sum, line) => sum + line.total, 0).toFixed(2))
    const creditLines: AccountingLine[] = nextLines.map(line => ({
      id: crypto.randomUUID(), accountCode: line.accountCode, debit: 0, credit: line.total,
      description: line.detail, automatic: true,
    }))
    const receivableLine: AccountingLine[] = expenseTotal > 0 ? [{
      id: crypto.randomUUID(), accountCode: assignments.CUSTOMERS_RECEIVABLE ?? '', debit: expenseTotal, credit: 0,
      description: `Cuenta por cobrar · ${selectedCustomer?.businessName ?? 'Cliente'}`, automatic: true,
    }] : []
    setAccountingLines([...creditLines, ...receivableLine])
    setEditingAccountingId(null)
  }

  const openNew = () => {
    setReceiptNumber(nextReceiptNumber(context.company.id)); setIssueDate(todayDisplay()); setCustomerInput(''); setSelectedCustomerId('')
    setHeaderDetail(''); setActiveTab('DETAIL'); setLines([]); setCharge({ ...emptyCharge }); setAccountingLines([])
    setEditingDraftId(null); setEditingAccountingId(null); setDeleteConfirm(false); setError(''); setMessage(''); setFormOpen(true)
  }

  const openDraft = (draft: IndividualExpenseDraft) => {
    setEditingDraftId(draft.id); setReceiptNumber(draft.receiptNumber); setIssueDate(draft.issueDate)
    setCustomerInput(draft.customerInput); setSelectedCustomerId(draft.selectedCustomerId); setHeaderDetail(draft.headerDetail)
    setActiveTab(draft.activeTab); setLines(draft.lines); setCharge({ ...emptyCharge, ...draft.pendingLine })
    setAccountingLines(draft.accountingLines); setEditingAccountingId(null); setDeleteConfirm(false)
    setError(''); setMessage(''); setFormOpen(true)
  }

  const saveDraft = () => {
    const existingDraft = drafts.find(draft => draft.id === editingDraftId)
    const numberIsTaken = issued.some(expense => expense.receiptNumber === receiptNumber && expense.id !== editingDraftId)
      || (!editingDraftId && drafts.some(draft => draft.receiptNumber === receiptNumber))
    const reservedNumber = numberIsTaken ? nextReceiptNumber(context.company.id) : receiptNumber
    const now = new Date().toISOString()
    const draft: IndividualExpenseDraft = {
      id: editingDraftId ?? crypto.randomUUID(), receiptNumber: reservedNumber, issueDate, customerInput,
      selectedCustomerId, headerDetail, activeTab, lines, pendingLine: charge, accountingLines,
      createdAt: existingDraft?.createdAt ?? now, updatedAt: now,
    }
    persistDrafts(editingDraftId
      ? drafts.map(current => current.id === editingDraftId ? draft : current)
      : [draft, ...drafts])
    const customer = customers.find(item => item.id === selectedCustomerId)
    const [, month = '', year = ''] = issueDate.split('/')
    upsertIssuedExpense(context.company.id, {
      id: draft.id, companyId: context.company.id, month, year, issueDate, receiptNumber: reservedNumber,
      identification: customer?.identification ?? '', businessName: customer?.businessName ?? (customerInput.trim() || 'Cliente pendiente'),
      address: customer?.address ?? '', phone: customer?.phone ?? '', email: customer?.email ?? '',
      expenseType: 'ORDINARIA', generationType: 'INDIVIDUAL', total,
      pdfFileName: `${reservedNumber}.pdf`, createdAt: draft.createdAt, status: 'PENDIENTE_COMPLETAR',
      lines: toIssuedExpenseLines(lines),
    })
    setEditingDraftId(null); setReceiptNumber(reservedNumber); setFormOpen(false); setError('')
    setMessage(`La expensa ${reservedNumber} fue guardada como borrador. Su numeración quedó reservada hasta autorizarla o eliminarla.`)
  }

  const discardExpense = () => {
    if (editingDraftId) {
      persistDrafts(drafts.filter(draft => draft.id !== editingDraftId))
      markIssuedExpenseDeleted(context.company.id, editingDraftId, context.actor.name)
    }
    setFormOpen(false); setDeleteConfirm(false); setCustomerInput(''); setSelectedCustomerId(''); setHeaderDetail('')
    setLines([]); setCharge({ ...emptyCharge }); setAccountingLines([]); setEditingDraftId(null); setEditingAccountingId(null); setError('')
    setMessage(editingDraftId
      ? `El borrador ${receiptNumber} fue eliminado. En Consulta General consta con estado Borrada.`
      : 'La expensa en proceso fue eliminada sin dejar registros.')
  }

  const selectCustomer = (value: string) => {
    setCustomerInput(value)
    const customer = customers.find(item => customerLabel(item) === value)
    setSelectedCustomerId(customer?.id ?? '')
    setError('')
  }

  const selectItem = (value: string) => {
    const item = items.find(candidate => itemLabel(candidate) === value)
    const configuredValue = Number(String(item?.value ?? '').replace(',', '.'))
    setCharge({
      itemDescription: value,
      subItemDescription: '',
      detail: '',
      quantity: '1',
      unitValue: Number.isFinite(configuredValue) && configuredValue >= 0 ? configuredValue.toFixed(2) : '',
    })
    setError('')
  }

  const saveChargeLine = () => {
    const item = items.find(candidate => candidate.description === charge.itemDescription)
    if (!item) { setError('Selecciona un Rubro activo.'); return }
    const subItem = item.subItems?.find(candidate => candidate.description === charge.subItemDescription)
    if (item.subItems?.length && charge.subItemDescription && !subItem) { setError('Selecciona un Subrubro válido.'); return }
    if (!charge.detail.trim()) { setError('Ingresa el Detalle de la línea.'); return }
    const quantity = Number(charge.quantity.replace(',', '.'))
    const unitValue = Number(charge.unitValue.replace(',', '.'))
    if (!Number.isFinite(quantity) || quantity <= 0) { setError('La Cantidad debe ser mayor a cero.'); return }
    if (!Number.isFinite(unitValue) || unitValue < 0) { setError('El Valor debe ser un número válido.'); return }
    const accountCode = subItem?.accountCode || item.accountCode
    if (!accountCode) { setError('El Rubro o Subrubro no tiene una Cuenta Contable configurada.'); return }
    const line: ChargeLine = {
      id: crypto.randomUUID(), itemId: item.id, itemDescription: item.description,
      subItemId: subItem?.id ?? '', subItemDescription: subItem?.description ?? '', detail: charge.detail.trim(),
      quantity, unitValue, total: Number((quantity * unitValue).toFixed(2)), accountCode,
    }
    const next = [...lines, line]
    setLines(next); rebuildAccounting(next); setCharge({ ...emptyCharge }); setError('')
  }

  const deleteChargeLine = (id: string) => {
    const next = lines.filter(line => line.id !== id)
    setLines(next); rebuildAccounting(next); setError('')
  }

  const updateAccountingLine = (id: string, field: keyof Pick<AccountingLine, 'accountCode' | 'debit' | 'credit' | 'description'>, value: string) => {
    setAccountingLines(current => current.map(line => line.id === id ? {
      ...line,
      [field]: field === 'debit' || field === 'credit' ? Number(value.replace(',', '.').replace(/[^\d.]/g, '')) || 0 : value,
    } : line))
    setError('')
  }

  const addAccountingLine = () => {
    const line: AccountingLine = { id: crypto.randomUUID(), accountCode: '', debit: 0, credit: 0, description: '', automatic: false }
    setAccountingLines(current => [...current, line]); setEditingAccountingId(line.id); setError('')
  }

  const authorize = () => {
    const customer = customers.find(item => item.id === selectedCustomerId)
    if (!customer) { setError('Selecciona un Cliente activo.'); return }
    const isoDate = displayDateToIso(issueDate)
    const dateError = validateOperationDate(isoDate)
    if (dateError) { setError(dateError); return }
    if (!lines.length) { setError('Registra al menos una línea de detalle.'); return }
    if (!assignments.CUSTOMERS_RECEIVABLE) { setActiveTab('ACCOUNTING'); setError('Configura Cuenta x Cobrar Clientes en Asignación de Cuentas Contables.'); return }
    if (accountingLines.some(line => !accounts.some(account => account.Codigo === line.accountCode))) { setActiveTab('ACCOUNTING'); setError('Todas las líneas contables deben utilizar una cuenta Auxiliar activa.'); return }
    if (!accountingMatches) { setActiveTab('ACCOUNTING'); setError('Asiento no Cuadra. Revisa los valores resaltados de Debe, Haber y Total de la expensa.'); return }
    if (issued.some(expense => expense.receiptNumber === receiptNumber && expense.id !== editingDraftId)) { setError('La numeración reservada ya fue utilizada. Guarda el registro como borrador para asignar una nueva numeración.'); return }
    const currentReceipt = receiptNumber
    const [, month, year] = issueDate.split('/')
    const expenseId = editingDraftId ?? crypto.randomUUID()
    const expenseLines = toIssuedExpenseLines(lines)
    const existingTrace = issued.find(record => record.id === editingDraftId)
    const expense: IssuedExpenseRecord = {
      id: expenseId, companyId: context.company.id, month, year, issueDate, receiptNumber: currentReceipt,
      identification: customer.identification, businessName: customer.businessName, address: customer.address,
      phone: customer.phone, email: customer.email, expenseType: 'ORDINARIA', generationType: 'INDIVIDUAL',
      total, pdfFileName: `${currentReceipt}.pdf`, createdAt: existingTrace?.createdAt ?? new Date().toISOString(), status: 'VIGENTE', lines: expenseLines,
    }
    upsertIssuedExpense(context.company.id, expense)
    const voucherKey = accountingVoucherStorageKey(context.company.id)
    const voucherRows = readJson<ExpenseVoucher[]>(voucherKey, [])
    const voucher: ExpenseVoucher = {
      id: crypto.randomUUID(), number: `EXP-${String(voucherRows.length + 1).padStart(5, '0')}`, date: issueDate,
      type: 'EXPENSA', description: headerDetail.trim() || `Expensa ${currentReceipt} · ${customer.businessName}`,
      debit: totalDebit.toFixed(2), credit: totalCredit.toFixed(2), status: 'AUTORIZADO', sourceExpenseId: expenseId,
      lines: accountingLines.map(line => ({ accountCode: line.accountCode, debit: line.debit, credit: line.credit, description: line.description })),
    }
    localStorage.setItem(voucherKey, JSON.stringify([voucher, ...voucherRows]))
    const portfolio = readJson<ReceivableRecord[]>(receivableKey(context.company.id), [])
    const receivable: ReceivableRecord = {
      id: crypto.randomUUID(), expenseId, receiptNumber: currentReceipt, customerId: customer.id,
      identification: customer.identification, businessName: customer.businessName, issueDate,
      originalAmount: total, balance: total, status: 'PENDIENTE', createdAt: new Date().toISOString(),
    }
    localStorage.setItem(receivableKey(context.company.id), JSON.stringify([receivable, ...portfolio]))
    if (editingDraftId) persistDrafts(drafts.filter(draft => draft.id !== editingDraftId))
    setEditingDraftId(null); setReceiptNumber(nextReceiptNumber(context.company.id)); setFormOpen(false); setLines([]); setAccountingLines([]); setError('')
    setMessage(`La expensa ${currentReceipt} fue autorizada. Se generó el asiento contable y el saldo por cobrar de ${money(total)}.`)
  }

  return <div className="page screen-page individual-expense-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header individual-expense-header"><div><div className="screen-id"><span>{screen.id}</span><b>Expensas</b></div><h1>{screen.titulo_original}</h1></div><div className="individual-expense-actions">{formOpen && <button type="button" className="save-expense-draft" onClick={saveDraft}><Save />Guardar Borrador</button>}{formOpen && <button type="button" className="delete-expense-draft" onClick={() => setDeleteConfirm(true)}><Trash2 />Eliminar</button>}{formOpen && <button type="button" className="authorize-expense" disabled={!lines.length} onClick={authorize}><CheckCircle2 />Autorizar Expensa</button>}<button type="button" className="primary-action" onClick={openNew}><Plus />Nueva Expensa</button></div></section>
    {message && <div className="individual-expense-success" role="status"><CheckCircle2 />{message}</div>}
    {error && <div className="individual-expense-error" role="alert"><AlertTriangle />{error}</div>}

    {deleteConfirm && <div className="individual-delete-backdrop" role="dialog" aria-modal="true" aria-labelledby="individual-delete-title"><section className="individual-delete-dialog"><span><Trash2 /></span><h2 id="individual-delete-title">¿Eliminar {editingDraftId ? 'el borrador' : 'la expensa en proceso'}?</h2><p>Se descartarán la cabecera, las líneas de detalle y el asiento contable. {editingDraftId ? 'La numeración permanecerá registrada en Consulta General con estado Borrada.' : 'No quedará ningún registro guardado.'}</p><footer><button type="button" className="quiet-button" onClick={() => setDeleteConfirm(false)}>Cancelar</button><button type="button" className="confirm-delete-expense" onClick={discardExpense}>Sí, Eliminar</button></footer></section></div>}

    {formOpen ? <>
      <section className="individual-expense-card individual-expense-customer">
        <header><strong>Datos de la Expensa</strong><span>Los datos del cliente se completan desde Registro Clientes.</span></header>
        <div className="individual-expense-grid">
          <label><span>Número de Expensa</span><input readOnly value={receiptNumber} /></label>
          <label><span>Fecha de Emisión <b>Obligatorio</b></span><input inputMode="numeric" maxLength={10} value={issueDate} onChange={event => { setIssueDate(formatFullDateInput(event.target.value)); setError('') }} placeholder="DD/MM/AAAA" /></label>
          <label className="wide"><span>Cliente <b>Obligatorio</b></span><input list="individual-customer-options" value={customerInput} onChange={event => selectCustomer(event.target.value)} placeholder="Escribe identificación o razón social para filtrar" /><datalist id="individual-customer-options">{customers.map(customer => <option key={customer.id} value={customerLabel(customer)} />)}</datalist></label>
          <label><span>Dirección</span><input readOnly value={selectedCustomer?.address || '—'} /></label>
          <label><span>Teléfono</span><input readOnly value={selectedCustomer?.phone || '—'} /></label>
          <label><span>Email</span><input readOnly value={selectedCustomer?.email || '—'} /></label>
          <label className="wide"><span>Detalle</span><textarea maxLength={100} rows={2} value={headerDetail} onChange={event => setHeaderDetail(event.target.value)} placeholder="Detalle general de la expensa" /><small>{headerDetail.length}/100</small></label>
        </div>
      </section>

      <section className="individual-expense-card individual-expense-workspace">
        <nav className="individual-expense-tabs"><button type="button" className={activeTab === 'DETAIL' ? 'active' : ''} onClick={() => setActiveTab('DETAIL')}>Detalle</button><button type="button" className={activeTab === 'ACCOUNTING' ? 'active' : ''} onClick={() => setActiveTab('ACCOUNTING')}>Contabilidad</button></nav>
        {activeTab === 'DETAIL' ? <div className="individual-detail-table"><table><thead><tr><th>Acciones</th><th>Rubro</th><th>Subrubro</th><th>Detalle</th><th>Cantidad</th><th>Valor</th><th>Total</th></tr></thead><tbody>
          {lines.map(line => <tr key={line.id}><td><button type="button" className="individual-line-delete" onClick={() => deleteChargeLine(line.id)} aria-label={`Eliminar ${line.detail}`} title="Eliminar"><Trash2 /></button></td><td>{line.itemDescription}</td><td>{line.subItemDescription || '—'}</td><td>{line.detail}</td><td className="number">{line.quantity}</td><td className="number">{money(line.unitValue)}</td><td className="number"><strong>{money(line.total)}</strong></td></tr>)}
          <tr className="individual-line-editor"><td><button type="button" className="individual-line-save" onClick={saveChargeLine} aria-label="Guardar línea" title="Guardar línea"><Save /></button></td><td><input list="individual-item-options" value={charge.itemDescription} onChange={event => selectItem(event.target.value)} placeholder="Filtrar Rubro" /><datalist id="individual-item-options">{items.map(item => <option key={item.id} value={itemLabel(item)} />)}</datalist></td><td>{availableSubItems.length ? <><input list="individual-subitem-options" value={charge.subItemDescription} onChange={event => setCharge(current => ({ ...current, subItemDescription: event.target.value }))} placeholder="Filtrar Subrubro" /><datalist id="individual-subitem-options">{availableSubItems.map(item => <option key={item.id} value={subItemLabel(item)} />)}</datalist></> : <span>—</span>}</td><td><input maxLength={160} value={charge.detail} onChange={event => setCharge(current => ({ ...current, detail: event.target.value }))} placeholder="Detalle del cobro" /></td><td><input type="number" min="0.01" step="0.01" value={charge.quantity} onChange={event => setCharge(current => ({ ...current, quantity: event.target.value }))} /></td><td><input type="text" inputMode="decimal" value={charge.unitValue} onFocus={event => event.currentTarget.select()} onClick={event => event.currentTarget.select()} onChange={event => setCharge(current => ({ ...current, unitValue: event.target.value }))} aria-label="Valor de la línea" /></td><td className="number"><strong>{money((Number(charge.quantity) || 0) * (Number(charge.unitValue) || 0))}</strong></td></tr>
          <tr className="individual-detail-total"><td colSpan={6}>Total</td><td className="number">{money(total)}</td></tr>
        </tbody></table></div> : <div className="individual-accounting"><div className="individual-accounting-toolbar"><div><strong>Asiento Contable</strong><span>El Debe y el Haber deben coincidir con el total de la expensa.</span></div><button type="button" className="quiet-button" onClick={addAccountingLine}><Plus />Agregar Línea</button></div><div className="individual-accounting-table"><table><thead><tr><th>Acciones</th><th>Cuenta Contable</th><th>Debe</th><th>Haber</th><th>Descripción</th></tr></thead><tbody>
          {accountingLines.map(line => { const editing = editingAccountingId === line.id; return <tr key={line.id}><td><div className="individual-accounting-actions"><button type="button" onClick={() => setEditingAccountingId(editing ? null : line.id)} aria-label={editing ? 'Guardar cambios contables' : 'Editar línea contable'}>{editing ? <Check /> : <Pencil />}</button>{!line.automatic && <button type="button" onClick={() => setAccountingLines(current => current.filter(item => item.id !== line.id))} aria-label="Eliminar línea contable"><Trash2 /></button>}</div></td><td>{editing ? <><input list="individual-account-options" value={line.accountCode} onChange={event => updateAccountingLine(line.id, 'accountCode', event.target.value)} placeholder="Filtrar Plan Contable" /><datalist id="individual-account-options">{accounts.map(account => <option key={account.Codigo} value={account.Codigo}>{account['Descripción']}</option>)}</datalist></> : <span>{line.accountCode || '—'}<small>{accounts.find(account => account.Codigo === line.accountCode)?.['Descripción']}</small></span>}</td><td className={!accountingMatches ? 'mismatch' : ''}>{editing ? <input inputMode="decimal" value={line.debit || ''} onChange={event => updateAccountingLine(line.id, 'debit', event.target.value)} /> : line.debit ? money(line.debit) : '—'}</td><td className={!accountingMatches ? 'mismatch' : ''}>{editing ? <input inputMode="decimal" value={line.credit || ''} onChange={event => updateAccountingLine(line.id, 'credit', event.target.value)} /> : line.credit ? money(line.credit) : '—'}</td><td>{editing ? <input maxLength={160} value={line.description} onChange={event => updateAccountingLine(line.id, 'description', event.target.value)} /> : line.description}</td></tr> })}
          {!accountingLines.length && <tr><td colSpan={5}><div className="individual-accounting-empty"><FileText /><span>Guarda una línea de Detalle para generar el asiento.</span></div></td></tr>}
          <tr className={`individual-accounting-total ${!accountingMatches ? 'mismatch' : ''}`}><td colSpan={2}>Totales</td><td>{money(totalDebit)}</td><td>{money(totalCredit)}</td><td>Total Expensa: {money(total)}</td></tr>
        </tbody></table></div></div>}
      </section>
    </> : <section className="individual-expense-card individual-expense-history"><header><div><strong>Expensas Individuales Pendientes</strong><span>{drafts.length} pendientes de completar y autorizar</span></div></header><div><table><thead><tr><th aria-label="Editar" /><th>Número</th><th>Fecha Emisión</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead><tbody>
      {drafts.map(draft => { const customer = customers.find(item => item.id === draft.selectedCustomerId); const draftTotal = draft.lines.reduce((sum, line) => sum + line.total, 0); return <tr key={draft.id} className="individual-draft-row"><td><button type="button" className="individual-draft-edit" onClick={() => openDraft(draft)} aria-label={`Editar borrador ${draft.receiptNumber}`} title="Editar borrador"><Pencil /></button></td><td><strong>{draft.receiptNumber}</strong></td><td>{draft.issueDate || '—'}</td><td>{customer?.businessName || draft.customerInput || 'Pendiente de seleccionar'}</td><td>{money(draftTotal)}</td><td><span className="individual-draft-status">Borrador</span></td></tr> })}
      {!drafts.length && <tr><td colSpan={6}><div className="individual-history-empty"><FileText /><strong>No existen expensas individuales pendientes</strong><span>Las expensas guardadas sin autorizar aparecerán en esta lista.</span></div></td></tr>}
    </tbody></table></div></section>}
  </div>
}
