import { useRef,useState,type ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle,CheckCircle2,ChevronRight,Download,Eye,FileSpreadsheet,Play,Save,Trash2,UploadCloud,X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { api } from './api'
import type { CustomerRow } from './CustomerRegistryPage'
import { formatFullDateInput } from './date-input'
import { downloadEditableImport } from './editable-import-download'
import { readSupplierAdvances,saveSupplierAdvances,type SupplierAdvanceRecord } from './supplier-advance-records'
import { cleanTextSpacing,comparableText } from './text-values'
import type { Context,ScreenSpec } from './types'

type UploadStatus='PENDIENTE'|'PROCESADO'|'ELIMINADO'
const expectedColumns=['FECHA FORMATO (DD/MM/AAAA)','RUC_CODIGO','PROVEEDOR','TOTAL','COMENTARIO'] as const
type SupplierAdvanceColumn=(typeof expectedColumns)[number]
type SupplierAdvanceValues=Record<SupplierAdvanceColumn,string>
type SupplierAdvanceRow={sourceRow:number;values:SupplierAdvanceValues;issues:string[]}
type UploadRecord={id:string;description:string;fileName:string;loadedAt:string;user:string;status:UploadStatus;reviewed:boolean;rows:SupplierAdvanceRow[]}

const requiredColumns:SupplierAdvanceColumn[]=['FECHA FORMATO (DD/MM/AAAA)','RUC_CODIGO','PROVEEDOR','TOTAL']
const providerKey='saga.providers'
const normalize=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'').toUpperCase()
const text=(value:unknown)=>String(value??'').replace(/\uFFFD/g,'').trim().replace(/\.0$/,'')
function readJson<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)??'null')??fallback}catch{return fallback}}
function uploadsKey(companyId:string){return`saga.cxp.supplier-advance-import.uploads:${companyId}`}
function persistUploads(companyId:string,records:UploadRecord[],setter:(value:UploadRecord[])=>void){setter(records);localStorage.setItem(uploadsKey(companyId),JSON.stringify(records))}
function activeProviders(){return readJson<CustomerRow[]>(providerKey,[]).filter(row=>row.state==='ACTIVO')}

function dateText(value:unknown){
  if(value instanceof Date&&!Number.isNaN(value.getTime()))return`${String(value.getDate()).padStart(2,'0')}/${String(value.getMonth()+1).padStart(2,'0')}/${value.getFullYear()}`
  const raw=text(value);const match=/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/.exec(raw)
  if(!match)return raw
  const day=Number(match[1]),month=Number(match[2]),year=match[3].length===2?(Number(match[3])<=69?2000:1900)+Number(match[3]):Number(match[3])
  const parsed=new Date(year,month-1,day)
  return parsed.getFullYear()===year&&parsed.getMonth()===month-1&&parsed.getDate()===day?`${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`:raw
}
function validDate(value:string){const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);if(!match)return false;const parsed=new Date(Number(match[3]),Number(match[2])-1,Number(match[1]));return parsed.getFullYear()===Number(match[3])&&parsed.getMonth()===Number(match[2])-1&&parsed.getDate()===Number(match[1])}
function amountText(value:unknown){const raw=text(value).replace(/\s/g,'').replace(',','.');const parsed=Number(raw);return Number.isFinite(parsed)?parsed.toFixed(2):raw}
function rowIdentity(row:SupplierAdvanceRow){return normalize(`${row.values['FECHA FORMATO (DD/MM/AAAA)']}|${row.values.RUC_CODIGO}|${row.values.TOTAL}|${row.values.COMENTARIO}`)}
function providerFor(row:SupplierAdvanceRow){const identification=normalize(row.values.RUC_CODIGO);return activeProviders().find(provider=>normalize(provider.identification)===identification)}

function parseWorkbook(file:File):Promise<SupplierAdvanceRow[]>{
  return file.arrayBuffer().then(buffer=>{
    const workbook=XLSX.read(buffer,{type:'array',raw:true,cellDates:true});const sheet=workbook.Sheets[workbook.SheetNames[0]]
    if(!sheet)throw new Error('El archivo no contiene hojas para procesar.')
    const matrix=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:'',raw:true,blankrows:false})
    const headerRow=matrix.findIndex(row=>normalize(row[0])===normalize(expectedColumns[0]))
    if(headerRow<0)throw new Error(`No se encontró la columna ${expectedColumns[0]} en la plantilla.`)
    const header=matrix[headerRow];const indexes=Object.fromEntries(expectedColumns.map(column=>[column,header.findIndex(cell=>normalize(cell)===normalize(column))])) as Record<SupplierAdvanceColumn,number>
    const missing=requiredColumns.filter(column=>indexes[column]<0);if(missing.length)throw new Error(`Faltan columnas obligatorias: ${missing.join(', ')}.`)
    return matrix.slice(headerRow+1).map((row,index)=>{
      const values=Object.fromEntries(expectedColumns.map(column=>{const raw=indexes[column]<0?'':row[indexes[column]];if(column==='FECHA FORMATO (DD/MM/AAAA)')return[column,dateText(raw)];if(column==='TOTAL')return[column,amountText(raw)];return[column,text(raw)]})) as SupplierAdvanceValues
      return{sourceRow:headerRow+index+2,values,issues:[]}
    }).filter(row=>expectedColumns.some(column=>row.values[column]))
  })
}

function validateRows(companyId:string,rows:SupplierAdvanceRow[],excludedUploadId?:string){
  const providers=activeProviders();const existingKeys=new Set(readSupplierAdvances(companyId).filter(record=>record.sourceUploadId!==excludedUploadId).map(record=>record.sourceDocument??'').filter(Boolean))
  const counts=rows.reduce<Record<string,number>>((result,row)=>{const key=rowIdentity(row);result[key]=(result[key]??0)+1;return result},{})
  return rows.map(row=>{
    const values=row.values,issues:string[]=[];const provider=providers.find(item=>normalize(item.identification)===normalize(values.RUC_CODIGO));const identity=rowIdentity(row);const amount=Number(values.TOTAL)
    if(!validDate(values['FECHA FORMATO (DD/MM/AAAA)']))issues.push('Fecha inválida; utiliza DD/MM/AAAA')
    if(!values.RUC_CODIGO)issues.push('RUC_CODIGO obligatorio')
    if(!values.PROVEEDOR)issues.push('Proveedor obligatorio')
    if(!provider)issues.push('La identificación no corresponde a un proveedor activo registrado')
    if(provider&&comparableText(provider.businessName)!==comparableText(values.PROVEEDOR))issues.push('El nombre del proveedor no coincide con la identificación registrada')
    if(!/^\d+(?:\.\d{1,2})?$/.test(values.TOTAL)||!Number.isFinite(amount)||amount<=0)issues.push('Total obligatorio, mayor a cero y con máximo dos decimales')
    if(identity&&counts[identity]>1)issues.push('Registro repetido dentro del archivo')
    if(identity&&existingKeys.has(identity))issues.push('El anticipo ya fue procesado en otra carga')
    return{...row,issues:[...new Set(issues)]}
  })
}

function displayDate(value:string){return new Intl.DateTimeFormat('es-EC',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}
function nextNumbers(companyId:string,count:number){
  const greatest=readSupplierAdvances(companyId).reduce((maximum,record)=>Math.max(maximum,Number(/(\d+)$/.exec(record.number)?.[1]??0)),0)
  return Array.from({length:count},(_,index)=>`ANT-PROV-${String(greatest+index+1).padStart(6,'0')}`)
}
function importedRecord(row:SupplierAdvanceRow,upload:UploadRecord,context:Context,number:string):SupplierAdvanceRecord{
  const provider=providerFor(row),amount=Number(row.values.TOTAL),stamp=upload.loadedAt
  return{id:`supplier-advance-import:${upload.id}:${row.sourceRow}`,companyId:context.company.id,number,issueDate:row.values['FECHA FORMATO (DD/MM/AAAA)'],supplierId:provider?.id??'',supplierName:provider?.businessName??cleanTextSpacing(row.values.PROVEEDOR),detail:cleanTextSpacing(row.values.COMENTARIO)||'Anticipo cargado',total:Number(amount.toFixed(2)),balance:Number(amount.toFixed(2)),status:'PENDIENTE_CRUCE',createdAt:stamp,updatedAt:stamp,paidAt:stamp,sourceUploadId:upload.id,sourceDocument:rowIdentity(row),origin:'CARGA'}
}

export function SupplierAdvanceImportPage({screen}:{screen:ScreenSpec}){
  const context=useQuery({queryKey:['context'],queryFn:api.context});if(!context.data)return null
  return <SupplierAdvanceImportManager key={context.data.company.id} screen={screen} context={context.data}/>
}

function SupplierAdvanceImportManager({screen,context}:{screen:ScreenSpec;context:Context}){
  const companyId=context.company.id,fileInput=useRef<HTMLInputElement>(null)
  const [uploads,setUploads]=useState<UploadRecord[]>(()=>readJson(uploadsKey(companyId),[])),[description,setDescription]=useState(''),[file,setFile]=useState<File|null>(null)
  const [previewId,setPreviewId]=useState<string|null>(null),[previewRows,setPreviewRows]=useState<SupplierAdvanceRow[]>([]),[previewDirty,setPreviewDirty]=useState(false),[previewMessage,setPreviewMessage]=useState('')
  const [deleteId,setDeleteId]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  const selectedPreview=uploads.find(record=>record.id===previewId),selectedDelete=uploads.find(record=>record.id===deleteId)
  const chooseFile=(event:ChangeEvent<HTMLInputElement>)=>{setFile(event.target.files?.[0]??null);setError('');setMessage('')}
  const upload=async()=>{if(!description.trim()){setError('Ingresa la descripción del archivo.');return}if(!file){setError('Selecciona el archivo de Anticipos de Proveedores.');return}setBusy(true);try{const parsed=await parseWorkbook(file);if(!parsed.length)throw new Error('El archivo no contiene anticipos para cargar.');const record:UploadRecord={id:crypto.randomUUID(),description:description.trim(),fileName:file.name,loadedAt:new Date().toISOString(),user:context.actor.name,status:'PENDIENTE',reviewed:false,rows:validateRows(companyId,parsed)};persistUploads(companyId,[record,...uploads],setUploads);setDescription('');setFile(null);if(fileInput.current)fileInput.current.value='';setError('');setMessage('Archivo cargado con estado PENDIENTE. Revísalo con la lupa antes de procesarlo.')}catch(reason){setMessage('');setError(reason instanceof Error?reason.message:'No se pudo leer el archivo.')}finally{setBusy(false)}}
  const openPreview=(record:UploadRecord)=>{if(record.status==='ELIMINADO')return;const rows=validateRows(companyId,record.rows,record.id);persistUploads(companyId,uploads.map(item=>item.id===record.id?{...item,reviewed:true,rows}:item),setUploads);setPreviewRows(rows);setPreviewDirty(false);setPreviewMessage('');setPreviewId(record.id);setError('');setMessage('')}
  const updatePreviewCell=(sourceRow:number,column:SupplierAdvanceColumn,value:string)=>{if(!selectedPreview||selectedPreview.status!=='PENDIENTE')return;let clean=text(value);if(column==='FECHA FORMATO (DD/MM/AAAA)')clean=formatFullDateInput(value);if(column==='TOTAL')clean=value.replace(',','.').replace(/[^\d.]/g,'');const edited=previewRows.map(row=>row.sourceRow===sourceRow?{...row,values:{...row.values,[column]:clean}}:row);setPreviewRows(validateRows(companyId,edited,selectedPreview.id));setPreviewDirty(true);setPreviewMessage('')}
  const savePreviewChanges=()=>{if(!selectedPreview||selectedPreview.status!=='PENDIENTE')return;const rows=validateRows(companyId,previewRows,selectedPreview.id),issues=rows.filter(row=>row.issues.length).length;persistUploads(companyId,uploads.map(item=>item.id===selectedPreview.id?{...item,reviewed:true,rows}:item),setUploads);setPreviewRows(rows);setPreviewDirty(false);setPreviewMessage(issues?`Cambios guardados. Aún existen ${issues} filas con inconsistencias.`:'Cambios guardados. El archivo está listo para procesarse.')}
  const process=(record:UploadRecord)=>{if(record.status!=='PENDIENTE')return;if(!record.reviewed){setMessage('');setError('Primero revisa la información con el ícono de la lupa.');return}const rows=validateRows(companyId,record.rows,record.id),issues=rows.filter(row=>row.issues.length).length;if(issues){persistUploads(companyId,uploads.map(item=>item.id===record.id?{...item,rows}:item),setUploads);setMessage('');setError(`No se puede procesar: existen ${issues} filas con inconsistencias.`);return}const current=readSupplierAdvances(companyId).filter(item=>item.sourceUploadId!==record.id),numbers=nextNumbers(companyId,rows.length),imported=rows.map((row,index)=>importedRecord(row,{...record,rows},context,numbers[index]));saveSupplierAdvances(companyId,[...imported,...current]);persistUploads(companyId,uploads.map(item=>item.id===record.id?{...item,rows,status:'PROCESADO' as const}:item),setUploads);setError('');setMessage(`${imported.length} anticipos de proveedores quedaron pendientes de cruzar con facturas del proveedor.`)}
  const confirmDelete=()=>{if(!selectedDelete)return;saveSupplierAdvances(companyId,readSupplierAdvances(companyId).filter(item=>item.sourceUploadId!==selectedDelete.id));persistUploads(companyId,uploads.map(item=>item.id===selectedDelete.id?{...item,status:'ELIMINADO' as const,reviewed:false,rows:[]}:item),setUploads);setDeleteId(null);setPreviewId(current=>current===selectedDelete.id?null:current);setError('');setMessage('El archivo y todos los anticipos de proveedores que incorporó fueron eliminados.')}
  return <div className="page screen-page account-migration-page contact-import-page customer-advance-import-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header account-migration-header"><div><div className="screen-id"><span>{screen.id}</span><b>Cuentas por Pagar</b></div><h1>{screen.titulo_original}</h1></div><a className="primary-action account-example-download" href="/Ejemplo%20Anticipo%20Proveedores.xlsx" download="Ejemplo Anticipo Proveedores.xlsx"><Download/>Descargar Plantilla</a></section>
    <section className="account-upload-box"><div className="account-upload-fields"><label><span>Descripción</span><input value={description} onChange={event=>{setDescription(event.target.value);setError('');setMessage('')}} maxLength={160} placeholder="Identifica el origen o propósito de la carga"/></label><label className={`account-file-picker ${file?'selected':''}`}><input ref={fileInput} type="file" accept=".xls,.xlsx,.csv" onChange={chooseFile}/>{file?<FileSpreadsheet/>:<UploadCloud/>}<span><strong>{file?file.name:'Adjuntar archivo de Anticipos de Proveedores'}</strong><small>{file?'Haz clic para reemplazar el archivo':'Archivos XLS, XLSX o CSV'}</small></span></label></div><button type="button" className="primary-action" onClick={upload} disabled={busy}><UploadCloud/>{busy?'Validando…':'Cargar archivo'}</button></section>
    {error&&<div className="account-migration-feedback error" role="alert"><AlertTriangle/>{error}</div>}{message&&<div className="account-migration-feedback success" role="status"><CheckCircle2/>{message}</div>}
    <section className="account-files-box"><h2>Archivos Cargados</h2><div className="account-files-scroll"><table><thead><tr><th>Descripción</th><th>Archivo</th><th>Fecha</th><th>Usuario</th><th>Estado</th><th aria-label="Revisar"/><th aria-label="Descargar"/><th aria-label="Procesar"/><th aria-label="Eliminar"/></tr></thead><tbody>{uploads.map(record=><tr key={record.id}><td><strong>{record.description}</strong></td><td>{record.fileName}</td><td>{displayDate(record.loadedAt)}</td><td>{record.user}</td><td><span className={`account-upload-status ${record.status.toLowerCase()}`}>{record.status}</span></td><td><button type="button" className="account-row-action inspect" disabled={record.status==='ELIMINADO'} title="Revisar y editar información" onClick={()=>openPreview(record)}><Eye/></button></td><td><button type="button" className="account-row-action download" disabled={record.status==='ELIMINADO'} title="Descargar archivo revisado" onClick={()=>downloadEditableImport(record.fileName,expectedColumns,record.rows)}><Download/></button></td><td><button type="button" className="account-row-action process" disabled={record.status!=='PENDIENTE'} title="Procesar información" onClick={()=>process(record)}><Play/></button></td><td><button type="button" className="account-row-action delete" disabled={record.status==='ELIMINADO'} title="Eliminar carga" onClick={()=>setDeleteId(record.id)}><Trash2/></button></td></tr>)}{!uploads.length&&<tr><td colSpan={9} className="account-files-empty">No existen archivos cargados.</td></tr>}</tbody></table></div></section>
    {selectedPreview&&<div className="account-preview-backdrop" role="dialog" aria-modal="true"><section className="account-preview-modal contact-preview-modal"><header><div><span>Revisión del archivo</span><h2>{selectedPreview.fileName}</h2><p>{previewRows.length} filas · {previewRows.filter(row=>row.issues.length).length} con inconsistencias</p></div><button type="button" aria-label="Cerrar revisión" onClick={()=>setPreviewId(null)}><X/></button></header>{previewRows.some(row=>row.issues.length)&&<div className="account-preview-note"><AlertTriangle/>Se encontraron {previewRows.filter(row=>row.issues.length).length} filas con inconsistencias. Edita directamente las celdas marcadas en color naranja antes de procesar.</div>}<div className="account-preview-grid"><table><thead><tr><th>Fila</th>{expectedColumns.map(column=><th key={column}>{column}</th>)}<th>Observaciones</th></tr></thead><tbody>{previewRows.map(row=><tr key={row.sourceRow} className={row.issues.length?'has-issues':''}><td>{row.sourceRow}</td>{expectedColumns.map(column=><td key={column}>{selectedPreview.status==='PENDIENTE'?<input aria-label={`${column} fila ${row.sourceRow}`} value={row.values[column]} inputMode={column==='TOTAL'?'decimal':column==='FECHA FORMATO (DD/MM/AAAA)'?'numeric':'text'} maxLength={column==='FECHA FORMATO (DD/MM/AAAA)'?10:undefined} onChange={event=>updatePreviewCell(row.sourceRow,column,event.target.value)} onBlur={()=>{if(column==='TOTAL'&&Number(row.values.TOTAL)>0)updatePreviewCell(row.sourceRow,column,Number(row.values.TOTAL).toFixed(2))}}/>:row.values[column]||'—'}</td>)}<td>{row.issues.length?row.issues.join(' · '):'Correcto'}</td></tr>)}</tbody></table></div><footer><div className={`account-preview-save-state ${previewRows.some(row=>row.issues.length)?'warning':'ready'}`}>{previewMessage||(previewDirty?'Existen cambios sin guardar.':previewRows.some(row=>row.issues.length)?'Corrige las inconsistencias y guarda los cambios.':'La información está validada.')}</div><button type="button" className="quiet-button" onClick={()=>setPreviewId(null)}>Cerrar</button>{selectedPreview.status==='PENDIENTE'&&<button type="button" className="quiet-button account-save-changes" disabled={!previewDirty} onClick={savePreviewChanges}><Save/>Guardar cambios</button>}{selectedPreview.status==='PENDIENTE'&&<button type="button" className="primary-action" disabled={previewDirty||previewRows.some(row=>row.issues.length)} onClick={()=>{setPreviewId(null);process(selectedPreview)}}><Play/>Procesar información</button>}</footer></section></div>}
    {selectedDelete&&<div className="account-delete-backdrop" role="alertdialog" aria-modal="true"><section className="account-delete-modal"><span><AlertTriangle/></span><h2>¿Eliminar el archivo cargado?</h2><p>Se eliminará <strong>{selectedDelete.fileName}</strong> y todos los anticipos de proveedores que este documento haya incorporado.</p><div><button type="button" className="quiet-button" onClick={()=>setDeleteId(null)}>Cancelar</button><button type="button" className="danger-action" onClick={confirmDelete}><Trash2/>Sí, eliminar</button></div></section></div>}
  </div>
}
