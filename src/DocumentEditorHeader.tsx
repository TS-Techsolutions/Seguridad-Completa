import type { ReactNode } from 'react'
import { ChevronRight, X } from 'lucide-react'
import type { ScreenSpec } from './types'

type DocumentEditorHeaderProps = {
  screen: ScreenSpec
  formOpen: boolean
  formTitle: string
  sectionLabel: string
  onClose: () => void
  actions: ReactNode
  listAction: ReactNode
}

export function DocumentEditorHeader({ screen, formOpen, formTitle, sectionLabel, onClose, actions, listAction }: DocumentEditorHeaderProps) {
  return <>
    <div className={`document-editor-breadcrumb-row ${formOpen ? 'form-open' : ''}`} data-document-editor-open={formOpen ? 'true' : 'false'}>
      <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
      {formOpen && <button type="button" className="document-editor-close" aria-label={`Cerrar ${formTitle}`} title="Cerrar y volver al listado" onClick={onClose}><X /></button>}
    </div>
    <section className="screen-header document-editor-screen-header">
      <div><div className="screen-id"><span>{screen.id}</span><b>{sectionLabel}</b></div><h1>{formOpen ? formTitle : screen.titulo_original}</h1></div>
      {formOpen ? <div className="document-editor-actions">{actions}</div> : listAction}
    </section>
  </>
}
