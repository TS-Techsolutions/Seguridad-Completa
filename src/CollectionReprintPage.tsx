import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Printer, ReceiptText } from 'lucide-react'
import { api } from './api'
import { readAuthorizedCollections } from './collection-records'
import { SearchableDatalistInput } from './SearchableDatalistInput'
import type { CustomerRow } from './CustomerRegistryPage'
import type { Context, ScreenSpec } from './types'

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim()
}

function readCustomers() {
  try {
    const value = JSON.parse(localStorage.getItem('saga.customers') ?? '[]')
    return (Array.isArray(value) ? value as CustomerRow[] : [])
      .sort((left, right) => left.businessName.localeCompare(right.businessName, 'es'))
  } catch {
    return []
  }
}

function customerLabel(customer: CustomerRow) {
  return `${customer.identification} · ${customer.businessName}`
}

function displayCollectionNumber(value: string) {
  return value.replace(/^REC-/i, '')
}

function money(value: number) {
  return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

export function CollectionReprintPage({ screen }: { screen: ScreenSpec }) {
  const context = useQuery({ queryKey: ['context'], queryFn: api.context })
  if (!context.data) return null
  return <CollectionReprintManager screen={screen} context={context.data} />
}

function CollectionReprintManager({ screen, context }: { screen: ScreenSpec; context: Context }) {
  const customers = useMemo(readCustomers, [])
  const collections = useMemo(() => readAuthorizedCollections(context.company.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt)), [context.company.id])
  const [customerInput, setCustomerInput] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [collectionInput, setCollectionInput] = useState('')
  const [collectionId, setCollectionId] = useState('')
  const [message, setMessage] = useState('')
  const selectedCustomer = customers.find(customer => customer.id === customerId)
  const customerCollections = collections.filter(collection => collection.customerId === customerId
    || (selectedCustomer && normalize(collection.customerName) === normalize(selectedCustomer.businessName)))

  const selectCustomer = (value: string) => {
    setCustomerInput(value)
    const match = customers.find(customer => normalize(customerLabel(customer)) === normalize(value))
    setCustomerId(match?.id ?? '')
    setCollectionInput('')
    setCollectionId('')
    setMessage('')
  }

  const selectCollection = (value: string) => {
    setCollectionInput(value)
    const match = customerCollections.find(collection => displayCollectionNumber(collection.number) === value.trim())
    setCollectionId(match?.id ?? '')
    setMessage('')
  }

  const printCollection = () => {
    if (!collectionId) {
      setMessage('Selecciona una recaudación para imprimir.')
      return
    }
    window.open(`/vista-previa/recaudaciones/${encodeURIComponent(collectionId)}`, '_blank', 'noopener,noreferrer')
  }

  return <div className="page screen-page collection-reprint-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 && <ChevronRight />}</span>)}</div>
    <section className="screen-header collection-reprint-header"><div><div className="screen-id"><span>{screen.id}</span><b>Cuentas por Cobrar</b></div><h1>{screen.titulo_original}</h1></div></section>

    <section className="panel collection-reprint-panel" aria-label="Selección de recaudación">
      <header><ReceiptText /><div><h2>Comprobante de Recaudación</h2><p>Selecciona el cliente y la recaudación que deseas volver a imprimir.</p></div></header>
      <div className="collection-reprint-fields">
        <label><span>Cliente</span><SearchableDatalistInput list="collection-reprint-customers" value={customerInput} onChange={event => selectCustomer(event.target.value)} onClear={() => selectCustomer('')} clearLabel="Borrar cliente" placeholder="Escribe para filtrar clientes" autoComplete="off" /></label>
        <datalist id="collection-reprint-customers">{customers.map(customer => <option key={customer.id} value={customerLabel(customer)} />)}</datalist>
        <label><span># Recaudación</span><SearchableDatalistInput list="collection-reprint-numbers" value={collectionInput} disabled={!customerId} onChange={event => selectCollection(event.target.value)} onClear={() => selectCollection('')} clearLabel="Borrar recaudación" placeholder={customerId ? 'Escribe o despliega las recaudaciones' : 'Primero selecciona el cliente'} autoComplete="off" /></label>
        <datalist id="collection-reprint-numbers">{customerCollections.map(collection => <option key={collection.id} value={displayCollectionNumber(collection.number)} label={`${collection.issueDate} · ${money(collection.total)}`} />)}</datalist>
        <button type="button" className="primary-action collection-reprint-button" disabled={!collectionId} onClick={printCollection}><Printer />Imprimir</button>
      </div>
      {customerId && !customerCollections.length && <div className="collection-reprint-notice">El cliente seleccionado no tiene recaudaciones generadas.</div>}
      {message && <div className="collection-reprint-error" role="alert">{message}</div>}
    </section>
  </div>
}
