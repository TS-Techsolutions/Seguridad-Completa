import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  AlertTriangle, Building2, Check, ChevronDown, ChevronRight, Download, FileText, Mail,
  Palette, Pencil, Plus, RotateCcw, Settings2, ShieldCheck, Upload, Users, X
} from 'lucide-react'
import type { Catalog, ScreenSpec } from './types'
import { companySettingsChangedEvent, companySettingsStorageKey } from './operation-date-rules'

type Status = 'ACTIVO' | 'INACTIVO'
type PlatformUser = { id:string; username:string; name:string; role:string; email:string; status:Status }
type PlatformRole = { id:string; name:string; description:string; status:Status }
type PermissionAction = 'access'|'insert'|'delete'|'update'|'export'|'print'
type PermissionMatrix = Record<string,Partial<Record<PermissionAction,boolean>>>
type RolePermissionMatrices = Record<string,PermissionMatrix>
type CompanyImage = { name:string; dataUrl:string }
type BillingType = 'EXPENSAS'|'FACTURACION'
type VatType = 'GRAVA_IVA'|'IVA_0'
type GenerationType = 'CLIENTE'|'INMUEBLE'
type CompanySettings = { ruc:string; name:string; businessName:string; address:string; phone:string; email:string; operationStartDate:string; billingType:BillingType; vatType:VatType; generationType:GenerationType; logo?:CompanyImage; miniLogo?:CompanyImage; loginBackground?:CompanyImage; smtpServer:string; smtpPort:string; senderEmail:string; smtpPassword:string; from:string }
type EmailTemplate = { subject:string; body:string }
type EmailTemplates = { passwordRecovery:EmailTemplate; payrollReceipt:EmailTemplate }
type DocumentType = { id:string; name:string; status:Status; clients:boolean; employees:boolean }
type ColorSettings = Record<string,string>

const initialUsers:PlatformUser[]=[
  {id:'USR-001',username:'ana.navarro',name:'Ana Navarro',role:'Administradora',email:'ana.navarro@empresa.com',status:'ACTIVO'},
  {id:'USR-002',username:'maria.ruiz',name:'María Fernanda Ruiz',role:'Empleado',email:'maria.ruiz@empresa.com',status:'ACTIVO'},
  {id:'USR-003',username:'carlos.mena',name:'Carlos Andrés Mena',role:'Supervisor',email:'carlos.mena@empresa.com',status:'ACTIVO'},
  {id:'USR-004',username:'lucia.paz',name:'Lucía Valentina Paz',role:'Talento Humano',email:'lucia.paz@empresa.com',status:'INACTIVO'},
  {id:'USR-ADMIN',username:'admin',name:'Administrador',role:'Administradora',email:'admin@empresa.com',status:'ACTIVO'},
]
const initialRoles:PlatformRole[]=[
  {id:'ROL-001',name:'Administradora',description:'Administración general y configuración de la plataforma',status:'ACTIVO'},
  {id:'ROL-002',name:'Supervisor',description:'Supervisión operativa y aprobación de solicitudes',status:'ACTIVO'},
  {id:'ROL-003',name:'Talento Humano',description:'Gestión de empleados, novedades y procesos laborales',status:'ACTIVO'},
  {id:'ROL-004',name:'Empleado',description:'Consulta y gestión de su información personal',status:'ACTIVO'},
]
const initialCompany:CompanySettings={ruc:'1790012345001',name:'Empresa Demostración',businessName:'Empresa Demostración S.A.',address:'Quito, Ecuador',phone:'02 400 0000',email:'',operationStartDate:'2026-10-01',billingType:'EXPENSAS',vatType:'GRAVA_IVA',generationType:'CLIENTE',smtpServer:'',smtpPort:'587',senderEmail:'',smtpPassword:'',from:''}
const initialTemplates:EmailTemplates={
  passwordRecovery:{subject:'Código para restablecer su contraseña',body:'Hola {{NOMBRE}},\n\nUtilice el siguiente código de seguridad para restablecer su contraseña:\n\n{{CODIGO}}\n\nEste código es personal y no debe compartirlo con otras personas.'},
  payrollReceipt:{subject:'Rol de pago disponible',body:'Hola {{NOMBRE}},\n\nSu rol de pago correspondiente a {{PERIODO}} se encuentra disponible para consulta y descarga en la plataforma.'},
}
const initialDocuments:DocumentType[]=[
  {id:'TDO-001',name:'Cédula',status:'ACTIVO',clients:true,employees:true},
  {id:'TDO-002',name:'RUC',status:'ACTIVO',clients:true,employees:false},
  {id:'TDO-003',name:'Pasaporte',status:'ACTIVO',clients:true,employees:true},
]
const initialColors:ColorSettings={
  canvas:'#f4f5f8',surface:'#ffffff',subtle:'#f8fafc',hover:'#f1f5f9',text:'#202536',secondary:'#707789',border:'#dfe2e9',divider:'#e2e8f0',
  primary:'#5265ee','primary-hover':'#4054dc',sidebar:'#151b2b','sidebar-active':'#1d2437',success:'#166534','success-bg':'#f0fdf4',
  warning:'#92400e','warning-bg':'#fffbeb',danger:'#b91c1c','danger-bg':'#fef2f2','info-bg':'#eff6ff',simulation:'#6b21a8','simulation-bg':'#faf5ff',
}
const permissionActions:Array<{key:PermissionAction;label:string}>=[
  {key:'access',label:'Acceso'},{key:'insert',label:'Insertar'},{key:'delete',label:'Borrar'},
  {key:'update',label:'Actualizar'},{key:'export',label:'Exportar'},{key:'print',label:'Imprimir'},
]

function stored<T>(key:string,initial:T):T{try{const value=localStorage.getItem(key);return value?JSON.parse(value) as T:initial}catch{return initial}}
function useStoredState<T>(key:string,initial:T){
  const [value,setValue]=useState<T>(()=>stored(key,initial))
  useEffect(()=>{localStorage.setItem(key,JSON.stringify(value))},[key,value])
  return [value,setValue] as const
}

export function SecurityConfigurationPage({screen,catalog}:{screen:ScreenSpec;catalog:Catalog}){
  return <div className="page security-config-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={part}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    {screen.id==='SEC-001'&&<UsersPage/>}
    {screen.id==='SEC-002'&&<RolesPage/>}
    {screen.id==='SEC-003'&&<PermissionsPage catalog={catalog}/>}
    {screen.id==='SEC-004'&&<CompanyPage/>}
    {screen.id==='SEC-005'&&<EmailTemplatesPage/>}
    {screen.id==='SEC-006'&&<DocumentTypesPage/>}
  </div>
}

function ConfigHeader({screen,title,description:_description,action}:{screen:string;title:string;description:string;action?:ReactNode}){
  return <section className="config-header"><div><div className="screen-id"><span>{screen}</span><b>Configuración General</b></div><h1>{title}</h1></div>{action&&<div className="screen-actions">{action}</div>}</section>
}
function Badge({status}:{status:Status}){return <span className={'config-badge '+(status==='ACTIVO'?'active':'inactive')}>{status==='ACTIVO'?'Activo':'Inactivo'}</span>}
function Feedback({children,tone='success'}:{children:ReactNode;tone?:'success'|'warning'}){return <div className={'config-feedback '+tone}>{tone==='success'?<Check/>:<AlertTriangle/>}<span>{children}</span></div>}
function Dialog({title,description,onClose,children}:{title:string;description:string;onClose:()=>void;children:ReactNode}){
  return <div className="config-dialog-backdrop"><section className="config-dialog" role="dialog" aria-modal="true" aria-label={title}><header><div><h2>{title}</h2><p>{description}</p></div><button onClick={onClose} aria-label="Cerrar"><X/></button></header>{children}</section></div>
}

function UsersPage(){
  const [users,setUsers]=useStoredState('saga.security.users',initialUsers)
  const [roles]=useStoredState('saga.security.roles',initialRoles)
  const [editing,setEditing]=useState<PlatformUser|null>(null)
  const [creating,setCreating]=useState(false)
  return <>
    <ConfigHeader screen="SEC-001" title="Usuarios" description="Administra las cuentas habilitadas para acceder a la plataforma." action={<button className="primary-action" onClick={()=>setCreating(true)}><Plus/>Nuevo Usuario</button>}/>
    <section className="panel config-panel"><div className="config-table-scroll"><table className="config-table"><thead><tr><th/><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Correo</th><th>Estado</th></tr></thead><tbody>
      {users.map(user=><tr key={user.id}><td><button className="config-icon-button" onClick={()=>setEditing(user)} aria-label={'Editar usuario '+user.username}><Pencil/></button></td><td><strong>{user.username}</strong></td><td>{user.name}</td><td>{user.role}</td><td><a href={'mailto:'+user.email}>{user.email}</a></td><td><Badge status={user.status}/></td></tr>)}
    </tbody></table></div><footer><span>{users.length} usuarios registrados</span><span>{users.filter(user=>user.status==='ACTIVO').length} activos</span></footer></section>
    {(editing||creating)&&<UserDialog user={editing??undefined} users={users} roleOptions={roles.filter(role=>role.status==='ACTIVO').map(role=>role.name)} onClose={()=>{setEditing(null);setCreating(false)}} onSave={user=>{setUsers(current=>current.some(item=>item.id===user.id)?current.map(item=>item.id===user.id?user:item):[...current,user]);setEditing(null);setCreating(false)}}/>}
  </>
}
function UserDialog({user,users,roleOptions,onClose,onSave}:{user?:PlatformUser;users:PlatformUser[];roleOptions:string[];onClose:()=>void;onSave:(user:PlatformUser)=>void}){
  const [form,setForm]=useState<PlatformUser>(user??{id:'USR-'+Date.now(),username:'',name:'',role:roleOptions[0]??'',email:'',status:'ACTIVO'})
  const [error,setError]=useState('')
  const submit=(event:FormEvent)=>{event.preventDefault();const username=form.username.trim().toLowerCase();if(!username||!form.name.trim()||!form.role||!form.email.trim()){setError('Completa todos los campos del usuario.');return}if(!/^[a-z0-9._-]{3,40}$/.test(username)){setError('El usuario debe tener entre 3 y 40 caracteres válidos.');return}if(users.some(item=>item.id!==form.id&&item.username.toLowerCase()===username)){setError('El nombre de usuario ya está registrado.');return}if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)){setError('Ingresa un correo electrónico válido.');return}onSave({...form,username,name:form.name.trim(),email:form.email.trim().toLowerCase()})}
  return <Dialog title={user?'Editar Usuario':'Nuevo Usuario'} description={user?.username??'Crea una cuenta habilitada para acceder a la plataforma.'} onClose={onClose}><form onSubmit={submit}>{error&&<Feedback tone="warning">{error}</Feedback>}<div className="config-form-grid">
    <label>Usuario <span>Obligatorio</span><input value={form.username} maxLength={40} onChange={e=>setForm({...form,username:e.target.value})}/></label>
    <label>Estado <span>Obligatorio</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value as Status})}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label>
    <label className="wide">Nombre <span>Obligatorio</span><input value={form.name} maxLength={100} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label>Rol <span>Obligatorio</span><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{roleOptions.map(role=><option key={role}>{role}</option>)}</select></label>
    <label>Correo <span>Obligatorio</span><input type="email" value={form.email} maxLength={120} onChange={e=>setForm({...form,email:e.target.value})}/></label>
  </div><div className="config-dialog-actions"><button type="button" className="quiet-button" onClick={onClose}>Cancelar</button><button className="primary-action"><Check/>{user?'Guardar cambios':'Guardar Usuario'}</button></div></form></Dialog>
}

function RolesPage(){
  const [roles,setRoles]=useStoredState('saga.security.roles',initialRoles)
  const [users]=useStoredState('saga.security.users',initialUsers)
  const [creating,setCreating]=useState(false)
  return <>
    <ConfigHeader screen="SEC-002" title="Roles" description="Consulta los grupos utilizados para diferenciar los perfiles de acceso." action={<button className="primary-action" onClick={()=>setCreating(true)}><Plus/>Crear Nuevo Rol</button>}/>
    <section className="panel config-panel"><div className="config-table-scroll"><table className="config-table"><thead><tr><th>Grupo</th><th>Descripción</th><th>Usuarios</th><th>Estado</th></tr></thead><tbody>
      {roles.map(role=><tr key={role.id}><td><strong>{role.name}</strong></td><td>{role.description}</td><td>{users.filter(user=>user.role===role.name).length}</td><td><Badge status={role.status}/></td></tr>)}
    </tbody></table></div><footer><span>{roles.length} grupos registrados</span><span>{roles.filter(role=>role.status==='ACTIVO').length} activos</span></footer></section>
    {creating&&<RoleDialog roles={roles} onClose={()=>setCreating(false)} onSave={role=>{setRoles(current=>[...current,role]);setCreating(false)}}/>}
  </>
}
function RoleDialog({roles,onClose,onSave}:{roles:PlatformRole[];onClose:()=>void;onSave:(role:PlatformRole)=>void}){
  const [name,setName]=useState('');const [description,setDescription]=useState('');const [status,setStatus]=useState<Status>('ACTIVO');const [error,setError]=useState('')
  const submit=(event:FormEvent)=>{event.preventDefault();if(!name.trim()||!description.trim()){setError('Completa el nombre y la descripción del rol.');return}if(roles.some(role=>role.name.localeCompare(name.trim(),'es',{sensitivity:'base'})===0)){setError('Ya existe un rol con este nombre.');return}onSave({id:'ROL-'+Date.now(),name:name.trim(),description:description.trim(),status})}
  return <Dialog title="Crear Nuevo Rol" description="Registra un grupo para diferenciar los perfiles de los usuarios." onClose={onClose}><form onSubmit={submit}>{error&&<Feedback tone="warning">{error}</Feedback>}<div className="config-form-grid">
    <label>Nombre <span>Obligatorio</span><input value={name} maxLength={60} onChange={e=>setName(e.target.value)}/></label>
    <label>Estado <span>Obligatorio</span><select value={status} onChange={e=>setStatus(e.target.value as Status)}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label>
    <label className="wide">Descripción <span>Obligatorio</span><textarea value={description} maxLength={200} rows={4} onChange={e=>setDescription(e.target.value)}/></label>
  </div><div className="config-dialog-actions"><button type="button" className="quiet-button" onClick={onClose}>Cancelar</button><button className="primary-action"><Check/>Guardar Rol</button></div></form></Dialog>
}

function PermissionsPage({catalog}:{catalog:Catalog}){
  const [roles]=useStoredState('saga.security.roles',initialRoles)
  const [matrices,setMatrices]=useStoredState<RolePermissionMatrices>('saga.security.permissions',{})
  const [roleId,setRoleId]=useState(roles.find(role=>role.status==='ACTIVO')?.id??roles[0]?.id??'')
  const [expanded,setExpanded]=useState<Record<string,boolean>>({})
  const [saved,setSaved]=useState(false)
  const role=roles.find(item=>item.id===roleId);const matrix=matrices[roleId]??{}
  const roots=useMemo(()=>catalog.menu.filter(node=>node.level===0).map(node=>node.label),[catalog])
  const screensFor=(root:string)=>catalog.screens.filter(screen=>screen.ruta_original.split(' > ')[0]===root)
  const toggleScreen=(path:string,action:PermissionAction,checked:boolean)=>setMatrices(current=>({...current,[roleId]:{...(current[roleId]??{}),[path]:{...(current[roleId]?.[path]??{}),[action]:checked}}}))
  const toggleModule=(root:string,action:PermissionAction,checked:boolean)=>setMatrices(current=>{const next={...(current[roleId]??{})};screensFor(root).forEach(screen=>{next[screen.ruta_react]={...(next[screen.ruta_react]??{}),[action]:checked}});return{...current,[roleId]:next}})
  return <>
    <ConfigHeader screen="SEC-003" title="Permisos" description="Configura las acciones habilitadas para cada pantalla del sistema." action={<button className="primary-action" disabled={!roleId} onClick={()=>{localStorage.setItem('saga.security.permissions',JSON.stringify(matrices));setSaved(true)}}><Check/>Guardar permisos</button>}/>
    {saved&&<Feedback>Los permisos del rol fueron guardados correctamente.</Feedback>}
    <section className="panel permissions-selector"><label>Rol<select value={roleId} onChange={e=>{setRoleId(e.target.value);setSaved(false)}}>{roles.map(item=><option value={item.id} key={item.id}>{item.name}{item.status==='INACTIVO'?' · Inactivo':''}</option>)}</select></label>{role&&<div><Badge status={role.status}/><span>{role.description}</span></div>}</section>
    <section className="panel permissions-panel"><div className="config-table-scroll"><table className="config-table permissions-table"><thead><tr><th>Pantalla</th>{permissionActions.map(action=><th key={action.key}>{action.label}</th>)}</tr></thead><tbody>
      {roots.map(root=>{const moduleScreens=screensFor(root);const open=Boolean(expanded[root]);return [
        <tr className="permission-module-row" key={root}><td><button className="permission-expand" onClick={()=>setExpanded(current=>({...current,[root]:!current[root]}))}><strong>{root}</strong><ChevronDown className={open?'open':''}/></button></td>{permissionActions.map(action=><td key={action.key}><input type="checkbox" aria-label={action.label+' en '+root} checked={moduleScreens.length>0&&moduleScreens.every(screen=>Boolean(matrix[screen.ruta_react]?.[action.key]))} onChange={e=>toggleModule(root,action.key,e.target.checked)}/></td>)}</tr>,
        ...(open?moduleScreens.map(screen=><tr className="permission-screen-row" key={screen.id}><td>{screen.titulo_original}</td>{permissionActions.map(action=><td key={action.key}><input type="checkbox" aria-label={action.label+' en '+screen.titulo_original} checked={Boolean(matrix[screen.ruta_react]?.[action.key])} onChange={e=>toggleScreen(screen.ruta_react,action.key,e.target.checked)}/></td>)}</tr>):[])
      ]})}
    </tbody></table></div></section>
  </>
}

function CompanyPage(){
  const [settings,setSettings]=useStoredState('saga.security.company',initialCompany)
  const [colors,setColors]=useStoredState('saga.security.colors',initialColors)
  const [draft,setDraft]=useState<CompanySettings>(()=>({...initialCompany,...settings}))
  const [tab,setTab]=useState<'company'|'visual'|'smtp'|'colors'>('company')
  const [message,setMessage]=useState('')
  const update=(changes:Partial<CompanySettings>)=>{setDraft(current=>({...current,...changes}));setMessage('')}
  const save=()=>{if(!draft.ruc.trim()||!draft.name.trim()||!draft.businessName.trim()){setMessage('Completa el RUC, nombre y razón social de la empresa.');setTab('company');return}if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.operationStartDate)){setMessage('Selecciona la fecha de Inicio de Operaciones.');setTab('company');return}if(draft.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)){setMessage('Ingresa un email válido para la empresa.');setTab('company');return}if(draft.smtpPort&&!/^\d{1,5}$/.test(draft.smtpPort)){setMessage('El puerto SMTP debe contener únicamente números.');setTab('smtp');return}localStorage.setItem(companySettingsStorageKey,JSON.stringify(draft));setSettings(draft);window.dispatchEvent(new CustomEvent(companySettingsChangedEvent,{detail:{billingType:draft.billingType}}));setMessage('Configuración guardada correctamente.')}
  const upload=(key:'logo'|'miniLogo'|'loginBackground',file?:File)=>{if(!file)return;if(!file.type.startsWith('image/')){setMessage('Selecciona un archivo de imagen válido.');return}if(file.size>1500000){setMessage('Cada imagen debe pesar máximo 1,5 MB.');return}const reader=new FileReader();reader.onload=()=>update({[key]:{name:file.name,dataUrl:String(reader.result)}});reader.readAsDataURL(file)}
  return <>
    <ConfigHeader screen="SEC-004" title="Compañía" description="Administra los datos generales y la identidad de la empresa." action={tab!=='colors'&&<button className="primary-action" onClick={save}><Check/>Guardar configuración</button>}/>
    <div className="config-tabs" role="tablist">{[['company','Datos de la Empresa'],['visual','Identidad Visual'],['smtp','Correo SMTP'],['colors','Colores del Sistema']].map(item=><button key={item[0]} role="tab" aria-selected={tab===item[0]} className={tab===item[0]?'active':''} onClick={()=>{setTab(item[0] as typeof tab);setMessage('')}}>{item[1]}</button>)}</div>
    {message&&<Feedback tone={message.includes('guardada')?'success':'warning'}>{message}</Feedback>}
    {tab==='company'&&<section className="panel company-panel"><PanelTitle icon={<Building2/>} title="Datos de la Empresa"/><div className="config-form-grid">
      <label>RUC <span>Obligatorio</span><input value={draft.ruc} maxLength={13} inputMode="numeric" onChange={e=>update({ruc:e.target.value.replace(/\D/g,'')})}/></label>
      <label>Nombre <span>Obligatorio</span><input value={draft.name} maxLength={100} onChange={e=>update({name:e.target.value})}/></label>
      <label className="wide">Razón Social <span>Obligatorio</span><input value={draft.businessName} maxLength={150} onChange={e=>update({businessName:e.target.value})}/></label>
      <label className="wide">Dirección<input value={draft.address} maxLength={200} onChange={e=>update({address:e.target.value})}/></label>
      <label>Teléfono<input value={draft.phone} maxLength={30} onChange={e=>update({phone:e.target.value})}/></label>
      <label>Email<input type="email" value={draft.email} maxLength={120} onChange={e=>update({email:e.target.value})}/></label>
      <label>Inicio de Operaciones <span>Obligatorio</span><input type="date" value={draft.operationStartDate} onChange={e=>update({operationStartDate:e.target.value})}/></label>
      <label>Tipo de Cobro<select value={draft.billingType} onChange={e=>update({billingType:e.target.value as BillingType})}><option value="EXPENSAS">Expensas</option><option value="FACTURACION">Facturación</option></select></label>
      <label>Tipo de Generación<select value={draft.generationType} onChange={e=>update({generationType:e.target.value as GenerationType})}><option value="CLIENTE">Generación por Cliente</option><option value="INMUEBLE">Generación por Inmueble</option></select></label>
      {draft.billingType==='FACTURACION'&&<fieldset className="company-tax-options"><legend>Tipo de IVA</legend><label><input type="radio" name="company-vat-type" value="GRAVA_IVA" checked={draft.vatType==='GRAVA_IVA'} onChange={()=>update({vatType:'GRAVA_IVA'})}/>Grava IVA</label><label><input type="radio" name="company-vat-type" value="IVA_0" checked={draft.vatType==='IVA_0'} onChange={()=>update({vatType:'IVA_0'})}/>IVA 0%</label></fieldset>}
    </div></section>}
    {tab==='visual'&&<section className="panel company-panel"><PanelTitle icon={<Palette/>} title="Identidad Visual"/><div className="visual-grid">{([
      ['logo','Logo','Logo principal utilizado en la plataforma.'],['miniLogo','Mini Logo','Versión compacta para espacios reducidos.'],['loginBackground','Fondo Login','Imagen de fondo para la pantalla de acceso.']
    ] as const).map(item=>{const image=draft[item[0]];return <article className="image-card" key={item[0]}><div className="image-preview">{image?<img src={image.dataUrl} alt={item[1]}/>:<FileText/>}</div><div><h3>{item[1]}</h3><p>{item[2]}</p>{image&&<small>{image.name}</small>}</div><label className="quiet-button"><Upload/>Buscar archivo<input type="file" accept="image/*" onChange={e=>upload(item[0],e.target.files?.[0])}/></label>{image&&<a className="quiet-button" href={image.dataUrl} download={image.name}><Download/>Descargar</a>}</article>})}</div></section>}
    {tab==='smtp'&&<section className="panel company-panel"><PanelTitle icon={<Settings2/>} title="Correo SMTP"/><div className="config-form-grid">
      <label>SMTP Server<input value={draft.smtpServer} placeholder="smtp.ejemplo.com" onChange={e=>update({smtpServer:e.target.value})}/></label>
      <label>Puerto<input value={draft.smtpPort} maxLength={5} inputMode="numeric" onChange={e=>update({smtpPort:e.target.value.replace(/\D/g,'')})}/></label>
      <label>Correo Envío<input type="email" value={draft.senderEmail} onChange={e=>update({senderEmail:e.target.value})}/></label>
      <label>Contraseña SMTP<input type="password" value={draft.smtpPassword} autoComplete="new-password" onChange={e=>update({smtpPassword:e.target.value})}/></label>
      <label className="wide">From<input value={draft.from} placeholder="Nombre visible del remitente" onChange={e=>update({from:e.target.value})}/></label>
    </div></section>}
    {tab==='colors'&&<ColorsPanel colors={colors} onSave={setColors}/>}
  </>
}
function PanelTitle({icon,title}:{icon:ReactNode;title:string}){return <div className="config-panel-title"><h2>{title}</h2>{icon}</div>}
function ColorsPanel({colors,onSave}:{colors:ColorSettings;onSave:(colors:ColorSettings)=>void}){
  const [draft,setDraft]=useState(colors);const [message,setMessage]=useState('')
  const valid=(value:string)=>/^#[0-9a-f]{6}$/i.test(value)
  useEffect(()=>{if(valid(draft.primary))document.documentElement.style.setProperty('--blue',draft.primary);if(valid(draft['primary-hover']))document.documentElement.style.setProperty('--blue2',draft['primary-hover']);if(valid(draft.sidebar))document.documentElement.style.setProperty('--navy',draft.sidebar);if(valid(draft.text))document.documentElement.style.setProperty('--ink',draft.text)},[draft])
  const groups=[
    ['Superficies y estructura',['canvas','surface','subtle','hover','border','divider']],
    ['Texto y navegación',['text','secondary','sidebar','sidebar-active']],
    ['Marca y acciones',['primary','primary-hover','info-bg']],
    ['Estados del sistema',['success','success-bg','warning','warning-bg','danger','danger-bg','simulation','simulation-bg']],
  ] as const
  return <section className="panel colors-panel"><div className="colors-toolbar"><div><h2>Colores del Sistema</h2><p>Personaliza los colores base utilizados en todas las pantallas.</p></div><button className="primary-action" disabled={Object.values(draft).some(value=>!valid(value))} onClick={()=>{onSave(draft);setMessage('Colores guardados correctamente.')}}><Check/>Guardar colores</button></div>{message&&<Feedback>{message}</Feedback>}<div className="color-groups">
    {groups.map(group=><section key={group[0]}><h3>{group[0]}</h3><div>{group[1].map(key=><label key={key}><input type="color" value={valid(draft[key])?draft[key]:'#ffffff'} onChange={e=>setDraft({...draft,[key]:e.target.value})}/><span>{key}</span><input className="hex-input" value={draft[key]} maxLength={7} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}</div></section>)}
  </div><button className="quiet-button restore-colors" onClick={()=>{setDraft(initialColors);setMessage('Se cargaron los colores originales. Presiona Guardar colores para conservarlos.')}}><RotateCcw/>Restaurar originales</button></section>
}

function EmailTemplatesPage(){
  const [templates,setTemplates]=useStoredState('saga.security.emailTemplates',initialTemplates)
  const [draft,setDraft]=useState(templates);const [tab,setTab]=useState<keyof EmailTemplates>('passwordRecovery');const [code,setCode]=useState(()=>String(Math.floor(100000+Math.random()*900000)));const [message,setMessage]=useState('')
  const current=draft[tab];const replace=(value:string)=>value.replaceAll('{{NOMBRE}}','Ana Navarro').replaceAll('{{CODIGO}}',code).replaceAll('{{PERIODO}}','Octubre 2026')
  const save=()=>{if(!draft.passwordRecovery.subject.trim()||!draft.passwordRecovery.body.trim()||!draft.payrollReceipt.subject.trim()||!draft.payrollReceipt.body.trim()){setMessage('Completa el asunto y el texto de ambas plantillas.');return}if(!draft.passwordRecovery.body.includes('{{CODIGO}}')){setMessage('La plantilla de recuperación debe incluir el marcador {{CODIGO}}.');setTab('passwordRecovery');return}setTemplates(draft);setMessage('Plantillas guardadas correctamente.')}
  const update=(changes:Partial<EmailTemplate>)=>{setDraft(state=>({...state,[tab]:{...state[tab],...changes}}));setMessage('')}
  return <>
    <ConfigHeader screen="SEC-005" title="Envío de Correos" description="Configura el contenido de los correos automáticos enviados por el sistema." action={<button className="primary-action" onClick={save}><Check/>Guardar plantillas</button>}/>
    <div className="config-tabs"><button className={tab==='passwordRecovery'?'active':''} onClick={()=>setTab('passwordRecovery')}>Recuperación de Contraseña</button><button className={tab==='payrollReceipt'?'active':''} onClick={()=>setTab('payrollReceipt')}>Envío de Rol de Pago</button></div>
    {message&&<Feedback tone={message.includes('guardadas')?'success':'warning'}>{message}</Feedback>}
    <div className="email-layout"><section className="panel email-editor"><PanelTitle icon={<FileText/>} title={tab==='passwordRecovery'?'Recuperación de Contraseña':'Envío de Rol de Pago'}/><label>Asunto <span>Obligatorio</span><input value={current.subject} maxLength={180} onChange={e=>update({subject:e.target.value})}/></label><label>Texto del correo <span>Obligatorio</span><textarea value={current.body} maxLength={3000} rows={14} onChange={e=>update({body:e.target.value})}/></label><div className="template-tokens"><strong>Marcadores disponibles</strong><code>{'{{NOMBRE}}'}</code><code>{tab==='passwordRecovery'?'{{CODIGO}}':'{{PERIODO}}'}</code></div></section>
    <aside className="panel email-preview"><div className="config-panel-title"><h2>Vista previa</h2>{tab==='passwordRecovery'&&<button className="quiet-button" onClick={()=>setCode(String(Math.floor(100000+Math.random()*900000)))}><RotateCcw/>Nuevo código</button>}</div><span>Asunto</span><strong>{replace(current.subject)||'Sin asunto'}</strong><p>{replace(current.body)||'Sin contenido'}</p>{tab==='passwordRecovery'&&<div className="code-preview"><span>Código generado</span><strong>{code}</strong><small>Siempre contiene seis dígitos.</small></div>}</aside></div>
  </>
}

function DocumentTypesPage(){
  const [rows,setRows]=useStoredState('saga.security.documentTypes',initialDocuments)
  const [message,setMessage]=useState('')
  const update=(id:string,changes:Partial<DocumentType>)=>{setRows(current=>current.map(row=>row.id===id?{...row,...changes}:row));setMessage('Cambios guardados automáticamente.')}
  const add=()=>{setRows(current=>[...current,{id:'TDO-'+Date.now(),name:'',status:'ACTIVO',clients:false,employees:false}]);setMessage('Completa el nombre y selecciona dónde estará habilitado.')}
  return <>
    <ConfigHeader screen="SEC-006" title="Tipo Documento" description="Define los tipos de identificación y las pantallas donde estarán disponibles." action={<button className="primary-action" onClick={add}><Plus/>Nuevo Tipo de Documento</button>}/>
    {message&&<Feedback tone={message.includes('Completa')?'warning':'success'}>{message}</Feedback>}
    <section className="panel config-panel"><div className="config-panel-title document-title"><div><h2>Tipos de documento</h2><p>Activa cada registro y marca si puede utilizarse en Clientes, Empleados o en ambos.</p></div><FileText/></div><div className="config-table-scroll"><table className="config-table document-table"><thead><tr><th>Nombre</th><th>Estado</th><th>Clientes</th><th>Empleados</th><th>Acciones</th></tr></thead><tbody>
      {rows.map((row,index)=><tr key={row.id}><td><input aria-label={'Nombre del tipo de documento '+(index+1)} value={row.name} maxLength={40} placeholder="Nombre del documento" onChange={e=>update(row.id,{name:e.target.value})}/></td><td><button className={'status-switch '+(row.status==='ACTIVO'?'active':'')} role="switch" aria-checked={row.status==='ACTIVO'} onClick={()=>update(row.id,{status:row.status==='ACTIVO'?'INACTIVO':'ACTIVO'})}><i/><span>{row.status==='ACTIVO'?'Activo':'Inactivo'}</span></button></td><td><label className="check-label"><input type="checkbox" checked={row.clients} onChange={e=>update(row.id,{clients:e.target.checked})}/>Habilitado</label></td><td><label className="check-label"><input type="checkbox" checked={row.employees} onChange={e=>update(row.id,{employees:e.target.checked})}/>Habilitado</label></td><td><button className="config-icon-button" onClick={()=>setMessage(row.name.trim()?'Línea grabada.':'Ingresa el nombre del tipo de documento.')}><Check/></button></td></tr>)}
    </tbody></table></div><footer><span>{rows.length} tipos visibles</span><span>Guardado automático al cambiar estado o disponibilidad</span></footer></section>
  </>
}
