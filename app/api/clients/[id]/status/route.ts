import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

/**
 * PATCH /api/clients/[id]/status
 * Actualiza el estado (activo/inactivo) de un cliente
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID de cliente requerido' },
        { status: 400 }
      )
    }

    if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido. Debe ser: active, inactive o suspended' },
        { status: 400 }
      )
    }

    // Actualizar el estado del cliente
    const clientRef = doc(db, 'clients', id)
    await updateDoc(clientRef, {
      status,
      updatedAt: serverTimestamp()
    })

    console.log(`✅ Estado del cliente ${id} actualizado a: ${status}`)

    return NextResponse.json({
      success: true,
      message: `Cliente ${status === 'active' ? 'activado' : 'inactivado'} exitosamente`
    })

  } catch (error) {
    console.error('❌ Error al actualizar estado del cliente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
