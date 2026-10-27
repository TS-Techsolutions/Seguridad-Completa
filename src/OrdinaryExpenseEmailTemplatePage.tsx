import { useRef, useState, type KeyboardEvent } from 'react'
import { AlignCenter, AlignLeft, Bold, CheckCircle2, ChevronRight, Italic, Link, List, ListOrdered, Mail, Plus, Save, Underline, X } from 'lucide-react'
import type { ScreenSpec } from './types'

type TemplateState = {
  subject: string
  body: string
  copyEmails: string[]
}

const templateDefaults: Record<string, TemplateState> = {
  'XLS-012': {
    subject: 'Envío de factura {{COMPROBANTE}} - {{MES}} {{ANIO}}',
    body: '<p>Estimado/a <strong>{{RAZON_SOCIAL}}</strong>:</p><p>Adjuntamos el comprobante <strong>{{COMPROBANTE}}</strong>, correspondiente al mes de {{MES}} de {{ANIO}}, por un valor de {{VALOR}}.</p><p>Fecha de emisión: {{FECHA}}.</p><p>Saludos cordiales.</p>',
    copyEmails: [],
  },
  'XLS-013': {
    subject: 'Envío de factura extraordinaria {{COMPROBANTE}} - {{MES}} {{ANIO}}',
    body: '<p>Estimado/a <strong>{{RAZON_SOCIAL}}</strong>:</p><p>Adjuntamos el comprobante extraordinario <strong>{{COMPROBANTE}}</strong>, correspondiente al mes de {{MES}} de {{ANIO}}, por un valor de {{VALOR}}.</p><p>Fecha de emisión: {{FECHA}}.</p><p>Saludos cordiales.</p>',
    copyEmails: [],
  },
  'XLS-014': {
    subject: 'Confirmación de recaudación {{COMPROBANTE}} - {{FECHA}}',
    body: '<p>Estimado/a <strong>{{RAZON_SOCIAL}}</strong>:</p><p>Confirmamos el registro del comprobante <strong>{{COMPROBANTE}}</strong>, con fecha {{FECHA}}, por un valor de {{VALOR}}.</p><p>Periodo: {{MES}} de {{ANIO}}.</p><p>Saludos cordiales.</p>',
    copyEmails: [],
  },
  'XLS-015': {
    subject: 'Notificación de gestión de cobranza - {{MES}} {{ANIO}}',
    body: '<p>Estimado/a <strong>{{RAZON_SOCIAL}}</strong>:</p><p>Nos comunicamos respecto del comprobante <strong>{{COMPROBANTE}}</strong>, correspondiente al mes de {{MES}} de {{ANIO}}, por un valor de {{VALOR}}.</p><p>Fecha de notificación: {{FECHA}}.</p><p>Saludos cordiales.</p>',
    copyEmails: [],
  },
}

const variables = [
  { label: 'Razón Social', token: '{{RAZON_SOCIAL}}' },
  { label: 'Comprobante', token: '{{COMPROBANTE}}' },
  { label: 'Mes', token: '{{MES}}' },
  { label: 'Año', token: '{{ANIO}}' },
  { label: 'Fecha', token: '{{FECHA}}' },
  { label: 'Valor', token: '{{VALOR}}' },
]

function storageKey(screenId: string) {
  return screenId === 'XLS-012' ? 'saga.email-template.ordinary-expenses' : `saga.email-template.${screenId.toLowerCase()}`
}

function readTemplate(screenId: string): TemplateState {
  const defaultTemplate = templateDefaults[screenId] ?? templateDefaults['XLS-012']
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(screenId)) ?? 'null') as Partial<TemplateState> | null
    return value ? {
      subject: typeof value.subject === 'string' ? value.subject : defaultTemplate.subject,
      body: typeof value.body === 'string' ? value.body : defaultTemplate.body,
      copyEmails: Array.isArray(value.copyEmails) ? value.copyEmails.filter((item): item is string => typeof item === 'string') : [],
    } : defaultTemplate
  } catch {
    return defaultTemplate
  }
}

export function EmailTemplatePage({ screen }: { screen: ScreenSpec }) {
  const initial = useRef(readTemplate(screen.id))
  const editorRef = useRef<HTMLDivElement>(null)
  const [subject, setSubject] = useState(initial.current.subject)
  const [copyEmails, setCopyEmails] = useState(initial.current.copyEmails)
  const [copyEmail, setCopyEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const format = (command: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
  }

  const insertVariable = (token: string) => {
    editorRef.current?.focus()
    document.execCommand('insertText', false, token)
    setError('')
    setMessage('')
  }

  const addLink = () => {
    const url = window.prompt('Ingresa la dirección del enlace:')
    if (url) format('createLink', url)
  }

  const addCopyEmail = () => {
    const email = copyEmail.trim().toLowerCase()
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage('')
      setError('Ingresa un correo de copia válido.')
      return
    }
    if (copyEmails.includes(email)) {
      setMessage('')
      setError('Ese correo ya está incluido en la lista de copia.')
      return
    }
    setCopyEmails([...copyEmails, email])
    setCopyEmail('')
    setError('')
    setMessage('')
  }

  const handleCopyKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addCopyEmail()
    }
  }

  const save = () => {
    const body = editorRef.current?.innerHTML ?? ''
    if (!subject.trim()) {
      setMessage('')
      setError('Ingresa el asunto del correo.')
      return
    }
    if (!(editorRef.current?.innerText.trim())) {
      setMessage('')
      setError('Ingresa el cuerpo del mensaje.')
      return
    }
    localStorage.setItem(storageKey(screen.id), JSON.stringify({ subject: subject.trim(), body, copyEmails }))
    setError('')
    setMessage('La plantilla de correo fue guardada correctamente.')
  }

  return (
    <div className="page screen-page expense-template-page">
      <div className="breadcrumbs">
        {screen.ruta_original.split(' > ').map((part, index, all) => (
          <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>
        ))}
      </div>

      <section className="screen-header expense-template-header">
        <div>
          <div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div>
          <h1>{screen.titulo_original}</h1>
        </div>
        <button type="button" className="primary-action" onClick={save}><Save />Guardar plantilla</button>
      </section>

      <label className="expense-template-subject">
        <span>Asunto</span>
        <input value={subject} onChange={(event) => { setSubject(event.target.value); setError(''); setMessage('') }} maxLength={180} placeholder="Asunto que recibirán los clientes" />
      </label>

      <div className="expense-template-layout">
        <section className="expense-message-box">
          <h2>Cuerpo del Mensaje</h2>
          <div className="expense-editor-toolbar" aria-label="Opciones de edición">
            <button type="button" title="Negrita" aria-label="Negrita" onClick={() => format('bold')}><Bold /></button>
            <button type="button" title="Cursiva" aria-label="Cursiva" onClick={() => format('italic')}><Italic /></button>
            <button type="button" title="Subrayado" aria-label="Subrayado" onClick={() => format('underline')}><Underline /></button>
            <span />
            <button type="button" title="Lista con viñetas" aria-label="Lista con viñetas" onClick={() => format('insertUnorderedList')}><List /></button>
            <button type="button" title="Lista numerada" aria-label="Lista numerada" onClick={() => format('insertOrderedList')}><ListOrdered /></button>
            <span />
            <button type="button" title="Alinear a la izquierda" aria-label="Alinear a la izquierda" onClick={() => format('justifyLeft')}><AlignLeft /></button>
            <button type="button" title="Centrar" aria-label="Centrar" onClick={() => format('justifyCenter')}><AlignCenter /></button>
            <button type="button" title="Insertar enlace" aria-label="Insertar enlace" onClick={addLink}><Link /></button>
          </div>
          <div
            ref={editorRef}
            className="expense-editor-body"
            contentEditable
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: initial.current.body }}
            onInput={() => { setError(''); setMessage('') }}
          />
        </section>

        <aside className="expense-variables-box">
          <h2>Variables</h2>
          <p>Selecciona una variable para insertarla en el cuerpo del mensaje.</p>
          <div>
            {variables.map((variable) => (
              <button type="button" key={variable.token} onClick={() => insertVariable(variable.token)}>
                <Plus /><span><strong>{variable.label}</strong><small>{variable.token}</small></span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <section className="expense-copy-box">
        <div className="expense-copy-heading"><Mail /><div><h2>Correo Copia</h2><p>Agrega los correos de soporte que recibirán copia de todos estos envíos.</p></div></div>
        <div className="expense-copy-entry">
          <input type="email" value={copyEmail} onChange={(event) => { setCopyEmail(event.target.value); setError(''); setMessage('') }} onKeyDown={handleCopyKey} placeholder="soporte@empresa.com" />
          <button type="button" className="quiet-button" onClick={addCopyEmail}><Plus />Agregar correo</button>
        </div>
        <div className="expense-copy-list">
          {copyEmails.map((email) => <span key={email}>{email}<button type="button" title={`Quitar ${email}`} aria-label={`Quitar ${email}`} onClick={() => setCopyEmails(copyEmails.filter((item) => item !== email))}><X /></button></span>)}
          {!copyEmails.length && <small>No hay correos de copia configurados.</small>}
        </div>
      </section>

      {error && <div className="expense-template-feedback error" role="alert">{error}</div>}
      {message && <div className="expense-template-feedback success" role="status"><CheckCircle2 />{message}</div>}
    </div>
  )
}
