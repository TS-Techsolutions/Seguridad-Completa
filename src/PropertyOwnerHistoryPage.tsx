import { useState } from 'react'
import { ChevronRight, Eye, History, Search, X } from 'lucide-react'
import type { ScreenSpec } from './types'

type State='ACTIVO'|'INACTIVO'
type Photo={name:string;dataUrl:string}
type BillingHistory={id:string;owner:string;tenant:string;billedTo:'PROPIETARIO'|'INQUILINO';billedToName?:string;from:string;until:string}
type PropertyRow={id:string;description:string;sectionId:string;divisionKey:string;cadastralCode:string;housingUnit:string;usableArea:string;payer?:string;generationMode?:'AUTOMATICA'|'INDIVIDUAL';state:State;photo?:Photo;billingHistory?:BillingHistory[]}
type CustomerRow={id:string;businessName:string}
type SectionRow={id:string;description:string}
type StructureDetail={id:string;description:string;state:State}
type StructureRow={id:string;description:string;state:State;details?:StructureDetail[]}
type HistoryLine={property:PropertyRow;billing?:BillingHistory;ownerName:string;tenantName:string;billedToName:string}

function readJson<T>(key:string,fallback:T):T{try{const value=JSON.parse(localStorage.getItem(key)??'null');return value??fallback}catch{return fallback}}
function dateRank(value:string){const match=value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return match?Number(`${match[3]}${match[2]}${match[1]}`):0}
function normalizedName(value:string|undefined){return (value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g,' ').trim()}
function Status({value}:{value:State}){return <span className={`status s-${value.toLowerCase()}`}><i/>{value==='ACTIVO'?'Activo':'Inactivo'}</span>}

export function PropertyOwnerHistoryPage({screen}:{screen:ScreenSpec}){
  const [search,setSearch]=useState('')
  const [viewPhoto,setViewPhoto]=useState<Photo|null>(null)
  const properties=readJson<PropertyRow[]>('saga.property-detail',[])
  const customers=readJson<CustomerRow[]>('saga.customers',[])
  const sections=readJson<SectionRow[]>('saga.property-sections',[])
  const structures=readJson<Record<string,StructureRow[]>>('saga.property-type-structure',{})
  const customerByName=new Map(customers.map(customer=>[normalizedName(customer.businessName),customer.businessName.trim()]))
  const fullCustomerName=(value:string|undefined)=>customerByName.get(normalizedName(value))??value?.trim()??''
  const sectionLabel=(id:string)=>sections.find(section=>section.id===id)?.description??'—'
  const divisionLabel=(key:string)=>{const [type,parentId,detailId]=key.split('|');const parent=(structures[type]??[]).find(row=>row.id===parentId);const detail=parent?.details?.find(row=>row.id===detailId);return detail?`${parent?.description} - ${detail.description}`:parent?.description??'—'}
  const historyLine=(property:PropertyRow,billing?:BillingHistory):HistoryLine=>{const ownerName=fullCustomerName(billing?.owner);const tenantName=fullCustomerName(billing?.tenant);const billedToName=fullCustomerName(billing?.billedToName)||(billing?.billedTo==='INQUILINO'?tenantName:ownerName);return{property,billing,ownerName,tenantName,billedToName}}
  const lines:HistoryLine[]=properties.flatMap(property=>{const history=Array.isArray(property.billingHistory)?[...property.billingHistory].sort((a,b)=>dateRank(b.from)-dateRank(a.from)):[];return history.length?history.map(billing=>historyLine(property,billing)):[historyLine(property)]})
  const filtered=lines.filter(({property,billing,ownerName,tenantName,billedToName})=>[property.description,sectionLabel(property.sectionId),divisionLabel(property.divisionKey),property.cadastralCode,property.housingUnit,property.usableArea,property.generationMode,ownerName,tenantName,billedToName,property.payer,billing?.from,billing?.until||'actual vigente',property.state,property.photo?.name].join(' ').toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')))
  return <div className="page screen-page property-history-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div><label className="screen-table-search"><Search/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar cualquier registro" aria-label="Buscar en Reporte Histórico de Propietarios"/></label></section>
    <div className="property-history-scroll"><table><thead><tr><th>Descripción</th><th>Sección</th><th>División</th><th>Código Catastral</th><th>Unidad Habitacional</th><th>Área Útil</th><th>Tipo de Generación</th><th>Propietario</th><th>Inquilino</th><th>Se Factura a</th><th>Quién Paga</th><th>Desde</th><th>Hasta</th><th>Estado</th><th>Foto</th></tr></thead><tbody>{filtered.map(({property,billing,ownerName,tenantName,billedToName},index)=><tr key={`${property.id}-${billing?.id??index}`}><td><strong>{property.description}</strong></td><td>{sectionLabel(property.sectionId)}</td><td>{divisionLabel(property.divisionKey)}</td><td>{property.cadastralCode}</td><td>{property.housingUnit}</td><td className="property-number">{Number(property.usableArea||0).toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:6})}</td><td>{property.generationMode==='INDIVIDUAL'?'Individual':'Automática'}</td><td>{ownerName||'—'}</td><td>{tenantName||'—'}</td><td>{billedToName||'—'}</td><td>{property.payer||'—'}</td><td>{billing?.from||'—'}</td><td>{billing?.until||<span className="property-current-billing">Actual</span>}</td><td><Status value={property.state}/></td><td>{property.photo&&<button className="row-action property-photo-action" title={`Ver foto de ${property.description}`} aria-label={`Ver foto de ${property.description}`} onClick={()=>setViewPhoto(property.photo??null)}><Eye/></button>}</td></tr>)}{!filtered.length&&<tr><td colSpan={15}><div className="property-history-empty"><History/><strong>{search?'Sin coincidencias':'Sin historial registrado'}</strong><span>{search?'Prueba con otro dato de las columnas.':'Los cambios de propietario y facturación aparecerán en esta tabla.'}</span></div></td></tr>}</tbody></table></div>
    {viewPhoto&&<div className="property-photo-backdrop" role="presentation" onMouseDown={()=>setViewPhoto(null)}><section className="property-photo-dialog" role="dialog" aria-modal="true" aria-label="Foto del inmueble" onMouseDown={event=>event.stopPropagation()}><header><strong>{viewPhoto.name}</strong><button type="button" aria-label="Cerrar foto" onClick={()=>setViewPhoto(null)}><X/></button></header><img src={viewPhoto.dataUrl} alt="Foto del inmueble"/></section></div>}
  </div>
}
