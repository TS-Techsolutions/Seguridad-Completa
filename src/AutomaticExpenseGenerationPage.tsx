import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, Play, X } from 'lucide-react'
import { api } from './api'
import { readAccountingClosures } from './AccountingClosurePage'
import { readCompanyGenerationType, type CompanyGenerationType } from './operation-date-rules'
import type { Context, ScreenSpec } from './types'

type GenerationRecord = {
  id: string
  month: string
  expenseDate: string
  generatedAt: string
  user: string
  generationType?: CompanyGenerationType
  generatedDocuments?: number
  propertiesProcessed?: number
  totalValue?: number
}

type BillingHistory = { owner?: string; tenant?: string; billedTo?: 'PROPIETARIO' | 'INQUILINO'; until?: string }
type ExpenseProperty = { id: string; description?: string; state?: string; generationMode?: string; usableArea?: string; sectionId?: string; divisionKey?: string; billingHistory?: BillingHistory[] }
type ExpenseItem = { id: string; description: string; valueMode: 'MT2' | 'FIJO'; value: string; divisionKeys: string[]; sectionIds: string[]; recurrence: string; state: string }
type SectionRate = { from: string; until: string; value: string }
type PropertySection = { id: string; description: string; state: string; rates?: SectionRate[] }
type GenerationUnit = { key: string; label: string; properties: string[]; amount: number; itemCount: number }
type PropertyCalculation = { property: ExpenseProperty; label: string; amount: number; itemCount: number }
type GenerationPlan = { type: CompanyGenerationType; properties: ExpenseProperty[]; units: GenerationUnit[]; missingBilling: string[]; skippedIndividual: string[]; calculationErrors: string[]; totalValue: number }

const defaultSections: PropertySection[] = [
  { id: 'SEC-A', description: 'Departamentos', state: 'ACTIVO', rates: [{ from: '01/10/2026', until: '', value: '12.500000' }, { from: '01/01/2026', until: '30/09/2026', value: '11.250000' }] },
  { id: 'SEC-B', description: 'Locales comerciales', state: 'ACTIVO', rates: [{ from: '01/01/2026', until: '', value: '15.750000' }] },
  { id: 'SEC-C', description: 'Parqueaderos', state: 'INACTIVO', rates: [] },
]

function readJson<T>(key: string, fallback: T): T {
  try { const value = JSON.parse(localStorage.getItem(key) ?? 'null'); return value ?? fallback } catch { return fallback }
}

function storageKey(companyId: string) { return `saga.automatic-expense-generations:${companyId}` }

function currentMonth() {
  const date = new Date()
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

function firstDayOfMonth(month: string) {
  return `01/${month}`
}

function displayAccountingMonth(period: string) {
  const [year, month] = period.split('-')
  return `${month}/${year}`
}

function availableExpenseMonths() {
  const currentDate = new Date()
  const limitDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
  const maximumPeriod = `${limitDate.getFullYear()}-${String(limitDate.getMonth() + 1).padStart(2, '0')}`
  const enabledPeriods = readAccountingClosures()
    .filter(row => row.estado !== 'CERRADO')
    .map(row => row.periodo)
    .filter(period => /^\d{4}-(0[1-9]|1[0-2])$/.test(period))
    .filter(period => period <= maximumPeriod)
  if (!enabledPeriods.length) return []
  return Array.from(new Set(enabledPeriods)).sort().map(displayAccountingMonth)
}

function validDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return false
  const [, dayText, monthText, yearText] = match
  const day = Number(dayText); const month = Number(monthText); const year = Number(yearText)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function displayGenerationDate(value: string) {
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
}

function normalizedClient(value: string) {
  return value.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ')
}

function dateRank(value: string) {
  if (!validDate(value)) return 0
  const [day, month, year] = value.split('/').map(Number)
  return year * 10000 + month * 100 + day
}

function amount(value: number) {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000
}

function displayMoney(value: number) {
  return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildGenerationPlan(companyId: string, calculationDate: string): GenerationPlan {
  const type = readCompanyGenerationType()
  const allProperties = readJson<ExpenseProperty[]>('saga.property-detail', [])
  const expenseItems = readJson<Array<ExpenseItem & { divisionKey?: string; sectionId?: string }>>(`saga.property-expense-items:${companyId}`, [])
    .map(item => ({ ...item, divisionKeys: Array.isArray(item.divisionKeys) ? item.divisionKeys : item.divisionKey ? [item.divisionKey] : [], sectionIds: Array.isArray(item.sectionIds) ? item.sectionIds : item.sectionId ? [item.sectionId] : [] }))
    .filter(item => item.state === 'ACTIVO' && item.recurrence === 'NORMAL')
  const sections = readJson<PropertySection[]>('saga.property-sections', defaultSections)
  const skippedIndividual = allProperties
    .filter(property => property.state === 'ACTIVO' && property.generationMode === 'INDIVIDUAL')
    .map(property => property.description?.trim() || property.id)
  const properties = allProperties
    .filter(property => property.state === 'ACTIVO' && (property.generationMode ?? 'AUTOMATICA') === 'AUTOMATICA')
  const calculationErrors: string[] = []
  const calculations: PropertyCalculation[] = properties.map(property => {
    const label = property.description?.trim() || property.id
    const applicableItems = expenseItems.filter(item => item.sectionIds?.includes(property.sectionId ?? '') && item.divisionKeys?.includes(property.divisionKey ?? ''))
    if (!applicableItems.length) calculationErrors.push(`${label}: no tiene rubros normales activos habilitados para su Sección y División.`)
    let propertyTotal = 0
    applicableItems.forEach(item => {
      const itemValue = Number(item.value)
      if (!Number.isFinite(itemValue) || itemValue < 0) { calculationErrors.push(`${label}: el rubro ${item.description} tiene un valor inválido.`); return }
      if (item.valueMode === 'FIJO') { propertyTotal += itemValue; return }
      const area = Number(String(property.usableArea ?? '').replace(',', '.'))
      const section = sections.find(row => row.id === property.sectionId && row.state === 'ACTIVO')
      const calculationRank = dateRank(calculationDate)
      const rate = section?.rates?.find(row => dateRank(row.from) <= calculationRank && (!row.until || dateRank(row.until) >= calculationRank))
      if (!Number.isFinite(area) || area <= 0) { calculationErrors.push(`${label}: Área Útil inválida para calcular ${item.description}.`); return }
      if (!section || !rate) { calculationErrors.push(`${label}: la sección no tiene un Valor x Mt2 vigente para ${calculationDate}.`); return }
      propertyTotal += area * Number(rate.value) * itemValue
    })
    return { property, label, amount: amount(propertyTotal), itemCount: applicableItems.length }
  })
  const groups = new Map<string, GenerationUnit>()
  const missingBilling: string[] = []
  calculations.forEach(calculation => {
    const property = calculation.property
    const billing = property.billingHistory?.find(item => !item.until)
    const billedClient = billing?.billedTo === 'INQUILINO' ? billing.tenant?.trim() : billing?.owner?.trim()
    if (!billing || !billedClient) { missingBilling.push(property.description?.trim() || property.id); return }
    const key = normalizedClient(billedClient)
    const current = groups.get(key)
    if (current) { current.properties.push(calculation.label); current.amount = amount(current.amount + calculation.amount); current.itemCount += calculation.itemCount }
    else groups.set(key, { key, label: billedClient, properties: [calculation.label], amount: calculation.amount, itemCount: calculation.itemCount })
  })
  const units = type === 'INMUEBLE'
    ? calculations.map(calculation => ({ key: calculation.property.id, label: calculation.label, properties: [calculation.label], amount: calculation.amount, itemCount: calculation.itemCount }))
    : Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'))
  return { type, properties, units, missingBilling: type === 'CLIENTE' ? missingBilling : [], skippedIndividual, calculationErrors: Array.from(new Set(calculationErrors)), totalValue: amount(units.reduce((sum, unit) => sum + unit.amount, 0)) }
}

export function AutomaticExpenseGenerationPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <AutomaticExpenseGenerationManager key={context.data.company.id} screen={screen} context={context.data} />
}

function AutomaticExpenseGenerationManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const key = storageKey(context.company.id)
  const [months, setMonths] = useState<string[]>(availableExpenseMonths)
  const [history, setHistory] = useState<GenerationRecord[]>(() => readJson<GenerationRecord[]>(key, []).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)))
  const [formOpen, setFormOpen] = useState(false)
  const [month, setMonth] = useState(currentMonth)
  const [expenseDate, setExpenseDate] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [duplicatePending, setDuplicatePending] = useState(false)
  const [plan, setPlan] = useState<GenerationPlan>(() => buildGenerationPlan(context.company.id, firstDayOfMonth(currentMonth())))

  const persistGeneration = () => {
    const currentPlan = buildGenerationPlan(context.company.id, expenseDate)
    if (!currentPlan.properties.length) { setDuplicatePending(false); setError('No existen inmuebles activos habilitados para generación automática.'); return }
    if (currentPlan.missingBilling.length) { setDuplicatePending(false); setError(`Completa el campo Se Factura A vigente en: ${currentPlan.missingBilling.join(', ')}.`); return }
    if (currentPlan.calculationErrors.length) { setDuplicatePending(false); setError(currentPlan.calculationErrors.join(' ')); return }
    const record: GenerationRecord = { id: crypto.randomUUID(), month, expenseDate, generatedAt: new Date().toISOString(), user: context.actor.name, generationType: currentPlan.type, generatedDocuments: currentPlan.units.length, propertiesProcessed: currentPlan.properties.length, totalValue: currentPlan.totalValue }
    const next = [record, ...history].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    setHistory(next)
    localStorage.setItem(key, JSON.stringify(next))
    setFormOpen(false); setDuplicatePending(false); setExpenseDate(''); setError('')
    setMessage(`Se generaron ${currentPlan.units.length} expensas automáticas de ${month} por ${displayMoney(currentPlan.totalValue)} para ${currentPlan.properties.length} inmuebles.`)
  }

  const requestGeneration = (event: FormEvent) => {
    event.preventDefault()
    if (!validDate(expenseDate)) { setError('La Fecha en Expensas debe tener el formato DD/MM/AAAA y ser una fecha válida.'); return }
    const currentPlan = buildGenerationPlan(context.company.id, expenseDate)
    setPlan(currentPlan)
    if (!currentPlan.properties.length) { setError('No existen inmuebles activos habilitados para generación automática.'); return }
    if (currentPlan.missingBilling.length) { setError(`Completa el campo Se Factura A vigente en: ${currentPlan.missingBilling.join(', ')}.`); return }
    if (currentPlan.calculationErrors.length) { setError(currentPlan.calculationErrors.join(' ')); return }
    if (history.some(record => record.month === month)) { setDuplicatePending(true); return }
    persistGeneration()
  }

  const openForm = () => {
    const availableMonths = availableExpenseMonths()
    setMonths(availableMonths)
    if (!availableMonths.length) {
      setMessage('No existen períodos contables habilitados hasta el mes siguiente a la fecha actual. Los períodos cerrados no pueden ejecutarse.')
      return
    }
    const selectedMonth = availableMonths.includes(currentMonth()) ? currentMonth() : availableMonths[0]
    setPlan(buildGenerationPlan(context.company.id, firstDayOfMonth(selectedMonth)))
    setMonth(selectedMonth); setExpenseDate(firstDayOfMonth(selectedMonth)); setError(''); setMessage(''); setDuplicatePending(false); setFormOpen(true)
  }

  return <div className="page screen-page automatic-expense-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div></section>

    <section className="automatic-expense-action-box"><div><span className="automatic-expense-icon"><CalendarDays /></span><div><strong>Generación mensual de expensas</strong><small>Ejecuta el proceso para el mes y la fecha contable seleccionados.</small></div></div><button type="button" className="primary-action" onClick={openForm}><Play />Generar Expensas Automáticas</button></section>

    {message && <div className="automatic-expense-feedback" role="status"><CheckCircle2 />{message}</div>}

    <section className="automatic-expense-history"><header><div><h2>Histórico de Generaciones</h2><span>Procesos ejecutados desde el más reciente.</span></div></header><div className="automatic-expense-table"><table><thead><tr><th>Mes Generado</th><th>Fecha Generación</th><th>Tipo de Generación</th><th>Expensas Generadas</th><th>Valor Total</th><th>Usuario</th></tr></thead><tbody>{history.map(record => <tr key={record.id}><td><strong>{record.month}</strong></td><td>{displayGenerationDate(record.generatedAt)}</td><td>{record.generationType==='INMUEBLE'?'Por Inmueble':record.generationType==='CLIENTE'?'Por Cliente':'—'}</td><td>{record.generatedDocuments??'—'}</td><td>{record.totalValue===undefined?'—':displayMoney(record.totalValue)}</td><td>{record.user}</td></tr>)}{!history.length && <tr><td colSpan={6}><div className="automatic-expense-empty"><CalendarDays /><strong>No existen generaciones registradas</strong><span>Los procesos ejecutados aparecerán en esta tabla.</span></div></td></tr>}</tbody></table></div></section>

    {formOpen && <div className="automatic-expense-backdrop" role="dialog" aria-modal="true" aria-label="Generar Expensas Automáticas"><form className="automatic-expense-modal" onSubmit={requestGeneration}><header><div><span>Nuevo proceso</span><h2>Generar Expensas Automáticas</h2><small>{context.company.name}</small></div><button type="button" aria-label="Cerrar" onClick={() => setFormOpen(false)}><X /></button></header><div className="automatic-expense-fields"><label><span>Mes <b>Obligatorio</b></span><select value={month} onChange={event => { const selectedMonth = event.target.value; const selectedDate = firstDayOfMonth(selectedMonth); setMonth(selectedMonth); setExpenseDate(selectedDate); setPlan(buildGenerationPlan(context.company.id, selectedDate)); setError('') }}>{months.map(option => <option key={option} value={option}>{option}</option>)}</select></label><label><span>Fecha en Expensas <b>Obligatorio</b></span><input inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={expenseDate} onChange={event => { const selectedDate = event.target.value; setExpenseDate(selectedDate); if(validDate(selectedDate))setPlan(buildGenerationPlan(context.company.id, selectedDate)); setError('') }} /></label><section className="automatic-expense-plan"><header><div><span>Tipo de Generación</span><strong>{plan.type==='CLIENTE'?'Generación por Cliente':'Generación por Inmueble'}</strong></div><div><span>Expensas a generar</span><strong>{plan.units.length}</strong></div><div><span>Inmuebles incluidos</span><strong>{plan.properties.length}</strong></div><div><span>Individuales omitidos</span><strong>{plan.skippedIndividual.length}</strong></div><div><span>Valor total</span><strong>{displayMoney(plan.totalValue)}</strong></div></header>{plan.units.length>0&&<div className="automatic-expense-plan-list">{plan.units.map(unit=><article key={unit.key}><strong>{unit.label}</strong><span>{unit.properties.join(' · ')} · {unit.itemCount} rubros · {displayMoney(unit.amount)}</span></article>)}</div>}{plan.skippedIndividual.length>0&&<aside><strong>Omitidos por generación individual:</strong> {plan.skippedIndividual.join(', ')}</aside>}{plan.missingBilling.length>0&&<p><AlertTriangle/>Sin Se Factura A vigente: {plan.missingBilling.join(', ')}</p>}{plan.calculationErrors.length>0&&<p><AlertTriangle/>{plan.calculationErrors.join(' ')}</p>}</section>{error && <div className="automatic-expense-error" role="alert"><AlertTriangle />{error}</div>}</div><footer><button type="button" className="quiet-button" onClick={() => setFormOpen(false)}>Cancelar</button><button type="submit" className="primary-action"><Play />Generar</button></footer></form></div>}

    {duplicatePending && <div className="automatic-expense-backdrop duplicate" role="alertdialog" aria-modal="true" aria-label="Confirmar nueva generación"><section className="automatic-expense-confirm"><span><AlertTriangle /></span><h2>El mes ya fue generado</h2><p>Ya existe una generación de expensas para <strong>{month}</strong>. ¿Deseas ejecutar nuevamente el proceso con fecha <strong>{expenseDate}</strong>?</p><div><button type="button" className="quiet-button" onClick={() => setDuplicatePending(false)}>Cancelar</button><button type="button" className="primary-action" onClick={persistGeneration}><Play />Sí, generar nuevamente</button></div></section></div>}
  </div>
}
