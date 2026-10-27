import type { Catalog, Context, Overview, RecordItem } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { ...init, headers: { 'Content-Type':'application/json', ...(init?.headers ?? {}) } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error?.message ?? 'No se pudo completar la operación.')
  return body.data as T
}

export const api = {
  catalog: () => request<Catalog>('/catalog'),
  context: () => request<Context>('/context'),
  overview: () => request<Overview>('/overview'),
  records: (screenId:string) => request<RecordItem[]>(`/screens/${screenId}/records`),
  createRecord: (screenId:string, values:Record<string,string>) => request<RecordItem>(`/screens/${screenId}/records`, { method:'POST', body:JSON.stringify({values}), headers:{'Idempotency-Key':crypto.randomUUID()} }),
  action: (screenId:string, recordId:string, action:string) => request<RecordItem>(`/screens/${screenId}/records/${recordId}/actions/${encodeURIComponent(action)}`, { method:'POST', body:JSON.stringify({reason:'Validación funcional desde la interfaz'}) }),
  updateModule: (state:string) => request<{code:string;state:string}>('/modules/PROPERTY_MANAGEMENT', {method:'PUT',body:JSON.stringify({state,reason:'Prueba de configuración por empresa'})}),
}
