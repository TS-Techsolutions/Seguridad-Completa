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
  if (response.status === 401) window.dispatchEvent(new CustomEvent('saga:session-expired'))
  if (!response.ok) throw new Error(body.error?.message ?? body.detail?.message ?? (typeof body.detail==='string'?body.detail:undefined) ?? 'No se pudo completar la operación.')
  return body.data as T
}

export const api = {
  sessionStatus: () => request<{authenticated:boolean;actor?:{id:string;username:string;name:string;email:string;role:string}|null}>('/session/status'),
  sessionLogin: (identifier:string,password:string) => request<{authenticated:boolean;actor:{id:string;username:string;name:string;email:string;role:string}}>('/session/login', {method:'POST',body:JSON.stringify({identifier,password})}),
  sessionLogout: () => request<{authenticated:boolean}>('/session/logout', {method:'POST'}),
  sessionKeepAlive: () => request<{authenticated:boolean}>('/session/keepalive', {method:'POST'}),
  changePassword: (currentPassword:string,newPassword:string) => request<{updated:boolean}>('/session/password', {method:'PUT',body:JSON.stringify({current_password:currentPassword,new_password:newPassword})}),
  requestPasswordRecovery: (identifier:string) => request<{recoveryId:string;maskedEmail:string;expiresInSeconds:number;deliveryMode:'EMAIL'|'VALIDATION';previewCode?:string}>('/session/password-recovery/request', {method:'POST',body:JSON.stringify({identifier})}),
  confirmPasswordRecovery: (recoveryId:string,code:string,newPassword:string) => request<{updated:boolean;name:string}>('/session/password-recovery/confirm', {method:'POST',body:JSON.stringify({recovery_id:recoveryId,code,new_password:newPassword})}),
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
