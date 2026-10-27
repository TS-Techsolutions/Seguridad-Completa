import { useMemo, useRef, useState } from 'react'
import { Bold, ChevronRight, Italic, List, Mail, Save, Send, Underline, UsersRound, X } from 'lucide-react'
import type { ScreenSpec } from './types'
import type { CustomerRow } from './CustomerRegistryPage'

type BillingHistory={owner:string;tenant:string;from:string;until:string}
type PropertyRow={billingHistory?:BillingHistory[]}
type StoredGroup={id:string;name:string;memberIds:string[]}
type RecipientOption={id:string;label:string;detail:string;kind:'GROUP'|'PERSON';email?:string;count?:number}
type RecipientFieldKey='to'|'cc'|'bcc'

function readJson<T>(key:string,fallback:T):T{try{const value=JSON.parse(localStorage.getItem(key)??'null');return value??fallback}catch{return fallback}}
function normalized(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('es')}
function dateRank(value:string){const match=value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return match?Number(`${match[3]}${match[2]}${match[1]}`):0}
function currentBilling(property:PropertyRow){const history=Array.isArray(property.billingHistory)?property.billingHistory:[];return history.find(item=>!item.until)??[...history].sort((a,b)=>dateRank(b.from)-dateRank(a.from))[0]}

function RecipientInput({label,options,value,onChange}:{label:string;options:RecipientOption[];value:RecipientOption[];onChange:(next:RecipientOption[])=>void}){
  const [query,setQuery]=useState('')
  const [open,setOpen]=useState(false)
  const results=options.filter(option=>!value.some(item=>item.id===option.id)&&normalized(`${option.label} ${option.detail} ${option.email??''}`).includes(normalized(query))).slice(0,10)
  return <div className="email-recipient-field"><strong>{label}:</strong><div className="email-recipient-control" onClick={()=>setOpen(true)}>{value.map(item=><span className={`email-recipient-chip ${item.kind.toLowerCase()}`} key={item.id}>{item.kind==='GROUP'?<UsersRound/>:<Mail/>}{item.label}{item.count!==undefined&&<small>{item.count}</small>}<button type="button" aria-label={`Quitar ${item.label}`} onClick={event=>{event.stopPropagation();onChange(value.filter(current=>current.id!==item.id))}}><X/></button></span>)}<input value={query} onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setOpen(true)}} placeholder={value.length?'Agregar más':'Buscar grupo, propietario o inquilino'}/>{open&&<div className="email-recipient-results">{results.map(option=><button type="button" key={option.id} disabled={option.kind==='PERSON'&&!option.email} onClick={()=>{onChange([...value,option]);setQuery('');setOpen(false)}}><span>{option.kind==='GROUP'?<UsersRound/>:<Mail/>}<b>{option.label}</b><small>{option.detail}</small></span>{option.kind==='GROUP'?<em>{option.count} destinatarios</em>:<em>{option.email||'Sin email configurado'}</em>}</button>)}{!results.length&&<div>Sin coincidencias disponibles</div>}</div>}</div>{open&&<button type="button" className="email-recipient-dismiss" aria-label={`Cerrar búsqueda de ${label}`} onClick={()=>setOpen(false)}/>}</div>
}

export function EmailComposerPage({screen}:{screen:ScreenSpec}){
  const customers=readJson<CustomerRow[]>('saga.customers',[])
  const properties=readJson<PropertyRow[]>('saga.property-detail',[])
  const customGroups=readJson<StoredGroup[]>('saga.recipient-groups',[])
  const editorRef=useRef<HTMLDivElement>(null)
  const [recipients,setRecipients]=useState<Record<RecipientFieldKey,RecipientOption[]>>({to:[],cc:[],bcc:[]})
  const [subject,setSubject]=useState('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const relations=useMemo(()=>properties.map(currentBilling).filter((item):item is BillingHistory=>Boolean(item)),[properties])
  const customerForName=(name:string)=>customers.find(customer=>normalized(customer.businessName)===normalized(name))
  const owners=useMemo(()=>Array.from(new Set(relations.map(item=>item.owner).filter(Boolean))),[relations])
  const tenants=useMemo(()=>Array.from(new Set(relations.flatMap(item=>item.tenant?[item.tenant]:[item.owner]).filter(Boolean))),[relations])
  const ownerIds=customers.filter(customer=>owners.some(name=>normalized(name)===normalized(customer.businessName))).map(customer=>customer.id)
  const residentIds=customers.filter(customer=>tenants.some(name=>normalized(name)===normalized(customer.businessName))).map(customer=>customer.id)
  const options=useMemo<RecipientOption[]>(()=>{
    const groups:RecipientOption[]=[{id:'GROUP-OWNERS',label:'Propietarios',detail:'Grupo de distribución automático',kind:'GROUP',count:ownerIds.length},{id:'GROUP-RESIDENTS',label:'Residentes',detail:'Grupo de distribución automático',kind:'GROUP',count:residentIds.length},...customGroups.map(group=>({id:`GROUP-${group.id}`,label:group.name,detail:'Grupo de distribución personalizado',kind:'GROUP' as const,count:group.memberIds.filter(id=>customers.some(customer=>customer.id===id&&customer.email)).length}))]
    const people=[...owners.map(name=>({name,role:'Propietario'})),...tenants.map(name=>({name,role:'Inquilino'}))].filter((item,index,list)=>list.findIndex(candidate=>normalized(candidate.name)===normalized(item.name)&&candidate.role===item.role)===index).map(item=>{const customer=customerForName(item.name);return{id:`PERSON-${item.role}-${normalized(item.name)}`,label:item.name,detail:item.role,kind:'PERSON' as const,email:customer?.email}})
    return[...groups,...people]
  },[customers,customGroups,ownerIds.length,residentIds.length,owners,tenants])
  const format=(command:string)=>{editorRef.current?.focus();document.execCommand(command)}
  const saveDraft=()=>{localStorage.setItem('saga.email-draft',JSON.stringify({recipients,subject,body:editorRef.current?.innerHTML??'',updatedAt:new Date().toISOString()}));setError('');setMessage('Borrador guardado correctamente.')}
  const send=()=>{if(!recipients.to.length){setMessage('');setError('Agrega al menos un destinatario en Para.');return}if(!subject.trim()){setMessage('');setError('Ingresa el asunto del correo.');return}if(!(editorRef.current?.innerText.trim())){setMessage('');setError('Escribe el contenido del correo.');return}setError('');setMessage('Correo preparado y agregado a la cola de envío.')}
  return <div className="page screen-page email-composer-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div><div className="email-header-actions"><button className="quiet-button" onClick={saveDraft}><Save/>Guardar borrador</button><button className="primary-action" onClick={send}><Send/>Enviar correo</button></div></section>
    <div className="email-compose-fields">
      <RecipientInput label="Para" options={options} value={recipients.to} onChange={to=>setRecipients({...recipients,to})}/>
      <RecipientInput label="CC" options={options} value={recipients.cc} onChange={cc=>setRecipients({...recipients,cc})}/>
      <RecipientInput label="CCO" options={options} value={recipients.bcc} onChange={bcc=>setRecipients({...recipients,bcc})}/>
      <label className="email-subject"><strong>Asunto:</strong><input value={subject} onChange={event=>{setSubject(event.target.value);setError('');setMessage('')}} maxLength={180} placeholder="Escribe el asunto del correo"/></label>
    </div>
    <div className="email-editor"><div className="email-editor-toolbar" aria-label="Opciones de formato"><button type="button" title="Negrita" aria-label="Negrita" onClick={()=>format('bold')}><Bold/></button><button type="button" title="Cursiva" aria-label="Cursiva" onClick={()=>format('italic')}><Italic/></button><button type="button" title="Subrayado" aria-label="Subrayado" onClick={()=>format('underline')}><Underline/></button><button type="button" title="Lista" aria-label="Lista" onClick={()=>format('insertUnorderedList')}><List/></button></div><div ref={editorRef} className="email-editor-body" contentEditable suppressContentEditableWarning data-placeholder="Escribe el contenido del correo electrónico…" onInput={()=>{setError('');setMessage('')}}/></div>
    {error&&<div className="email-feedback error" role="alert">{error}</div>}{message&&<div className="email-feedback success" role="status">{message}</div>}
  </div>
}
