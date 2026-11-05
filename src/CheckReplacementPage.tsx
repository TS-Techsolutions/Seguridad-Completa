import { useMemo,useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check,CheckCircle2,ChevronRight,Printer,RefreshCw,Search,ShieldAlert,WalletCards } from 'lucide-react'
import { api } from './api'
import { readBankAccounts,type BankAccountRecord } from './BankAccountsPage'
import { readAuthorizedBankEgresses,saveAuthorizedBankEgresses } from './bank-egress-records'
import { nextReplacementCheckNumber,readCheckReplacements,saveCheckReplacements } from './check-replacement-records'
import { SearchableDatalistInput } from './SearchableDatalistInput'
import type { Context,ScreenSpec } from './types'

function money(value:number){return value.toLocaleString('es-EC',{style:'currency',currency:'USD',minimumFractionDigits:2})}
function bankLabel(row:BankAccountRecord){return`${row.bank} · ${row.type==='AHORRO'?'Ahorro':'Corriente'} · ${row.accountNumber}`}
function normalize(value:string){return value.trim().toLocaleUpperCase('es')}

export function CheckReplacementPage({screen}:{screen:ScreenSpec}){
  const context=useQuery({queryKey:['context'],queryFn:api.context})
  if(!context.data)return null
  return <CheckReplacementManager key={context.data.company.id} screen={screen} context={context.data}/>
}

function CheckReplacementManager({screen,context}:{screen:ScreenSpec;context:Context}){
  const companyId=context.company.id
  const banks=useMemo(()=>readBankAccounts(companyId).filter(row=>row.state==='ACTIVA'),[companyId])
  const [egresses,setEgresses]=useState(()=>readAuthorizedBankEgresses(companyId))
  const [bankInput,setBankInput]=useState(''),[bankAccountId,setBankAccountId]=useState(''),[checkNumber,setCheckNumber]=useState('')
  const [message,setMessage]=useState(''),[error,setError]=useState(''),[printPrompt,setPrintPrompt]=useState<{egressId:string;print:boolean}|null>(null)
  const eligible=egresses.filter(row=>row.status==='GENERADO'&&row.paymentMethod==='CHEQUE'&&row.bankAccountId===bankAccountId)
  const selected=eligible.find(row=>normalize(row.documentNumber)===normalize(checkNumber))
  const nextCheck=nextReplacementCheckNumber(companyId,bankAccountId)
  const selectBank=(value:string)=>{const bank=banks.find(row=>bankLabel(row)===value);setBankInput(value);setBankAccountId(bank?.id??'');setCheckNumber('');setError('');setMessage('')}
  const reset=()=>{setBankInput('');setBankAccountId('');setCheckNumber('');setError('');setMessage('')}
  const generate=()=>{
    setError('');setMessage('')
    const latest=readAuthorizedBankEgresses(companyId),source=latest.find(row=>row.id===selected?.id)
    if(!bankAccountId){setError('Selecciona una Cuenta Bancaria activa.');return}
    if(!checkNumber.trim()){setError('Ingresa el # Cheque que deseas reemplazar.');return}
    if(!source||source.status!=='GENERADO'||source.paymentMethod!=='CHEQUE'||source.bankAccountId!==bankAccountId||normalize(source.documentNumber)!==normalize(checkNumber)){setError('El cheque no está disponible para cambio. Verifica la cuenta y el número; pudo haber sido sustituido o anulado previamente.');return}
    const replacementId=crypto.randomUUID(),stamp=new Date().toISOString(),newNumber=nextReplacementCheckNumber(companyId,bankAccountId)
    saveCheckReplacements(companyId,[{id:replacementId,companyId,egressId:source.id,bankAccountId,oldCheckNumber:source.documentNumber,newCheckNumber:newNumber,beneficiary:source.beneficiary,amount:source.total,issueDate:source.issueDate,createdAt:stamp,user:context.actor.name},...readCheckReplacements(companyId)])
    const updated=latest.map(row=>row.id===source.id?{...row,documentNumber:newNumber,checkHistory:[...(row.checkHistory??[]),{number:source.documentNumber,status:'SUSTITUIDO' as const,replacedAt:stamp,replacementId}]}:row)
    saveAuthorizedBankEgresses(companyId,updated);setEgresses(updated);setMessage(`El cheque ${source.documentNumber} fue sustituido por ${newNumber}. No se generó ningún asiento contable.`);setPrintPrompt({egressId:source.id,print:false})
  }
  return <div className="page screen-page check-replacement-page"><div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Bancos</b></div><h1>{screen.titulo_original}</h1></div><button type="button" className="primary-action" onClick={reset}><RefreshCw/>Nuevo Cambio de Cheque</button></section>
    {message&&<div className="bank-egress-feedback success"><CheckCircle2/>{message}</div>}{error&&<div className="bank-egress-feedback error" role="alert"><ShieldAlert/>{error}</div>}
    <section className="check-replacement-card"><header><div><WalletCards/><span><h2>Cheque a reemplazar</h2><p>Busca el cheque emitido por cuenta bancaria y número.</p></span></div></header><div className="check-replacement-search"><label className="check-bank-field"><span>Cuenta Bancaria</span><SearchableDatalistInput list="replacement-bank-options" value={bankInput} onChange={event=>selectBank(event.target.value)} onClear={()=>selectBank('')} clearLabel="Borrar cuenta bancaria" placeholder="Escribe para filtrar las cuentas"/><datalist id="replacement-bank-options">{banks.map(row=><option key={row.id} value={bankLabel(row)}/>)}</datalist></label><label><span># Cheque</span><div className="check-number-input"><Search/><input value={checkNumber} disabled={!bankAccountId} onFocus={event=>event.currentTarget.select()} onChange={event=>{setCheckNumber(event.target.value);setError('');setMessage('')}} placeholder="Ingresa el número emitido"/></div></label></div>
      <div className="check-replacement-result"><table><thead><tr><th>Beneficiario</th><th>Fecha Emisión</th><th>Valor</th><th>Nuevo Cheque</th></tr></thead><tbody>{selected?<tr><td><strong>{selected.beneficiary}</strong><small>{selected.number}</small></td><td>{selected.issueDate}</td><td>{money(selected.total)}</td><td><b>{nextCheck}</b></td></tr>:<tr><td colSpan={4}><div className="check-replacement-empty"><WalletCards/><strong>{bankAccountId&&checkNumber?'Cheque no encontrado':'Selecciona la cuenta e ingresa el cheque'}</strong><span>La información del cheque y su próximo número aparecerán aquí.</span></div></td></tr>}</tbody></table></div>
      <footer><span>El cambio conserva el mismo egreso, beneficiario y valor; no genera contabilidad.</span><button type="button" className="primary-action" disabled={!selected} onClick={generate}><Check/>Generar Cambio</button></footer>
    </section>
    {printPrompt&&<div className="egress-cheque-backdrop" role="dialog" aria-modal="true"><section><Printer/><h2>¿Desea imprimir el nuevo cheque?</h2><p>Por defecto no se imprimirá. Si seleccionas Sí, se abrirá la vista del nuevo cheque en una pestaña independiente.</p><button type="button" role="switch" aria-checked={printPrompt.print} className={`egress-toggle ${printPrompt.print?'active':''}`} onClick={()=>setPrintPrompt(current=>current?{...current,print:!current.print}:null)}><i/><b>{printPrompt.print?'Sí':'No'}</b></button><footer><button type="button" className="primary-action" onClick={()=>{if(printPrompt.print)window.open(`/vista-previa/cheques/${encodeURIComponent(printPrompt.egressId)}`,'_blank','noopener,noreferrer');setPrintPrompt(null);setBankInput('');setBankAccountId('');setCheckNumber('')}}><Check/>Continuar</button></footer></section></div>}
  </div>
}
