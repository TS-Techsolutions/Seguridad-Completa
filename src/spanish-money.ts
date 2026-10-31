const units = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
const twenties = ['VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE']
const tens = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

function belowHundred(value: number) {
  if (value < 10) return units[value]
  if (value < 20) return teens[value - 10]
  if (value < 30) return twenties[value - 20]
  const ten = Math.floor(value / 10)
  const unit = value % 10
  return unit ? `${tens[ten]} Y ${units[unit]}` : tens[ten]
}

function belowThousand(value: number) {
  if (value === 100) return 'CIEN'
  const hundred = Math.floor(value / 100)
  const rest = value % 100
  return [hundreds[hundred], belowHundred(rest)].filter(Boolean).join(' ')
}

function apocopate(value: string) {
  return value.replace(/VEINTIUNO$/, 'VEINTIÚN').replace(/ Y UNO$/, ' Y UN').replace(/UNO$/, 'UN')
}

function integerToSpanish(value: number): string {
  if (value === 0) return 'CERO'
  if (value < 1_000) return belowThousand(value)
  if (value < 1_000_000) {
    const thousands = Math.floor(value / 1_000)
    const rest = value % 1_000
    const prefix = thousands === 1 ? 'MIL' : `${apocopate(integerToSpanish(thousands))} MIL`
    return [prefix, rest ? belowThousand(rest) : ''].filter(Boolean).join(' ')
  }
  if (value < 1_000_000_000) {
    const millions = Math.floor(value / 1_000_000)
    const rest = value % 1_000_000
    const prefix = millions === 1 ? 'UN MILLÓN' : `${apocopate(integerToSpanish(millions))} MILLONES`
    return [prefix, rest ? integerToSpanish(rest) : ''].filter(Boolean).join(' ')
  }
  return value.toLocaleString('es-EC', { maximumFractionDigits: 0 })
}

export function moneyToSpanish(value: number) {
  if (!Number.isFinite(value)) return 'CERO CON 00/100 DÓLARES'
  const roundedCents = Math.round(Math.abs(value) * 100)
  const whole = Math.floor(roundedCents / 100)
  const cents = roundedCents % 100
  const sign = value < 0 ? 'MENOS ' : ''
  return `${sign}${integerToSpanish(whole)} CON ${String(cents).padStart(2, '0')}/100 ${whole === 1 ? 'DÓLAR' : 'DÓLARES'}`
}
