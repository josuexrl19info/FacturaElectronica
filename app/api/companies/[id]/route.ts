import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

// Función requerida por Next.js para rutas dinámicas
export async function generateStaticParams() {
  // Para desarrollo, devolvemos un array vacío
  // En producción con output: export, necesitarías devolver todos los IDs posibles
  return []
}

/**
 * GET /api/companies/[id]
 * Obtiene una empresa específica por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    console.log('🔍 API Company by ID - ID recibido:', id)

    if (!id) {
      return NextResponse.json(
        { message: 'El ID de la empresa es requerido' },
        { status: 400 }
      )
    }

    // Obtener la empresa
    const companyRef = doc(db, 'companies', id)
    const companySnap = await getDoc(companyRef)

    if (!companySnap.exists()) {
      return NextResponse.json(
        { message: 'Empresa no encontrada' },
        { status: 404 }
      )
    }

    const data = companySnap.data()
    
    // Procesar createdAt si existe
    let processedCreatedAt = data.createdAt
    if (data.createdAt) {
      // Si es un Timestamp de Firestore
      if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
        processedCreatedAt = data.createdAt.toDate()
      }
      // Si es un objeto serializado de Firestore
      else if (data.createdAt._seconds) {
        processedCreatedAt = new Date(data.createdAt._seconds * 1000)
      }
    }

    const company = {
      id: companySnap.id,
      ...data,
      createdAt: processedCreatedAt
    }

    console.log('🔍 API Company by ID - empresa encontrada:', company.name)

    return NextResponse.json(company, { status: 200 })

  } catch (error) {
    console.error('Error fetching company:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/companies/[id]
 * Actualiza una empresa específica por ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    console.log('🔍 API Company Update - ID recibido:', id)
    console.log('🔍 API Company Update - Datos recibidos:', Object.keys(body))

    if (!id) {
      return NextResponse.json(
        { message: 'El ID de la empresa es requerido' },
        { status: 400 }
      )
    }

    // Verificar que la empresa existe
    const companyRef = doc(db, 'companies', id)
    const companySnap = await getDoc(companyRef)

    if (!companySnap.exists()) {
      return NextResponse.json(
        { message: 'Empresa no encontrada' },
        { status: 404 }
      )
    }

    // Actualizar la empresa
    const { updateDoc } = await import('firebase/firestore')
    await updateDoc(companyRef, {
      ...body,
      updatedAt: new Date()
    })

    console.log('🔍 API Company Update - empresa actualizada exitosamente')

    return NextResponse.json(
      { message: 'Empresa actualizada exitosamente' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
