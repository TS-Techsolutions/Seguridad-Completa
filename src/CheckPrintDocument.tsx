import type {CSSProperties} from 'react'
import type {CheckFieldKey,CheckPrintDesign} from './check-design-records'

export type CheckPrintData={placeDate:string;payee:string;amountNumber:string;amountWords:string;detail:string}

export function CheckPrintDocument({design,data,editing=false,onSelect,onMove,selectedKey}:{design:CheckPrintDesign;data:CheckPrintData;editing?:boolean;selectedKey?:CheckFieldKey;onSelect?:(key:CheckFieldKey)=>void;onMove?:(key:CheckFieldKey,x:number,y:number)=>void}){
  const values:Record<CheckFieldKey,string>={placeDate:data.placeDate,payee:data.payee,amountNumber:data.amountNumber,amountWords:data.amountWords,detail:data.detail}
  const style={'--check-width':`${design.widthMm}mm`,'--check-height':`${design.heightMm}mm`,'--check-offset-x':`${design.offsetXmm}mm`,'--check-offset-y':`${design.offsetYmm}mm`} as CSSProperties
  return <article className={`check-print-document${editing?' editing':''}`} style={style}>{editing&&<div className="check-design-guides"><span>PÁGUESE A LA ORDEN DE</span><span>VALOR</span><span>LA SUMA DE</span><span>LUGAR Y FECHA DE EMISIÓN</span><b>FIRMA AUTORIZADA</b></div>}{design.fields.filter(field=>field.enabled).map(field=><button type="button" draggable={editing} key={field.key} className={`check-print-field${selectedKey===field.key?' selected':''}`} style={{left:`${field.x}mm`,top:`${field.y}mm`,width:`${field.width}mm`,fontSize:`${field.fontSize}pt`,textAlign:field.alignment,pointerEvents:editing?'auto':'none'}} onClick={()=>onSelect?.(field.key)} onDragEnd={event=>{if(!editing||!onMove)return;const rect=event.currentTarget.parentElement?.getBoundingClientRect();if(!rect)return;const x=Math.max(0,Math.min(design.widthMm-field.width,(event.clientX-rect.left)/rect.width*design.widthMm));const y=Math.max(0,Math.min(design.heightMm-5,(event.clientY-rect.top)/rect.height*design.heightMm));onMove(field.key,Number(x.toFixed(1)),Number(y.toFixed(1)))}}>{values[field.key]}</button>)}</article>
}
