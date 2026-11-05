import {useMemo,useState} from 'react'
import {useQuery} from '@tanstack/react-query'
import {AlertTriangle,ChevronRight,FileOutput,Printer,RotateCcw} from 'lucide-react'
import {api} from './api'
import {accountingVoucherStorageKey,voucherTypeLabels} from './AccountingVoucherPage'
import {standardVoucherTypes} from './AccountingVoucherTypesPage'
import {SearchableDatalistInput} from './SearchableDatalistInput'
import type {Context,ScreenSpec} from './types'

type VoucherRecord={
  id:string
  number:string
  date:string
  type:string
  description:string
  status:string
  sourceExpenseId?:string
  sourceCollectionId?:string
  sourceDepositId?:string
  sourceDepositAnnulmentId?:string
  sourceCollectionAnnulmentId?:string
  sourceAdvanceCrossingId?:string
  sourceAdvanceCrossingAnnulmentId?:string
  sourceEgressId?:string
  sourceEgressAnnulmentId?:string
  sourcePortfolioAdjustmentId?:string
  lines?:unknown[]
}

function readVouchers(companyId:string){
  try{
    const value=JSON.parse(localStorage.getItem(accountingVoucherStorageKey(companyId))??'[]')
    return Array.isArray(value)?value as VoucherRecord[]:[]
  }catch{return[]}
}

function typeLabel(type:string){
  if(type==='AJUSTE_CARTERA')return'Ajuste de Cartera'
  return(voucherTypeLabels as Record<string,string>)[type]??type.toLocaleLowerCase('es').split('_').filter(Boolean).map(word=>word.charAt(0).toLocaleUpperCase('es')+word.slice(1)).join(' ')
}

function previewPath(voucher:VoucherRecord){
  if(voucher.sourceExpenseId)return`/vista-previa/expensas/${encodeURIComponent(voucher.sourceExpenseId)}`
  if(voucher.sourceCollectionAnnulmentId)return`/vista-previa/anulaciones-recaudacion/${encodeURIComponent(voucher.sourceCollectionAnnulmentId)}`
  if(voucher.sourceCollectionId)return`/vista-previa/recaudaciones/${encodeURIComponent(voucher.sourceCollectionId)}`
  if(voucher.sourceDepositAnnulmentId)return`/vista-previa/anulaciones-deposito/${encodeURIComponent(voucher.sourceDepositAnnulmentId)}`
  if(voucher.sourceDepositId)return`/vista-previa/depositos/${encodeURIComponent(voucher.sourceDepositId)}`
  if(voucher.sourceAdvanceCrossingAnnulmentId)return`/vista-previa/anulaciones-cruce-anticipos-clientes/${encodeURIComponent(voucher.sourceAdvanceCrossingAnnulmentId)}`
  if(voucher.sourceAdvanceCrossingId)return`/vista-previa/cruce-anticipos-clientes/${encodeURIComponent(voucher.sourceAdvanceCrossingId)}`
  if(voucher.sourcePortfolioAdjustmentId)return`/vista-previa/ajustes-cartera/${encodeURIComponent(voucher.sourcePortfolioAdjustmentId)}`
  if(voucher.sourceEgressId&&!voucher.sourceEgressAnnulmentId)return`/vista-previa/egresos/${encodeURIComponent(voucher.sourceEgressId)}`
  if(Array.isArray(voucher.lines))return`/vista-previa/comprobantes-contables/${encodeURIComponent(voucher.id)}`
  return''
}

function voucherLabel(voucher:VoucherRecord){return`${voucher.number} · ${voucher.date} · ${voucher.description||typeLabel(voucher.type)}`}

export function AccountingVoucherReprintPage({screen}:{screen:ScreenSpec}){
  const context=useQuery({queryKey:['context'],queryFn:api.context})
  if(!context.data)return null
  return<AccountingVoucherReprintManager key={context.data.company.id} screen={screen} context={context.data}/>
}

function AccountingVoucherReprintManager({screen,context}:{screen:ScreenSpec;context:Context}){
  const allVouchers=useMemo(()=>readVouchers(context.company.id).filter(voucher=>voucher.status.toUpperCase()==='AUTORIZADO'),[context.company.id])
  const vouchers=useMemo(()=>allVouchers.filter(voucher=>Boolean(previewPath(voucher))),[allVouchers])
  const types=useMemo(()=>Array.from(new Set([...standardVoucherTypes.map(row=>row.code),...allVouchers.map(voucher=>voucher.type)])).sort((left,right)=>typeLabel(left).localeCompare(typeLabel(right),'es')),[allVouchers])
  const [type,setType]=useState('')
  const [voucherInput,setVoucherInput]=useState('')
  const [voucherId,setVoucherId]=useState('')
  const [error,setError]=useState('')
  const filteredVouchers=useMemo(()=>vouchers.filter(voucher=>voucher.type===type).sort((left,right)=>right.date.localeCompare(left.date)||right.number.localeCompare(left.number,'es',{numeric:true})),[type,vouchers])
  const selectedVoucher=filteredVouchers.find(voucher=>voucher.id===voucherId)

  const changeType=(value:string)=>{setType(value);setVoucherInput('');setVoucherId('');setError('')}
  const chooseVoucher=(value:string)=>{setVoucherInput(value);setVoucherId(filteredVouchers.find(voucher=>voucherLabel(voucher)===value)?.id??'');setError('')}
  const reprint=()=>{
    if(!type){setError('Selecciona el Tipo de Comprobante.');return}
    if(!selectedVoucher){setError('Selecciona el # Comprobante que deseas reimprimir.');return}
    const path=previewPath(selectedVoucher)
    if(!path){setError('El comprobante seleccionado no conserva una vista previa original disponible.');return}
    window.open(path,'_blank','noopener,noreferrer')
  }

  return<div className="page screen-page voucher-reprint-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header voucher-reprint-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div></section>
    {error&&<div className="voucher-reprint-feedback" role="alert"><AlertTriangle/>{error}</div>}
    <section className="voucher-reprint-card">
      <header><FileOutput/><strong>Reimpresión de Comprobante Contable</strong></header>
      <div className="voucher-reprint-fields">
        <label><span>Tipo de Comprobante</span><select value={type} onChange={event=>changeType(event.target.value)}><option value="">Seleccionar tipo</option>{types.map(value=><option key={value} value={value}>{typeLabel(value)}</option>)}</select></label>
        <label><span># Comprobante</span><SearchableDatalistInput disabled={!type} list="voucher-reprint-number-options" value={voucherInput} onChange={event=>chooseVoucher(event.target.value)} onClear={()=>chooseVoucher('')} clearLabel="Borrar comprobante" placeholder={type?'Escribe para filtrar los comprobantes':'Primero selecciona el tipo'}/><datalist id="voucher-reprint-number-options">{filteredVouchers.map(voucher=><option key={voucher.id} value={voucherLabel(voucher)}/>)}</datalist></label>
        <button type="button" className="voucher-reprint-action" disabled={!type||!selectedVoucher} onClick={reprint}><Printer/>Re-Imprimir</button>
      </div>
      <footer><RotateCcw/><span>{selectedVoucher?`Se abrirá nuevamente el PDF original de ${selectedVoucher.number}.`:type?filteredVouchers.length?`${filteredVouchers.length} comprobantes disponibles para ${typeLabel(type)}.`:`No existen comprobantes de ${typeLabel(type)} con PDF original disponible.`:`${vouchers.length} comprobantes con PDF original disponibles.`}</span></footer>
    </section>
  </div>
}
