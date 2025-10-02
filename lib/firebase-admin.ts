"use client"

import { 
  createUserWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
  User as FirebaseUser
} from 'firebase/auth'
import { 
  doc, 
  setDoc, 
  Timestamp 
} from 'firebase/firestore'
import { auth, db } from './firebase-auth'
import { UserProfile } from './firebase-users'

/**
 * Interface para crear un nuevo usuario con autenticación
 */
export interface CreateUserWithAuthData {
  name: string
  email: string
  password: string
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

/**
 * Servicio para administración de usuarios (crear usuarios con Firebase Auth)
 */
export const adminService = {
  /**
   * Crea un nuevo usuario con autenticación Firebase
   * @param userData - Datos del usuario a crear
   * @returns Promise<string> - ID del usuario creado
   */
  async createUserWithAuth(userData: CreateUserWithAuthData): Promise<string> {
    try {
      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      )
      
      const firebaseUser = userCredential.user

      // 2. Actualizar el perfil en Firebase Auth con el nombre
      await updateFirebaseProfile(firebaseUser, {
        displayName: userData.name
      })

      // 3. Crear documento en Firestore
      const userProfile: UserProfile = {
        id: firebaseUser.uid,
        name: userData.name,
        email: userData.email,
        status: userData.status || 'active',
        roleId: userData.roleId,
        tenantId: userData.tenantId,
        lastLoginAt: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileImage: null,
        role: {
          name: this.getRoleName(userData.roleId),
          permissions: this.getRolePermissions(userData.roleId)
        },
        profile: userData.profile || {
          preferences: {
            notifications: true,
            language: 'es',
            timezone: 'America/Costa_Rica'
          }
        }
      }

      // 4. Guardar en Firestore usando setDoc para usar el UID como ID
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name: userProfile.name,
        email: userProfile.email,
        status: userProfile.status,
        roleId: userProfile.roleId,
        tenantId: userProfile.tenantId,
        lastLoginAt: null,
        createdAt: Timestamp.fromDate(userProfile.createdAt),
        updatedAt: Timestamp.fromDate(userProfile.updatedAt),
        profileImage: userProfile.profileImage,
        role: userProfile.role,
        profile: userProfile.profile
      })

      return firebaseUser.uid
    } catch (error: any) {
      console.error('Error al crear usuario con auth:', error)
      
      // Manejar errores específicos de Firebase Auth
      switch (error.code) {
        case 'auth/email-already-in-use':
          throw new Error('El correo electrónico ya está en uso')
        case 'auth/invalid-email':
          throw new Error('El correo electrónico no es válido')
        case 'auth/weak-password':
          throw new Error('La contraseña es muy débil')
        case 'auth/operation-not-allowed':
          throw new Error('Operación no permitida')
        default:
          throw new Error('Error al crear el usuario')
      }
    }
  },

  /**
   * Obtiene el nombre del rol basado en el roleId
   */
  getRoleName(roleId: string): string {
    const roleNames: Record<string, string> = {
      'tenant-admin': 'Administrador',
      'collaborator': 'Colaborador',
      'vendor': 'Vendedor'
    }
    return roleNames[roleId] || 'Usuario'
  },

  /**
   * Obtiene los permisos del rol basado en el roleId
   */
  getRolePermissions(roleId: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      'tenant-admin': ['all'],
      'collaborator': ['invoices', 'clients', 'products'],
      'vendor': ['invoices', 'clients']
    }
    return rolePermissions[roleId] || []
  }
}
