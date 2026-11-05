export type SupplierAdvanceStatus='BORRADOR'|'GENERADO'|'PAGADO'|'PENDIENTE_CRUCE'|'ANULADO'

export type SupplierAdvanceRecord={
  id:string
  companyId:string
  number:string
  issueDate:string
  supplierId:string
  supplierName:string
  detail:string
  total:number
  status:SupplierAdvanceStatus
  createdAt:string
  updatedAt:string
  generatedAt?:string
  paidAt?:string
  annulledAt?:string
  annulmentId?:string
  balance?:number
  sourceUploadId?:string
  sourceDocument?:string
  origin?:'MANUAL'|'CARGA'
}

export function supplierAdvanceStorageKey(companyId:string){
  return `saga.cxp.supplier-advances:${companyId}`
}

export const SUPPLIER_ADVANCES_CHANGED_EVENT='saga:cxp-supplier-advances-changed'

export function readSupplierAdvances(companyId:string):SupplierAdvanceRecord[]{
  try{
    const stored=JSON.parse(localStorage.getItem(supplierAdvanceStorageKey(companyId))??'[]')
    if(!Array.isArray(stored))return[]
    return stored.filter((item):item is SupplierAdvanceRecord=>Boolean(
      item&&typeof item.id==='string'&&item.companyId===companyId&&typeof item.number==='string'
      &&typeof item.issueDate==='string'&&typeof item.supplierId==='string'&&typeof item.supplierName==='string'
      &&Number.isFinite(Number(item.total))&&['BORRADOR','GENERADO','PAGADO','PENDIENTE_CRUCE','ANULADO'].includes(item.status),
    )).map(item=>({...item,total:Number(item.total),...(item.balance===undefined?{}:{balance:Number(item.balance)})}))
  }catch{return[]}
}

export function saveSupplierAdvances(companyId:string,records:SupplierAdvanceRecord[]){
  localStorage.setItem(supplierAdvanceStorageKey(companyId),JSON.stringify(records))
  window.dispatchEvent(new CustomEvent(SUPPLIER_ADVANCES_CHANGED_EVENT,{detail:{companyId}}))
}

export function nextSupplierAdvanceNumber(companyId:string){
  const greatest=readSupplierAdvances(companyId).reduce((maximum,record)=>{
    const sequence=Number(/(\d+)$/.exec(record.number)?.[1]??0)
    return Math.max(maximum,sequence)
  },0)
  return `ANT-PROV-${String(greatest+1).padStart(6,'0')}`
}
