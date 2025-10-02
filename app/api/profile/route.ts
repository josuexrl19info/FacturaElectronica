/**
 * API Route para gestión del perfil del usuario actual
 * 
 * Endpoints disponibles:
 * GET /api/profile - Obtener perfil del usuario actual
 * PUT /api/profile - Actualizar perfil del usuario actual
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  getFirestore, 
  doc, 
  getDoc,
  updateDoc,
  Timestamp 
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
const db = getFirestore(app)

/**
 * GET /api/profile
 * Obtiene el perfil del usuario actual
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID es requerido' },
        { status: 400 }
      )
    }

    const userDoc = await getDoc(doc(db, 'users', userId))
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    const profile = {
      id: userDoc.id,
      name: userData.name || '',
      email: userData.email || '',
      status: userData.status || 'active',
      roleId: userData.roleId || '',
      tenantId: userData.tenantId || '',
      lastLoginAt: userData.lastLoginAt?.toDate(),
      createdAt: userData.createdAt?.toDate(),
      updatedAt: userData.updatedAt?.toDate(),
      role: userData.role || { name: 'Usuario', permissions: [] },
      profile: userData.profile || {
        preferences: {
          notifications: true,
          language: 'es',
          timezone: 'America/Costa_Rica'
        }
      }
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error al obtener perfil:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/profile
 * Actualiza el perfil del usuario actual
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const body = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Preparar datos de actualización
    const updateData = {
      ...body,
      updatedAt: Timestamp.now()
    }

    // Remover campos que no deben actualizarse
    delete updateData.id
    delete updateData.email // El email no se puede cambiar
    delete updateData.lastLoginAt
    delete updateData.createdAt

    await updateDoc(doc(db, 'users', userId), updateData)
    
    return NextResponse.json({ 
      message: 'Perfil actualizado exitosamente' 
    })
  } catch (error) {
    console.error('Error al actualizar perfil:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
