import { cleanPhoneProperties } from './phone-values'
import { cleanStructuredNameProperties } from './text-values'

type PendingState = { entries: Record<string, string>; removed: string[] }
type ServerState = { entries: Record<string, { value: string; version: number; updatedAt: string }>; scope?:'COMPANY'|'GROUP_SECURITY_ADMIN'; allowedKeys?:string[] }

const pendingKey = 'saga.sync.pending'
const activeCompanyKey = 'saga.activeCompanyId'
const loadedCompanyKey = 'saga.loadedCompanyId'
const localOnlyKeys = new Set([
  pendingKey,
  activeCompanyKey,
  loadedCompanyKey,
  'saga.workspaceTabs',
  'saga.favoriteScreens',
  'saga.currentUser.passwordChangedAt',
])

const storagePrototype = Storage.prototype
const nativeGetItem = storagePrototype.getItem
const nativeSetItem = storagePrototype.setItem
const nativeRemoveItem = storagePrototype.removeItem
let pending: PendingState = { entries: {}, removed: [] }
let flushTimer = 0
let flushing = false
let installed = false

const shouldPersist = (key: string) => key.startsWith('saga.') && !localOnlyKeys.has(key)

function contextHeaders(): Record<string, string> {
  return {
    'X-Company-Id': nativeGetItem.call(localStorage, activeCompanyKey) ?? 'cmp-demo-ecuador',
  }
}

function safeCompanyValue(value: string): string {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    if (parsed && typeof parsed === 'object') delete parsed.smtpPassword
    return JSON.stringify(parsed)
  } catch {
    return value
  }
}

function valueForServer(key: string, value: string): string {
  return key === 'saga.security.company' ? safeCompanyValue(value) : value
}

function mergeServerValue(key: string, serverValue: string): string {
  if (key !== 'saga.security.company') return serverValue
  try {
    const local = JSON.parse(nativeGetItem.call(localStorage, key) ?? '{}') as Record<string, unknown>
    const remote = JSON.parse(serverValue) as Record<string, unknown>
    return JSON.stringify({ ...remote, ...(local.smtpPassword ? { smtpPassword: local.smtpPassword } : {}) })
  } catch {
    return serverValue
  }
}

function readPending(): PendingState {
  try {
    const value = JSON.parse(nativeGetItem.call(localStorage, pendingKey) ?? 'null') as PendingState | null
    return value && value.entries && Array.isArray(value.removed) ? value : { entries: {}, removed: [] }
  } catch {
    return { entries: {}, removed: [] }
  }
}

function rememberPending() {
  nativeSetItem.call(localStorage, pendingKey, JSON.stringify(pending))
}

function hasPending() {
  return Object.keys(pending.entries).length > 0 || pending.removed.length > 0
}

async function sendBatch(batch: PendingState): Promise<boolean> {
  const response = await fetch('/api/v1/state', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...contextHeaders() },
    body: JSON.stringify(batch),
  })
  return response.ok
}

async function flushPending() {
  if (flushing || !hasPending()) return
  flushing = true
  const snapshot: PendingState = { entries: { ...pending.entries }, removed: [...pending.removed] }
  try {
    if (!await sendBatch(snapshot)) return
    for (const [key, value] of Object.entries(snapshot.entries)) {
      if (pending.entries[key] === value) delete pending.entries[key]
    }
    pending.removed = pending.removed.filter(key => !snapshot.removed.includes(key))
    rememberPending()
  } catch {
    // La cola queda en el navegador y se reintenta al iniciar o en el próximo cambio.
  } finally {
    flushing = false
    if (hasPending()) scheduleFlush()
  }
}

function scheduleFlush() {
  window.clearTimeout(flushTimer)
  flushTimer = window.setTimeout(() => void flushPending(), 250)
}

function queueEntry(key: string, value: string) {
  pending.entries[key] = valueForServer(key, value)
  pending.removed = pending.removed.filter(item => item !== key)
  rememberPending()
  scheduleFlush()
}

function queueRemoval(key: string) {
  delete pending.entries[key]
  if (!pending.removed.includes(key)) pending.removed.push(key)
  rememberPending()
  scheduleFlush()
}

function installStorageHooks() {
  if (installed) return
  installed = true
  storagePrototype.setItem = function (key: string, value: string) {
    nativeSetItem.call(this, key, value)
    if (this === localStorage && shouldPersist(key)) queueEntry(key, value)
  }
  storagePrototype.removeItem = function (key: string) {
    nativeRemoveItem.call(this, key)
    if (this === localStorage && shouldPersist(key)) queueRemoval(key)
  }
  window.addEventListener('online', () => void flushPending())
  window.addEventListener('beforeunload', () => {
    if (!hasPending()) return
    void fetch('/api/v1/state', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...contextHeaders() }, body: JSON.stringify(pending), keepalive: true })
  })
}

function localBusinessEntries(): Record<string, string> {
  const entries: Record<string, string> = {}
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key || !shouldPersist(key)) continue
    const value = nativeGetItem.call(localStorage, key)
    if (value !== null) entries[key] = valueForServer(key, value)
  }
  return entries
}

function sanitizePersistedPhoneValues() {
  const keys: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key && shouldPersist(key)) keys.push(key)
  }
  keys.forEach(key => {
    const saved = nativeGetItem.call(localStorage, key)
    if (!saved) return
    try {
      const cleaned = JSON.stringify(cleanStructuredNameProperties(cleanPhoneProperties(JSON.parse(saved))))
      if (cleaned !== saved) localStorage.setItem(key, cleaned)
    } catch {
      // Los valores simples no contienen estructuras de campos telefónicos.
    }
  })
}

export async function initializePersistentStorage(): Promise<void> {
  const activeCompanyId = nativeGetItem.call(localStorage, activeCompanyKey) ?? 'cmp-demo-ecuador'
  const loadedCompanyId = nativeGetItem.call(localStorage, loadedCompanyKey)
  if (loadedCompanyId && loadedCompanyId !== activeCompanyId) {
    const keysToClear: string[] = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key && shouldPersist(key)) keysToClear.push(key)
    }
    keysToClear.forEach(key => nativeRemoveItem.call(localStorage, key))
    pending = { entries: {}, removed: [] }
    nativeSetItem.call(localStorage, pendingKey, JSON.stringify(pending))
  }
  pending = readPending()
  try {
    if (hasPending() && await sendBatch(pending)) {
      pending = { entries: {}, removed: [] }
      rememberPending()
    }
    const response = await fetch('/api/v1/state', { credentials: 'same-origin', headers: contextHeaders() })
    if (!response.ok) throw new Error('Persistence service unavailable')
    const body = await response.json() as { data: ServerState }
    const remoteEntries = body.data?.entries ?? {}
    const restrictedScope = body.data?.scope === 'GROUP_SECURITY_ADMIN'
    const allowedKeys = new Set(body.data?.allowedKeys ?? [])
    if (restrictedScope) {
      const keysToClear: string[] = []
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index)
        if (key && shouldPersist(key) && !allowedKeys.has(key)) keysToClear.push(key)
      }
      keysToClear.forEach(key => nativeRemoveItem.call(localStorage, key))
      pending = { entries: {}, removed: [] }
      rememberPending()
    }
    for (const [key, record] of Object.entries(remoteEntries)) {
      if (shouldPersist(key)) nativeSetItem.call(localStorage, key, mergeServerValue(key, record.value))
    }
    const missing = restrictedScope ? {} : Object.fromEntries(
      Object.entries(localBusinessEntries()).filter(([key]) => !(key in remoteEntries)),
    )
    if (Object.keys(missing).length > 0) await sendBatch({ entries: missing, removed: [] })
  } catch {
    // El prototipo continúa operativo con la copia local y sincronizará al reconectarse.
  } finally {
    nativeSetItem.call(localStorage, loadedCompanyKey, activeCompanyId)
    pending = readPending()
    installStorageHooks()
    sanitizePersistedPhoneValues()
    if (hasPending()) scheduleFlush()
  }
}
