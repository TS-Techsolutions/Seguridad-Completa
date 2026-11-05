import { useEffect, type CSSProperties } from 'react'
import { Download, FileWarning, Printer } from 'lucide-react'
import { readBankAccounts } from './BankAccountsPage'
import { readAuthorizedBankDeposits } from './bank-deposit-records'
import { loadExpenseDesign } from './ExpenseDesignPage'
import { companySettingsStorageKey, readCompanyIdentity } from './operation-date-rules'
import type { Context } from './types'

type CompanySettings = { logo?: { dataUrl?: string } }
type Account = { Codigo: string; 'Descripción': string }

function money(value: number) {
  return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function readLogo() {
  try { return (JSON.parse(localStorage.getItem(companySettingsStorageKey) ?? '{}') as CompanySettings).logo?.dataUrl ?? '' } catch { return '' }
}

function readAccounts() {
  try {
    const value = JSON.parse(localStorage.getItem('saga.accounting.plan') ?? '[]')
    return Array.isArray(value) ? value as Account[] : []
  } catch { return [] }
}

function displayCreatedAt(value: string) {
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function BankDepositPreviewPage({ context, recordId }: { context: Context; recordId: string }) {
  const record = readAuthorizedBankDeposits(context.company.id).find(row => row.id === recordId)
  const design = loadExpenseDesign(context.company)
  const identity = readCompanyIdentity(context.company)
  const logo = readLogo() || design.logo
  const accounts = readAccounts()
  const bank = record ? readBankAccounts(context.company.id).find(row => row.id === record.bankAccountId) : undefined

  useEffect(() => {
    document.title = record ? `${record.number} · Comprobante de Depósito` : 'Depósito no encontrado'
    return () => { document.title = 'SAGA · Centro operativo' }
  }, [record])

  if (!record) return <main className="deposit-preview-not-found"><FileWarning /><h1>No se encontró el depósito</h1><p>El comprobante solicitado no está disponible para esta compañía.</p><button type="button" onClick={() => window.close()}>Cerrar pestaña</button></main>

  const clients = Array.from(new Set(record.payload.accountingLines.map(line => line.contactName).filter(Boolean)))
  const receiptNumber = record.number.replace(/^DEP-/i, '')
  const style = { '--deposit-accent': design.accent, '--deposit-font': design.fontFamily } as CSSProperties
  const debit = record.payload.accountingLines.reduce((sum, line) => sum + line.debit, 0)
  const credit = record.payload.accountingLines.reduce((sum, line) => sum + line.credit, 0)

  return <div className="deposit-preview-page">
    <header className="deposit-preview-toolbar"><div><strong>Vista previa de {record.number}</strong><small>Comprobante de Depósito · Imprime el documento o guárdalo como PDF.</small></div><div><button type="button" className="secondary" onClick={() => window.print()}><Download />Guardar PDF</button><button type="button" onClick={() => window.print()}><Printer />Imprimir</button></div></header>
    <main className="deposit-preview-stage"><article className="deposit-preview-document" style={style}>
      <header className="deposit-preview-company">
        <div className="deposit-preview-logo">{logo ? <img src={logo} alt="Logotipo de la compañía" /> : <span>LOGO</span>}</div>
        <div className="deposit-preview-company-data">
          {design.companyFields.businessName && <h1>{identity.businessName}</h1>}
          {design.companyFields.ruc && <p>R.U.C.: {identity.ruc || 'No registrado'}</p>}
          {design.companyFields.address && <p>{identity.address || 'Dirección no registrada'}</p>}
          {design.companyFields.phone && <p>Teléfono: {identity.phone || 'No registrado'}</p>}
          {design.companyFields.email && <p>Email: {identity.email || 'No registrado'}</p>}
        </div>
        <div className="deposit-preview-title"><span>COMPROBANTE DE DEPÓSITO</span><strong>{receiptNumber}</strong></div>
      </header>

      <section className="deposit-preview-summary">
        <p><b>Fecha</b><span>{record.date}</span></p>
        <p><b>Cliente</b><span>{clients.join(' · ') || '—'}</span></p>
        <p><b>Valor</b><span>{money(record.total)}</span></p>
        <p><b>Detalle</b><span>{record.detail || '—'}</span></p>
        <p><b>Cuenta Bancaria</b><span>{bank ? `${bank.bank} · ${bank.type === 'AHORRO' ? 'Ahorro' : 'Corriente'} · ${bank.accountNumber}` : '—'}</span></p>
        <p><b># Papeleta</b><span>{record.depositSlip || '—'}</span></p>
      </section>

      <section className="deposit-preview-box"><h2>Contabilidad del Depósito</h2><table><thead><tr><th>Cuenta Contable</th><th>Contacto</th><th>Debe</th><th>Haber</th><th>Descripción</th></tr></thead><tbody>{record.payload.accountingLines.map(line => <tr key={line.id}><td><strong>{line.accountCode}</strong><small>{accounts.find(account => account.Codigo === line.accountCode)?.['Descripción']}</small></td><td>{line.contactName || '—'}</td><td>{line.debit ? money(line.debit) : '—'}</td><td>{line.credit ? money(line.credit) : '—'}</td><td>{line.description}</td></tr>)}</tbody><tfoot><tr><td colSpan={2}>Totales</td><td>{money(debit)}</td><td>{money(credit)}</td><td /></tr></tfoot></table></section>

      <footer className="deposit-preview-signatures">
        <div><span /><b>Ingresado Por</b><strong>{record.user}</strong><small>{displayCreatedAt(record.createdAt)}</small></div>
        <div><span /><b>Revisado Por</b><strong>&nbsp;</strong><small>&nbsp;</small></div>
        <div><span /><b>Gerente General / Presidente</b><strong>&nbsp;</strong><small>&nbsp;</small></div>
      </footer>
    </article></main>
  </div>
}
