import {useEffect,useMemo,useState} from 'react'
import {useQuery} from '@tanstack/react-query'
import {AlertTriangle,Check,CheckCircle2,ChevronRight,FileCheck2,FileText,Pencil,Plus,Save,Scale,Trash2,X} from 'lucide-react'
import {api} from './api'
import {DocumentEditorHeader} from './DocumentEditorHeader'
import {accountingVoucherStorageKey,getNextVoucherNumber,type AccountingVoucherRecord} from './AccountingVoucherPage'
import {ensureCustomerReceivables,saveCustomerReceivables,type CustomerReceivableRecord} from './customer-receivables'
import type {CustomerRow} from './CustomerRegistryPage'
import {formatFullDateInput} from './date-input'
import {validateOperationDate} from './operation-date-rules'
import {
  readAuthorizedPortfolioAdjustments,readPortfolioAdjustmentDrafts,saveAuthorizedPortfolioAdjustments,savePortfolioAdjustmentDrafts,
  type PortfolioAdjustmentAccountingLine,type PortfolioAdjustmentDocument,type PortfolioAdjustmentRecord,type PortfolioAdjustmentType,
} from './portfolio-adjustment-records'
import {SearchableDatalistInput} from './SearchableDatalistInput'
import type {Context,ScreenSpec} from './types'

type Account={Codigo:string;'Descripción':string;Tipo:string;Estado:string}
type Assignments=Record<string,string>
type PayableRow=Record<string,unknown>
type Tab='ADJUSTMENT'|'ACCOUNTING'

function readJson<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)??'null')??fallback}catch{return fallback}}
function numeric(value:unknown){const parsed=Number(String(value??0).replace(',','.'));return Number.isFinite(parsed)?Math.max(0,parsed):0}
function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/\s+/g,' ').trim()}
function money(value:number){return value.toLocaleString('es-EC',{style:'currency',currency:'USD',minimumFractionDigits:2})}
function today(){return new Intl.DateTimeFormat('es-EC',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date())}
function toIso(value:string){const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);return match?`${match[3]}-${match[2]}-${match[1]}`:value}
function contactLabel(row:CustomerRow){return`${row.identification} · ${row.businessName}`}
function readAccounts(){return readJson<Account[]>('saga.accounting.plan',[]).filter(row=>row.Tipo.toUpperCase()==='AUXILIAR'&&row.Estado.toUpperCase()!=='INACTIVO').sort((a,b)=>a.Codigo.localeCompare(b.Codigo,'es',{numeric:true}))}
function nextNumber(companyId:string){const values=[...readPortfolioAdjustmentDrafts(companyId),...readAuthorizedPortfolioAdjustments(companyId)].map(row=>Number(/(\d+)$/.exec(row.number)?.[1]??0));return`AJU-${String(Math.max(0,...values)+1).padStart(6,'0')}`}
function payableDocuments(companyId:string,contactId:string):PortfolioAdjustmentDocument[]{
  return readJson<PayableRow[]>(`saga.cxp.payables:${companyId}`,[]).filter(row=>String(row.supplierId??row.providerId??'')===contactId&&numeric(row.balance??row.saldo)>0&&String(row.status??row.estado??'').toUpperCase()!=='ANULADO').map(row=>{
    const total=numeric(row.total??row.originalAmount),balance=numeric(row.balance??row.saldo)
    return{id:String(row.id),number:String(row.number??row.documentNumber??row.numero??'Factura'),issueDate:String(row.issueDate??row.date??row.fecha??'—'),total,paid:Number(Math.max(0,total-balance).toFixed(2)),balance,description:String(row.description??row.detail??row.detalle??'Factura de proveedor')}
  })
}

export function PortfolioAdjustmentPage({screen}:{screen:ScreenSpec}){
  const context=useQuery({queryKey:['context'],queryFn:api.context})
  if(!context.data)return null
  return <PortfolioAdjustmentManager key={context.data.company.id} screen={screen} context={context.data}/>
}

function PortfolioAdjustmentManager({screen,context}:{screen:ScreenSpec;context:Context}){
  const accounts=useMemo(readAccounts,[])
  const assignments=useMemo(()=>readJson<Assignments>(`saga.accounting.account-assignments:${context.company.id}`,{}),[context.company.id])
  const customers=useMemo(()=>readJson<CustomerRow[]>('saga.customers',[]).filter(row=>row.state==='ACTIVO').sort((a,b)=>a.businessName.localeCompare(b.businessName,'es')),[])
  const providers=useMemo(()=>readJson<CustomerRow[]>('saga.providers',[]).filter(row=>row.state==='ACTIVO').sort((a,b)=>a.businessName.localeCompare(b.businessName,'es')),[])
  const [receivables,setReceivables]=useState(()=>ensureCustomerReceivables(context.company.id))
  const [drafts,setDrafts]=useState(()=>readPortfolioAdjustmentDrafts(context.company.id).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)))
  const [formOpen,setFormOpen]=useState(false),[editingId,setEditingId]=useState<string|null>(null)
  const [number,setNumber]=useState(()=>nextNumber(context.company.id)),[issueDate,setIssueDate]=useState(today)
  const [type,setType]=useState<PortfolioAdjustmentType>('CXC'),[contactInput,setContactInput]=useState(''),[contactId,setContactId]=useState(''),[detail,setDetail]=useState('')
  const [selectedIds,setSelectedIds]=useState<Set<string>>(new Set()),[activeTab,setActiveTab]=useState<Tab>('ADJUSTMENT')
  const [accountingLines,setAccountingLines]=useState<PortfolioAdjustmentAccountingLine[]>([]),[editingLine,setEditingLine]=useState<string|null>(null)
  const [pickerOpen,setPickerOpen]=useState(false),[deleteConfirm,setDeleteConfirm]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')

  const contacts=type==='CXC'?customers:providers
  const selectedContact=contacts.find(row=>row.id===contactId)
  const availableDocuments=useMemo(()=>{
    if(!selectedContact)return[]
    if(type==='CXP')return payableDocuments(context.company.id,contactId)
    return receivables.filter(row=>row.balance>0&&(row.customerId===contactId||normalize(row.identification??'')===normalize(selectedContact.identification)||normalize(row.businessName??'')===normalize(selectedContact.businessName))).map(row=>({id:row.id,number:row.receiptNumber,issueDate:row.issueDate,total:row.originalAmount,paid:row.collectedAmount,balance:row.balance,description:'Expensa/Factura pendiente'}))
  },[contactId,context.company.id,receivables,selectedContact,type])
  const selectedDocuments=availableDocuments.filter(row=>selectedIds.has(row.id))
  const total=Number(selectedDocuments.reduce((sum,row)=>sum+row.balance,0).toFixed(2))
  const totalDebit=Number(accountingLines.reduce((sum,row)=>sum+numeric(row.debit),0).toFixed(2)),totalCredit=Number(accountingLines.reduce((sum,row)=>sum+numeric(row.credit),0).toFixed(2))
  const accountingMatches=total>0&&Math.abs(totalDebit-totalCredit)<.005&&Math.abs(totalDebit-total)<.005
  const sourceSignature=JSON.stringify({type,contactId,detail,selected:selectedDocuments.map(row=>[row.id,row.balance])})

  useEffect(()=>{
    if(!formOpen)return
    const accountCode=type==='CXC'?assignments.CUSTOMERS_RECEIVABLE??'':assignments.SUPPLIERS_PAYABLE??''
    setAccountingLines(current=>{
      const manual=current.filter(row=>!row.automatic)
      const automatic=selectedDocuments.map(row=>({id:`document-${row.id}`,accountCode,contactId,contactName:selectedContact?.businessName??'',debit:type==='CXP'?row.balance:0,credit:type==='CXC'?row.balance:0,description:detail.trim()||`Ajuste ${row.number}`,automatic:true}))
      return[...automatic,...manual]
    })
    setEditingLine(null)
  },[sourceSignature,assignments,formOpen])

  const persistDrafts=(rows:PortfolioAdjustmentRecord[])=>{const sorted=[...rows].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));setDrafts(sorted);savePortfolioAdjustmentDrafts(context.company.id,sorted)}
  const reset=()=>{setEditingId(null);setNumber(nextNumber(context.company.id));setIssueDate(today());setType('CXC');setContactInput('');setContactId('');setDetail('');setSelectedIds(new Set());setAccountingLines([]);setActiveTab('ADJUSTMENT');setPickerOpen(false);setError('');setDeleteConfirm(false)}
  const openNew=()=>{reset();setMessage('');setFormOpen(true)}
  const chooseContact=(value:string)=>{setContactInput(value);const match=contacts.find(row=>contactLabel(row)===value);setContactId(match?.id??'');setSelectedIds(new Set());setError('')}
  const changeType=(value:PortfolioAdjustmentType)=>{setType(value);setContactInput('');setContactId('');setSelectedIds(new Set());setAccountingLines(current=>current.filter(row=>!row.automatic));setError('')}
  const record=(status:'GUARDADO'|'GENERADO'):PortfolioAdjustmentRecord=>{const now=new Date().toISOString(),id=editingId??crypto.randomUUID();return{id,companyId:context.company.id,number,issueDate,type,contactId,contactName:selectedContact?.businessName??'',detail:detail.trim(),total,status,payload:{documents:selectedDocuments,accountingLines},user:context.actor.name,createdAt:drafts.find(row=>row.id===id)?.createdAt??now,updatedAt:now}}
  const saveDraft=()=>{const row=record('GUARDADO');persistDrafts([row,...drafts.filter(item=>item.id!==row.id)]);setEditingId(row.id);setMessage(`El ajuste ${number} quedó guardado como borrador.`)}
  const openDraft=(row:PortfolioAdjustmentRecord)=>{setEditingId(row.id);setNumber(row.number);setIssueDate(row.issueDate);setType(row.type);const contact=(row.type==='CXC'?customers:providers).find(item=>item.id===row.contactId);setContactId(row.contactId);setContactInput(contact?contactLabel(contact):row.contactName);setDetail(row.detail);setSelectedIds(new Set(row.payload.documents.map(item=>item.id)));setAccountingLines(row.payload.accountingLines);setActiveTab('ADJUSTMENT');setError('');setMessage('');setFormOpen(true)}
  const removeDraft=()=>{if(editingId)persistDrafts(drafts.filter(row=>row.id!==editingId));const deleted=number;reset();setFormOpen(false);setMessage(`El ajuste ${deleted} fue eliminado.`)}
  const toggle=(id:string)=>setSelectedIds(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next})
  const toggleAll=()=>setSelectedIds(selectedIds.size===availableDocuments.length?new Set():new Set(availableDocuments.map(row=>row.id)))
  const addLine=()=>{const id=crypto.randomUUID();setAccountingLines(current=>[...current,{id,accountCode:'',contactId,contactName:selectedContact?.businessName??'',debit:0,credit:0,description:detail.trim(),automatic:false}]);setEditingLine(id)}
  const updateLine=(id:string,field:keyof PortfolioAdjustmentAccountingLine,value:string)=>setAccountingLines(current=>current.map(row=>row.id===id?{...row,[field]:field==='debit'||field==='credit'?numeric(value):value}:row))

  const generate=()=>{
    setError('')
    const dateError=validateOperationDate(toIso(issueDate));if(dateError){setError(dateError);return}
    if(!selectedContact){setError(`Selecciona un ${type==='CXC'?'Cliente':'Proveedor'} activo.`);return}
    if(!selectedDocuments.length){setActiveTab('ADJUSTMENT');setError(`Selecciona al menos una ${type==='CXC'?'Factura o Expensa':'Factura'} pendiente.`);return}
    const requiredAccount=type==='CXC'?assignments.CUSTOMERS_RECEIVABLE:assignments.SUPPLIERS_PAYABLE
    if(!requiredAccount){setActiveTab('ACCOUNTING');setError(`Configura ${type==='CXC'?'Cuenta x Cobrar Clientes':'Cuenta x Pagar Proveedores'} en Asignación de Cuentas Contables.`);return}
    if(accountingLines.some(line=>!accounts.some(account=>account.Codigo===line.accountCode))){setActiveTab('ACCOUNTING');setError('Todas las líneas deben utilizar una cuenta contable Auxiliar activa.');return}
    if(!accountingMatches){setActiveTab('ACCOUNTING');setError(`Asiento no Cuadra. Debe: ${money(totalDebit)} · Haber: ${money(totalCredit)} · Ajuste: ${money(total)}.`);return}
    const currentDocs=type==='CXC'?ensureCustomerReceivables(context.company.id).map(row=>({id:row.id,balance:row.balance})):payableDocuments(context.company.id,contactId).map(row=>({id:row.id,balance:row.balance}))
    if(selectedDocuments.some(row=>Math.abs((currentDocs.find(item=>item.id===row.id)?.balance??-1)-row.balance)>.005)){setError('Los saldos cambiaron mientras se preparaba el ajuste. Refresca y vuelve a seleccionar los documentos.');return}
    const adjustment=record('GENERADO'),voucherId=crypto.randomUUID(),now=new Date().toISOString();adjustment.accountingVoucherId=voucherId;adjustment.updatedAt=now
    saveAuthorizedPortfolioAdjustments(context.company.id,[adjustment,...readAuthorizedPortfolioAdjustments(context.company.id)])
    if(type==='CXC'){
      const ids=new Set(selectedDocuments.map(row=>row.id));const next=ensureCustomerReceivables(context.company.id).map(row=>ids.has(row.id)?{...row,balance:0,collectedAmount:row.originalAmount,status:'CANCELADA' as const,updatedAt:now}:row);saveCustomerReceivables(context.company.id,next);setReceivables(next)
    }else{
      const ids=new Set(selectedDocuments.map(row=>row.id)),key=`saga.cxp.payables:${context.company.id}`;localStorage.setItem(key,JSON.stringify(readJson<PayableRow[]>(key,[]).map(row=>ids.has(String(row.id))?{...row,balance:0,saldo:0,paid:numeric(row.total??row.originalAmount),status:'AJUSTADA'}:row)))
    }
    const voucherKey=accountingVoucherStorageKey(context.company.id),vouchers=readJson<Array<Record<string,unknown>>>(voucherKey,[])
    localStorage.setItem(voucherKey,JSON.stringify([{id:voucherId,number:getNextVoucherNumber(vouchers as AccountingVoucherRecord[],'AJUSTE_CARTERA',undefined,context.company.id),date:issueDate,type:'AJUSTE_CARTERA',description:detail.trim()||`Ajuste de Cartera ${number}`,debit:totalDebit.toFixed(2),credit:totalCredit.toFixed(2),status:'AUTORIZADO',sourcePortfolioAdjustmentId:adjustment.id,lines:accountingLines},...vouchers]))
    persistDrafts(drafts.filter(row=>row.id!==editingId));setFormOpen(false);setEditingId(null);setMessage(`El ajuste ${number} fue generado y creó el Asiento Contable de tipo Ajuste de Cartera.`)
    window.open(`/vista-previa/ajustes-cartera/${encodeURIComponent(adjustment.id)}`,'_blank','noopener,noreferrer')
  }

  return <div className="page screen-page portfolio-adjustment-page">
    <DocumentEditorHeader screen={screen} formOpen={formOpen} formTitle="Nuevo Ajuste de Cartera" sectionLabel="Cuentas por Cobrar" onClose={() => setFormOpen(false)} actions={<><button type="button" className="save" onClick={saveDraft}><Save/>Guardar Borrador</button><button type="button" className="delete" onClick={()=>setDeleteConfirm(true)}><Trash2/>Eliminar</button><button type="button" className="generate" onClick={generate}><CheckCircle2/>Generar Ajuste</button></>} listAction={<button type="button" className="primary-action" onClick={openNew}><Plus/>Nuevo Ajuste</button>} />
    {error&&<div className="portfolio-adjustment-feedback error" role="alert"><AlertTriangle/>{error}</div>}{message&&<div className="portfolio-adjustment-feedback success" role="status"><CheckCircle2/>{message}</div>}
    {deleteConfirm&&<div className="portfolio-adjustment-backdrop" role="alertdialog" aria-modal="true"><section><Trash2/><h2>¿Eliminar el ajuste?</h2><p>El borrador y sus líneas serán descartados.</p><footer><button type="button" className="quiet-button" onClick={()=>setDeleteConfirm(false)}>Cancelar</button><button type="button" onClick={removeDraft}>Sí, eliminar</button></footer></section></div>}
    {!formOpen?<section className="portfolio-adjustment-card pending"><header><strong>Ajustes de Cartera Pendientes de Completar</strong><span>{drafts.length} {drafts.length===1?'pendiente':'pendientes'}</span></header><div className="table-scroll"><table><thead><tr><th aria-label="Editar"/><th># Ajuste de Cartera</th><th>Fecha Emisión</th><th>Tipo</th><th>Proveedor/Cliente</th><th>Total</th><th>Estado</th></tr></thead><tbody>{drafts.map(row=><tr key={row.id}><td><button type="button" className="edit" onClick={()=>openDraft(row)} aria-label={`Editar ${row.number}`}><Pencil/></button></td><td><strong>{row.number}</strong></td><td>{row.issueDate}</td><td>{row.type==='CXC'?'CxC':'CxP'}</td><td>{row.contactName||'Pendiente de seleccionar'}</td><td className="money">{money(row.total)}</td><td><span className="draft-status">Guardado</span></td></tr>)}{!drafts.length&&<tr><td colSpan={7}><div className="portfolio-adjustment-empty"><FileCheck2/><strong>No existen ajustes pendientes</strong><span>Selecciona Nuevo Ajuste para iniciar un registro.</span></div></td></tr>}</tbody></table></div></section>:<>
      <section className="portfolio-adjustment-card data"><header><strong>Datos del Ajuste</strong><button type="button" className="close" onClick={()=>setFormOpen(false)} aria-label="Cerrar y volver al listado" title="Cerrar y volver al grid"><X/></button></header><div className="portfolio-adjustment-form"><label><span># Ajuste</span><input value={number} readOnly/></label><label><span>Fecha</span><input value={issueDate} onFocus={event=>event.currentTarget.select()} onChange={event=>setIssueDate(formatFullDateInput(event.target.value))} maxLength={10} inputMode="numeric" placeholder="DD/MM/AAAA"/></label><label><span>Tipo</span><select value={type} onChange={event=>changeType(event.target.value as PortfolioAdjustmentType)}><option value="CXC">CxC</option><option value="CXP">CxP</option></select></label><label className="contact"><span>{type==='CXC'?'Cliente':'Proveedor'}</span><SearchableDatalistInput list="portfolio-adjustment-contact-options" value={contactInput} onChange={event=>chooseContact(event.target.value)} onClear={()=>chooseContact('')} clearLabel="Borrar selección" placeholder={`Escribe para filtrar ${type==='CXC'?'clientes':'proveedores'}`}/><datalist id="portfolio-adjustment-contact-options">{contacts.map(row=><option key={row.id} value={contactLabel(row)}/>)}</datalist></label><label className="detail"><span>Detalle</span><textarea value={detail} onChange={event=>setDetail(event.target.value)} maxLength={180}/><small>{detail.length}/180</small></label><label><span>Total</span><input className="total" value={money(total)} readOnly/></label></div></section>
      <section className="portfolio-adjustment-card tabs"><nav><button type="button" className={activeTab==='ADJUSTMENT'?'active':''} onClick={()=>setActiveTab('ADJUSTMENT')}><FileText/>Ajuste</button><button type="button" className={activeTab==='ACCOUNTING'?'active':''} onClick={()=>setActiveTab('ACCOUNTING')}><Scale/>Contabilidad</button></nav>{activeTab==='ADJUSTMENT'?<div className="adjustment-tab"><header><button type="button" className="primary-action" disabled={!selectedContact} onClick={()=>setPickerOpen(true)}><Plus/>{type==='CXC'?'Factura/Expensa':'Facturas'}</button><span>{selectedDocuments.length} documentos seleccionados</span></header><div className="table-scroll"><table><thead><tr><th>Documento</th><th>Fecha Emisión</th><th>Total</th><th>Cobrado/Pagado</th><th>Saldo</th><th>Detalle</th></tr></thead><tbody>{selectedDocuments.map(row=><tr key={row.id}><td><strong>{row.number}</strong></td><td>{row.issueDate}</td><td className="money">{money(row.total)}</td><td className="money">{money(row.paid)}</td><td className="money">{money(row.balance)}</td><td>{row.description}</td></tr>)}{!selectedDocuments.length&&<tr><td colSpan={6}><div className="portfolio-adjustment-empty"><FileText/><strong>Sin documentos seleccionados</strong><span>Escoge el contacto y utiliza el botón superior para seleccionar sus documentos pendientes.</span></div></td></tr>}</tbody><tfoot><tr><td colSpan={4}>Total</td><td className="money">{money(total)}</td><td>{selectedDocuments.length} documentos</td></tr></tfoot></table></div></div>:<div className="accounting-tab"><header><strong>Asiento Contable</strong><button type="button" className="quiet-button" onClick={addLine}><Plus/>Agregar Línea</button></header><div className="table-scroll"><table><thead><tr><th>Acciones</th><th>Cuenta Contable</th><th>Contacto</th><th>Debe</th><th>Haber</th><th>Descripción</th></tr></thead><tbody>{accountingLines.map(line=>{const editing=editingLine===line.id;return<tr key={line.id}><td><div className="line-actions"><button type="button" onClick={()=>setEditingLine(editing?null:line.id)}>{editing?<Check/>:<Pencil/>}</button>{!line.automatic&&<button type="button" onClick={()=>setAccountingLines(current=>current.filter(row=>row.id!==line.id))}><Trash2/></button>}</div></td><td>{editing?<SearchableDatalistInput list="portfolio-adjustment-account-options" value={line.accountCode} onChange={event=>updateLine(line.id,'accountCode',event.target.value)} onClear={()=>updateLine(line.id,'accountCode','')} clearLabel="Borrar cuenta" placeholder="Filtrar Plan Contable"/>:<span><strong>{line.accountCode||'—'}</strong><small>{accounts.find(row=>row.Codigo===line.accountCode)?.['Descripción']}</small></span>}</td><td>{line.contactName||'—'}</td><td className={!accountingMatches?'mismatch':''}>{editing?<input value={line.debit||''} onFocus={event=>event.currentTarget.select()} onChange={event=>updateLine(line.id,'debit',event.target.value)} inputMode="decimal"/>:line.debit?money(line.debit):'—'}</td><td className={!accountingMatches?'mismatch':''}>{editing?<input value={line.credit||''} onFocus={event=>event.currentTarget.select()} onChange={event=>updateLine(line.id,'credit',event.target.value)} inputMode="decimal"/>:line.credit?money(line.credit):'—'}</td><td>{editing?<input value={line.description} onChange={event=>updateLine(line.id,'description',event.target.value)} maxLength={180}/>:line.description||'—'}</td></tr>})}{!accountingLines.length&&<tr><td colSpan={6}><div className="portfolio-adjustment-empty"><Scale/><strong>Asiento pendiente</strong><span>Selecciona los documentos para generar las líneas automáticas.</span></div></td></tr>}</tbody><tfoot><tr className={!accountingMatches?'mismatch':''}><td colSpan={3}>Totales</td><td className="money">{money(totalDebit)}</td><td className="money">{money(totalCredit)}</td><td>Ajuste: {money(total)}</td></tr></tfoot></table><datalist id="portfolio-adjustment-account-options">{accounts.map(row=><option key={row.Codigo} value={row.Codigo}>{row['Descripción']}</option>)}</datalist></div></div>}</section>
    </>}
    {pickerOpen&&<div className="portfolio-adjustment-backdrop picker" role="dialog" aria-modal="true"><section><header><div><h2>{type==='CXC'?'Facturas Pendientes':'Facturas Pendientes'}</h2><span>{selectedContact?.businessName}</span></div><button type="button" onClick={()=>setPickerOpen(false)} aria-label="Cerrar"><X/></button></header><div className="table-scroll"><table><thead><tr><th><input type="checkbox" checked={availableDocuments.length>0&&selectedIds.size===availableDocuments.length} onChange={toggleAll}/></th><th>Documento</th><th>Fecha Emisión</th><th>Total</th><th>Cobrado/Pagado</th><th>Saldo</th><th>Detalle</th></tr></thead><tbody>{availableDocuments.map(row=><tr key={row.id} className={selectedIds.has(row.id)?'selected':''}><td><input type="checkbox" checked={selectedIds.has(row.id)} onChange={()=>toggle(row.id)}/></td><td><strong>{row.number}</strong></td><td>{row.issueDate}</td><td className="money">{money(row.total)}</td><td className="money">{money(row.paid)}</td><td className="money">{money(row.balance)}</td><td>{row.description}</td></tr>)}{!availableDocuments.length&&<tr><td colSpan={7}><div className="portfolio-adjustment-empty"><FileText/><strong>No existen documentos pendientes</strong><span>El contacto seleccionado no registra cartera disponible para ajustar.</span></div></td></tr>}</tbody><tfoot><tr><td colSpan={5}>Total seleccionado</td><td className="money">{money(total)}</td><td/></tr></tfoot></table></div><footer><button type="button" className="primary-action" onClick={()=>setPickerOpen(false)}><Check/>Aceptar</button></footer></section></div>}
  </div>
}
