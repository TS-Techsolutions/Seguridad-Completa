import {useEffect,useState,type ReactNode} from 'react'
import {Minus,Plus,RotateCcw} from 'lucide-react'

const minimumZoom=50
const maximumZoom=200
const zoomStep=10

export function DocumentZoomShell({children}:{children:ReactNode}){
  const [zoom,setZoom]=useState(100)
  useEffect(()=>{
    document.documentElement.style.setProperty('--document-preview-zoom',String(zoom/100))
    return()=>{document.documentElement.style.removeProperty('--document-preview-zoom')}
  },[zoom])
  const change=(next:number)=>setZoom(Math.min(maximumZoom,Math.max(minimumZoom,next)))
  return <div className="document-zoom-shell">
    {children}
    <div className="document-zoom-controls" role="group" aria-label="Controles de zoom del documento">
      <button type="button" onClick={()=>change(zoom-zoomStep)} disabled={zoom===minimumZoom} aria-label="Alejar documento" title="Alejar"><Minus/></button>
      <button type="button" className="document-zoom-value" onClick={()=>setZoom(100)} aria-label={`Restablecer zoom, actual ${zoom}%`} title="Restablecer a 100%"><RotateCcw/><span>{zoom}%</span></button>
      <button type="button" onClick={()=>change(zoom+zoomStep)} disabled={zoom===maximumZoom} aria-label="Acercar documento" title="Acercar"><Plus/></button>
    </div>
  </div>
}
