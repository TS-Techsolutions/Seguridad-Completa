import {
  PDFDocument, StandardFonts, appendBezierCurve, closePath, fill, lineTo, moveTo,
  popGraphicsState, pushGraphicsState, rgb, setFillingRgbColor, setLineWidth,
  setStrokingRgbColor, stroke, type PDFFont, type PDFImage, type PDFPage,
} from 'pdf-lib'
import { companySettingsStorageKey, readCompanyIdentity } from './operation-date-rules'
import type { Context } from './types'

export type ReportPdfTable = { name: string; rows: string[][] }

const pageWidth = 841.89
const pageHeight = 595.28
const margin = 30
const contentWidth = pageWidth - margin * 2
const gray = rgb(0.82, 0.84, 0.87)
const lineGray = rgb(0.64, 0.68, 0.73)
const textColor = rgb(0.13, 0.16, 0.21)
const muted = rgb(0.38, 0.43, 0.5)

function cleanText(value: string) {
  return value.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim()
}

function reportTitle(value: string) {
  return cleanText(value).replace(/^rep(?:orte)?\.?\s*/i, '') || 'Reporte'
}

function readLogo() {
  try {
    const settings = JSON.parse(localStorage.getItem(companySettingsStorageKey) ?? '{}') as { logo?: { dataUrl?: string } }
    return settings.logo?.dataUrl ?? ''
  } catch { return '' }
}

async function dataUrlBytes(dataUrl: string) {
  const response = await fetch(dataUrl)
  return new Uint8Array(await response.arrayBuffer())
}

async function normalizeImageToPng(dataUrl: string) {
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, image.naturalWidth)
  canvas.height = Math.max(1, image.naturalHeight)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No fue posible convertir el logo.')
  context.drawImage(image, 0, 0)
  return dataUrlBytes(canvas.toDataURL('image/png'))
}

async function embedLogo(pdf: PDFDocument, dataUrl: string): Promise<PDFImage | null> {
  if (!dataUrl) return null
  try {
    const bytes = await dataUrlBytes(dataUrl)
    if (/^data:image\/png/i.test(dataUrl)) return await pdf.embedPng(bytes)
    if (/^data:image\/(?:jpeg|jpg)/i.test(dataUrl)) return await pdf.embedJpg(bytes)
    return await pdf.embedPng(await normalizeImageToPng(dataUrl))
  } catch { return null }
}

function centeredX(font: PDFFont, text: string, size: number) {
  return Math.max(margin + 90, (pageWidth - font.widthOfTextAtSize(text, size)) / 2)
}

function drawHeader(page: PDFPage, regular: PDFFont, bold: PDFFont, companyName: string, title: string, logo: PDFImage | null, pageNumber: number) {
  const top = pageHeight - margin
  if (logo) {
    const scaled = logo.scaleToFit(76, 44)
    page.drawImage(logo, { x: margin, y: top - 46, width: scaled.width, height: scaled.height })
  } else {
    page.drawRectangle({ x: margin, y: top - 42, width: 64, height: 36, borderColor: lineGray, borderWidth: 0.8, color: rgb(0.96, 0.97, 0.98) })
    page.drawText('LOGO', { x: margin + 18, y: top - 25, size: 8, font: bold, color: muted })
  }
  const company = cleanText(companyName)
  const cleanTitle = reportTitle(title)
  page.drawText(company, { x: centeredX(bold, company, 13), y: top - 17, size: 13, font: bold, color: textColor })
  page.drawText(cleanTitle, { x: centeredX(regular, cleanTitle, 10), y: top - 35, size: 10, font: regular, color: muted })
  page.drawText(`Página ${pageNumber}`, { x: pageWidth - margin - 42, y: top - 39, size: 7, font: regular, color: muted })
  page.drawLine({ start: { x: margin, y: top - 56 }, end: { x: pageWidth - margin, y: top - 56 }, thickness: 0.8, color: lineGray })
}

function splitLongWord(word: string, font: PDFFont, size: number, width: number) {
  const pieces: string[] = []
  let piece = ''
  for (const character of word) {
    const next = piece + character
    if (piece && font.widthOfTextAtSize(next, size) > width) { pieces.push(piece); piece = character } else piece = next
  }
  if (piece) pieces.push(piece)
  return pieces
}

function wrapCell(value: string, font: PDFFont, size: number, width: number, maxLines: number) {
  const words = cleanText(value).split(/\s+/).filter(Boolean).flatMap(word => font.widthOfTextAtSize(word, size) > width ? splitLongWord(word, font, size, width) : [word])
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && font.widthOfTextAtSize(next, size) > width) { lines.push(line); line = word } else line = next
  }
  if (line) lines.push(line)
  if (!lines.length) lines.push('')
  if (lines.length > maxLines) {
    const limited = lines.slice(0, maxLines)
    let last = limited[maxLines - 1]
    while (last && font.widthOfTextAtSize(`${last}...`, size) > width) last = last.slice(0, -1)
    limited[maxLines - 1] = `${last}...`
    return limited
  }
  return lines
}

function columnWidths(rows: string[][]) {
  const columns = Math.max(1, ...rows.map(row => row.length))
  const weights = Array.from({ length: columns }, (_, index) => {
    const longest = Math.max(5, ...rows.slice(0, 80).map(row => cleanText(row[index] ?? '').length))
    return Math.min(28, Math.max(7, longest))
  })
  const total = weights.reduce((sum, value) => sum + value, 0)
  const minimum = Math.min(58, contentWidth / columns * 0.62)
  let widths = weights.map(weight => Math.max(minimum, contentWidth * weight / total))
  const scale = contentWidth / widths.reduce((sum, value) => sum + value, 0)
  widths = widths.map(width => width * scale)
  return widths
}

function roundedBorder(page: PDFPage, x: number, y: number, width: number, height: number) {
  const radius = Math.min(8, height / 4)
  const k = radius * 0.55228475
  page.pushOperators(
    pushGraphicsState(), setLineWidth(0.8), setStrokingRgbColor(0.64, 0.68, 0.73),
    moveTo(x + radius, y), lineTo(x + width - radius, y),
    appendBezierCurve(x + width - radius + k, y, x + width, y + radius - k, x + width, y + radius),
    lineTo(x + width, y + height - radius),
    appendBezierCurve(x + width, y + height - radius + k, x + width - radius + k, y + height, x + width - radius, y + height),
    lineTo(x + radius, y + height),
    appendBezierCurve(x + radius - k, y + height, x, y + height - radius + k, x, y + height - radius),
    lineTo(x, y + radius),
    appendBezierCurve(x, y + radius - k, x + radius - k, y, x + radius, y),
    closePath(), stroke(), popGraphicsState(),
  )
}

function roundedHeaderFill(page: PDFPage, x: number, bottom: number, width: number, height: number) {
  const top = bottom + height
  const radius = Math.min(8, height / 3)
  const k = radius * 0.55228475
  page.pushOperators(
    pushGraphicsState(), setFillingRgbColor(0.82, 0.84, 0.87),
    moveTo(x, bottom), lineTo(x + width, bottom), lineTo(x + width, top - radius),
    appendBezierCurve(x + width, top - radius + k, x + width - radius + k, top, x + width - radius, top),
    lineTo(x + radius, top),
    appendBezierCurve(x + radius - k, top, x, top - radius + k, x, top - radius),
    lineTo(x, bottom), closePath(), fill(), popGraphicsState(),
  )
}

function drawTableHeader(page: PDFPage, header: string[], widths: number[], y: number, font: PDFFont, size: number) {
  const wrapped = header.map((value, index) => wrapCell(value, font, size, widths[index] - 8, 2))
  const height = Math.max(22, Math.max(...wrapped.map(lines => lines.length)) * (size + 2) + 8)
  roundedHeaderFill(page, margin, y - height, contentWidth, height)
  let x = margin
  wrapped.forEach((lines, index) => {
    lines.forEach((line, lineIndex) => page.drawText(line, { x: x + 4, y: y - 7 - size - lineIndex * (size + 2), size, font, color: textColor }))
    x += widths[index]
    if (index < widths.length - 1) page.drawLine({ start: { x, y }, end: { x, y: y - height }, thickness: 0.55, color: lineGray })
  })
  page.drawLine({ start: { x: margin, y: y - height }, end: { x: margin + contentWidth, y: y - height }, thickness: 0.65, color: lineGray })
  return height
}

export async function createBrandedReportPdf(title: string, tables: ReportPdfTable[], context?: Context) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const identity = readCompanyIdentity({ name: context?.company.name ?? 'Empresa', ruc: context?.company.ruc ?? '' })
  const logo = await embedLogo(pdf, readLogo())
  let pageNumber = 1
  let page = pdf.addPage([pageWidth, pageHeight])
  let cursor = pageHeight - margin - 76
  drawHeader(page, regular, bold, identity.businessName, title, logo, pageNumber)

  const newPage = () => {
    page = pdf.addPage([pageWidth, pageHeight])
    pageNumber += 1
    drawHeader(page, regular, bold, identity.businessName, title, logo, pageNumber)
    cursor = pageHeight - margin - 76
  }

  for (const table of tables) {
    if (!table.rows.length) continue
    const header = table.rows[0]
    const body = table.rows.slice(1)
    const widths = columnWidths(table.rows)
    const fontSize = widths.length <= 5 ? 8 : widths.length <= 8 ? 7 : widths.length <= 10 ? 6.2 : 5.2
    const cleanTableName = cleanText(table.name)
    const cleanScreenTitle = cleanText(title)
    const generatedTableName = cleanTableName === cleanScreenTitle || (cleanTableName.startsWith(`${cleanScreenTitle} `) && /\s\d+$/.test(cleanTableName))
    if (tables.length > 1 || !generatedTableName) {
      if (cursor < 105) newPage()
      page.drawText(reportTitle(table.name), { x: margin, y: cursor, size: 8, font: bold, color: muted })
      cursor -= 13
    }
    let segmentTop = cursor
    let headerHeight = drawTableHeader(page, header, widths, cursor, bold, fontSize)
    cursor -= headerHeight
    for (const row of body) {
      const wrapped = widths.map((width, index) => wrapCell(row[index] ?? '', regular, fontSize, width - 8, 3))
      const rowHeight = Math.max(18, Math.max(...wrapped.map(lines => lines.length)) * (fontSize + 2) + 7)
      if (cursor - rowHeight < margin + 20) {
        roundedBorder(page, margin, cursor, contentWidth, segmentTop - cursor)
        newPage()
        segmentTop = cursor
        headerHeight = drawTableHeader(page, header, widths, cursor, bold, fontSize)
        cursor -= headerHeight
      }
      const bottom = cursor - rowHeight
      let x = margin
      wrapped.forEach((lines, index) => {
        lines.forEach((line, lineIndex) => page.drawText(line, { x: x + 4, y: cursor - 6 - fontSize - lineIndex * (fontSize + 2), size: fontSize, font: regular, color: textColor }))
        x += widths[index]
        if (index < widths.length - 1) page.drawLine({ start: { x, y: cursor }, end: { x, y: bottom }, thickness: 0.45, color: lineGray })
      })
      page.drawLine({ start: { x: margin, y: bottom }, end: { x: margin + contentWidth, y: bottom }, thickness: 0.45, color: lineGray })
      cursor = bottom
    }
    roundedBorder(page, margin, cursor, contentWidth, segmentTop - cursor)
    cursor -= 18
  }
  return new Blob([await pdf.save()], { type: 'application/pdf' })
}
