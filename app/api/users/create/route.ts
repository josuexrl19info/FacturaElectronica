/**
 * API Route para crear usuarios con Firebase Auth
 * 
 * Endpoint:
 * POST /api/users/create - Crear nuevo usuario con autenticación
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  createUserWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
  getAuth
} from 'firebase/auth'
import { 
  doc, 
  setDoc, 
  Timestamp,
  getFirestore 
} from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Inicializar Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)
const db = getFirestore(app)

/**
 * Función para obtener el nombre del rol
 */
function getRoleName(roleId: string): string {
  const roleNames: Record<string, string> = {
    'tenant-admin': 'Administrador',
    'collaborator': 'Colaborador',
    'vendor': 'Vendedor'
  }
  return roleNames[roleId] || 'Usuario'
}

/**
 * Función para obtener los permisos del rol
 */
function getRolePermissions(roleId: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    'tenant-admin': ['all'],
    'collaborator': ['invoices', 'clients', 'products'],
    'vendor': ['invoices', 'clients']
  }
  return rolePermissions[roleId] || []
}

/**
 * POST /api/users/create
 * Crea un nuevo usuario con autenticación Firebase
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, roleId, tenantId, status = 'active', profile } = body

    // Validaciones básicas
    if (!name || !email || !password || !roleId || !tenantId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: name, email, password, roleId, tenantId' },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'El formato del correo electrónico no es válido' },
        { status: 400 }
      )
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // 1. Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const firebaseUser = userCredential.user

    // 2. Actualizar el perfil en Firebase Auth con el nombre
    await updateFirebaseProfile(firebaseUser, {
      displayName: name
    })

    // 3. Crear documento en Firestore
    const userData = {
      name,
      email,
      status,
      roleId,
      tenantId,
      lastLoginAt: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      profileImage: null,
      role: {
        name: getRoleName(roleId),
        permissions: getRolePermissions(roleId)
      },
      profile: profile || {
        preferences: {
          notifications: true,
          language: 'es',
          timezone: 'America/Costa_Rica'
        }
      }
    }

    // 4. Guardar en Firestore usando setDoc para usar el UID como ID
    await setDoc(doc(db, 'users', firebaseUser.uid), userData)
    
    return NextResponse.json({ 
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: name,
      message: 'Usuario creado exitosamente' 
    })
  } catch (error: any) {
    console.error('Error al crear usuario:', error)
    
    // Manejar errores específicos de Firebase Auth
    switch (error.code) {
      case 'auth/email-already-in-use':
        return NextResponse.json(
          { error: 'El correo electrónico ya está en uso' },
          { status: 409 }
        )
      case 'auth/invalid-email':
        return NextResponse.json(
          { error: 'El correo electrónico no es válido' },
          { status: 400 }
        )
      case 'auth/weak-password':
        return NextResponse.json(
          { error: 'La contraseña es muy débil' },
          { status: 400 }
        )
      case 'auth/operation-not-allowed':
        return NextResponse.json(
          { error: 'Operación no permitida. Contacta al administrador' },
          { status: 403 }
        )
      default:
        return NextResponse.json(
          { error: 'Error interno del servidor' },
          { status: 500 }
        )
    }
  }
}
