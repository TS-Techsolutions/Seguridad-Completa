import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, CalendarRange, ChevronRight, Pencil, Plus } from 'lucide-react'
import type { ScreenSpec } from './types'

type SectionState='ACTIVO'|'INACTIVO'
type Rate={id:string;from:string;until:string;value:string}
type SectionRow={id:string;description:string;state:SectionState;rates:Rate[]}

const storageKey='saga.property-sections'
const trialCleanupKey='saga.property-sections.trial-cleanup-2026-10-28-v2'
const removedTrialSectionIds=new Set(['SEC-A','SEC-B'])
const removedTrialSectionNames=new Set(['departamentos','locales comerciales'])
const seed:SectionRow[]=[
  {id:'SEC-C',description:'Parqueaderos',state:'INACTIVO',rates:[]},
]

function readSections(){
  try{const stored=JSON.parse(localStorage.getItem(storageKey)??'null');let rows=Array.isArray(stored)?stored as SectionRow[]:seed;if(localStorage.getItem(trialCleanupKey)!=='1'){rows=rows.filter(row=>!removedTrialSectionIds.has(row.id)&&!removedTrialSectionNames.has(row.description.trim().toLocaleLowerCase('es')));localStorage.setItem(storageKey,JSON.stringify(rows));localStorage.setItem(trialCleanupKey,'1')}return rows}
  catch{return seed}
}
function persist(rows:SectionRow[]){localStorage.setItem(storageKey,JSON.stringify(rows))}
function validDate(value:string){if(!/^\d{2}\/\d{2}\/\d{4}$/.test(value))return false;const [day,month,year]=value.split('/').map(Number);const date=new Date(year,month-1,day);return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day}
function dateRank(value:string){const [day,month,year]=value.split('/').map(Number);return year*10000+month*100+day}
function Status({value}:{value:SectionState}){return <span className={`status s-${value.toLowerCase()}`}><i/>{value==='ACTIVO'?'Activo':'Inactivo'}</span>}

export function SectionPage({screen}:{screen:ScreenSpec}){
  const [sections,setSections]=useState<SectionRow[]>(readSections)
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [sectionForm,setSectionForm]=useState(false)
  const [editingSection,setEditingSection]=useState<string|null>(null)
  const [sectionDraft,setSectionDraft]=useState<{description:string;state:SectionState}>({description:'',state:'ACTIVO'})
  const [rateForm,setRateForm]=useState(false)
  const [editingRate,setEditingRate]=useState<string|null>(null)
  const [rateDraft,setRateDraft]=useState({from:'',until:'',value:''})
  const [error,setError]=useState('')
  const selected=sections.find(row=>row.id===selectedId)??null
  const sortedRates=useMemo(()=>[...(selected?.rates??[])].sort((a,b)=>dateRank(b.from)-dateRank(a.from)),[selected])

  const saveSections=(next:SectionRow[])=>{setSections(next);persist(next)}
  const openNewSection=()=>{setEditingSection(null);setSectionDraft({description:'',state:'ACTIVO'});setError('');setSectionForm(true)}
  const openEditSection=(row:SectionRow)=>{setEditingSection(row.id);setSectionDraft({description:row.description,state:row.state});setError('');setSectionForm(true)}
  const saveSection=(event:FormEvent)=>{event.preventDefault();if(!sectionDraft.description.trim()){setError('Ingresa una descripción.');return}const next=editingSection?sections.map(row=>row.id===editingSection?{...row,...sectionDraft,description:sectionDraft.description.trim()}:row):[{id:crypto.randomUUID(),description:sectionDraft.description.trim(),state:sectionDraft.state,rates:[]},...sections];saveSections(next);setSectionForm(false);setEditingSection(null);setError('')}
  const openNewRate=()=>{setEditingRate(null);setRateDraft({from:'',until:'',value:''});setError('');setRateForm(true)}
  const openEditRate=(row:Rate)=>{setEditingRate(row.id);setRateDraft({from:row.from,until:row.until,value:row.value});setError('');setRateForm(true)}
  const saveRate=(event:FormEvent)=>{
    event.preventDefault()
    if(!validDate(rateDraft.from)){setError('Desde debe tener una fecha válida en formato DD/MM/AAAA.');return}
    if(rateDraft.until&&!validDate(rateDraft.until)){setError('Hasta debe tener una fecha válida en formato DD/MM/AAAA o quedar en blanco.');return}
    if(rateDraft.until&&dateRank(rateDraft.until)<dateRank(rateDraft.from)){setError('Hasta no puede ser anterior a Desde.');return}
    if(!/^\d+(?:[.,]\d{1,6})?$/.test(rateDraft.value)){setError('Valor x Mt2. debe ser numérico y admitir hasta 6 decimales.');return}
    if(!rateDraft.until&&selected?.rates.some(row=>!row.until&&row.id!==editingRate)){setError('Ya existe un registro vigente con Fecha Hasta en blanco. Registra la Fecha Hasta correspondiente o completa la información correcta.');return}
    const rate:Rate={id:editingRate??crypto.randomUUID(),from:rateDraft.from,until:rateDraft.until,value:rateDraft.value.replace(',','.')}
    const next=sections.map(section=>section.id===selectedId?{...section,rates:editingRate?section.rates.map(row=>row.id===editingRate?rate:row):[rate,...section.rates]}:section)
    saveSections(next);setRateForm(false);setEditingRate(null);setError('')
  }

  return <div className="page screen-page section-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div></section>

    <section className="panel section-table-panel">
      <header><h2>Secciones</h2><button className="primary-action" onClick={openNewSection}><Plus/>Nueva sección</button></header>
      {sectionForm&&<form className="section-inline-form section-master-form" onSubmit={saveSection}><label>Descripción <span>Obligatorio</span><input autoFocus maxLength={100} value={sectionDraft.description} onChange={event=>{setSectionDraft({...sectionDraft,description:event.target.value});setError('')}}/></label><label>Estado<select value={sectionDraft.state} onChange={event=>setSectionDraft({...sectionDraft,state:event.target.value as SectionState})}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label><div><button type="button" className="quiet-button" onClick={()=>{setSectionForm(false);setError('')}}>Cancelar</button><button className="primary-action">Guardar</button></div>{error&&<ValidationError message={error}/>}</form>}
      <div className="section-table-scroll"><table><thead><tr><th aria-label="Seleccionar o editar"/><th>Descripción</th><th>Estado</th></tr></thead><tbody>{sections.map(row=><tr key={row.id} className={selectedId===row.id?'selected':''} onClick={()=>{setSelectedId(row.id);setRateForm(false);setError('')}}><td><input type="radio" name="selected-section" checked={selectedId===row.id} onChange={()=>setSelectedId(row.id)} aria-label={`Seleccionar ${row.description}`}/><button className="row-action" title={`Editar ${row.description}`} aria-label={`Editar ${row.description}`} onClick={event=>{event.stopPropagation();openEditSection(row)}}><Pencil/></button></td><td><strong>{row.description}</strong></td><td><Status value={row.state}/></td></tr>)}</tbody></table></div>
    </section>

    {selected&&<section className="panel section-table-panel section-rate-panel">
      <header><div><h2>Valores por Mt2.</h2><span>{selected.description}</span></div><button className="primary-action" onClick={openNewRate}><Plus/>Nuevo valor</button></header>
      {rateForm&&<form className="section-inline-form section-rate-form" onSubmit={saveRate}><label>Desde <span>DD/MM/AAAA</span><input autoFocus inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={rateDraft.from} onChange={event=>{setRateDraft({...rateDraft,from:event.target.value});setError('')}}/></label><label>Hasta <span>DD/MM/AAAA · opcional</span><input inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={rateDraft.until} onChange={event=>{setRateDraft({...rateDraft,until:event.target.value});setError('')}}/></label><label>Valor x Mt2. <span>Hasta 6 decimales</span><input inputMode="decimal" placeholder="0.000000" value={rateDraft.value} onChange={event=>{setRateDraft({...rateDraft,value:event.target.value});setError('')}}/></label><div><button type="button" className="quiet-button" onClick={()=>{setRateForm(false);setError('')}}>Cancelar</button><button className="primary-action">Guardar</button></div>{error&&<ValidationError message={error}/>}</form>}
      <div className="section-table-scroll"><table><thead><tr><th aria-label="Editar"/><th>Desde</th><th>Hasta</th><th>Valor x Mt2.</th></tr></thead><tbody>{sortedRates.map(row=><tr key={row.id}><td><button className="row-action" title={`Editar valor desde ${row.from}`} aria-label={`Editar valor desde ${row.from}`} onClick={()=>openEditRate(row)}><Pencil/></button></td><td>{row.from}</td><td aria-label={row.until||'Fecha Hasta en blanco; registro vigente'}>{row.until}</td><td className="section-number">{Number(row.value).toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:6})}</td></tr>)}{!sortedRates.length&&<tr><td colSpan={4}><div className="section-empty"><CalendarRange/><strong>Sin valores registrados</strong><span>Selecciona Nuevo valor para registrar la primera vigencia.</span></div></td></tr>}</tbody></table></div>
    </section>}
  </div>
}

function ValidationError({message}:{message:string}){return <div className="section-validation-error" role="alert" aria-live="assertive"><AlertTriangle/><div><strong>No se puede guardar el registro</strong><span>{message}</span></div></div>}
