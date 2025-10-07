/**
 * API Route para gestión de usuarios individuales
 * 
 * Endpoints disponibles:
 * GET /api/users/[id] - Obtener usuario por ID
 * PUT /api/users/[id] - Actualizar usuario
 * DELETE /api/users/[id] - Eliminar usuario
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  getFirestore, 
  doc, 
  getDoc,
  updateDoc, 
  deleteDoc,
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
 * generateStaticParams - Requerido para Next.js con output: export
 * Genera parámetros estáticos para las rutas dinámicas
 */
export async function generateStaticParams() {
  // Para APIs dinámicas, retornamos un array vacío
  // ya que los parámetros se generan en tiempo de ejecución
  return []
}

/**
 * GET /api/users/[id]
 * Obtiene un usuario específico por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'ID de usuario es requerido' },
        { status: 400 }
      )
    }

    const userDoc = await getDoc(doc(db, 'users', id))
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    const user = {
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

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error al obtener usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/users/[id]
 * Actualiza un usuario específico
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID de usuario es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe
    const userDoc = await getDoc(doc(db, 'users', id))
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

    await updateDoc(doc(db, 'users', id), updateData)
    
    return NextResponse.json({ 
      message: 'Usuario actualizado exitosamente' 
    })
  } catch (error) {
    console.error('Error al actualizar usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/users/[id]
 * Elimina un usuario específico
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'ID de usuario es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe
    const userDoc = await getDoc(doc(db, 'users', id))
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    await deleteDoc(doc(db, 'users', id))
    
    return NextResponse.json({ 
      message: 'Usuario eliminado exitosamente' 
    })
  } catch (error) {
    console.error('Error al eliminar usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
