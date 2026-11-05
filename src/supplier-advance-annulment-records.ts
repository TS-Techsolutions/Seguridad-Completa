export type SupplierAdvanceAnnulmentLine={
  id:string
  advanceId:string
  advanceNumber:string
  advanceDate:string
  value:number
}

export type SupplierAdvanceAnnulmentStatus='BORRADOR'|'GENERADA'

export type SupplierAdvanceAnnulmentRecord={
  id:string
  companyId:string
  number:string
  issueDate:string
  supplierId:string
  supplierName:string
  detail:string
  total:number
  status:SupplierAdvanceAnnulmentStatus
  lines:SupplierAdvanceAnnulmentLine[]
  createdAt:string
  updatedAt:string
  generatedAt?:string
}

function storageKey(companyId:string){return`saga.cxp.supplier-advance-annulments:${companyId}`}

export function readSupplierAdvanceAnnulments(companyId:string):SupplierAdvanceAnnulmentRecord[]{
  try{
    const stored=JSON.parse(localStorage.getItem(storageKey(companyId))??'[]')
    if(!Array.isArray(stored))return[]
    return stored.filter((item):item is SupplierAdvanceAnnulmentRecord=>Boolean(
      item&&item.companyId===companyId&&typeof item.id==='string'&&typeof item.number==='string'
      &&typeof item.issueDate==='string'&&typeof item.supplierId==='string'&&Array.isArray(item.lines)
      &&['BORRADOR','GENERADA'].includes(item.status),
    )).map(item=>({...item,total:Number(item.total)||0,lines:item.lines.map(line=>({...line,value:Number(line.value)||0}))}))
  }catch{return[]}
}

export function saveSupplierAdvanceAnnulments(companyId:string,records:SupplierAdvanceAnnulmentRecord[]){
  localStorage.setItem(storageKey(companyId),JSON.stringify(records))
}

export function nextSupplierAdvanceAnnulmentNumber(companyId:string){
  const greatest=readSupplierAdvanceAnnulments(companyId).reduce((maximum,record)=>{
    const sequence=Number(/(\d+)$/.exec(record.number)?.[1]??0)
    return Math.max(maximum,sequence)
  },0)
  return`ANU-ANT-PROV-${String(greatest+1).padStart(6,'0')}`
}
