import { useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, Play, X } from 'lucide-react'
import { api } from './api'
import { readAccountingClosures } from './AccountingClosurePage'
import { appendIssuedExpenses, nextReceiptNumber, type IssuedExpenseRecord } from './expense-records'
import { readCompanyGenerationType, type CompanyGenerationType } from './operation-date-rules'
import type { Context, ScreenSpec } from './types'

type BillingHistory = { owner?:string; tenant?:string; billedTo?:'PROPIETARIO'|'INQUILINO'; billedToName?:string; until?:string }
type WaterReadingDetail = { propertyId:string; contact:string; owner:string; meterCode:string; from:string; until:string; previous:string; current:string }
type WaterReadingRecord = { id:string; issueDate:string; description:string; readingFrom:string; readingUntil:string; state?:string; details:WaterReadingDetail[] }
type PropertyRow = { id:string; description?:string; billingHistory?:BillingHistory[] }
type Customer = { identification:string; businessName:string; address?:string; phone:string; email:string }
type WaterGenerationRecord = { id:string; month:string; expenseDate:string; pricePerM3?:number; generationType?:CompanyGenerationType; generatedAt:string; user:string; generatedDocuments:number; propertiesProcessed:number; totalValue:number }
export type WaterUnit = { propertyId:string; propertyName:string; contact:string; amount:number; readingDescription:string; consumption:number; unitPrice:number }
export type WaterExpenseGroup = { key:string; contact:string; label:string; units:WaterUnit[]; amount:number }
export type WaterPlan = { type:CompanyGenerationType; readings:WaterReadingRecord[]; units:WaterUnit[]; groups:WaterExpenseGroup[]; totalValue:number; errors:string[] }

function readJson<T>(key:string,fallback:T):T { try { const value=JSON.parse(localStorage.getItem(key)??'null'); return value??fallback } catch { return fallback } }
function currentMonth(){const date=new Date();return`${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`}
function firstDayOfMonth(month:string){return`01/${month}`}
function validDate(value:string){const match=value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!match)return false;const date=new Date(Number(match[3]),Number(match[2])-1,Number(match[1]));return date.getFullYear()===Number(match[3])&&date.getMonth()===Number(match[2])-1&&date.getDate()===Number(match[1])}
function validPrice(value:string){return /^\d+(?:[.,]\d{1,2})?$/.test(value)&&numberValue(value)>0}
function displayMonth(period:string){const[year,month]=period.split('-');return`${month}/${year}`}
function availableMonths(){const now=new Date();const limit=new Date(now.getFullYear(),now.getMonth()+1,1);const maximum=`${limit.getFullYear()}-${String(limit.getMonth()+1).padStart(2,'0')}`;return Array.from(new Set(readAccountingClosures().filter(row=>row.estado!=='CERRADO'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(row.periodo)&&row.periodo<=maximum).map(row=>row.periodo))).sort().map(displayMonth)}
function numberValue(value:string|number){return Number(String(value??'').replace(',','.'))||0}
function money(value:number){return value.toLocaleString('es-EC',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2})}
function displayDate(value:string){return new Intl.DateTimeFormat('es-EC',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value))}
function normalized(value:string){return value.trim().toLocaleLowerCase('es').replace(/\s+/g,' ')}
function billedClient(property:PropertyRow|undefined){const billing=property?.billingHistory?.find(item=>!item.until);return billing?.billedToName?.trim()||(billing?.billedTo==='INQUILINO'?billing.tenant?.trim():billing?.owner?.trim())||''}

export function buildWaterPlan(month:string,pricePerM3=0):WaterPlan{
  const type=readCompanyGenerationType()
  const properties=readJson<PropertyRow[]>('saga.property-detail',[])
  const customers=readJson<Customer[]>('saga.customers',[])
  const readings=readJson<WaterReadingRecord[]>('saga.water-meter-readings',[])
    .filter(record=>record.state!=='INACTIVO'&&(record.issueDate.slice(3)===month||record.readingUntil.slice(3)===month))
    .sort((a,b)=>b.issueDate.localeCompare(a.issueDate))
  const units:WaterUnit[]=[]
  const errors:string[]=[]
  const usedProperties=new Set<string>()
  readings.forEach(reading=>reading.details.forEach(detail=>{
    if(usedProperties.has(detail.propertyId))return
    usedProperties.add(detail.propertyId)
    const property=properties.find(item=>item.id===detail.propertyId)
    const propertyName=property?.description??detail.propertyId
    const contact=billedClient(property)||detail.contact.trim()
    const previous=numberValue(detail.previous);const current=numberValue(detail.current)
    if(!contact)errors.push(`${propertyName}: no tiene Se Factura A vigente.`)
    else if(!customers.some(customer=>normalized(customer.businessName)===normalized(contact)))errors.push(`${propertyName}: el cliente "${contact}" de Se Factura A no existe en Registro Clientes.`)
    if(!detail.meterCode.trim())errors.push(`${propertyName}: no tiene Código Medidor.`)
    if(current<previous)errors.push(`${propertyName}: la Lectura Actual es menor que la Lectura Anterior.`)
    const consumption=Math.max(0,current-previous)
    const amount=Math.round(consumption*pricePerM3*100)/100
    units.push({propertyId:detail.propertyId,propertyName,contact,amount,readingDescription:reading.description,consumption,unitPrice:pricePerM3})
  }))
  const grouped=new Map<string,WaterExpenseGroup>()
  units.forEach(unit=>{
    const key=type==='CLIENTE'?normalized(unit.contact):unit.propertyId
    const current=grouped.get(key)??{key,contact:unit.contact,label:type==='CLIENTE'?unit.contact:unit.propertyName,units:[],amount:0}
    current.units.push(unit);current.amount=Math.round((current.amount+unit.amount)*100)/100;grouped.set(key,current)
  })
  const groups=Array.from(grouped.values())
  return{type,readings,units,groups,totalValue:Math.round(groups.reduce((sum,group)=>sum+group.amount,0)*100)/100,errors:Array.from(new Set(errors))}
}

export function AutomaticWaterExpenseGenerationPage({screen}:{screen:ScreenSpec}){
  const context=useQuery({queryKey:['context'],queryFn:api.context})
  if(!context.data)return null
  return <AutomaticWaterExpenseGenerationManager screen={screen} context={context.data}/>
}

function AutomaticWaterExpenseGenerationManager({screen,context}:{screen:ScreenSpec;context:Context}){
  const storageKey=`saga.automatic-water-expense-generations:${context.company.id}`
  const [history,setHistory]=useState<WaterGenerationRecord[]>(()=>readJson<WaterGenerationRecord[]>(storageKey,[]).sort((a,b)=>b.generatedAt.localeCompare(a.generatedAt)))
  const [months,setMonths]=useState<string[]>(availableMonths)
  const [month,setMonth]=useState(currentMonth)
  const [expenseDate,setExpenseDate]=useState('')
  const [pricePerM3,setPricePerM3]=useState('')
  const [plan,setPlan]=useState<WaterPlan>(()=>buildWaterPlan(currentMonth(),0))
  const [formOpen,setFormOpen]=useState(false)
  const [duplicatePending,setDuplicatePending]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const propertiesCount=useMemo(()=>new Set(plan.units.map(unit=>unit.propertyId)).size,[plan.units])

  const openForm=()=>{
    const enabled=availableMonths()
    if(!enabled.length){setMessage('No existen períodos contables habilitados hasta el mes siguiente a la fecha actual. Los períodos cerrados no pueden ejecutarse.');return}
    const selected=enabled.includes(currentMonth())?currentMonth():enabled[0]
    setMonths(enabled);setMonth(selected);setExpenseDate(firstDayOfMonth(selected));setPricePerM3('');setPlan(buildWaterPlan(selected,0));setError('');setMessage('');setDuplicatePending(false);setFormOpen(true)
  }

  const persistGeneration=()=>{
    const price=numberValue(pricePerM3)
    const currentPlan=buildWaterPlan(month,price)
    if(!currentPlan.readings.length||!currentPlan.units.length){setDuplicatePending(false);setError(`No existe un Registro de Lectura Agua procesable para ${month}.`);return}
    if(currentPlan.errors.length){setDuplicatePending(false);setError(currentPlan.errors.join(' '));return}
    const[,issueMonth,issueYear]=expenseDate.split('/')
    const customers=readJson<Customer[]>('saga.customers',[])
    const createdAt=new Date().toISOString()
    const issued:IssuedExpenseRecord[]=currentPlan.groups.map((group,index)=>{
      const customer=customers.find(item=>normalized(item.businessName)===normalized(group.contact))
      const receiptNumber=nextReceiptNumber(context.company.id,index)
      return{id:crypto.randomUUID(),companyId:context.company.id,month:issueMonth,year:issueYear,issueDate:expenseDate,receiptNumber,identification:customer?.identification??'',businessName:customer?.businessName??group.contact,address:customer?.address??'',phone:customer?.phone??'',email:customer?.email??'',expenseType:'AGUA',generationType:'AUTOMATICA',total:group.amount,pdfFileName:`${receiptNumber}.pdf`,createdAt,status:'VIGENTE',lines:group.units.map(unit=>({id:crypto.randomUUID(),propertyId:unit.propertyId,propertyDescription:unit.propertyName,itemId:'AGUA',itemDescription:'Consumo de agua',conceptText:`${unit.readingDescription} · ${unit.propertyName} · ${unit.consumption.toLocaleString('es-EC',{maximumFractionDigits:2})} Mt3`,valueMode:'FIJO',squareMeters:null,quantity:unit.consumption,unitPrice:price,total:unit.amount}))}
    })
    appendIssuedExpenses(context.company.id,issued)
    const record:WaterGenerationRecord={id:crypto.randomUUID(),month,expenseDate,pricePerM3:price,generationType:currentPlan.type,generatedAt:createdAt,user:context.actor.name,generatedDocuments:issued.length,propertiesProcessed:currentPlan.units.length,totalValue:currentPlan.totalValue}
    const next=[record,...history].sort((a,b)=>b.generatedAt.localeCompare(a.generatedAt))
    setHistory(next);localStorage.setItem(storageKey,JSON.stringify(next));setFormOpen(false);setDuplicatePending(false);setError('');setMessage(`Se generaron ${issued.length} expensas de agua de ${month} por ${money(currentPlan.totalValue)} con un valor de ${money(price)} por Mt3.`)
  }

  const requestGeneration=(event:FormEvent)=>{
    event.preventDefault()
    if(!validDate(expenseDate)){setError('La Fecha en Expensas debe tener el formato DD/MM/AAAA y ser válida.');return}
    if(!months.includes(expenseDate.slice(3))){setError('La Fecha en Expensas debe pertenecer a un período contable habilitado.');return}
    if(!validPrice(pricePerM3)){setError('Valor x Mt3 debe ser mayor a cero y tener máximo 2 decimales.');return}
    const currentPlan=buildWaterPlan(month,numberValue(pricePerM3));setPlan(currentPlan)
    if(!currentPlan.readings.length||!currentPlan.units.length){setError(`No existe un Registro de Lectura Agua procesable para ${month}.`);return}
    if(currentPlan.errors.length){setError(currentPlan.errors.join(' '));return}
    if(history.some(record=>record.month===month)){setDuplicatePending(true);return}
    persistGeneration()
  }

  return <div className="page screen-page automatic-expense-page automatic-water-expense-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div></section>
    <section className="automatic-expense-action-box"><div><span className="automatic-expense-icon"><CalendarDays/></span><div><strong>Generación mensual de expensas de agua</strong><small>Multiplica el Total Mt3 de cada inmueble por el Valor x Mt3 indicado y agrupa según la configuración de la compañía.</small></div></div><button type="button" className="primary-action" onClick={openForm}><Play/>Generar Expensas de Agua</button></section>
    {message&&<div className="automatic-expense-feedback" role="status"><CheckCircle2/>{message}</div>}
    <section className="automatic-expense-history"><header><div><h2>Histórico de Generaciones</h2><span>Procesos de agua ejecutados desde el más reciente.</span></div></header><div className="automatic-expense-table"><table><thead><tr><th>Mes Generado</th><th>Fecha Generación</th><th>Valor x Mt3</th><th>Expensas Generadas</th><th>Valor Total</th><th>Usuario</th></tr></thead><tbody>{history.map(record=><tr key={record.id}><td><strong>{record.month}</strong></td><td>{displayDate(record.generatedAt)}</td><td>{record.pricePerM3===undefined?'—':money(record.pricePerM3)}</td><td>{record.generatedDocuments}</td><td>{money(record.totalValue)}</td><td>{record.user}</td></tr>)}{!history.length&&<tr><td colSpan={6}><div className="automatic-expense-empty"><CalendarDays/><strong>No existen generaciones registradas</strong><span>Los procesos de agua ejecutados aparecerán en esta tabla.</span></div></td></tr>}</tbody></table></div></section>
    {formOpen&&<div className="automatic-expense-backdrop" role="dialog" aria-modal="true" aria-label="Generar Expensas de Agua"><form className="automatic-expense-modal" onSubmit={requestGeneration}><header><div><span>Nuevo proceso</span><h2>Generar Expensas de Agua</h2><small>{context.company.name}</small></div><button type="button" aria-label="Cerrar" onClick={()=>setFormOpen(false)}><X/></button></header><div className="automatic-expense-fields">
      <label><span>Mes <b>Obligatorio</b></span><select value={month} onChange={event=>{const selected=event.target.value;setMonth(selected);setExpenseDate(firstDayOfMonth(selected));setPlan(buildWaterPlan(selected,numberValue(pricePerM3)));setError('')}}>{months.map(option=><option value={option} key={option}>{option}</option>)}</select></label>
      <label><span>Fecha en Expensas <b>Obligatorio</b></span><input inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={expenseDate} onChange={event=>{setExpenseDate(event.target.value);setError('')}}/></label>
      <label><span>Valor x Mt3 <b>Obligatorio</b></span><input inputMode="decimal" placeholder="0.00" value={pricePerM3} onChange={event=>{const value=event.target.value.replace(/[^\d.,]/g,'');if(!value||/^\d*(?:[.,]\d{0,2})?$/.test(value)){setPricePerM3(value);setPlan(buildWaterPlan(month,numberValue(value)));setError('')}}}/></label>
      <section className="automatic-expense-plan"><header><div><span>Criterio de agrupación</span><strong>{plan.type==='CLIENTE'?'Generación por Cliente':'Generación por Inmueble'}</strong></div><div><span>Expensas a generar</span><strong>{plan.groups.length}</strong></div><div><span>Inmuebles incluidos</span><strong>{propertiesCount}</strong></div><div><span>Lecturas incluidas</span><strong>{plan.readings.length}</strong></div><div><span>Valor total</span><strong>{money(plan.totalValue)}</strong></div></header><div className="automatic-expense-grouping-rule">{plan.type==='CLIENTE'?'Se generará una expensa por cada cliente de “Se Factura A”, consolidando el consumo de todos sus inmuebles.':'Se generará una expensa independiente por cada inmueble con lectura registrada.'}</div>{plan.groups.length>0&&<div className="automatic-expense-plan-list">{plan.groups.map(group=><article key={group.key}><strong>{group.label}</strong><span>{group.units.length} inmueble{group.units.length===1?'':'s'} · {group.units.reduce((sum,unit)=>sum+unit.consumption,0).toLocaleString('es-EC',{maximumFractionDigits:3})} Mt3 · {money(group.amount)}</span></article>)}</div>}{plan.errors.length>0&&<p><AlertTriangle/>{plan.errors.join(' ')}</p>}</section>
      {error&&<div className="automatic-expense-error" role="alert"><AlertTriangle/>{error}</div>}
    </div><footer><button type="button" className="quiet-button" onClick={()=>setFormOpen(false)}>Cancelar</button><button type="submit" className="primary-action"><Play/>Generar</button></footer></form></div>}
    {duplicatePending&&<div className="automatic-expense-backdrop duplicate" role="alertdialog" aria-modal="true" aria-label="Confirmar nueva generación"><section className="automatic-expense-confirm"><span><AlertTriangle/></span><h2>El mes ya fue generado</h2><p>Ya existe una generación de expensas de agua para <strong>{month}</strong>. ¿Deseas ejecutar nuevamente el proceso con fecha <strong>{expenseDate}</strong> y valor <strong>{money(numberValue(pricePerM3))}</strong> por Mt3?</p><div><button type="button" className="quiet-button" onClick={()=>setDuplicatePending(false)}>Cancelar</button><button type="button" className="primary-action" onClick={persistGeneration}><Play/>Sí, generar nuevamente</button></div></section></div>}
  </div>
}
