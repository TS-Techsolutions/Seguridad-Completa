import { useMemo,useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown,ChevronRight,Printer,ShieldAlert,WalletCards,X } from 'lucide-react'
import { api } from './api'
import { readBankAccounts,type BankAccountRecord } from './BankAccountsPage'
import { readAuthorizedBankEgresses,type AuthorizedBankEgress } from './bank-egress-records'
import { readCheckReprints,saveCheckReprints } from './check-reprint-records'
import { SearchableDatalistInput } from './SearchableDatalistInput'
import type { Context,ScreenSpec } from './types'

function bankLabel(row:BankAccountRecord){return`${row.bank} · ${row.type==='AHORRO'?'Ahorro':'Corriente'} · ${row.accountNumber}`}
function checkLabel(number:string,beneficiary:string){return`${number} · ${beneficiary}`}
function money(value:number){return value.toLocaleString('es-EC',{style:'currency',currency:'USD',minimumFractionDigits:2})}
function normalize(value:string){return value.trim().toLocaleUpperCase('es')}

function CheckCombobox({checks,value,disabled,onChange}:{checks:AuthorizedBankEgress[];value:string;disabled:boolean;onChange:(value:string)=>void}){
  const [open,setOpen]=useState(false)
  const filtered=checks.filter(row=>normalize(checkLabel(row.documentNumber,row.beneficiary)).includes(normalize(value)))
  const select=(row:AuthorizedBankEgress)=>{onChange(checkLabel(row.documentNumber,row.beneficiary));setOpen(false)}
  return <div className="check-reprint-combobox" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setOpen(false)}}>
    <input role="combobox" aria-label="# Cheque" aria-autocomplete="list" aria-expanded={open} aria-controls="check-reprint-options" disabled={disabled} value={value} placeholder={disabled?'Selecciona primero la cuenta bancaria':'Escribe para filtrar los cheques'} onFocus={event=>{event.currentTarget.select();setOpen(true)}} onChange={event=>{onChange(event.target.value);setOpen(true)}} onKeyDown={event=>{if(event.key==='Escape')setOpen(false);if(event.key==='Enter'&&filtered[0]){event.preventDefault();select(filtered[0])}}}/>
    {value&&<button type="button" className="check-reprint-clear" aria-label="Borrar cheque" title="Borrar cheque" onMouseDown={event=>event.preventDefault()} onClick={()=>{onChange('');setOpen(true)}}><X/></button>}
    <button type="button" className="check-reprint-toggle" aria-label="Mostrar cheques emitidos" disabled={disabled} onMouseDown={event=>event.preventDefault()} onClick={()=>setOpen(current=>!current)}><ChevronDown className={open?'open':''}/></button>
    {open&&!disabled&&<div id="check-reprint-options" className="check-reprint-options" role="listbox">{filtered.map(row=><button type="button" role="option" aria-selected={checkLabel(row.documentNumber,row.beneficiary)===value} key={row.id} onClick={()=>select(row)}><strong>{row.documentNumber}</strong><span>{row.beneficiary}</span><small>{row.issueDate} · {money(row.total)}</small></button>)}{!filtered.length&&<div className="check-reprint-no-options">No existen cheques coincidentes en esta cuenta.</div>}</div>}
  </div>
}

export function CheckReprintPage({screen}:{screen:ScreenSpec}){
  const context=useQuery({queryKey:['context'],queryFn:api.context})
  if(!context.data)return null
  return <CheckReprintManager key={context.data.company.id} screen={screen} context={context.data}/>
}

function CheckReprintManager({screen,context}:{screen:ScreenSpec;context:Context}){
  const companyId=context.company.id,banks=useMemo(()=>readBankAccounts(companyId).filter(row=>row.state==='ACTIVA'),[companyId]),egresses=useMemo(()=>readAuthorizedBankEgresses(companyId),[companyId])
  const [bankInput,setBankInput]=useState(''),[bankAccountId,setBankAccountId]=useState(''),[checkInput,setCheckInput]=useState(''),[error,setError]=useState('')
  const checks=egresses.filter(row=>row.status==='GENERADO'&&row.paymentMethod==='CHEQUE'&&row.bankAccountId===bankAccountId),selected=checks.find(row=>checkLabel(row.documentNumber,row.beneficiary)===checkInput)
  const chooseBank=(value:string)=>{const bank=banks.find(row=>bankLabel(row)===value);setBankInput(value);setBankAccountId(bank?.id??'');setCheckInput('');setError('')}
  const chooseCheck=(value:string)=>{setCheckInput(value);setError('')}
  const reprint=()=>{
    setError('');const latest=readAuthorizedBankEgresses(companyId).find(row=>row.id===selected?.id)
    if(!bankAccountId){setError('Selecciona una Cuenta Bancaria activa.');return}
    if(!latest||latest.status!=='GENERADO'||latest.paymentMethod!=='CHEQUE'||latest.bankAccountId!==bankAccountId||checkLabel(latest.documentNumber,latest.beneficiary)!==checkInput){setError('Selecciona un cheque vigente y disponible para reimpresión.');return}
    saveCheckReprints(companyId,[{id:crypto.randomUUID(),companyId,egressId:latest.id,bankAccountId,checkNumber:latest.documentNumber,user:context.actor.name,createdAt:new Date().toISOString()},...readCheckReprints(companyId)])
    window.open(`/vista-previa/cheques/${encodeURIComponent(latest.id)}?print=1`,'_blank','noopener,noreferrer')
  }
  return <div className="page screen-page check-reprint-page"><div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div><section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Bancos</b></div><h1>{screen.titulo_original}</h1></div></section>
    {error&&<div className="bank-egress-feedback error" role="alert"><ShieldAlert/>{error}</div>}
    <section className="check-replacement-card"><header><div><Printer/><span><h2>Reimpresión de Cheque</h2><p>Selecciona la cuenta y el cheque vigente que deseas imprimir nuevamente.</p></span></div></header><div className="check-replacement-search"><label className="check-bank-field"><span>Cuenta Bancaria</span><SearchableDatalistInput list="reprint-bank-options" value={bankInput} onChange={event=>chooseBank(event.target.value)} onClear={()=>chooseBank('')} clearLabel="Borrar cuenta bancaria" placeholder="Escribe para filtrar las cuentas"/><datalist id="reprint-bank-options">{banks.map(row=><option key={row.id} value={bankLabel(row)}/>)}</datalist></label><label><span># Cheque</span><CheckCombobox checks={checks} value={checkInput} disabled={!bankAccountId} onChange={chooseCheck}/></label></div>
      <div className="check-replacement-result"><table><thead><tr><th>Beneficiario</th><th>Fecha Emisión</th><th>Valor</th><th># Cheque</th></tr></thead><tbody>{selected?<tr><td><strong>{selected.beneficiary}</strong><small>{selected.number}</small></td><td>{selected.issueDate}</td><td>{money(selected.total)}</td><td><b>{selected.documentNumber}</b></td></tr>:<tr><td colSpan={4}><div className="check-replacement-empty"><WalletCards/><strong>Selecciona un cheque</strong><span>La información del cheque seleccionado aparecerá aquí.</span></div></td></tr>}</tbody></table></div>
      <footer><span>La reimpresión conserva el cheque emitido y no genera movimientos contables.</span><button type="button" className="primary-action" disabled={!selected} onClick={reprint}><Printer/>Reimprimir Cheque</button></footer>
    </section>
  </div>
}
