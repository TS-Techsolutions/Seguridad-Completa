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
export interface Context { company:{id:string;name:string;ruc:string;environment:string;period:string}; modules:Record<string,string>; actor:{name:string;role:string} }
export interface Overview { screenCount:number;rootCount:number;recordCount:number;auditCount:number;roots:Array<{label:string;screens:number}>;recent:Array<{screen_id:string;action:string;occurred_at:string}> }
