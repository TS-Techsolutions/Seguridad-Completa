import { useEffect } from 'react'
import { Printer, FileWarning } from 'lucide-react'
import { ExpenseDocument } from './ExpenseDocument'
import { loadExpenseDesign } from './ExpenseDesignPage'
import { buildExpenseDocumentData } from './ExpensePdfPreviewPage'
import { readPreExpenseBatch } from './pre-expense-records'
import type { Context } from './types'

export function PreExpensePrintPage({ context, batchId, recordId }: { context: Context; batchId: string; recordId?: string }) {
  const batch = readPreExpenseBatch(context.company.id, batchId)
  const design = loadExpenseDesign(context.company)
  const records = batch?.records.filter(record => !recordId || record.id === recordId) ?? []

  useEffect(() => {
    document.title = records.length === 1 ? 'PRE-EXPENSA · Vista previa' : 'PRE-EXPENSAS · Vista conjunta'
    return () => { document.title = 'SAGA · Centro operativo' }
  }, [records.length])

  if (!batch || !records.length) return <main className="expense-pdf-not-found"><FileWarning /><h1>No se encontraron las pre-expensas</h1><p>La generación solicitada ya no está disponible para esta empresa.</p><button type="button" onClick={() => window.close()}>Cerrar pestaña</button></main>

  return <div className="expense-pdf-preview-page pre-expense-print-page">
    <header className="expense-pdf-preview-toolbar"><div><strong>{records.length === 1 ? 'Vista previa de PRE-EXPENSA' : `Vista conjunta de ${records.length} PRE-EXPENSAS`}</strong><small>Una pre-expensa por página · No genera numeración ni movimientos definitivos.</small></div><button type="button" onClick={() => window.print()}><Printer />Imprimir Pre-Expensas</button></header>
    <main className="expense-pdf-preview-stage pre-expense-print-stage">{records.map(record => <section className="pre-expense-print-document" id={`pre-expense-${record.id}`} key={record.id}><ExpenseDocument design={design} company={context.company} data={buildExpenseDocumentData(record)} className="expense-pdf-document" /></section>)}</main>
  </div>
}
