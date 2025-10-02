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
  name: string
  logo?: string
  primaryColor: string
  // Costa Rica e-invoicing v4.4 fields
  legalName: string
  taxId: string // Cédula Jurídica
  commercialActivity: string
  province: string
  canton: string
  district: string
  address: string
  phone: string
  email: string
  // System fields
  ownerId: string
  collaborators: string[]
  createdAt: Date
  updatedAt: Date
}

export interface UserTenantRole {
  userId: string
  tenantId: string
  role: "owner" | "admin" | "collaborator"
}
