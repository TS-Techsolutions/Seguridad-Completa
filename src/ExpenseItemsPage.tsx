import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { api } from './api'
import type { Context, ScreenSpec } from './types'

type State = 'ACTIVO' | 'INACTIVO'
type ItemType = 'INGRESO' | 'EGRESO'
type ValueMode = 'MT2' | 'FIJO' | 'NA'
type Recurrence = 'NORMAL' | 'EVENTUAL' | 'EXTRAORDINARIA'
type Account = { Codigo: string; 'Descripción': string; Estado: string }
type Section = { id: string; description: string; state: State }
type StructureDetail = { id: string; description: string; state: State }
type StructureRow = { id: string; description: string; state: State; details?: StructureDetail[] }
type Division = { key: string; label: string }
type SubItem = { id: string; description: string; accountCode: string }
type ExtraordinaryHistory = { id: string; detail: string; startMonth: string; installments: number; executedInstallments: number; state: State; valueMode?: ValueMode; value?: string; divisionKeys?: string[]; sectionIds?: string[] }
type ExtraordinaryDraft = { detail: string; startMonth: string; installments: string; executedInstallments: string; state: State; valueMode: ValueMode; value: string; divisionKeys: string[]; sectionIds: string[] }
type ExpenseItem = {
  id: string
  type: ItemType
  description: string
  expenseText: string
  valueMode: ValueMode
  value: string
  accountCode: string
  divisionKeys: string[]
  sectionIds: string[]
  recurrence: Recurrence
  state: State
  subItems: SubItem[]
  extraordinaryHistory: ExtraordinaryHistory[]
}
type ExpenseItemDraft = Omit<ExpenseItem, 'id'>

const emptyDraft: ExpenseItemDraft = { type: 'INGRESO', description: '', expenseText: '', valueMode: 'MT2', value: '', accountCode: '', divisionKeys: [], sectionIds: [], recurrence: 'NORMAL', state: 'ACTIVO', subItems: [], extraordinaryHistory: [] }
const emptyExtraordinary: ExtraordinaryDraft = { detail: '', startMonth: '', installments: '', executedInstallments: '0', state: 'ACTIVO', valueMode: 'MT2', value: '', divisionKeys: [], sectionIds: [] }
const sectionSeed: Section[] = [{ id: 'SEC-A', description: 'Departamentos', state: 'ACTIVO' }, { id: 'SEC-B', description: 'Locales comerciales', state: 'ACTIVO' }, { id: 'SEC-C', description: 'Parqueaderos', state: 'INACTIVO' }]
const recurrenceLabels: Record<Recurrence, string> = { NORMAL: 'Normal', EVENTUAL: 'Eventual', EXTRAORDINARIA: 'Extraordinaria' }

function readJson<T>(key: string, fallback: T): T {
  try { const value = JSON.parse(localStorage.getItem(key) ?? 'null'); return value ?? fallback } catch { return fallback }
}

function readAccounts() {
  return readJson<Account[]>('saga.accounting.plan', []).sort((left, right) => left.Codigo.localeCompare(right.Codigo, 'es', { numeric: true }))
}

function readSections() {
  const sections = readJson<Section[]>('saga.property-sections', [])
  return sections.length ? sections : sectionSeed
}

function readDivisions(): Division[] {
  const source = readJson<Record<string, StructureRow[]>>('saga.property-type-structure', {})
  const options = Object.entries(source).flatMap(([type, rows]) => (Array.isArray(rows) ? rows : []).flatMap(parent => {
    const details = Array.isArray(parent.details) ? parent.details : []
    return details.length ? details.map(detail => ({ key: `${type}|${parent.id}|${detail.id}`, label: `${parent.description} - ${detail.description}${detail.state === 'INACTIVO' ? ' (Inactivo)' : ''}` })) : [{ key: `${type}|${parent.id}|`, label: `${parent.description}${parent.state === 'INACTIVO' ? ' (Inactivo)' : ''}` }]
  }))
  return options.filter((option, index) => options.findIndex(candidate => candidate.label.localeCompare(option.label, 'es', { sensitivity: 'base' }) === 0) === index)
}

function storageKey(companyId: string) { return `saga.property-expense-items:${companyId}` }

function readExpenseItems(companyId: string): ExpenseItem[] {
  const stored = readJson<Array<ExpenseItem & { divisionKey?: string; sectionId?: string }>>(storageKey(companyId), [])
  return stored.map(row => ({ ...row, divisionKeys: Array.isArray(row.divisionKeys) ? row.divisionKeys : row.divisionKey ? [row.divisionKey] : [], sectionIds: Array.isArray(row.sectionIds) ? row.sectionIds : row.sectionId ? [row.sectionId] : [], subItems: Array.isArray(row.subItems) ? row.subItems : [], extraordinaryHistory: Array.isArray(row.extraordinaryHistory) ? row.extraordinaryHistory.map(entry => ({ ...entry, divisionKeys: Array.isArray(entry.divisionKeys) ? entry.divisionKeys : undefined, sectionIds: Array.isArray(entry.sectionIds) ? entry.sectionIds : undefined })) : [] }))
}

export function ExpenseItemsPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <ExpenseItemsManager key={context.data.company.id} screen={screen} company={context.data.company} />
}

function ExpenseItemsManager({ screen, company }: { screen: ScreenSpec; company: Context['company'] }) {
  const accounts = useMemo(readAccounts, [])
  const divisions = useMemo(readDivisions, [])
  const sections = useMemo(readSections, [])
  const [rows, setRows] = useState<ExpenseItem[]>(() => readExpenseItems(company.id))
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ExpenseItemDraft>({ ...emptyDraft })
  const [error, setError] = useState('')
  const [subForm, setSubForm] = useState(false)
  const [editingSubId, setEditingSubId] = useState<string | null>(null)
  const [subDescription, setSubDescription] = useState('')
  const [subAccount, setSubAccount] = useState('')
  const [subError, setSubError] = useState('')
  const [extraordinaryForm, setExtraordinaryForm] = useState(false)
  const [editingExtraordinaryId, setEditingExtraordinaryId] = useState<string | null>(null)
  const [extraordinaryDraft, setExtraordinaryDraft] = useState({ ...emptyExtraordinary })
  const [extraordinaryError, setExtraordinaryError] = useState('')

  const accountLabel = (code: string) => { const account = accounts.find(item => item.Codigo === code); return account ? `${account.Codigo} · ${account['Descripción']}` : code || '—' }
  const filtered = rows.filter(row => [row.type, row.description, accountLabel(row.accountCode), recurrenceLabels[row.recurrence], row.state].join(' ').toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')))

  const persist = (next: ExpenseItem[]) => { setRows(next); localStorage.setItem(storageKey(company.id), JSON.stringify(next)) }
  const closeForm = () => { setFormOpen(false); setEditingId(null); setError(''); setSubForm(false); setEditingSubId(null); setExtraordinaryForm(false); setEditingExtraordinaryId(null) }
  const openNew = () => {
    setEditingId(null)
    setDraft({ ...emptyDraft, accountCode: accounts[0]?.Codigo ?? '', divisionKeys: [], sectionIds: [] })
    setError(''); setSubForm(false); setExtraordinaryForm(false); setFormOpen(true)
  }
  const openEdit = (row: ExpenseItem) => { const { id, ...values } = row; setEditingId(id); setDraft({ ...values, subItems: [...values.subItems], extraordinaryHistory: [...values.extraordinaryHistory] }); setError(''); setSubForm(false); setExtraordinaryForm(false); setFormOpen(true) }

  const save = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.description.trim()) { setError('Ingresa la descripción del rubro.'); return }
    if (draft.recurrence !== 'EVENTUAL' && !draft.expenseText.trim()) { setError('Ingresa el texto que aparecerá en la expensa.'); return }
    const normalizedValue = draft.value.replace(',', '.')
    if (draft.valueMode !== 'NA' && (!/^\d+(?:\.\d{1,6})?$/.test(normalizedValue) || Number(normalizedValue) < 0)) { setError(draft.valueMode === 'MT2' ? 'El valor por Mt2 debe ser un número con máximo 6 decimales.' : 'Ingresa un valor fijo válido con máximo 6 decimales.'); return }
    if (!accounts.some(account => account.Codigo === draft.accountCode)) { setError('Selecciona una cuenta creada en el Plan Contable.'); return }
    if (draft.recurrence !== 'EVENTUAL' && !draft.divisionKeys.length) { setError('Selecciona al menos una división creada en Definición de Estructura.'); return }
    if (draft.divisionKeys.some(key => !divisions.some(division => division.key === key))) { setError('La división seleccionada no existe en Definición de Estructura.'); return }
    if (draft.recurrence !== 'EVENTUAL' && !draft.sectionIds.length) { setError('Selecciona al menos una sección existente.'); return }
    if (draft.sectionIds.some(id => !sections.some(section => section.id === id))) { setError('La sección seleccionada no existe.'); return }
    const clean = { ...draft, description: draft.description.trim(), expenseText: draft.expenseText.trim(), value: draft.valueMode === 'NA' ? '' : Number(normalizedValue).toFixed(6).replace(/0+$/, '').replace(/\.$/, '') }
    persist(editingId ? rows.map(row => row.id === editingId ? { ...clean, id: editingId } : row) : [{ ...clean, id: crypto.randomUUID() }, ...rows])
    closeForm()
  }

  const openSub = (sub?: SubItem) => { setEditingSubId(sub?.id ?? null); setSubDescription(sub?.description ?? ''); setSubAccount(sub?.accountCode ?? accounts[0]?.Codigo ?? ''); setSubError(''); setSubForm(true) }
  const addExpenseVariable = (variable: 'SECCION' | 'DIVISION' | 'MES' | 'ANIO') => setDraft(current => ({ ...current, expenseText: `${current.expenseText}${current.expenseText && !current.expenseText.endsWith(' ') ? ' ' : ''}{${variable}}` }))
  const saveSub = () => {
    if (!subDescription.trim()) { setSubError('Ingresa la descripción del sub-rubro.'); return }
    if (!accounts.some(account => account.Codigo === subAccount)) { setSubError('Selecciona una cuenta válida.'); return }
    const sub = { id: editingSubId ?? crypto.randomUUID(), description: subDescription.trim(), accountCode: subAccount }
    setDraft(current => ({ ...current, subItems: editingSubId ? current.subItems.map(item => item.id === editingSubId ? sub : item) : [...current.subItems, sub] }))
    setSubForm(false); setEditingSubId(null); setSubError('')
  }
  const openExtraordinary = (entry?: ExtraordinaryHistory) => {
    setEditingExtraordinaryId(entry?.id ?? null)
    setExtraordinaryDraft(entry ? { detail: entry.detail, startMonth: entry.startMonth, installments: String(entry.installments), executedInstallments: String(entry.executedInstallments), state: entry.state, valueMode: entry.valueMode ?? draft.valueMode, value: entry.valueMode === 'NA' ? '' : entry.value ?? draft.value, divisionKeys: entry.divisionKeys?.length ? [...entry.divisionKeys] : [...draft.divisionKeys], sectionIds: entry.sectionIds?.length ? [...entry.sectionIds] : [...draft.sectionIds] } : { ...emptyExtraordinary, valueMode: draft.valueMode, value: draft.value, divisionKeys: [...draft.divisionKeys], sectionIds: [...draft.sectionIds] })
    setExtraordinaryError(''); setExtraordinaryForm(true)
  }
  const usesSpecificExtraordinaryConfiguration = (candidate = extraordinaryDraft) => {
    const otherActive = draft.extraordinaryHistory.filter(entry => entry.id !== editingExtraordinaryId && entry.state === 'ACTIVO' && entry.executedInstallments < entry.installments).length
    const candidateActive = candidate.state === 'ACTIVO' && Number(candidate.executedInstallments) < Number(candidate.installments)
    return otherActive + (candidateActive ? 1 : 0) > 1
  }
  const hasConcurrentExtraordinaries = draft.extraordinaryHistory.filter(entry => entry.state === 'ACTIVO' && entry.executedInstallments < entry.installments).length > 1
  const showExtraordinaryConfiguration = hasConcurrentExtraordinaries || (extraordinaryForm && usesSpecificExtraordinaryConfiguration())
  const extraordinaryModeLabel = (entry: ExtraordinaryHistory) => ({ MT2: 'x Mt2', FIJO: 'Fijo', NA: 'N/A' }[entry.valueMode ?? draft.valueMode])
  const extraordinaryValueLabel = (entry: ExtraordinaryHistory) => (entry.valueMode ?? draft.valueMode) === 'NA' ? 'Valor de Sección' : entry.value ?? draft.value
  const extraordinaryDivisionLabel = (entry: ExtraordinaryHistory) => (entry.divisionKeys?.length ? entry.divisionKeys : draft.divisionKeys).map(key => divisions.find(option => option.key === key)?.label ?? key).join(', ')
  const extraordinarySectionLabel = (entry: ExtraordinaryHistory) => (entry.sectionIds?.length ? entry.sectionIds : draft.sectionIds).map(id => sections.find(option => option.id === id)?.description ?? id).join(', ')
  const saveExtraordinary = () => {
    const installments = Number(extraordinaryDraft.installments)
    const executedInstallments = Number(extraordinaryDraft.executedInstallments)
    const monthMatch = extraordinaryDraft.startMonth.match(/^(0[1-9]|1[0-2])\/(\d{4})$/)
    if (!extraordinaryDraft.detail.trim()) { setExtraordinaryError('Ingresa el detalle.'); return }
    if (!monthMatch) { setExtraordinaryError('La Fecha Inicio debe tener el formato MM/AAAA.'); return }
    if (!Number.isInteger(installments) || installments < 1) { setExtraordinaryError('El número de cuotas debe ser un entero mayor que cero.'); return }
    if (!Number.isInteger(executedInstallments) || executedInstallments < 0 || executedInstallments > installments) { setExtraordinaryError('Las cuotas ejecutadas deben estar entre 0 y el número de cuotas.'); return }
    const specificConfiguration = usesSpecificExtraordinaryConfiguration()
    const normalizedValue = extraordinaryDraft.value.replace(',', '.')
    if (specificConfiguration && extraordinaryDraft.valueMode !== 'NA' && (!/^\d+(?:\.\d{1,6})?$/.test(normalizedValue) || Number(normalizedValue) < 0)) { setExtraordinaryError(extraordinaryDraft.valueMode === 'MT2' ? 'El valor por Mt2 debe tener máximo 6 decimales.' : 'Ingresa un valor fijo válido con máximo 6 decimales.'); return }
    if (specificConfiguration && !extraordinaryDraft.divisionKeys.length) { setExtraordinaryError('Selecciona al menos una División para esta extraordinaria.'); return }
    if (specificConfiguration && extraordinaryDraft.divisionKeys.some(key => !divisions.some(division => division.key === key))) { setExtraordinaryError('Una División seleccionada ya no existe.'); return }
    if (specificConfiguration && !extraordinaryDraft.sectionIds.length) { setExtraordinaryError('Selecciona al menos una Sección para esta extraordinaria.'); return }
    if (specificConfiguration && extraordinaryDraft.sectionIds.some(id => !sections.some(section => section.id === id))) { setExtraordinaryError('Una Sección seleccionada ya no existe.'); return }
    const entry: ExtraordinaryHistory = { id: editingExtraordinaryId ?? crypto.randomUUID(), detail: extraordinaryDraft.detail.trim(), startMonth: extraordinaryDraft.startMonth, installments, executedInstallments, state: extraordinaryDraft.state, ...(specificConfiguration ? { valueMode: extraordinaryDraft.valueMode, value: extraordinaryDraft.valueMode === 'NA' ? '' : Number(normalizedValue).toFixed(6).replace(/0+$/, '').replace(/\.$/, ''), divisionKeys: [...extraordinaryDraft.divisionKeys], sectionIds: [...extraordinaryDraft.sectionIds] } : {}) }
    setDraft(current => ({ ...current, extraordinaryHistory: editingExtraordinaryId ? current.extraordinaryHistory.map(item => item.id === editingExtraordinaryId ? entry : item) : [entry, ...current.extraordinaryHistory] }))
    setExtraordinaryForm(false); setEditingExtraordinaryId(null); setExtraordinaryError('')
  }

  return <div className="page screen-page expense-items-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header expense-items-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div><div><label className="screen-table-search"><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar rubro" aria-label="Buscar rubros" /></label><button type="button" className="primary-action" onClick={openNew}><Plus />Nuevo Rubro</button></div></section>

    <div className="expense-items-table"><table><thead><tr><th aria-label="Editar" /><th>Tipo</th><th>Descripción</th><th>Cuenta Contable</th><th>Recurrencia</th><th>Estado</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td><button type="button" className="row-action" aria-label={`Editar ${row.description}`} title={`Editar ${row.description}`} onClick={() => openEdit(row)}><Pencil /></button></td><td><span className={`expense-item-type ${row.type.toLowerCase()}`}>{row.type === 'INGRESO' ? 'Ingreso' : 'Egreso'}</span></td><td><strong>{row.description}</strong><small>{row.recurrence === 'EXTRAORDINARIA' ? `${row.extraordinaryHistory.length} ${row.extraordinaryHistory.length === 1 ? 'registro extraordinario' : 'registros extraordinarios'}` : `${row.subItems.length} ${row.subItems.length === 1 ? 'sub-rubro' : 'sub-rubros'}`}</small></td><td>{accountLabel(row.accountCode)}</td><td>{recurrenceLabels[row.recurrence]}</td><td><span className={`status s-${row.state.toLowerCase()}`}><i />{row.state === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></td></tr>)}{!filtered.length && <tr><td colSpan={6}><div className="expense-items-empty"><strong>{rows.length ? 'No hay coincidencias' : 'No existen rubros creados'}</strong><span>{rows.length ? 'Prueba con otro criterio de búsqueda.' : 'Selecciona Nuevo Rubro para registrar el primero.'}</span></div></td></tr>}</tbody></table></div>

    {formOpen && <div className="expense-item-backdrop" role="dialog" aria-modal="true" aria-label={editingId ? 'Editar rubro' : 'Nuevo rubro'}><form className="expense-item-form" onSubmit={save}><header><div><span>{editingId ? 'Modificar rubro' : 'Nuevo rubro'}</span><h2>{editingId ? draft.description : 'Crear Rubro'}</h2><small>{company.name}</small></div><button type="button" aria-label="Cerrar" onClick={closeForm}><X /></button></header><div className="expense-item-form-body">
      <div className="expense-item-form-grid">
        <div className="expense-item-first-row wide"><label><span>Tipo <b>Obligatorio</b></span><select value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value as ItemType })}><option value="INGRESO">Ingreso</option><option value="EGRESO">Egreso</option></select></label><label><span>Descripción <b>Obligatorio</b></span><input value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} maxLength={120} /></label></div>
        <div className="expense-text-builder wide"><label><span>Texto en Expensa {draft.recurrence !== 'EVENTUAL' && <b>Obligatorio</b>}</span><textarea value={draft.expenseText} onChange={event => setDraft({ ...draft, expenseText: event.target.value })} maxLength={300} rows={3} /></label><aside><span>Variables disponibles</span><button type="button" onClick={() => addExpenseVariable('SECCION')}>Sección <b>{'{SECCION}'}</b></button><button type="button" onClick={() => addExpenseVariable('DIVISION')}>División <b>{'{DIVISION}'}</b></button><button type="button" onClick={() => addExpenseVariable('MES')}>Mes <b>{'{MES}'}</b></button><button type="button" onClick={() => addExpenseVariable('ANIO')}>Año <b>{'{ANIO}'}</b></button></aside></div>
        <div className="expense-value-account wide"><fieldset className="expense-value-field"><legend>Valor <b>Obligatorio</b></legend><div><label><input type="radio" name="value-mode" checked={draft.valueMode === 'MT2'} onChange={() => setDraft({ ...draft, valueMode: 'MT2' })} />x Mt2</label><label><input type="radio" name="value-mode" checked={draft.valueMode === 'FIJO'} onChange={() => setDraft({ ...draft, valueMode: 'FIJO' })} />Fijo</label><label><input type="radio" name="value-mode" checked={draft.valueMode === 'NA'} onChange={() => setDraft({ ...draft, valueMode: 'NA', value: '' })} />N/A</label></div><input aria-label="Valor del rubro" type="number" min="0" step="0.000001" inputMode="decimal" disabled={draft.valueMode === 'NA'} value={draft.value} onChange={event => setDraft({ ...draft, value: event.target.value })} placeholder={draft.valueMode === 'MT2' ? 'Valor por Mt2' : draft.valueMode === 'FIJO' ? 'Valor fijo' : 'Se usa el valor vigente de la Sección'} /><small>{draft.valueMode === 'MT2' ? 'Valor del rubro × Área Útil. Máximo 6 decimales.' : draft.valueMode === 'FIJO' ? 'Valor directo por inmueble. Máximo 6 decimales.' : 'Valor vigente de la Sección × Área Útil.'}</small></fieldset><label><span>Cuenta Contable <b>Obligatorio</b></span><input list="expense-account-options" value={draft.accountCode} onChange={event => setDraft({ ...draft, accountCode: event.target.value })} placeholder="Escribe código o selecciona una cuenta" /><datalist id="expense-account-options">{accounts.map(account => <option key={account.Codigo} value={account.Codigo}>{account['Descripción']} · {account.Estado}</option>)}</datalist><small>{draft.accountCode ? accountLabel(draft.accountCode) : accounts.length ? 'Escribe para filtrar el Plan Contable.' : 'Primero crea o procesa el Plan Contable.'}</small></label></div>
        <div className="expense-recurrence-row wide"><label><span>Recurrencia <b>Obligatorio</b></span><select value={draft.recurrence} onChange={event => { setDraft({ ...draft, recurrence: event.target.value as Recurrence }); setSubForm(false); setExtraordinaryForm(false) }}><option value="NORMAL">Normal</option><option value="EVENTUAL">Eventual</option><option value="EXTRAORDINARIA">Extraordinaria</option></select></label><div className="expense-state-field"><span>Estado</span><label><input type="checkbox" checked={draft.state === 'ACTIVO'} onChange={event => setDraft({ ...draft, state: event.target.checked ? 'ACTIVO' : 'INACTIVO' })} /><i /><b>{draft.state === 'ACTIVO' ? 'Activo' : 'Inactivo'}</b></label></div></div>
        <div className="expense-dual-grid wide"><DualListBox title="División" required={draft.recurrence !== 'EVENTUAL'} options={divisions.map(item => ({ value: item.key, label: item.label }))} selected={draft.divisionKeys} onChange={divisionKeys => setDraft(current => ({ ...current, divisionKeys }))} emptyText="Configura primero la Definición de Estructura." /><DualListBox title="Sección" required={draft.recurrence !== 'EVENTUAL'} options={sections.map(item => ({ value: item.id, label: `${item.description}${item.state === 'INACTIVO' ? ' (Inactivo)' : ''}` }))} selected={draft.sectionIds} onChange={sectionIds => setDraft(current => ({ ...current, sectionIds }))} emptyText="Configura primero las secciones." /></div>
      </div>

      {draft.recurrence !== 'EXTRAORDINARIA' ? <section className="expense-subitems"><header><div><h3>Sub-rubros</h3><span>Conceptos contenidos dentro del rubro principal.</span></div><button type="button" className="quiet-button" onClick={() => openSub()}><Plus />Nuevo Sub-rubro</button></header>{subForm && <div className="expense-subitem-editor"><label><span>Descripción</span><input value={subDescription} onChange={event => { setSubDescription(event.target.value); setSubError('') }} /></label><label><span>Cuenta Contable</span><input list="expense-sub-account-options" value={subAccount} onChange={event => { setSubAccount(event.target.value); setSubError('') }} placeholder="Escribe para filtrar" /><datalist id="expense-sub-account-options">{accounts.map(account => <option key={account.Codigo} value={account.Codigo}>{account['Descripción']}</option>)}</datalist></label><div><button type="button" className="quiet-button" onClick={() => setSubForm(false)}>Cancelar</button><button type="button" className="primary-action" onClick={saveSub}>Guardar Sub-rubro</button></div>{subError && <p><AlertTriangle />{subError}</p>}</div>}<div className="expense-subitems-table"><table><thead><tr><th aria-label="Editar" /><th>Descripción</th><th>Cuenta Contable</th><th aria-label="Eliminar" /></tr></thead><tbody>{draft.subItems.map(sub => <tr key={sub.id}><td><button type="button" className="row-action" aria-label={`Editar sub-rubro ${sub.description}`} onClick={() => openSub(sub)}><Pencil /></button></td><td>{sub.description}</td><td>{accountLabel(sub.accountCode)}</td><td><button type="button" className="expense-subitem-delete" aria-label={`Eliminar sub-rubro ${sub.description}`} onClick={() => setDraft(current => ({ ...current, subItems: current.subItems.filter(item => item.id !== sub.id) }))}><Trash2 /></button></td></tr>)}{!draft.subItems.length && <tr><td colSpan={4}>No existen sub-rubros registrados.</td></tr>}</tbody></table></div></section> :
      <section className="expense-subitems expense-extraordinary-history">
        <header><div><h3>Histórico Extraordinarias</h3><span>Planificación y avance de cuotas extraordinarias.</span></div><button type="button" className="quiet-button" onClick={() => openExtraordinary()}><Plus />Nuevo registro</button></header>
        {extraordinaryForm && <>
          <div className="expense-extraordinary-editor">
            <label><span>Detalle</span><input value={extraordinaryDraft.detail} onChange={event => { setExtraordinaryDraft({ ...extraordinaryDraft, detail: event.target.value }); setExtraordinaryError('') }} /></label>
            <label><span>Fecha Inicio</span><input inputMode="numeric" placeholder="MM/AAAA" maxLength={7} value={extraordinaryDraft.startMonth} onChange={event => { setExtraordinaryDraft({ ...extraordinaryDraft, startMonth: event.target.value }); setExtraordinaryError('') }} /></label>
            <label><span># De Cuotas</span><input type="number" min="1" step="1" value={extraordinaryDraft.installments} onChange={event => { setExtraordinaryDraft({ ...extraordinaryDraft, installments: event.target.value }); setExtraordinaryError('') }} /></label>
            <label><span>Cuotas Ejecutadas</span><input type="number" min="0" step="1" value={extraordinaryDraft.executedInstallments} onChange={event => { setExtraordinaryDraft({ ...extraordinaryDraft, executedInstallments: event.target.value }); setExtraordinaryError('') }} /></label>
            {showExtraordinaryConfiguration && <><label><span>Valor</span><select value={extraordinaryDraft.valueMode} onChange={event => setExtraordinaryDraft({ ...extraordinaryDraft, valueMode: event.target.value as ValueMode, value: event.target.value === 'NA' ? '' : extraordinaryDraft.value })}><option value="MT2">x Mt2</option><option value="FIJO">Fijo</option><option value="NA">N/A</option></select></label><label><span>#</span><input aria-label="Valor extraordinaria" type="number" min="0" step="0.000001" inputMode="decimal" disabled={extraordinaryDraft.valueMode === 'NA'} value={extraordinaryDraft.value} onChange={event => { setExtraordinaryDraft({ ...extraordinaryDraft, value: event.target.value }); setExtraordinaryError('') }} /></label></>}
            <label><span>Estado</span><select value={extraordinaryDraft.state} onChange={event => setExtraordinaryDraft({ ...extraordinaryDraft, state: event.target.value as State })}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label>
            <div><button type="button" className="quiet-button" onClick={() => setExtraordinaryForm(false)}>Cancelar</button><button type="button" className="primary-action" onClick={saveExtraordinary}>Guardar</button></div>
            {extraordinaryError && <p><AlertTriangle />{extraordinaryError}</p>}
          </div>
          {showExtraordinaryConfiguration ? <div className="expense-extraordinary-scope"><DualListBox title="División" required options={divisions.map(item => ({ value: item.key, label: item.label }))} selected={extraordinaryDraft.divisionKeys} onChange={divisionKeys => setExtraordinaryDraft(current => ({ ...current, divisionKeys }))} emptyText="Configura primero la Definición de Estructura." /><DualListBox title="Sección" required options={sections.map(item => ({ value: item.id, label: `${item.description}${item.state === 'INACTIVO' ? ' (Inactivo)' : ''}` }))} selected={extraordinaryDraft.sectionIds} onChange={sectionIds => setExtraordinaryDraft(current => ({ ...current, sectionIds }))} emptyText="Configura primero las secciones." /></div> : <div className="expense-extraordinary-inherited">Se utilizarán el Valor, la División y la Sección configurados en la parte superior mientras exista una sola extraordinaria activa.</div>}
        </>}
        <div className="expense-subitems-table"><table><thead><tr><th aria-label="Editar" /><th>Detalle</th><th>Fecha Inicio</th><th># De Cuotas</th><th>Cuotas Ejecutadas</th>{showExtraordinaryConfiguration && <><th>Valor</th><th>#</th><th>División</th><th>Sección</th></>}<th>Estado</th></tr></thead><tbody>{draft.extraordinaryHistory.map(entry => <tr key={entry.id}><td><button type="button" className="row-action" aria-label={`Editar extraordinaria ${entry.detail}`} onClick={() => openExtraordinary(entry)}><Pencil /></button></td><td>{entry.detail}</td><td>{entry.startMonth}</td><td>{entry.installments}</td><td>{entry.executedInstallments}</td>{showExtraordinaryConfiguration && <><td>{extraordinaryModeLabel(entry)}</td><td>{extraordinaryValueLabel(entry)}</td><td>{extraordinaryDivisionLabel(entry)}</td><td>{extraordinarySectionLabel(entry)}</td></>}<td><span className={`status s-${entry.state.toLowerCase()}`}><i />{entry.state === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></td></tr>)}{!draft.extraordinaryHistory.length && <tr><td colSpan={showExtraordinaryConfiguration ? 10 : 6}>No existen extraordinarias registradas.</td></tr>}</tbody></table></div>
      </section>}
      {error && <div className="expense-item-error" role="alert"><AlertTriangle />{error}</div>}
    </div><footer><button type="button" className="quiet-button" onClick={closeForm}>Cancelar</button><button type="submit" className="primary-action">{editingId ? 'Guardar Cambios' : 'Crear Rubro'}</button></footer></form></div>}
  </div>
}

function DualListBox({ title, required, options, selected, onChange, emptyText }: { title: string; required: boolean; options: Array<{ value: string; label: string }>; selected: string[]; onChange: (values: string[]) => void; emptyText: string }) {
  const [availableSelection, setAvailableSelection] = useState<string[]>([])
  const [chosenSelection, setChosenSelection] = useState<string[]>([])
  const available = options.filter(option => !selected.includes(option.value))
  const chosen = selected.map(value => options.find(option => option.value === value)).filter((option): option is { value: string; label: string } => Boolean(option))
  const readSelection = (event: ChangeEvent<HTMLSelectElement>) => Array.from(event.target.selectedOptions, option => option.value)
  const addSelected = () => { onChange([...selected, ...availableSelection.filter(value => !selected.includes(value))]); setAvailableSelection([]) }
  const removeSelected = () => { onChange(selected.filter(value => !chosenSelection.includes(value))); setChosenSelection([]) }
  return <fieldset className="expense-dual-list"><legend>{title} {required && <b>Obligatorio</b>}</legend><div className="expense-dual-list-body"><label><span>Disponibles</span><select multiple value={availableSelection} onChange={event => setAvailableSelection(readSelection(event))}>{available.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><div className="expense-dual-actions"><button type="button" onClick={addSelected} disabled={!availableSelection.length} aria-label={`Agregar ${title}`}><ChevronRight /></button><button type="button" onClick={() => onChange(options.map(option => option.value))} disabled={!available.length} aria-label={`Agregar todas las opciones de ${title}`}><ChevronsRight /></button><button type="button" onClick={removeSelected} disabled={!chosenSelection.length} aria-label={`Quitar ${title}`}><ChevronLeft /></button><button type="button" onClick={() => onChange([])} disabled={!selected.length} aria-label={`Quitar todas las opciones de ${title}`}><ChevronsLeft /></button></div><label><span>Seleccionadas</span><select multiple value={chosenSelection} onChange={event => setChosenSelection(readSelection(event))}>{chosen.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>{!options.length && <small>{emptyText}</small>}</fieldset>
}
