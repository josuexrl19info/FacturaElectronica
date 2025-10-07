/**
 * Tipos para el wizard de creación de clientes
 * Basado en la estructura real de la colección 'clients' en Firestore
 */

export interface ClientWizardData {
  // Paso 1: Información General del Cliente
  generalInfo: {
    name: string // Nombre completo o razón social
    commercialName: string // Nombre comercial
    identification: string // Cédula física o jurídica
    identificationType: string // "01" = física, "02" = jurídica
    email: string
    phone: string
    phoneCountryCode?: string // Código de país (ej: "506")
  }
  
  // Paso 2: Actividad Económica
  economicActivity: {
    codigo: string // Código de actividad económica
    descripcion: string // Descripción de la actividad
    estado: string // Estado de la actividad (ej: "A" = activa)
  }
  
  // Paso 3: Ubicación
  location: {
    province: string // Código de provincia (ej: "3")
    canton: string // Código de cantón (ej: "303")
    district: string // Código de distrito (ej: "30301")
    otrasSenas: string // Dirección específica
  }
  
  // Paso 4: Exoneraciones (Opcional)
  exemption?: {
    isExempt: boolean // Si tiene exoneración
    exemptionType: string // Tipo de exoneración (ej: "03")
    documentNumber: string // Número de documento de exoneración
    documentDate: string // Fecha del documento (YYYY-MM-DD)
    institutionName: string // Código de institución
    institutionNameOthers: string // Nombre de institución si es "99" (otros)
    tariffExempted: number // Porcentaje de tarifa exonerada
    observations: string // Observaciones adicionales
  }
  
  // Campos adicionales del sistema
  companyIds: string[] // IDs de empresas asociadas
  status: string // Estado del cliente (ej: "active")
  totalAmount: number // Monto total facturado
  totalInvoices: number // Número total de facturas
}

export interface ClientFormData {
  // Información general
  name: string
  commercialName: string
  identification: string
  identificationType: string
  email: string
  phone: string
  phoneCountryCode: string
  
  // Ubicación
  province: string
  canton: string
  district: string
  otrasSenas: string
  
  // Actividad económica
  economicActivity: {
    codigo: string
    descripcion: string
    estado: string
  }
  
  // Exoneración
  hasExemption: boolean
  exemptionType: string
  exemptionDocumentNumber: string
  exemptionDocumentDate: string
  exemptionInstitution: string
  exemptionInstitutionOthers: string
  exemptionTariff: number
  exemptionObservations: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// Tipos para las opciones de selección
export interface IdentificationType {
  value: string
  label: string
  description: string
}

export interface ExemptionType {
  value: string
  label: string
  description: string
}

export interface InstitutionType {
  value: string
  label: string
}

// Constantes para los tipos de identificación
export const IDENTIFICATION_TYPES: IdentificationType[] = [
  {
    value: "01",
    label: "Cédula Física",
    description: "Persona física costarricense"
  },
  {
    value: "02", 
    label: "Cédula Jurídica",
    description: "Persona jurídica costarricense"
  }
]

// Constantes para los tipos de exoneración
export const EXEMPTION_TYPES: ExemptionType[] = [
  {
    value: "01",
    label: "Exoneración por Ley",
    description: "Exoneración establecida por ley"
  },
  {
    value: "02",
    label: "Exoneración por Decreto",
    description: "Exoneración establecida por decreto ejecutivo"
  },
  {
    value: "03",
    label: "Exoneración por Convenio",
    description: "Exoneración establecida por convenio internacional"
  },
  {
    value: "04",
    label: "Exoneración por Resolución",
    description: "Exoneración establecida por resolución"
  }
]

// Constantes para las instituciones
export const INSTITUTION_TYPES: InstitutionType[] = [
  { value: "01", label: "Ministerio de Hacienda" },
  { value: "02", label: "Ministerio de Comercio Exterior" },
  { value: "03", label: "Ministerio de Salud" },
  { value: "04", label: "Ministerio de Educación" },
  { value: "05", label: "Ministerio de Trabajo" },
  { value: "06", label: "Instituto Costarricense de Electricidad" },
  { value: "07", label: "Instituto Nacional de Seguros" },
  { value: "08", label: "Banco Central de Costa Rica" },
  { value: "09", label: "Instituto Nacional de Aprendizaje" },
  { value: "10", label: "Instituto Costarricense de Acueductos y Alcantarillados" },
  { value: "99", label: "Otros" }
]
