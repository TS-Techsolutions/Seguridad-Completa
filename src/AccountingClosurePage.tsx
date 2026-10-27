import { useState } from 'react'
import { ChevronRight, Pencil, Plus } from 'lucide-react'
import type { ScreenSpec } from './types'

export type ClosureState = 'ABIERTO' | 'MAYORIZADO' | 'CERRADO'

export type ClosureRow = {
  id: string
  periodo: string
  fase: string
  control: string
  resultado: string
  diferencia: string
  aprobador: string
  estado: ClosureState
  ultimoEvento: string
}

export const accountingClosureStorageKey = 'saga.accounting.closures'
export const initialAccountingClosures: ClosureRow[] = [
  {
    id: 'CIE-2026-10',
    periodo: '2026-10',
    fase: 'Preparación',
    control: 'Checklist pendiente',
    resultado: 'Pendiente',
    diferencia: '$ 0,00',
    aprobador: 'Andrea López',
    estado: 'ABIERTO',
    ultimoEvento: '26/10/2026',
  },
  {
    id: 'CIE-2026-09',
    periodo: '2026-09',
    fase: 'Cierre',
    control: 'Checklist completo',
    resultado: 'Aprobado',
    diferencia: '$ 0,00',
    aprobador: 'Carlos Mena',
    estado: 'CERRADO',
    ultimoEvento: '01/10/2026',
  },
]

const closureStateLabels: Record<ClosureState, string> = {
  ABIERTO: 'Abierto',
  MAYORIZADO: 'Mayorizado',
  CERRADO: 'Cerrado',
}

function normalizeClosureState(value: unknown): ClosureState {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (['MAYORIZADO', 'READY_TO_CLOSE', 'LISTO PARA CERRAR', 'CHECKING'].includes(normalized)) return 'MAYORIZADO'
  if (['CERRADO', 'CLOSED'].includes(normalized)) return 'CERRADO'
  return 'ABIERTO'
}

export function readAccountingClosures() {
  try {
    const saved = JSON.parse(localStorage.getItem(accountingClosureStorageKey) ?? 'null')
    return Array.isArray(saved)
      ? saved.map((row: ClosureRow) => ({ ...row, estado: normalizeClosureState(row.estado) }))
      : initialAccountingClosures
  } catch {
    return initialAccountingClosures
  }
}

export function AccountingClosurePage({ screen }: { screen: ScreenSpec }) {
  const [rows, setRows] = useState<ClosureRow[]>(readAccountingClosures)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingState, setEditingState] = useState<ClosureState>('ABIERTO')

  const beginEdit = (row: ClosureRow) => {
    setEditingId(row.id)
    setEditingState(row.estado)
  }

  const saveState = () => {
    if (!editingId) return
    const next = rows.map(row => row.id === editingId
      ? { ...row, estado: editingState, ultimoEvento: new Date().toLocaleDateString('es-EC') }
      : row)
    setRows(next)
    localStorage.setItem(accountingClosureStorageKey, JSON.stringify(next))
    setEditingId(null)
  }

  const createClosure = () => {
    if (rows.some(row => row.periodo === '2026-11')) return
    const next: ClosureRow[] = [{
      id: crypto.randomUUID(),
      periodo: '2026-11',
      fase: 'Preparación',
      control: 'Checklist pendiente',
      resultado: 'Pendiente',
      diferencia: '$ 0,00',
      aprobador: 'Por asignar',
      estado: 'ABIERTO',
      ultimoEvento: new Date().toLocaleDateString('es-EC'),
    }, ...rows]
    setRows(next)
    localStorage.setItem(accountingClosureStorageKey, JSON.stringify(next))
  }

  return <div className="page hr-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <header className="hr-header">
      <div><span className="hr-code">{screen.id}</span><h1>{screen.titulo_original}</h1></div>
      <span className="hr-context"><i />Periodo 2026-10 abierto</span>
    </header>
    <div className="hr-stack">
      <section className="hr-panel">
        <div className="hr-panel-title">
          <div><h2>Períodos contables</h2><p>Administra la validación y el cierre de los períodos contables.</p></div>
          <button className="primary-action" type="button" onClick={createClosure}><Plus />Registrar cierre</button>
        </div>
        {editingId && <div className="closure-state-editor" role="region" aria-label="Modificar estado de cierre">
          <label>Estado de Cierre
            <select value={editingState} onChange={event => setEditingState(event.target.value as ClosureState)}>
              <option value="ABIERTO">Abierto</option>
              <option value="MAYORIZADO">Mayorizado</option>
              <option value="CERRADO">Cerrado</option>
            </select>
          </label>
          <div className="closure-state-actions">
            <button type="button" className="secondary-action" onClick={() => setEditingId(null)}>Cancelar</button>
            <button type="button" className="primary-action" onClick={saveState}>Guardar estado</button>
          </div>
        </div>}
        <div className="hr-table">
          <table>
            <thead><tr><th aria-label="Editar" /><th>Periodo</th><th>Fase</th><th>Control</th><th>Resultado</th><th>Diferencia</th><th>Aprobador</th><th>Estado cierre</th><th>Último evento</th></tr></thead>
            <tbody>{rows.map((row, index) => <tr key={row.id}>
              <td><button type="button" title="Editar" aria-label={`Editar cierre ${index + 1}`} onClick={() => beginEdit(row)}><Pencil /></button></td>
              <td>{row.periodo}</td><td>{row.fase}</td><td>{row.control}</td><td>{row.resultado}</td><td>{row.diferencia}</td><td>{row.aprobador}</td><td><span className={`closure-state closure-state--${row.estado.toLowerCase()}`}>{closureStateLabels[row.estado]}</span></td><td>{row.ultimoEvento}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
}
