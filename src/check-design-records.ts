export type CheckFieldKey='placeDate'|'payee'|'amountNumber'|'amountWords'|'detail'
export type CheckFieldAlignment='left'|'center'|'right'
export type CheckDesignField={key:CheckFieldKey;label:string;enabled:boolean;x:number;y:number;width:number;fontSize:number;alignment:CheckFieldAlignment}
export type CheckPrintDesign={companyId:string;bankAccountId:string;widthMm:number;heightMm:number;offsetXmm:number;offsetYmm:number;city:string;fields:CheckDesignField[];updatedAt:string}

const labels:Record<CheckFieldKey,string>={placeDate:'Lugar y Fecha de Emisión',payee:'Beneficiario',amountNumber:'Valor numérico',amountWords:'Valor en letras',detail:'Detalle'}
const storageKey=(companyId:string)=>`saga.banking.check-designs:${companyId}`

export function defaultCheckDesign(companyId:string,bankAccountId:string):CheckPrintDesign{
  const field=(key:CheckFieldKey,enabled:boolean,x:number,y:number,width:number,fontSize:number,alignment:CheckFieldAlignment='left'):CheckDesignField=>({key,label:labels[key],enabled,x,y,width,fontSize,alignment})
  return{companyId,bankAccountId,widthMm:180,heightMm:80,offsetXmm:0,offsetYmm:0,city:'Guayaquil',updatedAt:new Date(0).toISOString(),fields:[
    field('payee',true,27,24,112,10),field('amountNumber',true,145,24,27,10,'right'),field('amountWords',true,27,38,141,9),field('placeDate',true,69,53,99,9),field('detail',false,27,66,141,8),
  ]}
}

function migrateDesign(companyId:string,row:Partial<CheckPrintDesign>&{fields?:Array<Partial<CheckDesignField>&{key?:string}>}):CheckPrintDesign{
  const base=defaultCheckDesign(companyId,String(row.bankAccountId??'')),storedFields=Array.isArray(row.fields)?row.fields:[]
  const fields=base.fields.map(defaultField=>{const stored=storedFields.find(field=>field.key===defaultField.key);return stored?{...defaultField,...stored,key:defaultField.key,label:labels[defaultField.key]}:defaultField})
  return{...base,...row,companyId,bankAccountId:String(row.bankAccountId??''),city:String(row.city||base.city),fields}
}

export function readCheckDesigns(companyId:string):CheckPrintDesign[]{try{const value=JSON.parse(localStorage.getItem(storageKey(companyId))??'[]');return Array.isArray(value)?value.map(row=>migrateDesign(companyId,row)):[]}catch{return[]}}
export function loadCheckDesign(companyId:string,bankAccountId:string){return readCheckDesigns(companyId).find(row=>row.bankAccountId===bankAccountId)??defaultCheckDesign(companyId,bankAccountId)}
export function saveCheckDesign(design:CheckPrintDesign){const rows=readCheckDesigns(design.companyId),next=[design,...rows.filter(row=>row.bankAccountId!==design.bankAccountId)];localStorage.setItem(storageKey(design.companyId),JSON.stringify(next))}

export function formatCheckPlaceDate(city:string,date:string){
  const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const slash=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date),iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const day=Number(slash?.[1]??iso?.[3]??0),month=Number(slash?.[2]??iso?.[2]??0),year=slash?.[3]??iso?.[1]??''
  const cleanCity=city.trim()||'Guayaquil'
  return month>=1&&month<=12&&day?`${cleanCity}, ${months[month-1]} ${day} de ${year}`:`${cleanCity}, ${date}`
}
