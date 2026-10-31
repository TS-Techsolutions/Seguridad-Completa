import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity, Archive, ArrowRight, Bell, BookOpen, BriefcaseBusiness, Building2, ChevronDown, ChevronRight, CircleDollarSign,
  AlertTriangle, Database, FileCheck2, FileText, Filter, Landmark, LayoutGrid, LockKeyhole, Mail, Menu, PanelLeftClose, PanelLeftOpen, Pencil,
  Plus, RefreshCw, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Star, Trash2, UserRound, X
} from 'lucide-react'
import { api } from './api'
import { activeCompanyStorageKey } from './api'
import type { Catalog, MenuNode, PlatformCompany, RecordItem, ScreenSpec } from './types'
import { SecurityConfigurationPage } from './SecurityConfiguration'
import { SidebarUserAccount } from './UserAccount'
import { PersonalInformationPage } from './PersonalInformationComplete'
import { HumanTalentPage } from './HumanTalent'
import { SectionPage } from './SectionPage'
import { PropertyDetailPageV2 } from './PropertyDetailPageV2'
import { PropertyOwnerSummaryPage } from './PropertyOwnerSummaryPage'
import { PropertyOwnerHistoryPage } from './PropertyOwnerHistoryPage'
import { CustomerRegistryPage, ProviderRegistryPage } from './CustomerRegistryPage'
import { SupplierGroupPage } from './SupplierGroupPage'
import { RecipientConfigurationPage } from './RecipientConfigurationPage'
import { EmailCenterPage } from './EmailCenterPage'
import { BulletinPage } from './BulletinPage'
import { EmailTemplatePage } from './OrdinaryExpenseEmailTemplatePage'
import { ExpenseEmailSendingPage } from './ExpenseEmailSendingPage'
import { AccountPlanMigrationPage } from './AccountPlanMigrationPage'
import { AutomaticExpenseGenerationPage } from './AutomaticExpenseGenerationPage'
import { IndividualExpenseGenerationPage } from './IndividualExpenseGenerationPage'
import { ExpenseGeneralConsultationPage } from './ExpenseGeneralConsultationPage'
import { MassExpenseVoidPage } from './MassExpenseVoidPage'
import { AccountPlanPage } from './AccountPlanPage'
import { AccountingAccountAssignmentPage } from './AccountingAccountAssignmentPage'
import { ExpenseDesignPage } from './ExpenseDesignPage'
import { ExpensePdfPreviewPage } from './ExpensePdfPreviewPage'
import { ExpenseItemsPage } from './ExpenseItemsPage'
import { WaterMeterReadingPage } from './WaterMeterReadingPage'
import { AutomaticWaterExpenseGenerationPage } from './AutomaticWaterExpenseGenerationPage'
import { PreExpenseGenerationPage } from './PreExpenseGenerationPage'
import { PreExpensePrintPage } from './PreExpensePrintPage'
import { ContactImportPage } from './ContactImportPage'
import { AccountingClosurePage } from './AccountingClosurePage'
import { AccountingVoucherPage } from './AccountingVoucherPage'
import { StructureTypesPage } from './StructureTypesPage'
import { PropertyImportPage } from './PropertyImportPage'
import { ScreenWorkspace } from './ScreenWorkspace'
import { PlatformAdminPage } from './PlatformAdminPage'
import { CompanySwitcher } from './CompanySwitcher'
import { companySettingsChangedEvent, readCompanyBillingType, readCompanyBillsWater, type CompanyBillingType } from './operation-date-rules'
import { propertyStructuresStorageKey, readStructureTypes, selectedStructureTypeStorageKey, structureTypesChangedEvent, type StructureTypeRecord } from './structure-types'

const rootIcons:Record<string,typeof Archive>={
  'Administración Inmuebles':Building2,
  Email:Mail,
  CxC:CircleDollarSign,
  CxP:FileText,
  Contabilidad:BookOpen,
  'Caja Chica':Archive,
  Bancos:Landmark,
  Tributación:FileCheck2,
  'Talento Humano':BriefcaseBusiness,
  'Información Personal':UserRound,
  'Configuración General':Settings2,
}
const statusLabel:Record<string,string>={ACTIVE:'Activo',PENDING:'Pendiente',APPROVED:'Aprobado',DRAFT:'Borrador',POSTED:'Publicado',INACTIVE:'Inactivo',REVERSED:'Reversado',CONFIRMED:'Confirmado',IN_REVIEW:'En revisión'}
const legacyFavoritesKey='saga.favoriteScreens'
const workspaceTabsKey='saga.workspaceTabs'
const sidebarCollapsedKey='saga.sidebarCollapsed'
const maximumWorkspaceTabs=12
const hiddenScreenIds=new Set(['XLS-002','XLS-100'])
const structureScreenTitle='Definición de Estructura'
const ownerSummaryScreenTitle='Resumen de Propietarios'
const waterMeterReadingScreenId='AI-EXP-010'
const automaticWaterExpenseScreenId='AI-EXP-011'
const waterConditionalScreenIds=new Set([waterMeterReadingScreenId,automaticWaterExpenseScreenId])
const vatConfigurationScreen:ScreenSpec={
  id:'AI-CFG-IVA-001',
  titulo_original:'Configuración IVA',
  texto_original:'Configuración IVA',
  ruta_original:'Contabilidad > Financiero > Configuración > Configuración IVA',
  ruta_react:'/contabilidad/financiero/configuracion/configuracion-iva',
  objetivo:'',diseno_visible:'',filtros_campos:[],columnas:[],acciones:[],pasos_proceso:[],validaciones:[],
  paquete:'ACCOUNTING_CORE',modulo:'Contabilidad',impacto_datos_contables:'',pruebas_ids:[],
}
const accountingAccountAssignmentScreen:ScreenSpec={
  id:'AI-CFG-ACCOUNTS-001',
  titulo_original:'Asignación de Cuentas Contables',
  texto_original:'Asignación de Cuentas Contables',
  ruta_original:'Contabilidad > Financiero > Configuración > Asignación de Cuentas Contables',
  ruta_react:'/contabilidad/financiero/configuracion/asignacion-de-cuentas-contables',
  objetivo:'Asignar las cuentas auxiliares que utilizarán los procesos contables de la compañía.',
  diseno_visible:'',filtros_campos:[],columnas:['Tipo de configuración','Cuenta contable'],acciones:[],pasos_proceso:[],validaciones:[],
  paquete:'ACCOUNTING_CORE',modulo:'Contabilidad',impacto_datos_contables:'Configuración de las cuentas auxiliares utilizadas por los procesos de cartera.',pruebas_ids:[],
}
const structureTypesScreen:ScreenSpec={
  id:'AI-CFG-STRUCTURE-TYPES-001',
  titulo_original:'Tipos de Estructura',
  texto_original:'Tipos de Estructura',
  ruta_original:'Configuración General > Tipos de Estructura',
  ruta_react:'/configuracion-general/tipos-de-estructura',
  objetivo:'',diseno_visible:'',filtros_campos:[],columnas:['Tipo','Estado'],acciones:[],pasos_proceso:[],validaciones:[],
  paquete:'SECURITY',modulo:'Configuración General',impacto_datos_contables:'',pruebas_ids:[],
}
const waterExpenseEmailTemplateScreen:ScreenSpec={
  id:'AI-EMAIL-WATER-001',
  titulo_original:'Modificar Email Exp. Agua',
  texto_original:'Modificar Email Exp. Agua',
  ruta_original:'Email > Modificar Email Exp. Agua',
  ruta_react:'/email/modificar-email-exp-agua',
  objetivo:'Configurar el asunto, cuerpo y correos de copia de la plantilla utilizada para enviar expensas de agua.',
  diseno_visible:'',filtros_campos:[],columnas:[],acciones:[],pasos_proceso:[],validaciones:[],
  paquete:'PROPERTY_MANAGEMENT',modulo:'Email',impacto_datos_contables:'',pruebas_ids:[],
}
type PropertyAdditionScreen={label:string;slug:string;id?:string}
type PropertyAdditionGroup={label:string;slug:string;order:number;prefix:string;screens:PropertyAdditionScreen[]}
const propertyAdministrationAdditions:PropertyAdditionGroup[]=[
  {label:'Expensas',slug:'expensas',order:10.25,prefix:'AI-EXP',screens:[
    {id:'AI-EXP-001',label:'Generación Automática Ordinarias',slug:'generacion-automatica'},
    {id:'AI-EXP-008',label:'Generación Automática Extraordinarias',slug:'generacion-automatica-extraordinarias'},
    {id:'AI-EXP-002',label:'Generación Individual',slug:'generacion-individual'},
    {id:waterMeterReadingScreenId,label:'Registro de Lectura Agua',slug:'registro-de-lectura-agua'},
    {id:automaticWaterExpenseScreenId,label:'Generación Automática Agua',slug:'generacion-automatica-agua'},
    {id:'AI-EXP-004',label:'Envío Email',slug:'envio-email'},
    {id:'AI-EXP-005',label:'Consulta General',slug:'consulta-general'},
    {id:'AI-EXP-006',label:'Generación de Pre-Expensas',slug:'generacion-de-pre-expensas'},
    {id:'AI-EXP-007',label:'Diseño de Expensas',slug:'diseno-de-expensas'},
    {id:'AI-EXP-009',label:'Anulación Masiva de Expensas',slug:'anulacion-masiva-de-expensas'},
  ]},
  {label:'Facturas',slug:'facturas',order:10.5,prefix:'AI-FAC',screens:[
    {label:'Generación Automática',slug:'generacion-automatica'},
    {label:'Autorización Masiva',slug:'autorizacion-masiva'},
    {label:'Consulta General',slug:'consulta-general'},
    {label:'Generación Pre-Facturas',slug:'generacion-pre-facturas'},
  ]},
]

function customizeCatalog(data:Catalog):Catalog{
  const cxpNode=data.menu.find(node=>node.level===0&&node.label==='CxP')
  const pettyCashNode=data.menu.find(node=>node.level===0&&node.label==='Caja Chica')
  const advancesNode=data.menu.find(node=>node.parent_id===cxpNode?.node_id&&node.label==='Anticipos')
  const propertyRoot=data.menu.find(node=>node.level===0&&node.label==='Administración Inmuebles')
  const accountingNode=data.menu.find(node=>node.level===0&&node.label==='Contabilidad')
  const taxationNode=data.menu.find(node=>node.level===0&&node.label==='Tributación')
  const financialConfigurationNode=data.menu.find(node=>node.type==='group'&&node.breadcrumb.join(' > ')==='Contabilidad > Financiero > Configuración')
  const generalConfigurationNode=data.menu.find(node=>node.level===0&&node.label==='Configuración General')
  const emailNode=data.menu.find(node=>node.level===0&&node.label==='Email')
  const extraordinaryExpenseEmailNode=data.menu.find(node=>node.parent_id===emailNode?.node_id&&node.screen_id==='XLS-013')
  const companyNode=data.menu.find(node=>node.parent_id===generalConfigurationNode?.node_id&&node.screen_id==='SEC-004')
  const permissionsNode=data.menu.find(node=>node.parent_id===generalConfigurationNode?.node_id&&node.screen_id==='SEC-003')
  const firstConfigurationOrder=generalConfigurationNode?Math.min(...data.menu.filter(node=>node.parent_id===generalConfigurationNode.node_id).map(node=>node.order))-1:0
  const taxationOrder=accountingNode?Math.max(0,...data.menu.filter(node=>node.parent_id===accountingNode.node_id).map(node=>node.order))+1:0
  const financialConfigurationChildren=financialConfigurationNode?data.menu.filter(node=>node.parent_id===financialConfigurationNode.node_id):[]
  const firstFinancialConfigurationOrder=financialConfigurationChildren.length?Math.min(...financialConfigurationChildren.map(node=>node.order))-2:0
  const additionalScreens:ScreenSpec[]=propertyAdministrationAdditions.flatMap(group=>group.screens.map((item,index)=>({
    id:item.id??`${group.prefix}-${String(index+1).padStart(3,'0')}`,
    titulo_original:item.label,
    texto_original:item.label,
    ruta_original:`Administración Inmuebles > ${group.label} > ${item.label}`,
    ruta_react:`/administracion-inmuebles/${group.slug}/${item.slug}`,
    objetivo:'',diseno_visible:'',filtros_campos:[],columnas:[],acciones:[],pasos_proceso:[],validaciones:[],
    paquete:'PROPERTY_MANAGEMENT',modulo:'Administración Inmuebles',impacto_datos_contables:'',pruebas_ids:[],
  })))
  const additionalMenu:MenuNode[]=propertyRoot?propertyAdministrationAdditions.flatMap(group=>{
    const groupId=`CUSTOM-${group.prefix}`
    return [{node_id:groupId,label:group.label,level:1,parent_id:propertyRoot.node_id,order:group.order,breadcrumb:['Administración Inmuebles',group.label],type:'group' as const,screen_id:null,route:null,package:'PROPERTY_MANAGEMENT'},...group.screens.map((item,index)=>({node_id:`${groupId}-${index+1}`,label:item.label,level:2,parent_id:groupId,order:index+1,breadcrumb:['Administración Inmuebles',group.label,item.label],type:'screen' as const,screen_id:item.id??`${group.prefix}-${String(index+1).padStart(3,'0')}`,route:`/administracion-inmuebles/${group.slug}/${item.slug}`,package:'PROPERTY_MANAGEMENT'}))]
  }):[]
  const accountingAccountAssignmentMenu:MenuNode[]=financialConfigurationNode?[{
    node_id:'CUSTOM-AI-CFG-ACCOUNTS-001',label:accountingAccountAssignmentScreen.titulo_original,level:financialConfigurationNode.level+1,
    parent_id:financialConfigurationNode.node_id,order:firstFinancialConfigurationOrder,
    breadcrumb:accountingAccountAssignmentScreen.ruta_original.split(' > '),type:'screen',screen_id:accountingAccountAssignmentScreen.id,
    route:accountingAccountAssignmentScreen.ruta_react,package:'ACCOUNTING_CORE',
  }]:[]
  const vatConfigurationMenu:MenuNode[] = financialConfigurationNode?[{
    node_id:'CUSTOM-AI-CFG-IVA-001',label:vatConfigurationScreen.titulo_original,level:financialConfigurationNode.level+1,
    parent_id:financialConfigurationNode.node_id,order:firstFinancialConfigurationOrder+1,
    breadcrumb:vatConfigurationScreen.ruta_original.split(' > '),type:'screen',screen_id:vatConfigurationScreen.id,
    route:vatConfigurationScreen.ruta_react,package:'ACCOUNTING_CORE',
  }]:[]
  const structureTypesMenu:MenuNode[]=generalConfigurationNode?[{
    node_id:'CUSTOM-AI-CFG-STRUCTURE-TYPES-001',label:structureTypesScreen.titulo_original,level:generalConfigurationNode.level+1,
    parent_id:generalConfigurationNode.node_id,order:(permissionsNode?.order??firstConfigurationOrder+3)+.5,
    breadcrumb:structureTypesScreen.ruta_original.split(' > '),type:'screen',screen_id:structureTypesScreen.id,
    route:structureTypesScreen.ruta_react,package:'SECURITY',
  }]:[]
  const waterExpenseEmailTemplateMenu:MenuNode[]=emailNode?[{
    node_id:'CUSTOM-AI-EMAIL-WATER-001',label:waterExpenseEmailTemplateScreen.titulo_original,level:emailNode.level+1,
    parent_id:emailNode.node_id,order:(extraordinaryExpenseEmailNode?.order??emailNode.order)+.5,
    breadcrumb:waterExpenseEmailTemplateScreen.ruta_original.split(' > '),type:'screen',screen_id:waterExpenseEmailTemplateScreen.id,
    route:waterExpenseEmailTemplateScreen.ruta_react,package:'PROPERTY_MANAGEMENT',
  }]:[]
  return {...data,
    screens:[...data.screens.filter(screen=>!hiddenScreenIds.has(screen.id)).map(screen=>{let moved=['XLS-039','XLS-040'].includes(screen.id)?{...screen,modulo:'CxP',ruta_original:`CxP > Caja Chica > ${screen.titulo_original}`}:screen;if(screen.ruta_original.startsWith('Tributación > '))moved={...moved,modulo:'Contabilidad',ruta_original:`Contabilidad > ${screen.ruta_original}`};return moved.id==='XLS-001'?{...moved,titulo_original:structureScreenTitle,texto_original:structureScreenTitle,ruta_original:[...moved.ruta_original.split(' > ').slice(0,-1),structureScreenTitle].join(' > ')}:moved.id==='XLS-006'?{...moved,titulo_original:ownerSummaryScreenTitle,texto_original:ownerSummaryScreenTitle,ruta_original:[...moved.ruta_original.split(' > ').slice(0,-1),ownerSummaryScreenTitle].join(' > ')}:moved}),...additionalScreens,accountingAccountAssignmentScreen,vatConfigurationScreen,structureTypesScreen,waterExpenseEmailTemplateScreen],
    menu:[...data.menu.filter(node=>!node.screen_id||!hiddenScreenIds.has(node.screen_id)).map(node=>{let moved=node;if(companyNode&&node.node_id===companyNode.node_id)moved={...moved,order:firstConfigurationOrder};if(cxpNode&&pettyCashNode&&node.node_id===pettyCashNode.node_id)moved={...node,parent_id:cxpNode.node_id,level:1,order:(advancesNode?.order??71)+.5,breadcrumb:['CxP','Caja Chica']};else if(pettyCashNode&&node.breadcrumb[0]==='Caja Chica')moved={...node,level:node.level+1,breadcrumb:['CxP',...node.breadcrumb]};if(accountingNode&&taxationNode&&node.node_id===taxationNode.node_id)moved={...moved,parent_id:accountingNode.node_id,level:1,order:taxationOrder,breadcrumb:['Contabilidad','Tributación']};else if(taxationNode&&node.breadcrumb[0]==='Tributación')moved={...moved,level:node.level+1,breadcrumb:['Contabilidad',...node.breadcrumb]};return moved.screen_id==='XLS-001'?{...moved,label:structureScreenTitle,breadcrumb:[...moved.breadcrumb.slice(0,-1),structureScreenTitle]}:moved.screen_id==='XLS-006'?{...moved,label:ownerSummaryScreenTitle,breadcrumb:[...moved.breadcrumb.slice(0,-1),ownerSummaryScreenTitle]}:moved}),...additionalMenu,...accountingAccountAssignmentMenu,...vatConfigurationMenu,...structureTypesMenu,...waterExpenseEmailTemplateMenu],
  }
}

function favoriteStorageKey(companyId:string,actorId:string){return `saga.favoriteScreens:${companyId}:${actorId}`}

function readFavorites(key:string){
  try{const stored=JSON.parse(localStorage.getItem(key)??localStorage.getItem(legacyFavoritesKey)??'[]');return Array.isArray(stored)?stored.filter((id):id is string=>typeof id==='string'):[]}
  catch{return []}
}

function applyStoredCompanyTheme(){
  try{const colors=JSON.parse(localStorage.getItem('saga.security.colors')??'{}') as Record<string,string>;const root=document.documentElement;if(/^#[0-9a-f]{6}$/i.test(colors.primary))root.style.setProperty('--blue',colors.primary);if(/^#[0-9a-f]{6}$/i.test(colors['primary-hover']))root.style.setProperty('--blue2',colors['primary-hover']);if(/^#[0-9a-f]{6}$/i.test(colors.sidebar))root.style.setProperty('--navy',colors.sidebar);if(/^#[0-9a-f]{6}$/i.test(colors.text))root.style.setProperty('--ink',colors.text)}catch{/* Mantiene el tema predeterminado. */}
}

function readWorkspaceTabs(){
  try{const stored=JSON.parse(localStorage.getItem(workspaceTabsKey)??'[]');return Array.isArray(stored)?stored.filter((id):id is string=>typeof id==='string').slice(-maximumWorkspaceTabs):[]}
  catch{return []}
}

function readSidebarCollapsed(){return localStorage.getItem(sidebarCollapsedKey)==='true'}

function normalizeMenuSearch(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim()}

export default function App(){
  const catalog=useQuery({queryKey:['catalog'],queryFn:api.catalog,select:customizeCatalog})
  const context=useQuery({queryKey:['context'],queryFn:api.context})
  const companies=useQuery({queryKey:['platform-companies'],queryFn:api.companies,enabled:Boolean(context.data?.actor.platformAdmin||context.data?.actor.groupAdmin)})
  const location=useLocation()
  const navigate=useNavigate()
  const platformActive=location.pathname==='/plataforma/empresas'
  const roots=useMemo(()=>catalog.data?.menu.filter(n=>n.level===0)??[],[catalog.data])
  const currentScreen=catalog.data?.screens.find(s=>s.ruta_react===location.pathname)
  const activeRoot=currentScreen?.ruta_original.split(' > ')[0] ?? (location.pathname==='/'?'Inicio':roots[0]?.label)
  const [menuRoot,setMenuRoot]=useState<string|null>(activeRoot==='Inicio'?null:activeRoot)
  const [mobileOpen,setMobileOpen]=useState(false)
  const [menuCollapsed,setMenuCollapsed]=useState(readSidebarCollapsed)
  const [search,setSearch]=useState('')
  const [favorites,setFavorites]=useState<string[]>([])
  const [favoritesScope,setFavoritesScope]=useState('')
  const [billingType,setBillingType]=useState<CompanyBillingType>(readCompanyBillingType)
  const [billsWater,setBillsWater]=useState(readCompanyBillsWater)
  const [openScreenIds,setOpenScreenIds]=useState<string[]>(readWorkspaceTabs)
  const favoriteIds=useMemo(()=>new Set(favorites),[favorites])
  const openScreens=useMemo(()=>{
    if(!catalog.data)return []
    const ids=currentScreen&&!openScreenIds.includes(currentScreen.id)?[...openScreenIds,currentScreen.id].slice(-maximumWorkspaceTabs):openScreenIds
    return ids.map(id=>catalog.data?.screens.find(screen=>screen.id===id)).filter((screen):screen is ScreenSpec=>Boolean(screen))
  },[catalog.data,currentScreen,openScreenIds])
  const toggleFavorite=(screenId:string)=>setFavorites(current=>current.includes(screenId)?current.filter(id=>id!==screenId):[...current,screenId])
  useEffect(()=>{if(currentScreen)setMenuRoot(currentScreen.ruta_original.split(' > ')[0])},[currentScreen])
  useEffect(()=>{if(currentScreen)setOpenScreenIds(current=>current.includes(currentScreen.id)?current:[...current,currentScreen.id].slice(-maximumWorkspaceTabs))},[currentScreen])
  useEffect(()=>{if(!context.data)return;const key=favoriteStorageKey(context.data.company.id,context.data.actor.id);setFavorites(readFavorites(key));setFavoritesScope(key);applyStoredCompanyTheme()},[context.data?.company.id,context.data?.actor.id])
  useEffect(()=>{if(favoritesScope)localStorage.setItem(favoritesScope,JSON.stringify(favorites))},[favorites,favoritesScope])
  useEffect(()=>{localStorage.setItem(workspaceTabsKey,JSON.stringify(openScreenIds))},[openScreenIds])
  useEffect(()=>{localStorage.setItem(sidebarCollapsedKey,String(menuCollapsed))},[menuCollapsed])
  useEffect(()=>{if(catalog.data)setOpenScreenIds(current=>current.filter(id=>catalog.data?.screens.some(screen=>screen.id===id)).slice(-maximumWorkspaceTabs))},[catalog.data])
  useEffect(()=>{const refresh=(event:Event)=>{const detail=(event as CustomEvent<{billingType?:CompanyBillingType;billsWater?:boolean}>).detail;setBillingType(detail?.billingType??readCompanyBillingType());setBillsWater(typeof detail?.billsWater==='boolean'?detail.billsWater:readCompanyBillsWater())};window.addEventListener(companySettingsChangedEvent,refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener(companySettingsChangedEvent,refresh);window.removeEventListener('storage',refresh)}},[])
  if(catalog.isLoading||context.isLoading)return <Boot/>
  if(catalog.error||!catalog.data||!context.data)return <Fatal/>
  const expensePreviewMatch=location.pathname.match(/^\/vista-previa\/expensas\/([^/]+)$/)
  if(expensePreviewMatch)return <ExpensePdfPreviewPage context={context.data} recordId={decodeURIComponent(expensePreviewMatch[1])}/>
  const preExpensePreviewMatch=location.pathname.match(/^\/vista-previa\/pre-expensas\/([^/]+)(?:\/([^/]+))?$/)
  if(preExpensePreviewMatch)return <PreExpensePrintPage context={context.data} batchId={decodeURIComponent(preExpensePreviewMatch[1])} recordId={preExpensePreviewMatch[2]?decodeURIComponent(preExpensePreviewMatch[2]):undefined}/>
  const searchTerm=normalizeMenuSearch(search)
  const filtered=catalog.data.screens.filter(screen=>(!waterConditionalScreenIds.has(screen.id)||billsWater)&&(!searchTerm||normalizeMenuSearch(`${screen.titulo_original} ${screen.ruta_original}`).includes(searchTerm)))
  const closeWorkspaceTab=(screenId:string)=>{
    const tabIndex=openScreens.findIndex(screen=>screen.id===screenId)
    const nextScreens=openScreens.filter(screen=>screen.id!==screenId)
    setOpenScreenIds(nextScreens.map(screen=>screen.id))
    if(currentScreen?.id===screenId){
      const fallback=nextScreens[Math.max(0,Math.min(tabIndex-1,nextScreens.length-1))]
      navigate(fallback?.ruta_react??'/')
    }
  }
  const switchCompany=(company:PlatformCompany)=>{localStorage.setItem(activeCompanyStorageKey,company.id);window.location.assign('/')}
  return <div className={`workbench ${menuCollapsed?'menu-collapsed':''}`}>
    <aside className={`security-sidebar ${menuCollapsed?'collapsed':''} ${mobileOpen?'mobile-open':''}`} aria-label="Navegación principal">
      <div className="security-brand-bar"><div className="security-brand"><button onClick={()=>{navigate('/');setMobileOpen(false)}} aria-label="Inicio SAGA"><span>SG</span></button><div><strong>SAGA ERP</strong><small>Gestión empresarial</small></div></div><button type="button" className="security-collapse-toggle" onClick={()=>{setMenuCollapsed(current=>!current);setSearch('')}} aria-label={menuCollapsed?'Expandir menú principal':'Colapsar menú principal'} title={menuCollapsed?'Expandir menú':'Colapsar menú'}>{menuCollapsed?<PanelLeftOpen/>:<PanelLeftClose/>}</button></div>
      <button onClick={()=>setMobileOpen(false)} className="mobile-x security-close" aria-label="Cerrar navegación"><X/></button>
      <p className="security-eyebrow">ÁREA DE TRABAJO</p>
      <label className="security-search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar pantalla"/></label>
      <nav className="security-nav" aria-label="Módulos y pantallas">
        {searchTerm?<MenuSearchResults screens={filtered} favorites={favoriteIds} billingType={billingType} onToggleFavorite={toggleFavorite} onNavigate={route=>{navigate(route);setSearch('');setMobileOpen(false)}}/>:<><button className={`security-root ${location.pathname==='/'?'active':''}`} onClick={()=>{navigate('/');setMobileOpen(false)}} aria-label="Inicio" title={menuCollapsed?'Inicio':undefined}><LayoutGrid/><span>Inicio</span></button>
        {(context.data.actor.platformAdmin||context.data.actor.groupAdmin)&&<button className={`security-root ${platformActive?'active':''}`} onClick={()=>{navigate('/plataforma/empresas');setMobileOpen(false);setMenuRoot(null)}} aria-label="Administración de la Plataforma" title={menuCollapsed?'Administración de la Plataforma':undefined}><ShieldCheck/><span>Administración Plataforma</span></button>}
        {roots.map(root=>{const Icon=rootIcons[root.label]??Archive;const rootActive=currentScreen?.ruta_original.split(' > ')[0]===root.label;const expanded=menuRoot===root.label;return <section className={`security-module ${rootActive?'has-active':''}`} key={root.node_id}>
          <button className={`security-root ${rootActive?'active':''}`} onClick={()=>{if(menuCollapsed){setMenuCollapsed(false);setMenuRoot(root.label)}else setMenuRoot(current=>current===root.label?null:root.label)}} aria-expanded={!menuCollapsed&&expanded} title={menuCollapsed?root.label:undefined}><Icon/><span>{root.label}</span><ChevronDown className={expanded?'open':''}/></button>
          {expanded&&!menuCollapsed&&<div className="security-module-list"><MenuTree catalog={catalog.data} root={root.label} filtered={filtered} favorites={favoriteIds} billingType={billingType} onToggleFavorite={toggleFavorite} onNavigate={()=>setMobileOpen(false)}/></div>}
        </section>})}</>}
      </nav>
      <div className="security-footer"><SidebarUserAccount name={context.data.actor.name.split(' ')[0]} role={context.data.actor.platformAdmin?'Superadministrador':context.data.actor.groupAdmin?'Administrador de Grupo':context.data.actor.companyRole}/></div>
    </aside>
    {mobileOpen&&<button className="security-scrim" aria-label="Cerrar navegación" onClick={()=>setMobileOpen(false)}/>} 
    <main className="workspace">
      <header className="workspace-bar">
        <button className="hamburger" onClick={()=>setMobileOpen(true)}><Menu/></button>
        <CompanySwitcher context={context.data} companies={companies.data??[]} onSelect={switchCompany} onAdmin={()=>navigate('/plataforma/empresas')}/>
        <div className="workspace-actions"><div className="period-chip"><i/>Periodo {context.data.company.period} abierto</div><button className="bar-button"><Search/></button><button className="bar-button"><Bell/><b/></button><div className="actor">JM</div></div>
      </header>
      {!platformActive&&<WorkspaceTabs screens={openScreens} activeScreenId={currentScreen?.id} homeActive={location.pathname==='/'} onActivate={route=>navigate(route)} onClose={closeWorkspaceTab}/>}
      <div className="workspace-views">
        {platformActive?<div className="workspace-view"><PlatformAdminPage onOpenCompany={switchCompany} platformAdmin={context.data.actor.platformAdmin}/></div>:<><div className="workspace-view" hidden={location.pathname!=='/'}><OverviewPage catalog={catalog.data} favorites={favoriteIds} billsWater={billsWater} onToggleFavorite={toggleFavorite}/></div>
        {openScreens.map(screen=><div className="workspace-view" key={screen.id} hidden={currentScreen?.id!==screen.id}><ScreenWorkspace screen={screen}>{screen.id.startsWith('SEC-')?<SecurityConfigurationPage screen={screen} catalog={catalog.data}/>:screen.id.startsWith('PI-')?<PersonalInformationPage screen={screen}/>:screen.id.startsWith('HR-')?<HumanTalentPage screen={screen}/>:<ScreenPage screen={screen} billingType={billingType} billsWater={billsWater}/>}</ScreenWorkspace></div>)}
        {location.pathname!=='/'&&!currentScreen&&<div className="workspace-view"><NotFound/></div>}</>}
      </div>
    </main>
  </div>
}

function MenuSearchResults({screens,favorites,billingType,onToggleFavorite,onNavigate}:{screens:ScreenSpec[];favorites:Set<string>;billingType:CompanyBillingType;onToggleFavorite:(screenId:string)=>void;onNavigate:(route:string)=>void}){
  if(!screens.length)return <div className="security-search-empty"><Search/><strong>Sin coincidencias</strong><span>Prueba con otro nombre de pantalla.</span></div>
  return <section className="security-search-results"><header><strong>Resultados</strong><span>{screens.length} {screens.length===1?'pantalla':'pantallas'}</span></header>{screens.map(screen=>{const breadcrumb=screen.ruta_original.split(' > ');const disabled=propertyBillingGroupDisabled(breadcrumb,billingType);const favorite=favorites.has(screen.id);return <div className={`security-search-result ${disabled?'disabled':''}`} key={screen.id}>{disabled?<span className="security-search-result-link"><strong>{screen.titulo_original}</strong><small>{breadcrumb.slice(0,-1).join(' › ')}</small></span>:<button type="button" className="security-search-result-link" onClick={()=>onNavigate(screen.ruta_react)}><strong>{screen.titulo_original}</strong><small>{breadcrumb.slice(0,-1).join(' › ')}</small></button>}<button type="button" className={`favorite-toggle ${favorite?'selected':''}`} disabled={disabled} onClick={()=>onToggleFavorite(screen.id)} aria-label={`${favorite?'Quitar de':'Agregar a'} Pantallas Favoritas: ${screen.titulo_original}`}><Star fill={favorite?'currentColor':'none'}/></button></div>})}</section>
}

function WorkspaceTabs({screens,activeScreenId,homeActive,onActivate,onClose}:{screens:ScreenSpec[];activeScreenId?:string;homeActive:boolean;onActivate:(route:string)=>void;onClose:(screenId:string)=>void}){
  return <nav className="workspace-tabs" aria-label="Ventanas abiertas"><button type="button" className={`workspace-home-tab ${homeActive?'active':''}`} onClick={()=>onActivate('/')} aria-label="Ir a Inicio"><LayoutGrid/><span>Inicio</span></button><div className="workspace-tab-scroll">{screens.map(screen=><div key={screen.id} className={`workspace-tab ${activeScreenId===screen.id?'active':''}`}><button type="button" className="workspace-tab-label" onClick={()=>onActivate(screen.ruta_react)} title={screen.ruta_original}><span>{screen.titulo_original}</span></button><button type="button" className="workspace-tab-close" onClick={()=>onClose(screen.id)} aria-label={`Cerrar ${screen.titulo_original}`} title="Cerrar ventana"><X/></button></div>)}</div><span className="workspace-tab-count">{screens.length}/{maximumWorkspaceTabs}</span></nav>
}

function MenuTree({catalog,root,filtered,favorites,billingType,onToggleFavorite,onNavigate}:{catalog:Catalog;root:string;filtered:ScreenSpec[];favorites:Set<string>;billingType:CompanyBillingType;onToggleFavorite:(screenId:string)=>void;onNavigate?:()=>void}){
  const location=useLocation()
  const screenIds=new Set(filtered.filter(s=>s.ruta_original.startsWith(root)).map(s=>s.id))
  const rootNode=catalog.menu.find(n=>n.level===0&&n.label===root)
  const nodes=catalog.menu.filter(n=>n.breadcrumb[0]===root&&n.level>0)
  const nodeById=new Map(nodes.map(node=>[node.node_id,node]))
  const branchAncestors=(pathname:string)=>{
    const result:string[]=[]
    let current=nodes.find(node=>node.type==='screen'&&node.route===pathname)
    while(current?.parent_id&&current.parent_id!==rootNode?.node_id){result.unshift(current.parent_id);current=nodeById.get(current.parent_id)}
    return result
  }
  const [openNodeIds,setOpenNodeIds]=useState<string[]>(()=>branchAncestors(location.pathname))
  const isDescendant=(candidateId:string,ancestorId:string)=>{
    let current=nodeById.get(candidateId)
    while(current?.parent_id){if(current.parent_id===ancestorId)return true;current=nodeById.get(current.parent_id)}
    return false
  }
  const toggleNode=(node:MenuNode)=>setOpenNodeIds(current=>{
    if(current.includes(node.node_id))return current.filter(id=>id!==node.node_id&&!isDescendant(id,node.node_id))
    const siblingIds=nodes.filter(candidate=>candidate.type!=='screen'&&candidate.parent_id===node.parent_id).map(candidate=>candidate.node_id)
    const withoutSiblingBranches=current.filter(id=>!siblingIds.includes(id)&&!siblingIds.some(siblingId=>isDescendant(id,siblingId)))
    return[...withoutSiblingBranches,node.node_id]
  })
  useEffect(()=>{setOpenNodeIds(branchAncestors(location.pathname))},[location.pathname,root])
  if(!rootNode)return null
  const children=nodes.filter(n=>n.parent_id===rootNode.node_id).sort((a,b)=>a.order-b.order)
  return <>{children.map(node=><MenuNodeBranch key={node.node_id} node={node} nodes={nodes} visibleScreens={screenIds} favorites={favorites} billingType={billingType} openNodeIds={openNodeIds} isDescendant={isDescendant} onToggleNode={toggleNode} onToggleFavorite={onToggleFavorite} onNavigate={onNavigate}/>)}</>
}
function propertyBillingGroupDisabled(breadcrumb:string[],billingType:CompanyBillingType){return breadcrumb[0]==='Administración Inmuebles'&&((breadcrumb[1]==='Facturas'&&billingType==='EXPENSAS')||(breadcrumb[1]==='Expensas'&&billingType==='FACTURACION'))}
function MenuNodeBranch({node,nodes,visibleScreens,favorites,billingType,openNodeIds,isDescendant,onToggleNode,onToggleFavorite,onNavigate}:{node:MenuNode;nodes:MenuNode[];visibleScreens:Set<string>;favorites:Set<string>;billingType:CompanyBillingType;openNodeIds:string[];isDescendant:(candidateId:string,ancestorId:string)=>boolean;onToggleNode:(node:MenuNode)=>void;onToggleFavorite:(screenId:string)=>void;onNavigate?:()=>void}){
  const location=useLocation()
  const children=nodes.filter(child=>child.parent_id===node.node_id).sort((a,b)=>a.order-b.order)
  const descendantScreens=nodes.filter(candidate=>candidate.type==='screen'&&isDescendant(candidate.node_id,node.node_id))
  const hasVisible=node.type==='screen'?Boolean(node.screen_id&&visibleScreens.has(node.screen_id)):descendantScreens.some(candidate=>candidate.screen_id&&visibleScreens.has(candidate.screen_id))
  const open=openNodeIds.includes(node.node_id)
  const disabled=propertyBillingGroupDisabled(node.breadcrumb,billingType)
  if(!hasVisible)return null
  if(node.type==='screen'){
    if(disabled)return <div className="screen-link-row disabled" aria-disabled="true"><span className="screen-link" style={{paddingLeft:`${12+Math.max(0,node.level-1)*18}px`}}>{node.label}</span><LockKeyhole/></div>
    const isFavorite=Boolean(node.screen_id&&favorites.has(node.screen_id))
    const isActive=node.route===location.pathname
    return <div className={`screen-link-row ${isActive?'active':''}`}><NavLink to={node.route!} onClick={onNavigate} aria-label={node.label} style={{paddingLeft:`${12+Math.max(0,node.level-1)*18}px`}} className="screen-link">{node.label}</NavLink><button className={`favorite-toggle ${isFavorite?'selected':''}`} onClick={()=>node.screen_id&&onToggleFavorite(node.screen_id)} aria-label={`${isFavorite?'Quitar de':'Agregar a'} Pantallas Favoritas: ${node.label}`} aria-pressed={isFavorite} title={isFavorite?'Quitar de favoritas':'Agregar a favoritas'}><Star fill={isFavorite?'currentColor':'none'}/></button></div>
  }
  return <section className={`nav-group tree-group ${disabled?'disabled':''}`}><button disabled={disabled} aria-disabled={disabled} title={disabled?`${node.label} está deshabilitado por el Tipo de Cobro de la compañía`:undefined} style={{paddingLeft:`${12+Math.max(0,node.level-1)*18}px`}} onClick={()=>onToggleNode(node)} aria-expanded={disabled?false:open}><span>{node.label}</span>{disabled?<LockKeyhole/>:<ChevronRight className={open?'rotated':''}/>}</button>{!disabled&&open&&<div>{children.map(child=><MenuNodeBranch key={child.node_id} node={child} nodes={nodes} visibleScreens={visibleScreens} favorites={favorites} billingType={billingType} openNodeIds={openNodeIds} isDescendant={isDescendant} onToggleNode={onToggleNode} onToggleFavorite={onToggleFavorite} onNavigate={onNavigate}/>)}</div>}</section>
}

function OverviewPage({catalog,favorites,billsWater,onToggleFavorite}:{catalog:Catalog;favorites:Set<string>;billsWater:boolean;onToggleFavorite:(screenId:string)=>void}){
  const favoriteScreens=catalog.screens.filter(screen=>favorites.has(screen.id)&&(!waterConditionalScreenIds.has(screen.id)||billsWater))
  return <div className="page overview-page">
    <header className="favorites-header"><span className="overline">Inicio</span><h1>Pantallas Favoritas</h1></header>
    <section className="panel favorites-panel"><div className="favorites-panel-head"><div><Star fill="currentColor"/><span><strong>Pantallas Favoritas</strong><small>{favoriteScreens.length} {favoriteScreens.length===1?'pantalla guardada':'pantallas guardadas'}</small></span></div></div>{favoriteScreens.length?<div className="favorites-list">{favoriteScreens.map(screen=><div className="favorite-item" key={screen.id}><NavLink to={screen.ruta_react}><span className="favorite-item-icon"><Star fill="currentColor"/></span><span><small>{screen.modulo}</small><strong>{screen.titulo_original}</strong><em>{screen.ruta_original}</em></span><ArrowRight/></NavLink><button onClick={()=>onToggleFavorite(screen.id)} aria-label={`Quitar de Pantallas Favoritas: ${screen.titulo_original}`} title="Quitar de favoritas"><Star fill="currentColor"/></button></div>)}</div>:<div className="favorites-empty"><Star/><strong>Aún no tienes pantallas favoritas</strong><p>Abre un módulo en el menú y selecciona la estrella de la pantalla que quieras agregar.</p></div>}</section>
  </div>
}

function ScreenPage({screen,billingType,billsWater}:{screen:ScreenSpec;billingType:CompanyBillingType;billsWater:boolean}){
  if((screen.id.startsWith('AI-EXP-')&&billingType==='FACTURACION')||(screen.id.startsWith('AI-FAC-')&&billingType==='EXPENSAS'))return <DisabledBillingModulePage screen={screen} billingType={billingType}/>
  if(waterConditionalScreenIds.has(screen.id)&&!billsWater)return <WaterBillingDisabledPage screen={screen}/>
  return screen.id===accountingAccountAssignmentScreen.id?<AccountingAccountAssignmentPage screen={screen}/>:screen.id==='AI-CFG-IVA-001'?<AddedAccountingConfigurationScreen screen={screen}/>:screen.id===structureTypesScreen.id?<StructureTypesPage screen={screen}/>:screen.id==='AI-EXP-001'?<AutomaticExpenseGenerationPage screen={screen} recurrence="NORMAL"/>:screen.id==='AI-EXP-002'?<IndividualExpenseGenerationPage screen={screen}/>:screen.id==='AI-EXP-008'?<AutomaticExpenseGenerationPage screen={screen} recurrence="EXTRAORDINARIA"/>:screen.id==='AI-EXP-004'?<ExpenseEmailSendingPage screen={screen}/>:screen.id===waterMeterReadingScreenId?<WaterMeterReadingPage screen={screen}/>:screen.id===automaticWaterExpenseScreenId?<AutomaticWaterExpenseGenerationPage screen={screen}/>:screen.id==='AI-EXP-005'?<ExpenseGeneralConsultationPage screen={screen}/>:screen.id==='AI-EXP-006'?<PreExpenseGenerationPage screen={screen} billsWater={billsWater}/>:screen.id==='AI-EXP-007'?<ExpenseDesignPage screen={screen}/>:screen.id==='AI-EXP-009'?<MassExpenseVoidPage screen={screen}/>:screen.id.startsWith('AI-EXP-')||screen.id.startsWith('AI-FAC-')?<AddedPropertyScreen screen={screen}/>:screen.id==='XLS-001'?<PropertyTypePage screen={screen}/>:screen.id==='XLS-003'?<SectionPage screen={screen}/>:screen.id==='XLS-004'?<ExpenseItemsPage screen={screen}/>:screen.id==='XLS-005'?<PropertyDetailPageV2 screen={screen}/>:screen.id==='XLS-006'?<PropertyOwnerSummaryPage screen={screen}/>:screen.id==='XLS-007'?<PropertyImportPage screen={screen}/>:screen.id==='XLS-008'?<PropertyOwnerHistoryPage screen={screen}/>:screen.id==='XLS-009'?<RecipientConfigurationPage screen={screen}/>:screen.id==='XLS-010'?<EmailCenterPage screen={screen}/>:screen.id==='XLS-011'?<BulletinPage screen={screen}/>:['XLS-012','XLS-013','XLS-014','XLS-015',waterExpenseEmailTemplateScreen.id].includes(screen.id)?<EmailTemplatePage key={screen.id} screen={screen}/>:screen.id==='XLS-025'?<AccountPlanPage screen={screen}/>:screen.id==='XLS-026'?<AccountPlanMigrationPage screen={screen}/>:screen.id==='XLS-027'?<AccountingVoucherPage screen={screen}/>:screen.id==='XLS-038'?<AccountingClosurePage screen={screen}/>:screen.id==='XLS-041'?<SupplierGroupPage screen={screen}/>:['XLS-043','XLS-060'].includes(screen.id)?<ContactImportPage screen={screen}/>:screen.id==='XLS-059'?<CustomerRegistryPage screen={screen}/>:screen.id==='XLS-042'?<ProviderRegistryPage screen={screen}/>:<GenericScreenPage screen={screen}/>
}

function DisabledBillingModulePage({screen,billingType}:{screen:ScreenSpec;billingType:CompanyBillingType}){const enabled=billingType==='EXPENSAS'?'Expensas':'Facturas';const disabled=enabled==='Expensas'?'Facturas':'Expensas';return <div className="page screen-page billing-disabled-page"><div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div><section><LockKeyhole/><span>Submódulo deshabilitado</span><h1>{disabled} no está disponible</h1><p>La compañía tiene configurado el Tipo de Cobro <strong>{enabled}</strong>. Para utilizar estas pantallas, cambia el Tipo de Cobro en Configuración General → Compañía.</p></section></div>}

function WaterBillingDisabledPage({screen}:{screen:ScreenSpec}){return <div className="page screen-page billing-disabled-page"><div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div><section><LockKeyhole/><span>Proceso deshabilitado</span><h1>{screen.titulo_original} no está disponible</h1><p>Activa <strong>Se Factura Agua</strong> en Configuración General → Compañía para habilitar esta pantalla.</p></section></div>}

function AddedPropertyScreen({screen}:{screen:ScreenSpec}){
  return <div className="page screen-page"><div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div><section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div></section></div>
}

function AddedAccountingConfigurationScreen({screen}:{screen:ScreenSpec}){
  return <div className="page screen-page"><div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div><section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Núcleo contable</b></div><h1>{screen.titulo_original}</h1></div></section></div>
}

function PropertyTypePage({screen}:{screen:ScreenSpec}){
  type StructureState='ACTIVO'|'INACTIVO'
  type StructureDetail={id:string;description:string;state:StructureState}
  type StructureRow={id:string;description:string;state:StructureState;details:StructureDetail[]}
  type PropertyStructure=Record<string,StructureRow[]>
  type DeleteTarget={kind:'structure';id:string;description:string;detailCount:number}|{kind:'detail';parentId:string;id:string;description:string}
  const readStructures=():PropertyStructure=>{try{const value=JSON.parse(localStorage.getItem(propertyStructuresStorageKey)??'{}');if(!value||typeof value!=='object'||Array.isArray(value))return{};const normalize=(rows:unknown)=>Array.isArray(rows)?rows.map(row=>({...row,details:Array.isArray(row.details)?row.details:[]})) as StructureRow[]:[];return Object.fromEntries(Object.entries(value).map(([key,rows])=>[key,normalize(rows)]))}catch{return{}}}
  const readConfirmedType=(stored:PropertyStructure,types:StructureTypeRecord[]):string|null=>{const configured=Object.entries(stored).find(([,rows])=>rows.length)?.[0];if(configured)return configured;const saved=localStorage.getItem(selectedStructureTypeStorageKey);return saved&&types.some(type=>type.name===saved)?saved:null}
  const initialTypes=readStructureTypes()
  const initialStructures=readStructures()
  const initialConfirmedType=readConfirmedType(initialStructures,initialTypes)
  const [structureTypes,setStructureTypes]=useState<StructureTypeRecord[]>(initialTypes)
  const [structures,setStructures]=useState<PropertyStructure>(initialStructures)
  const [propertyType,setPropertyType]=useState<string|null>(initialConfirmedType)
  const [selectedPropertyType,setSelectedPropertyType]=useState(initialConfirmedType??initialTypes.find(type=>type.state==='ACTIVO')?.name??initialTypes[0]?.name??'')
  const [typeFeedback,setTypeFeedback]=useState('')
  const [typeError,setTypeError]=useState('')
  const [creating,setCreating]=useState(false)
  const [editingId,setEditingId]=useState<string|null>(null)
  const [description,setDescription]=useState('')
  const [state,setState]=useState<StructureRow['state']>('ACTIVO')
  const [error,setError]=useState('')
  const [expandedIds,setExpandedIds]=useState<string[]>([])
  const [detailParentId,setDetailParentId]=useState<string|null>(null)
  const [editingDetailId,setEditingDetailId]=useState<string|null>(null)
  const [detailDescription,setDetailDescription]=useState('')
  const [detailState,setDetailState]=useState<StructureState>('ACTIVO')
  const [detailError,setDetailError]=useState('')
  const [deleteTarget,setDeleteTarget]=useState<DeleteTarget|null>(null)
  useEffect(()=>{const synchronize=()=>{const nextTypes=readStructureTypes();const nextStructures=readStructures();const nextConfirmed=readConfirmedType(nextStructures,nextTypes);setStructureTypes(nextTypes);setStructures(nextStructures);setPropertyType(nextConfirmed);setSelectedPropertyType(nextConfirmed??nextTypes.find(type=>type.state==='ACTIVO')?.name??nextTypes[0]?.name??'')};window.addEventListener(structureTypesChangedEvent,synchronize);return()=>window.removeEventListener(structureTypesChangedEvent,synchronize)},[])
  const configuredType=Object.entries(structures).find(([,rows])=>rows.length)?.[0]??null
  const selectableTypes=useMemo(()=>configuredType&&!structureTypes.some(type=>type.name===configuredType)?[{id:`legacy-${configuredType}`,name:configuredType,state:'ACTIVO' as const},...structureTypes]:structureTypes,[configuredType,structureTypes])
  const selectionPending=propertyType!==selectedPropertyType
  const structureEnabled=Boolean(propertyType)&&!selectionPending
  const persist=(next:PropertyStructure)=>{setStructures(next);localStorage.setItem(propertyStructuresStorageKey,JSON.stringify(next))}
  const confirmPropertyType=()=>{
    if(!selectedPropertyType){setTypeFeedback('');setTypeError('Registra al menos un Tipo de Estructura activo en Configuración General.');return}
    const selectedDefinition=selectableTypes.find(type=>type.name===selectedPropertyType)
    if(selectedDefinition?.state==='INACTIVO'&&configuredType!==selectedPropertyType){setTypeFeedback('');setTypeError(`El tipo ${selectedPropertyType} está inactivo y no puede utilizarse para una nueva estructura.`);return}
    if(configuredType&&configuredType!==selectedPropertyType){setTypeFeedback('');setTypeError(`La estructura ya contiene registros para ${configuredType}. No se puede cambiar a ${selectedPropertyType}.`);return}
    if(!Object.prototype.hasOwnProperty.call(structures,selectedPropertyType))persist({...structures,[selectedPropertyType]:[]})
    localStorage.setItem(selectedStructureTypeStorageKey,selectedPropertyType)
    setPropertyType(selectedPropertyType);setTypeError('');setTypeFeedback(`Tipo ${selectedPropertyType} guardado. Ya puedes registrar la estructura.`);setCreating(false);setEditingId(null);setExpandedIds([]);closeDetail();setError('')
  }
  const saveStructure=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault()
    if(!propertyType||selectionPending){setError('Primero selecciona el Tipo y guárdalo con el botón de refrescar.');return}
    if(!description.trim()){setError('Ingresa una descripción.');return}
    const currentRows=structures[propertyType]??[]
    const rows=editingId
      ?currentRows.map(row=>row.id===editingId?{...row,description:description.trim(),state}:row)
      :[...currentRows,{id:crypto.randomUUID(),description:description.trim(),state,details:[]}]
    const next={...structures,[propertyType]:rows}
    persist(next);setDescription('');setState('ACTIVO');setError('');setCreating(false);setEditingId(null)
  }
  const openDetail=(parentId:string,detail?:StructureDetail)=>{setExpandedIds(current=>current.includes(parentId)?current:[...current,parentId]);setDetailParentId(parentId);setEditingDetailId(detail?.id??null);setDetailDescription(detail?.description??'');setDetailState(detail?.state??'ACTIVO');setDetailError('')}
  const closeDetail=()=>{setDetailParentId(null);setEditingDetailId(null);setDetailDescription('');setDetailState('ACTIVO');setDetailError('')}
  const saveDetail=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault()
    if(!propertyType||selectionPending){setDetailError('Primero confirma el Tipo de estructura.');return}
    if(!detailDescription.trim()){setDetailError('Ingresa una descripción para el nivel.');return}
    const rows=(structures[propertyType]??[]).map(row=>{if(row.id!==detailParentId)return row;const details=editingDetailId?row.details.map(detail=>detail.id===editingDetailId?{...detail,description:detailDescription.trim(),state:detailState}:detail):[...row.details,{id:crypto.randomUUID(),description:detailDescription.trim(),state:detailState}];return{...row,details}})
    persist({...structures,[propertyType]:rows});closeDetail()
  }
  const confirmDelete=()=>{
    if(!deleteTarget||!propertyType)return
    if(deleteTarget.kind==='structure'){
      const rows=(structures[propertyType]??[]).filter(row=>row.id!==deleteTarget.id)
      persist({...structures,[propertyType]:rows})
      setExpandedIds(current=>current.filter(id=>id!==deleteTarget.id))
      if(editingId===deleteTarget.id){setCreating(false);setEditingId(null);setDescription('');setError('')}
      if(detailParentId===deleteTarget.id)closeDetail()
      if(!rows.length)setTypeFeedback(`El tipo ${propertyType} ya no tiene estructuras asociadas. Ahora puedes seleccionar otro Tipo.`)
    }else{
      const rows=(structures[propertyType]??[]).map(row=>row.id===deleteTarget.parentId?{...row,details:row.details.filter(detail=>detail.id!==deleteTarget.id)}:row)
      persist({...structures,[propertyType]:rows})
      if(editingDetailId===deleteTarget.id)closeDetail()
    }
    setDeleteTarget(null);setTypeError('')
  }
  return <div className="page screen-page property-type-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((part,index,all)=><span key={`${part}-${index}`}>{part}{index<all.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>Módulo opcional</b></div><h1>{screen.titulo_original}</h1></div></section>
    <div className="property-type-selector"><span className="property-type-label">Tipo</span><div className="property-type-selector-row"><div className="property-type-options" role="radiogroup" aria-label="Tipo de estructura">{selectableTypes.map(option=>{const disabled=Boolean((configuredType&&configuredType!==option.name)||(option.state==='INACTIVO'&&configuredType!==option.name));return <label key={option.id} className={`${selectedPropertyType===option.name?'selected':''} ${disabled?'disabled':''}`}><input type="radio" name="property-type" value={option.name} checked={selectedPropertyType===option.name} disabled={disabled} onChange={()=>{setSelectedPropertyType(option.name);setTypeFeedback('');setTypeError('');setCreating(false);setEditingId(null);setExpandedIds([]);closeDetail();setError('')}}/><span>{option.name}{option.state==='INACTIVO'?' (Inactivo)':''}</span></label>})}{!selectableTypes.length&&<span className="property-type-no-options">Sin tipos configurados</span>}</div><button type="button" className="property-type-refresh" onClick={confirmPropertyType} disabled={!selectedPropertyType} title="Guardar selección de Tipo" aria-label="Guardar selección de Tipo"><RefreshCw/></button></div>{typeError&&<small className="property-type-feedback error" role="alert">{typeError}</small>}{typeFeedback&&!typeError&&<small className="property-type-feedback success" role="status">{typeFeedback}</small>}</div>
    <section className={`panel property-structure-panel ${structureEnabled?'':'is-disabled'}`}><header><div><h2>Estructura</h2><span>{structureEnabled?propertyType:'Tipo pendiente'}</span></div><button type="button" className="primary-action" disabled={!structureEnabled} title={!structureEnabled?'Confirma el Tipo con el botón de refrescar':undefined} onClick={()=>{if(creating){setCreating(false);setEditingId(null);setDescription('');setState('ACTIVO');setError('')}else{setCreating(true);setEditingId(null);setDescription('');setState('ACTIVO')}}}><Plus/>{creating?'Cerrar':'Crear estructura'}</button></header>
      {!structureEnabled&&<div className="property-type-lock-notice" role="status">Selecciona un <strong>Tipo de Estructura</strong> configurado y presiona el botón de refrescar para habilitar el registro de la estructura.</div>}
      {creating&&structureEnabled&&<form className="property-structure-form" onSubmit={saveStructure}><label>Descripción <span>Obligatorio</span><input value={description} onChange={event=>{setDescription(event.target.value);setError('')}} maxLength={100} autoFocus/>{error&&<small>{error}</small>}</label><label>Estado<select value={state} onChange={event=>setState(event.target.value as StructureRow['state'])}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label><div><button type="button" className="quiet-button" onClick={()=>{setCreating(false);setEditingId(null);setDescription('');setError('')}}>Cancelar</button><button type="submit" className="primary-action">Guardar</button></div></form>}
      <div className="property-structure-table"><table><thead><tr><th aria-label="Acciones"/><th>Descripción</th><th>Estado</th></tr></thead><tbody>{propertyType&&structureEnabled&&structures[propertyType].map(row=><Fragment key={row.id}><tr className="structure-parent-row"><td><div className="structure-row-controls"><button className="structure-expand" title={`${expandedIds.includes(row.id)?'Ocultar':'Mostrar'} niveles de ${row.description}`} aria-label={`${expandedIds.includes(row.id)?'Ocultar':'Mostrar'} niveles de ${row.description}`} aria-expanded={expandedIds.includes(row.id)} onClick={()=>{setExpandedIds(current=>current.includes(row.id)?current.filter(id=>id!==row.id):[...current,row.id]);if(detailParentId===row.id)closeDetail()}}><ChevronRight className={expandedIds.includes(row.id)?'open':''}/></button><button className="row-action" title={`Editar ${row.description}`} aria-label={`Editar ${row.description}`} onClick={()=>{setEditingId(row.id);setDescription(row.description);setState(row.state);setError('');setCreating(true)}}><Pencil/></button><button className="row-action property-delete-action" title={`Eliminar ${row.description}`} aria-label={`Eliminar ${row.description}`} onClick={()=>setDeleteTarget({kind:'structure',id:row.id,description:row.description,detailCount:row.details.length})}><Trash2/></button></div></td><td><strong>{row.description}</strong><small className="structure-detail-count">{row.details.length} {row.details.length===1?'nivel':'niveles'}</small></td><td><Status value={row.state}/></td></tr>{expandedIds.includes(row.id)&&<tr className="structure-detail-row"><td colSpan={3}><section className="structure-detail-panel"><header><div><strong>Detalle de {row.description}</strong><span>Un nivel subordinado</span></div><button className="quiet-button" onClick={()=>openDetail(row.id)}><Plus/>Agregar nivel</button></header>{detailParentId===row.id&&<form className="structure-detail-form" onSubmit={saveDetail}><label>Descripción <span>Obligatorio</span><input autoFocus maxLength={100} value={detailDescription} onChange={event=>{setDetailDescription(event.target.value);setDetailError('')}}/>{detailError&&<small>{detailError}</small>}</label><label>Estado<select value={detailState} onChange={event=>setDetailState(event.target.value as StructureState)}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label><div><button type="button" className="quiet-button" onClick={closeDetail}>Cancelar</button><button className="primary-action">Guardar</button></div></form>}<div className="structure-detail-table"><table><thead><tr><th aria-label="Acciones"/><th>Descripción</th><th>Estado</th></tr></thead><tbody>{row.details.map(detail=><tr key={detail.id}><td><div className="structure-row-controls"><button className="row-action" title={`Editar ${detail.description}`} aria-label={`Editar ${detail.description}`} onClick={()=>openDetail(row.id,detail)}><Pencil/></button><button className="row-action property-delete-action" title={`Eliminar ${detail.description}`} aria-label={`Eliminar ${detail.description}`} onClick={()=>setDeleteTarget({kind:'detail',parentId:row.id,id:detail.id,description:detail.description})}><Trash2/></button></div></td><td>{detail.description}</td><td><Status value={detail.state}/></td></tr>)}{!row.details.length&&<tr><td colSpan={3} className="structure-detail-empty">Aún no existen niveles configurados.</td></tr>}</tbody></table></div></section></td></tr>}</Fragment>)}{(!propertyType||!structureEnabled||!structures[propertyType].length)&&<tr><td colSpan={3}><div className="property-structure-empty"><Building2/><strong>{structureEnabled?'Sin estructuras registradas':'Tipo de estructura pendiente'}</strong><span>{structureEnabled?'Selecciona Crear estructura para agregar la primera.':'Confirma primero el Tipo para habilitar esta sección.'}</span></div></td></tr>}</tbody></table></div>
    </section>
    {deleteTarget&&<div className="property-delete-backdrop" role="alertdialog" aria-modal="true" aria-label="Confirmar eliminación"><section className="property-delete-modal"><span><AlertTriangle/></span><h2>¿Eliminar {deleteTarget.description}?</h2><p>{deleteTarget.kind==='structure'&&deleteTarget.detailCount?`Se eliminará la estructura y sus ${deleteTarget.detailCount} niveles asociados.`:deleteTarget.kind==='structure'?'Se eliminará este registro de la estructura.':'Se eliminará este nivel de la estructura.'}</p><div><button type="button" className="quiet-button" onClick={()=>setDeleteTarget(null)}>Cancelar</button><button type="button" className="property-delete-confirm" onClick={confirmDelete}><Trash2/>Eliminar</button></div></section></div>}
  </div>
}

function GenericScreenPage({screen}:{screen:ScreenSpec}){
  const queryClient=useQueryClient(); const [drawer,setDrawer]=useState(false); const [selected,setSelected]=useState<RecordItem|null>(null); const [tab,setTab]=useState('ATS')
  const records=useQuery({queryKey:['records',screen.id],queryFn:()=>api.records(screen.id)})
  const action=useMutation({mutationFn:({recordId,label}:{recordId:string;label:string})=>api.action(screen.id,recordId,label),onSuccess:()=>queryClient.invalidateQueries({queryKey:['records',screen.id]})})
  const isReport=/Rep\.|Balance|Estado de|Libro Mayor|Análisis|Saldos|Acumulados|Compras Mensuales|Resumen/.test(screen.titulo_original)
  const primary=screen.acciones[0]?.etiqueta??'Crear registro'
  return <div className="page screen-page">
    <div className="breadcrumbs">{screen.ruta_original.split(' > ').map((x,i,a)=><span key={`${x}-${i}`}>{x}{i<a.length-1&&<ChevronRight/>}</span>)}</div>
    <section className="screen-header"><div><div className="screen-id"><span>{screen.id}</span><b>{screen.paquete==='PROPERTY_MANAGEMENT'?'Módulo opcional':'Núcleo contable'}</b></div><h1>{screen.titulo_original}</h1></div><div className="screen-actions"><button className="primary-action" onClick={()=>setDrawer(true)}><Plus/>{primary}</button></div></section>
    {screen.id==='XLS-098'&&<div className="special-tabs"><button className={tab==='ATS'?'active':''} onClick={()=>setTab('ATS')}>ATS <small>Transaccional</small></button><button className={tab==='RDEP'?'active':''} onClick={()=>setTab('RDEP')}>RDEP <small>Dependencia</small></button><span>Procesos, lotes y esquemas separados</span></div>}
    {screen.id==='XLS-079'&&<div className="direction-banner"><div><SlidersHorizontal/><span><strong>Dirección de retención</strong><small>El título original se conserva. Selecciona la perspectiva del reporte.</small></span></div><select><option>Emitidas</option><option>Recibidas</option></select></div>}
    <section className="filter-bar"><label><Search/><input placeholder={`Buscar en ${screen.titulo_original}`}/></label>{screen.filtros_campos.slice(0,3).map(f=><button key={f.nombre}><Filter/>{f.nombre}<ChevronDown/></button>)}<button className="filter-more"><SlidersHorizontal/>Más filtros</button></section>
    <div className="screen-layout"><section className="panel records-panel"><div className="records-head"><div><h2>{isReport?'Resultados del reporte':'Registros'}</h2><span>{records.data?.length??0} resultados · actualización persistente</span></div><button onClick={()=>records.refetch()}><RefreshCw/>Actualizar</button></div>{records.isLoading?<TableSkeleton/>:records.error?<InlineError message={(records.error as Error).message}/>:<RecordsTable screen={screen} records={records.data??[]} onSelect={setSelected} onAction={(r)=>action.mutate({recordId:r.id,label:screen.acciones[0]?.etiqueta??'confirmar'})}/>}</section>
      <aside className="process-aside"><section className="panel process-card"><div className="process-card-head"><Sparkles/><div><span>Flujo contractual</span><strong>{screen.pasos_proceso.length} pasos definidos</strong></div></div><ol>{screen.pasos_proceso.slice(0,5).map((step,i)=><li key={step}><span>{i+1}</span><p>{step}</p></li>)}</ol></section><section className="panel integrity-card"><strong>Impacto e integridad</strong><p>{screen.impacto_datos_contables}</p><div><ShieldCheck/><span>{screen.validaciones.length} validaciones</span></div><div><FileCheck2/><span>{screen.pruebas_ids.length} pruebas trazadas</span></div></section></aside>
    </div>
    {drawer&&<RecordDrawer screen={screen} onClose={()=>setDrawer(false)} onDone={()=>{setDrawer(false);queryClient.invalidateQueries({queryKey:['records',screen.id]})}}/>}
    {selected&&<DetailDrawer screen={screen} record={selected} onClose={()=>setSelected(null)}/>} 
  </div>
}

function RecordsTable({screen,records,onSelect,onAction}:{screen:ScreenSpec;records:RecordItem[];onSelect:(r:RecordItem)=>void;onAction:(r:RecordItem)=>void}){
  const cols=screen.columnas.slice(0,5)
  return <div className="table-scroll"><table><thead><tr><th aria-label="Editar"/><th>Referencia</th>{cols.map(c=><th key={c}>{c}</th>)}<th>Estado</th></tr></thead><tbody>{records.map(r=><tr key={r.id} onClick={()=>onSelect(r)}><td><button className="row-action" title={`Editar ${r.reference}`} aria-label={`Editar ${r.reference}`} onClick={e=>{e.stopPropagation();onAction(r)}}><Pencil/></button></td><td><strong>{r.reference}</strong><small>v{r.version}</small></td>{cols.map(c=><td key={c}>{r.payload[c]??'—'}</td>)}<td><Status value={r.status}/></td></tr>)}</tbody></table></div>
}
function RecordDrawer({screen,onClose,onDone}:{screen:ScreenSpec;onClose:()=>void;onDone:()=>void}){
  const fields=screen.filtros_campos.filter(f=>f.obligatorio).slice(0,6); const [values,setValues]=useState<Record<string,string>>({}); const mutation=useMutation({mutationFn:()=>api.createRecord(screen.id,values),onSuccess:onDone})
  return <div className="drawer-backdrop"><aside className="drawer"><header><div><span>Nuevo registro · {screen.titulo_original}</span><h2>{screen.acciones[0]?.etiqueta??screen.titulo_original}</h2></div><button onClick={onClose}><X/></button></header><div className="drawer-body"><div className="context-note"><ShieldCheck/><p>La operación se guardará en el entorno local, con idempotencia y evento de auditoría.</p></div>{fields.map(field=><label key={field.nombre}><span>{field.nombre}{field.obligatorio&&<b>*</b>}</span>{field.tipo==='selector'?<select value={values[field.nombre]??''} onChange={e=>setValues({...values,[field.nombre]:e.target.value})}><option value="">Seleccionar</option><option>Activo</option><option>Validación</option><option>Empresa autorizada</option></select>:<input value={values[field.nombre]??''} onChange={e=>setValues({...values,[field.nombre]:e.target.value})} placeholder={field.validacion}/>}<small>{field.validacion}</small></label>)}{mutation.error&&<InlineError message={mutation.error.message}/>}</div><footer><button className="quiet-button" onClick={onClose}>Cancelar</button><button className="primary-action" disabled={fields.some(f=>!values[f.nombre])||mutation.isPending} onClick={()=>mutation.mutate()}>{mutation.isPending?'Guardando…':'Guardar borrador'}</button></footer></aside></div>
}
function DetailDrawer({screen:_,record,onClose}:{screen:ScreenSpec;record:RecordItem;onClose:()=>void}){return <div className="drawer-backdrop"><aside className="drawer detail-drawer"><header><div><span>{record.reference}</span><h2>Detalle del registro</h2></div><button onClick={onClose}><X/></button></header><div className="drawer-body"><div className="detail-status"><Status value={record.status}/><span>Versión {record.version}</span></div>{Object.entries(record.payload).map(([k,v])=><div className="detail-row" key={k}><span>{k}</span><strong>{v}</strong></div>)}<section className="audit-box"><Activity/><div><strong>Registro auditable</strong><p>Última actualización: {new Date(record.updated_at).toLocaleString('es-EC')}</p></div></section></div></aside></div>}

function Status({value}:{value:string}){return <span className={`status s-${value.toLowerCase()}`}><i/>{statusLabel[value]??value}</span>}
function TableSkeleton(){return <div className="table-skeleton">{Array.from({length:5}).map((_,i)=><i key={i}/>)}</div>}
function InlineError({message}:{message:string}){return <div className="inline-error"><ShieldCheck/><div><strong>No se pudo completar</strong><span>{message}</span></div></div>}
function NotFound(){return <div className="page"><div className="not-found"><Archive/><h1>Pantalla no encontrada</h1><p>La ruta no pertenece al manifiesto contractual v2.</p><NavLink to="/">Volver al inicio</NavLink></div></div>}
function Boot(){return <div className="boot"><span>SG</span><div><strong>Cargando contratos SAGA</strong><i/></div></div>}
function Fatal(){return <div className="boot"><Database/><div><strong>No se pudo iniciar SAGA</strong><p>Comprueba que la API esté ejecutándose en el puerto 8010.</p></div></div>}
