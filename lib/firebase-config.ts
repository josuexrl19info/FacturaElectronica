// Firebase configuration and initialization
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Types for the multi-tenant system based on actual Firestore structure
export interface User {
  id: string
  email: string
  name: string
  status: 'active' | 'inactive' | 'suspended'
  roleId: string
  tenantId: string
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  profileImage?: string
  role: {
    name: string
    permissions: string[]
  }
  profile: {
    preferences: {
      notifications: boolean
      language: string
      timezone: string
    }
  }
}

export interface Tenant {
  id: string
  name: string // Razón Social
  nombreComercial: string // Nombre Comercial
  identification: string // Cédula/Jurídica (ej: "3102867860")
  identificationType: string // Tipo de identificación (ej: "02" para jurídica)
  phone: string // Teléfono sin código país
  phoneCountryCode: string // Código de país (ej: "506")
  email: string
  province: string // Código de provincia (ej: "3")
  canton: string // Código de cantón (ej: "302")
  district: string // Código de distrito (ej: "30205")
  barrio: string // Barrio (puede estar vacío)
  otrasSenas: string // Dirección específica
  brandColor: string // Color de marca (ej: "#314e7c")
  status: string // Estado de la empresa (ej: "Activa")
  isDefault: boolean // Si es la empresa por defecto
  tenantId: string // ID del tenant (diferente al ID del documento)
  proveedorSistemas: string // Proveedor de sistemas
  registroFiscal8707: string // Registro fiscal 8707
  
  // Logo como objeto con metadata
  logo?: {
    fileName: string
    type: string
    size: number
    fileData: string // Base64 del archivo
  }
  
  // Actividad económica
  economicActivity: {
    codigo: string // Código de actividad económica
    descripcion: string // Descripción de la actividad
    estado: string // Estado de la actividad
  }
  
  // Credenciales ATV (Hacienda)
  atvCredentials: {
    username: string // Usuario ATV
    password: string // Password (sin encriptar en el ejemplo)
    clientId: string // Client ID para API
    environment: string // Entorno (ej: "sandbox")
    receptionUrl: string // URL de recepción
    authUrl: string // URL de autenticación
  }
  
  // Certificado digital
  certificadoDigital: {
    fileName: string // Nombre del archivo .p12
    password: string // Clave del certificado (sin encriptar en el ejemplo)
    fileData: string // Base64 del certificado
    subject: string // Sujeto del certificado
    issuer: string // Emisor del certificado
    serialNumber: string // Número de serie
    validFrom: string // Válido desde (ISO string)
    validTo: string // Válido hasta (ISO string)
    isActive: boolean // Si el certificado está activo
  }
  
  // Campos del sistema
  createdBy: string // ID del usuario que creó la empresa
  updatedBy: string // ID del usuario que actualizó la empresa
  createdAt: Date
  updatedAt: Date
}

export interface UserTenantRole {
  userId: string
  tenantId: string
  role: "owner" | "admin" | "collaborator"
}
