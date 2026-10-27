import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Ban, ChevronRight, FileDown, Mail, ReceiptText, Search } from 'lucide-react'
import { api } from './api'
import { readIssuedExpenses, voidIssuedExpense, type IssuedExpenseRecord } from './expense-records'
import type { Context, ScreenSpec } from './types'

function displayMoney(value: number) {
  return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function ascii(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '')
}

function pdfText(value: string) {
  return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function createExpensePdf(record: IssuedExpenseRecord, company: Context['company']) {
  const lines = [
    company.name,
    record.expenseType === 'ORDINARIA' ? 'EXPENSA ORDINARIA' : 'EXPENSA EXTRAORDINARIA',
    `Comprobante: ${record.receiptNumber}`,
    `Fecha de emision: ${record.issueDate}`,
    `Cliente: ${record.businessName}`,
    `Identificacion: ${record.identification || 'No registrada'}`,
    `Telefono: ${record.phone || 'No registrado'}`,
    `Email: ${record.email || 'No registrado'}`,
    `Tipo de generacion: ${record.generationType === 'AUTOMATICA' ? 'Automatica' : 'Individual'}`,
    `Total: ${displayMoney(record.total)}`,
  ]
  const content = `BT\n/F1 12 Tf\n50 745 Td\n${lines.map((line, index) => `${index ? '0 -24 Td\n' : ''}(${pdfText(line)}) Tj`).join('\n')}\nET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ]
  let source = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets.push(source.length); source += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xrefOffset = source.length
  source += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  const url = URL.createObjectURL(new Blob([source], { type: 'application/pdf' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = record.pdfFileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ExpenseGeneralConsultationPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <ExpenseGeneralConsultationManager key={context.data.company.id} screen={screen} context={context.data} />
}

function ExpenseGeneralConsultationManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const [rows, setRows] = useState<IssuedExpenseRecord[]>(() => readIssuedExpenses(context.company.id))
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [pendingVoid, setPendingVoid] = useState<IssuedExpenseRecord | null>(null)
  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    if (!query) return rows
    return rows.filter(row => [row.month, row.year, row.issueDate, row.receiptNumber, row.identification, row.businessName, row.phone, row.email, row.expenseType, row.generationType, row.total, row.status]
      .join(' ').toLocaleLowerCase('es').includes(query))
  }, [rows, search])

  const prepareEmail = (row: IssuedExpenseRecord) => {
    if (!row.email) { setMessage(`El cliente ${row.businessName} no tiene un email registrado.`); return }
    setMessage(`Correo preparado para ${row.businessName} (${row.email}) con el comprobante ${row.receiptNumber}.`)
  }

  const confirmVoid = () => {
    if (!pendingVoid || pendingVoid.status === 'ANULADA') return
    setRows(voidIssuedExpense(context.company.id, pendingVoid.id, context.actor.name))
    setMessage(`La expensa ${pendingVoid.receiptNumber} fue anulada correctamente.`)
    setPendingVoid(null)
  }

  return <div className="page screen-page expense-consultation-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header expense-consultation-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div><label className="screen-table-search"><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar en todas las columnas" aria-label="Buscar expensas" /></label></section>
    {message && <div className="expense-consultation-message" role="status">{message}<button type="button" onClick={() => setMessage('')}>Cerrar</button></div>}
    <section className="expense-consultation-table"><table><thead><tr><th>Mes</th><th>Año</th><th>Fecha Emisión</th><th># Comprobante</th><th>Estado</th><th>Identificación</th><th>Razón Social</th><th>Teléfono</th><th>Email</th><th>Tipo Expensa</th><th>Tipo Generación</th><th>Total</th><th>PDF</th><th>Enviar Email</th><th>Anular</th></tr></thead><tbody>
      {filteredRows.map(row => <tr key={row.id} className={row.status === 'ANULADA' ? 'voided' : undefined}><td>{row.month}</td><td>{row.year}</td><td>{row.issueDate}</td><td><strong>{row.receiptNumber}</strong></td><td><span className={`expense-status ${row.status.toLowerCase()}`}>{row.status === 'ANULADA' ? 'Anulada' : 'Generada'}</span></td><td>{row.identification || '—'}</td><td>{row.businessName}</td><td>{row.phone || '—'}</td><td>{row.email || '—'}</td><td><span className={`expense-kind ${row.expenseType.toLowerCase()}`}>{row.expenseType === 'ORDINARIA' ? 'Ordinaria' : 'Extraordinaria'}</span></td><td>{row.generationType === 'AUTOMATICA' ? 'Automática' : 'Individual'}</td><td><strong>{displayMoney(row.total)}</strong></td><td><button type="button" className="expense-consultation-icon pdf" title={`Descargar ${row.pdfFileName}`} aria-label={`Descargar PDF ${row.receiptNumber}`} onClick={() => createExpensePdf(row, context.company)}><FileDown /></button></td><td><button type="button" className="expense-consultation-icon email" title={row.status === 'ANULADA' ? 'La expensa está anulada' : 'Enviar por email'} aria-label={`Enviar por email ${row.receiptNumber}`} disabled={row.status === 'ANULADA'} onClick={() => prepareEmail(row)}><Mail /></button></td><td><button type="button" className="expense-void-button" disabled={row.status === 'ANULADA'} onClick={() => setPendingVoid(row)}><Ban />{row.status === 'ANULADA' ? 'Anulada' : 'Anular'}</button></td></tr>)}
      {!filteredRows.length && <tr><td colSpan={15}><div className="expense-consultation-empty"><ReceiptText /><strong>{rows.length ? 'No existen coincidencias' : 'No existen expensas generadas'}</strong><span>{rows.length ? 'Prueba con otro criterio de búsqueda.' : 'Las expensas ordinarias y extraordinarias aparecerán aquí después de generarse.'}</span></div></td></tr>}
    </tbody></table></section>
    {pendingVoid && <div className="expense-void-backdrop" role="presentation" onMouseDown={() => setPendingVoid(null)}><section className="expense-void-dialog" role="alertdialog" aria-modal="true" aria-labelledby="void-expense-title" onMouseDown={event => event.stopPropagation()}><div className="expense-void-warning"><AlertTriangle /></div><h2 id="void-expense-title">Anular expensa</h2><p>¿Confirma la anulación de la expensa <strong>{pendingVoid.receiptNumber}</strong> de <strong>{pendingVoid.businessName}</strong>?</p><span>El comprobante permanecerá en el histórico como anulado y no podrá enviarse por correo.</span><div className="expense-void-actions"><button type="button" onClick={() => setPendingVoid(null)}>Cancelar</button><button type="button" className="confirm" onClick={confirmVoid}><Ban />Anular expensa</button></div></section></div>}
  </div>
}
