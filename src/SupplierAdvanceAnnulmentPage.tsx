import { useMemo,useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle,Check,CheckCircle2,ChevronRight,FileText,Pencil,Plus,RotateCcw,Save,Trash2,X } from 'lucide-react'
import { api } from './api'
import { DocumentEditorHeader } from './DocumentEditorHeader'
import { formatFullDateInput } from './date-input'
import { SearchableDatalistInput } from './SearchableDatalistInput'
import {
  nextSupplierAdvanceAnnulmentNumber,readSupplierAdvanceAnnulments,saveSupplierAdvanceAnnulments,
  type SupplierAdvanceAnnulmentLine,type SupplierAdvanceAnnulmentRecord,
} from './supplier-advance-annulment-records'
import { readSupplierAdvances,saveSupplierAdvances,type SupplierAdvanceRecord } from './supplier-advance-records'
import type { CustomerRow } from './CustomerRegistryPage'
import type { Context,ScreenSpec } from './types'

type SupplierOption={id:string;name:string;identification:string}

function readProviders(){
  try{
    const stored=JSON.parse(localStorage.getItem('saga.providers')??'[]')
    return Array.isArray(stored)?stored as CustomerRow[]:[]
  }catch{return[]}
}

function todayDisplay(){
  const now=new Date()
  return`${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`
}

const money=(value:number)=>new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(value)
const supplierLabel=(supplier:SupplierOption)=>supplier.identification?`${supplier.identification} · ${supplier.name}`:supplier.name
const advanceLabel=(advance:SupplierAdvanceRecord)=>`${advance.number} - ${advance.issueDate}`

export function SupplierAdvanceAnnulmentPage({screen}:{screen:ScreenSpec}){
  const context=useQuery({queryKey:['context'],queryFn:api.context})
  if(!context.data)return null
  return <SupplierAdvanceAnnulmentManager key={context.data.company.id} screen={screen} context={context.data}/>
}

function SupplierAdvanceAnnulmentManager({screen,context}:{screen:ScreenSpec;context:Context}){
  const [advances,setAdvances]=useState(()=>readSupplierAdvances(context.company.id))
  const [records,setRecords]=useState(()=>readSupplierAdvanceAnnulments(context.company.id).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)))
  const [formOpen,setFormOpen]=useState(false)
  const [editingId,setEditingId]=useState<string|null>(null)
  const [number,setNumber]=useState(()=>nextSupplierAdvanceAnnulmentNumber(context.company.id))
  const [issueDate,setIssueDate]=useState(todayDisplay)
  const [supplierInput,setSupplierInput]=useState('')
  const [supplierId,setSupplierId]=useState('')
  const [detail,setDetail]=useState('')
  const [lines,setLines]=useState<SupplierAdvanceAnnulmentLine[]>([])
  const [advanceInput,setAdvanceInput]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [deleteConfirm,setDeleteConfirm]=useState(false)

  const providers=useMemo(readProviders,[])
  const supplierOptions=useMemo(()=>{
    const byId=new Map<string,SupplierOption>()
    advances.filter(advance=>advance.status==='GENERADO').forEach(advance=>{
      const provider=providers.find(item=>item.id===advance.supplierId)
      byId.set(advance.supplierId,{id:advance.supplierId,name:provider?.businessName??advance.supplierName,identification:provider?.identification??''})
    })
    return[...byId.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'))
  },[advances,providers])
  const selectedSupplier=supplierOptions.find(supplier=>supplier.id===supplierId)
    ??(supplierId?{id:supplierId,name:records.find(record=>record.supplierId===supplierId)?.supplierName??supplierInput,identification:''}:undefined)
  const availableAdvances=advances.filter(advance=>advance.status==='GENERADO'&&advance.supplierId===supplierId&&!lines.some(line=>line.advanceId===advance.id))
  const advanceToAdd=availableAdvances.find(advance=>advanceLabel(advance)===advanceInput)
  const total=Number(lines.reduce((sum,line)=>sum+line.value,0).toFixed(2))
  const drafts=records.filter(record=>record.status==='BORRADOR')

  const persistRecords=(next:SupplierAdvanceAnnulmentRecord[])=>{
    const ordered=[...next].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))
    setRecords(ordered);saveSupplierAdvanceAnnulments(context.company.id,ordered)
  }
  const reset=()=>{
    setEditingId(null);setNumber(nextSupplierAdvanceAnnulmentNumber(context.company.id));setIssueDate(todayDisplay())
    setSupplierInput('');setSupplierId('');setDetail('');setLines([]);setAdvanceInput('');setError('');setDeleteConfirm(false)
  }
  const openNew=()=>{reset();setMessage('');setFormOpen(true)}
  const closeForm=()=>{setFormOpen(false);reset()}
  const selectSupplier=(value:string)=>{
    const match=supplierOptions.find(supplier=>supplierLabel(supplier)===value)
    setSupplierInput(value);setSupplierId(match?.id??'');setLines([]);setAdvanceInput('');setError('')
  }
  const addAdvance=()=>{
    if(!advanceToAdd){setError('Selecciona un Anticipo de Proveedor pendiente de pago.');return}
    setLines(current=>[...current,{id:crypto.randomUUID(),advanceId:advanceToAdd.id,advanceNumber:advanceToAdd.number,advanceDate:advanceToAdd.issueDate,value:Number(advanceToAdd.total.toFixed(2))}])
    setAdvanceInput('');setError('')
  }
  const buildRecord=(status:'BORRADOR'|'GENERADA')=>{
    const current=records.find(record=>record.id===editingId)
    const stamp=new Date().toISOString()
    return{
      id:current?.id??crypto.randomUUID(),companyId:context.company.id,number,issueDate,supplierId,
      supplierName:selectedSupplier?.name??supplierInput.trim(),detail:detail.trim(),total,status,lines,
      createdAt:current?.createdAt??stamp,updatedAt:stamp,...(status==='GENERADA'?{generatedAt:stamp}:{generatedAt:current?.generatedAt}),
    } satisfies SupplierAdvanceAnnulmentRecord
  }
  const validateHeader=()=>{
    if(!/^\d{2}\/\d{2}\/\d{4}$/.test(issueDate)){setError('Ingresa una Fecha válida con formato DD/MM/AAAA.');return false}
    if(!supplierId||!selectedSupplier){setError('Selecciona un Proveedor con anticipos pendientes de pago.');return false}
    return true
  }
  const saveDraft=()=>{
    if(!validateHeader())return
    const record=buildRecord('BORRADOR')
    persistRecords(editingId?records.map(item=>item.id===editingId?record:item):[record,...records])
    setEditingId(record.id);setMessage(`La anulación ${record.number} fue guardada como borrador.`);setError('')
  }
  const generate=()=>{
    if(!validateHeader())return
    if(!lines.length){setError('Graba al menos un Anticipo de Proveedor para generar la anulación.');return}
    const currentAdvances=readSupplierAdvances(context.company.id)
    const invalid=lines.find(line=>currentAdvances.find(advance=>advance.id===line.advanceId)?.status!=='GENERADO')
    if(invalid){setError(`El anticipo ${invalid.advanceNumber} ya fue pagado o anulado. Actualiza la selección e inténtalo nuevamente.`);return}
    const record=buildRecord('GENERADA')
    const updatedAdvances=currentAdvances.map(advance=>lines.some(line=>line.advanceId===advance.id)
      ?{...advance,status:'ANULADO' as const,annulledAt:record.generatedAt,annulmentId:record.id,updatedAt:record.generatedAt??record.updatedAt}:advance)
    saveSupplierAdvances(context.company.id,updatedAdvances);setAdvances(updatedAdvances)
    persistRecords(editingId?records.map(item=>item.id===editingId?record:item):[record,...records])
    setFormOpen(false);reset();setMessage(`La anulación ${record.number} fue generada. ${lines.length===1?'El anticipo seleccionado fue retirado':'Los anticipos seleccionados fueron retirados'} de los pendientes de pago.`)
  }
  const openDraft=(record:SupplierAdvanceAnnulmentRecord)=>{
    const supplier=supplierOptions.find(item=>item.id===record.supplierId)
    setEditingId(record.id);setNumber(record.number);setIssueDate(record.issueDate);setSupplierId(record.supplierId)
    setSupplierInput(supplier?supplierLabel(supplier):record.supplierName);setDetail(record.detail);setLines(record.lines)
    setAdvanceInput('');setError('');setMessage('');setDeleteConfirm(false);setFormOpen(true)
  }
  const removeDraft=()=>{
    if(editingId)persistRecords(records.filter(record=>record.id!==editingId))
    const removed=number;setFormOpen(false);reset();setMessage(editingId?`El borrador ${removed} fue eliminado.`:'La anulación en proceso fue descartada sin dejar registros.')
  }

  return <div className="page screen-page supplier-annulment-page">
    <DocumentEditorHeader screen={screen} formOpen={formOpen} formTitle="Nueva Anulación de Anticipo Proveedor" sectionLabel="Cuentas por pagar" onClose={closeForm} actions={<><button type="button" className="save-expense-draft" onClick={saveDraft}><Save/>Guardar Borrador</button><button type="button" className="delete-expense-draft" onClick={()=>setDeleteConfirm(true)}><Trash2/>Eliminar</button><button type="button" className="authorize-expense" onClick={generate}><RotateCcw/>Generar Anulación</button></>} listAction={<button type="button" className="primary-action" onClick={openNew}><Plus/>Nueva Anulación</button>} />
    {message&&<div className="supplier-annulment-feedback success"><CheckCircle2/>{message}</div>}
    {error&&<div className="supplier-annulment-feedback error" role="alert"><AlertTriangle/>{error}</div>}

    {!formOpen?<section className="supplier-annulment-card supplier-annulment-pending"><header><div><strong>Anulaciones de Anticipos Proveedores Pendientes de Completar</strong><span>{drafts.length} {drafts.length===1?'registro pendiente':'registros pendientes'}</span></div></header><div><table><thead><tr><th aria-label="Editar"/><th>Fecha</th><th>Detalle</th><th>Proveedor</th><th>Valor</th></tr></thead><tbody>{drafts.map(record=><tr key={record.id}><td><button type="button" className="supplier-annulment-edit" onClick={()=>openDraft(record)} aria-label={`Editar ${record.number}`}><Pencil/></button></td><td>{record.issueDate}</td><td><strong>{record.detail||'Sin detalle'}</strong><small>{record.number}</small></td><td>{record.supplierName||'Pendiente de seleccionar'}</td><td className="money">{money(record.total)}</td></tr>)}{!drafts.length&&<tr><td colSpan={5}><div className="supplier-annulment-empty"><RotateCcw/><strong>No existen anulaciones pendientes</strong><span>Selecciona Nueva Anulación para iniciar un registro.</span></div></td></tr>}</tbody></table></div></section>:<>
      <section className="supplier-annulment-card"><header><div><strong>Datos de la Anulación</strong><span>Selecciona un proveedor que tenga anticipos pendientes de pago.</span></div><button type="button" className="supplier-advance-close" onClick={closeForm} aria-label="Cerrar y volver al listado" title="Cerrar y volver al grid"><X/></button></header><div className="supplier-annulment-form">
        <label><span># Anulación</span><input value={number} readOnly/></label>
        <label><span>Fecha</span><input value={issueDate} onFocus={event=>event.currentTarget.select()} onChange={event=>{setIssueDate(formatFullDateInput(event.target.value));setError('')}} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10}/></label>
        <label><span>Proveedor</span><SearchableDatalistInput list="supplier-annulment-provider-options" value={supplierInput} onChange={event=>selectSupplier(event.target.value)} onClear={()=>selectSupplier('')} clearLabel="Borrar proveedor" placeholder="Escribe para filtrar proveedores"/><datalist id="supplier-annulment-provider-options">{supplierOptions.map(supplier=><option key={supplier.id} value={supplierLabel(supplier)}/>)}</datalist><small>{supplierOptions.length} proveedores con anticipos pendientes</small></label>
        <label className="wide"><span>Detalle</span><textarea value={detail} onChange={event=>setDetail(event.target.value)} maxLength={160} rows={3}/><small>{detail.length}/160 caracteres</small></label>
      </div></section>
      <section className="supplier-annulment-card supplier-annulment-detail"><nav><button type="button" className="active"><FileText/>Detalle</button></nav><div className="supplier-annulment-table"><table><thead><tr><th>Anticipo Proveedor</th><th>Valor</th><th>Acción</th></tr></thead><tbody>{lines.map(line=><tr key={line.id}><td><strong>{line.advanceNumber}</strong><small>{line.advanceDate}</small></td><td className="money">{money(line.value)}</td><td><div className="supplier-annulment-line-actions"><span><Check/>Grabado</span><button type="button" onClick={()=>setLines(current=>current.filter(item=>item.id!==line.id))} aria-label={`Quitar ${line.advanceNumber}`}><Trash2/></button></div></td></tr>)}<tr className="supplier-annulment-new-line"><td><SearchableDatalistInput disabled={!supplierId} list="supplier-annulment-advance-options" value={advanceInput} onChange={event=>{setAdvanceInput(event.target.value);setError('')}} onClear={()=>setAdvanceInput('')} clearLabel="Borrar anticipo" placeholder={supplierId?'Escribe o despliega los anticipos pendientes':'Primero selecciona un proveedor'}/><datalist id="supplier-annulment-advance-options">{availableAdvances.map(advance=><option key={advance.id} value={advanceLabel(advance)}/>)}</datalist></td><td className="money">{advanceToAdd?money(advanceToAdd.total):'—'}</td><td><button type="button" className="supplier-annulment-save-line" disabled={!advanceToAdd} onClick={addAdvance}><Save/>Grabar</button></td></tr></tbody><tfoot><tr><td>Total</td><td className="money">{money(total)}</td><td>{lines.length} {lines.length===1?'anticipo':'anticipos'}</td></tr></tfoot></table></div></section>
    </>}
    {deleteConfirm&&<div className="individual-delete-backdrop" role="alertdialog" aria-modal="true"><section className="individual-delete-dialog"><span><AlertTriangle/></span><h2>¿Eliminar la anulación?</h2><p>{editingId?`Se eliminará el borrador ${number}.`:'La anulación no guardada se descartará sin dejar registros.'}</p><footer><button type="button" className="quiet-button" onClick={()=>setDeleteConfirm(false)}>Cancelar</button><button type="button" className="confirm-delete-expense" onClick={removeDraft}><Trash2/>Eliminar</button></footer></section></div>}
  </div>
}
