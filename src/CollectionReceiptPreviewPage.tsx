import { useEffect, type CSSProperties } from 'react'
import { Download, FileWarning, Printer } from 'lucide-react'
import { readAuthorizedCollections } from './collection-records'
import { loadExpenseDesign } from './ExpenseDesignPage'
import { companySettingsStorageKey, readCompanyIdentity } from './operation-date-rules'
import type { Context } from './types'

type CompanySettings = { logo?: { dataUrl?: string } }
type Account = { Codigo: string; 'Descripción': string }

const paymentLabels = {
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
  TRANSFERENCIA: 'Transferencia',
  DEPOSITO: 'Depósito',
  TARJETA_CREDITO: 'Tarjeta de Crédito',
} as const

function money(value: number) {
  return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function readLogo() {
  try {
    const settings = JSON.parse(localStorage.getItem(companySettingsStorageKey) ?? '{}') as CompanySettings
    return settings.logo?.dataUrl ?? ''
  } catch {
    return ''
  }
}

function readAccounts() {
  try {
    const value = JSON.parse(localStorage.getItem('saga.accounting.plan') ?? '[]')
    return Array.isArray(value) ? value as Account[] : []
  } catch {
    return []
  }
}

function paymentDetail(method: ReturnType<typeof readAuthorizedCollections>[number]['payload']['paymentMethods'][number]) {
  if (method.type === 'CHEQUE') return method.holder || 'Cheque recibido'
  if (method.type === 'TARJETA_CREDITO') return method.cardType === 'DEBITO' ? 'Tarjeta de débito' : 'Tarjeta de crédito'
  return method.detail || '—'
}

function paymentDocument(method: ReturnType<typeof readAuthorizedCollections>[number]['payload']['paymentMethods'][number]) {
  if (method.type === 'CHEQUE') return method.checkNumber || '—'
  if (method.type === 'TRANSFERENCIA') return method.transactionNumber || '—'
  if (method.type === 'DEPOSITO') return method.depositSlip || '—'
  if (method.type === 'TARJETA_CREDITO') return method.voucherNumber || '—'
  return '—'
}

function displayCreatedAt(value: string) {
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function CollectionReceiptPreviewPage({ context, recordId }: { context: Context; recordId: string }) {
  const record = readAuthorizedCollections(context.company.id).find(item => item.id === recordId)
  const design = loadExpenseDesign(context.company)
  const identity = readCompanyIdentity(context.company)
  const logo = readLogo() || design.logo
  const accounts = readAccounts()

  useEffect(() => {
    document.title = record ? `${record.number} · Comprobante de Recaudación` : 'Recaudación no encontrada'
    return () => { document.title = 'SAGA · Centro operativo' }
  }, [record])

  if (!record) return <main className="collection-receipt-not-found"><FileWarning /><h1>No se encontró la recaudación</h1><p>El comprobante solicitado no está disponible para esta compañía.</p><button type="button" onClick={() => window.close()}>Cerrar pestaña</button></main>

  const methods = record.payload.paymentMethods.filter(method => method.saved && method.type)
  const methodTotals = Object.entries(paymentLabels).map(([type, label]) => ({
    type,
    label,
    value: methods.filter(method => method.type === type).reduce((sum, method) => sum + Number(method.value || 0), 0),
  }))
  const values = record.payload.receiptValues ?? []
  const style = { '--receipt-accent': design.accent, '--receipt-font': design.fontFamily } as CSSProperties
  const receiptNumber = record.number.replace(/^REC-/i, '')

  return <div className="collection-receipt-preview-page">
    <header className="collection-receipt-toolbar"><div><strong>Vista previa de {record.number}</strong><small>Comprobante de Recaudación · Imprime el documento o guárdalo como PDF.</small></div><div className="collection-receipt-toolbar-actions"><button type="button" className="secondary" onClick={() => window.print()}><Download />Guardar PDF</button><button type="button" onClick={() => window.print()}><Printer />Imprimir</button></div></header>
    <main className="collection-receipt-stage"><article className="collection-receipt-document" style={style}>
      <header className="collection-receipt-company">
        <div className="collection-receipt-logo">{logo ? <img src={logo} alt="Logotipo de la compañía" /> : <span>LOGO</span>}</div>
        <div className="collection-receipt-company-data">
          {design.companyFields.businessName && <h1>{identity.businessName}</h1>}
          {design.companyFields.ruc && <p>R.U.C.: {identity.ruc || 'No registrado'}</p>}
          {design.companyFields.address && <p>{identity.address || 'Dirección no registrada'}</p>}
          {design.companyFields.phone && <p>Teléfono: {identity.phone || 'No registrado'}</p>}
          {design.companyFields.email && <p>Email: {identity.email || 'No registrado'}</p>}
        </div>
        <div className="collection-receipt-title"><span>COMPROBANTE DE RECAUDACIÓN</span><strong>{receiptNumber}</strong></div>
      </header>

      <section className="collection-receipt-summary">
        <div className="collection-receipt-main-data">
          <p><b>Fecha</b><span>{record.issueDate}</span></p>
          <p><b>Cliente</b><span>{record.customerName}</span></p>
          <p><b>Valor Recibido</b><span>{money(record.total)}</span></p>
          <p><b>Detalle</b><span>{record.payload.detail || '—'}</span></p>
        </div>
        <aside className="collection-receipt-method-summary"><h2>Métodos de Pago</h2>{methodTotals.map(method => <p key={method.type}><span>{method.label}</span><b>{money(method.value)}</b></p>)}<footer><span>Total</span><strong>{money(methodTotals.reduce((sum, method) => sum + method.value, 0))}</strong></footer></aside>
      </section>

      <section className="collection-receipt-box"><h2>Valores a Cancelar</h2><table><thead><tr><th># Documento</th><th>Detalle</th><th>Valor</th></tr></thead><tbody>{values.map(value => <tr key={`${value.kind}-${value.id}`}><td>{value.document}</td><td>{value.detail}</td><td>{money(value.value)}</td></tr>)}{!values.length && <tr><td colSpan={3}>Sin valores registrados</td></tr>}</tbody><tfoot><tr><td colSpan={2}>Total</td><td>{money(values.reduce((sum, value) => sum + value.value, 0))}</td></tr></tfoot></table></section>

      <section className="collection-receipt-box"><h2>Detalle de Métodos de Pago</h2><table><thead><tr><th>Tipo</th><th>Detalle</th><th>Banco</th><th># Cuenta</th><th>Cheque/Documento</th><th>Valor</th></tr></thead><tbody>{methods.map(method => <tr key={method.id}><td>{method.type ? paymentLabels[method.type] : '—'}</td><td>{paymentDetail(method)}</td><td>{method.bank || '—'}</td><td>{method.accountNumber || (method.type === 'TARJETA_CREDITO' ? method.cardNumber : '') || '—'}</td><td>{paymentDocument(method)}</td><td>{money(Number(method.value || 0))}</td></tr>)}</tbody><tfoot><tr><td colSpan={5}>Total</td><td>{money(methods.reduce((sum, method) => sum + Number(method.value || 0), 0))}</td></tr></tfoot></table></section>

      <section className="collection-receipt-box"><h2>Contabilidad de la Recaudación</h2><table><thead><tr><th>Cuenta Contable</th><th>Debe</th><th>Haber</th><th>Descripción</th></tr></thead><tbody>{record.payload.accountingLines.map(line => <tr key={line.id}><td><strong>{line.accountCode}</strong><small>{accounts.find(account => account.Codigo === line.accountCode)?.['Descripción']}</small></td><td>{line.debit ? money(line.debit) : '—'}</td><td>{line.credit ? money(line.credit) : '—'}</td><td>{line.description}</td></tr>)}</tbody><tfoot><tr><td>Totales</td><td>{money(record.payload.accountingLines.reduce((sum, line) => sum + line.debit, 0))}</td><td>{money(record.payload.accountingLines.reduce((sum, line) => sum + line.credit, 0))}</td><td /></tr></tfoot></table></section>

      <footer className="collection-receipt-signatures">
        <div><span /><b>Elaborado Por</b><strong>{record.user}</strong><small>{displayCreatedAt(record.createdAt)}</small></div>
        <div><span /><b>Revisado Por</b><strong>&nbsp;</strong><small>&nbsp;</small></div>
        <div><span /><b>Recibí Conforme</b><strong>{record.customerName}</strong><small>&nbsp;</small></div>
      </footer>
    </article></main>
  </div>
}
