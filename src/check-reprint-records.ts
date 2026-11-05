export type CheckReprintRecord={id:string;companyId:string;egressId:string;bankAccountId:string;checkNumber:string;user:string;createdAt:string}
const storageKey=(companyId:string)=>`saga.banking.check-reprints:${companyId}`
export function readCheckReprints(companyId:string):CheckReprintRecord[]{try{const rows=JSON.parse(localStorage.getItem(storageKey(companyId))??'[]');return Array.isArray(rows)?rows:[]}catch{return[]}}
export function saveCheckReprints(companyId:string,rows:CheckReprintRecord[]){localStorage.setItem(storageKey(companyId),JSON.stringify(rows))}
