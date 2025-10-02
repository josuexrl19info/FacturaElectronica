"use client"

import { 
  initializeApp, 
  getApps,
  FirebaseApp 
} from 'firebase/app'
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser
} from 'firebase/auth'
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc,
  Timestamp 
} from 'firebase/firestore'
import { firebaseConfig, User } from './firebase-config'

// Initialize Firebase
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)
const db = getFirestore(app)

// Configure auth persistence
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error)
})

// Auth state management
let currentUser: User | null = null
let authStateListeners: Array<(user: User | null) => void> = []
let logoutTimer: NodeJS.Timeout | null = null

// Listen to auth state changes
onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
  if (firebaseUser) {
    try {
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        currentUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData.name || '',
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
      } else {
        console.error('User document not found in Firestore')
        currentUser = null
      }
      
      // Setup auto logout for existing user
      if (currentUser) {
        setupAutoLogout()
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      currentUser = null
    }
  } else {
    currentUser = null
    // Clear auto logout timer when user logs out
    clearAutoLogout()
  }
  
  // Notify all listeners
  authStateListeners.forEach(listener => listener(currentUser))
})

// Auto logout after 24 hours
function setupAutoLogout() {
  // Clear existing timer
  if (logoutTimer) {
    clearTimeout(logoutTimer)
  }

  // Set new timer for 24 hours (24 * 60 * 60 * 1000 ms)
  logoutTimer = setTimeout(async () => {
    console.log('Auto logout: 24 hours expired')
    try {
      await auth.signOut()
      // Clear localStorage to ensure clean logout
      localStorage.clear()
      // Redirect to login page
      window.location.href = '/'
    } catch (error) {
      console.error('Error during auto logout:', error)
    }
  }, 24 * 60 * 60 * 1000) // 24 hours
}

// Clear auto logout timer
function clearAutoLogout() {
  if (logoutTimer) {
    clearTimeout(logoutTimer)
    logoutTimer = null
  }
}

// Auth functions
export const authService = {
  // Sign in with email and password
  async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // Update last login time in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        lastLoginAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      
      // Get updated user data
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (!userDoc.exists()) {
        throw new Error('User document not found')
      }
      
      const userData = userDoc.data()
      const userObj: User = {
        id: user.uid,
        email: user.email || '',
        name: userData.name || '',
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
      
      // Setup auto logout after successful login
      setupAutoLogout()
      
      return userObj
    } catch (error: any) {
      console.error('Sign in error:', error)
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          throw new Error('El correo electrónico no está registrado en el sistema')
        case 'auth/wrong-password':
          throw new Error('La contraseña es incorrecta')
        case 'auth/invalid-email':
          throw new Error('El formato del correo electrónico no es válido')
        case 'auth/user-disabled':
          throw new Error('Esta cuenta ha sido deshabilitada. Contacta al administrador')
        case 'auth/too-many-requests':
          throw new Error('Demasiados intentos fallidos. Intenta de nuevo en unos minutos')
        case 'auth/network-request-failed':
          throw new Error('Error de conexión. Verifica tu internet e intenta de nuevo')
        case 'auth/invalid-credential':
          throw new Error('Correo electrónico o contraseña incorrectos')
        case 'auth/email-already-in-use':
          throw new Error('Este correo electrónico ya está en uso')
        case 'auth/weak-password':
          throw new Error('La contraseña es muy débil')
        case 'auth/operation-not-allowed':
          throw new Error('Operación no permitida. Contacta al administrador')
        case 'auth/requires-recent-login':
          throw new Error('Debes iniciar sesión nuevamente para realizar esta acción')
        default:
          throw new Error('Correo electrónico o contraseña incorrectos')
      }
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      // Clear auto logout timer
      clearAutoLogout()
      await signOut(auth)
    } catch (error) {
      console.error('Sign out error:', error)
      throw new Error('Error al cerrar sesión')
    }
  },

  // Get current user
  getCurrentUser(): User | null {
    return currentUser
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    authStateListeners.push(callback)
    
    // Call immediately with current user
    callback(currentUser)
    
    // Return unsubscribe function
    return () => {
      const index = authStateListeners.indexOf(callback)
      if (index > -1) {
        authStateListeners.splice(index, 1)
      }
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return currentUser !== null && currentUser.status === 'active'
  },

  // Check if user has specific permission
  hasPermission(permission: string): boolean {
    if (!currentUser) return false
    return currentUser.role.permissions.includes('all') || 
           currentUser.role.permissions.includes(permission)
  },

  // Get user's tenant ID
  getTenantId(): string | null {
    return currentUser?.tenantId || null
  }
}

export { auth, db }
