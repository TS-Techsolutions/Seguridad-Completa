import { useEffect,type CSSProperties } from 'react'
import { Download,FileWarning,Printer,X } from 'lucide-react'
import { readBankAccounts } from './BankAccountsPage'
import { readAuthorizedBankEgresses,type EgressPaymentType } from './bank-egress-records'
import { loadExpenseDesign } from './ExpenseDesignPage'
import { companySettingsStorageKey,readCompanyIdentity } from './operation-date-rules'
import { moneyToSpanish } from './spanish-money'
import { formatCheckPlaceDate,loadCheckDesign } from './check-design-records'
import { CheckPrintDocument } from './CheckPrintDocument'
import type { Context } from './types'

type CompanySettings={logo?:{dataUrl?:string}}
type Account={Codigo:string;'Descripción':string}
const typeLabels:Record<EgressPaymentType,string>={EMPLEADOS:'Empleados',CAJA_CHICA:'Caja Chica',DEVOLUCION_CLIENTE:'Devolución Cliente',PROVEEDORES:'Proveedores'}
function money(value:number){return value.toLocaleString('es-EC',{style:'currency',currency:'USD',minimumFractionDigits:2})}
function readLogo(){try{return(JSON.parse(localStorage.getItem(companySettingsStorageKey)??'{}') as CompanySettings).logo?.dataUrl??''}catch{return''}}
function readAccounts(){try{const value=JSON.parse(localStorage.getItem('saga.accounting.plan')??'[]');return Array.isArray(value)?value as Account[]:[]}catch{return[]}}
function createdAt(value:string){return new Intl.DateTimeFormat('es-EC',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}

export function BankEgressPreviewPage({context,recordId}:{context:Context;recordId:string}){
  const record=readAuthorizedBankEgresses(context.company.id).find(row=>row.id===recordId),design=loadExpenseDesign(context.company),identity=readCompanyIdentity(context.company),logo=readLogo()||design.logo,accounts=readAccounts()
  useEffect(()=>{document.title=record?`${record.number} · Comprobante de Egreso`:'Egreso no encontrado';return()=>{document.title='SAGA · Centro operativo'}},[record])
  if(!record)return<PreviewNotFound label="egreso"/>
  const bank=readBankAccounts(context.company.id).find(row=>row.id===record.bankAccountId),debit=record.payload.accountingLines.reduce((sum,row)=>sum+row.debit,0),credit=record.payload.accountingLines.reduce((sum,row)=>sum+row.credit,0),style={'--deposit-accent':design.accent,'--deposit-font':design.fontFamily} as CSSProperties
  return<div className="deposit-preview-page egress-preview-page"><header className="deposit-preview-toolbar"><div><strong>Vista previa de {record.number}</strong><small>Compra – {record.paymentType?typeLabels[record.paymentType]:'Egreso'} · Imprime el documento o guárdalo como PDF.</small></div><div><button type="button" className="secondary" onClick={()=>window.print()}><Download/>Guardar PDF</button><button type="button" onClick={()=>window.print()}><Printer/>Imprimir</button></div></header><main className="deposit-preview-stage"><article className="deposit-preview-document" style={style}>
    <header className="deposit-preview-company"><div className="deposit-preview-logo">{logo?<img src={logo} alt="Logotipo de la compañía"/>:<span>LOGO</span>}</div><div className="deposit-preview-company-data">{design.companyFields.businessName&&<h1>{identity.businessName}</h1>}{design.companyFields.ruc&&<p>R.U.C.: {identity.ruc||'No registrado'}</p>}{design.companyFields.address&&<p>{identity.address||'Dirección no registrada'}</p>}{design.companyFields.phone&&<p>Teléfono: {identity.phone||'No registrado'}</p>}{design.companyFields.email&&<p>Email: {identity.email||'No registrado'}</p>}</div><div className="deposit-preview-title"><span>COMPRA – {record.paymentType?typeLabels[record.paymentType].toLocaleUpperCase('es'):'EGRESO'}</span><strong>{record.number}</strong></div></header>
    <section className="deposit-preview-summary"><p><b>Fecha</b><span>{record.issueDate}</span></p><p><b>Beneficiario</b><span>{record.beneficiary}</span></p><p><b>Valor</b><span>{money(record.total)}</span></p><p><b>Detalle</b><span>{record.description}</span></p><p><b>Cuenta Bancaria</b><span>{bank?`${bank.bank} · ${bank.accountNumber}`:'—'}</span></p><p><b># Documento</b><span>{record.documentNumber}</span></p></section>
    <section className="deposit-preview-box"><h2>Contabilidad del Egreso</h2><table><thead><tr><th>Cuenta Contable</th><th>Contacto</th><th>Debe</th><th>Haber</th><th>Descripción</th></tr></thead><tbody>{record.payload.accountingLines.map(row=><tr key={row.id}><td><strong>{row.accountCode}</strong><small>{accounts.find(account=>account.Codigo===row.accountCode)?.['Descripción']}</small></td><td>{row.contactName||'—'}</td><td>{row.debit?money(row.debit):'—'}</td><td>{row.credit?money(row.credit):'—'}</td><td>{row.description}</td></tr>)}</tbody><tfoot><tr><td colSpan={2}>Totales</td><td>{money(debit)}</td><td>{money(credit)}</td><td/></tr></tfoot></table></section>
    <footer className="deposit-preview-signatures"><div><span/><b>Ingresado Por</b><strong>{record.user}</strong><small>{createdAt(record.generatedAt||record.createdAt)}</small></div><div><span/><b>Revisado Por</b><strong>&nbsp;</strong><small>&nbsp;</small></div><div><span/><b>Gerente General / Presidente</b><strong>&nbsp;</strong><small>&nbsp;</small></div></footer>
  </article></main></div>
}

export function ChequePrintPreviewPage({context,recordId}:{context:Context;recordId:string}){
  const record=readAuthorizedBankEgresses(context.company.id).find(row=>row.id===recordId)
  useEffect(()=>{document.title=record?`Cheque ${record.documentNumber}`:'Cheque no encontrado';const automaticPrint=record&&new URLSearchParams(window.location.search).get('print')==='1';const timer=automaticPrint?window.setTimeout(()=>window.print(),350):undefined;return()=>{if(timer)window.clearTimeout(timer);document.title='SAGA · Centro operativo'}},[record])
  if(!record)return<PreviewNotFound label="cheque"/>
  const bank=readBankAccounts(context.company.id).find(row=>row.id===record.bankAccountId),design=loadCheckDesign(context.company.id,record.bankAccountId),data={placeDate:formatCheckPlaceDate(design.city,record.issueDate),payee:record.beneficiary,amountNumber:money(record.total),amountWords:`*** ${moneyToSpanish(record.total)} ***`,detail:record.description}
  return<div className="cheque-preview-page"><header><div><strong>Vista previa del Cheque {record.documentNumber}</strong><small>{bank?`${bank.bank} · Cuenta ${bank.accountNumber}`:'Cuenta bancaria no disponible'} · Imprime al 100%, sin ajustar al papel.</small></div><div><button type="button" className="secondary" onClick={()=>window.close()}><X/>Cerrar</button><button type="button" onClick={()=>window.print()}><Printer/>Imprimir Cheque</button></div></header><main><CheckPrintDocument design={design} data={data}/></main></div>
}

function PreviewNotFound({label}:{label:string}){return<main className="deposit-preview-not-found"><FileWarning/><h1>No se encontró el {label}</h1><p>El documento solicitado no está disponible para esta compañía.</p><button type="button" onClick={()=>window.close()}>Cerrar pestaña</button></main>}
