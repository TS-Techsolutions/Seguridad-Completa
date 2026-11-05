import { useEffect } from 'react'
import { Printer, FileWarning } from 'lucide-react'
import { ExpenseDocument } from './ExpenseDocument'
import { loadExpenseDesign } from './ExpenseDesignPage'
import { buildExpenseDocumentData } from './ExpensePdfPreviewPage'
import { readPreExpenseBatch, type PreBillingDocument } from './pre-expense-records'
import type { Context } from './types'

export function PreExpensePrintPage({ context, batchId, recordId, documentMode = 'EXPENSE' }: { context: Context; batchId: string; recordId?: string; documentMode?: PreBillingDocument }) {
  const batch = readPreExpenseBatch(context.company.id, batchId, documentMode)
  const design = loadExpenseDesign(context.company)
  const records = batch?.records.filter(record => !recordId || record.id === recordId) ?? []
  const isInvoice = documentMode === 'INVOICE'
  const plural = isInvoice ? 'PRE-FACTURAS' : 'PRE-EXPENSAS'
  const singular = isInvoice ? 'PRE-FACTURA' : 'PRE-EXPENSA'

  useEffect(() => {
    document.title = records.length === 1 ? `${singular} · Vista previa` : `${plural} · Vista conjunta`
    return () => { document.title = 'SAGA · Centro operativo' }
  }, [plural, records.length, singular])

  if (!batch || !records.length) return <main className="expense-pdf-not-found"><FileWarning /><h1>No se encontraron las {isInvoice ? 'pre-facturas' : 'pre-expensas'}</h1><p>La generación solicitada ya no está disponible para esta empresa.</p><button type="button" onClick={() => window.close()}>Cerrar pestaña</button></main>

  return <div className="expense-pdf-preview-page pre-expense-print-page">
    <header className="expense-pdf-preview-toolbar"><div><strong>{records.length === 1 ? `Vista previa de ${singular}` : `Vista conjunta de ${records.length} ${plural}`}</strong><small>Una {isInvoice ? 'pre-factura' : 'pre-expensa'} por página · No genera numeración ni movimientos definitivos.</small></div><button type="button" onClick={() => window.print()}><Printer />Imprimir {isInvoice ? 'Pre-Facturas' : 'Pre-Expensas'}</button></header>
    <main className="expense-pdf-preview-stage pre-expense-print-stage">{records.map(record => <section className="pre-expense-print-document" id={`pre-expense-${record.id}`} key={record.id}><ExpenseDocument design={design} company={context.company} data={buildExpenseDocumentData(record)} className="expense-pdf-document" /></section>)}</main>
  </div>
}
