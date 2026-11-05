import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronRight, FileText, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { api } from './api'
import { DocumentEditorHeader } from './DocumentEditorHeader'
import { formatFullDateInput } from './date-input'
import { SearchableDatalistInput } from './SearchableDatalistInput'
import {
  nextSupplierAdvanceNumber,readSupplierAdvances,saveSupplierAdvances,type SupplierAdvanceRecord,
} from './supplier-advance-records'
import type { CustomerRow } from './CustomerRegistryPage'
import type { Context,ScreenSpec } from './types'

function readProviders(){
  try{
    const stored=JSON.parse(localStorage.getItem('saga.providers')??'[]')
    if(!Array.isArray(stored))return[]
    return(stored as CustomerRow[]).filter(provider=>provider.state==='ACTIVO')
      .sort((left,right)=>left.businessName.localeCompare(right.businessName,'es'))
  }catch{return[]}
}

function todayDisplay(){
  const now=new Date()
  return`${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`
}

function providerLabel(provider:CustomerRow){return`${provider.identification} · ${provider.businessName}`}
const money=(value:number)=>new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(value)

export function SupplierAdvancePage({screen}:{screen:ScreenSpec}){
  const context=useQuery({queryKey:['context'],queryFn:api.context})
  if(!context.data)return null
  return <SupplierAdvanceManager key={context.data.company.id} screen={screen} context={context.data}/>
}

function SupplierAdvanceManager({screen,context}:{screen:ScreenSpec;context:Context}){
  const providers=useMemo(readProviders,[])
  const [records,setRecords]=useState(()=>readSupplierAdvances(context.company.id).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)))
  const [formOpen,setFormOpen]=useState(false)
  const [editingId,setEditingId]=useState<string|null>(null)
  const [number,setNumber]=useState(()=>nextSupplierAdvanceNumber(context.company.id))
  const [issueDate,setIssueDate]=useState(todayDisplay)
  const [supplierInput,setSupplierInput]=useState('')
  const [supplierId,setSupplierId]=useState('')
  const [detail,setDetail]=useState('')
  const [total,setTotal]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [deleteConfirm,setDeleteConfirm]=useState(false)
  const pendingRecords=records.filter(record=>record.status==='BORRADOR'||record.status==='GENERADO')

  const persist=(next:SupplierAdvanceRecord[])=>{
    const ordered=[...next].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))
    setRecords(ordered);saveSupplierAdvances(context.company.id,ordered)
  }
  const clear=()=>{setEditingId(null);setNumber(nextSupplierAdvanceNumber(context.company.id));setIssueDate(todayDisplay());setSupplierInput('');setSupplierId('');setDetail('');setTotal('');setError('');setDeleteConfirm(false)}
  const openNew=()=>{clear();setMessage('');setFormOpen(true)}
  const openRecord=(record:SupplierAdvanceRecord)=>{
    const provider=providers.find(item=>item.id===record.supplierId)
    setEditingId(record.id);setNumber(record.number);setIssueDate(record.issueDate);setSupplierId(record.supplierId)
    setSupplierInput(provider?providerLabel(provider):record.supplierName);setDetail(record.detail);setTotal(record.total.toFixed(2))
    setError('');setMessage('');setDeleteConfirm(false);setFormOpen(true)
  }
  const selectProvider=(value:string)=>{
    setSupplierInput(value);setError('')
    const normalized=value.trim().toLocaleLowerCase('es')
    const provider=providers.find(item=>providerLabel(item).toLocaleLowerCase('es')===normalized||item.businessName.toLocaleLowerCase('es')===normalized||item.identification.toLocaleLowerCase('es')===normalized)
    setSupplierId(provider?.id??'')
  }
  const validate=()=>{
    if(!/^\d{2}\/\d{2}\/\d{4}$/.test(issueDate)){setError('Ingresa una Fecha válida con formato DD/MM/AAAA.');return null}
    const provider=providers.find(item=>item.id===supplierId)
    if(!provider){setError('Selecciona un Proveedor activo de la lista.');return null}
    const amount=Number(total)
    if(!Number.isFinite(amount)||amount<=0){setError('El Total debe ser mayor que cero.');return null}
    return{provider,amount:Number(amount.toFixed(2))}
  }
  const upsert=(status:'BORRADOR'|'GENERADO')=>{
    const valid=validate();if(!valid)return
    const existing=records.find(record=>record.id===editingId)
    const stamp=new Date().toISOString()
    const record:SupplierAdvanceRecord={
      id:existing?.id??crypto.randomUUID(),companyId:context.company.id,number,issueDate,supplierId:valid.provider.id,
      supplierName:valid.provider.businessName,detail:detail.trim(),total:valid.amount,status,
      createdAt:existing?.createdAt??stamp,updatedAt:stamp,...(status==='GENERADO'?{generatedAt:stamp}:{generatedAt:existing?.generatedAt}),
    }
    persist(existing?records.map(item=>item.id===existing.id?record:item):[record,...records])
    setFormOpen(false);clear();setMessage(status==='GENERADO'?`El anticipo ${record.number} pasó a estado Generado y permanece pendiente de pago.`:`El anticipo ${record.number} fue guardado como borrador.`)
  }
  const remove=()=>{
    if(editingId)persist(records.filter(record=>record.id!==editingId))
    const deletedNumber=number;setFormOpen(false);clear();setMessage(editingId?`El anticipo ${deletedNumber} fue eliminado.`:'El anticipo en proceso fue descartado sin dejar registros.')
  }

  return <div className="page screen-page supplier-advance-page">
    <DocumentEditorHeader screen={screen} formOpen={formOpen} formTitle="Nuevo Anticipo" sectionLabel="Núcleo contable" onClose={() => { setFormOpen(false); clear() }} actions={<><button type="button" className="save-expense-draft" onClick={()=>upsert('BORRADOR')}><Save/>Guardar Borrador</button><button type="button" className="delete-expense-draft" onClick={()=>setDeleteConfirm(true)}><Trash2/>Eliminar</button><button type="button" className="authorize-expense" onClick={()=>upsert('GENERADO')}><CheckCircle2/>Generar Anticipo</button></>} listAction={<button type="button" className="primary-action" onClick={openNew}><Plus/>Nuevo</button>} />
    {message&&<div className="supplier-advance-success"><CheckCircle2/>{message}</div>}
    {error&&<div className="supplier-advance-error" role="alert"><AlertTriangle/>{error}</div>}
    {formOpen?<section className="supplier-advance-card"><header><div><strong>{editingId?'Editar Anticipo':'Nuevo Anticipo'}</strong><span>El movimiento no genera asiento contable.</span></div><button type="button" className="supplier-advance-close" onClick={()=>{setFormOpen(false);clear()}} aria-label="Cerrar y volver a Anticipos Pendientes de Pagar" title="Cerrar y volver al grid"><X/></button></header><div className="supplier-advance-form-grid">
      <label><span># Anticipo</span><input value={number} readOnly/></label>
      <label><span>Fecha</span><input inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={issueDate} onFocus={event=>event.currentTarget.select()} onChange={event=>{setIssueDate(formatFullDateInput(event.target.value));setError('')}}/></label>
      <label><span>Proveedor</span><SearchableDatalistInput list="supplier-advance-provider-options" value={supplierInput} onChange={event=>selectProvider(event.target.value)} onClear={()=>selectProvider('')} clearLabel="Borrar proveedor" placeholder="Escribe para filtrar proveedores"/><datalist id="supplier-advance-provider-options">{providers.map(provider=><option key={provider.id} value={providerLabel(provider)}/>)}</datalist></label>
      <label className="wide"><span>Detalle</span><textarea rows={3} maxLength={160} value={detail} onChange={event=>setDetail(event.target.value)} placeholder="Detalle del anticipo"/><small>{detail.length}/160</small></label>
      <label><span>Total</span><input inputMode="decimal" value={total} onFocus={event=>event.currentTarget.select()} onChange={event=>{setTotal(event.target.value.replace(/[^\d.,]/g,'').replace(',','.'));setError('')}} placeholder="0.00"/></label>
    </div></section>:<section className="supplier-advance-card supplier-advance-pending"><header><div><strong>Anticipos Pendientes de Pagar</strong><span>{pendingRecords.length} {pendingRecords.length===1?'registro pendiente':'registros pendientes'}</span></div></header><div><table><thead><tr><th aria-label="Editar"/><th>Fecha</th><th>Proveedor</th><th>Detalle</th><th>Valor</th><th>Estado</th></tr></thead><tbody>{pendingRecords.map(record=><tr key={record.id}><td><button type="button" className="supplier-advance-edit" onClick={()=>openRecord(record)} aria-label={`Editar ${record.number}`} title={`Editar ${record.number}`}><Pencil/></button></td><td>{record.issueDate}</td><td><strong>{record.supplierName}</strong><small>{record.number}</small></td><td>{record.detail||'—'}</td><td className="money">{money(record.total)}</td><td><span className={`supplier-advance-status ${record.status.toLowerCase()}`}>{record.status==='BORRADOR'?'Borrador':'Generado'}</span></td></tr>)}{!pendingRecords.length&&<tr><td colSpan={6}><div className="supplier-advance-empty"><FileText/><strong>Sin anticipos pendientes de pagar</strong><span>Selecciona Nuevo para registrar el primer anticipo de proveedor.</span></div></td></tr>}</tbody></table></div></section>}
    {deleteConfirm&&<div className="individual-delete-backdrop" role="alertdialog" aria-modal="true" aria-label="Confirmar eliminación"><section className="individual-delete-dialog"><span><AlertTriangle/></span><h2>¿Eliminar el anticipo?</h2><p>{editingId?`Se eliminará el registro ${number}.`:'El anticipo no guardado se descartará sin dejar registro.'}</p><footer><button type="button" className="quiet-button" onClick={()=>setDeleteConfirm(false)}>Cancelar</button><button type="button" className="confirm-delete-expense" onClick={remove}><Trash2/>Eliminar</button></footer></section></div>}
  </div>
}
