import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound, X } from 'lucide-react'
import { api } from './api'

export const sessionInactivityMinutes = 15
export const sessionInactivityMilliseconds = sessionInactivityMinutes * 60 * 1000

const lastActivityStorageKey = 'saga.session.lastActivity'
const sessionLockedStorageKey = 'saga.session.locked'
const sessionLockReasonStorageKey = 'saga.session.lockReason'
const sessionLogoutEvent = 'saga:session-logout'
const sessionExpiredEvent = 'saga:session-expired'
const activityPersistInterval = 2_000
const serverKeepAliveInterval = 60_000

type LockReason = 'INITIAL' | 'INACTIVITY' | 'MANUAL'
type CompanyImage = { name?: string; dataUrl?: string }
type LoginCompany = { name?: string; businessName?: string; logo?: CompanyImage; loginBackground?: CompanyImage }

function readLoginCompany(): LoginCompany {
  try { return JSON.parse(localStorage.getItem('saga.security.company') ?? '{}') as LoginCompany }
  catch { return {} }
}

function storedLastActivity() {
  const value = Number(localStorage.getItem(lastActivityStorageKey))
  return Number.isFinite(value) && value > 0 ? value : Date.now()
}

function storedLockReason(): LockReason {
  const reason = localStorage.getItem(sessionLockReasonStorageKey)
  return reason === 'MANUAL' || reason === 'INACTIVITY' ? reason : 'INITIAL'
}

function sessionStartsLocked() {
  if (localStorage.getItem(sessionLockedStorageKey) === 'true') return true
  return Date.now() - storedLastActivity() >= sessionInactivityMilliseconds
}

export function requestSessionLogout() {
  window.dispatchEvent(new CustomEvent<LockReason>(sessionLogoutEvent, { detail: 'MANUAL' }))
}

export function SessionGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [locked, setLocked] = useState(true)
  const [reason, setReason] = useState<LockReason>(storedLockReason)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [company] = useState(readLoginCompany)
  const timerRef = useRef<number | null>(null)
  const lastPersistedActivityRef = useRef(storedLastActivity())
  const lastServerKeepAliveRef = useRef(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const lockSession = useCallback((nextReason: LockReason) => {
    clearTimer()
    if (window.location.pathname !== '/login') window.history.replaceState(null, '', '/login')
    localStorage.setItem(sessionLockReasonStorageKey, nextReason)
    localStorage.setItem(sessionLockedStorageKey, 'true')
    setReason(nextReason)
    setLocked(true)
    void api.sessionLogout().catch(() => undefined)
  }, [clearTimer])

  const scheduleExpiration = useCallback((lastActivity: number) => {
    clearTimer()
    const remaining = sessionInactivityMilliseconds - (Date.now() - lastActivity)
    if (remaining <= 0) {
      lockSession('INACTIVITY')
      return
    }
    timerRef.current = window.setTimeout(() => lockSession('INACTIVITY'), remaining)
  }, [clearTimer, lockSession])

  useEffect(() => {
    let active = true
    void api.sessionStatus().then(session => {
      if (!active) return
      if (!session.authenticated) {
        if (window.location.pathname !== '/login') window.history.replaceState(null, '', '/login')
        localStorage.setItem(sessionLockReasonStorageKey, 'INITIAL')
        localStorage.setItem(sessionLockedStorageKey, 'true')
        setReason('INITIAL')
        setLocked(true)
      } else {
        const shouldRemainLocked = sessionStartsLocked()
        if (!shouldRemainLocked && window.location.pathname === '/login') window.history.replaceState(null, '', '/')
        setLocked(shouldRemainLocked)
      }
    }).catch(() => {
      if (active) { setReason('INITIAL'); setLocked(true) }
    }).finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (checking || locked) {
      clearTimer()
      return
    }

    const now = Date.now()
    const previousActivity = storedLastActivity()
    const initialActivity = now - previousActivity >= sessionInactivityMilliseconds ? now : previousActivity
    localStorage.setItem(lastActivityStorageKey, String(initialActivity))
    lastPersistedActivityRef.current = initialActivity
    scheduleExpiration(initialActivity)
    lastServerKeepAliveRef.current = now
    void api.sessionKeepAlive().catch(() => lockSession('INACTIVITY'))

    const registerActivity = () => {
      const activityAt = Date.now()
      scheduleExpiration(activityAt)
      if (activityAt - lastPersistedActivityRef.current < activityPersistInterval) return
      lastPersistedActivityRef.current = activityAt
      localStorage.setItem(lastActivityStorageKey, String(activityAt))
      if (activityAt - lastServerKeepAliveRef.current >= serverKeepAliveInterval) {
        lastServerKeepAliveRef.current = activityAt
        void api.sessionKeepAlive().catch(() => lockSession('INACTIVITY'))
      }
    }
    const verifyElapsedTime = () => {
      if (document.visibilityState === 'visible') scheduleExpiration(storedLastActivity())
    }
    const synchronizeSession = (event: StorageEvent) => {
      if (event.key === sessionLockedStorageKey && event.newValue === 'true') {
        clearTimer()
        setReason(storedLockReason())
        setLocked(true)
      }
      if (event.key === lastActivityStorageKey && event.newValue) {
        const activityAt = Number(event.newValue)
        if (Number.isFinite(activityAt)) scheduleExpiration(activityAt)
      }
    }
    const manualLogout = () => lockSession('MANUAL')
    const expiredSession = () => lockSession('INACTIVITY')

    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'mousemove', 'wheel', 'touchstart']
    activityEvents.forEach(eventName => window.addEventListener(eventName, registerActivity, { passive: true }))
    document.addEventListener('visibilitychange', verifyElapsedTime)
    window.addEventListener('storage', synchronizeSession)
    window.addEventListener(sessionLogoutEvent, manualLogout)
    window.addEventListener(sessionExpiredEvent, expiredSession)
    return () => {
      clearTimer()
      activityEvents.forEach(eventName => window.removeEventListener(eventName, registerActivity))
      document.removeEventListener('visibilitychange', verifyElapsedTime)
      window.removeEventListener('storage', synchronizeSession)
      window.removeEventListener(sessionLogoutEvent, manualLogout)
      window.removeEventListener(sessionExpiredEvent, expiredSession)
    }
  }, [checking, clearTimer, lockSession, locked, scheduleExpiration])

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault()
    const identifier = username.trim()
    if (!identifier || !password) {
      setLoginError('Ingresa tu usuario y contraseña.')
      return
    }
    setLoggingIn(true)
    setLoginError('')
    try {
      await api.sessionLogin(identifier, password)
      const activityAt = Date.now()
      localStorage.setItem(lastActivityStorageKey, String(activityAt))
      localStorage.removeItem(sessionLockedStorageKey)
      localStorage.removeItem(sessionLockReasonStorageKey)
      lastPersistedActivityRef.current = activityAt
      window.location.replace('/')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.')
      setLoggingIn(false)
    }
  }

  if (checking) return <main className="session-checking"><span>SG</span><div><strong>Validando sesión</strong><i /></div></main>
  if (!locked) return children

  const companyName = company.name || company.businessName || 'SAGA ERP'
  const reasonMessage = reason === 'INACTIVITY'
    ? `La sesión se cerró después de ${sessionInactivityMinutes} minutos sin actividad. Ingresa nuevamente para continuar.`
    : reason === 'MANUAL' ? 'Has salido del sistema de forma segura.' : 'Por favor, ingresa tus credenciales para continuar.'

  return <main className="login-page">
    <section className={`login-visual ${company.loginBackground?.dataUrl ? 'has-background' : ''}`} style={company.loginBackground?.dataUrl ? { backgroundImage: `url(${company.loginBackground.dataUrl})` } : undefined} aria-label="Imagen institucional de acceso">
      <div className="login-visual-overlay" />
      <div className="login-visual-content"><span>Plataforma de gestión</span><h1>{companyName}</h1><p>Información segura para administrar tu organización.</p></div>
    </section>
    <section className="login-access" aria-label="Acceso a la plataforma">
      <div className="login-card">
        <div className="login-brand">
          {company.logo?.dataUrl ? <img src={company.logo.dataUrl} alt={`Logo de ${companyName}`} /> : <div className="login-brand-fallback"><ShieldCheck size={38} /><strong>{companyName}</strong></div>}
        </div>
        <div className="login-intro"><h2>Bienvenido</h2><p>{reasonMessage}</p></div>
        <form className="login-form" onSubmit={submitLogin} noValidate>
          {loginError && <div className="login-error" role="alert"><AlertTriangle size={18} /><span>{loginError}</span></div>}
          <label className="login-field"><span className="sr-only">Usuario o correo</span><UserRound size={18} /><input value={username} onChange={event => { setUsername(event.target.value); setLoginError('') }} placeholder="Usuario o correo" autoComplete="username" autoFocus /></label>
          <label className="login-field"><span className="sr-only">Contraseña</span><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => { setPassword(event.target.value); setLoginError('') }} placeholder="Contraseña" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(current => !current)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></label>
          <button type="button" className="login-recovery-link" onClick={() => setRecoveryOpen(true)}>¿Olvidaste tu contraseña?</button>
          <button type="submit" className="primary-action login-submit" disabled={loggingIn}>{loggingIn ? 'Ingresando...' : 'Ingresar'}</button>
        </form>
      </div>
    </section>
    {recoveryOpen && <PasswordRecoveryDialog onClose={() => setRecoveryOpen(false)} />}
  </main>
}

type RecoveryDelivery = {
  recoveryId:string
  maskedEmail:string
  expiresInSeconds:number
  deliveryMode:'EMAIL'|'VALIDATION'
  previewCode?:string
}

function PasswordRecoveryDialog({onClose}:{onClose:()=>void}){
  const [identifier,setIdentifier]=useState('')
  const [delivery,setDelivery]=useState<RecoveryDelivery|null>(null)
  const [otp,setOtp]=useState('')
  const [newPassword,setNewPassword]=useState('')
  const [confirmation,setConfirmation]=useState('')
  const [showNewPassword,setShowNewPassword]=useState(false)
  const [showConfirmation,setShowConfirmation]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false)
  const [completedName,setCompletedName]=useState('')

  const requestCode=async(event?:FormEvent)=>{
    event?.preventDefault()
    if(!identifier.trim()){setError('Ingresa tu usuario o correo.');return}
    setBusy(true);setError('');setNotice('')
    try{
      const result=await api.requestPasswordRecovery(identifier.trim())
      setDelivery(result);setOtp('')
      setNotice(result.deliveryMode==='EMAIL'
        ? `Se envió un código de seis dígitos a ${result.maskedEmail}.`
        : `Modo de validación local: usa el código ${result.previewCode}.`)
      localStorage.setItem('saga-ultimo-correo-recuperacion',JSON.stringify({identifier:identifier.trim(),maskedEmail:result.maskedEmail,code:result.previewCode??'',createdAt:new Date().toISOString()}))
    }catch(failure){setError(failure instanceof Error?failure.message:'No se pudo enviar el código de recuperación.')}
    finally{setBusy(false)}
  }

  const changePassword=async(event:FormEvent)=>{
    event.preventDefault()
    if(!delivery)return
    if(otp.length!==6){setError('Ingresa el código OTP de seis dígitos.');return}
    if(newPassword.length<8){setError('La nueva contraseña debe tener al menos 8 caracteres.');return}
    if(newPassword!==confirmation){setError('Las contraseñas no coinciden.');return}
    setBusy(true);setError('')
    try{
      const result=await api.confirmPasswordRecovery(delivery.recoveryId,otp,newPassword)
      localStorage.removeItem('saga-ultimo-correo-recuperacion')
      setCompletedName(result.name)
    }catch(failure){setError(failure instanceof Error?failure.message:'No se pudo cambiar la contraseña.')}
    finally{setBusy(false)}
  }

  return <div className="login-recovery-layer" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section className="login-recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="login-recovery-title">
      {completedName?<div className="login-recovery-success">
        <span className="login-recovery-success-icon"><CheckCircle2 size={26}/></span>
        <h2 id="login-recovery-title">Contraseña actualizada</h2>
        <p>La nueva contraseña fue guardada correctamente para <strong>{completedName}</strong>.</p>
        <button type="button" className="primary-action recovery-full-button" onClick={onClose}>Volver al inicio de sesión</button>
      </div>:<>
        <header className="login-recovery-head"><div><h2 id="login-recovery-title">{delivery?'Cambio de Contraseña':'Recuperar Contraseña'}</h2><p>{delivery?`Código enviado a ${delivery.maskedEmail}`:'Ingresa tu usuario o correo'}</p></div><button type="button" aria-label="Cerrar" onClick={onClose}><X size={18}/></button></header>
        {!delivery?<form className="login-recovery-form" onSubmit={requestCode} noValidate>
          {error&&<div className="login-error" role="alert"><AlertTriangle size={18}/><span>{error}</span></div>}
          <label className="recovery-field"><span>Usuario o correo</span><input value={identifier} onChange={event=>{setIdentifier(event.target.value);setError('')}} placeholder="usuario@empresa.com" autoComplete="username" autoFocus/></label>
          <div className="login-recovery-actions"><button type="button" className="recovery-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="primary-action" disabled={busy}>{busy?'Enviando...':'Enviar Código'}</button></div>
        </form>:<form className="login-recovery-form" onSubmit={changePassword} noValidate>
          {error&&<div className="login-error" role="alert"><AlertTriangle size={18}/><span>{error}</span></div>}
          {notice&&<div className="password-reset-notice" role="status"><Mail size={18}/><span>{notice}</span></div>}
          <label className="recovery-field"><span>Código OTP (6 dígitos)</span><input value={otp} onChange={event=>{setOtp(event.target.value.replace(/\D/g,'').slice(0,6));setError('')}} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus/></label>
          <label className="recovery-field"><span>Nueva Contraseña</span><div className="password-reset-field"><input type={showNewPassword?'text':'password'} value={newPassword} onChange={event=>{setNewPassword(event.target.value);setError('')}} autoComplete="new-password"/><button type="button" onClick={()=>setShowNewPassword(current=>!current)} aria-label={showNewPassword?'Ocultar nueva contraseña':'Mostrar nueva contraseña'}>{showNewPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
          <label className="recovery-field"><span>Confirmar Contraseña</span><div className="password-reset-field"><input type={showConfirmation?'text':'password'} value={confirmation} onChange={event=>{setConfirmation(event.target.value);setError('')}} autoComplete="new-password"/><button type="button" onClick={()=>setShowConfirmation(current=>!current)} aria-label={showConfirmation?'Ocultar confirmación':'Mostrar confirmación'}>{showConfirmation?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
          <button type="button" className="password-resend-button" onClick={()=>void requestCode()} disabled={busy}>Reenviar código ahora</button>
          <div className="login-recovery-actions"><button type="button" className="recovery-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="primary-action" disabled={busy}>{busy?'Guardando...':'Cambiar Contraseña'}</button></div>
        </form>}
      </>}
    </section>
  </div>
}
