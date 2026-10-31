import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, Play, X } from 'lucide-react'
import { api } from './api'
import { readAccountingClosures } from './AccountingClosurePage'
import { appendIssuedExpenses, nextReceiptNumber, type IssuedExpenseLine, type IssuedExpenseRecord } from './expense-records'
import { readCompanyGenerationType, type CompanyGenerationType } from './operation-date-rules'
import type { Context, ScreenSpec } from './types'

type GenerationRecord = {
  id: string
  month: string
  detail?: string
  installmentNumber?: number
  extraordinaryPlanKey?: string
  extraordinaryPlans?: Array<{ key: string; detail: string; installmentNumber: number }>
  expenseDate: string
  generatedAt: string
  user: string
  generationType?: CompanyGenerationType
  generatedDocuments?: number
  propertiesProcessed?: number
  totalValue?: number
}

type BillingHistory = { owner?: string; tenant?: string; billedTo?: 'PROPIETARIO' | 'INQUILINO'; billedToName?: string; until?: string }
type Customer = { identification: string; businessName: string; address?: string; phone: string; email: string }
export type ExpenseRecurrence = 'NORMAL' | 'EXTRAORDINARIA'
type ExtraordinaryHistory = { id: string; detail: string; startMonth: string; installments: number; executedInstallments: number; state: string; valueMode?: 'MT2' | 'FIJO' | 'NA'; value?: string; divisionKeys?: string[]; sectionIds?: string[] }
type ExpenseProperty = { id: string; description?: string; state?: string; generationMode?: string; usableArea?: string; sectionId?: string; divisionKey?: string; billingHistory?: BillingHistory[] }
type ExpenseItem = { id: string; description: string; expenseText?: string; valueMode: 'MT2' | 'FIJO' | 'NA'; value: string; divisionKeys: string[]; sectionIds: string[]; recurrence: ExpenseRecurrence; state: string; extraordinaryHistory?: ExtraordinaryHistory[] }
type ExtraordinaryOption = { key: string; itemId: string; historyId: string; itemDescription: string; detail: string; startMonth: string; installments: number; executedInstallments: number; nextInstallment: number }
type ExtraordinaryHistoryRow = ExtraordinaryOption & { state: string; itemState: string }
type SectionRate = { from: string; until: string; value: string }
type PropertySection = { id: string; description: string; state: string; rates?: SectionRate[] }
type StructureDetail = { id: string; description: string }
type StructureRow = { id: string; description: string; details?: StructureDetail[] }
export type GenerationUnit = { key: string; label: string; billedClient: string; customerIdentification?: string; properties: string[]; amount: number; itemCount: number; lines: IssuedExpenseLine[] }
type PropertyCalculation = { property: ExpenseProperty; label: string; amount: number; itemCount: number; lines: IssuedExpenseLine[] }
type BilledPropertyCalculation = PropertyCalculation & { billedClient: string; customer?: Customer }
type ExpenseCalculationRule = { item: ExpenseItem; history?: ExtraordinaryHistory; valueMode: 'MT2' | 'FIJO' | 'NA'; value: string; divisionKeys: string[]; sectionIds: string[] }
export type GenerationPlan = { type: CompanyGenerationType; properties: ExpenseProperty[]; units: GenerationUnit[]; missingBilling: string[]; skippedIndividual: string[]; calculationErrors: string[]; totalValue: number }

const defaultSections: PropertySection[] = [
  { id: 'SEC-A', description: 'Departamentos', state: 'ACTIVO', rates: [{ from: '01/10/2026', until: '', value: '12.500000' }, { from: '01/01/2026', until: '30/09/2026', value: '11.250000' }] },
  { id: 'SEC-B', description: 'Locales comerciales', state: 'ACTIVO', rates: [{ from: '01/01/2026', until: '', value: '15.750000' }] },
  { id: 'SEC-C', description: 'Parqueaderos', state: 'INACTIVO', rates: [] },
]

function readJson<T>(key: string, fallback: T): T {
  try { const value = JSON.parse(localStorage.getItem(key) ?? 'null'); return value ?? fallback } catch { return fallback }
}

function storageKey(companyId: string, recurrence: ExpenseRecurrence) {
  return recurrence === 'NORMAL'
    ? `saga.automatic-expense-generations:${companyId}`
    : `saga.automatic-extraordinary-expense-generations:${companyId}`
}

function expenseItemsKey(companyId: string) { return `saga.property-expense-items:${companyId}` }

function readExtraordinaryOptions(companyId: string): ExtraordinaryOption[] {
  return readJson<ExpenseItem[]>(expenseItemsKey(companyId), [])
    .filter(item => item.state === 'ACTIVO' && item.recurrence === 'EXTRAORDINARIA')
    .flatMap(item => (Array.isArray(item.extraordinaryHistory) ? item.extraordinaryHistory : [])
      .filter(entry => entry.state === 'ACTIVO' && entry.executedInstallments < entry.installments)
      .map(entry => ({
        key: `${item.id}:${entry.id}`,
        itemId: item.id,
        historyId: entry.id,
        itemDescription: item.description,
        detail: entry.detail,
        startMonth: entry.startMonth,
        installments: entry.installments,
        executedInstallments: entry.executedInstallments,
        nextInstallment: entry.executedInstallments + 1,
      })))
    .sort((left, right) => left.detail.localeCompare(right.detail, 'es'))
}

function readExtraordinaryHistory(companyId: string): ExtraordinaryHistoryRow[] {
  return readJson<ExpenseItem[]>(expenseItemsKey(companyId), [])
    .filter(item => item.recurrence === 'EXTRAORDINARIA')
    .flatMap(item => (Array.isArray(item.extraordinaryHistory) ? item.extraordinaryHistory : []).map(entry => ({
      key: `${item.id}:${entry.id}`,
      itemId: item.id,
      historyId: entry.id,
      itemDescription: item.description,
      detail: entry.detail,
      startMonth: entry.startMonth,
      installments: entry.installments,
      executedInstallments: entry.executedInstallments,
      nextInstallment: Math.min(entry.installments, entry.executedInstallments + 1),
      state: entry.state,
      itemState: item.state,
    })))
    .sort((left, right) => left.detail.localeCompare(right.detail, 'es'))
}

function advanceExtraordinaryInstallments(companyId: string, options: ExtraordinaryOption[]) {
  const executions = new Map(options.map(option => [option.key, option.nextInstallment]))
  const items = readJson<ExpenseItem[]>(expenseItemsKey(companyId), [])
  const next = items.map(item => ({
    ...item,
    extraordinaryHistory: (item.extraordinaryHistory ?? []).map(entry => {
      const nextInstallment = executions.get(`${item.id}:${entry.id}`)
      return nextInstallment === undefined ? entry : { ...entry, executedInstallments: Math.min(entry.installments, nextInstallment) }
    }),
  }))
  localStorage.setItem(expenseItemsKey(companyId), JSON.stringify(next))
}

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

function readDivisionLabels() {
  const source = readJson<Record<string, StructureRow[]>>('saga.property-type-structure', {})
  const entries: Array<[string, string]> = []
  Object.entries(source).forEach(([type, rows]) => (Array.isArray(rows) ? rows : []).forEach(parent => {
    const details = Array.isArray(parent.details) ? parent.details : []
    if (details.length) details.forEach(detail => entries.push([`${type}|${parent.id}|${detail.id}`, `${parent.description} - ${detail.description}`]))
    else entries.push([`${type}|${parent.id}|`, parent.description])
  }))
  return new Map<string, string>(entries)
}

function expenseConcept(item: ExpenseItem, property: ExpenseProperty, section: PropertySection | undefined, division: string, calculationDate: string) {
  const [, month, year] = calculationDate.split('/')
  const monthName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][Number(month) - 1] ?? month
  const text = item.expenseText?.trim() || item.description
  return text
    .replaceAll('{SECCION}', section?.description ?? '')
    .replaceAll('{DIVISION}', division)
    .replaceAll('{MES}', monthName)
    .replaceAll('{ANIO}', year ?? '')
    .replace(/\s+/g, ' ')
    .trim() || `${property.description?.trim() || property.id} - ${item.description}`
}

export function buildGenerationPlan(companyId: string, calculationDate: string, recurrence: ExpenseRecurrence, extraordinarySelections: string | string[] = []): GenerationPlan {
  const type = readCompanyGenerationType()
  const selectedExtraordinaries = new Set(Array.isArray(extraordinarySelections) ? extraordinarySelections : [extraordinarySelections])
  const allProperties = readJson<ExpenseProperty[]>('saga.property-detail', [])
  const expenseItems = readJson<Array<ExpenseItem & { divisionKey?: string; sectionId?: string }>>(`saga.property-expense-items:${companyId}`, [])
    .map(item => ({ ...item, divisionKeys: Array.isArray(item.divisionKeys) ? item.divisionKeys : item.divisionKey ? [item.divisionKey] : [], sectionIds: Array.isArray(item.sectionIds) ? item.sectionIds : item.sectionId ? [item.sectionId] : [] }))
    .filter(item => item.state === 'ACTIVO' && item.recurrence === recurrence && (recurrence === 'NORMAL' || selectedExtraordinaries.has(item.id) || item.extraordinaryHistory?.some(entry => selectedExtraordinaries.has(`${item.id}:${entry.id}`))))
  const sections = readJson<PropertySection[]>('saga.property-sections', defaultSections)
  const divisionLabels = readDivisionLabels()
  const customers = readJson<Customer[]>('saga.customers', [])
  const calculationRules: ExpenseCalculationRule[] = expenseItems.flatMap(item => {
    if (recurrence === 'NORMAL') return [{ item, valueMode: item.valueMode, value: item.value, divisionKeys: item.divisionKeys, sectionIds: item.sectionIds }]
    const history = (item.extraordinaryHistory ?? []).filter(entry => entry.state === 'ACTIVO' && entry.executedInstallments < entry.installments && (selectedExtraordinaries.has(item.id) || selectedExtraordinaries.has(`${item.id}:${entry.id}`)))
    const hasConcurrentPlans = (item.extraordinaryHistory ?? []).filter(entry => entry.state === 'ACTIVO' && entry.executedInstallments < entry.installments).length > 1
    return history.map(entry => ({ item, history: entry, valueMode: hasConcurrentPlans && entry.valueMode ? entry.valueMode : item.valueMode, value: hasConcurrentPlans && entry.valueMode ? entry.value ?? '' : item.value, divisionKeys: hasConcurrentPlans && entry.divisionKeys?.length ? entry.divisionKeys : item.divisionKeys, sectionIds: hasConcurrentPlans && entry.sectionIds?.length ? entry.sectionIds : item.sectionIds }))
  })
  const skippedIndividual = allProperties
    .filter(property => property.state === 'ACTIVO' && property.generationMode === 'INDIVIDUAL')
    .map(property => property.description?.trim() || property.id)
  const properties = allProperties
    .filter(property => property.state === 'ACTIVO' && (property.generationMode ?? 'AUTOMATICA') === 'AUTOMATICA')
  const calculationErrors: string[] = []
  const calculations: PropertyCalculation[] = properties.map(property => {
    const label = property.description?.trim() || property.id
    const applicableRules = calculationRules.filter(rule => rule.sectionIds.includes(property.sectionId ?? '') && rule.divisionKeys.includes(property.divisionKey ?? ''))
    if (!applicableRules.length) calculationErrors.push(`${label}: no tiene rubros ${recurrence === 'NORMAL' ? 'ordinarios' : 'extraordinarios'} activos habilitados para su Sección y División.`)
    let propertyTotal = 0
    const lines: IssuedExpenseLine[] = []
    applicableRules.forEach(rule => {
      const item = rule.item
      const itemDescription = rule.history ? `${item.description} · ${rule.history.detail}` : item.description
      const area = Number(String(property.usableArea ?? '').replace(',', '.'))
      const section = sections.find(row => row.id === property.sectionId && row.state === 'ACTIVO')
      const conceptText = expenseConcept(item, property, section, divisionLabels.get(property.divisionKey ?? '') ?? '', calculationDate)
      if (rule.valueMode === 'FIJO') {
        const fixedValue = Number(rule.value)
        if (!Number.isFinite(fixedValue) || fixedValue < 0) { calculationErrors.push(`${label}: el rubro ${itemDescription} tiene un valor fijo inválido.`); return }
        const lineTotal = amount(fixedValue)
        propertyTotal += lineTotal
        lines.push({ id: crypto.randomUUID(), propertyId: property.id, propertyDescription: label, itemId: item.id, itemDescription, conceptText, valueMode: rule.valueMode, squareMeters: null, quantity: 1, unitPrice: fixedValue, total: lineTotal })
        return
      }
      if (!Number.isFinite(area) || area <= 0) { calculationErrors.push(`${label}: Área Útil inválida para calcular ${itemDescription}.`); return }
      if (rule.valueMode === 'MT2') {
        const squareMeterValue = Number(rule.value)
        if (!Number.isFinite(squareMeterValue) || squareMeterValue < 0) { calculationErrors.push(`${label}: el rubro ${itemDescription} tiene un valor por Mt2 inválido.`); return }
        const lineTotal = amount(area * squareMeterValue)
        propertyTotal += lineTotal
        lines.push({ id: crypto.randomUUID(), propertyId: property.id, propertyDescription: label, itemId: item.id, itemDescription, conceptText, valueMode: rule.valueMode, squareMeters: area, quantity: 1, unitPrice: squareMeterValue, total: lineTotal })
        return
      }
      const calculationRank = dateRank(calculationDate)
      const rate = section?.rates?.find(row => dateRank(row.from) <= calculationRank && (!row.until || dateRank(row.until) >= calculationRank))
      const sectionValue = Number(rate?.value)
      if (!section || !rate || !Number.isFinite(sectionValue) || sectionValue < 0) { calculationErrors.push(`${label}: la sección no tiene un Valor x Mt2 vigente y válido para ${calculationDate}.`); return }
      const lineTotal = amount(area * sectionValue)
      propertyTotal += lineTotal
      lines.push({ id: crypto.randomUUID(), propertyId: property.id, propertyDescription: label, itemId: item.id, itemDescription, conceptText, valueMode: rule.valueMode, squareMeters: area, quantity: 1, unitPrice: sectionValue, total: lineTotal })
    })
    return { property, label, amount: amount(propertyTotal), itemCount: lines.length, lines }
  })
  const missingBilling: string[] = []
  const billedCalculations: BilledPropertyCalculation[] = []
  calculations.forEach(calculation => {
    const property = calculation.property
    const billing = property.billingHistory?.find(item => !item.until)
    const billedClient = billing?.billedToName?.trim() || (billing?.billedTo === 'INQUILINO' ? billing.tenant?.trim() : billing?.owner?.trim())
    if (!billing || !billedClient) { missingBilling.push(property.description?.trim() || property.id); return }
    const customer = customers.find(item => normalizedClient(item.businessName) === normalizedClient(billedClient))
    if (!customer) { calculationErrors.push(`${property.description?.trim() || property.id}: el cliente "${billedClient}" configurado en Se Factura A no existe en Registro Clientes.`); return }
    billedCalculations.push({ ...calculation, billedClient, customer })
  })
  const groups = new Map<string, GenerationUnit>()
  billedCalculations.forEach(calculation => {
    const canonicalClient = calculation.customer?.businessName || calculation.billedClient
    const identification = calculation.customer?.identification?.trim()
    const key = identification ? `cliente:${normalizedClient(identification)}` : `nombre:${normalizedClient(canonicalClient)}`
    const current = groups.get(key)
    if (current) { current.properties.push(calculation.label); current.amount = amount(current.amount + calculation.amount); current.itemCount += calculation.itemCount; current.lines.push(...calculation.lines) }
    else groups.set(key, { key, label: canonicalClient, billedClient: canonicalClient, customerIdentification: identification, properties: [calculation.label], amount: calculation.amount, itemCount: calculation.itemCount, lines: [...calculation.lines] })
  })
  const units = type === 'INMUEBLE'
    ? billedCalculations.map(calculation => ({ key: calculation.property.id, label: calculation.label, billedClient: calculation.customer?.businessName || calculation.billedClient, customerIdentification: calculation.customer?.identification?.trim(), properties: [calculation.label], amount: calculation.amount, itemCount: calculation.itemCount, lines: [...calculation.lines] }))
    : Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'))
  return { type, properties, units, missingBilling, skippedIndividual, calculationErrors: Array.from(new Set(calculationErrors)), totalValue: amount(units.reduce((sum, unit) => sum + unit.amount, 0)) }
}

export function AutomaticExpenseGenerationPage({ screen, recurrence }: { screen: ScreenSpec; recurrence: ExpenseRecurrence }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <AutomaticExpenseGenerationManager key={`${context.data.company.id}:${recurrence}`} screen={screen} context={context.data} recurrence={recurrence} />
}

function AutomaticExpenseGenerationManager({ screen, context, recurrence }: { screen: ScreenSpec; context: Context; recurrence: ExpenseRecurrence }) {
  const key = storageKey(context.company.id, recurrence)
  const recurrenceLabel = recurrence === 'NORMAL' ? 'Ordinarias' : 'Extraordinarias'
  const recurrenceText = recurrenceLabel.toLocaleLowerCase('es')
  const itemRecurrenceText = recurrence === 'NORMAL' ? 'ordinarios' : 'extraordinarios'
  const recurrenceTypeText = recurrence === 'NORMAL' ? 'normal' : 'extraordinaria'
  const [months, setMonths] = useState<string[]>(availableExpenseMonths)
  const [history, setHistory] = useState<GenerationRecord[]>(() => readJson<GenerationRecord[]>(key, []).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)))
  const [extraordinaryOptions, setExtraordinaryOptions] = useState<ExtraordinaryOption[]>(() => recurrence === 'EXTRAORDINARIA' ? readExtraordinaryOptions(context.company.id) : [])
  const [selectedExtraordinaryKeys, setSelectedExtraordinaryKeys] = useState<string[]>([])
  const [extraordinaryHistoryRows, setExtraordinaryHistoryRows] = useState<ExtraordinaryHistoryRow[]>(() => recurrence === 'EXTRAORDINARIA' ? readExtraordinaryHistory(context.company.id) : [])
  const [formOpen, setFormOpen] = useState(false)
  const [month, setMonth] = useState(currentMonth)
  const [expenseDate, setExpenseDate] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [duplicatePending, setDuplicatePending] = useState(false)
  const selectedExtraordinaries = extraordinaryOptions.filter(option => selectedExtraordinaryKeys.includes(option.key))
  const [plan, setPlan] = useState<GenerationPlan>(() => buildGenerationPlan(context.company.id, firstDayOfMonth(currentMonth()), recurrence, []))

  const persistGeneration = () => {
    if (recurrence === 'EXTRAORDINARIA' && !selectedExtraordinaries.length) { setDuplicatePending(false); setError('Selecciona al menos un rubro extraordinario activo con cuotas pendientes.'); return }
    const currentPlan = buildGenerationPlan(context.company.id, expenseDate, recurrence, selectedExtraordinaryKeys)
    if (!currentPlan.properties.length) { setDuplicatePending(false); setError('No existen inmuebles activos habilitados para generación automática.'); return }
    if (currentPlan.missingBilling.length) { setDuplicatePending(false); setError(`Completa el campo Se Factura A vigente en: ${currentPlan.missingBilling.join(', ')}.`); return }
    if (currentPlan.calculationErrors.length) { setDuplicatePending(false); setError(currentPlan.calculationErrors.join(' ')); return }
    const [, issueMonth, issueYear] = expenseDate.split('/')
    const customers = readJson<Customer[]>('saga.customers', [])
    const createdAt = new Date().toISOString()
    const issuedExpenses: IssuedExpenseRecord[] = currentPlan.units.map((unit, index) => {
      const customer = customers.find(item => unit.customerIdentification
        ? normalizedClient(item.identification) === normalizedClient(unit.customerIdentification)
        : normalizedClient(item.businessName) === normalizedClient(unit.billedClient))
      const clientName = customer?.businessName ?? unit.billedClient
      const receiptNumber = nextReceiptNumber(context.company.id, index)
      return {
        id: crypto.randomUUID(),
        companyId: context.company.id,
        month: issueMonth,
        year: issueYear,
        issueDate: expenseDate,
        receiptNumber,
        identification: customer?.identification ?? '',
        businessName: customer?.businessName ?? clientName,
        address: customer?.address ?? '',
        phone: customer?.phone ?? '',
        email: customer?.email ?? '',
        expenseType: recurrence === 'NORMAL' ? 'ORDINARIA' : 'EXTRAORDINARIA',
        generationType: 'AUTOMATICA',
        total: unit.amount,
        pdfFileName: `${receiptNumber}.pdf`,
        createdAt,
        status: 'VIGENTE',
        lines: unit.lines,
      }
    })
    appendIssuedExpenses(context.company.id, issuedExpenses)
    const record: GenerationRecord = { id: crypto.randomUUID(), month, detail: selectedExtraordinaries.map(option => option.detail).join(' · '), installmentNumber: selectedExtraordinaries.length === 1 ? selectedExtraordinaries[0].nextInstallment : undefined, extraordinaryPlanKey: selectedExtraordinaries.length === 1 ? selectedExtraordinaries[0].key : undefined, extraordinaryPlans: selectedExtraordinaries.map(option => ({ key: option.key, detail: option.detail, installmentNumber: option.nextInstallment })), expenseDate, generatedAt: new Date().toISOString(), user: context.actor.name, generationType: currentPlan.type, generatedDocuments: currentPlan.units.length, propertiesProcessed: currentPlan.properties.length, totalValue: currentPlan.totalValue }
    const next = [record, ...history].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    setHistory(next)
    localStorage.setItem(key, JSON.stringify(next))
    if (selectedExtraordinaries.length) {
      advanceExtraordinaryInstallments(context.company.id, selectedExtraordinaries)
      const available = readExtraordinaryOptions(context.company.id)
      setExtraordinaryOptions(available)
      setExtraordinaryHistoryRows(readExtraordinaryHistory(context.company.id))
      setSelectedExtraordinaryKeys([])
    }
    setFormOpen(false); setDuplicatePending(false); setExpenseDate(''); setError('')
    setMessage(selectedExtraordinaries.length
      ? `Se procesaron ${selectedExtraordinaries.length} rubros extraordinarios en ${currentPlan.units.length} expensas por ${displayMoney(currentPlan.totalValue)}.`
      : `Se generaron ${currentPlan.units.length} expensas automáticas ${recurrenceText} de ${month} por ${displayMoney(currentPlan.totalValue)} para ${currentPlan.properties.length} inmuebles.`)
  }

  const requestGeneration = (event: FormEvent) => {
    event.preventDefault()
    if (!validDate(expenseDate)) { setError('La Fecha en Expensas debe tener el formato DD/MM/AAAA y ser una fecha válida.'); return }
    if (recurrence === 'EXTRAORDINARIA' && !months.includes(expenseDate.slice(3))) { setError('La Fecha en Expensas debe pertenecer a un período contable habilitado.'); return }
    if (recurrence === 'EXTRAORDINARIA' && !selectedExtraordinaries.length) { setError('Selecciona al menos un rubro extraordinario activo con cuotas pendientes.'); return }
    const currentPlan = buildGenerationPlan(context.company.id, expenseDate, recurrence, selectedExtraordinaryKeys)
    setPlan(currentPlan)
    if (!currentPlan.properties.length) { setError('No existen inmuebles activos habilitados para generación automática.'); return }
    if (currentPlan.missingBilling.length) { setError(`Completa el campo Se Factura A vigente en: ${currentPlan.missingBilling.join(', ')}.`); return }
    if (currentPlan.calculationErrors.length) { setError(currentPlan.calculationErrors.join(' ')); return }
    const isDuplicate = selectedExtraordinaries.length
      ? selectedExtraordinaries.some(option => history.some(record => record.extraordinaryPlans?.some(planEntry => planEntry.key === option.key && planEntry.installmentNumber === option.nextInstallment) || (record.extraordinaryPlanKey === option.key && record.installmentNumber === option.nextInstallment)))
      : history.some(record => record.month === month)
    if (isDuplicate) { setDuplicatePending(true); return }
    persistGeneration()
  }

  const openForm = () => {
    const availableMonths = availableExpenseMonths()
    setMonths(availableMonths)
    if (!availableMonths.length) {
      setMessage('No existen períodos contables habilitados hasta el mes siguiente a la fecha actual. Los períodos cerrados no pueden ejecutarse.')
      return
    }
    const availableExtraordinary = recurrence === 'EXTRAORDINARIA' ? readExtraordinaryOptions(context.company.id) : []
    if (recurrence === 'EXTRAORDINARIA' && !availableExtraordinary.length) {
      setMessage('No existen detalles extraordinarios activos con cuotas pendientes en la tabla Histórico Extraordinarias de los rubros.')
      return
    }
    const selectedMonth = availableMonths.includes(currentMonth()) ? currentMonth() : availableMonths[0]
    const availableKeys = new Set(availableExtraordinary.map(option => option.key))
    const retainedSelection = selectedExtraordinaryKeys.filter(selectedKey => availableKeys.has(selectedKey))
    if (recurrence === 'EXTRAORDINARIA' && !retainedSelection.length) {
      setMessage('Selecciona al menos un rubro extraordinario pendiente antes de generar.')
      return
    }
    setExtraordinaryOptions(availableExtraordinary)
    setExtraordinaryHistoryRows(readExtraordinaryHistory(context.company.id))
    setPlan(buildGenerationPlan(context.company.id, firstDayOfMonth(selectedMonth), recurrence, retainedSelection))
    setMonth(selectedMonth); setExpenseDate(firstDayOfMonth(selectedMonth)); setError(''); setMessage(''); setDuplicatePending(false); setFormOpen(true)
  }

  return <div className="page screen-page automatic-expense-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div></section>

    {recurrence === 'NORMAL' ? <section className="automatic-expense-action-box"><div><span className="automatic-expense-icon"><CalendarDays /></span><div><strong>Generación mensual de expensas {recurrenceText}</strong><small>Ejecuta el proceso para el mes y la fecha contable seleccionados usando únicamente rubros con recurrencia {recurrenceTypeText}.</small></div></div><button type="button" className="primary-action" onClick={openForm}><Play />Generar Expensas {recurrenceLabel}</button></section> : <section className="automatic-expense-extraordinary-picker"><header><div><span className="automatic-expense-icon"><CalendarDays /></span><div><strong>Generación mensual de expensas extraordinarias</strong><small>Selecciona los rubros activos con cuotas pendientes que se incluirán juntos en cada expensa.</small></div></div><button type="button" className="primary-action" onClick={openForm} disabled={!selectedExtraordinaryKeys.length}><Play />Generar Expensas Extraordinarias</button></header><div className="extraordinary-option-grid">{extraordinaryOptions.map(option => <label key={option.key} className={selectedExtraordinaryKeys.includes(option.key) ? 'selected' : ''}><input type="checkbox" checked={selectedExtraordinaryKeys.includes(option.key)} onChange={event => { setSelectedExtraordinaryKeys(current => event.target.checked ? [...current, option.key] : current.filter(keyValue => keyValue !== option.key)); setMessage(''); setError('') }} /><span><strong>{option.itemDescription}</strong><small>{option.detail}</small><em>Cuota {option.nextInstallment} de {option.installments} · Inicio {option.startMonth}</em></span></label>)}{!extraordinaryOptions.length && <div className="extraordinary-options-empty"><CheckCircle2 /><strong>No existen rubros extraordinarios pendientes</strong><span>Todos los planes activos han completado sus cuotas o no hay rubros extraordinarios configurados.</span></div>}</div></section>}

    {message && <div className="automatic-expense-feedback" role="status"><CheckCircle2 />{message}</div>}

    {recurrence === 'NORMAL' ? <section className="automatic-expense-history"><header><div><h2>Histórico de Generaciones</h2><span>Procesos ejecutados desde el más reciente.</span></div></header><div className="automatic-expense-table"><table><thead><tr><th>Mes Generado</th><th>Fecha Generación</th><th>Tipo de Generación</th><th>Expensas Generadas</th><th>Valor Total</th><th>Usuario</th></tr></thead><tbody>{history.map(record => <tr key={record.id}><td><strong>{record.month}</strong></td><td>{displayGenerationDate(record.generatedAt)}</td><td>{record.generationType==='INMUEBLE'?'Por Inmueble':record.generationType==='CLIENTE'?'Por Cliente':'—'}</td><td>{record.generatedDocuments??'—'}</td><td>{record.totalValue===undefined?'—':displayMoney(record.totalValue)}</td><td>{record.user}</td></tr>)}{!history.length && <tr><td colSpan={6}><div className="automatic-expense-empty"><CalendarDays /><strong>No existen generaciones registradas</strong><span>Los procesos ejecutados aparecerán en esta tabla.</span></div></td></tr>}</tbody></table></div></section> : <section className="automatic-expense-history extraordinary-history"><header><div><h2>Histórico Extraordinarias</h2><span>Planificación y avance de cuotas configuradas en cada rubro.</span></div></header><div className="automatic-expense-table"><table><thead><tr><th>Rubro</th><th>Detalle</th><th>Fecha Inicio</th><th># De Cuotas</th><th>Cuotas Ejecutadas</th><th>Estado</th></tr></thead><tbody>{extraordinaryHistoryRows.map(row => <tr key={row.key}><td><strong>{row.itemDescription}</strong></td><td>{row.detail}</td><td>{row.startMonth}</td><td>{row.installments}</td><td>{row.executedInstallments}</td><td><span className={`status s-${row.state === 'ACTIVO' && row.itemState === 'ACTIVO' ? 'activo' : 'inactivo'}`}><i />{row.state === 'ACTIVO' && row.itemState === 'ACTIVO' ? row.executedInstallments >= row.installments ? 'Completado' : 'Activo' : 'Inactivo'}</span></td></tr>)}{!extraordinaryHistoryRows.length && <tr><td colSpan={6}><div className="automatic-expense-empty"><CalendarDays /><strong>No existen extraordinarias registradas</strong><span>Configura la planificación dentro de un rubro con recurrencia Extraordinaria.</span></div></td></tr>}</tbody></table></div></section>}

    {formOpen && <div className="automatic-expense-backdrop" role="dialog" aria-modal="true" aria-label={`Generar Expensas ${recurrenceLabel}`}>
      <form className={`automatic-expense-modal ${recurrence === 'EXTRAORDINARIA' ? 'extraordinary' : ''}`} onSubmit={requestGeneration}>
        <header><div><span>Nuevo proceso</span><h2>Generar Expensas {recurrenceLabel}</h2><small>{context.company.name}</small></div><button type="button" aria-label="Cerrar" onClick={() => setFormOpen(false)}><X /></button></header>
        <div className="automatic-expense-fields">
          {recurrence === 'NORMAL' && <label><span>Mes <b>Obligatorio</b></span><select value={month} onChange={event => { const selectedMonth = event.target.value; const selectedDate = firstDayOfMonth(selectedMonth); setMonth(selectedMonth); setExpenseDate(selectedDate); setPlan(buildGenerationPlan(context.company.id, selectedDate, recurrence)); setError('') }}>{months.map(option => <option key={option} value={option}>{option}</option>)}</select></label>}
          <label><span>Fecha en Expensas <b>Obligatorio</b></span><input inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={expenseDate} onChange={event => { const selectedDate = event.target.value; setExpenseDate(selectedDate); if(validDate(selectedDate)) setPlan(buildGenerationPlan(context.company.id, selectedDate, recurrence, selectedExtraordinaryKeys)); setError('') }} /></label>
          {selectedExtraordinaries.length > 0 && <div className="extraordinary-selected-summary"><strong>Rubros seleccionados ({selectedExtraordinaries.length})</strong>{selectedExtraordinaries.map(option => <span key={option.key}>{option.itemDescription} · {option.detail} · Cuota {option.nextInstallment} de {option.installments}</span>)}</div>}
          <section className="automatic-expense-plan"><header><div><span>Criterio de agrupación</span><strong>{plan.type==='CLIENTE'?'Generación por Cliente':'Generación por Inmueble'}</strong></div><div><span>Expensas a generar</span><strong>{plan.units.length}</strong></div><div><span>Inmuebles incluidos</span><strong>{plan.properties.length}</strong></div><div><span>Individuales omitidos</span><strong>{plan.skippedIndividual.length}</strong></div><div><span>Valor total</span><strong>{displayMoney(plan.totalValue)}</strong></div></header><div className="automatic-expense-grouping-rule">{plan.type==='CLIENTE'?'Se generará una expensa por cada cliente de “Se Factura A”, consolidando en ella los rubros de todos sus inmuebles.':'Se generará una expensa independiente por cada inmueble, consolidando únicamente los rubros que le corresponden.'}</div>{plan.units.length>0&&<div className="automatic-expense-plan-list">{plan.units.map(unit=><article key={unit.key}><strong>{unit.label}</strong><span>{plan.type==='CLIENTE'?`${unit.properties.length} inmueble${unit.properties.length===1?'':'s'}: ${unit.properties.join(' · ')}`:`Se factura a: ${unit.billedClient}`} · {unit.itemCount} rubros {itemRecurrenceText} · {displayMoney(unit.amount)}</span></article>)}</div>}{plan.skippedIndividual.length>0&&<aside><strong>Omitidos por generación individual:</strong> {plan.skippedIndividual.join(', ')}</aside>}{plan.missingBilling.length>0&&<p><AlertTriangle/>Sin Se Factura A vigente: {plan.missingBilling.join(', ')}</p>}{plan.calculationErrors.length>0&&<p><AlertTriangle/>{plan.calculationErrors.join(' ')}</p>}</section>
          {error && <div className="automatic-expense-error" role="alert"><AlertTriangle />{error}</div>}
        </div>
        <footer><button type="button" className="quiet-button" onClick={() => setFormOpen(false)}>Cancelar</button><button type="submit" className="primary-action"><Play />Generar</button></footer>
      </form>
    </div>}

    {duplicatePending && <div className="automatic-expense-backdrop duplicate" role="alertdialog" aria-modal="true" aria-label="Confirmar nueva generación"><section className="automatic-expense-confirm"><span><AlertTriangle /></span><h2>{selectedExtraordinaries.length ? 'Una cuota ya fue generada' : 'El mes ya fue generado'}</h2><p>{selectedExtraordinaries.length ? <>Una o más cuotas seleccionadas ya constan como generadas. ¿Deseas ejecutar nuevamente el proceso extraordinario?</> : <>Ya existe una generación de expensas para <strong>{month}</strong>. ¿Deseas ejecutar nuevamente el proceso con fecha <strong>{expenseDate}</strong>?</>}</p><div><button type="button" className="quiet-button" onClick={() => setDuplicatePending(false)}>Cancelar</button><button type="button" className="primary-action" onClick={persistGeneration}><Play />Sí, generar nuevamente</button></div></section></div>}
  </div>
}
