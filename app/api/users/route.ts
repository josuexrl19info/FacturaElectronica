/**
 * API Route para gestión de usuarios
 * 
 * Endpoints disponibles:
 * GET /api/users - Obtener usuarios del tenant actual
 * POST /api/users - Crear nuevo usuario
 * PUT /api/users/[id] - Actualizar usuario
 * DELETE /api/users/[id] - Eliminar usuario
 */

import { NextRequest, NextResponse } from 'next/server'
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
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

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
const db = getFirestore(app)

/**
 * GET /api/users
 * Obtiene todos los usuarios del tenant actual
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID es requerido' },
        { status: 400 }
      )
    }

    const usersRef = collection(db, 'users')
    const q = query(
      usersRef,
      where('tenantId', '==', tenantId)
      // Temporalmente removido orderBy hasta crear el índice
      // orderBy('createdAt', 'desc')
    )
    
    const snapshot = await getDocs(q)
    const users: any[] = []

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
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        profileImage: data.profileImage || null,
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

    // Ordenar por fecha de creación (más recientes primero)
    users.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users
 * Crea un nuevo usuario
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, roleId, tenantId, status = 'active', profile } = body

    // Validaciones básicas
    if (!name || !email || !roleId || !tenantId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: name, email, roleId, tenantId' },
        { status: 400 }
      )
    }

    const newUser = {
      name,
      email,
      roleId,
      tenantId,
      status,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      profile: profile || {
        preferences: {
          notifications: true,
          language: 'es',
          timezone: 'America/Costa_Rica'
        }
      }
    }

    const docRef = await addDoc(collection(db, 'users'), newUser)
    
    return NextResponse.json({ 
      id: docRef.id,
      message: 'Usuario creado exitosamente' 
    })
  } catch (error) {
    console.error('Error al crear usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
