const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export function displayExpenseMonth(value: string) {
  const month = Number.parseInt(value, 10)
  return month >= 1 && month <= 12 ? monthNames[month - 1] : value
}
