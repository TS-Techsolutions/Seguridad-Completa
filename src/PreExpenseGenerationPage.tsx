import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Ban, CheckCircle2, ChevronRight, FileDown, Mail, Play, Printer, ReceiptText, Search, X } from 'lucide-react'
import { api } from './api'
import { readAccountingClosures } from './AccountingClosurePage'
import { buildGenerationPlan, type GenerationPlan } from './AutomaticExpenseGenerationPage'
import { buildWaterPlan } from './AutomaticWaterExpenseGenerationPage'
import { displayExpenseMonth } from './expense-pdf-preview'
import type { IssuedExpenseLine, IssuedExpenseRecord } from './expense-records'
import { savePreExpenseBatch, type PreBillingDocument, type PreExpenseBatch, type PreExpenseKind } from './pre-expense-records'
import type { Context, ScreenSpec } from './types'
import { readVatConfigurations } from './vat-configuration-store'

type Customer = { identification: string; businessName: string; address?: string; phone: string; email: string }
type ExtraordinaryHistory = { id: string; detail: string; startMonth: string; installments: number; executedInstallments: number; state: string }
type ExtraordinaryItem = { id: string; description: string; recurrence: string; state: string; extraordinaryHistory?: ExtraordinaryHistory[] }
type ExtraordinaryOption = { key: string; itemId: string; itemDescription: string; detail: string; nextInstallment: number; installments: number; startMonth: string }
type TaxableItem = { id: string; description: string; vatConfigurationId?: string }

function readJson<T>(key: string, fallback: T): T { try { const value = JSON.parse(localStorage.getItem(key) ?? 'null'); return value ?? fallback } catch { return fallback } }
function normalized(value: string) { return value.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ') }
function currentMonth() { const date = new Date(); return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}` }
function firstDayOfMonth(month: string) { return `01/${month}` }
function validDate(value: string) { const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!match) return false; const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])); return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[1]) }
function money(value: number) { return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function displayAccountingMonth(period: string) { const [year, month] = period.split('-'); return `${month}/${year}` }
function availableMonths() { const now = new Date(); const limit = new Date(now.getFullYear(), now.getMonth() + 1, 1); const maximum = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, '0')}`; return Array.from(new Set(readAccountingClosures().filter(row => row.estado !== 'CERRADO' && /^\d{4}-(0[1-9]|1[0-2])$/.test(row.periodo) && row.periodo <= maximum).map(row => row.periodo))).sort().map(displayAccountingMonth) }

function readExtraordinaryOptions(companyId: string): ExtraordinaryOption[] {
  return readJson<ExtraordinaryItem[]>(`saga.property-expense-items:${companyId}`, [])
    .filter(item => item.state === 'ACTIVO' && item.recurrence === 'EXTRAORDINARIA')
    .flatMap(item => (item.extraordinaryHistory ?? []).filter(entry => entry.state === 'ACTIVO' && entry.executedInstallments < entry.installments).map(entry => ({ key: `${item.id}:${entry.id}`, itemId: item.id, itemDescription: item.description, detail: entry.detail, nextInstallment: entry.executedInstallments + 1, installments: entry.installments, startMonth: entry.startMonth })))
    .sort((left, right) => left.detail.localeCompare(right.detail, 'es'))
}
function roundedMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100 }
function applyInvoiceTaxes(companyId: string, lines: IssuedExpenseLine[]) {
  const items = readJson<TaxableItem[]>(`saga.property-expense-items:${companyId}`, [])
  const configurations = readVatConfigurations()
  const errors = new Set<string>()
  const taxedLines = lines.map(line => {
    const item = items.find(row => row.id === line.itemId)
      ?? (line.itemId === 'AGUA' ? items.find(row => normalized(row.description).includes('agua')) : undefined)
    const configuration = configurations.find(row => row.id === item?.vatConfigurationId)
    if (!item?.vatConfigurationId) errors.add(`El rubro ${line.itemDescription} no tiene configurado un Valor IVA.`)
    else if (!configuration) errors.add(`La configuración de IVA del rubro ${line.itemDescription} ya no existe.`)
    else if (configuration.state !== 'ACTIVO') errors.add(`La configuración de IVA del rubro ${line.itemDescription} está inactiva.`)
    const vatRate = configuration?.state === 'ACTIVO' ? configuration.value : 0
    const vatAmount = roundedMoney(line.total * vatRate / 100)
    return { ...line, vatRate, vatAmount, totalWithVat: roundedMoney(line.total + vatAmount) }
  })
  return { lines: taxedLines, errors: Array.from(errors) }
}
function recordsFromPlan(context: Context, plan: GenerationPlan, kind: Exclude<PreExpenseKind, 'AGUA'>, issueDate: string, documentMode: PreBillingDocument): { records: IssuedExpenseRecord[]; errors: string[] } {
  const [, month, year] = issueDate.split('/')
  const customers = readJson<Customer[]>('saga.customers', [])
  const createdAt = new Date().toISOString()
  const errors: string[] = []
  const records = plan.units.map(unit => {
    const customer = customers.find(item => unit.customerIdentification ? normalized(item.identification) === normalized(unit.customerIdentification) : normalized(item.businessName) === normalized(unit.billedClient))
    const taxResult = documentMode === 'INVOICE' ? applyInvoiceTaxes(context.company.id, unit.lines) : { lines: unit.lines, errors: [] }
    errors.push(...taxResult.errors)
    const subtotal = roundedMoney(taxResult.lines.reduce((sum, line) => sum + line.total, 0))
    const vatTotal = roundedMoney(taxResult.lines.reduce((sum, line) => sum + (line.vatAmount ?? 0), 0))
    const vatRates = documentMode === 'INVOICE' ? Array.from(new Set(taxResult.lines.map(line => line.vatRate ?? 0))).sort((left, right) => left - right) : undefined
    const total = documentMode === 'INVOICE' ? roundedMoney(subtotal + vatTotal) : unit.amount
    const documentText = documentMode === 'INVOICE' ? 'PRE-FACTURAS' : 'PRE-EXPENSAS'
    return { id: crypto.randomUUID(), companyId: context.company.id, month, year, issueDate, receiptNumber: documentText, identification: customer?.identification ?? '', businessName: customer?.businessName ?? unit.billedClient, address: customer?.address ?? '', phone: customer?.phone ?? '', email: customer?.email ?? '', expenseType: kind, generationType: 'AUTOMATICA' as const, total, subtotal, vatTotal, vatRates, pdfFileName: `${documentText}.pdf`, createdAt, status: 'VIGENTE' as const, lines: taxResult.lines }
  })
  return { records, errors: Array.from(new Set(errors)) }
}

function waterRecords(context: Context, month: string, issueDate: string, pricePerM3: number, documentMode: PreBillingDocument): { records: IssuedExpenseRecord[]; errors: string[] } {
  const plan = buildWaterPlan(month, pricePerM3)
  if (!plan.readings.length || !plan.units.length) return { records: [], errors: [`No existe un Registro de Lectura Agua procesable para ${month}.`] }
  if (plan.errors.length) return { records: [], errors: plan.errors }
  const [, issueMonth, issueYear] = issueDate.split('/')
  const customers = readJson<Customer[]>('saga.customers', [])
  const createdAt = new Date().toISOString()
  const errors: string[] = []
  const documentText = documentMode === 'INVOICE' ? 'PRE-FACTURAS' : 'PRE-EXPENSAS'
  const records = plan.groups.map(group => {
    const customer = customers.find(item => normalized(item.businessName) === normalized(group.contact))
    const baseLines: IssuedExpenseLine[] = group.units.map(unit => ({ id: crypto.randomUUID(), propertyId: unit.propertyId, propertyDescription: unit.propertyName, itemId: 'AGUA', itemDescription: 'Consumo de agua', conceptText: `${unit.readingDescription} · ${unit.propertyName} · ${unit.consumption.toLocaleString('es-EC', { maximumFractionDigits: 2 })} Mt3`, valueMode: 'FIJO', squareMeters: null, quantity: unit.consumption, unitPrice: pricePerM3, total: unit.amount }))
    const taxResult = documentMode === 'INVOICE' ? applyInvoiceTaxes(context.company.id, baseLines) : { lines: baseLines, errors: [] }
    errors.push(...taxResult.errors)
    const subtotal = roundedMoney(taxResult.lines.reduce((sum, line) => sum + line.total, 0))
    const vatTotal = roundedMoney(taxResult.lines.reduce((sum, line) => sum + (line.vatAmount ?? 0), 0))
    const vatRates = documentMode === 'INVOICE' ? Array.from(new Set(taxResult.lines.map(line => line.vatRate ?? 0))).sort((left, right) => left - right) : undefined
    return { id: crypto.randomUUID(), companyId: context.company.id, month: issueMonth, year: issueYear, issueDate, receiptNumber: documentText, identification: customer?.identification ?? '', businessName: customer?.businessName ?? group.contact, address: customer?.address ?? '', phone: customer?.phone ?? '', email: customer?.email ?? '', expenseType: 'AGUA' as const, generationType: 'AUTOMATICA' as const, total: documentMode === 'INVOICE' ? roundedMoney(subtotal + vatTotal) : group.amount, subtotal, vatTotal, vatRates, pdfFileName: `${documentText}.pdf`, createdAt, status: 'VIGENTE' as const, lines: taxResult.lines }
  })
  return { records, errors: Array.from(new Set(errors)) }
}

function kindLabel(kind: PreExpenseKind) { return kind === 'ORDINARIA' ? 'Ordinarias' : kind === 'EXTRAORDINARIA' ? 'Extraordinarias' : 'Automática Agua' }

export function PreExpenseGenerationPage({ screen, billsWater, documentMode = 'EXPENSE' }: { screen: ScreenSpec; billsWater: boolean; documentMode?: PreBillingDocument }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <PreExpenseGenerationManager key={`${context.data.company.id}-${documentMode}`} screen={screen} context={context.data} billsWater={billsWater} documentMode={documentMode} />
}

export function PreInvoiceGenerationPage({ screen, billsWater }: { screen: ScreenSpec; billsWater: boolean }) {
  return <PreExpenseGenerationPage screen={screen} billsWater={billsWater} documentMode="INVOICE" />
}

function PreExpenseGenerationManager({ screen, context, billsWater, documentMode }: { screen: ScreenSpec; context: Context; billsWater: boolean; documentMode: PreBillingDocument }) {
  const [kind, setKind] = useState<PreExpenseKind>('ORDINARIA')
  const [batch, setBatch] = useState<PreExpenseBatch | null>(null)
  const [months, setMonths] = useState<string[]>(availableMonths)
  const [month, setMonth] = useState(currentMonth)
  const [issueDate, setIssueDate] = useState(firstDayOfMonth(currentMonth()))
  const [waterPricePerM3, setWaterPricePerM3] = useState('')
  const [extraordinaryOptions, setExtraordinaryOptions] = useState<ExtraordinaryOption[]>(() => readExtraordinaryOptions(context.company.id))
  const [selectedExtraordinaryKeys, setSelectedExtraordinaryKeys] = useState<string[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const isInvoice = documentMode === 'INVOICE'
  const pluralLabel = isInvoice ? 'Pre-Facturas' : 'Pre-Expensas'
  const singularLabel = isInvoice ? 'Pre-Factura' : 'Pre-Expensa'
  const documentText = isInvoice ? 'PRE-FACTURAS' : 'PRE-EXPENSAS'
  const previewSegment = isInvoice ? 'pre-facturas' : 'pre-expensas'
  const rows = batch?.records ?? []
  const filteredRows = useMemo(() => { const query = search.trim().toLocaleLowerCase('es'); return query ? rows.filter(row => [displayExpenseMonth(row.month), row.year, row.issueDate, row.receiptNumber, row.identification, row.businessName, row.phone, row.email, row.expenseType, row.generationType, row.total].join(' ').toLocaleLowerCase('es').includes(query)) : rows }, [rows, search])
  useEffect(() => { if (!billsWater && kind === 'AGUA') setKind('ORDINARIA') }, [billsWater, kind])

  const openGenerator = () => {
    const enabled = availableMonths()
    if (!enabled.length) { setError('No existen períodos contables habilitados hasta el mes siguiente a la fecha actual.'); return }
    const selectedMonth = enabled.includes(currentMonth()) ? currentMonth() : enabled[0]
    setMonths(enabled); setMonth(selectedMonth); setIssueDate(firstDayOfMonth(selectedMonth)); setWaterPricePerM3(''); setExtraordinaryOptions(readExtraordinaryOptions(context.company.id)); setSelectedExtraordinaryKeys([]); setError(''); setMessage(''); setFormOpen(true)
  }

  const generate = (event: FormEvent) => {
    event.preventDefault()
    if (!validDate(issueDate)) { setError(`La Fecha en ${isInvoice ? 'Facturas' : 'Expensas'} debe ser válida y tener el formato DD/MM/AAAA.`); return }
    if (!months.includes(issueDate.slice(3))) { setError(`La Fecha en ${isInvoice ? 'Facturas' : 'Expensas'} debe pertenecer a un período contable habilitado.`); return }
    let records: IssuedExpenseRecord[] = []
    if (kind === 'AGUA') {
      const price = Number(waterPricePerM3.replace(',', '.'))
      if (!/^\d+(?:[.,]\d{1,2})?$/.test(waterPricePerM3) || price <= 0) { setError('Valor x Mt3 debe ser mayor a cero y tener máximo 2 decimales.'); return }
      const result = waterRecords(context, month, issueDate, price, documentMode)
      if (result.errors.length) { setError(result.errors.join(' ')); return }
      records = result.records
    } else {
      const selectedOptions = extraordinaryOptions.filter(option => selectedExtraordinaryKeys.includes(option.key))
      if (kind === 'EXTRAORDINARIA' && !selectedOptions.length) { setError('Selecciona al menos un rubro extraordinario activo con cuotas pendientes.'); return }
      const plan = buildGenerationPlan(context.company.id, issueDate, kind === 'ORDINARIA' ? 'NORMAL' : 'EXTRAORDINARIA', selectedExtraordinaryKeys)
      if (!plan.properties.length) { setError('No existen inmuebles activos habilitados para generación automática.'); return }
      if (plan.missingBilling.length) { setError(`Completa el campo Se Factura A vigente en: ${plan.missingBilling.join(', ')}.`); return }
      if (plan.calculationErrors.length) { setError(plan.calculationErrors.join(' ')); return }
      const result = recordsFromPlan(context, plan, kind, issueDate, documentMode)
      if (result.errors.length) { setError(result.errors.join(' ')); return }
      records = result.records
    }
    if (!records.length) { setError(`El proceso no produjo ${pluralLabel.toLocaleLowerCase('es')} para los criterios seleccionados.`); return }
    const nextBatch = savePreExpenseBatch({ id: crypto.randomUUID(), companyId: context.company.id, kind, issueDate, generatedAt: new Date().toISOString(), records, documentMode })
    setBatch(nextBatch); setFormOpen(false); setError(''); setSearch(''); setMessage(`Se generaron ${records.length} ${pluralLabel.toLocaleLowerCase('es')} ${kindLabel(kind).toLocaleLowerCase('es')} por ${money(records.reduce((sum, row) => sum + row.total, 0))}. No se afectó la numeración ni los procesos definitivos.`)
  }

  return <div className="page screen-page pre-expense-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div>{batch && <label className="screen-table-search"><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar en todas las columnas" aria-label={`Buscar ${pluralLabel.toLocaleLowerCase('es')}`} /></label>}</section>
    <section className="pre-expense-generator"><label><span>Tipo de {singularLabel}</span><select value={kind} onChange={event => { setKind(event.target.value as PreExpenseKind); setBatch(null); setSearch(''); setError(''); setMessage('') }}><option value="ORDINARIA">Ordinarias</option><option value="EXTRAORDINARIA">Extraordinarias</option>{billsWater && <option value="AGUA">Automática Agua</option>}</select></label><div className="pre-expense-generator-actions">{batch && <a role="button" className="quiet-button pre-expense-print-button" href={`/vista-previa/${previewSegment}/${encodeURIComponent(batch.id)}`} target="_blank" rel="noreferrer"><Printer />Imprimir {pluralLabel}</a>}<button type="button" className="primary-action" onClick={openGenerator}><Play />Generar {pluralLabel}</button></div></section>
    {message && <div className="automatic-expense-feedback" role="status"><CheckCircle2 />{message}</div>}
    {!formOpen && error && <div className="automatic-expense-error pre-expense-page-error" role="alert"><AlertTriangle />{error}</div>}
    {batch && <section className="expense-consultation-table pre-expense-consultation-table" aria-label={`Resultados de ${pluralLabel} ${kindLabel(batch.kind)}`}><table><thead><tr><th>Mes</th><th>Año</th><th>Fecha Emisión</th><th># Comprobante</th><th>Estado</th><th>Identificación</th><th>Razón Social</th><th>Teléfono</th><th>Email</th><th>Tipo {isInvoice ? 'Factura' : 'Expensa'}</th><th>Tipo Generación</th><th>{isInvoice ? 'Total con IVA' : 'Total'}</th><th>PDF</th><th>Enviar Email</th><th>Anular</th></tr></thead><tbody>{filteredRows.map(row => <tr key={row.id}><td>{displayExpenseMonth(row.month)}</td><td>{row.year}</td><td>{row.issueDate}</td><td><strong>{documentText}</strong></td><td><span className="expense-status preview">{singularLabel}</span></td><td>{row.identification || '—'}</td><td>{row.businessName}</td><td>{row.phone || '—'}</td><td>{row.email || '—'}</td><td><span className={`expense-kind ${row.expenseType.toLowerCase()}`}>{row.expenseType === 'ORDINARIA' ? 'Ordinaria' : row.expenseType === 'EXTRAORDINARIA' ? 'Extraordinaria' : 'Agua'}</span></td><td>{row.generationType === 'AUTOMATICA' ? 'Automática' : 'Individual'}</td><td><strong>{money(row.total)}</strong></td><td><a className="expense-consultation-icon pdf" href={`/vista-previa/${previewSegment}/${encodeURIComponent(batch.id)}/${encodeURIComponent(row.id)}`} target="_blank" rel="noreferrer" title={`Abrir vista previa de ${row.pdfFileName}`} aria-label={`Abrir PDF ${documentText} de ${row.businessName}`}><FileDown /></a></td><td><button type="button" className="expense-consultation-icon email" disabled title="Disponible únicamente después de la generación definitiva"><Mail /></button></td><td><button type="button" className="expense-void-button" disabled><Ban />No aplica</button></td></tr>)}{!filteredRows.length && <tr><td colSpan={15}><div className="expense-consultation-empty"><ReceiptText /><strong>No existen coincidencias</strong><span>Prueba con otro criterio de búsqueda.</span></div></td></tr>}</tbody></table></section>}
    {formOpen && <div className="automatic-expense-backdrop" role="dialog" aria-modal="true" aria-label={`Generar ${pluralLabel}`}><form className={`automatic-expense-modal pre-expense-modal ${kind === 'EXTRAORDINARIA' ? 'extraordinary' : ''}`} onSubmit={generate}><header><div><span>Proceso de validación</span><h2>Generar {pluralLabel} {kindLabel(kind)}</h2><small>{context.company.name}</small></div><button type="button" aria-label="Cerrar" onClick={() => setFormOpen(false)}><X /></button></header><div className="automatic-expense-fields">{kind !== 'EXTRAORDINARIA' && <label><span>Mes <b>Obligatorio</b></span><select value={month} onChange={event => { const selected = event.target.value; setMonth(selected); setIssueDate(firstDayOfMonth(selected)); setError('') }}>{months.map(option => <option key={option} value={option}>{option}</option>)}</select></label>}<label><span>Fecha en {isInvoice ? 'Facturas' : 'Expensas'} <b>Obligatorio</b></span><input inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={issueDate} onChange={event => { setIssueDate(event.target.value); setError('') }} /></label>{kind === 'AGUA' && <label><span>Valor x Mt3 <b>Obligatorio</b></span><input inputMode="decimal" placeholder="0.00" value={waterPricePerM3} onChange={event => { const value=event.target.value.replace(/[^\d.,]/g,''); if(!value||/^\d*(?:[.,]\d{0,2})?$/.test(value)){setWaterPricePerM3(value);setError('')} }} /></label>}{kind === 'EXTRAORDINARIA' && <section className="pre-expense-extraordinary-options"><header><strong>Rubros extraordinarios pendientes</strong><span>Selecciona uno o más rubros para consolidarlos en las {pluralLabel.toLocaleLowerCase('es')}.</span></header>{extraordinaryOptions.map(option => <label key={option.key} className={selectedExtraordinaryKeys.includes(option.key) ? 'selected' : ''}><input type="checkbox" checked={selectedExtraordinaryKeys.includes(option.key)} onChange={event => setSelectedExtraordinaryKeys(current => event.target.checked ? [...current, option.key] : current.filter(key => key !== option.key))} /><span><strong>{option.itemDescription}</strong><small>{option.detail}</small><em>Cuota {option.nextInstallment} de {option.installments} · Inicio {option.startMonth}</em></span></label>)}{!extraordinaryOptions.length && <div className="pre-expense-no-extraordinary">No existen rubros extraordinarios activos con cuotas pendientes.</div>}</section>}<div className="pre-expense-simulation-note"><strong>Simulación sin afectación</strong><span>Se aplicarán las mismas reglas del proceso automático{isInvoice ? ', validando el IVA configurado en cada rubro' : ''}, pero no se crearán comprobantes definitivos, no se consumirá secuencia y no se avanzarán cuotas.</span></div>{error && <div className="automatic-expense-error" role="alert"><AlertTriangle />{error}</div>}</div><footer><button type="button" className="quiet-button" onClick={() => setFormOpen(false)}>Cancelar</button><button type="submit" className="primary-action"><Play />Generar {pluralLabel}</button></footer></form></div>}
  </div>
}
