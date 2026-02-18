/**
 * Servicio para gestión de tenants (licencias)
 * Maneja la creación, actualización y consulta de tenants en Firestore
 */

import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  serverTimestamp,
  DocumentData
} from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

/**
 * Interfaz para Tenant (Licencia)
 * Basada en la estructura real de Firestore
 */
export interface Tenant {
  id: string
  name: string  // Nombre de la licencia/tenant
  status: 'active' | 'inactive' | 'suspended' | 'trial'
  plan?: 'basic' | 'premium' | 'enterprise'
  
  // Información del propietario
  ownerName?: string
  ownerEmail?: string
  ownerPhone?: string
  
  // Configuración de límites
  maxCompanies?: number
  maxUsers?: number
  maxDocumentsPerMonth?: number
  
  // Estadísticas (para contabilización)
  documentsThisMonth?: number
  documentsLastMonth?: number
  totalDocuments?: number
  lastDocumentDate?: Date
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  notes?: string
  tags?: string[]
  
  // Campos adicionales que puedan existir en Firestore
  [key: string]: any
}

export interface CreateTenantRequest {
  name: string
  ownerName: string
  ownerEmail: string
  ownerPhone?: string
  plan?: 'basic' | 'premium' | 'enterprise'
  status?: 'active' | 'inactive' | 'suspended' | 'trial'
  maxCompanies?: number
  maxUsers?: number
  maxDocumentsPerMonth?: number
  notes?: string
  tags?: string[]
  createdBy: string
}

export interface UpdateTenantRequest {
  id: string
  updates: Partial<Omit<Tenant, 'id' | 'createdAt' | 'createdBy'>>
}

export class TenantService {
  private static readonly COLLECTION_NAME = 'tenants'

  /**
   * Obtiene un tenant por ID
   */
  static async getTenantById(id: string): Promise<Tenant | null> {
    try {
      const tenantRef = doc(db, this.COLLECTION_NAME, id)
      const tenantSnap = await getDoc(tenantRef)

      if (!tenantSnap.exists()) {
        return null
      }

      return this.convertFirestoreToTenant(tenantSnap.id, tenantSnap.data())
    } catch (error) {
      console.error('Error getting tenant:', error)
      throw error
    }
  }

  /**
   * Obtiene todos los tenants
   */
  static async getAllTenants(status?: string): Promise<Tenant[]> {
    try {
      const tenantsRef = collection(db, this.COLLECTION_NAME)
      let q = query(tenantsRef, orderBy('createdAt', 'desc'))

      if (status) {
        q = query(tenantsRef, where('status', '==', status), orderBy('createdAt', 'desc'))
      }

      const querySnapshot = await getDocs(q)
      const tenants: Tenant[] = []

      querySnapshot.forEach((doc) => {
        tenants.push(this.convertFirestoreToTenant(doc.id, doc.data()))
      })

      return tenants
    } catch (error) {
      console.error('Error getting tenants:', error)
      throw error
    }
  }

  /**
   * Crea un nuevo tenant
   */
  static async createTenant(request: CreateTenantRequest): Promise<string> {
    try {
      const {
        name,
        ownerName,
        ownerEmail,
        ownerPhone,
        plan = 'basic',
        status = 'active',
        maxCompanies,
        maxUsers,
        maxDocumentsPerMonth,
        notes,
        tags,
        createdBy
      } = request

      // Validaciones
      if (!name || !ownerName || !ownerEmail) {
        throw new Error('Faltan campos requeridos: name, ownerName, ownerEmail')
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(ownerEmail)) {
        throw new Error('El formato del correo electrónico no es válido')
      }

      const tenantData = {
        name,
        ownerName,
        ownerEmail,
        ownerPhone: ownerPhone || null,
        plan,
        status,
        maxCompanies: maxCompanies || null,
        maxUsers: maxUsers || null,
        maxDocumentsPerMonth: maxDocumentsPerMonth || null,
        documentsThisMonth: 0,
        documentsLastMonth: 0,
        totalDocuments: 0,
        lastDocumentDate: null,
        notes: notes || null,
        tags: tags || [],
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const tenantsRef = collection(db, this.COLLECTION_NAME)
      const docRef = await addDoc(tenantsRef, tenantData)

      return docRef.id
    } catch (error) {
      console.error('Error creating tenant:', error)
      throw error
    }
  }

  /**
   * Actualiza un tenant
   */
  static async updateTenant(request: UpdateTenantRequest): Promise<void> {
    try {
      const { id, updates } = request

      const tenantRef = doc(db, this.COLLECTION_NAME, id)
      
      // Verificar que existe
      const tenantSnap = await getDoc(tenantRef)
      if (!tenantSnap.exists()) {
        throw new Error('Tenant no encontrado')
      }

      // Validar email si se está actualizando
      if (updates.ownerEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(updates.ownerEmail)) {
          throw new Error('El formato del correo electrónico no es válido')
        }
      }

      // Preparar actualización
      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp()
      }

      // Remover campos que no deben actualizarse
      delete updateData.id
      delete updateData.createdAt
      delete updateData.createdBy

      await updateDoc(tenantRef, updateData)
    } catch (error) {
      console.error('Error updating tenant:', error)
      throw error
    }
  }

  /**
   * Incrementa el contador de documentos del tenant
   */
  static async incrementDocumentCount(tenantId: string): Promise<void> {
    try {
      const tenantRef = doc(db, this.COLLECTION_NAME, tenantId)
      const tenantSnap = await getDoc(tenantRef)

      if (!tenantSnap.exists()) {
        console.warn(`Tenant ${tenantId} no encontrado para incrementar contador`)
        return
      }

      const data = tenantSnap.data()
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear

      // Verificar si es un nuevo mes
      const lastDocumentDate = data.lastDocumentDate?.toDate?.() || data.lastDocumentDate
      const isNewMonth = !lastDocumentDate || 
        (lastDocumentDate instanceof Date && 
         (lastDocumentDate.getMonth() !== currentMonth || lastDocumentDate.getFullYear() !== currentYear))

      const updates: any = {
        totalDocuments: (data.totalDocuments || 0) + 1,
        lastDocumentDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      if (isNewMonth) {
        // Si es un nuevo mes, mover el contador actual al mes pasado
        updates.documentsLastMonth = data.documentsThisMonth || 0
        updates.documentsThisMonth = 1
      } else {
        // Incrementar el contador del mes actual
        updates.documentsThisMonth = (data.documentsThisMonth || 0) + 1
      }

      await updateDoc(tenantRef, updates)
    } catch (error) {
      console.error('Error incrementing document count:', error)
      // No lanzar error para no interrumpir el flujo de creación de documentos
    }
  }

  /**
   * Convierte un documento de Firestore a Tenant
   */
  private static convertFirestoreToTenant(id: string, data: DocumentData): Tenant {
    return {
      id,
      name: data.name || '',
      status: data.status || 'active',
      plan: data.plan || 'basic',
      ownerName: data.ownerName || null,
      ownerEmail: data.ownerEmail || null,
      ownerPhone: data.ownerPhone || null,
      maxCompanies: data.maxCompanies || null,
      maxUsers: data.maxUsers || null,
      maxDocumentsPerMonth: data.maxDocumentsPerMonth || null,
      documentsThisMonth: data.documentsThisMonth || 0,
      documentsLastMonth: data.documentsLastMonth || 0,
      totalDocuments: data.totalDocuments || 0,
      lastDocumentDate: data.lastDocumentDate?.toDate?.() || data.lastDocumentDate || null,
      createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
      createdBy: data.createdBy || null,
      notes: data.notes || null,
      tags: data.tags || [],
      // Incluir campos adicionales que puedan existir
      ...Object.keys(data).reduce((acc, key) => {
        if (!['name', 'status', 'plan', 'ownerName', 'ownerEmail', 'ownerPhone', 
              'maxCompanies', 'maxUsers', 'maxDocumentsPerMonth', 
              'documentsThisMonth', 'documentsLastMonth', 'totalDocuments', 
              'lastDocumentDate', 'createdAt', 'updatedAt', 'createdBy', 
              'notes', 'tags'].includes(key)) {
          acc[key] = data[key]
        }
        return acc
      }, {} as any)
    }
  }
}
