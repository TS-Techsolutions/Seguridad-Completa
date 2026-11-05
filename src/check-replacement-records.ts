import { readAuthorizedBankEgresses } from './bank-egress-records'
import { configuredCheckbookStart } from './document-sequences'

export type CheckReplacementRecord={
  id:string
  companyId:string
  egressId:string
  bankAccountId:string
  oldCheckNumber:string
  newCheckNumber:string
  beneficiary:string
  amount:number
  issueDate:string
  createdAt:string
  user:string
}

const storageKey=(companyId:string)=>`saga.banking.check-replacements:${companyId}`
export function readCheckReplacements(companyId:string):CheckReplacementRecord[]{try{const rows=JSON.parse(localStorage.getItem(storageKey(companyId))??'[]');return Array.isArray(rows)?rows:[]}catch{return[]}}
export function saveCheckReplacements(companyId:string,rows:CheckReplacementRecord[]){localStorage.setItem(storageKey(companyId),JSON.stringify(rows))}
export function nextReplacementCheckNumber(companyId:string,bankAccountId=''){
  const numbers=[...readAuthorizedBankEgresses(companyId).filter(row=>row.paymentMethod==='CHEQUE'&&(!bankAccountId||row.bankAccountId===bankAccountId)).map(row=>row.documentNumber),...readCheckReplacements(companyId).filter(row=>!bankAccountId||row.bankAccountId===bankAccountId).map(row=>row.newCheckNumber)]
  const greatest=numbers.reduce((maximum,value)=>Math.max(maximum,Number(/(\d+)$/.exec(value)?.[1]??0)),0)
  const next=Math.max(greatest+1,bankAccountId?configuredCheckbookStart(companyId,bankAccountId):1)
  return`CHQ-${String(next).padStart(6,'0')}`
}
