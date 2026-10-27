import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, ChevronRight, Plus, UserPlus, UsersRound } from 'lucide-react'
import type { ScreenSpec } from './types'
import type { CustomerRow } from './CustomerRegistryPage'

type State='ACTIVO'|'INACTIVO'
type BillingHistory={id:string;owner:string;tenant:string;billedTo:'PROPIETARIO'|'INQUILINO';from:string;until:string}
type PropertyRow={id:string;description:string;sectionId:string;divisionKey:string;state:State;billingHistory?:BillingHistory[]}
type SectionRow={id:string;description:string}
type StructureDetail={id:string;description:string;state:State}
type StructureRow={id:string;description:string;state:State;details?:StructureDetail[]}
type RecipientGroup={id:string;name:string;memberIds:string[];automatic?:'OWNERS'|'RESIDENTS'}
type Relation={property:PropertyRow;billing:BillingHistory;owner:boolean;tenant:boolean}

const groupsKey='saga.recipient-groups'
const defaultGroups:RecipientGroup[]=[{id:'DEFAULT-OWNERS',name:'Propietarios',memberIds:[],automatic:'OWNERS'},{id:'DEFAULT-RESIDENTS',name:'Residentes',memberIds:[],automatic:'RESIDENTS'}]
function readJson<T>(key:string,fallback:T):T{try{const value=JSON.parse(localStorage.getItem(key)??'null');return value??fallback}catch{return fallback}}
function dateRank(value:string){const match=value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return match?Number(`${match[3]}${match[2]}${match[1]}`):0}
function currentBilling(property:PropertyRow){const history=Array.isArray(property.billingHistory)?property.billingHistory:[];return history.find(item=>!item.until)??[...history].sort((a,b)=>dateRank(b.from)-dateRank(a.from))[0]}
function normalized(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('es')}
function readGroups(){const stored=readJson<RecipientGroup[]>(groupsKey,[]).filter(group=>!defaultGroups.some(item=>item.id===group.id));return[...defaultGroups,...stored]}

export function RecipientConfigurationPage({screen}:{screen:ScreenSpec}){
  const [customers,setCustomers]=useState<CustomerRow[]>(()=>readJson('saga.customers',[]))
  const [properties,setProperties]=useState<PropertyRow[]>(()=>readJson('saga.property-detail',[]))
  const [groups,setGroups]=useState<RecipientGroup[]>(readGroups)
  const [selectedGroupId,setSelectedGroupId]=useState('DEFAULT-OWNERS')
  const [creating,setCreating]=useState(false)
  const [groupName,setGroupName]=useState('')
  const [error,setError]=useState('')
  const sections=readJson<SectionRow[]>('saga.property-sections',[])
  const structures=readJson<Record<string,StructureRow[]>>('saga.property-type-structure',{})
  useEffect(()=>{const refresh=(event:StorageEvent)=>{if(event.key==='saga.customers')setCustomers(readJson('saga.customers',[]));if(event.key==='saga.property-detail')setProperties(readJson('saga.property-detail',[]))};window.addEventListener('storage',refresh);return()=>window.removeEventListener('storage',refresh)},[])
  const sectionLabel=(id:string)=>sections.find(section=>section.id===id)?.description??'—'
  const divisionLabel=(key:string)=>{const [type,parentId,detailId]=key.split('|');const parent=(structures[type]??[]).find(row=>row.id===parentId);const detail=parent?.details?.find(row=>row.id===detailId);return detail?`${parent?.description} - ${detail.description}`:parent?.description??'—'}
  const selectedGroup=groups.find(group=>group.id===selectedGroupId)??groups[0]
  const customerRelations=useMemo(()=>customers.map(customer=>{const name=normalized(customer.businessName);const relations=properties.flatMap(property=>{const billing=currentBilling(property);if(!billing)return[];const owner=name===normalized(billing.owner);const explicitTenant=Boolean(billing.tenant.trim());const tenant=explicitTenant?name===normalized(billing.tenant):owner;return owner||tenant?[{property,billing,owner,tenant}]:[]});return{customer,relations:relations.length?relations:[null] as Array<Relation|null>}}),[customers,properties])
  const automaticApplies=(group:RecipientGroup,relations:Array<Relation|null>)=>group.automatic==='OWNERS'?relations.some(relation=>relation?.owner):group.automatic==='RESIDENTS'?relations.some(relation=>relation?.tenant):false
  const isMember=(group:RecipientGroup,customer:CustomerRow,relations:Array<Relation|null>)=>group.automatic?automaticApplies(group,relations):group.memberIds.includes(customer.id)
  const groupCount=(group:RecipientGroup)=>customerRelations.filter(({customer,relations})=>isMember(group,customer,relations)).length
  const persist=(next:RecipientGroup[])=>{setGroups(next);localStorage.setItem(groupsKey,JSON.stringify(next.filter(group=>!group.automatic)))}
  const createGroup=(event:FormEvent)=>{event.preventDefault();const name=groupName.trim();if(!name){setError('Ingresa un nombre para el grupo.');return}if(groups.some(group=>normalized(group.name)===normalized(name))){setError('Ya existe un grupo con este nombre.');return}const group:RecipientGroup={id:crypto.randomUUID(),name,memberIds:[]};const next=[...groups,group];persist(next);setSelectedGroupId(group.id);setGroupName('');setError('');setCreating(false)}
  const toggleMember=(customerId:string)=>{if(selectedGroup.automatic)return;const next=groups.map(group=>group.id===selectedGroup.id?{...group,memberIds:group.memberIds.includes(customerId)?group.memberIds.filter(id=>id!==customerId):[...group.memberIds,customerId]}:group);persist(next)}
  return <div className="page screen-page recipient-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div><button className="primary-action" onClick={()=>{setCreating(!creating);setError('')}}><Plus/>{creating?'Cerrar':'Nuevo grupo de distribución'}</button></section>
    {creating&&<form className="recipient-create-group" onSubmit={createGroup}><label>Nombre del grupo <span>Obligatorio</span><input autoFocus maxLength={80} value={groupName} onChange={event=>{setGroupName(event.target.value);setError('')}} placeholder="Ej. Comité de administración"/></label>{error&&<div role="alert">{error}</div>}<button className="primary-action">Crear grupo</button></form>}
    <nav className="recipient-groups" aria-label="Grupos de distribución">{groups.map(group=><button key={group.id} className={group.id===selectedGroup.id?'active':''} onClick={()=>setSelectedGroupId(group.id)}><span>{group.name}</span><b>{groupCount(group)}</b></button>)}</nav>
    <div className="recipient-table-scroll"><table><thead><tr><th>Cliente</th><th>Identificación</th><th>Email</th><th>Propietario</th><th>Inquilino</th><th>Inmueble</th><th>Sección</th><th>División</th><th>{selectedGroup.name}</th></tr></thead><tbody>{customerRelations.flatMap(({customer,relations})=>relations.map((relation,index)=>{const member=isMember(selectedGroup,customer,relations);return <tr key={`${customer.id}-${relation?.property.id??'none'}`} className={index===0?'recipient-group-start':''}>{index===0&&<><td rowSpan={relations.length}><strong>{customer.businessName}</strong></td><td rowSpan={relations.length}>{customer.identification}</td><td rowSpan={relations.length}>{customer.email||'—'}</td></>}<td className="recipient-check">{relation?.owner&&<Check aria-label="Aplica como propietario"/>}</td><td className="recipient-check">{relation?.tenant&&<Check aria-label={relation.billing.tenant?'Aplica como inquilino':'Aplica como residente porque no existe inquilino separado'}/>}</td><td>{relation?.property.description??'—'}</td><td>{relation?sectionLabel(relation.property.sectionId):'—'}</td><td>{relation?divisionLabel(relation.property.divisionKey):'—'}</td>{index===0&&<td rowSpan={relations.length}><button className={`recipient-add ${member?'selected':''}`} disabled={Boolean(selectedGroup.automatic)} onClick={()=>toggleMember(customer.id)}>{selectedGroup.automatic?(member?<><Check/>Incluido</>:'No aplica'):(member?<><Check/>Agregado</>:<><UserPlus/>Agregar</>)}</button></td>}</tr>}))}{!customerRelations.length&&<tr><td colSpan={9}><div className="recipient-empty"><UsersRound/><strong>Sin clientes configurados</strong><span>Registra clientes e inmuebles para construir los grupos de destinatarios.</span></div></td></tr>}</tbody></table></div>
  </div>
}
