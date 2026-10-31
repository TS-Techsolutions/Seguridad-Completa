import type { Catalog, Context, Overview, PlatformCompany, PlatformCompanyCreate, PlatformCompanyGroup, PlatformCompanyGroupCreate, RecordItem } from './types'

export const activeCompanyStorageKey = 'saga.activeCompanyId'

function contextHeaders() {
  return {
    'X-Company-Id': localStorage.getItem(activeCompanyStorageKey) ?? 'cmp-demo-ecuador',
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { ...init, credentials:'same-origin', headers: { 'Content-Type':'application/json', ...contextHeaders(), ...(init?.headers ?? {}) } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error?.message ?? 'No se pudo completar la operación.')
  return body.data as T
}

export const api = {
  catalog: () => request<Catalog>('/catalog'),
  context: async () => {
    try {
      return await request<Context>('/context')
    } catch (initialError) {
      const allowed = await request<PlatformCompany[]>('/session/companies')
      const current = localStorage.getItem(activeCompanyStorageKey)
      const target = allowed.find(company=>company.id===current) ?? allowed[0]
      if (target && target.id!==current) {
        localStorage.setItem(activeCompanyStorageKey,target.id)
        window.location.reload()
        return await new Promise<Context>(()=>undefined)
      }
      throw initialError
    }
  },
  overview: () => request<Overview>('/overview'),
  records: (screenId:string) => request<RecordItem[]>(`/screens/${screenId}/records`),
  createRecord: (screenId:string, values:Record<string,string>) => request<RecordItem>(`/screens/${screenId}/records`, { method:'POST', body:JSON.stringify({values}), headers:{'Idempotency-Key':crypto.randomUUID()} }),
  action: (screenId:string, recordId:string, action:string) => request<RecordItem>(`/screens/${screenId}/records/${recordId}/actions/${encodeURIComponent(action)}`, { method:'POST', body:JSON.stringify({reason:'Validación funcional desde la interfaz'}) }),
  updateModule: (state:string) => request<{code:string;state:string}>('/modules/PROPERTY_MANAGEMENT', {method:'PUT',body:JSON.stringify({state,reason:'Prueba de configuración por empresa'})}),
  companies: () => request<PlatformCompany[]>('/platform/companies'),
  createCompany: (values:PlatformCompanyCreate) => request<PlatformCompany>('/platform/companies', {method:'POST',body:JSON.stringify(values)}),
  updateCompanyStatus: (companyId:string,status:'ACTIVE'|'SUSPENDED') => request<PlatformCompany>(`/platform/companies/${encodeURIComponent(companyId)}/status`, {method:'PATCH',body:JSON.stringify({status})}),
  companyGroups: () => request<PlatformCompanyGroup[]>('/platform/company-groups'),
  createCompanyGroup: (values:PlatformCompanyGroupCreate) => request<PlatformCompanyGroup>('/platform/company-groups', {method:'POST',body:JSON.stringify(values)}),
}
