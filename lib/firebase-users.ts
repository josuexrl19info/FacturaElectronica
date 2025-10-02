"use client"

import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { auth, db } from './firebase-auth'
import { User } from './firebase-config'

// Interface para el perfil del usuario
export interface UserProfile {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive' | 'suspended'
  roleId: string
  tenantId: string
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  profileImage?: string // URL o base64 de la imagen
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

// Interface para crear un nuevo usuario
export interface CreateUserData {
  name: string
  email: string
  roleId: string
  tenantId: string
  status?: 'active' | 'inactive'
  profile?: {
    preferences: {
      notifications: boolean
      language: string
      timezone: string
    }
  }
}

export const userService = {
  // Obtener perfil del usuario actual
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('Usuario no autenticado')
      }

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
      if (!userDoc.exists()) {
        throw new Error('Perfil de usuario no encontrado')
      }

      const userData = userDoc.data()
      return {
        id: currentUser.uid,
        name: userData.name || '',
        email: currentUser.email || '',
        status: userData.status || 'active',
        roleId: userData.roleId || '',
        tenantId: userData.tenantId || '',
        lastLoginAt: userData.lastLoginAt?.toDate(),
        createdAt: userData.createdAt?.toDate() || new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date(),
        profileImage: userData.profileImage || null,
        role: userData.role || { name: 'Usuario', permissions: [] },
        profile: userData.profile || {
          preferences: {
            notifications: true,
            language: 'es',
            timezone: 'America/Costa_Rica'
          }
        }
      }
    } catch (error) {
      console.error('Error al obtener perfil:', error)
      throw error
    }
  },

  // Actualizar perfil del usuario actual
  async updateCurrentUserProfile(updates: Partial<UserProfile>): Promise<void> {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('Usuario no autenticado')
      }

      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      }

      // Remover campos que no deben actualizarse en Firestore
      delete updateData.id
      delete updateData.email // El email no se puede cambiar desde aquí
      delete updateData.lastLoginAt
      delete updateData.createdAt

      await updateDoc(doc(db, 'users', currentUser.uid), updateData)
    } catch (error) {
      console.error('Error al actualizar perfil:', error)
      throw error
    }
  },

  // Obtener todos los usuarios del tenant actual
  async getUsersByTenant(tenantId: string): Promise<UserProfile[]> {
    try {
      const usersRef = collection(db, 'users')
      const q = query(
        usersRef,
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      const users: UserProfile[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        users.push({
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          status: data.status || 'active',
          roleId: data.roleId || '',
          tenantId: data.tenantId || '',
          lastLoginAt: data.lastLoginAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          role: data.role || { name: 'Usuario', permissions: [] },
          profile: data.profile || {
            preferences: {
              notifications: true,
              language: 'es',
              timezone: 'America/Costa_Rica'
            }
          }
        })
      })

      return users
    } catch (error) {
      console.error('Error al obtener usuarios:', error)
      throw error
    }
  },

  // Crear nuevo usuario
  async createUser(userData: CreateUserData): Promise<string> {
    try {
      const newUser = {
        ...userData,
        status: userData.status || 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        profile: userData.profile || {
          preferences: {
            notifications: true,
            language: 'es',
            timezone: 'America/Costa_Rica'
          }
        }
      }

      const docRef = await addDoc(collection(db, 'users'), newUser)
      return docRef.id
    } catch (error) {
      console.error('Error al crear usuario:', error)
      throw error
    }
  },

  // Actualizar usuario
  async updateUser(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      }

      // Remover campos que no deben actualizarse
      delete updateData.id
      delete updateData.email
      delete updateData.lastLoginAt
      delete updateData.createdAt

      await updateDoc(doc(db, 'users', userId), updateData)
    } catch (error) {
      console.error('Error al actualizar usuario:', error)
      throw error
    }
  },

  // Eliminar usuario
  async deleteUser(userId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', userId))
    } catch (error) {
      console.error('Error al eliminar usuario:', error)
      throw error
    }
  },

  // Actualizar imagen del perfil
  async updateProfileImage(imageData: string): Promise<void> {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('Usuario no autenticado')
      }

      await updateDoc(doc(db, 'users', currentUser.uid), {
        profileImage: imageData,
        updatedAt: Timestamp.now()
      })
    } catch (error) {
      console.error('Error al actualizar imagen del perfil:', error)
      throw error
    }
  }
}
