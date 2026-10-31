import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, CornerDownRight, Pencil, Plus, Search, X } from 'lucide-react'
import type { ScreenSpec } from './types'

type Account = {
  Codigo: string
  'Descripción': string
  Tipo: string
  'Cta. Padre': string
  Grupo: string
  Estructura: string
  Estado: string
  sourceUploadId: string
}

type AccountDraft = Omit<Account, 'sourceUploadId'>

const planKey = 'saga.accounting.plan'
const emptyDraft: AccountDraft = { Codigo: '', 'Descripción': '', Tipo: 'MAYOR', 'Cta. Padre': '', Grupo: 'Activo', Estructura: 'TITULO', Estado: 'Activo' }
const groups = ['Activo', 'Pasivo', 'Patrimonio', 'Ingresos ordinarios', 'Costo de ventas']
const structures = ['TITULO', 'NIVEL 2', 'NIVEL 3', 'NIVEL 4', 'NIVEL 5', 'NIVEL 6']
const structureLengths: Record<string, number> = { TITULO: 1, 'NIVEL 2': 2, 'NIVEL 3': 4, 'NIVEL 4': 6, 'NIVEL 5': 9, 'NIVEL 6': 11 }

function readPlan(): Account[] {
  try {
    const value = JSON.parse(localStorage.getItem(planKey) ?? '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function normalizeCode(value: string) {
  return value.replace(/\D/g, '')
}

function compareAccounts(left: Account, right: Account) {
  return left.Codigo.localeCompare(right.Codigo, 'es', { numeric: true })
}

function orderAccountsByHierarchy(accounts: Account[]) {
  const byCode = new Map(accounts.map(account => [account.Codigo, account]))
  const childrenByParent = new Map<string, Account[]>()
  const roots: Account[] = []

  accounts.forEach(account => {
    const parentCode = account['Cta. Padre']
    if (!parentCode || parentCode === account.Codigo || !byCode.has(parentCode)) {
      roots.push(account)
      return
    }
    const children = childrenByParent.get(parentCode) ?? []
    children.push(account)
    childrenByParent.set(parentCode, children)
  })

  roots.sort(compareAccounts)
  childrenByParent.forEach(children => children.sort(compareAccounts))

  const ordered: Account[] = []
  const visited = new Set<string>()
  const visit = (account: Account) => {
    if (visited.has(account.Codigo)) return
    visited.add(account.Codigo)
    ordered.push(account)
    const children = childrenByParent.get(account.Codigo) ?? []
    children.forEach(visit)
  }

  roots.forEach(visit)
  const remaining = [...accounts].sort(compareAccounts)
  remaining.forEach(visit)
  return ordered
}

function accountDepth(account: Account, byCode: Map<string, Account>) {
  let depth = 0
  let parent = account['Cta. Padre']
  const visited = new Set<string>()
  while (parent && byCode.has(parent) && !visited.has(parent) && depth < 6) {
    visited.add(parent)
    depth += 1
    parent = byCode.get(parent)?.['Cta. Padre'] ?? ''
  }
  return depth
}

export function AccountPlanPage({ screen }: { screen: ScreenSpec }) {
  const [accounts, setAccounts] = useState<Account[]>(readPlan)
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [draft, setDraft] = useState<AccountDraft>(emptyDraft)
  const [parentSearch, setParentSearch] = useState('')
  const [parentOptionsOpen, setParentOptionsOpen] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const sorted = useMemo(() => orderAccountsByHierarchy(accounts), [accounts])
  const byCode = useMemo(() => new Map(accounts.map(account => [account.Codigo, account])), [accounts])
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es')
    if (!term) return sorted
    return sorted.filter(account => [account.Codigo, account['Descripción'], account.Tipo, account['Cta. Padre'], account.Grupo, account.Estructura, account.Estado].some(value => value.toLocaleLowerCase('es').includes(term)))
  }, [query, sorted])
  const parentCandidates = useMemo(() => {
    const selectedParent = accounts.find(account => account.Codigo === draft['Cta. Padre'])
    const selectedLabel = selectedParent ? `${selectedParent.Codigo} · ${selectedParent['Descripción']}` : ''
    const term = parentSearch === selectedLabel ? '' : parentSearch.trim().toLocaleLowerCase('es')
    return sorted.filter(account => account.Codigo !== editingCode && account.Tipo !== 'AUXILIAR' && (!term || account.Codigo.toLocaleLowerCase('es').includes(term) || account['Descripción'].toLocaleLowerCase('es').includes(term)))
  }, [accounts, draft, editingCode, parentSearch, sorted])

  const parentLabel = (code: string) => {
    const parent = accounts.find(account => account.Codigo === code)
    return parent ? `${parent.Codigo} · ${parent['Descripción']}` : ''
  }

  const persist = (next: Account[]) => {
    setAccounts(next)
    localStorage.setItem(planKey, JSON.stringify(next))
  }

  const nextAvailableCode = (parent?: Account) => {
    const parentLevel = parent ? structures.indexOf(parent.Estructura) : -1
    const targetStructure = parent ? structures[Math.min(parentLevel + 1, structures.length - 1)] : 'TITULO'
    const targetLength = structureLengths[targetStructure]
    const prefix = parent?.Codigo ?? ''
    const sequenceWidth = targetLength - prefix.length
    if (sequenceWidth <= 0) return ''
    const siblings = accounts.filter(account =>
      account['Cta. Padre'] === prefix
      && account.Codigo.length === targetLength
      && account.Codigo.startsWith(prefix),
    )
    const highestSequence = siblings.reduce((highest, account) => {
      const sequence = Number(account.Codigo.slice(prefix.length))
      return Number.isInteger(sequence) ? Math.max(highest, sequence) : highest
    }, 0)
    const nextSequence = highestSequence + 1
    if (nextSequence > Number('9'.repeat(sequenceWidth))) return ''
    return `${prefix}${String(nextSequence).padStart(sequenceWidth, '0')}`
  }

  const startNew = (parent?: Account) => {
    const parentLevel = parent ? structures.indexOf(parent.Estructura) : -1
    setEditingCode(null)
    setDraft(parent ? {
      ...emptyDraft,
      Codigo: nextAvailableCode(parent),
      'Cta. Padre': parent.Codigo,
      Grupo: parent.Grupo,
      Estructura: structures[Math.min(parentLevel + 1, structures.length - 1)],
    } : { ...emptyDraft, Codigo: nextAvailableCode() })
    setParentSearch(parent ? `${parent.Codigo} · ${parent['Descripción']}` : '')
    setParentOptionsOpen(false)
    setError('')
    setMessage('')
    setFormOpen(true)
  }

  const startEdit = (account: Account) => {
    const { sourceUploadId: _source, ...values } = account
    setEditingCode(account.Codigo)
    setDraft(values)
    setParentSearch(parentLabel(account['Cta. Padre']))
    setParentOptionsOpen(false)
    setError('')
    setMessage('')
    setFormOpen(true)
  }

  const updateDraft = (field: keyof AccountDraft, value: string) => {
    setDraft(current => ({ ...current, [field]: field === 'Codigo' || field === 'Cta. Padre' ? normalizeCode(value) : value }))
    setError('')
  }

  const validate = () => {
    const code = draft.Codigo
    const parentCode = draft['Cta. Padre']
    const duplicate = accounts.some(account => account.Codigo === code && account.Codigo !== editingCode)
    const parent = accounts.find(account => account.Codigo === parentCode)
    if (!code) return 'El código es obligatorio.'
    if (!draft['Descripción'].trim()) return 'La descripción es obligatoria.'
    if (duplicate) return 'Ya existe una cuenta con este código.'
    if (code.length !== structureLengths[draft.Estructura]) return `El código de ${draft.Estructura} debe tener ${structureLengths[draft.Estructura]} dígitos.`
    if (draft.Estructura === 'TITULO' && parentCode) return 'Una cuenta TÍTULO no debe tener cuenta padre.'
    if (draft.Estructura !== 'TITULO' && !parentCode) return 'Selecciona la cuenta padre.'
    if (parentCode && !parent) return 'La cuenta padre seleccionada no existe.'
    if (parentCode && parent?.Tipo === 'AUXILIAR') return 'Una cuenta AUXILIAR no puede tener cuentas hijas.'
    if (parentCode && !code.startsWith(parentCode)) return 'El código debe comenzar con la numeración de su cuenta padre.'
    if (parentCode === editingCode || (editingCode && parentCode.startsWith(editingCode))) return 'La cuenta no puede depender de sí misma ni de una cuenta hija.'
    if (draft.Tipo === 'AUXILIAR' && editingCode && accounts.some(account => account['Cta. Padre'] === editingCode)) return 'Una cuenta con cuentas hijas no puede convertirse en AUXILIAR.'
    if (editingCode && editingCode !== code) {
      const descendants = accounts.filter(account => account.Codigo.startsWith(editingCode) && account.Codigo !== editingCode)
      const unaffected = new Set(accounts.filter(account => !account.Codigo.startsWith(editingCode)).map(account => account.Codigo))
      if (descendants.some(account => unaffected.has(code + account.Codigo.slice(editingCode.length)))) return 'El cambio de código genera conflictos con otra rama del plan.'
    }
    return ''
  }

  const save = (event: FormEvent) => {
    event.preventDefault()
    const validation = validate()
    if (validation) { setError(validation); return }
    const cleanDraft = { ...draft, 'Descripción': draft['Descripción'].trim() }
    let next: Account[]
    if (editingCode) {
      const current = accounts.find(account => account.Codigo === editingCode)
      if (!current) { setError('No se encontró la cuenta que deseas modificar.'); return }
      next = accounts.map(account => {
        if (account.Codigo === editingCode) return { ...cleanDraft, sourceUploadId: current.sourceUploadId }
        if (editingCode !== cleanDraft.Codigo && account.Codigo.startsWith(editingCode)) {
          return {
            ...account,
            Codigo: cleanDraft.Codigo + account.Codigo.slice(editingCode.length),
            'Cta. Padre': account['Cta. Padre'].startsWith(editingCode) ? cleanDraft.Codigo + account['Cta. Padre'].slice(editingCode.length) : account['Cta. Padre'],
          }
        }
        return account
      })
      setMessage(`La cuenta ${cleanDraft.Codigo} fue actualizada.`)
    } else {
      next = [...accounts, { ...cleanDraft, sourceUploadId: `manual:${crypto.randomUUID()}` }]
      setMessage(`La cuenta ${cleanDraft.Codigo} fue creada.`)
    }
    persist(next)
    setFormOpen(false)
  }

  const selectParent = (value: string) => {
    const parent = accounts.find(account => account.Codigo === value)
    setDraft(current => ({
      ...current,
      Codigo: editingCode ? current.Codigo : nextAvailableCode(parent),
      'Cta. Padre': value,
      Grupo: parent?.Grupo ?? current.Grupo,
      Estructura: parent ? structures[Math.min(structures.indexOf(parent.Estructura) + 1, structures.length - 1)] : current.Estructura,
    }))
    setParentSearch(parent ? `${parent.Codigo} · ${parent['Descripción']}` : '')
    setParentOptionsOpen(false)
    setError('')
  }

  const filterParents = (value: string) => {
    setParentSearch(value)
    setParentOptionsOpen(true)
    const currentLabel = parentLabel(draft['Cta. Padre'])
    if (draft['Cta. Padre'] && value !== currentLabel) setDraft(current => ({ ...current, 'Cta. Padre': '' }))
    setError('')
  }

  return <div className="page screen-page account-plan-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header account-plan-header">
      <div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div>
      <button type="button" className="primary-action" onClick={() => startNew()}><Plus />Nueva Cuenta</button>
    </section>

    <div className="account-plan-toolbar">
      <label><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por código, descripción, grupo o estructura" /></label>
      <span><strong>{accounts.length}</strong> cuentas · <b>{accounts.filter(account => account.Estado.toUpperCase() === 'ACTIVO').length}</b> activas</span>
    </div>

    {message && <div className="account-plan-feedback" role="status"><CheckCircle2 />{message}</div>}

    <div className="account-plan-table-scroll">
      <table>
        <thead><tr><th aria-label="Acciones" /><th>Código</th><th>Descripción</th><th>Tipo</th><th>Cuenta Padre</th><th>Grupo</th><th>Estructura</th><th>Estado</th></tr></thead>
        <tbody>
          {visible.map(account => {
            const depth = accountDepth(account, byCode)
            const canAddChild = account.Tipo !== 'AUXILIAR' && account.Estructura !== 'NIVEL 6'
            return <tr key={account.Codigo}>
              <td><div className="account-plan-row-actions"><button type="button" title="Editar cuenta" aria-label={`Editar ${account.Codigo}`} onClick={() => startEdit(account)}><Pencil /></button><button type="button" title="Crear cuenta hija" aria-label={`Agregar cuenta debajo de ${account.Codigo}`} disabled={!canAddChild} onClick={() => startNew(account)}><Plus /></button></div></td>
              <td><strong>{account.Codigo}</strong></td>
              <td><div className="account-plan-tree-label" style={{ '--account-depth': depth } as React.CSSProperties}>{depth > 0 && <CornerDownRight />}<span><strong>{account['Descripción']}</strong><small>{account.sourceUploadId.startsWith('manual:') ? 'Creación manual' : 'Plan migrado'}</small></span></div></td>
              <td><span className={`account-kind ${account.Tipo.toLowerCase()}`}>{account.Tipo}</span></td>
              <td>{account['Cta. Padre'] || '—'}</td><td>{account.Grupo}</td><td>{account.Estructura}</td><td><span className={`account-state ${account.Estado.toLowerCase()}`}><i />{account.Estado}</span></td>
            </tr>
          })}
          {!visible.length && <tr><td colSpan={8}><div className="account-plan-empty"><strong>{accounts.length ? 'No hay coincidencias' : 'Aún no existe un plan contable'}</strong><span>{accounts.length ? 'Prueba con otro criterio de búsqueda.' : 'Crea la primera cuenta TÍTULO o procesa un archivo desde Migrar Plan Contable.'}</span>{!accounts.length && <button type="button" className="primary-action" onClick={() => startNew()}><Plus />Crear primera cuenta</button>}</div></td></tr>}
        </tbody>
      </table>
    </div>

    {formOpen && <div className="account-plan-form-backdrop" role="dialog" aria-modal="true" aria-label={editingCode ? 'Modificar cuenta contable' : 'Crear cuenta contable'}>
      <form className="account-plan-form" onSubmit={save}>
        <header><div><span>{editingCode ? 'Modificar cuenta' : 'Nueva cuenta'}</span><h2>{editingCode ? `${editingCode} · ${draft['Descripción']}` : 'Crear cuenta contable'}</h2></div><button type="button" aria-label="Cerrar" onClick={() => setFormOpen(false)}><X /></button></header>
        <div className="account-plan-form-grid">
          <label><span>Código <b>Obligatorio</b></span><input inputMode="numeric" value={draft.Codigo} onChange={event => updateDraft('Codigo', event.target.value)} placeholder="Ej. 110101001" /></label>
          <label className="wide"><span>Descripción <b>Obligatorio</b></span><input value={draft['Descripción']} onChange={event => updateDraft('Descripción', event.target.value)} maxLength={160} placeholder="Nombre de la cuenta" /></label>
          <label><span>Tipo <b>Obligatorio</b></span><select value={draft.Tipo} onChange={event => updateDraft('Tipo', event.target.value)}><option>MAYOR</option><option>AUXILIAR</option></select></label>
          <label className="account-parent-field"><span>Cuenta Padre</span><div className="account-parent-combobox" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setParentOptionsOpen(false) }}><input role="combobox" aria-expanded={parentOptionsOpen} aria-controls="account-parent-options" aria-autocomplete="list" value={parentSearch} onFocus={event => { setParentOptionsOpen(true); event.currentTarget.select() }} onKeyDown={event => { if (event.key === 'Escape') setParentOptionsOpen(false) }} onChange={event => filterParents(event.target.value)} placeholder="Escribe código o descripción para filtrar" />{parentOptionsOpen&&<div id="account-parent-options" className="account-parent-options" role="listbox"><button type="button" role="option" aria-selected={!draft['Cta. Padre']} className={!draft['Cta. Padre']?'selected':''} onClick={()=>selectParent('')}><strong>Sin cuenta padre</strong><small>Disponible para cuentas TÍTULO</small></button>{parentCandidates.map(account=><button type="button" role="option" aria-selected={draft['Cta. Padre']===account.Codigo} className={draft['Cta. Padre']===account.Codigo?'selected':''} key={account.Codigo} onClick={()=>selectParent(account.Codigo)}><strong>{account.Codigo}</strong><span>{account['Descripción']}</span><small>{account.Estructura}</small></button>)}{!parentCandidates.length&&<div className="account-parent-empty">No existen cuentas Mayores coincidentes.</div>}</div>}</div></label>
          <label><span>Grupo <b>Obligatorio</b></span><select value={draft.Grupo} onChange={event => updateDraft('Grupo', event.target.value)}>{groups.map(group => <option key={group}>{group}</option>)}</select></label>
          <label><span>Estructura <b>Obligatorio</b></span><select value={draft.Estructura} onChange={event => updateDraft('Estructura', event.target.value)}>{structures.map(structure => <option key={structure}>{structure}</option>)}</select><small>{structureLengths[draft.Estructura]} dígitos requeridos</small></label>
          <label><span>Estado <b>Obligatorio</b></span><select value={draft.Estado} onChange={event => updateDraft('Estado', event.target.value)}><option>Activo</option><option>Inactivo</option></select></label>
          {error && <div className="account-plan-error" role="alert"><AlertTriangle />{error}</div>}
        </div>
        <footer><button type="button" className="quiet-button" onClick={() => setFormOpen(false)}>Cancelar</button><button type="submit" className="primary-action">{editingCode ? 'Guardar Cambios' : 'Crear Cuenta'}</button></footer>
      </form>
    </div>}
  </div>
}
