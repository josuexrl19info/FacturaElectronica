/**
 * Tipos para el wizard de creación de empresas
 */

// Tipo para manejar tanto archivos nuevos como datos existentes
export type LogoData = File | {
  fileName: string
  type: string
  size: number
  fileData?: string
} | null

export interface CompanyWizardData {
  // Paso 1: Información Personal
  personalInfo: {
    legalName: string // Razón Social
    name: string // Nombre Comercial
    taxIdType: 'fisica' | 'juridica' // Tipo de Cédula
    taxId: string // Cédula
    email: string // Correo
    phone: string // Número de teléfono
    phoneCountryCode: string // Código de país del teléfono
    province: string // Provincia
    canton: string // Cantón
    district: string // Distrito
    barrio?: string // Barrio (opcional)
    logo?: LogoData // Logo de la empresa
    economicActivity?: EconomicActivity // Actividad económica seleccionada
  }
  
  // Paso 2: Credenciales ATV
  atvCredentials: {
    username: string // Usuario ATV
    password: string // Password ATV
    clientId: string // Client ID
    receptionUrl: string // URL de recepción
    loginUrl: string // URL de login
  }
  
  // Paso 3: Certificado Digital
  certificate: {
    p12File: File | null // Archivo .p12
    password: string // Clave del certificado
    certificateInfo?: {
      subject: string
      issuer: string
      serialNumber: string
      validFrom: string
      validTo: string
    }
  }
}

export interface ValidationResult {
  isValid: boolean
  message: string
  errors?: string[]
}

export interface ATVValidationResult extends ValidationResult {
  token?: string
  expiresAt?: Date
}

export interface CertificateValidationResult extends ValidationResult {
  subject?: string
  issuer?: string
  validFrom?: Date | string
  validTo?: Date | string
  matchesTaxId?: boolean
  certificateInfo?: {
    subject: string
    issuer: string
    validFrom: string
    validTo: string
    serialNumber: string
  }
}

// Tipos para la API de Hacienda
export interface EconomicActivity {
  estado: string // "A" = Activa, otros = Inactiva
  tipo: string // "P" = Principal, "S" = Secundaria
  codigo: string // Código de la actividad económica
  descripcion: string // Descripción de la actividad
}

export interface HaciendaCompanyInfo {
  nombre: string // Nombre de la empresa
  tipoIdentificacion: string // Tipo de identificación
  regimen: {
    codigo: number
    descripcion: string
  }
  situacion: {
    moroso: string
    omiso: string
    estado: string
    administracionTributaria: string
  }
  actividades: EconomicActivity[]
}
