import { useRef, useState, type ChangeEvent } from 'react'
import { CheckCircle2, ChevronRight, FileText, Trash2, UploadCloud } from 'lucide-react'
import type { ScreenSpec } from './types'

type BulletinDocument = {
  id: string
  date: string
  fileName: string
  fileSize: number
  detail: string
}

const storageKey = 'saga.bulletin-documents'

function readDocuments(): BulletinDocument[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function today() {
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function BulletinPage({ screen }: { screen: ScreenSpec }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [detail, setDetail] = useState('')
  const [documents, setDocuments] = useState<BulletinDocument[]>(readDocuments)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    setFile(selected)
    setError('')
    setMessage('')
  }

  const save = () => {
    if (!file) {
      setMessage('')
      setError('Adjunta un documento para continuar.')
      return
    }
    if (!detail.trim()) {
      setMessage('')
      setError('Ingresa el detalle y el origen del documento.')
      return
    }

    const next: BulletinDocument[] = [
      {
        id: crypto.randomUUID(),
        date: today(),
        fileName: file.name,
        fileSize: file.size,
        detail: detail.trim(),
      },
      ...documents,
    ]
    setDocuments(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
    setFile(null)
    setDetail('')
    if (fileInput.current) fileInput.current.value = ''
    setError('')
    setMessage('Documento agregado al boletín para revisión.')
  }

  const stopPublishing = (document: BulletinDocument) => {
    if (!window.confirm(`¿Deseas dejar de publicar el archivo “${document.fileName}”?`)) return
    const next = documents.filter((item) => item.id !== document.id)
    setDocuments(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
    setError('')
    setMessage('El documento dejó de publicarse.')
  }

  return (
    <div className="page screen-page bulletin-page">
      <div className="breadcrumbs">
        {screen.ruta_original.split(' > ').map((part, index, all) => (
          <span key={`${part}-${index}`}>
            {part}
            {index < all.length - 1 && <ChevronRight />}
          </span>
        ))}
      </div>

      <section className="screen-header bulletin-header">
        <div>
          <div className="screen-id">
            <span>{screen.id}</span>
            <b>Módulo opcional</b>
          </div>
          <h1>{screen.titulo_original}</h1>
        </div>
      </section>

      <div className="bulletin-form">
        <label className={`bulletin-upload ${file ? 'has-file' : ''}`}>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={selectFile}
          />
          {file ? <FileText /> : <UploadCloud />}
          <strong>{file ? file.name : 'Adjuntar documento'}</strong>
          <span>{file ? formatSize(file.size) : 'PDF, Word, Excel o imagen'}</span>
          <small>{file ? 'Haz clic para reemplazar el archivo' : 'Selecciona el archivo que revisarán los clientes'}</small>
        </label>

        <label className="bulletin-detail">
          <span>Detalle</span>
          <textarea
            value={detail}
            onChange={(event) => {
              setDetail(event.target.value)
              setError('')
              setMessage('')
            }}
            maxLength={500}
            placeholder="Explica el origen del documento y la información que debe revisar el cliente."
          />
          <small>{detail.length}/500</small>
        </label>
      </div>

      <div className="bulletin-actions">
        <button className="primary-action" type="button" onClick={save}>
          <UploadCloud />
          Publicar para revisión
        </button>
      </div>

      {error && <div className="bulletin-feedback error" role="alert">{error}</div>}
      {message && <div className="bulletin-feedback success" role="status"><CheckCircle2 />{message}</div>}

      <section className="bulletin-published">
        <h2>Archivos publicados</h2>
        <div className="bulletin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Documento</th>
                <th>Detalle</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td>{document.date}</td>
                  <td><span className="bulletin-file-name"><FileText />{document.fileName}<small>{formatSize(document.fileSize)}</small></span></td>
                  <td>{document.detail}</td>
                  <td><span className="bulletin-status">Publicado</span></td>
                  <td className="bulletin-row-actions"><button type="button" className="bulletin-delete" title="Dejar de publicar" aria-label={`Dejar de publicar ${document.fileName}`} onClick={() => stopPublishing(document)}><Trash2 /></button></td>
                </tr>
              ))}
              {!documents.length && <tr><td colSpan={5} className="bulletin-empty">No hay archivos publicados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
