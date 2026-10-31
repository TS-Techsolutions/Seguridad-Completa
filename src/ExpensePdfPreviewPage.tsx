import { useEffect } from 'react'
import { Download, FileWarning } from 'lucide-react'
import { ExpenseDocument, type ExpenseDocumentData } from './ExpenseDocument'
import { loadExpenseDesign } from './ExpenseDesignPage'
import { buildGenerationPlan } from './AutomaticExpenseGenerationPage'
import { readIssuedExpenses, type IssuedExpenseRecord } from './expense-records'
import { displayExpenseMonth } from './expense-pdf-preview'
import { moneyToSpanish } from './spanish-money'
import type { Context } from './types'

function displayMoney(value: number) {
  return value.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function displayQuantity(value: number) {
  return value.toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 6 })
}

export function expenseTypeLabel(record: IssuedExpenseRecord) {
  return record.expenseType === 'ORDINARIA' ? 'EXPENSA ORDINARIA' : record.expenseType === 'EXTRAORDINARIA' ? 'EXPENSA EXTRAORDINARIA' : 'EXPENSA DE AGUA'
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ')
}

function legacyOrdinaryLines(record: IssuedExpenseRecord) {
  if (record.expenseType !== 'ORDINARIA') return []
  const plan = buildGenerationPlan(record.companyId, record.issueDate, 'NORMAL')
  if (plan.calculationErrors.length || plan.missingBilling.length) return []
  const matching = plan.units.filter(unit => {
    const sameClient = record.identification
      ? normalize(unit.customerIdentification ?? '') === normalize(record.identification)
      : normalize(unit.billedClient) === normalize(record.businessName)
    return sameClient && Math.abs(unit.amount - record.total) < 0.005
  })
  return matching.length === 1 ? matching[0].lines : []
}

export function ExpensePdfPreviewPage({ context, recordId }: { context: Context; recordId: string }) {
  const record = readIssuedExpenses(context.company.id).find(item => item.id === recordId)
  const design = loadExpenseDesign(context.company)
  useEffect(() => {
    document.title = record ? `${record.receiptNumber} · Vista previa PDF` : 'Expensa no encontrada'
    return () => { document.title = 'SAGA · Centro operativo' }
  }, [record])
  if (!record) return <main className="expense-pdf-not-found"><FileWarning /><h1>No se encontró la expensa</h1><p>El comprobante solicitado ya no está disponible para esta empresa.</p><button type="button" onClick={() => window.close()}>Cerrar pestaña</button></main>

  const data = buildExpenseDocumentData(record)

  return <div className="expense-pdf-preview-page"><header className="expense-pdf-preview-toolbar"><div><strong>Vista previa de {record.receiptNumber}</strong><small>Plantilla activa de {context.company.name} · En la ventana de impresión selecciona “Guardar como PDF”.</small></div><button type="button" onClick={() => window.print()}><Download />Descargar PDF</button></header><main className="expense-pdf-preview-stage"><ExpenseDocument design={design} company={context.company} data={data} className="expense-pdf-document" /></main></div>
}

export function buildExpenseDocumentData(record: IssuedExpenseRecord): ExpenseDocumentData {
  const monthName = displayExpenseMonth(record.month)
  const concept = `${expenseTypeLabel(record).replace('EXPENSA ', '')} - ${monthName} ${record.year}`
  const storedLines = record.lines?.length ? record.lines : legacyOrdinaryLines(record)
  const detailLines = storedLines.length ? storedLines.map(line => {
    const unitPrice = line.valueMode === 'FIJO' ? line.unitPrice : line.unitPrice ?? line.quantity
    return {
      id: line.id,
      concept: line.conceptText || line.itemDescription,
      aliquot: line.valueMode === 'FIJO' || line.squareMeters === null ? '-' : displayQuantity(line.squareMeters),
      quantity: displayQuantity(line.valueMode === 'FIJO' ? line.quantity : 1),
      unitPrice: unitPrice === null ? '-' : displayMoney(unitPrice),
      total: displayMoney(line.total),
    }
  }) : [{ id: record.id, concept, aliquot: '—', quantity: '1,00', unitPrice: displayMoney(record.total), total: displayMoney(record.total) }]
  return {
    receiptNumber: record.receiptNumber,
    documentType: expenseTypeLabel(record),
    issueDate: record.issueDate,
    owner: record.businessName || 'No registrado',
    ownerId: record.identification || 'No registrada',
    address: record.address || 'No registrada',
    phone: record.phone || 'No registrado',
    email: record.email || 'No registrado',
    amountInWords: moneyToSpanish(record.total),
    paymentMethod: 'OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO',
    paymentTerm: '0',
    paymentUnit: 'Día(s)',
    subtotal: displayMoney(record.total),
    discount: '0,00',
    tax: '0,00',
    total: displayMoney(record.total),
    lines: detailLines,
  }
}
