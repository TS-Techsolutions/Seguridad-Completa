import { Dispatch, FormEvent, MouseEvent as ReactMouseEvent, ReactNode, SetStateAction, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bell,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Database,
  Download,
  Eye,
  EyeOff,
  FileClock,
  FileText,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  type LucideIcon,
  Menu,
  Palette,
  Pencil,
  Play,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  RotateCcw,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react'

type Employee = {
  id: string
  document: string
  documentType?: 'CEDULA' | 'PASAPORTE'
  names?: string
  lastNames?: string
  businessName?: string
  name: string
  role: string
  area: string
  salary: string
  status: 'ACTIVO' | 'INACTIVO'
  startDate: string
  payrollGroupId?: string
}

type PlatformUser = {
  id: string
  username: string
  name: string
  role: string
  email: string
  status: 'ACTIVO' | 'INACTIVO'
  password?: string
}

type PlatformRole = {
  id: string
  name: string
  description: string
  status: 'ACTIVO' | 'INACTIVO'
}

type PermissionAction = 'access' | 'insert' | 'delete' | 'update' | 'export' | 'print'
type PermissionMatrix = Record<string, Partial<Record<PermissionAction, boolean>>>
type RolePermissionMatrices = Record<string, PermissionMatrix>
type CompanyImage = { name: string; dataUrl: string }
type CompanySettings = {
  ruc: string
  name: string
  businessName: string
  address: string
  phone: string
  logo?: CompanyImage
  miniLogo?: CompanyImage
  loginBackground?: CompanyImage
  smtpServer: string
  smtpPort: string
  senderEmail: string
  smtpPassword: string
  from: string
}
type EmailTemplate = { subject: string; body: string }
type EmailTemplates = { passwordRecovery: EmailTemplate; payrollReceipt: EmailTemplate }

type ClientBranch = {
  id: string
  name: string
  province: string
  city: string
  address: string
  contact: string
  phone: string
  gpsLocation: string
  geofenceRadiusMeters?: number
}

type ClientOperationalContract = {
  id: string
  payrollGroupId?: string
  contractName: string
  location: string
  startDate: string
  endDate: string
  contractAdministrator: string
  fixedStaff: number
  positions: number
  fixedSupervisor: boolean
  fixedSupervisorCount: number
  schedules: Record<string, string[]>
  scheduleCycleDays: Record<string, number>
  scheduleCycleRepeats: Record<string, boolean>
  particularRequirements: ClientParticularRequirement[]
}

type ClientParticularRequirement = {
  id: string
  requirement: string
}

type DefinitiveOperationsSchedule = {
  cells: string[]
  cycleDays: number
  repeats: boolean
  updatedAt: string
}

type PersonnelControlRecord = {
  id: string
  date: string
  employeeId: string
  detail: string
  status: 'REGISTRADA' | 'EN_REVISION' | 'ATENDIDA'
}

type ClientSpecificTask = {
  id: string
  clientCode: string
  contractId: string
  taskType: 'ADMINISTRATIVA' | 'SEGURIDAD' | 'SEGUIMIENTO'
  detail: string
  periodicity: 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'
  responsible: 'JEFE_OPERACIONES' | 'SUPERVISOR' | 'GUARDIA'
  requiresPhotoSupport: boolean
  employeeIds: string[]
}

type Client = {
  code: string
  photoUrl: string
  documentType?: 'CEDULA' | 'RUC' | 'PASAPORTE'
  document: string
  institution?: 'PRIVADA' | 'PUBLICA'
  businessName: string
  tradeName?: string
  province?: string
  city?: string
  contact: string
  address?: string
  gpsLocation?: string
  phone: string
  contractStart?: string
  contractEnd?: string
  branches?: ClientBranch[]
  operationalContracts?: ClientOperationalContract[]
  attachedDocuments?: ClientAttachedDocument[]
  attachedPhotos?: ClientAttachedPhoto[]
  available: number
  status: 'ACTIVO' | 'INACTIVO'
}

type DocumentTypeConfiguration = {
  id: string
  name: string
  status: 'ACTIVO' | 'INACTIVO'
  clients: boolean
  employees: boolean
}

type ClientAttachedDocument = {
  id: string
  documentTypeId: string
  documentTypeName: string
  fileName: string
  fileSize: number
  uploadedAt: string
}

type ClientAttachedPhoto = {
  id: string
  documentTypeId: string
  documentTypeName: string
  fileName: string
  fileSize: number
  uploadedAt: string
}

type ClientInvoiceRecord = {
  id: string
  invoiceFileName: string
  detail: string
  date: string
  value: string
  status: 'PENDIENTE' | 'CANCELADO'
  cancellationDate: string
  observation: string
  guardPayment: 'PENDIENTE' | 'CANCELADO'
  supportFileName: string
}

type EmployeeImportRow = {
  id: string
  documentType: 'CEDULA' | 'PASAPORTE' | ''
  identification: string
  names: string
  lastNames: string
  businessName: string
  department: string
  role: string
  salary: string
  entryDate: string
  validationIssues: string[]
}

type ImportedEmployeePackage = { employee: Employee; contract: ContractHistoryLine }
type EmployeeInformationUpload = { id: string; fileName: string; importedAt: string; user: string; status: 'PENDIENTE' | 'PROCESADO' | 'ELIMINADO'; recordCount: number; reviewed: boolean; records: EmployeeImportRow[]; processedEmployeeIds: string[] }

type FamilyDependent = {
  id: string
  fullName: string
  gender: 'MASCULINO' | 'FEMENINO' | 'OTRO'
  relationship: string
  disability: boolean
  birthDate: string
  active: boolean
  inactiveDate: string
}

type EmployeeProfile = {
  birthDate?: string
  gender?: string
  pregnant?: boolean
  estimatedDeliveryDate?: string
  pregnancyRegisteredAt?: string
  maritalStatus?: 'SOLTERO' | 'CASADO' | 'DIVORCIADO' | 'UNION_HECHO' | 'VIUDO'
  partnerId?: string
  partnerName?: string
  partnerPhone?: string
  emergencyContact?: string
  emergencyPhone?: string
  relationship?: string
  bank?: string
  accountType?: string
  accountNumber?: string
  dependents?: FamilyDependent[]
  province?: string
  city?: string
  address?: string
  mobilePhone?: string
  additionalPhone?: string
  email?: string
  photoName?: string
  photoDataUrl?: string
  resumeName?: string
  companyResumeName?: string
  documents?: EmployeeAttachedDocument[]
  bonuses?: FixedBonus[]
}

type EmployeeAttachedDocument = {
  id: string
  documentTypeId: string
  documentTypeName: string
  fileName: string
  fileSize: number
  uploadedAt: string
}

type FixedBonus = {
  id: string
  motive: string
  kind?: 'BONO' | 'DESCUENTO'
  rubricId?: string
  rubricName?: string
  value: string
  status: 'ACTIVO' | 'INACTIVO'
}

type ComplementaryEmployee = {
  id: string
  documentType: 'CEDULA' | 'PASAPORTE'
  identification: string
  names: string
  lastNames: string
  businessName: string
  company: string
  occupation: string
  gender: 'MASCULINO' | 'FEMENINO' | 'OTRO'
  maritalStatus: 'SOLTERO' | 'CASADO' | 'DIVORCIADO' | 'UNION_HECHO' | 'VIUDO'
  workedDays: { id: string; year: string; days: number }[]
  dependents: number
  entryDate: string
  retirementDate: string
  active: boolean
}

type ContractHistoryLine = {
  id: string
  contractNumber: number
  startDate: string
  endDate: string
  exitReason: string
  exitReasonDetail: string
  department: string
  role: string
  salary: string
  payrollGroupId?: string
  intern?: boolean
  spouseExtension?: boolean
  advanceType?: 'PERCENT' | 'AMOUNT'
  advanceValue?: string
  hasDisability?: boolean
  disabilityPercentage?: string
  contractTypeId?: string
  monthlyThirteenth?: boolean
  monthlyFourteenth?: boolean
  monthlyReserveFunds?: boolean
  reserveStartDate?: string
  region?: 'COSTA' | 'SIERRA'
  effectiveDate?: string
}

type HistoricalSalaryRecord = {
  id: string
  period: string
  identification: string
  employeeName: string
  salary: string
  sourceFile: string
  importedAt: string
  uploadId?: string
  validationIssues?: string[]
}

type HistoricalSalaryUpload = { id: string; description: string; fileName: string; importedAt: string; user: string; status: 'PENDIENTE' | 'PROCESADO' | 'ELIMINADO'; recordCount: number; reviewed: boolean; records: HistoricalSalaryRecord[] }

type PayrollEvent = {
  id: string
  employeeId: string
  concept: string
  date: string
  amount: string
  kind: 'INGRESO' | 'DESCUENTO'
  status: 'BORRADOR' | 'APROBADA'
}

type PayrollNovelty = {
  id: string
  employeeId: string
  rubricId: string
  rubricName: string
  status: 'ACTIVA' | 'EN_ESPERA' | 'FINALIZADA'
  applicationForm: 'CUOTAS' | 'TOTAL' | '13ERO' | '14TO' | 'UTILIDADES'
  installments: number
  startPeriod: string
  applicationPeriod: 'QUINCENA' | 'FIN_MES' | 'AMBOS'
  installmentValue: string
  totalValue: string
  paidValue: string
  description: string
  thirdParty: string
  observations: string
}

type DisciplinaryRecord = {
  id: string
  employeeId: string
  type: 'MULTA' | 'FALTA_INJUSTIFICADA'
  date: string
  observation: string
  deductionValue: string
  status: 'NOTIFICADA' | 'IMPUGNADA' | 'EJECUTADA' | 'ANULADA'
  disputeReason?: string
  supportFileName?: string
  supportFileData?: string
}

type PersonalRequest = {
  id: string
  employeeId: string
  type: 'PERMISO' | 'ANTICIPO'
  requestDate: string
  observation: string
  value?: string
  fromDate?: string
  toDate?: string
  applicationForm?: 'CUOTAS' | 'TOTAL'
  installments?: number
  startPeriod?: string
  applicationPeriod?: PayrollNovelty['applicationPeriod']
  status: 'NOTIFICADA' | 'APROBADA' | 'RECHAZADA'
}

type ComplaintRecord = {
  id: string
  employeeId: string
  type: 'QUEJA' | 'RECLAMO'
  date: string
  detail: string
  status: 'NOTIFICADA' | 'ATENDIDA'
  resolution: string
}

type PayrollReceiptRecord = {
  id: string
  employeeId: string
  period: string
  generatedAt: string
}

type AlarmEvent = {
  id: string
  client: string
  guard: string
  activatedAt: string
  status: 'ACTIVE' | 'DEACTIVATED'
  deactivatedAt?: string | null
}

type NoveltyImportRow = {
  id: string
  period: string
  sourceIdentification: string
  sourceBusinessName: string
  employeeId: string
  sourceRubric: string
  rubricId: string
  sourceApplication: string
  applicationForm: PayrollNovelty['applicationForm'] | ''
  sourceValue: string
  value: string
  thirdParty: string
  sourceApplicationPeriod: string
  applicationPeriod: PayrollNovelty['applicationPeriod'] | ''
  observations: string
  validationIssues: string[]
}

type NoveltyUpload = {
  id: string
  description: string
  fileName: string
  uploadedAt: string
  user: string
  status: 'PENDIENTE' | 'PROCESADO' | 'ELIMINADO'
  recordCount: number
  reviewed: boolean
  rows: NoveltyImportRow[]
  processedNoveltyIds: string[]
}

type EmployeeAbsence = {
  id: string
  employeeId: string
  absenceTypeId: string
  absenceTypeName: string
  status: 'ACTIVO' | 'EN_ESPERA'
  startDate: string
  endDate: string
}

type OvertimeRecord = {
  id: string
  batchId: string
  period: string
  payroll: 'QUINCENA' | 'FIN_MES'
  date: string
  employeeId: string
  hours25: string
  hours50: string
  hours100: string
  baseSalary: string
  bonusValue: string
  sourceFile?: string
  importedAt?: string
  uploadId?: string
  uploadDescription?: string
  uploadedBy?: string
  sourcePeriod?: string
  sourceDate?: string
  sourcePayroll?: string
  sourceIdentification?: string
  sourceEmployeeName?: string
  validationIssues?: string[]
}

type OvertimeUploadSummary = { id: string; description: string; fileName: string; importedAt: string; user: string; status?: 'PENDIENTE' | 'PROCESADO' | 'ELIMINADO'; recordCount?: number; reviewed?: boolean; records: OvertimeRecord[] }

type VacationPendingRecord = {
  id: string
  employeeId: string
  sourceIdentification?: string
  sourceEmployeeName?: string
  generationYear: string
  generatedDays: string
  additionalDays: string
  normalPendingDays: string
  additionalPendingDays: string
  totalPendingDays: string
  sourceFile: string
  importedAt: string
  uploadId?: string
  validationIssues?: string[]
}

type VacationPendingUpload = {
  id: string
  description: string
  fileName: string
  uploadedAt: string
  user: string
  status: 'PENDIENTE' | 'PROCESADO' | 'ELIMINADO'
  recordCount: number
  records: VacationPendingRecord[]
}

type VacationMovement = {
  id: string
  type: 'NORMAL' | 'ADICIONAL'
  requestDate: string
  fromDate: string
  toDate: string
  days: number
  settlement: 'GOZADAS' | 'PAGADAS'
  approval?: 'PENDIENTE' | 'APROBADA'
}

type VacationRequestRecord = {
  id: string
  employeeId: string
  vacationPeriod: string
  generatedDays: number
  additionalGeneratedDays: number
  openingNormalPendingDays?: number
  openingAdditionalPendingDays?: number
  createdAt: string
  movements: VacationMovement[]
  liquidationStatus?: 'PENDIENTE' | 'PROCESADA'
  liquidationDate?: string
  totalIncomeSnapshot?: string
  vacationValueSnapshot?: string
  additionalValueSnapshot?: string
}

type CatalogKey = 'departamentos' | 'cargos' | 'rubros' | 'grupos-nomina' | 'tipos-nomina' | 'tipos-contrato' | 'motivos-salida' | 'tipos-parentesco' | 'tipos-ausencia'
type RubricType = 'COMISION_BONO' | 'DESCUENTO'
type CatalogRecord = { id: string; code: string; name: string; description: string; status: 'ACTIVO' | 'INACTIVO'; rubricType?: RubricType; contributesIess?: boolean; thirdPartyName?: string; componentIds?: string[]; receivesThirteenth?: boolean; receivesFourteenth?: boolean; receivesReserveFunds?: boolean; receivesProfits?: boolean }
type Catalogs = Record<CatalogKey, CatalogRecord[]>
type SbuRecord = { id: string; startDate: string; endDate: string; value: string }
type IessPercentageRecord = { id: string; name: string; percentage: string; status: 'ACTIVO' | 'INACTIVO' }
type EmployeeScreenKey = 'informacion' | 'asignacion-empleados' | 'complementarios' | 'modificacion-cargo' | 'modificacion-historial' | 'carga-empleados' | 'carga-sueldos-historicos'
type PersonalInformationScreenKey = 'mi-perfil' | 'mi-horario' | 'novedades' | 'vacaciones' | 'roles-pago' | 'mi-historial'
type PayrollScreenKey = 'novedades' | 'ausencias' | 'carga-novedades' | 'horas-extra' | 'carga-horas-extra'
type VacationScreenKey = 'ingreso-novedades' | 'carga-vacaciones-pendientes' | 'liquidar-vacaciones' | 'reporte-dias-pendientes' | 'reporte-liquidacion'
type LiquidationScreenKey = 'configuracion-planilla' | 'periodos-habilitados' | 'quincena' | 'fin-mes' | 'beneficios-sociales' | 'utilidades'
type PersonnelLiquidationScreenKey = 'calculo-posible' | 'liquidacion-personal'
type PayrollLayoutKey = 'QUINCENA' | 'FIN_MES'
type PayrollPeriodStatus = 'PENDIENTE' | 'ABIERTO' | 'CERRADO'
type FortnightLiquidationSnapshot = { groupId: string; period: string; employeeIds: string[]; generatedAt: string }
type MonthEndLiquidationSnapshot = { groupId: string; period: string; employeeIds: string[]; generatedAt: string }
type SocialBenefitLiquidationSnapshot = { benefitType: '13ERO' | '14TO_COSTA' | '14TO_SIERRA'; year: string; generatedAt: string }
type ProfitLiquidationSnapshot = { year: string; exerciseValue: string; generatedAt: string }
type CargoBenefitKey = 'receivesThirteenth' | 'receivesFourteenth' | 'receivesReserveFunds' | 'receivesProfits'

const defaultSystemColors = {
  canvas: '#f4f7fb', surface: '#ffffff', subtle: '#f8fafc', hover: '#f1f5f9', text: '#0f172a', secondary: '#475569', border: '#cbd5e1', divider: '#e2e8f0', primary: '#1d4ed8', 'primary-hover': '#1e40af', sidebar: '#102a43', 'sidebar-active': '#163f56', success: '#166534', 'success-bg': '#f0fdf4', warning: '#92400e', 'warning-bg': '#fffbeb', danger: '#b91c1c', 'danger-bg': '#fef2f2', 'info-bg': '#eff6ff', simulation: '#6b21a8', 'simulation-bg': '#faf5ff',
} as const

type SystemColorKey = keyof typeof defaultSystemColors
type SystemColors = Record<SystemColorKey, string>

const systemColorGroups: Array<{ title: string; description: string; colors: Array<{ key: SystemColorKey; label: string; usage: string }> }> = [
  { title: 'Superficies y estructura', description: 'Fondos, separadores y estados de interacción de toda la aplicación.', colors: [
    { key: 'canvas', label: 'Fondo general', usage: 'Área de trabajo y fondo de las pantallas' }, { key: 'surface', label: 'Superficie', usage: 'Paneles, tarjetas y formularios' }, { key: 'subtle', label: 'Superficie secundaria', usage: 'Bloques informativos y filas destacadas' }, { key: 'hover', label: 'Interacción', usage: 'Fondo al pasar el cursor' }, { key: 'border', label: 'Borde principal', usage: 'Controles, tarjetas y tablas' }, { key: 'divider', label: 'Divisor', usage: 'Separadores internos y líneas suaves' },
  ] },
  { title: 'Texto y navegación', description: 'Jerarquía tipográfica y colores del menú lateral.', colors: [
    { key: 'text', label: 'Texto principal', usage: 'Títulos, valores y contenido principal' }, { key: 'secondary', label: 'Texto secundario', usage: 'Ayudas, descripciones y metadatos' }, { key: 'sidebar', label: 'Menú lateral', usage: 'Fondo de la navegación principal' }, { key: 'sidebar-active', label: 'Menú activo', usage: 'Opción seleccionada del menú' },
  ] },
  { title: 'Marca y acciones', description: 'Acciones principales, enlaces y estados de énfasis.', colors: [
    { key: 'primary', label: 'Color primario', usage: 'Botones, enlaces y controles activos' }, { key: 'primary-hover', label: 'Primario al interactuar', usage: 'Botones principales al pasar el cursor' }, { key: 'info-bg', label: 'Fondo informativo', usage: 'Avisos, selecciones y resaltados informativos' },
  ] },
  { title: 'Estados del sistema', description: 'Confirmaciones, alertas, errores y entorno de simulación.', colors: [
    { key: 'success', label: 'Éxito', usage: 'Textos e indicadores de confirmación' }, { key: 'success-bg', label: 'Fondo de éxito', usage: 'Avisos y etiquetas satisfactorias' }, { key: 'warning', label: 'Advertencia', usage: 'Textos e indicadores preventivos' }, { key: 'warning-bg', label: 'Fondo de advertencia', usage: 'Avisos que requieren atención' }, { key: 'danger', label: 'Error o peligro', usage: 'Errores y acciones destructivas' }, { key: 'danger-bg', label: 'Fondo de error', usage: 'Mensajes de validación y peligro' }, { key: 'simulation', label: 'Simulación', usage: 'Identificación del entorno de pruebas' }, { key: 'simulation-bg', label: 'Fondo de simulación', usage: 'Etiquetas y avisos del entorno de pruebas' },
  ] },
]

const catalogConfig: Record<CatalogKey, { title: string; singular: string; description: string }> = {
  departamentos: { title: 'Departamentos', singular: 'departamento', description: 'Áreas organizacionales disponibles para asignar a los empleados.' },
  cargos: { title: 'Cargos', singular: 'cargo', description: 'Cargos y funciones que pueden asociarse a una relación laboral.' },
  rubros: { title: 'Rubros', singular: 'rubro', description: 'Conceptos configurables de ingresos, descuentos y provisiones.' },
  'grupos-nomina': { title: 'Grupos de Nómina', singular: 'grupo de nómina', description: 'Agrupaciones utilizadas para organizar períodos y procesos de nómina.' },
  'tipos-nomina': { title: 'Tipos de Nómina', singular: 'tipo de nómina', description: 'Tipos de procesamiento disponibles para los períodos de nómina.' },
  'tipos-contrato': { title: 'Tipos de contratos', singular: 'tipo de contrato', description: 'Modalidades contractuales habilitadas para la empresa.' },
  'motivos-salida': { title: 'Motivos de salida', singular: 'motivo de salida', description: 'Catálogo de causas utilizadas al finalizar una relación laboral.' },
  'tipos-parentesco': { title: 'Tipos de parentesco', singular: 'tipo de parentesco', description: 'Relaciones familiares permitidas para dependientes y cargas.' },
  'tipos-ausencia': { title: 'Tipos de Ausencia', singular: 'tipo de ausencia', description: 'Motivos habilitados para registrar ausencias de los empleados.' },
}

const employeeScreenConfig: Record<EmployeeScreenKey, { title: string; description: string }> = {
  informacion: { title: 'Información del Empleado', description: 'Expedientes, datos laborales y valores vigentes de los empleados propios.' },
  'asignacion-empleados': { title: 'Asignación de Empleados', description: 'Asigna empleados a las posiciones disponibles de los contratos de cada cliente.' },
  complementarios: { title: 'Empleados Complementarios', description: 'Trabajadores de proveedores externos, asignaciones y certificaciones.' },
  'modificacion-cargo': { title: 'Modificación Cargo Empleado', description: 'Registra cambios de cargo con vigencia y trazabilidad.' },
  'modificacion-historial': { title: 'Modificación Historial', description: 'Consulta y corrige datos históricos mediante solicitudes auditables.' },
  'carga-empleados': { title: 'Carga de Información de Empleados', description: 'Valida un archivo antes de incorporar información al maestro de empleados.' },
  'carga-sueldos-historicos': { title: 'Carga de Sueldos Histórico de Empleados', description: 'Importa vigencias salariales anteriores con validación y conciliación.' },
}

const personalInformationScreenConfig: Record<PersonalInformationScreenKey, { title: string; description: string }> = {
  'mi-perfil': { title: 'Mi Perfil', description: 'Consulta y actualiza tu fotografía, datos personales y ubicabilidad.' },
  'mi-horario': { title: 'Mi Horario', description: 'Consulta tu jornada asignada en vistas diaria, semanal o mensual.' },
  novedades: { title: 'Novedades', description: 'Consulta las novedades registradas en tu nómina.' },
  vacaciones: { title: 'Vacaciones', description: 'Consulta saldos, solicitudes y movimientos de vacaciones.' },
  'roles-pago': { title: 'Roles de Pago', description: 'Consulta y descarga tus roles de pago.' },
  'mi-historial': { title: 'Mi Historial', description: 'Consulta tu historial laboral y movimientos registrados.' },
}

const payrollScreenConfig: Record<PayrollScreenKey, { title: string; description: string; path: string }> = {
  novedades: { title: 'Novedades', description: 'Ingresos y descuentos activos o pendientes de aplicación.', path: '/novedades' },
  ausencias: { title: 'Ausencias', description: 'Registro y seguimiento de ausencias del personal.', path: '/nomina/ausencias' },
  'carga-novedades': { title: 'Carga de Novedades', description: 'Importación y validación masiva de novedades.', path: '/nomina/carga-novedades' },
  'horas-extra': { title: 'Horas Extra', description: 'Registro de horas suplementarias y extraordinarias.', path: '/nomina/horas-extra' },
  'carga-horas-extra': { title: 'Carga de Horas Extra', description: 'Importación masiva de horas extra.', path: '/nomina/carga-horas-extra' },
}

const vacationScreenConfig: Record<VacationScreenKey, { title: string; description: string; path: string }> = {
  'ingreso-novedades': { title: 'Registro de Vacaciones', description: 'Solicitudes de vacaciones gozadas y pago de días adicionales por empleado.', path: '/vacaciones/ingreso-novedades' },
  'liquidar-vacaciones': { title: 'Liquidar Vacaciones', description: 'Preparación y cálculo de liquidaciones de vacaciones.', path: '/vacaciones/liquidar-vacaciones' },
  'reporte-dias-pendientes': { title: 'Reporte Días Pendientes', description: 'Consulta de días de vacaciones pendientes por empleado.', path: '/vacaciones/reporte-dias-pendientes' },
  'reporte-liquidacion': { title: 'Reporte Liquidación Vacaciones', description: 'Reporte de liquidaciones de vacaciones procesadas.', path: '/vacaciones/reporte-liquidacion' },
  'carga-vacaciones-pendientes': { title: 'Carga de Vacaciones Pendientes', description: 'Importación y validación de saldos pendientes de vacaciones por empleado.', path: '/vacaciones/carga-vacaciones-pendientes' },
}

const liquidationScreenConfig: Record<LiquidationScreenKey, { title: string; description: string; path: string }> = {
  'configuracion-planilla': { title: 'Configuración Planilla de Rol', description: 'Define la estructura, columnas y conceptos que conforman la planilla de rol.', path: '/liquidacion/configuracion-planilla' },
  'periodos-habilitados': { title: 'Períodos Habilitados', description: 'Administra los períodos disponibles para los procesos de liquidación.', path: '/liquidacion/periodos-habilitados' },
  quincena: { title: 'Liquidación Quincena', description: 'Procesa y revisa la liquidación correspondiente a la quincena.', path: '/liquidacion/quincena' },
  'fin-mes': { title: 'Liquidación Fin de Mes', description: 'Procesa la nómina mensual y revisa los valores calculados por empleado.', path: '/liquidacion/fin-mes' },
  'beneficios-sociales': { title: 'Liquidación Beneficios Sociales', description: 'Gestiona la liquidación de décimos, fondos de reserva y otros beneficios sociales.', path: '/liquidacion/beneficios-sociales' },
  utilidades: { title: 'Liquidación Utilidades', description: 'Prepara y revisa la distribución anual de utilidades.', path: '/liquidacion/utilidades' },
}

const personnelLiquidationScreenConfig: Record<PersonnelLiquidationScreenKey, { title: string; description: string; path: string }> = {
  'calculo-posible': { title: 'Cálculo de Posible Liquidación', description: 'Simula los valores de una posible liquidación laboral.', path: '/liquidacion-personal/calculo-posible' },
  'liquidacion-personal': { title: 'Liquidación de Personal', description: 'Gestiona el cálculo definitivo de la liquidación laboral.', path: '/liquidacion-personal/liquidacion-personal' },
}

// Catálogo territorial basado en el Clasificador Geográfico Estadístico 2025 del INEC.
// Para la selección de ciudad se emplea el nivel cantonal/cabecera de cada provincia.
const ecuadorLocations: Record<string, string[]> = {
  'Azuay': ['Cuenca', 'Girón', 'Gualaceo', 'Nabón', 'Paute', 'Pucará', 'San Fernando', 'Santa Isabel', 'Sígsig', 'Oña', 'Chordeleg', 'El Pan', 'Sevilla de Oro', 'Guachapala', 'Camilo Ponce Enríquez'],
  'Bolívar': ['Guaranda', 'Chillanes', 'Chimbo', 'Echeandía', 'San Miguel', 'Caluma', 'Las Naves'],
  'Cañar': ['Azogues', 'Biblián', 'Cañar', 'La Troncal', 'El Tambo', 'Déleg', 'Suscal'],
  'Carchi': ['Tulcán', 'Bolívar', 'Espejo', 'Mira', 'Montúfar', 'San Pedro de Huaca'],
  'Cotopaxi': ['Latacunga', 'La Maná', 'Pangua', 'Pujilí', 'Salcedo', 'Saquisilí', 'Sigchos'],
  'Chimborazo': ['Riobamba', 'Alausí', 'Colta', 'Chambo', 'Chunchi', 'Guamote', 'Guano', 'Pallatanga', 'Penipe', 'Cumandá'],
  'El Oro': ['Machala', 'Arenillas', 'Atahualpa', 'Balsas', 'Chilla', 'El Guabo', 'Huaquillas', 'Marcabelí', 'Pasaje', 'Piñas', 'Portovelo', 'Santa Rosa', 'Zaruma', 'Las Lajas'],
  'Esmeraldas': ['Esmeraldas', 'Eloy Alfaro', 'Muisne', 'Quinindé', 'San Lorenzo', 'Atacames', 'Río Verde'],
  'Guayas': ['Guayaquil', 'Alfredo Baquerizo Moreno', 'Balao', 'Balzar', 'Colimes', 'Daule', 'Durán', 'El Empalme', 'El Triunfo', 'Milagro', 'Naranjal', 'Naranjito', 'Palestina', 'Pedro Carbo', 'Samborondón', 'Santa Lucía', 'Salitre', 'San Jacinto de Yaguachi', 'Playas', 'Simón Bolívar', 'Coronel Marcelino Maridueña', 'Lomas de Sargentillo', 'Nobol', 'General Antonio Elizalde', 'Isidro Ayora'],
  'Imbabura': ['Ibarra', 'Antonio Ante', 'Cotacachi', 'Otavalo', 'Pimampiro', 'San Miguel de Urcuquí'],
  'Loja': ['Loja', 'Calvas', 'Catamayo', 'Celica', 'Chaguarpamba', 'Espíndola', 'Gonzanamá', 'Macará', 'Paltas', 'Puyango', 'Saraguro', 'Sozoranga', 'Zapotillo', 'Pindal', 'Quilanga', 'Olmedo'],
  'Los Ríos': ['Babahoyo', 'Baba', 'Montalvo', 'Puebloviejo', 'Quevedo', 'Urdaneta', 'Ventanas', 'Vinces', 'Palenque', 'Buena Fe', 'Valencia', 'Mocache', 'Quinsaloma'],
  'Manabí': ['Portoviejo', 'Bolívar', 'Chone', 'El Carmen', 'Flavio Alfaro', 'Jipijapa', 'Junín', 'Manta', 'Montecristi', 'Paján', 'Pichincha', 'Rocafuerte', 'Santa Ana', 'Sucre', 'Tosagua', '24 de Mayo', 'Pedernales', 'Olmedo', 'Puerto López', 'Jama', 'Jaramijó', 'San Vicente'],
  'Morona Santiago': ['Morona', 'Gualaquiza', 'Limón Indanza', 'Palora', 'Santiago', 'Sucúa', 'Huamboya', 'San Juan Bosco', 'Taisha', 'Logroño', 'Pablo Sexto', 'Tiwintza', 'Sevilla Don Bosco'],
  'Napo': ['Tena', 'Archidona', 'El Chaco', 'Quijos', 'Carlos Julio Arosemena Tola'],
  'Pastaza': ['Pastaza', 'Mera', 'Santa Clara', 'Arajuno'],
  'Pichincha': ['Quito', 'Distrito Metropolitano de Quito', 'Cayambe', 'Mejía', 'Pedro Moncayo', 'Rumiñahui', 'San Miguel de los Bancos', 'Pedro Vicente Maldonado', 'Puerto Quito'],
  'Tungurahua': ['Ambato', 'Baños de Agua Santa', 'Cevallos', 'Mocha', 'Patate', 'Quero', 'San Pedro de Pelileo', 'Santiago de Píllaro', 'Tisaleo'],
  'Zamora Chinchipe': ['Zamora', 'Chinchipe', 'Nangaritza', 'Yacuambi', 'Yantzaza', 'El Pangui', 'Centinela del Cóndor', 'Palanda', 'Paquisha'],
  'Galápagos': ['San Cristóbal', 'Isabela', 'Santa Cruz'],
  'Sucumbíos': ['Lago Agrio', 'Gonzalo Pizarro', 'Putumayo', 'Shushufindi', 'Sucumbíos', 'Cascales', 'Cuyabeno'],
  'Orellana': ['Francisco de Orellana', 'Aguarico', 'La Joya de los Sachas', 'Loreto'],
  'Santo Domingo de los Tsáchilas': ['Santo Domingo', 'La Concordia'],
  'Santa Elena': ['Santa Elena', 'La Libertad', 'Salinas'],
}

const ecuadorProvinces = Object.keys(ecuadorLocations)

const initialCatalogs: Catalogs = {
  departamentos: [
    { id: 'DEP-001', code: 'FIN', name: 'Finanzas', description: 'Contabilidad, tesorería y control financiero', status: 'ACTIVO' },
    { id: 'DEP-002', code: 'COM', name: 'Comercial', description: 'Ventas y gestión de clientes', status: 'ACTIVO' },
    { id: 'DEP-003', code: 'OPE', name: 'Operaciones', description: 'Operación y soporte del negocio', status: 'ACTIVO' },
  ],
  cargos: [
    { id: 'CAR-001', code: 'ANF', name: 'Analista financiero', description: 'Análisis y control financiero', status: 'ACTIVO' },
    { id: 'CAR-002', code: 'COC', name: 'Coordinador comercial', description: 'Coordinación del equipo comercial', status: 'ACTIVO' },
    { id: 'CAR-003', code: 'ASO', name: 'Asistente operativo', description: 'Soporte a procesos operativos', status: 'ACTIVO' },
  ],
  rubros: [
    { id: 'RUB-002', code: 'BONO', name: 'Bono de desempeño', description: 'Ingreso variable sujeto a aprobación', status: 'ACTIVO', rubricType: 'COMISION_BONO', contributesIess: false, thirdPartyName: '', componentIds: [] },
    { id: 'RUB-003', code: 'ANTICIPO', name: 'Anticipo autorizado', description: 'Descuento por anticipo registrado', status: 'ACTIVO', rubricType: 'DESCUENTO', contributesIess: false, thirdPartyName: 'Empleado', componentIds: [] },
  ],
  'grupos-nomina': [
    { id: 'GNO-001', code: 'MENSUAL', name: 'Nómina mensual', description: 'Procesamiento ordinario de fin de mes', status: 'ACTIVO' },
    { id: 'GNO-002', code: 'QUINCENAL', name: 'Nómina quincenal', description: 'Procesamiento de anticipos o quincena', status: 'ACTIVO' },
  ],
  'tipos-nomina': [
    { id: 'TNO-001', code: 'Q', name: 'Quincena', description: 'Procesamiento correspondiente a la primera quincena', status: 'ACTIVO' },
    { id: 'TNO-002', code: 'F', name: 'Fin de Mes', description: 'Procesamiento correspondiente al cierre mensual', status: 'ACTIVO' },
  ],
  'tipos-contrato': [
    { id: 'TCO-001', code: 'INDEFINIDO', name: 'Indefinido', description: 'Contrato sin fecha determinada de finalización', status: 'ACTIVO' },
    { id: 'TCO-002', code: 'PLAZO', name: 'Plazo definido', description: 'Contrato con vigencia definida', status: 'ACTIVO' },
  ],
  'motivos-salida': [
    { id: 'MSA-001', code: 'RENUNCIA', name: 'Renuncia voluntaria', description: 'Terminación solicitada por la persona trabajadora', status: 'ACTIVO' },
    { id: 'MSA-002', code: 'ACUERDO', name: 'Acuerdo entre las partes', description: 'Terminación acordada entre empleador y trabajador', status: 'ACTIVO' },
  ],
  'tipos-parentesco': [
    { id: 'PAR-001', code: 'CONYUGE', name: 'Cónyuge', description: 'Cónyuge o pareja registrada', status: 'ACTIVO' },
    { id: 'PAR-002', code: 'HIJO', name: 'Hijo/a', description: 'Hijo, hija o persona dependiente', status: 'ACTIVO' },
    { id: 'PAR-003', code: 'PADRE', name: 'Padre o madre', description: 'Ascendiente declarado', status: 'ACTIVO' },
  ],
  'tipos-ausencia': [
    { id: 'AUS-001', code: 'ENFERMEDAD', name: 'Enfermedad', description: 'Ausencia por enfermedad o atención médica', status: 'ACTIVO' },
    { id: 'AUS-002', code: 'CALAMIDAD', name: 'Calamidad doméstica', description: 'Ausencia autorizada por calamidad doméstica', status: 'ACTIVO' },
    { id: 'AUS-003', code: 'PERMISO', name: 'Permiso personal', description: 'Permiso personal previamente autorizado', status: 'ACTIVO' },
  ],
}

const initialEmployees: Employee[] = [
  { id: 'EMP-001', document: '1712345678', name: 'María Fernanda Ruiz', role: 'Analista financiera', area: 'Finanzas', salary: '1450.00', status: 'ACTIVO', startDate: '2023-04-10', payrollGroupId: 'GNO-001' },
  { id: 'EMP-002', document: '0918765432', name: 'Carlos Andrés Mena', role: 'Coordinador comercial', area: 'Comercial', salary: '1820.00', status: 'ACTIVO', startDate: '2022-08-01', payrollGroupId: 'GNO-001' },
  { id: 'EMP-003', document: '1723456789', name: 'Lucía Valentina Paz', role: 'Diseñadora de producto', area: 'Producto', salary: '1600.00', status: 'ACTIVO', startDate: '2024-01-15', payrollGroupId: 'GNO-001' },
  { id: 'EMP-004', document: '0923456781', name: 'Diego Sebastián León', role: 'Asistente operativo', area: 'Operaciones', salary: '980.00', status: 'ACTIVO', startDate: '2025-02-03', payrollGroupId: 'GNO-002' },
]

const initialPlatformUsers: PlatformUser[] = [
  { id: 'USR-001', username: 'ana.navarro', name: 'Ana Navarro', role: 'Administradora', email: 'ana.navarro@empresa.com', status: 'ACTIVO' },
  { id: 'USR-002', username: 'maria.ruiz', name: 'María Fernanda Ruiz', role: 'Empleado', email: 'maria.ruiz@empresa.com', status: 'ACTIVO' },
  { id: 'USR-003', username: 'carlos.mena', name: 'Carlos Andrés Mena', role: 'Supervisor', email: 'carlos.mena@empresa.com', status: 'ACTIVO' },
  { id: 'USR-004', username: 'lucia.paz', name: 'Lucía Valentina Paz', role: 'Talento Humano', email: 'lucia.paz@empresa.com', status: 'INACTIVO' },
  { id: 'USR-ADMIN', username: 'admin', name: 'Administrador', role: 'Administradora', email: 'admin@empresa.com', status: 'ACTIVO', password: 'admin' },
]

const initialPlatformRoles: PlatformRole[] = [
  { id: 'ROL-001', name: 'Administradora', description: 'Administración general y configuración de la plataforma', status: 'ACTIVO' },
  { id: 'ROL-002', name: 'Supervisor', description: 'Supervisión operativa y aprobación de solicitudes', status: 'ACTIVO' },
  { id: 'ROL-003', name: 'Talento Humano', description: 'Gestión de empleados, novedades y procesos laborales', status: 'ACTIVO' },
  { id: 'ROL-004', name: 'Empleado', description: 'Consulta y gestión de su información personal', status: 'ACTIVO' },
]

const initialCompanySettings: CompanySettings = {
  ruc: '1790012345001',
  name: 'Empresa Demostración',
  businessName: 'Empresa Demostración S.A.',
  address: 'Quito, Ecuador',
  phone: '02 400 0000',
  smtpServer: '',
  smtpPort: '587',
  senderEmail: '',
  smtpPassword: '',
  from: '',
}

const initialEmailTemplates: EmailTemplates = {
  passwordRecovery: {
    subject: 'Código para restablecer su contraseña',
    body: 'Hola {{NOMBRE}},\n\nUtilice el siguiente código de seguridad para restablecer su contraseña:\n\n{{CODIGO}}\n\nEste código es personal y no debe compartirlo con otras personas.',
  },
  payrollReceipt: {
    subject: 'Rol de pago disponible',
    body: 'Hola {{NOMBRE}},\n\nSu rol de pago correspondiente a {{PERIODO}} se encuentra disponible para consulta y descarga en la plataforma.',
  },
}

const initialClients: Client[] = [
  { code: 'CLI-001', photoUrl: '', documentType: 'RUC', document: '1790012345001', institution: 'PRIVADA', businessName: 'Comercial Andina S.A.', tradeName: 'Comercial Andina', province: 'Pichincha', city: 'Quito', contact: 'Carolina Paredes', address: 'Av. Amazonas N34-120', gpsLocation: '', phone: '02 245 8810', contractStart: '01/01/2026', contractEnd: '', branches: [{ id: 'BR-CLI-001-1', name: 'Matriz Quito', province: 'Pichincha', city: 'Quito', address: 'Av. Amazonas N34-120', contact: 'Carolina Paredes', phone: '02 245 8810', gpsLocation: '' }], available: 12, status: 'ACTIVO' },
  { code: 'CLI-002', photoUrl: '', documentType: 'RUC', document: '0992876543001', institution: 'PRIVADA', businessName: 'Distribuidora del Pacífico Cía. Ltda.', tradeName: 'Distribuidora Pacífico', province: 'Guayas', city: 'Guayaquil', contact: 'Miguel Salazar', address: 'Av. Carlos Julio Arosemena km 2', gpsLocation: '', phone: '04 268 1740', contractStart: '15/02/2026', contractEnd: '', branches: [{ id: 'BR-CLI-002-1', name: 'Matriz GYE', province: 'Guayas', city: 'Guayaquil', address: 'Av. Carlos Julio Arosemena km 2', contact: 'Miguel Salazar', phone: '04 268 1740', gpsLocation: '' }], available: 8, status: 'ACTIVO' },
  { code: 'CLI-003', photoUrl: '', documentType: 'RUC', document: '1792456789001', institution: 'PRIVADA', businessName: 'Servicios Integrales Quito S.A.S.', tradeName: 'Servicios Integrales', province: 'Pichincha', city: 'Quito', contact: 'Andrea Viteri', address: 'Av. 6 de Diciembre N21-45', gpsLocation: '', phone: '02 398 4200', contractStart: '01/03/2026', contractEnd: '', branches: [{ id: 'BR-CLI-003-1', name: 'Centro Norte', province: 'Pichincha', city: 'Quito', address: 'Av. 6 de Diciembre N21-45', contact: 'Andrea Viteri', phone: '02 398 4200', gpsLocation: '' }], available: 3, status: 'ACTIVO' },
  { code: 'CLI-004', photoUrl: '', documentType: 'RUC', document: '0991456728001', institution: 'PRIVADA', businessName: 'Logística Costa Azul S.A.', tradeName: 'Costa Azul', province: 'Guayas', city: 'Durán', contact: 'José Cedeño', address: 'Km 4.5 vía Durán-Tambo', gpsLocation: '', phone: '04 239 1055', contractStart: '01/06/2025', contractEnd: '31/12/2026', branches: [{ id: 'BR-CLI-004-1', name: 'Operativo Durán', province: 'Guayas', city: 'Durán', address: 'Km 4.5 vía Durán-Tambo', contact: 'José Cedeño', phone: '04 239 1055', gpsLocation: '' }], available: 0, status: 'INACTIVO' },
]

const initialComplementaryEmployees: ComplementaryEmployee[] = [
  { id: 'COM-001', documentType: 'CEDULA', identification: '1712456789', names: 'Andrea Carolina', lastNames: 'Vega López', businessName: 'Vega López Andrea Carolina', company: 'Servicios Andinos', occupation: 'Administradora', gender: 'FEMENINO', maritalStatus: 'SOLTERO', workedDays: [{ id: 'DAY-COM-001-2026', year: '2026', days: 22 }], dependents: 1, entryDate: '01/09/2026', retirementDate: '', active: true },
  { id: 'COM-002', documentType: 'CEDULA', identification: '0917654321', names: 'José Miguel', lastNames: 'Torres Mora', businessName: 'Torres Mora José Miguel', company: 'Logística Sierra', occupation: 'Operador', gender: 'MASCULINO', maritalStatus: 'CASADO', workedDays: [{ id: 'DAY-COM-002-2026', year: '2026', days: 20 }], dependents: 2, entryDate: '15/08/2026', retirementDate: '', active: true },
]

const initialEvents: PayrollEvent[] = [
  { id: 'NOV-1042', employeeId: 'EMP-001', concept: 'Bono de desempeño', date: '2026-10-05', amount: '120.00', kind: 'INGRESO', status: 'APROBADA' },
  { id: 'NOV-1043', employeeId: 'EMP-002', concept: 'Anticipo autorizado', date: '2026-10-06', amount: '180.00', kind: 'DESCUENTO', status: 'APROBADA' },
  { id: 'NOV-1044', employeeId: 'EMP-003', concept: 'Ajuste de movilización', date: '2026-10-07', amount: '45.00', kind: 'INGRESO', status: 'BORRADOR' },
]

const initialVacationRequests: VacationRequestRecord[] = [
  { id: 'VAC-REG-001', employeeId: 'EMP-001', vacationPeriod: '2025-04/2026-03', generatedDays: 15, additionalGeneratedDays: 0, createdAt: '2026-10-03', movements: [{ id: 'VAC-MOV-001', type: 'NORMAL', requestDate: '03/10/2026', fromDate: '14/10/2026', toDate: '18/10/2026', days: 5, settlement: 'GOZADAS' }] },
  { id: 'VAC-REG-002', employeeId: 'EMP-002', vacationPeriod: '2025-08/2026-07', generatedDays: 15, additionalGeneratedDays: 0, createdAt: '2026-10-02', movements: [{ id: 'VAC-MOV-002', type: 'NORMAL', requestDate: '02/10/2026', fromDate: '01/11/2026', toDate: '15/11/2026', days: 15, settlement: 'GOZADAS' }] },
]

const initialNovelties: PayrollNovelty[] = [
  { id: 'NOM-001', employeeId: 'EMP-001', rubricId: 'RUB-003', rubricName: 'Anticipo autorizado', status: 'ACTIVA', applicationForm: 'CUOTAS', installments: 4, startPeriod: '2026-10', applicationPeriod: 'FIN_MES', installmentValue: '75.00', totalValue: '300.00', paidValue: '75.00', description: 'Anticipo autorizado · 4 cuotas', thirdParty: 'Coop. Empresa', observations: '' },
  { id: 'NOM-002', employeeId: 'EMP-002', rubricId: 'RUB-002', rubricName: 'Bono de desempeño', status: 'EN_ESPERA', applicationForm: 'TOTAL', installments: 1, startPeriod: '2026-10', applicationPeriod: 'QUINCENA', installmentValue: '120.00', totalValue: '120.00', paidValue: '0.00', description: 'Bono de desempeño · Total', thirdParty: '', observations: '' },
  { id: 'NOM-003', employeeId: 'EMP-003', rubricId: 'RUB-003', rubricName: 'Anticipo autorizado', status: 'FINALIZADA', applicationForm: 'CUOTAS', installments: 2, startPeriod: '2026-08', applicationPeriod: 'AMBOS', installmentValue: '50.00', totalValue: '100.00', paidValue: '100.00', description: 'Anticipo autorizado · 2 cuotas', thirdParty: 'Proveedor EC', observations: '' },
  { id: 'NOM-004', employeeId: 'EMP-001', rubricId: 'RUB-002', rubricName: 'Bono de desempeño', status: 'ACTIVA', applicationForm: 'CUOTAS', installments: 3, startPeriod: '2026-10', applicationPeriod: 'AMBOS', installmentValue: '40.00', totalValue: '120.00', paidValue: '0.00', description: 'Bono fijo de desempeño · 3 cuotas', thirdParty: '', observations: '' },
]

const initialDisciplinaryRecords: DisciplinaryRecord[] = [
  { id: 'DISC-001', employeeId: 'EMP-001', type: 'MULTA', date: '2026-10-20', observation: 'Incumplimiento del procedimiento de registro de ingreso.', deductionValue: '25.00', status: 'NOTIFICADA' },
  { id: 'DISC-002', employeeId: 'EMP-002', type: 'FALTA_INJUSTIFICADA', date: '2026-10-18', observation: 'Ausencia no justificada durante la jornada asignada.', deductionValue: '48.50', status: 'IMPUGNADA', disputeReason: 'La ausencia fue informada al supervisor y adjunto el respaldo correspondiente.' },
]

const initialPersonalRequests: PersonalRequest[] = [
  { id: 'SOL-001', employeeId: 'EMP-001', type: 'PERMISO', requestDate: '2026-10-15', observation: 'Permiso para realizar una diligencia personal.', fromDate: '2026-10-24', toDate: '2026-10-24', status: 'APROBADA' },
  { id: 'SOL-002', employeeId: 'EMP-001', type: 'ANTICIPO', requestDate: '2026-10-21', observation: 'Solicitud de anticipo por gastos imprevistos.', value: '150.00', applicationForm: 'CUOTAS', installments: 3, startPeriod: '2026-10', applicationPeriod: 'FIN_MES', status: 'NOTIFICADA' },
]

const initialComplaintRecords: ComplaintRecord[] = [
  { id: 'QYR-001', employeeId: 'EMP-001', type: 'RECLAMO', date: '2026-10-19', detail: 'Solicito revisar la entrega pendiente del uniforme asignado.', status: 'NOTIFICADA', resolution: '' },
  { id: 'QYR-002', employeeId: 'EMP-001', type: 'QUEJA', date: '2026-10-10', detail: 'Inconveniente con el acceso al punto de trabajo durante el turno.', status: 'ATENDIDA', resolution: 'Se coordinó con el cliente la actualización de la autorización de ingreso.' },
]

const initialPayrollReceipts: PayrollReceiptRecord[] = [
  { id: 'ROL-EMP-001-2026-09', employeeId: 'EMP-001', period: '2026-09', generatedAt: '2026-10-05T14:00:00.000Z' },
]

const initialAbsences: EmployeeAbsence[] = [
  { id: 'ABS-001', employeeId: 'EMP-001', absenceTypeId: 'AUS-001', absenceTypeName: 'Enfermedad', status: 'ACTIVO', startDate: '2026-10-06', endDate: '2026-10-07' },
  { id: 'ABS-002', employeeId: 'EMP-003', absenceTypeId: 'AUS-003', absenceTypeName: 'Permiso personal', status: 'EN_ESPERA', startDate: '2026-10-14', endDate: '2026-10-14' },
]

const initialIessPercentages: IessPercentageRecord[] = [
  { id: 'IESS-001', name: 'Aporte personal', percentage: '9.45', status: 'ACTIVO' },
  { id: 'IESS-002', name: 'Aporte patronal', percentage: '11.15', status: 'ACTIVO' },
]

const initialDocumentTypes: DocumentTypeConfiguration[] = [
  { id: 'TDO-001', name: 'Cédula', status: 'ACTIVO', clients: true, employees: true },
  { id: 'TDO-002', name: 'RUC', status: 'ACTIVO', clients: true, employees: false },
  { id: 'TDO-003', name: 'Pasaporte', status: 'ACTIVO', clients: true, employees: true },
]

const fixtureDeductions: Record<string, string> = {
  'EMP-001': '136.00', 'EMP-002': '172.00', 'EMP-003': '151.00', 'EMP-004': '92.00',
}

type NavScreen = { label: string; path: string }
type NavModule = { label: string; path: string; icon: LucideIcon; children: NavScreen[] }
type NavItem = { label: string; path: string; icon: LucideIcon }

const clientScreens: NavScreen[] = [
  { label: 'Clientes', path: '/clientes' },
  { label: 'Estado de Cuentas', path: '/clientes/estado-cuentas' },
]

const operationsScreens: NavScreen[] = [
  { label: 'Tablero de Control Operativo', path: '/operaciones/tablero-control' },
  { label: 'Operaciones de Clientes', path: '/operaciones/clientes' },
]

const humanTalentStandaloneScreens: NavScreen[] = [
  { label: 'Tablero de Control del Personal', path: '/talento-humano/tablero-personal' },
]

const generalConfigurationScreens: NavScreen[] = [
  { label: 'Usuarios', path: '/configuracion-general/usuarios' },
  { label: 'Roles', path: '/configuracion-general/roles' },
  { label: 'Permisos', path: '/configuracion-general/permisos' },
  { label: 'Compañía', path: '/configuracion-general/compania' },
  { label: 'Envío de Correos', path: '/configuracion-general/envio-correos' },
  { label: 'Tipo Documento', path: '/configuracion-general/tipo-documento' },
]

const personalInformationScreens: NavScreen[] = (Object.keys(personalInformationScreenConfig) as PersonalInformationScreenKey[]).map(key => ({ label: personalInformationScreenConfig[key].title, path: `/informacion-personal/${key}` }))

const humanTalentModules: NavModule[] = [
  { label: 'Configuraciones', path: '/general/departamentos', icon: Gauge, children: [...(Object.keys(catalogConfig) as CatalogKey[]).map(key => ({ label: catalogConfig[key].title, path: `/general/${key}` })), { label: 'Salario Básico Unificado', path: '/general/salario-basico-unificado' }, { label: '% IESS', path: '/general/porcentajes-iess' }] },
  { label: 'Empleado', path: '/empleado/informacion', icon: Users, children: (Object.keys(employeeScreenConfig) as EmployeeScreenKey[]).map(key => ({ label: employeeScreenConfig[key].title, path: `/empleado/${key}` })) },
  { label: 'Administrar Nómina', path: '/novedades', icon: CalendarDays, children: (Object.keys(payrollScreenConfig) as PayrollScreenKey[]).map(key => ({ label: payrollScreenConfig[key].title, path: payrollScreenConfig[key].path })) },
  { label: 'Vacaciones', path: '/vacaciones/ingreso-novedades', icon: CalendarDays, children: (Object.keys(vacationScreenConfig) as VacationScreenKey[]).map(key => ({ label: vacationScreenConfig[key].title, path: vacationScreenConfig[key].path })) },
  { label: 'Liquidación de Valores', path: '/liquidacion/configuracion-planilla', icon: Calculator, children: (Object.keys(liquidationScreenConfig) as LiquidationScreenKey[]).map(key => ({ label: liquidationScreenConfig[key].title, path: liquidationScreenConfig[key].path })) },
  { label: 'Liquidación de Personal', path: '/liquidacion-personal/calculo-posible', icon: FileText, children: (Object.keys(personnelLiquidationScreenConfig) as PersonnelLiquidationScreenKey[]).map(key => ({ label: personnelLiquidationScreenConfig[key].title, path: personnelLiquidationScreenConfig[key].path })) },
]

const rootNavigationModuleKeys = ['CLIENTES', 'TALENTO HUMANO', 'OPERACIONES', 'INFORMACIÓN PERSONAL', 'CONFIGURACIÓN GENERAL']
const navigationAccordionKeys = [...rootNavigationModuleKeys, ...humanTalentModules.map(module => module.label)]

type PermissionModuleGroup = { module: string; screens?: NavScreen[]; submodules?: { label: string; screens: NavScreen[] }[] }
const permissionModuleGroups: PermissionModuleGroup[] = [
  { module: 'Principal', screens: [{ label: 'Dashboard', path: '/' }] },
  { module: 'Clientes', screens: clientScreens },
  { module: 'Talento Humano', screens: humanTalentStandaloneScreens, submodules: humanTalentModules.map(module => ({ label: module.label, screens: module.children })) },
  { module: 'Operaciones', screens: operationsScreens },
  { module: 'Información Personal', screens: personalInformationScreens },
  { module: 'Configuración General', screens: generalConfigurationScreens },
]

const permissionActions: { key: PermissionAction; label: string }[] = [
  { key: 'access', label: 'Acceso' },
  { key: 'insert', label: 'Insertar' },
  { key: 'delete', label: 'Borrar' },
  { key: 'update', label: 'Actualizar' },
  { key: 'export', label: 'Exportar' },
  { key: 'print', label: 'Imprimir' },
]

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
]

type ScreenSearchOption = { label: string; path: string; location: string[]; expand: string[] }
type WorkspaceTab = { label: string; path: string }

const screenSearchOptions: ScreenSearchOption[] = [
  { label: 'Dashboard', path: '/', location: ['Dashboard'], expand: [] },
  ...clientScreens.map(screen => ({ label: screen.label, path: screen.path, location: ['Clientes', screen.label], expand: ['CLIENTES'] })),
  ...humanTalentStandaloneScreens.map(screen => ({ label: screen.label, path: screen.path, location: ['Talento Humano', screen.label], expand: ['TALENTO HUMANO'] })),
  ...humanTalentModules.flatMap(module => module.children.map(screen => ({ label: screen.label, path: screen.path, location: ['Talento Humano', module.label, screen.label], expand: ['TALENTO HUMANO', module.label] }))),
  ...operationsScreens.map(screen => ({ label: screen.label, path: screen.path, location: ['Operaciones', screen.label], expand: ['OPERACIONES'] })),
  ...personalInformationScreens.map(screen => ({ label: screen.label, path: screen.path, location: ['Información Personal', screen.label], expand: ['INFORMACIÓN PERSONAL'] })),
  ...generalConfigurationScreens.map(screen => ({ label: screen.label, path: screen.path, location: ['Configuración General', screen.label], expand: ['CONFIGURACIÓN GENERAL'] })),
]

function workspaceTabForPath(path: string): WorkspaceTab {
  const normalizedPath = path === '/operaciones' ? '/operaciones/clientes' : path
  const configuredScreen = screenSearchOptions.find(screen => screen.path === normalizedPath)
  if (configuredScreen) return { label: configuredScreen.label, path: normalizedPath }
  const fallbackLabel = normalizedPath === '/' ? 'Dashboard' : normalizedPath.split('/').filter(Boolean).at(-1)?.replace(/-/g, ' ').replace(/^./, letter => letter.toLocaleUpperCase('es')) ?? 'Pantalla'
  return { label: fallbackLabel, path: normalizedPath }
}

function normalizeScreenSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()
}

function navigationId(label: string) {
  return `nav-${label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`
}

function isHumanTalentPath(path: string) {
  return humanTalentStandaloneScreens.some(screen => screen.path === path) || humanTalentModules.some(module => module.children.some(screen => screen.path === path)) || path === '/empleados' || path === '/liquidacion'
}

function isClientsPath(path: string) {
  return clientScreens.some(screen => screen.path === path)
}

function isOperationsPath(path: string) {
  return path === '/operaciones' || operationsScreens.some(screen => screen.path === path)
}

function isPersonalInformationPath(path: string) {
  return personalInformationScreens.some(screen => screen.path === path)
}

function isGeneralConfigurationPath(path: string) {
  return generalConfigurationScreens.some(screen => screen.path === path) || path === '/configuracion-general/colores-sistema'
}

function isModulePath(module: NavModule, path: string) {
  return module.children.some(screen => screen.path === path) || (module.label === 'Empleado' && path === '/empleados') || (module.label === 'Liquidación de Valores' && path === '/liquidacion')
}

function navigationExpansionForPath(path: string) {
  const expanded = Object.fromEntries(navigationAccordionKeys.map(key => [key, false])) as Record<string, boolean>
  if (isClientsPath(path)) expanded.CLIENTES = true
  else if (isHumanTalentPath(path)) {
    expanded['TALENTO HUMANO'] = true
    const activeModule = humanTalentModules.find(module => isModulePath(module, path))
    if (activeModule) expanded[activeModule.label] = true
  } else if (isOperationsPath(path)) expanded.OPERACIONES = true
  else if (isPersonalInformationPath(path)) expanded['INFORMACIÓN PERSONAL'] = true
  else if (isGeneralConfigurationPath(path)) expanded['CONFIGURACIÓN GENERAL'] = true
  return expanded
}

function decimalToCents(value: string): bigint {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return 0n
  const [whole, fraction = ''] = normalized.split('.')
  return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2))
}

function currentEcuadorYearMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  return { year: Number(parts.find(part => part.type === 'year')?.value), month: Number(parts.find(part => part.type === 'month')?.value) }
}

function centsToDecimal(value: bigint): string {
  const sign = value < 0n ? '-' : ''
  const absolute = value < 0n ? -value : value
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}

function money(value: string | bigint) {
  const cents = typeof value === 'bigint' ? value : decimalToCents(value)
  const absolute = cents < 0n ? -cents : cents
  const whole = absolute / 100n
  const fraction = absolute % 100n
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${cents < 0n ? '−' : ''}USD ${grouped},${fraction.toString().padStart(2, '0')}`
}

type SortDirection = 'asc' | 'desc'

function useSortableRows<T>(rows: T[], accessors: Record<string, (row: T) => string | number | bigint>) {
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(null)
  const sortedRows = useMemo(() => {
    if (!sort || !accessors[sort.key]) return rows
    return [...rows].sort((left, right) => {
      const leftValue = accessors[sort.key](left)
      const rightValue = accessors[sort.key](right)
      let result = 0
      if (typeof leftValue === 'bigint' && typeof rightValue === 'bigint') result = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
      else if (typeof leftValue === 'number' && typeof rightValue === 'number') result = leftValue - rightValue
      else result = String(leftValue).localeCompare(String(rightValue), 'es', { numeric: true, sensitivity: 'base' })
      return sort.direction === 'asc' ? result : -result
    })
  }, [rows, accessors, sort])
  const toggleSort = (key: string) => setSort(current => current?.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' })
  return { sortedRows, sort, toggleSort }
}

function SortableTh({ label, sortKey, sort, onSort, className }: { label: string; sortKey: string; sort: { key: string; direction: SortDirection } | null; onSort: (key: string) => void; className?: string }) {
  const active = sort?.key === sortKey
  return <th className={className} aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="sort-header" onClick={() => onSort(sortKey)} aria-label={`Ordenar por ${label}${active ? `, actualmente ${sort.direction === 'asc' ? 'ascendente' : 'descendente'}` : ''}`}><span>{label}</span>{active ? <ChevronDown size={14} className={`active ${sort.direction}`} /> : <ChevronsUpDown size={14} />}</button></th>
}

function safeFileName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'tabla'
}

function tableData(table: HTMLTableElement) {
  const headerCells = Array.from(table.querySelectorAll('thead th'))
  const includedIndexes = headerCells.map((cell, index) => ({ index, label: cell.textContent?.replace(/\s+/g, ' ').trim() ?? '' })).filter(item => item.label && item.label.toLocaleLowerCase('es') !== 'acción' && item.label.toLocaleLowerCase('es') !== 'editar')
  const headers = includedIndexes.map(item => item.label)
  const rows = Array.from(table.querySelectorAll('tbody tr')).filter(row => !row.querySelector('.empty-state')).map(row => {
    const cells = Array.from(row.children) as HTMLElement[]
    return includedIndexes.map(item => cells[item.index]?.textContent?.replace(/\s+/g, ' ').trim() ?? '')
  })
  const region = table.closest('[aria-label]')?.getAttribute('aria-label')
  const panelTitle = table.closest('.panel, .family-section, .worked-days-section, .installment-preview')?.querySelector('h2, h3')?.textContent?.trim()
  return { headers, rows, title: region || panelTitle || 'Tabla de datos' }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = fileName; document.body.appendChild(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const uploadedFileUrls = new Map<string, string>()
const uploadedFilesStoreName = 'files'

function openUploadedFilesDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open('nomina-uploaded-files', 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(uploadedFilesStoreName)) request.result.createObjectStore(uploadedFilesStoreName)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function persistUploadedFile(file: File) {
  const database = await openUploadedFilesDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(uploadedFilesStoreName, 'readwrite')
    transaction.objectStore(uploadedFilesStoreName).put(file, file.name)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

async function hydrateUploadedFiles() {
  const database = await openUploadedFilesDatabase()
  const entries = await new Promise<Array<[string, File]>>((resolve, reject) => {
    const transaction = database.transaction(uploadedFilesStoreName, 'readonly')
    const store = transaction.objectStore(uploadedFilesStoreName)
    const keysRequest = store.getAllKeys()
    const valuesRequest = store.getAll()
    transaction.oncomplete = () => resolve(keysRequest.result.map((key, index) => [String(key), valuesRequest.result[index] as File]))
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
  entries.forEach(([fileName, file]) => uploadedFileUrls.set(fileName, URL.createObjectURL(file)))
  window.dispatchEvent(new CustomEvent('uploaded-file-registered'))
}

function rememberUploadedFile(file: File) {
  const previousUrl = uploadedFileUrls.get(file.name)
  if (previousUrl) URL.revokeObjectURL(previousUrl)
  uploadedFileUrls.set(file.name, URL.createObjectURL(file))
  void persistUploadedFile(file).catch(() => undefined)
  window.dispatchEvent(new CustomEvent('uploaded-file-registered'))
}

function downloadUploadedFile(fileName: string) {
  const url = uploadedFileUrls.get(fileName)
  if (!url) return
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function UploadedFileDownloadButton({ fileName, compact = true }: { fileName: string; compact?: boolean }) {
  const [available, setAvailable] = useState(() => uploadedFileUrls.has(fileName))
  useEffect(() => {
    const refreshAvailability = () => setAvailable(uploadedFileUrls.has(fileName))
    window.addEventListener('uploaded-file-registered', refreshAvailability)
    refreshAvailability()
    return () => window.removeEventListener('uploaded-file-registered', refreshAvailability)
  }, [fileName])
  return <button type="button" className={compact ? 'icon-button small download-icon' : 'button secondary'} data-upload-download={fileName} disabled={!available} onClick={() => downloadUploadedFile(fileName)} aria-label={`Descargar ${fileName}`} title={available ? 'Descargar archivo para revisión' : 'El archivo original no está disponible en esta sesión'}><Download size={compact ? 17 : 18} />{!compact && ' Descargar archivo'}</button>
}

function UploadedFileDownloadEnhancer() {
  useEffect(() => {
    const addDownloadButtons = () => window.setTimeout(() => {
      const candidates = document.querySelectorAll<HTMLElement>('.selected-import-file, table td')
      candidates.forEach(candidate => {
        if (candidate.querySelector('[data-upload-download]')) return
        const fileName = [...uploadedFileUrls.keys()].find(name => candidate.textContent?.includes(name))
        if (!fileName) return
        const button = document.createElement('button')
        button.type = 'button'
        button.className = candidate.matches('td') ? 'icon-button small download-icon injected-download-button' : 'button secondary compact injected-download-button'
        button.dataset.uploadDownload = fileName
        button.setAttribute('aria-label', `Descargar ${fileName}`)
        button.title = 'Descargar archivo para revisión'
        button.textContent = candidate.matches('td') ? '↓' : '↓ Descargar archivo'
        button.onclick = () => downloadUploadedFile(fileName)
        candidate.appendChild(button)
      })
    }, 0)
    const observer = new MutationObserver(addDownloadButtons)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('uploaded-file-registered', addDownloadButtons)
    addDownloadButtons()
    void hydrateUploadedFiles().catch(() => undefined)
    return () => { observer.disconnect(); window.removeEventListener('uploaded-file-registered', addDownloadButtons) }
  }, [])
  return null
}

function exportTableToExcel(table: HTMLTableElement) {
  const { headers, rows, title } = tableData(table)
  const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><h1>${escapeHtml(title)}</h1><table border="1"><thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`
  downloadBlob(new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' }), `${safeFileName(title)}.xls`)
}

function wrapPdfLine(value: string, maxLength = 112) {
  const words = value.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []; let current = ''
  words.forEach(word => { if (`${current} ${word}`.trim().length > maxLength && current) { lines.push(current); current = word } else current = `${current} ${word}`.trim() })
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function createTablePdf(title: string, headers: string[], rows: string[][]) {
  const lines = [title, '', ...rows.flatMap((row, index) => wrapPdfLine(`${index + 1}. ${headers.map((header, cellIndex) => `${header}: ${row[cellIndex] ?? ''}`).join('  |  ')}`)), ...(rows.length ? [] : ['Sin registros para exportar.'])]
  const pageLines = Array.from({ length: Math.ceil(lines.length / 42) || 1 }, (_, index) => lines.slice(index * 42, (index + 1) * 42))
  const fontObjectId = 3
  const pageObjectIds = pageLines.map((_, index) => 4 + index * 2)
  const objects: string[] = []
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  const pdfEscape = (value: string) => value.replace(/[^\x20-\xFF]/g, '?').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  pageLines.forEach((page, index) => {
    const pageId = pageObjectIds[index]; const contentId = pageId + 1
    const stream = `BT /F1 9 Tf 36 558 Td 12 TL ${page.map(line => `(${pdfEscape(line)}) Tj T*`).join(' ')} ET`
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentId} 0 R >>`
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  })
  let pdf = '%PDF-1.4\n'; const offsets: number[] = [0]
  for (let id = 1; id < objects.length; id += 1) { offsets[id] = pdf.length; pdf += `${id} 0 obj\n${objects[id]}\nendobj\n` }
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return new Blob([new Uint8Array(Array.from(pdf, character => character.charCodeAt(0) & 0xff))], { type: 'application/pdf' })
}

function exportTableToPdf(table: HTMLTableElement) {
  const { headers, rows, title } = tableData(table)
  downloadBlob(createTablePdf(title, headers, rows), `${safeFileName(title)}.pdf`)
}

function TableExportManager() {
  useEffect(() => {
    const enhanceTables = () => document.querySelectorAll<HTMLTableElement>('table').forEach(table => {
      const scroll = table.parentElement
      if (!scroll?.classList.contains('table-scroll') || !scroll.parentElement) return
      if (scroll.previousElementSibling?.classList.contains('table-export-actions')) {
        table.dataset.exportReady = 'true'
        return
      }
      table.dataset.exportReady = 'true'
      const actions = document.createElement('div'); actions.className = 'table-export-actions'; actions.dataset.tableExport = 'true'
      const excelButton = document.createElement('button'); excelButton.type = 'button'; excelButton.className = 'button secondary compact'; excelButton.innerHTML = '<span aria-hidden="true">XLS</span> Excel'; excelButton.setAttribute('aria-label', 'Descargar tabla en Excel'); excelButton.onclick = () => exportTableToExcel(table)
      const pdfButton = document.createElement('button'); pdfButton.type = 'button'; pdfButton.className = 'button secondary compact'; pdfButton.innerHTML = '<span aria-hidden="true">PDF</span> PDF'; pdfButton.setAttribute('aria-label', 'Descargar tabla en PDF'); pdfButton.onclick = () => exportTableToPdf(table)
      actions.append(excelButton, pdfButton); scroll.parentElement.insertBefore(actions, scroll)
    })
    enhanceTables()
    const observer = new MutationObserver(enhanceTables); observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      document.querySelectorAll('[data-table-export="true"]').forEach(element => element.remove())
      document.querySelectorAll<HTMLTableElement>('table[data-export-ready="true"]').forEach(table => delete table.dataset.exportReady)
    }
  }, [])
  return null
}

function storedValue<T>(key: string, fallback: T): T {
  try {
    const saved = window.localStorage.getItem(key)
    return saved ? JSON.parse(saved) as T : fallback
  } catch {
    return fallback
  }
}

function loadClients() {
  return storedValue<Client[]>('seguridad-clientes', initialClients).map(client => {
    const fixture = initialClients.find(item => item.code === client.code)
    if (!fixture) return client
    const savedBranches = client.branches ?? fixture.branches ?? []
    const branches = savedBranches.map((branch, index) => ({ ...emptyClientBranch(branch.id), ...(fixture.branches?.[index] ?? {}), ...branch }))
    return { ...fixture, ...client, branches }
  })
}

type PayrollSuiteProps = {
  route: string
  embedded?: boolean
}

function internalPayrollPath(path: string) {
  if (path.startsWith('/talento-humano/') && path !== '/talento-humano/tablero-personal') return path.slice('/talento-humano'.length)
  return path
}

function hostPayrollPath(path: string) {
  if (path === '/' || path === '/clientes' || path.startsWith('/clientes/') || path.startsWith('/informacion-personal/') || path === '/talento-humano/tablero-personal') return path
  return `/talento-humano${path}`
}

function PayrollSuite({ route, embedded = true }: PayrollSuiteProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>(loadClients)
  const [employees, setEmployees] = useState<Employee[]>(() => storedValue('nomina-empleados', initialEmployees))
  const [complementaryEmployees, setComplementaryEmployees] = useState<ComplementaryEmployee[]>(() => storedValue('nomina-empleados-complementarios', initialComplementaryEmployees))
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>(() => {
    const storedUsers = storedValue('seguridad-usuarios', initialPlatformUsers)
    const admin = initialPlatformUsers.find(user => user.id === 'USR-ADMIN')!
    return storedUsers.some(user => user.username.toLocaleLowerCase('es') === 'admin') ? storedUsers : [...storedUsers, admin]
  })
  const [authenticatedUserId, setAuthenticatedUserId] = useState(() => window.localStorage.getItem('seguridad-usuario-autenticado') ?? '')
  const [platformRoles, setPlatformRoles] = useState<PlatformRole[]>(() => storedValue('seguridad-roles', initialPlatformRoles))
  const [rolePermissionMatrices, setRolePermissionMatrices] = useState<RolePermissionMatrices>(() => {
    const stored = storedValue<Record<string, unknown>>('seguridad-permisos', {})
    const actionKeys: PermissionAction[] = ['access', 'insert', 'delete', 'update', 'export', 'print']
    const isLegacyMatrix = Object.values(stored).some(value => Boolean(value) && typeof value === 'object' && Object.keys(value as object).some(key => actionKeys.includes(key as PermissionAction)))
    return isLegacyMatrix ? { [initialPlatformRoles[0].id]: stored as PermissionMatrix } : stored as RolePermissionMatrices
  })
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => storedValue('seguridad-compania', initialCompanySettings))
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplates>(() => storedValue('seguridad-plantillas-correo', initialEmailTemplates))
  const [employeeProfiles, setEmployeeProfiles] = useState<Record<string, EmployeeProfile>>(() => storedValue('nomina-expedientes-empleados', {}))
  const [events, setEvents] = useState(initialEvents)
  const [novelties, setNovelties] = useState<PayrollNovelty[]>(() => storedValue('nomina-novedades', initialNovelties))
  const [disciplinaryRecords, setDisciplinaryRecords] = useState<DisciplinaryRecord[]>(() => storedValue('nomina-multas-faltas', initialDisciplinaryRecords))
  const [personalRequests, setPersonalRequests] = useState<PersonalRequest[]>(() => storedValue('nomina-solicitudes-personales', initialPersonalRequests))
  const [complaintRecords, setComplaintRecords] = useState<ComplaintRecord[]>(() => storedValue('nomina-quejas-reclamos', initialComplaintRecords))
  const [payrollReceipts, setPayrollReceipts] = useState<PayrollReceiptRecord[]>(() => storedValue('nomina-roles-pago-generados', initialPayrollReceipts))
  const [noveltyUploads, setNoveltyUploads] = useState<NoveltyUpload[]>([])
  const [absences, setAbsences] = useState<EmployeeAbsence[]>(() => storedValue('nomina-ausencias', initialAbsences))
  const [personnelControlRecords, setPersonnelControlRecords] = useState<PersonnelControlRecord[]>(() => storedValue('operaciones-novedades-personal', []))
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>(() => {
    try {
      const saved = window.localStorage.getItem('nomina-horas-extra')
      return saved ? JSON.parse(saved) as OvertimeRecord[] : []
    } catch {
      return []
    }
  })
  const [overtimeUploads, setOvertimeUploads] = useState<OvertimeUploadSummary[]>(() => {
    try {
      const saved = window.localStorage.getItem('nomina-archivos-horas-extra')
      return saved ? JSON.parse(saved) as OvertimeUploadSummary[] : []
    } catch {
      return []
    }
  })
  const [vacationPendingRecords, setVacationPendingRecords] = useState<VacationPendingRecord[]>(() => {
    try {
      const saved = window.localStorage.getItem('nomina-vacaciones-pendientes')
      return saved ? JSON.parse(saved) as VacationPendingRecord[] : []
    } catch {
      return []
    }
  })
  const [vacationPendingUploads, setVacationPendingUploads] = useState<VacationPendingUpload[]>(() => {
    try {
      const saved = window.localStorage.getItem('nomina-archivos-vacaciones-pendientes')
      return saved ? JSON.parse(saved) as VacationPendingUpload[] : []
    } catch {
      return []
    }
  })
  const [vacationRequests, setVacationRequests] = useState<VacationRequestRecord[]>(() => {
    try {
      const saved = window.localStorage.getItem('nomina-registro-vacaciones')
      const records = saved ? JSON.parse(saved) as VacationRequestRecord[] : initialVacationRequests
      return records.map(record => {
        const employee = initialEmployees.find(item => item.id === record.employeeId)
        return employee ? { ...record, vacationPeriod: normalizeVacationPeriod(record.vacationPeriod, employee.startDate) } : record
      })
    } catch {
      return initialVacationRequests
    }
  })
  const [catalogs, setCatalogs] = useState<Catalogs>(() => {
    const merged = { ...initialCatalogs, ...storedValue<Partial<Catalogs>>('nomina-catalogos-general', {}) }
    return { ...merged, cargos: merged.cargos.map(record => ({ ...record, receivesThirteenth: record.receivesThirteenth ?? true, receivesFourteenth: record.receivesFourteenth ?? true, receivesReserveFunds: record.receivesReserveFunds ?? true, receivesProfits: record.receivesProfits ?? true })) }
  })
  const [historicalSalaries, setHistoricalSalaries] = useState<HistoricalSalaryRecord[]>(() => {
    try {
      const saved = window.localStorage.getItem('nomina-historico-sueldo')
      return saved ? JSON.parse(saved) as HistoricalSalaryRecord[] : []
    } catch {
      return []
    }
  })
  const [historicalSalaryUploads, setHistoricalSalaryUploads] = useState<HistoricalSalaryUpload[]>(() => {
    try {
      const saved = window.localStorage.getItem('nomina-archivos-historico-sueldo')
      return saved ? JSON.parse(saved) as HistoricalSalaryUpload[] : []
    } catch {
      return []
    }
  })
  const [employeeInformationUploads, setEmployeeInformationUploads] = useState<EmployeeInformationUpload[]>([])
  const [sbuRecords, setSbuRecords] = useState<SbuRecord[]>(() => storedValue('nomina-sbu', []))
  const [iessPercentages, setIessPercentages] = useState<IessPercentageRecord[]>(() => storedValue('nomina-porcentajes-iess', initialIessPercentages))
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeConfiguration[]>(() => storedValue('seguridad-tipos-documento', initialDocumentTypes))
  const [systemColors, setSystemColors] = useState<SystemColors>(() => ({ ...defaultSystemColors, ...storedValue<Partial<SystemColors>>('seguridad-colores-sistema', {}) }))
  const [sbuEnabledEmployeeIds, setSbuEnabledEmployeeIds] = useState<string[]>(() => storedValue('nomina-empleados-sbu', []))
  const [contractHistory, setContractHistory] = useState<Record<string, ContractHistoryLine[]>>(() => storedValue('nomina-historial-contratos', Object.fromEntries(initialEmployees.map(item => {
    const [year, month, day] = item.startDate.split('-')
    return [item.id, [{ id: `${item.id}-C1-L1`, contractNumber: 1, startDate: `${day}/${month}/${year}`, endDate: '', exitReason: '', exitReasonDetail: '', department: item.area, role: item.role, salary: item.salary, payrollGroupId: item.payrollGroupId }]]
  }))))
  const [pendingContract, setPendingContract] = useState<Record<string, number>>({})
  const [payrollLayoutOrders, setPayrollLayoutOrders] = useState<Record<PayrollLayoutKey, string[]>>(() => storedValue('nomina-configuracion-orden-planillas', { QUINCENA: [], FIN_MES: [] }))
  const [payrollLayoutEnabledIds, setPayrollLayoutEnabledIds] = useState<Record<PayrollLayoutKey, string[]>>(() => storedValue('nomina-configuracion-rubros-planillas', { QUINCENA: initialCatalogs.rubros.map(record => record.id), FIN_MES: initialCatalogs.rubros.map(record => record.id) }))
  const [payrollPeriodOverrides, setPayrollPeriodOverrides] = useState<Record<string, PayrollPeriodStatus>>(() => storedValue('nomina-periodos-habilitados', {}))
  const [lastFortnightLiquidation, setLastFortnightLiquidation] = useState<FortnightLiquidationSnapshot | null>(null)
  const [lastMonthEndLiquidation, setLastMonthEndLiquidation] = useState<MonthEndLiquidationSnapshot | null>(null)
  const [lastSocialBenefitLiquidation, setLastSocialBenefitLiquidation] = useState<SocialBenefitLiquidationSnapshot | null>(null)
  const [lastProfitLiquidation, setLastProfitLiquidation] = useState<ProfitLiquidationSnapshot | null>(() => storedValue('nomina-ultima-liquidacion-utilidades', null))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [screenSearch, setScreenSearch] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [alarmMenuOpen, setAlarmMenuOpen] = useState(false)
  const [activeAlarm, setActiveAlarm] = useState<AlarmEvent | null>(null)
  const [resolvingAlarm, setResolvingAlarm] = useState(false)
  const [screenSearchOpen, setScreenSearchOpen] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => navigationExpansionForPath(location.pathname))
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTab[]>(() => {
    const savedTabs = storedValue<WorkspaceTab[]>('seguridad-pestanas-internas', []).filter(tab => tab && typeof tab.path === 'string' && tab.path !== '/login').map(tab => workspaceTabForPath(tab.path))
    if (location.pathname === '/login') return savedTabs
    const currentTab = workspaceTabForPath(location.pathname)
    return [...savedTabs.filter(tab => tab.path !== currentTab.path), currentTab]
  })
  const [catalogDialog, setCatalogDialog] = useState<CatalogKey | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => { setExpandedModules(navigationExpansionForPath(location.pathname)) }, [location.pathname])
  useEffect(() => {
    if (location.pathname === '/login') return
    const currentTab = workspaceTabForPath(location.pathname)
    setWorkspaceTabs(current => current.some(tab => tab.path === currentTab.path) ? current : [...current, currentTab])
  }, [location.pathname])
  useEffect(() => { window.localStorage.setItem('seguridad-pestanas-internas', JSON.stringify(workspaceTabs)) }, [workspaceTabs])
  useEffect(() => {
    if (embedded) return
    let mounted = true
    const readAlarm = async () => {
      try {
        const response = await fetch('http://127.0.0.1:4180/alarm', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json() as { alarm: AlarmEvent | null }
        if (mounted) setActiveAlarm(data.alarm)
      } catch {
        // El portal continúa operativo aunque el canal local de alarmas no esté iniciado.
      }
    }
    void readAlarm()
    const timer = window.setInterval(readAlarm, 1500)
    return () => { mounted = false; window.clearInterval(timer) }
  }, [embedded])

  useEffect(() => { window.localStorage.setItem('seguridad-clientes', JSON.stringify(clients)) }, [clients])
  useEffect(() => { window.localStorage.setItem('nomina-empleados', JSON.stringify(employees)) }, [employees])
  useEffect(() => { window.localStorage.setItem('nomina-empleados-complementarios', JSON.stringify(complementaryEmployees)) }, [complementaryEmployees])
  useEffect(() => { window.localStorage.setItem('seguridad-usuarios', JSON.stringify(platformUsers)) }, [platformUsers])
  useEffect(() => { window.localStorage.setItem('seguridad-roles', JSON.stringify(platformRoles)) }, [platformRoles])
  useEffect(() => { window.localStorage.setItem('seguridad-permisos', JSON.stringify(rolePermissionMatrices)) }, [rolePermissionMatrices])
  useEffect(() => { window.localStorage.setItem('seguridad-compania', JSON.stringify(companySettings)) }, [companySettings])
  useEffect(() => { window.localStorage.setItem('seguridad-plantillas-correo', JSON.stringify(emailTemplates)) }, [emailTemplates])
  useEffect(() => { window.localStorage.setItem('nomina-expedientes-empleados', JSON.stringify(employeeProfiles)) }, [employeeProfiles])
  useEffect(() => { window.localStorage.setItem('nomina-historial-contratos', JSON.stringify(contractHistory)) }, [contractHistory])
  useEffect(() => { window.localStorage.setItem('nomina-catalogos-general', JSON.stringify(catalogs)) }, [catalogs])
  useEffect(() => {
    let clientsChanged = false
    const obsoleteGeneratedTypeIds = new Set<string>()
    const normalizedClients = clients.map(client => {
      let clientChanged = false
      const operationalContracts = (client.operationalContracts ?? []).map(contract => {
        const payrollName = `${client.businessName} - ${contract.contractName}`
        const normalizedName = payrollName.toLocaleLowerCase('es')
        const existingGroup = catalogs['grupos-nomina'].find(record => record.name.toLocaleLowerCase('es') === normalizedName)
        const idSuffix = `${client.code}-${contract.id}`.replace(/[^A-Za-z0-9-]/g, '').toUpperCase()
        const legacyContract = contract as ClientOperationalContract & { payrollTypeId?: string }
        if (legacyContract.payrollTypeId?.startsWith('TNO-CLI-')) obsoleteGeneratedTypeIds.add(legacyContract.payrollTypeId)
        const payrollGroupId = contract.payrollGroupId ?? existingGroup?.id ?? `GNO-${idSuffix}`
        if (!legacyContract.payrollTypeId && payrollGroupId === contract.payrollGroupId) return contract
        clientChanged = true
        const { payrollTypeId: _obsoletePayrollTypeId, ...contractWithoutPayrollType } = legacyContract
        return { ...contractWithoutPayrollType, payrollGroupId }
      })
      if (!clientChanged) return client
      clientsChanged = true
      return { ...client, operationalContracts }
    })
    if (clientsChanged) setClients(normalizedClients)
    const synchronizedClients = clientsChanged ? normalizedClients : clients
    setCatalogs(current => {
      let changed = false
      let payrollGroups = [...current['grupos-nomina']]
      const payrollTypes = current['tipos-nomina'].filter(record => !obsoleteGeneratedTypeIds.has(record.id))
      if (payrollTypes.length !== current['tipos-nomina'].length) changed = true
      synchronizedClients.forEach(client => (client.operationalContracts ?? []).forEach(contract => {
        if (!contract.payrollGroupId) return
        const payrollName = `${client.businessName} - ${contract.contractName}`
        const existingGroup = payrollGroups.find(record => record.id === contract.payrollGroupId)
        if (!existingGroup) {
          payrollGroups.push({ id: contract.payrollGroupId, code: contract.payrollGroupId.replace(/^GNO-/, '').slice(0, 12), name: payrollName, description: '', status: 'ACTIVO' })
          changed = true
        } else if (existingGroup.name !== payrollName) {
          payrollGroups = payrollGroups.map(record => record.id === contract.payrollGroupId ? { ...record, name: payrollName } : record)
          changed = true
        }
      }))
      return changed ? { ...current, 'tipos-nomina': payrollTypes, 'grupos-nomina': payrollGroups } : current
    })
  }, [clients, catalogs])
  useEffect(() => { window.localStorage.setItem('nomina-porcentajes-iess', JSON.stringify(iessPercentages)) }, [iessPercentages])
  useEffect(() => { window.localStorage.setItem('seguridad-tipos-documento', JSON.stringify(documentTypes)) }, [documentTypes])
  useEffect(() => {
    Object.entries(systemColors).forEach(([key, value]) => document.documentElement.style.setProperty(`--${key}`, value))
    window.localStorage.setItem('seguridad-colores-sistema', JSON.stringify(systemColors))
  }, [systemColors])
  useEffect(() => { window.localStorage.setItem('nomina-sbu', JSON.stringify(sbuRecords)) }, [sbuRecords])
  useEffect(() => { window.localStorage.setItem('nomina-empleados-sbu', JSON.stringify(sbuEnabledEmployeeIds)) }, [sbuEnabledEmployeeIds])
  useEffect(() => { window.localStorage.setItem('nomina-novedades', JSON.stringify(novelties)) }, [novelties])
  useEffect(() => { window.localStorage.setItem('nomina-multas-faltas', JSON.stringify(disciplinaryRecords)) }, [disciplinaryRecords])
  useEffect(() => { window.localStorage.setItem('nomina-solicitudes-personales', JSON.stringify(personalRequests)) }, [personalRequests])
  useEffect(() => { window.localStorage.setItem('nomina-quejas-reclamos', JSON.stringify(complaintRecords)) }, [complaintRecords])
  useEffect(() => { window.localStorage.setItem('nomina-roles-pago-generados', JSON.stringify(payrollReceipts)) }, [payrollReceipts])
  useEffect(() => {
    if (!lastMonthEndLiquidation) return
    setPayrollReceipts(current => {
      const additions = lastMonthEndLiquidation.employeeIds.filter(employeeId => !current.some(record => record.employeeId === employeeId && record.period === lastMonthEndLiquidation.period)).map(employeeId => ({ id: `ROL-${employeeId}-${lastMonthEndLiquidation.period}`, employeeId, period: lastMonthEndLiquidation.period, generatedAt: lastMonthEndLiquidation.generatedAt }))
      return additions.length ? [...additions, ...current] : current
    })
  }, [lastMonthEndLiquidation])
  useEffect(() => { window.localStorage.setItem('nomina-ausencias', JSON.stringify(absences)) }, [absences])
  useEffect(() => { window.localStorage.setItem('operaciones-novedades-personal', JSON.stringify(personnelControlRecords)) }, [personnelControlRecords])
  useEffect(() => {
    const assignmentSnapshot = storedValue<Record<string, string>>('nomina-asignacion-empleados', {})
    const assignmentForEmployee = (employeeId: string) => Object.entries(assignmentSnapshot).find(([, assignedEmployeeId]) => assignedEmployeeId === employeeId)?.[0].split('|')[0] ?? ''
    const operationalNotifications = [
      ...personnelControlRecords.filter(record => record.status !== 'ATENDIDA').map(record => {
        const employee = employees.find(item => item.id === record.employeeId)
        const clientCode = assignmentForEmployee(record.employeeId)
        return { id: record.id, clientCode, clientName: clients.find(client => client.code === clientCode)?.businessName ?? 'Cliente sin asignar', employeeName: employee?.name ?? 'Empleado no disponible', mobilePhone: employeeProfiles[record.employeeId]?.mobilePhone ?? 'Sin teléfono registrado', detail: record.detail, date: record.date, status: record.status === 'EN_REVISION' ? 'EN_REVISION' : 'ACTIVA', source: 'NOVEDAD_OPERATIVA' }
      }),
      ...complaintRecords.filter(record => record.status !== 'ATENDIDA').map(record => {
        const employee = employees.find(item => item.id === record.employeeId)
        const clientCode = assignmentForEmployee(record.employeeId)
        return { id: record.id, clientCode, clientName: clients.find(client => client.code === clientCode)?.businessName ?? 'Cliente sin asignar', employeeName: employee?.name ?? 'Empleado no disponible', mobilePhone: employeeProfiles[record.employeeId]?.mobilePhone ?? 'Sin teléfono registrado', detail: record.detail, date: record.date, status: 'ACTIVA', source: record.type }
      }),
    ]
    void fetch('http://127.0.0.1:4180/operational-notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(operationalNotifications) }).catch(() => undefined)
  }, [personnelControlRecords, complaintRecords, employees, clients, employeeProfiles])
  useEffect(() => { window.localStorage.setItem('nomina-configuracion-orden-planillas', JSON.stringify(payrollLayoutOrders)) }, [payrollLayoutOrders])
  useEffect(() => { window.localStorage.setItem('nomina-configuracion-rubros-planillas', JSON.stringify(payrollLayoutEnabledIds)) }, [payrollLayoutEnabledIds])
  useEffect(() => { window.localStorage.setItem('nomina-periodos-habilitados', JSON.stringify(payrollPeriodOverrides)) }, [payrollPeriodOverrides])
  useEffect(() => { window.localStorage.setItem('nomina-ultima-liquidacion-utilidades', JSON.stringify(lastProfitLiquidation)) }, [lastProfitLiquidation])

  useEffect(() => {
    window.localStorage.setItem('nomina-historico-sueldo', JSON.stringify(historicalSalaries))
  }, [historicalSalaries])

  useEffect(() => {
    window.localStorage.setItem('nomina-archivos-historico-sueldo', JSON.stringify(historicalSalaryUploads))
  }, [historicalSalaryUploads])

  useEffect(() => {
    window.localStorage.setItem('nomina-horas-extra', JSON.stringify(overtimeRecords))
  }, [overtimeRecords])

  useEffect(() => {
    window.localStorage.setItem('nomina-archivos-horas-extra', JSON.stringify(overtimeUploads))
  }, [overtimeUploads])

  useEffect(() => {
    window.localStorage.setItem('nomina-vacaciones-pendientes', JSON.stringify(vacationPendingRecords))
  }, [vacationPendingRecords])

  useEffect(() => {
    window.localStorage.setItem('nomina-archivos-vacaciones-pendientes', JSON.stringify(vacationPendingUploads))
  }, [vacationPendingUploads])

  useEffect(() => {
    window.localStorage.setItem('nomina-registro-vacaciones', JSON.stringify(vacationRequests))
  }, [vacationRequests])

  const activePath = embedded ? internalPayrollPath(route) : location.pathname
  const activeWorkspacePath = workspaceTabForPath(activePath).path
  const go = (path: string) => { navigate(embedded ? hostPayrollPath(path) : path); setSidebarOpen(false) }
  const closeWorkspaceTab = (path: string) => {
    const closingIndex = workspaceTabs.findIndex(tab => tab.path === path)
    const remainingTabs = workspaceTabs.filter(tab => tab.path !== path)
    if (!remainingTabs.length) {
      setWorkspaceTabs([workspaceTabForPath('/')])
      if (activeWorkspacePath === path) go('/')
      return
    }
    setWorkspaceTabs(remainingTabs)
    if (activeWorkspacePath !== path) return
    const replacement = remainingTabs[Math.min(closingIndex, remainingTabs.length - 1)]
    go(replacement?.path ?? '/')
  }
  const toggleRootModule = (module: string) => setExpandedModules(current => {
    const shouldOpen = !current[module]
    const next = Object.fromEntries(navigationAccordionKeys.map(key => [key, false])) as Record<string, boolean>
    if (shouldOpen) next[module] = true
    return next
  })
  const toggleHumanTalentModule = (module: string) => setExpandedModules(current => {
    const shouldOpen = !current[module]
    const next = Object.fromEntries(navigationAccordionKeys.map(key => [key, false])) as Record<string, boolean>
    next['TALENTO HUMANO'] = true
    if (shouldOpen) next[module] = true
    return next
  })
  const matchingScreens = useMemo(() => {
    const query = normalizeScreenSearch(screenSearch)
    if (!query) return []
    return screenSearchOptions.filter(screen => normalizeScreenSearch(`${screen.label} ${screen.location.join(' ')}`).includes(query)).slice(0, 8)
  }, [screenSearch])
  const revealScreen = (screen?: ScreenSearchOption) => {
    if (!screen) return
    setExpandedModules(Object.fromEntries(navigationAccordionKeys.map(module => [module, screen.expand.includes(module)])))
  }
  const openScreenResult = (screen: ScreenSearchOption) => {
    revealScreen(screen)
    setScreenSearch('')
    setScreenSearchOpen(false)
    go(screen.path)
  }
  const changeScreenSearch = (value: string) => {
    setScreenSearch(value)
    setScreenSearchOpen(Boolean(value.trim()))
    const query = normalizeScreenSearch(value)
    if (query) revealScreen(screenSearchOptions.find(screen => normalizeScreenSearch(`${screen.label} ${screen.location.join(' ')}`).includes(query)))
  }
  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 4500)
  }
  const resolveAlarm = async () => {
    setResolvingAlarm(true)
    try {
      const response = await fetch('http://127.0.0.1:4180/alarm', { method: 'DELETE' })
      if (!response.ok) throw new Error('No fue posible solventar la novedad')
      setActiveAlarm(null)
      setAlarmMenuOpen(false)
      showToast('La novedad de alarma fue marcada como solventada.')
    } catch {
      showToast('No fue posible confirmar que la novedad fue solventada.')
    } finally {
      setResolvingAlarm(false)
    }
  }
  const saveClientWithPayrollCatalogs = (client: Client) => {
    const normalizedContracts = (client.operationalContracts ?? []).map(contract => {
      const payrollName = `${client.businessName} - ${contract.contractName}`
      const normalizedPayrollName = payrollName.toLocaleLowerCase('es')
      const existingGroup = catalogs['grupos-nomina'].find(record => record.name.toLocaleLowerCase('es') === normalizedPayrollName)
      const idSuffix = `${client.code}-${contract.id}`.replace(/[^A-Za-z0-9-]/g, '').toUpperCase()
      const legacyContract = contract as ClientOperationalContract & { payrollTypeId?: string }
      const { payrollTypeId: _obsoletePayrollTypeId, ...contractWithoutPayrollType } = legacyContract
      return {
        ...contractWithoutPayrollType,
        payrollGroupId: contract.payrollGroupId ?? existingGroup?.id ?? `GNO-${idSuffix}`,
      }
    })
    const normalizedClient = { ...client, operationalContracts: normalizedContracts }
    setCatalogs(current => {
      let payrollGroups = [...current['grupos-nomina']]
      normalizedContracts.forEach(contract => {
        const payrollName = `${client.businessName} - ${contract.contractName}`
        const groupRecord: CatalogRecord = { id: contract.payrollGroupId!, code: contract.payrollGroupId!.replace(/^GNO-/, '').slice(0, 12), name: payrollName, description: '', status: 'ACTIVO' }
        const groupIndex = payrollGroups.findIndex(record => record.id === groupRecord.id)
        payrollGroups = groupIndex >= 0 ? payrollGroups.map((record, index) => index === groupIndex ? { ...record, name: payrollName, status: 'ACTIVO' } : record) : [...payrollGroups, groupRecord]
      })
      return { ...current, 'grupos-nomina': payrollGroups }
    })
    const exists = clients.some(item => item.code === normalizedClient.code)
    setClients(current => exists ? current.map(item => item.code === normalizedClient.code ? normalizedClient : item) : [normalizedClient, ...current])
    showToast(exists ? 'La información del cliente y sus grupos de nómina fue actualizada correctamente.' : 'El cliente y los grupos de nómina de sus contratos fueron creados correctamente.')
  }
  const currentUser = platformUsers.find(user => user.id === authenticatedUserId) ?? platformUsers[0] ?? initialPlatformUsers[0]
  const currentEmployee: Employee = employees.find(employee => employee.name === currentUser.name) ?? { id: currentUser.id, document: '', name: currentUser.name, role: currentUser.role, area: '', salary: '0.00', status: currentUser.status, startDate: '' }
  const currentUserProfile = employeeProfiles[currentEmployee.id] ?? employeeProfiles[currentUser.id] ?? {}
  const saveCurrentUserProfile = (changes: Partial<EmployeeProfile>) => {
    setEmployeeProfiles(current => ({ ...current, [currentEmployee.id]: { ...(current[currentEmployee.id] ?? {}), ...changes } }))
    showToast('La información de tu perfil fue actualizada correctamente.')
  }
  const catalogRecordInUse = (key: CatalogKey, record: CatalogRecord) => {
    const contractLines = Object.values(contractHistory).flat()
    if (key === 'departamentos') return employees.some(employee => employee.area === record.name) || contractLines.some(line => line.department === record.name)
    if (key === 'cargos') return employees.some(employee => employee.role === record.name) || contractLines.some(line => line.role === record.name)
    if (key === 'rubros') return novelties.some(novelty => novelty.rubricId === record.id || novelty.rubricName === record.name) || events.some(event => event.concept === record.name) || catalogs.rubros.some(rubric => rubric.id !== record.id && rubric.componentIds?.includes(record.id)) || Object.values(payrollLayoutEnabledIds).some(ids => ids.includes(record.id))
    if (key === 'grupos-nomina') return employees.some(employee => employee.payrollGroupId === record.id) || contractLines.some(line => line.payrollGroupId === record.id) || clients.some(client => client.operationalContracts?.some(contract => contract.payrollGroupId === record.id))
    if (key === 'tipos-contrato') return contractLines.some(line => line.contractTypeId === record.id)
    if (key === 'motivos-salida') return contractLines.some(line => line.exitReason === record.id || line.exitReason === record.name)
    if (key === 'tipos-parentesco') return Object.values(employeeProfiles).some(profile => profile.dependents?.some(dependent => dependent.relationship === record.id || dependent.relationship === record.name))
    if (key === 'tipos-ausencia') return absences.some(absence => absence.absenceTypeId === record.id || absence.absenceTypeName === record.name)
    return false
  }
  const deleteCatalogRecord = (key: CatalogKey, record: CatalogRecord) => {
    if (catalogRecordInUse(key, record)) return false
    setCatalogs(current => ({ ...current, [key]: current[key].filter(item => item.id !== record.id) }))
    showToast(`${record.name} fue eliminado correctamente.`)
    return true
  }
  const deleteSbuRecord = (record: SbuRecord) => {
    const usedByEmployee = sbuEnabledEmployeeIds.some(employeeId => (contractHistory[employeeId]?.at(-1)?.salary ?? employees.find(employee => employee.id === employeeId)?.salary) === record.value)
    const usedByLiquidation = Boolean(lastSocialBenefitLiquidation && findSbuForDate([record], currentEcuadorDate()))
    if (usedByEmployee || usedByLiquidation) return false
    setSbuRecords(current => current.filter(item => item.id !== record.id))
    showToast('El registro de SBU fue eliminado correctamente.')
    return true
  }
  const deleteIessRecord = (record: IessPercentageRecord) => {
    if (record.status === 'ACTIVO' && Boolean(lastFortnightLiquidation || lastMonthEndLiquidation)) return false
    setIessPercentages(current => current.filter(item => item.id !== record.id))
    showToast(`${record.name} fue eliminado correctamente.`)
    return true
  }

  if (activePath === '/login') {
    return <LoginPage company={companySettings} users={platformUsers} template={emailTemplates.passwordRecovery} onLogin={(userId) => { window.localStorage.setItem('seguridad-usuario-autenticado', userId); setAuthenticatedUserId(userId); navigate('/') }} onPasswordChange={(userId, password) => setPlatformUsers(current => current.map(user => user.id === userId ? { ...user, password } : user))} />
  }

  let page: ReactNode
  if (activePath === '/clientes') {
    page = <ClientsPage clients={clients} documentTypes={documentTypes} onSave={saveClientWithPayrollCatalogs} />
  } else if (activePath === '/clientes/estado-cuentas') {
    page = <ClientAccountStatementsPage clients={clients} />
  } else if (activePath === '/operaciones/tablero-control') {
    page = <PersonnelControlBoardPage area="OPERACIONES" currentRole={currentUser.role} employees={employees} records={personnelControlRecords} setRecords={setPersonnelControlRecords} requests={personalRequests} setRequests={setPersonalRequests} />
  } else if (activePath === '/talento-humano/tablero-personal') {
    page = <PersonnelControlBoardPage area="TALENTO_HUMANO" currentRole={currentUser.role} employees={employees} records={personnelControlRecords} setRecords={setPersonnelControlRecords} requests={personalRequests} setRequests={setPersonalRequests} />
  } else if (activePath === '/operaciones' || activePath === '/operaciones/clientes') {
    page = <ClientOperationsPage clients={clients} employees={employees} onSaveClient={saveClientWithPayrollCatalogs} />
  } else if (activePath === '/configuracion-general/usuarios') {
    page = <UsersConfigurationPage users={platformUsers} roles={platformRoles} onSave={(user) => { setPlatformUsers(current => current.map(item => item.id === user.id ? user : item)); showToast('La información del usuario fue actualizada correctamente.') }} onCreate={(user) => { setPlatformUsers(current => [...current, user]); showToast('El nuevo usuario fue creado correctamente.') }} />
  } else if (activePath === '/configuracion-general/roles') {
    page = <RolesConfigurationPage roles={platformRoles} users={platformUsers} onCreate={(role) => { setPlatformRoles(current => [...current, role]); showToast('El nuevo rol fue creado correctamente.') }} />
  } else if (activePath === '/configuracion-general/permisos') {
    page = <PermissionsConfigurationPage roles={platformRoles} permissionsByRole={rolePermissionMatrices} onSave={(permissions) => { setRolePermissionMatrices(permissions); showToast('Los permisos del rol fueron guardados correctamente.') }} />
  } else if (activePath === '/configuracion-general/compania' || activePath === '/configuracion-general/colores-sistema') {
    page = <CompanyConfigurationPage settings={companySettings} colors={systemColors} initialTab={activePath === '/configuracion-general/colores-sistema' ? 'colors' : 'company'} onSave={(settings) => { setCompanySettings(settings); showToast('La configuración de la compañía fue guardada correctamente.') }} onSaveColors={(colors) => { setSystemColors(colors); showToast('Los colores del sistema fueron actualizados correctamente.') }} />
  } else if (activePath === '/configuracion-general/envio-correos') {
    page = <EmailTemplatesConfigurationPage templates={emailTemplates} onSave={(templates) => { setEmailTemplates(templates); showToast('Las plantillas de correo fueron guardadas correctamente.') }} />
  } else if (activePath === '/configuracion-general/tipo-documento') {
    page = <DocumentTypesPage records={documentTypes} onSave={(record) => {
      const exists = documentTypes.some(item => item.id === record.id)
      setDocumentTypes(current => exists ? current.map(item => item.id === record.id ? record : item) : [...current, record])
      showToast(exists ? 'Tipo de documento actualizado correctamente.' : 'Tipo de documento creado correctamente.')
    }} />
  } else if (activePath === '/empleados' || activePath === '/empleado/informacion') {
    page = <EmployeesPage employees={employees} employeeProfiles={employeeProfiles} catalogs={catalogs} documentTypes={documentTypes} sbuRecords={sbuRecords} sbuEnabledEmployeeIds={sbuEnabledEmployeeIds} contractHistory={contractHistory} setContractHistory={setContractHistory} pendingContract={pendingContract} setPendingContract={setPendingContract} onUpdateEmployee={(employeeId, changes) => {
      setEmployees(current => current.map(employee => employee.id === employeeId ? { ...employee, ...changes } : employee))
    }} onSaveProfile={(employeeId, profile) => {
      setEmployeeProfiles(current => ({ ...current, [employeeId]: { ...(current[employeeId] ?? {}), ...profile } }))
      showToast('La información del empleado quedó guardada para las pruebas de cálculo.')
    }} onSbuPreferenceChange={(employeeId, enabled, salary) => {
      setSbuEnabledEmployeeIds(current => enabled ? [...new Set([...current, employeeId])] : current.filter(id => id !== employeeId))
      setEmployees(current => current.map(employee => employee.id === employeeId ? { ...employee, salary } : employee))
    }} onCreateEmployee={(employee, firstContract, profile) => {
      setEmployees(current => [employee, ...current])
      setContractHistory(current => ({ ...current, [employee.id]: [firstContract] }))
      setEmployeeProfiles(current => ({ ...current, [employee.id]: profile }))
      showToast('Empleado creado y expediente guardado en la sesión de validación.')
    }} />
  } else if (activePath.startsWith('/empleado/')) {
    const requestedKey = activePath.split('/')[2] as EmployeeScreenKey | undefined
    const screenKey: EmployeeScreenKey = requestedKey && requestedKey in employeeScreenConfig ? requestedKey : 'informacion'
    page = <EmployeeModulePage screenKey={screenKey} clients={clients} employees={employees} complementaryEmployees={complementaryEmployees} setComplementaryEmployees={setComplementaryEmployees} catalogs={catalogs} contractHistory={contractHistory} historicalSalaries={historicalSalaries} setHistoricalSalaries={setHistoricalSalaries} historicalSalaryUploads={historicalSalaryUploads} setHistoricalSalaryUploads={setHistoricalSalaryUploads} employeeInformationUploads={employeeInformationUploads} setEmployeeInformationUploads={setEmployeeInformationUploads} onAssignPayrollGroup={(employeeId, payrollGroupId) => {
      setEmployees(current => current.map(employee => employee.id === employeeId ? { ...employee, payrollGroupId } : employee))
      setContractHistory(current => {
        const lines = current[employeeId] ?? []
        const latest = lines.at(-1)
        if (!latest || latest.payrollGroupId === payrollGroupId) return current
        return { ...current, [employeeId]: [...lines, { ...latest, id: `${employeeId}-C${latest.contractNumber}-L${Date.now()}`, payrollGroupId, effectiveDate: currentEcuadorDate() }] }
      })
    }} onDeleteImportedEmployees={(employeeIds) => {
      const ids = new Set(employeeIds)
      setEmployees(current => current.filter(employee => !ids.has(employee.id)))
      setContractHistory(current => Object.fromEntries(Object.entries(current).filter(([employeeId]) => !ids.has(employeeId))))
    }} onImportEmployees={(packages) => {
      setEmployees(current => [...packages.map(item => item.employee), ...current])
      setContractHistory(current => ({ ...current, ...Object.fromEntries(packages.map(item => [item.employee.id, [item.contract]])) }))
      showToast(`${packages.length} ${packages.length === 1 ? 'empleado importado' : 'empleados importados'} correctamente.`)
    }} onUpdateHistoryLine={(employeeId, line) => {
      const isLatestLine = contractHistory[employeeId]?.at(-1)?.id === line.id
      setContractHistory(current => ({ ...current, [employeeId]: (current[employeeId] ?? []).map(item => item.id === line.id ? line : item) }))
      if (isLatestLine) setEmployees(current => current.map(employee => employee.id === employeeId ? { ...employee, role: line.role, area: line.department, salary: line.salary, payrollGroupId: line.payrollGroupId, startDate: line.startDate.split('/').reverse().join('-') } : employee))
      showToast('La línea contractual fue actualizada en el historial del empleado.')
    }} onSavePositionChange={(employeeId, line) => {
      setContractHistory(current => ({ ...current, [employeeId]: [...(current[employeeId] ?? []), line] }))
      setEmployees(current => current.map(employee => employee.id === employeeId ? { ...employee, role: line.role, area: line.department, salary: line.salary, payrollGroupId: line.payrollGroupId } : employee))
      showToast('La modificación laboral fue registrada en el historial del empleado.')
    }} />
  } else if (activePath.startsWith('/informacion-personal/')) {
    const requestedKey = activePath.split('/')[2] as PersonalInformationScreenKey | undefined
    const screenKey: PersonalInformationScreenKey = requestedKey && requestedKey in personalInformationScreenConfig ? requestedKey : 'mi-horario'
    page = <PersonalInformationPage screenKey={screenKey} clients={clients} employees={employees} currentEmployee={currentEmployee} currentUserProfile={currentUserProfile} catalogs={catalogs} onSaveCurrentUserProfile={saveCurrentUserProfile} contractHistory={contractHistory} pendingRecords={vacationPendingRecords} vacationRequests={vacationRequests} setVacationRequests={setVacationRequests} disciplinaryRecords={disciplinaryRecords} setDisciplinaryRecords={setDisciplinaryRecords} personalRequests={personalRequests} setPersonalRequests={setPersonalRequests} complaintRecords={complaintRecords} setComplaintRecords={setComplaintRecords} overtimeRecords={overtimeRecords} payrollReceipts={payrollReceipts} payrollPeriodOverrides={payrollPeriodOverrides} />
  } else if (activePath.startsWith('/general')) {
    const requestedKey = activePath.split('/')[2]
    if (requestedKey === 'porcentajes-iess') {
      page = <IessPercentagesPage records={iessPercentages} onDelete={deleteIessRecord} onSave={(record) => {
        const exists = iessPercentages.some(item => item.id === record.id)
        setIessPercentages(current => exists ? current.map(item => item.id === record.id ? record : item) : [record, ...current])
        showToast(exists ? 'Porcentaje IESS actualizado correctamente.' : 'Porcentaje IESS creado correctamente.')
      }} />
    } else if (requestedKey === 'salario-basico-unificado') {
      page = <SbuPage records={sbuRecords} onDelete={deleteSbuRecord} onSave={(record) => {
        const nextRecords = sbuRecords.some(item => item.id === record.id) ? sbuRecords.map(item => item.id === record.id ? record : item) : [record, ...sbuRecords]
        setSbuRecords(nextRecords)
        const today = currentEcuadorDate()
        const currentSbu = findSbuForDate(nextRecords, today)
        if (currentSbu && sbuEnabledEmployeeIds.length) {
          const enabledIds = new Set(sbuEnabledEmployeeIds)
          setEmployees(current => current.map(employee => enabledIds.has(employee.id) ? { ...employee, salary: currentSbu.value } : employee))
          setContractHistory(current => {
            const next = { ...current }
            sbuEnabledEmployeeIds.forEach(employeeId => {
              const lines = next[employeeId] ?? []
              const latest = lines.at(-1)
              if (!latest || latest.salary === currentSbu.value) return
              next[employeeId] = [...lines, { ...latest, id: `${employeeId}-SBU-${Date.now()}`, salary: currentSbu.value, effectiveDate: today }]
            })
            return next
          })
        }
        showToast(currentSbu && sbuEnabledEmployeeIds.length ? `SBU guardado y ${sbuEnabledEmployeeIds.length} salarios actualizados con trazabilidad.` : 'Salario Básico Unificado guardado correctamente.')
      }} />
    } else {
      const catalogKey: CatalogKey = requestedKey && requestedKey in catalogConfig ? requestedKey as CatalogKey : 'departamentos'
      page = catalogKey === 'rubros'
        ? <RubricsPage records={catalogs.rubros} onDelete={(record) => deleteCatalogRecord('rubros', record)} onSave={(record) => {
          const exists = catalogs.rubros.some(item => item.id === record.id)
          setCatalogs(current => ({ ...current, rubros: exists ? current.rubros.map(item => item.id === record.id ? record : item) : [record, ...current.rubros] }))
          showToast(exists ? 'Rubro actualizado correctamente.' : 'Rubro guardado en la sesión de validación.')
        }} />
        : <GeneralPage catalogKey={catalogKey} catalogs={catalogs} go={go} onAdd={() => setCatalogDialog(catalogKey)} onDelete={(record) => deleteCatalogRecord(catalogKey, record)} onUpdate={(record) => {
          setCatalogs(current => ({ ...current, [catalogKey]: current[catalogKey].map(item => item.id === record.id ? record : item) }))
          showToast(`${catalogConfig[catalogKey].singular.replace(/^./, letter => letter.toUpperCase())} actualizado correctamente.`)
        }} />
    }
  } else if (activePath === '/novedades' || activePath.startsWith('/nomina/')) {
    const requestedKey = activePath === '/novedades' ? 'novedades' : activePath.split('/')[2] as PayrollScreenKey
    const screenKey: PayrollScreenKey = requestedKey in payrollScreenConfig ? requestedKey : 'novedades'
    page = <PayrollModulePage screenKey={screenKey} employees={employees} catalogs={catalogs} novelties={novelties} setNovelties={setNovelties} noveltyUploads={noveltyUploads} setNoveltyUploads={setNoveltyUploads} absences={absences} setAbsences={setAbsences} overtimeRecords={overtimeRecords} setOvertimeRecords={setOvertimeRecords} overtimeUploads={overtimeUploads} setOvertimeUploads={setOvertimeUploads} payrollPeriodOverrides={payrollPeriodOverrides} />
  } else if (activePath.startsWith('/vacaciones/')) {
    const requestedKey = activePath.split('/')[2] as VacationScreenKey | undefined
    const screenKey: VacationScreenKey = requestedKey && requestedKey in vacationScreenConfig ? requestedKey : 'ingreso-novedades'
    page = <VacationModulePage screenKey={screenKey} go={go} employees={employees} catalogs={catalogs} contractHistory={contractHistory} historicalSalaries={historicalSalaries} pendingRecords={vacationPendingRecords} setPendingRecords={setVacationPendingRecords} pendingUploads={vacationPendingUploads} setPendingUploads={setVacationPendingUploads} vacationRequests={vacationRequests} setVacationRequests={setVacationRequests} />
  } else if (activePath.startsWith('/liquidacion-personal/')) {
    const requestedKey = activePath.split('/')[2] as PersonnelLiquidationScreenKey | undefined
    const screenKey: PersonnelLiquidationScreenKey = requestedKey && requestedKey in personnelLiquidationScreenConfig ? requestedKey : 'calculo-posible'
    page = <PersonnelLiquidationPage screenKey={screenKey} employees={employees} employeeProfiles={employeeProfiles} catalogs={catalogs} novelties={novelties} contractHistory={contractHistory} historicalSalaries={historicalSalaries} sbuRecords={sbuRecords} absences={absences} vacationPendingRecords={vacationPendingRecords} vacationRequests={vacationRequests} />
  } else if (activePath === '/liquidacion' || activePath.startsWith('/liquidacion/')) {
    const requestedKey = activePath.split('/')[2] as LiquidationScreenKey | undefined
    const screenKey: LiquidationScreenKey = requestedKey && requestedKey in liquidationScreenConfig ? requestedKey : 'configuracion-planilla'
    page = <LiquidationModulePage screenKey={screenKey} employees={employees} complementaryEmployees={complementaryEmployees} employeeProfiles={employeeProfiles} events={events} novelties={novelties} absences={absences} catalogs={catalogs} contractHistory={contractHistory} historicalSalaries={historicalSalaries} sbuRecords={sbuRecords} iessPercentages={iessPercentages} payrollLayoutOrders={payrollLayoutOrders} setPayrollLayoutOrders={setPayrollLayoutOrders} payrollLayoutEnabledIds={payrollLayoutEnabledIds} setPayrollLayoutEnabledIds={setPayrollLayoutEnabledIds} payrollPeriodOverrides={payrollPeriodOverrides} setPayrollPeriodOverrides={setPayrollPeriodOverrides} lastFortnightLiquidation={lastFortnightLiquidation} setLastFortnightLiquidation={setLastFortnightLiquidation} lastMonthEndLiquidation={lastMonthEndLiquidation} setLastMonthEndLiquidation={setLastMonthEndLiquidation} lastSocialBenefitLiquidation={lastSocialBenefitLiquidation} setLastSocialBenefitLiquidation={setLastSocialBenefitLiquidation} lastProfitLiquidation={lastProfitLiquidation} setLastProfitLiquidation={setLastProfitLiquidation} showToast={showToast} />
  } else {
    page = <Dashboard employees={employees} events={events} userName={currentUser.name} go={go} />
  }

  if (embedded) {
    return <div className="payroll-suite">
      <TableExportManager />
      <UploadedFileDownloadEnhancer />
      <main className="payroll-suite-content">{page}</main>
      {catalogDialog && <CatalogDialog catalogKey={catalogDialog} onClose={() => setCatalogDialog(null)} onSave={(record) => {
        setCatalogs(current => ({ ...current, [catalogDialog]: [record, ...current[catalogDialog]] }))
        setCatalogDialog(null)
        showToast(`${catalogConfig[catalogDialog].singular.replace(/^./, letter => letter.toUpperCase())} guardado en la sesión de validación.`)
      }} />}
      {profileDialogOpen && <CurrentUserProfileDialog employee={currentEmployee} profile={currentUserProfile} catalogs={catalogs} onClose={() => setProfileDialogOpen(false)} onSave={saveCurrentUserProfile} />}
      {passwordDialogOpen && <ChangePasswordDialog onClose={() => setPasswordDialogOpen(false)} onSave={() => { setPasswordDialogOpen(false); showToast('La contraseña fue actualizada correctamente.') }} />}
      {toast && <div className="toast" role="status"><CheckCircle2 size={20} />{toast}</div>}
    </div>
  }

  return (
    <div className="app-shell">
      <TableExportManager />
      <UploadedFileDownloadEnhancer />
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="Navegación principal">
        <div className="brand"><ShieldCheck size={27} strokeWidth={1.8} /><span>Nómina EC</span></div>
        <button className="sidebar-close" aria-label="Cerrar navegación" onClick={() => setSidebarOpen(false)}><X /></button>
        <p className="nav-eyebrow">ÁREA DE TRABAJO</p>
        <nav>
          {navItems.slice(0, 1).map(({ label, path, icon: Icon }) => <div className={`nav-group ${activePath === path ? 'has-active' : ''}`} key={label}>
            <button type="button" className={`nav-item ${activePath === path ? 'active' : ''}`} onClick={() => go(path)} aria-current={activePath === path ? 'page' : undefined}><Icon size={20} /><span>{label}</span></button>
          </div>)}

          <div className={`nav-group clients-group ${isClientsPath(activePath) ? 'has-active' : ''}`}>
            <button className={`nav-item module-root-item ${isClientsPath(activePath) ? 'active' : ''}`} onClick={() => toggleRootModule('CLIENTES')} aria-expanded={Boolean(expandedModules.CLIENTES)} aria-controls="nav-clientes">
              <Building2 size={20} /><span>Clientes</span><ChevronDown className={`nav-chevron ${expandedModules.CLIENTES ? 'open' : ''}`} size={17} />
            </button>
            {expandedModules.CLIENTES && <div className="nav-module-list client-screen-list" id="nav-clientes">
              <div className="nav-submenu client-submenu">
                {clientScreens.map(screen => <button type="button" key={screen.path} className={activePath === screen.path ? 'active' : ''} onClick={() => go(screen.path)} aria-current={activePath === screen.path ? 'page' : undefined}><span>{screen.label}</span></button>)}
              </div>
            </div>}
          </div>

          <div className={`nav-group human-talent-group ${isHumanTalentPath(activePath) ? 'has-active' : ''}`}>
            <button className={`nav-item module-root-item human-talent-item ${isHumanTalentPath(activePath) ? 'active' : ''}`} onClick={() => toggleRootModule('TALENTO HUMANO')} aria-expanded={Boolean(expandedModules['TALENTO HUMANO'])} aria-controls="nav-talento-humano">
              <BriefcaseBusiness size={20} /><span>Talento Humano</span><ChevronDown className={`nav-chevron ${expandedModules['TALENTO HUMANO'] ? 'open' : ''}`} size={17} />
            </button>
            {expandedModules['TALENTO HUMANO'] && <div className="nav-module-list" id="nav-talento-humano">
              <div className="nav-submenu human-talent-standalone-screens">
                {humanTalentStandaloneScreens.map(screen => <button type="button" key={screen.path} className={activePath === screen.path ? 'active' : ''} onClick={() => go(screen.path)} aria-current={activePath === screen.path ? 'page' : undefined}><span>{screen.label}</span></button>)}
              </div>
              {humanTalentModules.map(module => {
                const Icon = module.icon
                const moduleActive = isModulePath(module, activePath)
                const expanded = Boolean(expandedModules[module.label])
                const submenuId = navigationId(module.label)
                return <div className={`nav-module ${moduleActive ? 'has-active' : ''}`} key={module.label}>
                  <button className={`nav-module-button ${moduleActive ? 'active' : ''}`} onClick={() => toggleHumanTalentModule(module.label)} aria-expanded={expanded} aria-controls={submenuId}>
                    <Icon size={17} /><span>{module.label}</span><ChevronDown className={`nav-chevron ${expanded ? 'open' : ''}`} size={15} />
                  </button>
                  {expanded && <div className="nav-submenu" id={submenuId}>
                    {module.children.map(screen => {
                      const screenActive = activePath === screen.path || (screen.path === '/empleado/informacion' && activePath === '/empleados') || (screen.path === '/liquidacion/configuracion-planilla' && activePath === '/liquidacion')
                      return <button type="button" key={screen.path} className={screenActive ? 'active' : ''} onClick={() => go(screen.path)} aria-current={screenActive ? 'page' : undefined}><span>{screen.label}</span></button>
                    })}
                  </div>}
                </div>
              })}
            </div>}
          </div>

          <div className={`nav-group operations-group ${isOperationsPath(activePath) ? 'has-active' : ''}`}>
            <button className={`nav-item module-root-item ${isOperationsPath(activePath) ? 'active' : ''}`} onClick={() => toggleRootModule('OPERACIONES')} aria-expanded={Boolean(expandedModules.OPERACIONES)} aria-controls="nav-operaciones">
              <Play size={20} /><span>Operaciones</span><ChevronDown className={`nav-chevron ${expandedModules.OPERACIONES ? 'open' : ''}`} size={17} />
            </button>
            {expandedModules.OPERACIONES && <div className="nav-module-list client-screen-list" id="nav-operaciones">
              <div className="nav-submenu client-submenu">
                {operationsScreens.map(screen => <button type="button" key={screen.path} className={activePath === screen.path ? 'active' : ''} onClick={() => go(screen.path)} aria-current={activePath === screen.path ? 'page' : undefined}><span>{screen.label}</span></button>)}
              </div>
            </div>}
          </div>

          <div className={`nav-group personal-information-group ${isPersonalInformationPath(activePath) ? 'has-active' : ''}`}>
            <button className={`nav-item module-root-item ${isPersonalInformationPath(activePath) ? 'active' : ''}`} onClick={() => toggleRootModule('INFORMACIÓN PERSONAL')} aria-expanded={Boolean(expandedModules['INFORMACIÓN PERSONAL'])} aria-controls="nav-informacion-personal">
              <Users size={20} /><span>Información Personal</span><ChevronDown className={`nav-chevron ${expandedModules['INFORMACIÓN PERSONAL'] ? 'open' : ''}`} size={17} />
            </button>
            {expandedModules['INFORMACIÓN PERSONAL'] && <div className="nav-module-list client-screen-list" id="nav-informacion-personal">
              <div className="nav-submenu client-submenu">
                {personalInformationScreens.map(screen => <button type="button" key={screen.path} className={activePath === screen.path ? 'active' : ''} onClick={() => go(screen.path)} aria-current={activePath === screen.path ? 'page' : undefined}><span>{screen.label}</span></button>)}
              </div>
            </div>}
          </div>

          <div className={`nav-group general-configuration-group ${isGeneralConfigurationPath(activePath) ? 'has-active' : ''}`}>
            <button className={`nav-item module-root-item ${isGeneralConfigurationPath(activePath) ? 'active' : ''}`} onClick={() => toggleRootModule('CONFIGURACIÓN GENERAL')} aria-expanded={Boolean(expandedModules['CONFIGURACIÓN GENERAL'])} aria-controls="nav-configuracion-general">
              <Settings size={20} /><span>Configuración General</span><ChevronDown className={`nav-chevron ${expandedModules['CONFIGURACIÓN GENERAL'] ? 'open' : ''}`} size={17} />
            </button>
            {expandedModules['CONFIGURACIÓN GENERAL'] && <div className="nav-module-list client-screen-list" id="nav-configuracion-general">
              <div className="nav-submenu client-submenu">
                {generalConfigurationScreens.map(screen => <button type="button" key={screen.path} className={activePath === screen.path ? 'active' : ''} onClick={() => go(screen.path)} aria-current={activePath === screen.path ? 'page' : undefined}><span>{screen.label}</span></button>)}
              </div>
            </div>}
          </div>

        </nav>
        <div className="sidebar-foot user-account-footer">
          {userMenuOpen && <div className="user-account-menu" role="menu" aria-label="Opciones del usuario"><button type="button" role="menuitem" onClick={() => { setProfileDialogOpen(true); setUserMenuOpen(false) }}><UserRound size={17} /><span>Mi Perfil</span></button><button type="button" role="menuitem" onClick={() => { setPasswordDialogOpen(true); setUserMenuOpen(false) }}><LockKeyhole size={17} /><span>Cambiar Contraseña</span></button><button type="button" role="menuitem" onClick={() => { window.localStorage.removeItem('seguridad-usuario-autenticado'); setAuthenticatedUserId(''); setUserMenuOpen(false); go('/login') }}><LogOut size={17} /><span>Logout</span></button></div>}
          <button type="button" className="user-account-button" onClick={() => setUserMenuOpen(current => !current)} aria-expanded={userMenuOpen} aria-haspopup="menu"><span className="user-account-photo">{currentUserProfile.photoDataUrl ? <img src={currentUserProfile.photoDataUrl} alt="Foto del usuario" /> : currentUser.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span><span className="user-account-identity"><strong>{currentUser.name}</strong><small>{currentUser.role}</small></span><ChevronDown size={17} className={userMenuOpen ? 'open' : ''} /></button>
        </div>
      </aside>
      {sidebarOpen && <button className="scrim" aria-label="Cerrar navegación" onClick={() => setSidebarOpen(false)} />}

      <div className="workspace">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Abrir navegación" onClick={() => setSidebarOpen(true)}><Menu /></button>
          <button className="company-switcher"><Building2 size={18} /><span>{companySettings.name || 'Sin nombre de compañía'}</span><ChevronDown size={16} /></button>
          <form className="topbar-screen-search" role="search" onSubmit={event => { event.preventDefault(); if (matchingScreens[0]) openScreenResult(matchingScreens[0]) }} onBlur={() => window.setTimeout(() => setScreenSearchOpen(false), 150)}>
            <label><Search size={17} /><span className="sr-only">Buscar pantalla</span><input value={screenSearch} onFocus={() => setScreenSearchOpen(Boolean(screenSearch.trim()))} onChange={event => changeScreenSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { setScreenSearch(''); setScreenSearchOpen(false); event.currentTarget.blur() } }} placeholder="Buscar pantalla" autoComplete="off" aria-expanded={screenSearchOpen} aria-controls="screen-search-results" /></label>
            {screenSearchOpen && <div className="screen-search-results" id="screen-search-results" role="listbox" aria-label="Pantallas encontradas">
              {matchingScreens.map(screen => <button type="button" role="option" aria-selected={activePath === screen.path} key={screen.path} onMouseDown={event => event.preventDefault()} onClick={() => openScreenResult(screen)} onMouseEnter={() => revealScreen(screen)}><Search size={16} /><span><strong>{screen.label}</strong><small>{screen.location.join(' › ')}</small></span><ChevronRight size={16} /></button>)}
              {!matchingScreens.length && <div className="screen-search-empty"><Search size={18} /><span><strong>Sin coincidencias</strong><small>Prueba con otro nombre de pantalla.</small></span></div>}
            </div>}
          </form>
          <div className="notification-center">
            <button className={`icon-button notification-button${activeAlarm ? ' alarm-active' : ''}`} aria-label={activeAlarm ? 'Alarma de pánico activa' : 'Notificaciones'} aria-expanded={alarmMenuOpen} onClick={() => setAlarmMenuOpen(current => !current)}><Bell size={20} /><span className={`notification-dot${activeAlarm ? ' alarm-dot' : ''}`} /></button>
            {alarmMenuOpen && <div className="notification-popover" role="dialog" aria-label="Notificaciones de alarma">
              <div className="notification-popover-heading"><div className={activeAlarm ? 'alarm-notification-icon active' : 'alarm-notification-icon'}><Bell size={19} /></div><div><strong>{activeAlarm ? activeAlarm.status === 'ACTIVE' ? 'Alarma de pánico activa' : 'Alarma pendiente de resolución' : 'Notificaciones'}</strong><span>{activeAlarm ? activeAlarm.status === 'ACTIVE' ? 'Requiere atención inmediata' : 'Desactivada por el guarda; requiere confirmación' : 'Sin alertas de pánico'}</span></div></div>
              {activeAlarm ? <div className="alarm-notification-detail"><div><span>Cliente</span><strong>{activeAlarm.client}</strong></div><div><span>Guarda</span><strong>{activeAlarm.guard}</strong></div><div><span>Activada</span><strong>{new Date(activeAlarm.activatedAt).toLocaleString('es-EC')}</strong></div>{activeAlarm.deactivatedAt && <div><span>Desactivada por el guarda</span><strong>{new Date(activeAlarm.deactivatedAt).toLocaleString('es-EC')}</strong></div>}<button type="button" className="button primary alarm-resolve-button" disabled={resolvingAlarm} onClick={() => void resolveAlarm()}><CheckCircle2 size={17} />{resolvingAlarm ? 'Confirmando…' : 'Confirmar novedad solventada'}</button></div> : <div className="notification-empty">No existen alarmas activas.</div>}
            </div>}
          </div>
          <div className="avatar" aria-label={`Usuario ${currentUser.name}, ${currentUser.role}`}>{currentUserProfile.photoDataUrl ? <img src={currentUserProfile.photoDataUrl} alt="" /> : currentUser.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</div>
        </header>
        <div className="workspace-tabbar" role="tablist" aria-label="Pantallas abiertas">
          {workspaceTabs.map(tab => { const active = activeWorkspacePath === tab.path; return <div className={`workspace-tab${active ? ' active' : ''}`} role="presentation" key={tab.path}>
            <button type="button" className="workspace-tab-select" role="tab" aria-selected={active} onClick={() => go(tab.path)}><span>{tab.label}</span></button>
            <button type="button" className="workspace-tab-action" onClick={() => { if (!active) go(tab.path); window.setTimeout(() => window.location.reload(), active ? 0 : 75) }} aria-label={`Actualizar ${tab.label}`} title="Actualizar pantalla"><RotateCcw size={14} /></button>
            <button type="button" className="workspace-tab-action close" onClick={() => closeWorkspaceTab(tab.path)} aria-label={`Cerrar ${tab.label}`} title="Cerrar pantalla"><X size={14} /></button>
          </div> })}
        </div>
        <main id="main" className="content">{page}</main>
      </div>

      {catalogDialog && <CatalogDialog catalogKey={catalogDialog} onClose={() => setCatalogDialog(null)} onSave={(record) => {
        setCatalogs(current => ({ ...current, [catalogDialog]: [record, ...current[catalogDialog]] }))
        setCatalogDialog(null)
        showToast(`${catalogConfig[catalogDialog].singular.replace(/^./, letter => letter.toUpperCase())} guardado en la sesión de validación.`)
      }} />}
      {profileDialogOpen && <CurrentUserProfileDialog employee={currentEmployee} profile={currentUserProfile} catalogs={catalogs} onClose={() => setProfileDialogOpen(false)} onSave={saveCurrentUserProfile} />}
      {passwordDialogOpen && <ChangePasswordDialog onClose={() => setPasswordDialogOpen(false)} onSave={() => { setPasswordDialogOpen(false); showToast('La contraseña fue actualizada correctamente.') }} />}
      {toast && <div className="toast" role="status"><CheckCircle2 size={20} />{toast}</div>}
    </div>
  )
}

function LoginPage({ company, users, template, onLogin, onPasswordChange }: { company: CompanySettings; users: PlatformUser[]; template: EmailTemplate; onLogin: (userId: string) => void; onPasswordChange: (userId: string, password: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [recoveryOpen, setRecoveryOpen] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const normalized = username.trim().toLocaleLowerCase('es')
    const user = users.find(item => item.status === 'ACTIVO' && (item.username.toLocaleLowerCase('es') === normalized || item.email.toLocaleLowerCase('es') === normalized))
    if (!normalized || !password) { setLoginError('Ingresa tu usuario y contraseña.'); return }
    if (!user) { setLoginError('El usuario no existe o se encuentra inactivo.'); return }
    if (user.password && user.password !== password) { setLoginError('La contraseña ingresada es incorrecta.'); return }
    setLoginError('')
    onLogin(user.id)
  }

  return <main className="login-page">
    <section className={`login-visual ${company.loginBackground ? 'has-background' : ''}`} style={company.loginBackground ? { backgroundImage: `url(${company.loginBackground.dataUrl})` } : undefined} aria-label="Imagen institucional de acceso">
      <div className="login-visual-overlay" />
      <div className="login-visual-content"><span>Plataforma de gestión</span><h1>{company.name || 'Nómina EC'}</h1><p>Información segura para administrar tu organización.</p></div>
    </section>
    <section className="login-access" aria-label="Acceso a la plataforma">
      <div className="login-card">
        <div className="login-brand">
          {company.logo ? <img src={company.logo.dataUrl} alt={`Logo de ${company.name || 'la compañía'}`} /> : <div className="login-brand-fallback"><ShieldCheck size={38} /><strong>{company.name || 'Nómina EC'}</strong></div>}
        </div>
        <div className="login-intro"><h2>Bienvenido</h2><p>Por favor, ingresa tus credenciales para continuar.</p></div>
        <form className="login-form" onSubmit={submit} noValidate>
          {loginError && <div className="login-error" role="alert"><AlertTriangle size={18} /><span>{loginError}</span></div>}
          <label className="login-field"><span className="sr-only">Usuario o correo</span><UserRound size={18} /><input value={username} onChange={event => { setUsername(event.target.value); setLoginError('') }} placeholder="Usuario o correo" autoComplete="username" autoFocus /></label>
          <label className="login-field"><span className="sr-only">Contraseña</span><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => { setPassword(event.target.value); setLoginError('') }} placeholder="Contraseña" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(current => !current)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></label>
          <button type="button" className="login-recovery-link" onClick={() => setRecoveryOpen(true)}>¿Olvidaste tu contraseña?</button>
          <button type="submit" className="button primary login-submit">Ingresar</button>
        </form>
      </div>
    </section>
    {recoveryOpen && <PasswordRecoveryDialog users={users} company={company} template={template} onPasswordChange={onPasswordChange} onClose={() => setRecoveryOpen(false)} />}
  </main>
}

function PasswordRecoveryDialog({ users, company, template, onPasswordChange, onClose }: { users: PlatformUser[]; company: CompanySettings; template: EmailTemplate; onPasswordChange: (userId: string, password: string) => void; onClose: () => void }) {
  const [identifier, setIdentifier] = useState('')
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null)
  const [sentCode, setSentCode] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [completed, setCompleted] = useState(false)

  const prepareRecoveryEmail = (user: PlatformUser) => {
    const code = sixDigitCode()
    const message = {
      to: user.email,
      from: company.from || company.senderEmail,
      subject: renderEmailTemplate(template.subject, { NOMBRE: user.name, CODIGO: code }),
      body: renderEmailTemplate(template.body, { NOMBRE: user.name, CODIGO: code }),
      code,
      createdAt: new Date().toISOString(),
    }
    window.localStorage.setItem('seguridad-ultimo-correo-recuperacion', JSON.stringify(message))
    setSentCode(code)
  }

  const sendCode = (event: FormEvent) => {
    event.preventDefault()
    const normalized = identifier.trim().toLocaleLowerCase('es')
    const user = users.find(item => item.status === 'ACTIVO' && (item.username.toLocaleLowerCase('es') === normalized || item.email.toLocaleLowerCase('es') === normalized))
    if (!normalized) { setError('Ingresa tu usuario o correo.'); return }
    if (!user) { setError('No encontramos un usuario activo con esa información.'); return }
    prepareRecoveryEmail(user)
    setSelectedUser(user)
    setError('')
    setNotice('')
  }

  const resendCode = () => {
    if (!selectedUser) return
    prepareRecoveryEmail(selectedUser)
    setOtp('')
    setError('')
    setNotice('Se envió un nuevo código. El código anterior dejó de ser válido.')
  }

  const changePassword = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedUser) return
    if (otp.length !== 6 || otp !== sentCode) { setError('Código incorrecto, ingresa el nuevo código.'); return }
    if (newPassword.length < 8) { setError('La nueva contraseña debe tener al menos 8 caracteres.'); return }
    if (newPassword !== confirmation) { setError('Las contraseñas no coinciden.'); return }
    onPasswordChange(selectedUser.id, newPassword)
    window.localStorage.removeItem('seguridad-ultimo-correo-recuperacion')
    setError('')
    setCompleted(true)
  }

  const maskedEmail = selectedUser ? selectedUser.email.replace(/^(.)([^@]*)(@.*)$/, (_, first: string, middle: string, domain: string) => `${first}${'*'.repeat(Math.max(4, Math.min(8, middle.length)))}${domain}`) : ''

  return <div className="modal-layer login-recovery-layer" role="presentation"><section className="dialog login-recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="login-recovery-title">
    {!selectedUser ? <>
      <div className="dialog-head"><div><h2 id="login-recovery-title">Recuperar Contraseña</h2><p>Ingresa tu usuario o correo</p></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}><X /></button></div>
      <form onSubmit={sendCode} noValidate>
        {error && <div className="login-error" role="alert"><AlertTriangle size={18} /><span>{error}</span></div>}
        <div className="field"><label htmlFor="recovery-identifier">Usuario o correo</label><input id="recovery-identifier" value={identifier} onChange={event => { setIdentifier(event.target.value); setError('') }} placeholder="usuario@empresa.com" autoComplete="username" autoFocus /></div>
        <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">Enviar Código</button></div>
      </form>
    </> : completed ? <div className="login-recovery-success"><span className="login-recovery-success-icon"><CheckCircle2 size={26} /></span><h2 id="login-recovery-title">Contraseña actualizada</h2><p>La nueva contraseña fue guardada correctamente en la información de <b>{selectedUser.name}</b>.</p><button type="button" className="button primary full" onClick={onClose}>Volver al inicio de sesión</button></div> : <>
      <div className="dialog-head"><div><h2 id="login-recovery-title">Cambio de Contraseña</h2><p>Código enviado a {maskedEmail}</p></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}><X /></button></div>
      <form className="password-reset-form" onSubmit={changePassword} noValidate>
        {error && <div className="login-error" role="alert"><AlertTriangle size={18} /><span>{error}</span></div>}
        {notice && <div className="password-reset-notice" role="status"><Mail size={18} /><span>{notice}</span></div>}
        <div className="field"><label htmlFor="recovery-otp">Código OTP (6 dígitos)</label><input id="recovery-otp" value={otp} onChange={event => { setOtp(event.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus /></div>
        <div className="field"><label htmlFor="recovery-new-password">Nueva Contraseña</label><div className="password-reset-field"><input id="recovery-new-password" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={event => { setNewPassword(event.target.value); setError('') }} autoComplete="new-password" /><button type="button" onClick={() => setShowNewPassword(current => !current)} aria-label={showNewPassword ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}>{showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
        <div className="field"><label htmlFor="recovery-confirm-password">Confirmar Contraseña</label><div className="password-reset-field"><input id="recovery-confirm-password" type={showConfirmation ? 'text' : 'password'} value={confirmation} onChange={event => { setConfirmation(event.target.value); setError('') }} autoComplete="new-password" /><button type="button" onClick={() => setShowConfirmation(current => !current)} aria-label={showConfirmation ? 'Ocultar confirmación' : 'Mostrar confirmación'}>{showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
        <button type="button" className="password-resend-button" onClick={resendCode}>Reenviar código ahora</button>
        <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">Cambiar Contraseña</button></div>
      </form>
    </>}
  </section></div>
}

function PageHeader({ eyebrow, title, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-header"><div><p className="breadcrumb">{eyebrow}</p><span className="page-module-chip">Módulo operativo</span><h1>{title}</h1></div>{action && <div className="page-actions">{action}</div>}</div>
}

function PersonnelControlBoardPage({ area, currentRole, employees, records, setRecords, requests, setRequests }: { area: 'OPERACIONES' | 'TALENTO_HUMANO'; currentRole: string; employees: Employee[]; records: PersonnelControlRecord[]; setRecords: Dispatch<SetStateAction<PersonnelControlRecord[]>>; requests: PersonalRequest[]; setRequests: Dispatch<SetStateAction<PersonalRequest[]>> }) {
  const [editing, setEditing] = useState<PersonnelControlRecord | null | undefined>(undefined)
  const [query, setQuery] = useState('')
  const employeeMap = Object.fromEntries(employees.map(employee => [employee.id, employee]))
  const filtered = records.filter(record => {
    const employee = employeeMap[record.employeeId]
    return `${record.date} ${employee?.name ?? ''} ${employee?.document ?? ''} ${record.detail} ${record.status}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))
  })
  const recordSort = useSortableRows(filtered, {
    date: row => row.date,
    employee: row => employeeMap[row.employeeId]?.name ?? '',
    identification: row => employeeMap[row.employeeId]?.document ?? '',
    detail: row => row.detail,
    status: row => row.status,
  })
  const requestType: PersonalRequest['type'] = area === 'OPERACIONES' ? 'PERMISO' : 'ANTICIPO'
  const routedRequests = requests.filter(request => request.type === requestType)
  const requestSort = useSortableRows(routedRequests, {
    date: row => row.requestDate,
    employee: row => employeeMap[row.employeeId]?.name ?? '',
    identification: row => employeeMap[row.employeeId]?.document ?? '',
    detail: row => row.observation,
    status: row => row.status,
  })
  const normalizedRole = currentRole.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es')
  const isAdministrator = normalizedRole === 'administrador' || normalizedRole === 'administradora'
  const canReview = isAdministrator || (area === 'OPERACIONES' ? normalizedRole === 'supervisor' || normalizedRole === 'jefe de operaciones' : normalizedRole === 'talento humano')
  const resolveRequest = (requestId: string, status: Extract<PersonalRequest['status'], 'APROBADA' | 'RECHAZADA'>) => {
    if (!canReview) return
    setRequests(current => current.map(request => request.id === requestId ? { ...request, status } : request))
  }
  const title = area === 'OPERACIONES' ? 'Tablero de Control Operativo' : 'Tablero de Control del Personal'
  const eyebrow = area === 'OPERACIONES' ? `Operaciones / ${title}` : `Talento Humano / ${title}`
  const saveRecord = (record: PersonnelControlRecord) => {
    setRecords(current => current.some(item => item.id === record.id) ? current.map(item => item.id === record.id ? record : item) : [record, ...current])
    setEditing(undefined)
  }
  const displayDate = (value: string) => { const [year, month, day] = value.split('-'); return day && month && year ? `${day}/${month}/${year}` : value }
  return <>
    <PageHeader eyebrow={eyebrow} title={title} description="" action={<button className="button primary" onClick={() => setEditing(null)}><Plus size={18} /> Nueva Novedad</button>} />
    <section className="panel table-panel personnel-request-board"><div className="panel-heading table-title"><div><h2>{area === 'OPERACIONES' ? 'Solicitudes de Permiso' : 'Solicitudes de Anticipo'}</h2></div><Badge tone={routedRequests.some(request => request.status === 'NOTIFICADA') ? 'warning' : 'neutral'}>{routedRequests.filter(request => request.status === 'NOTIFICADA').length} pendientes</Badge></div><div className="table-scroll" role="region" aria-label={area === 'OPERACIONES' ? 'Solicitudes de permiso' : 'Solicitudes de anticipo'} tabIndex={0}><table><thead><tr><SortableTh label="Fecha" sortKey="date" sort={requestSort.sort} onSort={requestSort.toggleSort} /><SortableTh label="Empleado" sortKey="employee" sort={requestSort.sort} onSort={requestSort.toggleSort} /><SortableTh label="Identificación" sortKey="identification" sort={requestSort.sort} onSort={requestSort.toggleSort} /><SortableTh label="Detalle" sortKey="detail" sort={requestSort.sort} onSort={requestSort.toggleSort} /><th>{area === 'OPERACIONES' ? 'Periodo solicitado' : 'Valor y aplicación'}</th><SortableTh label="Estado" sortKey="status" sort={requestSort.sort} onSort={requestSort.toggleSort} /><th>Acciones</th></tr></thead><tbody>{requestSort.sortedRows.map(request => { const employee = employeeMap[request.employeeId]; const requestDetail = request.type === 'PERMISO' ? `${request.fromDate?.split('-').reverse().join('/') ?? '—'} — ${request.toDate?.split('-').reverse().join('/') ?? '—'}` : `${money(request.value ?? '0.00')} · ${request.applicationForm === 'CUOTAS' ? `${request.installments ?? 1} cuotas` : 'Total'}`; return <tr key={request.id}><td>{displayDate(request.requestDate)}</td><td><strong>{employee?.name ?? 'Empleado no disponible'}</strong></td><td>{employee?.document ?? 'Sin identificación'}</td><td>{request.observation}</td><td>{requestDetail}</td><td><Badge tone={request.status === 'APROBADA' ? 'success' : request.status === 'RECHAZADA' ? 'neutral' : 'warning'}>{request.status === 'APROBADA' ? 'Aprobada' : request.status === 'RECHAZADA' ? 'Rechazada' : 'Notificada'}</Badge></td><td>{request.status === 'NOTIFICADA' ? <div className="request-review-actions"><button type="button" className="icon-button small request-approve" disabled={!canReview} onClick={() => resolveRequest(request.id, 'APROBADA')} aria-label={`Aprobar solicitud de ${employee?.name ?? request.id}`} title={canReview ? 'Aprobar solicitud' : 'Tu rol no puede aprobar esta solicitud'}><Check size={18} /></button><button type="button" className="icon-button small request-reject" disabled={!canReview} onClick={() => resolveRequest(request.id, 'RECHAZADA')} aria-label={`Rechazar solicitud de ${employee?.name ?? request.id}`} title={canReview ? 'Rechazar solicitud' : 'Tu rol no puede rechazar esta solicitud'}><X size={18} /></button></div> : <span className="cell-meta">Resuelta</span>}</td></tr>})}{!requestSort.sortedRows.length && <tr><td colSpan={7}><div className="empty-state compact"><FileText /><strong>Sin solicitudes</strong><p>{area === 'OPERACIONES' ? 'Los permisos solicitados por los empleados aparecerán aquí.' : 'Los anticipos solicitados por los empleados aparecerán aquí.'}</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{routedRequests.length} solicitudes</span><span>{area === 'OPERACIONES' ? 'Revisión: Supervisor o Jefe de Operaciones' : 'Revisión: Talento Humano'}</span></div></section>
    <section className="panel table-panel personnel-control-board"><div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar novedades del personal</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por empleado, identificación, detalle o estado" /></label></div><div className="table-scroll" role="region" aria-label={title} tabIndex={0}><table><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Fecha" sortKey="date" sort={recordSort.sort} onSort={recordSort.toggleSort} /><SortableTh label="Empleado" sortKey="employee" sort={recordSort.sort} onSort={recordSort.toggleSort} /><SortableTh label="Identificación" sortKey="identification" sort={recordSort.sort} onSort={recordSort.toggleSort} /><SortableTh label="Novedad" sortKey="detail" sort={recordSort.sort} onSort={recordSort.toggleSort} /><SortableTh label="Estado" sortKey="status" sort={recordSort.sort} onSort={recordSort.toggleSort} /></tr></thead><tbody>{recordSort.sortedRows.map(record => { const employee = employeeMap[record.employeeId]; return <tr key={record.id}><td className="row-action-cell"><button className="icon-button small edit-icon" onClick={() => setEditing(record)} aria-label={`Editar novedad de ${employee?.name ?? record.id}`} title="Editar novedad"><Pencil size={17} /></button></td><td>{displayDate(record.date)}</td><td><strong>{employee?.name ?? 'Empleado no disponible'}</strong></td><td>{employee?.document ?? 'Sin identificación'}</td><td>{record.detail}</td><td><Badge tone={record.status === 'ATENDIDA' ? 'success' : record.status === 'EN_REVISION' ? 'warning' : 'info'}>{record.status === 'ATENDIDA' ? 'Atendida' : record.status === 'EN_REVISION' ? 'En revisión' : 'Registrada'}</Badge></td></tr>})}{!recordSort.sortedRows.length && <tr><td colSpan={6}><div className="empty-state"><ClipboardList /><strong>Sin novedades registradas</strong><p>No existen novedades del personal que coincidan con la búsqueda.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{recordSort.sortedRows.length} de {records.length} novedades</span></div></section>
    {editing !== undefined && <PersonnelControlDialog record={editing ?? undefined} employees={employees} onClose={() => setEditing(undefined)} onSave={saveRecord} />}
  </>
}

function PersonnelControlDialog({ record, employees, onClose, onSave }: { record?: PersonnelControlRecord; employees: Employee[]; onClose: () => void; onSave: (record: PersonnelControlRecord) => void }) {
  const sortedEmployees = useMemo(() => [...employees].sort((a, b) => a.name.localeCompare(b.name, 'es')), [employees])
  const initialEmployee = employees.find(employee => employee.id === record?.employeeId)
  const [employeeId, setEmployeeId] = useState(record?.employeeId ?? '')
  const [employeeName, setEmployeeName] = useState(initialEmployee?.name ?? '')
  const [identification, setIdentification] = useState(initialEmployee?.document ?? '')
  const [date, setDate] = useState(record?.date ?? currentEcuadorDate())
  const [detail, setDetail] = useState(record?.detail ?? '')
  const [status, setStatus] = useState<PersonnelControlRecord['status']>(record?.status ?? 'REGISTRADA')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!employeeId) nextErrors.employee = 'Selecciona un empleado por nombre o identificación.'
    if (!date) nextErrors.date = 'Selecciona la fecha de la novedad.'
    if (!detail.trim()) nextErrors.detail = 'Ingresa el detalle de la novedad.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSave({ id: record?.id ?? `CTL-${Date.now()}`, date, employeeId, detail: detail.trim(), status })
  }
  return <Dialog title={record ? 'Editar Novedad' : 'Nueva Novedad'} description="" onClose={onClose}><form onSubmit={submit} noValidate>{Object.keys(errors).length > 0 && <div className="form-error" role="alert"><strong>Revisa los campos indicados.</strong><span>No se guardó la novedad.</span></div>}<div className="form-grid"><div className="employee-lookup-grid full-width-field"><div className="field"><label htmlFor="control-employee">Empleado <span>Obligatorio</span></label><input id="control-employee" list="control-employee-options" value={employeeName} onChange={event => { const value = event.target.value; const employee = employees.find(item => item.name.localeCompare(value.trim(), 'es', { sensitivity: 'base' }) === 0); setEmployeeName(value); setIdentification(employee?.document ?? ''); setEmployeeId(employee?.id ?? '') }} placeholder="Escribe el nombre" autoComplete="off" aria-invalid={Boolean(errors.employee)} /><datalist id="control-employee-options">{sortedEmployees.map(employee => <option value={employee.name} key={employee.id}>{employee.document}</option>)}</datalist></div><div className="field"><label htmlFor="control-identification">Identificación <span>Obligatorio</span></label><input id="control-identification" list="control-identification-options" value={identification} onChange={event => { const value = event.target.value; const employee = employees.find(item => item.document.localeCompare(value.trim(), 'es', { sensitivity: 'base' }) === 0); setIdentification(value); setEmployeeName(employee?.name ?? ''); setEmployeeId(employee?.id ?? '') }} placeholder="Escribe la identificación" autoComplete="off" aria-invalid={Boolean(errors.employee)} /><datalist id="control-identification-options">{sortedEmployees.map(employee => <option value={employee.document} key={employee.id}>{employee.name}</option>)}</datalist></div>{errors.employee && <small className="field-error employee-lookup-error">{errors.employee}</small>}</div><div className="field"><label htmlFor="control-date">Fecha <span>Obligatorio</span></label><input id="control-date" type="date" value={date} onChange={event => setDate(event.target.value)} aria-invalid={Boolean(errors.date)} />{errors.date && <small className="field-error">{errors.date}</small>}</div><div className="field"><label htmlFor="control-status">Estado <span>Obligatorio</span></label><select id="control-status" value={status} onChange={event => setStatus(event.target.value as PersonnelControlRecord['status'])}><option value="REGISTRADA">Registrada</option><option value="EN_REVISION">En revisión</option><option value="ATENDIDA">Atendida</option></select></div><div className="field full-width-field"><label htmlFor="control-detail">Novedad <span>Obligatorio</span></label><textarea id="control-detail" value={detail} onChange={event => setDetail(event.target.value.slice(0, 300))} maxLength={300} rows={4} aria-invalid={Boolean(errors.detail)} /><small className="field-help">Máximo 300 caracteres · {detail.length}/300.</small>{errors.detail && <small className="field-error">{errors.detail}</small>}</div></div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">{record ? 'Guardar cambios' : 'Registrar novedad'}</button></div></form></Dialog>
}

function ClientOperationsPage({ clients, employees, onSaveClient }: { clients: Client[]; employees: Employee[]; onSaveClient: (client: Client) => void }) {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'OPERATIVOS' | 'TAREAS'>('GENERAL')
  const [selectedClientCode, setSelectedClientCode] = useState(clients[0]?.code ?? '')
  const [selectedContractId, setSelectedContractId] = useState('')
  const [selectedAssignmentKey, setSelectedAssignmentKey] = useState('')
  const [assignments] = useState<Record<string, string>>(() => storedValue('nomina-asignacion-empleados', {}))
  const [definitiveSchedules, setDefinitiveSchedules] = useState<Record<string, DefinitiveOperationsSchedule>>(() => storedValue('operaciones-horarios-definitivos', {}))
  const [scheduleFeedback, setScheduleFeedback] = useState('')
  const [specificTasks, setSpecificTasks] = useState<ClientSpecificTask[]>(() => storedValue('operaciones-tareas-especificas', []))
  const [selectedTaskContract, setSelectedTaskContract] = useState('')
  const [taskType, setTaskType] = useState<ClientSpecificTask['taskType']>('ADMINISTRATIVA')
  const [taskDetail, setTaskDetail] = useState('')
  const [taskPeriodicity, setTaskPeriodicity] = useState<ClientSpecificTask['periodicity']>('DIARIO')
  const [taskResponsible, setTaskResponsible] = useState<ClientSpecificTask['responsible']>('JEFE_OPERACIONES')
  const [taskEmployeeId, setTaskEmployeeId] = useState('')
  const [taskRequiresPhotoSupport, setTaskRequiresPhotoSupport] = useState(false)
  const [taskFeedback, setTaskFeedback] = useState('')
  const [branchLocationDrafts, setBranchLocationDrafts] = useState<Record<string, { gpsLocation: string; geofenceRadiusMeters: string }>>({})
  const [branchLocationFeedback, setBranchLocationFeedback] = useState<Record<string, { tone: 'success' | 'error'; message: string }>>({})
  useEffect(() => { window.localStorage.setItem('operaciones-horarios-definitivos', JSON.stringify(definitiveSchedules)) }, [definitiveSchedules])
  useEffect(() => { window.localStorage.setItem('operaciones-tareas-especificas', JSON.stringify(specificTasks)) }, [specificTasks])
  useEffect(() => {
    const publishedTasks = specificTasks.map(task => {
      const client = clients.find(item => item.code === task.clientCode)
      const contract = client?.operationalContracts?.find(item => item.id === task.contractId)
      const assignedEmployeeIds = [...new Set(Object.entries(assignments).filter(([key]) => key.startsWith(`${task.clientCode}|${task.contractId}|`)).map(([, employeeId]) => employeeId))]
      return { ...task, employeeIds: task.employeeIds?.length ? task.employeeIds : assignedEmployeeIds, clientName: client?.businessName ?? task.clientCode, contractName: contract?.contractName ?? task.contractId }
    })
    void fetch('http://127.0.0.1:4180/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(publishedTasks) }).catch(() => undefined)
  }, [specificTasks, clients, assignments])

  const selectedClient = clients.find(client => client.code === selectedClientCode) ?? clients[0]
  const clientContracts = selectedClient?.operationalContracts ?? []
  const resolvedContractId = clientContracts.some(contract => contract.id === selectedContractId) ? selectedContractId : clientContracts[0]?.id ?? ''
  const selectedContract = clientContracts.find(contract => contract.id === resolvedContractId)
  const positionRows = selectedClient && selectedContract ? [
    ...Array.from({ length: Math.max(0, selectedContract.positions) }, (_, index) => ({ key: `${selectedClient.code}|${selectedContract.id}|${index + 1}`, scheduleKey: String(index + 1), label: `Posición ${String(index + 1).padStart(2, '0')}` })),
    ...(selectedContract.fixedSupervisor && selectedContract.fixedSupervisorCount > 0
      ? Array.from({ length: selectedContract.fixedSupervisorCount }, (_, index) => ({ key: `${selectedClient.code}|${selectedContract.id}|SUPERVISOR_FIJO_${index + 1}`, scheduleKey: `SUPERVISOR_FIJO_${index + 1}`, label: `Supervisor Fijo ${String(index + 1).padStart(2, '0')}` }))
      : [{ key: `${selectedClient.code}|${selectedContract.id}|SUPERVISOR_COMPARTIDO`, scheduleKey: 'SUPERVISOR_COMPARTIDO', label: 'Supervisor Compartido' }]),
  ].map(position => ({ ...position, employeeId: assignments[position.key] ?? '', employee: employees.find(employee => employee.id === assignments[position.key]) })) : []
  const assignedPositions = positionRows.filter(position => position.employee)
  const resolvedAssignmentKey = assignedPositions.some(position => position.key === selectedAssignmentKey) ? selectedAssignmentKey : assignedPositions[0]?.key ?? ''
  const selectedPosition = assignedPositions.find(position => position.key === resolvedAssignmentKey)
  const currentSchedule = definitiveSchedules[resolvedAssignmentKey] ?? { cells: [], cycleDays: 0, repeats: false, updatedAt: '' }
  const scheduleColumns = currentSchedule.cycleDays > 0 ? Array.from({ length: currentSchedule.cycleDays }, (_, index) => ({ key: `DIA${index + 1}`, label: `Día ${index + 1}` })) : operationalWeek
  const updateSchedule = (changes: Partial<DefinitiveOperationsSchedule>) => {
    if (!resolvedAssignmentKey) return
    setDefinitiveSchedules(current => ({ ...current, [resolvedAssignmentKey]: { ...(current[resolvedAssignmentKey] ?? { cells: [], cycleDays: 0, repeats: false, updatedAt: '' }), ...changes, updatedAt: currentEcuadorDate() } }))
    setScheduleFeedback('')
  }
  const toggleDefinitiveCell = (cell: string) => {
    const nextCells = currentSchedule.cells.includes(cell) ? currentSchedule.cells.filter(item => item !== cell) : [...currentSchedule.cells, cell]
    updateSchedule({ cells: nextCells })
  }
  const todayKey = displayDateToKey(currentEcuadorDate())
  const activeContractRows = clients.flatMap(client => (client.operationalContracts ?? []).filter(contract => !isValidDisplayDate(contract.endDate) || displayDateToKey(contract.endDate) > todayKey).map(contract => ({ client, contract, key: `${client.code}|${contract.id}` })))
  const selectedTaskRow = activeContractRows.find(row => row.key === selectedTaskContract)
  const taskAssignableEmployees = selectedTaskRow ? [...new Set(Object.entries(assignments).filter(([key]) => key.startsWith(`${selectedTaskRow.client.code}|${selectedTaskRow.contract.id}|`)).map(([, employeeId]) => employeeId))].map(employeeId => employees.find(employee => employee.id === employeeId)).filter((employee): employee is Employee => Boolean(employee)) : []
  const addSpecificTask = () => {
    if (!selectedTaskRow) { setTaskFeedback('Selecciona primero un contrato activo.'); return }
    const detail = taskDetail.trim()
    if (!detail) { setTaskFeedback('Ingresa el detalle de la tarea.'); return }
    if (!taskEmployeeId) { setTaskFeedback('Selecciona el personal responsable de la tarea.'); return }
    setSpecificTasks(current => [...current, { id: `TAR-${Date.now()}`, clientCode: selectedTaskRow.client.code, contractId: selectedTaskRow.contract.id, taskType, detail, periodicity: taskPeriodicity, responsible: taskResponsible, requiresPhotoSupport: taskRequiresPhotoSupport, employeeIds: [taskEmployeeId] }])
    setTaskDetail('')
    setTaskEmployeeId('')
    setTaskRequiresPhotoSupport(false)
    setTaskFeedback('Tarea específica guardada correctamente.')
  }
  const tasksForSelectedContract = specificTasks.filter(task => selectedTaskRow && task.clientCode === selectedTaskRow.client.code && task.contractId === selectedTaskRow.contract.id)
  const taskTypeLabel: Record<ClientSpecificTask['taskType'], string> = { ADMINISTRATIVA: 'Administrativa', SEGURIDAD: 'Seguridad', SEGUIMIENTO: 'Seguimiento' }
  const periodicityLabel: Record<ClientSpecificTask['periodicity'], string> = { DIARIO: 'Diario', SEMANAL: 'Semanal', QUINCENAL: 'Quincenal', MENSUAL: 'Mensual' }
  const responsibleLabel: Record<ClientSpecificTask['responsible'], string> = { JEFE_OPERACIONES: 'Jefe de Operaciones', SUPERVISOR: 'Supervisor', GUARDIA: 'Guardia' }
  const branchDraftKey = (branchId: string) => `${selectedClient?.code ?? ''}|${branchId}`
  const branchLocationDraft = (branch: ClientBranch) => branchLocationDrafts[branchDraftKey(branch.id)] ?? { gpsLocation: branch.gpsLocation ?? '', geofenceRadiusMeters: branch.geofenceRadiusMeters ? String(branch.geofenceRadiusMeters) : '' }
  const updateBranchLocationDraft = (branch: ClientBranch, changes: Partial<{ gpsLocation: string; geofenceRadiusMeters: string }>) => {
    const key = branchDraftKey(branch.id)
    setBranchLocationDrafts(current => ({ ...current, [key]: { ...branchLocationDraft(branch), ...changes } }))
    setBranchLocationFeedback(current => Object.fromEntries(Object.entries(current).filter(([feedbackKey]) => feedbackKey !== key)))
  }
  const saveBranchLocation = (branch: ClientBranch) => {
    if (!selectedClient) return
    const key = branchDraftKey(branch.id)
    const draft = branchLocationDraft(branch)
    const gpsLocation = draft.gpsLocation.trim()
    const geofenceRadiusMeters = Math.trunc(Number(draft.geofenceRadiusMeters))
    if (!gpsLocation) { setBranchLocationFeedback(current => ({ ...current, [key]: { tone: 'error', message: 'Ingresa la ubicación GPS.' } })); return }
    if (!Number.isInteger(geofenceRadiusMeters) || geofenceRadiusMeters <= 0) { setBranchLocationFeedback(current => ({ ...current, [key]: { tone: 'error', message: 'Ingresa un radio de geocerca mayor a cero.' } })); return }
    const nextClient = { ...selectedClient, branches: (selectedClient.branches ?? []).map(item => item.id === branch.id ? { ...item, gpsLocation, geofenceRadiusMeters } : item) }
    onSaveClient(nextClient)
    setBranchLocationDrafts(current => ({ ...current, [key]: { gpsLocation, geofenceRadiusMeters: String(geofenceRadiusMeters) } }))
    setBranchLocationFeedback(current => ({ ...current, [key]: { tone: 'success', message: 'Ubicación y geocerca grabadas.' } }))
  }

  return <>
    <PageHeader eyebrow="Operaciones / Operaciones de Clientes" title="Operaciones de Clientes" description="" />
    <div className="operations-client-toolbar panel"><div className="field"><label htmlFor="operations-client">Cliente</label><select id="operations-client" value={selectedClient?.code ?? ''} onChange={event => { setSelectedClientCode(event.target.value); setSelectedContractId(''); setSelectedAssignmentKey(''); setScheduleFeedback('') }}>{clients.map(client => <option key={client.code} value={client.code}>{client.code} · {client.businessName}</option>)}</select></div></div>
    <div className="company-configuration-tabs operations-client-tabs" role="tablist" aria-label="Secciones de Operaciones de Clientes">
      <button type="button" role="tab" aria-selected={activeTab === 'GENERAL'} className={activeTab === 'GENERAL' ? 'active' : ''} onClick={() => setActiveTab('GENERAL')}>Datos Generales</button>
      <button type="button" role="tab" aria-selected={activeTab === 'OPERATIVOS'} className={activeTab === 'OPERATIVOS' ? 'active' : ''} onClick={() => setActiveTab('OPERATIVOS')}>Datos Operativos</button>
      <button type="button" role="tab" aria-selected={activeTab === 'TAREAS'} className={activeTab === 'TAREAS' ? 'active' : ''} onClick={() => setActiveTab('TAREAS')}>Tareas Específicas</button>
    </div>

    {activeTab === 'GENERAL' && <section className="panel operations-readonly-panel">
      {selectedClient ? <><div className="form-grid client-general-grid operations-readonly-grid">
        <div className="field"><label>Código</label><input value={selectedClient.code} readOnly /></div><div className="field"><label>Tipo de Documento</label><input value={selectedClient.documentType ?? '—'} readOnly /></div><div className="field"><label>Documento</label><input value={selectedClient.document} readOnly /></div>
        <div className="field"><label>Razón Social</label><input value={selectedClient.businessName} readOnly /></div><div className="field"><label>Nombre Comercial</label><input value={selectedClient.tradeName ?? '—'} readOnly /></div><div className="field"><label>Institución</label><input value={selectedClient.institution === 'PUBLICA' ? 'Pública' : 'Privada'} readOnly /></div>
        <div className="field"><label>Contacto</label><input value={selectedClient.contact} readOnly /></div><div className="field"><label>Teléfono</label><input value={selectedClient.phone} readOnly /></div><div className="field"><label>Estado</label><input value={selectedClient.status === 'ACTIVO' ? 'Activo' : 'Inactivo'} readOnly /></div>
      </div><div className="table-scroll operations-branches-table"><table><thead><tr><th>Sucursal</th><th>Provincia</th><th>Ciudad</th><th>Dirección</th><th>Contacto</th><th>Teléfono</th><th>Ubicación GPS</th><th>Radio Geocerca</th><th className="row-action-cell">Grabar</th></tr></thead><tbody>{(selectedClient.branches ?? []).map(branch => { const draft = branchLocationDraft(branch); const feedback = branchLocationFeedback[branchDraftKey(branch.id)]; return <tr key={branch.id}><td><strong>{branch.name}</strong></td><td>{branch.province}</td><td>{branch.city}</td><td>{branch.address}</td><td>{branch.contact}</td><td>{branch.phone}</td><td><div className="operations-gps-field"><input value={draft.gpsLocation} onChange={event => updateBranchLocationDraft(branch, { gpsLocation: event.target.value })} placeholder="Coordenadas o enlace de Maps" aria-label={`Ubicación GPS de ${branch.name}`} /><button type="button" className="icon-button small" onClick={() => window.open('https://www.google.com/maps', '_blank', 'noopener,noreferrer')} aria-label={`Abrir mapa para ${branch.name}`} title="Abrir Google Maps"><MapPin size={16} /></button></div></td><td><div className="operations-geofence-field"><input type="number" min="1" step="1" value={draft.geofenceRadiusMeters} onChange={event => updateBranchLocationDraft(branch, { geofenceRadiusMeters: event.target.value })} placeholder="Ej. 100" aria-label={`Radio de geocerca de ${branch.name}`} /><span>metros</span></div></td><td className="row-action-cell"><button type="button" className="icon-button small save-line-button" onClick={() => saveBranchLocation(branch)} aria-label={`Grabar ubicación y geocerca de ${branch.name}`} title="Grabar ubicación y geocerca"><Check size={17} /></button>{feedback && <small className={`inline-row-feedback ${feedback.tone}`}>{feedback.message}</small>}</td></tr> })}{!(selectedClient.branches ?? []).length && <tr><td colSpan={9}><div className="empty-state compact"><Building2 /><strong>Sin sucursales registradas</strong></div></td></tr>}</tbody></table></div></> : <div className="empty-state"><Building2 /><strong>Sin clientes registrados</strong></div>}
    </section>}

    {activeTab === 'OPERATIVOS' && <div className="operations-operational-layout">
      <section className="panel table-panel"><div className="panel-heading"><h2>Contratos configurados</h2></div><div className="table-scroll"><table className="operations-contracts-table"><thead><tr><th>Nombre Contrato</th><th>Ubicación</th><th>Fecha Inicio</th><th>Fecha Fin</th><th>Administrador Contrato</th><th className="numeric">Número de Puestos</th><th className="numeric">Personal Fijo</th></tr></thead><tbody>{clientContracts.map(contract => <tr key={contract.id} className={resolvedContractId === contract.id ? 'selected-operation-contract' : undefined} onClick={() => { setSelectedContractId(contract.id); setSelectedAssignmentKey(''); setScheduleFeedback('') }}><td><strong>{contract.contractName}</strong></td><td>{contract.location}</td><td>{contract.startDate}</td><td>{contract.endDate}</td><td>{contract.contractAdministrator}</td><td className="numeric">{contract.positions}</td><td className="numeric">{contract.fixedStaff}</td></tr>)}{!clientContracts.length && <tr><td colSpan={7}><div className="empty-state"><CalendarDays /><strong>Sin contratos configurados</strong></div></td></tr>}</tbody></table></div></section>
      {selectedContract && <section className="panel definitive-schedule-panel"><div className="schedule-header"><div><h3>HORARIO DEFINITIVO</h3><p>{selectedContract.contractName} · {selectedContract.location}</p></div><Badge tone="info">{assignedPositions.length} asignados</Badge></div>
        {assignedPositions.length ? <div className="schedule-workspace"><aside className="fixed-staff-list"><strong>Personal asignado</strong><span>Selecciona un empleado</span><div className="fixed-staff-options">{assignedPositions.map(position => { const selected = position.key === resolvedAssignmentKey; const planned = positionScheduleSummary(selectedContract, position.scheduleKey); return <button type="button" key={position.key} className={`operation-assigned-person${selected ? ' selected' : ''}`} onClick={() => { setSelectedAssignmentKey(position.key); setScheduleFeedback('') }}><strong>{position.employee?.name}</strong><small>{position.label}</small><small>{planned.length ? `Referencial: ${planned.join(' · ')}` : 'Sin horario referencial'}</small></button> })}</div></aside>
          {selectedPosition && <div className="schedule-main"><div className="schedule-actions"><span>{selectedPosition.employee?.name} · {selectedPosition.label}</span><div className="schedule-cycle-controls"><label>DÍAS: <input type="number" min="1" max="99" value={currentSchedule.cycleDays || ''} placeholder="—" onChange={event => updateSchedule({ cycleDays: Math.min(99, Math.max(0, Number(event.target.value) || 0)), repeats: Number(event.target.value) > 0 ? currentSchedule.repeats : false })} /></label><label className={currentSchedule.cycleDays ? '' : 'disabled'}><input type="checkbox" checked={currentSchedule.repeats} disabled={!currentSchedule.cycleDays} onChange={event => updateSchedule({ repeats: event.target.checked })} /> REPITE</label></div><button type="button" className="save-schedule-button" onClick={() => setScheduleFeedback('Horario definitivo grabado correctamente.')}><Check size={15} /> Grabar horario</button></div>{scheduleFeedback && <small className="schedule-save-feedback">{scheduleFeedback}</small>}<div className="weekly-calendar-scroll"><table className={`weekly-calendar ${currentSchedule.cycleDays ? 'cycle-calendar' : ''}`}><thead><tr><th>Hora</th>{scheduleColumns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{Array.from({ length: 24 }, (_, hour) => <tr key={hour}><th>{String(hour).padStart(2, '0')}:00</th>{scheduleColumns.map(column => { const cell = `${column.key}-${String(hour).padStart(2, '0')}`; const marked = currentSchedule.cells.includes(cell); return <td key={cell}><button type="button" className={marked ? 'scheduled' : ''} aria-pressed={marked} aria-label={`${column.label} ${String(hour).padStart(2, '0')}:00 para ${selectedPosition.employee?.name}`} onClick={() => toggleDefinitiveCell(cell)}>{marked ? 'Asignado' : ''}</button></td> })}</tr>)}</tbody></table></div></div>}
        </div> : <div className="schedule-empty"><Users /><strong>Sin personal asignado</strong><p>Talento Humano debe asignar empleados a las posiciones de este contrato.</p></div>}
      </section>}
    </div>}

    {activeTab === 'TAREAS' && <div className="operations-tasks-layout"><section className="panel table-panel"><div className="panel-heading"><h2>Contratos activos</h2><Badge tone="info">{activeContractRows.length}</Badge></div><div className="table-scroll"><table className="specific-task-contracts-table"><thead><tr><th aria-label="Seleccionar" /><th>Cliente</th><th>Nombre Contrato</th><th>Ubicación</th><th>Fecha Inicio</th><th>Fecha Fin</th><th>Administrador Contrato</th><th className="numeric">Número de Puestos</th><th className="numeric">Personal Fijo</th></tr></thead><tbody>{activeContractRows.map(row => <tr key={row.key} className={selectedTaskContract === row.key ? 'selected-operation-contract' : undefined} onClick={() => { setSelectedTaskContract(row.key); setTaskFeedback('') }}><td><input type="radio" name="specific-task-contract" checked={selectedTaskContract === row.key} onChange={() => setSelectedTaskContract(row.key)} aria-label={`Seleccionar ${row.contract.contractName} de ${row.client.businessName}`} /></td><td><strong>{row.client.businessName}</strong></td><td>{row.contract.contractName}</td><td>{row.contract.location}</td><td>{row.contract.startDate}</td><td>{row.contract.endDate || 'Vigente'}</td><td>{row.contract.contractAdministrator}</td><td className="numeric">{row.contract.positions}</td><td className="numeric">{row.contract.fixedStaff}</td></tr>)}{!activeContractRows.length && <tr><td colSpan={9}><div className="empty-state"><FileText /><strong>Sin contratos activos</strong></div></td></tr>}</tbody></table></div></section>
      {selectedTaskRow && <section className="panel task-assignment-panel"><div className="panel-heading"><div><h2>Asignación de Tareas</h2><p>{selectedTaskRow.client.businessName} · {selectedTaskRow.contract.contractName}</p></div></div><div className="form-grid task-assignment-grid"><div className="field"><label htmlFor="specific-task-type">Tipo de Tarea</label><select id="specific-task-type" value={taskType} onChange={event => setTaskType(event.target.value as ClientSpecificTask['taskType'])}><option value="ADMINISTRATIVA">Administrativa</option><option value="SEGURIDAD">Seguridad</option><option value="SEGUIMIENTO">Seguimiento</option></select></div><div className="field"><label htmlFor="specific-task-detail">Detalle</label><input id="specific-task-detail" value={taskDetail} maxLength={100} onChange={event => { setTaskDetail(event.target.value); setTaskFeedback('') }} placeholder="Máximo 100 caracteres" /><small className="field-help">{taskDetail.length}/100 caracteres</small></div><div className="field"><label htmlFor="specific-task-periodicity">Periodicidad</label><select id="specific-task-periodicity" value={taskPeriodicity} onChange={event => setTaskPeriodicity(event.target.value as ClientSpecificTask['periodicity'])}><option value="DIARIO">Diario</option><option value="SEMANAL">Semanal</option><option value="QUINCENAL">Quincenal</option><option value="MENSUAL">Mensual</option></select></div><div className="field"><label htmlFor="specific-task-responsible">Responsable</label><select id="specific-task-responsible" value={taskResponsible} onChange={event => setTaskResponsible(event.target.value as ClientSpecificTask['responsible'])}><option value="JEFE_OPERACIONES">Jefe de Operaciones</option><option value="SUPERVISOR">Supervisor</option><option value="GUARDIA">Guardia</option></select></div><div className="field"><label htmlFor="specific-task-employee">Personal</label><select id="specific-task-employee" value={taskEmployeeId} onChange={event => { setTaskEmployeeId(event.target.value); setTaskFeedback('') }}><option value="">Selecciona el personal asignado</option>{taskAssignableEmployees.map(employee => <option value={employee.id} key={employee.id}>{employee.name} · {employee.document}</option>)}</select>{!taskAssignableEmployees.length && <small className="field-error">No existe personal asignado a este contrato.</small>}</div><div className="field task-photo-support-field"><label htmlFor="specific-task-photo-support">Requiere Soporte Fotográfico</label><div><button id="specific-task-photo-support" type="button" className={`switch ${taskRequiresPhotoSupport ? 'on' : ''}`} role="switch" aria-checked={taskRequiresPhotoSupport} onClick={() => setTaskRequiresPhotoSupport(current => !current)}><span /></button><strong>{taskRequiresPhotoSupport ? 'Sí' : 'No'}</strong></div></div></div><div className="task-assignment-actions">{taskFeedback && <span className={taskFeedback.includes('correctamente') ? 'success-text' : 'error-text'}>{taskFeedback}</span>}<button type="button" className="button primary" onClick={addSpecificTask}><Plus size={17} /> Agregar tarea</button></div>{tasksForSelectedContract.length > 0 && <div className="table-scroll"><table><thead><tr><th>Tipo</th><th>Detalle</th><th>Periodicidad</th><th>Responsable</th><th>Personal</th><th>Soporte Fotográfico</th></tr></thead><tbody>{tasksForSelectedContract.map(task => <tr key={task.id}><td>{taskTypeLabel[task.taskType]}</td><td>{task.detail}</td><td>{periodicityLabel[task.periodicity]}</td><td>{responsibleLabel[task.responsible]}</td><td>{(task.employeeIds ?? []).map(employeeId => employees.find(employee => employee.id === employeeId)?.name).filter(Boolean).join(', ') || 'Sin asignar'}</td><td><Badge tone={task.requiresPhotoSupport ? 'success' : 'neutral'}>{task.requiresPhotoSupport ? 'Sí' : 'No'}</Badge></td></tr>)}</tbody></table></div>}</section>}
    </div>}
  </>
}

function clientInitials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

function ClientPhoto({ client }: { client: Client }) {
  const [imageFailed, setImageFailed] = useState(false)
  if (client.photoUrl && !imageFailed) return <span className="client-avatar"><img src={client.photoUrl} alt={`Foto de ${client.businessName}`} onError={() => setImageFailed(true)} /></span>
  return <span className="client-avatar" aria-label={`Foto referencial de ${client.businessName}`}>{clientInitials(client.businessName)}</span>
}

function ClientsPage({ clients, documentTypes, onSave }: { clients: Client[]; documentTypes: DocumentTypeConfiguration[]; onSave: (client: Client) => void }) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Client | 'NEW' | null>(null)
  const normalizedQuery = query.trim().toLocaleLowerCase('es')
  const filtered = clients.filter(client => `${client.code} ${client.document} ${client.businessName} ${client.contact} ${client.phone}`.toLocaleLowerCase('es').includes(normalizedQuery))
  const clientSort = useSortableRows(filtered, {
    code: row => row.code,
    photo: row => row.businessName,
    document: row => row.document,
    businessName: row => row.businessName,
    contact: row => row.contact,
    phone: row => row.phone,
    available: row => row.available,
    status: row => row.status,
  })
  const nextCode = `CLI-${String(Math.max(0, ...clients.map(client => Number(client.code.match(/\d+/)?.[0] ?? 0))) + 1).padStart(3, '0')}`
  return <>
    <PageHeader eyebrow="Clientes / Clientes" title="Clientes" description="" action={<button className="button primary" onClick={() => setEditing('NEW')}><Plus size={18} /> Nuevo Cliente</button>} />
    <section className="panel table-panel">
      <div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar clientes</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por código, documento, razón social o contacto" /></label><div className="filter-summary"><strong>{filtered.length} resultados</strong></div></div>
      <div className="table-scroll" role="region" aria-label="Listado de clientes" tabIndex={0}><table className="clients-table"><caption className="sr-only">Clientes registrados en Empresa Demostración</caption><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Código" sortKey="code" sort={clientSort.sort} onSort={clientSort.toggleSort} /><SortableTh label="Foto" sortKey="photo" sort={clientSort.sort} onSort={clientSort.toggleSort} /><SortableTh label="Documento" sortKey="document" sort={clientSort.sort} onSort={clientSort.toggleSort} /><SortableTh label="Razón Social" sortKey="businessName" sort={clientSort.sort} onSort={clientSort.toggleSort} /><SortableTh label="Contacto" sortKey="contact" sort={clientSort.sort} onSort={clientSort.toggleSort} /><SortableTh label="Teléfono" sortKey="phone" sort={clientSort.sort} onSort={clientSort.toggleSort} /><SortableTh label="Disponibles" sortKey="available" sort={clientSort.sort} onSort={clientSort.toggleSort} className="numeric" /><SortableTh label="Estado" sortKey="status" sort={clientSort.sort} onSort={clientSort.toggleSort} /></tr></thead><tbody>
        {clientSort.sortedRows.map(client => <tr key={client.code}><td className="row-action-cell"><button className="icon-button small edit-icon" onClick={() => setEditing(client)} aria-label={`Editar ${client.businessName}`} title={`Editar ${client.businessName}`}><Pencil size={17} /></button></td><td><strong>{client.code}</strong></td><td><ClientPhoto client={client} /></td><td>{client.document}</td><td><strong>{client.businessName}</strong></td><td>{client.contact}</td><td>{client.phone}</td><td className="numeric"><span className={`available-count ${client.available === 0 ? 'empty' : ''}`}>{client.available}</span></td><td><Badge tone={client.status === 'ACTIVO' ? 'success' : 'neutral'}>{client.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</Badge></td></tr>)}
        {!filtered.length && <tr><td colSpan={9}><div className="empty-state"><Search /><strong>Sin resultados</strong><p>No hay clientes que coincidan con la búsqueda.</p></div></td></tr>}
      </tbody></table></div>
      <div className="table-footer"><span>1–{filtered.length} de {filtered.length}</span><span>Total del conjunto filtrado</span></div>
    </section>
    {editing && <ClientDialog client={editing === 'NEW' ? undefined : editing} newCode={nextCode} documentTypes={documentTypes} onClose={() => setEditing(null)} onInlineSave={(changes) => {
      if (editing === 'NEW') return
      const updated = { ...editing, ...changes }
      onSave(updated)
      setEditing(updated)
    }} onSave={(client) => { onSave(client); setEditing(null) }} />}
  </>
}

type ClientDialogTab = 'GENERAL' | 'OPERATIVOS' | 'DOCUMENTOS' | 'FOTOS' | 'HISTORIAL'

function emptyClientBranch(id = `BR-${Date.now()}`): ClientBranch {
  return { id, name: '', province: '', city: '', address: '', contact: '', phone: '', gpsLocation: '' }
}

const operationalWeek = [
  { key: 'LUN', label: 'Lunes' },
  { key: 'MAR', label: 'Martes' },
  { key: 'MIE', label: 'Miércoles' },
  { key: 'JUE', label: 'Jueves' },
  { key: 'VIE', label: 'Viernes' },
  { key: 'SAB', label: 'Sábado' },
  { key: 'DOM', label: 'Domingo' },
]

function emptyOperationalContract(client?: Client, id = `COP-${Date.now()}`): ClientOperationalContract {
  return {
    id,
    contractName: client ? `Contrato ${client.code}` : '',
    location: 'Matriz',
    startDate: client?.contractStart ?? '',
    endDate: client ? client.contractEnd || '31/12/2027' : '',
    contractAdministrator: client?.contact ?? '',
    fixedStaff: client ? Math.min(client.available, 4) : 0,
    positions: client?.available ?? 0,
    fixedSupervisor: false,
    fixedSupervisorCount: 0,
    schedules: {},
    scheduleCycleDays: {},
    scheduleCycleRepeats: {},
    particularRequirements: [],
  }
}

function normalizeParticularRequirements(value: unknown, contractId: string): ClientParticularRequirement[] {
  if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object' && typeof item.requirement === 'string').map((item, index) => ({ id: typeof item.id === 'string' ? item.id : `REQ-${contractId}-${index + 1}`, requirement: item.requirement.slice(0, 100) }))
  if (typeof value === 'string' && value.trim()) return [{ id: `REQ-${contractId}-1`, requirement: value.trim().slice(0, 100) }]
  return []
}

function ClientDialog({ client, newCode, documentTypes, onClose, onInlineSave, onSave }: { client?: Client; newCode: string; documentTypes: DocumentTypeConfiguration[]; onClose: () => void; onInlineSave: (changes: Partial<Client>) => void; onSave: (client: Client) => void }) {
  const inferredDocumentType: NonNullable<Client['documentType']> = client ? client.documentType ?? (client.document.length === 13 ? 'RUC' : client.document.length === 10 ? 'CEDULA' : 'PASAPORTE') : 'CEDULA'
  const [activeTab, setActiveTab] = useState<ClientDialogTab>('GENERAL')
  const [documentType, setDocumentType] = useState<NonNullable<Client['documentType']>>(inferredDocumentType)
  const [document, setDocument] = useState(client?.document ?? '')
  const [branches, setBranches] = useState<ClientBranch[]>(client?.branches?.length ? client.branches.map(branch => ({ ...emptyClientBranch(branch.id), ...branch })) : [emptyClientBranch()])
  const [operationalContracts, setOperationalContracts] = useState<ClientOperationalContract[]>(client?.operationalContracts?.length ? client.operationalContracts.map((contract, index) => ({ ...emptyOperationalContract(client, contract.id), ...contract, contractName: contract.contractName || `Contrato ${String(index + 1).padStart(2, '0')}`, schedules: contract.schedules ?? {}, scheduleCycleDays: contract.scheduleCycleDays ?? {}, scheduleCycleRepeats: contract.scheduleCycleRepeats ?? {}, particularRequirements: normalizeParticularRequirements(contract.particularRequirements, contract.id) })) : [emptyOperationalContract(client)])
  const [selectedContractId, setSelectedContractId] = useState(client?.operationalContracts?.[0]?.id ?? '')
  const [selectedSchedulePeople, setSelectedSchedulePeople] = useState<string[]>([])
  const [inspectedSchedulePerson, setInspectedSchedulePerson] = useState('1')
  const [operationalDetailTab, setOperationalDetailTab] = useState<'HORARIO' | 'REQUERIMIENTOS'>('HORARIO')
  const [requirementContractId, setRequirementContractId] = useState('')
  const [requirementDraft, setRequirementDraft] = useState('')
  const [requirementFilterContractId, setRequirementFilterContractId] = useState('')
  const [requirementContractSort, setRequirementContractSort] = useState<'ASC' | 'DESC'>('ASC')
  const [requirementFeedback, setRequirementFeedback] = useState('')
  const [scheduleRangeAnchor, setScheduleRangeAnchor] = useState<{ contractId: string; personKey: string; columnKey: string; hour: number; mark: boolean } | null>(null)
  const [selectedAttachmentTypeId, setSelectedAttachmentTypeId] = useState('')
  const [pendingAttachmentFile, setPendingAttachmentFile] = useState<File | null>(null)
  const [attachedDocuments, setAttachedDocuments] = useState<ClientAttachedDocument[]>(client?.attachedDocuments ?? [])
  const [attachmentFeedback, setAttachmentFeedback] = useState('')
  const [attachmentInputKey, setAttachmentInputKey] = useState(0)
  const [selectedPhotoTypeId, setSelectedPhotoTypeId] = useState('')
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null)
  const [attachedPhotos, setAttachedPhotos] = useState<ClientAttachedPhoto[]>(client?.attachedPhotos ?? [])
  const [photoFeedback, setPhotoFeedback] = useState('')
  const [photoInputKey, setPhotoInputKey] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [inlineFeedback, setInlineFeedback] = useState<Record<string, { tone: 'success' | 'error'; message: string }>>({})
  const enabledClientDocumentTypes = documentTypes.filter(record => record.status === 'ACTIVO' && record.clients)
  const documentLimit = documentType === 'RUC' ? 13 : documentType === 'CEDULA' ? 10 : 24
  const changeDocument = (value: string) => setDocument(documentType === 'PASAPORTE' ? value.replace(/[^a-zA-Z0-9]/g, '').slice(0, documentLimit) : value.replace(/\D/g, '').slice(0, documentLimit))
  const todayKey = displayDateToKey(currentEcuadorDate())
  const activeOperationalContracts = operationalContracts.filter(contract => isValidDisplayDate(contract.endDate) && displayDateToKey(contract.endDate) > todayKey)
  const completedOperationalContracts = operationalContracts.filter(contract => isValidDisplayDate(contract.endDate) && displayDateToKey(contract.endDate) <= todayKey)
  const particularRequirementRows = operationalContracts.flatMap(contract => contract.particularRequirements.map(requirement => ({ ...requirement, contractId: contract.id, contractName: contract.contractName, location: contract.location })))
    .filter(row => !requirementFilterContractId || row.contractId === requirementFilterContractId)
    .sort((first, second) => first.contractName.localeCompare(second.contractName, 'es', { sensitivity: 'base' }) * (requirementContractSort === 'ASC' ? 1 : -1))
  const resolvedContractId = activeOperationalContracts.some(contract => contract.id === selectedContractId) ? selectedContractId : activeOperationalContracts[0]?.id ?? ''
  const selectedOperationalContract = activeOperationalContracts.find(contract => contract.id === resolvedContractId)
  const availableSchedulePeople = [
    ...Array.from({ length: selectedOperationalContract?.fixedStaff ?? 0 }, (_, index) => ({ key: String(index + 1), label: `Personal ${String(index + 1).padStart(2, '0')}` })),
    ...Array.from({ length: selectedOperationalContract?.fixedSupervisor ? selectedOperationalContract.fixedSupervisorCount : 0 }, (_, index) => ({ key: `SUPERVISOR_FIJO_${index + 1}`, label: `Supervisor Fijo ${String(index + 1).padStart(2, '0')}` })),
  ]
  const availableSchedulePersonKeys = availableSchedulePeople.map(person => person.key)
  const resolvedSchedulePeople = selectedSchedulePeople.filter(personKey => availableSchedulePersonKeys.includes(personKey))
  const resolvedInspectedSchedulePerson = availableSchedulePersonKeys.includes(inspectedSchedulePerson) ? inspectedSchedulePerson : availableSchedulePeople[0]?.key ?? '1'
  const inspectedSchedulePersonLabel = availableSchedulePeople.find(person => person.key === resolvedInspectedSchedulePerson)?.label ?? 'Personal 01'
  const primaryPersonKey = resolvedInspectedSchedulePerson
  const scheduleTargetKeys = resolvedSchedulePeople.length ? resolvedSchedulePeople : [resolvedInspectedSchedulePerson]
  const selectedCycleDays = selectedOperationalContract?.scheduleCycleDays[primaryPersonKey] ?? 0
  const selectedCycleRepeats = selectedCycleDays > 0 && (selectedOperationalContract?.scheduleCycleRepeats[primaryPersonKey] ?? true)
  const scheduleColumns = selectedCycleDays > 0
    ? Array.from({ length: selectedCycleDays }, (_, index) => ({ key: `DIA${index + 1}`, label: `Día ${index + 1}` }))
    : operationalWeek
  const updateOperationalContract = (id: string, changes: Partial<ClientOperationalContract>) => setOperationalContracts(current => current.map(contract => contract.id === id ? { ...contract, ...changes } : contract))
  const toggleSchedulePerson = (personKey: string) => {
    setSelectedSchedulePeople(current => {
      const available = current.filter(item => availableSchedulePersonKeys.includes(item))
      if (!available.includes(personKey)) return [...available, personKey]
      return available.filter(item => item !== personKey)
    })
  }
  const attachClientDocument = () => {
    const selectedType = enabledClientDocumentTypes.find(record => record.id === selectedAttachmentTypeId)
    if (!selectedType || !pendingAttachmentFile) {
      setAttachmentFeedback('Selecciona el tipo de documento y luego busca el archivo.')
      return
    }
    setAttachedDocuments(current => [...current, {
      id: `DOC-${Date.now()}`,
      documentTypeId: selectedType.id,
      documentTypeName: selectedType.name,
      fileName: pendingAttachmentFile.name,
      fileSize: pendingAttachmentFile.size,
      uploadedAt: currentEcuadorDate(),
    }])
    setPendingAttachmentFile(null)
    setSelectedAttachmentTypeId('')
    setAttachmentInputKey(current => current + 1)
    setAttachmentFeedback('Documento adjuntado correctamente.')
  }
  const attachClientPhoto = () => {
    const selectedType = enabledClientDocumentTypes.find(record => record.id === selectedPhotoTypeId)
    if (!selectedType || !pendingPhotoFile) {
      setPhotoFeedback('Selecciona el tipo de documento y luego busca la fotografía.')
      return
    }
    if (!['image/png', 'image/jpeg'].includes(pendingPhotoFile.type) && !/\.(png|jpe?g)$/i.test(pendingPhotoFile.name)) {
      setPhotoFeedback('Selecciona una imagen en formato PNG o JPG.')
      return
    }
    setAttachedPhotos(current => [...current, {
      id: `FOTO-${Date.now()}`,
      documentTypeId: selectedType.id,
      documentTypeName: selectedType.name,
      fileName: pendingPhotoFile.name,
      fileSize: pendingPhotoFile.size,
      uploadedAt: currentEcuadorDate(),
    }])
    setPendingPhotoFile(null)
    setSelectedPhotoTypeId('')
    setPhotoInputKey(current => current + 1)
    setPhotoFeedback('Fotografía adjuntada correctamente.')
  }
  const updateScheduleCycleDays = (days: number) => {
    if (!selectedOperationalContract) return
    const nextDays = Math.min(99, Math.max(0, Math.trunc(days) || 0))
    updateOperationalContract(selectedOperationalContract.id, {
      scheduleCycleDays: { ...selectedOperationalContract.scheduleCycleDays, [primaryPersonKey]: nextDays },
      scheduleCycleRepeats: { ...selectedOperationalContract.scheduleCycleRepeats, [primaryPersonKey]: nextDays > 0 ? selectedOperationalContract.scheduleCycleRepeats[primaryPersonKey] ?? true : false },
    })
  }
  const updateScheduleCycleRepeats = (repeats: boolean) => {
    if (!selectedOperationalContract) return
    updateOperationalContract(selectedOperationalContract.id, { scheduleCycleRepeats: { ...selectedOperationalContract.scheduleCycleRepeats, [primaryPersonKey]: repeats } })
  }
  const toggleScheduleCell = (cell: string, shiftKey = false) => {
    if (!selectedOperationalContract) return
    const currentCells = selectedOperationalContract.schedules[primaryPersonKey] ?? []
    const separatorIndex = cell.lastIndexOf('-')
    const columnKey = cell.slice(0, separatorIndex)
    const hour = Number(cell.slice(separatorIndex + 1))
    const matchingAnchor = shiftKey
      && scheduleRangeAnchor?.contractId === selectedOperationalContract.id
      && scheduleRangeAnchor.personKey === primaryPersonKey
      && scheduleRangeAnchor.columnKey === columnKey
    let mark = !currentCells.includes(cell)
    let affectedCells = [cell]
    if (matchingAnchor) {
      mark = scheduleRangeAnchor.mark
      const firstHour = Math.min(scheduleRangeAnchor.hour, hour)
      const lastHour = Math.max(scheduleRangeAnchor.hour, hour)
      affectedCells = Array.from({ length: lastHour - firstHour + 1 }, (_, index) => `${columnKey}-${String(firstHour + index).padStart(2, '0')}`)
    }
    const nextSet = new Set(currentCells)
    affectedCells.forEach(affectedCell => { if (mark) nextSet.add(affectedCell); else nextSet.delete(affectedCell) })
    const nextSchedules = { ...selectedOperationalContract.schedules, [primaryPersonKey]: [...nextSet] }
    updateOperationalContract(selectedOperationalContract.id, { schedules: nextSchedules })
    setScheduleRangeAnchor({ contractId: selectedOperationalContract.id, personKey: primaryPersonKey, columnKey, hour, mark })
  }
  const saveBranchLine = (branch: ClientBranch) => {
    if (!client) { setInlineFeedback(current => ({ ...current, [branch.id]: { tone: 'error', message: 'Primero crea el cliente para grabar líneas independientes.' } })); return }
    const valid = branch.name.trim() && ecuadorProvinces.includes(branch.province) && (ecuadorLocations[branch.province] ?? []).includes(branch.city) && branch.address.trim() && branch.contact.trim() && branch.phone.trim()
    if (!valid) { setInlineFeedback(current => ({ ...current, [branch.id]: { tone: 'error', message: 'Completa todos los campos obligatorios de la sucursal.' } })); return }
    const nextBranches = branches.map(item => item.id === branch.id ? { ...item, name: item.name.trim(), address: item.address.trim(), contact: item.contact.trim(), phone: item.phone.trim(), gpsLocation: item.gpsLocation.trim() } : item)
    setBranches(nextBranches)
    onInlineSave({ branches: nextBranches.filter(item => item.name.trim()) })
    setInlineFeedback(current => ({ ...current, [branch.id]: { tone: 'success', message: 'Sucursal grabada.' } }))
  }
  const saveOperationalContractLine = (contract: ClientOperationalContract) => {
    if (!client) { setInlineFeedback(current => ({ ...current, [contract.id]: { tone: 'error', message: 'Primero crea el cliente para grabar líneas independientes.' } })); return }
    const valid = contract.contractName.trim() && contract.location && isValidDisplayDate(contract.startDate) && isValidDisplayDate(contract.endDate) && displayDateToKey(contract.endDate) >= displayDateToKey(contract.startDate) && contract.contractAdministrator.trim() && Number.isInteger(contract.fixedStaff) && contract.fixedStaff >= 0 && Number.isInteger(contract.positions) && contract.positions >= 0 && (!contract.fixedSupervisor || (Number.isInteger(contract.fixedSupervisorCount) && contract.fixedSupervisorCount > 0))
    if (!valid) { setInlineFeedback(current => ({ ...current, [contract.id]: { tone: 'error', message: 'Completa el contrato y verifica fechas y cantidades.' } })); return }
    const nextContracts = operationalContracts.map(item => item.id === contract.id ? { ...item, contractName: item.contractName.trim(), contractAdministrator: item.contractAdministrator.trim() } : item)
    setOperationalContracts(nextContracts)
    onInlineSave({ operationalContracts: nextContracts })
    setInlineFeedback(current => ({ ...current, [contract.id]: { tone: 'success', message: 'Contrato grabado.' } }))
  }
  const saveCurrentSchedule = () => {
    if (!client || !selectedOperationalContract) return
    const sourceSchedule = [...(selectedOperationalContract.schedules[primaryPersonKey] ?? [])]
    const sourceCycleDays = selectedOperationalContract.scheduleCycleDays[primaryPersonKey] ?? 0
    const sourceCycleRepeats = selectedOperationalContract.scheduleCycleRepeats[primaryPersonKey] ?? false
    const nextSchedules = { ...selectedOperationalContract.schedules }
    const nextCycleDays = { ...selectedOperationalContract.scheduleCycleDays }
    const nextCycleRepeats = { ...selectedOperationalContract.scheduleCycleRepeats }
    scheduleTargetKeys.forEach(personKey => {
      nextSchedules[personKey] = [...sourceSchedule]
      nextCycleDays[personKey] = sourceCycleDays
      nextCycleRepeats[personKey] = sourceCycleRepeats
    })
    const nextContracts = operationalContracts.map(contract => contract.id === selectedOperationalContract.id ? { ...contract, schedules: nextSchedules, scheduleCycleDays: nextCycleDays, scheduleCycleRepeats: nextCycleRepeats } : contract)
    setOperationalContracts(nextContracts)
    onInlineSave({ operationalContracts: nextContracts })
    const message = resolvedSchedulePeople.length
      ? `Horario de ${inspectedSchedulePersonLabel} aplicado a ${resolvedSchedulePeople.length} ${resolvedSchedulePeople.length === 1 ? 'persona agrupada' : 'personas agrupadas'} y grabado.`
      : `Horario de ${inspectedSchedulePersonLabel} grabado.`
    setInlineFeedback(current => ({ ...current, [`schedule-${selectedOperationalContract.id}`]: { tone: 'success', message } }))
  }
  const addParticularRequirement = () => {
    const contract = operationalContracts.find(item => item.id === requirementContractId)
    const requirement = requirementDraft.trim()
    if (!contract) { setRequirementFeedback('Selecciona primero el contrato de referencia.'); return }
    if (!requirement) { setRequirementFeedback('Ingresa el requerimiento particular.'); return }
    const nextContracts = operationalContracts.map(item => item.id === contract.id ? { ...item, particularRequirements: [...item.particularRequirements, { id: `REQ-${Date.now()}`, requirement }] } : item)
    setOperationalContracts(nextContracts)
    if (client) onInlineSave({ operationalContracts: nextContracts })
    setRequirementDraft('')
    setRequirementFeedback(client ? 'Requerimiento agregado y guardado.' : 'Requerimiento agregado; se guardará al crear el cliente.')
  }
  const removeParticularRequirement = (contractId: string, requirementId: string) => {
    const nextContracts = operationalContracts.map(contract => contract.id === contractId ? { ...contract, particularRequirements: contract.particularRequirements.filter(requirement => requirement.id !== requirementId) } : contract)
    setOperationalContracts(nextContracts)
    if (client) onInlineSave({ operationalContracts: nextContracts })
    setRequirementFeedback('Requerimiento eliminado.')
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const businessName = String(data.get('businessName') ?? '').trim()
    const tradeName = String(data.get('tradeName') ?? '').trim()
    const contact = String(data.get('contact') ?? '').trim()
    const phone = String(data.get('phone') ?? '').trim()
    const contractStart = String(data.get('contractStart') ?? '').trim()
    const contractEnd = String(data.get('contractEnd') ?? '').trim()
    const available = client?.available ?? 0
    const nextErrors: Record<string, string> = {}
    if (documentType === 'CEDULA' && !/^\d{10}$/.test(document)) nextErrors.document = 'La cédula debe contener exactamente 10 dígitos.'
    if (documentType === 'RUC' && !/^\d{13}$/.test(document)) nextErrors.document = 'El RUC debe contener exactamente 13 dígitos.'
    if (documentType === 'PASAPORTE' && !/^[a-zA-Z0-9]+$/.test(document)) nextErrors.document = 'El pasaporte debe contener únicamente letras y números.'
    if (!businessName) nextErrors.businessName = 'Ingresa la razón social.'
    if (!tradeName) nextErrors.tradeName = 'Ingresa el nombre comercial.'
    if (!contact) nextErrors.contact = 'Ingresa el nombre del contacto.'
    if (!phone) nextErrors.phone = 'Ingresa el teléfono.'
    if (!isValidDisplayDate(contractStart)) nextErrors.contractStart = 'Ingresa una fecha válida en formato DD/MM/AAAA.'
    if (contractEnd && !isValidDisplayDate(contractEnd)) nextErrors.contractEnd = 'Ingresa una fecha válida en formato DD/MM/AAAA.'
    if (!nextErrors.contractStart && contractEnd && !nextErrors.contractEnd && displayDateToKey(contractEnd) < displayDateToKey(contractStart)) nextErrors.contractEnd = 'La fecha final no puede ser anterior al inicio del contrato.'
    const populatedBranches = branches.filter(branch => [branch.name, branch.province, branch.city, branch.address, branch.contact, branch.phone, branch.gpsLocation].some(value => value.trim()))
    if (populatedBranches.some(branch => !branch.name.trim() || !ecuadorProvinces.includes(branch.province) || !(ecuadorLocations[branch.province] ?? []).includes(branch.city) || !branch.address.trim() || !branch.contact.trim() || !branch.phone.trim())) nextErrors.branches = 'Completa Nombre, Provincia, Ciudad, Dirección, Contacto y Teléfono en cada sucursal registrada.'
    const populatedContracts = operationalContracts.filter(contract => contract.contractName || contract.location || contract.startDate || contract.endDate || contract.contractAdministrator || contract.fixedStaff > 0 || contract.positions > 0 || contract.fixedSupervisor)
    if (populatedContracts.some(contract => !contract.contractName.trim() || !contract.location || !isValidDisplayDate(contract.startDate) || !isValidDisplayDate(contract.endDate) || displayDateToKey(contract.endDate) < displayDateToKey(contract.startDate) || !contract.contractAdministrator.trim() || !Number.isInteger(contract.fixedStaff) || contract.fixedStaff < 0 || !Number.isInteger(contract.positions) || contract.positions < 0 || (contract.fixedSupervisor && (!Number.isInteger(contract.fixedSupervisorCount) || contract.fixedSupervisorCount <= 0)))) nextErrors.operationalContracts = 'Completa todos los campos de cada contrato y verifica sus fechas y cantidades.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) { setActiveTab(Object.keys(nextErrors).some(key => key === 'operationalContracts') ? 'OPERATIVOS' : 'GENERAL'); return }
    onSave({
      code: client?.code ?? newCode,
      photoUrl: String(data.get('photoUrl') ?? '').trim(),
      documentType,
      document,
      institution: String(data.get('institution')) as NonNullable<Client['institution']>,
      businessName,
      tradeName,
      province: client?.province ?? '',
      city: client?.city ?? '',
      contact,
      address: client?.address ?? '',
      gpsLocation: client?.gpsLocation ?? '',
      phone,
      contractStart,
      contractEnd,
      branches: populatedBranches.map(branch => ({ ...branch, name: branch.name.trim(), address: branch.address.trim(), contact: branch.contact.trim(), phone: branch.phone.trim(), gpsLocation: branch.gpsLocation.trim() })),
      operationalContracts: populatedContracts.map(contract => ({ ...contract, contractName: contract.contractName.trim(), contractAdministrator: contract.contractAdministrator.trim() })),
      attachedDocuments,
      attachedPhotos,
      available,
      status: client?.status ?? 'ACTIVO',
    })
  }
  const tabButton = (tab: ClientDialogTab, label: string, number: number) => <button type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}><span>{number}</span>{label}</button>
  const displayClient: Client = client ?? { code: newCode, photoUrl: '', document: '', businessName: 'Nuevo Cliente', contact: '', phone: '', available: 0, status: 'ACTIVO' }
  return <Dialog title={client ? `Editar ${client.businessName}` : 'Nuevo Cliente'} description="Completa el expediente del cliente en sus cinco secciones." onClose={onClose} className="dialog-client"><form onSubmit={submit} noValidate>
    {Object.keys(errors).length > 0 && <div className="form-error" role="alert"><strong>Revisa los campos señalados.</strong><span>No se guardó la información del cliente.</span></div>}
    <div className="client-edit-summary"><ClientPhoto client={displayClient} /><div><span className="cell-meta">Código del cliente</span><strong>{client?.code ?? `${newCode} · Se asignará al guardar`}</strong></div></div>
    <div className="client-dialog-tabs" role="tablist" aria-label="Secciones del cliente">
      {tabButton('GENERAL', 'Datos Generales', 1)}
      {tabButton('OPERATIVOS', 'Datos Operativos', 2)}
      {tabButton('DOCUMENTOS', 'Documentación Adjunta', 3)}
      {tabButton('FOTOS', 'Fotografías', 4)}
      {tabButton('HISTORIAL', 'Historial de Contratos', 5)}
    </div>
    <div className="client-tab-panel" role="tabpanel" hidden={activeTab !== 'GENERAL'}>
      <div className="form-grid client-general-grid">
        <div className="field"><label htmlFor="client-document-type">Tipo de Documento <span>Obligatorio</span></label><select id="client-document-type" value={documentType} onChange={event => { const value = event.target.value as NonNullable<Client['documentType']>; setDocumentType(value); setDocument(''); setErrors(current => ({ ...current, document: '' })) }}><option value="CEDULA">Cédula</option><option value="RUC">RUC</option><option value="PASAPORTE">Pasaporte</option></select></div>
        <div className="field"><label htmlFor="client-document">Documento <span>Obligatorio</span></label><input id="client-document" value={document} onChange={event => changeDocument(event.target.value)} inputMode={documentType === 'PASAPORTE' ? 'text' : 'numeric'} maxLength={documentLimit} placeholder={documentType === 'RUC' ? '13 dígitos' : documentType === 'CEDULA' ? '10 dígitos' : 'Letras y números'} aria-invalid={Boolean(errors.document)} />{errors.document && <small className="field-error">{errors.document}</small>}</div>
        <div className="field"><label htmlFor="client-institution">Institución <span>Obligatorio</span></label><select id="client-institution" name="institution" defaultValue={client?.institution ?? 'PRIVADA'}><option value="PRIVADA">Privada</option><option value="PUBLICA">Pública</option></select></div>
        <div className="field"><label htmlFor="client-business-name">Razón Social <span>Obligatorio</span></label><input id="client-business-name" name="businessName" defaultValue={client?.businessName ?? ''} maxLength={40} aria-invalid={Boolean(errors.businessName)} /><small className="field-help">Máximo 40 caracteres.</small>{errors.businessName && <small className="field-error">{errors.businessName}</small>}</div>
        <div className="field"><label htmlFor="client-trade-name">Nombre Comercial <span>Obligatorio</span></label><input id="client-trade-name" name="tradeName" defaultValue={client?.tradeName ?? ''} maxLength={40} aria-invalid={Boolean(errors.tradeName)} /><small className="field-help">Máximo 40 caracteres.</small>{errors.tradeName && <small className="field-error">{errors.tradeName}</small>}</div>
        <div className="field"><label htmlFor="client-contact">Contacto <span>Obligatorio</span></label><input id="client-contact" name="contact" defaultValue={client?.contact ?? ''} maxLength={30} aria-invalid={Boolean(errors.contact)} /><small className="field-help">Máximo 30 caracteres.</small>{errors.contact && <small className="field-error">{errors.contact}</small>}</div>
        <div className="field"><label htmlFor="client-phone">Teléfono <span>Obligatorio</span></label><input id="client-phone" name="phone" type="tel" defaultValue={client?.phone ?? ''} aria-invalid={Boolean(errors.phone)} />{errors.phone && <small className="field-error">{errors.phone}</small>}</div>
        <div className="field"><label htmlFor="client-contract-start">Inicio de Contrato <span>Obligatorio</span></label><input id="client-contract-start" name="contractStart" defaultValue={client?.contractStart ?? ''} onInput={event => { event.currentTarget.value = formatDisplayDateDraft(event.currentTarget.value) }} inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" aria-invalid={Boolean(errors.contractStart)} />{errors.contractStart && <small className="field-error">{errors.contractStart}</small>}</div>
        <div className="field"><label htmlFor="client-contract-end">Fin de Contrato <span>Opcional</span></label><input id="client-contract-end" name="contractEnd" defaultValue={client?.contractEnd ?? ''} onInput={event => { event.currentTarget.value = formatDisplayDateDraft(event.currentTarget.value) }} inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" aria-invalid={Boolean(errors.contractEnd)} />{errors.contractEnd && <small className="field-error">{errors.contractEnd}</small>}</div>
      </div>
      <section className="client-branches" aria-labelledby="client-branches-title">
        <div className="client-section-heading"><div><h3 id="client-branches-title">SUCURSALES</h3><p>Registra y edita las sucursales asociadas al cliente.</p></div><button type="button" className="button secondary compact" onClick={() => setBranches(current => [...current, emptyClientBranch()])}><Plus size={17} /> Agregar sucursal</button></div>
        {errors.branches && <div className="branch-error" role="alert">{errors.branches}</div>}
        <div className="client-branches-scroll"><table><thead><tr><th>Nombre</th><th>Provincia</th><th>Ciudad</th><th>Dirección</th><th>Contacto</th><th>Teléfono</th><th>Ubicación GPS</th><th className="row-action-cell">Acciones</th></tr></thead><tbody>{branches.map((branch, index) => {
          const branchCities = ecuadorLocations[branch.province] ?? []
          const updateBranch = (changes: Partial<ClientBranch>) => setBranches(current => current.map(item => item.id === branch.id ? { ...item, ...changes } : item))
          return <tr key={branch.id}>
            <td><input aria-label={`Nombre de sucursal ${index + 1}`} value={branch.name} maxLength={15} placeholder="Máx. 15 caracteres" onChange={event => updateBranch({ name: event.target.value })} /></td>
            <td><input aria-label={`Provincia de sucursal ${index + 1}`} list={`branch-provinces-${branch.id}`} value={branch.province} placeholder="Filtrar provincia" onChange={event => updateBranch({ province: event.target.value, city: event.target.value === branch.province ? branch.city : '' })} /><datalist id={`branch-provinces-${branch.id}`}>{ecuadorProvinces.map(item => <option key={item} value={item} />)}</datalist></td>
            <td><input aria-label={`Ciudad de sucursal ${index + 1}`} list={`branch-cities-${branch.id}`} value={branch.city} placeholder={branch.province ? 'Filtrar ciudad' : 'Elige provincia'} disabled={!branchCities.length} onChange={event => updateBranch({ city: event.target.value })} /><datalist id={`branch-cities-${branch.id}`}>{branchCities.map(item => <option key={item} value={item} />)}</datalist></td>
            <td><input aria-label={`Dirección de sucursal ${index + 1}`} value={branch.address} maxLength={50} placeholder="Máx. 50 caracteres" onChange={event => updateBranch({ address: event.target.value })} /></td>
            <td><input aria-label={`Contacto de sucursal ${index + 1}`} value={branch.contact} maxLength={30} placeholder="Máx. 30 caracteres" onChange={event => updateBranch({ contact: event.target.value })} /></td>
            <td><input aria-label={`Teléfono de sucursal ${index + 1}`} type="tel" value={branch.phone} placeholder="Teléfono" onChange={event => updateBranch({ phone: event.target.value })} /></td>
            <td><div className="branch-gps-field"><input aria-label={`Ubicación GPS de sucursal ${index + 1}`} value={branch.gpsLocation} placeholder="Coordenadas o enlace" onChange={event => updateBranch({ gpsLocation: event.target.value })} /><button type="button" className="icon-button small" aria-label={`Abrir Google Maps para sucursal ${index + 1}`} title="Abrir Google Maps" onClick={() => window.open('https://www.google.com/maps', '_blank', 'noopener,noreferrer')}><MapPin size={17} /></button></div></td>
            <td className="row-action-cell"><div className="row-action-buttons"><button type="button" className="icon-button small save-line-button" aria-label={`Grabar sucursal ${index + 1}`} title="Grabar línea" onClick={() => saveBranchLine(branch)}><Check size={17} /></button><button type="button" className="icon-button small" aria-label={`Eliminar sucursal ${index + 1}`} onClick={() => setBranches(current => current.length === 1 ? [emptyClientBranch(current[0].id)] : current.filter(item => item.id !== branch.id))}><Trash2 size={17} /></button></div>{inlineFeedback[branch.id] && <small className={`inline-row-feedback ${inlineFeedback[branch.id].tone}`}>{inlineFeedback[branch.id].message}</small>}</td>
          </tr>
        })}</tbody></table></div>
      </section>
    </div>
    <div className="client-tab-panel" role="tabpanel" hidden={activeTab !== 'OPERATIVOS'}>
      <div className="client-tab-intro"><h3>Datos Operativos</h3><p>Configura los contratos por ubicación y asigna los horarios del personal fijo.</p></div>
      <section className="operational-contracts" aria-labelledby="operational-contracts-title">
        <div className="client-section-heading"><div><h3 id="operational-contracts-title">CONTRATOS OPERATIVOS</h3><p>Registra las condiciones operativas vigentes en cada ubicación.</p></div><button type="button" className="button secondary compact" onClick={() => setOperationalContracts(current => [...current, emptyOperationalContract()])}><Plus size={17} /> Agregar contrato</button></div>
        {errors.operationalContracts && <div className="branch-error" role="alert">{errors.operationalContracts}</div>}
        <div className="operational-contracts-scroll"><table><thead><tr><th>Nombre Contrato</th><th>Ubicación</th><th>Fecha Inicio</th><th>Fecha Fin</th><th>Administrador Contrato</th><th>Personal Fijo</th><th>Número de Puestos</th><th>Supervisor Fijo</th><th className="row-action-cell">Acciones</th></tr></thead><tbody>{operationalContracts.map((contract, index) => {
          const locationOptions = [...new Set(['Matriz', ...branches.map(branch => branch.name.trim()).filter(Boolean)])]
          const updateContract = (changes: Partial<ClientOperationalContract>) => updateOperationalContract(contract.id, changes)
          return <tr key={contract.id}>
            <td><input aria-label={`Nombre del contrato ${index + 1}`} value={contract.contractName} maxLength={45} placeholder="Nombre para identificarlo" onChange={event => updateContract({ contractName: event.target.value })} /></td>
            <td><select aria-label={`Ubicación del contrato ${index + 1}`} value={contract.location} onChange={event => updateContract({ location: event.target.value })}>{locationOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></td>
            <td><input aria-label={`Fecha inicio del contrato ${index + 1}`} value={contract.startDate} inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" onChange={event => updateContract({ startDate: formatDisplayDateDraft(event.target.value) })} /></td>
            <td><input aria-label={`Fecha fin del contrato ${index + 1}`} value={contract.endDate} inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" onChange={event => updateContract({ endDate: formatDisplayDateDraft(event.target.value) })} /></td>
            <td><input aria-label={`Administrador del contrato ${index + 1}`} value={contract.contractAdministrator} maxLength={45} placeholder="Máx. 45 caracteres" onChange={event => updateContract({ contractAdministrator: event.target.value })} /></td>
            <td><input aria-label={`Personal fijo del contrato ${index + 1}`} type="number" min="0" step="1" value={contract.fixedStaff} onChange={event => updateContract({ fixedStaff: Math.max(0, Number(event.target.value) || 0) })} /></td>
            <td><input aria-label={`Número de puestos del contrato ${index + 1}`} type="number" min="0" step="1" value={contract.positions} onChange={event => updateContract({ positions: Math.max(0, Number(event.target.value) || 0) })} /></td>
            <td><div className="fixed-supervisor-config"><select aria-label={`Supervisor fijo del contrato ${index + 1}`} value={contract.fixedSupervisor ? 'SI' : 'NO'} onChange={event => updateContract({ fixedSupervisor: event.target.value === 'SI', fixedSupervisorCount: event.target.value === 'SI' ? Math.max(1, contract.fixedSupervisorCount || 1) : 0 })}><option value="NO">No</option><option value="SI">Sí</option></select>{contract.fixedSupervisor && <label><span>Cantidad</span><input aria-label={`Cantidad de supervisores fijos del contrato ${index + 1}`} type="number" min="1" step="1" value={contract.fixedSupervisorCount} onChange={event => updateContract({ fixedSupervisorCount: Math.max(1, Number(event.target.value) || 1) })} /></label>}</div></td>
            <td className="row-action-cell"><div className="row-action-buttons"><button type="button" className="icon-button small save-line-button" aria-label={`Grabar contrato ${index + 1}`} title="Grabar línea" onClick={() => saveOperationalContractLine(contract)}><Check size={17} /></button><button type="button" className="icon-button small" aria-label={`Eliminar contrato ${index + 1}`} onClick={() => setOperationalContracts(current => current.length === 1 ? [emptyOperationalContract(undefined, current[0].id)] : current.filter(item => item.id !== contract.id))}><Trash2 size={17} /></button></div>{inlineFeedback[contract.id] && <small className={`inline-row-feedback ${inlineFeedback[contract.id].tone}`}>{inlineFeedback[contract.id].message}</small>}</td>
          </tr>
        })}</tbody></table></div>
      </section>
      <section className="weekly-schedule" aria-labelledby="weekly-schedule-title">
        <div className="schedule-header"><div><h3 id="weekly-schedule-title">CONFIGURACIÓN OPERATIVA DEL CONTRATO</h3><p>Selecciona un contrato activo y administra su horario o sus requerimientos particulares.</p></div>{selectedOperationalContract && <div className="positions-indicator"><span>Número de Puestos</span><strong>{selectedOperationalContract.positions}</strong></div>}</div>
        {activeOperationalContracts.length ? <>
          <div className="schedule-contract-selector"><div className="field"><label htmlFor="active-operational-contract">Contrato activo</label><select id="active-operational-contract" value={resolvedContractId} onChange={event => { setSelectedContractId(event.target.value); setSelectedSchedulePeople([]); setInspectedSchedulePerson('1'); setScheduleRangeAnchor(null) }}>{activeOperationalContracts.map(contract => <option key={contract.id} value={contract.id}>{contract.contractName} · {contract.location} · {contract.startDate} — {contract.endDate}</option>)}</select></div><span className="active-contract-note"><CheckCircle2 size={18} /> Fecha fin posterior a {currentEcuadorDate()}</span></div>
          <div className="operational-detail-tabs" role="tablist" aria-label="Configuración del contrato activo"><button type="button" role="tab" aria-selected={operationalDetailTab === 'HORARIO'} className={operationalDetailTab === 'HORARIO' ? 'active' : ''} onClick={() => setOperationalDetailTab('HORARIO')}><CalendarDays size={17} /> Horario</button><button type="button" role="tab" aria-selected={operationalDetailTab === 'REQUERIMIENTOS'} className={operationalDetailTab === 'REQUERIMIENTOS' ? 'active' : ''} onClick={() => setOperationalDetailTab('REQUERIMIENTOS')}><FileText size={17} /> Requerimientos Particulares</button></div>
          {operationalDetailTab === 'HORARIO' && (selectedOperationalContract && availableSchedulePeople.length > 0 ? <div className="schedule-workspace" role="tabpanel" aria-label="Horario">
            <aside className="fixed-staff-list" aria-label="Personal fijo">
              <strong>Personal y Supervisores</strong>
              <span>{resolvedSchedulePeople.length} de {availableSchedulePeople.length} agrupados</span>
              <div className="fixed-staff-quick-actions"><button type="button" onClick={() => setSelectedSchedulePeople(availableSchedulePersonKeys)}>Todos</button><button type="button" onClick={() => setSelectedSchedulePeople([])}>Ninguno</button></div>
              <div className="fixed-staff-options">{availableSchedulePeople.map(person => { const grouped = resolvedSchedulePeople.includes(person.key); const inspected = resolvedInspectedSchedulePerson === person.key; return <div key={person.key} className={`fixed-staff-option${grouped ? ' grouped' : ''}${inspected ? ' inspected' : ''}`}><input type="checkbox" checked={grouped} onChange={() => toggleSchedulePerson(person.key)} aria-label={`Agrupar ${person.label}`} /><button type="button" onClick={() => { setInspectedSchedulePerson(person.key); setScheduleRangeAnchor(null) }} aria-pressed={inspected}>{person.label}</button></div> })}</div>
            </aside>
            <div className="schedule-main">
              <div className="schedule-actions"><span>Horario de {inspectedSchedulePersonLabel}{resolvedSchedulePeople.length ? ` · aplicar a ${resolvedSchedulePeople.length} agrupados` : ''}</span><div className="schedule-cycle-controls"><label>DÍAS: <input type="number" min="1" max="99" step="1" value={selectedCycleDays || ''} placeholder="—" aria-label={`Días del ciclo para ${inspectedSchedulePersonLabel}`} onChange={event => updateScheduleCycleDays(Number(event.target.value))} /></label><label className={selectedCycleDays > 0 ? '' : 'disabled'}><input type="checkbox" checked={selectedCycleRepeats} disabled={selectedCycleDays === 0} onChange={event => updateScheduleCycleRepeats(event.target.checked)} /> REPITE</label></div><button type="button" className="save-schedule-button" onClick={saveCurrentSchedule}><Check size={15} /> Grabar horario</button></div>
              {selectedCycleDays > 0 && <p className="schedule-cycle-note">Ciclo de {selectedCycleDays} {selectedCycleDays === 1 ? 'día' : 'días'}{selectedCycleRepeats ? ' que se repite consecutivamente.' : ' sin repetición automática.'}</p>}
              {inlineFeedback[`schedule-${selectedOperationalContract.id}`] && <small className="schedule-save-feedback">{inlineFeedback[`schedule-${selectedOperationalContract.id}`].message}</small>}
              <div className="weekly-calendar-scroll"><table className={`weekly-calendar ${selectedCycleDays > 0 ? 'cycle-calendar' : ''}`}><thead><tr><th>Hora</th>{scheduleColumns.map(day => <th key={day.key}>{day.label}</th>)}</tr></thead><tbody>{Array.from({ length: 24 }, (_, hour) => <tr key={hour}><th>{String(hour).padStart(2, '0')}:00</th>{scheduleColumns.map(day => { const cell = `${day.key}-${String(hour).padStart(2, '0')}`; const active = (selectedOperationalContract.schedules[primaryPersonKey] ?? []).includes(cell); return <td key={cell}><button type="button" className={active ? 'scheduled' : ''} aria-pressed={active} aria-label={`${day.label} ${String(hour).padStart(2, '0')}:00 para ${inspectedSchedulePersonLabel}`} onClick={event => toggleScheduleCell(cell, event.shiftKey)}>{active ? 'Asignado' : ''}</button></td> })}</tr>)}</tbody></table></div>
            </div>
          </div> : <div className="schedule-empty" role="tabpanel" aria-label="Horario"><Users size={28} /><strong>Sin personal para calendarizar</strong><p>Registra Personal Fijo o habilita al menos un Supervisor Fijo.</p></div>)}
          {operationalDetailTab === 'REQUERIMIENTOS' && <div className="particular-requirements-panel" role="tabpanel" aria-label="Requerimientos Particulares">
            <div className="particular-requirements-heading"><div><h4>REQUERIMIENTOS PARTICULARES</h4><p>Agrega requerimientos individuales y relaciónalos con uno de los contratos registrados.</p></div><Badge tone="info">{particularRequirementRows.length} registros</Badge></div>
            <div className="requirement-entry-row">
              <div className="field"><label htmlFor="requirement-contract">Contrato <span>Obligatorio</span></label><select id="requirement-contract" value={requirementContractId} onChange={event => { setRequirementContractId(event.target.value); setRequirementFeedback('') }}><option value="">Selecciona el contrato</option>{operationalContracts.map(contract => <option key={contract.id} value={contract.id}>{contract.contractName} · {contract.location}</option>)}</select></div>
              <div className="field"><label htmlFor="particular-requirement">Requerimiento <span>Obligatorio</span></label><input id="particular-requirement" value={requirementDraft} maxLength={100} placeholder="Máximo 100 caracteres" onChange={event => { setRequirementDraft(event.target.value); setRequirementFeedback('') }} /><small className="field-help">{requirementDraft.length}/100 caracteres</small></div>
              <button type="button" className="button primary" onClick={addParticularRequirement}><Plus size={17} /> Agregar</button>
            </div>
            {requirementFeedback && <div className={`client-document-feedback ${requirementFeedback.includes('agregado') ? 'success' : requirementFeedback.includes('eliminado') ? 'success' : 'error'}`} role="status">{requirementFeedback}</div>}
            <section className="requirements-list" aria-labelledby="requirements-list-title">
              <div className="requirements-list-toolbar"><div><h4 id="requirements-list-title">LISTADO DE REQUERIMIENTOS</h4><span>{particularRequirementRows.length} resultados</span></div><div className="field"><label htmlFor="requirement-contract-filter">Filtrar por contrato</label><select id="requirement-contract-filter" value={requirementFilterContractId} onChange={event => setRequirementFilterContractId(event.target.value)}><option value="">Todos los contratos</option>{operationalContracts.map(contract => <option key={contract.id} value={contract.id}>{contract.contractName}</option>)}</select></div></div>
              <div className="table-scroll" role="region" aria-label="Listado de requerimientos particulares" tabIndex={0}><table className="requirements-table"><thead><tr><th><button type="button" className="sort-header" onClick={() => setRequirementContractSort(current => current === 'ASC' ? 'DESC' : 'ASC')}>Contrato {requirementContractSort === 'ASC' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</button></th><th>Ubicación</th><th>Requerimiento</th><th className="row-action-cell">Acciones</th></tr></thead><tbody>{particularRequirementRows.map(row => <tr key={row.id}><td><strong>{row.contractName}</strong></td><td>{row.location}</td><td>{row.requirement}</td><td className="row-action-cell"><button type="button" className="icon-button small" aria-label={`Eliminar requerimiento ${row.requirement}`} title="Eliminar requerimiento" onClick={() => removeParticularRequirement(row.contractId, row.id)}><Trash2 size={17} /></button></td></tr>)}{!particularRequirementRows.length && <tr><td colSpan={4}><div className="empty-state"><FileText /><strong>Sin requerimientos</strong><p>No hay registros para el filtro seleccionado.</p></div></td></tr>}</tbody></table></div>
            </section>
          </div>}
        </> : <div className="schedule-empty"><CalendarDays size={28} /><strong>No hay contratos activos</strong><p>Registra una Fecha Fin posterior a {currentEcuadorDate()} para habilitar el calendario semanal.</p></div>}
      </section>
    </div>
    <div className="client-tab-panel" role="tabpanel" hidden={activeTab !== 'DOCUMENTOS'}>
      <div className="client-tab-intro"><h3>Documentación Adjunta</h3><p>Escoge primero el tipo de documento habilitado para Clientes y luego busca el archivo que deseas subir.</p></div>
      <div className="client-document-workflow">
        <div className="field">
          <label htmlFor="client-attachment-type">Tipo de Documento <span>Obligatorio</span></label>
          <select id="client-attachment-type" value={selectedAttachmentTypeId} disabled={!enabledClientDocumentTypes.length} onChange={event => { setSelectedAttachmentTypeId(event.target.value); setPendingAttachmentFile(null); setAttachmentInputKey(current => current + 1); setAttachmentFeedback('') }}>
            <option value="">Selecciona un tipo de documento</option>
            {enabledClientDocumentTypes.map(record => <option key={record.id} value={record.id}>{record.name}</option>)}
          </select>
          <small className="field-help">El listado proviene de Configuración General / Tipo Documento.</small>
        </div>
        {!enabledClientDocumentTypes.length && <div className="notice warning"><AlertTriangle size={20} /><div><strong>No hay tipos de documento disponibles</strong><p>Activa y habilita al menos un registro para Clientes en Configuración General / Tipo Documento.</p></div></div>}
        <label className={`client-upload-zone client-document-upload ${selectedAttachmentTypeId ? '' : 'disabled'}`}>
          <Upload size={34} />
          <strong>{selectedAttachmentTypeId ? 'Buscar archivo' : 'Selecciona primero el tipo de documento'}</strong>
          <span>PDF, Word o imágenes · un archivo por cada tipo seleccionado</span>
          <input key={attachmentInputKey} type="file" disabled={!selectedAttachmentTypeId} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={event => { const file = event.target.files?.[0] ?? null; if (file) rememberUploadedFile(file); setPendingAttachmentFile(file); setAttachmentFeedback('') }} />
        </label>
        {pendingAttachmentFile && <div className="client-document-selection"><div><FileText size={22} /><span><strong>{pendingAttachmentFile.name}</strong><small>{(pendingAttachmentFile.size / 1024).toFixed(1)} KB</small></span></div><div className="file-action-buttons"><UploadedFileDownloadButton fileName={pendingAttachmentFile.name} compact={false} /><button type="button" className="button primary" onClick={attachClientDocument}><Upload size={17} /> Subir archivo</button></div></div>}
        {attachmentFeedback && <div className={`client-document-feedback ${attachmentFeedback.includes('correctamente') ? 'success' : 'error'}`} role="status">{attachmentFeedback}</div>}
        {attachedDocuments.length > 0 && <section className="client-attached-documents" aria-labelledby="client-attached-documents-title"><div className="client-section-heading"><div><h3 id="client-attached-documents-title">DOCUMENTOS ADJUNTOS</h3><p>Archivos registrados para este cliente.</p></div><Badge tone="success">{attachedDocuments.length} adjunto{attachedDocuments.length === 1 ? '' : 's'}</Badge></div><div className="table-scroll"><table><thead><tr><th>Tipo de Documento</th><th>Archivo</th><th>Tamaño</th><th>Fecha</th><th className="row-action-cell">Descargar</th><th className="row-action-cell">Eliminar</th></tr></thead><tbody>{attachedDocuments.map(document => <tr key={document.id}><td><strong>{document.documentTypeName}</strong></td><td>{document.fileName}</td><td>{(document.fileSize / 1024).toFixed(1)} KB</td><td>{document.uploadedAt}</td><td className="row-action-cell"><UploadedFileDownloadButton fileName={document.fileName} /></td><td className="row-action-cell"><button type="button" className="icon-button small" aria-label={`Eliminar ${document.fileName}`} title="Eliminar documento" onClick={() => setAttachedDocuments(current => current.filter(item => item.id !== document.id))}><Trash2 size={17} /></button></td></tr>)}</tbody></table></div></section>}
      </div>
    </div>
    <div className="client-tab-panel" role="tabpanel" hidden={activeTab !== 'FOTOS'}>
      <div className="client-tab-intro"><h3>Fotografías</h3><p>Escoge primero el tipo de documento habilitado para Clientes y luego busca la fotografía que deseas subir.</p></div>
      <div className="client-document-workflow">
        <div className="field full-width-field"><label htmlFor="client-photo-url">Foto principal (URL opcional)</label><input id="client-photo-url" name="photoUrl" type="url" defaultValue={client?.photoUrl ?? ''} placeholder="https://ejemplo.com/foto.png" /><small className="field-help">Si no se registra una imagen, se mostrarán las iniciales de la razón social.</small></div>
        <div className="field">
          <label htmlFor="client-photo-type">Tipo de Documento <span>Obligatorio</span></label>
          <select id="client-photo-type" value={selectedPhotoTypeId} disabled={!enabledClientDocumentTypes.length} onChange={event => { setSelectedPhotoTypeId(event.target.value); setPendingPhotoFile(null); setPhotoInputKey(current => current + 1); setPhotoFeedback('') }}>
            <option value="">Selecciona un tipo de documento</option>
            {enabledClientDocumentTypes.map(record => <option key={record.id} value={record.id}>{record.name}</option>)}
          </select>
          <small className="field-help">El listado proviene de Configuración General / Tipo Documento.</small>
        </div>
        {!enabledClientDocumentTypes.length && <div className="notice warning"><AlertTriangle size={20} /><div><strong>No hay tipos de documento disponibles</strong><p>Activa y habilita al menos un registro para Clientes en Configuración General / Tipo Documento.</p></div></div>}
        <label className={`client-upload-zone client-document-upload ${selectedPhotoTypeId ? '' : 'disabled'}`}>
          <Upload size={34} />
          <strong>{selectedPhotoTypeId ? 'Buscar fotografía' : 'Selecciona primero el tipo de documento'}</strong>
          <span>PNG o JPG · una fotografía por cada tipo seleccionado</span>
          <input key={photoInputKey} type="file" disabled={!selectedPhotoTypeId} accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={event => { const file = event.target.files?.[0] ?? null; if (file) rememberUploadedFile(file); setPendingPhotoFile(file); setPhotoFeedback('') }} />
        </label>
        {pendingPhotoFile && <div className="client-document-selection"><div><Upload size={22} /><span><strong>{pendingPhotoFile.name}</strong><small>{(pendingPhotoFile.size / 1024).toFixed(1)} KB</small></span></div><div className="file-action-buttons"><UploadedFileDownloadButton fileName={pendingPhotoFile.name} compact={false} /><button type="button" className="button primary" onClick={attachClientPhoto}><Upload size={17} /> Subir fotografía</button></div></div>}
        {photoFeedback && <div className={`client-document-feedback ${photoFeedback.includes('correctamente') ? 'success' : 'error'}`} role="status">{photoFeedback}</div>}
        {attachedPhotos.length > 0 && <section className="client-attached-documents" aria-labelledby="client-attached-photos-title"><div className="client-section-heading"><div><h3 id="client-attached-photos-title">FOTOGRAFÍAS ADJUNTAS</h3><p>Imágenes registradas para este cliente.</p></div><Badge tone="success">{attachedPhotos.length} fotografía{attachedPhotos.length === 1 ? '' : 's'}</Badge></div><div className="table-scroll"><table><thead><tr><th>Tipo de Documento</th><th>Archivo</th><th>Tamaño</th><th>Fecha</th><th className="row-action-cell">Descargar</th><th className="row-action-cell">Eliminar</th></tr></thead><tbody>{attachedPhotos.map(photo => <tr key={photo.id}><td><strong>{photo.documentTypeName}</strong></td><td>{photo.fileName}</td><td>{(photo.fileSize / 1024).toFixed(1)} KB</td><td>{photo.uploadedAt}</td><td className="row-action-cell"><UploadedFileDownloadButton fileName={photo.fileName} /></td><td className="row-action-cell"><button type="button" className="icon-button small" aria-label={`Eliminar ${photo.fileName}`} title="Eliminar fotografía" onClick={() => setAttachedPhotos(current => current.filter(item => item.id !== photo.id))}><Trash2 size={17} /></button></td></tr>)}</tbody></table></div></section>}
      </div>
    </div>
    <div className="client-tab-panel" role="tabpanel" hidden={activeTab !== 'HISTORIAL'}><div className="client-tab-intro"><h3>Historial de Contratos</h3><p>Consulta los contratos finalizados cuya Fecha Fin es igual o anterior a {currentEcuadorDate()}.</p></div><section className="panel table-panel contract-history-panel"><div className="table-scroll" role="region" aria-label="Historial de contratos del cliente" tabIndex={0}><table className="contract-history-table"><caption className="sr-only">Contratos finalizados de {client?.businessName ?? 'nuevo cliente'}</caption><thead><tr><th>Nombre Contrato</th><th>Ubicación</th><th>Fecha Inicio</th><th>Fecha Fin</th><th>Administrador Contrato</th><th>Personal Fijo</th><th>Número de Puestos</th><th>Horarios asignados</th><th>Estado</th></tr></thead><tbody>{completedOperationalContracts.map(contract => <tr key={contract.id}><td><strong>{contract.contractName}</strong></td><td>{contract.location}</td><td>{contract.startDate}</td><td>{contract.endDate}</td><td>{contract.contractAdministrator}</td><td className="numeric">{contract.fixedStaff}</td><td className="numeric">{contract.positions}</td><td className="numeric">{Object.values(contract.schedules).filter(cells => cells.length > 0).length}</td><td><Badge tone="neutral">Finalizado</Badge></td></tr>)}{!completedOperationalContracts.length && <tr><td colSpan={9}><div className="empty-state"><FileClock /><strong>Sin contratos finalizados</strong><p>Los contratos aparecerán aquí automáticamente cuando alcancen su Fecha Fin.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{completedOperationalContracts.length} contratos finalizados</span><span>Actualizado según la fecha actual</span></div></section></div>
    <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary"><Check size={18} /> {client ? 'Guardar cambios' : 'Guardar cliente'}</button></div>
  </form></Dialog>
}

function ClientAccountStatementsPage({ clients }: { clients: Client[] }) {
  const [expandedClientCodes, setExpandedClientCodes] = useState<string[]>([])
  const [editingInvoice, setEditingInvoice] = useState<{ clientCode: string; clientName: string; record: ClientInvoiceRecord } | null>(null)
  const [editingInvoiceFile, setEditingInvoiceFile] = useState<File | null>(null)
  const [editingSupportFile, setEditingSupportFile] = useState<File | null>(null)
  const [editingInvoiceError, setEditingInvoiceError] = useState('')
  const [creatingForClient, setCreatingForClient] = useState<string | null>(null)
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [supportFile, setSupportFile] = useState<File | null>(null)
  const [feedback, setFeedback] = useState('')
  const [invoiceRecords, setInvoiceRecords] = useState<Record<string, ClientInvoiceRecord[]>>(() => {
    const saved = window.localStorage.getItem('nomina-estado-cuentas-facturas')
    if (saved) return JSON.parse(saved) as Record<string, ClientInvoiceRecord[]>
    return Object.fromEntries(clients.map((client, index) => {
      const baseValue = String(1250 + index * 175)
      const firstInvoice = `factura-${client.code.toLocaleLowerCase('es')}-001.pdf`
      const firstSupport = `soporte-${client.code.toLocaleLowerCase('es')}-001.pdf`
      return [client.code, [
        { id: `${client.code}-FAC-001`, invoiceFileName: firstInvoice, detail: 'Servicio mensual de seguridad y vigilancia', date: `05/09/2026`, value: baseValue, status: 'CANCELADO', cancellationDate: '18/09/2026', observation: 'Pago conciliado mediante transferencia bancaria.', guardPayment: 'CANCELADO', supportFileName: firstSupport },
        { id: `${client.code}-FAC-002`, invoiceFileName: `factura-${client.code.toLocaleLowerCase('es')}-002.pdf`, detail: 'Servicio mensual correspondiente a octubre', date: `05/10/2026`, value: String(1380 + index * 190), status: index === 3 ? 'CANCELADO' : 'PENDIENTE', cancellationDate: index === 3 ? '17/10/2026' : '', observation: index === 3 ? 'Cuenta cerrada y conciliada.' : 'Pendiente de confirmación del cliente.', guardPayment: index % 2 ? 'PENDIENTE' : 'CANCELADO', supportFileName: `soporte-${client.code.toLocaleLowerCase('es')}-002.pdf` },
      ] satisfies ClientInvoiceRecord[]]
    }))
  })
  useEffect(() => {
    window.localStorage.setItem('nomina-estado-cuentas-facturas', JSON.stringify(invoiceRecords))
  }, [invoiceRecords])
  useEffect(() => {
    Object.values(invoiceRecords).flat().forEach(record => {
      const isDemonstrationRecord = /-FAC-00[12]$/.test(record.id)
      if (isDemonstrationRecord && !uploadedFileUrls.has(record.invoiceFileName)) rememberUploadedFile(new File([createTablePdf('Factura', ['Detalle', 'Fecha', 'Valor'], [[record.detail, record.date, record.value]])], record.invoiceFileName, { type: 'application/pdf' }))
      if (isDemonstrationRecord && record.supportFileName && !uploadedFileUrls.has(record.supportFileName)) rememberUploadedFile(new File([createTablePdf('Soporte de pago', ['Observación', 'Fecha cancelación'], [[record.observation, record.cancellationDate]])], record.supportFileName, { type: 'application/pdf' }))
    })
  }, [invoiceRecords])
  const rows = clients.map(client => {
    const invoices = invoiceRecords[client.code] ?? []
    const total = invoices.reduce((sum, invoice) => sum + decimalToCents(invoice.value), 0n)
    const balance = invoices.filter(invoice => invoice.status === 'PENDIENTE').reduce((sum, invoice) => sum + decimalToCents(invoice.value), 0n)
    return { client, invoices, total, balance, status: balance > 0n ? 'PENDIENTE' as const : 'CANCELADO' as const }
  })
  const toggleClient = (clientCode: string) => setExpandedClientCodes(current => current.includes(clientCode) ? current.filter(code => code !== clientCode) : [...current, clientCode])
  const startInvoice = (clientCode: string) => {
    setExpandedClientCodes(current => current.includes(clientCode) ? current : [...current, clientCode])
    setCreatingForClient(clientCode); setInvoiceFile(null); setSupportFile(null); setFeedback('')
  }
  const cancelInvoice = () => { setCreatingForClient(null); setInvoiceFile(null); setSupportFile(null); setFeedback('') }
  const saveInvoiceStatus = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingInvoice) return
    const { clientCode, record } = editingInvoice
    if (!record.detail.trim()) {
      setEditingInvoiceError('Ingresa el detalle de la factura.')
      return
    }
    if (!isValidDisplayDate(record.date)) {
      setEditingInvoiceError('Ingresa una fecha válida en formato DD/MM/AAAA.')
      return
    }
    if (decimalToCents(record.value) <= 0n) {
      setEditingInvoiceError('Ingresa un valor mayor a cero.')
      return
    }
    if (record.status === 'CANCELADO' && !isValidDisplayDate(record.cancellationDate)) {
      setEditingInvoiceError('Ingresa una fecha de cancelación válida en formato DD/MM/AAAA.')
      return
    }
    const updatedRecord = { ...record, invoiceFileName: editingInvoiceFile?.name ?? record.invoiceFileName, supportFileName: editingSupportFile?.name ?? record.supportFileName, detail: record.detail.trim().slice(0, 60), cancellationDate: record.status === 'CANCELADO' ? record.cancellationDate : '' }
    setInvoiceRecords(current => ({ ...current, [clientCode]: (current[clientCode] ?? []).map(invoice => invoice.id === record.id ? updatedRecord : invoice) }))
    setEditingInvoice(null)
    setEditingInvoiceFile(null)
    setEditingSupportFile(null)
    setEditingInvoiceError('')
  }
  const saveInvoice = (event: FormEvent<HTMLFormElement>, clientCode: string) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const detail = String(data.get('detail') ?? '').trim().slice(0, 60)
    const date = String(data.get('date') ?? '').trim()
    const value = String(data.get('value') ?? '').trim()
    const status = String(data.get('status')) as ClientInvoiceRecord['status']
    const cancellationDate = String(data.get('cancellationDate') ?? '').trim()
    const observation = String(data.get('observation') ?? '').trim()
    const guardPayment = String(data.get('guardPayment')) as ClientInvoiceRecord['guardPayment']
    if (!invoiceFile) { setFeedback('Selecciona el documento de la factura.'); return }
    if (!detail) { setFeedback('Ingresa el detalle de la factura.'); return }
    if (!isValidDisplayDate(date)) { setFeedback('Ingresa una fecha válida en formato DD/MM/AAAA.'); return }
    if (decimalToCents(value) <= 0n) { setFeedback('Ingresa un valor mayor a cero.'); return }
    if (status === 'CANCELADO' && !isValidDisplayDate(cancellationDate)) { setFeedback('Ingresa la fecha de cancelación en formato DD/MM/AAAA.'); return }
    const record: ClientInvoiceRecord = { id: `${clientCode}-FAC-${Date.now()}`, invoiceFileName: invoiceFile.name, detail, date, value, status, cancellationDate: status === 'CANCELADO' ? cancellationDate : '', observation, guardPayment, supportFileName: supportFile?.name ?? '' }
    setInvoiceRecords(current => ({ ...current, [clientCode]: [record, ...(current[clientCode] ?? [])] }))
    setFeedback('Factura guardada correctamente.'); setCreatingForClient(null); setInvoiceFile(null); setSupportFile(null)
  }
  return <>
    <PageHeader eyebrow="Clientes / Estado de Cuentas" title="Estado de Cuentas" description="" />
    <section className="panel table-panel">
      <div className="panel-heading table-title"><div><h2>Resumen por cliente</h2></div><CircleDollarSign size={22} color="var(--primary)" /></div>
      <div className="table-scroll account-statements-scroll" role="region" aria-label="Estado de cuentas de clientes" tabIndex={0}><table className="client-accounts-table"><caption className="sr-only">Estado de cuentas de clientes</caption><thead><tr><th className="row-action-cell" aria-label="Expandir detalle" /><th>Código</th><th>Cliente</th><th>Fecha Inicio</th><th>Fecha Final</th><th className="numeric">Monto Total</th><th className="numeric">Saldo</th><th>Estado</th></tr></thead><tbody>
        {rows.flatMap(row => {
          const expanded = expandedClientCodes.includes(row.client.code)
          return [
            <tr key={row.client.code} className={expanded ? 'account-client-row expanded' : 'account-client-row'}><td className="row-action-cell"><button type="button" className="icon-button small" onClick={() => toggleClient(row.client.code)} aria-expanded={expanded} aria-label={`${expanded ? 'Contraer' : 'Expandir'} facturas de ${row.client.businessName}`} title={`${expanded ? 'Contraer' : 'Expandir'} detalle`}>{expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button></td><td><strong>{row.client.code}</strong></td><td><strong>{row.client.businessName}</strong><span className="cell-meta">{row.invoices.length} {row.invoices.length === 1 ? 'factura' : 'facturas'}</span></td><td>{row.client.contractStart || 'Sin fecha'}</td><td>{row.client.contractEnd || 'Vigente'}</td><td className="numeric money">{money(row.total)}</td><td className="numeric money strong">{money(row.balance)}</td><td><Badge tone={row.status === 'CANCELADO' ? 'success' : 'warning'}>{row.status === 'CANCELADO' ? 'Cancelado' : 'Pendiente'}</Badge></td></tr>,
            expanded ? <tr key={`${row.client.code}-detail`} className="account-detail-row"><td colSpan={8}><div className="account-detail-panel">
              <div className="account-detail-heading"><div><h3>Facturas de {row.client.businessName}</h3><p>Documentos emitidos, estado de cobro y pago a guardias.</p></div><button type="button" className="button primary" onClick={() => startInvoice(row.client.code)}><Plus size={17} /> Nueva factura</button></div>
              {creatingForClient === row.client.code && <form className="account-invoice-form" onSubmit={event => saveInvoice(event, row.client.code)}>
                <div className="field"><label htmlFor={`invoice-file-${row.client.code}`}>Factura <span>Obligatorio</span></label><input id={`invoice-file-${row.client.code}`} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={event => { const file = event.target.files?.[0] ?? null; if (file) rememberUploadedFile(file); setInvoiceFile(file); setFeedback('') }} />{invoiceFile && <span className="selected-file">{invoiceFile.name}</span>}</div>
                <div className="field"><label htmlFor={`invoice-detail-${row.client.code}`}>Detalle <span>Obligatorio</span></label><input id={`invoice-detail-${row.client.code}`} name="detail" maxLength={60} placeholder="Máximo 60 caracteres" /><small className="field-help">Máximo 60 caracteres.</small></div>
                <div className="field"><label htmlFor={`invoice-date-${row.client.code}`}>Fecha <span>Obligatorio</span></label><input id={`invoice-date-${row.client.code}`} name="date" maxLength={10} inputMode="numeric" placeholder="DD/MM/AAAA" onInput={event => { event.currentTarget.value = formatDisplayDateDraft(event.currentTarget.value) }} /></div>
                <div className="field"><label htmlFor={`invoice-value-${row.client.code}`}>Valor <span>Obligatorio</span></label><input id={`invoice-value-${row.client.code}`} name="value" type="number" min="0.01" step="0.01" placeholder="0.00" /></div>
                <div className="field"><label htmlFor={`invoice-status-${row.client.code}`}>Estado</label><select id={`invoice-status-${row.client.code}`} name="status" defaultValue="PENDIENTE"><option value="PENDIENTE">Pendiente</option><option value="CANCELADO">Cancelado</option></select></div>
                <div className="field"><label htmlFor={`invoice-cancellation-${row.client.code}`}>Fecha Cancelación</label><input id={`invoice-cancellation-${row.client.code}`} name="cancellationDate" maxLength={10} inputMode="numeric" placeholder="DD/MM/AAAA" onInput={event => { event.currentTarget.value = formatDisplayDateDraft(event.currentTarget.value) }} /></div>
                <div className="field account-observation-field"><label htmlFor={`invoice-observation-${row.client.code}`}>Observación</label><textarea id={`invoice-observation-${row.client.code}`} name="observation" rows={2} placeholder="Observaciones del registro" /></div>
                <div className="field"><label htmlFor={`invoice-guards-${row.client.code}`}>Pago a Guardias</label><select id={`invoice-guards-${row.client.code}`} name="guardPayment" defaultValue="PENDIENTE"><option value="PENDIENTE">Pendiente</option><option value="CANCELADO">Cancelado</option></select></div>
                <div className="field"><label htmlFor={`invoice-support-${row.client.code}`}>Soporte</label><input id={`invoice-support-${row.client.code}`} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={event => { const file = event.target.files?.[0] ?? null; if (file) rememberUploadedFile(file); setSupportFile(file); setFeedback('') }} />{supportFile && <span className="selected-file">{supportFile.name}</span>}</div>
                {feedback && <div className={`client-document-feedback ${feedback.includes('correctamente') ? 'success' : 'error'}`} role="status">{feedback}</div>}
                <div className="account-invoice-form-actions"><button type="button" className="button secondary" onClick={cancelInvoice}>Cancelar</button><button type="submit" className="button primary"><Check size={17} /> Guardar factura</button></div>
              </form>}
              <div className="table-scroll" role="region" aria-label={`Facturas de ${row.client.businessName}`} tabIndex={0}><table className="client-invoice-detail-table"><thead><tr><th className="row-action-cell" aria-label="Editar factura" /><th>Factura</th><th>Detalle</th><th>Fecha</th><th className="numeric">Valor</th><th>Estado</th><th>Fecha Cancelación</th><th>Observación</th><th>Pago a Guardias</th><th>Soporte</th></tr></thead><tbody>{row.invoices.map(invoice => <tr key={invoice.id}><td className="row-action-cell"><button type="button" className="icon-button small edit-icon" onClick={() => { setEditingInvoice({ clientCode: row.client.code, clientName: row.client.businessName, record: { ...invoice } }); setEditingInvoiceFile(null); setEditingSupportFile(null); setEditingInvoiceError('') }} aria-label={`Editar factura ${invoice.invoiceFileName}`} title="Editar factura"><Pencil size={17} /></button></td><td><div className="account-document-cell"><span>{invoice.invoiceFileName}</span><UploadedFileDownloadButton fileName={invoice.invoiceFileName} /></div></td><td>{invoice.detail}</td><td>{invoice.date}</td><td className="numeric money">{money(invoice.value)}</td><td><Badge tone={invoice.status === 'CANCELADO' ? 'success' : 'warning'}>{invoice.status === 'CANCELADO' ? 'Cancelado' : 'Pendiente'}</Badge></td><td>{invoice.cancellationDate || '—'}</td><td>{invoice.observation || 'Sin observación'}</td><td><Badge tone={invoice.guardPayment === 'CANCELADO' ? 'success' : 'warning'}>{invoice.guardPayment === 'CANCELADO' ? 'Cancelado' : 'Pendiente'}</Badge></td><td>{invoice.supportFileName ? <div className="account-document-cell"><span>{invoice.supportFileName}</span><UploadedFileDownloadButton fileName={invoice.supportFileName} /></div> : <span className="cell-meta">Sin soporte</span>}</td></tr>)}{!row.invoices.length && <tr><td colSpan={10}><div className="empty-state compact"><FileText /><strong>Sin facturas registradas</strong><p>Crea el primer registro para este cliente.</p></div></td></tr>}</tbody></table></div>
            </div></td></tr> : null,
          ]
        })}
      </tbody><tfoot><tr className="total-row"><td colSpan={5}>Total conjunto</td><td className="numeric money">{money(rows.reduce((sum, row) => sum + row.total, 0n))}</td><td className="numeric money">{money(rows.reduce((sum, row) => sum + row.balance, 0n))}</td><td /></tr></tfoot></table></div>
      <div className="table-footer"><span>{rows.length} clientes</span><span>Valores expresados en USD</span></div>
    </section>
    {editingInvoice && <Dialog title="Editar Factura" description={`${editingInvoice.clientName} · ${editingInvoice.record.invoiceFileName}`} onClose={() => { setEditingInvoice(null); setEditingInvoiceFile(null); setEditingSupportFile(null); setEditingInvoiceError('') }} className="dialog-wide"><form onSubmit={saveInvoiceStatus} noValidate>
      {editingInvoiceError && <div className="form-error" role="alert"><strong>No se pueden guardar los cambios.</strong><span>{editingInvoiceError}</span></div>}
      <div className="form-grid">
        <div className="field"><label htmlFor="edit-invoice-file">Factura</label><div className="account-document-cell"><span>{editingInvoiceFile?.name ?? editingInvoice.record.invoiceFileName}</span><UploadedFileDownloadButton fileName={editingInvoiceFile?.name ?? editingInvoice.record.invoiceFileName} /></div><input id="edit-invoice-file" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={event => { const file = event.target.files?.[0] ?? null; if (file) rememberUploadedFile(file); setEditingInvoiceFile(file); setEditingInvoiceError('') }} /><small className="field-help">Selecciona un archivo solamente si deseas reemplazar el documento actual.</small></div>
        <div className="field"><label htmlFor="edit-invoice-detail">Detalle <span>Obligatorio</span></label><input id="edit-invoice-detail" value={editingInvoice.record.detail} maxLength={60} onChange={event => { const detail = event.target.value.slice(0, 60); setEditingInvoice(current => current ? { ...current, record: { ...current.record, detail } } : current); setEditingInvoiceError('') }} /><small className="field-help">Máximo 60 caracteres.</small></div>
        <div className="field"><label htmlFor="edit-invoice-date">Fecha <span>Obligatorio</span></label><input id="edit-invoice-date" value={editingInvoice.record.date} maxLength={10} inputMode="numeric" placeholder="DD/MM/AAAA" onChange={event => { const date = formatDisplayDateDraft(event.target.value); setEditingInvoice(current => current ? { ...current, record: { ...current.record, date } } : current); setEditingInvoiceError('') }} /></div>
        <div className="field"><label htmlFor="edit-invoice-value">Valor <span>Obligatorio</span></label><input id="edit-invoice-value" value={editingInvoice.record.value} type="number" min="0.01" step="0.01" onChange={event => { const value = event.target.value; setEditingInvoice(current => current ? { ...current, record: { ...current.record, value } } : current); setEditingInvoiceError('') }} /></div>
        <div className="field"><label htmlFor="edit-invoice-status">Estado <span>Obligatorio</span></label><select id="edit-invoice-status" value={editingInvoice.record.status} onChange={event => { const status = event.target.value as ClientInvoiceRecord['status']; setEditingInvoice(current => current ? { ...current, record: { ...current.record, status, cancellationDate: status === 'CANCELADO' ? current.record.cancellationDate || currentEcuadorDate() : '' } } : current); setEditingInvoiceError('') }} autoFocus><option value="PENDIENTE">Pendiente</option><option value="CANCELADO">Cancelado</option></select></div>
        <div className="field"><label htmlFor="edit-invoice-cancellation-date">Fecha Cancelación {editingInvoice.record.status === 'CANCELADO' && <span>Obligatorio</span>}</label><input id="edit-invoice-cancellation-date" value={editingInvoice.record.cancellationDate} disabled={editingInvoice.record.status !== 'CANCELADO'} maxLength={10} inputMode="numeric" placeholder="DD/MM/AAAA" onChange={event => { const cancellationDate = formatDisplayDateDraft(event.target.value); setEditingInvoice(current => current ? { ...current, record: { ...current.record, cancellationDate } } : current); setEditingInvoiceError('') }} /></div>
        <div className="field full-width-field"><label htmlFor="edit-invoice-observation">Observación</label><textarea id="edit-invoice-observation" value={editingInvoice.record.observation} rows={3} onChange={event => { const observation = event.target.value; setEditingInvoice(current => current ? { ...current, record: { ...current.record, observation } } : current) }} /></div>
        <div className="field full-width-field"><label htmlFor="edit-invoice-guard-payment">Pago a Guardias <span>Obligatorio</span></label><select id="edit-invoice-guard-payment" value={editingInvoice.record.guardPayment} onChange={event => setEditingInvoice(current => current ? { ...current, record: { ...current.record, guardPayment: event.target.value as ClientInvoiceRecord['guardPayment'] } } : current)}><option value="PENDIENTE">Pendiente</option><option value="CANCELADO">Cancelado</option></select></div>
        <div className="field full-width-field"><label htmlFor="edit-invoice-support">Soporte</label>{editingInvoice.record.supportFileName || editingSupportFile ? <div className="account-document-cell"><span>{editingSupportFile?.name ?? editingInvoice.record.supportFileName}</span><UploadedFileDownloadButton fileName={editingSupportFile?.name ?? editingInvoice.record.supportFileName} /></div> : <small className="field-help">Sin soporte registrado.</small>}<input id="edit-invoice-support" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={event => { const file = event.target.files?.[0] ?? null; if (file) rememberUploadedFile(file); setEditingSupportFile(file); setEditingInvoiceError('') }} /><small className="field-help">Puedes cargar un soporte nuevo o reemplazar el documento actual.</small></div>
      </div>
      <div className="dialog-actions"><button type="button" className="button secondary" onClick={() => { setEditingInvoice(null); setEditingInvoiceFile(null); setEditingSupportFile(null); setEditingInvoiceError('') }}>Cancelar</button><button type="submit" className="button primary"><Check size={17} /> Guardar cambios</button></div>
    </form></Dialog>}
  </>
}

function UsersConfigurationPage({ users, roles, onSave, onCreate }: { users: PlatformUser[]; roles: PlatformRole[]; onSave: (user: PlatformUser) => void; onCreate: (user: PlatformUser) => void }) {
  const [editing, setEditing] = useState<PlatformUser | null>(null)
  const [creating, setCreating] = useState(false)
  const userSort = useSortableRows(users, { username: row => row.username, name: row => row.name, role: row => row.role, email: row => row.email, status: row => row.status })
  const activeRoleNames = roles.filter(role => role.status === 'ACTIVO').map(role => role.name)
  return <>
    <PageHeader eyebrow="Configuración General / Usuarios" title="Usuarios" description="Administra las cuentas habilitadas para acceder a la plataforma." action={<button type="button" className="button primary" onClick={() => setCreating(true)}><Plus size={18} /> Nuevo Usuario</button>} />
    <section className="panel table-panel users-configuration-panel">
      <div className="table-scroll" role="region" aria-label="Usuarios con acceso a la plataforma" tabIndex={0}><table className="users-configuration-table"><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Usuario" sortKey="username" sort={userSort.sort} onSort={userSort.toggleSort} /><SortableTh label="Nombre" sortKey="name" sort={userSort.sort} onSort={userSort.toggleSort} /><SortableTh label="Rol" sortKey="role" sort={userSort.sort} onSort={userSort.toggleSort} /><SortableTh label="Correo" sortKey="email" sort={userSort.sort} onSort={userSort.toggleSort} /><SortableTh label="Estado" sortKey="status" sort={userSort.sort} onSort={userSort.toggleSort} /></tr></thead><tbody>
        {userSort.sortedRows.map(user => <tr key={user.id}><td className="row-action-cell"><button type="button" className="icon-button small edit-icon" onClick={() => setEditing(user)} aria-label={`Editar usuario ${user.username}`} title="Editar usuario"><Pencil size={17} /></button></td><td><strong>{user.username}</strong></td><td>{user.name}</td><td>{user.role}</td><td><a href={`mailto:${user.email}`}>{user.email}</a></td><td><Badge tone={user.status === 'ACTIVO' ? 'success' : 'neutral'}>{user.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</Badge></td></tr>)}
        {!users.length && <tr><td colSpan={6}><div className="empty-state"><Users /><strong>Sin usuarios</strong><p>No existen cuentas registradas para acceder a la plataforma.</p></div></td></tr>}
      </tbody></table></div>
      <div className="table-footer"><span>{users.length} usuarios registrados</span><span>{users.filter(user => user.status === 'ACTIVO').length} activos</span></div>
    </section>
    {editing && <UserConfigurationDialog user={editing} users={users} roleOptions={activeRoleNames} onClose={() => setEditing(null)} onSave={(user) => { onSave(user); setEditing(null) }} />}
    {creating && <CreateUserDialog users={users} roleOptions={activeRoleNames} onClose={() => setCreating(false)} onCreate={(user) => { onCreate(user); setCreating(false) }} />}
  </>
}

function UserConfigurationDialog({ user, users, roleOptions, onClose, onSave }: { user: PlatformUser; users: PlatformUser[]; roleOptions: string[]; onClose: () => void; onSave: (user: PlatformUser) => void }) {
  const [username, setUsername] = useState(user.username)
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState(user.role)
  const [email, setEmail] = useState(user.email)
  const [status, setStatus] = useState<PlatformUser['status']>(user.status)
  const [error, setError] = useState('')
  const roles = [...new Set([...roleOptions, user.role])]
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedUsername = username.trim().toLocaleLowerCase('es')
    if (!normalizedUsername || !name.trim() || !role || !email.trim()) { setError('Completa todos los campos del usuario.'); return }
    if (!/^[a-z0-9._-]{3,40}$/.test(normalizedUsername)) { setError('El usuario debe tener entre 3 y 40 caracteres y utilizar letras, números, punto, guion o guion bajo.'); return }
    if (users.some(item => item.id !== user.id && item.username.toLocaleLowerCase('es') === normalizedUsername)) { setError('El nombre de usuario ya está registrado.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Ingresa un correo electrónico válido.'); return }
    onSave({ ...user, username: normalizedUsername, name: name.trim(), role, email: email.trim().toLocaleLowerCase('es'), status })
  }
  return <Dialog title="Editar Usuario" description={user.username} onClose={onClose}><form onSubmit={submit} noValidate>
    {error && <div className="form-error" role="alert"><strong>No se pueden guardar los cambios.</strong><span>{error}</span></div>}
    <div className="form-grid">
      <div className="field"><label htmlFor="platform-user-username">Usuario <span>Obligatorio</span></label><input id="platform-user-username" value={username} onChange={event => { setUsername(event.target.value.slice(0, 40)); setError('') }} maxLength={40} autoComplete="off" /></div>
      <div className="field"><label htmlFor="platform-user-status">Estado <span>Obligatorio</span></label><select id="platform-user-status" value={status} onChange={event => setStatus(event.target.value as PlatformUser['status'])}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></div>
      <div className="field full-width-field"><label htmlFor="platform-user-name">Nombre <span>Obligatorio</span></label><input id="platform-user-name" value={name} onChange={event => { setName(event.target.value.slice(0, 100)); setError('') }} maxLength={100} /></div>
      <div className="field"><label htmlFor="platform-user-role">Rol <span>Obligatorio</span></label><select id="platform-user-role" value={role} onChange={event => setRole(event.target.value)}>{roles.map(option => <option key={option} value={option}>{option}</option>)}</select></div>
      <div className="field"><label htmlFor="platform-user-email">Correo <span>Obligatorio</span></label><input id="platform-user-email" type="email" value={email} onChange={event => { setEmail(event.target.value.slice(0, 120)); setError('') }} maxLength={120} /></div>
    </div>
    <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary"><Check size={17} /> Guardar cambios</button></div>
  </form></Dialog>
}

function CreateUserDialog({ users, roleOptions, onClose, onCreate }: { users: PlatformUser[]; roleOptions: string[]; onClose: () => void; onCreate: (user: PlatformUser) => void }) {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState(roleOptions[0] ?? '')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<PlatformUser['status']>('ACTIVO')
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedUsername = username.trim().toLocaleLowerCase('es')
    if (!normalizedUsername || !name.trim() || !role || !email.trim()) { setError('Completa todos los campos del usuario.'); return }
    if (!/^[a-z0-9._-]{3,40}$/.test(normalizedUsername)) { setError('El usuario debe tener entre 3 y 40 caracteres y utilizar letras, números, punto, guion o guion bajo.'); return }
    if (users.some(item => item.username.toLocaleLowerCase('es') === normalizedUsername)) { setError('El nombre de usuario ya está registrado.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Ingresa un correo electrónico válido.'); return }
    onCreate({ id: `USR-${Date.now()}`, username: normalizedUsername, name: name.trim(), role, email: email.trim().toLocaleLowerCase('es'), status })
  }
  return <Dialog title="Nuevo Usuario" description="Crea una cuenta habilitada para acceder a la plataforma." onClose={onClose}><form onSubmit={submit} noValidate>
    {error && <div className="form-error" role="alert"><strong>No se puede crear el usuario.</strong><span>{error}</span></div>}
    <div className="form-grid">
      <div className="field"><label htmlFor="new-platform-user-username">Usuario <span>Obligatorio</span></label><input id="new-platform-user-username" value={username} onChange={event => { setUsername(event.target.value.slice(0, 40)); setError('') }} maxLength={40} autoComplete="off" autoFocus /></div>
      <div className="field"><label htmlFor="new-platform-user-status">Estado <span>Obligatorio</span></label><select id="new-platform-user-status" value={status} onChange={event => setStatus(event.target.value as PlatformUser['status'])}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></div>
      <div className="field full-width-field"><label htmlFor="new-platform-user-name">Nombre <span>Obligatorio</span></label><input id="new-platform-user-name" value={name} onChange={event => { setName(event.target.value.slice(0, 100)); setError('') }} maxLength={100} /></div>
      <div className="field"><label htmlFor="new-platform-user-role">Rol <span>Obligatorio</span></label><select id="new-platform-user-role" value={role} onChange={event => { setRole(event.target.value); setError('') }} disabled={!roleOptions.length}><option value="">Seleccionar</option>{roleOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></div>
      <div className="field"><label htmlFor="new-platform-user-email">Correo <span>Obligatorio</span></label><input id="new-platform-user-email" type="email" value={email} onChange={event => { setEmail(event.target.value.slice(0, 120)); setError('') }} maxLength={120} /></div>
    </div>
    <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary" disabled={!roleOptions.length}><Check size={17} /> Guardar Usuario</button></div>
  </form></Dialog>
}

function RolesConfigurationPage({ roles, users, onCreate }: { roles: PlatformRole[]; users: PlatformUser[]; onCreate: (role: PlatformRole) => void }) {
  const [creating, setCreating] = useState(false)
  const roleSort = useSortableRows(roles, { name: row => row.name, description: row => row.description, users: row => users.filter(user => user.role === row.name).length, status: row => row.status })
  return <>
    <PageHeader eyebrow="Configuración General / Roles" title="Roles" description="Consulta los grupos utilizados para diferenciar los perfiles de acceso." action={<button type="button" className="button primary" onClick={() => setCreating(true)}><Plus size={18} /> Crear Nuevo Rol</button>} />
    <section className="panel table-panel roles-configuration-panel">
      <div className="table-scroll" role="region" aria-label="Grupos de perfiles de usuario" tabIndex={0}><table className="roles-configuration-table"><thead><tr><SortableTh label="Grupo" sortKey="name" sort={roleSort.sort} onSort={roleSort.toggleSort} /><SortableTh label="Descripción" sortKey="description" sort={roleSort.sort} onSort={roleSort.toggleSort} /><SortableTh label="Usuarios" sortKey="users" sort={roleSort.sort} onSort={roleSort.toggleSort} /><SortableTh label="Estado" sortKey="status" sort={roleSort.sort} onSort={roleSort.toggleSort} /></tr></thead><tbody>
        {roleSort.sortedRows.map(role => { const assignedUsers = users.filter(user => user.role === role.name).length; return <tr key={role.id}><td><strong>{role.name}</strong></td><td>{role.description}</td><td className="numeric">{assignedUsers}</td><td><Badge tone={role.status === 'ACTIVO' ? 'success' : 'neutral'}>{role.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</Badge></td></tr> })}
        {!roles.length && <tr><td colSpan={4}><div className="empty-state"><ShieldCheck /><strong>Sin roles</strong><p>No existen grupos de perfiles registrados.</p></div></td></tr>}
      </tbody></table></div>
      <div className="table-footer"><span>{roles.length} grupos registrados</span><span>{roles.filter(role => role.status === 'ACTIVO').length} activos</span></div>
    </section>
    {creating && <CreateRoleDialog roles={roles} onClose={() => setCreating(false)} onCreate={(role) => { onCreate(role); setCreating(false) }} />}
  </>
}

function CreateRoleDialog({ roles, onClose, onCreate }: { roles: PlatformRole[]; onClose: () => void; onCreate: (role: PlatformRole) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<PlatformRole['status']>('ACTIVO')
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedName = name.trim()
    if (!normalizedName || !description.trim()) { setError('Completa el nombre y la descripción del rol.'); return }
    if (roles.some(role => role.name.localeCompare(normalizedName, 'es', { sensitivity: 'base' }) === 0)) { setError('Ya existe un rol con este nombre.'); return }
    onCreate({ id: `ROL-${Date.now()}`, name: normalizedName, description: description.trim(), status })
  }
  return <Dialog title="Crear Nuevo Rol" description="Registra un grupo para diferenciar los perfiles de los usuarios." onClose={onClose}><form onSubmit={submit} noValidate>
    {error && <div className="form-error" role="alert"><strong>No se puede crear el rol.</strong><span>{error}</span></div>}
    <div className="form-grid">
      <div className="field"><label htmlFor="new-role-name">Nombre <span>Obligatorio</span></label><input id="new-role-name" value={name} onChange={event => { setName(event.target.value.slice(0, 60)); setError('') }} maxLength={60} autoFocus /></div>
      <div className="field"><label htmlFor="new-role-status">Estado <span>Obligatorio</span></label><select id="new-role-status" value={status} onChange={event => setStatus(event.target.value as PlatformRole['status'])}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></div>
      <div className="field full-width-field"><label htmlFor="new-role-description">Descripción <span>Obligatorio</span></label><textarea id="new-role-description" value={description} onChange={event => { setDescription(event.target.value.slice(0, 200)); setError('') }} maxLength={200} rows={4} /></div>
    </div>
    <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary"><Check size={17} /> Guardar Rol</button></div>
  </form></Dialog>
}

function PermissionsConfigurationPage({ roles, permissionsByRole, onSave }: { roles: PlatformRole[]; permissionsByRole: RolePermissionMatrices; onSave: (permissions: RolePermissionMatrices) => void }) {
  const [selectedRoleId, setSelectedRoleId] = useState(() => roles.find(role => role.status === 'ACTIVO')?.id ?? roles[0]?.id ?? '')
  const [draftByRole, setDraftByRole] = useState<RolePermissionMatrices>(permissionsByRole)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => Object.fromEntries(permissionModuleGroups.flatMap(group => [[group.module, true], ...(group.submodules?.map(submodule => [`${group.module}/${submodule.label}`, true] as [string, boolean]) ?? [])])))
  const selectedRole = roles.find(role => role.id === selectedRoleId)
  const draft = draftByRole[selectedRoleId] ?? {}
  const screensForModule = (group: PermissionModuleGroup) => [...(group.screens ?? []), ...(group.submodules?.flatMap(submodule => submodule.screens) ?? [])]
  const togglePermission = (path: string, action: PermissionAction, checked: boolean) => {
    if (!selectedRoleId) return
    setDraftByRole(current => {
      const rolePermissions = current[selectedRoleId] ?? {}
      return { ...current, [selectedRoleId]: { ...rolePermissions, [path]: { ...rolePermissions[path], [action]: checked } } }
    })
  }
  const moduleActionIsEnabled = (screens: NavScreen[], action: PermissionAction) => screens.every(screen => Boolean(draft[screen.path]?.[action]))
  const toggleModuleAction = (screens: NavScreen[], action: PermissionAction, checked: boolean) => {
    if (!selectedRoleId) return
    setDraftByRole(current => {
      const rolePermissions = current[selectedRoleId] ?? {}
      const next = { ...rolePermissions }
      screens.forEach(screen => { next[screen.path] = { ...next[screen.path], [action]: checked } })
      return { ...current, [selectedRoleId]: next }
    })
  }
  return <>
    <PageHeader eyebrow="Configuración General / Permisos" title="Permisos" description="Configura las acciones habilitadas para cada pantalla del sistema." action={<button type="button" className="button primary" disabled={!selectedRoleId} onClick={() => onSave(draftByRole)}><Check size={18} /> Guardar permisos</button>} />
    <section className="panel permissions-role-selector"><div className="field"><label htmlFor="permissions-role">Rol</label><select id="permissions-role" value={selectedRoleId} onChange={event => setSelectedRoleId(event.target.value)}>{roles.map(role => <option value={role.id} key={role.id}>{role.name}{role.status === 'INACTIVO' ? ' · Inactivo' : ''}</option>)}</select></div>{selectedRole && <div className="permissions-role-summary"><Badge tone={selectedRole.status === 'ACTIVO' ? 'success' : 'neutral'}>{selectedRole.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</Badge><span>{selectedRole.description}</span></div>}</section>
    {!roles.length && <div className="notice warning" role="alert"><AlertTriangle size={20} /><div><strong>No existen roles configurados</strong><p>Crea un rol antes de asignar permisos.</p></div></div>}
    <section className="panel permissions-panel">
      <div className="table-scroll permissions-table-container" role="region" aria-label="Matriz de permisos por módulos" tabIndex={0}><table className="permissions-table"><thead><tr><th>Pantalla</th>{permissionActions.map(action => <th key={action.key} className="permission-checkbox-column">{action.label}</th>)}</tr></thead>
        {permissionModuleGroups.map(group => { const expanded = expandedModules[group.module]; const moduleScreens = screensForModule(group); return <tbody className="permissions-module" key={group.module}>
          <tr className="permissions-module-row"><td><div className="permissions-module-name"><span>{group.module}</span><button type="button" className="icon-button permissions-expand-button" onClick={() => setExpandedModules(current => ({ ...current, [group.module]: !current[group.module] }))} aria-expanded={expanded} aria-label={`${expanded ? 'Contraer' : 'Expandir'} ${group.module}`} title={expanded ? 'Contraer módulo' : 'Expandir módulo'}><ChevronDown size={20} className={expanded ? 'open' : ''} /></button></div></td>{permissionActions.map(action => <td key={action.key} className="permission-checkbox-cell"><input type="checkbox" checked={moduleActionIsEnabled(moduleScreens, action.key)} onChange={event => toggleModuleAction(moduleScreens, action.key, event.target.checked)} aria-label={`${action.label} en todo el módulo ${group.module}`} /></td>)}</tr>
          {expanded && group.submodules?.flatMap(submodule => { const key = `${group.module}/${submodule.label}`; const submoduleExpanded = expandedModules[key]; return [
            <tr className="permissions-submodule-row" key={key}><td><div className="permissions-submodule-name"><span>{submodule.label}</span><button type="button" className="icon-button permissions-expand-button" onClick={() => setExpandedModules(current => ({ ...current, [key]: !current[key] }))} aria-expanded={submoduleExpanded} aria-label={`${submoduleExpanded ? 'Contraer' : 'Expandir'} ${submodule.label}`} title={submoduleExpanded ? 'Contraer submódulo' : 'Expandir submódulo'}><ChevronDown size={18} className={submoduleExpanded ? 'open' : ''} /></button></div></td>{permissionActions.map(action => <td key={action.key} className="permission-checkbox-cell"><input type="checkbox" checked={moduleActionIsEnabled(submodule.screens, action.key)} onChange={event => toggleModuleAction(submodule.screens, action.key, event.target.checked)} aria-label={`${action.label} en todo el submódulo ${submodule.label}`} /></td>)}</tr>,
            ...(submoduleExpanded ? submodule.screens.map(screen => <tr className="permissions-screen-row nested" key={screen.path}><td>{screen.label}</td>{permissionActions.map(action => <td key={action.key} className="permission-checkbox-cell"><input type="checkbox" checked={Boolean(draft[screen.path]?.[action.key])} onChange={event => togglePermission(screen.path, action.key, event.target.checked)} aria-label={`${action.label} en ${screen.label}`} /></td>)}</tr>) : []),
          ] })}
          {expanded && group.screens?.map(screen => <tr className="permissions-screen-row" key={screen.path}><td>{screen.label}</td>{permissionActions.map(action => <td key={action.key} className="permission-checkbox-cell"><input type="checkbox" checked={Boolean(draft[screen.path]?.[action.key])} onChange={event => togglePermission(screen.path, action.key, event.target.checked)} aria-label={`${action.label} en ${screen.label}`} /></td>)}</tr>)}
        </tbody> })}
      </table></div>
    </section>
  </>
}

type CompanyConfigurationTab = 'company' | 'visual' | 'smtp' | 'colors'

function CompanyConfigurationPage({ settings, colors, initialTab, onSave, onSaveColors }: { settings: CompanySettings; colors: SystemColors; initialTab: CompanyConfigurationTab; onSave: (settings: CompanySettings) => void; onSaveColors: (colors: SystemColors) => void }) {
  const [activeTab, setActiveTab] = useState<CompanyConfigurationTab>(initialTab)
  const [draft, setDraft] = useState<CompanySettings>({ ...settings })
  const [error, setError] = useState('')
  const tabs: { key: CompanyConfigurationTab; label: string }[] = [
    { key: 'company', label: 'Datos de la Empresa' },
    { key: 'visual', label: 'Identidad Visual' },
    { key: 'smtp', label: 'Correo SMTP' },
    { key: 'colors', label: 'Colores del Sistema' },
  ]
  const update = (changes: Partial<CompanySettings>) => { setDraft(current => ({ ...current, ...changes })); setError('') }
  const save = () => {
    if (!draft.ruc.trim() || !draft.name.trim() || !draft.businessName.trim()) { setError('Completa el RUC, nombre y razón social de la empresa.'); setActiveTab('company'); return }
    if (draft.smtpPort && !/^\d{1,5}$/.test(draft.smtpPort)) { setError('El puerto SMTP debe contener únicamente números.'); setActiveTab('smtp'); return }
    onSave({ ...draft, ruc: draft.ruc.trim(), name: draft.name.trim(), businessName: draft.businessName.trim(), address: draft.address.trim(), phone: draft.phone.trim(), smtpServer: draft.smtpServer.trim(), senderEmail: draft.senderEmail.trim(), from: draft.from.trim() })
  }
  const uploadImage = (key: 'logo' | 'miniLogo' | 'loginBackground', file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Selecciona un archivo de imagen válido.'); return }
    if (file.size > 1_500_000) { setError('Cada imagen debe pesar máximo 1,5 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => update({ [key]: { name: file.name, dataUrl: String(reader.result) } })
    reader.onerror = () => setError('No fue posible leer la imagen seleccionada.')
    reader.readAsDataURL(file)
  }
  const visualFields: { key: 'logo' | 'miniLogo' | 'loginBackground'; label: string; hint: string }[] = [
    { key: 'logo', label: 'Logo', hint: 'Logo principal utilizado en la plataforma.' },
    { key: 'miniLogo', label: 'Mini Logo', hint: 'Versión compacta para espacios reducidos.' },
    { key: 'loginBackground', label: 'Fondo Login', hint: 'Imagen de fondo para la pantalla de acceso.' },
  ]
  return <>
    <PageHeader eyebrow="Configuración General / Compañía" title="Compañía" description="Administra los datos generales y la identidad de la empresa." action={activeTab !== 'colors' ? <button type="button" className="button primary" onClick={save}><Check size={18} /> Guardar configuración</button> : undefined} />
    <div className="company-configuration-tabs" role="tablist" aria-label="Configuración de la compañía">{tabs.map(tab => <button type="button" role="tab" aria-selected={activeTab === tab.key} className={activeTab === tab.key ? 'active' : ''} key={tab.key} onClick={() => { setActiveTab(tab.key); setError('') }}>{tab.label}</button>)}</div>
    {error && <div className="notice warning" role="alert"><AlertTriangle size={20} /><div><strong>Revisa la configuración</strong><p>{error}</p></div></div>}
    {activeTab === 'company' && <section className="panel company-configuration-panel"><div className="panel-heading"><div><h2>Datos de la Empresa</h2></div><Building2 size={22} color="var(--primary)" /></div><div className="form-grid">
      <div className="field"><label htmlFor="company-ruc">RUC <span>Obligatorio</span></label><input id="company-ruc" value={draft.ruc} onChange={event => update({ ruc: event.target.value.replace(/\D/g, '').slice(0, 13) })} inputMode="numeric" maxLength={13} /></div>
      <div className="field"><label htmlFor="company-name">Nombre <span>Obligatorio</span></label><input id="company-name" value={draft.name} onChange={event => update({ name: event.target.value.slice(0, 100) })} maxLength={100} /></div>
      <div className="field full-width-field"><label htmlFor="company-business-name">Razón Social <span>Obligatorio</span></label><input id="company-business-name" value={draft.businessName} onChange={event => update({ businessName: event.target.value.slice(0, 150) })} maxLength={150} /></div>
      <div className="field full-width-field"><label htmlFor="company-address">Dirección</label><input id="company-address" value={draft.address} onChange={event => update({ address: event.target.value.slice(0, 200) })} maxLength={200} /></div>
      <div className="field"><label htmlFor="company-phone">Teléfono</label><input id="company-phone" value={draft.phone} onChange={event => update({ phone: event.target.value.slice(0, 30) })} maxLength={30} /></div>
    </div></section>}
    {activeTab === 'visual' && <section className="panel company-configuration-panel"><div className="panel-heading"><div><h2>Identidad Visual</h2></div><Palette size={22} color="var(--primary)" /></div><div className="company-visual-grid">{visualFields.map(field => { const image = draft[field.key]; return <article className="company-image-card" key={field.key}><div className={`company-image-preview ${field.key === 'loginBackground' ? 'wide' : ''}`}>{image ? <img src={image.dataUrl} alt={`Vista previa de ${field.label}`} /> : <FileText size={30} />}</div><div><h3>{field.label}</h3><p>{field.hint}</p>{image && <span className="selected-file">{image.name}</span>}</div><div className="company-image-actions"><label className="button secondary"><Upload size={17} /> Buscar archivo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={event => uploadImage(field.key, event.target.files?.[0])} /></label>{image && <a className="button secondary" href={image.dataUrl} download={image.name}><Download size={17} /> Descargar</a>}</div></article> })}</div></section>}
    {activeTab === 'smtp' && <section className="panel company-configuration-panel"><div className="panel-heading"><div><h2>Correo SMTP</h2></div><Settings size={22} color="var(--primary)" /></div><div className="form-grid">
      <div className="field"><label htmlFor="smtp-server">SMTP Server</label><input id="smtp-server" value={draft.smtpServer} onChange={event => update({ smtpServer: event.target.value.slice(0, 150) })} maxLength={150} placeholder="smtp.ejemplo.com" /></div>
      <div className="field"><label htmlFor="smtp-port">Puerto</label><input id="smtp-port" value={draft.smtpPort} onChange={event => update({ smtpPort: event.target.value.replace(/\D/g, '').slice(0, 5) })} inputMode="numeric" maxLength={5} /></div>
      <div className="field"><label htmlFor="smtp-email">Correo Envío</label><input id="smtp-email" type="email" value={draft.senderEmail} onChange={event => update({ senderEmail: event.target.value.slice(0, 150) })} maxLength={150} /></div>
      <div className="field"><label htmlFor="smtp-password">Contraseña SMTP</label><input id="smtp-password" type="password" value={draft.smtpPassword} onChange={event => update({ smtpPassword: event.target.value.slice(0, 150) })} maxLength={150} autoComplete="new-password" /></div>
      <div className="field full-width-field"><label htmlFor="smtp-from">From</label><input id="smtp-from" value={draft.from} onChange={event => update({ from: event.target.value.slice(0, 150) })} maxLength={150} placeholder="Nombre visible del remitente" /></div>
    </div></section>}
    {activeTab === 'colors' && <SystemColorsPage colors={colors} onSave={onSaveColors} embedded />}
  </>
}

type EmailTemplateTab = keyof EmailTemplates

function sixDigitCode() {
  const value = new Uint32Array(1)
  window.crypto.getRandomValues(value)
  return String(100000 + value[0] % 900000)
}

function renderEmailTemplate(value: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce((result, [token, replacement]) => result.split(`{{${token}}}`).join(replacement), value)
}

function EmailTemplatesConfigurationPage({ templates, onSave }: { templates: EmailTemplates; onSave: (templates: EmailTemplates) => void }) {
  const [activeTab, setActiveTab] = useState<EmailTemplateTab>('passwordRecovery')
  const [draft, setDraft] = useState<EmailTemplates>({ passwordRecovery: { ...templates.passwordRecovery }, payrollReceipt: { ...templates.payrollReceipt } })
  const [recoveryCode, setRecoveryCode] = useState(sixDigitCode)
  const [error, setError] = useState('')
  const current = draft[activeTab]
  const updateCurrent = (changes: Partial<EmailTemplate>) => { setDraft(state => ({ ...state, [activeTab]: { ...state[activeTab], ...changes } })); setError('') }
  const save = () => {
    if (!draft.passwordRecovery.subject.trim() || !draft.passwordRecovery.body.trim() || !draft.payrollReceipt.subject.trim() || !draft.payrollReceipt.body.trim()) { setError('Completa el asunto y el texto de ambas plantillas.'); return }
    if (!draft.passwordRecovery.body.includes('{{CODIGO}}')) { setError('La plantilla de Recuperación de Contraseña debe incluir el marcador {{CODIGO}}.'); setActiveTab('passwordRecovery'); return }
    onSave(draft)
  }
  const previewBody = renderEmailTemplate(current.body, { NOMBRE: 'Ana Navarro', CODIGO: recoveryCode, PERIODO: 'Octubre 2026' })
  const previewSubject = renderEmailTemplate(current.subject, { NOMBRE: 'Ana Navarro', CODIGO: recoveryCode, PERIODO: 'Octubre 2026' })
  return <>
    <PageHeader eyebrow="Configuración General / Envío de Correos" title="Envío de Correos" description="Configura el contenido de los correos automáticos enviados por el sistema." action={<button type="button" className="button primary" onClick={save}><Check size={18} /> Guardar plantillas</button>} />
    <div className="company-configuration-tabs email-template-tabs" role="tablist" aria-label="Plantillas de correo"><button type="button" role="tab" aria-selected={activeTab === 'passwordRecovery'} className={activeTab === 'passwordRecovery' ? 'active' : ''} onClick={() => { setActiveTab('passwordRecovery'); setError('') }}>Recuperación de Contraseña</button><button type="button" role="tab" aria-selected={activeTab === 'payrollReceipt'} className={activeTab === 'payrollReceipt' ? 'active' : ''} onClick={() => { setActiveTab('payrollReceipt'); setError('') }}>Envío de Rol de Pago</button></div>
    {error && <div className="notice warning" role="alert"><AlertTriangle size={20} /><div><strong>Revisa las plantillas</strong><p>{error}</p></div></div>}
    <section className="email-template-layout">
      <div className="panel email-template-editor"><div className="panel-heading"><div><h2>{activeTab === 'passwordRecovery' ? 'Recuperación de Contraseña' : 'Envío de Rol de Pago'}</h2></div><FileText size={22} color="var(--primary)" /></div>
        <div className="field"><label htmlFor="email-template-subject">Asunto <span>Obligatorio</span></label><input id="email-template-subject" value={current.subject} onChange={event => updateCurrent({ subject: event.target.value.slice(0, 180) })} maxLength={180} /></div>
        <div className="field"><label htmlFor="email-template-body">Texto del correo <span>Obligatorio</span></label><textarea id="email-template-body" value={current.body} onChange={event => updateCurrent({ body: event.target.value.slice(0, 3000) })} maxLength={3000} rows={14} /></div>
        <div className="email-template-variables"><strong>Marcadores disponibles</strong><div><code>{'{{NOMBRE}}'}</code>{activeTab === 'passwordRecovery' ? <code>{'{{CODIGO}}'}</code> : <code>{'{{PERIODO}}'}</code>}</div></div>
      </div>
      <aside className="panel email-template-preview"><div className="panel-heading"><div><h2>Vista previa</h2></div>{activeTab === 'passwordRecovery' && <button type="button" className="button secondary compact" onClick={() => setRecoveryCode(sixDigitCode())}><RotateCcw size={16} /> Nuevo código</button>}</div>
        <div className="email-preview-message"><span>Asunto</span><strong>{previewSubject || 'Sin asunto'}</strong><div className="email-preview-divider" /><p>{previewBody || 'Sin contenido'}</p></div>
        {activeTab === 'passwordRecovery' && <div className="recovery-code-preview"><span>Código generado para esta vista previa</span><strong>{recoveryCode}</strong><small>Siempre contiene seis dígitos.</small></div>}
      </aside>
    </section>
  </>
}

function GeneralConfigurationPlaceholderPage({ title }: { title: string }) {
  return <><PageHeader eyebrow={`Configuración General / ${title}`} title={title} description={`Configuración de ${title.toLocaleLowerCase('es')}.`} /><section className="panel general-configuration-placeholder"><Settings size={30} /><h2>{title}</h2><Badge tone="neutral">Pantalla creada</Badge></section></>
}

function DocumentTypesPage({ records, onSave }: { records: DocumentTypeConfiguration[]; onSave: (record: DocumentTypeConfiguration) => void }) {
  const [rows, setRows] = useState<DocumentTypeConfiguration[]>(records)
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const updateRow = (id: string, changes: Partial<DocumentTypeConfiguration>) => setRows(current => current.map(row => row.id === id ? { ...row, ...changes } : row))
  const updateAndSaveRow = (row: DocumentTypeConfiguration, changes: Partial<DocumentTypeConfiguration>) => {
    const updated = { ...row, ...changes }
    setRows(current => current.map(item => item.id === row.id ? updated : item))
    if (!updated.name.trim()) {
      setFeedback(current => ({ ...current, [row.id]: 'Ingresa el nombre para guardar.' }))
      return
    }
    const normalized = { ...updated, name: updated.name.trim() }
    onSave(normalized)
    setFeedback(current => ({ ...current, [row.id]: 'Cambios guardados automáticamente.' }))
  }
  const addRow = () => {
    const id = `TDO-${Date.now()}`
    setRows(current => [...current, { id, name: '', status: 'ACTIVO', clients: false, employees: false }])
    setFeedback(current => ({ ...current, [id]: 'Completa el nombre y selecciona dónde estará habilitado.' }))
  }
  const saveRow = (row: DocumentTypeConfiguration) => {
    if (!row.name.trim()) {
      setFeedback(current => ({ ...current, [row.id]: 'Ingresa el nombre del tipo de documento.' }))
      return
    }
    const normalized = { ...row, name: row.name.trim() }
    setRows(current => current.map(item => item.id === row.id ? normalized : item))
    onSave(normalized)
    setFeedback(current => ({ ...current, [row.id]: 'Línea grabada.' }))
  }
  return <>
    <PageHeader eyebrow="Configuración General / Tipo Documento" title="Tipo Documento" description="Define los tipos de identificación y las pantallas donde estarán disponibles." action={<button type="button" className="button primary" onClick={addRow}><Plus size={18} /> Nuevo Tipo de Documento</button>} />
    <section className="panel table-panel document-types-panel">
      <div className="panel-heading table-title"><div><h2>Tipos de documento</h2><p>Activa cada registro y marca si puede utilizarse en Clientes, Empleados o en ambos.</p></div><FileText size={22} color="var(--primary)" /></div>
      <div className="table-scroll" role="region" aria-label="Tipos de documento" tabIndex={0}>
        <table className="document-types-table"><caption className="sr-only">Configuración de tipos de documento</caption><thead><tr><th>Nombre</th><th>Estado</th><th>Clientes</th><th>Empleados</th><th className="row-action-cell">Acciones</th></tr></thead><tbody>
          {rows.map((row, index) => <tr key={row.id}>
            <td><input value={row.name} maxLength={40} placeholder="Nombre del documento" aria-label={`Nombre del tipo de documento ${index + 1}`} onChange={event => updateRow(row.id, { name: event.target.value })} onBlur={() => saveRow(row)} /></td>
            <td><button type="button" role="switch" aria-checked={row.status === 'ACTIVO'} className={`document-status-switch ${row.status === 'ACTIVO' ? 'active' : ''}`} onClick={() => updateAndSaveRow(row, { status: row.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' })}><span aria-hidden="true" /><strong>{row.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</strong></button></td>
            <td className="document-availability-cell"><label><input type="checkbox" checked={row.clients} onChange={event => updateAndSaveRow(row, { clients: event.target.checked })} /><span>Habilitado</span></label></td>
            <td className="document-availability-cell"><label><input type="checkbox" checked={row.employees} onChange={event => updateAndSaveRow(row, { employees: event.target.checked })} /><span>Habilitado</span></label></td>
            <td className="row-action-cell"><button type="button" className="icon-button small save-line-button" aria-label={`Grabar tipo de documento ${row.name || index + 1}`} title="Guardar ahora" onClick={() => saveRow(row)}><Check size={17} /></button>{feedback[row.id] && <small className={`inline-row-feedback ${feedback[row.id].toLocaleLowerCase('es').includes('guardad') || feedback[row.id] === 'Línea grabada.' ? 'success' : 'error'}`}>{feedback[row.id]}</small>}</td>
          </tr>)}
        </tbody></table>
      </div>
      <div className="table-footer"><span>{rows.length} tipos visibles</span><span>Guardado automático al cambiar estado o disponibilidad</span></div>
    </section>
  </>
}

function SystemColorsPage({ colors, onSave, embedded = false }: { colors: SystemColors; onSave: (colors: SystemColors) => void; embedded?: boolean }) {
  const [draft, setDraft] = useState<SystemColors>({ ...colors })
  const [feedback, setFeedback] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const validHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value)
  const invalidCount = Object.values(draft).filter(value => !validHex(value)).length
  const changedCount = (Object.keys(draft) as SystemColorKey[]).filter(key => draft[key].toLowerCase() !== colors[key].toLowerCase()).length

  useEffect(() => {
    Object.entries(draft).forEach(([key, value]) => { if (validHex(value)) document.documentElement.style.setProperty(`--${key}`, value) })
    return () => { Object.entries(colors).forEach(([key, value]) => document.documentElement.style.setProperty(`--${key}`, value)) }
  }, [draft, colors])

  const updateColor = (key: SystemColorKey, value: string) => {
    setDraft(current => ({ ...current, [key]: value.toLowerCase() }))
    setFeedback('')
  }
  const save = () => {
    if (invalidCount) { setFeedback('Corrige los valores hexadecimales antes de guardar.'); return }
    onSave({ ...draft })
    setFeedback('Configuración guardada. Los colores se conservarán al volver a ingresar.')
  }
  const restore = () => {
    setDraft({ ...defaultSystemColors })
    setFeedback('Se cargaron los colores originales en la vista previa. Presiona Guardar colores para conservarlos.')
  }

  return <>
    {!embedded && <PageHeader eyebrow="Configuración General / Colores del Sistema" title="Colores del Sistema" description="Personaliza los colores base utilizados en todas las pantallas del sistema." action={<button type="button" className="button primary" onClick={save} disabled={Boolean(invalidCount)}><Check size={18} /> Guardar colores</button>} />}
    {embedded && <div className="company-colors-toolbar"><div><h2>Colores del Sistema</h2></div><button type="button" className="button primary" onClick={save} disabled={Boolean(invalidCount)}><Check size={18} /> Guardar colores</button></div>}
    {feedback && <div className={`notice ${invalidCount ? 'warning' : 'info'}`} role="status">{invalidCount ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}<div><strong>{invalidCount ? 'Valores por corregir' : 'Colores del sistema'}</strong><p>{feedback}</p></div></div>}
    <section className="system-colors-layout">
      <div className="system-color-groups">
        {systemColorGroups.map(group => { const expanded = Boolean(expandedGroups[group.title]); return <section className={`panel system-color-section ${expanded ? 'expanded' : 'collapsed'}`} key={group.title}>
          <div className="panel-heading system-color-group-heading"><div><h2>{group.title}</h2><p>{group.description}</p></div><div className="system-color-group-actions"><Badge tone="neutral">{group.colors.length} colores</Badge><button type="button" className="icon-button system-color-expand-button" onClick={() => setExpandedGroups(current => ({ ...current, [group.title]: !current[group.title] }))} aria-expanded={expanded} aria-label={`${expanded ? 'Contraer' : 'Expandir'} ${group.title}`} title={expanded ? 'Contraer grupo' : 'Expandir grupo'}><ChevronDown size={20} className={expanded ? 'open' : ''} /></button></div></div>
          {expanded && <div className="system-color-list">{group.colors.map(color => { const invalid = !validHex(draft[color.key]); return <div className={`system-color-row ${invalid ? 'invalid' : ''}`} key={color.key}>
            <label className="system-color-picker" title={`Seleccionar ${color.label}`}><span className="sr-only">Seleccionar {color.label}</span><input type="color" value={validHex(draft[color.key]) ? draft[color.key] : colors[color.key]} onChange={event => updateColor(color.key, event.target.value)} /><span className="color-swatch" style={{ background: validHex(draft[color.key]) ? draft[color.key] : 'transparent' }} /></label>
            <div className="system-color-identity"><strong>{color.label}</strong><span>{color.usage}</span><code>--{color.key}</code></div>
            <label className="system-color-hex"><span className="sr-only">Valor hexadecimal de {color.label}</span><input value={draft[color.key]} maxLength={7} onChange={event => updateColor(color.key, event.target.value)} aria-invalid={invalid} spellCheck={false} />{invalid && <small>Usa el formato #RRGGBB</small>}</label>
          </div>})}</div>}
        </section> })}
      </div>
      <aside className="panel system-theme-preview">
        <div className="panel-heading"><div><h2>Vista previa</h2><p>Los cambios se muestran inmediatamente.</p></div></div>
        <div className="theme-preview-shell"><div className="theme-preview-sidebar"><ShieldCheck size={21} /><span>Nómina EC</span><div className="theme-preview-nav active">Opción activa</div><div className="theme-preview-nav">Otra opción</div></div><div className="theme-preview-content"><span className="theme-preview-kicker">CONFIGURACIÓN</span><h3>Ejemplo de pantalla</h3><p>Texto secundario para comprobar contraste y legibilidad.</p><div className="theme-preview-card"><strong>Panel del sistema</strong><span>Contenido sobre una superficie configurable.</span><button type="button" className="button primary">Acción principal</button></div><div className="theme-preview-badges"><Badge tone="success">Correcto</Badge><Badge tone="warning">Advertencia</Badge><Badge tone="simulation">Simulación</Badge></div></div></div>
        <div className="system-theme-actions"><button type="button" className="button secondary" onClick={restore}><RotateCcw size={17} /> Restaurar originales</button><p>La restauración también debe guardarse para quedar permanente.</p></div>
      </aside>
    </section>
  </>
}

function Dashboard({ employees, events, userName, go }: { employees: Employee[]; events: PayrollEvent[]; userName: string; go: (path: string) => void }) {
  const draftCount = events.filter(event => event.status === 'BORRADOR').length
  return <>
    <PageHeader eyebrow="Dashboard" title={`Buenos días, ${userName.split(/\s+/)[0]}`} description="Estos son los pendientes de Empresa Demostración para octubre de 2026." />
    <section aria-labelledby="resumen-title"><div className="section-heading"><div><h2 id="resumen-title">Resumen del período</h2><p>Información operativa de la sesión actual</p></div><span className="updated"><Clock3 size={15} /> Actualizado ahora</span></div>
      <div className="kpi-grid">
        <Kpi icon={<Users />} label="Empleados activos" value={String(employees.filter(e => e.status === 'ACTIVO').length)} detail="Plantilla propia" />
        <Kpi icon={<FileText />} label="Novedades del período" value={String(events.length)} detail={`${draftCount} pendiente${draftCount === 1 ? '' : 's'} de aprobación`} tone={draftCount ? 'warning' : 'default'} />
        <Kpi icon={<Calculator />} label="Corrida mensual" value="Pendiente" detail="Lista para simular" tone="info" />
        <Kpi icon={<ShieldCheck />} label="Bloqueos productivos" value="5" detail="Homologación requerida" tone="danger" />
      </div>
    </section>
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Por hacer</h2><p>Acciones para continuar el ciclo</p></div></div>
        <div className="task-list">
          <Task icon={<FileText />} title="Revisar novedades en borrador" meta={`${draftCount} registro pendiente`} action="Revisar" onClick={() => go('/novedades')} />
          <Task icon={<Calculator />} title="Ejecutar simulación mensual" meta="Octubre 2026 · 4 empleados" action="Abrir" onClick={() => go('/liquidacion')} />
          <Task icon={<Users />} title="Verificar datos maestros" meta="Última revisión: hoy" action="Ver" onClick={() => go('/empleado/informacion')} />
        </div>
      </section>
      <section className="panel cycle-panel"><div className="panel-heading"><div><h2>Ciclo de octubre</h2><p>Avance de la validación</p></div><Badge tone="warning">En preparación</Badge></div>
        <div className="cycle-steps"><CycleStep complete label="Empleados" caption="4 activos" /><CycleStep complete label="Novedades" caption="3 registradas" /><CycleStep current label="Cálculo" caption="Pendiente" /><CycleStep label="Aprobación" caption="Bloqueada" /></div>
        <button className="button secondary full" onClick={() => go('/liquidacion')}>Continuar con la simulación</button>
      </section>
    </div>
  </>
}

function Kpi({ icon, label, value, detail, tone = 'default' }: { icon: ReactNode; label: string; value: string; detail: string; tone?: string }) {
  return <article className={`kpi-card ${tone}`}><div className="kpi-icon">{icon}</div><div><p>{label}</p><strong>{value}</strong><span>{detail}</span></div></article>
}

function Task({ icon, title, meta, action, onClick }: { icon: ReactNode; title: string; meta: string; action: string; onClick: () => void }) {
  return <div className="task"><span className="task-icon">{icon}</span><div><strong>{title}</strong><p>{meta}</p></div><button className="text-button" onClick={onClick}>{action}<ChevronRight size={16} /></button></div>
}

function CycleStep({ complete, current, label, caption }: { complete?: boolean; current?: boolean; label: string; caption: string }) {
  return <div className={`cycle-step ${complete ? 'complete' : ''} ${current ? 'current' : ''}`}><span>{complete ? <Check size={15} /> : ''}</span><div><strong>{label}</strong><p>{caption}</p></div></div>
}

const protectedDeletionMessage = 'Este registro no puede ser eliminado por encontrarse siendo utilizado en otro proceso.'

function DeletionBlockedNotice({ visible }: { visible: boolean }) {
  return visible ? <div className="notice warning" role="alert"><AlertTriangle size={20} /><div><strong>Registro en uso</strong><p>{protectedDeletionMessage}</p></div></div> : null
}

function GeneralPage({ catalogKey, catalogs, go, onAdd, onUpdate, onDelete }: { catalogKey: CatalogKey; catalogs: Catalogs; go: (path: string) => void; onAdd: () => void; onUpdate: (record: CatalogRecord) => void; onDelete: (record: CatalogRecord) => boolean }) {
  const [query, setQuery] = useState('')
  const [editingRecord, setEditingRecord] = useState<CatalogRecord | null>(null)
  const [deletionBlocked, setDeletionBlocked] = useState(false)
  useEffect(() => setDeletionBlocked(false), [catalogKey])
  const config = catalogConfig[catalogKey]
  const records = catalogs[catalogKey]
  const showCode = catalogKey === 'rubros'
  const showDescription = catalogKey !== 'tipos-nomina' && catalogKey !== 'grupos-nomina' && catalogKey !== 'motivos-salida'
  const filtered = records.filter(record => `${showCode ? record.code : ''} ${record.name} ${record.description}`.toLowerCase().includes(query.toLowerCase()))
  const { sortedRows, sort, toggleSort } = useSortableRows(filtered, { code: row => row.code, name: row => row.name, description: row => row.description, status: row => row.status })
  return <>
    <PageHeader eyebrow={`Configuraciones / ${config.title}`} title={config.title} description={config.description} action={<button className="button primary" onClick={onAdd}><Plus size={18} /> {catalogKey === 'tipos-ausencia' ? 'Agregar' : `Nuevo ${config.singular}`}</button>} />
    <DeletionBlockedNotice visible={deletionBlocked} />
    <section className="panel table-panel">
      <div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar en {config.title}</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Buscar en ${config.title.toLowerCase()}`} /></label><button className="button secondary"><Settings size={17} /> Filtros</button></div>
      <div className="table-scroll" role="region" aria-label={`Catálogo de ${config.title}`} tabIndex={0}><table><caption className="sr-only">{config.title}</caption><thead><tr><th className="row-action-cell" aria-label="Editar" />{showCode && <SortableTh label="Código" sortKey="code" sort={sort} onSort={toggleSort} />}<SortableTh label="Nombre" sortKey="name" sort={sort} onSort={toggleSort} />{showDescription && <SortableTh label="Descripción" sortKey="description" sort={sort} onSort={toggleSort} />}<SortableTh label="Estado" sortKey="status" sort={sort} onSort={toggleSort} /></tr></thead><tbody>
        {sortedRows.map(record => <tr key={record.id}><td className="row-action-cell"><div className="row-action-buttons"><button className="icon-button small edit-icon" onClick={() => { setDeletionBlocked(false); setEditingRecord(record) }} aria-label={`Modificar ${record.name}`} title={`Modificar ${record.name}`}><Pencil size={17} /></button><button className="icon-button small delete-icon" onClick={() => { const deleted = onDelete(record); setDeletionBlocked(!deleted) }} aria-label={`Eliminar ${record.name}`} title={`Eliminar ${record.name}`}><Trash2 size={17} /></button></div></td>{showCode && <td><strong>{record.code}</strong><span className="cell-meta">{record.id}</span></td>}<td>{record.name}</td>{showDescription && <td>{record.description || 'Sin descripción'}</td>}<td><Badge tone={record.status === 'ACTIVO' ? 'success' : 'neutral'}>{record.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</Badge></td></tr>)}
        {!filtered.length && <tr><td colSpan={2 + Number(showCode) + Number(showDescription)}><div className="empty-state"><Search /><strong>Sin resultados</strong><p>No hay registros que coincidan con la búsqueda.</p></div></td></tr>}
      </tbody></table></div>
      <div className="table-footer"><span>1–{filtered.length} de {filtered.length}</span></div>
    </section>
    {editingRecord && <CatalogDialog catalogKey={catalogKey} record={editingRecord} onClose={() => setEditingRecord(null)} onSave={(record) => { onUpdate(record); setEditingRecord(null) }} />}
  </>
}

const rubricTypeOptions: { value: RubricType; label: string }[] = [
  { value: 'COMISION_BONO', label: 'Comisiones/Bonos' },
  { value: 'DESCUENTO', label: 'Descuentos' },
]

function rubricTypeLabel(value?: RubricType) {
  return rubricTypeOptions.find(option => option.value === value)?.label ?? 'Sin tipo'
}

function hasRubricDependencyCycle(records: CatalogRecord[], candidate: CatalogRecord) {
  const graph = new Map(records.map(record => [record.id, record.componentIds ?? []]))
  graph.set(candidate.id, candidate.componentIds ?? [])
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    const cyclic = (graph.get(id) ?? []).some(componentId => graph.has(componentId) && visit(componentId))
    visiting.delete(id)
    visited.add(id)
    return cyclic
  }
  return [...graph.keys()].some(visit)
}

function RubricsPage({ records, onSave, onDelete }: { records: CatalogRecord[]; onSave: (record: CatalogRecord) => void; onDelete: (record: CatalogRecord) => boolean }) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<CatalogRecord | null | undefined>(undefined)
  const [inspecting, setInspecting] = useState<CatalogRecord | null>(null)
  const [deletionBlocked, setDeletionBlocked] = useState(false)
  const filtered = records.filter(record => `${record.name} ${rubricTypeLabel(record.rubricType)} ${record.thirdPartyName ?? ''}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  const rubricsSort = useSortableRows(filtered, {
    name: row => row.name,
    rubricType: row => rubricTypeLabel(row.rubricType),
    contributesIess: row => row.contributesIess ? 1 : 0,
    thirdParty: row => row.thirdPartyName ?? '',
    components: row => row.componentIds?.length ?? 0,
    status: row => row.status,
  })
  return <>
    <PageHeader eyebrow="Configuraciones / Rubros" title="Rubros" description="Configura conceptos de ingresos y descuentos, incluyendo rubros compuestos sin dependencias circulares." action={<button className="button primary" onClick={() => setEditing(null)}><Plus size={18} /> Nuevo rubro</button>} />
    <DeletionBlockedNotice visible={deletionBlocked} />
    <section className="panel table-panel">
      <div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar en Rubros</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por rubro, tipo o tercero" /></label><button className="button secondary"><Settings size={17} /> Filtros</button></div>
      <div className="table-scroll" role="region" aria-label="Catálogo de Rubros" tabIndex={0}><table><caption className="sr-only">Rubros</caption><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Rubro" sortKey="name" sort={rubricsSort.sort} onSort={rubricsSort.toggleSort} /><SortableTh label="Tipo de Rubro" sortKey="rubricType" sort={rubricsSort.sort} onSort={rubricsSort.toggleSort} /><SortableTh label="Aporta IESS" sortKey="contributesIess" sort={rubricsSort.sort} onSort={rubricsSort.toggleSort} /><SortableTh label="Tercero" sortKey="thirdParty" sort={rubricsSort.sort} onSort={rubricsSort.toggleSort} /><SortableTh label="Componentes" sortKey="components" sort={rubricsSort.sort} onSort={rubricsSort.toggleSort} /><SortableTh label="Estado" sortKey="status" sort={rubricsSort.sort} onSort={rubricsSort.toggleSort} /></tr></thead><tbody>
        {rubricsSort.sortedRows.map(record => <tr key={record.id}><td className="row-action-cell"><div className="row-action-buttons"><button className="icon-button small edit-icon" onClick={() => { setDeletionBlocked(false); setEditing(record) }} aria-label={`Modificar ${record.name}`} title={`Modificar ${record.name}`}><Pencil size={17} /></button><button className="icon-button small delete-icon" onClick={() => { const deleted = onDelete(record); setDeletionBlocked(!deleted) }} aria-label={`Eliminar ${record.name}`} title={`Eliminar ${record.name}`}><Trash2 size={17} /></button></div></td><td><strong>{record.name}</strong></td><td>{rubricTypeLabel(record.rubricType)}</td><td><Badge tone={record.contributesIess ? 'success' : 'neutral'}>{record.contributesIess ? 'Sí' : 'No'}</Badge></td><td>{record.thirdPartyName || '-'}</td><td><div className="rubric-components-cell"><button className="icon-button small" onClick={() => setInspecting(record)} aria-label={`Revisar componentes de ${record.name}`} title="Revisar componentes"><Search size={17} /></button><span>{record.componentIds?.length ?? 0}</span></div></td><td><Badge tone={record.status === 'ACTIVO' ? 'success' : 'neutral'}>{record.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</Badge></td></tr>)}
        {!filtered.length && <tr><td colSpan={7}><div className="empty-state"><Search /><strong>Sin resultados</strong><p>No hay rubros que coincidan con la búsqueda.</p></div></td></tr>}
      </tbody></table></div>
      <div className="table-footer"><span>1–{filtered.length} de {filtered.length}</span></div>
    </section>
    {editing !== undefined && <RubricDialog records={records} record={editing ?? undefined} onClose={() => setEditing(undefined)} onSave={(record) => { onSave(record); setEditing(undefined) }} />}
    {inspecting && <RubricComponentsDialog record={inspecting} records={records} onClose={() => setInspecting(null)} />}
  </>
}

function RubricDialog({ records, record, onClose, onSave }: { records: CatalogRecord[]; record?: CatalogRecord; onClose: () => void; onSave: (record: CatalogRecord) => void }) {
  const [draftId] = useState(record?.id ?? `RUB-${String(Date.now()).slice(-6)}`)
  const [name, setName] = useState(record?.name ?? '')
  const [rubricType, setRubricType] = useState<RubricType | ''>(record?.rubricType ?? '')
  const [thirdPartyName, setThirdPartyName] = useState(record?.thirdPartyName ?? '')
  const [contributesIess, setContributesIess] = useState(record?.contributesIess ?? false)
  const [status, setStatus] = useState<CatalogRecord['status']>(record?.status ?? 'ACTIVO')
  const [containsRubrics, setContainsRubrics] = useState(Boolean(record?.componentIds?.length))
  const [componentIds, setComponentIds] = useState<string[]>(record?.componentIds ?? [])
  const [error, setError] = useState('')
  const available = records.filter(item => item.id !== draftId).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const selected = componentIds.map(id => records.find(item => item.id === id)).filter((item): item is CatalogRecord => Boolean(item))
  const candidateRecord = (ids = componentIds): CatalogRecord => ({ id: draftId, code: record?.code ?? '', name, description: rubricType ? rubricTypeLabel(rubricType) : '', status, rubricType: rubricType || undefined, contributesIess, thirdPartyName: thirdPartyName.trim(), componentIds: containsRubrics ? ids : [] })
  const toggleComponent = (id: string) => {
    const next = componentIds.includes(id) ? componentIds.filter(item => item !== id) : [...componentIds, id]
    if (hasRubricDependencyCycle(records, candidateRecord(next))) {
      setError('No se puede seleccionar ese rubro porque generaría una dependencia circular.')
      return
    }
    setError('')
    setComponentIds(next)
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !rubricType) { setError('Completa el nombre y selecciona el tipo de rubro.'); return }
    const duplicate = records.some(item => item.id !== draftId && item.name.localeCompare(name.trim(), 'es', { sensitivity: 'base' }) === 0)
    if (duplicate) { setError('Ya existe un rubro con ese nombre.'); return }
    const code = record?.code || name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20).toUpperCase()
    const next = { ...candidateRecord(), code, name: name.trim(), description: rubricTypeLabel(rubricType) }
    if (hasRubricDependencyCycle(records, next)) { setError('La combinación seleccionada genera un ciclo entre rubros. Revisa los componentes.'); return }
    onSave(next)
  }
  return <Dialog title={record ? 'Editar rubro' : 'Nuevo rubro'} description="Define el concepto y, si corresponde, los rubros que lo componen." onClose={onClose} className="dialog-wide"><form onSubmit={submit} noValidate>{error && <div className="form-error" role="alert"><strong>No se pudo guardar el rubro.</strong><span>{error}</span></div>}<div className="form-grid"><div className="field"><label htmlFor="rubric-name">Nombre <span>Obligatorio</span></label><input id="rubric-name" value={name} onChange={event => { setName(event.target.value); setError('') }} placeholder="Nombre del rubro" /></div><div className="field"><label htmlFor="rubric-type">Tipo <span>Obligatorio</span></label><select id="rubric-type" value={rubricType} onChange={event => { setRubricType(event.target.value as RubricType); setError('') }}><option value="">Selecciona una opción</option>{rubricTypeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div></div><div className="field"><label htmlFor="rubric-third-party">Nombre del Tercero</label><input id="rubric-third-party" value={thirdPartyName} onChange={event => setThirdPartyName(event.target.value)} placeholder="Nombre del tercero, si aplica" /></div><div className="form-grid rubric-toggle-row"><ToggleField id="rubric-contributes-iess" label="Aporta IESS" checked={contributesIess} onChange={setContributesIess} checkedLabel="Sí" uncheckedLabel="No" /><ToggleField id="rubric-status" label="Estado" checked={status === 'ACTIVO'} onChange={value => setStatus(value ? 'ACTIVO' : 'INACTIVO')} checkedLabel="Activo" uncheckedLabel="Inactivo" /><ToggleField id="rubric-contains-components" label="Contiene Otros Rubros" checked={containsRubrics} onChange={value => { setContainsRubrics(value); setError(''); if (!value) setComponentIds([]) }} checkedLabel="Sí, este rubro se calcula con otros rubros" uncheckedLabel="No contiene otros rubros" /></div>{containsRubrics && <div className="rubric-component-picker"><section><div className="rubric-picker-heading"><strong>Rubros disponibles</strong><span>{available.length}</span></div><div className="rubric-option-list">{available.map(item => { const isSelected = componentIds.includes(item.id); const invalid = !isSelected && hasRubricDependencyCycle(records, candidateRecord([...componentIds, item.id])); return <label className={`rubric-option ${isSelected ? 'selected' : ''} ${invalid ? 'disabled' : ''}`} key={item.id} title={invalid ? 'Esta selección generaría una dependencia circular' : undefined}><input type="checkbox" checked={isSelected} disabled={invalid} onChange={() => toggleComponent(item.id)} /><span><strong>{item.name}</strong><small>{rubricTypeLabel(item.rubricType)}{invalid ? ' · Generaría un ciclo' : ''}</small></span></label>})}{!available.length && <div className="rubric-picker-empty">No existen otros rubros disponibles.</div>}</div></section><section className="rubric-selected-panel"><div className="rubric-picker-heading"><strong>Rubros seleccionados</strong><span>{selected.length}</span></div><div className="rubric-selected-list">{selected.map(item => <div className="rubric-selected-item" key={item.id}><div><strong>{item.name}</strong><span>{rubricTypeLabel(item.rubricType)}</span></div><button type="button" className="icon-button small" onClick={() => toggleComponent(item.id)} aria-label={`Quitar ${item.name}`}><X size={16} /></button></div>)}{!selected.length && <div className="rubric-picker-empty">Selecciona rubros en el listado de la izquierda.</div>}</div></section></div>}<div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">{record ? 'Guardar cambios' : 'Guardar rubro'}</button></div></form></Dialog>
}

function RubricComponentsDialog({ record, records, onClose }: { record: CatalogRecord; records: CatalogRecord[]; onClose: () => void }) {
  const components = (record.componentIds ?? []).map(id => records.find(item => item.id === id)).filter((item): item is CatalogRecord => Boolean(item))
  return <Dialog title={`Componentes de ${record.name}`} description="Rubros que participan en la composición del concepto." onClose={onClose}><div className="table-scroll rubric-components-dialog" role="region" aria-label={`Componentes de ${record.name}`} tabIndex={0}><table><thead><tr><th>Rubro</th><th>Tipo de Rubro</th><th>Estado</th></tr></thead><tbody>{components.map(component => <tr key={component.id}><td><strong>{component.name}</strong></td><td>{rubricTypeLabel(component.rubricType)}</td><td><Badge tone={component.status === 'ACTIVO' ? 'success' : 'neutral'}>{component.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</Badge></td></tr>)}{!components.length && <tr><td colSpan={3}><div className="empty-state compact"><Search /><strong>Sin componentes</strong><p>Este rubro no contiene otros rubros.</p></div></td></tr>}</tbody></table></div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cerrar</button></div></Dialog>
}

function displayDateToKey(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : ''
}

function isValidDisplayDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return false
  const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])))
  return date.getUTCFullYear() === Number(match[3]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[1])
}

function formatDisplayDateDraft(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function findSbuForDate(records: SbuRecord[], date: string) {
  const key = displayDateToKey(date)
  if (!key) return undefined
  return records.find(record => displayDateToKey(record.startDate) <= key && (!record.endDate || key <= displayDateToKey(record.endDate)))
}

function currentEcuadorDate() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Guayaquil',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
}

function SbuPage({ records, onSave, onDelete }: { records: SbuRecord[]; onSave: (record: SbuRecord) => void; onDelete: (record: SbuRecord) => boolean }) {
  const [editing, setEditing] = useState<SbuRecord | null | undefined>(undefined)
  const [deletionBlocked, setDeletionBlocked] = useState(false)
  const sbuSort = useSortableRows(records, { startDate: row => displayDateToKey(row.startDate), endDate: row => row.endDate ? displayDateToKey(row.endDate) : '9999-12-31', value: row => decimalToCents(row.value) })
  return <>
    <PageHeader eyebrow="Configuraciones / Salario Básico Unificado" title="Salario Básico Unificado" description="Administra los valores de SBU por período de vigencia." action={<button className="button primary" onClick={() => setEditing(null)}><Plus size={18} /> Nuevo SBU</button>} />
    <DeletionBlockedNotice visible={deletionBlocked} />
    <section className="panel table-panel"><div className="table-scroll" role="region" aria-label="Salarios Básicos Unificados" tabIndex={0}><table><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Fecha Inicial" sortKey="startDate" sort={sbuSort.sort} onSort={sbuSort.toggleSort} /><SortableTh label="Fecha Final" sortKey="endDate" sort={sbuSort.sort} onSort={sbuSort.toggleSort} /><SortableTh label="Valor" sortKey="value" sort={sbuSort.sort} onSort={sbuSort.toggleSort} /></tr></thead><tbody>{sbuSort.sortedRows.map(record => <tr key={record.id}><td className="row-action-cell"><div className="row-action-buttons"><button className="icon-button small edit-icon" onClick={() => { setDeletionBlocked(false); setEditing(record) }} aria-label={`Editar SBU desde ${record.startDate}`}><Pencil size={17} /></button><button className="icon-button small delete-icon" onClick={() => { const deleted = onDelete(record); setDeletionBlocked(!deleted) }} aria-label={`Eliminar SBU desde ${record.startDate}`} title="Eliminar SBU"><Trash2 size={17} /></button></div></td><td>{record.startDate}</td><td>{record.endDate || <Badge tone="success">Vigente</Badge>}</td><td className="numeric"><strong>{money(record.value)}</strong></td></tr>)}{!records.length && <tr><td colSpan={4}><div className="empty-state"><CircleDollarSign /><strong>Sin valores de SBU</strong><p>Selecciona Nuevo SBU para registrar la primera vigencia.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{records.length} registros</span><span>Solo una vigencia puede permanecer sin fecha final.</span></div></section>
    {editing !== undefined && <SbuDialog records={records} record={editing ?? undefined} onClose={() => setEditing(undefined)} onSave={(record) => { onSave(record); setEditing(undefined) }} />}
  </>
}

function SbuDialog({ records, record, onClose, onSave }: { records: SbuRecord[]; record?: SbuRecord; onClose: () => void; onSave: (record: SbuRecord) => void }) {
  const [startDate, setStartDate] = useState(record?.startDate ?? '')
  const [endDate, setEndDate] = useState(record?.endDate ?? '')
  const [value, setValue] = useState(record?.value ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const decimalDraft = (input: string) => { const normalized = input.replace(',', '.').replace(/[^\d.]/g, ''); const [whole = '', ...rest] = normalized.split('.'); return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const nextErrors: Record<string, string> = {}
    if (!isValidDisplayDate(startDate)) nextErrors.startDate = 'Ingresa una fecha inicial válida en formato DD/MM/AAAA.'
    if (endDate && !isValidDisplayDate(endDate)) nextErrors.endDate = 'Ingresa una fecha final válida en formato DD/MM/AAAA o déjala vacía.'
    if (isValidDisplayDate(startDate) && endDate && isValidDisplayDate(endDate) && displayDateToKey(endDate) < displayDateToKey(startDate)) nextErrors.endDate = 'La fecha final no puede ser anterior a la fecha inicial.'
    if (!/^\d+(\.\d{1,2})?$/.test(value) || decimalToCents(value) <= 0n) nextErrors.value = 'Ingresa un valor mayor a cero con máximo dos decimales.'
    const anotherOpenRecord = !endDate && records.some(item => item.id !== record?.id && !item.endDate)
    if (anotherOpenRecord) nextErrors.endDate = 'Ya existe un registro vigente sin fecha final. Debes cerrar esa vigencia antes de crear otra.'
    const candidateEnd = endDate ? displayDateToKey(endDate) : '9999-12-31'
    const overlaps = records.some(item => item.id !== record?.id && displayDateToKey(startDate) <= (item.endDate ? displayDateToKey(item.endDate) : '9999-12-31') && candidateEnd >= displayDateToKey(item.startDate))
    if (!nextErrors.startDate && !nextErrors.endDate && overlaps) nextErrors.startDate = 'La vigencia se superpone con otro valor de SBU.'
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return
    onSave({ id: record?.id ?? `SBU-${Date.now()}`, startDate, endDate, value: centsToDecimal(decimalToCents(value)) })
  }
  return <Dialog title={record ? 'Editar Salario Básico Unificado' : 'Nuevo Salario Básico Unificado'} description="Define el valor y su período de vigencia." onClose={onClose}><form onSubmit={submit} noValidate>{Object.values(errors).some(Boolean) && <div className="form-error" role="alert"><strong>Revisa los campos indicados.</strong><span>No se guardó el valor de SBU.</span></div>}<div className="form-grid"><div className="field"><label htmlFor="sbu-start-date">Fecha Inicial <span>Obligatorio</span></label><input id="sbu-start-date" value={startDate} onChange={event => setStartDate(formatDisplayDateDraft(event.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.startDate)} />{errors.startDate && <small className="field-error">{errors.startDate}</small>}</div><div className="field"><label htmlFor="sbu-end-date">Fecha Final <span>Opcional</span></label><input id="sbu-end-date" value={endDate} onChange={event => setEndDate(formatDisplayDateDraft(event.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.endDate)} /><small className="field-help">Déjala vacía para identificar el SBU vigente. Solo puede existir un registro abierto.</small>{errors.endDate && <small className="field-error">{errors.endDate}</small>}</div><div className="field"><label htmlFor="sbu-value">Valor (USD) <span>Obligatorio</span></label><input id="sbu-value" value={value} onChange={event => setValue(decimalDraft(event.target.value))} inputMode="decimal" aria-invalid={Boolean(errors.value)} /><small className="field-help">Máximo dos decimales.</small>{errors.value && <small className="field-error">{errors.value}</small>}</div></div><div className="notice info catalog-notice"><ShieldCheck size={20} /><div><strong>Actualización automática</strong><p>El registro sin fecha final es el SBU vigente. Al guardarlo se actualizarán los empleados con SBU activo y se registrará una línea en su historial.</p></div></div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">Guardar SBU</button></div></form></Dialog>
}

function IessPercentagesPage({ records, onSave, onDelete }: { records: IessPercentageRecord[]; onSave: (record: IessPercentageRecord) => void; onDelete: (record: IessPercentageRecord) => boolean }) {
  const [editing, setEditing] = useState<IessPercentageRecord | null | undefined>(undefined)
  const [deletionBlocked, setDeletionBlocked] = useState(false)
  const [query, setQuery] = useState('')
  const filtered = records.filter(record => record.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  const percentageSort = useSortableRows(filtered, { name: row => row.name, percentage: row => decimalToCents(row.percentage), status: row => row.status })
  return <>
    <PageHeader eyebrow="Configuraciones / % IESS" title="% IESS" description="Administra los porcentajes utilizados en los cálculos y aportaciones al IESS." action={<button className="button primary" onClick={() => setEditing(null)}><Plus size={18} /> Nuevo porcentaje</button>} />
    <DeletionBlockedNotice visible={deletionBlocked} />
    <section className="panel table-panel">
      <div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar porcentaje IESS</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre" /></label></div>
      <div className="table-scroll" role="region" aria-label="Porcentajes IESS" tabIndex={0}><table><caption className="sr-only">Porcentajes IESS configurados</caption><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Nombre" sortKey="name" sort={percentageSort.sort} onSort={percentageSort.toggleSort} /><SortableTh label="Porcentaje" sortKey="percentage" sort={percentageSort.sort} onSort={percentageSort.toggleSort} className="numeric" /><SortableTh label="Estado" sortKey="status" sort={percentageSort.sort} onSort={percentageSort.toggleSort} /></tr></thead><tbody>
        {percentageSort.sortedRows.map(record => <tr key={record.id}><td className="row-action-cell"><div className="row-action-buttons"><button className="icon-button small edit-icon" onClick={() => { setDeletionBlocked(false); setEditing(record) }} aria-label={`Editar ${record.name}`} title={`Editar ${record.name}`}><Pencil size={17} /></button><button className="icon-button small delete-icon" onClick={() => { const deleted = onDelete(record); setDeletionBlocked(!deleted) }} aria-label={`Eliminar ${record.name}`} title={`Eliminar ${record.name}`}><Trash2 size={17} /></button></div></td><td><strong>{record.name}</strong></td><td className="numeric">{record.percentage}%</td><td><Badge tone={record.status === 'ACTIVO' ? 'success' : 'neutral'}>{record.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</Badge></td></tr>)}
        {!percentageSort.sortedRows.length && <tr><td colSpan={4}><div className="empty-state"><Search /><strong>Sin resultados</strong><p>No existen porcentajes que coincidan con la búsqueda.</p></div></td></tr>}
      </tbody></table></div>
      <div className="table-footer"><span>{percentageSort.sortedRows.length} de {records.length} registros</span><span>Catálogo de porcentajes IESS</span></div>
    </section>
    {editing !== undefined && <IessPercentageDialog records={records} record={editing ?? undefined} onClose={() => setEditing(undefined)} onSave={(record) => { onSave(record); setEditing(undefined) }} />}
  </>
}

function IessPercentageDialog({ records, record, onClose, onSave }: { records: IessPercentageRecord[]; record?: IessPercentageRecord; onClose: () => void; onSave: (record: IessPercentageRecord) => void }) {
  const [name, setName] = useState(record?.name ?? '')
  const [percentage, setPercentage] = useState(record?.percentage ?? '')
  const [status, setStatus] = useState<IessPercentageRecord['status']>(record?.status ?? 'ACTIVO')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const percentageDraft = (input: string) => { const normalized = input.replace(',', '.').replace(/[^\d.]/g, ''); const [whole = '', ...rest] = normalized.split('.'); return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) nextErrors.name = 'Ingresa el nombre del porcentaje.'
    if (records.some(item => item.id !== record?.id && item.name.localeCompare(name.trim(), 'es', { sensitivity: 'base' }) === 0)) nextErrors.name = 'Ya existe un registro con este nombre.'
    if (!/^\d+(\.\d{1,2})?$/.test(percentage) || decimalToCents(percentage) > 10000n) nextErrors.percentage = 'Ingresa un porcentaje entre 0 y 100, con máximo dos decimales.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSave({ id: record?.id ?? `IESS-${Date.now()}`, name: name.trim(), percentage: centsToDecimal(decimalToCents(percentage)), status })
  }
  return <Dialog title={record ? 'Editar porcentaje IESS' : 'Nuevo porcentaje IESS'} description="Define el nombre, porcentaje y estado del registro." onClose={onClose}><form onSubmit={submit} noValidate>{Object.values(errors).some(Boolean) && <div className="form-error" role="alert"><strong>Revisa los campos indicados.</strong><span>No se guardó el porcentaje IESS.</span></div>}<div className="form-grid"><div className="field"><label htmlFor="iess-percentage-name">Nombre <span>Obligatorio</span></label><input id="iess-percentage-name" value={name} onChange={event => { setName(event.target.value); setErrors(current => ({ ...current, name: '' })) }} aria-invalid={Boolean(errors.name)} />{errors.name && <small className="field-error">{errors.name}</small>}</div><div className="field"><label htmlFor="iess-percentage-value">Porcentaje <span>Obligatorio</span></label><input id="iess-percentage-value" value={percentage} onChange={event => { setPercentage(percentageDraft(event.target.value)); setErrors(current => ({ ...current, percentage: '' })) }} inputMode="decimal" aria-invalid={Boolean(errors.percentage)} /><small className="field-help">Valor de 0 a 100 con máximo dos decimales.</small>{errors.percentage && <small className="field-error">{errors.percentage}</small>}</div></div><ToggleField id="iess-percentage-status" label="Estado" checked={status === 'ACTIVO'} onChange={value => setStatus(value ? 'ACTIVO' : 'INACTIVO')} checkedLabel="Activo" uncheckedLabel="Inactivo" /><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">{record ? 'Guardar cambios' : 'Guardar porcentaje'}</button></div></form></Dialog>
}

function EmployeeModulePage({ screenKey, clients, employees, complementaryEmployees, setComplementaryEmployees, catalogs, contractHistory, historicalSalaries, setHistoricalSalaries, historicalSalaryUploads, setHistoricalSalaryUploads, employeeInformationUploads, setEmployeeInformationUploads, onImportEmployees, onDeleteImportedEmployees, onAssignPayrollGroup, onSavePositionChange, onUpdateHistoryLine }: { screenKey: EmployeeScreenKey; clients: Client[]; employees: Employee[]; complementaryEmployees: ComplementaryEmployee[]; setComplementaryEmployees: Dispatch<SetStateAction<ComplementaryEmployee[]>>; catalogs: Catalogs; contractHistory: Record<string, ContractHistoryLine[]>; historicalSalaries: HistoricalSalaryRecord[]; setHistoricalSalaries: Dispatch<SetStateAction<HistoricalSalaryRecord[]>>; historicalSalaryUploads: HistoricalSalaryUpload[]; setHistoricalSalaryUploads: Dispatch<SetStateAction<HistoricalSalaryUpload[]>>; employeeInformationUploads: EmployeeInformationUpload[]; setEmployeeInformationUploads: Dispatch<SetStateAction<EmployeeInformationUpload[]>>; onImportEmployees: (packages: ImportedEmployeePackage[]) => void; onDeleteImportedEmployees: (employeeIds: string[]) => void; onAssignPayrollGroup: (employeeId: string, payrollGroupId: string) => void; onSavePositionChange: (employeeId: string, line: ContractHistoryLine) => void; onUpdateHistoryLine: (employeeId: string, line: ContractHistoryLine) => void }) {
  const config = employeeScreenConfig[screenKey]
  const context = null

  if (screenKey === 'asignacion-empleados') {
    return <EmployeeAssignmentPage clients={clients} employees={employees} context={context} onAssignPayrollGroup={onAssignPayrollGroup} />
  }

  if (screenKey === 'complementarios') {
    return <ComplementaryEmployeesPage workers={complementaryEmployees} setWorkers={setComplementaryEmployees} context={context} />
  }

  if (screenKey === 'modificacion-cargo') {
    return <EmployeePositionChangePage employees={employees} catalogs={catalogs} contractHistory={contractHistory} context={context} onSave={onSavePositionChange} />
  }

  if (screenKey === 'modificacion-historial') {
    return <HistoryModificationPage employees={employees} catalogs={catalogs} contractHistory={contractHistory} context={context} onSave={onUpdateHistoryLine} />
  }

  if (screenKey === 'carga-sueldos-historicos') {
    return <HistoricalSalaryImportPage employees={employees} records={historicalSalaries} setRecords={setHistoricalSalaries} uploads={historicalSalaryUploads} setUploads={setHistoricalSalaryUploads} context={context} />
  }

  if (screenKey === 'carga-empleados') {
    return <EmployeeInformationImportPage employees={employees} catalogs={catalogs} uploads={employeeInformationUploads} setUploads={setEmployeeInformationUploads} context={context} onImport={onImportEmployees} onDeleteImportedEmployees={onDeleteImportedEmployees} />
  }

  return <><PageHeader eyebrow={`Empleado / ${config.title}`} title={config.title} description={config.description} />{context}<section className="import-layout"><div className="panel import-card"><div className="import-icon"><FileText /></div><h2>Importar empleados</h2><p>Utiliza la plantilla oficial del MVP para revisar estructura, campos obligatorios y duplicados antes de confirmar.</p><button className="button secondary" disabled title="La carga se habilitará al conectar el servicio de archivos"><FileText size={18} /> Seleccionar archivo</button><span className="cell-meta">Formatos previstos: XLSX o CSV · máximo 10 MB</span></div><div className="panel import-guide"><h2>Flujo de la carga</h2><ol><li><span>1</span><div><strong>Seleccionar archivo</strong><p>Se calcula su huella y se analiza de forma privada.</p></div></li><li><span>2</span><div><strong>Validar registros</strong><p>Los errores se muestran por fila y campo.</p></div></li><li><span>3</span><div><strong>Revisar diferencias</strong><p>Se comparan altas, cambios y posibles duplicados.</p></div></li><li><span>4</span><div><strong>Confirmar carga</strong><p>La operación es atómica y queda auditada.</p></div></li></ol></div></section><div className="notice info"><ShieldCheck size={20} /><div><strong>Carga no disponible en este incremento</strong><p>La pantalla permite validar el flujo; ningún archivo será enviado ni procesado todavía.</p></div></div></>
}

function positionScheduleSummary(contract: ClientOperationalContract, positionKey: string | number) {
  const resolvedPositionKey = String(positionKey)
  const cells = contract.schedules?.[resolvedPositionKey] ?? []
  const grouped = new Map<string, number[]>()
  cells.forEach(cell => {
    const separatorIndex = cell.lastIndexOf('-')
    if (separatorIndex < 0) return
    const column = cell.slice(0, separatorIndex)
    const hour = Number(cell.slice(separatorIndex + 1))
    if (!Number.isInteger(hour)) return
    grouped.set(column, [...(grouped.get(column) ?? []), hour])
  })
  const cycleDays = contract.scheduleCycleDays?.[resolvedPositionKey] ?? 0
  const columns = cycleDays > 0 ? Array.from({ length: cycleDays }, (_, index) => ({ key: `DIA${index + 1}`, label: `Día ${index + 1}` })) : operationalWeek
  const ranges = (hours: number[]) => {
    const sorted = [...new Set(hours)].sort((first, second) => first - second)
    const result: string[] = []
    let start = sorted[0]; let previous = sorted[0]
    sorted.slice(1).forEach(hour => {
      if (hour === previous + 1) { previous = hour; return }
      result.push(start === previous ? `${String(start).padStart(2, '0')}:00` : `${String(start).padStart(2, '0')}:00–${String(previous + 1).padStart(2, '0')}:00`)
      start = hour; previous = hour
    })
    if (start !== undefined) result.push(start === previous ? `${String(start).padStart(2, '0')}:00` : `${String(start).padStart(2, '0')}:00–${String(previous + 1).padStart(2, '0')}:00`)
    return result.join(', ')
  }
  return columns.filter(column => grouped.get(column.key)?.length).map(column => `${column.label}: ${ranges(grouped.get(column.key) ?? [])}`)
}

function EmployeeAssignmentCombobox({ employees, value, unavailableIds, label, onChange }: { employees: Employee[]; value: string; unavailableIds: Set<string>; label: string; onChange: (employeeId: string) => void }) {
  const selectedEmployee = employees.find(employee => employee.id === value)
  const selectedLabel = selectedEmployee ? `${selectedEmployee.name} · ${selectedEmployee.document}` : ''
  const [query, setQuery] = useState(selectedLabel)
  const [open, setOpen] = useState(false)
  useEffect(() => { setQuery(selectedLabel) }, [selectedLabel])
  const normalizedQuery = query.trim().toLocaleLowerCase('es')
  const filteredEmployees = employees.filter(employee => `${employee.name} ${employee.document} ${employee.role} ${employee.area}`.toLocaleLowerCase('es').includes(normalizedQuery)).slice(0, 12)
  const employeeInitials = (employee: Employee) => employee.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const selectEmployee = (employeeId: string) => {
    onChange(employeeId)
    const employee = employees.find(item => item.id === employeeId)
    setQuery(employee ? `${employee.name} · ${employee.document}` : '')
    setOpen(false)
  }
  return <div className="assignment-employee-control">
    {!selectedEmployee && <div className={`assignment-employee-combobox${open ? ' open' : ''}`}>
      <Search size={17} aria-hidden="true" />
      <input
        type="text"
        value={query}
        onChange={event => { setQuery(event.target.value); setOpen(true) }}
        onFocus={event => { event.currentTarget.select(); setOpen(true) }}
        onBlur={() => window.setTimeout(() => { setOpen(false); setQuery(selectedLabel) }, 150)}
        placeholder="Escribe nombre o documento"
        aria-label={label}
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
      />
      {query && <button type="button" className="assignment-employee-clear" onMouseDown={event => event.preventDefault()} onClick={() => { setQuery(''); setOpen(true) }} aria-label="Limpiar búsqueda" title="Limpiar búsqueda"><X size={15} /></button>}
      {open && <div className="assignment-employee-options" role="listbox">
        <button type="button" className="assignment-employee-option unassigned" onMouseDown={event => event.preventDefault()} onClick={() => selectEmployee('')} role="option" aria-selected={!value}>
          <span className="assignment-employee-option-avatar"><UserRound size={15} /></span><span><strong>Sin asignar</strong><small>Dejar la posición disponible</small></span>
        </button>
        {filteredEmployees.map(employee => {
          const unavailable = unavailableIds.has(employee.id) && employee.id !== value
          return <button key={employee.id} type="button" className="assignment-employee-option" onMouseDown={event => event.preventDefault()} onClick={() => selectEmployee(employee.id)} disabled={unavailable} role="option" aria-selected={employee.id === value}>
            <span className="assignment-employee-option-avatar">{employeeInitials(employee)}</span><span><strong>{employee.name}</strong><small>{employee.document} · {employee.role || employee.area}</small></span>{unavailable && <em>Ya asignado</em>}
          </button>
        })}
        {!filteredEmployees.length && <div className="assignment-employee-empty">No se encontraron empleados activos.</div>}
      </div>}
    </div>}
    {selectedEmployee && <div className="assigned-employee-card">
      <span className="assigned-employee-avatar">{employeeInitials(selectedEmployee)}</span>
      <span className="assigned-employee-details"><strong>{selectedEmployee.name}</strong><small>{selectedEmployee.document} · {selectedEmployee.role || selectedEmployee.area}</small></span>
      <button type="button" className="assigned-employee-remove" onClick={() => selectEmployee('')} aria-label={`Quitar a ${selectedEmployee.name} de esta posición`} title="Quitar asignación"><X size={15} /></button>
    </div>}
  </div>
}

function EmployeeAssignmentPage({ clients, employees, context, onAssignPayrollGroup }: { clients: Client[]; employees: Employee[]; context: ReactNode; onAssignPayrollGroup: (employeeId: string, payrollGroupId: string) => void }) {
  const [selectedClientCode, setSelectedClientCode] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, string>>(() => storedValue('nomina-asignacion-empleados', {}))
  const [feedback, setFeedback] = useState('')
  useEffect(() => { window.localStorage.setItem('nomina-asignacion-empleados', JSON.stringify(assignments)) }, [assignments])
  const activeEmployees = employees.filter(employee => employee.status === 'ACTIVO')
  const assignmentKey = (clientCode: string, contractId: string, positionKey: string | number) => `${clientCode}|${contractId}|${positionKey}`
  const contractsForClient = (client: Client) => client.operationalContracts?.length ? client.operationalContracts : [emptyOperationalContract(client, `AUTO-${client.code}`)]
  const positionRowsForClient = (client: Client) => contractsForClient(client).flatMap(contract => {
    const guardPositions = Array.from({ length: Math.max(0, contract.positions) }, (_, index) => ({ contract, position: index + 1, scheduleKey: String(index + 1), label: `Posición ${String(index + 1).padStart(2, '0')}`, key: assignmentKey(client.code, contract.id, index + 1) }))
    const supervisorPositions = contract.fixedSupervisor && contract.fixedSupervisorCount > 0
      ? Array.from({ length: contract.fixedSupervisorCount }, (_, index) => ({ contract, position: contract.positions + index + 1, scheduleKey: `SUPERVISOR_FIJO_${index + 1}`, label: `Supervisor Fijo ${String(index + 1).padStart(2, '0')}`, key: assignmentKey(client.code, contract.id, `SUPERVISOR_FIJO_${index + 1}`) }))
      : [{ contract, position: contract.positions + 1, scheduleKey: 'SUPERVISOR_COMPARTIDO', label: 'Supervisor Compartido', key: assignmentKey(client.code, contract.id, 'SUPERVISOR_COMPARTIDO') }]
    return [...guardPositions, ...supervisorPositions]
  })
  const assignedForClient = (client: Client) => positionRowsForClient(client).filter(position => assignments[position.key]).length
  const selectedClient = clients.find(client => client.code === selectedClientCode)
  const selectedPositions = selectedClient ? positionRowsForClient(selectedClient) : []
  const changeAssignment = (key: string, employeeId: string, payrollGroupId?: string) => {
    if (employeeId && Object.entries(assignments).some(([positionKey, assignedEmployeeId]) => positionKey !== key && assignedEmployeeId === employeeId)) {
      setFeedback('El empleado seleccionado ya está asignado a otra posición. Libéralo antes de continuar.')
      return
    }
    setAssignments(current => employeeId ? { ...current, [key]: employeeId } : Object.fromEntries(Object.entries(current).filter(([positionKey]) => positionKey !== key)))
    if (employeeId && payrollGroupId) onAssignPayrollGroup(employeeId, payrollGroupId)
    setFeedback(employeeId ? (payrollGroupId ? 'Empleado asignado y Grupo de Nómina actualizado correctamente.' : 'Empleado asignado correctamente.') : 'La posición quedó disponible.')
  }
  return <>
    <PageHeader eyebrow="Empleado / Asignación de Empleados" title="Asignación de Empleados" description="Selecciona un cliente para consultar sus posiciones, horarios y empleados asignados." />
    {context}
    <section className="panel table-panel employee-assignment-clients">
      <div className="panel-heading table-title"><div><h2>Clientes con posiciones operativas</h2><p>El ícono de edición abre las posiciones disponibles y el horario definido en Datos Operativos.</p></div><Badge tone="neutral">{clients.length} clientes</Badge></div>
      <div className="table-scroll" role="region" aria-label="Clientes para asignación de empleados" tabIndex={0}><table><thead><tr><th className="row-action-cell" aria-label="Editar" /><th>Código</th><th>Documento</th><th>Razón Social</th><th className="numeric">Disponibles</th></tr></thead><tbody>{clients.map(client => { const assigned = assignedForClient(client); const available = Math.max(0, positionRowsForClient(client).length - assigned); return <tr key={client.code} className={selectedClientCode === client.code ? 'selected-assignment-client' : undefined}><td className="row-action-cell"><button type="button" className="icon-button small edit-icon" onClick={() => { setSelectedClientCode(client.code); setFeedback('') }} aria-label={`Editar asignaciones de ${client.businessName}`} title="Ver posiciones y horarios"><Pencil size={17} /></button></td><td><strong>{client.code}</strong></td><td>{client.document}</td><td><strong>{client.businessName}</strong></td><td className="numeric"><span className={`available-count ${available === 0 ? 'empty' : ''}`}>{available}</span></td></tr>})}</tbody></table></div>
      <div className="table-footer"><span>{clients.length} clientes</span><span>Disponibles actualizados según asignaciones</span></div>
    </section>
    {selectedClient && <section className="panel assignment-position-panel">
      <div className="assignment-position-heading"><div><p className="breadcrumb">{selectedClient.code} / {selectedClient.document}</p><h2>Posiciones de {selectedClient.businessName}</h2><p>Los horarios corresponden a la configuración registrada en Clientes / Datos Operativos.</p></div><button type="button" className="icon-button" onClick={() => { setSelectedClientCode(null); setFeedback('') }} aria-label="Cerrar posiciones" title="Cerrar"><X size={20} /></button></div>
      {feedback && <div className={`client-document-feedback ${feedback.includes('correctamente') || feedback.includes('disponible') ? 'success' : 'error'}`} role="status">{feedback}</div>}
      <div className="table-scroll" role="region" aria-label={`Posiciones disponibles de ${selectedClient.businessName}`} tabIndex={0}><table className="assignment-positions-table"><thead><tr><th>Posición</th><th>Contrato</th><th>Ubicación</th><th>Vigencia</th><th>Horario Designado</th><th>Empleado Asignado</th><th>Estado</th></tr></thead><tbody>{selectedPositions.map(row => { const employeeId = assignments[row.key] ?? ''; const schedule = positionScheduleSummary(row.contract, row.scheduleKey); const cycleDays = row.contract.scheduleCycleDays?.[row.scheduleKey] ?? 0; const repeats = row.contract.scheduleCycleRepeats?.[row.scheduleKey] ?? false; const unavailableEmployeeIds = new Set(Object.entries(assignments).filter(([positionKey]) => positionKey !== row.key).map(([, assignedEmployeeId]) => assignedEmployeeId).filter(Boolean)); return <tr key={row.key}><td><strong>{row.label}</strong></td><td><strong>{row.contract.contractName}</strong><span className="cell-meta">{row.contract.id.startsWith('AUTO-') ? 'Contrato general del cliente' : row.contract.id}</span></td><td>{row.contract.location || 'Sin ubicación'}</td><td>{row.contract.startDate || 'Sin fecha'} — {row.contract.endDate || 'Vigente'}</td><td>{schedule.length ? <div className="assignment-schedule-summary">{cycleDays > 0 && <span className="schedule-cycle-label">Ciclo de {cycleDays} días{repeats ? ' · repite' : ''}</span>}{schedule.map(item => <span key={item}>{item}</span>)}</div> : <span className="cell-meta">Sin horario configurado</span>}</td><td><EmployeeAssignmentCombobox employees={activeEmployees} value={employeeId} unavailableIds={unavailableEmployeeIds} label={`Empleado para ${row.label} de ${row.contract.contractName}`} onChange={selectedEmployeeId => changeAssignment(row.key, selectedEmployeeId, row.contract.payrollGroupId)} /></td><td><Badge tone={employeeId ? 'success' : 'warning'}>{employeeId ? 'Asignado' : 'Disponible'}</Badge></td></tr>})}{!selectedPositions.length && <tr><td colSpan={7}><div className="empty-state"><Users /><strong>Sin posiciones configuradas</strong><p>Registra posiciones en Clientes / Datos Operativos para habilitar la asignación.</p></div></td></tr>}</tbody></table></div>
      <div className="table-footer"><span>{selectedPositions.filter(position => !assignments[position.key]).length} posiciones disponibles</span><span>{selectedPositions.filter(position => assignments[position.key]).length} asignadas</span></div>
    </section>}
  </>
}

type PersonalCalendarView = 'SEMANA' | 'DIA' | 'MES'

function PersonalInformationPage({ screenKey, clients, employees, currentEmployee, currentUserProfile, catalogs, onSaveCurrentUserProfile, contractHistory, pendingRecords, vacationRequests, setVacationRequests, disciplinaryRecords, setDisciplinaryRecords, personalRequests, setPersonalRequests, complaintRecords, setComplaintRecords, overtimeRecords, payrollReceipts, payrollPeriodOverrides }: { screenKey: PersonalInformationScreenKey; clients: Client[]; employees: Employee[]; currentEmployee: Employee; currentUserProfile: EmployeeProfile; catalogs: Catalogs; onSaveCurrentUserProfile: (profile: Partial<EmployeeProfile>) => void; contractHistory: Record<string, ContractHistoryLine[]>; pendingRecords: VacationPendingRecord[]; vacationRequests: VacationRequestRecord[]; setVacationRequests: Dispatch<SetStateAction<VacationRequestRecord[]>>; disciplinaryRecords: DisciplinaryRecord[]; setDisciplinaryRecords: Dispatch<SetStateAction<DisciplinaryRecord[]>>; personalRequests: PersonalRequest[]; setPersonalRequests: Dispatch<SetStateAction<PersonalRequest[]>>; complaintRecords: ComplaintRecord[]; setComplaintRecords: Dispatch<SetStateAction<ComplaintRecord[]>>; overtimeRecords: OvertimeRecord[]; payrollReceipts: PayrollReceiptRecord[]; payrollPeriodOverrides: Record<string, PayrollPeriodStatus> }) {
  const config = personalInformationScreenConfig[screenKey]
  if (screenKey === 'mi-perfil') return <PersonalProfilePage employee={currentEmployee} profile={currentUserProfile} catalogs={catalogs} onSave={onSaveCurrentUserProfile} />
  if (screenKey === 'mi-horario') return <PersonalSchedulePage clients={clients} employees={employees} />
  if (screenKey === 'novedades') return <PersonalNoveltiesPage clients={clients} employees={employees} records={disciplinaryRecords} setRecords={setDisciplinaryRecords} requests={personalRequests} setRequests={setPersonalRequests} complaintRecords={complaintRecords} setComplaintRecords={setComplaintRecords} overtimeRecords={overtimeRecords} openPeriods={openPayrollPeriodOptions(payrollPeriodOverrides)} />
  if (screenKey === 'vacaciones') return <PersonalVacationPage employees={employees} pendingRecords={pendingRecords} requests={vacationRequests} setRequests={setVacationRequests} />
  if (screenKey === 'roles-pago') return <PersonalPayrollReceiptsPage employees={employees} receipts={payrollReceipts} />
  if (screenKey === 'mi-historial') return <PersonalHistoryPage employees={employees} contractHistory={contractHistory} catalogs={catalogs} />
  return <>
    <PageHeader eyebrow={`Información Personal / ${config.title}`} title={config.title} description={config.description} />
    <section className="panel personal-placeholder-panel">
      <div className="import-icon"><FileText /></div>
      <h2>{config.title}</h2>
      <p>Esta opción ya forma parte del módulo Información Personal y está preparada para incorporar los registros del empleado.</p>
      <Badge tone="neutral">Módulo habilitado</Badge>
    </section>
  </>
}

function PersonalPayrollReceiptsPage({ employees, receipts }: { employees: Employee[]; receipts: PayrollReceiptRecord[] }) {
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const employee = employees.find(item => item.status === 'ACTIVO') ?? employees[0]
  const employeeReceipts = receipts.filter(record => record.employeeId === employee?.id).sort((a, b) => b.period.localeCompare(a.period))
  const latestPeriod = employeeReceipts[0]?.period ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const [year, setYear] = useState(latestPeriod.slice(0, 4))
  const [month, setMonth] = useState(latestPeriod.slice(5, 7))
  const years = [...new Set(employeeReceipts.map(record => record.period.slice(0, 4)))].sort((a, b) => b.localeCompare(a))
  const selectedReceipt = employeeReceipts.find(record => record.period === `${year}-${month}`)
  const pdfBlob = useMemo(() => {
    if (!selectedReceipt || !employee) return null
    const salary = decimalToCents(employee.salary)
    const personalIess = salary * 945n / 10000n
    const net = salary - personalIess
    const periodName = `${monthNames[Number(month) - 1]} ${year}`
    return createTablePdf(`Rol Individual - ${periodName}`, ['Empleado', 'Identificación', 'Cargo', 'Sueldo', 'Aporte IESS', 'Neto'], [[employee.name, employee.document, employee.role, money(salary), money(personalIess), money(net)]])
  }, [selectedReceipt, employee, month, year])
  const [previewUrl, setPreviewUrl] = useState('')
  useEffect(() => {
    if (!pdfBlob) { setPreviewUrl(''); return }
    const url = URL.createObjectURL(pdfBlob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [pdfBlob])
  const changeYear = (nextYear: string) => {
    setYear(nextYear)
    const firstPeriod = employeeReceipts.find(record => record.period.startsWith(`${nextYear}-`))?.period
    if (firstPeriod) setMonth(firstPeriod.slice(5, 7))
  }
  return <>
    <PageHeader eyebrow="Información Personal / Roles de Pago" title="Roles de Pago" description="Consulta y descarga tus roles de pago." />
    <div className="personal-employee-strip"><div><span>Empleado</span><strong>{employee?.name ?? 'Sin empleado activo'}</strong></div><div><span>Identificación</span><strong>{employee?.document ?? 'Sin dato'}</strong></div><div><span>Roles generados</span><strong>{employeeReceipts.length}</strong></div></div>
    <section className="panel payroll-receipt-filters">
      <div className="field"><label htmlFor="payroll-receipt-month">Mes</label><select id="payroll-receipt-month" value={month} onChange={event => setMonth(event.target.value)}>{monthNames.map((name, index) => <option key={name} value={String(index + 1).padStart(2, '0')}>{name}</option>)}</select></div>
      <div className="field"><label htmlFor="payroll-receipt-year">Año</label><select id="payroll-receipt-year" value={year} onChange={event => changeYear(event.target.value)}>{years.length ? years.map(option => <option key={option} value={option}>{option}</option>) : <option value={year}>{year}</option>}</select></div>
      <div className="payroll-receipt-period-status"><span>Período seleccionado</span><strong>{monthNames[Number(month) - 1]} {year}</strong><Badge tone={selectedReceipt ? 'success' : 'warning'}>{selectedReceipt ? 'Ejecutado' : 'Sin ejecutar'}</Badge></div>
    </section>
    <section className="panel payroll-receipt-preview-panel">
      <div className="panel-heading"><div><h2>Vista previa del rol individual</h2></div>{selectedReceipt && pdfBlob && <button type="button" className="button primary" onClick={() => downloadBlob(pdfBlob, `rol-pago-${selectedReceipt.period}-${employee?.document ?? 'empleado'}.pdf`)}><Download size={18} /> Descargar PDF</button>}</div>
      {selectedReceipt && previewUrl ? <iframe className="payroll-receipt-preview" src={previewUrl} title={`Rol de pago de ${monthNames[Number(month) - 1]} ${year}`} /> : <div className="empty-state payroll-receipt-empty"><FileText /><strong>Rol no disponible</strong><p>El período seleccionado todavía no ha sido ejecutado o no tiene un PDF individual generado.</p></div>}
    </section>
  </>
}

function disciplinaryTypeLabel(type: DisciplinaryRecord['type']) {
  return type === 'MULTA' ? 'Multa' : 'Falta Injustificada'
}

function disciplinaryStatusLabel(status: DisciplinaryRecord['status']) {
  if (status === 'NOTIFICADA') return 'Notificada'
  if (status === 'IMPUGNADA') return 'Impugnada'
  if (status === 'ANULADA') return 'Anulada'
  return 'Ejecutada'
}

function disciplinaryStatusTone(status: DisciplinaryRecord['status']): 'warning' | 'info' | 'success' | 'neutral' {
  if (status === 'NOTIFICADA') return 'warning'
  if (status === 'IMPUGNADA') return 'info'
  if (status === 'ANULADA') return 'neutral'
  return 'success'
}

function PersonalNoveltiesPage({ clients, employees, records, setRecords, requests, setRequests, complaintRecords, setComplaintRecords, overtimeRecords, openPeriods }: { clients: Client[]; employees: Employee[]; records: DisciplinaryRecord[]; setRecords: Dispatch<SetStateAction<DisciplinaryRecord[]>>; requests: PersonalRequest[]; setRequests: Dispatch<SetStateAction<PersonalRequest[]>>; complaintRecords: ComplaintRecord[]; setComplaintRecords: Dispatch<SetStateAction<ComplaintRecord[]>>; overtimeRecords: OvertimeRecord[]; openPeriods: { key: string; label: string }[] }) {
  const employee = employees.find(item => item.status === 'ACTIVO') ?? employees[0]
  const employeeRecords = records.filter(record => record.employeeId === employee?.id).sort((a, b) => b.date.localeCompare(a.date))
  const employeeRequests = requests.filter(request => request.employeeId === employee?.id).sort((a, b) => b.requestDate.localeCompare(a.requestDate))
  const employeeComplaints = complaintRecords.filter(record => record.employeeId === employee?.id).sort((a, b) => b.date.localeCompare(a.date))
  const employeeOvertime = overtimeRecords.filter(record => record.employeeId === employee?.id).sort((a, b) => (b.date || b.sourceDate || '').localeCompare(a.date || a.sourceDate || ''))
  const assignments = storedValue<Record<string, string>>('nomina-asignacion-empleados', {})
  const assignedClientCode = Object.entries(assignments).find(([, employeeId]) => employeeId === employee?.id)?.[0].split('|')[0]
  const assignedClient = clients.find(client => client.code === assignedClientCode)
  const [disputing, setDisputing] = useState<DisciplinaryRecord | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [complaintOpen, setComplaintOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [collapsedPanels, setCollapsedPanels] = useState<Record<'disciplinary' | 'requests' | 'overtime' | 'complaints', boolean>>({ disciplinary: true, requests: true, overtime: true, complaints: true })
  const togglePanel = (panel: keyof typeof collapsedPanels) => setCollapsedPanels(current => ({ ...current, [panel]: !current[panel] }))
  const overtimeHoursLabel = (record: OvertimeRecord) => {
    const total = decimalToCents(record.hours25) + decimalToCents(record.hours50) + decimalToCents(record.hours100)
    return new Intl.NumberFormat('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(total) / 100)
  }
  const acceptRecord = (record: DisciplinaryRecord) => {
    setRecords(current => current.map(item => item.id === record.id ? { ...item, status: 'EJECUTADA' } : item))
    setMessage(`${disciplinaryTypeLabel(record.type)} aceptada. Su estado cambió a Ejecutada.`)
  }
  const disputeRecord = (reason: string, supportFileName?: string, supportFileData?: string) => {
    if (!disputing) return
    setRecords(current => current.map(item => item.id === disputing.id ? { ...item, status: 'IMPUGNADA', disputeReason: reason, supportFileName, supportFileData } : item))
    setDisputing(null)
    setMessage('La impugnación fue enviada para revisión del supervisor.')
  }
  return <>
    <PageHeader eyebrow="Información Personal / Novedades" title="Novedades" description="Consulta las novedades registradas en tu nómina." />
    <div className="personal-employee-strip"><div><span>Empleado</span><strong>{employee?.name ?? 'Sin empleado activo'}</strong></div><div><span>Identificación</span><strong>{employee?.document ?? 'Sin dato'}</strong></div><div><span>Registros</span><strong>{employeeRecords.length}</strong></div></div>
    {message && <div className="notice info"><CheckCircle2 size={20} /><div><strong>Estado actualizado</strong><p>{message}</p></div></div>}
    <section className="panel table-panel disciplinary-personal-panel">
      <div className="panel-heading collapsible-panel-heading"><div><h2>Multas/Faltas Injustificadas</h2></div><div className="collapsible-panel-actions"><Badge tone="neutral">{employeeRecords.length} registros</Badge><button type="button" className="icon-button small collapse-panel-button" onClick={() => togglePanel('disciplinary')} aria-expanded={!collapsedPanels.disciplinary} aria-label={`${collapsedPanels.disciplinary ? 'Expandir' : 'Minimizar'} Multas/Faltas Injustificadas`} title={collapsedPanels.disciplinary ? 'Expandir' : 'Minimizar'}><ChevronDown className={collapsedPanels.disciplinary ? '' : 'expanded'} size={19} /></button></div></div>
      {!collapsedPanels.disciplinary && <div className="table-scroll" role="region" aria-label="Multas y faltas injustificadas del empleado" tabIndex={0}><table className="disciplinary-table"><thead><tr><th>Tipo</th><th>Fecha</th><th>Observación</th><th className="numeric">Valor a Descontar</th><th>Estado</th><th className="disciplinary-actions-cell">Acciones</th></tr></thead><tbody>
        {employeeRecords.map(record => <tr key={record.id}><td><strong>{disciplinaryTypeLabel(record.type)}</strong></td><td>{record.date.split('-').reverse().join('/')}</td><td>{record.observation}{record.disputeReason && <span className="cell-meta disciplinary-dispute-summary">Impugnación: {record.disputeReason}</span>}</td><td className="numeric money">{money(record.deductionValue)}</td><td><Badge tone={disciplinaryStatusTone(record.status)}>{disciplinaryStatusLabel(record.status)}</Badge></td><td className="disciplinary-actions-cell">{record.status === 'NOTIFICADA' ? <div className="disciplinary-action-buttons"><button type="button" className="icon-button small disciplinary-accept" onClick={() => acceptRecord(record)} aria-label={`Aceptar ${disciplinaryTypeLabel(record.type)}`} title="Aceptar y ejecutar"><Check size={18} /></button><button type="button" className="icon-button small disciplinary-dispute" onClick={() => setDisputing(record)} aria-label={`Impugnar ${disciplinaryTypeLabel(record.type)}`} title="Impugnar"><X size={18} /></button></div> : <span className="cell-meta">Sin acciones</span>}</td></tr>)}
        {!employeeRecords.length && <tr><td colSpan={6}><div className="empty-state compact"><FileText /><strong>Sin multas ni faltas</strong><p>No existen registros para el empleado actual.</p></div></td></tr>}
      </tbody></table></div>}
    </section>
    <section className="panel table-panel personal-requests-panel">
      <div className="panel-heading collapsible-panel-heading"><div><h2>Solicitudes</h2></div><div className="collapsible-panel-actions"><button type="button" className="button primary" onClick={() => setRequestOpen(true)}><Plus size={18} /> Nueva Solicitud</button><button type="button" className="icon-button small collapse-panel-button" onClick={() => togglePanel('requests')} aria-expanded={!collapsedPanels.requests} aria-label={`${collapsedPanels.requests ? 'Expandir' : 'Minimizar'} Solicitudes`} title={collapsedPanels.requests ? 'Expandir' : 'Minimizar'}><ChevronDown className={collapsedPanels.requests ? '' : 'expanded'} size={19} /></button></div></div>
      {!collapsedPanels.requests && <div className="table-scroll" role="region" aria-label="Solicitudes del empleado" tabIndex={0}><table className="personal-requests-table"><thead><tr><th>Tipo</th><th>Fecha</th><th>Observación</th><th className="numeric">Valor</th><th>Fecha Desde</th><th>Fecha Hasta</th><th>Estado</th></tr></thead><tbody>
        {employeeRequests.map(request => <tr key={request.id}><td><strong>{request.type === 'PERMISO' ? 'Permiso' : 'Anticipo'}</strong></td><td>{request.requestDate.split('-').reverse().join('/')}</td><td>{request.observation}</td><td className="numeric money">{request.type === 'ANTICIPO' ? money(request.value ?? '0.00') : '—'}</td><td>{request.type === 'PERMISO' && request.fromDate ? request.fromDate.split('-').reverse().join('/') : '—'}</td><td>{request.type === 'PERMISO' && request.toDate ? request.toDate.split('-').reverse().join('/') : '—'}</td><td><Badge tone={request.status === 'NOTIFICADA' ? 'warning' : request.status === 'APROBADA' ? 'success' : 'neutral'}>{request.status === 'NOTIFICADA' ? 'Notificada' : request.status === 'APROBADA' ? 'Aprobada' : 'Rechazada'}</Badge></td></tr>)}
        {!employeeRequests.length && <tr><td colSpan={7}><div className="empty-state compact"><FileText /><strong>Sin solicitudes</strong><p>Usa Nueva Solicitud para registrar un permiso o anticipo.</p></div></td></tr>}
      </tbody></table></div>}
    </section>
    <section className="panel table-panel personal-overtime-panel">
      <div className="panel-heading collapsible-panel-heading"><div><h2>Horas Extras</h2></div><div className="collapsible-panel-actions"><Badge tone="neutral">{employeeOvertime.length} registros</Badge><button type="button" className="icon-button small collapse-panel-button" onClick={() => togglePanel('overtime')} aria-expanded={!collapsedPanels.overtime} aria-label={`${collapsedPanels.overtime ? 'Expandir' : 'Minimizar'} Horas Extras`} title={collapsedPanels.overtime ? 'Expandir' : 'Minimizar'}><ChevronDown className={collapsedPanels.overtime ? '' : 'expanded'} size={19} /></button></div></div>
      {!collapsedPanels.overtime && <div className="table-scroll" role="region" aria-label="Horas extras trabajadas por el empleado" tabIndex={0}><table className="personal-overtime-table"><thead><tr><th>Fecha</th><th>Cliente</th><th className="numeric">Número de Horas</th></tr></thead><tbody>
        {employeeOvertime.map(record => { const date = record.date || record.sourceDate || ''; return <tr key={record.id}><td>{/^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('/') : date || 'Sin fecha'}</td><td><strong>{assignedClient?.businessName ?? 'Sin cliente asignado'}</strong></td><td className="numeric"><strong>{overtimeHoursLabel(record)}</strong></td></tr> })}
        {!employeeOvertime.length && <tr><td colSpan={3}><div className="empty-state compact"><Clock3 /><strong>Sin horas extras</strong><p>Los registros aparecerán cuando sean ingresados desde Talento Humano.</p></div></td></tr>}
      </tbody></table></div>}
    </section>
    <section className="panel table-panel personal-complaints-panel">
      <div className="panel-heading collapsible-panel-heading"><div><h2>Quejas/Reclamos</h2></div><div className="collapsible-panel-actions"><button type="button" className="button primary" onClick={() => setComplaintOpen(true)}><Plus size={18} /> Nuevo Reclamo</button><button type="button" className="icon-button small collapse-panel-button" onClick={() => togglePanel('complaints')} aria-expanded={!collapsedPanels.complaints} aria-label={`${collapsedPanels.complaints ? 'Expandir' : 'Minimizar'} Quejas/Reclamos`} title={collapsedPanels.complaints ? 'Expandir' : 'Minimizar'}><ChevronDown className={collapsedPanels.complaints ? '' : 'expanded'} size={19} /></button></div></div>
      {!collapsedPanels.complaints && <div className="table-scroll" role="region" aria-label="Quejas y reclamos del empleado" tabIndex={0}><table className="personal-complaints-table"><thead><tr><th>Tipo</th><th>Fecha</th><th>Detalle</th><th>Estado</th><th>Resolución</th></tr></thead><tbody>
        {employeeComplaints.map(record => <tr key={record.id}><td><strong>{record.type === 'QUEJA' ? 'Queja' : 'Reclamo'}</strong></td><td>{record.date.split('-').reverse().join('/')}</td><td>{record.detail}</td><td><Badge tone={record.status === 'ATENDIDA' ? 'success' : 'warning'}>{record.status === 'ATENDIDA' ? 'Atendida' : 'Notificada'}</Badge></td><td>{record.resolution || '—'}</td></tr>)}
        {!employeeComplaints.length && <tr><td colSpan={5}><div className="empty-state compact"><FileText /><strong>Sin quejas ni reclamos</strong><p>Usa Nuevo Reclamo para registrar la primera novedad.</p></div></td></tr>}
      </tbody></table></div>}
    </section>
    {disputing && <DisciplinaryDisputeDialog record={disputing} onClose={() => setDisputing(null)} onSave={disputeRecord} />}
    {requestOpen && employee && <PersonalRequestDialog employee={employee} openPeriods={openPeriods} onClose={() => setRequestOpen(false)} onSave={(request) => { setRequests(current => [request, ...current]); setRequestOpen(false); setMessage(request.type === 'PERMISO' ? 'La solicitud de permiso fue enviada al Tablero de Control Operativo.' : 'La solicitud de anticipo fue enviada al Tablero de Control del Personal.') }} />}
    {complaintOpen && employee && <PersonalComplaintDialog employee={employee} onClose={() => setComplaintOpen(false)} onSave={(record) => { setComplaintRecords(current => [record, ...current]); setComplaintOpen(false); setMessage('La queja o reclamo fue registrado con estado Notificada.') }} />}
  </>
}

function PersonalComplaintDialog({ employee, onClose, onSave }: { employee: Employee; onClose: () => void; onSave: (record: ComplaintRecord) => void }) {
  const [type, setType] = useState<ComplaintRecord['type']>('RECLAMO')
  const [detail, setDetail] = useState('')
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!detail.trim()) { setError('Ingresa el detalle de la queja o reclamo.'); return }
    onSave({ id: `QYR-${String(Date.now()).slice(-8)}`, employeeId: employee.id, type, date: currentEcuadorDate().split('/').reverse().join('-'), detail: detail.trim(), status: 'NOTIFICADA', resolution: '' })
  }
  return <Dialog title="Nuevo Reclamo" description={`${employee.name} · El registro será notificado al supervisor.`} onClose={onClose}><form onSubmit={submit} noValidate>
    {error && <div className="form-error" role="alert"><strong>No se puede registrar la novedad.</strong><span>{error}</span></div>}
    <div className="form-grid">
      <div className="field full-width-field"><label htmlFor="personal-complaint-type">Tipo <span>Obligatorio</span></label><select id="personal-complaint-type" value={type} onChange={event => { setType(event.target.value as ComplaintRecord['type']); setError('') }}><option value="QUEJA">Queja</option><option value="RECLAMO">Reclamo</option></select></div>
      <div className="field full-width-field"><label htmlFor="personal-complaint-detail">Detalle <span>Obligatorio</span></label><textarea id="personal-complaint-detail" value={detail} onChange={event => { setDetail(event.target.value.slice(0, 200)); setError('') }} maxLength={200} rows={5} placeholder="Describe la queja o reclamo" /><small className="field-help">Máximo 200 caracteres · {detail.length}/200.</small></div>
    </div>
    <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary"><Plus size={17} /> Registrar</button></div>
  </form></Dialog>
}

function PersonalRequestDialog({ employee, openPeriods, onClose, onSave }: { employee: Employee; openPeriods: { key: string; label: string }[]; onClose: () => void; onSave: (request: PersonalRequest) => void }) {
  const [type, setType] = useState<PersonalRequest['type']>('PERMISO')
  const [observation, setObservation] = useState('')
  const [value, setValue] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [applicationForm, setApplicationForm] = useState<'CUOTAS' | 'TOTAL'>('CUOTAS')
  const [installments, setInstallments] = useState('')
  const [startPeriod, setStartPeriod] = useState(openPeriods[0]?.key ?? '')
  const [applicationPeriod, setApplicationPeriod] = useState<PayrollNovelty['applicationPeriod']>('FIN_MES')
  const [error, setError] = useState('')
  const requestDate = currentEcuadorDate()
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!observation.trim()) { setError('Ingresa una observación para la solicitud.'); return }
    if (type === 'ANTICIPO' && decimalToCents(value) <= 0n) { setError('Ingresa un valor de anticipo mayor a cero.'); return }
    if (type === 'ANTICIPO' && applicationForm === 'CUOTAS' && (!/^\d+$/.test(installments) || Number(installments) < 1 || Number(installments) > 120)) { setError('Ingresa entre 1 y 120 cuotas.'); return }
    if (type === 'ANTICIPO' && !openPeriods.some(period => period.key === startPeriod)) { setError('Selecciona uno de los períodos abiertos.'); return }
    if (type === 'PERMISO' && (!fromDate || !toDate || toDate < fromDate)) { setError('Selecciona un rango válido de Fecha Desde y Fecha Hasta.'); return }
    onSave({ id: `SOL-${String(Date.now()).slice(-8)}`, employeeId: employee.id, type, requestDate: requestDate.split('/').reverse().join('-'), observation: observation.trim(), value: type === 'ANTICIPO' ? centsToDecimal(decimalToCents(value)) : undefined, fromDate: type === 'PERMISO' ? fromDate : undefined, toDate: type === 'PERMISO' ? toDate : undefined, applicationForm: type === 'ANTICIPO' ? applicationForm : undefined, installments: type === 'ANTICIPO' ? applicationForm === 'CUOTAS' ? Number(installments) : 1 : undefined, startPeriod: type === 'ANTICIPO' ? startPeriod : undefined, applicationPeriod: type === 'ANTICIPO' ? applicationPeriod : undefined, status: 'NOTIFICADA' })
  }
  return <Dialog title="Nueva Solicitud" description={`${employee.name} · ${type === 'PERMISO' ? 'Se enviará al Tablero de Control Operativo.' : 'Se enviará al Tablero de Control del Personal.'}`} onClose={onClose}><form onSubmit={submit} noValidate>
    {error && <div className="form-error" role="alert"><strong>No se puede crear la solicitud.</strong><span>{error}</span></div>}
    <div className="form-grid">
      <div className="field"><label htmlFor="personal-request-type">Tipo <span>Obligatorio</span></label><select id="personal-request-type" value={type} onChange={event => { setType(event.target.value as PersonalRequest['type']); setError('') }}><option value="PERMISO">Permiso</option><option value="ANTICIPO">Anticipo</option></select></div>
      <div className="field"><label htmlFor="personal-request-date">Fecha</label><input id="personal-request-date" value={requestDate} readOnly aria-readonly="true" /></div>
      <div className="field full-width-field"><label htmlFor="personal-request-observation">Observación <span>Obligatorio</span></label><textarea id="personal-request-observation" value={observation} onChange={event => { setObservation(event.target.value.slice(0, 500)); setError('') }} maxLength={500} rows={4} placeholder="Describe el motivo de la solicitud" /><small className="field-help">Máximo 500 caracteres · {observation.length}/500.</small></div>
      {type === 'ANTICIPO' ? <>
        <div className="field"><label htmlFor="personal-request-value">Valor <span>Obligatorio</span></label><input id="personal-request-value" value={value} onChange={event => { setValue(event.target.value.replace(',', '.').replace(/[^\d.]/g, '').slice(0, 12)); setError('') }} inputMode="decimal" placeholder="0.00" /></div>
        <div className="field"><label htmlFor="personal-request-application-form">Forma Aplicación <span>Obligatorio</span></label><select id="personal-request-application-form" value={applicationForm} onChange={event => { setApplicationForm(event.target.value as 'CUOTAS' | 'TOTAL'); setError('') }}><option value="CUOTAS">Cuotas</option><option value="TOTAL">Total</option></select></div>
        {applicationForm === 'CUOTAS' && <div className="field"><label htmlFor="personal-request-installments"># de Cuotas <span>Obligatorio</span></label><input id="personal-request-installments" value={installments} onChange={event => { setInstallments(event.target.value.replace(/\D/g, '').slice(0, 3)); setError('') }} inputMode="numeric" placeholder="Ej. 3" /></div>}
        <div className="field"><label htmlFor="personal-request-start-period">Periodo Inicio <span>Obligatorio</span></label><select id="personal-request-start-period" value={startPeriod} disabled={!openPeriods.length} onChange={event => { setStartPeriod(event.target.value); setError('') }}><option value="">Selecciona un período abierto</option>{openPeriods.map(period => <option key={period.key} value={period.key}>{period.label}</option>)}</select>{!openPeriods.length && <small className="field-error">No existen períodos abiertos en Períodos Habilitados.</small>}</div>
        <div className="field full-width-field"><label>Periodo de Aplicación <span>Obligatorio</span></label><div className="radio-group"><label><input type="radio" name="personal-request-application-period" checked={applicationPeriod === 'QUINCENA'} onChange={() => setApplicationPeriod('QUINCENA')} /> Quincena</label><label><input type="radio" name="personal-request-application-period" checked={applicationPeriod === 'FIN_MES'} onChange={() => setApplicationPeriod('FIN_MES')} /> Fin de Mes</label><label><input type="radio" name="personal-request-application-period" checked={applicationPeriod === 'AMBOS'} onChange={() => setApplicationPeriod('AMBOS')} /> Ambos</label></div></div>
      </> : <>
        <div className="field"><label htmlFor="personal-request-from">Fecha Desde <span>Obligatorio</span></label><input id="personal-request-from" type="date" value={fromDate} onChange={event => { setFromDate(event.target.value); setError('') }} /></div>
        <div className="field"><label htmlFor="personal-request-to">Fecha Hasta <span>Obligatorio</span></label><input id="personal-request-to" type="date" value={toDate} min={fromDate || undefined} onChange={event => { setToDate(event.target.value); setError('') }} /></div>
      </>}
      <div className="field full-width-field"><label htmlFor="personal-request-status">Estado</label><input id="personal-request-status" value="Notificada" readOnly aria-readonly="true" /></div>
    </div>
    <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary"><Plus size={17} /> Crear Solicitud</button></div>
  </form></Dialog>
}

function DisciplinaryDisputeDialog({ record, onClose, onSave }: { record: DisciplinaryRecord; onClose: () => void; onSave: (reason: string, supportFileName?: string, supportFileData?: string) => void }) {
  const [reason, setReason] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reason.trim()) { setError('Describe el motivo de la impugnación.'); return }
    if (file && file.size > 5 * 1024 * 1024) { setError('El archivo de soporte no puede superar 5 MB.'); return }
    let supportFileData: string | undefined
    if (file) supportFileData = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file) })
    onSave(reason.trim(), file?.name, supportFileData)
  }
  return <Dialog title="Impugnar multa o falta" description={`${disciplinaryTypeLabel(record.type)} · ${record.date.split('-').reverse().join('/')}`} onClose={onClose}><form onSubmit={event => { void submit(event) }} noValidate>
    {error && <div className="form-error" role="alert"><strong>No se puede enviar la impugnación.</strong><span>{error}</span></div>}
    <div className="field"><label htmlFor="disciplinary-dispute-reason">Soporte de Impugnación <span>Obligatorio</span></label><textarea id="disciplinary-dispute-reason" value={reason} onChange={event => { setReason(event.target.value.slice(0, 500)); setError('') }} maxLength={500} rows={6} placeholder="Explica el motivo y los antecedentes de tu impugnación" /><small className="field-help">Máximo 500 caracteres · {reason.length}/500.</small></div>
    <div className="disciplinary-file-field"><label className="button secondary file-picker"><Upload size={18} /> {file ? 'Cambiar archivo de soporte' : 'Cargar archivo de soporte'}<input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={event => { setFile(event.target.files?.[0] ?? null); setError('') }} /></label>{file && <div className="selected-support-file"><FileText size={18} /><div><strong>{file.name}</strong><span>{(file.size / 1024).toFixed(1)} KB</span></div></div>}</div>
    <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary"><X size={17} /> Enviar impugnación</button></div>
  </form></Dialog>
}

function PersonalHistoryPage({ employees, contractHistory, catalogs }: { employees: Employee[]; contractHistory: Record<string, ContractHistoryLine[]>; catalogs: Catalogs }) {
  const employee = employees.find(item => item.status === 'ACTIVO') ?? employees[0]
  const lines = employee ? contractHistory[employee.id] ?? [] : []
  const payrollGroupName = (id?: string) => catalogs['grupos-nomina'].find(group => group.id === id)?.name ?? '—'
  const lineSort = useSortableRows(lines, { contract: row => row.contractNumber, startDate: row => row.startDate.split('/').reverse().join('-'), endDate: row => row.endDate ? row.endDate.split('/').reverse().join('-') : '', exitReason: row => row.exitReason, department: row => row.department, role: row => row.role, payrollGroup: row => payrollGroupName(row.payrollGroupId), salary: row => decimalToCents(row.salary) })
  return <>
    <PageHeader eyebrow="Información Personal / Mi Historial" title="Mi Historial" description="Consulta tu historial contractual y los cambios laborales registrados." />
    <div className="personal-employee-strip"><div><span>Empleado</span><strong>{employee?.name ?? 'Sin empleado activo'}</strong></div><div><span>Identificación</span><strong>{employee?.document ?? 'Sin dato'}</strong></div><div><span>Estado</span><strong>{employee?.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</strong></div></div>
    <section className="panel table-panel personal-history-panel">
      <div className="panel-heading"><div><h2>Historial de contratos</h2></div><Badge tone="neutral">{lines.length} {lines.length === 1 ? 'línea' : 'líneas'}</Badge></div>
      <div className="table-scroll" role="region" aria-label="Mi historial de contratos" tabIndex={0}><table className="contract-history-table"><thead><tr><SortableTh label="Contrato" sortKey="contract" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Fecha Inicio" sortKey="startDate" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Fecha Fin" sortKey="endDate" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Motivo de Salida" sortKey="exitReason" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Departamento" sortKey="department" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Cargo" sortKey="role" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Grupo de Nómina" sortKey="payrollGroup" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Sueldo" sortKey="salary" sort={lineSort.sort} onSort={lineSort.toggleSort} className="numeric" /></tr></thead><tbody>
        {lineSort.sortedRows.map(line => { const index = lines.findIndex(item => item.id === line.id); const lineNumber = lines.slice(0, index + 1).filter(item => item.contractNumber === line.contractNumber).length; return <tr key={line.id}><td><strong>{line.contractNumber}</strong><span className="cell-meta">Línea {lineNumber}</span></td><td>{line.startDate}{line.effectiveDate && <span className="cell-meta">Modificación: {line.effectiveDate}</span>}</td><td>{line.endDate || '—'}</td><td>{line.exitReason || '—'}</td><td>{line.department}</td><td>{line.role}</td><td>{payrollGroupName(line.payrollGroupId)}</td><td className="numeric money">{line.salary ? money(line.salary) : '—'}</td></tr> })}
        {!lines.length && <tr><td colSpan={8}><div className="empty-state"><FileClock /><strong>Sin contratos registrados</strong><p>Tu historial aparecerá cuando se registre la primera línea contractual.</p></div></td></tr>}
      </tbody></table></div>
      <div className="table-footer"><span>{lines.length} {lines.length === 1 ? 'línea contractual' : 'líneas contractuales'}</span><span>Historial de solo lectura</span></div>
    </section>
  </>
}

function PersonalVacationPage({ employees, pendingRecords, requests, setRequests }: { employees: Employee[]; pendingRecords: VacationPendingRecord[]; requests: VacationRequestRecord[]; setRequests: Dispatch<SetStateAction<VacationRequestRecord[]>> }) {
  const [requestOpen, setRequestOpen] = useState(false)
  const [message, setMessage] = useState('')
  const employee = employees.find(item => item.status === 'ACTIVO') ?? employees[0]
  const periods = employee ? completedVacationPeriods(employee.startDate).sort((a, b) => b.localeCompare(a)).slice(0, 3) : []
  const balances = periods.map(period => ({ period, ...vacationPendingBalance(employee, period, pendingRecords, requests) }))
  const normalTotal = balances.reduce((sum, balance) => sum + balance.normal, 0)
  const additionalTotal = balances.reduce((sum, balance) => sum + balance.additional, 0)
  const movements = requests.filter(record => record.employeeId === employee?.id && record.liquidationStatus !== 'PROCESADA').flatMap(record => record.movements.map(movement => ({ ...movement, period: record.vacationPeriod }))).sort((a, b) => vacationDateToIso(b.requestDate).localeCompare(vacationDateToIso(a.requestDate)))

  const saveRequest = (movement: VacationMovement) => {
    if (!employee) return
    const chronologicalPeriods = [...periods].reverse()
    const targetPeriod = chronologicalPeriods.find(period => {
      const balance = vacationPendingBalance(employee, period, pendingRecords, requests)
      return movement.type === 'NORMAL' ? balance.normal >= movement.days : balance.additional >= movement.days
    })
    if (!targetPeriod) return
    const balance = vacationPendingBalance(employee, targetPeriod, pendingRecords, requests)
    setRequests(current => {
      const existing = movement.approval === 'APROBADA' ? current.find(record => record.employeeId === employee.id && record.liquidationStatus !== 'PROCESADA' && normalizeVacationPeriod(record.vacationPeriod, employee.startDate) === targetPeriod && record.movements.every(item => item.approval !== 'PENDIENTE')) : undefined
      if (existing) return current.map(record => record.id === existing.id ? { ...record, movements: [...record.movements, movement], createdAt: vacationDateToIso(movement.requestDate) } : record)
      return [{ id: `VAC-PER-${Date.now()}`, employeeId: employee.id, vacationPeriod: targetPeriod, generatedDays: 15, additionalGeneratedDays: Math.max(0, balance.additional), openingNormalPendingDays: balance.normal, openingAdditionalPendingDays: balance.additional, createdAt: vacationDateToIso(movement.requestDate), movements: [movement] }, ...current]
    })
    setRequestOpen(false)
    setMessage(`La solicitud quedó registrada con aprobación ${movement.approval === 'APROBADA' ? 'Aprobada' : 'Pendiente'}.`)
  }

  return <>
    <PageHeader eyebrow="Información Personal / Vacaciones" title="Vacaciones" description="Consulta tus saldos disponibles y registra nuevas solicitudes de vacaciones." />
    <div className="personal-employee-strip"><div><span>Empleado</span><strong>{employee?.name ?? 'Sin empleado activo'}</strong></div><div><span>Identificación</span><strong>{employee?.document ?? 'Sin dato'}</strong></div><div><span>Fecha de ingreso</span><strong>{employee ? employeeEntryDate(employee.startDate) : 'Sin dato'}</strong></div></div>
    {message && <div className="notice info"><CheckCircle2 size={20} /><div><strong>Solicitud registrada</strong><p>{message}</p></div></div>}
    <section className="panel personal-vacation-summary">
      <div className="panel-heading"><div><h2>Días de vacaciones disponibles</h2><p>Saldos de los tres últimos períodos completados, según el Reporte Días Pendientes.</p></div><Badge tone="neutral">{periods.length} períodos</Badge></div>
      <div className="personal-vacation-totals"><div><span>Total Días Normales</span><strong>{pendingDaysLabel(normalTotal)}</strong><small>Disponibles</small></div><div><span>Total Días Adicionales</span><strong>{pendingDaysLabel(additionalTotal)}</strong><small>Disponibles</small></div><div className="accent"><span>Total disponible</span><strong>{pendingDaysLabel(normalTotal + additionalTotal)}</strong><small>Normales y adicionales</small></div></div>
      <div className="table-scroll" role="region" aria-label="Resumen de vacaciones por período" tabIndex={0}><table className="personal-vacation-periods"><thead><tr><th>Período</th><th className="numeric">Días Normales</th><th className="numeric">Días Adicionales</th><th className="numeric">Total</th></tr></thead><tbody>{balances.map(balance => <tr key={balance.period}><td><strong>{employee ? vacationPeriodLabel(balance.period, employee.startDate) : balance.period}</strong></td><td className="numeric">{pendingDaysLabel(balance.normal)}</td><td className="numeric">{pendingDaysLabel(balance.additional)}</td><td className="numeric"><strong>{pendingDaysLabel(balance.normal + balance.additional)}</strong></td></tr>)}{!balances.length && <tr><td colSpan={4}><div className="empty-state compact"><CalendarDays /><strong>Sin períodos completados</strong><p>Los saldos aparecerán cuando el empleado complete su primer período.</p></div></td></tr>}</tbody></table></div>
    </section>
    <section className="panel table-panel personal-vacation-requests">
      <div className="panel-heading"><div><h2>Mis solicitudes</h2><p>Consulta las solicitudes registradas y su estado de aprobación.</p></div><Badge tone="neutral">{movements.length} solicitudes</Badge></div>
      <div className="table-scroll" role="region" aria-label="Solicitudes personales de vacaciones" tabIndex={0}><table><thead><tr><th>Fecha Solicitud</th><th>Tipo</th><th>Desde</th><th>Hasta</th><th className="numeric"># Días</th><th>Gozadas/Pagadas</th><th>Aprobación</th></tr></thead><tbody>{movements.map(movement => <tr key={movement.id}><td>{movement.requestDate}</td><td>{movement.type === 'NORMAL' ? 'Normales' : 'Adicionales'}</td><td>{movement.fromDate}</td><td>{movement.toDate}</td><td className="numeric"><strong>{movement.days}</strong></td><td>{movement.settlement === 'GOZADAS' ? 'Gozadas' : 'Pagadas'}</td><td><Badge tone={movement.approval === 'PENDIENTE' ? 'warning' : 'success'}>{movement.approval === 'PENDIENTE' ? 'Pendiente' : 'Aprobada'}</Badge></td></tr>)}{!movements.length && <tr><td colSpan={7}><div className="empty-state compact"><CalendarDays /><strong>Sin solicitudes</strong><p>Usa el botón inferior para registrar la primera solicitud.</p></div></td></tr>}</tbody></table></div>
      <div className="personal-vacation-action"><div><strong>¿Deseas solicitar vacaciones?</strong><span>El sistema validará automáticamente el saldo disponible.</span></div><button type="button" className="button primary" onClick={() => setRequestOpen(true)} disabled={!employee || !periods.length}><Plus size={18} /> Nueva Solicitud de Vacaciones</button></div>
    </section>
    {requestOpen && employee && <PersonalVacationRequestDialog employee={employee} periods={balances} onClose={() => setRequestOpen(false)} onSave={saveRequest} />}
  </>
}

function PersonalVacationRequestDialog({ employee, periods, onClose, onSave }: { employee: Employee; periods: Array<{ period: string; normal: number; additional: number }>; onClose: () => void; onSave: (movement: VacationMovement) => void }) {
  const [type, setType] = useState<VacationMovement['type']>('NORMAL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [settlement, setSettlement] = useState<VacationMovement['settlement']>('GOZADAS')
  const [approval, setApproval] = useState<NonNullable<VacationMovement['approval']>>('PENDIENTE')
  const [error, setError] = useState('')
  const requestDate = currentEcuadorDate()
  const days = vacationInclusiveDays(fromDate, toDate)
  const available = periods.reduce((sum, period) => sum + (type === 'NORMAL' ? period.normal : period.additional), 0)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!parseVacationDate(fromDate) || !parseVacationDate(toDate) || days < 1) { setError('Ingresa un rango Desde/Hasta válido.'); return }
    if (settlement === 'PAGADAS' && type !== 'ADICIONAL') { setError('Únicamente los días adicionales pueden ser pagados.'); return }
    if (days > available || !periods.some(period => (type === 'NORMAL' ? period.normal : period.additional) >= days)) { setError(`No existe un período con ${days} días ${type === 'NORMAL' ? 'normales' : 'adicionales'} disponibles.`); return }
    onSave({ id: `VAC-PER-MOV-${Date.now()}`, type, requestDate, fromDate, toDate, days, settlement, approval })
  }
  return <Dialog title="Nueva Solicitud de Vacaciones" description={`${employee.name} · ${employee.document}`} onClose={onClose}><form className="personal-vacation-form" onSubmit={submit} noValidate>
    {error && <div className="form-error" role="alert"><strong>No se puede registrar la solicitud.</strong><span>{error}</span></div>}
    <div className="form-grid">
      <div className="field"><label htmlFor="personal-vacation-request-date">Fecha de Solicitud</label><input id="personal-vacation-request-date" value={requestDate} readOnly aria-readonly="true" /></div>
      <div className="field"><label htmlFor="personal-vacation-type">Tipo</label><select id="personal-vacation-type" value={type} onChange={event => { const nextType = event.target.value as VacationMovement['type']; setType(nextType); if (nextType === 'NORMAL') setSettlement('GOZADAS'); setError('') }}><option value="NORMAL">Normales</option><option value="ADICIONAL">Adicionales</option></select><small className="field-help">Disponibles: {pendingDaysLabel(available)} días</small></div>
      <div className="field"><label htmlFor="personal-vacation-from">Desde</label><input id="personal-vacation-from" value={fromDate} onChange={event => { setFromDate(vacationDateDraft(event.target.value)); setError('') }} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} /></div>
      <div className="field"><label htmlFor="personal-vacation-to">Hasta</label><input id="personal-vacation-to" value={toDate} onChange={event => { setToDate(vacationDateDraft(event.target.value)); setError('') }} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} /></div>
      <div className="field"><label htmlFor="personal-vacation-days"># Días</label><input id="personal-vacation-days" value={days || ''} readOnly placeholder="Cálculo automático" /></div>
      <div className="field"><label htmlFor="personal-vacation-settlement">Gozadas/Pagadas</label><select id="personal-vacation-settlement" value={settlement} onChange={event => setSettlement(event.target.value as VacationMovement['settlement'])}><option value="GOZADAS">Gozadas</option>{type === 'ADICIONAL' && <option value="PAGADAS">Pagadas</option>}</select></div>
      <div className="field full-width-field"><label htmlFor="personal-vacation-approval">Aprobación</label><select id="personal-vacation-approval" value={approval} onChange={event => setApproval(event.target.value as NonNullable<VacationMovement['approval']>)}><option value="PENDIENTE">Pendiente</option><option value="APROBADA">Aprobada</option></select></div>
    </div>
    <div className="notice info personal-vacation-rule"><AlertTriangle size={20} /><div><strong>Regla de pago</strong><p>Únicamente los días adicionales pueden seleccionarse como Pagadas. Los días normales siempre se registran como Gozadas.</p></div></div>
    <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">Guardar solicitud</button></div>
  </form></Dialog>
}

function PersonalSchedulePage({ clients, employees }: { clients: Client[]; employees: Employee[] }) {
  const [view, setView] = useState<PersonalCalendarView>('SEMANA')
  const [selectedDay, setSelectedDay] = useState('MIE')
  const assignments = storedValue<Record<string, string>>('nomina-asignacion-empleados', {})
  const employee = employees.find(item => item.status === 'ACTIVO') ?? employees[0]
  const assignment = Object.entries(assignments).find(([, employeeId]) => employeeId === employee?.id)
  const [assignedClientCode, assignedContractId, assignedPositionKey] = assignment?.[0].split('|') ?? []
  const client = clients.find(item => item.code === assignedClientCode) ?? clients.find(item => item.status === 'ACTIVO') ?? clients[0]
  const contracts = client?.operationalContracts?.length ? client.operationalContracts : client ? [emptyOperationalContract(client, `AUTO-${client.code}`)] : []
  const contract = contracts.find(item => item.id === assignedContractId) ?? contracts[0]
  const schedulePositionKey = assignedPositionKey || '1'
  const positionLabel = schedulePositionKey.startsWith('SUPERVISOR_FIJO_') ? `Supervisor Fijo ${String(Number(schedulePositionKey.split('_').at(-1)) || 1).padStart(2, '0')}` : schedulePositionKey === 'SUPERVISOR_COMPARTIDO' ? 'Supervisor Compartido' : `Posición ${String(Math.max(1, Number(schedulePositionKey) || 1)).padStart(2, '0')}`
  const configuredCells = contract?.schedules?.[schedulePositionKey] ?? []
  const cycleDays = contract?.scheduleCycleDays?.[schedulePositionKey] ?? 0
  const normalizedCells = configuredCells.map(cell => {
    if (!cell.startsWith('DIA')) return cell
    const separatorIndex = cell.lastIndexOf('-')
    const cycleIndex = Number(cell.slice(3, separatorIndex)) - 1
    return cycleIndex >= 0 && cycleIndex < operationalWeek.length ? `${operationalWeek[cycleIndex].key}-${cell.slice(separatorIndex + 1)}` : cell
  })
  const displayedCells = normalizedCells.length ? normalizedCells : operationalWeek.slice(0, 5).flatMap(day => Array.from({ length: 8 }, (_, index) => `${day.key}-${index + 8}`))
  const scheduled = new Set(displayedCells)
  const hours = Array.from({ length: 17 }, (_, index) => index + 6)
  const weekDates = [19, 20, 21, 22, 23, 24, 25]
  const selectedIndex = Math.max(0, operationalWeek.findIndex(day => day.key === selectedDay))
  const branch = client?.branches?.find(item => item.name === contract?.location) ?? client?.branches?.[0]
  const clientAddress = branch?.address || client?.address || 'Sin dirección registrada'
  const clientPhone = branch?.phone || client?.phone || 'Sin teléfono registrado'
  const clientGps = branch?.gpsLocation || client?.gpsLocation || ''
  const monthPadding = Array.from({ length: 4 }, (_, index) => `empty-${index}`)
  const monthDays = Array.from({ length: 31 }, (_, index) => index + 1)
  const scheduleSummary = contract ? positionScheduleSummary({ ...contract, schedules: { ...contract.schedules, [schedulePositionKey]: displayedCells } }, schedulePositionKey) : []
  const referenceData = !assignment || !configuredCells.length

  return <>
    <PageHeader eyebrow="Información Personal / Mi Horario" title="Mi Horario" description="Consulta tu jornada y el cliente asignado en vistas diaria, semanal o mensual." />
    <div className="personal-employee-strip">
      <div><span>Empleado</span><strong>{employee?.name ?? 'Sin empleado activo'}</strong></div>
      <div><span>Cargo</span><strong>{employee?.role ?? 'Sin cargo'}</strong></div>
      <div><span>Posición</span><strong>{contract ? `${contract.contractName} · ${positionLabel}` : 'Sin asignación'}</strong></div>
    </div>
    {referenceData && <div className="notice info personal-schedule-notice"><CalendarDays size={20} /><div><strong>Vista referencial</strong><p>{!assignment ? 'Asigna este empleado a una posición para vincular su horario real. ' : ''}{!configuredCells.length ? 'Mientras se configura el horario, se muestra una jornada de lunes a viernes de 08:00 a 16:00.' : ''}</p></div></div>}
    <section className="personal-schedule-layout">
      <div className="panel personal-calendar-panel">
        <div className="personal-calendar-toolbar">
          <div><p className="breadcrumb">OCTUBRE 2026</p><h2>{view === 'SEMANA' ? '19 — 25 de octubre' : view === 'DIA' ? `${operationalWeek[selectedIndex].label}, ${weekDates[selectedIndex]} de octubre` : 'Octubre 2026'}</h2></div>
          <div className="calendar-view-switch" role="group" aria-label="Vista del calendario">
            {(['DIA', 'SEMANA', 'MES'] as PersonalCalendarView[]).map(option => <button type="button" key={option} className={view === option ? 'active' : ''} onClick={() => setView(option)}>{option === 'DIA' ? 'Día' : option === 'SEMANA' ? 'Semana' : 'Mes'}</button>)}
          </div>
        </div>

        {view === 'SEMANA' && <div className="personal-calendar-scroll" role="region" aria-label="Horario semanal" tabIndex={0}>
          <div className="personal-week-calendar">
            <div className="calendar-corner">Hora</div>
            {operationalWeek.map((day, index) => <button type="button" key={day.key} className={`personal-day-heading ${day.key === selectedDay ? 'selected' : ''}`} onClick={() => { setSelectedDay(day.key); setView('DIA') }}><strong>{day.label.slice(0, 3)}</strong><span>{weekDates[index]}</span></button>)}
            {hours.flatMap(hour => [<div className="personal-time-label" key={`time-${hour}`}>{String(hour).padStart(2, '0')}:00</div>, ...operationalWeek.map(day => <div key={`${day.key}-${hour}`} className={`personal-calendar-cell ${scheduled.has(`${day.key}-${hour}`) ? 'scheduled' : ''}`}>{scheduled.has(`${day.key}-${hour}`) && <span>{contract?.location || 'Turno asignado'}</span>}</div>)])}
          </div>
        </div>}

        {view === 'DIA' && <div className="personal-day-view">
          <div className="personal-day-picker">{operationalWeek.map((day, index) => <button type="button" key={day.key} className={day.key === selectedDay ? 'active' : ''} onClick={() => setSelectedDay(day.key)}><span>{day.label.slice(0, 3)}</span><strong>{weekDates[index]}</strong></button>)}</div>
          <div className="personal-day-hours">{hours.map(hour => <div className="personal-day-hour" key={hour}><time>{String(hour).padStart(2, '0')}:00</time><div className={scheduled.has(`${selectedDay}-${hour}`) ? 'scheduled' : ''}>{scheduled.has(`${selectedDay}-${hour}`) && <><strong>Turno asignado</strong><span>{contract?.location || client?.businessName}</span></>}</div></div>)}</div>
        </div>}

        {view === 'MES' && <div className="personal-month-view">
          <div className="personal-month-weekdays">{operationalWeek.map(day => <span key={day.key}>{day.label.slice(0, 3)}</span>)}</div>
          <div className="personal-month-grid">{monthPadding.map(key => <div className="outside-month" key={key} />)}{monthDays.map(day => { const weekdayIndex = (4 + day - 1) % 7; const dayKey = operationalWeek[weekdayIndex].key; const works = hours.some(hour => scheduled.has(`${dayKey}-${hour}`)); return <button type="button" key={day} className={works ? 'has-shift' : ''} onClick={() => { setSelectedDay(dayKey); setView('DIA') }}><span>{day}</span>{works && <small>Turno asignado</small>}</button> })}</div>
        </div>}

        <div className="personal-calendar-legend"><span><i /> Horario asignado</span>{cycleDays > 0 && <Badge tone="neutral">Ciclo de {cycleDays} días</Badge>}</div>
      </div>

      <aside className="panel assigned-client-card">
        <div className="assigned-client-heading"><div className="assigned-client-icon"><Building2 /></div><div><p className="breadcrumb">CLIENTE ASIGNADO</p><h2>{client?.businessName ?? 'Sin cliente asignado'}</h2></div></div>
        <dl className="assigned-client-details">
          <div><dt>Nombre</dt><dd>{client?.businessName ?? 'Sin asignación'}</dd></div>
          <div><dt>Dirección</dt><dd>{clientAddress}</dd></div>
          <div><dt>Teléfono</dt><dd>{clientPhone}</dd></div>
          <div><dt>Ubicación GPS</dt><dd>{clientGps ? /^https?:\/\//i.test(clientGps) ? <a href={clientGps} target="_blank" rel="noreferrer"><MapPin size={16} /> Abrir ubicación</a> : <span className="gps-coordinate"><MapPin size={16} />{clientGps}</span> : 'Sin ubicación GPS registrada'}</dd></div>
        </dl>
        <div className="assigned-shift-summary"><h3>Resumen del horario</h3>{scheduleSummary.length ? scheduleSummary.map(item => <span key={item}><Clock3 size={15} />{item}</span>) : <p>Sin horario configurado.</p>}</div>
      </aside>
    </section>
  </>
}

function spreadsheetEmployeeDate(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) return `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${parsed.y}`
  }
  const text = String(value ?? '').trim()
  const match = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(text)
  if (!match) return ''
  const candidate = `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`
  const [day, month, year] = candidate.split('/').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? candidate : ''
}

async function readEmployeeInformationFile(file: File, employees: Employee[], catalogs: Catalogs) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) throw new Error('El archivo no contiene hojas de cálculo.')
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], { header: 1, raw: true, defval: '' })
  const headerIndex = rows.findIndex(row => {
    const headers = row.map(normalizeSpreadsheetHeader)
    return ['documento', 'identificacion', 'nombres', 'apellidos', 'departamento', 'cargo', 'sueldo', 'fecha ingreso'].every(header => headers.includes(header))
  })
  if (headerIndex < 0) throw new Error('No se encontró la estructura esperada de la plantilla de empleados.')
  const headers = rows[headerIndex].map(normalizeSpreadsheetHeader)
  const indexOf = (header: string) => headers.indexOf(header)
  const indexes = { documentType: indexOf('documento'), identification: indexOf('identificacion'), names: indexOf('nombres'), lastNames: indexOf('apellidos'), department: indexOf('departamento'), role: indexOf('cargo'), salary: indexOf('sueldo'), entryDate: indexOf('fecha ingreso') }
  const existingDocuments = new Set(employees.map(employee => employee.document.toLocaleUpperCase('es')))
  const seen = new Set<string>()
  const activeDepartments = catalogs.departamentos.filter(item => item.status === 'ACTIVO')
  const activeRoles = catalogs.cargos.filter(item => item.status === 'ACTIVO')
  const findCatalogName = (value: string, records: CatalogRecord[]) => records.find(item => normalizeSpreadsheetHeader(item.name) === normalizeSpreadsheetHeader(value))?.name ?? ''
  const records = rows.slice(headerIndex + 1).flatMap((row, index) => {
    if (!row.some(value => String(value ?? '').trim())) return []
    const documentTypeText = String(row[indexes.documentType] ?? '').trim().toLocaleUpperCase('es')
    const documentType: EmployeeImportRow['documentType'] = documentTypeText === 'CEDULA' || documentTypeText === 'CÉDULA' ? 'CEDULA' : documentTypeText === 'PASAPORTE' ? 'PASAPORTE' : ''
    const identification = String(row[indexes.identification] ?? '').trim().replace(documentType === 'CEDULA' ? /\D/g : /[^A-Za-z0-9]/g, '').toLocaleUpperCase('es')
    const names = String(row[indexes.names] ?? '').trim().replace(/\s+/g, ' ')
    const lastNames = String(row[indexes.lastNames] ?? '').trim().replace(/\s+/g, ' ')
    const businessName = `${lastNames} ${names}`.trim()
    const departmentInput = String(row[indexes.department] ?? '').trim()
    const roleInput = String(row[indexes.role] ?? '').trim()
    const department = findCatalogName(departmentInput, activeDepartments)
    const role = findCatalogName(roleInput, activeRoles)
    const salary = spreadsheetSalary(row[indexes.salary])
    const entryDate = spreadsheetEmployeeDate(row[indexes.entryDate])
    const normalizedDocument = identification.toLocaleUpperCase('es')
    const validationIssues = [
      !documentType && 'Documento debe ser CÉDULA o PASAPORTE',
      documentType === 'CEDULA' && !/^\d{10}$/.test(identification) && 'La cédula debe tener 10 dígitos',
      documentType === 'PASAPORTE' && !/^[A-Z0-9]{1,20}$/.test(identification) && 'El pasaporte debe ser alfanumérico y tener máximo 20 caracteres',
      (!names || !/^[\p{L}\s'-]+$/u.test(names)) && 'Nombres inválidos',
      (!lastNames || !/^[\p{L}\s'-]+$/u.test(lastNames)) && 'Apellidos inválidos',
      !department && `Departamento no registrado: ${departmentInput || 'sin dato'}`,
      !role && `Cargo no registrado: ${roleInput || 'sin dato'}`,
      !salary && 'Sueldo inválido',
      !entryDate && 'Fecha de ingreso inválida',
      existingDocuments.has(normalizedDocument) && 'La identificación ya existe',
      seen.has(normalizedDocument) && 'Identificación duplicada en el archivo',
    ].filter(Boolean) as string[]
    if (normalizedDocument && !seen.has(normalizedDocument)) seen.add(normalizedDocument)
    return [{ id: `EMP-IMPORT-${Date.now()}-${index}`, documentType, identification, names, lastNames, businessName, department: department || departmentInput, role: role || roleInput, salary, entryDate, validationIssues } satisfies EmployeeImportRow]
  })
  if (!records.length) throw new Error('El archivo no contiene empleados para cargar.')
  return records
}

function EmployeeInformationImportPage({ employees, catalogs, uploads, setUploads, context, onImport, onDeleteImportedEmployees }: { employees: Employee[]; catalogs: Catalogs; uploads: EmployeeInformationUpload[]; setUploads: Dispatch<SetStateAction<EmployeeInformationUpload[]>>; context: ReactNode; onImport: (packages: ImportedEmployeePackage[]) => void; onDeleteImportedEmployees: (employeeIds: string[]) => void }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null)
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null)
  const selectedUpload = uploads.find(upload => upload.id === selectedUploadId)
  const deletingUpload = uploads.find(upload => upload.id === deletingUploadId)
  const uploadSort = useSortableRows(uploads, { fileName: row => row.fileName, importedAt: row => row.importedAt, user: row => row.user, status: row => row.status })
  useEffect(() => {
    if (!selectedUploadId) return
    setUploads(current => current.map(upload => upload.id === selectedUploadId && upload.status === 'PENDIENTE' && !upload.reviewed ? { ...upload, reviewed: true } : upload))
  }, [selectedUploadId, setUploads])

  const selectFile = async (file?: File) => {
    if (!file) return
    rememberUploadedFile(file)
    setLoading(true); setMessage('')
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera el tamaño máximo de 10 MB.')
      if (!/\.xlsx?$/i.test(file.name)) throw new Error('Selecciona un archivo XLS o XLSX.')
      const records = await readEmployeeInformationFile(file, employees, catalogs)
      const inconsistentRows = records.filter(record => record.validationIssues.length).length
      const upload: EmployeeInformationUpload = { id: `EMP-UP-${Date.now()}`, fileName: file.name, importedAt: new Date().toISOString(), user: 'Ana Navarro', status: 'PENDIENTE', recordCount: records.length, reviewed: false, records, processedEmployeeIds: [] }
      setUploads(current => [upload, ...current])
      setMessage(`El archivo quedó Pendiente con ${records.length} ${records.length === 1 ? 'fila' : 'filas'}.${inconsistentRows ? ` Se detectaron ${inconsistentRows} con inconsistencias; revísalas con la lupa.` : ' Revísalo con la lupa antes de procesarlo.'}`)
    } catch (error) { setMessage(`Error: ${error instanceof Error ? error.message : 'No fue posible leer el archivo.'}`) }
    finally { setLoading(false) }
  }

  const processUpload = (upload: EmployeeInformationUpload) => {
    if (upload.status !== 'PENDIENTE') return
    if (!upload.reviewed) { setMessage(`Error: revisa primero el archivo ${upload.fileName} mediante el ícono de lupa.`); return }
    const currentDocuments = new Set(employees.map(employee => employee.document.toLocaleUpperCase('es')))
    const refreshedRecords = upload.records.map(record => currentDocuments.has(record.identification.toLocaleUpperCase('es')) && !record.validationIssues.includes('La identificación ya existe') ? { ...record, validationIssues: [...record.validationIssues, 'La identificación ya existe'] } : record)
    const inconsistentRows = refreshedRecords.filter(record => record.validationIssues.length).length
    if (inconsistentRows) {
      setUploads(current => current.map(item => item.id === upload.id ? { ...item, records: refreshedRecords } : item))
      setMessage(`Error: no se puede procesar ${upload.fileName}. Revisa las ${inconsistentRows} ${inconsistentRows === 1 ? 'fila inconsistente' : 'filas inconsistentes'} señaladas en naranja.`)
      return
    }
    const stamp = Date.now()
    const defaultPayrollGroupId = catalogs['grupos-nomina'].find(item => item.status === 'ACTIVO')?.id
    const packages = refreshedRecords.map((record, index) => {
      const employeeId = `EMP-${stamp}-${index + 1}`
      const [day, month, year] = record.entryDate.split('/')
      const employee: Employee = { id: employeeId, document: record.identification, documentType: record.documentType || undefined, names: record.names, lastNames: record.lastNames, businessName: record.businessName, name: `${record.names} ${record.lastNames}`.trim(), role: record.role, area: record.department, salary: record.salary, status: 'ACTIVO', startDate: `${year}-${month}-${day}`, payrollGroupId: defaultPayrollGroupId }
      const contract: ContractHistoryLine = { id: `${employeeId}-C1-L1`, contractNumber: 1, startDate: record.entryDate, endDate: '', exitReason: '', exitReasonDetail: '', department: record.department, role: record.role, salary: record.salary, payrollGroupId: defaultPayrollGroupId }
      return { employee, contract }
    })
    onImport(packages)
    setUploads(current => current.map(item => item.id === upload.id ? { ...item, status: 'PROCESADO', processedEmployeeIds: packages.map(entry => entry.employee.id), records: refreshedRecords } : item))
    setMessage(`${packages.length} ${packages.length === 1 ? 'empleado fue incorporado' : 'empleados fueron incorporados'} al maestro. El archivo cambió a estado Procesado.`)
  }

  const deleteUpload = (upload: EmployeeInformationUpload) => {
    if (upload.processedEmployeeIds.length) onDeleteImportedEmployees(upload.processedEmployeeIds)
    setUploads(current => current.map(item => item.id === upload.id ? { ...item, status: 'ELIMINADO', records: [], processedEmployeeIds: [] } : item))
    setSelectedUploadId(current => current === upload.id ? null : current); setDeletingUploadId(null)
    setMessage(`Se eliminó toda la información asociada al archivo ${upload.fileName}.`)
  }

  return <>
    <PageHeader eyebrow="Empleado / Carga de Información de Empleados" title="Carga de Información de Empleados" description="Carga archivos pendientes, revisa sus datos y procesa únicamente información consistente." action={<a className="button secondary" href="/Ejemplo%20Informaci%C3%B3n%20de%20Empleados.xlsx" download="Ejemplo Información de Empleados.xlsx"><Download size={18} /> Descargar archivo de ejemplo</a>} />
    {context}
    <section className="overtime-upload-section"><div className="panel import-card salary-import-card overtime-upload-card"><div className="import-icon"><Upload /></div><h2>Importar empleados</h2><p>El archivo queda Pendiente. Revísalo con la lupa y luego procésalo con el ícono de play.</p><label className="button primary file-picker"><Upload size={18} /> {loading ? 'Validando…' : 'Seleccionar archivo'}<input type="file" accept=".xls,.xlsx" disabled={loading} onChange={event => { void selectFile(event.target.files?.[0]); event.currentTarget.value = '' }} /></label><span className="cell-meta">Formatos XLS o XLSX · máximo 10 MB</span></div></section>
    {message && <div className={`notice ${message.startsWith('Error:') ? 'warning' : 'info'}`}>{message.startsWith('Error:') ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}<div><strong>{message.startsWith('Error:') ? 'No se puede procesar el archivo' : 'Operación completada'}</strong><p>{message}</p></div></div>}
    <section className="panel table-panel"><div className="panel-heading"><div><h2>Archivos cargados</h2><p>La lupa valida el detalle. Play procesa la información y borrar elimina todos los datos asociados.</p></div><Badge tone="neutral">{uploads.length} archivos</Badge></div><div className="table-scroll" role="region" aria-label="Archivos de información de empleados" tabIndex={0}><table><thead><tr><SortableTh label="Archivo" sortKey="fileName" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Fecha" sortKey="importedAt" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Usuario" sortKey="user" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Estado" sortKey="status" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><th className="row-action-cell">Detalle</th><th className="row-action-cell">Procesar</th><th className="row-action-cell">Eliminar</th></tr></thead><tbody>{uploadSort.sortedRows.map(upload => { const inconsistentRows = upload.records.filter(record => record.validationIssues.length).length; const eliminated = upload.status === 'ELIMINADO'; return <tr key={upload.id}><td><strong>{upload.fileName}</strong><span className={`cell-meta ${inconsistentRows ? 'warning-text' : ''}`}>{upload.recordCount} {upload.recordCount === 1 ? 'registro' : 'registros'}{inconsistentRows ? ` · ${inconsistentRows} inconsistentes` : ''}</span></td><td>{new Intl.DateTimeFormat('es-EC', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(upload.importedAt))}</td><td>{upload.user}</td><td><Badge tone={upload.status === 'PROCESADO' ? 'success' : upload.status === 'PENDIENTE' ? 'warning' : 'neutral'}>{upload.status === 'PROCESADO' ? 'Procesado' : upload.status === 'PENDIENTE' ? 'Pendiente' : 'Eliminado'}</Badge></td><td className="row-action-cell"><button className="icon-button small edit-icon" disabled={eliminated} onClick={() => setSelectedUploadId(upload.id)} aria-label={`Ver datos de ${upload.fileName}`}><Search size={17} /></button></td><td className="row-action-cell"><button className="icon-button small process-icon" disabled={upload.status !== 'PENDIENTE'} onClick={() => processUpload(upload)} aria-label={`Procesar ${upload.fileName}`}><Play size={17} /></button></td><td className="row-action-cell"><button className="icon-button small delete-icon" disabled={eliminated} onClick={() => setDeletingUploadId(upload.id)} aria-label={`Eliminar ${upload.fileName}`}><Trash2 size={17} /></button></td></tr>})}{!uploadSort.sortedRows.length && <tr><td colSpan={7}><div className="empty-state"><FileText /><strong>Sin archivos cargados</strong><p>Los archivos aparecerán aquí inicialmente en estado Pendiente.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{uploads.length} archivos</span><span>Usuario actual: Ana Navarro</span></div></section>
    {selectedUpload && selectedUpload.status !== 'ELIMINADO' && <EmployeeInformationUploadDetailDialog upload={selectedUpload} onClose={() => setSelectedUploadId(null)} />}
    {deletingUpload && deletingUpload.status !== 'ELIMINADO' && <EmployeeInformationUploadDeleteDialog upload={deletingUpload} onClose={() => setDeletingUploadId(null)} onConfirm={() => deleteUpload(deletingUpload)} />}
  </>
}

function EmployeeInformationUploadDetailDialog({ upload, onClose }: { upload: EmployeeInformationUpload; onClose: () => void }) {
  const inconsistentRows = upload.records.filter(record => record.validationIssues.length).length
  return <Dialog title={upload.fileName} description={`${upload.recordCount} registros cargados`} onClose={onClose} className="dialog-wide"><div className="upload-detail-body"><div className={`notice ${inconsistentRows ? 'warning' : 'info'}`}>{inconsistentRows ? <AlertTriangle size={20} /> : <Search size={20} />}<div><strong>{inconsistentRows ? `${inconsistentRows} ${inconsistentRows === 1 ? 'fila requiere' : 'filas requieren'} revisión` : 'Vista previa validada'}</strong><p>{inconsistentRows ? 'Las filas naranjas contienen inconsistencias y bloquean el procesamiento.' : 'La información está lista para procesarse mediante el ícono de play.'}</p></div></div><div className="table-scroll" role="region" aria-label={`Datos cargados desde ${upload.fileName}`} tabIndex={0}><table><thead><tr><th>Documento</th><th>Identificación</th><th>Nombres</th><th>Apellidos</th><th>Razón Social</th><th>Departamento</th><th>Cargo</th><th>Sueldo</th><th>Fecha Ingreso</th><th>Inconsistencia</th></tr></thead><tbody>{upload.records.map(record => { const inconsistent = record.validationIssues.length > 0; return <tr key={record.id} className={inconsistent ? 'inconsistent-row' : undefined}><td>{record.documentType || 'Sin dato'}</td><td>{record.identification || 'Sin dato'}</td><td>{record.names || 'Sin dato'}</td><td>{record.lastNames || 'Sin dato'}</td><td><strong>{record.businessName || 'Sin dato'}</strong></td><td>{record.department || 'Sin dato'}</td><td>{record.role || 'Sin dato'}</td><td>{record.salary ? money(record.salary) : '—'}</td><td>{record.entryDate || 'Sin dato'}</td><td>{inconsistent ? <span className="validation-message"><AlertTriangle size={15} />{record.validationIssues.join(' · ')}</span> : <span className="validation-ok"><CheckCircle2 size={15} /> Correcto</span>}</td></tr>})}</tbody></table></div><div className="dialog-actions"><button type="button" className="button primary" onClick={onClose}>Cerrar</button></div></div></Dialog>
}

function EmployeeInformationUploadDeleteDialog({ upload, onClose, onConfirm }: { upload: EmployeeInformationUpload; onClose: () => void; onConfirm: () => void }) {
  return <Dialog title="Confirmar eliminación" description={upload.fileName} onClose={onClose}><div className="upload-detail-body"><div className="notice warning"><AlertTriangle size={20} /><div><strong>Esta acción eliminará todos los datos de la carga</strong><p>{upload.status === 'PROCESADO' ? 'También se retirarán del maestro los empleados y contratos creados desde este archivo.' : 'El archivo todavía no fue procesado; se descartarán sus registros pendientes.'} El historial del archivo se conservará con estado Eliminado.</p></div></div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="button" className="button danger-button" onClick={onConfirm}><Trash2 size={17} /> Sí, eliminar</button></div></div></Dialog>
}

function normalizeSalaryPeriod(value: unknown) {
  const text = String(value ?? '').trim()
  const match = /^(\d{4})[-\/]([1-9]|1[0-2])$/.exec(text)
  return match ? `${match[1]}-${match[2].padStart(2, '0')}` : ''
}

function spreadsheetSalary(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value.toFixed(2)
  let text = String(value ?? '').trim().replace(/\s/g, '').replace(/USD|\$/gi, '')
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.')
  const amount = Number(text)
  return Number.isFinite(amount) && amount > 0 ? amount.toFixed(2) : ''
}

function normalizeSpreadsheetHeader(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

async function readHistoricalSalaryFile(file: File, employees: Employee[]) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) throw new Error('El archivo no contiene hojas de cálculo.')
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], { header: 1, raw: false, defval: '' })
  const headerIndex = rows.findIndex(row => {
    const headers = row.map(normalizeSpreadsheetHeader)
    return headers.includes('periodo') && headers.includes('cedula') && headers.includes('nombre') && headers.includes('sueldo')
  })
  if (headerIndex < 0) throw new Error('No se encontraron las columnas Periodo, Cédula, Nombre y Sueldo.')
  const headers = rows[headerIndex].map(normalizeSpreadsheetHeader)
  const indexes = { period: headers.indexOf('periodo'), identification: headers.indexOf('cedula'), employeeName: headers.indexOf('nombre'), salary: headers.indexOf('sueldo') }
  const issues: string[] = []; const seen = new Set<string>()
  const now = new Date().toISOString()
  const records = rows.slice(headerIndex + 1).flatMap((row, index) => {
    if (!row.some(value => String(value ?? '').trim())) return []
    const period = normalizeSalaryPeriod(row[indexes.period])
    const identification = String(row[indexes.identification] ?? '').replace(/\D/g, '')
    const employeeName = String(row[indexes.employeeName] ?? '').trim()
    const salary = spreadsheetSalary(row[indexes.salary])
    const employee = employees.find(item => item.document === identification)
    const key = `${period}|${identification}`
    const errors = [!period && 'Período inválido', !/^\d{10}$/.test(identification) && 'Cédula inválida', !employeeName && 'Nombre vacío', !employee && 'Empleado no registrado en la base de datos', employee && employee.name !== employeeName && 'El nombre no coincide exactamente con el empleado', !salary && 'Sueldo inválido', seen.has(key) && 'Empleado y período duplicados'].filter(Boolean) as string[]
    if (errors.length) issues.push(`Fila ${headerIndex + index + 2}: ${errors.join(', ')}.`)
    else seen.add(key)
    return [{ id: `HIS-${Date.now()}-${index}`, period, identification, employeeName, salary, sourceFile: file.name, importedAt: now, validationIssues: errors } satisfies HistoricalSalaryRecord]
  })
  if (!records.length && !issues.length) throw new Error('El archivo no contiene registros para cargar.')
  return { records, issues }
}

function HistoricalSalaryImportPage({ employees, records, setRecords, uploads, setUploads, context }: { employees: Employee[]; records: HistoricalSalaryRecord[]; setRecords: Dispatch<SetStateAction<HistoricalSalaryRecord[]>>; uploads: HistoricalSalaryUpload[]; setUploads: Dispatch<SetStateAction<HistoricalSalaryUpload[]>>; context: ReactNode }) {
  const [pending, setPending] = useState<HistoricalSalaryRecord[]>([])
  const [issues, setIssues] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionError, setDescriptionError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null)
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null)
  const selectedUpload = uploads.find(upload => upload.id === selectedUploadId)
  const deletingUpload = uploads.find(upload => upload.id === deletingUploadId)
  const filteredUploads = uploads.filter(upload => `${upload.description} ${upload.fileName} ${upload.user} ${upload.status}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  const uploadSort = useSortableRows(filteredUploads, { description: row => row.description, fileName: row => row.fileName, importedAt: row => row.importedAt, user: row => row.user, status: row => row.status })
  useEffect(() => {
    if (!selectedUploadId) return
    setUploads(current => current.map(item => item.id === selectedUploadId && item.status === 'PENDIENTE' && !item.reviewed ? { ...item, reviewed: true } : item))
  }, [selectedUploadId, setUploads])
  const selectFile = async (file?: File) => {
    if (!file) return
    rememberUploadedFile(file)
    setLoading(true); setMessage(''); setPending([]); setIssues([]); setFileName(file.name); setDescriptionError('')
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera el tamaño máximo de 10 MB.')
      const result = await readHistoricalSalaryFile(file, employees); setPending(result.records); setIssues(result.issues)
    } catch (error) { setIssues([error instanceof Error ? error.message : 'No fue posible leer el archivo.']) }
    finally { setLoading(false) }
  }
  const savePendingUpload = () => {
    const cleanDescription = description.trim()
    if (!cleanDescription) { setDescriptionError('Ingresa una descripción para identificar esta carga.'); return }
    if (!pending.length) return
    const uploadId = `HIS-UP-${Date.now()}`; const importedAt = new Date().toISOString(); const uploadedRecords = pending.map(record => ({ ...record, uploadId, importedAt }))
    const inconsistentRows = uploadedRecords.filter(record => record.validationIssues?.length).length
    setUploads(current => [{ id: uploadId, description: cleanDescription, fileName, importedAt, user: 'Ana Navarro', status: 'PENDIENTE', recordCount: uploadedRecords.length, reviewed: false, records: uploadedRecords }, ...current])
    setMessage(`El archivo quedó pendiente con ${uploadedRecords.length} ${uploadedRecords.length === 1 ? 'fila' : 'filas'}.${inconsistentRows ? ` Se detectaron ${inconsistentRows} con inconsistencias; revísalas con la lupa.` : ' Revísalo con la lupa y usa play para procesarlo.'}`)
    setPending([]); setIssues([]); setFileName(''); setDescription(''); setDescriptionError('')
  }
  const processUpload = (upload: HistoricalSalaryUpload) => {
    if (upload.status !== 'PENDIENTE') return
    if (!upload.reviewed) { setMessage(`Error: revisa primero el archivo ${upload.fileName} mediante el ícono de lupa.`); return }
    const inconsistentRows = upload.records.filter(record => record.validationIssues?.length).length
    if (inconsistentRows) { setMessage(`Error: no se puede procesar ${upload.fileName}. Revisa las ${inconsistentRows} ${inconsistentRows === 1 ? 'fila inconsistente' : 'filas inconsistentes'} señaladas en naranja.`); return }
    setRecords(current => { const byKey = new Map(current.map(record => [`${record.period}|${record.identification}`, record])); upload.records.forEach(record => byKey.set(`${record.period}|${record.identification}`, { ...record, uploadId: upload.id, validationIssues: [] })); return [...byKey.values()] })
    setUploads(current => current.map(item => item.id === upload.id ? { ...item, status: 'PROCESADO' } : item))
    setMessage(`${upload.records.length} ${upload.records.length === 1 ? 'registro procesado' : 'registros procesados'} en HISTORICO_SUELDO.`)
  }
  const deleteUpload = (upload: HistoricalSalaryUpload) => {
    setRecords(current => current.filter(record => record.uploadId !== upload.id))
    setUploads(current => current.map(item => item.id === upload.id ? { ...item, status: 'ELIMINADO', records: [] } : item))
    setSelectedUploadId(current => current === upload.id ? null : current); setDeletingUploadId(null)
    setMessage(`Se eliminó toda la información asociada al archivo ${upload.fileName}.`)
  }
  return <>
    <PageHeader eyebrow="Empleado / Carga de Sueldos Histórico de Empleados" title="Carga de Sueldos Histórico de Empleados" description="Importa el historial salarial, valida sus filas y procesa únicamente archivos consistentes." action={<a className="button secondary" href="/Ejemplo%20Historico%20Sueldos.xls" download="Ejemplo Historico Sueldos.xls"><Download size={18} /> Descargar archivo de ejemplo</a>} />
    {context}
    <section className="overtime-upload-section"><div className="panel import-card salary-import-card overtime-upload-card"><div className="import-icon"><Upload /></div><h2>Subir historial de sueldos</h2><p>El archivo queda pendiente hasta que revises el detalle con la lupa y lo proceses con el ícono de play.</p><label className="button primary file-picker"><Upload size={18} /> {loading ? 'Validando…' : 'Seleccionar archivo'}<input type="file" accept=".xls,.xlsx" disabled={loading} onChange={event => { void selectFile(event.target.files?.[0]); event.currentTarget.value = '' }} /></label><span className="cell-meta">Formatos XLS o XLSX · máximo 10 MB</span>{fileName && <><div className="selected-import-file"><FileText size={18} /><div><strong>{fileName}</strong><span>{pending.length} filas leídas · {issues.length} inconsistencias</span></div></div><div className="field overtime-upload-description"><label htmlFor="salary-upload-description">Descripción <span>Obligatorio</span></label><input id="salary-upload-description" value={description} onChange={event => { setDescription(event.target.value.slice(0, 100)); setDescriptionError('') }} maxLength={100} placeholder="Ej. Sueldos históricos 2025" aria-invalid={Boolean(descriptionError)} />{descriptionError && <small className="field-error">{descriptionError}</small>}</div></>}{issues.length > 0 && <div className="import-issues" role="alert"><strong>Inconsistencias detectadas</strong><ul>{issues.slice(0, 5).map(issue => <li key={issue}>{issue}</li>)}</ul>{issues.length > 5 && <span>y {issues.length - 5} inconsistencias más.</span>}</div>}{pending.length > 0 && <button className="button primary" onClick={savePendingUpload}><Database size={18} /> Cargar archivo como pendiente</button>}</div></section>
    {message && <div className={`notice ${message.startsWith('Error:') ? 'warning' : 'info'}`}>{message.startsWith('Error:') ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}<div><strong>{message.startsWith('Error:') ? 'No se puede procesar el archivo' : 'Operación completada'}</strong><p>{message}</p></div></div>}
    <section className="panel table-panel"><div className="panel-heading"><div><h2>HISTORICO_SUELDO</h2><p>Valida el contenido con la lupa. Solo los archivos procesados actualizan la tabla de sueldos históricos.</p></div><Badge tone="neutral">{uploads.length} archivos</Badge></div><div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar archivos de sueldos históricos</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por descripción, archivo, usuario o estado" /></label></div><div className="table-scroll" role="region" aria-label="Archivos cargados en HISTORICO_SUELDO" tabIndex={0}><table className="historical-salary-upload-table"><thead><tr><SortableTh label="Descripción" sortKey="description" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Archivo" sortKey="fileName" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Fecha" sortKey="importedAt" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Usuario" sortKey="user" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Estado" sortKey="status" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><th className="row-action-cell">Detalle</th><th className="row-action-cell">Procesar</th><th className="row-action-cell">Eliminar</th></tr></thead><tbody>{uploadSort.sortedRows.map(upload => { const inconsistentRows = upload.records.filter(record => record.validationIssues?.length).length; const eliminated = upload.status === 'ELIMINADO'; return <tr key={upload.id}><td><strong>{upload.description}</strong><span className={`cell-meta ${inconsistentRows ? 'warning-text' : ''}`}>{upload.recordCount} {upload.recordCount === 1 ? 'registro' : 'registros'}{inconsistentRows ? ` · ${inconsistentRows} inconsistentes` : ''}</span></td><td>{upload.fileName}</td><td>{new Intl.DateTimeFormat('es-EC', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(upload.importedAt))}</td><td>{upload.user}</td><td><Badge tone={upload.status === 'PROCESADO' ? 'success' : upload.status === 'PENDIENTE' ? 'warning' : 'neutral'}>{upload.status === 'PROCESADO' ? 'Procesado' : upload.status === 'PENDIENTE' ? 'Pendiente' : 'Eliminado'}</Badge></td><td className="row-action-cell"><button className="icon-button small edit-icon" disabled={eliminated} onClick={() => setSelectedUploadId(upload.id)} aria-label={`Ver datos de ${upload.fileName}`}><Search size={17} /></button></td><td className="row-action-cell"><button className="icon-button small process-icon" disabled={upload.status !== 'PENDIENTE'} onClick={() => processUpload(upload)} aria-label={`Procesar ${upload.fileName}`}><Play size={17} /></button></td><td className="row-action-cell"><button className="icon-button small delete-icon" disabled={eliminated} onClick={() => setDeletingUploadId(upload.id)} aria-label={`Eliminar ${upload.fileName}`}><Trash2 size={17} /></button></td></tr> })}{!uploadSort.sortedRows.length && <tr><td colSpan={8}><div className="empty-state"><FileText /><strong>Sin archivos cargados</strong><p>Los archivos aparecerán aquí en estado Pendiente.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{filteredUploads.length} de {uploads.length} archivos</span><span>Usuario actual: Ana Navarro</span></div></section>
    {selectedUpload && selectedUpload.status !== 'ELIMINADO' && <HistoricalSalaryUploadDetailDialog upload={selectedUpload} onClose={() => setSelectedUploadId(null)} />}
    {deletingUpload && deletingUpload.status !== 'ELIMINADO' && <HistoricalSalaryUploadDeleteDialog upload={deletingUpload} onClose={() => setDeletingUploadId(null)} onConfirm={() => deleteUpload(deletingUpload)} />}
  </>
}

function HistoricalSalaryUploadDetailDialog({ upload, onClose }: { upload: HistoricalSalaryUpload; onClose: () => void }) {
  const inconsistentRows = upload.records.filter(record => record.validationIssues?.length).length
  return <Dialog title={upload.description} description={`${upload.fileName} · ${upload.recordCount} registros cargados`} onClose={onClose} className="dialog-wide"><div className="upload-detail-body"><div className={`notice ${inconsistentRows ? 'warning' : 'info'}`}>{inconsistentRows ? <AlertTriangle size={20} /> : <Search size={20} />}<div><strong>{inconsistentRows ? `${inconsistentRows} ${inconsistentRows === 1 ? 'fila requiere' : 'filas requieren'} revisión` : 'Vista previa validada'}</strong><p>{inconsistentRows ? 'Las filas naranjas contienen inconsistencias. Corrige el archivo y vuelve a cargarlo antes de procesar.' : 'La información está lista para procesarse mediante el ícono de play.'}</p></div></div><div className="table-scroll" role="region" aria-label={`Datos cargados desde ${upload.fileName}`} tabIndex={0}><table className="historical-salary-review-table"><thead><tr><th>Período</th><th>Cédula</th><th>Nombre</th><th className="numeric">Sueldo</th><th>Inconsistencia</th></tr></thead><tbody>{upload.records.map(record => { const rowIssues = record.validationIssues ?? []; const inconsistent = rowIssues.length > 0; return <tr key={record.id} className={inconsistent ? 'inconsistent-row' : undefined}><td>{record.period || 'Sin dato'}</td><td>{record.identification || 'Sin dato'}</td><td><strong>{record.employeeName || 'Sin dato'}</strong></td><td className="numeric">{record.salary ? money(record.salary) : '—'}</td><td>{inconsistent ? <span className="validation-message"><AlertTriangle size={15} />{rowIssues.join(' · ')}</span> : <span className="validation-ok"><CheckCircle2 size={15} /> Correcto</span>}</td></tr> })}</tbody></table></div><div className="dialog-actions"><button type="button" className="button primary" onClick={onClose}>Cerrar</button></div></div></Dialog>
}

function HistoricalSalaryUploadDeleteDialog({ upload, onClose, onConfirm }: { upload: HistoricalSalaryUpload; onClose: () => void; onConfirm: () => void }) {
  return <Dialog title="Confirmar eliminación" description={upload.fileName} onClose={onClose}><div className="upload-detail-body"><div className="notice warning"><AlertTriangle size={20} /><div><strong>Esta acción eliminará todos los datos de la carga</strong><p>{upload.status === 'PROCESADO' ? 'También se retirarán de HISTORICO_SUELDO los registros procesados desde este archivo.' : 'El archivo todavía no fue procesado; se descartarán sus registros pendientes.'} El historial del archivo se conservará con estado Eliminado.</p></div></div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="button" className="button danger-button" onClick={onConfirm}><Trash2 size={17} /> Sí, eliminar</button></div></div></Dialog>
}

function HistoricalSalaryImportPageLegacy({ employees, records, setRecords, context }: { employees: Employee[]; records: HistoricalSalaryRecord[]; setRecords: Dispatch<SetStateAction<HistoricalSalaryRecord[]>>; context: ReactNode }) {
  const [pending, setPending] = useState<HistoricalSalaryRecord[]>([])
  const [issues, setIssues] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<HistoricalSalaryRecord | null>(null)
  const employeeDocuments = useMemo(() => new Set(employees.map(employee => employee.document)), [employees])
  const filtered = records.filter(record => `${record.period} ${record.identification} ${record.employeeName} ${record.sourceFile}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  const salarySort = useSortableRows(filtered, { period: row => row.period, identification: row => row.identification, employeeName: row => row.employeeName, salary: row => decimalToCents(row.salary), sourceFile: row => row.sourceFile })
  const selectFile = async (file?: File) => {
    if (!file) return
    rememberUploadedFile(file)
    setLoading(true); setMessage(''); setIssues([]); setPending([]); setFileName(file.name)
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera el tamaño máximo de 10 MB.')
      const result = await readHistoricalSalaryFile(file, employees)
      setPending(result.records); setIssues(result.issues)
    } catch (error) {
      setIssues([error instanceof Error ? error.message : 'No fue posible leer el archivo.'])
    } finally {
      setLoading(false)
    }
  }
  const confirmImport = () => {
    if (!pending.length) return
    setRecords(current => {
      const byKey = new Map(current.map(record => [`${record.period}|${record.identification}`, record]))
      pending.forEach(record => byKey.set(`${record.period}|${record.identification}`, record))
      return [...byKey.values()]
    })
    setMessage(`${pending.length} ${pending.length === 1 ? 'registro cargado' : 'registros cargados'} en HISTORICO_SUELDO.`)
    setPending([]); setIssues([]); setFileName('')
  }
  return <>
    <PageHeader eyebrow="Empleado / Carga de Sueldos Histórico de Empleados" title="Carga de Sueldos Histórico de Empleados" description="Importa y administra el historial salarial utilizando la plantilla definida para el sistema." action={<a className="button secondary" href="/Ejemplo%20Historico%20Sueldos.xls" download="Ejemplo Historico Sueldos.xls"><Download size={18} /> Descargar archivo de ejemplo</a>} />
    {context}
    <section className="import-layout salary-import-layout">
      <div className="panel import-card salary-import-card"><div className="import-icon"><Upload /></div><h2>Subir historial de sueldos</h2><p>El archivo debe conservar las columnas <strong>Periodo, Cédula, Nombre y Sueldo</strong> de la plantilla.</p><label className="button primary file-picker"><Upload size={18} /> {loading ? 'Procesando…' : 'Seleccionar archivo'}<input type="file" accept=".xls,.xlsx" disabled={loading} onChange={event => { void selectFile(event.target.files?.[0]); event.currentTarget.value = '' }} /></label><span className="cell-meta">Formatos XLS o XLSX · máximo 10 MB</span>{fileName && <div className="selected-import-file"><FileText size={18} /><div><strong>{fileName}</strong><span>{pending.length} filas válidas · {issues.length} observaciones</span></div></div>}{pending.length > 0 && <button className="button primary" onClick={confirmImport}><Database size={18} /> Cargar {pending.length} en HISTORICO_SUELDO</button>}</div>
      <div className="panel import-guide"><h2>Validación de la carga</h2><ol><li><span>1</span><div><strong>Descargar la plantilla</strong><p>Usa el archivo Ejemplo Historico Sueldos disponible en esta pantalla.</p></div></li><li><span>2</span><div><strong>Completar la información</strong><p>Registra el período como AAAA-MM, la cédula de 10 dígitos y el sueldo.</p></div></li><li><span>3</span><div><strong>Seleccionar y validar</strong><p>El sistema identifica filas inválidas antes de cargar.</p></div></li><li><span>4</span><div><strong>Confirmar la carga</strong><p>Si ya existe la misma cédula y período, el registro se actualiza.</p></div></li></ol>{issues.length > 0 && <div className="import-issues" role="alert"><strong>Observaciones</strong><ul>{issues.slice(0, 5).map(issue => <li key={issue}>{issue}</li>)}</ul>{issues.length > 5 && <span>y {issues.length - 5} observaciones más.</span>}</div>}</div>
    </section>
    {message && <div className="notice info"><CheckCircle2 size={20} /><div><strong>Carga completada</strong><p>{message}</p></div></div>}
    <section className="panel table-panel"><div className="panel-heading"><div><h2>HISTORICO_SUELDO</h2><p>Registros incorporados mediante la carga de sueldos históricos.</p></div><Badge tone="neutral">{records.length} registros</Badge></div><div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar en histórico de sueldos</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por período, cédula, nombre o archivo" /></label></div><div className="table-scroll" role="region" aria-label="Tabla HISTORICO_SUELDO" tabIndex={0}><table className="historical-salary-table"><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Período" sortKey="period" sort={salarySort.sort} onSort={salarySort.toggleSort} /><SortableTh label="Cédula" sortKey="identification" sort={salarySort.sort} onSort={salarySort.toggleSort} /><SortableTh label="Nombre" sortKey="employeeName" sort={salarySort.sort} onSort={salarySort.toggleSort} /><SortableTh label="Sueldo" sortKey="salary" sort={salarySort.sort} onSort={salarySort.toggleSort} className="numeric" /><SortableTh label="Archivo de origen" sortKey="sourceFile" sort={salarySort.sort} onSort={salarySort.toggleSort} /></tr></thead><tbody>{salarySort.sortedRows.map(record => <tr key={record.id}><td className="row-action-cell"><button className="icon-button small edit-icon" onClick={() => setEditing(record)} aria-label={`Editar sueldo histórico de ${record.employeeName}`} title="Editar registro"><Pencil size={17} /></button></td><td><strong>{record.period}</strong></td><td>{record.identification}<span className="cell-meta">{employeeDocuments.has(record.identification) ? 'Empleado vinculado' : 'Histórico importado'}</span></td><td>{record.employeeName}</td><td className="numeric money">{money(record.salary)}</td><td>{record.sourceFile}</td></tr>)}{!salarySort.sortedRows.length && <tr><td colSpan={6}><div className="empty-state"><Database /><strong>Sin sueldos históricos</strong><p>Selecciona un archivo y confirma la carga para crear registros en HISTORICO_SUELDO.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{filtered.length} de {records.length} registros</span><span>Persistencia local del MVP</span></div></section>
    {editing && <HistoricalSalaryDialog record={editing} onClose={() => setEditing(null)} onSave={record => { setRecords(current => current.map(item => item.id === record.id ? record : item)); setEditing(null) }} />}
  </>
}

function HistoricalSalaryDialog({ record, onClose, onSave }: { record: HistoricalSalaryRecord; onClose: () => void; onSave: (record: HistoricalSalaryRecord) => void }) {
  const [period, setPeriod] = useState(record.period)
  const [identification, setIdentification] = useState(record.identification)
  const [employeeName, setEmployeeName] = useState(record.employeeName)
  const [salary, setSalary] = useState(record.salary)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const next: Record<string, string> = {}
    if (!normalizeSalaryPeriod(period)) next.period = 'Selecciona un período válido.'
    if (!/^\d{10}$/.test(identification)) next.identification = 'La cédula debe tener 10 dígitos.'
    if (!employeeName.trim()) next.employeeName = 'Ingresa el nombre del empleado.'
    if (!/^\d+(\.\d{1,2})?$/.test(salary) || decimalToCents(salary) <= 0n) next.salary = 'Ingresa un sueldo mayor a cero con máximo dos decimales.'
    setErrors(next); if (Object.keys(next).length) return
    onSave({ ...record, period: normalizeSalaryPeriod(period), identification, employeeName: employeeName.trim(), salary: centsToDecimal(decimalToCents(salary)) })
  }
  return <Dialog title="Editar sueldo histórico" description="Actualiza la información almacenada en HISTORICO_SUELDO." onClose={onClose}><form onSubmit={submit} noValidate><div className="form-grid"><div className="field"><label htmlFor="historical-period">Período <span>Obligatorio</span></label><input id="historical-period" type="month" value={period} onChange={event => setPeriod(event.target.value)} aria-invalid={Boolean(errors.period)} />{errors.period && <small className="field-error">{errors.period}</small>}</div><div className="field"><label htmlFor="historical-identification">Cédula <span>10 dígitos</span></label><input id="historical-identification" value={identification} onChange={event => setIdentification(event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.identification)} />{errors.identification && <small className="field-error">{errors.identification}</small>}</div><div className="field"><label htmlFor="historical-name">Nombre <span>Obligatorio</span></label><input id="historical-name" value={employeeName} onChange={event => setEmployeeName(event.target.value)} maxLength={100} aria-invalid={Boolean(errors.employeeName)} />{errors.employeeName && <small className="field-error">{errors.employeeName}</small>}</div><div className="field"><label htmlFor="historical-salary">Sueldo <span>USD</span></label><input id="historical-salary" value={salary} onChange={event => setSalary(event.target.value.replace(',', '.').replace(/[^\d.]/g, ''))} inputMode="decimal" aria-invalid={Boolean(errors.salary)} />{errors.salary && <small className="field-error">{errors.salary}</small>}</div></div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">Guardar cambios</button></div></form></Dialog>
}

function ComplementaryEmployeesPage({ workers, setWorkers, context }: { workers: ComplementaryEmployee[]; setWorkers: Dispatch<SetStateAction<ComplementaryEmployee[]>>; context: ReactNode }) {
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingWorker, setEditingWorker] = useState<ComplementaryEmployee | null>(null)
  const filtered = workers.filter(worker => `${worker.businessName} ${worker.identification} ${worker.company} ${worker.occupation}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  const workerSort = useSortableRows(filtered, { businessName: row => row.businessName, documentType: row => row.documentType, identification: row => row.identification, company: row => row.company, occupation: row => row.occupation, status: row => row.active ? 'Activo' : 'Inactivo' })
  return <>
    <PageHeader eyebrow="Empleado / Empleados Complementarios" title="Empleados Complementarios" description="Trabajadores de proveedores externos, asignaciones y datos de vinculación." action={<button className="button primary" onClick={() => setAdding(true)}><Plus size={18} /> Agregar</button>} />
    {context}
    <div className="notice info"><ShieldCheck size={20} /><div><strong>Relación externa separada</strong><p>Estos trabajadores pertenecen a otra empresa y no se registran como empleados propios.</p></div></div>
    <section className="panel table-panel">
      <div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar empleados complementarios</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre, identificación, empresa u ocupación" /></label><button className="button secondary"><Settings size={17} /> Filtros</button></div>
      <div className="table-scroll" role="region" aria-label="Empleados complementarios" tabIndex={0}><table className="complementary-table"><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Nombre" sortKey="businessName" sort={workerSort.sort} onSort={workerSort.toggleSort} /><SortableTh label="Documento" sortKey="documentType" sort={workerSort.sort} onSort={workerSort.toggleSort} /><SortableTh label="Identificación" sortKey="identification" sort={workerSort.sort} onSort={workerSort.toggleSort} /><SortableTh label="Nombre Empresa" sortKey="company" sort={workerSort.sort} onSort={workerSort.toggleSort} /><SortableTh label="Ocupación" sortKey="occupation" sort={workerSort.sort} onSort={workerSort.toggleSort} /><SortableTh label="Estado" sortKey="status" sort={workerSort.sort} onSort={workerSort.toggleSort} /></tr></thead><tbody>
        {workerSort.sortedRows.map(worker => <tr key={worker.id}><td className="row-action-cell"><button className="icon-button small edit-icon" onClick={() => setEditingWorker(worker)} aria-label={`Editar ${worker.businessName}`} title={`Editar ${worker.businessName}`}><Pencil size={17} /></button></td><td><strong>{worker.businessName}</strong><span className="cell-meta">{worker.id}</span></td><td>{worker.documentType === 'CEDULA' ? 'Cédula' : 'Pasaporte'}</td><td>{worker.identification}</td><td>{worker.company}</td><td>{worker.occupation}</td><td><Badge tone={worker.active ? 'success' : 'neutral'}>{worker.active ? 'Activo' : 'Inactivo'}</Badge></td></tr>)}
        {!workerSort.sortedRows.length && <tr><td colSpan={7}><div className="empty-state"><Search /><strong>Sin resultados</strong><p>No existen trabajadores que coincidan con la búsqueda.</p></div></td></tr>}
      </tbody></table></div>
      <div className="table-footer"><span>1–{workerSort.sortedRows.length} de {workerSort.sortedRows.length}</span><span>Trabajadores complementarios</span></div>
    </section>
    {adding && <ComplementaryEmployeeDialog onClose={() => setAdding(false)} onSave={(worker) => { setWorkers(current => [worker, ...current]); setAdding(false) }} />}
    {editingWorker && <ComplementaryEmployeeDialog worker={editingWorker} onClose={() => setEditingWorker(null)} onSave={(worker) => { setWorkers(current => current.map(item => item.id === worker.id ? worker : item)); setEditingWorker(null) }} />}
  </>
}

function ComplementaryEmployeeDialog({ worker, onClose, onSave }: { worker?: ComplementaryEmployee; onClose: () => void; onSave: (worker: ComplementaryEmployee) => void }) {
  const [documentType, setDocumentType] = useState<'CEDULA' | 'PASAPORTE'>(worker?.documentType ?? 'CEDULA')
  const [identification, setIdentification] = useState(worker?.identification ?? '')
  const [names, setNames] = useState(worker?.names ?? '')
  const [lastNames, setLastNames] = useState(worker?.lastNames ?? '')
  const [company, setCompany] = useState(worker?.company ?? '')
  const [occupation, setOccupation] = useState(worker?.occupation ?? '')
  const [gender, setGender] = useState<ComplementaryEmployee['gender'] | ''>(worker?.gender ?? '')
  const [maritalStatus, setMaritalStatus] = useState<ComplementaryEmployee['maritalStatus']>(worker?.maritalStatus ?? 'SOLTERO')
  const [workedDays, setWorkedDays] = useState(worker?.workedDays ?? [])
  const [workYear, setWorkYear] = useState('')
  const [workDayCount, setWorkDayCount] = useState('')
  const [workHistoryErrors, setWorkHistoryErrors] = useState<Record<string, string>>({})
  const [dependents, setDependents] = useState(worker ? String(worker.dependents) : '0')
  const [entryDate, setEntryDate] = useState(worker?.entryDate ?? '')
  const [retirementDate, setRetirementDate] = useState(worker?.retirementDate ?? '')
  const [active, setActive] = useState(worker?.active ?? true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const workHistorySort = useSortableRows(workedDays, { year: row => row.year, days: row => row.days })
  const businessName = `${lastNames.trim()} ${names.trim()}`.trim()
  const formatDate = (value: string) => { const digits = value.replace(/\D/g, '').slice(0, 8); if (digits.length <= 2) return digits; if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`; return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}` }
  const validDate = (value: string) => { const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value); if (!match) return false; const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]))); return date.getUTCFullYear() === Number(match[3]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[1]) }
  const comparableDate = (value: string) => value.split('/').reverse().join('-')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (documentType === 'CEDULA' && !/^\d{10}$/.test(identification)) nextErrors.identification = 'La cédula debe contener exactamente 10 dígitos.'
    if (documentType === 'PASAPORTE' && !/^[A-Za-z0-9]{1,20}$/.test(identification)) nextErrors.identification = 'El pasaporte admite hasta 20 caracteres alfanuméricos.'
    if (!names.trim() || !/^[\p{L}\s'-]+$/u.test(names.trim())) nextErrors.names = 'Ingresa nombres sin números.'
    if (!lastNames.trim() || !/^[\p{L}\s'-]+$/u.test(lastNames.trim())) nextErrors.lastNames = 'Ingresa apellidos sin números.'
    if (!company.trim()) nextErrors.company = 'Ingresa el nombre de la empresa.'
    if (!occupation.trim()) nextErrors.occupation = 'Ingresa la ocupación.'
    if (!gender) nextErrors.gender = 'Selecciona el género.'
    if (!/^\d+$/.test(dependents)) nextErrors.dependents = 'Ingresa un número entero de cargas.'
    if (!validDate(entryDate)) nextErrors.entryDate = 'Ingresa una fecha válida en formato DD/MM/AAAA.'
    if (retirementDate && !validDate(retirementDate)) nextErrors.retirementDate = 'Ingresa una fecha válida o deja el campo vacío.'
    if (validDate(entryDate) && validDate(retirementDate) && comparableDate(retirementDate) < comparableDate(entryDate)) nextErrors.retirementDate = 'La fecha de retiro no puede ser anterior al ingreso.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSave({ id: worker?.id ?? `COM-${String(Date.now()).slice(-6)}`, documentType, identification, names: names.trim(), lastNames: lastNames.trim(), businessName, company: company.trim(), occupation: occupation.trim(), gender: gender as ComplementaryEmployee['gender'], maritalStatus, workedDays, dependents: Number(dependents), entryDate, retirementDate, active })
  }
  const addWorkedDays = () => {
    const nextErrors: Record<string, string> = {}
    if (!/^\d{4}$/.test(workYear)) nextErrors.year = 'Ingresa el año con formato AAAA.'
    if (!/^\d+$/.test(workDayCount) || Number(workDayCount) < 1 || Number(workDayCount) > 365) nextErrors.days = 'Los días trabajados deben estar entre 1 y 365.'
    if (workedDays.some(item => item.year === workYear)) nextErrors.year = 'Ya existe un registro para este año.'
    setWorkHistoryErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setWorkedDays(current => [...current, { id: `DAY-${Date.now()}`, year: workYear, days: Number(workDayCount) }])
    setWorkYear(''); setWorkDayCount(''); setWorkHistoryErrors({})
  }
  return <Dialog title={worker ? 'Editar empleado complementario' : 'Agregar empleado complementario'} description={worker ? 'Actualiza la información del trabajador vinculado.' : 'Registra los datos del trabajador vinculado a una empresa externa.'} onClose={onClose}><form onSubmit={submit} noValidate>
    {Object.values(errors).some(Boolean) && <div className="form-error" role="alert"><strong>Revisa los campos indicados.</strong><span>No se agregó el trabajador.</span></div>}
    <div className="form-grid">
      <div className="field"><label htmlFor="complementary-document">Documento <span>Obligatorio</span></label><select id="complementary-document" value={documentType} onChange={event => { setDocumentType(event.target.value as 'CEDULA' | 'PASAPORTE'); setIdentification('') }}><option value="CEDULA">CÉDULA</option><option value="PASAPORTE">PASAPORTE</option></select></div>
      <div className="field"><label htmlFor="complementary-identification">Identificación <span>Obligatorio</span></label><input id="complementary-identification" value={identification} onChange={event => setIdentification(documentType === 'CEDULA' ? event.target.value.replace(/\D/g, '').slice(0, 10) : event.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 20))} inputMode={documentType === 'CEDULA' ? 'numeric' : 'text'} maxLength={documentType === 'CEDULA' ? 10 : 20} aria-invalid={Boolean(errors.identification)} />{errors.identification && <small className="field-error">{errors.identification}</small>}</div>
      <div className="field"><label htmlFor="complementary-names">Nombres <span>Obligatorio</span></label><input id="complementary-names" value={names} onChange={event => setNames(event.target.value.replace(/[0-9]/g, ''))} aria-invalid={Boolean(errors.names)} />{errors.names && <small className="field-error">{errors.names}</small>}</div>
      <div className="field"><label htmlFor="complementary-last-names">Apellidos <span>Obligatorio</span></label><input id="complementary-last-names" value={lastNames} onChange={event => setLastNames(event.target.value.replace(/[0-9]/g, ''))} aria-invalid={Boolean(errors.lastNames)} />{errors.lastNames && <small className="field-error">{errors.lastNames}</small>}</div>
      <div className="field full-width-field"><label htmlFor="complementary-business-name">Razón Social</label><input id="complementary-business-name" className="readonly-result" value={businessName} readOnly /><small className="field-help">Resultado automático: APELLIDOS + espacio + NOMBRES.</small></div>
      <div className="field"><label htmlFor="complementary-company">Empresa <span>Obligatorio</span></label><input id="complementary-company" value={company} onChange={event => setCompany(event.target.value.slice(0, 25))} maxLength={25} aria-invalid={Boolean(errors.company)} /><small className="field-help">Máximo 25 caracteres · {company.length}/25.</small>{errors.company && <small className="field-error">{errors.company}</small>}</div>
      <div className="field"><label htmlFor="complementary-occupation">Ocupación <span>Obligatorio</span></label><input id="complementary-occupation" value={occupation} onChange={event => setOccupation(event.target.value.slice(0, 15))} maxLength={15} aria-invalid={Boolean(errors.occupation)} /><small className="field-help">Máximo 15 caracteres · {occupation.length}/15.</small>{errors.occupation && <small className="field-error">{errors.occupation}</small>}</div>
      <div className="field"><label htmlFor="complementary-gender">Género <span>Obligatorio</span></label><select id="complementary-gender" value={gender} onChange={event => setGender(event.target.value as ComplementaryEmployee['gender'] | '')} aria-invalid={Boolean(errors.gender)}><option value="">Selecciona una opción</option><option value="MASCULINO">Masculino</option><option value="FEMENINO">Femenino</option><option value="OTRO">Otro</option></select>{errors.gender && <small className="field-error">{errors.gender}</small>}</div>
      <div className="field"><label htmlFor="complementary-marital-status">Estado Civil <span>Obligatorio</span></label><select id="complementary-marital-status" value={maritalStatus} onChange={event => setMaritalStatus(event.target.value as ComplementaryEmployee['maritalStatus'])}><option value="SOLTERO">Soltero</option><option value="CASADO">Casado</option><option value="DIVORCIADO">Divorciado</option><option value="UNION_HECHO">Unión de Hecho</option><option value="VIUDO">Viudo</option></select></div>
      <div className="field"><label htmlFor="complementary-dependents">Número de Cargas <span>Obligatorio</span></label><input id="complementary-dependents" value={dependents} onChange={event => setDependents(event.target.value.replace(/\D/g, ''))} inputMode="numeric" aria-invalid={Boolean(errors.dependents)} />{errors.dependents && <small className="field-error">{errors.dependents}</small>}</div>
      <div className="field"><label htmlFor="complementary-entry-date">Fecha de Ingreso <span>Obligatorio</span></label><input id="complementary-entry-date" value={entryDate} onChange={event => setEntryDate(formatDate(event.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.entryDate)} />{errors.entryDate && <small className="field-error">{errors.entryDate}</small>}</div>
      <div className="field"><label htmlFor="complementary-retirement-date">Fecha de Retiro</label><input id="complementary-retirement-date" value={retirementDate} onChange={event => setRetirementDate(formatDate(event.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.retirementDate)} /><small className="field-help">Opcional mientras continúa laborando.</small>{errors.retirementDate && <small className="field-error">{errors.retirementDate}</small>}</div>
    </div>
    <div className="toggle-grid complementary-state-toggle"><ToggleField id="complementary-active" label="Estado" checked={active} checkedLabel="Activo" uncheckedLabel="Inactivo" onChange={setActive} /></div>
    <section className="worked-days-section">
      <div className="family-section-heading"><div><h3>Días trabajados por año</h3><p>Registra el total anual entre 1 y 365 días.</p></div></div>
      <div className="worked-days-entry">
        <div className="field"><label htmlFor="complementary-work-year">Año <span>Obligatorio</span></label><input id="complementary-work-year" value={workYear} onChange={event => setWorkYear(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="AAAA" inputMode="numeric" maxLength={4} aria-invalid={Boolean(workHistoryErrors.year)} />{workHistoryErrors.year && <small className="field-error">{workHistoryErrors.year}</small>}</div>
        <div className="field"><label htmlFor="complementary-work-day-count">Días Trabajados <span>Obligatorio</span></label><input id="complementary-work-day-count" value={workDayCount} onChange={event => setWorkDayCount(event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="1–365" inputMode="numeric" maxLength={3} aria-invalid={Boolean(workHistoryErrors.days)} />{workHistoryErrors.days && <small className="field-error">{workHistoryErrors.days}</small>}</div>
        <button type="button" className="button secondary" onClick={addWorkedDays}><Plus size={17} /> Agregar</button>
      </div>
      <div className="table-scroll" role="region" aria-label="Días trabajados por año" tabIndex={0}><table className="worked-days-table"><thead><tr><SortableTh label="Año" sortKey="year" sort={workHistorySort.sort} onSort={workHistorySort.toggleSort} /><SortableTh label="Días Trabajados" sortKey="days" sort={workHistorySort.sort} onSort={workHistorySort.toggleSort} className="numeric" /></tr></thead><tbody>{workHistorySort.sortedRows.map(item => <tr key={item.id}><td><strong>{item.year}</strong></td><td className="numeric">{item.days}</td></tr>)}{!workedDays.length && <tr><td colSpan={2}><div className="empty-state compact"><CalendarDays /><strong>Sin registros anuales</strong><p>Agrega el año y la cantidad de días trabajados.</p></div></td></tr>}</tbody></table></div>
    </section>
    <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">{worker ? 'Guardar cambios' : 'Agregar trabajador'}</button></div>
  </form></Dialog>
}

function HistoryModificationPage({ employees, catalogs, contractHistory, context, onSave }: { employees: Employee[]; catalogs: Catalogs; contractHistory: Record<string, ContractHistoryLine[]>; context: ReactNode; onSave: (employeeId: string, line: ContractHistoryLine) => void }) {
  const sortedEmployees = useMemo(() => [...employees].sort((a, b) => a.name.localeCompare(b.name, 'es')), [employees])
  const [employeeName, setEmployeeName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [editingLine, setEditingLine] = useState<ContractHistoryLine | null>(null)
  const selectedEmployee = employees.find(item => item.id === employeeId)
  const lines = selectedEmployee ? contractHistory[selectedEmployee.id] ?? [] : []
  const payrollGroupName = (id?: string) => catalogs['grupos-nomina'].find(group => group.id === id)?.name ?? '—'
  const lineSort = useSortableRows(lines, { contract: row => row.contractNumber, startDate: row => row.startDate.split('/').reverse().join('-'), endDate: row => row.endDate ? row.endDate.split('/').reverse().join('-') : '', exitReason: row => row.exitReason, department: row => row.department, role: row => row.role, payrollGroup: row => payrollGroupName(row.payrollGroupId), salary: row => decimalToCents(row.salary) })
  const selectEmployee = (value: string) => {
    setEmployeeName(value)
    const match = employees.find(item => item.name.localeCompare(value.trim(), 'es', { sensitivity: 'base' }) === 0)
    setEmployeeId(match?.id ?? '')
    setEditingLine(null)
  }
  return <>
    <PageHeader eyebrow="Empleado / Modificación Historial" title="Modificación Historial" description="Selecciona un empleado y corrige las líneas de su historial contractual." />
    {context}
    <section className="panel history-employee-selector"><div className="field"><label htmlFor="history-employee">Empleado <span>Obligatorio</span></label><input id="history-employee" list="history-employee-options" value={employeeName} onChange={event => selectEmployee(event.target.value)} placeholder="Escribe para buscar un empleado" autoComplete="off" /><datalist id="history-employee-options">{sortedEmployees.map(employee => <option value={employee.name} key={employee.id}>{employee.document} · {employee.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</option>)}</datalist><small className="field-help">Incluye empleados activos e inactivos, ordenados alfabéticamente.</small></div>{selectedEmployee && <div className="selected-employee-summary"><div className="person-avatar">{selectedEmployee.name.split(' ').slice(0, 2).map(part => part[0]).join('')}</div><div><strong>{selectedEmployee.name}</strong><span>{selectedEmployee.document} · {selectedEmployee.role}</span></div><Badge tone={selectedEmployee.status === 'ACTIVO' ? 'success' : 'neutral'}>{selectedEmployee.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</Badge></div>}</section>
    {selectedEmployee ? <section className="panel table-panel"><div className="panel-heading"><div><h2>Historial de contratos</h2><p>Selecciona el ícono de edición para modificar cualquier campo de una línea.</p></div><Badge tone="neutral">{lines.length} {lines.length === 1 ? 'línea' : 'líneas'}</Badge></div><div className="table-scroll" role="region" aria-label={`Historial contractual de ${selectedEmployee.name}`} tabIndex={0}><table className="contract-history-table editable-history-table"><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Contrato" sortKey="contract" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Fecha Inicio" sortKey="startDate" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Fecha Fin" sortKey="endDate" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Motivo de Salida" sortKey="exitReason" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Departamento" sortKey="department" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Cargo" sortKey="role" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Grupo de Nómina" sortKey="payrollGroup" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Sueldo" sortKey="salary" sort={lineSort.sort} onSort={lineSort.toggleSort} className="numeric" /></tr></thead><tbody>{lineSort.sortedRows.map(line => { const originalIndex = lines.findIndex(item => item.id === line.id); const lineNumber = lines.slice(0, originalIndex + 1).filter(item => item.contractNumber === line.contractNumber).length; return <tr key={line.id}><td className="row-action-cell"><button className="icon-button small edit-icon" onClick={() => setEditingLine(line)} aria-label={`Editar contrato ${line.contractNumber}, línea ${lineNumber}`} title={`Editar contrato ${line.contractNumber}, línea ${lineNumber}`}><Pencil size={17} /></button></td><td><strong>{line.contractNumber}</strong><span className="cell-meta">Línea {lineNumber}</span></td><td>{line.startDate}{line.effectiveDate && <span className="cell-meta">Modificación: {line.effectiveDate}</span>}</td><td>{line.endDate}</td><td>{line.exitReason}</td><td>{line.department}</td><td>{line.role}</td><td>{payrollGroupName(line.payrollGroupId)}</td><td className="numeric money">{money(line.salary)}</td></tr> })}{!lines.length && <tr><td colSpan={9}><div className="empty-state"><FileClock /><strong>Sin historial contractual</strong><p>El empleado todavía no tiene contratos registrados.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{lines.length} {lines.length === 1 ? 'línea contractual' : 'líneas contractuales'}</span><span>Edición habilitada</span></div></section> : <div className="empty-state history-selection-empty"><Users /><strong>Selecciona un empleado</strong><p>Su historial contractual aparecerá en esta sección.</p></div>}
    {selectedEmployee && editingLine && <HistoryLineDialog line={editingLine} catalogs={catalogs} onClose={() => setEditingLine(null)} onSave={(line) => { onSave(selectedEmployee.id, line); setEditingLine(null) }} />}
  </>
}

function HistoryLineDialog({ line, catalogs, onClose, onSave }: { line: ContractHistoryLine; catalogs: Catalogs; onClose: () => void; onSave: (line: ContractHistoryLine) => void }) {
  const [contractNumber, setContractNumber] = useState(String(line.contractNumber))
  const [startDate, setStartDate] = useState(line.startDate)
  const [endDate, setEndDate] = useState(line.endDate)
  const [exitReason, setExitReason] = useState(line.exitReason)
  const [department, setDepartment] = useState(line.department)
  const [role, setRole] = useState(line.role)
  const [payrollGroupId, setPayrollGroupId] = useState(line.payrollGroupId ?? '')
  const [salary, setSalary] = useState(line.salary)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const departments = [...new Set([line.department, ...catalogs.departamentos.filter(item => item.status === 'ACTIVO').map(item => item.name)])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'))
  const roles = [...new Set([line.role, ...catalogs.cargos.filter(item => item.status === 'ACTIVO').map(item => item.name)])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'))
  const exitReasons = [...new Set([line.exitReason, ...catalogs['motivos-salida'].filter(item => item.status === 'ACTIVO').map(item => item.name)])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'))
  const payrollGroups = catalogs['grupos-nomina'].filter(item => item.status === 'ACTIVO' || item.id === line.payrollGroupId).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const formatDate = (value: string) => { const digits = value.replace(/\D/g, '').slice(0, 8); if (digits.length <= 2) return digits; if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`; return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}` }
  const validDate = (value: string) => { const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value); if (!match) return false; const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]))); return date.getUTCFullYear() === Number(match[3]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[1]) }
  const comparableDate = (value: string) => value.split('/').reverse().join('-')
  const decimalDraft = (value: string) => { const normalized = value.replace(',', '.').replace(/[^\d.]/g, ''); const [whole = '', ...rest] = normalized.split('.'); return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const nextErrors: Record<string, string> = {}
    if (!/^\d+$/.test(contractNumber) || Number(contractNumber) < 1) nextErrors.contractNumber = 'Ingresa un número de contrato válido.'
    if (!validDate(startDate)) nextErrors.startDate = 'Ingresa una fecha válida en formato DD/MM/AAAA.'
    if (endDate && !validDate(endDate)) nextErrors.endDate = 'Ingresa una fecha válida o deja el campo vacío.'
    if (validDate(startDate) && validDate(endDate) && comparableDate(endDate) < comparableDate(startDate)) nextErrors.endDate = 'La fecha fin no puede ser anterior a la fecha inicio.'
    if (!department) nextErrors.department = 'Selecciona un departamento.'
    if (!role) nextErrors.role = 'Selecciona un cargo.'
    if (!payrollGroupId) nextErrors.payrollGroupId = 'Selecciona un tipo de nómina.'
    if (!/^\d+(\.\d{1,2})?$/.test(salary) || decimalToCents(salary) <= 0n) nextErrors.salary = 'Ingresa un sueldo mayor a cero con máximo dos decimales.'
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return
    onSave({ ...line, contractNumber: Number(contractNumber), startDate, endDate, exitReason, department, role, payrollGroupId, salary: centsToDecimal(decimalToCents(salary)) })
  }
  return <Dialog title="Editar línea del historial" description="Los cambios se reflejarán en el historial del expediente del empleado." onClose={onClose}><form onSubmit={submit} noValidate>{Object.values(errors).some(Boolean) && <div className="form-error" role="alert"><strong>Revisa los campos indicados.</strong><span>No se guardaron los cambios.</span></div>}<div className="form-grid">
    <div className="field"><label htmlFor="history-contract-number">Contrato <span>Obligatorio</span></label><input id="history-contract-number" value={contractNumber} onChange={event => setContractNumber(event.target.value.replace(/\D/g, ''))} inputMode="numeric" aria-invalid={Boolean(errors.contractNumber)} />{errors.contractNumber && <small className="field-error">{errors.contractNumber}</small>}</div>
    <div className="field"><label htmlFor="history-start-date">Fecha Inicio <span>Obligatorio</span></label><input id="history-start-date" value={startDate} onChange={event => setStartDate(formatDate(event.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.startDate)} />{errors.startDate && <small className="field-error">{errors.startDate}</small>}</div>
    <div className="field"><label htmlFor="history-end-date">Fecha Fin</label><input id="history-end-date" value={endDate} onChange={event => setEndDate(formatDate(event.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.endDate)} />{errors.endDate && <small className="field-error">{errors.endDate}</small>}</div>
    <div className="field"><label htmlFor="history-exit-reason">Motivo de Salida</label><select id="history-exit-reason" value={exitReason} onChange={event => setExitReason(event.target.value)}><option value="">Sin motivo de salida</option>{exitReasons.map(item => <option value={item} key={item}>{item}</option>)}</select></div>
    <div className="field"><label htmlFor="history-department">Departamento <span>Obligatorio</span></label><select id="history-department" value={department} onChange={event => setDepartment(event.target.value)} aria-invalid={Boolean(errors.department)}>{departments.map(item => <option value={item} key={item}>{item}</option>)}</select>{errors.department && <small className="field-error">{errors.department}</small>}</div>
    <div className="field"><label htmlFor="history-role">Cargo <span>Obligatorio</span></label><select id="history-role" value={role} onChange={event => setRole(event.target.value)} aria-invalid={Boolean(errors.role)}>{roles.map(item => <option value={item} key={item}>{item}</option>)}</select>{errors.role && <small className="field-error">{errors.role}</small>}</div>
    <div className="field"><label htmlFor="history-payroll-type">Tipo de Nómina <span>Obligatorio</span></label><select id="history-payroll-type" value={payrollGroupId} onChange={event => setPayrollGroupId(event.target.value)} aria-invalid={Boolean(errors.payrollGroupId)}><option value="">Selecciona una opción</option>{payrollGroups.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>{errors.payrollGroupId && <small className="field-error">{errors.payrollGroupId}</small>}</div>
    <div className="field"><label htmlFor="history-salary">Sueldo <span>Obligatorio</span></label><input id="history-salary" value={salary} onChange={event => setSalary(decimalDraft(event.target.value))} inputMode="decimal" aria-invalid={Boolean(errors.salary)} />{errors.salary && <small className="field-error">{errors.salary}</small>}</div>
  </div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">Guardar cambios</button></div></form></Dialog>
}

function EmployeePositionChangePage({ employees, catalogs, contractHistory, context, onSave }: { employees: Employee[]; catalogs: Catalogs; contractHistory: Record<string, ContractHistoryLine[]>; context: ReactNode; onSave: (employeeId: string, line: ContractHistoryLine) => void }) {
  const sortedEmployees = useMemo(() => [...employees].sort((a, b) => a.name.localeCompare(b.name, 'es')), [employees])
  const [day, month, year] = new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Guayaquil' }).format(new Date()).split('/')
  const [modificationDate, setModificationDate] = useState(`${day}/${month}/${year}`)
  const [employeeName, setEmployeeName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [role, setRole] = useState('')
  const [department, setDepartment] = useState('')
  const [payrollGroupId, setPayrollGroupId] = useState('')
  const [salary, setSalary] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const employee = employees.find(item => item.id === employeeId)
  const latestLine = employee ? contractHistory[employee.id]?.at(-1) : undefined
  const roleOptions = [...new Set([...(employee ? [latestLine?.role ?? employee.role] : []), ...catalogs.cargos.filter(item => item.status === 'ACTIVO').map(item => item.name)])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'))
  const departmentOptions = [...new Set([...(employee ? [latestLine?.department ?? employee.area] : []), ...catalogs.departamentos.filter(item => item.status === 'ACTIVO').map(item => item.name)])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'))
  const payrollGroupOptions = catalogs['grupos-nomina'].filter(item => item.status === 'ACTIVO' || item.id === payrollGroupId).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const formatDate = (value: string) => { const digits = value.replace(/\D/g, '').slice(0, 8); if (digits.length <= 2) return digits; if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`; return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}` }
  const validDate = (value: string) => { const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value); if (!match) return false; const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]))); return date.getUTCFullYear() === Number(match[3]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[1]) }
  const decimalDraft = (value: string) => { const normalized = value.replace(',', '.').replace(/[^\d.]/g, ''); const [whole = '', ...rest] = normalized.split('.'); return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole }
  const selectEmployee = (name: string) => {
    setEmployeeName(name); setSaved(false)
    const match = employees.find(item => item.name.toLocaleLowerCase('es') === name.trim().toLocaleLowerCase('es'))
    setEmployeeId(match?.id ?? '')
    if (!match) { setRole(''); setDepartment(''); setPayrollGroupId(''); setSalary(''); return }
    const current = contractHistory[match.id]?.at(-1)
    setRole(current?.role ?? match.role); setDepartment(current?.department ?? match.area); setPayrollGroupId(current?.payrollGroupId ?? match.payrollGroupId ?? ''); setSalary(current?.salary ?? match.salary)
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!validDate(modificationDate)) nextErrors.modificationDate = 'Ingresa una fecha válida en formato DD/MM/AAAA.'
    if (!employee) nextErrors.employee = 'Selecciona un empleado de la lista.'
    if (!role) nextErrors.role = 'Selecciona un cargo.'
    if (!department) nextErrors.department = 'Selecciona un departamento.'
    if (!payrollGroupId) nextErrors.payrollGroupId = 'Selecciona un tipo de nómina.'
    if (!/^\d+(\.\d{1,2})?$/.test(salary) || decimalToCents(salary) <= 0n) nextErrors.salary = 'Ingresa un sueldo mayor a cero con máximo dos decimales.'
    const currentRole = latestLine?.role ?? employee?.role
    const currentDepartment = latestLine?.department ?? employee?.area
    const currentSalary = latestLine?.salary ?? employee?.salary
    const currentPayrollGroupId = latestLine?.payrollGroupId ?? employee?.payrollGroupId ?? ''
    if (employee && role === currentRole && department === currentDepartment && payrollGroupId === currentPayrollGroupId && decimalToCents(salary) === decimalToCents(currentSalary ?? '0')) nextErrors.change = 'Modifica al menos el cargo, el departamento, el Tipo de Nómina o el sueldo.'
    setErrors(nextErrors)
    const valid = Object.keys(nextErrors).length === 0
    setSaved(valid)
    if (!valid || !employee) return
    const [yearValue, monthValue, dayValue] = employee.startDate.split('-')
    onSave(employee.id, {
      id: `${employee.id}-C${latestLine?.contractNumber ?? 1}-L${Date.now()}`,
      contractNumber: latestLine?.contractNumber ?? 1,
      startDate: latestLine?.startDate ?? `${dayValue}/${monthValue}/${yearValue}`,
      endDate: latestLine?.endDate ?? '',
      exitReason: latestLine?.exitReason ?? '',
      exitReasonDetail: latestLine?.exitReasonDetail ?? '',
      department,
      role,
      payrollGroupId,
      salary: centsToDecimal(decimalToCents(salary)),
      effectiveDate: modificationDate,
    })
  }
  return <>
    <PageHeader eyebrow="Empleado / Modificación Cargo Empleado" title="Modificación Cargo Empleado" description="Registra cambios de cargo, departamento o sueldo con trazabilidad contractual." />
    {context}
    <section className="panel employee-tab-panel">
      <div className="panel-heading"><div><h2>Nueva modificación laboral</h2><p>El guardado genera una línea independiente en el historial del contrato vigente.</p></div><Badge tone="warning">Edición local</Badge></div>
      <form className="identification-form" onSubmit={submit} noValidate>
        {Object.values(errors).some(Boolean) && <div className="form-error" role="alert"><strong>Revisa los campos indicados.</strong><span>{errors.change ?? 'No se guardaron los cambios.'}</span></div>}
        {saved && <div className="form-success" role="status"><CheckCircle2 size={19} /><span>Modificación registrada como una nueva línea en el historial del empleado.</span></div>}
        <div className="form-grid identification-grid">
          <div className="field"><label htmlFor="position-change-date">Fecha de Modificación <span>Obligatorio</span></label><input id="position-change-date" value={modificationDate} onChange={event => { setModificationDate(formatDate(event.target.value)); setSaved(false) }} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.modificationDate)} />{errors.modificationDate && <small className="field-error">{errors.modificationDate}</small>}</div>
          <div className="field"><label htmlFor="position-change-employee">Empleado <span>Obligatorio</span></label><input id="position-change-employee" list="position-change-employees" value={employeeName} onChange={event => selectEmployee(event.target.value)} placeholder="Escribe para buscar" autoComplete="off" aria-invalid={Boolean(errors.employee)} /><datalist id="position-change-employees">{sortedEmployees.map(item => <option value={item.name} key={item.id}>{item.document}</option>)}</datalist><small className="field-help">Empleados ordenados alfabéticamente.</small>{errors.employee && <small className="field-error">{errors.employee}</small>}</div>
          <div className="field"><label htmlFor="position-change-role">Cargo <span>Obligatorio</span></label><select id="position-change-role" value={role} onChange={event => { setRole(event.target.value); setSaved(false) }} disabled={!employee} aria-invalid={Boolean(errors.role)}><option value="">Selecciona una opción</option>{roleOptions.map(item => <option value={item} key={item}>{item}</option>)}</select>{errors.role && <small className="field-error">{errors.role}</small>}</div>
          <div className="field"><label htmlFor="position-change-payroll-type">Tipo de Nómina <span>Obligatorio</span></label><select id="position-change-payroll-type" value={payrollGroupId} onChange={event => { setPayrollGroupId(event.target.value); setSaved(false) }} disabled={!employee} aria-invalid={Boolean(errors.payrollGroupId)}><option value="">Selecciona una opción</option>{payrollGroupOptions.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>{errors.payrollGroupId && <small className="field-error">{errors.payrollGroupId}</small>}</div>
          <div className="field"><label htmlFor="position-change-department">Departamento <span>Obligatorio</span></label><select id="position-change-department" value={department} onChange={event => { setDepartment(event.target.value); setSaved(false) }} disabled={!employee} aria-invalid={Boolean(errors.department)}><option value="">Selecciona una opción</option>{departmentOptions.map(item => <option value={item} key={item}>{item}</option>)}</select>{errors.department && <small className="field-error">{errors.department}</small>}</div>
          <div className="field"><label htmlFor="position-change-salary">Sueldo (USD) <span>Obligatorio</span></label><input id="position-change-salary" value={salary} onChange={event => { setSalary(decimalDraft(event.target.value)); setSaved(false) }} disabled={!employee} inputMode="decimal" aria-invalid={Boolean(errors.salary)} /><small className="field-help">Valor numérico con máximo dos decimales.</small>{errors.salary && <small className="field-error">{errors.salary}</small>}</div>
        </div>
        <div className="form-footer"><span>Se conservará el mismo número de contrato vigente.</span><button type="submit" className="button primary"><Check size={18} /> Guardar modificación</button></div>
      </form>
    </section>
  </>
}

function EmployeesPage({ employees, employeeProfiles, catalogs, documentTypes, sbuRecords, sbuEnabledEmployeeIds, contractHistory, setContractHistory, pendingContract, setPendingContract, onUpdateEmployee, onSaveProfile, onSbuPreferenceChange, onCreateEmployee }: { employees: Employee[]; employeeProfiles: Record<string, EmployeeProfile>; catalogs: Catalogs; documentTypes: DocumentTypeConfiguration[]; sbuRecords: SbuRecord[]; sbuEnabledEmployeeIds: string[]; contractHistory: Record<string, ContractHistoryLine[]>; setContractHistory: Dispatch<SetStateAction<Record<string, ContractHistoryLine[]>>>; pendingContract: Record<string, number>; setPendingContract: Dispatch<SetStateAction<Record<string, number>>>; onUpdateEmployee: (employeeId: string, changes: Partial<Employee>) => void; onSaveProfile: (employeeId: string, profile: Partial<EmployeeProfile>) => void; onSbuPreferenceChange: (employeeId: string, enabled: boolean, salary: string) => void; onCreateEmployee: (employee: Employee, firstContract: ContractHistoryLine, profile: EmployeeProfile) => void }) {
  type EmployeeTab = 'identificacion' | 'datos-personales' | 'ubicabilidad' | 'contrato' | 'historial' | 'informacion-adicional' | 'informacion-retiro' | 'documentos'
  const tabs: { id: EmployeeTab; label: string }[] = [
    { id: 'identificacion', label: 'Identificación' },
    { id: 'datos-personales', label: 'Datos Personales' },
    { id: 'ubicabilidad', label: 'Ubicabilidad' },
    { id: 'contrato', label: 'Contrato' },
    { id: 'historial', label: 'Historial' },
    { id: 'informacion-adicional', label: 'Información Adicional' },
    { id: 'informacion-retiro', label: 'Información de Retiro' },
    { id: 'documentos', label: 'Documentos' },
  ]
  const [activeTab, setActiveTab] = useState<EmployeeTab>('identificacion')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [newEmployeeDraft, setNewEmployeeDraft] = useState<Record<string, string>>({})
  const [newEmployeeError, setNewEmployeeError] = useState('')
  const isCreating = editingId === 'NEW-EMPLOYEE'
  const newEmployee: Employee = { id: 'Nuevo registro', document: '', name: '', role: '', area: '', salary: '', status: 'ACTIVO', startDate: '' }
  const employee = isCreating ? newEmployee : employees.find(item => item.id === editingId)
  const filtered = employees.filter(item => `${item.name} ${item.document} ${item.area} ${item.role}`.toLowerCase().includes(query.toLowerCase()))
  const employeeSort = useSortableRows(filtered, { name: row => row.name, documentType: row => /^\d{10}$/.test(row.document) ? 'Cédula' : 'Pasaporte', document: row => row.document, area: row => row.area, role: row => row.role, status: row => row.status, startDate: row => row.startDate, contractType: () => 'Indefinido' })
  const captureNewEmployeeValue = (event: FormEvent<HTMLDivElement>) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    if (!target.id) return
    setNewEmployeeDraft(current => ({ ...current, [target.id]: target.value }))
    setNewEmployeeError('')
  }
  const captureNewEmployeeToggle = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button[role="switch"]')
    if (!target?.id) return
    setNewEmployeeDraft(current => ({ ...current, [target.id]: String(target.getAttribute('aria-checked') !== 'true') }))
    setNewEmployeeError('')
  }
  const validDraftDate = (value: string) => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
    if (!match) return false
    const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])))
    return date.getUTCFullYear() === Number(match[3]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[1])
  }
  const saveNewEmployee = () => {
    const identification = newEmployeeDraft['employee-identification']?.trim() ?? ''
    const documentType = (newEmployeeDraft['document-type'] ?? 'CEDULA') as 'CEDULA' | 'PASAPORTE'
    const names = newEmployeeDraft['employee-names']?.trim() ?? ''
    const lastNames = newEmployeeDraft['employee-last-names']?.trim() ?? ''
    const departmentId = newEmployeeDraft['contract-department'] ?? ''
    const roleId = newEmployeeDraft['contract-role'] ?? ''
    const salary = newEmployeeDraft['contract-salary'] ?? ''
    const entryDate = newEmployeeDraft['entry-date'] ?? ''
    const validIdentification = documentType === 'CEDULA' ? /^\d{10}$/.test(identification) : /^[A-Za-z0-9]{1,20}$/.test(identification)
    if (!validIdentification || !names || !lastNames) {
      setNewEmployeeError('Completa correctamente Documento, Identificación, Nombres y Apellidos.')
      setActiveTab('identificacion')
      return
    }
    const maritalStatus = newEmployeeDraft['marital-status'] ?? 'SOLTERO'
    const requiresPartner = ['CASADO', 'DIVORCIADO', 'UNION_HECHO'].includes(maritalStatus)
    const emergencyPhone = newEmployeeDraft['emergency-phone'] ?? ''
    const bank = newEmployeeDraft.bank ?? ''
    const accountNumber = newEmployeeDraft['account-number'] ?? ''
    const pregnant = newEmployeeDraft.gender === 'FEMENINO' && newEmployeeDraft['is-pregnant'] === 'true'
    const personalDataComplete = validDraftDate(newEmployeeDraft['birth-date'] ?? '') && Boolean(newEmployeeDraft.gender) && (!pregnant || validDraftDate(newEmployeeDraft['estimated-delivery-date'] ?? '')) && (!emergencyPhone || /^\+?\d{1,15}$/.test(emergencyPhone)) && (!bank || ['Bolivariano', 'De Guayaquil', 'Pacífico', 'Pichincha', 'Produbanco'].includes(bank)) && (!accountNumber || /^\d{1,20}$/.test(accountNumber))
    const partnerDataComplete = !requiresPartner || (/^\d{10}$/.test(newEmployeeDraft['partner-id'] ?? '') && Boolean(newEmployeeDraft['partner-name']?.trim()) && /^\+?\d{1,15}$/.test(newEmployeeDraft['partner-phone'] ?? ''))
    if (!personalDataComplete || !partnerDataComplete) {
      setNewEmployeeError('Completa los campos obligatorios de Datos Personales antes de guardar.')
      setActiveTab('datos-personales')
      return
    }
    const provinceValue = newEmployeeDraft.province?.trim() ?? ''
    const cityValue = newEmployeeDraft.city?.trim() ?? ''
    const selectedProvince = Object.keys(ecuadorLocations).find(item => item.localeCompare(provinceValue, 'es', { sensitivity: 'base' }) === 0)
    const validProvince = !provinceValue || Boolean(selectedProvince)
    const validCity = !cityValue || Boolean(selectedProvince && ecuadorLocations[selectedProvince].some(item => item.localeCompare(cityValue, 'es', { sensitivity: 'base' }) === 0))
    const locationComplete = validProvince && validCity && Boolean(newEmployeeDraft.address?.trim()) && /^\d{1,10}$/.test(newEmployeeDraft['mobile-phone'] ?? '') && (!newEmployeeDraft['additional-phone'] || /^\d{1,10}$/.test(newEmployeeDraft['additional-phone'])) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmployeeDraft.email ?? '') && (newEmployeeDraft.email?.length ?? 0) <= 25
    if (!locationComplete) {
      setNewEmployeeError('Completa correctamente los campos obligatorios de Ubicabilidad.')
      setActiveTab('ubicabilidad')
      return
    }
    const department = catalogs.departamentos.find(item => item.id === departmentId)?.name ?? ''
    const role = catalogs.cargos.find(item => item.id === roleId)?.name ?? ''
    const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(entryDate)
    if (!department || !role || !/^\d+(\.\d{1,2})?$/.test(salary) || decimalToCents(salary) <= 0n || !dateMatch || !validDraftDate(entryDate)) {
      setNewEmployeeError('Completa Departamento, Cargo, Sueldo y Fecha de Ingreso antes de guardar.')
      setActiveTab('contrato')
      return
    }
    const employeeId = `EMP-${String(Date.now()).slice(-6)}`
    const normalizedSalary = centsToDecimal(decimalToCents(salary))
    const payrollGroupId = newEmployeeDraft['payroll-group'] ?? catalogs['grupos-nomina'].find(item => item.status === 'ACTIVO')?.id
    const createdEmployee: Employee = { id: employeeId, document: identification, documentType, names, lastNames, businessName: `${lastNames} ${names}`.trim(), name: `${names} ${lastNames}`, role, area: department, salary: normalizedSalary, status: 'ACTIVO', startDate: `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`, payrollGroupId }
    const firstContract: ContractHistoryLine = { id: `${employeeId}-C1-L1`, contractNumber: 1, startDate: entryDate, endDate: '', exitReason: '', exitReasonDetail: '', department, role, salary: normalizedSalary, payrollGroupId, intern: newEmployeeDraft.intern === 'true', spouseExtension: newEmployeeDraft['spouse-extension'] === 'true', advanceType: newEmployeeDraft['advance-type'] === 'AMOUNT' ? 'AMOUNT' : 'PERCENT', advanceValue: centsToDecimal(decimalToCents(newEmployeeDraft['advance-value'] ?? '0')), hasDisability: newEmployeeDraft['has-disability'] === 'true', disabilityPercentage: newEmployeeDraft['has-disability'] === 'true' ? centsToDecimal(decimalToCents(newEmployeeDraft['disability-percentage'] ?? '0')) : '', contractTypeId: newEmployeeDraft['contract-type'] ?? '', monthlyThirteenth: newEmployeeDraft['monthly-thirteenth'] === 'true', monthlyFourteenth: newEmployeeDraft['monthly-fourteenth'] === 'true', monthlyReserveFunds: newEmployeeDraft['monthly-reserve'] === 'true', reserveStartDate: newEmployeeDraft['reserve-start-date'] ?? entryDate, region: newEmployeeDraft['contract-region'] === 'SIERRA' ? 'SIERRA' : 'COSTA' }
    const profile: EmployeeProfile = { birthDate: newEmployeeDraft['birth-date'] ?? '', gender: newEmployeeDraft.gender ?? '', pregnant, estimatedDeliveryDate: pregnant ? newEmployeeDraft['estimated-delivery-date'] ?? '' : '', pregnancyRegisteredAt: pregnant ? currentEcuadorDate() : '', maritalStatus: maritalStatus as EmployeeProfile['maritalStatus'], partnerId: requiresPartner ? newEmployeeDraft['partner-id'] ?? '' : '', partnerName: requiresPartner ? newEmployeeDraft['partner-name']?.trim() ?? '' : '', partnerPhone: requiresPartner ? newEmployeeDraft['partner-phone'] ?? '' : '', emergencyContact: newEmployeeDraft['emergency-contact']?.trim() ?? '', emergencyPhone, relationship: newEmployeeDraft.relationship ?? '', bank, accountType: newEmployeeDraft['account-type'] ?? '', accountNumber, province: provinceValue, city: cityValue, address: newEmployeeDraft.address?.trim() ?? '', mobilePhone: newEmployeeDraft['mobile-phone'] ?? '', additionalPhone: newEmployeeDraft['additional-phone'] ?? '', email: newEmployeeDraft.email?.trim() ?? '', dependents: [], bonuses: [] }
    onCreateEmployee(createdEmployee, firstContract, profile)
    if (newEmployeeDraft['sbu-enabled'] === 'true') onSbuPreferenceChange(employeeId, true, normalizedSalary)
    setNewEmployeeDraft({})
    setNewEmployeeError('')
    setEditingId(null)
    setActiveTab('identificacion')
  }

  if (!editingId) return <>
    <PageHeader eyebrow="Empleado / Información del Empleado" title="Información del Empleado" description="Selecciona un empleado para consultar o editar su expediente." action={<button className="button primary" onClick={() => { setEditingId('NEW-EMPLOYEE'); setActiveTab('identificacion') }}><Plus size={18} /> Nuevo empleado</button>} />
    <section className="panel table-panel">
      <div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar empleados</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por identificación, departamento o cargo" /></label><button className="button secondary"><Settings size={17} /> Filtros</button></div>
      <div className="table-scroll" role="region" aria-label="Listado de todos los empleados" tabIndex={0}><table className="employee-list-table"><caption className="sr-only">Todos los empleados de Empresa Demostración</caption><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Empleado" sortKey="name" sort={employeeSort.sort} onSort={employeeSort.toggleSort} /><SortableTh label="Tipo de documento" sortKey="documentType" sort={employeeSort.sort} onSort={employeeSort.toggleSort} /><SortableTh label="Número de identificación" sortKey="document" sort={employeeSort.sort} onSort={employeeSort.toggleSort} /><SortableTh label="Departamento" sortKey="area" sort={employeeSort.sort} onSort={employeeSort.toggleSort} /><SortableTh label="Cargo" sortKey="role" sort={employeeSort.sort} onSort={employeeSort.toggleSort} /><SortableTh label="Estado" sortKey="status" sort={employeeSort.sort} onSort={employeeSort.toggleSort} /><SortableTh label="Fecha ingreso" sortKey="startDate" sort={employeeSort.sort} onSort={employeeSort.toggleSort} /><SortableTh label="Tipo contrato" sortKey="contractType" sort={employeeSort.sort} onSort={employeeSort.toggleSort} /></tr></thead><tbody>
        {employeeSort.sortedRows.map(item => <tr key={item.id}><td className="row-action-cell"><button className="icon-button small edit-icon" onClick={() => { setEditingId(item.id); setActiveTab('identificacion') }} aria-label={`Editar ${item.name}`} title={`Editar ${item.name}`}><Pencil size={17} /></button></td><td><strong>{item.name}</strong><span className="cell-meta">{item.id}</span></td><td>{/^\d{10}$/.test(item.document) ? 'Cédula' : 'Pasaporte'}</td><td>{item.document}</td><td>{item.area}</td><td>{item.role}</td><td><Badge tone={item.status === 'ACTIVO' ? 'success' : 'neutral'}>{item.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</Badge></td><td>{item.startDate}</td><td>Indefinido</td></tr>)}
        {!filtered.length && <tr><td colSpan={9}><div className="empty-state"><Search /><strong>Sin resultados</strong><p>No hay empleados que coincidan con la búsqueda.</p></div></td></tr>}
      </tbody></table></div>
      <div className="table-footer"><span>1–{filtered.length} de {filtered.length}</span><span>Total del conjunto filtrado</span></div>
    </section>
  </>

  if (!employee) return <div className="empty-state"><Users /><strong>El empleado ya no está disponible</strong><button className="button secondary" onClick={() => setEditingId(null)}>Volver al listado</button></div>
  return <>
    <PageHeader eyebrow={`Empleado / Información del Empleado / ${isCreating ? 'Nuevo' : 'Editar'}`} title={isCreating ? 'Nuevo empleado' : employee.name} description={isCreating ? 'Completa el nuevo expediente laboral utilizando las secciones disponibles.' : 'Edita el expediente laboral organizado por secciones.'} action={<>{<button className="button secondary" onClick={() => { setEditingId(null); setNewEmployeeDraft({}); setNewEmployeeError('') }}><ArrowLeft size={18} /> Volver al listado</button>}{isCreating && <button className="button primary" onClick={saveNewEmployee}><Check size={18} /> Guardar empleado</button>}</>} />
    <section className="employee-record-bar panel"><div className="record-identity"><div className="person-avatar">{isCreating ? <Plus size={24} /> : employee.name.split(' ').slice(0, 2).map(part => part[0]).join('')}</div><div><span className="cell-meta">{isCreating ? 'Creando expediente' : 'Editando expediente'}</span><strong>{isCreating ? 'Nuevo empleado' : employee.name}</strong><p>{isCreating ? 'Completa primero los datos de identificación' : `${employee.id} · ${employee.document} · ${employee.role}`}</p></div></div><Badge tone={isCreating ? 'warning' : 'success'}>{isCreating ? 'Nuevo registro' : 'Empleado activo'}</Badge></section>
    {newEmployeeError && <div className="form-error employee-create-error" role="alert"><strong>No se puede guardar el empleado.</strong><span>{newEmployeeError}</span></div>}
    <div className="employee-tabs" role="tablist" aria-label="Secciones de información del empleado">{tabs.map(tab => <button key={tab.id} id={`tab-${tab.id}`} role="tab" aria-selected={activeTab === tab.id} aria-controls={`panel-${tab.id}`} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</div>
    {isCreating ? <div className="new-employee-workspace" onChangeCapture={captureNewEmployeeValue} onClickCapture={captureNewEmployeeToggle}>{tabs.map(tab => <div key={tab.id} hidden={activeTab !== tab.id}><EmployeeTabContent tab={tab.id} employee={employee} profile={{}} catalogs={catalogs} documentTypes={documentTypes} sbuRecords={sbuRecords} sbuEnabled={newEmployeeDraft['sbu-enabled'] === 'true'} contractLines={contractHistory[employee.id] ?? []} pendingContractNumber={pendingContract[employee.id]} onUpdateEmployee={() => undefined} onSaveProfile={() => undefined} onSbuPreferenceChange={(enabled, salary) => setNewEmployeeDraft(current => ({ ...current, 'sbu-enabled': String(enabled), 'contract-salary': salary }))} onSaveContract={() => undefined} onReactivate={() => undefined} onRetire={() => undefined} /></div>)}</div> : <EmployeeTabContent
      tab={activeTab}
      employee={employee}
      profile={employeeProfiles[employee.id] ?? {}}
      catalogs={catalogs}
      documentTypes={documentTypes}
      sbuRecords={sbuRecords}
      sbuEnabled={sbuEnabledEmployeeIds.includes(employee.id)}
      contractLines={contractHistory[employee.id] ?? []}
      pendingContractNumber={pendingContract[employee.id]}
      onUpdateEmployee={(changes) => onUpdateEmployee(employee.id, changes)}
      onSaveProfile={(profile) => onSaveProfile(employee.id, profile)}
      onSbuPreferenceChange={(enabled, salary) => onSbuPreferenceChange(employee.id, enabled, salary)}
      onSaveContract={(line) => {
        setContractHistory(current => {
          const lines = current[employee.id] ?? []
          const latest = lines.at(-1)
          if (!latest || pendingContract[employee.id] !== undefined || latest.contractNumber !== line.contractNumber) return { ...current, [employee.id]: [...lines, line] }
          const employmentTermsChanged = latest.department !== line.department || latest.role !== line.role || latest.payrollGroupId !== line.payrollGroupId || latest.salary !== line.salary
          if (employmentTermsChanged) return { ...current, [employee.id]: [...lines, line] }
          return { ...current, [employee.id]: [...lines.slice(0, -1), { ...line, id: latest.id, effectiveDate: latest.effectiveDate }] }
        })
        onUpdateEmployee(employee.id, { role: line.role, area: line.department, salary: line.salary, payrollGroupId: line.payrollGroupId, startDate: line.startDate.split('/').reverse().join('-'), status: 'ACTIVO' })
        setPendingContract(current => { const next = { ...current }; delete next[employee.id]; return next })
      }}
      onReactivate={() => {
        const lines = contractHistory[employee.id] ?? []
        const nextNumber = Math.max(0, ...lines.map(line => line.contractNumber)) + 1
        setPendingContract(current => ({ ...current, [employee.id]: nextNumber }))
        setActiveTab('contrato')
      }}
      onRetire={(endDate, exitReason, exitReasonDetail) => {
        setContractHistory(current => {
          const lines = current[employee.id] ?? []
          const currentContract = lines.at(-1)?.contractNumber
          return { ...current, [employee.id]: lines.map(line => line.contractNumber === currentContract ? { ...line, endDate, exitReason, exitReasonDetail } : line) }
        })
        onUpdateEmployee(employee.id, { status: 'INACTIVO' })
      }}
    />}
  </>
}

function EmployeeTabContent({ tab, employee, profile, catalogs, documentTypes, sbuRecords, sbuEnabled, contractLines, pendingContractNumber, onUpdateEmployee, onSaveProfile, onSbuPreferenceChange, onSaveContract, onReactivate, onRetire }: { tab: 'identificacion' | 'datos-personales' | 'ubicabilidad' | 'contrato' | 'historial' | 'informacion-adicional' | 'informacion-retiro' | 'documentos'; employee: Employee; profile: EmployeeProfile; catalogs: Catalogs; documentTypes: DocumentTypeConfiguration[]; sbuRecords: SbuRecord[]; sbuEnabled: boolean; contractLines: ContractHistoryLine[]; pendingContractNumber?: number; onUpdateEmployee: (changes: Partial<Employee>) => void; onSaveProfile: (profile: Partial<EmployeeProfile>) => void; onSbuPreferenceChange: (enabled: boolean, salary: string) => void; onSaveContract: (line: ContractHistoryLine) => void; onReactivate: () => void; onRetire: (endDate: string, exitReason: string, exitReasonDetail: string) => void }) {
  const panelProps = { id: `panel-${tab}`, role: 'tabpanel', 'aria-labelledby': `tab-${tab}` }
  if (tab === 'identificacion') return <IdentificationForm employee={employee} onSave={onUpdateEmployee} panelProps={panelProps} />
  if (tab === 'datos-personales') return <PersonalDataForm employee={employee} profile={profile} catalogs={catalogs} onSave={onSaveProfile} panelProps={panelProps} />
  if (tab === 'ubicabilidad') return <LocationForm employee={employee} profile={profile} onSave={onSaveProfile} panelProps={panelProps} />
  if (tab === 'contrato') return <ContractForm employee={employee} catalogs={catalogs} sbuRecords={sbuRecords} sbuEnabled={sbuEnabled} contractLines={contractLines} pendingContractNumber={pendingContractNumber} onSbuPreferenceChange={onSbuPreferenceChange} onSave={onSaveContract} panelProps={panelProps} />
  if (tab === 'historial') return <ContractHistory employee={employee} lines={contractLines} catalogs={catalogs} onReactivate={onReactivate} panelProps={panelProps} />
  if (tab === 'informacion-adicional') return <AdditionalInformationForm employee={employee} profile={profile} catalogs={catalogs} onSave={onSaveProfile} panelProps={panelProps} />
  if (tab === 'informacion-retiro') return <RetirementForm employee={employee} catalogs={catalogs} lines={contractLines} onSave={onRetire} panelProps={panelProps} />
  if (tab === 'documentos') return <EmployeeDocumentsForm employee={employee} profile={profile} documentTypes={documentTypes} onSave={onSaveProfile} panelProps={panelProps} />

  return null
}

function IdentificationForm({ employee, onSave, panelProps }: { employee: Employee; onSave: (changes: Partial<Employee>) => void; panelProps: { id: string; role: string; 'aria-labelledby': string } }) {
  const nameParts = employee.name.trim().split(/\s+/)
  const splitAt = Math.ceil(nameParts.length / 2)
  const [documentType, setDocumentType] = useState<'CEDULA' | 'PASAPORTE'>(employee.documentType ?? (/^\d{10}$/.test(employee.document) ? 'CEDULA' : 'PASAPORTE'))
  const [identification, setIdentification] = useState(employee.document)
  const [names, setNames] = useState(employee.names ?? nameParts.slice(0, splitAt).join(' '))
  const [lastNames, setLastNames] = useState(employee.lastNames ?? nameParts.slice(splitAt).join(' '))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const businessName = `${lastNames.trim()} ${names.trim()}`.trim()

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (documentType === 'CEDULA' && !/^\d{10}$/.test(identification)) nextErrors.identification = 'La cédula debe contener exactamente 10 dígitos numéricos.'
    if (documentType === 'PASAPORTE' && !/^[A-Za-z0-9]{1,20}$/.test(identification)) nextErrors.identification = 'El pasaporte debe contener entre 1 y 20 caracteres alfanuméricos.'
    if (!names.trim() || !/^[\p{L}\s'-]+$/u.test(names.trim())) nextErrors.names = 'Los nombres son obligatorios y no pueden contener números.'
    if (!lastNames.trim() || !/^[\p{L}\s'-]+$/u.test(lastNames.trim())) nextErrors.lastNames = 'Los apellidos son obligatorios y no pueden contener números.'
    setErrors(nextErrors)
    const valid = Object.keys(nextErrors).length === 0
    setSaved(valid)
    if (valid) onSave({ documentType, document: identification, names: names.trim(), lastNames: lastNames.trim(), businessName, name: `${names.trim()} ${lastNames.trim()}`.trim() })
  }

  const resetDocument = (value: 'CEDULA' | 'PASAPORTE') => {
    setDocumentType(value)
    setIdentification('')
    setErrors(current => ({ ...current, identification: '' }))
    setSaved(false)
  }

  return <section className="panel employee-tab-panel" {...panelProps}>
    <div className="panel-heading"><div><h2>Identificación</h2></div></div>
    <form className="identification-form" onSubmit={submit} noValidate>
      {Object.values(errors).some(Boolean) && <div className="form-error" role="alert"><strong>Revisa los campos indicados.</strong><span>No se guardaron los cambios.</span></div>}
      {saved && <div className="form-success" role="status"><CheckCircle2 size={19} /><span>Información guardada para las pruebas de nómina.</span></div>}
      <div className="form-grid identification-grid">
        <div className="field"><label htmlFor="document-type">Documento <span>Obligatorio</span></label><select id="document-type" value={documentType} onChange={event => resetDocument(event.target.value as 'CEDULA' | 'PASAPORTE')}><option value="CEDULA">CÉDULA</option><option value="PASAPORTE">PASAPORTE</option></select></div>
        <div className="field"><label htmlFor="employee-identification">Identificación <span>Obligatorio</span></label><input id="employee-identification" value={identification} onChange={event => { const value = documentType === 'CEDULA' ? event.target.value.replace(/\D/g, '').slice(0, 10) : event.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 20); setIdentification(value); setSaved(false) }} inputMode={documentType === 'CEDULA' ? 'numeric' : 'text'} maxLength={documentType === 'CEDULA' ? 10 : 20} aria-invalid={Boolean(errors.identification)} aria-describedby="identification-help identification-error" /><small id="identification-help" className="field-help">{documentType === 'CEDULA' ? 'Exactamente 10 dígitos numéricos.' : 'Máximo 20 caracteres alfanuméricos.'}</small>{errors.identification && <small id="identification-error" className="field-error">{errors.identification}</small>}</div>
        <div className="field"><label htmlFor="employee-names">Nombres <span>Obligatorio</span></label><input id="employee-names" value={names} onChange={event => { setNames(event.target.value.replace(/[0-9]/g, '')); setSaved(false) }} aria-invalid={Boolean(errors.names)} aria-describedby="names-error" />{errors.names && <small id="names-error" className="field-error">{errors.names}</small>}</div>
        <div className="field"><label htmlFor="employee-last-names">Apellidos <span>Obligatorio</span></label><input id="employee-last-names" value={lastNames} onChange={event => { setLastNames(event.target.value.replace(/[0-9]/g, '')); setSaved(false) }} aria-invalid={Boolean(errors.lastNames)} aria-describedby="last-names-error" />{errors.lastNames && <small id="last-names-error" className="field-error">{errors.lastNames}</small>}</div>
        <div className="field full-width-field"><label htmlFor="business-name">Razón Social</label><input id="business-name" className="readonly-result" value={businessName} readOnly aria-readonly="true" /><small className="field-help">Resultado automático: APELLIDOS + espacio + NOMBRES.</small></div>
      </div>
      <div className="form-footer"><span>Los cambios permanecerán disponibles al recargar la aplicación.</span><button type="submit" className="button primary">Guardar identificación</button></div>
    </form>
  </section>
}

function PersonalDataForm({ employee, profile, catalogs, onSave, panelProps, dependentsReadOnly = false }: { employee: Employee; profile: EmployeeProfile; catalogs: Catalogs; onSave: (profile: Partial<EmployeeProfile>) => void; panelProps: { id: string; role: string; 'aria-labelledby': string }; dependentsReadOnly?: boolean }) {
  type MaritalStatus = 'SOLTERO' | 'CASADO' | 'DIVORCIADO' | 'UNION_HECHO' | 'VIUDO'
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? '')
  const [gender, setGender] = useState(profile.gender ?? '')
  const [pregnant, setPregnant] = useState(profile.gender === 'FEMENINO' && Boolean(profile.pregnant))
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(profile.estimatedDeliveryDate ?? '')
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>(profile.maritalStatus ?? 'SOLTERO')
  const [partnerId, setPartnerId] = useState(profile.partnerId ?? '')
  const [partnerName, setPartnerName] = useState(profile.partnerName ?? '')
  const [partnerPhone, setPartnerPhone] = useState(profile.partnerPhone ?? '')
  const [emergencyContact, setEmergencyContact] = useState(profile.emergencyContact ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState(profile.emergencyPhone ?? '')
  const [relationship, setRelationship] = useState(profile.relationship ?? '')
  const [bank, setBank] = useState(profile.bank ?? '')
  const [accountType, setAccountType] = useState(profile.accountType ?? '')
  const [accountNumber, setAccountNumber] = useState(profile.accountNumber ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [showDependentForm, setShowDependentForm] = useState(false)
  const [dependents, setDependents] = useState<FamilyDependent[]>(profile.dependents ?? [])
  const [dependentName, setDependentName] = useState('')
  const [dependentGender, setDependentGender] = useState<FamilyDependent['gender'] | ''>('')
  const [dependentRelationship, setDependentRelationship] = useState('')
  const [dependentDisability, setDependentDisability] = useState(false)
  const [dependentBirthDate, setDependentBirthDate] = useState('')
  const [dependentActive, setDependentActive] = useState(true)
  const [dependentInactiveDate, setDependentInactiveDate] = useState('')
  const [dependentErrors, setDependentErrors] = useState<Record<string, string>>({})
  const showPartner = maritalStatus === 'CASADO' || maritalStatus === 'DIVORCIADO' || maritalStatus === 'UNION_HECHO'
  const relationshipOptions = catalogs['tipos-parentesco'].filter(item => item.status === 'ACTIVO').sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const dependentSort = useSortableRows(dependents, { fullName: row => row.fullName, gender: row => row.gender, relationship: row => row.relationship, birthDate: row => row.birthDate.split('/').reverse().join('-'), status: row => row.active ? 'Activo' : 'Inactivo' })

  const validDate = (value: string) => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
    if (!match) return false
    const day = Number(match[1]); const month = Number(match[2]); const year = Number(match[3])
    const date = new Date(Date.UTC(year, month - 1, day))
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  }

  const formatDateDraft = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  }

  const phoneDraft = (value: string) => {
    const hasPlus = value.trim().startsWith('+')
    const digits = value.replace(/\D/g, '').slice(0, 15)
    return `${hasPlus ? '+' : ''}${digits}`
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!validDate(birthDate)) nextErrors.birthDate = 'Ingresa una fecha válida en formato DD/MM/AAAA.'
    if (!gender) nextErrors.gender = 'Selecciona el género.'
    if (gender === 'FEMENINO' && pregnant && !validDate(estimatedDeliveryDate)) nextErrors.estimatedDeliveryDate = 'Ingresa una fecha estimada válida en formato DD/MM/AAAA.'
    if (showPartner) {
      if (!/^\d{10}$/.test(partnerId)) nextErrors.partnerId = 'La identificación debe contener exactamente 10 dígitos.'
      if (!partnerName.trim()) nextErrors.partnerName = 'Ingresa el nombre completo.'
      if (!/^\+?\d{1,15}$/.test(partnerPhone)) nextErrors.partnerPhone = 'Ingresa hasta 15 dígitos; el signo + solo puede ir al inicio.'
    }
    if (emergencyPhone && !/^\+?\d{1,15}$/.test(emergencyPhone)) nextErrors.emergencyPhone = 'Ingresa hasta 15 dígitos; el signo + solo puede ir al inicio.'
    if (bank && !['Bolivariano', 'De Guayaquil', 'Pacífico', 'Pichincha', 'Produbanco'].includes(bank)) nextErrors.bank = 'Selecciona un banco de la lista.'
    if (accountNumber && !/^\d{1,20}$/.test(accountNumber)) nextErrors.accountNumber = 'El número de cuenta debe contener entre 1 y 20 dígitos.'
    setErrors(nextErrors)
    const valid = Object.keys(nextErrors).length === 0
    setSaved(valid)
    if (valid) onSave({ birthDate, gender, pregnant: gender === 'FEMENINO' ? pregnant : false, estimatedDeliveryDate: gender === 'FEMENINO' && pregnant ? estimatedDeliveryDate : '', pregnancyRegisteredAt: gender === 'FEMENINO' && pregnant ? profile.pregnancyRegisteredAt || currentEcuadorDate() : '', maritalStatus, partnerId: showPartner ? partnerId : '', partnerName: showPartner ? partnerName.trim() : '', partnerPhone: showPartner ? partnerPhone : '', emergencyContact: emergencyContact.trim(), emergencyPhone, relationship, bank, accountType, accountNumber, dependents })
  }

  const change = (callback: () => void) => { callback(); setSaved(false) }
  const addDependent = () => {
    const nextErrors: Record<string, string> = {}
    if (!dependentName.trim()) nextErrors.name = 'Ingresa el nombre completo del familiar.'
    if (!dependentGender) nextErrors.gender = 'Selecciona el género.'
    if (!dependentRelationship) nextErrors.relationship = 'Selecciona el parentesco.'
    if (!validDate(dependentBirthDate)) nextErrors.birthDate = 'Ingresa una fecha válida en formato DD/MM/AAAA.'
    if (!dependentActive && !validDate(dependentInactiveDate)) nextErrors.inactiveDate = 'Ingresa una fecha válida de inactividad.'
    if (!dependentActive && validDate(dependentBirthDate) && validDate(dependentInactiveDate)) {
      const toComparableDate = (value: string) => { const [day, month, year] = value.split('/'); return `${year}-${month}-${day}` }
      if (toComparableDate(dependentInactiveDate) < toComparableDate(dependentBirthDate)) nextErrors.inactiveDate = 'La fecha de inactividad no puede ser anterior al nacimiento.'
    }
    setDependentErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const relationshipName = relationshipOptions.find(item => item.id === dependentRelationship)?.name ?? ''
    setDependents(current => [...current, { id: `FAM-${Date.now()}`, fullName: dependentName.trim(), gender: dependentGender as FamilyDependent['gender'], relationship: relationshipName, disability: dependentDisability, birthDate: dependentBirthDate, active: dependentActive, inactiveDate: dependentActive ? '' : dependentInactiveDate }])
    setDependentName(''); setDependentGender(''); setDependentRelationship(''); setDependentDisability(false); setDependentBirthDate(''); setDependentActive(true); setDependentInactiveDate(''); setDependentErrors({}); setShowDependentForm(false)
  }
  return <section className="panel employee-tab-panel" {...panelProps}>
    <div className="panel-heading"><div><h2>Datos Personales</h2></div></div>
    <form className="identification-form" onSubmit={submit} noValidate>
      {Object.values(errors).some(Boolean) && <div className="form-error" role="alert"><strong>Revisa los campos indicados.</strong><span>No se guardaron los cambios.</span></div>}
      {saved && <div className="form-success" role="status"><CheckCircle2 size={19} /><span>Datos personales guardados para las pruebas de nómina.</span></div>}
      <div className="form-section-heading"><h3>Información personal</h3></div>
      <div className="form-grid identification-grid">
        <div className="field"><label htmlFor="birth-date">Fecha de Nacimiento <span>Obligatorio</span></label><input id="birth-date" value={birthDate} onChange={event => change(() => setBirthDate(formatDateDraft(event.target.value)))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.birthDate)} />{errors.birthDate && <small className="field-error">{errors.birthDate}</small>}</div>
        <div className="field"><label htmlFor="gender">Género <span>Obligatorio</span></label><select id="gender" value={gender} onChange={event => change(() => { const nextGender = event.target.value; setGender(nextGender); if (nextGender !== 'FEMENINO') { setPregnant(false); setEstimatedDeliveryDate('') } })} aria-invalid={Boolean(errors.gender)}><option value="">Selecciona una opción</option><option value="MASCULINO">Masculino</option><option value="FEMENINO">Femenino</option><option value="OTRO">Otro</option></select>{errors.gender && <small className="field-error">{errors.gender}</small>}</div>
        <div className="field"><label htmlFor="marital-status">Estado Civil <span>Obligatorio</span></label><select id="marital-status" value={maritalStatus} onChange={event => change(() => setMaritalStatus(event.target.value as MaritalStatus))}><option value="SOLTERO">Soltero</option><option value="CASADO">Casado</option><option value="DIVORCIADO">Divorciado</option><option value="UNION_HECHO">Unión de Hecho</option><option value="VIUDO">Viudo</option></select></div>
      </div>
      {gender === 'FEMENINO' && <div className="form-grid identification-grid pregnancy-fields"><ToggleField id="is-pregnant" label="¿Está Embarazada?" checked={pregnant} onChange={checked => change(() => { setPregnant(checked); if (!checked) setEstimatedDeliveryDate('') })} />{pregnant && <div className="field"><label htmlFor="estimated-delivery-date">Fecha Estimada <span>Obligatorio</span></label><input id="estimated-delivery-date" value={estimatedDeliveryDate} onChange={event => change(() => setEstimatedDeliveryDate(formatDateDraft(event.target.value)))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.estimatedDeliveryDate)} />{errors.estimatedDeliveryDate && <small className="field-error">{errors.estimatedDeliveryDate}</small>}</div>}</div>}
      {showPartner && <><div className="conditional-section"><div><strong>Información del cónyuge</strong><p>Completa los datos del cónyuge para el estado civil {maritalStatus === 'UNION_HECHO' ? 'Unión de Hecho' : maritalStatus.charAt(0) + maritalStatus.slice(1).toLowerCase()}.</p></div></div><div className="form-grid identification-grid"><div className="field"><label htmlFor="partner-id">Identificación del Cónyuge <span>Obligatorio</span></label><input id="partner-id" value={partnerId} onChange={event => change(() => setPartnerId(event.target.value.replace(/\D/g, '').slice(0, 10)))} inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.partnerId)} /><small className="field-help">Exactamente 10 dígitos.</small>{errors.partnerId && <small className="field-error">{errors.partnerId}</small>}</div><div className="field"><label htmlFor="partner-name">Nombre Completo del Cónyuge <span>Obligatorio</span></label><input id="partner-name" value={partnerName} onChange={event => change(() => setPartnerName(event.target.value.replace(/[0-9]/g, '').slice(0, 100)))} aria-invalid={Boolean(errors.partnerName)} />{errors.partnerName && <small className="field-error">{errors.partnerName}</small>}</div><div className="field"><label htmlFor="partner-phone">Teléfono del Cónyuge <span>Obligatorio</span></label><input id="partner-phone" value={partnerPhone} onChange={event => change(() => setPartnerPhone(phoneDraft(event.target.value)))} inputMode="tel" maxLength={16} placeholder="+593..." aria-invalid={Boolean(errors.partnerPhone)} />{errors.partnerPhone && <small className="field-error">{errors.partnerPhone}</small>}</div></div></>}
      <div className="form-section-heading"><h3>Contacto de emergencia</h3></div>
      <div className="form-grid identification-grid">
        <div className="field"><label htmlFor="emergency-contact">Contacto Emergencia</label><input id="emergency-contact" value={emergencyContact} onChange={event => change(() => setEmergencyContact(event.target.value.slice(0, 50)))} maxLength={50} /><small className="field-help">Opcional · máximo 50 caracteres.</small></div>
        <div className="field"><label htmlFor="emergency-phone">Teléfono de Emergencia</label><input id="emergency-phone" value={emergencyPhone} onChange={event => change(() => setEmergencyPhone(phoneDraft(event.target.value)))} inputMode="tel" maxLength={16} placeholder="+593..." aria-invalid={Boolean(errors.emergencyPhone)} /><small className="field-help">Opcional · hasta 15 dígitos y + al inicio.</small>{errors.emergencyPhone && <small className="field-error">{errors.emergencyPhone}</small>}</div>
        <div className="field"><label htmlFor="relationship">Parentesco</label><select id="relationship" value={relationship} onChange={event => change(() => setRelationship(event.target.value))}><option value="">Selecciona una opción</option><option value="CONYUGE">Cónyuge</option><option value="HIJO">Hijo</option><option value="AMIGO">Amigo</option><option value="OTRO">Otro</option></select><small className="field-help">Opcional.</small></div>
      </div>
      <div className="form-section-heading"><h3>Información bancaria</h3></div>
      <div className="form-grid identification-grid">
        <div className="field"><label htmlFor="bank">Banco</label><input id="bank" list="bank-options" value={bank} onChange={event => change(() => setBank(event.target.value))} placeholder="Escribe para buscar" autoComplete="off" aria-invalid={Boolean(errors.bank)} /><datalist id="bank-options"><option value="Bolivariano" /><option value="De Guayaquil" /><option value="Pacífico" /><option value="Pichincha" /><option value="Produbanco" /></datalist><small className="field-help">Opcional.</small>{errors.bank && <small className="field-error">{errors.bank}</small>}</div>
        <div className="field"><label htmlFor="account-type">Tipo de Cuenta</label><select id="account-type" value={accountType} onChange={event => change(() => setAccountType(event.target.value))}><option value="">Selecciona una opción</option><option value="AHORROS">Ahorros</option><option value="CORRIENTE">Corriente</option><option value="ESPECIAL_PAGOS">Especial de Pagos</option></select><small className="field-help">Opcional.</small></div>
        <div className="field"><label htmlFor="account-number">Número de Cuenta</label><input id="account-number" value={accountNumber} onChange={event => change(() => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 20)))} inputMode="numeric" maxLength={20} aria-invalid={Boolean(errors.accountNumber)} /><small className="field-help">Opcional · máximo 20 dígitos.</small>{errors.accountNumber && <small className="field-error">{errors.accountNumber}</small>}</div>
      </div>
      <div className="family-section">
        <div className="family-section-heading"><div><h3>Cargas familiares</h3><p>Familiares y dependientes asociados al empleado.</p></div>{!dependentsReadOnly && <button type="button" className="button secondary" onClick={() => { setShowDependentForm(current => !current); setDependentErrors({}) }}><Plus size={17} /> {showDependentForm ? 'Cerrar' : 'Agregar'}</button>}</div>
        {!dependentsReadOnly && showDependentForm && <div className="family-dependent-form">
          {Object.values(dependentErrors).some(Boolean) && <div className="form-error" role="alert"><strong>Revisa los datos de la carga familiar.</strong><span>No se agregó el registro.</span></div>}
          <div className="form-grid identification-grid">
            <div className="field full-width-field"><label htmlFor="dependent-name">Nombre Completo Familiar <span>Obligatorio</span></label><input id="dependent-name" value={dependentName} onChange={event => setDependentName(event.target.value.slice(0, 50))} maxLength={50} aria-invalid={Boolean(dependentErrors.name)} /><small className="field-help">Máximo 50 caracteres · {dependentName.length}/50.</small>{dependentErrors.name && <small className="field-error">{dependentErrors.name}</small>}</div>
            <div className="field"><label htmlFor="dependent-gender">Género <span>Obligatorio</span></label><select id="dependent-gender" value={dependentGender} onChange={event => setDependentGender(event.target.value as FamilyDependent['gender'] | '')} aria-invalid={Boolean(dependentErrors.gender)}><option value="">Selecciona una opción</option><option value="MASCULINO">Masculino</option><option value="FEMENINO">Femenino</option><option value="OTRO">Otro</option></select>{dependentErrors.gender && <small className="field-error">{dependentErrors.gender}</small>}</div>
            <div className="field"><label htmlFor="dependent-relationship">Parentesco <span>Obligatorio</span></label><select id="dependent-relationship" value={dependentRelationship} onChange={event => setDependentRelationship(event.target.value)} aria-invalid={Boolean(dependentErrors.relationship)}><option value="">Selecciona una opción</option>{relationshipOptions.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select><small className="field-help">Opciones configuradas en Configuraciones / Tipos de parentesco.</small>{dependentErrors.relationship && <small className="field-error">{dependentErrors.relationship}</small>}</div>
            <div className="field"><label htmlFor="dependent-birth-date">Fecha de Nacimiento <span>Obligatorio</span></label><input id="dependent-birth-date" value={dependentBirthDate} onChange={event => setDependentBirthDate(formatDateDraft(event.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(dependentErrors.birthDate)} />{dependentErrors.birthDate && <small className="field-error">{dependentErrors.birthDate}</small>}</div>
          </div>
          <div className="toggle-grid family-toggle-grid"><ToggleField id="dependent-disability" label="Invalidez" checked={dependentDisability} onChange={setDependentDisability} /><ToggleField id="dependent-active" label="Estado" checked={dependentActive} checkedLabel="Activo" uncheckedLabel="Inactivo" onChange={(checked) => { setDependentActive(checked); if (checked) setDependentInactiveDate('') }} /></div>
          {!dependentActive && <div className="form-grid identification-grid"><div className="field"><label htmlFor="dependent-inactive-date">Fecha de Inactividad <span>Obligatorio</span></label><input id="dependent-inactive-date" value={dependentInactiveDate} onChange={event => setDependentInactiveDate(formatDateDraft(event.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(dependentErrors.inactiveDate)} />{dependentErrors.inactiveDate && <small className="field-error">{dependentErrors.inactiveDate}</small>}</div></div>}
          <div className="dependent-actions"><button type="button" className="button secondary" onClick={() => { setShowDependentForm(false); setDependentErrors({}) }}>Cancelar</button><button type="button" className="button primary" onClick={addDependent}><Plus size={17} /> Agregar carga</button></div>
        </div>}
        <div className="table-scroll family-table" role="region" aria-label="Cargas familiares del empleado" tabIndex={0}><table><thead><tr><SortableTh label="Nombres completos" sortKey="fullName" sort={dependentSort.sort} onSort={dependentSort.toggleSort} /><SortableTh label="Género" sortKey="gender" sort={dependentSort.sort} onSort={dependentSort.toggleSort} /><SortableTh label="Parentesco" sortKey="relationship" sort={dependentSort.sort} onSort={dependentSort.toggleSort} /><SortableTh label="Fecha de nacimiento" sortKey="birthDate" sort={dependentSort.sort} onSort={dependentSort.toggleSort} /><SortableTh label="Estado" sortKey="status" sort={dependentSort.sort} onSort={dependentSort.toggleSort} /></tr></thead><tbody>
          {dependentSort.sortedRows.map(item => <tr key={item.id}><td><strong>{item.fullName}</strong>{item.disability && <span className="cell-meta">Invalidez registrada</span>}</td><td>{item.gender === 'MASCULINO' ? 'Masculino' : item.gender === 'FEMENINO' ? 'Femenino' : 'Otro'}</td><td>{item.relationship}</td><td>{item.birthDate}</td><td><Badge tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Activo' : 'Inactivo'}</Badge>{item.inactiveDate && <span className="cell-meta">Desde {item.inactiveDate}</span>}</td></tr>)}
          {!dependents.length && <tr><td colSpan={5}><div className="empty-state compact"><Users /><strong>Sin cargas familiares</strong><p>{dependentsReadOnly ? 'No existen familiares registrados.' : 'Selecciona Agregar para registrar la primera.'}</p></div></td></tr>}
        </tbody></table></div>
        {dependentsReadOnly && <div className="family-readonly-message"><AlertTriangle size={18} /><span>Para modificar la información de sus familiares, favor entregar la documentación correspondiente a Talento Humano.</span></div>}
      </div>
      <div className="form-footer"><span>Los cambios permanecerán disponibles al recargar la aplicación.</span><button type="submit" className="button primary">Guardar datos personales</button></div>
    </form>
  </section>
}

function AdditionalInformationForm({ employee, profile, catalogs, onSave, panelProps }: { employee: Employee; profile: EmployeeProfile; catalogs: Catalogs; onSave: (profile: Partial<EmployeeProfile>) => void; panelProps: { id: string; role: string; 'aria-labelledby': string } }) {
  const [saved, setSaved] = useState(false)
  const [bonuses, setBonuses] = useState<FixedBonus[]>(() => profile.bonuses ?? (employee.id === 'EMP-001' ? [{ id: 'BON-001', motive: 'Responsabilidad', rubricId: 'RUB-002', rubricName: 'Bono de desempeño', value: '80.00', status: 'ACTIVO' }, { id: 'BON-002', motive: 'Movilización', rubricId: 'RUB-003', rubricName: 'Anticipo autorizado', value: '45.50', status: 'ACTIVO' }] : []))
  const [addingBonus, setAddingBonus] = useState(false)
  const [editingBonus, setEditingBonus] = useState<FixedBonus | null>(null)
  const rubricName = (bonus: FixedBonus) => catalogs.rubros.find(rubric => rubric.id === bonus.rubricId)?.name ?? bonus.rubricName ?? 'Sin rubro'
  const noveltyKind = (bonus: FixedBonus) => bonus.kind ?? (catalogs.rubros.find(rubric => rubric.id === bonus.rubricId)?.rubricType === 'DESCUENTO' ? 'DESCUENTO' : 'BONO')
  const bonusSort = useSortableRows(bonuses, { motive: row => row.motive, kind: row => noveltyKind(row), rubric: row => rubricName(row), value: row => decimalToCents(row.value), status: row => row.status })
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaved(true)
    onSave({ bonuses })
  }
  return <section className="panel employee-tab-panel" {...panelProps}>
    <div className="panel-heading"><div><h2>Información Adicional</h2></div></div>
    <form className="identification-form" onSubmit={submit} noValidate>
      {saved && <div className="form-success" role="status"><CheckCircle2 size={19} /><span>Información adicional guardada para las pruebas de nómina.</span></div>}
      <div className="form-section-heading additional-bonus-heading"><div><h3>Bonos/Descuentos Fijos</h3><p>Novedades recurrentes configuradas para el empleado.</p></div><button type="button" className="button secondary" onClick={() => setAddingBonus(true)}><Plus size={17} /> Nueva Novedad</button></div>
      <div className="table-scroll" role="region" aria-label={`Bonos y descuentos fijos de ${employee.name || 'nuevo empleado'}`} tabIndex={0}><table className="active-bonus-table"><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Motivo" sortKey="motive" sort={bonusSort.sort} onSort={bonusSort.toggleSort} /><SortableTh label="Bono/Descuento" sortKey="kind" sort={bonusSort.sort} onSort={bonusSort.toggleSort} /><SortableTh label="Rubro" sortKey="rubric" sort={bonusSort.sort} onSort={bonusSort.toggleSort} /><SortableTh label="Valor" sortKey="value" sort={bonusSort.sort} onSort={bonusSort.toggleSort} className="numeric" /><SortableTh label="Estado" sortKey="status" sort={bonusSort.sort} onSort={bonusSort.toggleSort} /></tr></thead><tbody>{bonusSort.sortedRows.map(row => <tr key={row.id}><td className="row-action-cell"><button type="button" className="icon-button small edit-icon" onClick={() => setEditingBonus(row)} aria-label={`Editar novedad ${row.motive}`} title={`Editar novedad ${row.motive}`}><Pencil size={17} /></button></td><td><strong>{row.motive}</strong></td><td><Badge tone={noveltyKind(row) === 'BONO' ? 'success' : 'warning'}>{noveltyKind(row) === 'BONO' ? 'Bono' : 'Descuento'}</Badge></td><td>{rubricName(row)}</td><td className="numeric money">{money(row.value)}</td><td><Badge tone={row.status === 'ACTIVO' ? 'success' : 'neutral'}>{row.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</Badge></td></tr>)}{!bonusSort.sortedRows.length && <tr><td colSpan={6}><div className="empty-state compact"><CircleDollarSign /><strong>Sin bonos o descuentos fijos</strong><p>Selecciona Nueva Novedad para registrar la primera.</p></div></td></tr>}</tbody></table></div>
      <div className="form-footer"><span>Las novedades fijas permanecerán disponibles al recargar.</span><button type="submit" className="button primary">Guardar información adicional</button></div>
    </form>
    {(addingBonus || editingBonus) && <FixedBonusDialog bonus={editingBonus ?? undefined} rubrics={catalogs.rubros} onClose={() => { setAddingBonus(false); setEditingBonus(null) }} onSave={(bonus) => { setBonuses(current => current.some(item => item.id === bonus.id) ? current.map(item => item.id === bonus.id ? bonus : item) : [...current, bonus]); setAddingBonus(false); setEditingBonus(null) }} />}
  </section>
}

function EmployeeDocumentsForm({ employee, profile, documentTypes, onSave, panelProps }: { employee: Employee; profile: EmployeeProfile; documentTypes: DocumentTypeConfiguration[]; onSave: (profile: Partial<EmployeeProfile>) => void; panelProps: { id: string; role: string; 'aria-labelledby': string } }) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [resume, setResume] = useState<File | null>(null)
  const [companyResume, setCompanyResume] = useState<File | null>(null)
  const [documents, setDocuments] = useState<EmployeeAttachedDocument[]>(() => profile.documents ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const employeeDocumentTypes = documentTypes
    .filter(documentType => documentType.status === 'ACTIVO' && documentType.employees)
    .sort((left, right) => left.name.localeCompare(right.name, 'es'))

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])

  const clearError = (key: string) => setErrors(current => { const { [key]: _removed, ...rest } = current; return rest })
  const selectPhoto = (file?: File) => {
    setSaved(false)
    if (!file) return
    if (!/\.(jpe?g|png|heif|heic|webp)$/i.test(file.name)) {
      setErrors(current => ({ ...current, photo: 'Selecciona una imagen JPG, JPEG, PNG, HEIF o WebP.' }))
      return
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    rememberUploadedFile(file)
    clearError('photo')
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }
  const selectPdf = (kind: 'resume' | 'companyResume', file?: File) => {
    setSaved(false)
    if (!file) return
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setErrors(current => ({ ...current, [kind]: 'Selecciona un documento PDF.' }))
      return
    }
    rememberUploadedFile(file)
    clearError(kind)
    if (kind === 'resume') setResume(file)
    else setCompanyResume(file)
  }
  const selectConfiguredDocument = (documentType: DocumentTypeConfiguration, file?: File) => {
    setSaved(false)
    if (!file) return
    const errorKey = `document-${documentType.id}`
    if (file.size > 10 * 1024 * 1024) {
      setErrors(current => ({ ...current, [errorKey]: 'El archivo no puede superar 10 MB.' }))
      return
    }
    rememberUploadedFile(file)
    clearError(errorKey)
    setDocuments(current => {
      const existing = current.find(document => document.documentTypeId === documentType.id)
      const nextDocument: EmployeeAttachedDocument = {
        id: existing?.id ?? `EDOC-${String(Date.now()).slice(-8)}-${documentType.id}`,
        documentTypeId: documentType.id,
        documentTypeName: documentType.name,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: currentEcuadorDate(),
      }
      return existing
        ? current.map(document => document.documentTypeId === documentType.id ? nextDocument : document)
        : [...current, nextDocument]
    })
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const hasErrors = Object.values(errors).some(Boolean)
    setSaved(!hasErrors)
    if (!hasErrors) onSave({
      photoName: photo?.name ?? profile.photoName ?? '',
      resumeName: resume?.name ?? profile.resumeName ?? '',
      companyResumeName: companyResume?.name ?? profile.companyResumeName ?? '',
      documents,
    })
  }

  return <section className="panel employee-tab-panel" {...panelProps}>
    <div className="panel-heading"><div><h2>Documentos</h2></div><Badge tone="info">{employeeDocumentTypes.length + 3} opciones</Badge></div>
    <form className="identification-form" onSubmit={submit} noValidate>
      {Object.values(errors).some(Boolean) && <div className="form-error" role="alert"><strong>Revisa los archivos seleccionados.</strong><span>No se guardaron los cambios.</span></div>}
      {saved && <div className="form-success" role="status"><CheckCircle2 size={19} /><span>Documentos de {employee.name || 'este empleado'} guardados correctamente.</span></div>}
      <div className="form-section-heading"><h3>Documentos principales</h3></div>
      <div className="additional-files-grid">
        <div className="file-upload-card photo-upload-card"><div className="file-preview">{photoPreview ? <img src={photoPreview} alt="Vista previa de la foto del empleado" /> : <Users size={34} />}</div><div><label htmlFor="employee-photo">Foto</label><p>JPG, JPEG, PNG, HEIF o WebP.</p><input id="employee-photo" type="file" accept=".jpg,.jpeg,.png,.heif,.heic,.webp,image/jpeg,image/png,image/heif,image/heic,image/webp" onChange={event => selectPhoto(event.target.files?.[0])} />{(photo?.name || profile.photoName) && <div className="selected-file-row"><span className="selected-file">{photo?.name ?? profile.photoName}</span><UploadedFileDownloadButton fileName={photo?.name ?? profile.photoName ?? ''} /></div>}{errors.photo && <small className="field-error">{errors.photo}</small>}</div></div>
        <div className="file-upload-card"><div className="file-document-icon"><FileText /></div><div><label htmlFor="employee-resume">Hoja de Vida</label><p>Documento personal en formato PDF.</p><input id="employee-resume" type="file" accept=".pdf,application/pdf" onChange={event => selectPdf('resume', event.target.files?.[0])} />{(resume?.name || profile.resumeName) && <div className="selected-file-row"><span className="selected-file">{resume?.name ?? profile.resumeName}</span><UploadedFileDownloadButton fileName={resume?.name ?? profile.resumeName ?? ''} /></div>}{errors.resume && <small className="field-error">{errors.resume}</small>}</div></div>
        <div className="file-upload-card"><div className="file-document-icon"><Building2 /></div><div><label htmlFor="employee-company-resume">Hoja de Vida Empresa</label><p>Documento empresarial en formato PDF.</p><input id="employee-company-resume" type="file" accept=".pdf,application/pdf" onChange={event => selectPdf('companyResume', event.target.files?.[0])} />{(companyResume?.name || profile.companyResumeName) && <div className="selected-file-row"><span className="selected-file">{companyResume?.name ?? profile.companyResumeName}</span><UploadedFileDownloadButton fileName={companyResume?.name ?? profile.companyResumeName ?? ''} /></div>}{errors.companyResume && <small className="field-error">{errors.companyResume}</small>}</div></div>
      </div>
      <div className="form-section-heading"><h3>Documentos configurados para empleados</h3></div>
      {employeeDocumentTypes.length ? <div className="additional-files-grid">
        {employeeDocumentTypes.map(documentType => {
          const attachedDocument = documents.find(document => document.documentTypeId === documentType.id)
          const errorKey = `document-${documentType.id}`
          return <div className="file-upload-card" key={documentType.id}><div className="file-document-icon"><Upload /></div><div><label htmlFor={`employee-document-${documentType.id}`}>{documentType.name}</label><p>PDF, Word o imagen · máximo 10 MB.</p><input id={`employee-document-${documentType.id}`} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={event => selectConfiguredDocument(documentType, event.target.files?.[0])} />{attachedDocument && <div className="selected-file-row"><span className="selected-file">{attachedDocument.fileName} · {(attachedDocument.fileSize / 1024).toFixed(1)} KB</span><UploadedFileDownloadButton fileName={attachedDocument.fileName} /></div>}{errors[errorKey] && <small className="field-error">{errors[errorKey]}</small>}</div></div>
        })}
      </div> : <div className="empty-state compact"><FileText /><strong>Sin tipos de documento habilitados</strong><p>Los registros activos marcados para Empleados en Configuración General / Tipo de Documento aparecerán aquí automáticamente.</p></div>}
      <div className="form-footer"><span>Selecciona un archivo nuevamente para reemplazar el documento registrado.</span><button type="submit" className="button primary">Guardar documentos</button></div>
    </form>
  </section>
}

function FixedBonusDialog({ bonus, rubrics, onClose, onSave }: { bonus?: FixedBonus; rubrics: CatalogRecord[]; onClose: () => void; onSave: (bonus: FixedBonus) => void }) {
  const [motive, setMotive] = useState(bonus?.motive ?? '')
  const initialRubric = rubrics.find(rubric => rubric.id === bonus?.rubricId)
  const [kind, setKind] = useState<NonNullable<FixedBonus['kind']>>(bonus?.kind ?? (initialRubric?.rubricType === 'DESCUENTO' ? 'DESCUENTO' : 'BONO'))
  const [rubricQuery, setRubricQuery] = useState(initialRubric?.name ?? bonus?.rubricName ?? '')
  const [value, setValue] = useState(bonus?.value ?? '')
  const [status, setStatus] = useState<FixedBonus['status']>(bonus?.status ?? 'ACTIVO')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const decimalDraft = (input: string) => { const normalized = input.replace(',', '.').replace(/[^\d.]/g, ''); const [whole = '', ...rest] = normalized.split('.'); return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const nextErrors: Record<string, string> = {}
    const selectedRubric = rubrics.find(rubric => rubric.name.localeCompare(rubricQuery.trim(), 'es', { sensitivity: 'base' }) === 0)
    if (!motive.trim()) nextErrors.motive = 'Ingresa el motivo de la novedad.'
    if (!selectedRubric) nextErrors.rubric = 'Selecciona un rubro de la lista.'
    if (!/^\d+(\.\d{1,2})?$/.test(value) || decimalToCents(value) <= 0n) nextErrors.value = 'Ingresa un valor mayor a cero con máximo dos decimales.'
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return
    onSave({ id: bonus?.id ?? `NOV-FIJA-${String(Date.now()).slice(-6)}`, motive: motive.trim(), kind, rubricId: selectedRubric!.id, rubricName: selectedRubric!.name, value: centsToDecimal(decimalToCents(value)), status })
  }
  return <Dialog title={bonus ? 'Editar novedad fija' : 'Nueva Novedad'} description="Configura el bono o descuento recurrente del empleado." onClose={onClose}><form onSubmit={submit} noValidate>{Object.values(errors).some(Boolean) && <div className="form-error" role="alert"><strong>Revisa los campos indicados.</strong><span>No se guardó la novedad.</span></div>}<div className="form-grid">
    <div className="field full-width-field"><label htmlFor="fixed-bonus-motive">Motivo <span>Obligatorio</span></label><input id="fixed-bonus-motive" value={motive} onChange={event => setMotive(event.target.value.slice(0, 60))} maxLength={60} aria-invalid={Boolean(errors.motive)} autoFocus /><small className="field-help">Máximo 60 caracteres · {motive.length}/60.</small>{errors.motive && <small className="field-error">{errors.motive}</small>}</div>
    <div className="field full-width-field"><label htmlFor="fixed-bonus-kind">Bono/Descuento <span>Obligatorio</span></label><select id="fixed-bonus-kind" value={kind} onChange={event => setKind(event.target.value as NonNullable<FixedBonus['kind']>)}><option value="BONO">Bono</option><option value="DESCUENTO">Descuento</option></select></div>
    <div className="field full-width-field"><label htmlFor="fixed-bonus-rubric">Rubro <span>Obligatorio</span></label><input id="fixed-bonus-rubric" list="fixed-bonus-rubric-options" value={rubricQuery} onChange={event => { setRubricQuery(event.target.value); setErrors(current => ({ ...current, rubric: '' })) }} placeholder="Escribe para filtrar los rubros" autoComplete="off" aria-invalid={Boolean(errors.rubric)} /><datalist id="fixed-bonus-rubric-options">{rubrics.map(rubric => <option key={rubric.id} value={rubric.name}>{rubric.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</option>)}</datalist><small className="field-help">Incluye todos los rubros creados en Configuraciones / Rubros.</small>{errors.rubric && <small className="field-error">{errors.rubric}</small>}</div>
    <div className="field"><label htmlFor="fixed-bonus-value">Valor <span>Obligatorio</span></label><input id="fixed-bonus-value" value={value} onChange={event => setValue(decimalDraft(event.target.value))} inputMode="decimal" aria-invalid={Boolean(errors.value)} /><small className="field-help">Valor numérico con máximo dos decimales.</small>{errors.value && <small className="field-error">{errors.value}</small>}</div>
    <div className="field"><label htmlFor="fixed-bonus-status">Estado <span>Obligatorio</span></label><select id="fixed-bonus-status" value={status} onChange={event => setStatus(event.target.value as FixedBonus['status'])}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></div>
  </div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">{bonus ? 'Guardar cambios' : 'Agregar novedad'}</button></div></form></Dialog>
}

function LocationForm({ employee, profile, onSave, panelProps }: { employee: Employee; profile: EmployeeProfile; onSave: (profile: Partial<EmployeeProfile>) => void; panelProps: { id: string; role: string; 'aria-labelledby': string } }) {
  const [province, setProvince] = useState(profile.province ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [address, setAddress] = useState(profile.address ?? '')
  const [mobilePhone, setMobilePhone] = useState(profile.mobilePhone ?? '')
  const [additionalPhone, setAdditionalPhone] = useState(profile.additionalPhone ?? '')
  const [email, setEmail] = useState(profile.email ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const provinces = Object.keys(ecuadorLocations).sort((a, b) => a.localeCompare(b, 'es'))
  const selectedProvince = provinces.find(item => item.localeCompare(province.trim(), 'es', { sensitivity: 'base' }) === 0)
  const cities = selectedProvince ? [...ecuadorLocations[selectedProvince]].sort((a, b) => a.localeCompare(b, 'es')) : []

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (province.trim() && !selectedProvince) nextErrors.province = 'Selecciona una provincia de la lista.'
    if (city.trim() && (!selectedProvince || !cities.some(item => item.localeCompare(city.trim(), 'es', { sensitivity: 'base' }) === 0))) nextErrors.city = 'Selecciona una ciudad correspondiente a la provincia.'
    if (!address.trim()) nextErrors.address = 'Ingresa la dirección.'
    if (!/^\d{1,10}$/.test(mobilePhone)) nextErrors.mobilePhone = 'El teléfono celular debe contener hasta 10 dígitos.'
    if (additionalPhone && !/^\d{1,10}$/.test(additionalPhone)) nextErrors.additionalPhone = 'El teléfono adicional debe contener hasta 10 dígitos.'
    if (!email || email.length > 25 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Ingresa un correo válido de máximo 25 caracteres.'
    setErrors(nextErrors)
    const valid = Object.keys(nextErrors).length === 0
    setSaved(valid)
    if (valid) onSave({ province: province.trim(), city: city.trim(), address: address.trim(), mobilePhone, additionalPhone, email: email.trim() })
  }

  const change = (callback: () => void) => { callback(); setSaved(false) }
  return <section className="panel employee-tab-panel" {...panelProps}>
    <div className="panel-heading"><div><h2>Ubicabilidad</h2></div></div>
    <form className="identification-form" onSubmit={submit} noValidate>
      {Object.values(errors).some(Boolean) && <div className="form-error" role="alert"><strong>Revisa los campos indicados.</strong><span>No se guardaron los cambios.</span></div>}
      {saved && <div className="form-success" role="status"><CheckCircle2 size={19} /><span>Información de ubicabilidad guardada para las pruebas de nómina.</span></div>}
      <div className="form-grid identification-grid">
        <div className="field"><label htmlFor="province">Provincia</label><input id="province" list="province-options" value={province} onChange={event => change(() => { setProvince(event.target.value); setCity('') })} placeholder="Escribe para buscar" autoComplete="off" aria-invalid={Boolean(errors.province)} /><datalist id="province-options">{provinces.map(item => <option value={item} key={item} />)}</datalist><small className="field-help">Opcional · selecciona una de las 24 provincias del Ecuador.</small>{errors.province && <small className="field-error">{errors.province}</small>}</div>
        <div className="field"><label htmlFor="city">Ciudad</label><input id="city" list="city-options" value={city} onChange={event => change(() => setCity(event.target.value))} placeholder={selectedProvince ? 'Escribe para buscar' : 'Primero selecciona una provincia'} autoComplete="off" disabled={!selectedProvince} aria-invalid={Boolean(errors.city)} /><datalist id="city-options">{cities.map(item => <option value={item} key={item} />)}</datalist><small className="field-help">Opcional · las opciones se filtran por la provincia seleccionada.</small>{errors.city && <small className="field-error">{errors.city}</small>}</div>
        <div className="field full-width-field"><label htmlFor="address">Dirección <span>Obligatorio</span></label><input id="address" value={address} onChange={event => change(() => setAddress(event.target.value.slice(0, 50)))} maxLength={50} aria-invalid={Boolean(errors.address)} /><small className="field-help">Máximo 50 caracteres · {address.length}/50.</small>{errors.address && <small className="field-error">{errors.address}</small>}</div>
        <div className="field"><label htmlFor="mobile-phone">Teléfono Celular <span>Obligatorio</span></label><input id="mobile-phone" value={mobilePhone} onChange={event => change(() => setMobilePhone(event.target.value.replace(/\D/g, '').slice(0, 10)))} inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.mobilePhone)} /><small className="field-help">Máximo 10 dígitos.</small>{errors.mobilePhone && <small className="field-error">{errors.mobilePhone}</small>}</div>
        <div className="field"><label htmlFor="additional-phone">Teléfono Adicional</label><input id="additional-phone" value={additionalPhone} onChange={event => change(() => setAdditionalPhone(event.target.value.replace(/\D/g, '').slice(0, 10)))} inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.additionalPhone)} /><small className="field-help">Opcional · máximo 10 dígitos.</small>{errors.additionalPhone && <small className="field-error">{errors.additionalPhone}</small>}</div>
        <div className="field full-width-field"><label htmlFor="email">Correo Electrónico <span>Obligatorio</span></label><input id="email" value={email} onChange={event => change(() => setEmail(event.target.value.slice(0, 25)))} type="email" maxLength={25} placeholder="nombre@dominio.com" aria-invalid={Boolean(errors.email)} /><small className="field-help">Máximo 25 caracteres · {email.length}/25.</small>{errors.email && <small className="field-error">{errors.email}</small>}</div>
      </div>
      <div className="form-footer"><span>Catálogo territorial: Clasificador Geográfico Estadístico 2025 del INEC.</span><button type="submit" className="button primary">Guardar ubicabilidad</button></div>
    </form>
  </section>
}

function RetirementForm({ employee, catalogs, lines, onSave, panelProps }: { employee: Employee; catalogs: Catalogs; lines: ContractHistoryLine[]; onSave: (endDate: string, exitReason: string, exitReasonDetail: string) => void; panelProps: { id: string; role: string; 'aria-labelledby': string } }) {
  const latest = lines.at(-1)
  const motives = catalogs['motivos-salida'].filter(item => item.status === 'ACTIVO')
  const [endDate, setEndDate] = useState(latest?.endDate ?? '')
  const [motiveId, setMotiveId] = useState(motives.find(item => item.name === latest?.exitReason)?.id ?? '')
  const [motiveDetail, setMotiveDetail] = useState(latest?.exitReasonDetail ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const formatDate = (value: string) => { const digits = value.replace(/\D/g, '').slice(0, 8); if (digits.length <= 2) return digits; if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`; return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}` }
  const parseDate = (value: string) => { const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value); if (!match) return null; const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]))); return date.getUTCFullYear() === Number(match[3]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[1]) ? date : null }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const nextErrors: Record<string, string> = {}; const parsedEnd = parseDate(endDate); const parsedStart = latest ? parseDate(latest.startDate) : null
    if (!parsedEnd) nextErrors.endDate = 'Ingresa una fecha válida en formato DD/MM/AAAA.'
    else if (parsedStart && parsedEnd < parsedStart) nextErrors.endDate = 'La fecha de terminación no puede ser anterior a la fecha de ingreso.'
    if (!motiveId) nextErrors.motive = 'Selecciona un motivo de retiro.'
    setErrors(nextErrors); const valid = Object.keys(nextErrors).length === 0; setSaved(valid)
    if (valid) onSave(endDate, motives.find(item => item.id === motiveId)?.name ?? '', motiveDetail.trim())
  }
  return <section className="panel employee-tab-panel" {...panelProps}><div className="panel-heading"><div><h2>Información de Retiro</h2></div><Badge tone={latest?.endDate ? 'neutral' : 'warning'}>{latest?.endDate ? 'Retiro registrado' : 'Contrato activo'}</Badge></div><form className="identification-form" onSubmit={submit} noValidate>{Object.values(errors).some(Boolean) && <div className="form-error" role="alert"><strong>Revisa los campos indicados.</strong><span>No se guardaron los cambios.</span></div>}{saved && <div className="form-success" role="status"><CheckCircle2 size={19} /><span>El retiro se registró y el Historial fue actualizado.</span></div>}<div className="notice warning retirement-warning"><AlertTriangle size={20} /><div><strong>Esta acción cierra el contrato {latest?.contractNumber ?? 1}</strong><p>Después del retiro, una reactivación creará un nuevo número de contrato.</p></div></div><div className="form-grid identification-grid"><div className="field"><label htmlFor="contract-end-date">Fecha Terminación de Contrato <span>Obligatorio</span></label><input id="contract-end-date" value={endDate} onChange={event => { setEndDate(formatDate(event.target.value)); setSaved(false) }} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.endDate)} />{errors.endDate && <small className="field-error">{errors.endDate}</small>}</div><div className="field"><label htmlFor="exit-motive">Motivo de Retiro <span>Obligatorio</span></label><select id="exit-motive" value={motiveId} onChange={event => { setMotiveId(event.target.value); setSaved(false) }} aria-invalid={Boolean(errors.motive)}><option value="">Selecciona una opción</option>{motives.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>{errors.motive && <small className="field-error">{errors.motive}</small>}</div><div className="field full-width-field"><label htmlFor="exit-motive-detail">Detalle Motivo Retiro</label><textarea id="exit-motive-detail" value={motiveDetail} onChange={event => { setMotiveDetail(event.target.value.slice(0, 100)); setSaved(false) }} maxLength={100} rows={3} /><small className="field-help">Máximo 100 caracteres · {motiveDetail.length}/100.</small></div></div><div className="form-footer"><span>Los motivos provienen del catálogo Motivos de salida del módulo Configuraciones.</span><button type="submit" className="button primary">Guardar retiro</button></div></form></section>
}

function ContractHistory({ employee, lines, catalogs, onReactivate, panelProps }: { employee: Employee; lines: ContractHistoryLine[]; catalogs: Catalogs; onReactivate: () => void; panelProps: { id: string; role: string; 'aria-labelledby': string } }) {
  const latestLine = lines.at(-1)
  const canReactivate = Boolean(latestLine?.endDate)
  const payrollGroupName = (id?: string) => catalogs['grupos-nomina'].find(group => group.id === id)?.name ?? '—'
  const lineSort = useSortableRows(lines, { contract: row => row.contractNumber, startDate: row => row.startDate.split('/').reverse().join('-'), endDate: row => row.endDate ? row.endDate.split('/').reverse().join('-') : '', exitReason: row => row.exitReason, department: row => row.department, role: row => row.role, payrollGroup: row => payrollGroupName(row.payrollGroupId), salary: row => decimalToCents(row.salary) })
  return <section className="panel employee-tab-panel" {...panelProps}>
    <div className="panel-heading"><div><h2>Historial de contratos</h2></div><button className="button primary" onClick={onReactivate} disabled={!canReactivate} title={canReactivate ? 'Crear un nuevo contrato' : 'Disponible cuando el contrato actual tenga fecha de terminación'}><Plus size={18} /> Reactivar empleado</button></div>
    <div className="table-scroll" role="region" aria-label="Historial de contratos del empleado" tabIndex={0}><table className="contract-history-table"><thead><tr><SortableTh label="Contrato" sortKey="contract" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Fecha Inicio" sortKey="startDate" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Fecha Fin" sortKey="endDate" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Motivo de Salida" sortKey="exitReason" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Departamento" sortKey="department" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Cargo" sortKey="role" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Grupo de Nómina" sortKey="payrollGroup" sort={lineSort.sort} onSort={lineSort.toggleSort} /><SortableTh label="Sueldo" sortKey="salary" sort={lineSort.sort} onSort={lineSort.toggleSort} className="numeric" /></tr></thead><tbody>
      {lineSort.sortedRows.map((line) => {
        const index = lines.findIndex(item => item.id === line.id)
        const lineNumber = lines.slice(0, index + 1).filter(item => item.contractNumber === line.contractNumber).length
        return <tr key={line.id}><td><strong>{line.contractNumber}</strong><span className="cell-meta">Línea {lineNumber}</span></td><td>{line.startDate}{line.effectiveDate && <span className="cell-meta">Modificación: {line.effectiveDate}</span>}</td><td>{line.endDate}</td><td>{line.exitReason}</td><td>{line.department}</td><td>{line.role}</td><td>{payrollGroupName(line.payrollGroupId)}</td><td className="numeric money">{line.salary ? money(line.salary) : ''}</td></tr>
      })}
      {!lines.length && <tr><td colSpan={8}><div className="empty-state"><FileClock /><strong>Sin contratos registrados</strong><p>Guarda la información de la pestaña Contrato para crear la primera línea.</p></div></td></tr>}
    </tbody></table></div>
    <div className="table-footer"><span>{lines.length} {lines.length === 1 ? 'línea contractual' : 'líneas contractuales'}</span><span>Historial de solo lectura</span></div>
  </section>
}

function ContractForm({ employee, catalogs, sbuRecords, sbuEnabled, contractLines, pendingContractNumber, onSbuPreferenceChange, onSave, panelProps }: { employee: Employee; catalogs: Catalogs; sbuRecords: SbuRecord[]; sbuEnabled: boolean; contractLines: ContractHistoryLine[]; pendingContractNumber?: number; onSbuPreferenceChange: (enabled: boolean, salary: string) => void; onSave: (line: ContractHistoryLine) => void; panelProps: { id: string; role: string; 'aria-labelledby': string } }) {
  const activeOptions = (key: CatalogKey) => catalogs[key].filter(item => item.status === 'ACTIVO')
  const latestLine = contractLines.at(-1)
  const newContract = pendingContractNumber !== undefined
  const currentDepartment = newContract ? '' : latestLine?.department ?? employee.area
  const currentRole = newContract ? '' : latestLine?.role ?? employee.role
  const defaultDepartment = activeOptions('departamentos').find(item => item.name === currentDepartment)?.id ?? ''
  const defaultCargo = activeOptions('cargos').find(item => item.name.toLocaleLowerCase('es') === currentRole.toLocaleLowerCase('es') || item.name.split(' ')[0].toLocaleLowerCase('es') === currentRole.split(' ')[0].toLocaleLowerCase('es'))?.id ?? ''
  const employeeEntryDate = employee.startDate ? (() => { const [year, month, day] = employee.startDate.split('-'); return `${day}/${month}/${year}` })() : ''
  const initialEntryDate = newContract ? '' : latestLine?.startDate ?? employeeEntryDate
  const contractNumber = pendingContractNumber ?? latestLine?.contractNumber ?? 1
  const [department, setDepartment] = useState(defaultDepartment)
  const [role, setRole] = useState(defaultCargo)
  const [usesSbu, setUsesSbu] = useState(sbuEnabled)
  const [salary, setSalary] = useState(newContract ? '' : latestLine?.salary ?? employee.salary)
  const [entryDate, setEntryDate] = useState(initialEntryDate)
  const [payrollGroup, setPayrollGroup] = useState(latestLine?.payrollGroupId ?? employee.payrollGroupId ?? activeOptions('grupos-nomina')[0]?.id ?? '')
  const [intern, setIntern] = useState(newContract ? false : latestLine?.intern ?? false)
  const [spouseExtension, setSpouseExtension] = useState(newContract ? false : latestLine?.spouseExtension ?? false)
  const [advanceType, setAdvanceType] = useState<'PERCENT' | 'AMOUNT'>(newContract ? 'PERCENT' : latestLine?.advanceType ?? 'PERCENT')
  const [advanceValue, setAdvanceValue] = useState(newContract ? '0.00' : latestLine?.advanceValue ?? '0.00')
  const [hasDisability, setHasDisability] = useState(newContract ? false : latestLine?.hasDisability ?? false)
  const [disabilityPercentage, setDisabilityPercentage] = useState(newContract ? '' : latestLine?.disabilityPercentage ?? '')
  const [contractType, setContractType] = useState(newContract ? activeOptions('tipos-contrato')[0]?.id ?? '' : latestLine?.contractTypeId ?? activeOptions('tipos-contrato')[0]?.id ?? '')
  const [monthlyThirteenth, setMonthlyThirteenth] = useState(newContract ? false : latestLine?.monthlyThirteenth ?? false)
  const [monthlyFourteenth, setMonthlyFourteenth] = useState(newContract ? false : latestLine?.monthlyFourteenth ?? false)
  const [monthlyReserveFunds, setMonthlyReserveFunds] = useState(newContract ? false : latestLine?.monthlyReserveFunds ?? false)
  const [reserveStartDate, setReserveStartDate] = useState(newContract ? initialEntryDate : latestLine?.reserveStartDate ?? initialEntryDate)
  const [region, setRegion] = useState<'COSTA' | 'SIERRA'>(newContract ? 'COSTA' : latestLine?.region ?? 'COSTA')
  const [reserveDateEdited, setReserveDateEdited] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const formatDate = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  }
  const validDate = (value: string) => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
    if (!match) return false
    const day = Number(match[1]); const month = Number(match[2]); const year = Number(match[3]); const date = new Date(Date.UTC(year, month - 1, day))
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  }
  const decimalDraft = (value: string) => {
    const normalized = value.replace(',', '.').replace(/[^\d.]/g, '')
    const [whole = '', ...rest] = normalized.split('.')
    return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole
  }
  const validDecimal = (value: string) => /^\d+(\.\d{1,2})?$/.test(value)
  const change = (callback: () => void) => { callback(); setSaved(false) }
  const sbuApplicationDate = currentEcuadorDate()
  const sbuForApplicationDate = findSbuForDate(sbuRecords, sbuApplicationDate)
  const changeSbu = (enabled: boolean) => change(() => {
    setUsesSbu(enabled)
    const matchingSbu = enabled ? sbuForApplicationDate : undefined
    setSalary(matchingSbu?.value ?? '')
    setErrors(current => { const { sbu: _removed, ...rest } = current; return enabled && !matchingSbu ? { ...rest, sbu: `No existe un SBU vigente para la fecha de creación o aplicación (${sbuApplicationDate}).` } : rest })
    if (employee.id === 'Nuevo registro') onSbuPreferenceChange(enabled, matchingSbu?.value ?? salary)
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!department) nextErrors.department = 'Selecciona un departamento.'
    if (!role) nextErrors.role = 'Selecciona un cargo.'
    if (usesSbu && !sbuForApplicationDate) nextErrors.sbu = `No existe un SBU vigente para la fecha de creación o aplicación (${sbuApplicationDate}).`
    if (!validDecimal(salary) || decimalToCents(salary) <= 0n) nextErrors.salary = 'Ingresa un sueldo mayor a cero con máximo dos decimales.'
    if (!validDate(entryDate)) nextErrors.entryDate = 'Ingresa una fecha válida en formato DD/MM/AAAA.'
    if (!payrollGroup) nextErrors.payrollGroup = 'Selecciona un grupo de nómina.'
    if (!validDecimal(advanceValue)) nextErrors.advanceValue = 'Ingresa un valor numérico con máximo dos decimales.'
    else if (advanceType === 'PERCENT' && decimalToCents(advanceValue) > 10000n) nextErrors.advanceValue = 'El porcentaje debe estar entre 0 y 100.'
    if (hasDisability && (!validDecimal(disabilityPercentage) || decimalToCents(disabilityPercentage) <= 0n || decimalToCents(disabilityPercentage) > 10000n)) nextErrors.disabilityPercentage = 'Ingresa un porcentaje mayor a 0 y hasta 100, con máximo dos decimales.'
    if (!contractType) nextErrors.contractType = 'Selecciona un tipo de contrato.'
    if (!validDate(reserveStartDate)) nextErrors.reserveStartDate = 'Ingresa una fecha válida en formato DD/MM/AAAA.'
    setErrors(nextErrors)
    const valid = Object.keys(nextErrors).length === 0
    setSaved(valid)
    if (valid) {
      const departmentName = activeOptions('departamentos').find(item => item.id === department)?.name ?? ''
      const roleName = activeOptions('cargos').find(item => item.id === role)?.name ?? ''
      const normalizedSalary = centsToDecimal(decimalToCents(salary))
      onSave({ id: `${employee.id}-C${contractNumber}-L${Date.now()}`, contractNumber, startDate: entryDate, endDate: newContract ? '' : latestLine?.endDate ?? '', exitReason: newContract ? '' : latestLine?.exitReason ?? '', exitReasonDetail: newContract ? '' : latestLine?.exitReasonDetail ?? '', department: departmentName, role: roleName, salary: normalizedSalary, payrollGroupId: payrollGroup, intern, spouseExtension, advanceType, advanceValue: centsToDecimal(decimalToCents(advanceValue)), hasDisability, disabilityPercentage: hasDisability ? centsToDecimal(decimalToCents(disabilityPercentage)) : '', contractTypeId: contractType, monthlyThirteenth, monthlyFourteenth, monthlyReserveFunds, reserveStartDate, region })
      onSbuPreferenceChange(usesSbu, normalizedSalary)
    }
  }

  return <section className="panel employee-tab-panel" {...panelProps}>
    <div className="panel-heading"><div><h2>Contrato {contractNumber}</h2></div>{newContract && <Badge tone="info">Nuevo contrato</Badge>}</div>
    <form className="identification-form" onSubmit={submit} noValidate>
      {Object.values(errors).some(Boolean) && <div className="form-error" role="alert"><strong>Revisa los campos indicados.</strong><span>No se guardaron los cambios.</span></div>}
      {saved && <div className="form-success" role="status"><CheckCircle2 size={19} /><span>Información contractual guardada para las pruebas de nómina.</span></div>}
      <div className="form-section-heading"><h3>Asignación laboral</h3></div>
      <div className="form-grid identification-grid">
        <div className="field"><label htmlFor="contract-department">Departamento <span>Obligatorio</span></label><select id="contract-department" value={department} onChange={event => change(() => setDepartment(event.target.value))} aria-invalid={Boolean(errors.department)}><option value="">Selecciona una opción</option>{activeOptions('departamentos').map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>{errors.department && <small className="field-error">{errors.department}</small>}</div>
        <div className="field"><label htmlFor="contract-role">Cargo <span>Obligatorio</span></label><select id="contract-role" value={role} onChange={event => change(() => setRole(event.target.value))} aria-invalid={Boolean(errors.role)}><option value="">Selecciona una opción</option>{activeOptions('cargos').map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>{errors.role && <small className="field-error">{errors.role}</small>}</div>
        <ToggleField id="sbu-enabled" label="SBU" checked={usesSbu} onChange={changeSbu} />
        {errors.sbu && <div className="field full-width-field"><small className="field-error">{errors.sbu}</small></div>}
        <div className="field"><label htmlFor="contract-salary">Sueldo (USD) <span>Obligatorio</span></label><input id="contract-salary" value={salary} onChange={event => change(() => setSalary(decimalDraft(event.target.value)))} inputMode="decimal" aria-invalid={Boolean(errors.salary)} readOnly={usesSbu} className={usesSbu ? 'readonly-result' : undefined} /><small className="field-help">{usesSbu ? `Valor automático según el SBU vigente al ${sbuApplicationDate}, fecha de creación o aplicación.` : 'Valor numérico con máximo dos decimales.'}</small>{errors.salary && <small className="field-error">{errors.salary}</small>}</div>
        <div className="field"><label htmlFor="entry-date">Fecha de Ingreso <span>Obligatorio</span></label><input id="entry-date" value={entryDate} onChange={event => change(() => { const value = formatDate(event.target.value); setEntryDate(value); if (!reserveDateEdited) setReserveStartDate(value) })} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.entryDate)} />{errors.entryDate && <small className="field-error">{errors.entryDate}</small>}</div>
        <div className="field"><label htmlFor="payroll-group">Grupo de Nómina <span>Obligatorio</span></label><select id="payroll-group" value={payrollGroup} onChange={event => change(() => setPayrollGroup(event.target.value))} aria-invalid={Boolean(errors.payrollGroup)}><option value="">Selecciona una opción</option>{activeOptions('grupos-nomina').map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>{errors.payrollGroup && <small className="field-error">{errors.payrollGroup}</small>}</div>
        <ToggleField id="intern" label="Pasante" checked={intern} onChange={value => change(() => setIntern(value))} />
        <ToggleField id="spouse-extension" label="Extensión Cónyuge" checked={spouseExtension} onChange={value => change(() => setSpouseExtension(value))} />
      </div>
      <div className="form-section-heading"><h3>Adelanto y discapacidad</h3></div>
      <div className="form-grid identification-grid">
        <div className="field"><label htmlFor="advance-type">Adelanto de Sueldo <span>Obligatorio</span></label><select id="advance-type" value={advanceType} onChange={event => change(() => { setAdvanceType(event.target.value as 'PERCENT' | 'AMOUNT'); setAdvanceValue('0.00') })}><option value="PERCENT">%</option><option value="AMOUNT">$</option></select></div>
        <div className="field"><label htmlFor="advance-value">Valor ({advanceType === 'PERCENT' ? '%' : 'USD'}) <span>Obligatorio</span></label><input id="advance-value" value={advanceValue} onChange={event => change(() => setAdvanceValue(decimalDraft(event.target.value)))} inputMode="decimal" aria-invalid={Boolean(errors.advanceValue)} /><small className="field-help">{advanceType === 'PERCENT' ? 'Entre 0 y 100, con máximo dos decimales.' : 'Valor numérico con máximo dos decimales.'}</small>{errors.advanceValue && <small className="field-error">{errors.advanceValue}</small>}</div>
        <ToggleField id="has-disability" label="Discapacidad" checked={hasDisability} onChange={value => change(() => { setHasDisability(value); if (!value) { setDisabilityPercentage(''); setErrors(current => { const { disabilityPercentage: _removed, ...rest } = current; return rest }) } })} />
        {hasDisability && <div className="field"><label htmlFor="disability-percentage">% Discapacidad <span>Obligatorio</span></label><input id="disability-percentage" value={disabilityPercentage} onChange={event => change(() => setDisabilityPercentage(decimalDraft(event.target.value)))} inputMode="decimal" aria-invalid={Boolean(errors.disabilityPercentage)} autoFocus /><small className="field-help">Mayor a 0 y hasta 100, con máximo dos decimales.</small>{errors.disabilityPercentage && <small className="field-error">{errors.disabilityPercentage}</small>}</div>}
        <div className="field"><label htmlFor="contract-type">Tipo de Contrato <span>Obligatorio</span></label><select id="contract-type" value={contractType} onChange={event => change(() => setContractType(event.target.value))} aria-invalid={Boolean(errors.contractType)}><option value="">Selecciona una opción</option>{activeOptions('tipos-contrato').map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>{errors.contractType && <small className="field-error">{errors.contractType}</small>}</div>
      </div>
      <div className="form-section-heading"><h3>Mensualización de beneficios</h3></div>
      <div className="toggle-grid">
        <ToggleField id="monthly-thirteenth" label="Mensualiza 13er Sueldo" checked={monthlyThirteenth} onChange={value => change(() => setMonthlyThirteenth(value))} />
        <ToggleField id="monthly-fourteenth" label="Mensualiza 14to Sueldo" checked={monthlyFourteenth} onChange={value => change(() => setMonthlyFourteenth(value))} />
        <ToggleField id="monthly-reserve" label="Mensualiza Fondos de Reserva" checked={monthlyReserveFunds} onChange={value => change(() => setMonthlyReserveFunds(value))} />
      </div>
      <div className="form-grid identification-grid reserve-date-grid"><div className="field"><label htmlFor="reserve-start-date">Fecha Inicio FR <span>Obligatorio</span></label><input id="reserve-start-date" value={reserveStartDate} onChange={event => change(() => { setReserveStartDate(formatDate(event.target.value)); setReserveDateEdited(true) })} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.reserveStartDate)} /><small className="field-help">Inicialmente coincide con la fecha de ingreso y puede modificarse.</small>{errors.reserveStartDate && <small className="field-error">{errors.reserveStartDate}</small>}</div><div className="field"><label htmlFor="contract-region">Región <span>Obligatorio</span></label><select id="contract-region" value={region} onChange={event => change(() => setRegion(event.target.value as 'COSTA' | 'SIERRA'))}><option value="COSTA">Costa</option><option value="SIERRA">Sierra</option></select></div></div>
      <div className="form-footer"><span>Los catálogos provienen de las pantallas configurables del módulo Configuraciones.</span><button type="submit" className="button primary">Guardar contrato</button></div>
    </form>
  </section>
}

function ToggleField({ id, label, checked, checkedLabel = 'Sí', uncheckedLabel = 'No', onChange }: { id: string; label: string; checked: boolean; checkedLabel?: string; uncheckedLabel?: string; onChange: (checked: boolean) => void }) {
  return <div className="toggle-field"><div><label htmlFor={id}>{label}</label><span>{checked ? checkedLabel : uncheckedLabel}</span></div><button id={id} type="button" className={`switch ${checked ? 'on' : ''}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}><span /></button></div>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="detail-field"><span>{label}</span><strong className={value === 'Sin dato' ? 'missing' : ''}>{value}</strong></div>
}

function vacationDateDraft(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function parseVacationDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])))
  return date.getUTCFullYear() === Number(match[3]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[1]) ? date : null
}

function parsePayrollDate(value: string) {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!isoMatch) return parseVacationDate(value)
  const date = new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])))
  return date.getUTCFullYear() === Number(isoMatch[1]) && date.getUTCMonth() === Number(isoMatch[2]) - 1 && date.getUTCDate() === Number(isoMatch[3]) ? date : null
}

function isJustifiedAbsence(absence: EmployeeAbsence) {
  const normalized = absence.absenceTypeName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es')
  return /^faltas? justificadas?$/.test(normalized)
}

function payrollWorkedDaysForMonth(employee: Employee, period: string, contractHistory: Record<string, ContractHistoryLine[]>, absences: EmployeeAbsence[]) {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return 0
  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd = new Date(Date.UTC(year, month, 0))
  const contractLines = contractHistory[employee.id] ?? []
  const groupedContracts = new Map<number, ContractHistoryLine[]>()
  contractLines.forEach(line => groupedContracts.set(line.contractNumber, [...(groupedContracts.get(line.contractNumber) ?? []), line]))
  const ranges = [...groupedContracts.values()].map(lines => {
    const starts = lines.map(line => parsePayrollDate(line.startDate)).filter((date): date is Date => Boolean(date)).sort((first, second) => first.getTime() - second.getTime())
    const lastLine = lines.at(-1)
    return { start: starts[0], end: lastLine?.endDate ? parsePayrollDate(lastLine.endDate) : null }
  }).filter((range): range is { start: Date; end: Date | null } => Boolean(range.start))
  if (!ranges.length) {
    const start = parsePayrollDate(employee.startDate)
    if (start) ranges.push({ start, end: null })
  }
  const workedDays = new Set<number>()
  ranges.forEach(range => {
    if (range.start > monthEnd || (range.end && range.end < monthStart)) return
    const firstDay = range.start.getUTCFullYear() === year && range.start.getUTCMonth() + 1 === month ? Math.min(range.start.getUTCDate(), 30) : 1
    const lastDay = range.end && range.end.getUTCFullYear() === year && range.end.getUTCMonth() + 1 === month ? Math.min(range.end.getUTCDate(), 30) : 30
    for (let day = firstDay; day <= lastDay; day += 1) workedDays.add(day)
  })
  const absenceDays = new Set<number>()
  absences.filter(absence => absence.employeeId === employee.id && !isJustifiedAbsence(absence)).forEach(absence => {
    const start = parsePayrollDate(absence.startDate)
    const end = parsePayrollDate(absence.endDate) ?? start
    if (!start || !end || start > monthEnd || end < monthStart) return
    const firstDay = start.getUTCFullYear() === year && start.getUTCMonth() + 1 === month ? Math.min(start.getUTCDate(), 30) : 1
    const lastDay = end.getUTCFullYear() === year && end.getUTCMonth() + 1 === month ? Math.min(end.getUTCDate(), 30) : 30
    for (let day = firstDay; day <= lastDay; day += 1) absenceDays.add(day)
  })
  absenceDays.forEach(day => workedDays.delete(day))
  return workedDays.size
}

function vacationDateToIso(value: string) {
  const date = parseVacationDate(value)
  return date ? date.toISOString().slice(0, 10) : ''
}

function vacationInclusiveDays(fromDate: string, toDate: string) {
  const from = parseVacationDate(fromDate); const to = parseVacationDate(toDate)
  return from && to && to >= from ? Math.floor((to.getTime() - from.getTime()) / 86400000) + 1 : 0
}

const vacationMonthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function vacationEntitlementForServiceYear(serviceYear: number) {
  const normal = serviceYear > 0 ? 15 : 0
  const additional = Math.min(15, Math.max(0, Math.floor(serviceYear) - 5))
  return { normal, additional, total: normal + additional }
}

function vacationPeriodFromStartYear(startDate: string, startYear: number) {
  const startMonth = Number(startDate.slice(5, 7))
  const endMonth = startMonth === 1 ? 12 : startMonth - 1
  const endYear = startMonth === 1 ? startYear : startYear + 1
  return `${startYear}-${String(startMonth).padStart(2, '0')}/${endYear}-${String(endMonth).padStart(2, '0')}`
}

function normalizeVacationPeriod(period: string, startDate: string) {
  if (/^\d{4}-\d{2}\/\d{4}-\d{2}$/.test(period)) return period
  const legacyYear = /^\d{4}$/.test(period) ? Number(period) : Number(startDate.slice(0, 4))
  return vacationPeriodFromStartYear(startDate, legacyYear)
}

function vacationPeriodRange(period: string, startDate: string) {
  const normalized = normalizeVacationPeriod(period, startDate)
  const match = /^(\d{4})-(\d{2})\/(\d{4})-(\d{2})$/.exec(normalized)
  if (!match) return { key: normalized, start: '', end: '', startYear: Number(startDate.slice(0, 4)), endYear: Number(startDate.slice(0, 4)) }
  const endDay = new Date(Date.UTC(Number(match[3]), Number(match[4]), 0)).getUTCDate()
  return { key: normalized, start: `${match[1]}-${match[2]}-01`, end: `${match[3]}-${match[4]}-${String(endDay).padStart(2, '0')}`, startYear: Number(match[1]), endYear: Number(match[3]) }
}

function vacationPeriodLabel(period: string, startDate: string) {
  const range = vacationPeriodRange(period, startDate)
  const startMonth = Number(range.start.slice(5, 7)); const endMonth = Number(range.end.slice(5, 7))
  return startMonth && endMonth ? `${vacationMonthNames[startMonth - 1]} ${range.startYear} - ${vacationMonthNames[endMonth - 1]} ${range.endYear}` : period
}

function completedVacationPeriods(startDate: string, today = new Date()) {
  const firstYear = Number(startDate.slice(0, 4)); const periods: string[] = []
  for (let startYear = firstYear; startYear <= today.getFullYear(); startYear += 1) {
    const key = vacationPeriodFromStartYear(startDate, startYear)
    const range = vacationPeriodRange(key, startDate)
    if (range.end <= today.toISOString().slice(0, 10)) periods.push(key)
  }
  return periods.slice(-3)
}

function employeeEntryDate(value: string) {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function vacationTotals(record: VacationRequestRecord) {
  const approvedMovements = record.movements.filter(item => item.approval !== 'PENDIENTE')
  const normalEnjoyed = approvedMovements.filter(item => item.type === 'NORMAL' && item.settlement === 'GOZADAS').reduce((sum, item) => sum + item.days, 0)
  const additionalEnjoyed = approvedMovements.filter(item => item.type === 'ADICIONAL' && item.settlement === 'GOZADAS').reduce((sum, item) => sum + item.days, 0)
  const additionalPaid = approvedMovements.filter(item => item.type === 'ADICIONAL' && item.settlement === 'PAGADAS').reduce((sum, item) => sum + item.days, 0)
  const openingNormal = record.openingNormalPendingDays ?? record.generatedDays
  const openingAdditional = record.openingAdditionalPendingDays ?? record.additionalGeneratedDays
  const pending = Math.max(0, openingNormal + openingAdditional - normalEnjoyed - additionalEnjoyed - additionalPaid)
  const status = record.liquidationStatus === 'PROCESADA' ? 'LIQUIDADO' as const : pending > 0 ? 'DISPONIBLE' as const : 'PENDIENTE_LIQUIDACION' as const
  return { normalEnjoyed, additionalEnjoyed, additionalPaid, pending, status }
}

function VacationRegistrationPage({ employees, pendingRecords, requests, setRequests }: { employees: Employee[]; pendingRecords: VacationPendingRecord[]; requests: VacationRequestRecord[]; setRequests: Dispatch<SetStateAction<VacationRequestRecord[]>> }) {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const [fromDate, setFromDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
  const [toDate, setToDate] = useState(today)
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<VacationRequestRecord | null>(null)
  const [message, setMessage] = useState('')
  const employeeMap = Object.fromEntries(employees.map(employee => [employee.id, employee]))
  const registeredRequests = requests.filter(record => record.liquidationStatus !== 'PROCESADA').map(record => ({ ...record, movements: record.movements.filter(movement => movement.approval !== 'PENDIENTE') })).filter(record => record.movements.length)
  const filtered = registeredRequests.filter(record => {
    const employee = employeeMap[record.employeeId]
    const periodLabel = employee ? vacationPeriodLabel(record.vacationPeriod, employee.startDate) : record.vacationPeriod
    return record.createdAt >= fromDate && record.createdAt <= toDate && `${employee?.name ?? ''} ${employee?.document ?? ''} ${periodLabel}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))
  })
  const requestSort = useSortableRows(filtered, { employee: row => employeeMap[row.employeeId]?.name ?? '', period: row => row.vacationPeriod, entryDate: row => employeeMap[row.employeeId]?.startDate ?? '', generated: row => row.generatedDays, additionalGenerated: row => row.additionalGeneratedDays, normalEnjoyed: row => vacationTotals(row).normalEnjoyed, additionalEnjoyed: row => vacationTotals(row).additionalEnjoyed, additionalPaid: row => vacationTotals(row).additionalPaid, pending: row => vacationTotals(row).pending, status: row => vacationTotals(row).status })
  const saveRecord = (record: VacationRequestRecord) => {
    setRequests(current => {
      if (current.some(item => item.id === record.id)) return current.map(item => item.id === record.id ? { ...record, movements: [...record.movements, ...item.movements.filter(movement => movement.approval === 'PENDIENTE')] } : item)
      const existing = current.find(item => item.employeeId === record.employeeId && item.vacationPeriod === record.vacationPeriod && item.liquidationStatus !== 'PROCESADA' && item.movements.every(movement => movement.approval !== 'PENDIENTE'))
      if (existing) return current.map(item => item.id === existing.id ? { ...existing, generatedDays: record.generatedDays, additionalGeneratedDays: record.additionalGeneratedDays, openingNormalPendingDays: existing.openingNormalPendingDays ?? record.openingNormalPendingDays, openingAdditionalPendingDays: existing.openingAdditionalPendingDays ?? record.openingAdditionalPendingDays, createdAt: record.createdAt > existing.createdAt ? record.createdAt : existing.createdAt, movements: [...existing.movements, ...record.movements] } : item)
      return [record, ...current]
    })
    setAdding(false); setEditing(null); setMessage('La solicitud de vacaciones fue registrada y los saldos del período se actualizaron.')
  }
  return <>
    <PageHeader eyebrow="Vacaciones / Registro de Vacaciones" title="Registro de Vacaciones" description="Solicitudes de vacaciones gozadas y pago de días adicionales por empleado." action={<button className="button primary" onClick={() => setAdding(true)}><Plus size={18} /> Nuevo</button>} />
    {message && <div className="notice info"><CheckCircle2 size={20} /><div><strong>Registro guardado</strong><p>{message}</p></div></div>}
    <section className="panel table-panel">
      <div className="filter-bar vacation-registration-filters"><div className="field compact-field"><label htmlFor="vacation-filter-from">Desde</label><input id="vacation-filter-from" type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} /></div><div className="field compact-field"><label htmlFor="vacation-filter-to">Hasta</label><input id="vacation-filter-to" type="date" value={toDate} min={fromDate} onChange={event => setToDate(event.target.value)} /></div><label className="search-field"><Search size={18} /><span className="sr-only">Buscar registros de vacaciones</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar empleado o período" /></label></div>
      <div className="table-scroll" role="region" aria-label="Registro de solicitudes de vacaciones" tabIndex={0}><table className="vacation-registration-table"><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Empleado" sortKey="employee" sort={requestSort.sort} onSort={requestSort.toggleSort} /><SortableTh label="Período de Vacación" sortKey="period" sort={requestSort.sort} onSort={requestSort.toggleSort} /><SortableTh label="Fecha Ingreso" sortKey="entryDate" sort={requestSort.sort} onSort={requestSort.toggleSort} /><SortableTh label="Total Días Generados" sortKey="generated" sort={requestSort.sort} onSort={requestSort.toggleSort} className="numeric" /><SortableTh label="Total Días Adicionales" sortKey="additionalGenerated" sort={requestSort.sort} onSort={requestSort.toggleSort} className="numeric" /><SortableTh label="Días Gozados" sortKey="normalEnjoyed" sort={requestSort.sort} onSort={requestSort.toggleSort} className="numeric" /><SortableTh label="Días Adicionales Gozados" sortKey="additionalEnjoyed" sort={requestSort.sort} onSort={requestSort.toggleSort} className="numeric" /><SortableTh label="Días Adicionales Vendidos" sortKey="additionalPaid" sort={requestSort.sort} onSort={requestSort.toggleSort} className="numeric" /><SortableTh label="Días Pendientes" sortKey="pending" sort={requestSort.sort} onSort={requestSort.toggleSort} className="numeric" /><SortableTh label="Estado" sortKey="status" sort={requestSort.sort} onSort={requestSort.toggleSort} /></tr></thead><tbody>{requestSort.sortedRows.map(record => { const totals = vacationTotals(record); const employee = employeeMap[record.employeeId]; const statusLabel = totals.status === 'LIQUIDADO' ? 'LIQUIDADO' : totals.status === 'DISPONIBLE' ? 'Disponible' : 'Pendiente liquidación'; const statusTone = totals.status === 'LIQUIDADO' ? 'info' : totals.status === 'DISPONIBLE' ? 'success' : 'warning'; return <tr key={record.id}><td className="row-action-cell"><button className="icon-button small edit-icon" onClick={() => setEditing(record)} aria-label={`Editar vacaciones de ${employee?.name}`} title="Editar registro"><Pencil size={17} /></button></td><td><strong>{employee?.name}</strong><span className="cell-meta">{employee?.document}</span></td><td>{employee ? vacationPeriodLabel(record.vacationPeriod, employee.startDate) : record.vacationPeriod}</td><td>{employeeEntryDate(employee?.startDate ?? '')}</td><td className="numeric">{record.generatedDays}</td><td className="numeric">{record.additionalGeneratedDays}</td><td className="numeric">{totals.normalEnjoyed}</td><td className="numeric">{totals.additionalEnjoyed}</td><td className="numeric">{totals.additionalPaid}</td><td className="numeric"><strong>{totals.pending}</strong></td><td><Badge tone={statusTone}>{statusLabel}</Badge></td></tr> })}{!requestSort.sortedRows.length && <tr><td colSpan={11}><div className="empty-state"><CalendarDays /><strong>Sin solicitudes en el rango seleccionado</strong><p>Los períodos disponibles sin solicitudes no se muestran en esta pantalla.</p></div></td></tr>}</tbody></table></div>
      <div className="table-footer"><span>{filtered.length} de {registeredRequests.length} registros aprobados</span><span>Rango: {fromDate} — {toDate}</span></div>
    </section>
    {(adding || editing) && <VacationRegistrationDialog employees={employees} pendingRecords={pendingRecords} requests={registeredRequests} record={editing ?? undefined} onClose={() => { setAdding(false); setEditing(null) }} onSave={saveRecord} />}
  </>
}

function VacationRegistrationDialog({ employees, pendingRecords, requests, record, onClose, onSave }: { employees: Employee[]; pendingRecords: VacationPendingRecord[]; requests: VacationRequestRecord[]; record?: VacationRequestRecord; onClose: () => void; onSave: (record: VacationRequestRecord) => void }) {
  const sortedEmployees = [...employees].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const initialEmployee = record ? employees.find(item => item.id === record.employeeId) : undefined
  const [employeeName, setEmployeeName] = useState(initialEmployee?.name ?? '')
  const [employeeId, setEmployeeId] = useState(record?.employeeId ?? '')
  const [period, setPeriod] = useState(record && initialEmployee ? normalizeVacationPeriod(record.vacationPeriod, initialEmployee.startDate) : '')
  const [rows, setRows] = useState<VacationMovement[]>(record?.movements ?? [{ id: `VAC-MOV-${Date.now()}`, type: 'NORMAL', requestDate: '09/10/2026', fromDate: '', toDate: '', days: 0, settlement: 'GOZADAS' }])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const selectedEmployee = employees.find(item => item.id === employeeId)
  const periodOptions = useMemo(() => {
    if (!selectedEmployee) return [] as { period: string; generated: number; additional: number; normalLimit: number; additionalLimit: number; pending: number }[]
    const startYear = Number(selectedEmployee.startDate.slice(0, 4)); const periods = new Set(completedVacationPeriods(selectedEmployee.startDate))
    if (record) periods.add(normalizeVacationPeriod(record.vacationPeriod, selectedEmployee.startDate))
    return [...periods].sort((a, b) => b.localeCompare(a)).flatMap(periodKey => {
      const range = vacationPeriodRange(periodKey, selectedEmployee.startDate)
      const imported = pendingRecords.find(item => item.employeeId === selectedEmployee.id && Number(item.generationYear) === range.startYear)
      const completedServiceYears = range.startYear - startYear + 1
      const entitlement = vacationEntitlementForServiceYear(completedServiceYears)
      const generated = imported ? Number(imported.generatedDays) : entitlement.normal
      const additional = imported ? Number(imported.additionalDays) : entitlement.additional
      const recordPeriod = record ? normalizeVacationPeriod(record.vacationPeriod, selectedEmployee.startDate) : ''
      const normalLimit = recordPeriod === periodKey ? record?.openingNormalPendingDays ?? generated : imported ? Number(imported.normalPendingDays) : generated
      const additionalLimit = recordPeriod === periodKey ? record?.openingAdditionalPendingDays ?? additional : imported ? Number(imported.additionalPendingDays) : additional
      const otherRecords = requests.filter(item => item.employeeId === selectedEmployee.id && normalizeVacationPeriod(item.vacationPeriod, selectedEmployee.startDate) === periodKey && item.id !== record?.id)
      const used = otherRecords.flatMap(item => item.movements).reduce((sum, item) => sum + item.days, 0)
      const pending = Math.max(0, normalLimit + additionalLimit - used)
      return pending > 0 || periodKey === recordPeriod ? [{ period: periodKey, generated, additional, normalLimit, additionalLimit, pending }] : []
    })
  }, [selectedEmployee, pendingRecords, requests, record])
  const selectedPeriod = periodOptions.find(item => item.period === period)
  const updateRow = (id: string, changes: Partial<VacationMovement>) => setRows(current => current.map(item => {
    if (item.id !== id) return item
    const next = { ...item, ...changes }
    if (next.type === 'NORMAL') next.settlement = 'GOZADAS'
    next.days = vacationInclusiveDays(next.fromDate, next.toDate)
    return next
  }))
  const addRow = () => setRows(current => [...current, { id: `VAC-MOV-${Date.now()}`, type: 'NORMAL', requestDate: '09/10/2026', fromDate: '', toDate: '', days: 0, settlement: 'GOZADAS' }])
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const nextErrors: Record<string, string> = {}
    if (!employeeId || !selectedEmployee) nextErrors.employee = 'Selecciona un empleado válido.'
    if (!period || !selectedPeriod) nextErrors.period = 'Selecciona un período disponible.'
    if (!rows.length) nextErrors.rows = 'Agrega al menos una solicitud.'
    rows.forEach(row => {
      if (!parseVacationDate(row.requestDate)) nextErrors[`request-${row.id}`] = 'Fecha de solicitud inválida.'
      if (!parseVacationDate(row.fromDate) || !parseVacationDate(row.toDate) || row.days < 1) nextErrors[`range-${row.id}`] = 'El rango Desde/Hasta no es válido.'
      if (row.type === 'NORMAL' && row.settlement === 'PAGADAS') nextErrors[`settlement-${row.id}`] = 'Los días normales solamente pueden ser gozados.'
    })
    if (selectedPeriod) {
      const previous = requests.filter(item => item.employeeId === employeeId && item.vacationPeriod === period && item.id !== record?.id).flatMap(item => item.movements)
      const normalTotal = [...previous, ...rows].filter(item => item.type === 'NORMAL').reduce((sum, item) => sum + item.days, 0)
      const additionalTotal = [...previous, ...rows].filter(item => item.type === 'ADICIONAL').reduce((sum, item) => sum + item.days, 0)
      if (normalTotal > selectedPeriod.normalLimit) nextErrors.limitNormal = `Los días normales acumulados no pueden superar ${selectedPeriod.normalLimit}.`
      if (additionalTotal > selectedPeriod.additionalLimit) nextErrors.limitAdditional = `Los días adicionales acumulados no pueden superar ${selectedPeriod.additionalLimit}.`
    }
    setErrors(nextErrors); if (Object.keys(nextErrors).length || !selectedPeriod) return
    const createdAt = rows.map(item => vacationDateToIso(item.requestDate)).filter(Boolean).sort().at(-1) ?? new Date().toISOString().slice(0, 10)
    onSave({ id: record?.id ?? `VAC-REG-${Date.now()}`, employeeId, vacationPeriod: period, generatedDays: selectedPeriod.generated, additionalGeneratedDays: selectedPeriod.additional, openingNormalPendingDays: selectedPeriod.normalLimit, openingAdditionalPendingDays: selectedPeriod.additionalLimit, createdAt, movements: rows, liquidationStatus: record?.liquidationStatus, liquidationDate: record?.liquidationDate, totalIncomeSnapshot: record?.totalIncomeSnapshot, vacationValueSnapshot: record?.vacationValueSnapshot, additionalValueSnapshot: record?.additionalValueSnapshot })
  }
  return <Dialog title={record ? 'Editar registro de vacaciones' : 'Nuevo registro de vacaciones'} description="Registra días gozados o el pago de días adicionales disponibles." onClose={onClose} className="dialog-wide"><form onSubmit={submit} noValidate>{Object.keys(errors).length > 0 && <div className="form-error" role="alert"><strong>Revisa la información registrada.</strong><span>{Object.values(errors)[0]}</span></div>}<div className="form-grid"><div className="field"><label htmlFor="vacation-employee">Empleado <span>Obligatorio</span></label><input id="vacation-employee" list="vacation-employee-options" value={employeeName} disabled={Boolean(record)} onChange={event => { const value = event.target.value; const employee = employees.find(item => item.name.localeCompare(value.trim(), 'es', { sensitivity: 'base' }) === 0); setEmployeeName(value); setEmployeeId(employee?.id ?? ''); setPeriod(''); setErrors({}) }} placeholder="Escribe para filtrar" autoComplete="off" aria-invalid={Boolean(errors.employee)} /><datalist id="vacation-employee-options">{sortedEmployees.map(employee => <option value={employee.name} key={employee.id}>{employee.document}</option>)}</datalist>{errors.employee && <small className="field-error">{errors.employee}</small>}</div><div className="field"><label htmlFor="vacation-period">Período <span>Obligatorio</span></label><select id="vacation-period" value={period} disabled={!selectedEmployee || Boolean(record)} onChange={event => { setPeriod(event.target.value); setErrors({}) }} aria-invalid={Boolean(errors.period)}><option value="">Selecciona un período disponible</option>{periodOptions.map(item => <option value={item.period} key={item.period}>{selectedEmployee ? vacationPeriodLabel(item.period, selectedEmployee.startDate) : item.period} · {item.pending} días disponibles</option>)}</select>{errors.period && <small className="field-error">{errors.period}</small>}</div></div>{selectedPeriod && <div className="metric-grid vacation-period-summary"><div className="metric"><p>Días del período</p><strong>{selectedPeriod.generated}</strong><span>Vacaciones normales</span></div><div className="metric"><p>Días adicionales</p><strong>{selectedPeriod.additional}</strong><span>Según antigüedad</span></div><div className="metric accent"><p>Disponibles antes de esta solicitud</p><strong>{selectedPeriod.pending}</strong><span>Normales y adicionales</span></div></div>}<div className="overtime-editor vacation-movement-editor"><div className="form-section-heading"><div><h3>Solicitudes del período</h3><p>Los días se calculan incluyendo las fechas Desde y Hasta.</p></div><button type="button" className="button secondary compact" onClick={addRow} disabled={!selectedPeriod}><Plus size={17} /> Agregar</button></div><div className="overtime-grid-scroll"><table><thead><tr><th>Tipo</th><th>Fecha Solicitud</th><th>Desde</th><th>Hasta</th><th className="numeric">Número de días</th><th>Gozadas/Pagadas</th><th aria-label="Eliminar" /></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><select value={row.type} disabled={!selectedPeriod} onChange={event => updateRow(row.id, { type: event.target.value as VacationMovement['type'] })}><option value="NORMAL">Normales</option><option value="ADICIONAL" disabled={!selectedPeriod?.additional}>Adicionales</option></select></td><td><input value={row.requestDate} onChange={event => updateRow(row.id, { requestDate: vacationDateDraft(event.target.value) })} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors[`request-${row.id}`])} /></td><td><input value={row.fromDate} onChange={event => updateRow(row.id, { fromDate: vacationDateDraft(event.target.value) })} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors[`range-${row.id}`])} /></td><td><input value={row.toDate} onChange={event => updateRow(row.id, { toDate: vacationDateDraft(event.target.value) })} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors[`range-${row.id}`])} /></td><td className="numeric"><strong>{row.days || '—'}</strong></td><td><select value={row.settlement} onChange={event => updateRow(row.id, { settlement: event.target.value as VacationMovement['settlement'] })} aria-invalid={Boolean(errors[`settlement-${row.id}`])}><option value="GOZADAS">Gozadas</option>{row.type === 'ADICIONAL' && <option value="PAGADAS">Pagadas</option>}</select></td><td className="row-action-cell"><button type="button" className="icon-button small delete-icon" onClick={() => setRows(current => current.filter(item => item.id !== row.id))} aria-label="Eliminar solicitud"><Trash2 size={17} /></button></td></tr>)}{!rows.length && <tr><td colSpan={7}><div className="empty-state compact"><CalendarDays /><strong>Sin solicitudes</strong><p>Agrega al menos una línea para guardar.</p></div></td></tr>}</tbody></table></div></div><div className="notice info vacation-validation-note"><Calculator size={20} /><div><strong>Control automático de saldos</strong><p>Se muestran como máximo los tres períodos completos más recientes, calculados desde el mes de ingreso. Los días normales no pueden superar 15 y únicamente los días adicionales pueden pagarse.</p></div></div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary" disabled={!selectedPeriod}>Guardar registro</button></div></form></Dialog>
}

function vacationLiquidationMonths(record: VacationRequestRecord, employee: Employee, historicalSalaries: HistoricalSalaryRecord[]) {
  const range = vacationPeriodRange(record.vacationPeriod, employee.startDate)
  const additionalPaidDays = vacationTotals(record).additionalPaid
  const start = new Date(`${range.start}T00:00:00Z`)
  const rows = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1))
    const period = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    const historical = historicalSalaries.find(item => item.identification === employee.document && item.period === period)
    const salary = decimalToCents(historical?.salary ?? employee.salary)
    const vacationValue = (salary + 12n) / 24n
    const additionalValue = (vacationValue * BigInt(additionalPaidDays) + 7n) / 15n
    return { period, salary, vacationValue, additionalValue, iess: 0n, total: 0n, historical: Boolean(historical) }
  })
  const totalIncome = rows.reduce((sum, item) => sum + item.salary, 0n)
  const targetVacation = (totalIncome + 12n) / 24n
  let vacationDifference = targetVacation - rows.reduce((sum, item) => sum + item.vacationValue, 0n)
  for (let index = 0; vacationDifference !== 0n; index = (index + 1) % rows.length) { const adjustment = vacationDifference > 0n ? 1n : -1n; rows[index].vacationValue += adjustment; vacationDifference -= adjustment }
  const targetAdditional = (targetVacation * BigInt(additionalPaidDays) + 7n) / 15n
  let additionalDifference = targetAdditional - rows.reduce((sum, item) => sum + item.additionalValue, 0n)
  for (let index = 0; additionalDifference !== 0n; index = (index + 1) % rows.length) { const adjustment = additionalDifference > 0n ? 1n : -1n; rows[index].additionalValue += adjustment; additionalDifference -= adjustment }
  rows.forEach(item => { item.iess = ((item.vacationValue + item.additionalValue) * 945n + 5000n) / 10000n; item.total = item.vacationValue + item.additionalValue - item.iess })
  return rows
}

function VacationLiquidationPage({ employees, historicalSalaries, requests, setRequests }: { employees: Employee[]; historicalSalaries: HistoricalSalaryRecord[]; requests: VacationRequestRecord[]; setRequests: Dispatch<SetStateAction<VacationRequestRecord[]>> }) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<VacationRequestRecord | null>(null)
  const [printRecord, setPrintRecord] = useState<VacationRequestRecord | null>(null)
  const [message, setMessage] = useState('')
  const employeeMap = Object.fromEntries(employees.map(employee => [employee.id, employee]))
  const pendingLiquidation = requests.filter(record => vacationTotals(record).status === 'PENDIENTE_LIQUIDACION' && record.liquidationStatus !== 'PROCESADA')
  const filtered = pendingLiquidation.filter(record => { const employee = employeeMap[record.employeeId]; const periodLabel = employee ? vacationPeriodLabel(record.vacationPeriod, employee.startDate) : record.vacationPeriod; return `${employee?.name ?? ''} ${employee?.document ?? ''} ${periodLabel}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')) })
  const liquidationSort = useSortableRows(filtered, { employee: row => employeeMap[row.employeeId]?.name ?? '', period: row => row.vacationPeriod, requestDate: row => row.createdAt, normal: row => vacationTotals(row).normalEnjoyed, additionalEnjoyed: row => vacationTotals(row).additionalEnjoyed, additionalPaid: row => vacationTotals(row).additionalPaid, total: row => vacationTotals(row).normalEnjoyed + vacationTotals(row).additionalEnjoyed + vacationTotals(row).additionalPaid })
  const processLiquidation = (record: VacationRequestRecord) => {
    setRequests(current => current.map(item => item.id === record.id ? record : item))
    setPrintRecord(record)
    setEditing(null)
    setMessage('La liquidación fue procesada correctamente. El registro salió de Liquidar Vacaciones, Registro de Vacaciones e Información Personal.')
  }
  useEffect(() => {
    if (!printRecord) return
    const clearPrint = () => setPrintRecord(null)
    const timer = window.setTimeout(() => window.print(), 250)
    window.addEventListener('afterprint', clearPrint)
    return () => { window.clearTimeout(timer); window.removeEventListener('afterprint', clearPrint) }
  }, [printRecord])
  return <>
    <PageHeader eyebrow="Vacaciones / Liquidar Vacaciones" title="Liquidar Vacaciones" description="Períodos cuyo total de días ya fue completado y están pendientes de liquidación." />
    {message && <div className="success-banner" role="status"><CheckCircle2 size={18} />{message}</div>}
    <section className="panel table-panel"><div className="panel-heading"><div><h2>Registros pendientes de liquidación</h2><p>Esta lista se alimenta automáticamente desde Registro de Vacaciones cuando el saldo llega a cero.</p></div><Badge tone="neutral">{filtered.length} registros</Badge></div><div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar vacaciones pendientes de liquidación</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por empleado, identificación o período" /></label></div><div className="table-scroll" role="region" aria-label="Vacaciones pendientes de liquidación" tabIndex={0}><table className="vacation-liquidation-table"><thead><tr><th aria-label="Editar" /><SortableTh label="Empleado" sortKey="employee" sort={liquidationSort.sort} onSort={liquidationSort.toggleSort} /><SortableTh label="Período de Vacación" sortKey="period" sort={liquidationSort.sort} onSort={liquidationSort.toggleSort} /><SortableTh label="Fecha Última Solicitud" sortKey="requestDate" sort={liquidationSort.sort} onSort={liquidationSort.toggleSort} /><SortableTh label="Días Normales Gozados" sortKey="normal" sort={liquidationSort.sort} onSort={liquidationSort.toggleSort} className="numeric" /><SortableTh label="Días Adicionales Gozados" sortKey="additionalEnjoyed" sort={liquidationSort.sort} onSort={liquidationSort.toggleSort} className="numeric" /><SortableTh label="Días Adicionales Pagados" sortKey="additionalPaid" sort={liquidationSort.sort} onSort={liquidationSort.toggleSort} className="numeric" /><SortableTh label="Total Días Completados" sortKey="total" sort={liquidationSort.sort} onSort={liquidationSort.toggleSort} className="numeric" /><th>Estado</th></tr></thead><tbody>{liquidationSort.sortedRows.map(record => { const employee = employeeMap[record.employeeId]; const totals = vacationTotals(record); return <tr key={record.id}><td className="row-action-cell"><button className="icon-button small edit-icon" type="button" onClick={() => { setEditing(record); setMessage('') }} aria-label={`Editar liquidación de ${employee?.name ?? 'empleado'}`}><Pencil size={17} /></button></td><td><strong>{employee?.name}</strong><span className="cell-meta">{employee?.document}</span></td><td>{employee ? vacationPeriodLabel(record.vacationPeriod, employee.startDate) : record.vacationPeriod}</td><td>{employeeEntryDate(record.createdAt)}</td><td className="numeric">{totals.normalEnjoyed}</td><td className="numeric">{totals.additionalEnjoyed}</td><td className="numeric">{totals.additionalPaid}</td><td className="numeric"><strong>{totals.normalEnjoyed + totals.additionalEnjoyed + totals.additionalPaid}</strong></td><td><Badge tone="warning">Pendiente liquidación</Badge></td></tr> })}{!liquidationSort.sortedRows.length && <tr><td colSpan={9}><div className="empty-state"><CheckCircle2 /><strong>Sin períodos pendientes de liquidación</strong><p>Los registros aparecerán aquí automáticamente cuando completen todos sus días.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{filtered.length} de {pendingLiquidation.length} registros pendientes</span><span>Origen: Registro de Vacaciones</span></div></section>
    {editing && employeeMap[editing.employeeId] && <VacationLiquidationDialog record={editing} employee={employeeMap[editing.employeeId]} historicalSalaries={historicalSalaries} onClose={() => setEditing(null)} onProcess={processLiquidation} />}
    {printRecord && employeeMap[printRecord.employeeId] && <VacationLiquidationPrint record={printRecord} employee={employeeMap[printRecord.employeeId]} historicalSalaries={historicalSalaries} />}
  </>
}

function VacationLiquidationDialog({ record, employee, historicalSalaries, onClose, onProcess }: { record: VacationRequestRecord; employee: Employee; historicalSalaries: HistoricalSalaryRecord[]; onClose: () => void; onProcess: (record: VacationRequestRecord) => void }) {
  const today = new Intl.DateTimeFormat('es-EC', { timeZone: 'America/Guayaquil', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
  const [liquidationDate, setLiquidationDate] = useState(record.liquidationDate ?? today)
  const [error, setError] = useState('')
  const [activeDetail, setActiveDetail] = useState<'VALUES' | 'DAYS'>('VALUES')
  const totals = vacationTotals(record)
  const monthlyValues = vacationLiquidationMonths(record, employee, historicalSalaries)
  const amounts = monthlyValues.reduce((sum, item) => ({ totalIncome: sum.totalIncome + item.salary, vacationValue: sum.vacationValue + item.vacationValue, additionalValue: sum.additionalValue + item.additionalValue, iess: sum.iess + item.iess, total: sum.total + item.total }), { totalIncome: 0n, vacationValue: 0n, additionalValue: 0n, iess: 0n, total: 0n })
  const entryYear = Number(employee.startDate.slice(0, 4))
  const periodRange = vacationPeriodRange(record.vacationPeriod, employee.startDate)
  const totalYears = Math.max(0, periodRange.startYear - entryYear + 1)
  const totalVacationDays = record.generatedDays + record.additionalGeneratedDays
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!parseVacationDate(liquidationDate)) { setError('Ingresa una fecha de liquidación válida en formato DD/MM/AAAA.'); return }
    onProcess({ ...record, liquidationStatus: 'PROCESADA', liquidationDate, totalIncomeSnapshot: centsToDecimal(amounts.totalIncome), vacationValueSnapshot: centsToDecimal(amounts.vacationValue), additionalValueSnapshot: centsToDecimal(amounts.additionalValue) })
  }
  return <Dialog title="Liquidar vacaciones" description="Revisa los valores y registra la fecha para procesar la liquidación." onClose={onClose} className="dialog-liquidation"><form onSubmit={submit} noValidate>
    {error && <div className="form-error" role="alert"><strong>No se puede procesar la liquidación.</strong><span>{error}</span></div>}
    <div className="liquidation-info-grid">
      <div><span>Empleado</span><strong>{employee.name}</strong></div><div><span>Identificación</span><strong>{employee.document}</strong></div><div className="wide"><span>Período de Vacación</span><strong>{vacationPeriodLabel(record.vacationPeriod, employee.startDate)}</strong></div><div><span>Fecha de Ingreso</span><strong>{employeeEntryDate(employee.startDate)}</strong></div><div><span>Total Años</span><strong>{totalYears}</strong></div><div><span>Total Días de Vacaciones</span><strong>{totalVacationDays}</strong></div><div><span>Días Adicionales Pagados</span><strong>{totals.additionalPaid}</strong></div>
    </div>
    <div className="liquidation-summary-grid"><div><span>Total de Ingresos</span><strong>{money(amounts.totalIncome)}</strong></div><div><span>Valor Vacaciones</span><strong>{money(amounts.vacationValue)}</strong></div><div><span>Valor Días Adicionales</span><strong>{money(amounts.additionalValue)}</strong></div></div>
    <div className="field liquidation-date-field"><label htmlFor="liquidation-date">Fecha Liquidación <span>Obligatorio</span></label><input id="liquidation-date" value={liquidationDate} onChange={event => { setLiquidationDate(vacationDateDraft(event.target.value)); setError('') }} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(error)} /><small>Se registra al procesar.</small></div>
    <div className="tabs liquidation-tabs" role="tablist" aria-label="Detalle de la liquidación"><button type="button" role="tab" aria-selected={activeDetail === 'VALUES'} className={activeDetail === 'VALUES' ? 'active' : ''} onClick={() => setActiveDetail('VALUES')}>Detalle de Valores</button><button type="button" role="tab" aria-selected={activeDetail === 'DAYS'} className={activeDetail === 'DAYS' ? 'active' : ''} onClick={() => setActiveDetail('DAYS')}>Detalle de Días</button></div>
    {activeDetail === 'VALUES' ? <div className="table-scroll liquidation-detail-table" role="tabpanel"><table><thead><tr><th>Mes</th><th className="numeric">Sueldo</th><th className="numeric">Valor Vacación</th><th className="numeric">Valor Día Adicional</th><th className="numeric">Aporte IESS</th><th className="numeric">Total Recibir</th></tr></thead><tbody>{monthlyValues.map(item => <tr key={item.period}><td><strong>{`${item.period.slice(5, 7)}-${item.period.slice(0, 4)}`}</strong>{!item.historical && <span className="cell-meta">Sueldo actual</span>}</td><td className="numeric">{money(item.salary)}</td><td className="numeric">{money(item.vacationValue)}</td><td className="numeric">{money(item.additionalValue)}</td><td className="numeric">{money(item.iess)}</td><td className="numeric"><strong>{money(item.total)}</strong></td></tr>)}<tr className="total-row"><td>Total</td><td className="numeric">{money(amounts.totalIncome)}</td><td className="numeric">{money(amounts.vacationValue)}</td><td className="numeric">{money(amounts.additionalValue)}</td><td className="numeric">{money(amounts.iess)}</td><td className="numeric">{money(amounts.total)}</td></tr></tbody></table></div> : <div className="table-scroll liquidation-days-table" role="tabpanel"><table><thead><tr><th>Tipo</th><th>Fecha Solicitud</th><th>Desde</th><th>Hasta</th><th className="numeric">Número de Días</th><th>Gozadas/Pagadas</th></tr></thead><tbody>{record.movements.map(item => <tr key={item.id}><td>{item.type === 'NORMAL' ? 'Normales' : 'Adicionales'}</td><td>{item.requestDate}</td><td>{item.fromDate}</td><td>{item.toDate}</td><td className="numeric"><strong>{item.days}</strong></td><td><Badge tone={item.settlement === 'PAGADAS' ? 'info' : 'success'}>{item.settlement === 'PAGADAS' ? 'Pagadas' : 'Gozadas'}</Badge></td></tr>)}</tbody></table></div>}
    <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary"><CheckCircle2 size={18} /> Procesar liquidación</button></div>
  </form></Dialog>
}

function VacationLiquidationPrint({ record, employee, historicalSalaries }: { record: VacationRequestRecord; employee: Employee; historicalSalaries: HistoricalSalaryRecord[] }) {
  const monthlyValues = vacationLiquidationMonths(record, employee, historicalSalaries)
  const amounts = monthlyValues.reduce((sum, item) => ({ totalIncome: sum.totalIncome + item.salary, vacationValue: sum.vacationValue + item.vacationValue, additionalValue: sum.additionalValue + item.additionalValue, iess: sum.iess + item.iess, total: sum.total + item.total }), { totalIncome: 0n, vacationValue: 0n, additionalValue: 0n, iess: 0n, total: 0n })
  const totals = vacationTotals(record)
  const range = vacationPeriodRange(record.vacationPeriod, employee.startDate)
  const totalYears = Math.max(0, range.startYear - Number(employee.startDate.slice(0, 4)) + 1)
  return <article className="vacation-print-sheet print-only">
    <header className="print-header"><div><p>Empresa Demostración S.A.</p><h1>Liquidación de Vacaciones</h1></div><div><span>Fecha de liquidación</span><strong>{record.liquidationDate}</strong></div></header>
    <section className="print-employee-grid"><div><span>Empleado</span><strong>{employee.name}</strong></div><div><span>Identificación</span><strong>{employee.document}</strong></div><div><span>Período de Vacación</span><strong>{vacationPeriodLabel(record.vacationPeriod, employee.startDate)}</strong></div><div><span>Fecha de Ingreso</span><strong>{employeeEntryDate(employee.startDate)}</strong></div><div><span>Total Años</span><strong>{totalYears}</strong></div><div><span>Total Días de Vacaciones</span><strong>{record.generatedDays + record.additionalGeneratedDays}</strong></div><div><span>Días Adicionales Pagados</span><strong>{totals.additionalPaid}</strong></div></section>
    <section className="print-financial-summary"><div><span>Total de Ingresos</span><strong>{money(amounts.totalIncome)}</strong></div><div><span>Valor Vacaciones</span><strong>{money(amounts.vacationValue)}</strong></div><div><span>Valor Días Adicionales</span><strong>{money(amounts.additionalValue)}</strong></div></section>
    <section className="print-section"><h2>Detalle de Valores</h2><table><thead><tr><th>Mes</th><th>Sueldo</th><th>Valor Vacación</th><th>Valor Día Adicional</th><th>Aporte IESS</th><th>Total Recibir</th></tr></thead><tbody>{monthlyValues.map(item => <tr key={item.period}><td>{`${item.period.slice(5, 7)}-${item.period.slice(0, 4)}`}</td><td>{money(item.salary)}</td><td>{money(item.vacationValue)}</td><td>{money(item.additionalValue)}</td><td>{money(item.iess)}</td><td>{money(item.total)}</td></tr>)}<tr className="print-total-row"><td>Total</td><td>{money(amounts.totalIncome)}</td><td>{money(amounts.vacationValue)}</td><td>{money(amounts.additionalValue)}</td><td>{money(amounts.iess)}</td><td>{money(amounts.total)}</td></tr></tbody></table></section>
    <section className="print-section print-days-section"><h2>Detalle de Días</h2><table><thead><tr><th>Tipo</th><th>Fecha Solicitud</th><th>Desde</th><th>Hasta</th><th>Número de Días</th><th>Gozadas/Pagadas</th></tr></thead><tbody>{record.movements.map(item => <tr key={item.id}><td>{item.type === 'NORMAL' ? 'Normales' : 'Adicionales'}</td><td>{item.requestDate}</td><td>{item.fromDate}</td><td>{item.toDate}</td><td>{item.days}</td><td>{item.settlement === 'PAGADAS' ? 'Pagadas' : 'Gozadas'}</td></tr>)}</tbody></table></section>
    <section className="print-signatures"><div><strong>ELABORADO POR:</strong><span className="signature-space" /><span className="signature-line" /><p>RRHH</p></div><div><strong>REVISADO POR:</strong><span className="signature-space" /><span className="signature-line" /><p>CONTABILIDAD</p></div><div><strong>RECIBÍ CONFORME:</strong><span className="signature-space" /><span className="signature-line" /><p>EMPLEADO</p></div></section>
  </article>
}

function VacationLiquidationReportPage({ employees, historicalSalaries, requests }: { employees: Employee[]; historicalSalaries: HistoricalSalaryRecord[]; requests: VacationRequestRecord[] }) {
  const [employeeName, setEmployeeName] = useState('')
  const [liquidationId, setLiquidationId] = useState('')
  const [printRecord, setPrintRecord] = useState<VacationRequestRecord | null>(null)
  const sortedEmployees = [...employees].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const selectedEmployee = sortedEmployees.find(employee => employee.name.localeCompare(employeeName.trim(), 'es', { sensitivity: 'base' }) === 0)
  const liquidations = requests
    .filter(record => record.employeeId === selectedEmployee?.id && record.liquidationStatus === 'PROCESADA')
    .sort((a, b) => {
      const aKey = displayDateToKey(a.liquidationDate ?? '') || a.createdAt
      const bKey = displayDateToKey(b.liquidationDate ?? '') || b.createdAt
      return bKey.localeCompare(aKey) || b.id.localeCompare(a.id)
    })
  const selectedLiquidation = liquidations.find(record => record.id === liquidationId)

  useEffect(() => {
    if (!printRecord) return
    const clearPrint = () => setPrintRecord(null)
    const timer = window.setTimeout(() => window.print(), 250)
    window.addEventListener('afterprint', clearPrint)
    return () => { window.clearTimeout(timer); window.removeEventListener('afterprint', clearPrint) }
  }, [printRecord])

  return <>
    <PageHeader eyebrow="Vacaciones / Reporte Liquidación Vacaciones" title="Reporte Liquidación Vacaciones" description="Consulta e imprime el comprobante PDF de una liquidación de vacaciones procesada." />
    <section className="panel vacation-report-selector">
      <div className="panel-heading"><div><h2>Seleccionar liquidación</h2><p>Busca al empleado y luego selecciona una de sus liquidaciones, ordenadas de la más reciente a la más antigua.</p></div></div>
      <div className="vacation-report-form">
        <div className="field"><label htmlFor="vacation-report-employee">Empleado <span>Escribe para filtrar</span></label><input id="vacation-report-employee" list="vacation-report-employees" value={employeeName} onChange={event => { setEmployeeName(event.target.value); setLiquidationId('') }} placeholder="Escribe el nombre del empleado" autoComplete="off" /><datalist id="vacation-report-employees">{sortedEmployees.map(employee => <option key={employee.id} value={employee.name}>{employee.document}</option>)}</datalist></div>
        <div className="field"><label htmlFor="vacation-report-liquidation">Liquidación <span>{selectedEmployee ? 'Más reciente primero' : 'Selecciona un empleado'}</span></label><select id="vacation-report-liquidation" value={liquidationId} onChange={event => setLiquidationId(event.target.value)} disabled={!selectedEmployee}><option value="">{!selectedEmployee ? 'Selecciona primero un empleado' : liquidations.length ? 'Selecciona una liquidación' : 'El empleado no tiene liquidaciones procesadas'}</option>{liquidations.map(record => <option key={record.id} value={record.id}>{record.liquidationDate || 'Sin fecha'} · {vacationPeriodLabel(record.vacationPeriod, selectedEmployee!.startDate)}</option>)}</select></div>
      </div>
      {selectedLiquidation && selectedEmployee && <div className="vacation-report-summary"><div><span>Empleado</span><strong>{selectedEmployee.name}</strong></div><div><span>Período de Vacación</span><strong>{vacationPeriodLabel(selectedLiquidation.vacationPeriod, selectedEmployee.startDate)}</strong></div><div><span>Fecha de Liquidación</span><strong>{selectedLiquidation.liquidationDate}</strong></div><div><span>Estado</span><Badge tone="success">Liquidado</Badge></div></div>}
      <div className="vacation-report-actions"><button type="button" className="button primary" disabled={!selectedLiquidation} onClick={() => selectedLiquidation && setPrintRecord(selectedLiquidation)}><FileText size={18} /> Imprimir PDF</button></div>
    </section>
    {!selectedEmployee && <div className="notice info"><Search size={20} /><div><strong>Selecciona un empleado</strong><p>Las liquidaciones procesadas del empleado aparecerán en el segundo campo.</p></div></div>}
    {selectedEmployee && !liquidations.length && <div className="notice info"><FileText size={20} /><div><strong>Sin liquidaciones procesadas</strong><p>Este empleado todavía no tiene una liquidación disponible para imprimir.</p></div></div>}
    {printRecord && selectedEmployee && <VacationLiquidationPrint record={printRecord} employee={selectedEmployee} historicalSalaries={historicalSalaries} />}
  </>
}

function vacationPendingBalance(employee: Employee, period: string, pendingRecords: VacationPendingRecord[], requests: VacationRequestRecord[]) {
  const range = vacationPeriodRange(period, employee.startDate)
  const imported = pendingRecords.find(item => item.employeeId === employee.id && Number(item.generationYear) === range.startYear)
  const periodRequests = requests.filter(item => item.employeeId === employee.id && normalizeVacationPeriod(item.vacationPeriod, employee.startDate) === period)
  const firstRequest = periodRequests[0]
  const serviceYears = range.startYear - Number(employee.startDate.slice(0, 4)) + 1
  const entitlement = vacationEntitlementForServiceYear(serviceYears)
  const generatedNormal = imported ? Number(imported.generatedDays) : entitlement.normal
  const generatedAdditional = imported ? Number(imported.additionalDays) : entitlement.additional
  const normalLimit = firstRequest?.openingNormalPendingDays ?? (imported ? Number(imported.normalPendingDays) : generatedNormal)
  const additionalLimit = firstRequest?.openingAdditionalPendingDays ?? (imported ? Number(imported.additionalPendingDays) : generatedAdditional)
  const movements = periodRequests.flatMap(item => item.movements)
  const normalUsed = movements.filter(item => item.type === 'NORMAL').reduce((sum, item) => sum + item.days, 0)
  const additionalUsed = movements.filter(item => item.type === 'ADICIONAL').reduce((sum, item) => sum + item.days, 0)
  return { normal: Math.max(0, normalLimit - normalUsed), additional: Math.max(0, additionalLimit - additionalUsed) }
}

function pendingDaysLabel(value: number) {
  if (value === 0) return '-'
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function VacationPendingDaysReportPage({ employees, catalogs, contractHistory, pendingRecords, requests }: { employees: Employee[]; catalogs: Catalogs; contractHistory: Record<string, ContractHistoryLine[]>; pendingRecords: VacationPendingRecord[]; requests: VacationRequestRecord[] }) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const payrollGroups = catalogs['grupos-nomina']
  const fallbackGroupId = payrollGroups.find(group => group.status === 'ACTIVO')?.id ?? payrollGroups[0]?.id ?? '__NO_GROUP__'
  const employeeGroup = (employee: Employee) => contractHistory[employee.id]?.at(-1)?.payrollGroupId ?? employee.payrollGroupId ?? fallbackGroupId
  const configuredGroups = payrollGroups.map(group => ({ id: group.id, name: group.name, employees: employees.filter(employee => employeeGroup(employee) === group.id).sort((a, b) => a.name.localeCompare(b.name, 'es')) })).filter(group => group.employees.length)
  const unassignedEmployees = employees.filter(employee => !payrollGroups.some(group => group.id === employeeGroup(employee))).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const groups = unassignedEmployees.length ? [...configuredGroups, { id: '__NO_GROUP__', name: 'Sin grupo de nómina', employees: unassignedEmployees }] : configuredGroups
  const toggleGroup = (id: string) => setCollapsedGroups(current => ({ ...current, [id]: !current[id] }))

  return <>
    <PageHeader eyebrow="Vacaciones / Reporte Días Pendientes" title="Reporte Días Pendientes" description="Consulta los saldos normales y adicionales de los tres últimos períodos completados de cada empleado." />
    <section className="panel table-panel">
      <div className="panel-heading"><div><h2>Días pendientes por Grupo de Nómina</h2><p>Utiliza el ícono junto a cada grupo para contraer o expandir sus empleados.</p></div><Badge tone="neutral">{groups.length} {groups.length === 1 ? 'grupo' : 'grupos'}</Badge></div>
      <div className="table-scroll" role="region" aria-label="Días pendientes agrupados por Grupo de Nómina" tabIndex={0}><table className="vacation-pending-report-table"><thead><tr><th rowSpan={2}>Empleado</th><th rowSpan={2}>Identificación</th><th className="period-shaded" colSpan={3}>Último período completado</th><th colSpan={3}>Penúltimo período</th><th className="period-shaded" colSpan={3}>Antepenúltimo período</th><th rowSpan={2} className="numeric total-balance-header">Total Días Normales Disponibles</th><th rowSpan={2} className="numeric total-balance-header">Total Días Adicionales Disponibles</th></tr><tr><th className="period-shaded">Período</th><th className="numeric period-shaded">Días Normales Pend.</th><th className="numeric period-shaded">Días Adic. Pend.</th><th>Período</th><th className="numeric">Días Normales Pend.</th><th className="numeric">Días Adic. Pend.</th><th className="period-shaded">Período</th><th className="numeric period-shaded">Días Normales Pend.</th><th className="numeric period-shaded">Días Adic. Pend.</th></tr></thead><tbody>
        {groups.flatMap(group => {
          const collapsed = Boolean(collapsedGroups[group.id])
          const groupRow = <tr className="vacation-payroll-group-row" key={`group-${group.id}`}><td colSpan={13}><button type="button" className="vacation-group-toggle" onClick={() => toggleGroup(group.id)} aria-expanded={!collapsed}><span className="vacation-group-icon">{collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}</span><strong>{group.name}</strong><Badge tone="neutral">{group.employees.length} {group.employees.length === 1 ? 'empleado' : 'empleados'}</Badge></button></td></tr>
          if (collapsed) return [groupRow]
          const employeeRows = group.employees.map(employee => {
            const completed = completedVacationPeriods(employee.startDate).sort((a, b) => b.localeCompare(a)).slice(0, 3)
            const periods = [...completed, ...Array<string>(Math.max(0, 3 - completed.length)).fill('')]
            const balances = periods.map(period => period ? vacationPendingBalance(employee, period, pendingRecords, requests) : undefined)
            const normalTotal = balances.reduce((sum, balance) => sum + (balance?.normal ?? 0), 0)
            const additionalTotal = balances.reduce((sum, balance) => sum + (balance?.additional ?? 0), 0)
            return <tr key={employee.id}><td><strong>{employee.name}</strong><span className="cell-meta">{employee.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></td><td>{employee.document}</td>{[0, 1, 2].flatMap(index => { const period = periods[index]; const balance = balances[index]; const shaded = index === 0 || index === 2; return [<td className={shaded ? 'period-shaded' : undefined} key={`${employee.id}-${index}-period`}>{period ? vacationPeriodLabel(period, employee.startDate) : '-'}</td>, <td className={`numeric vacation-balance${shaded ? ' period-shaded' : ''}`} key={`${employee.id}-${index}-normal`}>{balance ? pendingDaysLabel(balance.normal) : '-'}</td>, <td className={`numeric vacation-balance${shaded ? ' period-shaded' : ''}`} key={`${employee.id}-${index}-additional`}>{balance ? pendingDaysLabel(balance.additional) : '-'}</td>] })}<td className="numeric vacation-balance total-balance"><strong>{pendingDaysLabel(normalTotal)}</strong></td><td className="numeric vacation-balance total-balance"><strong>{pendingDaysLabel(additionalTotal)}</strong></td></tr>
          })
          return [groupRow, ...employeeRows]
        })}
        {!groups.length && <tr><td colSpan={13}><div className="empty-state"><Users /><strong>Sin empleados</strong><p>No existen empleados para mostrar en el reporte.</p></div></td></tr>}
      </tbody></table></div>
      <div className="table-footer"><span>{employees.length} empleados</span><span>Los valores en cero se representan con “-”.</span></div>
    </section>
  </>
}

function VacationModulePage({ screenKey, go, employees, catalogs, contractHistory, historicalSalaries, pendingRecords, setPendingRecords, pendingUploads, setPendingUploads, vacationRequests, setVacationRequests }: { screenKey: VacationScreenKey; go: (path: string) => void; employees: Employee[]; catalogs: Catalogs; contractHistory: Record<string, ContractHistoryLine[]>; historicalSalaries: HistoricalSalaryRecord[]; pendingRecords: VacationPendingRecord[]; setPendingRecords: Dispatch<SetStateAction<VacationPendingRecord[]>>; pendingUploads: VacationPendingUpload[]; setPendingUploads: Dispatch<SetStateAction<VacationPendingUpload[]>>; vacationRequests: VacationRequestRecord[]; setVacationRequests: Dispatch<SetStateAction<VacationRequestRecord[]>> }) {
  const config = vacationScreenConfig[screenKey]
  if (screenKey === 'ingreso-novedades') return <VacationRegistrationPage employees={employees} pendingRecords={pendingRecords} requests={vacationRequests} setRequests={setVacationRequests} />
  if (screenKey === 'liquidar-vacaciones') return <VacationLiquidationPage employees={employees} historicalSalaries={historicalSalaries} requests={vacationRequests} setRequests={setVacationRequests} />
  if (screenKey === 'reporte-liquidacion') return <VacationLiquidationReportPage employees={employees} historicalSalaries={historicalSalaries} requests={vacationRequests} />
  if (screenKey === 'reporte-dias-pendientes') return <VacationPendingDaysReportPage employees={employees} catalogs={catalogs} contractHistory={contractHistory} pendingRecords={pendingRecords} requests={vacationRequests} />
  if (screenKey === 'carga-vacaciones-pendientes') return <VacationPendingImportPage employees={employees} records={pendingRecords} setRecords={setPendingRecords} uploads={pendingUploads} setUploads={setPendingUploads} go={go} />
  const fileScreen = screenKey === 'reporte-dias-pendientes' || screenKey === 'reporte-liquidacion'
  return <>
    <PageHeader eyebrow={`Vacaciones / ${config.title}`} title={config.title} description={config.description} />
    <section className="panel preflight"><div className="preflight-icon">{fileScreen ? <FileText /> : <CalendarDays />}</div><h2>{config.title}</h2><p>La pantalla ya forma parte del módulo independiente Vacaciones y está lista para incorporar su flujo funcional.</p><Badge tone="info">Pantalla disponible</Badge></section>
  </>
}

function spreadsheetVacationDays(value: unknown) {
  const normalized = String(value ?? '').trim().replace(',', '.')
  if (!normalized) return ''
  const number = Number(normalized)
  return Number.isFinite(number) && number >= 0 ? number.toFixed(2) : ''
}

function displayDays(value: string) {
  return value.endsWith('.00') ? value.slice(0, -3) : value
}

async function readVacationPendingFile(file: File, employees: Employee[]) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) throw new Error('El archivo no contiene hojas de cálculo.')
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], { header: 1, raw: false, defval: '' })
  const requiredHeaders = ['identificacion', 'nombre', 'ano', 'dias generados', 'dias adicionales', 'dias normales pendientes', 'dias adicionales pendientes', 'total dias pendientes']
  const headerIndex = rows.findIndex(row => requiredHeaders.every(header => row.map(normalizeSpreadsheetHeader).includes(header)))
  if (headerIndex < 0) throw new Error('La estructura no coincide con la plantilla Ejemplo Vacaciones Pendientes.')
  const headers = rows[headerIndex].map(normalizeSpreadsheetHeader)
  const column = Object.fromEntries(requiredHeaders.map(header => [header, headers.indexOf(header)]))
  const issues: string[] = []; const now = new Date().toISOString(); const seen = new Set<string>()
  const records = rows.slice(headerIndex + 1).flatMap((row, index) => {
    if (!row.some(value => String(value ?? '').trim())) return []
    const identification = String(row[column.identificacion] ?? '').replace(/\D/g, '')
    const employeeName = String(row[column.nombre] ?? '').trim()
    const generationYear = String(row[column.ano] ?? '').replace(/\D/g, '')
    const generatedDays = spreadsheetVacationDays(row[column['dias generados']])
    const additionalDays = spreadsheetVacationDays(row[column['dias adicionales']])
    const normalPendingDays = spreadsheetVacationDays(row[column['dias normales pendientes']])
    const additionalPendingDays = spreadsheetVacationDays(row[column['dias adicionales pendientes']])
    const reportedTotal = spreadsheetVacationDays(row[column['total dias pendientes']])
    const employee = employees.find(item => item.document === identification)
    const calculatedTotal = normalPendingDays && additionalPendingDays ? centsToDecimal(decimalToCents(normalPendingDays) + decimalToCents(additionalPendingDays)) : ''
    const key = `${identification}|${generationYear}`
    const permittedStartYears = employee ? completedVacationPeriods(employee.startDate).map(period => vacationPeriodRange(period, employee.startDate).startYear) : []
    const rowIssues = [!/^\d{10}$/.test(identification) && 'Identificación inválida', !employee && 'Empleado no registrado en la base de datos', employee && employee.name !== employeeName && 'El nombre no coincide exactamente con el empleado', !/^\d{4}$/.test(generationYear) && 'Año inválido', employee && /^\d{4}$/.test(generationYear) && !permittedStartYears.includes(Number(generationYear)) && 'El período no está dentro de los tres períodos completos permitidos', !generatedDays && 'Días generados inválidos', !additionalDays && 'Días adicionales inválidos', !normalPendingDays && 'Días normales pendientes inválidos', !additionalPendingDays && 'Días adicionales pendientes inválidos', !reportedTotal && 'Total de días pendientes inválido', normalPendingDays && generatedDays && decimalToCents(normalPendingDays) > decimalToCents(generatedDays) && 'Los días normales pendientes exceden los generados', additionalPendingDays && additionalDays && decimalToCents(additionalPendingDays) > decimalToCents(additionalDays) && 'Los días adicionales pendientes exceden los adicionales', reportedTotal && calculatedTotal && decimalToCents(reportedTotal) !== decimalToCents(calculatedTotal) && 'El total pendiente no coincide con la suma', seen.has(key) && 'Empleado y año duplicados'].filter(Boolean) as string[]
    if (rowIssues.length) issues.push(`Fila ${headerIndex + index + 2}: ${rowIssues.join(', ')}.`)
    else seen.add(key)
    return [{ id: `VAC-PEN-${Date.now()}-${index}`, employeeId: employee?.id ?? '', sourceIdentification: identification, sourceEmployeeName: employeeName, generationYear, generatedDays, additionalDays, normalPendingDays, additionalPendingDays, totalPendingDays: calculatedTotal || reportedTotal, sourceFile: file.name, importedAt: now, validationIssues: rowIssues } satisfies VacationPendingRecord]
  })
  if (!records.length && !issues.length) throw new Error('El archivo no contiene registros para cargar.')
  return { records, issues }
}

function VacationPendingImportPage({ employees, records, setRecords, uploads, setUploads, go }: { employees: Employee[]; records: VacationPendingRecord[]; setRecords: Dispatch<SetStateAction<VacationPendingRecord[]>>; uploads: VacationPendingUpload[]; setUploads: Dispatch<SetStateAction<VacationPendingUpload[]>>; go: (path: string) => void }) {
  const [pending, setPending] = useState<VacationPendingRecord[]>([])
  const [issues, setIssues] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionError, setDescriptionError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null)
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null)
  const employeeMap = Object.fromEntries(employees.map(employee => [employee.id, employee]))
  const filteredUploads = uploads.filter(upload => `${upload.description} ${upload.fileName} ${upload.user} ${upload.status}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  const uploadSort = useSortableRows(filteredUploads, { description: row => row.description, fileName: row => row.fileName, uploadedAt: row => row.uploadedAt, user: row => row.user, status: row => row.status })
  const selectedUpload = uploads.find(upload => upload.id === selectedUploadId)
  const deletingUpload = uploads.find(upload => upload.id === deletingUploadId)

  const selectFile = async (file?: File) => {
    if (!file) return
    rememberUploadedFile(file)
    setLoading(true); setMessage(''); setPending([]); setIssues([]); setFileName(file.name); setDescriptionError('')
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera el tamaño máximo de 10 MB.')
      const result = await readVacationPendingFile(file, employees)
      setPending(result.records); setIssues(result.issues)
    } catch (error) {
      setIssues([error instanceof Error ? error.message : 'No fue posible leer el archivo.'])
    } finally { setLoading(false) }
  }

  const stageUpload = () => {
    const cleanDescription = description.trim()
    if (!cleanDescription) { setDescriptionError('Ingresa una descripción para identificar esta carga.'); return }
    if (!pending.length || issues.length) return
    const uploadId = `VAC-UP-${Date.now()}`
    const uploadedAt = new Date().toISOString()
    const uploadedRecords = pending.map(record => ({ ...record, uploadId, importedAt: uploadedAt }))
    setUploads(current => [{ id: uploadId, description: cleanDescription, fileName, uploadedAt, user: 'Ana Navarro', status: 'PENDIENTE', recordCount: uploadedRecords.length, records: uploadedRecords }, ...current])
    const inconsistentRows = uploadedRecords.filter(record => record.validationIssues?.length).length
    setMessage(`El archivo quedó pendiente con ${pending.length} ${pending.length === 1 ? 'fila' : 'filas'}.${inconsistentRows ? ` Se detectaron ${inconsistentRows} con inconsistencias; revísalas con la lupa.` : ' Revísalo con la lupa y usa play para procesarlo.'}`)
    setPending([]); setIssues([]); setFileName(''); setDescription(''); setDescriptionError('')
  }

  const processUpload = (upload: VacationPendingUpload) => {
    if (upload.status !== 'PENDIENTE' || !upload.records.length) return
    const inconsistentRows = upload.records.filter(record => record.validationIssues?.length || !record.employeeId).length
    if (inconsistentRows) { setMessage(`No se puede procesar ${upload.fileName}: corrige las ${inconsistentRows} ${inconsistentRows === 1 ? 'fila inconsistente' : 'filas inconsistentes'} y vuelve a cargar el archivo.`); return }
    setRecords(current => {
      const byKey = new Map(current.map(record => [`${record.employeeId}|${record.generationYear}`, record]))
      upload.records.filter(record => record.employeeId && !record.validationIssues?.length).forEach(record => byKey.set(`${record.employeeId}|${record.generationYear}`, { ...record, uploadId: upload.id }))
      return [...byKey.values()]
    })
    setUploads(current => current.map(item => item.id === upload.id ? { ...item, status: 'PROCESADO' } : item))
    setMessage(`${upload.recordCount} ${upload.recordCount === 1 ? 'registro procesado' : 'registros procesados'} desde ${upload.fileName}.`)
  }

  const deleteUpload = (upload: VacationPendingUpload) => {
    setRecords(current => current.filter(record => record.uploadId !== upload.id))
    setUploads(current => current.map(item => item.id === upload.id ? { ...item, status: 'ELIMINADO', records: [] } : item))
    setSelectedUploadId(current => current === upload.id ? null : current)
    setDeletingUploadId(null)
    setMessage(`Se eliminó la información asociada al archivo ${upload.fileName}.`)
  }

  return <>
    <PageHeader eyebrow="Vacaciones / Carga de Vacaciones Pendientes" title="Carga de Vacaciones Pendientes" description="Carga, revisa y procesa los saldos pendientes por empleado y período de generación." action={<a className="button secondary" href="/Ejemplo%20Vacaciones%20Pendientes.xlsx" download="Ejemplo Vacaciones Pendientes.xlsx"><Download size={18} /> Descargar archivo de ejemplo</a>} />
    <section className="overtime-upload-section">
      <div className="panel import-card salary-import-card overtime-upload-card">
        <div className="import-icon"><Upload /></div>
        <h2>Subir vacaciones pendientes</h2>
        <p>La carga queda pendiente hasta que revises el detalle y la proceses con el ícono de play.</p>
        <label className="button primary file-picker"><Upload size={18} /> {loading ? 'Validando…' : 'Seleccionar archivo'}<input type="file" accept=".xlsx,.xls" disabled={loading} onChange={event => { void selectFile(event.target.files?.[0]); event.currentTarget.value = '' }} /></label>
        <span className="cell-meta">Formatos XLSX o XLS · máximo 10 MB</span>
        {fileName && <><div className="selected-import-file"><FileText size={18} /><div><strong>{fileName}</strong><span>{pending.length} filas leídas · {issues.length} inconsistencias</span></div></div><div className="field overtime-upload-description"><label htmlFor="vacation-upload-description">Descripción <span>Obligatorio</span></label><input id="vacation-upload-description" value={description} onChange={event => { setDescription(event.target.value.slice(0, 100)); setDescriptionError('') }} maxLength={100} placeholder="Ej. Saldos iniciales de vacaciones 2026" aria-invalid={Boolean(descriptionError)} />{descriptionError && <small className="field-error">{descriptionError}</small>}</div></>}
        {issues.length > 0 && <div className="import-issues" role="alert"><strong>Observaciones</strong><ul>{issues.slice(0, 5).map(issue => <li key={issue}>{issue}</li>)}</ul>{issues.length > 5 && <span>y {issues.length - 5} observaciones más.</span>}</div>}
        {pending.length > 0 && <button className="button primary" onClick={stageUpload}><Database size={18} /> Cargar archivo como pendiente</button>}
      </div>
    </section>
    {message && <div className="notice info"><CheckCircle2 size={20} /><div><strong>Operación completada</strong><p>{message}</p></div></div>}
    <section className="panel table-panel">
      <div className="panel-heading"><div><h2>Archivos cargados</h2><p>Valida el contenido con la lupa antes de procesarlo. Solo los archivos procesados actualizan los saldos.</p></div><Badge tone="neutral">{uploads.length} archivos</Badge></div>
      <div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar archivos cargados</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por descripción, archivo, usuario o estado" /></label></div>
      <div className="table-scroll" role="region" aria-label="Archivos de vacaciones pendientes cargados" tabIndex={0}>
        <table className="vacation-upload-table"><thead><tr><SortableTh label="Descripción" sortKey="description" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Archivo" sortKey="fileName" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Fecha" sortKey="uploadedAt" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Usuario" sortKey="user" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Estado" sortKey="status" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><th className="row-action-cell">Detalle</th><th className="row-action-cell">Procesar</th><th className="row-action-cell">Eliminar</th></tr></thead>
          <tbody>{uploadSort.sortedRows.map(upload => {
            const eliminated = upload.status === 'ELIMINADO'
            const inconsistentRows = upload.records.filter(record => record.validationIssues?.length || !record.employeeId).length
            const canProcess = upload.status === 'PENDIENTE' && inconsistentRows === 0
            return <tr key={upload.id}><td><strong>{upload.description}</strong><span className={`cell-meta ${inconsistentRows ? 'warning-text' : ''}`}>{upload.recordCount} {upload.recordCount === 1 ? 'registro' : 'registros'}{inconsistentRows ? ` · ${inconsistentRows} inconsistentes` : ''}</span></td><td>{upload.fileName}</td><td>{upload.uploadedAt ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(upload.uploadedAt)) : 'Sin fecha'}</td><td>{upload.user}</td><td><Badge tone={upload.status === 'PROCESADO' ? 'success' : upload.status === 'PENDIENTE' ? 'warning' : 'neutral'}>{upload.status === 'PROCESADO' ? 'Procesado' : upload.status === 'PENDIENTE' ? 'Pendiente' : 'Eliminado'}</Badge></td><td className="row-action-cell"><button className="icon-button small edit-icon" disabled={eliminated} onClick={() => setSelectedUploadId(upload.id)} aria-label={`Ver datos de ${upload.fileName}`} title={eliminated ? 'El detalle fue eliminado' : 'Ver datos cargados'}><Search size={17} /></button></td><td className="row-action-cell"><button className="icon-button small process-icon" disabled={!canProcess} onClick={() => processUpload(upload)} aria-label={`Procesar ${upload.fileName}`} title={inconsistentRows ? 'Corrige las filas inconsistentes antes de procesar' : upload.status === 'PENDIENTE' ? 'Procesar información' : upload.status === 'PROCESADO' ? 'Archivo ya procesado' : 'Archivo eliminado'}><Play size={17} /></button></td><td className="row-action-cell"><button className="icon-button small delete-icon" disabled={eliminated} onClick={() => setDeletingUploadId(upload.id)} aria-label={`Eliminar ${upload.fileName}`} title={eliminated ? 'Archivo eliminado' : 'Eliminar carga'}><Trash2 size={17} /></button></td></tr>
          })}{!uploadSort.sortedRows.length && <tr><td colSpan={8}><div className="empty-state"><FileText /><strong>Sin archivos cargados</strong><p>Los archivos validados aparecerán aquí en estado Pendiente.</p></div></td></tr>}</tbody>
        </table>
      </div>
      <div className="table-footer"><span>{filteredUploads.length} de {uploads.length} archivos</span><span>{records.length} saldos procesados</span></div>
    </section>
    {selectedUpload && selectedUpload.status !== 'ELIMINADO' && <VacationPendingUploadDetailDialog upload={selectedUpload} employeeMap={employeeMap} onClose={() => setSelectedUploadId(null)} />}
    {deletingUpload && deletingUpload.status !== 'ELIMINADO' && <VacationPendingDeleteDialog upload={deletingUpload} onClose={() => setDeletingUploadId(null)} onConfirm={() => deleteUpload(deletingUpload)} />}
  </>
}

function VacationPendingUploadDetailDialog({ upload, employeeMap, onClose }: { upload: VacationPendingUpload; employeeMap: Record<string, Employee>; onClose: () => void }) {
  const inconsistentRows = upload.records.filter(record => record.validationIssues?.length || !record.employeeId).length
  const validRecords = upload.records.filter(record => !record.validationIssues?.length && record.employeeId)
  return <Dialog title={upload.description} description={`${upload.fileName} · ${upload.recordCount} registros · ${upload.status === 'PROCESADO' ? 'Procesado' : 'Pendiente'}`} onClose={onClose} className="dialog-wide"><div className="upload-detail-body"><div className={`notice ${inconsistentRows ? 'warning' : 'info'}`}>{inconsistentRows ? <AlertTriangle size={20} /> : <Search size={20} />}<div><strong>{inconsistentRows ? `${inconsistentRows} ${inconsistentRows === 1 ? 'fila requiere' : 'filas requieren'} revisión` : 'Vista previa validada'}</strong><p>{inconsistentRows ? 'Las filas naranjas contienen inconsistencias y deben corregirse en el archivo antes de procesarlo.' : 'Revisa estos datos antes de cerrar y procesar el archivo con el ícono de play.'}</p></div></div><div className="table-scroll" role="region" aria-label={`Datos cargados desde ${upload.fileName}`} tabIndex={0}><table className="vacation-pending-table vacation-review-table"><thead><tr><th>Identificación</th><th>Nombre</th><th>Período Generación</th><th className="numeric">Días Generados</th><th className="numeric">Días Adicionales</th><th className="numeric">Días Normales Pendientes</th><th className="numeric">Días Adicionales Pendientes</th><th className="numeric">Total Días Pendientes</th><th>Inconsistencia</th></tr></thead><tbody>{upload.records.map(record => { const rowIssues = record.validationIssues ?? []; const inconsistent = rowIssues.length > 0 || !record.employeeId; const employee = employeeMap[record.employeeId]; return <tr key={record.id} className={inconsistent ? 'inconsistent-row' : undefined}><td>{record.sourceIdentification ?? employee?.document ?? 'Sin dato'}</td><td><strong>{record.sourceEmployeeName ?? employee?.name ?? 'Sin dato'}</strong></td><td>{employee && record.generationYear ? vacationPeriodLabel(vacationPeriodFromStartYear(employee.startDate, Number(record.generationYear)), employee.startDate) : record.generationYear || 'Sin dato'}</td><td className="numeric">{record.generatedDays ? displayDays(record.generatedDays) : '—'}</td><td className="numeric">{record.additionalDays ? displayDays(record.additionalDays) : '—'}</td><td className="numeric">{record.normalPendingDays ? displayDays(record.normalPendingDays) : '—'}</td><td className="numeric">{record.additionalPendingDays ? displayDays(record.additionalPendingDays) : '—'}</td><td className="numeric"><strong>{record.totalPendingDays ? displayDays(record.totalPendingDays) : '—'}</strong></td><td>{inconsistent ? <span className="validation-message"><AlertTriangle size={15} />{rowIssues.join(' · ') || 'Empleado no registrado en la base de datos'}</span> : <span className="validation-ok"><CheckCircle2 size={15} /> Correcto</span>}</td></tr> })}</tbody></table></div><div className="dialog-actions"><span>Total válido pendiente: <strong>{displayDays(centsToDecimal(validRecords.reduce((total, record) => total + decimalToCents(record.totalPendingDays), 0n)))} días</strong></span><button type="button" className="button primary" onClick={onClose}>Cerrar</button></div></div></Dialog>
}

function VacationPendingDeleteDialog({ upload, onClose, onConfirm }: { upload: VacationPendingUpload; onClose: () => void; onConfirm: () => void }) {
  return <Dialog title="Confirmar eliminación" description={upload.fileName} onClose={onClose}><div className="upload-detail-body"><div className="notice warning"><AlertTriangle size={20} /><div><strong>Esta acción eliminará los datos de la carga</strong><p>{upload.status === 'PROCESADO' ? 'También se retirarán de la tabla de saldos todos los registros procesados desde este archivo.' : 'El archivo todavía no fue procesado; se descartarán sus registros pendientes.'} El historial se conservará con estado Eliminado.</p></div></div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="button" className="button danger-button" onClick={onConfirm}><Trash2 size={17} /> Sí, eliminar</button></div></div></Dialog>
}

function LegacyVacationPendingImportPage({ employees, records, setRecords, go }: { employees: Employee[]; records: VacationPendingRecord[]; setRecords: Dispatch<SetStateAction<VacationPendingRecord[]>>; go: (path: string) => void }) {
  const [pending, setPending] = useState<VacationPendingRecord[]>([])
  const [issues, setIssues] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<VacationPendingRecord | null>(null)
  const employeeMap = Object.fromEntries(employees.map(employee => [employee.id, employee]))
  const filtered = records.filter(record => `${employeeMap[record.employeeId]?.document ?? ''} ${employeeMap[record.employeeId]?.name ?? ''} ${record.generationYear}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  const vacationSort = useSortableRows(filtered, { identification: row => employeeMap[row.employeeId]?.document ?? '', employee: row => employeeMap[row.employeeId]?.name ?? '', year: row => row.generationYear, generated: row => Number(row.generatedDays), additional: row => Number(row.additionalDays), normalPending: row => Number(row.normalPendingDays), additionalPending: row => Number(row.additionalPendingDays), total: row => Number(row.totalPendingDays) })
  const selectFile = async (file?: File) => {
    if (!file) return
    rememberUploadedFile(file)
    setLoading(true); setMessage(''); setPending([]); setIssues([]); setFileName(file.name)
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera el tamaño máximo de 10 MB.')
      const result = await readVacationPendingFile(file, employees); setPending(result.records); setIssues(result.issues)
    } catch (error) {
      setIssues([error instanceof Error ? error.message : 'No fue posible leer el archivo.'])
    } finally { setLoading(false) }
  }
  const confirmImport = () => {
    if (!pending.length) return
    setRecords(current => {
      const byKey = new Map(current.map(record => [`${record.employeeId}|${record.generationYear}`, record]))
      pending.forEach(record => byKey.set(`${record.employeeId}|${record.generationYear}`, record))
      return [...byKey.values()]
    })
    setMessage(`${pending.length} ${pending.length === 1 ? 'saldo cargado' : 'saldos cargados'} correctamente.`); setPending([]); setIssues([]); setFileName('')
  }
  return <>
    <PageHeader eyebrow="Vacaciones / Carga de Vacaciones Pendientes" title="Carga de Vacaciones Pendientes" description="Importa saldos pendientes por empleado y período de generación." action={<a className="button secondary" href="/Ejemplo%20Vacaciones%20Pendientes.xlsx" download="Ejemplo Vacaciones Pendientes.xlsx"><Download size={18} /> Descargar archivo de ejemplo</a>} />
    <section className="import-layout"><div className="panel import-card salary-import-card"><div className="import-icon"><Upload /></div><h2>Subir vacaciones pendientes</h2><p>La identificación y el nombre deben coincidir exactamente con el maestro de empleados.</p><label className="button primary file-picker"><Upload size={18} /> {loading ? 'Procesando…' : 'Seleccionar archivo'}<input type="file" accept=".xlsx,.xls" disabled={loading} onChange={event => { void selectFile(event.target.files?.[0]); event.currentTarget.value = '' }} /></label><span className="cell-meta">Formatos XLSX o XLS · máximo 10 MB</span>{fileName && <div className="selected-import-file"><FileText size={18} /><div><strong>{fileName}</strong><span>{pending.length} filas válidas · {issues.length} observaciones</span></div></div>}{pending.length > 0 && <button className="button primary" onClick={confirmImport}><Database size={18} /> Cargar {pending.length} saldos</button>}</div><div className="panel import-guide"><h2>Reglas de validación</h2><ol><li><span>1</span><div><strong>Empleado exacto</strong><p>Identificación y nombre se comparan con la información previamente registrada.</p></div></li><li><span>2</span><div><strong>Período de generación</strong><p>La columna AÑO se registra como período de generación.</p></div></li><li><span>3</span><div><strong>Días adicionales</strong><p>Corresponden al beneficio adicional por antigüedad.</p></div></li><li><span>4</span><div><strong>Saldos pendientes</strong><p>No pueden superar los días normales o adicionales generados.</p></div></li></ol>{issues.length > 0 && <div className="import-issues" role="alert"><strong>Observaciones</strong><ul>{issues.slice(0, 5).map(issue => <li key={issue}>{issue}</li>)}</ul>{issues.length > 5 && <span>y {issues.length - 5} observaciones más.</span>}</div>}</div></section>
    {message && <div className="notice info"><CheckCircle2 size={20} /><div><strong>Carga completada</strong><p>{message}</p></div></div>}
    <section className="panel table-panel"><div className="panel-heading"><div><h2>VACACIONES_PENDIENTES</h2><p>Saldos faltantes para completar el uso de los días generados.</p></div><Badge tone="neutral">{records.length} registros</Badge></div><div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar vacaciones pendientes</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por identificación, nombre o período" /></label></div><div className="table-scroll" role="region" aria-label="Vacaciones pendientes" tabIndex={0}><table className="vacation-pending-table"><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Identificación" sortKey="identification" sort={vacationSort.sort} onSort={vacationSort.toggleSort} /><SortableTh label="Nombre" sortKey="employee" sort={vacationSort.sort} onSort={vacationSort.toggleSort} /><SortableTh label="Período Generación" sortKey="year" sort={vacationSort.sort} onSort={vacationSort.toggleSort} /><SortableTh label="Días Generados" sortKey="generated" sort={vacationSort.sort} onSort={vacationSort.toggleSort} className="numeric" /><SortableTh label="Días Adicionales" sortKey="additional" sort={vacationSort.sort} onSort={vacationSort.toggleSort} className="numeric" /><SortableTh label="Días Normales Pendientes" sortKey="normalPending" sort={vacationSort.sort} onSort={vacationSort.toggleSort} className="numeric" /><SortableTh label="Días Adicionales Pendientes" sortKey="additionalPending" sort={vacationSort.sort} onSort={vacationSort.toggleSort} className="numeric" /><SortableTh label="Total Días Pendientes" sortKey="total" sort={vacationSort.sort} onSort={vacationSort.toggleSort} className="numeric" /></tr></thead><tbody>{vacationSort.sortedRows.map(record => { const employee = employeeMap[record.employeeId]; return <tr key={record.id}><td className="row-action-cell"><button className="icon-button small edit-icon" onClick={() => setEditing(record)} aria-label={`Editar vacaciones de ${employee?.name}`} title="Editar saldo"><Pencil size={17} /></button></td><td>{employee?.document}</td><td><strong>{employee?.name}</strong></td><td>{employee ? vacationPeriodLabel(vacationPeriodFromStartYear(employee.startDate, Number(record.generationYear)), employee.startDate) : record.generationYear}</td><td className="numeric">{displayDays(record.generatedDays)}</td><td className="numeric">{displayDays(record.additionalDays)}</td><td className="numeric">{displayDays(record.normalPendingDays)}</td><td className="numeric">{displayDays(record.additionalPendingDays)}</td><td className="numeric"><strong>{displayDays(record.totalPendingDays)}</strong></td></tr> })}{!vacationSort.sortedRows.length && <tr><td colSpan={9}><div className="empty-state"><CalendarDays /><strong>Sin saldos pendientes</strong><p>Selecciona la plantilla completada y confirma la carga.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{filtered.length} de {records.length} registros</span><span>Total pendiente: {displayDays(centsToDecimal(filtered.reduce((total, record) => total + decimalToCents(record.totalPendingDays), 0n)))} días</span></div></section>
    {editing && <VacationPendingDialog record={editing} employee={employeeMap[editing.employeeId]} onClose={() => setEditing(null)} onSave={record => { setRecords(current => current.map(item => item.id === record.id ? record : item)); setEditing(null) }} />}
  </>
}

function VacationPendingDialog({ record, employee, onClose, onSave }: { record: VacationPendingRecord; employee: Employee; onClose: () => void; onSave: (record: VacationPendingRecord) => void }) {
  const [generationYear, setGenerationYear] = useState(record.generationYear)
  const [generatedDays, setGeneratedDays] = useState(record.generatedDays)
  const [additionalDays, setAdditionalDays] = useState(record.additionalDays)
  const [normalPendingDays, setNormalPendingDays] = useState(record.normalPendingDays)
  const [additionalPendingDays, setAdditionalPendingDays] = useState(record.additionalPendingDays)
  const [error, setError] = useState('')
  const dayDraft = (value: string) => { const normalized = value.replace(',', '.').replace(/[^\d.]/g, ''); const [whole = '', ...rest] = normalized.split('.'); return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^\d{4}$/.test(generationYear)) { setError('Ingresa un año válido en formato AAAA.'); return }
    const permittedStartYears = completedVacationPeriods(employee.startDate).map(period => vacationPeriodRange(period, employee.startDate).startYear)
    if (!permittedStartYears.includes(Number(generationYear))) { setError('El período debe corresponder a uno de los tres períodos completos más recientes.'); return }
    if ([generatedDays, additionalDays, normalPendingDays, additionalPendingDays].some(value => !/^\d+(\.\d{1,2})?$/.test(value))) { setError('Todos los días deben ser valores numéricos con máximo dos decimales.'); return }
    if (decimalToCents(normalPendingDays) > decimalToCents(generatedDays)) { setError('Los días normales pendientes no pueden exceder los días generados.'); return }
    if (decimalToCents(additionalPendingDays) > decimalToCents(additionalDays)) { setError('Los días adicionales pendientes no pueden exceder los días adicionales.'); return }
    onSave({ ...record, generationYear, generatedDays: centsToDecimal(decimalToCents(generatedDays)), additionalDays: centsToDecimal(decimalToCents(additionalDays)), normalPendingDays: centsToDecimal(decimalToCents(normalPendingDays)), additionalPendingDays: centsToDecimal(decimalToCents(additionalPendingDays)), totalPendingDays: centsToDecimal(decimalToCents(normalPendingDays) + decimalToCents(additionalPendingDays)) })
  }
  return <Dialog title="Editar vacaciones pendientes" description={`${employee.name} · ${employee.document}`} onClose={onClose}><form onSubmit={submit} noValidate>{error && <div className="form-error" role="alert">{error}</div>}<div className="form-grid"><Field label="Año de inicio del período" name="generation-year" required value={generationYear} onChange={setGenerationYear} inputMode="numeric" /><Field label="Días generados" name="generated-days" required value={generatedDays} onChange={value => setGeneratedDays(dayDraft(value))} inputMode="decimal" /><Field label="Días adicionales" name="additional-days" required value={additionalDays} onChange={value => setAdditionalDays(dayDraft(value))} inputMode="decimal" /><Field label="Días normales pendientes" name="normal-pending-days" required value={normalPendingDays} onChange={value => setNormalPendingDays(dayDraft(value))} inputMode="decimal" /><Field label="Días adicionales pendientes" name="additional-pending-days" required value={additionalPendingDays} onChange={value => setAdditionalPendingDays(dayDraft(value))} inputMode="decimal" /></div><div className="notice info"><CalendarDays size={20} /><div><strong>{vacationPeriodLabel(vacationPeriodFromStartYear(employee.startDate, Number(generationYear)), employee.startDate)}</strong><p>Total pendiente: {displayDays(centsToDecimal(decimalToCents(normalPendingDays) + decimalToCents(additionalPendingDays)))} días. Solo se permiten los tres períodos completos más recientes.</p></div></div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">Guardar cambios</button></div></form></Dialog>
}

function PayrollModulePage({ screenKey, employees, catalogs, novelties, setNovelties, noveltyUploads, setNoveltyUploads, absences, setAbsences, overtimeRecords, setOvertimeRecords, overtimeUploads, setOvertimeUploads, payrollPeriodOverrides }: { screenKey: PayrollScreenKey; employees: Employee[]; catalogs: Catalogs; novelties: PayrollNovelty[]; setNovelties: Dispatch<SetStateAction<PayrollNovelty[]>>; noveltyUploads: NoveltyUpload[]; setNoveltyUploads: Dispatch<SetStateAction<NoveltyUpload[]>>; absences: EmployeeAbsence[]; setAbsences: Dispatch<SetStateAction<EmployeeAbsence[]>>; overtimeRecords: OvertimeRecord[]; setOvertimeRecords: Dispatch<SetStateAction<OvertimeRecord[]>>; overtimeUploads: OvertimeUploadSummary[]; setOvertimeUploads: Dispatch<SetStateAction<OvertimeUploadSummary[]>>; payrollPeriodOverrides: Record<string, PayrollPeriodStatus> }) {
  if (screenKey === 'novedades') return <NoveltiesPage employees={employees} catalogs={catalogs} novelties={novelties} setNovelties={setNovelties} payrollPeriodOverrides={payrollPeriodOverrides} />
  if (screenKey === 'ausencias') return <AbsencesPage employees={employees} catalogs={catalogs} absences={absences} setAbsences={setAbsences} />
  if (screenKey === 'carga-novedades') return <NoveltyImportPage employees={employees} catalogs={catalogs} setNovelties={setNovelties} uploads={noveltyUploads} setUploads={setNoveltyUploads} />
  if (screenKey === 'horas-extra') return <OvertimePage employees={employees} records={overtimeRecords} setRecords={setOvertimeRecords} />
  if (screenKey === 'carga-horas-extra') return <OvertimeImportPage employees={employees} records={overtimeRecords} setRecords={setOvertimeRecords} uploads={overtimeUploads} setUploads={setOvertimeUploads} />
  return null
}

function normalizeNoveltyImportText(value: unknown) {
  return String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toUpperCase()
}

function noveltyImportValue(value: unknown) {
  const normalized = String(value ?? '').trim().replace(',', '.')
  const number = Number(normalized)
  return normalized && Number.isFinite(number) && number > 0 && /^\d+(\.\d{1,2})?$/.test(normalized) ? number.toFixed(2) : ''
}

function validateNoveltyImportRow(row: NoveltyImportRow, employees: Employee[], catalogs: Catalogs) {
  const identification = normalizeNoveltyImportText(row.sourceIdentification)
  const businessName = normalizeNoveltyImportText(row.sourceBusinessName)
  const employee = employees.find(item => normalizeNoveltyImportText(item.document) === identification)
  const employeeBusinessName = employee ? normalizeNoveltyImportText(employee.businessName ?? employee.name) : ''
  const rubricText = normalizeNoveltyImportText(row.sourceRubric)
  const rubric = catalogs.rubros.find(item => item.status === 'ACTIVO' && [item.code, item.name].some(value => normalizeNoveltyImportText(value) === rubricText))
  const sourceApplication = normalizeNoveltyImportText(row.sourceApplication)
  const applicationForm: NoveltyImportRow['applicationForm'] = sourceApplication === 'TOTAL' ? 'TOTAL' : sourceApplication === 'CUOTAS' ? 'CUOTAS' : ''
  const sourcePeriod = normalizeNoveltyImportText(row.sourceApplicationPeriod).replace(/_/g, ' ')
  const applicationPeriod: NoveltyImportRow['applicationPeriod'] = sourcePeriod === 'QUINCENA' ? 'QUINCENA' : sourcePeriod === 'FIN DE MES' ? 'FIN_MES' : sourcePeriod === 'AMBOS' ? 'AMBOS' : ''
  const value = noveltyImportValue(row.sourceValue)
  const validationIssues = [
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.period) && 'Período inválido',
    !identification && 'Identificación obligatoria',
    identification && !employee && 'La Identificación no coincide con un empleado registrado',
    !businessName && 'Razón Social obligatoria',
    businessName && employee && businessName !== employeeBusinessName && 'La Razón Social no coincide con la Identificación del empleado',
    !rubricText && 'Rubro obligatorio',
    rubricText && !rubric && 'El Rubro no coincide con el catálogo vigente',
    !applicationForm && 'APLICACIÓN debe ser TOTAL o CUOTAS',
    !value && 'Valor inválido',
    !applicationPeriod && 'PERIODO APLICACIÓN debe ser QUINCENA, FIN DE MES o AMBOS',
  ].filter(Boolean) as string[]
  return { ...row, employeeId: employee?.id ?? '', rubricId: rubric?.id ?? '', applicationForm, value, applicationPeriod, validationIssues }
}

function validateNoveltyImportRows(rows: NoveltyImportRow[], employees: Employee[], catalogs: Catalogs) {
  const seen = new Set<string>()
  return rows.map(sourceRow => {
    const row = validateNoveltyImportRow(sourceRow, employees, catalogs)
    const key = `${row.period}|${normalizeNoveltyImportText(row.sourceIdentification)}|${normalizeNoveltyImportText(row.sourceRubric)}|${row.applicationPeriod}`
    if (seen.has(key)) row.validationIssues = [...row.validationIssues, 'Registro duplicado dentro del archivo']
    else seen.add(key)
    return row
  })
}

async function readNoveltyImportFile(file: File, employees: Employee[], catalogs: Catalogs) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) throw new Error('El archivo no contiene hojas de cálculo.')
  const sourceRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], { header: 1, raw: true, defval: '' })
  const requiredHeaders = ['periodo', 'identificacion', 'razon social', 'rubro', 'aplicacion', 'valor', 'tercero', 'periodo aplicacion', 'observaciones']
  const headerIndex = sourceRows.findIndex(sourceRow => requiredHeaders.every(header => sourceRow.map(normalizeSpreadsheetHeader).includes(header)))
  if (headerIndex < 0) throw new Error('La estructura no coincide con la plantilla Ejemplo Carga Novedades.')
  const headers = sourceRows[headerIndex].map(normalizeSpreadsheetHeader)
  const column = Object.fromEntries(requiredHeaders.map(header => [header, headers.indexOf(header)]))
  const rows = sourceRows.slice(headerIndex + 1).flatMap((sourceRow, index) => {
    if (!sourceRow.some(value => String(value ?? '').trim())) return []
    const row = validateNoveltyImportRow({
      id: `NOV-IMP-L-${Date.now()}-${index}`,
      period: String(sourceRow[column.periodo] ?? '').trim(),
      sourceIdentification: String(sourceRow[column.identificacion] ?? '').trim(),
      sourceBusinessName: String(sourceRow[column['razon social']] ?? '').trim(),
      employeeId: '',
      sourceRubric: String(sourceRow[column.rubro] ?? '').trim(),
      rubricId: '',
      sourceApplication: String(sourceRow[column.aplicacion] ?? '').trim(),
      applicationForm: '',
      sourceValue: String(sourceRow[column.valor] ?? '').trim(),
      value: '',
      thirdParty: String(sourceRow[column.tercero] ?? '').trim(),
      sourceApplicationPeriod: String(sourceRow[column['periodo aplicacion']] ?? '').trim(),
      applicationPeriod: '',
      observations: String(sourceRow[column.observaciones] ?? '').trim(),
      validationIssues: [],
    }, employees, catalogs)
    return [row]
  })
  if (!rows.length) throw new Error('El archivo no contiene novedades para cargar.')
  return validateNoveltyImportRows(rows, employees, catalogs)
}

function NoveltyImportPage({ employees, catalogs, setNovelties, uploads, setUploads }: { employees: Employee[]; catalogs: Catalogs; setNovelties: Dispatch<SetStateAction<PayrollNovelty[]>>; uploads: NoveltyUpload[]; setUploads: Dispatch<SetStateAction<NoveltyUpload[]>> }) {
  const [pending, setPending] = useState<NoveltyImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionError, setDescriptionError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null)
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null)
  const selectedUpload = uploads.find(upload => upload.id === selectedUploadId)
  const deletingUpload = uploads.find(upload => upload.id === deletingUploadId)
  const filteredUploads = uploads.filter(upload => `${upload.description} ${upload.fileName} ${upload.user} ${upload.status}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  const uploadSort = useSortableRows(filteredUploads, { description: row => row.description, fileName: row => row.fileName, uploadedAt: row => row.uploadedAt, user: row => row.user, status: row => row.status })

  useEffect(() => {
    if (!selectedUploadId) return
    setUploads(current => current.map(upload => upload.id === selectedUploadId && upload.status === 'PENDIENTE' ? { ...upload, reviewed: true } : upload))
  }, [selectedUploadId, setUploads])

  const selectFile = async (file?: File) => {
    if (!file) return
    rememberUploadedFile(file)
    setLoading(true); setMessage(''); setPending([]); setFileName(file.name); setDescriptionError('')
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera el tamaño máximo de 10 MB.')
      setPending(await readNoveltyImportFile(file, employees, catalogs))
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'No fue posible leer el archivo.'}`)
    } finally { setLoading(false) }
  }

  const stageUpload = () => {
    const cleanDescription = description.trim()
    if (!cleanDescription) { setDescriptionError('Ingresa una descripción para identificar esta carga.'); return }
    if (!pending.length) return
    const inconsistentRows = pending.filter(row => row.validationIssues.length).length
    const upload: NoveltyUpload = { id: `NOV-UP-${Date.now()}`, description: cleanDescription, fileName, uploadedAt: new Date().toISOString(), user: 'Ana Navarro', status: 'PENDIENTE', recordCount: pending.length, reviewed: false, rows: pending, processedNoveltyIds: [] }
    setUploads(current => [upload, ...current])
    setMessage(`El archivo quedó Pendiente con ${pending.length} ${pending.length === 1 ? 'registro' : 'registros'}.${inconsistentRows ? ` La lupa mostrará ${inconsistentRows} ${inconsistentRows === 1 ? 'fila inconsistente' : 'filas inconsistentes'} en naranja.` : ' Revísalo con la lupa antes de procesarlo.'}`)
    setPending([]); setFileName(''); setDescription(''); setDescriptionError('')
  }

  const processUpload = (upload: NoveltyUpload) => {
    if (upload.status !== 'PENDIENTE') return
    if (!upload.reviewed) { setMessage(`Error: revisa primero ${upload.fileName} mediante el ícono de lupa.`); return }
    const refreshedRows = validateNoveltyImportRows(upload.rows, employees, catalogs)
    const inconsistentRows = refreshedRows.filter(row => row.validationIssues.length).length
    if (inconsistentRows) {
      setUploads(current => current.map(item => item.id === upload.id ? { ...item, rows: refreshedRows } : item))
      setMessage(`Error: no se puede procesar ${upload.fileName}. Revisa las ${inconsistentRows} ${inconsistentRows === 1 ? 'fila inconsistente' : 'filas inconsistentes'} marcadas en naranja.`)
      return
    }
    const processedNoveltyIds = refreshedRows.map((row, index) => `${upload.id}-NOV-${index + 1}`)
    const rubrics = Object.fromEntries(catalogs.rubros.map(rubric => [rubric.id, rubric]))
    const imported = refreshedRows.map((row, index): PayrollNovelty => ({
      id: processedNoveltyIds[index],
      employeeId: row.employeeId,
      rubricId: row.rubricId,
      rubricName: rubrics[row.rubricId]?.name ?? row.sourceRubric,
      status: 'ACTIVA',
      applicationForm: row.applicationForm || 'TOTAL',
      installments: 1,
      startPeriod: row.period,
      applicationPeriod: row.applicationPeriod || 'FIN_MES',
      installmentValue: row.value,
      totalValue: row.value,
      paidValue: '0.00',
      description: `${rubrics[row.rubricId]?.name ?? row.sourceRubric} · ${row.applicationForm === 'CUOTAS' ? '1 cuota importada' : 'Total'}`,
      thirdParty: row.thirdParty,
      observations: row.observations,
    }))
    setNovelties(current => [...imported, ...current.filter(novelty => !processedNoveltyIds.includes(novelty.id))])
    setUploads(current => current.map(item => item.id === upload.id ? { ...item, rows: refreshedRows, status: 'PROCESADO', processedNoveltyIds } : item))
    setMessage(`${imported.length} ${imported.length === 1 ? 'novedad procesada' : 'novedades procesadas'} correctamente desde ${upload.fileName}.`)
  }

  const deleteUpload = (upload: NoveltyUpload) => {
    const importedIds = new Set(upload.processedNoveltyIds)
    setNovelties(current => current.filter(novelty => !importedIds.has(novelty.id)))
    setUploads(current => current.map(item => item.id === upload.id ? { ...item, status: 'ELIMINADO', rows: [], processedNoveltyIds: [] } : item))
    setSelectedUploadId(current => current === upload.id ? null : current); setDeletingUploadId(null)
    setMessage(`Se eliminó toda la información asociada al archivo ${upload.fileName}.`)
  }

  return <>
    <PageHeader eyebrow="Administrar Nómina / Carga de Novedades" title="Carga de Novedades" description="Carga, valida y procesa novedades mediante la plantilla definida para el sistema." action={<a className="button secondary" href="/Ejemplo%20Carga%20Novedades.xlsx" download="Ejemplo Carga Novedades.xlsx"><Download size={18} /> Descargar archivo de ejemplo</a>} />
    <section className="overtime-upload-section"><div className="panel import-card salary-import-card overtime-upload-card"><div className="import-icon"><Upload /></div><h2>Subir novedades</h2><p>La carga queda Pendiente hasta que revises el detalle con la lupa y la proceses con play.</p><label className="button primary file-picker"><Upload size={18} /> {loading ? 'Validando…' : 'Seleccionar archivo'}<input type="file" accept=".xlsx,.xls" disabled={loading} onChange={event => { void selectFile(event.target.files?.[0]); event.currentTarget.value = '' }} /></label><span className="cell-meta">Formatos XLSX o XLS · máximo 10 MB</span>{fileName && <><div className="selected-import-file"><FileText size={18} /><div><strong>{fileName}</strong><span>{pending.length} filas leídas · {pending.filter(row => row.validationIssues.length).length} inconsistencias</span></div></div><div className="field overtime-upload-description"><label htmlFor="novelty-upload-description">Descripción <span>Obligatorio</span></label><input id="novelty-upload-description" value={description} onChange={event => { setDescription(event.target.value.slice(0, 100)); setDescriptionError('') }} maxLength={100} placeholder="Ej. Novedades de octubre" aria-invalid={Boolean(descriptionError)} />{descriptionError && <small className="field-error">{descriptionError}</small>}</div><button className="button primary" onClick={stageUpload}><Database size={18} /> Cargar archivo como pendiente</button></>}</div></section>
    {message && <div className={`notice ${message.startsWith('Error:') ? 'warning' : 'info'}`}>{message.startsWith('Error:') ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}<div><strong>{message.startsWith('Error:') ? 'No se puede procesar el archivo' : 'Operación completada'}</strong><p>{message}</p></div></div>}
    <section className="panel table-panel"><div className="panel-heading"><div><h2>Archivos cargados</h2><p>La lupa valida el detalle. Play procesa únicamente archivos revisados y sin inconsistencias.</p></div><Badge tone="neutral">{uploads.length} archivos</Badge></div><div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar archivos de novedades</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por descripción, archivo, usuario o estado" /></label></div><div className="table-scroll" role="region" aria-label="Archivos de novedades cargados" tabIndex={0}><table className="overtime-upload-table"><thead><tr><SortableTh label="Descripción" sortKey="description" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Archivo" sortKey="fileName" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Fecha" sortKey="uploadedAt" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Usuario" sortKey="user" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Estado" sortKey="status" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><th className="row-action-cell">Detalle</th><th className="row-action-cell">Procesar</th><th className="row-action-cell">Eliminar</th></tr></thead><tbody>{uploadSort.sortedRows.map(upload => { const inconsistentRows = upload.rows.filter(row => row.validationIssues.length).length; const eliminated = upload.status === 'ELIMINADO'; return <tr key={upload.id}><td><strong>{upload.description}</strong><span className={`cell-meta ${inconsistentRows ? 'warning-text' : ''}`}>{upload.recordCount} {upload.recordCount === 1 ? 'registro' : 'registros'}{inconsistentRows ? ` · ${inconsistentRows} inconsistentes` : upload.reviewed ? ' · revisado' : ' · pendiente de revisión'}</span></td><td>{upload.fileName}</td><td>{new Intl.DateTimeFormat('es-EC', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(upload.uploadedAt))}</td><td>{upload.user}</td><td><Badge tone={upload.status === 'PROCESADO' ? 'success' : upload.status === 'PENDIENTE' ? 'warning' : 'neutral'}>{upload.status === 'PROCESADO' ? 'Procesado' : upload.status === 'PENDIENTE' ? 'Pendiente' : 'Eliminado'}</Badge></td><td className="row-action-cell"><button className="icon-button small edit-icon" disabled={eliminated} onClick={() => setSelectedUploadId(upload.id)} aria-label={`Ver datos de ${upload.fileName}`} title={eliminated ? 'El detalle fue eliminado' : 'Validar datos cargados'}><Search size={17} /></button></td><td className="row-action-cell"><button className="icon-button small process-icon" disabled={upload.status !== 'PENDIENTE'} onClick={() => processUpload(upload)} aria-label={`Procesar ${upload.fileName}`} title={!upload.reviewed ? 'Revisa primero el archivo con la lupa' : inconsistentRows ? 'Corrige las inconsistencias antes de procesar' : 'Procesar información'}><Play size={17} /></button></td><td className="row-action-cell"><button className="icon-button small delete-icon" disabled={eliminated} onClick={() => setDeletingUploadId(upload.id)} aria-label={`Eliminar ${upload.fileName}`} title={eliminated ? 'Archivo eliminado' : 'Eliminar carga'}><Trash2 size={17} /></button></td></tr>})}{!uploadSort.sortedRows.length && <tr><td colSpan={8}><div className="empty-state"><FileText /><strong>Sin archivos cargados</strong><p>Los archivos aparecerán aquí inicialmente en estado Pendiente.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{filteredUploads.length} de {uploads.length} archivos</span><span>Usuario actual: Ana Navarro</span></div></section>
    {selectedUpload && selectedUpload.status !== 'ELIMINADO' && <NoveltyUploadDetailDialog upload={selectedUpload} employees={employees} catalogs={catalogs} onClose={() => setSelectedUploadId(null)} />}
    {deletingUpload && deletingUpload.status !== 'ELIMINADO' && <NoveltyUploadDeleteDialog upload={deletingUpload} onClose={() => setDeletingUploadId(null)} onConfirm={() => deleteUpload(deletingUpload)} />}
  </>
}

function NoveltyUploadDetailDialog({ upload, employees, catalogs, onClose }: { upload: NoveltyUpload; employees: Employee[]; catalogs: Catalogs; onClose: () => void }) {
  const employeeMap = Object.fromEntries(employees.map(employee => [employee.id, employee]))
  const rubricMap = Object.fromEntries(catalogs.rubros.map(rubric => [rubric.id, rubric]))
  const inconsistentRows = upload.rows.filter(row => row.validationIssues.length).length
  return <Dialog title={upload.description} description={`${upload.fileName} · ${upload.recordCount} registros cargados`} onClose={onClose} className="dialog-wide"><div className="upload-detail-body"><div className={`notice ${inconsistentRows ? 'warning' : 'info'}`}>{inconsistentRows ? <AlertTriangle size={20} /> : <Search size={20} />}<div><strong>{inconsistentRows ? `${inconsistentRows} ${inconsistentRows === 1 ? 'fila requiere' : 'filas requieren'} revisión` : 'Vista previa validada'}</strong><p>{inconsistentRows ? 'Las filas naranjas contienen inconsistencias de Identificación, Razón Social, Rubro o formato. Corrige el archivo y vuelve a cargarlo.' : 'La información está lista para procesarse mediante el ícono de play.'}</p></div></div><div className="table-scroll" role="region" aria-label={`Datos cargados desde ${upload.fileName}`} tabIndex={0}><table className="overtime-detail-table overtime-review-table"><thead><tr><th>Período</th><th>Identificación</th><th>Razón Social</th><th>Rubro</th><th>Aplicación</th><th className="numeric">Valor</th><th>Tercero</th><th>Periodo Aplicación</th><th>Observaciones</th><th>Inconsistencia</th></tr></thead><tbody>{upload.rows.map(row => <tr key={row.id} className={row.validationIssues.length ? 'inconsistent-row' : undefined}><td>{row.period || 'Sin dato'}</td><td>{row.sourceIdentification || employeeMap[row.employeeId]?.document || 'Sin dato'}</td><td>{row.sourceBusinessName || employeeMap[row.employeeId]?.businessName || employeeMap[row.employeeId]?.name || 'Sin dato'}</td><td>{row.sourceRubric || rubricMap[row.rubricId]?.name || 'Sin dato'}</td><td>{row.sourceApplication || 'Sin dato'}</td><td className="numeric">{row.value ? money(row.value) : row.sourceValue || 'Sin dato'}</td><td>{row.thirdParty || 'Sin tercero'}</td><td>{row.sourceApplicationPeriod || 'Sin dato'}</td><td>{row.observations || 'Sin observaciones'}</td><td>{row.validationIssues.length ? <span className="validation-message"><AlertTriangle size={15} />{row.validationIssues.join(' · ')}</span> : <span className="validation-ok"><CheckCircle2 size={15} /> Correcto</span>}</td></tr>)}</tbody></table></div><div className="dialog-actions"><button type="button" className="button primary" onClick={onClose}>Cerrar</button></div></div></Dialog>
}

function NoveltyUploadDeleteDialog({ upload, onClose, onConfirm }: { upload: NoveltyUpload; onClose: () => void; onConfirm: () => void }) {
  return <Dialog title="Confirmar eliminación" description={upload.fileName} onClose={onClose}><div className="upload-detail-body"><div className="notice warning"><AlertTriangle size={20} /><div><strong>Esta acción eliminará toda la información de la carga</strong><p>{upload.status === 'PROCESADO' ? 'También se retirarán de Novedades todos los registros procesados desde este archivo.' : 'El archivo todavía no fue procesado; se descartarán sus registros pendientes.'} El historial del archivo se conservará con estado Eliminado.</p></div></div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="button" className="button danger-button" onClick={onConfirm}><Trash2 size={17} /> Sí, eliminar</button></div></div></Dialog>
}

function periodLabel(period: string) {
  const [year, month] = period.split('-')
  return month && year ? `${month}/${year}` : period
}

function overtimeBonus(hours25: string, hours50: string, hours100: string, salary: string) {
  const weightedHundredths = decimalToCents(hours25 || '0') * 125n + decimalToCents(hours50 || '0') * 150n + decimalToCents(hours100 || '0') * 200n
  const numerator = weightedHundredths * decimalToCents(salary || '0')
  const denominator = 2400000n
  const roundedCents = (numerator + denominator / 2n) / denominator
  return centsToDecimal(roundedCents)
}

function spreadsheetOvertimePeriod(value: unknown) {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    return parsed ? `${parsed.y}-${String(parsed.m).padStart(2, '0')}` : ''
  }
  const text = String(value ?? '').trim()
  const yearFirst = /^(\d{4})[-\/]([1-9]|1[0-2])$/.exec(text)
  if (yearFirst) return `${yearFirst[1]}-${yearFirst[2].padStart(2, '0')}`
  const monthFirst = /^([1-9]|1[0-2])[-\/](\d{4})$/.exec(text)
  return monthFirst ? `${monthFirst[2]}-${monthFirst[1].padStart(2, '0')}` : ''
}

function spreadsheetOvertimeDate(value: unknown, period: string) {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    return parsed ? `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${parsed.y}` : ''
  }
  const text = String(value ?? '').trim()
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text)
  if (iso) return `${iso[3].padStart(2, '0')}/${iso[2].padStart(2, '0')}/${iso[1]}`
  const parts = text.split(/[\/-]/).map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return ''
  const periodMonth = Number(period.split('-')[1]); const year = parts[2] < 100 ? 2000 + parts[2] : parts[2]
  const monthFirst = parts[0] === periodMonth
  const day = monthFirst ? parts[1] : parts[0]; const month = monthFirst ? parts[0] : parts[1]
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}` : ''
}

function spreadsheetHours(value: unknown) {
  const normalized = String(value ?? '').trim().replace(',', '.')
  if (!normalized) return '0.00'
  const number = Number(normalized)
  return Number.isFinite(number) && number >= 0 ? number.toFixed(2) : ''
}

async function readOvertimeFile(file: File, employees: Employee[]) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) throw new Error('El archivo no contiene hojas de cálculo.')
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], { header: 1, raw: true, defval: '' })
  const requiredHeaders = ['periodo', 'fecha', 'nomina', 'identificacion', 'nombre', 'horas al 25%', 'horas al 50%', 'horas al 100%']
  const headerIndex = rows.findIndex(row => requiredHeaders.every(header => row.map(normalizeSpreadsheetHeader).includes(header)))
  if (headerIndex < 0) throw new Error('La estructura no coincide con la plantilla Ejemplo Horas Extra.')
  const headers = rows[headerIndex].map(normalizeSpreadsheetHeader)
  const column = Object.fromEntries(requiredHeaders.map(header => [header, headers.indexOf(header)]))
  const issues: string[] = []; const now = new Date().toISOString(); const seen = new Set<string>()
  const records = rows.slice(headerIndex + 1).flatMap((row, index) => {
    if (!row.some(value => String(value ?? '').trim())) return []
    const sourcePeriod = String(row[column.periodo] ?? '').trim()
    const sourceDate = String(row[column.fecha] ?? '').trim()
    const period = spreadsheetOvertimePeriod(row[column.periodo])
    const date = spreadsheetOvertimeDate(row[column.fecha], period)
    const payrollCode = String(row[column.nomina] ?? '').trim().toUpperCase()
    const payroll: OvertimeRecord['payroll'] | '' = payrollCode === 'Q' ? 'QUINCENA' : payrollCode === 'F' ? 'FIN_MES' : ''
    const identification = String(row[column.identificacion] ?? '').replace(/\D/g, '')
    const employeeName = String(row[column.nombre] ?? '').trim()
    const employee = employees.find(item => item.document === identification)
    const hours25 = spreadsheetHours(row[column['horas al 25%']]); const hours50 = spreadsheetHours(row[column['horas al 50%']]); const hours100 = spreadsheetHours(row[column['horas al 100%']])
    const key = `${period}|${payrollCode}|${date}|${identification}`
    const rowIssues = [!period && 'Período inválido', !date && 'Fecha inválida', date && period && `${date.slice(6)}-${date.slice(3, 5)}` !== period && 'Fecha fuera del período', !payroll && 'NÓMINA debe ser Q o F', !/^\d{10}$/.test(identification) && 'Identificación inválida', !employee && 'Empleado no registrado en la base de datos', employee && employee.name !== employeeName && 'El nombre no coincide exactamente con el empleado', (!hours25 || !hours50 || !hours100) && 'Horas inválidas', hours25 && hours50 && hours100 && [hours25, hours50, hours100].every(value => Number(value) === 0) && 'Sin horas registradas', seen.has(key) && 'Registro duplicado'].filter(Boolean) as string[]
    if (rowIssues.length) issues.push(`Fila ${headerIndex + index + 2}: ${rowIssues.join(', ')}.`)
    else seen.add(key)
    const normalizedPayroll: OvertimeRecord['payroll'] = payroll || 'QUINCENA'
    const baseSalary = employee?.salary ?? '0.00'
    return [{ id: `HEX-IMP-L-${Date.now()}-${index}`, batchId: `HEX-IMP-${period || 'INVALIDO'}-${payrollCode || 'INVALIDO'}-${Date.now()}`, period, payroll: normalizedPayroll, date, employeeId: employee?.id ?? '', hours25, hours50, hours100, baseSalary, bonusValue: overtimeBonus(hours25, hours50, hours100, baseSalary), sourceFile: file.name, importedAt: now, sourcePeriod, sourceDate, sourcePayroll: payrollCode, sourceIdentification: identification, sourceEmployeeName: employeeName, validationIssues: rowIssues } satisfies OvertimeRecord]
  })
  if (!records.length && !issues.length) throw new Error('El archivo no contiene registros para cargar.')
  return { records, issues }
}

function OvertimeImportPage({ employees, records, setRecords, uploads, setUploads }: { employees: Employee[]; records: OvertimeRecord[]; setRecords: Dispatch<SetStateAction<OvertimeRecord[]>>; uploads: OvertimeUploadSummary[]; setUploads: Dispatch<SetStateAction<OvertimeUploadSummary[]>> }) {
  const [pending, setPending] = useState<OvertimeRecord[]>([])
  const [issues, setIssues] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionError, setDescriptionError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null)
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null)
  const employeeMap = Object.fromEntries(employees.map(employee => [employee.id, employee]))
  const uploadStatus = (upload: OvertimeUploadSummary) => upload.status ?? 'PROCESADO'
  const filteredUploads = uploads.filter(upload => `${upload.description} ${upload.fileName} ${upload.user} ${uploadStatus(upload)}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  const uploadSort = useSortableRows(filteredUploads, { description: row => row.description, fileName: row => row.fileName, importedAt: row => row.importedAt, user: row => row.user, status: row => uploadStatus(row) })
  const selectedUpload = uploads.find(upload => upload.id === selectedUploadId)
  const deletingUpload = uploads.find(upload => upload.id === deletingUploadId)
  useEffect(() => {
    if (!selectedUploadId) return
    setUploads(current => current.map(item => item.id === selectedUploadId && (item.status ?? 'PROCESADO') === 'PENDIENTE' && !item.reviewed ? { ...item, reviewed: true } : item))
  }, [selectedUploadId, setUploads])
  const selectFile = async (file?: File) => {
    if (!file) return
    rememberUploadedFile(file)
    setLoading(true); setMessage(''); setPending([]); setIssues([]); setFileName(file.name); setDescriptionError('')
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera el tamaño máximo de 10 MB.')
      const result = await readOvertimeFile(file, employees); setPending(result.records); setIssues(result.issues)
    } catch (error) {
      setIssues([error instanceof Error ? error.message : 'No fue posible leer el archivo.'])
    } finally { setLoading(false) }
  }
  const confirmImport = () => {
    const cleanDescription = description.trim()
    if (!cleanDescription) { setDescriptionError('Ingresa una descripción para identificar esta carga.'); return }
    if (!pending.length) return
    const uploadId = `HE-UP-${Date.now()}`; const importedAt = new Date().toISOString(); const uploadedBy = 'Ana Navarro'
    const uploadedRecords = pending.map(record => ({ ...record, uploadId, uploadDescription: cleanDescription, importedAt, uploadedBy }))
    const inconsistentRows = uploadedRecords.filter(record => record.validationIssues?.length || !record.employeeId).length
    setUploads(current => [{ id: uploadId, description: cleanDescription, fileName, importedAt, user: uploadedBy, status: 'PENDIENTE', recordCount: uploadedRecords.length, reviewed: false, records: uploadedRecords }, ...current])
    setMessage(`El archivo quedó pendiente con ${uploadedRecords.length} ${uploadedRecords.length === 1 ? 'fila' : 'filas'}.${inconsistentRows ? ` Se detectaron ${inconsistentRows} con inconsistencias; revísalas con la lupa.` : ' Revísalo con la lupa y usa play para procesarlo.'}`)
    setPending([]); setIssues([]); setFileName(''); setDescription(''); setDescriptionError('')
  }
  const processUpload = (upload: OvertimeUploadSummary) => {
    if (uploadStatus(upload) !== 'PENDIENTE' || !upload.records.length) return
    if (!upload.reviewed) { setMessage(`Error: revisa primero el archivo ${upload.fileName} mediante el ícono de lupa antes de procesarlo.`); return }
    const inconsistentRows = upload.records.filter(record => record.validationIssues?.length || !record.employeeId).length
    if (inconsistentRows) { setMessage(`Error: no se puede procesar ${upload.fileName}. Revisa las ${inconsistentRows} ${inconsistentRows === 1 ? 'fila inconsistente' : 'filas inconsistentes'} señaladas en naranja.`); return }
    setRecords(current => {
      const batchByPeriod = new Map<string, string>()
      current.forEach(record => batchByPeriod.set(`${record.period}|${record.payroll}`, record.batchId))
      const byKey = new Map(current.map(record => [`${record.period}|${record.payroll}|${record.date}|${record.employeeId}`, record]))
      upload.records.forEach(record => {
        const groupKey = `${record.period}|${record.payroll}`; const batchId = batchByPeriod.get(groupKey) ?? record.batchId
        batchByPeriod.set(groupKey, batchId)
        byKey.set(`${record.period}|${record.payroll}|${record.date}|${record.employeeId}`, { ...record, batchId, uploadId: upload.id, uploadDescription: upload.description, importedAt: upload.importedAt, uploadedBy: upload.user })
      })
      return [...byKey.values()]
    })
    setUploads(current => current.map(item => item.id === upload.id ? { ...item, status: 'PROCESADO', recordCount: item.recordCount ?? item.records.length } : item))
    setMessage(`${upload.records.length} ${upload.records.length === 1 ? 'registro procesado' : 'registros procesados'} en HORAS_EXTRA desde ${upload.fileName}.`)
  }
  const deleteUpload = (upload: OvertimeUploadSummary) => {
    setRecords(current => current.filter(record => record.uploadId !== upload.id))
    setUploads(current => current.map(item => item.id === upload.id ? { ...item, status: 'ELIMINADO', recordCount: item.recordCount ?? item.records.length, records: [] } : item))
    setSelectedUploadId(current => current === upload.id ? null : current)
    setDeletingUploadId(null)
    setMessage(`Se eliminó la información asociada al archivo ${upload.fileName}.`)
  }
  return <>
    <PageHeader eyebrow="Administrar Nómina / Carga de Horas Extra" title="Carga de Horas Extra" description="Importa horas extra desde la plantilla definida y consulta el historial de archivos cargados." action={<a className="button secondary" href="/Ejemplo%20Horas%20Extra.xlsx" download="Ejemplo Horas Extra.xlsx"><Download size={18} /> Descargar archivo de ejemplo</a>} />
    <section className="overtime-upload-section"><div className="panel import-card salary-import-card overtime-upload-card"><div className="import-icon"><Upload /></div><h2>Subir horas extra</h2><p>La carga queda pendiente hasta que revises el detalle y la proceses con el ícono de play.</p><label className="button primary file-picker"><Upload size={18} /> {loading ? 'Validando…' : 'Seleccionar archivo'}<input type="file" accept=".xlsx,.xls" disabled={loading} onChange={event => { void selectFile(event.target.files?.[0]); event.currentTarget.value = '' }} /></label><span className="cell-meta">Formatos XLSX o XLS · máximo 10 MB</span>{fileName && <><div className="selected-import-file"><FileText size={18} /><div><strong>{fileName}</strong><span>{pending.length} filas leídas · {issues.length} inconsistencias</span></div></div><div className="field overtime-upload-description"><label htmlFor="overtime-upload-description">Descripción <span>Obligatorio</span></label><input id="overtime-upload-description" value={description} onChange={event => { setDescription(event.target.value.slice(0, 100)); setDescriptionError('') }} maxLength={100} placeholder="Ej. Horas extra de octubre - Quincena" aria-invalid={Boolean(descriptionError)} />{descriptionError && <small className="field-error">{descriptionError}</small>}</div></>}{issues.length > 0 && <div className="import-issues" role="alert"><strong>Inconsistencias detectadas</strong><ul>{issues.slice(0, 5).map(issue => <li key={issue}>{issue}</li>)}</ul>{issues.length > 5 && <span>y {issues.length - 5} inconsistencias más.</span>}</div>}{pending.length > 0 && <button className="button primary" onClick={confirmImport}><Database size={18} /> Cargar archivo como pendiente</button>}</div></section>
    {message && <div className={`notice ${message.startsWith('Error:') ? 'warning' : 'info'}`}>{message.startsWith('Error:') ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}<div><strong>{message.startsWith('Error:') ? 'No se puede procesar el archivo' : 'Operación completada'}</strong><p>{message}</p></div></div>}
    <section className="panel table-panel"><div className="panel-heading"><div><h2>Archivos cargados</h2><p>Valida el contenido con la lupa antes de procesarlo. Solo los archivos procesados actualizan HORAS_EXTRA.</p></div><Badge tone="neutral">{uploads.length} archivos</Badge></div><div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar archivos cargados</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por descripción, archivo, usuario o estado" /></label></div><div className="table-scroll" role="region" aria-label="Archivos de horas extra cargados" tabIndex={0}><table className="overtime-upload-table"><thead><tr><SortableTh label="Descripción" sortKey="description" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Archivo" sortKey="fileName" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Fecha" sortKey="importedAt" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Usuario" sortKey="user" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><SortableTh label="Estado" sortKey="status" sort={uploadSort.sort} onSort={uploadSort.toggleSort} /><th className="row-action-cell">Detalle</th><th className="row-action-cell">Procesar</th><th className="row-action-cell">Eliminar</th></tr></thead><tbody>{uploadSort.sortedRows.map(upload => { const status = uploadStatus(upload); const inconsistentRows = upload.records.filter(record => record.validationIssues?.length || !record.employeeId).length; const eliminated = status === 'ELIMINADO'; const recordCount = upload.recordCount ?? upload.records.length; return <tr key={upload.id}><td><strong>{upload.description}</strong><span className={`cell-meta ${inconsistentRows ? 'warning-text' : ''}`}>{recordCount} {recordCount === 1 ? 'registro' : 'registros'}{inconsistentRows ? ` · ${inconsistentRows} inconsistentes` : ''}</span></td><td>{upload.fileName}</td><td>{upload.importedAt ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(upload.importedAt)) : 'Sin fecha'}</td><td>{upload.user}</td><td><Badge tone={status === 'PROCESADO' ? 'success' : status === 'PENDIENTE' ? 'warning' : 'neutral'}>{status === 'PROCESADO' ? 'Procesado' : status === 'PENDIENTE' ? 'Pendiente' : 'Eliminado'}</Badge></td><td className="row-action-cell"><button className="icon-button small edit-icon" disabled={eliminated} onClick={() => setSelectedUploadId(upload.id)} aria-label={`Ver datos de ${upload.fileName}`} title={eliminated ? 'El detalle fue eliminado' : 'Ver datos cargados'}><Search size={17} /></button></td><td className="row-action-cell"><button className="icon-button small process-icon" disabled={status !== 'PENDIENTE'} onClick={() => processUpload(upload)} aria-label={`Procesar ${upload.fileName}`} title={inconsistentRows ? 'Revisar inconsistencias antes de procesar' : status === 'PENDIENTE' ? 'Procesar información' : status === 'PROCESADO' ? 'Archivo ya procesado' : 'Archivo eliminado'}><Play size={17} /></button></td><td className="row-action-cell"><button className="icon-button small delete-icon" disabled={eliminated} onClick={() => setDeletingUploadId(upload.id)} aria-label={`Eliminar ${upload.fileName}`} title={eliminated ? 'Archivo eliminado' : 'Eliminar carga'}><Trash2 size={17} /></button></td></tr> })}{!uploadSort.sortedRows.length && <tr><td colSpan={8}><div className="empty-state"><FileText /><strong>Sin archivos cargados</strong><p>Los archivos cargados aparecerán aquí en estado Pendiente.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{filteredUploads.length} de {uploads.length} archivos</span><span>Usuario actual: Ana Navarro</span></div></section>
    {selectedUpload && uploadStatus(selectedUpload) !== 'ELIMINADO' && <OvertimeUploadDetailDialog upload={selectedUpload} employeeMap={employeeMap} onClose={() => setSelectedUploadId(null)} />}
    {deletingUpload && uploadStatus(deletingUpload) !== 'ELIMINADO' && <OvertimeUploadDeleteDialog upload={deletingUpload} status={uploadStatus(deletingUpload)} onClose={() => setDeletingUploadId(null)} onConfirm={() => deleteUpload(deletingUpload)} />}
  </>
}

function OvertimeUploadDetailDialog({ upload, employeeMap, onClose }: { upload: OvertimeUploadSummary; employeeMap: Record<string, Employee>; onClose: () => void }) {
  const inconsistentRows = upload.records.filter(record => record.validationIssues?.length || !record.employeeId).length
  const validRecords = upload.records.filter(record => !record.validationIssues?.length && record.employeeId)
  return <Dialog title={upload.description} description={`${upload.fileName} · ${upload.recordCount ?? upload.records.length} registros cargados`} onClose={onClose} className="dialog-wide"><div className="upload-detail-body"><div className={`notice ${inconsistentRows ? 'warning' : 'info'}`}>{inconsistentRows ? <AlertTriangle size={20} /> : <Search size={20} />}<div><strong>{inconsistentRows ? `${inconsistentRows} ${inconsistentRows === 1 ? 'fila requiere' : 'filas requieren'} revisión` : 'Vista previa validada'}</strong><p>{inconsistentRows ? 'Las filas naranjas contienen inconsistencias. Corrige el archivo y vuelve a cargarlo antes de procesar.' : 'La información está lista para procesarse mediante el ícono de play.'}</p></div></div><div className="table-scroll" role="region" aria-label={`Datos cargados desde ${upload.fileName}`} tabIndex={0}><table className="overtime-detail-table overtime-review-table"><thead><tr><th>Período</th><th>Fecha</th><th>Nómina</th><th>Identificación</th><th>Nombre</th><th className="numeric">Horas al 25%</th><th className="numeric">Horas al 50%</th><th className="numeric">Horas al 100%</th><th>Inconsistencia</th></tr></thead><tbody>{upload.records.map(record => { const rowIssues = record.validationIssues ?? []; const inconsistent = rowIssues.length > 0 || !record.employeeId; return <tr key={record.id} className={inconsistent ? 'inconsistent-row' : undefined}><td>{record.period ? periodLabel(record.period) : record.sourcePeriod || 'Sin dato'}</td><td>{record.date || record.sourceDate || 'Sin dato'}</td><td>{record.sourcePayroll ? record.sourcePayroll === 'Q' ? 'Quincena (Q)' : record.sourcePayroll === 'F' ? 'Fin de Mes (F)' : record.sourcePayroll : record.payroll === 'QUINCENA' ? 'Quincena (Q)' : 'Fin de Mes (F)'}</td><td>{record.sourceIdentification ?? employeeMap[record.employeeId]?.document ?? 'Sin dato'}</td><td>{record.sourceEmployeeName ?? employeeMap[record.employeeId]?.name ?? 'Sin dato'}</td><td className="numeric">{record.hours25 || '—'}</td><td className="numeric">{record.hours50 || '—'}</td><td className="numeric">{record.hours100 || '—'}</td><td>{inconsistent ? <span className="validation-message"><AlertTriangle size={15} />{rowIssues.join(' · ') || 'Empleado no registrado en la base de datos'}</span> : <span className="validation-ok"><CheckCircle2 size={15} /> Correcto</span>}</td></tr> })}</tbody></table></div><div className="dialog-actions"><span>Total válido calculado: <strong>{money(validRecords.reduce((total, record) => total + decimalToCents(record.bonusValue), 0n))}</strong></span><button type="button" className="button primary" onClick={onClose}>Cerrar</button></div></div></Dialog>
}

function OvertimeUploadDeleteDialog({ upload, status, onClose, onConfirm }: { upload: OvertimeUploadSummary; status: 'PENDIENTE' | 'PROCESADO' | 'ELIMINADO'; onClose: () => void; onConfirm: () => void }) {
  return <Dialog title="Confirmar eliminación" description={upload.fileName} onClose={onClose}><div className="upload-detail-body"><div className="notice warning"><AlertTriangle size={20} /><div><strong>Esta acción eliminará los datos de la carga</strong><p>{status === 'PROCESADO' ? 'También se retirarán de HORAS_EXTRA todos los registros procesados desde este archivo.' : 'El archivo todavía no fue procesado; se descartarán sus registros pendientes.'} El historial se conservará con estado Eliminado.</p></div></div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="button" className="button danger-button" onClick={onConfirm}><Trash2 size={17} /> Sí, eliminar</button></div></div></Dialog>
}

function OvertimePage({ employees, records, setRecords }: { employees: Employee[]; records: OvertimeRecord[]; setRecords: Dispatch<SetStateAction<OvertimeRecord[]>> }) {
  const [adding, setAdding] = useState(false)
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const batches = useMemo(() => {
    const grouped = new Map<string, { batchId: string; period: string; payroll: OvertimeRecord['payroll']; count: number; total: bigint }>()
    records.forEach(record => {
      const current = grouped.get(record.batchId) ?? { batchId: record.batchId, period: record.period, payroll: record.payroll, count: 0, total: 0n }
      current.count += 1; current.total += decimalToCents(record.bonusValue); grouped.set(record.batchId, current)
    })
    return [...grouped.values()]
  }, [records])
  const filtered = batches.filter(batch => `${periodLabel(batch.period)} ${batch.payroll === 'QUINCENA' ? 'Quincena' : 'Fin de Mes'}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  const batchSort = useSortableRows(filtered, { period: row => row.period, payroll: row => row.payroll })
  const editingRecords = editingBatchId ? records.filter(record => record.batchId === editingBatchId) : []
  const saveBatch = (batchId: string, nextRecords: OvertimeRecord[]) => {
    setRecords(current => [...current.filter(record => record.batchId !== batchId), ...nextRecords])
    setAdding(false); setEditingBatchId(null)
  }
  return <>
    <PageHeader eyebrow="Administrar Nómina / Horas Extra" title="Horas Extra" description="Períodos de nómina con horas suplementarias y extraordinarias registradas." action={<button className="button primary" onClick={() => setAdding(true)}><Plus size={18} /> Agregar</button>} />
    <section className="panel table-panel"><div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar períodos de horas extra</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por período o nómina" /></label></div><div className="table-scroll" role="region" aria-label="Períodos con horas extra" tabIndex={0}><table className="overtime-period-table"><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Período" sortKey="period" sort={batchSort.sort} onSort={batchSort.toggleSort} /><SortableTh label="Nómina" sortKey="payroll" sort={batchSort.sort} onSort={batchSort.toggleSort} /></tr></thead><tbody>{batchSort.sortedRows.map(batch => <tr key={batch.batchId}><td className="row-action-cell"><button className="icon-button small edit-icon" onClick={() => setEditingBatchId(batch.batchId)} aria-label={`Editar horas extra de ${periodLabel(batch.period)}`} title="Editar período"><Pencil size={17} /></button></td><td><strong>{periodLabel(batch.period)}</strong><span className="cell-meta">{batch.count} {batch.count === 1 ? 'empleado' : 'empleados'}</span></td><td>{batch.payroll === 'QUINCENA' ? 'Quincena' : 'Fin de Mes'}<span className="cell-meta">Total: {money(batch.total)}</span></td></tr>)}{!batchSort.sortedRows.length && <tr><td colSpan={3}><div className="empty-state"><Clock3 /><strong>Sin períodos registrados</strong><p>Agrega un período y registra las horas extra de los empleados.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{filtered.length} de {batches.length} períodos</span><span>Tabla HORAS_EXTRA</span></div></section>
    {adding && <OvertimeDialog employees={employees} onClose={() => setAdding(false)} onSave={saveBatch} />}
    {editingBatchId && editingRecords.length > 0 && <OvertimeDialog employees={employees} records={editingRecords} onClose={() => setEditingBatchId(null)} onSave={saveBatch} />}
  </>
}

type OvertimeDraftRow = { id: string; date: string; employeeName: string; employeeIdentification: string; hours25: string; hours50: string; hours100: string }

function OvertimeDialog({ employees, records = [], onClose, onSave }: { employees: Employee[]; records?: OvertimeRecord[]; onClose: () => void; onSave: (batchId: string, records: OvertimeRecord[]) => void }) {
  const editing = records.length > 0
  const batchId = records[0]?.batchId ?? `HEX-${Date.now()}`
  const sortedEmployees = useMemo(() => [...employees].sort((a, b) => a.name.localeCompare(b.name, 'es')), [employees])
  const [period, setPeriod] = useState(records[0]?.period ?? '')
  const [payroll, setPayroll] = useState<OvertimeRecord['payroll'] | ''>(records[0]?.payroll ?? '')
  const [rows, setRows] = useState<OvertimeDraftRow[]>(() => records.map(record => { const employee = employees.find(item => item.id === record.employeeId); return { id: record.id, date: record.date, employeeName: employee?.name ?? '', employeeIdentification: employee?.document ?? '', hours25: record.hours25, hours50: record.hours50, hours100: record.hours100 } }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const formatDate = (value: string) => { const digits = value.replace(/\D/g, '').slice(0, 8); if (digits.length <= 2) return digits; if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`; return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}` }
  const validDate = (value: string) => { const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value); if (!match) return false; const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]))); return date.getUTCFullYear() === Number(match[3]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[1]) }
  const decimalHours = (value: string) => { const normalized = value.replace(',', '.').replace(/[^\d.]/g, ''); const [whole = '', ...rest] = normalized.split('.'); return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole }
  const addRow = () => setRows(current => [...current, { id: `HEX-L-${Date.now()}`, date: '', employeeName: '', employeeIdentification: '', hours25: '0', hours50: '0', hours100: '0' }])
  const updateRow = (id: string, field: keyof OvertimeDraftRow, value: string) => setRows(current => current.map(row => row.id === id ? { ...row, [field]: value } : row))
  const updateEmployeeName = (id: string, value: string) => {
    const employee = sortedEmployees.find(item => item.name.localeCompare(value.trim(), 'es', { sensitivity: 'base' }) === 0)
    setRows(current => current.map(row => row.id === id ? { ...row, employeeName: value, employeeIdentification: employee?.document ?? '' } : row))
  }
  const updateEmployeeIdentification = (id: string, value: string) => {
    const employee = sortedEmployees.find(item => item.document.localeCompare(value.trim(), 'es', { sensitivity: 'base' }) === 0)
    setRows(current => current.map(row => row.id === id ? { ...row, employeeIdentification: value, employeeName: employee?.name ?? '' } : row))
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const next: Record<string, string> = {}
    if (!period) next.period = 'Selecciona el período.'
    if (!payroll) next.payroll = 'Selecciona la nómina.'
    if (!rows.length) next.rows = 'Agrega al menos un empleado.'
    const usedEmployees = new Set<string>()
    const normalized = rows.flatMap((row, index) => {
      const employee = sortedEmployees.find(item => item.name.localeCompare(row.employeeName.trim(), 'es', { sensitivity: 'base' }) === 0 || item.document.localeCompare(row.employeeIdentification.trim(), 'es', { sensitivity: 'base' }) === 0)
      const hours = [row.hours25, row.hours50, row.hours100]
      if (!validDate(row.date)) next[`date-${row.id}`] = `Fila ${index + 1}: fecha inválida.`
      else if (period && `${row.date.slice(6)}-${row.date.slice(3, 5)}` !== period) next[`date-${row.id}`] = `Fila ${index + 1}: la fecha no pertenece al período.`
      if (!employee) next[`employee-${row.id}`] = `Fila ${index + 1}: selecciona un empleado.`
      else if (usedEmployees.has(employee.id)) next[`employee-${row.id}`] = `Fila ${index + 1}: el empleado está repetido.`
      else usedEmployees.add(employee.id)
      if (hours.some(value => !/^\d+(\.\d{1,2})?$/.test(value))) next[`hours-${row.id}`] = `Fila ${index + 1}: ingresa horas válidas.`
      else if (hours.every(value => Number(value) === 0)) next[`hours-${row.id}`] = `Fila ${index + 1}: registra al menos una hora.`
      if (!employee || !validDate(row.date) || hours.some(value => !/^\d+(\.\d{1,2})?$/.test(value)) || hours.every(value => Number(value) === 0)) return []
      const original = records.find(record => record.id === row.id)
      return [{ id: row.id, batchId, period, payroll: payroll || 'QUINCENA', date: row.date, employeeId: employee.id, hours25: row.hours25, hours50: row.hours50, hours100: row.hours100, baseSalary: employee.salary, bonusValue: overtimeBonus(row.hours25, row.hours50, row.hours100, employee.salary), sourceFile: original?.sourceFile, importedAt: original?.importedAt, uploadId: original?.uploadId, uploadDescription: original?.uploadDescription, uploadedBy: original?.uploadedBy } satisfies OvertimeRecord]
    })
    setErrors(next); if (Object.keys(next).length || !payroll) return
    onSave(batchId, normalized)
  }
  const showGrid = Boolean(period && payroll)
  const previewTotal = rows.reduce((total, row) => {
    const employee = sortedEmployees.find(item => item.name.localeCompare(row.employeeName.trim(), 'es', { sensitivity: 'base' }) === 0 || item.document.localeCompare(row.employeeIdentification.trim(), 'es', { sensitivity: 'base' }) === 0)
    return employee ? total + decimalToCents(overtimeBonus(row.hours25, row.hours50, row.hours100, employee.salary)) : total
  }, 0n)
  return <Dialog title={editing ? 'Editar período de horas extra' : 'Agregar horas extra'} description="Selecciona el período y la nómina; luego registra las horas por empleado." onClose={onClose} className="dialog-wide"><form onSubmit={submit} noValidate>{Object.keys(errors).length > 0 && <div className="form-error" role="alert"><strong>Revisa la información del período y del grid.</strong><span>{Object.values(errors)[0]}</span></div>}<div className="form-grid"><div className="field"><label htmlFor="overtime-period">Período <span>MM/AAAA</span></label><input id="overtime-period" type="month" value={period} onChange={event => { setPeriod(event.target.value); setErrors({}) }} aria-invalid={Boolean(errors.period)} />{errors.period && <small className="field-error">{errors.period}</small>}</div><div className="field"><label htmlFor="overtime-payroll">Nómina <span>Obligatorio</span></label><select id="overtime-payroll" value={payroll} onChange={event => { setPayroll(event.target.value as OvertimeRecord['payroll']); setErrors({}) }} aria-invalid={Boolean(errors.payroll)}><option value="">Selecciona una opción</option><option value="QUINCENA">Quincena</option><option value="FIN_MES">Fin de Mes</option></select>{errors.payroll && <small className="field-error">{errors.payroll}</small>}</div></div>{showGrid && <div className="overtime-editor"><div className="form-section-heading"><div><h3>Horas extra por empleado</h3><p>El bono se calcula con el sueldo vigente del empleado.</p></div><button type="button" className="button secondary compact" onClick={addRow}><Plus size={17} /> Agregar empleado</button></div><div className="overtime-grid-scroll"><table><thead><tr><th>Fecha</th><th>Empleado</th><th>Identificación</th><th className="numeric">Horas al 25%</th><th className="numeric">Horas al 50%</th><th className="numeric">Horas al 100%</th><th className="numeric">Total</th><th aria-label="Eliminar" /></tr></thead><tbody>{rows.map(row => { const employee = sortedEmployees.find(item => item.name.localeCompare(row.employeeName.trim(), 'es', { sensitivity: 'base' }) === 0 || item.document.localeCompare(row.employeeIdentification.trim(), 'es', { sensitivity: 'base' }) === 0); const bonus = employee ? overtimeBonus(row.hours25, row.hours50, row.hours100, employee.salary) : '0.00'; return <tr key={row.id}><td><input value={row.date} onChange={event => updateRow(row.id, 'date', formatDate(event.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors[`date-${row.id}`])} /></td><td><input list={`overtime-employees-${batchId}`} value={row.employeeName} onChange={event => updateEmployeeName(row.id, event.target.value)} placeholder="Nombre" autoComplete="off" aria-invalid={Boolean(errors[`employee-${row.id}`])} /></td><td><input list={`overtime-identifications-${batchId}`} value={row.employeeIdentification} onChange={event => updateEmployeeIdentification(row.id, event.target.value)} placeholder="Identificación" autoComplete="off" aria-invalid={Boolean(errors[`employee-${row.id}`])} /></td><td><input value={row.hours25} onChange={event => updateRow(row.id, 'hours25', decimalHours(event.target.value))} inputMode="decimal" aria-invalid={Boolean(errors[`hours-${row.id}`])} /></td><td><input value={row.hours50} onChange={event => updateRow(row.id, 'hours50', decimalHours(event.target.value))} inputMode="decimal" aria-invalid={Boolean(errors[`hours-${row.id}`])} /></td><td><input value={row.hours100} onChange={event => updateRow(row.id, 'hours100', decimalHours(event.target.value))} inputMode="decimal" aria-invalid={Boolean(errors[`hours-${row.id}`])} /></td><td className="numeric money overtime-row-total"><strong>{employee ? money(bonus) : '—'}</strong></td><td className="row-action-cell"><button type="button" className="icon-button small" onClick={() => setRows(current => current.filter(item => item.id !== row.id))} aria-label={`Eliminar ${row.employeeName || 'fila'}`}><X size={17} /></button></td></tr>})}{!rows.length && <tr><td colSpan={8}><div className="empty-state compact"><Users /><strong>Agrega empleados al grid</strong><p>Registra la fecha y las horas correspondientes.</p></div></td></tr>}</tbody>{rows.length > 0 && <tfoot><tr><td colSpan={6} className="numeric overtime-grand-total-label"><strong>Total</strong></td><td className="numeric money overtime-grand-total"><strong>{money(previewTotal)}</strong></td><td aria-hidden="true" /></tr></tfoot>}</table></div><datalist id={`overtime-employees-${batchId}`}>{sortedEmployees.map(employee => <option value={employee.name} key={employee.id}>{employee.document}</option>)}</datalist><datalist id={`overtime-identifications-${batchId}`}>{sortedEmployees.map(employee => <option value={employee.document} key={employee.id}>{employee.name}</option>)}</datalist></div>}<div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary" disabled={!showGrid}>Guardar horas extra</button></div></form></Dialog>
}

function AbsencesPage({ employees, catalogs, absences, setAbsences }: { employees: Employee[]; catalogs: Catalogs; absences: EmployeeAbsence[]; setAbsences: Dispatch<SetStateAction<EmployeeAbsence[]>> }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<EmployeeAbsence | null>(null)
  const [query, setQuery] = useState('')
  const employeeMap = Object.fromEntries(employees.map(employee => [employee.id, employee]))
  const currentDateParts = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', timeZone: 'America/Guayaquil' }).formatToParts(new Date())
  const currentMonth = `${currentDateParts.find(part => part.type === 'year')?.value}-${currentDateParts.find(part => part.type === 'month')?.value}`
  const [year, month] = currentMonth.split('-').map(Number)
  const nextMonthDate = new Date(Date.UTC(year, month, 1))
  const nextMonth = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}-01`
  const monthStart = `${currentMonth}-01`
  const visible = absences.filter(item => item.startDate < nextMonth && item.endDate >= monthStart && `${employeeMap[item.employeeId]?.name ?? ''} ${item.absenceTypeName}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  const absenceSort = useSortableRows(visible, { employee: row => employeeMap[row.employeeId]?.name ?? '', motive: row => row.absenceTypeName, startDate: row => row.startDate, endDate: row => row.endDate })
  const displayDate = (value: string) => { const [dateYear, dateMonth, dateDay] = value.split('-'); return `${dateDay}/${dateMonth}/${dateYear}` }
  const monthLabel = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric', timeZone: 'America/Guayaquil' }).format(new Date(`${monthStart}T12:00:00Z`))
  const saveAbsence = (absence: EmployeeAbsence) => {
    setAbsences(current => current.some(item => item.id === absence.id) ? current.map(item => item.id === absence.id ? absence : item) : [absence, ...current])
    setAdding(false); setEditing(null)
  }
  return <>
    <PageHeader eyebrow="Administrar Nómina / Ausencias" title="Ausencias" description={`Ausencias de todos los empleados correspondientes a ${monthLabel}.`} action={<button className="button primary" onClick={() => setAdding(true)}><Plus size={18} /> Agregar</button>} />
    <section className="panel table-panel"><div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar ausencias</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar empleado o motivo de ausencia" /></label><button className="button secondary"><Settings size={17} /> Filtros</button></div><div className="table-scroll" role="region" aria-label={`Ausencias de ${monthLabel}`} tabIndex={0}><table className="absences-table"><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Empleado" sortKey="employee" sort={absenceSort.sort} onSort={absenceSort.toggleSort} /><SortableTh label="Motivo de Ausencia" sortKey="motive" sort={absenceSort.sort} onSort={absenceSort.toggleSort} /><SortableTh label="Fecha Inicio" sortKey="startDate" sort={absenceSort.sort} onSort={absenceSort.toggleSort} /><SortableTh label="Fecha Fin" sortKey="endDate" sort={absenceSort.sort} onSort={absenceSort.toggleSort} /></tr></thead><tbody>{absenceSort.sortedRows.map(item => <tr key={item.id}><td className="row-action-cell"><button className="icon-button small edit-icon" onClick={() => setEditing(item)} aria-label={`Modificar ausencia de ${employeeMap[item.employeeId]?.name ?? item.id}`} title="Modificar ausencia"><Pencil size={17} /></button></td><td><strong>{employeeMap[item.employeeId]?.name ?? 'Empleado no disponible'}</strong><span className="cell-meta">{item.status === 'ACTIVO' ? 'Activo' : 'En espera'}</span></td><td>{item.absenceTypeName}</td><td>{displayDate(item.startDate)}</td><td>{displayDate(item.endDate)}</td></tr>)}{!absenceSort.sortedRows.length && <tr><td colSpan={5}><div className="empty-state"><CalendarDays /><strong>Sin ausencias</strong><p>No existen registros para el mes actual que coincidan con la búsqueda.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>1–{absenceSort.sortedRows.length} de {absenceSort.sortedRows.length}</span><span>Mes actual</span></div></section>
    {(adding || editing) && <AbsenceDialog absence={editing ?? undefined} employees={employees} absenceTypes={catalogs['tipos-ausencia']} onClose={() => { setAdding(false); setEditing(null) }} onSave={saveAbsence} />}
  </>
}

function AbsenceDialog({ absence, employees, absenceTypes, onClose, onSave }: { absence?: EmployeeAbsence; employees: Employee[]; absenceTypes: CatalogRecord[]; onClose: () => void; onSave: (absence: EmployeeAbsence) => void }) {
  const sortedEmployees = useMemo(() => [...employees].sort((a, b) => a.name.localeCompare(b.name, 'es')), [employees])
  const types = absenceTypes.filter(item => item.status === 'ACTIVO').sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const initialEmployee = employees.find(item => item.id === absence?.employeeId)
  const initialType = types.find(item => item.id === absence?.absenceTypeId)
  const [employeeName, setEmployeeName] = useState(initialEmployee?.name ?? '')
  const [employeeIdentification, setEmployeeIdentification] = useState(initialEmployee?.document ?? '')
  const [employeeId, setEmployeeId] = useState(absence?.employeeId ?? '')
  const [typeName, setTypeName] = useState(initialType?.name ?? absence?.absenceTypeName ?? '')
  const [typeId, setTypeId] = useState(absence?.absenceTypeId ?? '')
  const [status, setStatus] = useState<EmployeeAbsence['status']>(absence?.status ?? 'ACTIVO')
  const [startDate, setStartDate] = useState(absence?.startDate ?? '')
  const [endDate, setEndDate] = useState(absence?.endDate ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const nextErrors: Record<string, string> = {}
    if (!employeeId) nextErrors.employee = 'Selecciona un empleado de la lista.'
    if (!typeId) nextErrors.type = 'Selecciona un motivo de ausencia del catálogo.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) nextErrors.startDate = 'Selecciona la fecha de inicio.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) nextErrors.endDate = 'Selecciona la fecha de finalización.'
    if (startDate && endDate && endDate < startDate) nextErrors.endDate = 'La fecha fin no puede ser anterior a la fecha inicio.'
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return
    onSave({ id: absence?.id ?? `ABS-${String(Date.now()).slice(-6)}`, employeeId, absenceTypeId: typeId, absenceTypeName: types.find(item => item.id === typeId)?.name ?? typeName, status, startDate, endDate })
  }
  return <Dialog title={absence ? 'Modificar ausencia' : 'Agregar ausencia'} description="Registra el motivo y la vigencia de la ausencia del empleado." onClose={onClose}><form onSubmit={submit} noValidate>{Object.values(errors).some(Boolean) && <div className="form-error" role="alert"><strong>Revisa los campos indicados.</strong><span>No se guardó la ausencia.</span></div>}<div className="form-grid">
    <div className="employee-lookup-grid full-width-field"><div className="field"><label htmlFor="absence-employee">Empleado <span>Obligatorio</span></label><input id="absence-employee" list="absence-employee-options" value={employeeName} onChange={event => { const value = event.target.value; const employee = employees.find(item => item.name.localeCompare(value.trim(), 'es', { sensitivity: 'base' }) === 0); setEmployeeName(value); setEmployeeIdentification(employee?.document ?? ''); setEmployeeId(employee?.id ?? '') }} placeholder="Escribe el nombre" autoComplete="off" aria-invalid={Boolean(errors.employee)} /><datalist id="absence-employee-options">{sortedEmployees.map(item => <option value={item.name} key={item.id}>{item.document}</option>)}</datalist></div><div className="field"><label htmlFor="absence-employee-identification">Identificación <span>Obligatorio</span></label><input id="absence-employee-identification" list="absence-identification-options" value={employeeIdentification} onChange={event => { const value = event.target.value; const employee = employees.find(item => item.document.localeCompare(value.trim(), 'es', { sensitivity: 'base' }) === 0); setEmployeeIdentification(value); setEmployeeName(employee?.name ?? ''); setEmployeeId(employee?.id ?? '') }} placeholder="Escribe la identificación" autoComplete="off" aria-invalid={Boolean(errors.employee)} /><datalist id="absence-identification-options">{sortedEmployees.map(item => <option value={item.document} key={item.id}>{item.name}</option>)}</datalist></div>{errors.employee && <small className="field-error employee-lookup-error">{errors.employee}</small>}</div>
    <div className="field full-width-field"><label htmlFor="absence-type">Motivo de Ausencia <span>Obligatorio</span></label><input id="absence-type" list="absence-type-options" value={typeName} onChange={event => { const value = event.target.value; setTypeName(value); setTypeId(types.find(item => item.name.localeCompare(value.trim(), 'es', { sensitivity: 'base' }) === 0)?.id ?? '') }} placeholder="Escribe para buscar" autoComplete="off" aria-invalid={Boolean(errors.type)} /><datalist id="absence-type-options">{types.map(item => <option value={item.name} key={item.id}>{item.description}</option>)}</datalist>{errors.type && <small className="field-error">{errors.type}</small>}</div>
    <div className="field"><label htmlFor="absence-status">Estado <span>Obligatorio</span></label><select id="absence-status" value={status} onChange={event => setStatus(event.target.value as EmployeeAbsence['status'])}><option value="ACTIVO">Activo</option><option value="EN_ESPERA">En Espera</option></select></div>
    <div className="field"><label htmlFor="absence-start-date">Fecha Inicio <span>Obligatorio</span></label><input id="absence-start-date" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} aria-invalid={Boolean(errors.startDate)} />{errors.startDate && <small className="field-error">{errors.startDate}</small>}</div>
    <div className="field"><label htmlFor="absence-end-date">Fecha Fin <span>Obligatorio</span></label><input id="absence-end-date" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} aria-invalid={Boolean(errors.endDate)} />{errors.endDate && <small className="field-error">{errors.endDate}</small>}</div>
  </div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">{absence ? 'Guardar cambios' : 'Agregar ausencia'}</button></div></form></Dialog>
}

function NoveltiesPage({ employees, catalogs, novelties, setNovelties, payrollPeriodOverrides }: { employees: Employee[]; catalogs: Catalogs; novelties: PayrollNovelty[]; setNovelties: Dispatch<SetStateAction<PayrollNovelty[]>>; payrollPeriodOverrides: Record<string, PayrollPeriodStatus> }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<PayrollNovelty | null>(null)
  const [query, setQuery] = useState('')
  const employeeMap = Object.fromEntries(employees.map(employee => [employee.id, employee]))
  const visible = novelties.filter(item => item.status !== 'FINALIZADA' && `${employeeMap[item.employeeId]?.name ?? ''} ${item.rubricName} ${item.description} ${item.thirdParty} ${item.observations}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  const noveltySort = useSortableRows(visible, { employee: row => employeeMap[row.employeeId]?.name ?? '', period: row => row.startPeriod, rubric: row => row.rubricName, applicationPeriod: row => row.applicationPeriod, thirdParty: row => row.thirdParty, installmentValue: row => decimalToCents(row.installmentValue), pendingValue: row => decimalToCents(row.totalValue) - decimalToCents(row.paidValue) - decimalToCents(row.installmentValue), observations: row => row.observations })
  const applicationLabel = (value: PayrollNovelty['applicationPeriod']) => value === 'QUINCENA' ? 'Quincena' : value === 'FIN_MES' ? 'Fin de Mes' : 'Ambos'
  const effectiveApplicationLabel = (item: PayrollNovelty) => {
    if (isSpecialPayrollPeriodKey(item.startPeriod)) return payrollPeriodLabel(item.startPeriod)
    if (item.status !== 'EN_ESPERA') return applicationLabel(item.applicationPeriod)
    if (item.applicationPeriod === 'AMBOS') return 'Fin de Mes · próxima aplicación'
    return `${applicationLabel(item.applicationPeriod)} · siguiente período`
  }
  const saveNovelty = (novelty: PayrollNovelty) => {
    setNovelties(current => current.some(item => item.id === novelty.id) ? current.map(item => item.id === novelty.id ? novelty : item) : [novelty, ...current])
    setAdding(false); setEditing(null)
  }
  return <>
    <PageHeader eyebrow="Administrar Nómina / Novedades" title="Novedades" description="Administra novedades activas y en espera del período de nómina." action={<button className="button primary" onClick={() => setAdding(true)}><Plus size={18} /> Agregar</button>} />
    <section className="panel table-panel"><div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar novedades</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar empleado, rubro, tercero u observaciones" /></label><button className="button secondary"><Settings size={17} /> Filtros</button></div><div className="table-scroll" role="region" aria-label="Novedades activas y en espera" tabIndex={0}><table className="novelties-table"><thead><tr><th className="row-action-cell" aria-label="Editar" /><SortableTh label="Empleado" sortKey="employee" sort={noveltySort.sort} onSort={noveltySort.toggleSort} /><SortableTh label="Período" sortKey="period" sort={noveltySort.sort} onSort={noveltySort.toggleSort} /><SortableTh label="Rubro" sortKey="rubric" sort={noveltySort.sort} onSort={noveltySort.toggleSort} /><SortableTh label="Periodo de Aplicación" sortKey="applicationPeriod" sort={noveltySort.sort} onSort={noveltySort.toggleSort} /><SortableTh label="Tercero" sortKey="thirdParty" sort={noveltySort.sort} onSort={noveltySort.toggleSort} /><SortableTh label="Valor Cuota" sortKey="installmentValue" sort={noveltySort.sort} onSort={noveltySort.toggleSort} className="numeric" /><SortableTh label="Valor Pendiente" sortKey="pendingValue" sort={noveltySort.sort} onSort={noveltySort.toggleSort} className="numeric" /><SortableTh label="Observaciones" sortKey="observations" sort={noveltySort.sort} onSort={noveltySort.toggleSort} /></tr></thead><tbody>{noveltySort.sortedRows.map(item => { const pending = decimalToCents(item.totalValue) - decimalToCents(item.paidValue) - decimalToCents(item.installmentValue); return <tr key={item.id}><td className="row-action-cell"><button className="icon-button small edit-icon" onClick={() => setEditing(item)} aria-label={`Editar novedad de ${employeeMap[item.employeeId]?.name ?? item.id}`} title="Editar novedad"><Pencil size={17} /></button></td><td><strong>{employeeMap[item.employeeId]?.name ?? 'Empleado no disponible'}</strong><span className="cell-meta">{item.status === 'ACTIVA' ? 'Activa' : 'En espera'}</span></td><td>{item.startPeriod}</td><td>{item.rubricName}</td><td>{effectiveApplicationLabel(item)}</td><td>{item.thirdParty || 'Sin tercero'}</td><td className="numeric money">{money(item.installmentValue)}</td><td className="numeric money">{money(pending)}</td><td>{item.observations || 'Sin observaciones'}</td></tr>})}{!noveltySort.sortedRows.length && <tr><td colSpan={9}><div className="empty-state"><Search /><strong>Sin novedades visibles</strong><p>No existen registros activos o en espera que coincidan con la búsqueda.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>1–{noveltySort.sortedRows.length} de {noveltySort.sortedRows.length}</span><span>Finalizadas ocultas</span></div></section>
    {(adding || editing) && <NoveltyDialog novelty={editing ?? undefined} employees={employees} catalogs={catalogs} openPeriods={openPayrollPeriodOptions(payrollPeriodOverrides)} onClose={() => { setAdding(false); setEditing(null) }} onSave={saveNovelty} />}
  </>
}

function NoveltyDialog({ novelty, employees, catalogs, openPeriods, onClose, onSave }: { novelty?: PayrollNovelty; employees: Employee[]; catalogs: Catalogs; openPeriods: { key: string; label: string }[]; onClose: () => void; onSave: (novelty: PayrollNovelty) => void }) {
  const sortedEmployees = useMemo(() => [...employees].sort((a, b) => a.name.localeCompare(b.name, 'es')), [employees])
  const rubrics = catalogs.rubros.filter(item => item.status === 'ACTIVO').sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const initialEmployee = employees.find(item => item.id === novelty?.employeeId)
  const initialRubric = rubrics.find(item => item.id === novelty?.rubricId)
  const [employeeName, setEmployeeName] = useState(initialEmployee?.name ?? '')
  const [employeeIdentification, setEmployeeIdentification] = useState(initialEmployee?.document ?? '')
  const [employeeId, setEmployeeId] = useState(novelty?.employeeId ?? '')
  const [rubricName, setRubricName] = useState(initialRubric?.name ?? novelty?.rubricName ?? '')
  const [rubricId, setRubricId] = useState(novelty?.rubricId ?? '')
  const [status, setStatus] = useState<'ACTIVA' | 'EN_ESPERA'>(novelty?.status === 'EN_ESPERA' ? 'EN_ESPERA' : 'ACTIVA')
  const [applicationForm, setApplicationForm] = useState<'CUOTAS' | 'TOTAL'>(novelty?.applicationForm === 'CUOTAS' ? 'CUOTAS' : 'TOTAL')
  const [installments, setInstallments] = useState(novelty?.applicationForm === 'CUOTAS' ? String(novelty.installments) : '')
  const [startPeriod, setStartPeriod] = useState(openPeriods.some(period => period.key === novelty?.startPeriod) ? novelty?.startPeriod ?? '' : openPeriods[0]?.key ?? '')
  const [applicationPeriod, setApplicationPeriod] = useState<PayrollNovelty['applicationPeriod']>(novelty?.applicationPeriod ?? 'FIN_MES')
  const [installmentValue, setInstallmentValue] = useState(novelty?.installmentValue ?? '')
  const [thirdParty, setThirdParty] = useState(novelty?.thirdParty ?? '')
  const [observations, setObservations] = useState(novelty?.observations ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const specialStartPeriod = isSpecialPayrollPeriodKey(startPeriod)
  const effectiveApplicationForm: 'CUOTAS' | 'TOTAL' = specialStartPeriod ? 'TOTAL' : applicationForm
  const installmentCount = effectiveApplicationForm === 'CUOTAS' && /^\d+$/.test(installments) ? Number(installments) : 1
  const totalCents = decimalToCents(installmentValue) * BigInt(Math.max(1, installmentCount))
  const totalValue = centsToDecimal(totalCents)
  const decimalDraft = (value: string) => { const normalized = value.replace(',', '.').replace(/[^\d.]/g, ''); const [whole = '', ...rest] = normalized.split('.'); return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole }
  const periodForOffset = (monthOffset: number) => { if (!/^\d{4}-\d{2}$/.test(startPeriod)) return monthOffset === 0 ? payrollPeriodLabel(startPeriod) : 'No aplica'; const [year, month] = startPeriod.split('-').map(Number); const date = new Date(Date.UTC(year, month - 1 + monthOffset, 1)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}` }
  const schedule = effectiveApplicationForm === 'CUOTAS' && installmentCount > 0 && installmentCount <= 120 ? Array.from({ length: installmentCount }, (_, index) => {
    const waitingOffset = status === 'EN_ESPERA' ? 1 : 0
    const liquidationIndex = index + waitingOffset
    const monthOffset = applicationPeriod === 'AMBOS' ? Math.floor(liquidationIndex / 2) : liquidationIndex
    const rowApplication = applicationPeriod === 'AMBOS' ? (liquidationIndex % 2 === 0 ? 'Quincena' : 'Fin de Mes') : applicationPeriod === 'QUINCENA' ? 'Quincena' : 'Fin de Mes'
    const paid = decimalToCents(novelty?.paidValue ?? '0.00') >= decimalToCents(installmentValue) * BigInt(index + 1)
    return { number: index + 1, period: periodForOffset(monthOffset), application: rowApplication, balance: totalCents - decimalToCents(installmentValue) * BigInt(index + 1), paid }
  }) : []
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const nextErrors: Record<string, string> = {}
    if (!employeeId) nextErrors.employee = 'Selecciona un empleado de la lista.'
    if (!rubricId) nextErrors.rubric = 'Selecciona un rubro del catálogo.'
    if (effectiveApplicationForm === 'CUOTAS' && (!/^\d+$/.test(installments) || Number(installments) < 1 || Number(installments) > 120)) nextErrors.installments = 'Ingresa entre 1 y 120 cuotas.'
    if (!openPeriods.some(period => period.key === startPeriod)) nextErrors.startPeriod = 'Selecciona uno de los períodos abiertos.'
    if (!/^\d+(\.\d{1,2})?$/.test(installmentValue) || decimalToCents(installmentValue) <= 0n) nextErrors.installmentValue = 'Ingresa un valor mayor a cero con máximo dos decimales.'
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return
    const selectedRubric = rubrics.find(item => item.id === rubricId)
    const applicationFormLabel = effectiveApplicationForm === 'CUOTAS' ? `${installments} cuotas` : 'Total'
    onSave({ id: novelty?.id ?? `NOM-${String(Date.now()).slice(-6)}`, employeeId, rubricId, rubricName: selectedRubric?.name ?? rubricName, status, applicationForm: effectiveApplicationForm, installments: effectiveApplicationForm === 'CUOTAS' ? Number(installments) : 1, startPeriod, applicationPeriod: specialStartPeriod ? 'FIN_MES' : applicationPeriod, installmentValue: centsToDecimal(decimalToCents(installmentValue)), totalValue, paidValue: novelty?.paidValue ?? '0.00', description: `${selectedRubric?.name ?? rubricName} · ${applicationFormLabel}`, thirdParty: thirdParty.trim(), observations: observations.trim() })
  }
  return <Dialog className="dialog-wide" title={novelty ? 'Editar novedad' : 'Agregar novedad'} description="Configura la aplicación y los valores de la novedad de nómina." onClose={onClose}><form onSubmit={submit} noValidate>{Object.values(errors).some(Boolean) && <div className="form-error" role="alert"><strong>Revisa los campos indicados.</strong><span>No se guardó la novedad.</span></div>}<div className="form-grid">
    <div className="employee-lookup-grid full-width-field"><div className="field"><label htmlFor="novelty-employee">Empleado <span>Obligatorio</span></label><input id="novelty-employee" list="novelty-employee-options" value={employeeName} onChange={event => { const value = event.target.value; const employee = employees.find(item => item.name.localeCompare(value.trim(), 'es', { sensitivity: 'base' }) === 0); setEmployeeName(value); setEmployeeIdentification(employee?.document ?? ''); setEmployeeId(employee?.id ?? '') }} placeholder="Escribe el nombre" autoComplete="off" aria-invalid={Boolean(errors.employee)} /><datalist id="novelty-employee-options">{sortedEmployees.map(item => <option value={item.name} key={item.id}>{item.document}</option>)}</datalist></div><div className="field"><label htmlFor="novelty-employee-identification">Identificación <span>Obligatorio</span></label><input id="novelty-employee-identification" list="novelty-identification-options" value={employeeIdentification} onChange={event => { const value = event.target.value; const employee = employees.find(item => item.document.localeCompare(value.trim(), 'es', { sensitivity: 'base' }) === 0); setEmployeeIdentification(value); setEmployeeName(employee?.name ?? ''); setEmployeeId(employee?.id ?? '') }} placeholder="Escribe la identificación" autoComplete="off" aria-invalid={Boolean(errors.employee)} /><datalist id="novelty-identification-options">{sortedEmployees.map(item => <option value={item.document} key={item.id}>{item.name}</option>)}</datalist></div>{errors.employee && <small className="field-error employee-lookup-error">{errors.employee}</small>}</div>
    <div className="field full-width-field"><label htmlFor="novelty-rubric">Rubro <span>Obligatorio</span></label><input id="novelty-rubric" list="novelty-rubric-options" value={rubricName} onChange={event => { const value = event.target.value; setRubricName(value); setRubricId(rubrics.find(item => item.name.localeCompare(value.trim(), 'es', { sensitivity: 'base' }) === 0)?.id ?? '') }} placeholder="Escribe para buscar" autoComplete="off" aria-invalid={Boolean(errors.rubric)} /><datalist id="novelty-rubric-options">{rubrics.map(item => <option value={item.name} key={item.id}>{item.code}</option>)}</datalist>{errors.rubric && <small className="field-error">{errors.rubric}</small>}</div>
    <div className="field"><label htmlFor="novelty-status">Estado <span>Obligatorio</span></label><select id="novelty-status" value={status} onChange={event => setStatus(event.target.value as 'ACTIVA' | 'EN_ESPERA')}><option value="ACTIVA">Activo</option><option value="EN_ESPERA">En Espera</option></select></div>
    <div className="field"><label htmlFor="novelty-application-form">Forma Aplicación <span>Obligatorio</span></label><select id="novelty-application-form" value={effectiveApplicationForm} disabled={specialStartPeriod} onChange={event => setApplicationForm(event.target.value as 'CUOTAS' | 'TOTAL')}><option value="CUOTAS">Cuotas</option><option value="TOTAL">Total</option></select>{specialStartPeriod && <small className="field-help">Los períodos especiales se descuentan en un solo pago.</small>}</div>
    <div className="field"><label htmlFor="novelty-start-period">Periodo inicio <span>Obligatorio</span></label><select id="novelty-start-period" value={startPeriod} disabled={!openPeriods.length} onChange={event => { const value = event.target.value; setStartPeriod(value); if (isSpecialPayrollPeriodKey(value)) { setApplicationForm('TOTAL'); setInstallments(''); setApplicationPeriod('FIN_MES'); setErrors(current => { const { installments: _removed, ...rest } = current; return rest }) } }} aria-invalid={Boolean(errors.startPeriod)}><option value="">Selecciona un período abierto</option>{openPeriods.map(period => <option key={period.key} value={period.key}>{period.label}</option>)}</select>{!openPeriods.length && <small className="field-error">No existen períodos abiertos en Períodos Habilitados.</small>}{errors.startPeriod && <small className="field-error">{errors.startPeriod}</small>}</div>
    {effectiveApplicationForm === 'CUOTAS' && <div className="field"><label htmlFor="novelty-installments"># de Cuotas <span>Obligatorio</span></label><input id="novelty-installments" value={installments} onChange={event => setInstallments(event.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" aria-invalid={Boolean(errors.installments)} />{errors.installments && <small className="field-error">{errors.installments}</small>}</div>}
    {!specialStartPeriod && <div className="field full-width-field"><label>Periodo de Aplicación <span>Obligatorio</span></label><div className="radio-group"><label><input type="radio" name="application-period" checked={applicationPeriod === 'QUINCENA'} onChange={() => setApplicationPeriod('QUINCENA')} /> Quincena</label><label><input type="radio" name="application-period" checked={applicationPeriod === 'FIN_MES'} onChange={() => setApplicationPeriod('FIN_MES')} /> Fin de Mes</label><label><input type="radio" name="application-period" checked={applicationPeriod === 'AMBOS'} onChange={() => setApplicationPeriod('AMBOS')} /> Ambos</label></div></div>}
    {status === 'EN_ESPERA' && <div className="notice warning full-width-field novelty-waiting-notice"><AlertTriangle size={19} /><div><strong>{specialStartPeriod ? 'Aplicación total en período especial' : 'La próxima liquidación será omitida'}</strong><p>{specialStartPeriod ? `El valor completo se descontará cuando se procese ${payrollPeriodLabel(startPeriod)}.` : applicationPeriod === 'AMBOS' ? 'La primera cuota se moverá al siguiente corte disponible y continuará alternando entre Quincena y Fin de Mes.' : `La primera aplicación se moverá a la ${applicationPeriod === 'QUINCENA' ? 'Quincena' : 'liquidación de Fin de Mes'} del siguiente período.`}</p></div></div>}
    <div className="field"><label htmlFor="novelty-installment-value">{effectiveApplicationForm === 'CUOTAS' ? 'Valor Cuota' : 'Valor'} <span>Obligatorio</span></label><input id="novelty-installment-value" value={installmentValue} onChange={event => setInstallmentValue(decimalDraft(event.target.value))} inputMode="decimal" aria-invalid={Boolean(errors.installmentValue)} />{errors.installmentValue && <small className="field-error">{errors.installmentValue}</small>}</div>
    <div className="field"><label htmlFor="novelty-total-value">Valor Total</label><input id="novelty-total-value" className="readonly-result" value={totalValue} readOnly /><small className="field-help">Calculado automáticamente.</small></div>
    <div className="field full-width-field"><label htmlFor="novelty-third-party">Nombre de Tercero</label><input id="novelty-third-party" value={thirdParty} onChange={event => setThirdParty(event.target.value.slice(0, 20))} maxLength={20} /><small className="field-help">Máximo 20 caracteres · {thirdParty.length}/20.</small></div>
    <div className="field full-width-field"><label htmlFor="novelty-observations">Observaciones</label><textarea id="novelty-observations" value={observations} onChange={event => setObservations(event.target.value)} rows={3} placeholder="Registra información adicional de la novedad" /></div>
  </div>
  {effectiveApplicationForm === 'CUOTAS' && <div className="installment-preview"><div className="form-section-heading"><h3>Detalle de cuotas</h3></div><div className="table-scroll"><table><thead><tr><th>Cuota</th><th>Periodo</th><th>Periodo Aplicación</th><th className="numeric">Valor Cuota</th><th className="numeric">Saldo</th><th>Estado</th></tr></thead><tbody>{schedule.map(row => <tr key={row.number}><td>{row.number}</td><td>{row.period}</td><td>{row.application}</td><td className="numeric money">{money(installmentValue)}</td><td className="numeric money">{money(row.balance)}</td><td><Badge tone={row.paid ? 'success' : 'warning'}>{row.paid ? 'Pagado' : 'Pendiente'}</Badge></td></tr>)}{!schedule.length && <tr><td colSpan={6}><div className="empty-state compact"><CalendarDays /><strong>Configura las cuotas</strong><p>Ingresa el período, número y valor de las cuotas.</p></div></td></tr>}</tbody></table></div></div>}
  <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">{novelty ? 'Guardar cambios' : 'Agregar novedad'}</button></div></form></Dialog>
}

function EventsPage({ events, employees, onAdd, onApprove }: { events: PayrollEvent[]; employees: Employee[]; onAdd: () => void; onApprove: (id: string) => void }) {
  const employeeMap = Object.fromEntries(employees.map(employee => [employee.id, employee]))
  const eventSort = useSortableRows(events, { concept: row => row.concept, employee: row => employeeMap[row.employeeId]?.name ?? '', kind: row => row.kind, date: row => row.date, amount: row => decimalToCents(row.amount), status: row => row.status, action: row => row.status === 'BORRADOR' ? 'Aprobar' : 'Sin acciones' })
  return <>
    <PageHeader eyebrow="Administrar Nómina / Novedades" title="Novedades" description="Registra ingresos y descuentos del período antes de calcular." action={<button className="button primary" onClick={onAdd}><Plus size={18} /> Registrar novedad</button>} />
    <div className="notice info"><AlertTriangle size={20} /><div><strong>Período abierto para captura</strong><p>Solo las novedades aprobadas se incluirán en la simulación mensual.</p></div></div>
    <section className="panel table-panel">
      <div className="filter-bar"><div className="filter-summary"><strong>Octubre 2026</strong><span>{events.length} novedades · {events.filter(e => e.status === 'BORRADOR').length} en borrador</span></div><button className="button secondary"><Settings size={17} /> Filtros</button></div>
      <div className="table-scroll" role="region" aria-label="Novedades del período" tabIndex={0}><table><thead><tr><SortableTh label="Novedad" sortKey="concept" sort={eventSort.sort} onSort={eventSort.toggleSort} /><SortableTh label="Empleado" sortKey="employee" sort={eventSort.sort} onSort={eventSort.toggleSort} /><SortableTh label="Tipo" sortKey="kind" sort={eventSort.sort} onSort={eventSort.toggleSort} /><SortableTh label="Fecha" sortKey="date" sort={eventSort.sort} onSort={eventSort.toggleSort} /><SortableTh label="Importe" sortKey="amount" sort={eventSort.sort} onSort={eventSort.toggleSort} className="numeric" /><SortableTh label="Estado" sortKey="status" sort={eventSort.sort} onSort={eventSort.toggleSort} /><SortableTh label="Acción" sortKey="action" sort={eventSort.sort} onSort={eventSort.toggleSort} /></tr></thead><tbody>
        {eventSort.sortedRows.map(event => <tr key={event.id}><td><strong>{event.concept}</strong><span className="cell-meta">{event.id}</span></td><td>{employeeMap[event.employeeId]?.name ?? 'Empleado no disponible'}<span className="cell-meta">{event.employeeId}</span></td><td><Badge tone={event.kind === 'INGRESO' ? 'info' : 'neutral'}>{event.kind === 'INGRESO' ? 'Ingreso' : 'Descuento'}</Badge></td><td>{event.date}</td><td className="numeric money">{money(event.amount)}</td><td><Badge tone={event.status === 'APROBADA' ? 'success' : 'warning'}>{event.status === 'APROBADA' ? 'Aprobada' : 'Borrador'}</Badge></td><td>{event.status === 'BORRADOR' ? <button className="text-button" onClick={() => onApprove(event.id)}>Aprobar</button> : <span className="cell-meta">Sin acciones</span>}</td></tr>)}
      </tbody></table></div>
      <div className="table-footer"><span>1–{events.length} de {events.length}</span><span>Importes sintéticos · no homologados</span></div>
    </section>
  </>
}

function orderedPayrollRubrics(records: CatalogRecord[], order: string[]) {
  const recordMap = new Map(records.map(record => [record.id, record]))
  return [...order.filter(id => recordMap.has(id)).map(id => recordMap.get(id)!), ...records.filter(record => !order.includes(record.id))]
}

function employeeCargoBenefitEnabled(employee: Employee, contractHistory: Record<string, ContractHistoryLine[]>, cargos: CatalogRecord[], benefit: CargoBenefitKey) {
  const role = contractHistory[employee.id]?.at(-1)?.role ?? employee.role
  const normalizedRole = role.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es')
  const cargo = cargos.find(record => record.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es') === normalizedRole)
  return Boolean(cargo && (cargo[benefit] ?? true))
}

const payrollMonthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const specialPayrollPeriods = [
  { id: '13ERO', name: 'Décimo Tercero' },
  { id: '14TO', name: 'Décimo Cuarto' },
  { id: 'UTILIDADES', name: 'Utilidades' },
]

function isSpecialPayrollPeriodKey(key: string) {
  return /^\d{4}-(13ERO|14TO|UTILIDADES)$/.test(key)
}

function payrollPeriodLabel(key: string) {
  const monthlyMatch = key.match(/^(\d{4})-(\d{2})$/)
  if (monthlyMatch) return `${payrollMonthNames[Number(monthlyMatch[2]) - 1]} ${monthlyMatch[1]}`
  const specialMatch = key.match(/^(\d{4})-(13ERO|14TO|UTILIDADES)$/)
  const special = specialPayrollPeriods.find(item => item.id === specialMatch?.[2])
  return specialMatch && special ? `${special.name} ${specialMatch[1]}` : key
}

function openPayrollPeriodOptions(overrides: Record<string, PayrollPeriodStatus>) {
  const today = currentEcuadorYearMonth()
  const currentKey = `${today.year}-${String(today.month).padStart(2, '0')}`
  const keys = new Set(Object.entries(overrides).filter(([, status]) => status === 'ABIERTO').map(([key]) => key))
  if ((overrides[currentKey] ?? 'ABIERTO') === 'ABIERTO') keys.add(currentKey)
  return [...keys].sort().map(key => ({ key, label: payrollPeriodLabel(key) }))
}

function PayrollPeriodsPage({ overrides, setOverrides, showToast }: { overrides: Record<string, PayrollPeriodStatus>; setOverrides: Dispatch<SetStateAction<Record<string, PayrollPeriodStatus>>>; showToast: (message: string) => void }) {
  const today = currentEcuadorYearMonth()
  const [yearDraft, setYearDraft] = useState(String(today.year))
  const selectedYear = /^\d{4}$/.test(yearDraft) ? Number(yearDraft) : undefined
  const statusFor = (year: number, month: number): PayrollPeriodStatus => {
    const key = `${year}-${String(month).padStart(2, '0')}`
    if (overrides[key]) return overrides[key]
    if (year > today.year || (year === today.year && month > today.month)) return 'PENDIENTE'
    if (year === today.year && month === today.month) return 'ABIERTO'
    return 'CERRADO'
  }
  const updateStatus = (key: string, label: string, enabled: boolean) => {
    setOverrides(current => ({ ...current, [key]: enabled ? 'ABIERTO' : 'CERRADO' }))
    showToast(`${label} cambió a ${enabled ? 'abierto' : 'cerrado'}.`)
  }
  const rows = selectedYear ? [...payrollMonthNames.map((name, index) => {
    const month = index + 1
    const future = selectedYear > today.year || (selectedYear === today.year && month > today.month)
    return { key: `${selectedYear}-${String(month).padStart(2, '0')}`, month, name, period: `${String(month).padStart(2, '0')}/${selectedYear}`, future, status: statusFor(selectedYear, month) }
  }), ...specialPayrollPeriods.map(period => {
    const key = `${selectedYear}-${period.id}`
    const future = selectedYear > today.year
    return { key, month: 0, name: period.name, period: String(selectedYear), future, status: overrides[key] ?? (future ? 'PENDIENTE' : 'CERRADO') as PayrollPeriodStatus }
  })] : []
  return <>
    <PageHeader eyebrow="Liquidación de Valores / Períodos Habilitados" title="Períodos Habilitados" description="Consulta y administra la disponibilidad mensual de los procesos de nómina." />
    <section className="panel"><div className="form-grid"><div className="field"><label htmlFor="payroll-period-year">Año <span>Obligatorio</span></label><input id="payroll-period-year" value={yearDraft} onChange={event => setYearDraft(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="AAAA" inputMode="numeric" maxLength={4} aria-invalid={!selectedYear} />{!selectedYear && <small className="field-error">Ingresa un año con formato AAAA.</small>}</div></div></section>
    {selectedYear && <section className="panel table-panel"><div className="panel-heading table-title"><div><h2>Períodos de {selectedYear}</h2><p>Los períodos futuros permanecen pendientes y no pueden procesarse.</p></div><Badge tone={rows.some(row => row.status === 'ABIERTO') ? 'success' : 'warning'}>{rows.some(row => row.status === 'ABIERTO') ? 'Períodos disponibles' : 'Sin período abierto'}</Badge></div><div className="table-scroll" role="region" aria-label={`Períodos habilitados de ${selectedYear}`} tabIndex={0}><table><thead><tr><th>Período</th><th>Referencia</th><th>Habilitado</th></tr></thead><tbody>{rows.map(row => <tr key={row.key}><td><strong>{row.name}</strong>{row.month === today.month && selectedYear === today.year && <span className="cell-meta">Mes actual</span>}</td><td>{row.period}</td><td><button type="button" role="switch" aria-checked={row.status === 'ABIERTO'} disabled={row.future} className={`document-status-switch ${row.status === 'ABIERTO' ? 'active' : ''}`} onClick={() => updateStatus(row.key, `${row.name} ${selectedYear}`, row.status !== 'ABIERTO')} aria-label={`Habilitar ${row.name} ${selectedYear}`}><span aria-hidden="true" /><strong>{row.future ? 'Pendiente' : row.status === 'ABIERTO' ? 'Abierto' : 'Cerrado'}</strong></button>{row.future && <span className="cell-meta">Se habilitará al iniciar el período.</span>}</td></tr>)}</tbody></table></div><div className="table-footer"><span>{rows.length} períodos</span><span>Los cambios se guardan automáticamente.</span></div></section>}
    <div className="notice info"><ShieldCheck size={20} /><div><strong>Control de procesamiento</strong><p>Las liquidaciones solo pueden ejecutarse cuando su período correspondiente se encuentra en estado Abierto. Para Utilidades se valida el período especial Utilidades del año seleccionado.</p></div></div>
  </>
}

function PayrollLayoutConfigurationPage({ catalogs, orders, setOrders, enabledIds, setEnabledIds, showToast }: { catalogs: Catalogs; orders: Record<PayrollLayoutKey, string[]>; setOrders: Dispatch<SetStateAction<Record<PayrollLayoutKey, string[]>>>; enabledIds: Record<PayrollLayoutKey, string[]>; setEnabledIds: Dispatch<SetStateAction<Record<PayrollLayoutKey, string[]>>>; showToast: (message: string) => void }) {
  const [activeLayout, setActiveLayout] = useState<PayrollLayoutKey>('QUINCENA')
  const ordered = orderedPayrollRubrics(catalogs.rubros, orders[activeLayout])
  const commissions = ordered.filter(record => record.rubricType === 'COMISION_BONO')
  const discounts = ordered.filter(record => record.rubricType === 'DESCUENTO')
  const moveRubric = (id: string, direction: -1 | 1) => {
    const group = commissions.some(record => record.id === id) ? commissions : discounts
    const index = group.findIndex(record => record.id === id)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= group.length) return
    const nextGroup = [...group]
    ;[nextGroup[index], nextGroup[nextIndex]] = [nextGroup[nextIndex], nextGroup[index]]
    const nextCommissions = commissions.some(record => record.id === id) ? nextGroup : commissions
    const nextDiscounts = discounts.some(record => record.id === id) ? nextGroup : discounts
    setOrders(current => ({ ...current, [activeLayout]: [...nextCommissions, ...nextDiscounts].map(record => record.id) }))
  }
  const toggleRubric = (id: string) => setEnabledIds(current => ({ ...current, [activeLayout]: current[activeLayout].includes(id) ? current[activeLayout].filter(item => item !== id) : [...current[activeLayout], id] }))
  const groupTable = (title: string, records: CatalogRecord[]) => <section className="panel table-panel payroll-layout-group"><div className="panel-heading table-title"><div><h2>{title}</h2><p>Habilita los rubros que aparecerán y define el orden de sus columnas en la liquidación.</p></div><Badge tone="neutral">{records.length} rubros</Badge></div><div className="table-scroll"><table><thead><tr><th className="numeric">Orden</th><th>Rubro</th><th>Aporta IESS</th><th>Estado</th><th>Incluir en planilla</th><th aria-label="Cambiar orden">Ordenar</th></tr></thead><tbody>{records.map((record, index) => { const enabled = enabledIds[activeLayout].includes(record.id); return <tr key={record.id}><td className="numeric"><strong>{index + 1}</strong></td><td><strong>{record.name}</strong></td><td><Badge tone={record.contributesIess ? 'success' : 'neutral'}>{record.contributesIess ? 'Sí' : 'No'}</Badge></td><td><Badge tone={record.status === 'ACTIVO' ? 'success' : 'neutral'}>{record.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</Badge></td><td><div className="rubric-components-cell"><button type="button" className={`switch ${enabled ? 'on' : ''}`} role="switch" aria-checked={enabled} aria-label={`${enabled ? 'Excluir' : 'Incluir'} ${record.name} en ${activeLayout === 'QUINCENA' ? 'Quincena' : 'Fin de Mes'}`} onClick={() => toggleRubric(record.id)}><span /></button><span className="cell-meta">{enabled ? 'Incluido' : 'No incluido'}</span></div></td><td><div className="rubric-components-cell"><button type="button" className="icon-button small" disabled={index === 0} onClick={() => moveRubric(record.id, -1)} aria-label={`Subir ${record.name}`} title="Subir"><ArrowUp size={16} /></button><button type="button" className="icon-button small" disabled={index === records.length - 1} onClick={() => moveRubric(record.id, 1)} aria-label={`Bajar ${record.name}`} title="Bajar"><ArrowDown size={16} /></button></div></td></tr>})}{!records.length && <tr><td colSpan={6}><div className="empty-state compact"><Search /><strong>Sin rubros</strong><p>No existen rubros configurados para este grupo.</p></div></td></tr>}</tbody></table></div></section>
  return <>
    <PageHeader eyebrow="Liquidación de Valores / Configuración Planilla de Rol" title="Configuración Planilla de Rol" description="Define el orden de las columnas configurables para cada tipo de liquidación." action={<button className="button primary" onClick={() => showToast(`Configuración de ${activeLayout === 'QUINCENA' ? 'Quincena' : 'Fin de Mes'} guardada correctamente.`)}><Check size={18} /> Guardar configuración</button>} />
    <div className="tabs" role="tablist" aria-label="Tipos de planilla de rol"><button className={activeLayout === 'QUINCENA' ? 'active' : ''} role="tab" aria-selected={activeLayout === 'QUINCENA'} onClick={() => setActiveLayout('QUINCENA')}>Planilla de Rol de Quincena</button><button className={activeLayout === 'FIN_MES' ? 'active' : ''} role="tab" aria-selected={activeLayout === 'FIN_MES'} onClick={() => setActiveLayout('FIN_MES')}>Planilla de Rol de Fin de Mes</button></div>
    <div className="notice info"><ShieldCheck size={20} /><div><strong>El catálogo de Rubros no será modificado</strong><p>Esta pantalla guarda únicamente el orden de presentación para cada planilla.</p></div></div>
    {groupTable('Comisiones/Bonos', commissions)}
    {groupTable('Descuentos', discounts)}
  </>
}

function FortnightLiquidationPage({ employees, events, catalogs, contractHistory, iessPercentages, rubricOrder, enabledRubricIds, openPeriods, lastLiquidation, setLastLiquidation, showToast }: { employees: Employee[]; events: PayrollEvent[]; catalogs: Catalogs; contractHistory: Record<string, ContractHistoryLine[]>; iessPercentages: IessPercentageRecord[]; rubricOrder: string[]; enabledRubricIds: string[]; openPeriods: string[]; lastLiquidation: FortnightLiquidationSnapshot | null; setLastLiquidation: Dispatch<SetStateAction<FortnightLiquidationSnapshot | null>>; showToast: (message: string) => void }) {
  const [groupId, setGroupId] = useState('TODOS')
  const [period, setPeriod] = useState(openPeriods[0] ?? '')
  const [displayedLiquidation, setDisplayedLiquidation] = useState<FortnightLiquidationSnapshot | null>(null)
  const groups = catalogs['grupos-nomina'].filter(record => record.status === 'ACTIVO')
  const rubrics = orderedPayrollRubrics(catalogs.rubros, rubricOrder).filter(record => enabledRubricIds.includes(record.id))
  const commissionRubrics = rubrics.filter(record => record.rubricType === 'COMISION_BONO')
  const discountRubrics = rubrics.filter(record => record.rubricType === 'DESCUENTO')
  const personalContributionPercentage = iessPercentages.find(record => record.status === 'ACTIVO' && record.name.localeCompare('Aporte personal', 'es', { sensitivity: 'base' }) === 0)?.percentage ?? '0'
  const periodName = (key: string) => key ? `${payrollMonthNames[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}` : ''
  const eligibleEmployees = employees.filter(employee => {
    const employeeGroupId = contractHistory[employee.id]?.at(-1)?.payrollGroupId ?? employee.payrollGroupId
    return groupId === 'TODOS' || employeeGroupId === groupId
  }).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const liquidate = () => {
    if (!groupId || !period) return
    const snapshot: FortnightLiquidationSnapshot = { groupId, period, employeeIds: eligibleEmployees.map(employee => employee.id), generatedAt: new Date().toISOString() }
    setLastLiquidation(snapshot)
    setDisplayedLiquidation(snapshot)
    showToast(`Liquidación de Quincena calculada para ${periodName(period)}.`)
  }
  const presentLast = () => {
    if (!lastLiquidation) return
    setGroupId(lastLiquidation.groupId)
    setPeriod(lastLiquidation.period)
    setDisplayedLiquidation(lastLiquidation)
    showToast(`Se presenta la última liquidación guardada de ${periodName(lastLiquidation.period)}.`)
  }
  const displayedEmployees = displayedLiquidation ? displayedLiquidation.employeeIds.map(id => employees.find(employee => employee.id === id)).filter((employee): employee is Employee => Boolean(employee)) : []
  const fortnightValue = (employee: Employee) => {
    const line = contractHistory[employee.id]?.at(-1)
    const advanceType = line?.advanceType ?? 'PERCENT'
    const advanceValue = decimalToCents(line?.advanceValue ?? '0.00')
    if (advanceType === 'AMOUNT') return advanceValue
    return (decimalToCents(line?.salary ?? employee.salary) * advanceValue + 5000n) / 10000n
  }
  const rubricValue = (employeeId: string, rubric: CatalogRecord, liquidationPeriod: string) => events.filter(event => event.employeeId === employeeId && event.status === 'APROBADA' && event.date.startsWith(liquidationPeriod) && event.concept.localeCompare(rubric.name, 'es', { sensitivity: 'base' }) === 0).reduce((sum, event) => sum + decimalToCents(event.amount), 0n)
  const rowValues = (employee: Employee, liquidationPeriod: string) => {
    const fortnight = fortnightValue(employee)
    const commissions = new Map(commissionRubrics.map(rubric => [rubric.id, rubricValue(employee.id, rubric, liquidationPeriod)]))
    const discounts = new Map(discountRubrics.map(rubric => [rubric.id, rubricValue(employee.id, rubric, liquidationPeriod)]))
    const commissionTotal = [...commissions.values()].reduce((sum, value) => sum + value, 0n)
    const discountTotal = [...discounts.values()].reduce((sum, value) => sum + value, 0n)
    const iessBase = fortnight + commissionRubrics.filter(rubric => rubric.contributesIess).reduce((sum, rubric) => sum + (commissions.get(rubric.id) ?? 0n), 0n)
    const personalContribution = (iessBase * decimalToCents(personalContributionPercentage) + 5000n) / 10000n
    const totalIncome = fortnight + commissionTotal
    const totalExpenses = personalContribution + discountTotal
    return { commissions, discounts, totalIncome, personalContribution, totalExpenses, totalReceivable: totalIncome - totalExpenses }
  }
  const retirementDateForPeriod = (employeeId: string, liquidationPeriod: string) => {
    const [periodYear, periodMonth] = liquidationPeriod.split('-')
    const matchingLine = [...(contractHistory[employeeId] ?? [])].reverse().find(line => {
      const [day, month, year] = line.endDate.split('/')
      return Boolean(day && month && year && year === periodYear && month.padStart(2, '0') === periodMonth)
    })
    return matchingLine?.endDate ?? '-'
  }
  return <>
    <PageHeader eyebrow="Liquidación de Valores / Liquidación Quincena" title="Liquidación Quincena" description="Calcula y presenta la planilla quincenal del período abierto." />
    <section className="panel"><div className="form-grid"><div className="field"><label htmlFor="fortnight-payroll-group">Grupo de Nómina <span>Obligatorio</span></label><select id="fortnight-payroll-group" value={groupId} onChange={event => { setGroupId(event.target.value); setDisplayedLiquidation(null) }}><option value="TODOS">Todos</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></div><div className="field"><label htmlFor="fortnight-period">Período <span>Obligatorio</span></label><select id="fortnight-period" value={period} onChange={event => { setPeriod(event.target.value); setDisplayedLiquidation(null) }}><option value="">Selecciona un período</option>{openPeriods.map(key => <option key={key} value={key}>{periodName(key)}</option>)}</select>{!openPeriods.length && <small className="field-error">No existen períodos abiertos.</small>}</div></div><div className="dialog-actions"><button className="button primary" disabled={!groupId || !period} onClick={liquidate}><Calculator size={18} /> Liquidar Nómina</button><button className="button secondary" disabled={!groupId || !period || !lastLiquidation} onClick={presentLast}><FileText size={18} /> Presentar Liquidación</button></div></section>
    {displayedLiquidation ? <section className="panel table-panel"><div className="panel-heading table-title"><div><h2>Planilla de Rol de Quincena</h2><p>{periodName(displayedLiquidation.period)} · {displayedLiquidation.groupId === 'TODOS' ? 'Todos los grupos' : groups.find(group => group.id === displayedLiquidation.groupId)?.name ?? 'Grupo no disponible'}</p></div><Badge tone="info">Última liquidación guardada</Badge></div><div className="table-scroll" role="region" aria-label="Liquidación de Quincena" tabIndex={0}><table><thead><tr><th>Identificación</th><th>Empleado</th><th>Fecha Ingreso</th><th>Fecha Retiro</th><th className="numeric">Sueldo Base</th><th className="numeric">Quincena</th>{commissionRubrics.map(record => <th className="numeric" key={record.id}>{record.name}</th>)}<th className="numeric">Total Ingresos</th><th className="numeric">Aporte Personal</th>{discountRubrics.map(record => <th className="numeric" key={record.id}>{record.name}</th>)}<th className="numeric">Total Egresos</th><th className="numeric">Total a Recibir</th></tr></thead><tbody>{displayedEmployees.map(employee => { const latest = contractHistory[employee.id]?.at(-1); const entryDate = latest?.startDate ?? employee.startDate.split('-').reverse().join('/'); const values = rowValues(employee, displayedLiquidation.period); return <tr key={employee.id}><td>{employee.document}</td><td><strong>{employee.name}</strong></td><td>{entryDate}</td><td>{retirementDateForPeriod(employee.id, displayedLiquidation.period)}</td><td className="numeric money">{money(latest?.salary ?? employee.salary)}</td><td className="numeric money">{money(fortnightValue(employee))}</td>{commissionRubrics.map(record => <td className="numeric money" key={record.id}>{values.commissions.get(record.id) ? money(values.commissions.get(record.id)!) : '-'}</td>)}<td className="numeric money strong">{money(values.totalIncome)}</td><td className="numeric money">{money(values.personalContribution)}</td>{discountRubrics.map(record => <td className="numeric money" key={record.id}>{values.discounts.get(record.id) ? money(values.discounts.get(record.id)!) : '-'}</td>)}<td className="numeric money strong">{money(values.totalExpenses)}</td><td className="numeric money strong">{money(values.totalReceivable)}</td></tr>})}{!displayedEmployees.length && <tr><td colSpan={10 + commissionRubrics.length + discountRubrics.length}><div className="empty-state"><Users /><strong>Sin empleados</strong><p>No existen empleados asociados al grupo seleccionado.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{displayedEmployees.length} empleados</span><span>Comisiones/Bonos y Descuentos según Configuración Planilla de Rol de Quincena</span></div></section> : <div className="empty-state history-selection-empty"><Calculator /><strong>Selecciona los parámetros de liquidación</strong><p>Escoge Grupo de Nómina y Período; después selecciona Liquidar Nómina o Presentar Liquidación.</p></div>}
  </>
}

function MonthEndLiquidationPage({ employees, events, absences, catalogs, contractHistory, iessPercentages, rubricOrder, enabledRubricIds, openPeriods, lastLiquidation, setLastLiquidation, showToast }: { employees: Employee[]; events: PayrollEvent[]; absences: EmployeeAbsence[]; catalogs: Catalogs; contractHistory: Record<string, ContractHistoryLine[]>; iessPercentages: IessPercentageRecord[]; rubricOrder: string[]; enabledRubricIds: string[]; openPeriods: string[]; lastLiquidation: MonthEndLiquidationSnapshot | null; setLastLiquidation: Dispatch<SetStateAction<MonthEndLiquidationSnapshot | null>>; showToast: (message: string) => void }) {
  const [groupId, setGroupId] = useState('TODOS')
  const [period, setPeriod] = useState(openPeriods[0] ?? '')
  const [displayedLiquidation, setDisplayedLiquidation] = useState<MonthEndLiquidationSnapshot | null>(null)
  const groups = catalogs['grupos-nomina'].filter(record => record.status === 'ACTIVO')
  const rubrics = orderedPayrollRubrics(catalogs.rubros, rubricOrder).filter(record => enabledRubricIds.includes(record.id))
  const commissionRubrics = rubrics.filter(record => record.rubricType === 'COMISION_BONO')
  const discountRubrics = rubrics.filter(record => record.rubricType === 'DESCUENTO')
  const personalContributionPercentage = iessPercentages.find(record => record.status === 'ACTIVO' && record.name.localeCompare('Aporte personal', 'es', { sensitivity: 'base' }) === 0)?.percentage ?? '0'
  const periodName = (key: string) => key ? `${payrollMonthNames[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}` : ''
  const eligibleEmployees = employees.filter(employee => {
    const employeeGroupId = contractHistory[employee.id]?.at(-1)?.payrollGroupId ?? employee.payrollGroupId
    return groupId === 'TODOS' || employeeGroupId === groupId
  }).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const liquidate = () => {
    if (!groupId || !period) return
    const snapshot: MonthEndLiquidationSnapshot = { groupId, period, employeeIds: eligibleEmployees.map(employee => employee.id), generatedAt: new Date().toISOString() }
    setLastLiquidation(snapshot)
    setDisplayedLiquidation(snapshot)
    showToast(`Liquidación de Fin de Mes calculada para ${periodName(period)}.`)
  }
  const presentLast = () => {
    if (!lastLiquidation) return
    setGroupId(lastLiquidation.groupId)
    setPeriod(lastLiquidation.period)
    setDisplayedLiquidation(lastLiquidation)
    showToast(`Se presenta la última liquidación guardada de ${periodName(lastLiquidation.period)}.`)
  }
  const displayedEmployees = displayedLiquidation ? displayedLiquidation.employeeIds.map(id => employees.find(employee => employee.id === id)).filter((employee): employee is Employee => Boolean(employee)) : []
  const retirementDateForPeriod = (employeeId: string, liquidationPeriod: string) => {
    const [periodYear, periodMonth] = liquidationPeriod.split('-')
    return [...(contractHistory[employeeId] ?? [])].reverse().find(line => {
      const [day, month, year] = line.endDate.split('/')
      return Boolean(day && month && year && year === periodYear && month.padStart(2, '0') === periodMonth)
    })?.endDate ?? ''
  }
  const fortnightValue = (employee: Employee) => {
    const line = contractHistory[employee.id]?.at(-1)
    const advanceValue = decimalToCents(line?.advanceValue ?? '0.00')
    return (line?.advanceType ?? 'PERCENT') === 'AMOUNT' ? advanceValue : (decimalToCents(line?.salary ?? employee.salary) * advanceValue + 5000n) / 10000n
  }
  const rubricValue = (employeeId: string, rubric: CatalogRecord, liquidationPeriod: string) => events.filter(event => event.employeeId === employeeId && event.status === 'APROBADA' && event.date.startsWith(liquidationPeriod) && event.concept.localeCompare(rubric.name, 'es', { sensitivity: 'base' }) === 0).reduce((sum, event) => sum + decimalToCents(event.amount), 0n)
  const rowValues = (employee: Employee, liquidationPeriod: string) => {
    const latest = contractHistory[employee.id]?.at(-1)
    const workedDays = payrollWorkedDaysForMonth(employee, liquidationPeriod, contractHistory, absences)
    const salary = (decimalToCents(latest?.salary ?? employee.salary) * BigInt(workedDays) + 15n) / 30n
    const fortnight = fortnightValue(employee)
    const commissions = new Map(commissionRubrics.map(rubric => [rubric.id, rubricValue(employee.id, rubric, liquidationPeriod)]))
    const discounts = new Map(discountRubrics.map(rubric => [rubric.id, rubricValue(employee.id, rubric, liquidationPeriod)]))
    const commissionTotal = [...commissions.values()].reduce((sum, value) => sum + value, 0n)
    const discountTotal = [...discounts.values()].reduce((sum, value) => sum + value, 0n)
    const iessBase = salary + commissionRubrics.filter(rubric => rubric.contributesIess).reduce((sum, rubric) => sum + (commissions.get(rubric.id) ?? 0n), 0n)
    const personalContribution = (iessBase * decimalToCents(personalContributionPercentage) + 5000n) / 10000n
    const totalIncome = salary + commissionTotal
    const totalExpenses = personalContribution + fortnight + discountTotal
    return { workedDays, salary, fortnight, commissions, discounts, totalIncome, personalContribution, totalExpenses, totalReceivable: totalIncome - totalExpenses }
  }
  return <>
    <PageHeader eyebrow="Liquidación de Valores / Liquidación Fin de Mes" title="Liquidación Fin de Mes" description="Calcula y presenta la planilla mensual del período abierto." />
    <section className="panel"><div className="form-grid"><div className="field"><label htmlFor="month-end-payroll-group">Grupo de Nómina <span>Obligatorio</span></label><select id="month-end-payroll-group" value={groupId} onChange={event => { setGroupId(event.target.value); setDisplayedLiquidation(null) }}><option value="TODOS">Todos</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></div><div className="field"><label htmlFor="month-end-period">Período <span>Obligatorio</span></label><select id="month-end-period" value={period} onChange={event => { setPeriod(event.target.value); setDisplayedLiquidation(null) }}><option value="">Selecciona un período</option>{openPeriods.map(key => <option key={key} value={key}>{periodName(key)}</option>)}</select>{!openPeriods.length && <small className="field-error">No existen períodos abiertos.</small>}</div></div><div className="dialog-actions"><button className="button primary" disabled={!groupId || !period} onClick={liquidate}><Calculator size={18} /> Liquidar Nómina</button><button className="button secondary" disabled={!groupId || !period || !lastLiquidation} onClick={presentLast}><FileText size={18} /> Presentar Liquidación</button></div></section>
    {displayedLiquidation ? <section className="panel table-panel"><div className="panel-heading table-title"><div><h2>Planilla de Rol de Fin de Mes</h2><p>{periodName(displayedLiquidation.period)} · {displayedLiquidation.groupId === 'TODOS' ? 'Todos los grupos' : groups.find(group => group.id === displayedLiquidation.groupId)?.name ?? 'Grupo no disponible'}</p></div><Badge tone="info">Última liquidación guardada</Badge></div><div className="table-scroll" role="region" aria-label="Liquidación Fin de Mes" tabIndex={0}><table><thead><tr><th>Identificación</th><th>Empleado</th><th>Fecha Ingreso</th><th>Fecha Retiro</th><th className="numeric">Sueldo Base</th><th className="numeric">Días Trabajados</th><th className="numeric">Sueldo</th>{commissionRubrics.map(record => <th className="numeric" key={record.id}>{record.name}</th>)}<th className="numeric">Total Ingresos</th><th className="numeric">Aporte Personal</th><th className="numeric">Quincena</th>{discountRubrics.map(record => <th className="numeric" key={record.id}>{record.name}</th>)}<th className="numeric">Total Egresos</th><th className="numeric">Total a Recibir</th></tr></thead><tbody>{displayedEmployees.map(employee => { const latest = contractHistory[employee.id]?.at(-1); const entryDate = latest?.startDate ?? employee.startDate.split('-').reverse().join('/'); const values = rowValues(employee, displayedLiquidation.period); return <tr key={employee.id}><td>{employee.document}</td><td><strong>{employee.name}</strong></td><td>{entryDate}</td><td>{retirementDateForPeriod(employee.id, displayedLiquidation.period) || '-'}</td><td className="numeric money">{money(latest?.salary ?? employee.salary)}</td><td className="numeric">{values.workedDays}</td><td className="numeric money">{money(values.salary)}</td>{commissionRubrics.map(record => <td className="numeric money" key={record.id}>{values.commissions.get(record.id) ? money(values.commissions.get(record.id)!) : '-'}</td>)}<td className="numeric money strong">{money(values.totalIncome)}</td><td className="numeric money">{money(values.personalContribution)}</td><td className="numeric money">{money(values.fortnight)}</td>{discountRubrics.map(record => <td className="numeric money" key={record.id}>{values.discounts.get(record.id) ? money(values.discounts.get(record.id)!) : '-'}</td>)}<td className="numeric money strong">{money(values.totalExpenses)}</td><td className="numeric money strong">{money(values.totalReceivable)}</td></tr>})}{!displayedEmployees.length && <tr><td colSpan={13 + commissionRubrics.length + discountRubrics.length}><div className="empty-state"><Users /><strong>Sin empleados</strong><p>No existen empleados asociados al grupo seleccionado.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{displayedEmployees.length} empleados</span><span>Mes de 30 días · Se descuentan ausencias distintas de Falta Justificada</span></div></section> : <div className="empty-state history-selection-empty"><Calculator /><strong>Selecciona los parámetros de liquidación</strong><p>Escoge Grupo de Nómina y Período; después selecciona Liquidar Nómina o Presentar Liquidación.</p></div>}
  </>
}

function SocialBenefitsLiquidationPage({ employees, historicalSalaries: _historicalSalaries, events, monthEndEnabledRubricIds, novelties, absences, catalogs, contractHistory, sbuRecords, lastLiquidation, setLastLiquidation, showToast }: { employees: Employee[]; historicalSalaries: HistoricalSalaryRecord[]; events: PayrollEvent[]; monthEndEnabledRubricIds: string[]; novelties: PayrollNovelty[]; absences: EmployeeAbsence[]; catalogs: Catalogs; contractHistory: Record<string, ContractHistoryLine[]>; sbuRecords: SbuRecord[]; lastLiquidation: SocialBenefitLiquidationSnapshot | null; setLastLiquidation: Dispatch<SetStateAction<SocialBenefitLiquidationSnapshot | null>>; showToast: (message: string) => void }) {
  const [benefitType, setBenefitType] = useState<SocialBenefitLiquidationSnapshot['benefitType'] | ''>('')
  const [year, setYear] = useState('')
  const [displayedLiquidation, setDisplayedLiquidation] = useState<SocialBenefitLiquidationSnapshot | null>(null)
  const currentYear = currentEcuadorYearMonth().year
  const years = Array.from({ length: 7 }, (_, index) => String(currentYear - index))
  const benefitLabel = (value: SocialBenefitLiquidationSnapshot['benefitType']) => value === '13ERO' ? 'Décimo Tercero' : value === '14TO_COSTA' ? 'Décimo Cuarto Costa' : 'Décimo Cuarto Sierra'
  const eligibilityKey = (value: SocialBenefitLiquidationSnapshot['benefitType']): CargoBenefitKey => value === '13ERO' ? 'receivesThirteenth' : 'receivesFourteenth'
  const eligibleEmployees = (value: SocialBenefitLiquidationSnapshot['benefitType']) => employees.filter(employee => {
    if (!employeeCargoBenefitEnabled(employee, contractHistory, catalogs.cargos, eligibilityKey(value))) return false
    if (value === '13ERO') return true
    const region = contractHistory[employee.id]?.at(-1)?.region ?? 'COSTA'
    return region === (value === '14TO_COSTA' ? 'COSTA' : 'SIERRA')
  })
  const thirteenthMonths = (liquidationYear: string) => {
    const endingYear = Number(liquidationYear)
    return [{ period: `${endingYear - 1}-12`, label: 'Diciembre' }, ...payrollMonthNames.slice(0, 11).map((label, index) => ({ period: `${endingYear}-${String(index + 1).padStart(2, '0')}`, label }))]
  }
  const fourteenthCoastMonths = (liquidationYear: string) => {
    const endingYear = Number(liquidationYear)
    return [
      ...payrollMonthNames.slice(2).map((label, index) => ({ period: `${endingYear - 1}-${String(index + 3).padStart(2, '0')}`, label })),
      ...payrollMonthNames.slice(0, 2).map((label, index) => ({ period: `${endingYear}-${String(index + 1).padStart(2, '0')}`, label })),
    ]
  }
  const fourteenthSierraMonths = (liquidationYear: string) => {
    const endingYear = Number(liquidationYear)
    return [
      ...payrollMonthNames.slice(7).map((label, index) => ({ period: `${endingYear - 1}-${String(index + 8).padStart(2, '0')}`, label })),
      ...payrollMonthNames.slice(0, 7).map((label, index) => ({ period: `${endingYear}-${String(index + 1).padStart(2, '0')}`, label })),
    ]
  }
  const workedDaysInMonth = (employee: Employee, period: string) => payrollWorkedDaysForMonth(employee, period, contractHistory, absences)
  const monthEndCommissionRubrics = catalogs.rubros.filter(record => monthEndEnabledRubricIds.includes(record.id) && record.rubricType === 'COMISION_BONO')
  const monthEndTotalIncome = (employee: Employee, period: string) => {
    const latestContract = contractHistory[employee.id]?.at(-1)
    const workedDays = workedDaysInMonth(employee, period)
    const salary = (decimalToCents(latestContract?.salary ?? employee.salary) * BigInt(workedDays) + 15n) / 30n
    const commissions = monthEndCommissionRubrics.reduce((sum, rubric) => sum + events.filter(event => event.employeeId === employee.id && event.status === 'APROBADA' && event.date.startsWith(period) && event.concept.localeCompare(rubric.name, 'es', { sensitivity: 'base' }) === 0).reduce((eventSum, event) => eventSum + decimalToCents(event.amount), 0n), 0n)
    return salary + commissions
  }
  const thirteenthRows = (liquidationYear: string) => {
    const months = thirteenthMonths(liquidationYear)
    const validPeriods = new Set(months.map(month => month.period))
    return [...eligibleEmployees('13ERO')].sort((a, b) => a.name.localeCompare(b.name, 'es')).map(employee => {
      const totalIncomes = months.map(month => monthEndTotalIncome(employee, month.period))
      const totalIncomeSum = totalIncomes.reduce((sum, income) => sum + income, 0n)
      const advance = novelties.filter(novelty => novelty.employeeId === employee.id && novelty.applicationForm === '13ERO' && validPeriods.has(novelty.startPeriod)).reduce((sum, novelty) => sum + decimalToCents(novelty.totalValue), 0n)
      const latestContract = contractHistory[employee.id]?.at(-1)
      const payable = (totalIncomeSum + 6n) / 12n - advance
      return { employee, entryDate: latestContract?.startDate ?? employee.startDate.split('-').reverse().join('/'), totalIncomes, totalIncomeSum, advance, payable }
    })
  }
  const fourteenthRows = (months: { period: string; label: string }[], benefit: '14TO_COSTA' | '14TO_SIERRA') => {
    const validPeriods = new Set(months.map(month => month.period))
    const activeSbu = findSbuForDate(sbuRecords, currentEcuadorDate())
    const sbu = decimalToCents(activeSbu?.value ?? '0')
    return [...eligibleEmployees(benefit)].sort((a, b) => a.name.localeCompare(b.name, 'es')).map(employee => {
      const workedDays = months.map(month => workedDaysInMonth(employee, month.period))
      const advance = novelties.filter(novelty => novelty.employeeId === employee.id && novelty.applicationForm === '14TO' && validPeriods.has(novelty.startPeriod)).reduce((sum, novelty) => sum + decimalToCents(novelty.totalValue), 0n)
      const latestContract = contractHistory[employee.id]?.at(-1)
      const totalWorkedDays = workedDays.reduce((sum, days) => sum + days, 0)
      const payable = (sbu * BigInt(totalWorkedDays) + 180n) / 360n - advance
      return { employee, entryDate: latestContract?.startDate ?? employee.startDate.split('-').reverse().join('/'), workedDays, totalWorkedDays, sbu, advance, payable }
    })
  }
  const fourteenthCoastRows = (liquidationYear: string) => fourteenthRows(fourteenthCoastMonths(liquidationYear), '14TO_COSTA')
  const fourteenthSierraRows = (liquidationYear: string) => fourteenthRows(fourteenthSierraMonths(liquidationYear), '14TO_SIERRA')
  const liquidate = () => {
    if (!benefitType || !year) return
    const snapshot: SocialBenefitLiquidationSnapshot = { benefitType, year, generatedAt: new Date().toISOString() }
    setLastLiquidation(snapshot)
    setDisplayedLiquidation(snapshot)
    showToast(`${benefitLabel(benefitType)} ${year} liquidado correctamente.`)
  }
  const presentLast = () => {
    if (!lastLiquidation) return
    setBenefitType(lastLiquidation.benefitType)
    setYear(lastLiquidation.year)
    setDisplayedLiquidation(lastLiquidation)
    showToast(`Se presenta la última liquidación de ${benefitLabel(lastLiquidation.benefitType)} ${lastLiquidation.year}.`)
  }
  return <>
    <PageHeader eyebrow="Liquidación de Valores / Liquidación Beneficios Sociales" title="Liquidación Beneficios Sociales" description="Selecciona el beneficio y el año que se procesará." />
    <section className="panel"><div className="form-grid"><div className="field"><label htmlFor="social-benefit-type">Tipo de Beneficio <span>Obligatorio</span></label><select id="social-benefit-type" value={benefitType} onChange={event => { setBenefitType(event.target.value as SocialBenefitLiquidationSnapshot['benefitType'] | ''); setDisplayedLiquidation(null) }}><option value="">Selecciona un beneficio</option><option value="13ERO">Décimo Tercero</option><option value="14TO_COSTA">Décimo Cuarto Costa</option><option value="14TO_SIERRA">Décimo Cuarto Sierra</option></select></div><div className="field"><label htmlFor="social-benefit-year">Período <span>Obligatorio</span></label><select id="social-benefit-year" value={year} onChange={event => { setYear(event.target.value); setDisplayedLiquidation(null) }}><option value="">Selecciona el período</option>{years.map(item => <option value={item} key={item}>{benefitType === '13ERO' ? `Diciembre ${Number(item) - 1} – Noviembre ${item}` : benefitType === '14TO_COSTA' ? `Marzo ${Number(item) - 1} – Febrero ${item}` : benefitType === '14TO_SIERRA' ? `Agosto ${Number(item) - 1} – Julio ${item}` : item}</option>)}</select><small className="field-help">{benefitType === '13ERO' || benefitType === '14TO_COSTA' || benefitType === '14TO_SIERRA' ? 'El año seleccionado corresponde al cierre del período.' : 'Año a liquidar.'}</small></div></div><div className="dialog-actions"><button className="button primary" disabled={!benefitType || !year} onClick={liquidate}><Calculator size={18} /> Liquidar Pago</button><button className="button secondary" disabled={!benefitType || !year || !lastLiquidation} onClick={presentLast}><FileText size={18} /> Presentar Liquidación</button></div></section>
    {displayedLiquidation ? displayedLiquidation.benefitType === '13ERO' ? (() => { const months = thirteenthMonths(displayedLiquidation.year); const rows = thirteenthRows(displayedLiquidation.year); return <section className="panel table-panel"><div className="panel-heading table-title"><div><h2>Liquidación Décimo Tercero</h2><p>Diciembre {Number(displayedLiquidation.year) - 1} – Noviembre {displayedLiquidation.year}</p></div><Badge tone="success">Liquidación guardada</Badge></div><div className="table-scroll" role="region" aria-label="Liquidación Décimo Tercero" tabIndex={0}><table><thead><tr><th>Empleado</th><th>Identificación</th><th>Fecha Ingreso</th>{months.map(month => <th className="numeric" key={month.period}>{month.label}</th>)}<th className="numeric">Total Ingresos</th><th className="numeric">Valor Anticipo</th><th className="numeric">Valor a Pagar</th></tr></thead><tbody>{rows.map(row => <tr key={row.employee.id}><td><strong>{row.employee.name}</strong></td><td>{row.employee.document}</td><td>{row.entryDate}</td>{row.totalIncomes.map((income, index) => <td className="numeric money" key={months[index].period}>{income ? money(income) : '-'}</td>)}<td className="numeric money strong">{money(row.totalIncomeSum)}</td><td className="numeric money">{money(row.advance)}</td><td className="numeric money strong">{money(row.payable)}</td></tr>)}</tbody></table></div><div className="table-footer"><span>{rows.length} empleados</span><span>Fuente mensual: Total Ingresos de la Liquidación de Fin de Mes · Valor a Pagar = (suma de 12 ingresos ÷ 12) − Valor Anticipo</span></div></section> })() : displayedLiquidation.benefitType === '14TO_COSTA' || displayedLiquidation.benefitType === '14TO_SIERRA' ? (() => { const isSierra = displayedLiquidation.benefitType === '14TO_SIERRA'; const months = isSierra ? fourteenthSierraMonths(displayedLiquidation.year) : fourteenthCoastMonths(displayedLiquidation.year); const rows = isSierra ? fourteenthSierraRows(displayedLiquidation.year) : fourteenthCoastRows(displayedLiquidation.year); const activeSbu = findSbuForDate(sbuRecords, currentEcuadorDate()); return <section className="panel table-panel"><div className="panel-heading table-title"><div><h2>Liquidación Décimo Cuarto {isSierra ? 'Sierra' : 'Costa'}</h2><p>{isSierra ? 'Agosto' : 'Marzo'} {Number(displayedLiquidation.year) - 1} – {isSierra ? 'Julio' : 'Febrero'} {displayedLiquidation.year}</p></div><Badge tone="success">Liquidación guardada</Badge></div>{!activeSbu && <div className="notice warning"><AlertTriangle size={20} /><div><strong>No existe un SBU activo a la fecha</strong><p>Registra una vigencia de Salario Básico Unificado que incluya el {currentEcuadorDate()} para calcular el valor a pagar.</p></div></div>}<div className="table-scroll" role="region" aria-label={`Liquidación Décimo Cuarto ${isSierra ? 'Sierra' : 'Costa'}`} tabIndex={0}><table><thead><tr><th>Empleado</th><th>Identificación</th><th>Fecha Ingreso</th>{months.map(month => <th className="numeric" key={month.period}>{month.label}</th>)}<th className="numeric">Días Trabajados Total</th><th className="numeric">SBU</th><th className="numeric">Valor Anticipo</th><th className="numeric">Valor a Pagar</th></tr></thead><tbody>{rows.map(row => <tr key={row.employee.id}><td><strong>{row.employee.name}</strong></td><td>{row.employee.document}</td><td>{row.entryDate}</td>{row.workedDays.map((days, index) => <td className="numeric" key={months[index].period}>{days || '-'}</td>)}<td className="numeric strong">{row.totalWorkedDays || '-'}</td><td className="numeric money">{money(row.sbu)}</td><td className="numeric money">{money(row.advance)}</td><td className="numeric money strong">{money(row.payable)}</td></tr>)}</tbody></table></div><div className="table-footer"><span>{rows.length} empleados</span><span>Valor a Pagar = (SBU vigente × días trabajados ÷ 360) − Valor Anticipo</span></div></section> })() : <section className="panel preflight"><div className="preflight-icon"><CheckCircle2 /></div><h2>{benefitLabel(displayedLiquidation.benefitType)}</h2><p>Liquidación correspondiente al período {displayedLiquidation.year}. Los cálculos y el detalle se incorporarán con las siguientes reglas funcionales.</p><Badge tone="success">Liquidación guardada</Badge></section> : <div className="empty-state history-selection-empty"><Calculator /><strong>Selecciona los parámetros de liquidación</strong><p>Escoge Tipo de Beneficio y Período para liquidar o presentar el último resultado guardado.</p></div>}
  </>
}

function ProfitLiquidationPage({ employees, complementaryEmployees, employeeProfiles, novelties, absences, catalogs, contractHistory, payrollPeriodOverrides, lastLiquidation, setLastLiquidation, showToast }: { employees: Employee[]; complementaryEmployees: ComplementaryEmployee[]; employeeProfiles: Record<string, EmployeeProfile>; novelties: PayrollNovelty[]; absences: EmployeeAbsence[]; catalogs: Catalogs; contractHistory: Record<string, ContractHistoryLine[]>; payrollPeriodOverrides: Record<string, PayrollPeriodStatus>; lastLiquidation: ProfitLiquidationSnapshot | null; setLastLiquidation: Dispatch<SetStateAction<ProfitLiquidationSnapshot | null>>; showToast: (message: string) => void }) {
  const currentYear = currentEcuadorYearMonth().year
  const [year, setYear] = useState(String(currentYear))
  const [exerciseValue, setExerciseValue] = useState('')
  const [calculatedYear, setCalculatedYear] = useState('')
  const [calculatedExerciseValue, setCalculatedExerciseValue] = useState('0.00')
  const [valueError, setValueError] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState({ employees: false, complementary: false })
  const years = Array.from({ length: 7 }, (_, index) => String(currentYear - index))
  const profitPeriodKey = `${year}-UTILIDADES`
  const profitPeriodStatus = payrollPeriodOverrides[profitPeriodKey] ?? (Number(year) > currentYear ? 'PENDIENTE' : 'CERRADO')
  const periodOpen = profitPeriodStatus === 'ABIERTO'
  const eligibleEmployees = employees.filter(employee => employeeCargoBenefitEnabled(employee, contractHistory, catalogs.cargos, 'receivesProfits')).sort((first, second) => first.name.localeCompare(second.name, 'es'))
  const months = payrollMonthNames.map((label, index) => ({ label, period: `${calculatedYear}-${String(index + 1).padStart(2, '0')}` }))
  const ownBaseRows = calculatedYear ? eligibleEmployees.map(employee => {
    const workedDays = months.map(month => payrollWorkedDaysForMonth(employee, month.period, contractHistory, absences))
    const totalDays = workedDays.reduce((sum, days) => sum + days, 0)
    const dependents = employeeProfiles[employee.id]?.dependents?.filter(dependent => dependent.active).length ?? 0
    const advance = novelties.filter(novelty => novelty.employeeId === employee.id && novelty.applicationForm === 'UTILIDADES' && novelty.startPeriod.startsWith(calculatedYear)).reduce((sum, novelty) => sum + decimalToCents(novelty.totalValue), 0n)
    return { id: employee.id, name: employee.name, identification: employee.document, workedDays, totalDays, dependents, advance }
  }) : []
  const complementaryBaseRows = calculatedYear ? complementaryEmployees.map(employee => ({
    id: employee.id,
    name: employee.businessName,
    identification: employee.identification,
    company: employee.company,
    totalDays: employee.workedDays.find(record => record.year === calculatedYear)?.days ?? 0,
    dependents: employee.dependents,
    advance: 0n,
  })).filter(row => row.totalDays > 0).sort((first, second) => first.name.localeCompare(second.name, 'es')) : []
  const distributionRows = [
    ...ownBaseRows.map(row => ({ ...row, distributionKey: `employee-${row.id}` })),
    ...complementaryBaseRows.map(row => ({ ...row, distributionKey: `complementary-${row.id}` })),
  ]
  const exerciseCents = decimalToCents(calculatedExerciseValue)
  const tenPercentPool = (exerciseCents * 2n + 1n) / 3n
  const fivePercentPool = exerciseCents - tenPercentPool
  const factorB = distributionRows.reduce((sum, row) => sum + row.totalDays * row.dependents, 0)
  const generalPool = factorB > 0 ? tenPercentPool : exerciseCents
  const familyLoadPool = factorB > 0 ? fivePercentPool : 0n
  const distributePool = (pool: bigint, weightFor: (row: typeof distributionRows[number]) => number) => {
    const weightedRows = distributionRows.map(row => ({ row, weight: Math.max(0, weightFor(row)) })).filter(item => item.weight > 0)
    const totalWeight = weightedRows.reduce((sum, item) => sum + item.weight, 0)
    const allocations = new Map<string, bigint>()
    if (!totalWeight || pool <= 0n) return allocations
    const denominator = BigInt(totalWeight)
    const shares = weightedRows.map(item => {
      const numerator = pool * BigInt(item.weight)
      return { key: item.row.distributionKey, cents: numerator / denominator, remainder: numerator % denominator }
    })
    const allocated = shares.reduce((sum, share) => sum + share.cents, 0n)
    const extraCents = Number(pool - allocated)
    shares.sort((first, second) => first.remainder === second.remainder ? first.key.localeCompare(second.key) : first.remainder > second.remainder ? -1 : 1)
    shares.forEach((share, index) => allocations.set(share.key, share.cents + (index < extraCents ? 1n : 0n)))
    return allocations
  }
  const value10ByEmployee = distributePool(generalPool, row => row.totalDays)
  const value5ByEmployee = distributePool(familyLoadPool, row => row.totalDays * row.dependents)
  const calculateValues = <T extends { id: string; totalDays: number; dependents: number; advance: bigint }>(row: T, group: 'employee' | 'complementary') => {
    const key = `${group}-${row.id}`
    const value10 = value10ByEmployee.get(key) ?? 0n
    const value5 = value5ByEmployee.get(key) ?? 0n
    return { ...row, value10, value5, payable: value10 + value5 - row.advance }
  }
  const ownRows = ownBaseRows.map(row => calculateValues(row, 'employee'))
  const complementaryRows = complementaryBaseRows.map(row => calculateValues(row, 'complementary'))
  const decimalDraft = (value: string) => {
    const normalized = value.replace(',', '.').replace(/[^\d.]/g, '')
    const [whole = '', ...rest] = normalized.split('.')
    return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole
  }
  const liquidate = () => {
    if (!periodOpen) return
    if (!/^\d+(\.\d{1,2})?$/.test(exerciseValue) || decimalToCents(exerciseValue) <= 0n) {
      setValueError('Ingresa un valor mayor a cero con máximo dos decimales.')
      return
    }
    const normalizedExerciseValue = centsToDecimal(decimalToCents(exerciseValue))
    const snapshot: ProfitLiquidationSnapshot = { year, exerciseValue: normalizedExerciseValue, generatedAt: new Date().toISOString() }
    setValueError('')
    setLastLiquidation(snapshot)
    setCalculatedYear(snapshot.year)
    setCalculatedExerciseValue(snapshot.exerciseValue)
    showToast(`Utilidades ${year} liquidadas correctamente.`)
  }
  const presentLast = () => {
    if (!lastLiquidation) return
    setYear(lastLiquidation.year)
    setExerciseValue(lastLiquidation.exerciseValue)
    setCalculatedYear(lastLiquidation.year)
    setCalculatedExerciseValue(lastLiquidation.exerciseValue)
    setValueError('')
    showToast(`Se presenta la última liquidación de Utilidades ${lastLiquidation.year}.`)
  }
  const valueColumns = <><th className="numeric"># de Cargas</th><th className="numeric">Valor 10%</th><th className="numeric">Valor 5%</th><th className="numeric">Anticipo</th><th className="numeric">Valor a Pagar</th></>
  return <>
    <PageHeader eyebrow="Liquidación de Valores / Liquidación Utilidades" title="Liquidación Utilidades" description="Distribuye el valor del ejercicio entre empleados propios y complementarios." />
    <section className="panel"><div className="form-grid"><div className="field"><label htmlFor="profit-liquidation-year">Año <span>Obligatorio</span></label><select id="profit-liquidation-year" value={year} onChange={event => { setYear(event.target.value); setCalculatedYear('') }}>{years.map(option => <option value={option} key={option}>{option}</option>)}</select><small className={periodOpen ? 'field-help' : 'field-error'}>Período Utilidades {year}: {profitPeriodStatus === 'ABIERTO' ? 'Abierto' : profitPeriodStatus === 'PENDIENTE' ? 'Pendiente' : 'Cerrado'}.</small></div><div className="field"><label htmlFor="profit-exercise-value">Valor del Ejercicio <span>Obligatorio</span></label><input id="profit-exercise-value" value={exerciseValue} onChange={event => { setExerciseValue(decimalDraft(event.target.value)); setValueError(''); setCalculatedYear('') }} inputMode="decimal" placeholder="0.00" aria-invalid={Boolean(valueError)} />{valueError && <small className="field-error">{valueError}</small>}</div></div><div className="dialog-actions"><button type="button" className="button primary" disabled={!periodOpen || !exerciseValue} title={!periodOpen ? `El período Utilidades ${year} no está abierto` : undefined} onClick={liquidate}><Calculator size={18} /> Liquidar Utilidades</button><button type="button" className="button secondary" disabled={!lastLiquidation} onClick={presentLast}><FileText size={18} /> Presentar Liquidación</button></div></section>
    {calculatedYear ? <>
      <div className="context-strip"><span><CalendarDays size={16} /> Ejercicio {calculatedYear}</span><span><CircleDollarSign size={16} /> 15% a repartir: {money(calculatedExerciseValue)}</span><Badge tone="success">{ownRows.length + complementaryRows.length} beneficiarios</Badge></div>
      <section className="panel table-panel"><div className="panel-heading table-title collapsible-panel-heading"><div><h2>Empleados</h2></div><div className="collapsible-panel-actions"><Badge tone="success">{ownRows.length} habilitados</Badge><button type="button" className="icon-button small collapse-panel-button" onClick={() => setCollapsedGroups(current => ({ ...current, employees: !current.employees }))} aria-expanded={!collapsedGroups.employees} aria-controls="profit-employees-group" aria-label={`${collapsedGroups.employees ? 'Expandir' : 'Contraer'} grupo Empleados`} title={collapsedGroups.employees ? 'Expandir grupo' : 'Contraer grupo'}><ChevronDown className={collapsedGroups.employees ? '' : 'expanded'} size={19} /></button></div></div>{!collapsedGroups.employees && <div id="profit-employees-group"><div className="table-scroll" role="region" aria-label={`Utilidades de empleados ${calculatedYear}`} tabIndex={0}><table className="profit-worked-days-table"><thead><tr><th>Empleado</th><th>Identificación</th>{months.map(month => <th className="numeric" key={month.period}>{month.label}</th>)}<th className="numeric">Total Días</th>{valueColumns}</tr></thead><tbody>{ownRows.map(row => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.identification}</td>{row.workedDays.map((days, index) => <td className="numeric" key={months[index].period}>{days || '—'}</td>)}<td className="numeric strong">{row.totalDays || '—'}</td><td className="numeric">{row.dependents}</td><td className="numeric money">{money(row.value10)}</td><td className="numeric money">{money(row.value5)}</td><td className="numeric money">{money(row.advance)}</td><td className="numeric money strong">{money(row.payable)}</td></tr>)}{!ownRows.length && <tr><td colSpan={20}><div className="empty-state compact"><Users /><strong>Sin empleados habilitados</strong><p>No existen empleados cuyo cargo tenga habilitado el beneficio Utilidades.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{ownRows.length} empleados propios</span><span>Incluye únicamente cargos con Utilidades en Sí</span></div></div>}</section>
      <section className="panel table-panel"><div className="panel-heading table-title collapsible-panel-heading"><div><h2>Empleados Complementarios</h2></div><div className="collapsible-panel-actions"><Badge tone="info">{complementaryRows.length} incluidos</Badge><button type="button" className="icon-button small collapse-panel-button" onClick={() => setCollapsedGroups(current => ({ ...current, complementary: !current.complementary }))} aria-expanded={!collapsedGroups.complementary} aria-controls="profit-complementary-group" aria-label={`${collapsedGroups.complementary ? 'Expandir' : 'Contraer'} grupo Empleados Complementarios`} title={collapsedGroups.complementary ? 'Expandir grupo' : 'Contraer grupo'}><ChevronDown className={collapsedGroups.complementary ? '' : 'expanded'} size={19} /></button></div></div>{!collapsedGroups.complementary && <div id="profit-complementary-group"><div className="table-scroll" role="region" aria-label={`Utilidades de empleados complementarios ${calculatedYear}`} tabIndex={0}><table><thead><tr><th>Empleado</th><th>Identificación</th><th>Empresa</th><th className="numeric">Total Días</th>{valueColumns}</tr></thead><tbody>{complementaryRows.map(row => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.identification}</td><td>{row.company}</td><td className="numeric strong">{row.totalDays}</td><td className="numeric">{row.dependents}</td><td className="numeric money">{money(row.value10)}</td><td className="numeric money">{money(row.value5)}</td><td className="numeric money">{money(row.advance)}</td><td className="numeric money strong">{money(row.payable)}</td></tr>)}{!complementaryRows.length && <tr><td colSpan={9}><div className="empty-state compact"><Users /><strong>Sin empleados complementarios</strong><p>No existen días trabajados registrados para el ejercicio seleccionado.</p></div></td></tr>}</tbody></table></div><div className="table-footer"><span>{complementaryRows.length} empleados complementarios</span><span>Días tomados del registro anual de Empleados Complementarios</span></div></div>}</section>
      <div className="notice info"><Calculator size={20} /><div><strong>Distribución del 15%</strong><p>Valor 10% = Valor del Ejercicio × 2/3 × (días trabajados por el empleado ÷ suma total de días laborados). Para el Valor 5%: Factor A = días trabajados × número de cargas; Factor B = suma de los factores A; Valor 5% = Valor del Ejercicio × 1/3 × Factor A ÷ Factor B. Si el Factor B es cero, el 5% se incorpora al reparto general por días. Valor a Pagar = Valor 10% + Valor 5% − Anticipo.</p></div></div>
    </> : <div className="empty-state history-selection-empty"><Calculator /><strong>Selecciona el año y registra el Valor del Ejercicio</strong><p>La liquidación separará a los empleados propios de los empleados complementarios.</p></div>}
  </>
}
function EmployeeFilterCombobox({ employees, value, onChange }: { employees: Employee[]; value: string; onChange: (employeeId: string) => void }) {
  const selectedEmployee = employees.find(employee => employee.id === value)
  const selectedLabel = selectedEmployee ? `${selectedEmployee.name} · ${selectedEmployee.document}` : ''
  const [query, setQuery] = useState(selectedLabel)
  const [open, setOpen] = useState(false)
  useEffect(() => { setQuery(selectedLabel) }, [selectedLabel])
  const normalizedQuery = query.trim().toLocaleLowerCase('es')
  const filteredEmployees = employees.filter(employee => `${employee.name} ${employee.document} ${employee.role} ${employee.area}`.toLocaleLowerCase('es').includes(normalizedQuery)).slice(0, 12)
  const initials = (employee: Employee) => employee.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const selectEmployee = (employeeId: string) => {
    onChange(employeeId)
    const employee = employees.find(item => item.id === employeeId)
    setQuery(employee ? `${employee.name} · ${employee.document}` : '')
    setOpen(false)
  }
  return <div className="assignment-employee-control possible-liquidation-employee-control">
    {!selectedEmployee ? <div className={`assignment-employee-combobox possible-liquidation-employee-combobox${open ? ' open' : ''}`}><input id="possible-liquidation-employee" type="text" value={query} onChange={event => { setQuery(event.target.value); setOpen(true) }} onFocus={event => { event.currentTarget.select(); setOpen(true) }} onBlur={() => window.setTimeout(() => { setOpen(false); setQuery(selectedLabel) }, 150)} placeholder="Escribe nombre o documento" aria-label="Empleado" aria-expanded={open} aria-autocomplete="list" role="combobox" />{query && <button type="button" className="assignment-employee-clear" onMouseDown={event => event.preventDefault()} onClick={() => { setQuery(''); setOpen(true) }} aria-label="Limpiar búsqueda" title="Limpiar búsqueda"><X size={15} /></button>}{open && <div className="assignment-employee-options" role="listbox">{filteredEmployees.map(employee => <button key={employee.id} type="button" className="assignment-employee-option" onMouseDown={event => event.preventDefault()} onClick={() => selectEmployee(employee.id)} role="option" aria-selected={false}><span className="assignment-employee-option-avatar">{initials(employee)}</span><span><strong>{employee.name}</strong><small>{employee.document} · {employee.role || employee.area}</small></span></button>)}{!filteredEmployees.length && <div className="assignment-employee-empty">No se encontraron empleados.</div>}</div>}</div> : <div className="assigned-employee-card"><span className="assigned-employee-avatar">{initials(selectedEmployee)}</span><span className="assigned-employee-details"><strong>{selectedEmployee.name}</strong><small>{selectedEmployee.document} · {selectedEmployee.role || selectedEmployee.area}</small></span><button type="button" className="assigned-employee-remove" onClick={() => selectEmployee('')} aria-label={`Quitar selección de ${selectedEmployee.name}`} title="Quitar selección"><X size={15} /></button></div>}
  </div>
}

function PendingPersonnelDiscountsPanel({ employee, novelties, rubrics }: { employee?: Employee; novelties: PayrollNovelty[]; rubrics: CatalogRecord[] }) {
  const [collapsed, setCollapsed] = useState(false)
  const discountRubrics = rubrics.filter(rubric => rubric.rubricType === 'DESCUENTO')
  const discountRubricIds = new Set(discountRubrics.map(rubric => rubric.id))
  const discountRubricNames = new Set(discountRubrics.map(rubric => rubric.name.toLocaleLowerCase('es')))
  const rows = employee ? novelties.filter(novelty => {
    const pending = decimalToCents(novelty.totalValue) - decimalToCents(novelty.paidValue)
    const isDiscount = discountRubricIds.has(novelty.rubricId) || discountRubricNames.has(novelty.rubricName.toLocaleLowerCase('es'))
    return novelty.employeeId === employee.id && novelty.status !== 'FINALIZADA' && isDiscount && pending > 0n
  }).sort((first, second) => first.startPeriod.localeCompare(second.startPeriod) || first.rubricName.localeCompare(second.rubricName, 'es')) : []
  const pendingTotal = rows.reduce((sum, novelty) => sum + decimalToCents(novelty.totalValue) - decimalToCents(novelty.paidValue), 0n)
  const applicationFormLabel = (novelty: PayrollNovelty) => novelty.applicationForm === 'CUOTAS' ? `${novelty.installments} cuotas` : novelty.applicationForm === 'TOTAL' ? 'Total' : novelty.applicationForm === '13ERO' ? 'Décimo Tercero' : novelty.applicationForm === '14TO' ? 'Décimo Cuarto' : 'Utilidades'
  return <section className="panel table-panel personnel-discounts-panel"><div className="panel-heading collapsible-panel-heading"><div><h2>Descuentos</h2></div><div className="collapsible-panel-actions"><Badge tone={rows.length ? 'warning' : 'neutral'}>{rows.length} {rows.length === 1 ? 'pendiente' : 'pendientes'}</Badge><button type="button" className="icon-button small collapse-panel-button" onClick={() => setCollapsed(current => !current)} aria-expanded={!collapsed} aria-controls="personnel-discounts-content" aria-label={`${collapsed ? 'Expandir' : 'Contraer'} Descuentos`} title={collapsed ? 'Expandir' : 'Contraer'}><ChevronDown className={collapsed ? '' : 'expanded'} size={19} /></button></div></div>{!collapsed && <div id="personnel-discounts-content" className="table-scroll" role="region" aria-label="Novedades pendientes de descontar" tabIndex={0}><table><thead><tr><th>Rubro</th><th>Período Inicio</th><th>Forma Aplicación</th><th className="numeric">Valor Total</th><th className="numeric">Valor Descontado</th><th className="numeric">Saldo Pendiente</th></tr></thead><tbody>{rows.map(novelty => { const pending = decimalToCents(novelty.totalValue) - decimalToCents(novelty.paidValue); return <tr key={novelty.id}><td><strong>{novelty.rubricName}</strong></td><td>{novelty.startPeriod}</td><td>{applicationFormLabel(novelty)}</td><td className="numeric money">{money(novelty.totalValue)}</td><td className="numeric money">{money(novelty.paidValue)}</td><td className="numeric money"><strong>{money(pending)}</strong></td></tr>})}{!rows.length && <tr><td colSpan={6}><div className="empty-state compact"><CheckCircle2 /><strong>{employee ? 'Sin descuentos pendientes' : 'Selecciona un empleado'}</strong></div></td></tr>}</tbody>{rows.length > 0 && <tfoot><tr className="total-row"><td colSpan={5}><strong>Total pendiente</strong></td><td className="numeric money"><strong>{money(pendingTotal)}</strong></td></tr></tfoot>}</table></div>}</section>
}

function PossiblePersonnelLiquidationPage({ employees, employeeProfiles, contractHistory, historicalSalaries, sbuRecords, absences, vacationPendingRecords, vacationRequests, novelties, rubrics, definitive = false, exitReasons = [] }: { employees: Employee[]; employeeProfiles: Record<string, EmployeeProfile>; contractHistory: Record<string, ContractHistoryLine[]>; historicalSalaries: HistoricalSalaryRecord[]; sbuRecords: SbuRecord[]; absences: EmployeeAbsence[]; vacationPendingRecords: VacationPendingRecord[]; vacationRequests: VacationRequestRecord[]; novelties: PayrollNovelty[]; rubrics: CatalogRecord[]; definitive?: boolean; exitReasons?: CatalogRecord[] }) {
  const [employeeId, setEmployeeId] = useState('')
  const [possibleDate, setPossibleDate] = useState(currentEcuadorDate())
  const [exitReasonId, setExitReasonId] = useState('')
  const selectedEmployee = employees.find(employee => employee.id === employeeId)
  const validDate = isValidDisplayDate(possibleDate)
  const selectedContractHistory = selectedEmployee ? contractHistory[selectedEmployee.id] ?? [] : []
  const latestContractNumber = selectedContractHistory.length ? Math.max(...selectedContractHistory.map(line => line.contractNumber)) : undefined
  const latestContractLines = latestContractNumber === undefined ? [] : selectedContractHistory.filter(line => line.contractNumber === latestContractNumber)
  const latestContract = latestContractLines.reduce<ContractHistoryLine | undefined>((current, line) => current ? { ...current, ...line } : line, undefined)
  const latestContractStart = latestContractLines.map(line => parsePayrollDate(line.startDate)).filter((date): date is Date => Boolean(date)).sort((first, second) => first.getTime() - second.getTime())[0] ?? (selectedEmployee ? parsePayrollDate(selectedEmployee.startDate) : null)
  const latestContractStartLabel = latestContractStart ? `${String(latestContractStart.getUTCDate()).padStart(2, '0')}/${String(latestContractStart.getUTCMonth() + 1).padStart(2, '0')}/${latestContractStart.getUTCFullYear()}` : 'Sin fecha registrada'
  const latestContractHistory = selectedEmployee ? { ...contractHistory, [selectedEmployee.id]: latestContractLines } : contractHistory
  const concepts = ['Sueldo Pendiente', 'Décimo Tercero', 'Décimo Cuarto', 'Vacaciones', 'Fondo de Reserva', 'Desahucio', 'Indemnización', 'Discapacidad', 'Embarazo'] as const
  const nonProfessionalDiseaseConcept = 'Enfermedad No Profesional' as const
  const calculationConcepts = [...concepts, nonProfessionalDiseaseConcept] as const
  const scenarios = ['Renuncia Fin Mes Actual', 'Despido Fin Mes Actual', 'Renuncia a Fecha', 'Despido a Fecha'] as const
  type Scenario = typeof scenarios[number]
  type CalculationConcept = typeof calculationConcepts[number]
  const selectedExitReason = exitReasons.find(reason => reason.id === exitReasonId)
  const normalizedExitReason = `${selectedExitReason?.code ?? ''} ${selectedExitReason?.name ?? ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
  const definitiveScenario: Scenario = normalizedExitReason.includes('despido') ? 'Despido a Fecha' : 'Renuncia a Fecha'
  const isUntimelyDismissal = normalizedExitReason.includes('despido intempestivo')
  const excludesSeverance = normalizedExitReason.includes('fin de contrato') || normalizedExitReason.includes('visto bueno')
  const selectedLiquidationDate = validDate ? parsePayrollDate(possibleDate) : null
  const hasNonProfessionalDiseaseAbsence = Boolean(selectedEmployee && selectedLiquidationDate && absences.some(absence => {
    if (absence.employeeId !== selectedEmployee.id) return false
    const normalizedType = absence.absenceTypeName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es')
    if (!/^enfermedad(?: no profesional)?$/.test(normalizedType)) return false
    const absenceStart = parsePayrollDate(absence.startDate)
    const absenceEnd = parsePayrollDate(absence.endDate) ?? absenceStart
    return Boolean(absenceStart && absenceEnd && absenceStart <= selectedLiquidationDate && (!latestContractStart || absenceEnd >= latestContractStart))
  }))
  const showNonProfessionalDisease = hasNonProfessionalDiseaseAbsence && (!definitive || isUntimelyDismissal)
  const displayedConcepts: readonly CalculationConcept[] = showNonProfessionalDisease ? calculationConcepts : concepts
  const values = (() => {
    const empty = Object.fromEntries(calculationConcepts.map(concept => [concept, Object.fromEntries(scenarios.map(scenario => [scenario, 0n]))])) as Record<CalculationConcept, Record<Scenario, bigint>>
    if (!selectedEmployee || !validDate) return empty
    const possible = parsePayrollDate(possibleDate)
    if (!possible) return empty
    const monthEnd = new Date(Date.UTC(possible.getUTCFullYear(), possible.getUTCMonth() + 1, 0))
    const scenarioDate = (scenario: Scenario) => scenario.includes('Fin Mes') ? monthEnd : possible
    const salary = decimalToCents(latestContract?.salary ?? selectedEmployee.salary)
    const currentSbu = decimalToCents(findSbuForDate(sbuRecords, currentEcuadorDate())?.value ?? '0')
    const profile = employeeProfiles[selectedEmployee.id] ?? {}
    const serviceStart = latestContractStart
    const contractStartPeriod = serviceStart ? `${serviceStart.getUTCFullYear()}-${String(serviceStart.getUTCMonth() + 1).padStart(2, '0')}` : ''
    const currentContractVacationRecords = vacationPendingRecords.filter(record => record.employeeId === selectedEmployee.id && (!serviceStart || Number(record.generationYear) >= serviceStart.getUTCFullYear()))
    const importedPendingVacationDays = currentContractVacationRecords.length ? currentContractVacationRecords.reduce((sum, record) => sum + decimalToCents(record.totalPendingDays), 0n) : null
    const highestSalary = [salary, ...latestContractLines.map(line => decimalToCents(line.salary)), ...historicalSalaries.filter(record => record.identification === selectedEmployee.document && (!contractStartPeriod || record.period >= contractStartPeriod)).map(record => decimalToCents(record.salary))].reduce((highest, value) => value > highest ? value : highest, 0n)
    const monthsSincePreviousNovember = (date: Date) => {
      const year = date.getUTCFullYear(); const month = date.getUTCMonth() + 1
      const anchorYear = month > 11 ? year : year - 1
      const anchor = new Date(Date.UTC(anchorYear, 10, 1))
      if (!serviceStart || serviceStart <= anchor) return Math.max(0, year * 12 + month - (anchorYear * 12 + 11))
      if (date < serviceStart) return 0
      return Math.max(0, year * 12 + month - (serviceStart.getUTCFullYear() * 12 + serviceStart.getUTCMonth() + 1) + 1)
    }
    const workedDaysFromMonth = (anchorMonth: number, date: Date) => {
      const year = date.getUTCFullYear(); const month = date.getUTCMonth() + 1
      const anchorYear = month >= anchorMonth ? year : year - 1
      let cursorYear = anchorYear; let cursorMonth = anchorMonth; let total = 0
      while (cursorYear < year || (cursorYear === year && cursorMonth <= month)) {
        const period = `${cursorYear}-${String(cursorMonth).padStart(2, '0')}`
        const fullMonthDays = payrollWorkedDaysForMonth(selectedEmployee, period, latestContractHistory, absences)
        if (cursorYear === year && cursorMonth === month) {
          const calendarMonthEnd = new Date(Date.UTC(year, month, 0)).getUTCDate()
          const limit = date.getUTCDate() === calendarMonthEnd ? 30 : Math.min(date.getUTCDate(), 30)
          total += Math.min(fullMonthDays, limit)
        } else total += fullMonthDays
        cursorMonth += 1
        if (cursorMonth > 12) { cursorMonth = 1; cursorYear += 1 }
      }
      return total
    }
    const completeServiceYears = (date: Date) => {
      if (!serviceStart || date < serviceStart) return 0
      let years = date.getUTCFullYear() - serviceStart.getUTCFullYear()
      const anniversary = new Date(Date.UTC(date.getUTCFullYear(), serviceStart.getUTCMonth(), serviceStart.getUTCDate()))
      if (date < anniversary) years -= 1
      return Math.max(0, years)
    }
    const roundedServiceYears = (date: Date) => {
      if (!serviceStart || date < serviceStart) return 0
      const complete = completeServiceYears(date)
      const anniversary = new Date(Date.UTC(serviceStart.getUTCFullYear() + complete, serviceStart.getUTCMonth(), serviceStart.getUTCDate()))
      return complete + (date > anniversary ? 1 : 0)
    }
    const pendingVacationDays = (date: Date) => {
      if (importedPendingVacationDays !== null) return importedPendingVacationDays
      const completedYears = completeServiceYears(date)
      if (!serviceStart || completedYears < 1) return 0n
      const contractStartIso = `${serviceStart.getUTCFullYear()}-${String(serviceStart.getUTCMonth() + 1).padStart(2, '0')}-${String(serviceStart.getUTCDate()).padStart(2, '0')}`
      const latestPeriod = vacationPeriodFromStartYear(contractStartIso, serviceStart.getUTCFullYear() + completedYears - 1)
      const balance = vacationPendingBalance({ ...selectedEmployee, startDate: contractStartIso }, latestPeriod, vacationPendingRecords, vacationRequests)
      return decimalToCents(String(balance.normal + balance.additional))
    }
    const pregnancyApplies = (date: Date) => {
      if (!profile.pregnant || !profile.estimatedDeliveryDate) return false
      const registered = parsePayrollDate(profile.pregnancyRegisteredAt || currentEcuadorDate())
      const estimated = parsePayrollDate(profile.estimatedDeliveryDate)
      if (!registered || !estimated) return false
      const protectedUntil = new Date(estimated.getTime() + 84 * 86400000)
      return date >= registered && date <= protectedUntil
    }
    scenarios.forEach(scenario => {
      const date = scenarioDate(scenario)
      const dismissal = scenario.startsWith('Despido')
      const thirteenth = latestContract?.monthlyThirteenth ? (salary + 6n) / 12n : (salary * BigInt(monthsSincePreviousNovember(date)) + 6n) / 12n
      const fourteenthDays = latestContract?.monthlyFourteenth ? workedDaysFromMonth(date.getUTCMonth() + 1, date) : workedDaysFromMonth(latestContract?.region === 'SIERRA' ? 8 : 3, date)
      empty['Sueldo Pendiente'][scenario] = salary
      empty['Décimo Tercero'][scenario] = thirteenth
      empty['Décimo Cuarto'][scenario] = (currentSbu * BigInt(fourteenthDays) + 180n) / 360n
      empty.Vacaciones[scenario] = (salary * pendingVacationDays(date) + 1200n) / 2400n
      empty['Fondo de Reserva'][scenario] = latestContract?.monthlyReserveFunds ? (salary * 833n + 5000n) / 10000n : 0n
      empty.Desahucio[scenario] = (salary * BigInt(completeServiceYears(date)) + 2n) / 4n
      empty.Indemnización[scenario] = dismissal ? salary * BigInt(Math.max(3, roundedServiceYears(date))) : 0n
      empty.Discapacidad[scenario] = dismissal && latestContract?.hasDisability && decimalToCents(latestContract.disabilityPercentage ?? '0') >= 3000n ? highestSalary * 18n : 0n
      empty.Embarazo[scenario] = dismissal && pregnancyApplies(date) ? salary * 12n : 0n
      empty[nonProfessionalDiseaseConcept][scenario] = dismissal && hasNonProfessionalDiseaseAbsence ? salary * 6n : 0n
    })
    return empty
  })()
  const displayAmount = (value: bigint) => value === 0n ? '-' : money(value)
  const totals = Object.fromEntries(scenarios.map(scenario => [scenario, displayedConcepts.reduce((sum, concept) => sum + values[concept][scenario], 0n)])) as Record<Scenario, bigint>
  const definitiveValue = (concept: CalculationConcept) => concept === 'Desahucio' && excludesSeverance ? 0n : values[concept][definitiveScenario]
  const definitiveTotal = displayedConcepts.reduce((sum, concept) => sum + definitiveValue(concept), 0n)
  const ready = Boolean(selectedEmployee && validDate && (!definitive || exitReasonId))
  const screenTitle = definitive ? 'Liquidación de Personal' : 'Cálculo de Posible Liquidación'
  const calculationHeading = definitive ? 'Liquidación' : 'Posible Liquidación'
  return <>
    <PageHeader eyebrow={`Liquidación de Personal / ${screenTitle}`} title={screenTitle} description="" />
    <section className="panel possible-liquidation-filters"><div className="form-grid"><div className="field"><label htmlFor="possible-liquidation-employee">Empleado <span>Obligatorio</span></label><EmployeeFilterCombobox employees={employees} value={employeeId} onChange={setEmployeeId} /></div><div className="field"><label htmlFor="possible-liquidation-date">{definitive ? 'Fecha Liquidación' : 'Fecha Posible Liquidación'} <span>Obligatorio</span></label><input id="possible-liquidation-date" value={possibleDate} onChange={event => setPossibleDate(formatDisplayDateDraft(event.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} aria-invalid={!validDate} />{!validDate && <small className="field-error">Ingresa una fecha válida en formato DD/MM/AAAA.</small>}</div>{definitive && <div className="field"><label htmlFor="personnel-liquidation-exit-reason">Motivo de Salida <span>Obligatorio</span></label><select id="personnel-liquidation-exit-reason" value={exitReasonId} onChange={event => setExitReasonId(event.target.value)}><option value="">Selecciona una opción</option>{exitReasons.map(reason => <option value={reason.id} key={reason.id}>{reason.name}</option>)}</select></div>}</div></section>
    {ready && selectedEmployee ? <section className="panel table-panel"><div className="panel-heading table-title"><div><h2>{calculationHeading} de {selectedEmployee.name}</h2><p>{selectedEmployee.document} · Fecha Inicio: {latestContractStartLabel}</p></div></div><div className="table-scroll" role="region" aria-label={`${calculationHeading} de ${selectedEmployee.name}`} tabIndex={0}><table className="possible-liquidation-table"><thead><tr><th>Concepto</th>{definitive ? <th className="numeric">Valores</th> : scenarios.map(scenario => <th className="numeric" key={scenario}>{scenario}</th>)}</tr></thead><tbody>{displayedConcepts.map(concept => <tr key={concept} className={concept === nonProfessionalDiseaseConcept ? 'non-professional-disease-row' : undefined}><td><strong>{concept}</strong></td>{definitive ? <td className="numeric money">{displayAmount(definitiveValue(concept))}</td> : scenarios.map(scenario => <td className="numeric money" key={scenario}>{displayAmount(values[concept][scenario])}</td>)}</tr>)}<tr className="total-row"><td><strong>Total</strong></td>{definitive ? <td className="numeric money"><strong>{displayAmount(definitiveTotal)}</strong></td> : scenarios.map(scenario => <td className="numeric money" key={scenario}><strong>{displayAmount(totals[scenario])}</strong></td>)}</tr></tbody></table></div><div className="table-footer"><span>{displayedConcepts.length} conceptos</span></div></section> : <div className="empty-state history-selection-empty"><Calculator /><strong>{definitive ? 'Selecciona un empleado, una fecha válida y un motivo de salida' : 'Selecciona un empleado y una fecha válida'}</strong>{!definitive && <p>La comparación mostrará los escenarios de renuncia y despido.</p>}</div>}
    <PendingPersonnelDiscountsPanel employee={selectedEmployee} novelties={novelties} rubrics={rubrics} />
  </>
}

function PersonnelLiquidationPage({ screenKey, employees, employeeProfiles, catalogs, novelties, contractHistory, historicalSalaries, sbuRecords, absences, vacationPendingRecords, vacationRequests }: { screenKey: PersonnelLiquidationScreenKey; employees: Employee[]; employeeProfiles: Record<string, EmployeeProfile>; catalogs: Catalogs; novelties: PayrollNovelty[]; contractHistory: Record<string, ContractHistoryLine[]>; historicalSalaries: HistoricalSalaryRecord[]; sbuRecords: SbuRecord[]; absences: EmployeeAbsence[]; vacationPendingRecords: VacationPendingRecord[]; vacationRequests: VacationRequestRecord[] }) {
  if (screenKey === 'calculo-posible') return <PossiblePersonnelLiquidationPage employees={employees} employeeProfiles={employeeProfiles} contractHistory={contractHistory} historicalSalaries={historicalSalaries} sbuRecords={sbuRecords} absences={absences} vacationPendingRecords={vacationPendingRecords} vacationRequests={vacationRequests} novelties={novelties} rubrics={catalogs.rubros} />
  return <PossiblePersonnelLiquidationPage employees={employees} employeeProfiles={employeeProfiles} contractHistory={contractHistory} historicalSalaries={historicalSalaries} sbuRecords={sbuRecords} absences={absences} vacationPendingRecords={vacationPendingRecords} vacationRequests={vacationRequests} novelties={novelties} rubrics={catalogs.rubros} definitive exitReasons={catalogs['motivos-salida'].filter(reason => reason.status === 'ACTIVO')} />
}

function LiquidationModulePage({ screenKey, employees, complementaryEmployees, employeeProfiles, events, novelties, absences, catalogs, contractHistory, historicalSalaries, sbuRecords, iessPercentages, payrollLayoutOrders, setPayrollLayoutOrders, payrollLayoutEnabledIds, setPayrollLayoutEnabledIds, payrollPeriodOverrides, setPayrollPeriodOverrides, lastFortnightLiquidation, setLastFortnightLiquidation, lastMonthEndLiquidation, setLastMonthEndLiquidation, lastSocialBenefitLiquidation, setLastSocialBenefitLiquidation, lastProfitLiquidation, setLastProfitLiquidation, showToast }: { screenKey: LiquidationScreenKey; employees: Employee[]; complementaryEmployees: ComplementaryEmployee[]; employeeProfiles: Record<string, EmployeeProfile>; events: PayrollEvent[]; novelties: PayrollNovelty[]; absences: EmployeeAbsence[]; catalogs: Catalogs; contractHistory: Record<string, ContractHistoryLine[]>; historicalSalaries: HistoricalSalaryRecord[]; sbuRecords: SbuRecord[]; iessPercentages: IessPercentageRecord[]; payrollLayoutOrders: Record<PayrollLayoutKey, string[]>; setPayrollLayoutOrders: Dispatch<SetStateAction<Record<PayrollLayoutKey, string[]>>>; payrollLayoutEnabledIds: Record<PayrollLayoutKey, string[]>; setPayrollLayoutEnabledIds: Dispatch<SetStateAction<Record<PayrollLayoutKey, string[]>>>; payrollPeriodOverrides: Record<string, PayrollPeriodStatus>; setPayrollPeriodOverrides: Dispatch<SetStateAction<Record<string, PayrollPeriodStatus>>>; lastFortnightLiquidation: FortnightLiquidationSnapshot | null; setLastFortnightLiquidation: Dispatch<SetStateAction<FortnightLiquidationSnapshot | null>>; lastMonthEndLiquidation: MonthEndLiquidationSnapshot | null; setLastMonthEndLiquidation: Dispatch<SetStateAction<MonthEndLiquidationSnapshot | null>>; lastSocialBenefitLiquidation: SocialBenefitLiquidationSnapshot | null; setLastSocialBenefitLiquidation: Dispatch<SetStateAction<SocialBenefitLiquidationSnapshot | null>>; lastProfitLiquidation: ProfitLiquidationSnapshot | null; setLastProfitLiquidation: Dispatch<SetStateAction<ProfitLiquidationSnapshot | null>>; showToast: (message: string) => void }) {
  const config = liquidationScreenConfig[screenKey]
  const today = currentEcuadorYearMonth()
  const currentPeriodKey = `${today.year}-${String(today.month).padStart(2, '0')}`
  const explicitOpenPeriods = Object.entries(payrollPeriodOverrides).filter(([key, status]) => /^\d{4}-\d{2}$/.test(key) && status === 'ABIERTO').map(([key]) => key).sort()
  const openPeriodKeys = Array.from(new Set([...(payrollPeriodOverrides[currentPeriodKey] ?? 'ABIERTO') === 'ABIERTO' ? [currentPeriodKey] : [], ...explicitOpenPeriods])).sort()
  const openPeriodKey = openPeriodKeys[0] ?? ''
  const periodLabel = openPeriodKey ? `${payrollMonthNames[Number(openPeriodKey.slice(5, 7)) - 1]} ${openPeriodKey.slice(0, 4)}` : ''
  if (screenKey === 'configuracion-planilla') return <PayrollLayoutConfigurationPage catalogs={catalogs} orders={payrollLayoutOrders} setOrders={setPayrollLayoutOrders} enabledIds={payrollLayoutEnabledIds} setEnabledIds={setPayrollLayoutEnabledIds} showToast={showToast} />
  if (screenKey === 'periodos-habilitados') return <PayrollPeriodsPage overrides={payrollPeriodOverrides} setOverrides={setPayrollPeriodOverrides} showToast={showToast} />
  if (screenKey === 'quincena') return <FortnightLiquidationPage employees={employees} events={events} catalogs={catalogs} contractHistory={contractHistory} iessPercentages={iessPercentages} rubricOrder={payrollLayoutOrders.QUINCENA} enabledRubricIds={payrollLayoutEnabledIds.QUINCENA} openPeriods={openPeriodKeys} lastLiquidation={lastFortnightLiquidation} setLastLiquidation={setLastFortnightLiquidation} showToast={showToast} />
  if (screenKey === 'fin-mes') return <MonthEndLiquidationPage employees={employees} events={events} absences={absences} catalogs={catalogs} contractHistory={contractHistory} iessPercentages={iessPercentages} rubricOrder={payrollLayoutOrders.FIN_MES} enabledRubricIds={payrollLayoutEnabledIds.FIN_MES} openPeriods={openPeriodKeys} lastLiquidation={lastMonthEndLiquidation} setLastLiquidation={setLastMonthEndLiquidation} showToast={showToast} />
  if (screenKey === 'beneficios-sociales') return <SocialBenefitsLiquidationPage employees={employees} historicalSalaries={historicalSalaries} events={events} monthEndEnabledRubricIds={payrollLayoutEnabledIds.FIN_MES} novelties={novelties} absences={absences} catalogs={catalogs} contractHistory={contractHistory} sbuRecords={sbuRecords} lastLiquidation={lastSocialBenefitLiquidation} setLastLiquidation={setLastSocialBenefitLiquidation} showToast={showToast} />
  if (screenKey === 'utilidades') return <ProfitLiquidationPage employees={employees} complementaryEmployees={complementaryEmployees} employeeProfiles={employeeProfiles} novelties={novelties} absences={absences} catalogs={catalogs} contractHistory={contractHistory} payrollPeriodOverrides={payrollPeriodOverrides} lastLiquidation={lastProfitLiquidation} setLastLiquidation={setLastProfitLiquidation} showToast={showToast} />
  return <>
    <PageHeader eyebrow={`Liquidación de Valores / ${config.title}`} title={config.title} description={config.description} />
    <section className="panel preflight"><div className="preflight-icon"><Calculator /></div><h2>{config.title}</h2><p>La pantalla ya forma parte del módulo Liquidación de Valores y está preparada para incorporar su flujo funcional.</p><Badge tone="info">Pantalla disponible</Badge></section>
  </>
}

function PayrollPage({ employees, events, catalogs, rubricOrder, enabledRubricIds, periodOpen, periodLabel, showToast }: { employees: Employee[]; events: PayrollEvent[]; catalogs: Catalogs; rubricOrder: string[]; enabledRubricIds: string[]; periodOpen: boolean; periodLabel: string; showToast: (message: string) => void }) {
  const [calculated, setCalculated] = useState(false)
  const configuredRubrics = orderedPayrollRubrics(catalogs.rubros.filter(record => record.status === 'ACTIVO'), rubricOrder).filter(record => enabledRubricIds.includes(record.id))
  const rows = useMemo(() => employees.map(employee => {
    const eventCents = events.filter(event => event.employeeId === employee.id && event.status === 'APROBADA').reduce((sum, event) => sum + (event.kind === 'INGRESO' ? decimalToCents(event.amount) : -decimalToCents(event.amount)), 0n)
    const income = decimalToCents(employee.salary) + (eventCents > 0n ? eventCents : 0n)
    const otherDiscounts = eventCents < 0n ? -eventCents : 0n
    const deduction = decimalToCents(fixtureDeductions[employee.id] ?? '0.00') + otherDiscounts
    return { employee, income, deduction, net: income - deduction }
  }), [employees, events])
  const totals = rows.reduce((acc, row) => ({ income: acc.income + row.income, deduction: acc.deduction + row.deduction, net: acc.net + row.net }), { income: 0n, deduction: 0n, net: 0n })
  const payrollSort = useSortableRows(rows, { employee: row => row.employee.name, link: () => 'Propio', income: row => row.income, deduction: row => row.deduction, net: row => row.net, status: () => 'Simulado' })
  return <>
    <PageHeader eyebrow="Liquidación de Valores / Liquidación Fin de Mes" title="Liquidación Fin de Mes" description={`Nómina mensual · ${periodLabel || 'Sin período abierto'} · ${employees.length} empleados propios`} action={!calculated ? <button className="button primary" disabled={!periodOpen} title={!periodOpen ? 'No existe un período abierto' : undefined} onClick={() => { setCalculated(true); showToast('Simulación calculada con datos sintéticos.') }}><Calculator size={18} /> Calcular simulación</button> : <Badge tone="warning">En revisión</Badge>} />
    <div className="stepper" aria-label="Progreso de la corrida"><span className="done"><Check size={15} /> Captura</span><span className={calculated ? 'done' : 'current'}>{calculated && <Check size={15} />} Cálculo</span><span className={calculated ? 'current' : ''}>Revisión</span><span>Aprobación</span><span>Finalización</span></div>
    {!calculated ? <section className="preflight panel"><div className="preflight-icon"><Calculator /></div><h2>{periodOpen ? 'La simulación está lista para calcular' : 'La liquidación está bloqueada'}</h2><p>{periodOpen ? `Se usarán ${employees.length} empleados activos y ${events.filter(e => e.status === 'APROBADA').length} novedades aprobadas para ${periodLabel}.` : 'Abre un mes en Períodos Habilitados antes de ejecutar la liquidación de Fin de Mes.'}</p><div className="check-grid"><span><CheckCircle2 /> Datos maestros completos</span><span className={periodOpen ? '' : 'blocked'}>{periodOpen ? <CheckCircle2 /> : <AlertTriangle />} {periodOpen ? `Período ${periodLabel} abierto` : 'Sin período abierto'}</span><span><CheckCircle2 /> Novedades consistentes</span><span className="blocked"><AlertTriangle /> Reglas legales no homologadas</span></div><button className="button primary" disabled={!periodOpen} title={!periodOpen ? 'No existe un período abierto' : undefined} onClick={() => { setCalculated(true); showToast('Simulación calculada con datos sintéticos.') }}><Calculator size={18} /> Calcular simulación</button></section> : <>
      <div className="metric-grid"><Metric label="Ingresos del mes" value={totals.income} detail="Sueldo y novedades aprobadas" /><Metric label="Deducciones" value={totals.deduction} detail="Fixtures y descuentos autorizados" /><Metric label="Neto simulado" value={totals.net} detail="No constituye obligación de pago" accent /><Metric label="Diferencia" value={0n} detail="Control del conjunto" /></div>
      <div className="tabs" role="tablist" aria-label="Secciones de la revisión"><button className="active" role="tab" aria-selected="true">Resultados</button><button role="tab">Diferencias</button><button role="tab">Validaciones <span className="tab-count">1</span></button><button role="tab">Reglas</button><button role="tab">Auditoría</button></div>
      <section className="panel table-panel"><div className="panel-heading table-title"><div><h2>Resultados por empleado</h2><p>Todos los importes pertenecen a la misma revisión</p></div><span className="cell-meta">USD · revisión simulada</span></div><div className="table-scroll" role="region" aria-label="Resultados por empleado" tabIndex={0}><table><thead><tr><SortableTh label="Empleado" sortKey="employee" sort={payrollSort.sort} onSort={payrollSort.toggleSort} /><SortableTh label="Vínculo" sortKey="link" sort={payrollSort.sort} onSort={payrollSort.toggleSort} />{configuredRubrics.map(record => <th className="numeric" key={record.id}>{record.name}</th>)}<SortableTh label="Ingresos" sortKey="income" sort={payrollSort.sort} onSort={payrollSort.toggleSort} className="numeric" /><SortableTh label="Deducciones" sortKey="deduction" sort={payrollSort.sort} onSort={payrollSort.toggleSort} className="numeric" /><SortableTh label="Neto" sortKey="net" sort={payrollSort.sort} onSort={payrollSort.toggleSort} className="numeric" /><SortableTh label="Estado" sortKey="status" sort={payrollSort.sort} onSort={payrollSort.toggleSort} /></tr></thead><tbody>{payrollSort.sortedRows.map(row => <tr key={row.employee.id}><td><strong>{row.employee.name}</strong><span className="cell-meta">{row.employee.id}</span></td><td><Badge tone="info">Propio</Badge></td>{configuredRubrics.map(record => { const matchingEvent = events.find(event => event.employeeId === row.employee.id && event.status === 'APROBADA' && event.concept.localeCompare(record.name, 'es', { sensitivity: 'base' }) === 0); return <td className="numeric" key={record.id}>{matchingEvent ? money(matchingEvent.amount) : '-'}</td> })}<td className="numeric money">{money(row.income)}</td><td className="numeric money">{money(row.deduction)}</td><td className="numeric money strong">{money(row.net)}</td><td><Badge tone="warning">Simulado</Badge></td></tr>)}<tr className="total-row"><td>Total conjunto</td><td>{rows.length} personas</td>{configuredRubrics.map(record => <td key={record.id} />)}<td className="numeric money">{money(totals.income)}</td><td className="numeric money">{money(totals.deduction)}</td><td className="numeric money">{money(totals.net)}</td><td /></tr></tbody></table></div><div className="table-footer"><span>1–{rows.length} de {rows.length} · Total del conjunto</span><span>Columnas según Configuración Planilla de Rol</span></div></section>
      <section className="review-panel panel"><div><h2>Antes de aprobar</h2><div className="review-checks"><span><CheckCircle2 /> Cifras conciliadas</span><span><CheckCircle2 /> Fuentes verificadas</span><span className="warning-text"><AlertTriangle /> Reglas legales pendientes</span></div></div><button className="button primary" disabled title="Requiere homologación y aprobador independiente"><ShieldCheck size={18} /> Aprobar revisión</button></section>
      <div className="notice info"><ShieldCheck size={20} /><div><strong>La aprobación productiva permanece bloqueada</strong><p>Esta revisión sirve para validar el flujo. No crea una obligación ni confirma un desembolso.</p></div></div>
    </>}
  </>
}

function Metric({ label, value, detail, accent }: { label: string; value: bigint; detail: string; accent?: boolean }) {
  return <article className={`metric ${accent ? 'accent' : ''}`}><p>{label}</p><strong>{money(value)}</strong><span>{detail}</span></article>
}

function Badge({ tone, children }: { tone: 'success' | 'warning' | 'info' | 'neutral' | 'simulation'; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>
}

function CurrentUserProfileContent({ employee, profile, catalogs, onSave, idPrefix }: { employee: Employee; profile: EmployeeProfile; catalogs: Catalogs; onSave: (profile: Partial<EmployeeProfile>) => void; idPrefix: string }) {
  const [activeTab, setActiveTab] = useState<'personal' | 'location'>('personal')
  const [photoError, setPhotoError] = useState('')
  const initials = employee.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const selectPhoto = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setPhotoError('Selecciona una imagen válida.'); return }
    if (file.size > 1_500_000) { setPhotoError('La fotografía debe pesar máximo 1,5 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => { setPhotoError(''); onSave({ photoName: file.name, photoDataUrl: String(reader.result) }) }
    reader.onerror = () => setPhotoError('No fue posible leer la fotografía seleccionada.')
    reader.readAsDataURL(file)
  }
  const personalTabId = `${idPrefix}-personal-tab`
  const locationTabId = `${idPrefix}-location-tab`
  const personalPanelId = `${idPrefix}-personal-panel`
  const locationPanelId = `${idPrefix}-location-panel`
  return <>
    <div className="current-user-profile-hero"><div className="current-user-profile-photo">{profile.photoDataUrl ? <img src={profile.photoDataUrl} alt="Fotografía del usuario" /> : <span>{initials}</span>}</div><div><strong>{employee.name}</strong><span>{employee.role}</span><label className="button secondary"><Upload size={17} /> Subir nueva foto<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => selectPhoto(event.target.files?.[0])} /></label>{profile.photoName && <small>{profile.photoName}</small>}{photoError && <small className="field-error">{photoError}</small>}</div></div>
    <div className="profile-dialog-tabs" role="tablist" aria-label="Secciones de Mi Perfil"><button id={personalTabId} type="button" role="tab" aria-selected={activeTab === 'personal'} aria-controls={personalPanelId} className={activeTab === 'personal' ? 'active' : ''} onClick={() => setActiveTab('personal')}>Datos Personales</button><button id={locationTabId} type="button" role="tab" aria-selected={activeTab === 'location'} aria-controls={locationPanelId} className={activeTab === 'location' ? 'active' : ''} onClick={() => setActiveTab('location')}>Ubicabilidad</button></div>
    <div className="current-user-profile-content">{activeTab === 'personal' ? <PersonalDataForm employee={employee} profile={profile} catalogs={catalogs} onSave={onSave} dependentsReadOnly panelProps={{ id: personalPanelId, role: 'tabpanel', 'aria-labelledby': personalTabId }} /> : <LocationForm employee={employee} profile={profile} onSave={onSave} panelProps={{ id: locationPanelId, role: 'tabpanel', 'aria-labelledby': locationTabId }} />}</div>
  </>
}

function PersonalProfilePage({ employee, profile, catalogs, onSave }: { employee: Employee; profile: EmployeeProfile; catalogs: Catalogs; onSave: (profile: Partial<EmployeeProfile>) => void }) {
  return <>
    <PageHeader eyebrow="Información Personal / Mi Perfil" title="Mi Perfil" description="" />
    <section className="panel current-user-profile-page"><CurrentUserProfileContent employee={employee} profile={profile} catalogs={catalogs} onSave={onSave} idPrefix="personal-profile-page" /></section>
  </>
}

function CurrentUserProfileDialog({ employee, profile, catalogs, onClose, onSave }: { employee: Employee; profile: EmployeeProfile; catalogs: Catalogs; onClose: () => void; onSave: (profile: Partial<EmployeeProfile>) => void }) {
  return <Dialog title="Mi Perfil" description={employee.name} onClose={onClose} className="current-user-profile-dialog"><CurrentUserProfileContent employee={employee} profile={profile} catalogs={catalogs} onSave={onSave} idPrefix="profile-dialog" /></Dialog>
}

function ChangePasswordDialog({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentPassword || newPassword.length < 8) { setError('Ingresa la contraseña actual y una nueva contraseña de mínimo 8 caracteres.'); return }
    if (newPassword !== confirmation) { setError('La confirmación no coincide con la nueva contraseña.'); return }
    onSave()
  }
  return <Dialog title="Cambiar Contraseña" description="Actualiza la contraseña utilizada para ingresar a la plataforma." onClose={onClose}><form onSubmit={submit} noValidate>{error && <div className="form-error" role="alert"><strong>No se puede cambiar la contraseña.</strong><span>{error}</span></div>}<div className="form-grid">
    <div className="field full-width-field"><label htmlFor="current-password">Contraseña actual <span>Obligatorio</span></label><input id="current-password" type="password" value={currentPassword} onChange={event => { setCurrentPassword(event.target.value); setError('') }} autoComplete="current-password" /></div>
    <div className="field"><label htmlFor="new-password">Nueva contraseña <span>Obligatorio</span></label><input id="new-password" type="password" value={newPassword} onChange={event => { setNewPassword(event.target.value); setError('') }} minLength={8} autoComplete="new-password" /></div>
    <div className="field"><label htmlFor="confirm-password">Confirmar contraseña <span>Obligatorio</span></label><input id="confirm-password" type="password" value={confirmation} onChange={event => { setConfirmation(event.target.value); setError('') }} minLength={8} autoComplete="new-password" /></div>
  </div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary"><Check size={17} /> Guardar contraseña</button></div></form></Dialog>
}

function Dialog({ title, description, children, onClose, className = '' }: { title: string; description: string; children: ReactNode; onClose: () => void; className?: string }) {
  return <div className="modal-layer" role="presentation"><div className={`dialog ${className}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="dialog-head"><div><h2 id="dialog-title">{title}</h2><p>{description}</p></div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X /></button></div>{children}</div></div>
}

function CatalogDialog({ catalogKey, record, onClose, onSave }: { catalogKey: CatalogKey; record?: CatalogRecord; onClose: () => void; onSave: (record: CatalogRecord) => void }) {
  const config = catalogConfig[catalogKey]
  const [receivesThirteenth, setReceivesThirteenth] = useState(record?.receivesThirteenth ?? true)
  const [receivesFourteenth, setReceivesFourteenth] = useState(record?.receivesFourteenth ?? true)
  const [receivesReserveFunds, setReceivesReserveFunds] = useState(record?.receivesReserveFunds ?? true)
  const [receivesProfits, setReceivesProfits] = useState(record?.receivesProfits ?? true)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const prefix: Record<CatalogKey, string> = { departamentos: 'DEP', cargos: 'CAR', rubros: 'RUB', 'grupos-nomina': 'GNO', 'tipos-nomina': 'TNO', 'tipos-contrato': 'TCO', 'motivos-salida': 'MSA', 'tipos-parentesco': 'PAR', 'tipos-ausencia': 'AUS' }
    const name = String(data.get('name')).trim()
    const generatedCode = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toUpperCase()
    const hidesDescription = catalogKey === 'tipos-nomina' || catalogKey === 'grupos-nomina' || catalogKey === 'motivos-salida'
    onSave({ id: record?.id ?? `${prefix[catalogKey]}-${String(Date.now()).slice(-4)}`, code: record?.code ?? generatedCode, name, description: hidesDescription ? record?.description ?? '' : String(data.get('description') ?? '').trim(), status: String(data.get('status') ?? 'ACTIVO') as CatalogRecord['status'], ...(catalogKey === 'cargos' ? { receivesThirteenth, receivesFourteenth, receivesReserveFunds, receivesProfits } : {}) })
  }
  const showDescription = catalogKey !== 'tipos-nomina' && catalogKey !== 'grupos-nomina' && catalogKey !== 'motivos-salida'
  return <Dialog title={`${record ? 'Editar' : 'Nuevo'} ${config.singular}`} description={record ? `Actualiza la información de ${record.name}.` : `Agrega un registro al catálogo de ${config.title.toLowerCase()}.`} onClose={onClose}><form onSubmit={submit}><div className="form-grid"><Field label="Nombre" name="name" required placeholder={`Nombre del ${config.singular}`} defaultValue={record?.name} /></div>{showDescription && <div className="field"><label htmlFor="description">Descripción</label><input id="description" name="description" type="text" defaultValue={record?.description} placeholder="Descripción breve del uso" /></div>}<div className="field"><label htmlFor="catalog-status">Estado <span>Obligatorio</span></label><select id="catalog-status" name="status" defaultValue={record?.status ?? 'ACTIVO'}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></div>{catalogKey === 'cargos' && <section className="catalog-benefits-section"><div><h3>Beneficios asociados al cargo</h3><p>Define los beneficios que reciben los trabajadores asignados a este cargo.</p></div><div className="toggle-grid"><ToggleField id="cargo-thirteenth" label="Décimo Tercero" checked={receivesThirteenth} onChange={setReceivesThirteenth} /><ToggleField id="cargo-fourteenth" label="Décimo Cuarto" checked={receivesFourteenth} onChange={setReceivesFourteenth} /><ToggleField id="cargo-reserve-funds" label="Fondos de Reserva" checked={receivesReserveFunds} onChange={setReceivesReserveFunds} /><ToggleField id="cargo-profits" label="Utilidades" checked={receivesProfits} onChange={setReceivesProfits} /></div></section>}<div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">{record ? 'Guardar cambios' : `Guardar ${config.singular}`}</button></div></form></Dialog>
}

function EmployeeDialog({ onClose, onSave }: { onClose: () => void; onSave: (e: Employee) => void }) {
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const salary = String(data.get('salary'))
    if (decimalToCents(salary) <= 0n) { setError('Ingresa un sueldo mensual válido con máximo dos decimales.'); return }
    const suffix = String(Date.now()).slice(-4)
    onSave({ id: `EMP-${suffix}`, document: String(data.get('document')), name: String(data.get('name')), role: String(data.get('role')), area: String(data.get('area')), salary: centsToDecimal(decimalToCents(salary)), status: 'ACTIVO', startDate: String(data.get('startDate')) })
  }
  return <Dialog title="Nuevo empleado" description="Registra datos sintéticos para validar el flujo." onClose={onClose}><form onSubmit={submit}>{error && <div className="form-error" role="alert">{error}</div>}<div className="form-grid"><Field label="Nombres completos" name="name" required /><Field label="Cédula" name="document" required pattern="[0-9]{10}" /><Field label="Cargo" name="role" required /><Field label="Área" name="area" required /><Field label="Fecha de ingreso" name="startDate" type="date" required /><Field label="Sueldo mensual (USD)" name="salary" inputMode="decimal" placeholder="0,00" required /></div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">Guardar empleado</button></div></form></Dialog>
}

function EventDialog({ employees, onClose, onSave }: { employees: Employee[]; onClose: () => void; onSave: (e: PayrollEvent) => void }) {
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const amount = String(data.get('amount'))
    if (decimalToCents(amount) <= 0n) { setError('Ingresa un importe válido con máximo dos decimales.'); return }
    onSave({ id: `NOV-${String(Date.now()).slice(-4)}`, employeeId: String(data.get('employeeId')), concept: String(data.get('concept')), date: String(data.get('date')), amount: centsToDecimal(decimalToCents(amount)), kind: String(data.get('kind')) as PayrollEvent['kind'], status: 'BORRADOR' })
  }
  return <Dialog title="Registrar novedad" description="La novedad se guardará como borrador." onClose={onClose}><form onSubmit={submit}>{error && <div className="form-error" role="alert">{error}</div>}<div className="field full"><label htmlFor="employeeId">Empleado <span>Obligatorio</span></label><select id="employeeId" name="employeeId" required><option value="">Selecciona un empleado</option>{employees.map(employee => <option value={employee.id} key={employee.id}>{employee.name}</option>)}</select></div><div className="form-grid"><Field label="Concepto" name="concept" required /><div className="field"><label htmlFor="kind">Tipo <span>Obligatorio</span></label><select id="kind" name="kind" required><option value="INGRESO">Ingreso</option><option value="DESCUENTO">Descuento</option></select></div><Field label="Fecha" name="date" type="date" required /><Field label="Importe (USD)" name="amount" inputMode="decimal" placeholder="0,00" required /></div><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary">Guardar borrador</button></div></form></Dialog>
}

function Field(props: { label: string; name: string; type?: string; required?: boolean; pattern?: string; placeholder?: string; inputMode?: 'decimal' | 'numeric'; defaultValue?: string; value?: string; onChange?: (value: string) => void }) {
  return <div className="field"><label htmlFor={props.name}>{props.label}{props.required && <span>Obligatorio</span>}</label><input id={props.name} name={props.name} type={props.type ?? 'text'} required={props.required} pattern={props.pattern} placeholder={props.placeholder} inputMode={props.inputMode} defaultValue={props.defaultValue} value={props.value} onChange={props.onChange ? event => props.onChange?.(event.target.value) : undefined} /></div>
}

function EmployeeDrawer({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  return <div className="drawer-layer" role="presentation"><button className="drawer-scrim" aria-label="Cerrar expediente" onClick={onClose} /><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><div className="drawer-head"><div><p>Expediente laboral</p><h2 id="drawer-title">{employee.name}</h2></div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X /></button></div><div className="drawer-body"><div className="person-card"><div className="person-avatar">{employee.name.split(' ').slice(0, 2).map(part => part[0]).join('')}</div><div><strong>{employee.role}</strong><p>{employee.area} · {employee.id}</p><Badge tone="success">Activo</Badge></div></div><h3>Información vigente</h3><dl className="detail-list"><div><dt>Cédula</dt><dd>{employee.document}</dd></div><div><dt>Fecha de ingreso</dt><dd>{employee.startDate}</dd></div><div><dt>Sueldo mensual</dt><dd className="money">{money(employee.salary)}</dd></div><div><dt>Vínculo</dt><dd>Empleado propio</dd></div></dl><div className="notice info"><ShieldCheck size={20} /><div><strong>Datos de demostración</strong><p>No usar este expediente para decisiones laborales reales.</p></div></div></div><div className="drawer-foot"><button className="button secondary full" onClick={onClose}>Cerrar expediente</button></div></aside></div>
}

export default PayrollSuite
