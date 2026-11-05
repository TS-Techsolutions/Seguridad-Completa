import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpenCheck, Check, ChevronDown, ChevronRight, FileDigit, Landmark, ReceiptText, Save } from 'lucide-react'
import { api } from './api'
import { readAccountingVouchers, voucherPrefixes, type VoucherType } from './AccountingVoucherPage'
import { readVoucherTypes } from './AccountingVoucherTypesPage'
import { readBankAccounts } from './BankAccountsPage'
import { readAuthorizedBankEgresses } from './bank-egress-records'
import { readCheckReplacements } from './check-replacement-records'
import { readDocumentSequences, saveDocumentSequences, type DocumentSequenceSettings } from './document-sequences'
import { readIssuedExpenses } from './expense-records'
import { readCompanyBillingType } from './operation-date-rules'
import type { Context, ScreenSpec } from './types'

type AccordionId = 'EXPENSES' | 'VOUCHERS' | 'CHECKS'
type SequenceDraft = { expenseStart: string; voucherStarts: Record<string, string>; checkbookStarts: Record<string, string> }

function sequenceValue(value: string) {
  const parsed = Math.trunc(Number(value))
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 999999 ? parsed : 0
}
function sequenceFromNumber(value: string) { return Number(/(\d+)$/.exec(value)?.[1] ?? 0) }
function padded(value: number) { return String(value).padStart(6, '0') }
function unknownPrefix(code: string) { return code.split('_').filter(Boolean).map(word => word[0]).join('').slice(0, 3).padEnd(3, 'X') }

export function DocumentSequencesPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <DocumentSequencesManager key={context.data.company.id} screen={screen} context={context.data} />
}

function DocumentSequencesManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const companyId = context.company.id
  const billingType = readCompanyBillingType()
  const voucherTypes = useMemo(() => readVoucherTypes(companyId), [companyId])
  const vouchers = useMemo(() => readAccountingVouchers(companyId), [companyId])
  const expenses = useMemo(() => readIssuedExpenses(companyId), [companyId])
  const checkbooks = useMemo(() => readBankAccounts(companyId).filter(row => row.type === 'CORRIENTE').sort((left, right) => left.bank.localeCompare(right.bank, 'es') || left.accountNumber.localeCompare(right.accountNumber, 'es', { numeric: true })), [companyId])
  const issuedChecks = useMemo(() => readAuthorizedBankEgresses(companyId).filter(row => row.paymentMethod === 'CHEQUE'), [companyId])
  const replacementChecks = useMemo(() => readCheckReplacements(companyId), [companyId])
  const stored = useMemo(() => readDocumentSequences(companyId), [companyId])

  const expenseFloor = expenses.reduce((maximum, row) => Math.max(maximum, sequenceFromNumber(row.receiptNumber)), 0) + 1
  const voucherFloors = Object.fromEntries(voucherTypes.map(type => [type.code, vouchers.filter(row => row.type === type.code).reduce((maximum, row) => Math.max(maximum, sequenceFromNumber(row.number)), 0) + 1]))
  const checkbookFloors = Object.fromEntries(checkbooks.map(account => [account.id, [...issuedChecks.filter(row => row.bankAccountId === account.id).map(row => row.documentNumber), ...replacementChecks.filter(row => row.bankAccountId === account.id).map(row => row.newCheckNumber)].reduce((maximum, number) => Math.max(maximum, sequenceFromNumber(number)), 0) + 1]))
  const [draft, setDraft] = useState<SequenceDraft>(() => ({
    expenseStart: String(stored.expenseStart ?? Math.max(1, expenseFloor)),
    voucherStarts: Object.fromEntries(voucherTypes.map(type => [type.code, String(stored.voucherStarts[type.code] ?? Math.max(1, voucherFloors[type.code]))])),
    checkbookStarts: Object.fromEntries(checkbooks.map(account => [account.id, String(stored.checkbookStarts[account.id] ?? Math.max(1, checkbookFloors[account.id]))])),
  }))
  const [expanded, setExpanded] = useState<Set<AccordionId>>(new Set())
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const toggle = (id: AccordionId) => setExpanded(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const updateSequence = (section: keyof SequenceDraft, key: string, value: string) => {
    const normalized = value.replace(/\D/g, '').slice(0, 6)
    setDraft(current => section === 'expenseStart' ? { ...current, expenseStart: normalized } : { ...current, [section]: { ...current[section], [key]: normalized } })
    setError(''); setMessage('')
  }
  const save = () => {
    const expenseStart = sequenceValue(draft.expenseStart)
    const voucherStarts = Object.fromEntries(voucherTypes.map(type => [type.code, sequenceValue(draft.voucherStarts[type.code] ?? '')]))
    const checkbookStarts = Object.fromEntries(checkbooks.map(account => [account.id, sequenceValue(draft.checkbookStarts[account.id] ?? '')]))
    if (billingType === 'EXPENSAS' && !expenseStart) { setError('La secuencia inicial de Expensas debe estar entre 1 y 999999.'); return }
    const invalidVoucher = voucherTypes.find(type => !voucherStarts[type.code])
    if (invalidVoucher) { setError(`Ingresa una secuencia válida para ${invalidVoucher.name}.`); setExpanded(current => new Set(current).add('VOUCHERS')); return }
    const invalidCheckbook = checkbooks.find(account => !checkbookStarts[account.id])
    if (invalidCheckbook) { setError(`Ingresa una secuencia válida para la chequera ${invalidCheckbook.bank} ${invalidCheckbook.accountNumber}.`); setExpanded(current => new Set(current).add('CHECKS')); return }
    const settings: DocumentSequenceSettings = { expenseStart: expenseStart || stored.expenseStart, voucherStarts, checkbookStarts, updatedAt: new Date().toISOString(), updatedBy: context.actor.name }
    saveDocumentSequences(companyId, settings); setMessage('Las secuencias de documentos fueron guardadas correctamente.'); setError('')
  }

  const expenseStart = sequenceValue(draft.expenseStart)
  return <div className="page screen-page document-sequences-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header document-sequences-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div><button type="button" className="primary-action" onClick={save}><Save />Guardar Secuencias</button></section>
    {message && <div className="document-sequences-feedback success" role="status"><Check />{message}</div>}
    {error && <div className="document-sequences-feedback error" role="alert"><FileDigit />{error}</div>}
    <section className="document-sequences-stack">
      {billingType === 'EXPENSAS' && <SequenceAccordion id="EXPENSES" title="Expensas" subtitle="Numeración inicial de comprobantes de expensas" icon={<ReceiptText />} expanded={expanded.has('EXPENSES')} onToggle={toggle} count="1 secuencia">
        <div className="document-sequence-row"><div><strong>Expensas</strong><span>Serie fija 001-001</span></div><SequenceInput value={draft.expenseStart} onChange={value => updateSequence('expenseStart', '', value)} /><div className="document-sequence-preview"><span>Próximo número</span><strong>001-001-{padded(Math.max(expenseFloor, expenseStart || 1))}</strong></div></div>
      </SequenceAccordion>}
      <SequenceAccordion id="VOUCHERS" title="Comprobantes Contables" subtitle="Una secuencia independiente para cada Tipo de Comprobante" icon={<BookOpenCheck />} expanded={expanded.has('VOUCHERS')} onToggle={toggle} count={`${voucherTypes.length} tipos`}>
        <div className="document-sequence-table"><div className="document-sequence-table-head"><span>Tipo de Comprobante</span><span>Primera numeración</span><span>Próximo número</span></div>{voucherTypes.map(type => { const prefix = voucherPrefixes[type.code as VoucherType] ?? unknownPrefix(type.code); const start = sequenceValue(draft.voucherStarts[type.code] ?? ''); return <div className="document-sequence-table-row" key={type.code}><div><strong>{type.name}</strong><span>{type.origin === 'AUTOMÁTICO' ? 'Automático' : 'Manual'} · {type.code}</span></div><SequenceInput value={draft.voucherStarts[type.code] ?? ''} onChange={value => updateSequence('voucherStarts', type.code, value)} /><div className="document-sequence-preview"><span>Próximo número</span><strong>{prefix}-{padded(Math.max(voucherFloors[type.code] ?? 1, start || 1))}</strong></div></div> })}</div>
      </SequenceAccordion>
      <SequenceAccordion id="CHECKS" title="Cheques" subtitle="Secuencia de cheque por cada cuenta corriente configurada" icon={<Landmark />} expanded={expanded.has('CHECKS')} onToggle={toggle} count={`${checkbooks.length} ${checkbooks.length === 1 ? 'chequera' : 'chequeras'}`}>
        {checkbooks.length ? <div className="document-sequence-table"><div className="document-sequence-table-head"><span>Chequera</span><span>Primera numeración</span><span>Próximo cheque</span></div>{checkbooks.map(account => { const start = sequenceValue(draft.checkbookStarts[account.id] ?? ''); return <div className="document-sequence-table-row" key={account.id}><div><strong>{account.bank}</strong><span>Cuenta {account.accountNumber} · {account.state === 'ACTIVA' ? 'Activa' : 'Inactiva'}</span></div><SequenceInput value={draft.checkbookStarts[account.id] ?? ''} onChange={value => updateSequence('checkbookStarts', account.id, value)} /><div className="document-sequence-preview"><span>Próximo cheque</span><strong>CHQ-{padded(Math.max(checkbookFloors[account.id] ?? 1, start || 1))}</strong></div></div> })}</div> : <div className="document-sequences-empty"><Landmark /><strong>No existen chequeras configuradas</strong><span>Registra una cuenta de tipo Corriente en Bancos → Cuentas Bancarias para habilitar su secuencia.</span></div>}
      </SequenceAccordion>
    </section>
  </div>
}

function SequenceAccordion({ id, title, subtitle, icon, expanded, count, onToggle, children }: { id: AccordionId; title: string; subtitle: string; icon: React.ReactNode; expanded: boolean; count: string; onToggle: (id: AccordionId) => void; children: React.ReactNode }) {
  return <section className={`document-sequence-accordion ${expanded ? 'expanded' : ''}`}><button type="button" className="document-sequence-accordion-head" onClick={() => onToggle(id)} aria-expanded={expanded}><span className="document-sequence-icon">{icon}</span><span><strong>{title}</strong><small>{subtitle}</small></span><em>{count}</em><ChevronDown /></button>{expanded && <div className="document-sequence-accordion-body">{children}</div>}</section>
}

function SequenceInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="document-sequence-input"><span>Primera numeración</span><input inputMode="numeric" min={1} max={999999} maxLength={6} value={value} onFocus={event => event.currentTarget.select()} onChange={event => onChange(event.target.value)} aria-label="Primera numeración" /></label>
}
