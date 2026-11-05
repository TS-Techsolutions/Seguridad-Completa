export type EgressPaymentMethod='EFECTIVO'|'CHEQUE'|'DEBITO'|'TARJETA_CREDITO'|'TRANSFERENCIA'
export type EgressPaymentType='EMPLEADOS'|'CAJA_CHICA'|'DEVOLUCION_CLIENTE'|'PROVEEDORES'
export type EgressDocumentKind='FACTURA'|'ANTICIPO'|'SOLICITUD'

export type EgressDocumentLine={
  id:string
  sourceId:string
  kind:EgressDocumentKind
  number:string
  description:string
  total:number
  paid:number
  balance:number
  value:number
  accountCode:string
}

export type EgressAccountingLine={
  id:string
  accountCode:string
  contactId:string
  contactName:string
  debit:number
  credit:number
  description:string
  automatic:boolean
  missingAccount?:boolean
}

export type BankEgressPayload={
  chooseDocument:boolean
  documentLines:EgressDocumentLine[]
  accountingLines:EgressAccountingLine[]
  activeTab:'DOCUMENTS'|'ACCOUNTING'
}

export type BankEgressDraft={
  id:string
  companyId:string
  number:string
  paymentMethod:EgressPaymentMethod|''
  paymentType:EgressPaymentType|''
  issueDate:string
  contactId:string
  contactName:string
  beneficiary:string
  bankAccountId:string
  documentNumber:string
  description:string
  total:number
  status:'GUARDADO'
  payload:BankEgressPayload
  createdAt:string
  updatedAt:string
}

export type AuthorizedBankEgress=Omit<BankEgressDraft,'status'|'updatedAt'>&{
  status:'GENERADO'|'ANULADO'
  accountingVoucherId:string
  user:string
  generatedAt:string
  annulmentId?:string
  annulledAt?:string
  chequeDisposition?:'LIBERAR'|'ANULAR'
  checkHistory?:Array<{number:string;status:'SUSTITUIDO';replacedAt:string;replacementId:string}>
}

const draftKey=(companyId:string)=>`saga.banking.egress-drafts:${companyId}`
const authorizedKey=(companyId:string)=>`saga.banking.authorized-egresses:${companyId}`

function read<T>(key:string):T[]{try{const value=JSON.parse(localStorage.getItem(key)??'[]');return Array.isArray(value)?value:[]}catch{return[]}}
export function readBankEgressDrafts(companyId:string){return read<BankEgressDraft>(draftKey(companyId))}
export function saveBankEgressDrafts(companyId:string,rows:BankEgressDraft[]){localStorage.setItem(draftKey(companyId),JSON.stringify(rows))}
export function readAuthorizedBankEgresses(companyId:string){return read<AuthorizedBankEgress>(authorizedKey(companyId))}
export function saveAuthorizedBankEgresses(companyId:string,rows:AuthorizedBankEgress[]){localStorage.setItem(authorizedKey(companyId),JSON.stringify(rows))}

export function nextBankEgressNumber(companyId:string){
  const greatest=[...readBankEgressDrafts(companyId),...readAuthorizedBankEgresses(companyId)].reduce((maximum,row)=>Math.max(maximum,Number(/(\d+)$/.exec(row.number)?.[1]??0)),0)
  return`EGR-${String(greatest+1).padStart(6,'0')}`
}

export function nextPaymentDocumentNumber(companyId:string,method:EgressPaymentMethod|'',bankAccountId=''){
  if(!method)return''
  const prefix:Record<EgressPaymentMethod,string>={EFECTIVO:'EFE',CHEQUE:'CHQ',DEBITO:'DEB',TARJETA_CREDITO:'TDC',TRANSFERENCIA:'TRF'}
  const records=[...readBankEgressDrafts(companyId),...readAuthorizedBankEgresses(companyId)].filter(row=>row.paymentMethod===method&&(method!=='CHEQUE'||!bankAccountId||row.bankAccountId===bankAccountId))
  const greatest=records.reduce((maximum,row)=>Math.max(maximum,Number(/(\d+)$/.exec(row.documentNumber)?.[1]??0)),0)
  const next=Math.max(greatest+1,method==='CHEQUE'&&bankAccountId?configuredCheckbookStart(companyId,bankAccountId):1)
  return`${prefix[method]}-${String(next).padStart(6,'0')}`
}
import { configuredCheckbookStart } from './document-sequences'

