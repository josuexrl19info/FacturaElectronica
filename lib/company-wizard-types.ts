/**
 * Tipos para el wizard de creación de empresas
 */

export interface CompanyWizardData {
  // Paso 1: Información Personal
  personalInfo: {
    legalName: string // Razón Social
    commercialName: string // Nombre Comercial
    taxIdType: 'fisica' | 'juridica' // Tipo de Cédula
    taxId: string // Cédula
    email: string // Correo
    phone: string // Teléfono con código país
    province: string // Provincia
    canton: string // Cantón
    district: string // Distrito
    barrio?: string // Barrio (opcional)
    logo?: File | null // Logo de la empresa
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
  validFrom?: Date
  validTo?: Date
  matchesTaxId?: boolean
}
