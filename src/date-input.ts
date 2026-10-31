export function formatFullDateInput(value:string){
  const digits=value.replace(/\D/g,'').slice(0,8)
  if(digits.length<=2)return digits
  if(digits.length<=4)return `${digits.slice(0,2)}/${digits.slice(2)}`
  return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`
}

export function formatMonthYearInput(value:string){
  const digits=value.replace(/\D/g,'').slice(0,6)
  return digits.length<=2?digits:`${digits.slice(0,2)}/${digits.slice(2)}`
}

export function isoToDisplayDate(value:string){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match?`${match[3]}/${match[2]}/${match[1]}`:value
}

export function dateInputToIsoOrDraft(value:string){
  const formatted=formatFullDateInput(value)
  const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(formatted)
  return match?`${match[3]}-${match[2]}-${match[1]}`:formatted
}
