import { useState, type FormEvent } from 'react'
import { Check, ChevronDown, LockKeyhole, LogIn, LogOut, Upload, UserRound, X } from 'lucide-react'

type Profile={
  photoName:string;photoDataUrl:string;birthDate:string;gender:string;maritalStatus:string;
  emergencyContact:string;emergencyPhone:string;relationship:string;bank:string;accountType:string;accountNumber:string;
  province:string;city:string;address:string;mobilePhone:string;additionalPhone:string;email:string
}
const profileKey='saga.currentUser.profile'
const initialProfile:Profile={photoName:'',photoDataUrl:'',birthDate:'',gender:'',maritalStatus:'SOLTERO',emergencyContact:'',emergencyPhone:'',relationship:'',bank:'',accountType:'',accountNumber:'',province:'',city:'',address:'',mobilePhone:'',additionalPhone:'',email:'jorge@empresa.com'}
function readProfile(){try{return{...initialProfile,...JSON.parse(localStorage.getItem(profileKey)??'{}')}}catch{return initialProfile}}

export function SidebarUserAccount({name,role}:{name:string;role:string}){
  const [open,setOpen]=useState(false)
  const [profileOpen,setProfileOpen]=useState(false)
  const [passwordOpen,setPasswordOpen]=useState(false)
  const [loggedOut,setLoggedOut]=useState(false)
  const [profile,setProfile]=useState<Profile>(readProfile)
  const [toast,setToast]=useState('')
  const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()
  const saveProfile=(next:Profile)=>{setProfile(next);localStorage.setItem(profileKey,JSON.stringify(next));setProfileOpen(false);setToast('La información del perfil fue actualizada correctamente.')}
  return <div className="account-control">
    {open&&<div className="account-menu" role="menu" aria-label="Opciones del usuario">
      <button type="button" role="menuitem" onClick={()=>{setProfileOpen(true);setOpen(false)}}><UserRound/><span>Mi Perfil</span></button>
      <button type="button" role="menuitem" onClick={()=>{setPasswordOpen(true);setOpen(false)}}><LockKeyhole/><span>Cambiar Contraseña</span></button>
      <button type="button" role="menuitem" onClick={()=>{setLoggedOut(true);setOpen(false)}}><LogOut/><span>Logout</span></button>
    </div>}
    <button type="button" className="account-button" onClick={()=>setOpen(current=>!current)} aria-expanded={open} aria-haspopup="menu">
      <span className="account-photo">{profile.photoDataUrl?<img src={profile.photoDataUrl} alt="Foto del usuario"/>:initials}</span>
      <span className="account-identity"><strong>{name}</strong><small>{role}</small></span>
      <ChevronDown className={open?'open':''}/>
    </button>
    {profileOpen&&<ProfileDialog name={name} role={role} profile={profile} onClose={()=>setProfileOpen(false)} onSave={saveProfile}/>}
    {passwordOpen&&<PasswordDialog onClose={()=>setPasswordOpen(false)} onSave={()=>{setPasswordOpen(false);setToast('La contraseña fue actualizada correctamente.')}}/>}
    {loggedOut&&<div className="logout-screen"><section><span className="logout-mark">SG</span><h1>Sesión cerrada</h1><p>Saliste del entorno de validación de SAGA.</p><button className="primary-action" onClick={()=>setLoggedOut(false)}><LogIn/>Ingresar de nuevo</button></section></div>}
    {toast&&<div className="account-toast" role="status"><Check/>{toast}<button onClick={()=>setToast('')} aria-label="Cerrar mensaje"><X/></button></div>}
  </div>
}

function Modal({title,description,onClose,children,className=''}:{title:string;description:string;onClose:()=>void;children:React.ReactNode;className?:string}){
  return <div className="account-modal-layer"><section className={'account-modal '+className} role="dialog" aria-modal="true" aria-label={title}><header><div><h2>{title}</h2><p>{description}</p></div><button onClick={onClose} aria-label="Cerrar"><X/></button></header>{children}</section></div>
}

function ProfileDialog({name,role,profile,onClose,onSave}:{name:string;role:string;profile:Profile;onClose:()=>void;onSave:(profile:Profile)=>void}){
  const [draft,setDraft]=useState(profile)
  const [tab,setTab]=useState<'personal'|'location'>('personal')
  const [error,setError]=useState('')
  const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()
  const update=(changes:Partial<Profile>)=>{setDraft(current=>({...current,...changes}));setError('')}
  const photo=(file?:File)=>{if(!file)return;if(!file.type.startsWith('image/')){setError('Selecciona una imagen válida.');return}if(file.size>1500000){setError('La fotografía debe pesar máximo 1,5 MB.');return}const reader=new FileReader();reader.onload=()=>update({photoName:file.name,photoDataUrl:String(reader.result)});reader.readAsDataURL(file)}
  const submit=(event:FormEvent)=>{event.preventDefault();if(tab==='location'&&(!draft.address.trim()||!/^\d{1,10}$/.test(draft.mobilePhone)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))){setError('Completa dirección, teléfono celular y un correo válido.');return}onSave(draft)}
  return <Modal title="Mi Perfil" description={name} onClose={onClose} className="profile-modal"><form onSubmit={submit}>
    <div className="profile-hero"><div className="profile-photo">{draft.photoDataUrl?<img src={draft.photoDataUrl} alt="Fotografía del usuario"/>:<span>{initials}</span>}</div><div><strong>{name}</strong><span>{role}</span><label className="account-secondary"><Upload/>Subir nueva foto<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>photo(e.target.files?.[0])}/></label>{draft.photoName&&<small>{draft.photoName}</small>}</div></div>
    <div className="profile-tabs" role="tablist"><button type="button" role="tab" aria-selected={tab==='personal'} className={tab==='personal'?'active':''} onClick={()=>setTab('personal')}>Datos Personales</button><button type="button" role="tab" aria-selected={tab==='location'} className={tab==='location'?'active':''} onClick={()=>setTab('location')}>Ubicabilidad</button></div>
    {error&&<div className="account-error">{error}</div>}
    <div className="profile-body">
      {tab==='personal'?<div className="account-form-grid">
        <label>Fecha de nacimiento<input value={draft.birthDate} placeholder="DD/MM/AAAA" maxLength={10} onChange={e=>update({birthDate:e.target.value})}/></label>
        <label>Género<select value={draft.gender} onChange={e=>update({gender:e.target.value})}><option value="">Seleccionar</option><option>MASCULINO</option><option>FEMENINO</option><option>OTRO</option></select></label>
        <label>Estado civil<select value={draft.maritalStatus} onChange={e=>update({maritalStatus:e.target.value})}><option value="SOLTERO">Soltero</option><option value="CASADO">Casado</option><option value="DIVORCIADO">Divorciado</option><option value="UNION_HECHO">Unión de hecho</option><option value="VIUDO">Viudo</option></select></label>
        <label>Contacto de emergencia<input value={draft.emergencyContact} onChange={e=>update({emergencyContact:e.target.value})}/></label>
        <label>Teléfono de emergencia<input value={draft.emergencyPhone} maxLength={15} onChange={e=>update({emergencyPhone:e.target.value.replace(/[^\d+]/g,'')})}/></label>
        <label>Parentesco<input value={draft.relationship} onChange={e=>update({relationship:e.target.value})}/></label>
        <label>Banco<select value={draft.bank} onChange={e=>update({bank:e.target.value})}><option value="">Seleccionar</option><option>Bolivariano</option><option>De Guayaquil</option><option>Pacífico</option><option>Pichincha</option><option>Produbanco</option></select></label>
        <label>Tipo de cuenta<select value={draft.accountType} onChange={e=>update({accountType:e.target.value})}><option value="">Seleccionar</option><option>Ahorros</option><option>Corriente</option></select></label>
        <label className="wide">Número de cuenta<input value={draft.accountNumber} maxLength={20} onChange={e=>update({accountNumber:e.target.value.replace(/\D/g,'')})}/></label>
      </div>:<div className="account-form-grid">
        <label>Provincia<input value={draft.province} placeholder="Escribe para buscar" onChange={e=>update({province:e.target.value})}/></label>
        <label>Ciudad<input value={draft.city} placeholder="Escribe para buscar" onChange={e=>update({city:e.target.value})}/></label>
        <label className="wide">Dirección <span>Obligatorio</span><input value={draft.address} maxLength={50} onChange={e=>update({address:e.target.value})}/></label>
        <label>Teléfono Celular <span>Obligatorio</span><input value={draft.mobilePhone} maxLength={10} onChange={e=>update({mobilePhone:e.target.value.replace(/\D/g,'')})}/></label>
        <label>Teléfono Adicional<input value={draft.additionalPhone} maxLength={10} onChange={e=>update({additionalPhone:e.target.value.replace(/\D/g,'')})}/></label>
        <label className="wide">Correo Electrónico <span>Obligatorio</span><input type="email" value={draft.email} maxLength={25} onChange={e=>update({email:e.target.value})}/></label>
      </div>}
    </div><footer><button type="button" className="account-secondary" onClick={onClose}>Cancelar</button><button className="primary-action"><Check/>Guardar información</button></footer>
  </form></Modal>
}

function PasswordDialog({onClose,onSave}:{onClose:()=>void;onSave:()=>void}){
  const [current,setCurrent]=useState('');const [next,setNext]=useState('');const [confirmation,setConfirmation]=useState('');const [error,setError]=useState('')
  const submit=(event:FormEvent)=>{event.preventDefault();if(!current||next.length<8){setError('Ingresa la contraseña actual y una nueva contraseña de mínimo 8 caracteres.');return}if(next!==confirmation){setError('La confirmación no coincide con la nueva contraseña.');return}localStorage.setItem('saga.currentUser.passwordChangedAt',new Date().toISOString());onSave()}
  return <Modal title="Cambiar Contraseña" description="Actualiza la contraseña utilizada para ingresar a la plataforma." onClose={onClose}><form className="password-form" onSubmit={submit}>{error&&<div className="account-error">{error}</div>}<div className="account-form-grid">
    <label className="wide">Contraseña actual <span>Obligatorio</span><input type="password" value={current} onChange={e=>{setCurrent(e.target.value);setError('')}} autoComplete="current-password"/></label>
    <label>Nueva contraseña <span>Obligatorio</span><input type="password" value={next} minLength={8} onChange={e=>{setNext(e.target.value);setError('')}} autoComplete="new-password"/></label>
    <label>Confirmar contraseña <span>Obligatorio</span><input type="password" value={confirmation} minLength={8} onChange={e=>{setConfirmation(e.target.value);setError('')}} autoComplete="new-password"/></label>
  </div><footer><button type="button" className="account-secondary" onClick={onClose}>Cancelar</button><button className="primary-action"><Check/>Guardar contraseña</button></footer></form></Modal>
}
