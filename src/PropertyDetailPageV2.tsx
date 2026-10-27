import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { AlertTriangle, Building2, ChevronRight, Eye, ImagePlus, Pencil, Plus, Search, X } from 'lucide-react'
import type { ScreenSpec } from './types'

type State='ACTIVO'|'INACTIVO'
type StructureDetail={id:string;description:string;state:State}
type StructureRow={id:string;description:string;state:State;details?:StructureDetail[]}
type SectionRow={id:string;description:string;state:State}
type DivisionOption={key:string;label:string}
type BillingHistory={id:string;owner:string;tenant:string;billedTo:'PROPIETARIO'|'INQUILINO';from:string;until:string}
type Photo={name:string;dataUrl:string}
type PropertyRow={id:string;description:string;sectionId:string;divisionKey:string;cadastralCode:string;housingUnit:string;usableArea:string;generationMode:'AUTOMATICA'|'INDIVIDUAL';state:State;photo?:Photo;billingHistory:BillingHistory[]}
type PropertyDraft=Omit<PropertyRow,'id'>

const storageKey='saga.property-detail'
const emptyBilling:Omit<BillingHistory,'id'>={owner:'',tenant:'',billedTo:'PROPIETARIO',from:'',until:''}
const emptyRow:PropertyDraft={description:'',sectionId:'',divisionKey:'',cadastralCode:'',housingUnit:'',usableArea:'',generationMode:'AUTOMATICA',state:'ACTIVO',billingHistory:[]}

function readJson<T>(key:string,fallback:T):T{try{const value=JSON.parse(localStorage.getItem(key)??'null');return value??fallback}catch{return fallback}}
function readSections():SectionRow[]{const stored=readJson<SectionRow[]>('saga.property-sections',[]);return stored.length?stored:[{id:'SEC-A',description:'Departamentos',state:'ACTIVO'},{id:'SEC-B',description:'Locales comerciales',state:'ACTIVO'},{id:'SEC-C',description:'Parqueaderos',state:'INACTIVO'}]}
function readDivisions():DivisionOption[]{
  const source=readJson<Record<string,StructureRow[]>>('saga.property-type-structure',{})
  const options=Object.entries(source).flatMap(([type,rows])=>(Array.isArray(rows)?rows:[]).filter(row=>row.state==='ACTIVO').flatMap(parent=>{const details=(Array.isArray(parent.details)?parent.details:[]).filter(detail=>detail.state==='ACTIVO');return details.length?details.map(detail=>({key:`${type}|${parent.id}|${detail.id}`,label:`${parent.description} - ${detail.description}`})):[{key:`${type}|${parent.id}|`,label:parent.description}] }))
  return options.filter((option,index)=>options.findIndex(candidate=>candidate.label.localeCompare(option.label,'es',{sensitivity:'base'})===0)===index)
}
function validDate(value:string){if(!/^\d{2}\/\d{2}\/\d{4}$/.test(value))return false;const [day,month,year]=value.split('/').map(Number);const date=new Date(year,month-1,day);return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day}
function dateRank(value:string){if(!validDate(value))return 0;const [day,month,year]=value.split('/').map(Number);return new Date(year,month-1,day).getTime()}
function orderedHistory(history:BillingHistory[]){return [...history].sort((a,b)=>dateRank(b.from)-dateRank(a.from))}
function currentBilling(row:PropertyRow){return row.billingHistory.find(item=>!item.until)??orderedHistory(row.billingHistory)[0]}
function normalizeRows():PropertyRow[]{
  const stored=readJson<Array<PropertyRow&{owner?:string;tenant?:string;billedTo?:'PROPIETARIO'|'INQUILINO';generationType?:'CLIENTE'|'INMUEBLE'}>>(storageKey,[])
  return stored.map(row=>({...row,generationMode:row.generationMode??(row.generationType==='INMUEBLE'?'INDIVIDUAL':'AUTOMATICA'),billingHistory:Array.isArray(row.billingHistory)?orderedHistory(row.billingHistory):row.owner?[{id:crypto.randomUUID(),owner:row.owner,tenant:row.tenant??'',billedTo:row.billedTo??'PROPIETARIO',from:'',until:''}]:[]}))
}
function Status({value}:{value:State}){return <span className={`status s-${value.toLowerCase()}`}><i/>{value==='ACTIVO'?'Activo':'Inactivo'}</span>}

export function PropertyDetailPageV2({screen}:{screen:ScreenSpec}){
  const sections=useMemo(readSections,[])
  const divisions=useMemo(readDivisions,[])
  const [rows,setRows]=useState<PropertyRow[]>(normalizeRows)
  const [formOpen,setFormOpen]=useState(false)
  const [editingId,setEditingId]=useState<string|null>(null)
  const [draft,setDraft]=useState<PropertyDraft>(()=>({...emptyRow,sectionId:sections.find(row=>row.state==='ACTIVO')?.id??'',divisionKey:divisions[0]?.key??''}))
  const [billingOpen,setBillingOpen]=useState(false)
  const [editingBillingId,setEditingBillingId]=useState<string|null>(null)
  const [billingDraft,setBillingDraft]=useState<Omit<BillingHistory,'id'>>({...emptyBilling})
  const [error,setError]=useState('')
  const [billingError,setBillingError]=useState('')
  const [photoError,setPhotoError]=useState('')
  const [viewPhoto,setViewPhoto]=useState<Photo|null>(null)
  const [search,setSearch]=useState('')
  const sectionLabel=(id:string)=>sections.find(section=>section.id===id)?.description??'—'
  const divisionLabel=(key:string)=>divisions.find(option=>option.key===key)?.label??'—'
  const filteredRows=rows.filter(row=>{const billing=currentBilling(row);return [row.description,sectionLabel(row.sectionId),divisionLabel(row.divisionKey),row.cadastralCode,row.housingUnit,row.usableArea,row.generationMode,billing?.owner,billing?.tenant,billing?.billedTo,row.state,row.photo?.name].join(' ').toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'))})
  const persist=(next:PropertyRow[])=>{setRows(next);localStorage.setItem(storageKey,JSON.stringify(next))}
  const resetBilling=()=>{setBillingOpen(false);setEditingBillingId(null);setBillingDraft({...emptyBilling});setBillingError('')}
  const openNew=()=>{setEditingId(null);setDraft({...emptyRow,sectionId:sections.find(row=>row.state==='ACTIVO')?.id??'',divisionKey:divisions[0]?.key??''});setError('');setPhotoError('');resetBilling();setFormOpen(true)}
  const openEdit=(row:PropertyRow)=>{setEditingId(row.id);setDraft({...row,billingHistory:orderedHistory(row.billingHistory)});setError('');setPhotoError('');resetBilling();setFormOpen(true)}
  const close=()=>{setFormOpen(false);setEditingId(null);setError('');setPhotoError('');resetBilling()}
  const save=(event:FormEvent)=>{
    event.preventDefault()
    if(!draft.description.trim()||!draft.sectionId||!draft.divisionKey||!draft.cadastralCode.trim()||!draft.housingUnit.trim()||!draft.usableArea){setError('Completa los campos obligatorios y selecciona una división configurada.');return}
    if(!/^\d+(?:[.,]\d{1,6})?$/.test(draft.usableArea)){setError('Área Útil debe ser un número válido de hasta 6 decimales.');return}
    const row:PropertyRow={...draft,id:editingId??crypto.randomUUID(),description:draft.description.trim(),cadastralCode:draft.cadastralCode.trim(),housingUnit:draft.housingUnit.trim(),usableArea:draft.usableArea.replace(',','.'),billingHistory:orderedHistory(draft.billingHistory)}
    persist(editingId?rows.map(item=>item.id===editingId?row:item):[row,...rows]);close()
  }
  const openNewBilling=()=>{setEditingBillingId(null);setBillingDraft({...emptyBilling});setBillingError('');setBillingOpen(true)}
  const openEditBilling=(item:BillingHistory)=>{setEditingBillingId(item.id);setBillingDraft({...item});setBillingError('');setBillingOpen(true)}
  const saveBilling=()=>{
    if(!billingDraft.owner.trim()||!billingDraft.from){setBillingError('Completa Propietario y Desde para registrar la forma de facturación.');return}
    if(!validDate(billingDraft.from)||(Boolean(billingDraft.until)&&!validDate(billingDraft.until))){setBillingError('Las fechas deben ser válidas y tener el formato DD/MM/AAAA.');return}
    if(billingDraft.until&&dateRank(billingDraft.until)<dateRank(billingDraft.from)){setBillingError('La fecha Hasta no puede ser anterior a la fecha Desde.');return}
    if(billingDraft.billedTo==='INQUILINO'&&!billingDraft.tenant.trim()){setBillingError('Registra el Inquilino cuando la facturación se asigna al inquilino.');return}
    if(!billingDraft.until&&draft.billingHistory.some(item=>!item.until&&item.id!==editingBillingId)){setBillingError('Ya existe una forma actual de facturar con la fecha Hasta en blanco. Completa la información correcta.');return}
    const item:BillingHistory={...billingDraft,id:editingBillingId??crypto.randomUUID(),owner:billingDraft.owner.trim(),tenant:billingDraft.tenant.trim()}
    setDraft({...draft,billingHistory:orderedHistory(editingBillingId?draft.billingHistory.map(row=>row.id===editingBillingId?item:row):[item,...draft.billingHistory])});resetBilling()
  }
  const uploadPhoto=(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0]
    event.target.value=''
    if(!file)return
    if(!file.type.startsWith('image/')){setPhotoError('Selecciona un archivo de imagen válido.');return}
    if(file.size>1_500_000){setPhotoError('La foto no puede superar 1,5 MB.');return}
    const reader=new FileReader()
    reader.onload=()=>{setDraft({...draft,photo:{name:file.name,dataUrl:String(reader.result)}});setPhotoError('')}
    reader.onerror=()=>setPhotoError('No fue posible cargar la foto seleccionada.')
    reader.readAsDataURL(file)
  }
  return <div className="page screen-page property-detail-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div><div className="property-screen-actions"><label className="screen-table-search"><Search/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar cualquier registro" aria-label="Buscar en Detalle Inmuebles"/></label><button className="primary-action" onClick={openNew}><Plus/>Nuevo Inmueble</button></div></section>
    {formOpen&&<section className="panel property-detail-editor"><header><h2>{editingId?'Editar Inmueble':'Nuevo Inmueble'}</h2></header><form onSubmit={save}>
      <label>Descripción <span>Obligatorio</span><input autoFocus maxLength={120} value={draft.description} onChange={event=>{setDraft({...draft,description:event.target.value});setError('')}}/></label>
      <label>Sección <span>Obligatorio</span><select value={draft.sectionId} onChange={event=>setDraft({...draft,sectionId:event.target.value})}><option value="">Seleccionar</option>{sections.filter(row=>row.state==='ACTIVO'||row.id===draft.sectionId).map(row=><option key={row.id} value={row.id}>{row.description}</option>)}</select></label>
      <label>División <span>Obligatorio</span><select value={draft.divisionKey} onChange={event=>setDraft({...draft,divisionKey:event.target.value})}><option value="">{divisions.length?'Seleccionar':'Configure Definición de Estructura'}</option>{divisions.map(option=><option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
      <label>Código Catastral <span>Obligatorio</span><input maxLength={60} value={draft.cadastralCode} onChange={event=>setDraft({...draft,cadastralCode:event.target.value})}/></label>
      <label>Unidad Habitacional <span>Obligatorio</span><input maxLength={60} value={draft.housingUnit} onChange={event=>setDraft({...draft,housingUnit:event.target.value})}/></label>
      <label>Área Útil <span>Obligatorio</span><input inputMode="decimal" placeholder="0.000000" value={draft.usableArea} onChange={event=>setDraft({...draft,usableArea:event.target.value})}/></label>
      <div className="property-generation-field"><strong>Tipo Generación</strong><div role="radiogroup" aria-label="Tipo Generación"><label><input type="radio" name="generationMode" value="AUTOMATICA" checked={draft.generationMode==='AUTOMATICA'} onChange={()=>setDraft({...draft,generationMode:'AUTOMATICA'})}/>Automática</label><label><input type="radio" name="generationMode" value="INDIVIDUAL" checked={draft.generationMode==='INDIVIDUAL'} onChange={()=>setDraft({...draft,generationMode:'INDIVIDUAL'})}/>Individual</label></div></div>
      <label>Estado<select value={draft.state} onChange={event=>setDraft({...draft,state:event.target.value as State})}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label>
      <div className="property-photo-field"><strong>Foto</strong><label className="property-photo-picker"><ImagePlus/>{draft.photo?'Cambiar foto':'Cargar foto'}<input type="file" accept="image/*" onChange={uploadPhoto}/></label>{draft.photo&&<div className="property-photo-name"><button type="button" onClick={()=>setViewPhoto(draft.photo??null)}><Eye/>Ver</button><span title={draft.photo.name}>{draft.photo.name}</span><button type="button" aria-label="Quitar foto" title="Quitar foto" onClick={()=>setDraft({...draft,photo:undefined})}><X/></button></div>}{photoError&&<small>{photoError}</small>}</div>
      <section className="property-billing-panel"><header><div><h3>Propietario, Inquilino y Facturación</h3><p>La línea sin fecha Hasta corresponde a la forma actual de facturar.</p></div><button type="button" className="quiet-button" onClick={openNewBilling}><Plus/>Agregar</button></header>
        {billingOpen&&<div className="property-billing-entry"><label>Propietario <span>Obligatorio</span><input maxLength={120} value={billingDraft.owner} onChange={event=>{setBillingDraft({...billingDraft,owner:event.target.value});setBillingError('')}}/></label><label>Inquilino<input maxLength={120} value={billingDraft.tenant} onChange={event=>setBillingDraft({...billingDraft,tenant:event.target.value})}/></label><label>Se Factura a<select value={billingDraft.billedTo} onChange={event=>setBillingDraft({...billingDraft,billedTo:event.target.value as BillingHistory['billedTo']})}><option value="PROPIETARIO">Propietario</option><option value="INQUILINO">Inquilino</option></select></label><label>Desde <span>Obligatorio</span><input inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} value={billingDraft.from} onChange={event=>{setBillingDraft({...billingDraft,from:event.target.value});setBillingError('')}}/></label><label>Hasta<input inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} value={billingDraft.until} onChange={event=>{setBillingDraft({...billingDraft,until:event.target.value});setBillingError('')}}/></label>{billingError&&<div className="property-billing-error" role="alert"><AlertTriangle/>{billingError}</div>}<div className="property-billing-actions"><button type="button" className="quiet-button" onClick={resetBilling}>Cancelar</button><button type="button" className="primary-action" onClick={saveBilling}>{editingBillingId?'Actualizar':'Agregar a la tabla'}</button></div></div>}
        <div className="property-billing-scroll"><table><thead><tr><th aria-label="Editar"/><th>Propietario</th><th>Inquilino</th><th>Se Factura a</th><th>Desde</th><th>Hasta</th></tr></thead><tbody>{orderedHistory(draft.billingHistory).map(item=><tr key={item.id}><td><button type="button" className="row-action" aria-label={`Editar facturación desde ${item.from}`} title="Editar línea" onClick={()=>openEditBilling(item)}><Pencil/></button></td><td>{item.owner}</td><td>{item.tenant||'—'}</td><td>{item.billedTo==='PROPIETARIO'?'Propietario':'Inquilino'}</td><td>{item.from||'—'}</td><td>{item.until||<span className="property-current-billing">Actual</span>}</td></tr>)}{!draft.billingHistory.length&&<tr><td colSpan={6} className="property-billing-empty">No hay información registrada.</td></tr>}</tbody></table></div>
      </section>
      {error&&<div className="property-detail-error" role="alert">{error}</div>}<footer><button type="button" className="quiet-button" onClick={close}>Cancelar</button><button className="primary-action">Guardar</button></footer>
    </form></section>}
    {!formOpen&&<section className="panel property-detail-grid"><div className="property-detail-scroll"><table><thead><tr><th aria-label="Editar"/><th>Descripción</th><th>Sección</th><th>División</th><th>Código Catastral</th><th>Unidad Habitacional</th><th>Área Útil</th><th>Tipo de Generación</th><th>Propietario</th><th>Inquilino</th><th>Se Factura a</th><th>Estado</th><th>Foto</th></tr></thead><tbody>{filteredRows.map(row=>{const billing=currentBilling(row);return <tr key={row.id}><td><button className="row-action" title={`Editar ${row.description}`} aria-label={`Editar ${row.description}`} onClick={()=>openEdit(row)}><Pencil/></button></td><td><strong>{row.description}</strong></td><td>{sectionLabel(row.sectionId)}</td><td>{divisionLabel(row.divisionKey)}</td><td>{row.cadastralCode}</td><td>{row.housingUnit}</td><td className="property-number">{Number(row.usableArea).toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:6})}</td><td>{row.generationMode==='AUTOMATICA'?'Automática':'Individual'}</td><td>{billing?.owner??'—'}</td><td>{billing?.tenant||'—'}</td><td>{billing?(billing.billedTo==='PROPIETARIO'?'Propietario':'Inquilino'):'—'}</td><td><Status value={row.state}/></td><td>{row.photo&&<button className="row-action property-photo-action" title={`Ver foto de ${row.description}`} aria-label={`Ver foto de ${row.description}`} onClick={()=>setViewPhoto(row.photo??null)}><Eye/></button>}</td></tr>})}{!filteredRows.length&&<tr><td colSpan={13}><div className="property-detail-empty"><Building2/><strong>{search?'Sin coincidencias':'Sin inmuebles registrados'}</strong><span>{search?'Prueba con otro dato de las columnas.':'Selecciona Nuevo Inmueble para crear el primer registro.'}</span></div></td></tr>}</tbody></table></div></section>}
    {viewPhoto&&<div className="property-photo-backdrop" role="presentation" onMouseDown={()=>setViewPhoto(null)}><section className="property-photo-dialog" role="dialog" aria-modal="true" aria-label="Foto del inmueble" onMouseDown={event=>event.stopPropagation()}><header><strong>{viewPhoto.name}</strong><button type="button" aria-label="Cerrar foto" onClick={()=>setViewPhoto(null)}><X/></button></header><img src={viewPhoto.dataUrl} alt="Foto del inmueble"/></section></div>}
  </div>
}
