import { useState, type FormEvent } from 'react'
import { ChevronRight, Pencil, Plus, UsersRound } from 'lucide-react'
import type { ScreenSpec } from './types'
import { cleanPhoneValue } from './phone-values'
import { cleanTextSpacing } from './text-values'

export type CustomerState='ACTIVO'|'INACTIVO'
export type CustomerRow={id:string;documentType:'CI'|'RUC'|'PASAPORTE';identification:string;businessName:string;email:string;assistantEmail:string;contactPerson:string;isProvider:boolean;isCustomer?:boolean;address:string;phone:string;state:CustomerState;supplierGroupId?:string;bankName?:string;bankAccountType?:'CORRIENTE'|'AHORRO';bankAccountNumber?:string;sourceUploadId?:string}
type SupplierGroupOption={id:string;description:string;state:string}

const customerKey='saga.customers'
const providerKey='saga.providers'
const supplierGroupKey='saga.supplier-groups'
const emptyCustomer:Omit<CustomerRow,'id'>={documentType:'CI',identification:'',businessName:'',email:'',assistantEmail:'',contactPerson:'',isProvider:false,isCustomer:false,address:'',phone:'',state:'ACTIVO',supplierGroupId:'',bankName:'',bankAccountType:'CORRIENTE',bankAccountNumber:''}
export const ecuadorBanks=['Banco Amazonas S.A.','Banco de la Producción S.A. – Produbanco','Banco del Austro S.A.','Banco Solidario S.A.','Banco Guayaquil S.A.','Banco Sudamericano S.A.','Banco Bolivariano C.A.','Banco Coopnacional S.A.','Banco Manabí S.A.','Banco ProCredit S.A.','Banco del Litoral S.A.','Banco Capital S.A.','Banco General Rumiñahui S.A.','Banco Delbank S.A.','Banco Internacional S.A.','Banco Atlántida S.A.','Banco de Loja S.A.','Banco Desarrollo de los Pueblos S.A. – BanCodesarrollo','Banco de Machala S.A.','Banco VisionFund Ecuador S.A.','Banco del Pacífico S.A.','Banco Diners Club del Ecuador S.A.','Banco Pichincha C.A.','Citibank N.A. Sucursal Ecuador','Banco de Desarrollo del Ecuador B.P.','Corporación Financiera Nacional B.P.','Banco del Instituto Ecuatoriano de Seguridad Social – BIESS','BanEcuador B.P.']

function readRows(key:string){try{const value=JSON.parse(localStorage.getItem(key)??'[]');return Array.isArray(value)?(value as CustomerRow[]).map(row=>({...row,phone:cleanPhoneValue(row.phone)})):[]}catch{return[]}}
function writeRows(key:string,rows:CustomerRow[]){localStorage.setItem(key,JSON.stringify(rows))}
function readSupplierGroups(){try{const value=JSON.parse(localStorage.getItem(supplierGroupKey)??'[]');return Array.isArray(value)?(value as SupplierGroupOption[]).filter(group=>group.state==='ACTIVO'):[]}catch{return[]}}

export function CustomerRegistryPage({screen}:{screen:ScreenSpec}){
  const [rows,setRows]=useState<CustomerRow[]>(()=>readRows(customerKey))
  const [formOpen,setFormOpen]=useState(false)
  const [editingId,setEditingId]=useState<string|null>(null)
  const [draft,setDraft]=useState<Omit<CustomerRow,'id'>>({...emptyCustomer})
  const [error,setError]=useState('')
  const openNew=()=>{setEditingId(null);setDraft({...emptyCustomer});setError('');setFormOpen(true)}
  const openEdit=(row:CustomerRow)=>{setEditingId(row.id);setDraft({...row});setError('');setFormOpen(true)}
  const close=()=>{setFormOpen(false);setEditingId(null);setError('')}
  const save=(event:FormEvent)=>{
    event.preventDefault()
    if(!draft.identification.trim()||!draft.businessName.trim()){setError('Completa Identificación y Razón Social.');return}
    if(rows.some(row=>row.identification.trim().toLocaleLowerCase('es')===draft.identification.trim().toLocaleLowerCase('es')&&row.id!==editingId)){setError('Ya existe un cliente con esta identificación.');return}
    if(draft.email&&!/^\S+@\S+\.\S+$/.test(draft.email)){setError('Ingresa un Email válido.');return}
    if(draft.assistantEmail&&!/^\S+@\S+\.\S+$/.test(draft.assistantEmail)){setError('Ingresa un Email Asistente válido.');return}
    const row:CustomerRow={...draft,id:editingId??crypto.randomUUID(),identification:draft.identification.trim(),businessName:cleanTextSpacing(draft.businessName),email:draft.email.trim(),assistantEmail:draft.assistantEmail.trim(),contactPerson:cleanTextSpacing(draft.contactPerson),address:draft.address.trim(),phone:cleanPhoneValue(draft.phone).trim()}
    const next=editingId?rows.map(item=>item.id===editingId?row:item):[row,...rows]
    setRows(next);writeRows(customerKey,next)
    const providers=readRows(providerKey).filter(item=>item.id!==row.id)
    writeRows(providerKey,row.isProvider?[row,...providers]:providers)
    close()
  }
  return <div className="page screen-page customer-registry-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div><button className="primary-action" onClick={openNew}><Plus/>Nuevo Cliente</button></section>
    {formOpen?<form className="customer-form" onSubmit={save}><header><h2>{editingId?'Editar Cliente':'Nuevo Cliente'}</h2></header><div className="customer-form-grid">
      <label>Tipo Documento<select value={draft.documentType} onChange={event=>setDraft({...draft,documentType:event.target.value as CustomerRow['documentType']})}><option value="CI">C.I.</option><option value="RUC">RUC</option><option value="PASAPORTE">Pasaporte</option></select></label>
      <label>Identificación <span>Obligatorio</span><input autoFocus maxLength={20} value={draft.identification} onChange={event=>{setDraft({...draft,identification:event.target.value});setError('')}}/></label>
      <label>Razón Social <span>Obligatorio</span><input maxLength={150} value={draft.businessName} onChange={event=>{setDraft({...draft,businessName:event.target.value});setError('')}}/></label>
      <label>Email<input type="email" maxLength={150} value={draft.email} onChange={event=>{setDraft({...draft,email:event.target.value});setError('')}}/></label>
      <label>Email Asistente<input type="email" maxLength={150} value={draft.assistantEmail} onChange={event=>{setDraft({...draft,assistantEmail:event.target.value});setError('')}}/></label>
      <label>Persona Contacto<input maxLength={150} value={draft.contactPerson} onChange={event=>setDraft({...draft,contactPerson:event.target.value})}/></label>
      <div className="customer-toggle-field"><strong>Es Proveedor</strong><label className="customer-toggle"><input type="checkbox" checked={draft.isProvider} onChange={event=>setDraft({...draft,isProvider:event.target.checked})}/><span aria-hidden="true"/><b>{draft.isProvider?'Sí':'No'}</b></label></div>
      <label>Dirección<input maxLength={200} value={draft.address} onChange={event=>setDraft({...draft,address:event.target.value})}/></label>
      <label>Teléfono<input inputMode="tel" maxLength={30} value={draft.phone} onChange={event=>setDraft({...draft,phone:event.target.value})}/></label>
      <label>Estado<select value={draft.state} onChange={event=>setDraft({...draft,state:event.target.value as CustomerState})}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label>
      {error&&<div className="customer-error" role="alert">{error}</div>}<footer><button type="button" className="quiet-button" onClick={close}>Cancelar</button><button className="primary-action">Guardar</button></footer>
    </div></form>:<div className="customer-table-scroll"><table><thead><tr><th aria-label="Editar"/><th>Identificación</th><th>Razón Social</th><th>Email</th><th>Email Asistente</th><th>Dirección</th><th>Teléfono</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><button className="row-action" title={`Editar ${row.businessName}`} aria-label={`Editar ${row.businessName}`} onClick={()=>openEdit(row)}><Pencil/></button></td><td><strong>{row.identification}</strong></td><td>{row.businessName}</td><td>{row.email||'—'}</td><td>{row.assistantEmail||'—'}</td><td>{row.address||'—'}</td><td>{row.phone||'—'}</td></tr>)}{!rows.length&&<tr><td colSpan={7}><div className="customer-empty"><UsersRound/><strong>Sin clientes registrados</strong><span>Selecciona Nuevo Cliente para crear el primer registro.</span></div></td></tr>}</tbody></table></div>}
  </div>
}

export function ProviderRegistryPage({screen}:{screen:ScreenSpec}){
  const [rows,setRows]=useState<CustomerRow[]>(()=>readRows(providerKey))
  const [formOpen,setFormOpen]=useState(false)
  const [draft,setDraft]=useState<Omit<CustomerRow,'id'>>({...emptyCustomer,isProvider:true})
  const [supplierGroups,setSupplierGroups]=useState<SupplierGroupOption[]>(readSupplierGroups)
  const [error,setError]=useState('')
  const openNew=()=>{setDraft({...emptyCustomer,isProvider:true});setSupplierGroups(readSupplierGroups());setError('');setFormOpen(true)}
  const close=()=>{setFormOpen(false);setError('')}
  const save=(event:FormEvent)=>{
    event.preventDefault()
    if(!draft.identification.trim()||!draft.businessName.trim()){setError('Completa Identificación y Razón Social.');return}
    if(rows.some(row=>row.identification.trim().toLocaleLowerCase('es')===draft.identification.trim().toLocaleLowerCase('es'))){setError('Ya existe un proveedor con esta identificación.');return}
    if(draft.email&&!/^\S+@\S+\.\S+$/.test(draft.email)){setError('Ingresa un Email válido.');return}
    if(draft.assistantEmail&&!/^\S+@\S+\.\S+$/.test(draft.assistantEmail)){setError('Ingresa un Email Asistente válido.');return}
    const row:CustomerRow={...draft,id:crypto.randomUUID(),isProvider:true,identification:draft.identification.trim(),businessName:cleanTextSpacing(draft.businessName),email:draft.email.trim(),assistantEmail:draft.assistantEmail.trim(),contactPerson:cleanTextSpacing(draft.contactPerson),address:draft.address.trim(),phone:cleanPhoneValue(draft.phone).trim(),bankAccountNumber:draft.bankAccountNumber?.trim()??''}
    const next=[row,...rows];setRows(next);writeRows(providerKey,next);close()
    if(row.isCustomer){
      const customers=readRows(customerKey)
      const existing=customers.find(customer=>customer.identification.toLocaleLowerCase('es')===row.identification.toLocaleLowerCase('es'))
      const customerCopy={...row,id:existing?.id??row.id,isProvider:true,isCustomer:true}
      writeRows(customerKey,existing?customers.map(customer=>customer.id===existing.id?customerCopy:customer):[customerCopy,...customers])
    }
  }
  return <div className="page screen-page customer-registry-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div><button type="button" className="primary-action" onClick={openNew}><Plus/>Nuevo Proveedor</button></section>
    {formOpen?<form className="customer-form" onSubmit={save}><header><h2>Nuevo Proveedor</h2></header><div className="customer-form-grid">
      <label>Tipo Documento<select value={draft.documentType} onChange={event=>setDraft({...draft,documentType:event.target.value as CustomerRow['documentType']})}><option value="CI">C.I.</option><option value="RUC">RUC</option><option value="PASAPORTE">Pasaporte</option></select></label>
      <label>Identificación <span>Obligatorio</span><input autoFocus maxLength={20} value={draft.identification} onChange={event=>{setDraft({...draft,identification:event.target.value});setError('')}}/></label>
      <label>Razón Social <span>Obligatorio</span><input maxLength={150} value={draft.businessName} onChange={event=>{setDraft({...draft,businessName:event.target.value});setError('')}}/></label>
      <label>Email<input type="email" maxLength={150} value={draft.email} onChange={event=>{setDraft({...draft,email:event.target.value});setError('')}}/></label>
      <label>Email Asistente<input type="email" maxLength={150} value={draft.assistantEmail} onChange={event=>{setDraft({...draft,assistantEmail:event.target.value});setError('')}}/></label>
      <label>Persona Contacto<input maxLength={150} value={draft.contactPerson} onChange={event=>setDraft({...draft,contactPerson:event.target.value})}/></label>
      <div className="customer-toggle-field"><strong>Es Cliente</strong><label className="customer-toggle"><input type="checkbox" checked={Boolean(draft.isCustomer)} onChange={event=>setDraft({...draft,isCustomer:event.target.checked})}/><span aria-hidden="true"/><b>{draft.isCustomer?'Sí':'No'}</b></label></div>
      <label>Dirección<input maxLength={200} value={draft.address} onChange={event=>setDraft({...draft,address:event.target.value})}/></label>
      <label>Teléfono<input inputMode="tel" maxLength={30} value={draft.phone} onChange={event=>setDraft({...draft,phone:event.target.value})}/></label>
      <label>Estado<select value={draft.state} onChange={event=>setDraft({...draft,state:event.target.value as CustomerState})}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label>
      <section className="provider-financial-box"><header><h3>Información de Pago</h3><span>Datos bancarios y clasificación del proveedor.</span></header><div>
        <label>Grupo<select value={draft.supplierGroupId??''} onChange={event=>setDraft({...draft,supplierGroupId:event.target.value})}><option value="">Seleccionar grupo</option>{supplierGroups.map(group=><option key={group.id} value={group.id}>{group.description}</option>)}</select></label>
        <label>Cuenta Bancaria<select value={draft.bankName??''} onChange={event=>setDraft({...draft,bankName:event.target.value})}><option value="">Seleccionar banco</option>{ecuadorBanks.map(bank=><option key={bank} value={bank}>{bank}</option>)}</select></label>
        <label>Tipo de Cuenta<select value={draft.bankAccountType??'CORRIENTE'} onChange={event=>setDraft({...draft,bankAccountType:event.target.value as CustomerRow['bankAccountType']})}><option value="CORRIENTE">Corriente</option><option value="AHORRO">Ahorro</option></select></label>
        <label># de Cuenta<input maxLength={30} value={draft.bankAccountNumber??''} onChange={event=>setDraft({...draft,bankAccountNumber:event.target.value})}/></label>
      </div></section>
      {error&&<div className="customer-error" role="alert">{error}</div>}<footer><button type="button" className="quiet-button" onClick={close}>Cancelar</button><button className="primary-action">Guardar</button></footer>
    </div></form>:<div className="customer-table-scroll"><table><thead><tr><th>Identificación</th><th>Razón Social</th><th>Email</th><th>Email Asistente</th><th>Persona Contacto</th><th>Dirección</th><th>Teléfono</th><th>Estado</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><strong>{row.identification}</strong></td><td>{row.businessName}</td><td>{row.email||'—'}</td><td>{row.assistantEmail||'—'}</td><td>{row.contactPerson||'—'}</td><td>{row.address||'—'}</td><td>{row.phone||'—'}</td><td><span className={`status s-${row.state.toLowerCase()}`}><i/>{row.state==='ACTIVO'?'Activo':'Inactivo'}</span></td></tr>)}{!rows.length&&<tr><td colSpan={8}><div className="customer-empty"><UsersRound/><strong>Sin proveedores registrados</strong><span>Selecciona Nuevo Proveedor para crear el primer registro.</span></div></td></tr>}</tbody></table></div>}
  </div>
}
