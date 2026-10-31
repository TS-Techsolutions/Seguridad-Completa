import * as XLSX from 'xlsx'

type EditableImportRow = {
  values: Record<string, string>
}

function reviewedFileName(fileName: string) {
  const baseName = fileName.replace(/\.(?:xlsx?|csv)$/i, '').trim() || 'archivo-cargado'
  return `${baseName}-revisado.xlsx`
}

/** Downloads the persisted rows, including corrections saved from the review modal. */
export function downloadEditableImport(
  fileName: string,
  columns: readonly string[],
  rows: EditableImportRow[],
) {
  const data = rows.map(row => Object.fromEntries(
    columns.map(column => [column, row.values[column] ?? '']),
  ))
  const sheet = XLSX.utils.json_to_sheet(data, { header: [...columns] })
  sheet['!cols'] = columns.map(column => ({
    wch: Math.min(42, Math.max(14, column.length + 2)),
  }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Datos cargados')
  XLSX.writeFile(workbook, reviewedFileName(fileName), { compression: true })
}
