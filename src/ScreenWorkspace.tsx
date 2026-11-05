import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Download, FileSpreadsheet, FileText, RefreshCw, Search } from 'lucide-react'
import * as XLSX from 'xlsx'
import type { Context, ScreenSpec } from './types'
import { formatFullDateInput, formatMonthYearInput } from './date-input'
import { createBrandedReportPdf } from './report-pdf'

type ScreenWorkspaceProps={
  screen:ScreenSpec
  children:ReactNode
}

type TableExport={name:string;rows:string[][]}

const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es')
const safeFilename=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLocaleLowerCase()||'reporte'
const pdfSafe=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,' ').replace(/([\\()])/g,'\\$1')
const fullDateFormat=/dd\s*\/\s*mm\s*\/\s*aaaa/i
const monthYearFormat=/(?<!d)mm\s*\/\s*aaaa/i
const fullDateLabel=/(fecha|desde|hasta|nacimiento|retiro|emisi[oó]n|vigencia)/i

function dateInputFormat(input:HTMLInputElement):'full'|'month'|null{
  if(input.type==='date')return null
  const metadata=`${input.placeholder} ${input.getAttribute('aria-label')??''} ${input.dataset.dateFormat??''}`
  if(monthYearFormat.test(metadata)&&!fullDateFormat.test(metadata))return'month'
  if(fullDateFormat.test(metadata))return'full'
  const label=input.closest('label')
  const directLabel=label?Array.from(label.childNodes).filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent??'').join(' '):''
  return fullDateLabel.test(directLabel)?'full':null
}

function caretAfterDigits(value:string,digitCount:number){
  if(!digitCount)return 0
  let found=0
  for(let index=0;index<value.length;index+=1){
    if(/\d/.test(value[index]))found+=1
    if(found===digitCount)return index+1
  }
  return value.length
}

function collectTables(root:HTMLElement,screenTitle:string,forExcel=false):TableExport[]{
  return Array.from(root.querySelectorAll('table'))
    .filter(table=>forExcel?!table.closest('[data-excel-export-skip="true"]'):!table.closest('[data-pdf-export-skip="true"]'))
    .map((table,index)=>{
    const rows=Array.from(table.querySelectorAll('tr'))
      .filter(row=>{
        const excelOnly=(row as HTMLElement).dataset.excelExportOnly==='true'
        const pdfOnly=(row as HTMLElement).dataset.pdfExportOnly==='true'
        if(excelOnly)return forExcel
        if(pdfOnly)return!forExcel
        if(forExcel&&row.closest('[data-excel-export-skip="true"]'))return false
        if(!forExcel&&row.closest('[data-pdf-export-skip="true"]'))return false
        return(row as HTMLElement).style.display!=='none'
      })
      .map(row=>{
        const exportOnly=(row as HTMLElement).dataset.excelExportOnly==='true'||(row as HTMLElement).dataset.pdfExportOnly==='true'
        return Array.from(row.querySelectorAll('th,td')).filter(cell=>(cell as HTMLElement).dataset.exportSkip!=='true').map(cell=>((exportOnly?cell.textContent:(cell as HTMLElement).innerText)??'').replace(/\s+/g,' ').trim())
      })
      .filter(row=>row.some(Boolean))
    const nearbyTitle=table.closest('section,article,div')?.querySelector(':scope > h2, :scope > header h2, :scope > header h3')?.textContent?.trim()
    return{name:nearbyTitle||`${screenTitle} ${index+1}`,rows}
  }).filter(table=>table.rows.length>0)
}

function uniqueSheetName(value:string,used:Set<string>){
  const base=(value.replace(/[\\/?*\[\]:]/g,' ').replace(/\s+/g,' ').trim()||'Tabla').slice(0,31)
  let name=base
  let suffix=2
  while(used.has(name)){const ending=` ${suffix++}`;name=`${base.slice(0,31-ending.length)}${ending}`}
  used.add(name)
  return name
}

function exportExcel(tables:TableExport[],title:string){
  const workbook=XLSX.utils.book_new()
  const used=new Set<string>()
  tables.forEach(table=>XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet(table.rows),uniqueSheetName(table.name,used)))
  XLSX.writeFile(workbook,`${safeFilename(title)}.xlsx`,{compression:true})
}

function wrapText(value:string,width=118){
  const words=value.split(/\s+/).filter(Boolean)
  const lines:string[]=[]
  let line=''
  words.forEach(word=>{
    if(!line){line=word;return}
    if(`${line} ${word}`.length<=width){line+=` ${word}`;return}
    lines.push(line)
    line=word
  })
  if(line)lines.push(line)
  return lines.length?lines:['']
}

function createPdfBlob(title:string,tables:TableExport[]){
  const lines:string[]=[title,'']
  tables.forEach((table,index)=>{
    if(index)lines.push('')
    lines.push(table.name.toUpperCase())
    table.rows.forEach((row,rowIndex)=>{
      const marker=rowIndex===0?'':'- '
      lines.push(...wrapText(`${marker}${row.join(' | ')}`))
    })
  })
  const linesPerPage=42
  const pages:Array<string[]>=[]
  for(let index=0;index<lines.length;index+=linesPerPage)pages.push(lines.slice(index,index+linesPerPage))
  if(!pages.length)pages.push([title])
  const fontId=3+pages.length*2
  const objects:string[]=[]
  const pageIds=pages.map((_,index)=>3+index*2)
  objects[1]='<< /Type /Catalog /Pages 2 0 R >>'
  objects[2]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pages.length} >>`
  pages.forEach((page,index)=>{
    const pageId=pageIds[index]
    const contentId=pageId+1
    const stream=`BT\n/F1 8 Tf\n32 575 Td\n${page.map((line,lineIndex)=>`${lineIndex?'0 -12 Td\n':''}(${pdfSafe(line)}) Tj`).join('\n')}\nET`
    objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    objects[contentId]=`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  })
  objects[fontId]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  let output='%PDF-1.4\n'
  const offsets=[0]
  for(let index=1;index<=fontId;index++){offsets[index]=output.length;output+=`${index} 0 obj\n${objects[index]}\nendobj\n`}
  const xref=output.length
  output+=`xref\n0 ${fontId+1}\n0000000000 65535 f \n`
  for(let index=1;index<=fontId;index++)output+=`${String(offsets[index]).padStart(10,'0')} 00000 n \n`
  output+=`trailer\n<< /Size ${fontId+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([output],{type:'application/pdf'})
}

function downloadBlob(blob:Blob,filename:string){
  const url=URL.createObjectURL(blob)
  const link=document.createElement('a')
  link.href=url
  link.download=filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(()=>URL.revokeObjectURL(url),500)
}

export function ScreenWorkspace({screen,children}:ScreenWorkspaceProps){
  const queryClient=useQueryClient()
  const rootRef=useRef<HTMLDivElement>(null)
  const isReport=/^rep(?:orte)?\.?\s/i.test(screen.titulo_original)||/(^|>)\s*reportes?\s*(>|$)/i.test(screen.ruta_original)||screen.id==='AI-ACC-VOUCHER-SUMMARY-001'
  const [revision,setRevision]=useState(0)
  const [query,setQuery]=useState('')
  const [titleHost,setTitleHost]=useState<HTMLElement|null>(null)
  const [toolbarHost,setToolbarHost]=useState<HTMLElement|null>(null)
  const [searchHost,setSearchHost]=useState<HTMLElement|null>(null)
  const [hasTables,setHasTables]=useState(false)
  const [hasNativeSearch,setHasNativeSearch]=useState(false)

  const applySearch=useCallback((value:string)=>{
    const term=normalize(value.trim())
    rootRef.current?.querySelectorAll('table tbody tr').forEach(row=>{
      const visible=!term||normalize(row.textContent??'').includes(term)
      ;(row as HTMLElement).style.display=visible?'':'none'
    })
  },[])

  useEffect(()=>{applySearch(query)},[applySearch,query,revision])

  useEffect(()=>{
    if(!isReport)return
    const root=rootRef.current
    if(!root)return
    const selectAll=(event:Event)=>{
      const field=event.target
      if(field instanceof HTMLTextAreaElement){field.select();return}
      if(!(field instanceof HTMLInputElement))return
      const selectableTypes=new Set(['','text','search','tel','url','email','password'])
      if(selectableTypes.has(field.type))field.select()
    }
    root.addEventListener('focusin',selectAll)
    root.addEventListener('pointerup',selectAll)
    return()=>{
      root.removeEventListener('focusin',selectAll)
      root.removeEventListener('pointerup',selectAll)
    }
  },[isReport])

  useEffect(()=>{
    const root=rootRef.current
    if(!root)return
    const maskDate=(event:Event)=>{
      const input=event.target
      if(!(input instanceof HTMLInputElement))return
      const format=dateInputFormat(input)
      if(!format)return
      const current=input.value
      const selection=input.selectionStart??current.length
      const precedingDigits=current.slice(0,selection).replace(/\D/g,'').length
      const formatted=format==='month'?formatMonthYearInput(current):formatFullDateInput(current)
      input.inputMode='numeric'
      input.maxLength=format==='month'?7:10
      if(formatted===current)return
      input.value=formatted
      const nextCaret=caretAfterDigits(formatted,precedingDigits)
      input.setSelectionRange(nextCaret,nextCaret)
    }
    root.addEventListener('input',maskDate,true)
    return()=>root.removeEventListener('input',maskDate,true)
  },[])

  useEffect(()=>{
    const root=rootRef.current
    if(!root)return
    const hiddenExportButtons=new Set<HTMLButtonElement>()
    let refreshHost:HTMLElement|null=null
    let actionsHost:HTMLElement|null=null
    let tableSearchHost:HTMLElement|null=null
    const scan=()=>{
      Array.from(root.querySelectorAll<HTMLButtonElement>('button')).filter(button=>/^exportar\b/i.test((button.textContent??'').trim())).forEach(button=>{button.hidden=true;hiddenExportButtons.add(button)})
      const title=root.querySelector<HTMLElement>('h1')
      if(title){
        title.classList.add('runtime-screen-title')
        refreshHost=root.querySelector<HTMLElement>('[data-runtime-title-tools]')
        if(!refreshHost){
          refreshHost=document.createElement('span')
          refreshHost.dataset.runtimeTitleTools='true'
          refreshHost.className='runtime-title-tools-host'
          title.appendChild(refreshHost)
        }
        setTitleHost(refreshHost)
      }
      const tables=Array.from(root.querySelectorAll('table'))
      setHasTables(tables.length>0)
      const documentEditorOpen=Boolean(root.querySelector('[data-document-editor-open="true"]'))
      const templateDownload=Boolean(root.querySelector('.account-example-download,[data-runtime-template-download]'))
      const nativeSearch=Array.from(root.querySelectorAll<HTMLInputElement>('input')).some(input=>!input.closest('[data-runtime-table-search]')&&/buscar|filtrar/i.test(`${input.placeholder} ${input.getAttribute('aria-label')??''}`))
      setHasNativeSearch(nativeSearch)
      if(tables.length&&!documentEditorOpen){
        actionsHost=root.querySelector<HTMLElement>('[data-runtime-table-tools]')
        const header=title?.closest<HTMLElement>('.screen-header,.page-header,.config-header,.hr-header,.personal-header,header')??title?.parentElement
        const buttons=header?Array.from(header.querySelectorAll<HTMLButtonElement>('button')):[]
        const newButton=buttons.find(button=>/\b(nuevo|nueva|crear|agregar|registrar)\b/i.test(button.textContent??''))
        if(newButton){newButton.classList.add('runtime-standard-primary');newButton.parentElement?.classList.add('runtime-standard-actions')}
        if(templateDownload){actionsHost?.remove();actionsHost=null;setToolbarHost(null)}
        else{
          if(!actionsHost){
            actionsHost=document.createElement('span')
            actionsHost.dataset.runtimeTableTools='true'
            actionsHost.className='runtime-table-tools-host'
            if(newButton?.parentElement)newButton.parentElement.insertBefore(actionsHost,newButton)
            else header?.appendChild(actionsHost)
          }
          setToolbarHost(actionsHost)
        }
        if(!nativeSearch){
          tableSearchHost=root.querySelector<HTMLElement>('[data-runtime-table-search]')
          if(!tableSearchHost){
            tableSearchHost=document.createElement('div')
            tableSearchHost.dataset.runtimeTableSearch='true'
            tableSearchHost.className='runtime-table-search-strip'
            header?.insertAdjacentElement('afterend',tableSearchHost)
          }
          setSearchHost(tableSearchHost)
        }else{tableSearchHost?.remove();setSearchHost(null)}
      }else{
        actionsHost?.remove()
        tableSearchHost?.remove()
        setToolbarHost(null)
        setSearchHost(null)
      }
      applySearch(query)
    }
    scan()
    const observer=new MutationObserver(scan)
    observer.observe(root,{childList:true,subtree:true})
    return()=>{
      observer.disconnect()
      hiddenExportButtons.forEach(button=>{button.hidden=false})
      root.querySelector<HTMLElement>('h1.runtime-screen-title')?.classList.remove('runtime-screen-title')
      refreshHost?.remove()
      actionsHost?.remove()
      tableSearchHost?.remove()
    }
  },[applySearch,isReport,query,revision])

  const refresh=()=>{
    setQuery('')
    void queryClient.invalidateQueries()
    setRevision(current=>current+1)
  }
  const tables=(forExcel=false)=>collectTables(rootRef.current!,screen.titulo_original,forExcel)
  const closeMenu=(target:HTMLElement)=>target.closest('details')?.removeAttribute('open')
  const downloadPdf=async(target:HTMLElement)=>{
    const data=tables(false)
    const context=queryClient.getQueryData<Context>(['context'])
    if(data.length)downloadBlob(isReport?await createBrandedReportPdf(screen.titulo_original,data,context):createPdfBlob(screen.titulo_original,data),`${safeFilename(screen.titulo_original)}.pdf`)
    closeMenu(target)
  }
  const downloadExcel=(target:HTMLElement)=>{
    const data=tables(true)
    if(data.length)exportExcel(data,screen.titulo_original)
    closeMenu(target)
  }
  return <div className="screen-runtime" ref={rootRef}>
    <div className="screen-runtime-content" key={revision}>{children}</div>
    {titleHost&&createPortal(<button type="button" className="runtime-refresh-button" onClick={refresh} aria-label={`Refrescar ${screen.titulo_original}`} title="Refrescar información"><RefreshCw/></button>,titleHost)}
    {toolbarHost&&hasTables&&createPortal(<div className="runtime-table-tools">
      <details className="runtime-download-menu"><summary><Download/><span>Descargar</span></summary><div><button type="button" onClick={event=>downloadPdf(event.currentTarget)}><FileText/>PDF</button><button type="button" onClick={event=>downloadExcel(event.currentTarget)}><FileSpreadsheet/>Excel</button></div></details>
    </div>,toolbarHost)}
    {searchHost&&hasTables&&!hasNativeSearch&&createPortal(<label className="runtime-table-search"><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar en todas las columnas" aria-label={`Buscar en ${screen.titulo_original}`}/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="Limpiar búsqueda">×</button>}</label>,searchHost)}
  </div>
}
