import type { EgressAccountingLine, EgressPaymentMethod } from './bank-egress-records'

export type EgressChequeDisposition = '' | 'LIBERAR' | 'ANULAR'
export type EgressAnnulmentPayload = {
  egressId:string
  chequeDisposition:EgressChequeDisposition
  accountingLines:EgressAccountingLine[]
  activeTab:'DETAIL'|'ACCOUNTING'
}
export type EgressAnnulmentDraft = {
  id:string
  companyId:string
  number:string
  date:string
  detail:string
  beneficiary:string
  total:number
  paymentMethod:EgressPaymentMethod|''
  status:'GUARDADA'
  payload:EgressAnnulmentPayload
  createdAt:string
  updatedAt:string
}
export type AuthorizedEgressAnnulment = Omit<EgressAnnulmentDraft,'status'|'updatedAt'>&{
  status:'GENERADA'
  accountingVoucherId:string
  user:string
  generatedAt:string
}

const draftKey=(companyId:string)=>`saga.banking.egress-annulment-drafts:${companyId}`
const authorizedKey=(companyId:string)=>`saga.banking.authorized-egress-annulments:${companyId}`
function read<T>(key:string):T[]{try{const rows=JSON.parse(localStorage.getItem(key)??'[]');return Array.isArray(rows)?rows:[]}catch{return[]}}
export function readEgressAnnulmentDrafts(companyId:string){return read<EgressAnnulmentDraft>(draftKey(companyId))}
export function saveEgressAnnulmentDrafts(companyId:string,rows:EgressAnnulmentDraft[]){localStorage.setItem(draftKey(companyId),JSON.stringify(rows))}
export function readAuthorizedEgressAnnulments(companyId:string){return read<AuthorizedEgressAnnulment>(authorizedKey(companyId))}
export function saveAuthorizedEgressAnnulments(companyId:string,rows:AuthorizedEgressAnnulment[]){localStorage.setItem(authorizedKey(companyId),JSON.stringify(rows))}
export function nextEgressAnnulmentNumber(companyId:string){
  const greatest=[...readEgressAnnulmentDrafts(companyId),...readAuthorizedEgressAnnulments(companyId)].reduce((maximum,row)=>Math.max(maximum,Number(/(\d+)$/.exec(row.number)?.[1]??0)),0)
  return`ANU-EGR-${String(greatest+1).padStart(6,'0')}`
}
