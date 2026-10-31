export interface FieldSpec { nombre: string; tipo: string; obligatorio: boolean; validacion: string }
export interface ActionSpec { etiqueta: string; resultado: string; permiso: string }
export interface ScreenSpec {
  id: string; titulo_original: string; texto_original: string; ruta_original: string; ruta_react: string;
  objetivo: string; diseno_visible: string; filtros_campos: FieldSpec[]; columnas: string[];
  acciones: ActionSpec[]; pasos_proceso: string[]; validaciones: string[]; paquete: string; modulo: string;
  impacto_datos_contables: string; pruebas_ids: string[]
}
export interface MenuNode { node_id: string; label: string; level: number; parent_id: string | null; order: number; breadcrumb: string[]; type: 'group'|'screen'; screen_id: string|null; route:string|null; package:string|null }
export interface Catalog { version: string; screens: ScreenSpec[]; menu: MenuNode[]; complementaryCount: number }
export interface RecordItem { id:string; screen_id:string; reference:string; status:string; payload:Record<string,string>; version:number; updated_at:string }
export interface Context {
  company:{id:string;tenant_id:string;tenant_name:string;tenant_plan:string;name:string;legal_name:string;trade_name:string;ruc:string;environment:string;period:string;status:string};
  modules:Record<string,string>;
  actor:{id:string;username:string;name:string;email:string;role:string;companyRole:string;platformAdmin:boolean;groupAdmin:boolean;companyGroups:Array<{id:string;name:string;permissions:string[]}>}
}
export interface Overview { screenCount:number;rootCount:number;recordCount:number;auditCount:number;roots:Array<{label:string;screens:number}>;recent:Array<{screen_id:string;action:string;occurred_at:string}> }

export interface PlatformCompany {
  id:string;tenantId:string;tenantName:string;name:string;legalName:string;tradeName:string;ruc:string;
  plan:'BASE'|'PROFESIONAL'|'COMPLETO';status:'ACTIVE'|'SUSPENDED';environment:string;period:string;
  email:string;operationStartDate:string;createdAt:string;lastAccessAt:string|null;userCount:number;adminName:string;
  groupId:string|null;groupName:string|null
}

export interface PlatformCompanyGroup {
  id:string;name:string;description:string;status:'ACTIVE'|'SUSPENDED';createdAt:string;
  companies:Array<{id:string;name:string;ruc:string;status:'ACTIVE'|'SUSPENDED'}>;
  admins:Array<{id:string;name:string;email:string;username:string;status:'ACTIVE'|'SUSPENDED';permissions:string[]}>
}

export interface PlatformCompanyGroupCreate {
  name:string;description:string;company_ids:string[];admin_name:string;admin_email:string;admin_username:string;
  permissions:Array<'USERS_MANAGE'|'PERMISSIONS_MANAGE'|'ACCESS_MANAGE'>
}

export interface PlatformCompanyCreate {
  tenant_name:string;plan:'BASE'|'PROFESIONAL'|'COMPLETO';legal_name:string;trade_name:string;ruc:string;
  email:string;address:string;phone:string;operation_start_date:string;billing_type:'EXPENSAS'|'FACTURACION';
  generation_type:'CLIENTE'|'INMUEBLE';bills_water:boolean;modules:string[];primary_color:string;sidebar_color:string;
  admin_name:string;admin_email:string;admin_username:string
}
