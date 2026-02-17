import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

/**
 * PATCH /api/products/[id]/status
 * Actualiza el estado (activo/inactivo) de un producto
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { activo } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID de producto requerido' },
        { status: 400 }
      )
    }

    if (typeof activo !== 'boolean') {
      return NextResponse.json(
        { error: 'El campo activo debe ser un booleano' },
        { status: 400 }
      )
    }

    // Actualizar el estado del producto
    const productRef = doc(db, 'products', id)
    await updateDoc(productRef, {
      activo,
      fechaActualizacion: serverTimestamp()
    })

    console.log(`✅ Estado del producto ${id} actualizado a: ${activo ? 'activo' : 'inactivo'}`)

    return NextResponse.json({
      success: true,
      message: `Producto ${activo ? 'activado' : 'inactivado'} exitosamente`
    })

  } catch (error) {
    console.error('❌ Error al actualizar estado del producto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
