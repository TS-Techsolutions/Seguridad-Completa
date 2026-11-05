import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpenCheck, ChevronRight, Search } from 'lucide-react'
import { api } from './api'
import { accountingVoucherStorageKey, voucherTypeLabels } from './AccountingVoucherPage'
import type { Context, ScreenSpec } from './types'

export type VoucherTypeCatalogRow = {
  code: string
  name: string
  description: string
  origin: 'MANUAL' | 'AUTOMÁTICO'
  state: 'ACTIVO'
}

export const standardVoucherTypes: VoucherTypeCatalogRow[] = [
  { code: 'ASIENTO_INICIAL', name: 'Asiento Inicial', description: 'Registro de saldos de apertura de la compañía.', origin: 'MANUAL', state: 'ACTIVO' },
  { code: 'DIARIO', name: 'Diario', description: 'Registro contable general ingresado manualmente.', origin: 'MANUAL', state: 'ACTIVO' },
  { code: 'INGRESO', name: 'Ingreso', description: 'Registro manual de movimientos contables de ingreso.', origin: 'MANUAL', state: 'ACTIVO' },
  { code: 'EGRESO', name: 'Egreso', description: 'Registro manual de movimientos contables de egreso.', origin: 'MANUAL', state: 'ACTIVO' },
  { code: 'AJUSTE', name: 'Ajuste', description: 'Correcciones y reclasificaciones contables autorizadas.', origin: 'MANUAL', state: 'ACTIVO' },
  { code: 'EXPENSA', name: 'Expensa', description: 'Asiento generado al autorizar una expensa.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'RECAUDACION', name: 'Recaudación', description: 'Asiento generado al autorizar una recaudación.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'DEPOSITO', name: 'Depósito', description: 'Asiento generado al autorizar un depósito bancario.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'ANULACION_COMP_CONTABLE', name: 'Anulación Comprobante Contable', description: 'Asiento reverso generado al anular un comprobante contable autorizado.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'ANULACION_DEPOSITO', name: 'Anulación Depósito', description: 'Asiento de reverso generado al completar una anulación de depósito.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'ANULACION_RECAUDACION', name: 'Anulación Recaudación', description: 'Asiento de reverso generado al completar una anulación de recaudación.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'CRUCE_ANTICIPO_CLIENTE', name: 'Cruce Anticipo Cliente', description: 'Asiento generado al aplicar anticipos disponibles contra cartera pendiente del cliente.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'ANULACION_CRUCE_ANTICIPO_CLIENTE', name: 'Anulación Cruce de Anticipo Clientes', description: 'Asiento de reverso generado al anular un cruce de anticipos contra cartera.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'COMPRA_EMPLEADOS', name: 'Compra – Empleados', description: 'Asiento generado por un egreso destinado al pago de empleados.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'COMPRA_CAJA_CHICA', name: 'Compra – Caja Chica', description: 'Asiento generado por un egreso destinado a Caja Chica.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'COMPRA_DEVOLUCION_CLIENTE', name: 'Compra – Devolución Cliente', description: 'Asiento generado por un egreso correspondiente a una devolución a clientes.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'COMPRA_PROVEEDORES', name: 'Compra – Proveedores', description: 'Asiento generado por un egreso destinado al pago de proveedores.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'ANULACION_EGRESO_EFECTIVO', name: 'Anulación Egreso – Efectivo', description: 'Reverso de un egreso emitido mediante efectivo.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'ANULACION_EGRESO_CHEQUE', name: 'Anulación Egreso – Cheque', description: 'Reverso de un egreso emitido mediante cheque.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'ANULACION_EGRESO_DEBITO', name: 'Anulación Egreso – Débito', description: 'Reverso de un egreso emitido mediante débito.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'ANULACION_EGRESO_TARJETA_CREDITO', name: 'Anulación Egreso – Tarjeta de Crédito', description: 'Reverso de un egreso emitido mediante tarjeta de crédito.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'ANULACION_EGRESO_TRANSFERENCIA', name: 'Anulación Egreso – Transferencia', description: 'Reverso de un egreso emitido mediante transferencia bancaria.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
  { code: 'AJUSTE_CARTERA', name: 'Ajuste de Cartera', description: 'Asiento generado al autorizar un ajuste de cartera de clientes o proveedores.', origin: 'AUTOMÁTICO', state: 'ACTIVO' },
]

function displayUnknownType(code: string) {
  return code.toLocaleLowerCase('es').split('_').filter(Boolean)
    .map(word => word.charAt(0).toLocaleUpperCase('es') + word.slice(1)).join(' ')
}

export function readVoucherTypes(companyId: string) {
  let discoveredCodes: string[] = []
  try {
    const value = JSON.parse(localStorage.getItem(accountingVoucherStorageKey(companyId)) ?? '[]')
    discoveredCodes = Array.isArray(value)
      ? value.map(record => String((record as { type?: unknown }).type ?? '').trim().toLocaleUpperCase('es')).filter(Boolean)
      : []
  } catch {
    discoveredCodes = []
  }
  const known = new Set(standardVoucherTypes.map(type => type.code))
  const discovered = Array.from(new Set(discoveredCodes)).filter(code => !known.has(code)).map(code => ({
    code,
    name: (voucherTypeLabels as Record<string, string>)[code] ?? displayUnknownType(code),
    description: 'Tipo incorporado por un proceso contable del sistema.',
    origin: 'AUTOMÁTICO' as const,
    state: 'ACTIVO' as const,
  }))
  return [...standardVoucherTypes, ...discovered].sort((left, right) => left.name.localeCompare(right.name, 'es'))
}

export function AccountingVoucherTypesPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <AccountingVoucherTypesManager screen={screen} context={context.data} />
}

function AccountingVoucherTypesManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const [search, setSearch] = useState('')
  const rows = useMemo(() => readVoucherTypes(context.company.id), [context.company.id])
  const normalizedSearch = search.trim().toLocaleLowerCase('es')
  const filtered = rows.filter(row => !normalizedSearch || Object.values(row).join(' ').toLocaleLowerCase('es').includes(normalizedSearch))

  return <div className="page screen-page voucher-types-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header voucher-types-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div><label className="screen-table-search"><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar en todos los tipos" aria-label="Buscar tipos de comprobantes contables" /></label></section>
    <section className="panel voucher-types-list">
      <header><div><BookOpenCheck /><span><h2>Tipos de Comprobantes Contables</h2><p>Catálogo de tipos manuales y automáticos utilizados por los procesos del sistema.</p></span></div><strong>{filtered.length}<small>{filtered.length === 1 ? 'tipo' : 'tipos'}</small></strong></header>
      <div className="voucher-types-table"><table><thead><tr><th>Código</th><th>Tipo de Comprobante</th><th>Descripción</th><th>Origen</th><th>Estado</th></tr></thead><tbody>{filtered.map(row => <tr key={row.code}><td><code>{row.code}</code></td><td><strong>{row.name}</strong></td><td>{row.description}</td><td><span className={`voucher-type-origin ${row.origin.toLocaleLowerCase('es').replace('á', 'a')}`}>{row.origin === 'AUTOMÁTICO' ? 'Automático' : 'Manual'}</span></td><td><span className="status s-activo"><i />Activo</span></td></tr>)}{!filtered.length && <tr><td colSpan={5}><div className="voucher-types-empty"><Search /><strong>No existen coincidencias</strong><span>Prueba con otro criterio de búsqueda.</span></div></td></tr>}</tbody></table></div>
    </section>
  </div>
}
