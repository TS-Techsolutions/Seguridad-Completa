import { useMemo, useState, type FormEvent } from 'react'
import { Building2, ChevronRight, Pencil, Plus } from 'lucide-react'
import type { ScreenSpec } from './types'

type State='ACTIVO'|'INACTIVO'
type StructureDetail={id:string;description:string;state:State}
type StructureRow={id:string;description:string;state:State;details?:StructureDetail[]}
type SectionRow={id:string;description:string;state:State}
type DivisionOption={key:string;label:string}
type PropertyRow={id:string;description:string;sectionId:string;divisionKey:string;cadastralCode:string;housingUnit:string;usableArea:string;generationType:'CLIENTE'|'INMUEBLE';owner:string;tenant:string;billedTo:'PROPIETARIO'|'INQUILINO';state:State}

const storageKey='saga.property-detail'
const emptyRow:Omit<PropertyRow,'id'>={description:'',sectionId:'',divisionKey:'',cadastralCode:'',housingUnit:'',usableArea:'',generationType:'CLIENTE',owner:'',tenant:'',billedTo:'PROPIETARIO',state:'ACTIVO'}

function readJson<T>(key:string,fallback:T):T{try{const value=JSON.parse(localStorage.getItem(key)??'null');return value??fallback}catch{return fallback}}
function readSections():SectionRow[]{const stored=readJson<SectionRow[]>('saga.property-sections',[]);return stored.length?stored:[{id:'SEC-A',description:'Departamentos',state:'ACTIVO'},{id:'SEC-B',description:'Locales comerciales',state:'ACTIVO'},{id:'SEC-C',description:'Parqueaderos',state:'INACTIVO'}]}
function readDivisions():DivisionOption[]{
  const source=readJson<Record<string,StructureRow[]>>('saga.property-type-structure',{})
  const options=Object.entries(source).flatMap(([type,rows])=>(Array.isArray(rows)?rows:[]).filter(row=>row.state==='ACTIVO').flatMap(parent=>{const details=(Array.isArray(parent.details)?parent.details:[]).filter(detail=>detail.state==='ACTIVO');return details.length?details.map(detail=>({key:`${type}|${parent.id}|${detail.id}`,label:`${parent.description} - ${detail.description}`})):[{key:`${type}|${parent.id}|`,label:parent.description}] }))
  return options.filter((option,index)=>options.findIndex(candidate=>candidate.label.localeCompare(option.label,'es',{sensitivity:'base'})===0)===index)
}
function readGenerationType(){const company=readJson<{generationType?:'CLIENTE'|'INMUEBLE'}>('saga.security.company',{});return company.generationType??'CLIENTE'}
function Status({value}:{value:State}){return <span className={`status s-${value.toLowerCase()}`}><i/>{value==='ACTIVO'?'Activo':'Inactivo'}</span>}

export function PropertyDetailPage({screen}:{screen:ScreenSpec}){
  const sections=useMemo(readSections,[])
  const divisions=useMemo(readDivisions,[])
  const [rows,setRows]=useState<PropertyRow[]>(()=>readJson<PropertyRow[]>(storageKey,[]))
  const [formOpen,setFormOpen]=useState(false)
  const [editingId,setEditingId]=useState<string|null>(null)
  const [draft,setDraft]=useState<Omit<PropertyRow,'id'>>(()=>({...emptyRow,generationType:readGenerationType(),sectionId:sections.find(row=>row.state==='ACTIVO')?.id??'',divisionKey:divisions[0]?.key??''}))
  const [error,setError]=useState('')
  const sectionLabel=(id:string)=>sections.find(section=>section.id===id)?.description??'—'
  const divisionLabel=(key:string)=>divisions.find(option=>option.key===key)?.label??'—'
  const persist=(next:PropertyRow[])=>{setRows(next);localStorage.setItem(storageKey,JSON.stringify(next))}
  const openNew=()=>{setEditingId(null);setDraft({...emptyRow,generationType:readGenerationType(),sectionId:sections.find(row=>row.state==='ACTIVO')?.id??'',divisionKey:divisions[0]?.key??''});setError('');setFormOpen(true)}
  const openEdit=(row:PropertyRow)=>{setEditingId(row.id);setDraft({...row});setError('');setFormOpen(true)}
  const close=()=>{setFormOpen(false);setEditingId(null);setError('')}
  const save=(event:FormEvent)=>{
    event.preventDefault()
    if(!draft.description.trim()||!draft.sectionId||!draft.divisionKey||!draft.cadastralCode.trim()||!draft.housingUnit.trim()||!draft.usableArea||!draft.owner.trim()){setError('Completa los campos obligatorios y selecciona una división configurada.');return}
    if(!/^\d+(?:[.,]\d{1,6})?$/.test(draft.usableArea)){setError('Área Útil debe ser un número válido de hasta 6 decimales.');return}
    const row:PropertyRow={...draft,id:editingId??crypto.randomUUID(),description:draft.description.trim(),cadastralCode:draft.cadastralCode.trim(),housingUnit:draft.housingUnit.trim(),usableArea:draft.usableArea.replace(',','.'),owner:draft.owner.trim(),tenant:draft.tenant.trim()}
    persist(editingId?rows.map(item=>item.id===editingId?row:item):[row,...rows]);close()
  }
  return <div className="page screen-page property-detail-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div><button className="primary-action" onClick={openNew}><Plus/>Nuevo Inmueble</button></section>
    {formOpen&&<section className="panel property-detail-editor"><header><div><h2>{editingId?'Editar Inmueble':'Nuevo Inmueble'}</h2></div></header><form onSubmit={save}><label>Descripción <span>Obligatorio</span><input autoFocus maxLength={120} value={draft.description} onChange={event=>{setDraft({...draft,description:event.target.value});setError('')}}/></label><label>Sección <span>Obligatorio</span><select value={draft.sectionId} onChange={event=>setDraft({...draft,sectionId:event.target.value})}><option value="">Seleccionar</option>{sections.filter(row=>row.state==='ACTIVO'||row.id===draft.sectionId).map(row=><option key={row.id} value={row.id}>{row.description}</option>)}</select></label><label>División <span>Obligatorio</span><select value={draft.divisionKey} onChange={event=>setDraft({...draft,divisionKey:event.target.value})}><option value="">{divisions.length?'Seleccionar':'Configure Definición de Estructura'}</option>{divisions.map(option=><option key={option.key} value={option.key}>{option.label}</option>)}</select></label><label>Código Catastral <span>Obligatorio</span><input maxLength={60} value={draft.cadastralCode} onChange={event=>setDraft({...draft,cadastralCode:event.target.value})}/></label><label>Unidad Habitacional <span>Obligatorio</span><input maxLength={60} value={draft.housingUnit} onChange={event=>setDraft({...draft,housingUnit:event.target.value})}/></label><label>Área Útil <span>Obligatorio</span><input inputMode="decimal" placeholder="0.000000" value={draft.usableArea} onChange={event=>setDraft({...draft,usableArea:event.target.value})}/></label><label>Tipo de Generación<select value={draft.generationType} onChange={event=>setDraft({...draft,generationType:event.target.value as PropertyRow['generationType']})}><option value="CLIENTE">Generación por Cliente</option><option value="INMUEBLE">Generación por Inmueble</option></select></label><label>Propietario <span>Obligatorio</span><input maxLength={120} value={draft.owner} onChange={event=>setDraft({...draft,owner:event.target.value})}/></label><label>Inquilino<input maxLength={120} value={draft.tenant} onChange={event=>setDraft({...draft,tenant:event.target.value})}/></label><label>Se Factura a<select value={draft.billedTo} onChange={event=>setDraft({...draft,billedTo:event.target.value as PropertyRow['billedTo']})}><option value="PROPIETARIO">Propietario</option><option value="INQUILINO">Inquilino</option></select></label><label>Estado<select value={draft.state} onChange={event=>setDraft({...draft,state:event.target.value as State})}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label>{error&&<div className="property-detail-error" role="alert">{error}</div>}<footer><button type="button" className="quiet-button" onClick={close}>Cancelar</button><button className="primary-action">Guardar</button></footer></form></section>}
    <section className="panel property-detail-grid"><div className="property-detail-scroll"><table><thead><tr><th aria-label="Editar"/><th>Descripción</th><th>Sección</th><th>División</th><th>Código Catastral</th><th>Unidad Habitacional</th><th>Área Útil</th><th>Tipo de Generación</th><th>Propietario</th><th>Inquilino</th><th>Se Factura a</th><th>Estado</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><button className="row-action" title={`Editar ${row.description}`} aria-label={`Editar ${row.description}`} onClick={()=>openEdit(row)}><Pencil/></button></td><td><strong>{row.description}</strong></td><td>{sectionLabel(row.sectionId)}</td><td>{divisionLabel(row.divisionKey)}</td><td>{row.cadastralCode}</td><td>{row.housingUnit}</td><td className="property-number">{Number(row.usableArea).toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:6})}</td><td>{row.generationType==='CLIENTE'?'Generación por Cliente':'Generación por Inmueble'}</td><td>{row.owner}</td><td>{row.tenant||'—'}</td><td>{row.billedTo==='PROPIETARIO'?'Propietario':'Inquilino'}</td><td><Status value={row.state}/></td></tr>)}{!rows.length&&<tr><td colSpan={12}><div className="property-detail-empty"><Building2/><strong>Sin inmuebles registrados</strong><span>Selecciona Nuevo Inmueble para crear el primer registro.</span></div></td></tr>}</tbody></table></div></section>
  </div>
}
