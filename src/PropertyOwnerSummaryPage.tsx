import { useState } from 'react'
import { ChevronRight, Search, UsersRound } from 'lucide-react'
import type { ScreenSpec } from './types'

type State='ACTIVO'|'INACTIVO'
type BillingHistory={id:string;owner:string;tenant:string;billedTo:'PROPIETARIO'|'INQUILINO';billedToName?:string;from:string;until:string;ownerPhone?:string;ownerAddress?:string;ownerEmail?:string;tenantPhone?:string;tenantAddress?:string;tenantEmail?:string}
type PropertyRow={id:string;description:string;sectionId:string;divisionKey:string;usableArea:string;payer?:string;state:State;billingHistory?:BillingHistory[]}
type CustomerRow={id:string;identification:string;businessName:string;phone:string;address:string;email:string;state:State}
type SectionRow={id:string;description:string;rates?:Array<{from:string;until:string;value:string}>}
type StructureDetail={id:string;description:string;state:State}
type StructureRow={id:string;description:string;state:State;details?:StructureDetail[]}

function readJson<T>(key:string,fallback:T):T{try{const value=JSON.parse(localStorage.getItem(key)??'null');return value??fallback}catch{return fallback}}
function dateRank(value:string){const match=value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return match?Number(`${match[3]}${match[2]}${match[1]}`):0}
function currentBilling(row:PropertyRow){const history=Array.isArray(row.billingHistory)?row.billingHistory:[];return history.find(item=>!item.until)??[...history].sort((a,b)=>dateRank(b.from)-dateRank(a.from))[0]}
function formatAmount(value:number,decimals=2){return value.toLocaleString('es-EC',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})}
function normalizeCustomerName(value:string|undefined){return (value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g,' ').trim()}

export function PropertyOwnerSummaryPage({screen}:{screen:ScreenSpec}){
  const [search,setSearch]=useState('')
  const properties=readJson<PropertyRow[]>('saga.property-detail',[])
  const customers=readJson<CustomerRow[]>('saga.customers',[])
  const sections=readJson<SectionRow[]>('saga.property-sections',[])
  const structures=readJson<Record<string,StructureRow[]>>('saga.property-type-structure',{})
  const customerByName=new Map(customers.map(customer=>[normalizeCustomerName(customer.businessName),customer]))
  const contactFor=(name:string|undefined,fallback?:{phone?:string;address?:string;email?:string})=>{
    const customer=customerByName.get(normalizeCustomerName(name))
    return {name:name?.trim()||customer?.businessName||'—',phone:customer?.phone||fallback?.phone||'—',address:customer?.address||fallback?.address||'—',email:customer?.email||fallback?.email||'—'}
  }
  const sectionLabel=(id:string)=>sections.find(section=>section.id===id)?.description??'—'
  const divisionLabel=(key:string)=>{
    const [type,parentId,detailId]=key.split('|')
    const parent=(structures[type]??[]).find(row=>row.id===parentId)
    const detail=parent?.details?.find(row=>row.id===detailId)
    return detail?`${parent?.description} - ${detail.description}`:parent?.description??'—'
  }
  const aliquotValue=(row:PropertyRow)=>{
    const section=sections.find(item=>item.id===row.sectionId)
    const rate=section?.rates?.find(item=>!item.until)??[...(section?.rates??[])].sort((a,b)=>dateRank(b.from)-dateRank(a.from))[0]
    return Number(row.usableArea||0)*Number(rate?.value||0)
  }
  const filteredProperties=properties.filter(row=>{const billing=currentBilling(row);const billedToName=billing?.billedToName||(billing?.billedTo==='INQUILINO'?billing?.tenant:billing?.owner);const owner=contactFor(billing?.owner,{phone:billing?.ownerPhone,address:billing?.ownerAddress,email:billing?.ownerEmail});const invoiced=contactFor(billedToName);return [row.description,sectionLabel(row.sectionId),divisionLabel(row.divisionKey),row.usableArea,formatAmount(aliquotValue(row)),owner.name,owner.phone,owner.address,owner.email,invoiced.name,invoiced.phone,invoiced.address,invoiced.email,row.payer].join(' ').toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'))})
  return <div className="page screen-page property-owner-summary-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div><label className="screen-table-search"><Search/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar cualquier registro" aria-label="Buscar en Resumen de Propietarios"/></label></section>
    <div className="property-owner-summary-scroll"><table><thead><tr className="property-owner-summary-groups"><th colSpan={5}>Información Inmueble</th><th colSpan={4}>Información Propietario</th><th colSpan={5}>Información Facturación</th></tr><tr><th>Descripción</th><th>Sección</th><th>División</th><th>Mt2</th><th>Valor Alícuota</th><th>Nombre</th><th>Teléfono</th><th>Dirección</th><th>Email</th><th>Nombre</th><th>Teléfono</th><th>Dirección</th><th>Email</th><th>Quién Paga</th></tr></thead><tbody>{filteredProperties.map(row=>{const billing=currentBilling(row);const billedToName=billing?.billedToName||(billing?.billedTo==='INQUILINO'?billing?.tenant:billing?.owner);const owner=contactFor(billing?.owner,{phone:billing?.ownerPhone,address:billing?.ownerAddress,email:billing?.ownerEmail});const invoiced=contactFor(billedToName);return <tr key={row.id}><td><strong>{row.description}</strong></td><td>{sectionLabel(row.sectionId)}</td><td>{divisionLabel(row.divisionKey)}</td><td className="property-owner-summary-number">{formatAmount(Number(row.usableArea||0),6)}</td><td className="property-owner-summary-number">{formatAmount(aliquotValue(row))}</td><td>{owner.name}</td><td>{owner.phone}</td><td>{owner.address}</td><td>{owner.email}</td><td>{invoiced.name}</td><td>{invoiced.phone}</td><td>{invoiced.address}</td><td>{invoiced.email}</td><td>{row.payer||'—'}</td></tr>})}{!filteredProperties.length&&<tr><td colSpan={14}><div className="property-owner-summary-empty"><UsersRound/><strong>{search?'Sin coincidencias':'Sin inmuebles registrados'}</strong><span>{search?'Prueba con otro dato de las columnas.':'La información aparecerá cuando existan registros en Detalle Inmuebles.'}</span></div></td></tr>}</tbody></table></div>
  </div>
}
