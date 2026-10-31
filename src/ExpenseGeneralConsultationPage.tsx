import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Ban, ChevronRight, FileDown, Mail, ReceiptText, Search } from 'lucide-react'
import { api } from './api'
import { readIssuedExpenses, voidIssuedExpense, type IssuedExpenseRecord } from './expense-records'
import { displayExpenseMonth } from './expense-pdf-preview'
import type { Context, ScreenSpec } from './types'

function displayMoney(value: number) {
  return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function displayStatus(status: IssuedExpenseRecord['status']) {
  if (status === 'ANULADA') return 'Anulada'
  if (status === 'PENDIENTE_COMPLETAR') return 'Pendiente Completar'
  if (status === 'BORRADA') return 'Borrada'
  return 'Generada'
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
    return rows.filter(row => [row.month, displayExpenseMonth(row.month), row.year, row.issueDate, row.receiptNumber, row.identification, row.businessName, row.phone, row.email, row.expenseType, row.generationType, row.total, row.status, displayStatus(row.status)]
      .join(' ').toLocaleLowerCase('es').includes(query))
  }, [rows, search])

  const prepareEmail = (row: IssuedExpenseRecord) => {
    if (!row.email) { setMessage(`El cliente ${row.businessName} no tiene un email registrado.`); return }
    setMessage(`Correo preparado para ${row.businessName} (${row.email}) con el comprobante ${row.receiptNumber}.`)
  }

  const confirmVoid = () => {
    if (!pendingVoid || pendingVoid.status !== 'VIGENTE') return
    setRows(voidIssuedExpense(context.company.id, pendingVoid.id, context.actor.name))
    setMessage(`La expensa ${pendingVoid.receiptNumber} fue anulada correctamente.`)
    setPendingVoid(null)
  }

  return <div className="page screen-page expense-consultation-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header expense-consultation-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div><label className="screen-table-search"><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar en todas las columnas" aria-label="Buscar expensas" /></label></section>
    {message && <div className="expense-consultation-message" role="status">{message}<button type="button" onClick={() => setMessage('')}>Cerrar</button></div>}
    <section className="expense-consultation-table"><table><thead><tr><th>Mes</th><th>Año</th><th>Fecha Emisión</th><th># Comprobante</th><th>Estado</th><th>Identificación</th><th>Razón Social</th><th>Teléfono</th><th>Email</th><th>Tipo Expensa</th><th>Tipo Generación</th><th>Total</th><th>PDF</th><th>Enviar Email</th><th>Anular</th></tr></thead><tbody>
      {filteredRows.map(row => { const available = row.status === 'VIGENTE'; return <tr key={row.id} className={row.status === 'ANULADA' ? 'voided' : row.status === 'BORRADA' ? 'deleted' : row.status === 'PENDIENTE_COMPLETAR' ? 'pending-completion' : undefined}><td>{displayExpenseMonth(row.month)}</td><td>{row.year}</td><td>{row.issueDate}</td><td><strong>{row.receiptNumber}</strong></td><td><span className={`expense-status ${row.status.toLowerCase().replace('_', '-')}`}>{displayStatus(row.status)}</span></td><td>{row.identification || '—'}</td><td>{row.businessName}</td><td>{row.phone || '—'}</td><td>{row.email || '—'}</td><td><span className={`expense-kind ${row.expenseType.toLowerCase()}`}>{row.expenseType === 'ORDINARIA' ? 'Ordinaria' : row.expenseType === 'EXTRAORDINARIA' ? 'Extraordinaria' : 'Agua'}</span></td><td>{row.generationType === 'AUTOMATICA' ? 'Automática' : 'Individual'}</td><td><strong>{displayMoney(row.total)}</strong></td><td>{available ? <a className="expense-consultation-icon pdf" href={`/vista-previa/expensas/${encodeURIComponent(row.id)}`} target="_blank" rel="noreferrer" title={`Abrir vista previa de ${row.pdfFileName}`} aria-label={`Abrir PDF ${row.receiptNumber}`}><FileDown /></a> : <button type="button" className="expense-consultation-icon pdf" title={`PDF no disponible: ${displayStatus(row.status)}`} aria-label={`PDF no disponible ${row.receiptNumber}`} disabled><FileDown /></button>}</td><td><button type="button" className="expense-consultation-icon email" title={available ? 'Enviar por email' : `Envío no disponible: ${displayStatus(row.status)}`} aria-label={`Enviar por email ${row.receiptNumber}`} disabled={!available} onClick={() => prepareEmail(row)}><Mail /></button></td><td><button type="button" className="expense-void-button" disabled={!available} onClick={() => setPendingVoid(row)}><Ban />{row.status === 'ANULADA' ? 'Anulada' : row.status === 'BORRADA' ? 'Borrada' : row.status === 'PENDIENTE_COMPLETAR' ? 'Pendiente' : 'Anular'}</button></td></tr> })}
      {!filteredRows.length && <tr><td colSpan={15}><div className="expense-consultation-empty"><ReceiptText /><strong>{rows.length ? 'No existen coincidencias' : 'No existen expensas registradas'}</strong><span>{rows.length ? 'Prueba con otro criterio de búsqueda.' : 'Las expensas guardadas, generadas, anuladas o borradas aparecerán aquí.'}</span></div></td></tr>}
    </tbody></table></section>
    {pendingVoid && <div className="expense-void-backdrop" role="presentation" onMouseDown={() => setPendingVoid(null)}><section className="expense-void-dialog" role="alertdialog" aria-modal="true" aria-labelledby="void-expense-title" onMouseDown={event => event.stopPropagation()}><div className="expense-void-warning"><AlertTriangle /></div><h2 id="void-expense-title">Anular expensa</h2><p>¿Confirma la anulación de la expensa <strong>{pendingVoid.receiptNumber}</strong> de <strong>{pendingVoid.businessName}</strong>?</p><span>El comprobante permanecerá en el histórico como anulado y no podrá enviarse por correo.</span><div className="expense-void-actions"><button type="button" onClick={() => setPendingVoid(null)}>Cancelar</button><button type="button" className="confirm" onClick={confirmVoid}><Ban />Anular expensa</button></div></section></div>}
  </div>
}
