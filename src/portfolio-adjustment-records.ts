export type PortfolioAdjustmentType='CXC'|'CXP'
export type PortfolioAdjustmentStatus='GUARDADO'|'GENERADO'

export type PortfolioAdjustmentDocument={
  id:string
  number:string
  issueDate:string
  total:number
  paid:number
  balance:number
  description:string
}

export type PortfolioAdjustmentAccountingLine={
  id:string
  accountCode:string
  contactId:string
  contactName:string
  debit:number
  credit:number
  description:string
  automatic:boolean
}

export type PortfolioAdjustmentPayload={
  documents:PortfolioAdjustmentDocument[]
  accountingLines:PortfolioAdjustmentAccountingLine[]
}

export type PortfolioAdjustmentRecord={
  id:string
  companyId:string
  number:string
  issueDate:string
  type:PortfolioAdjustmentType
  contactId:string
  contactName:string
  detail:string
  total:number
  status:PortfolioAdjustmentStatus
  payload:PortfolioAdjustmentPayload
  accountingVoucherId?:string
  user:string
  createdAt:string
  updatedAt:string
}

function draftsKey(companyId:string){return`saga.cxc.portfolio-adjustments.drafts:${companyId}`}
function authorizedKey(companyId:string){return`saga.cxc.portfolio-adjustments.authorized:${companyId}`}

function read(key:string){
  try{
    const value=JSON.parse(localStorage.getItem(key)??'[]')
    return Array.isArray(value)?value as PortfolioAdjustmentRecord[]:[]
  }catch{return[]}
}

export function readPortfolioAdjustmentDrafts(companyId:string){return read(draftsKey(companyId))}
export function readAuthorizedPortfolioAdjustments(companyId:string){return read(authorizedKey(companyId))}
export function savePortfolioAdjustmentDrafts(companyId:string,records:PortfolioAdjustmentRecord[]){localStorage.setItem(draftsKey(companyId),JSON.stringify(records))}
export function saveAuthorizedPortfolioAdjustments(companyId:string,records:PortfolioAdjustmentRecord[]){localStorage.setItem(authorizedKey(companyId),JSON.stringify(records))}
