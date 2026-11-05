import { useMemo, useState, type FormEvent } from 'react'
import { ChevronRight, Droplets, Pencil, Plus, X } from 'lucide-react'
import type { ScreenSpec } from './types'
import { cleanTextSpacing, comparableText } from './text-values'
import { SearchableDatalistInput } from './SearchableDatalistInput'

type State = 'ACTIVO' | 'INACTIVO'
type BillingHistory = { id:string; owner:string; tenant:string; billedTo:'PROPIETARIO'|'INQUILINO'; billedToName?:string; from:string; until:string }
type PropertyRow = { id:string; description:string; waterMeterCode?:string; state?:State; billingHistory?:BillingHistory[] }
type CustomerRow = { id:string; businessName:string }
type ReadingDetail = { propertyId:string; contact:string; owner:string; meterCode:string; from:string; until:string; previous:string; current:string }
type ReadingRecord = { id:string; issueDate:string; description:string; readingFrom:string; readingUntil:string; pricePerM3?:string; state:State; details:ReadingDetail[] }
type ReadingDraft = Omit<ReadingRecord,'id'>

const storageKey = 'saga.water-meter-readings'

function readJson<T>(key:string,fallback:T):T { try { const value=JSON.parse(localStorage.getItem(key)??'null'); return value??fallback } catch { return fallback } }
function today(){return new Intl.DateTimeFormat('es-EC',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date())}
function validDate(value:string){if(!/^\d{2}\/\d{2}\/\d{4}$/.test(value))return false;const[day,month,year]=value.split('/').map(Number);const date=new Date(year,month-1,day);return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day}
function dateRank(value:string){if(!validDate(value))return 0;const[day,month,year]=value.split('/').map(Number);return new Date(year,month-1,day).getTime()}
function numeric(value:string){return Number(value.replace(',','.'))||0}
function validNumber(value:string,decimals:number){return new RegExp(`^\\d+(?:[.,]\\d{1,${decimals}})?$`).test(value)}
function displayNumber(value:number){return value.toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2})}
function currentBilling(property:PropertyRow){const history=Array.isArray(property.billingHistory)?property.billingHistory:[];return history.find(item=>!item.until)??[...history].sort((a,b)=>dateRank(b.from)-dateRank(a.from))[0]}
function contactFor(property:PropertyRow){const billing=currentBilling(property);return cleanTextSpacing(billing?(billing.billedToName?.trim()||(billing.billedTo==='INQUILINO'?(billing.tenant||billing.owner):billing.owner)):'')}
function emptyDraft():ReadingDraft{return{issueDate:today(),description:'',readingFrom:'',readingUntil:'',state:'ACTIVO',details:[]}}
function readRecords(){return readJson<ReadingRecord[]>(storageKey,[]).map(record=>({...record,state:record.state??'ACTIVO',details:Array.isArray(record.details)?record.details:[]})).sort((a,b)=>dateRank(b.issueDate)-dateRank(a.issueDate))}

function detailFor(property:PropertyRow,records:ReadingRecord[],readingFrom='',readingUntil=''):ReadingDetail{
  const billing=currentBilling(property)
  const lastCurrent=records.flatMap(record=>record.details.map(detail=>({detail,rank:dateRank(record.issueDate)}))).filter(item=>item.detail.propertyId===property.id).sort((a,b)=>b.rank-a.rank)[0]?.detail.current??''
  return{propertyId:property.id,contact:contactFor(property),owner:cleanTextSpacing(billing?.owner),meterCode:property.waterMeterCode??'',from:readingFrom,until:readingUntil,previous:lastCurrent,current:''}
}

function Status({value}:{value:State}){return <span className={`status s-${value.toLowerCase()}`}><i/>{value==='ACTIVO'?'Activo':'Inactivo'}</span>}

export function WaterMeterReadingPage({screen}:{screen:ScreenSpec}){
  const properties=useMemo(()=>readJson<PropertyRow[]>('saga.property-detail',[]),[])
  const customers=useMemo(()=>readJson<CustomerRow[]>('saga.customers',[]),[])
  const [records,setRecords]=useState<ReadingRecord[]>(readRecords)
  const [formOpen,setFormOpen]=useState(false)
  const [editingId,setEditingId]=useState<string|null>(null)
  const [draft,setDraft]=useState<ReadingDraft>(emptyDraft)
  const [error,setError]=useState('')
  const contacts=useMemo(()=>Array.from(new Map([...customers.map(customer=>customer.businessName),...properties.flatMap(property=>{const billing=currentBilling(property);return[billing?.owner??'',billing?.tenant??'']})].map(cleanTextSpacing).filter(Boolean).map(value=>[comparableText(value),value])).values()).sort((a,b)=>a.localeCompare(b,'es')),[customers,properties])
  const propertyById=(id:string)=>properties.find(property=>property.id===id)
  const makeDetails=(from='',until='')=>properties.map(property=>detailFor(property,records,from,until))
  const persist=(next:ReadingRecord[])=>{const ordered=[...next].sort((a,b)=>dateRank(b.issueDate)-dateRank(a.issueDate));setRecords(ordered);localStorage.setItem(storageKey,JSON.stringify(ordered))}
  const openNew=()=>{const next=emptyDraft();setEditingId(null);setDraft({...next,details:makeDetails(next.readingFrom,next.readingUntil)});setError('');setFormOpen(true)}
  const openEdit=(record:ReadingRecord)=>{const stored=new Map(record.details.map(detail=>[detail.propertyId,detail]));const details=properties.map(property=>stored.get(property.id)??detailFor(property,records,record.readingFrom,record.readingUntil));setEditingId(record.id);setDraft({...record,details});setError('');setFormOpen(true)}
  const close=()=>{setFormOpen(false);setEditingId(null);setDraft(emptyDraft());setError('')}
  const updateDetail=(propertyId:string,changes:Partial<ReadingDetail>)=>setDraft(current=>({...current,details:current.details.map(detail=>detail.propertyId===propertyId?{...detail,...changes}:detail)}))
  const updateRange=(key:'readingFrom'|'readingUntil',value:string)=>setDraft(current=>{const detailKey=key==='readingFrom'?'from':'until';const previous=current[key];return{...current,[key]:value,details:current.details.map(detail=>({...detail,[detailKey]:!detail[detailKey]||detail[detailKey]===previous?value:detail[detailKey]}))}})
  const save=(event:FormEvent)=>{
    event.preventDefault()
    if(!validDate(draft.issueDate)||!draft.description.trim()||!validDate(draft.readingFrom)||!validDate(draft.readingUntil)){setError('Completa la descripción y todas las fechas con el formato DD/MM/AAAA.');return}
    if(dateRank(draft.readingUntil)<dateRank(draft.readingFrom)){setError('Lectura Hasta no puede ser anterior a Lectura Desde.');return}
    if(!draft.details.length){setError('No existen inmuebles registrados para generar la lectura de agua.');return}
    const missingMeter=draft.details.find(detail=>!detail.meterCode.trim())
    if(missingMeter){setError(`Registra el Código Medidor del inmueble ${propertyById(missingMeter.propertyId)?.description??''} en Detalle Inmueble.`);return}
    const invalidDetail=draft.details.find(detail=>!detail.contact.trim()||!validDate(detail.from)||!validDate(detail.until)||!validNumber(detail.previous||'0',3)||!validNumber(detail.current,3)||numeric(detail.current)<numeric(detail.previous))
    if(invalidDetail){setError(`Revisa contacto, fechas y lecturas del inmueble ${propertyById(invalidDetail.propertyId)?.description??''}. La lectura actual no puede ser menor que la anterior.`);return}
    const{pricePerM3:_legacyPrice,...readingDraft}=draft
    const record:ReadingRecord={...readingDraft,id:editingId??crypto.randomUUID(),description:draft.description.trim(),details:draft.details.map(detail=>({...detail,contact:cleanTextSpacing(detail.contact),owner:cleanTextSpacing(detail.owner),previous:(detail.previous||'0').replace(',','.'),current:detail.current.replace(',','.')}))}
    persist(editingId?records.map(item=>item.id===editingId?record:item):[record,...records]);close()
  }
  return <div className="page screen-page water-reading-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Expensas</b></div><h1>{screen.titulo_original}</h1></div>{!formOpen&&<button type="button" className="primary-action" onClick={openNew}><Plus/>Nuevo Registro</button>}</section>
    {formOpen?<section className="water-reading-editor panel"><header><div><span>{editingId?'Modificar registro':'Nuevo registro'}</span><h2>{editingId?draft.description||'Registro de Lectura Agua':'Registro de Lectura Agua'}</h2></div><button type="button" aria-label="Cerrar" onClick={close}><X/></button></header><form onSubmit={save}>
      <div className="water-reading-head-fields">
        <label>Fecha Emisión <span>Obligatorio</span><input inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={draft.issueDate} onChange={event=>{setDraft({...draft,issueDate:event.target.value});setError('')}}/></label>
        <label className="wide">Descripción <span>Obligatorio</span><input maxLength={150} value={draft.description} onChange={event=>{setDraft({...draft,description:event.target.value});setError('')}}/></label>
        <label>Lectura Desde <span>Obligatorio</span><input inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={draft.readingFrom} onChange={event=>{updateRange('readingFrom',event.target.value);setError('')}}/></label>
        <label>Lectura Hasta <span>Obligatorio</span><input inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={draft.readingUntil} onChange={event=>{updateRange('readingUntil',event.target.value);setError('')}}/></label>
      </div>
      <section className="water-reading-detail"><header><div><h3>Lecturas por Inmueble</h3><p>El consumo total en Mt3 se calcula automáticamente.</p></div><span>{draft.details.length} {draft.details.length===1?'inmueble':'inmuebles'}</span></header><div className="water-reading-detail-scroll"><table><thead><tr><th>Inmueble</th><th>Contacto Facturación</th><th>Propietario</th><th>Código Medidor</th><th>Desde</th><th>Hasta</th><th>Lectura Anterior</th><th>Lectura Actual</th><th>Total Mt3</th></tr></thead><tbody>{draft.details.map(detail=>{const consumption=Math.max(0,numeric(detail.current)-numeric(detail.previous));return <tr key={detail.propertyId}><td><strong>{propertyById(detail.propertyId)?.description??'Inmueble no disponible'}</strong></td><td><SearchableDatalistInput list="water-reading-contacts" aria-label={`Contacto Facturación ${propertyById(detail.propertyId)?.description??''}`} value={detail.contact} onChange={event=>updateDetail(detail.propertyId,{contact:event.target.value})} onClear={()=>updateDetail(detail.propertyId,{contact:''})} clearLabel="Borrar contacto de facturación"/></td><td>{detail.owner||'—'}</td><td>{detail.meterCode||<span className="water-reading-missing">Sin código</span>}</td><td><input aria-label={`Desde ${propertyById(detail.propertyId)?.description??''}`} inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={detail.from} onChange={event=>updateDetail(detail.propertyId,{from:event.target.value})}/></td><td><input aria-label={`Hasta ${propertyById(detail.propertyId)?.description??''}`} inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={detail.until} onChange={event=>updateDetail(detail.propertyId,{until:event.target.value})}/></td><td><input aria-label={`Lectura Anterior ${propertyById(detail.propertyId)?.description??''}`} inputMode="decimal" value={detail.previous} onChange={event=>updateDetail(detail.propertyId,{previous:event.target.value.replace(/[^\d.,]/g,'')})}/></td><td><input aria-label={`Lectura Actual ${propertyById(detail.propertyId)?.description??''}`} inputMode="decimal" value={detail.current} onChange={event=>updateDetail(detail.propertyId,{current:event.target.value.replace(/[^\d.,]/g,'')})}/></td><td className="water-reading-total">{displayNumber(consumption)}</td></tr>})}{!draft.details.length&&<tr><td colSpan={9}><div className="water-reading-empty compact"><Droplets/><strong>Sin inmuebles registrados</strong><span>Registra inmuebles antes de crear una lectura de agua.</span></div></td></tr>}</tbody></table></div></section>
      <datalist id="water-reading-contacts">{contacts.map(contact=><option value={contact} key={contact}/>)}</datalist>
      {error&&<div className="water-reading-error" role="alert">{error}</div>}
      <footer><button type="button" className="quiet-button" onClick={close}>Cancelar</button><button className="primary-action">Guardar Registro</button></footer>
    </form></section>:<section className="water-reading-list panel"><div><table><thead><tr><th aria-label="Editar"/><th>Fecha Emisión</th><th>Descripción</th><th>Lectura Desde</th><th>Lectura Hasta</th><th>Estado</th></tr></thead><tbody>{records.map(record=><tr key={record.id}><td><button type="button" className="row-action" aria-label={`Editar ${record.description}`} title="Editar registro" onClick={()=>openEdit(record)}><Pencil/></button></td><td>{record.issueDate}</td><td><strong>{record.description}</strong></td><td>{record.readingFrom}</td><td>{record.readingUntil}</td><td><Status value={record.state}/></td></tr>)}{!records.length&&<tr><td colSpan={6}><div className="water-reading-empty"><Droplets/><strong>Sin lecturas registradas</strong><span>Selecciona Nuevo Registro para ingresar el primer período de consumo.</span></div></td></tr>}</tbody></table></div></section>}
  </div>
}
