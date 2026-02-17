import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

/**
 * PUT /api/products/update/[id]
 * Actualiza un producto existente
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID de producto requerido' },
        { status: 400 }
      )
    }

    const {
      codigoCABYS,
      detalle,
      precioUnitario,
      unidadMedida,
      tipoImpuesto,
      codigoTarifaImpuesto,
      tarifaImpuesto,
      tieneExoneracion,
      porcentajeExoneracion,
      numeroDocumentoExoneracion,
      nombreInstitucionExoneracion,
      fechaEmisionExoneracion,
      montoExoneracion
    } = body

    // Validar campos requeridos
    if (!detalle || !codigoCABYS || precioUnitario === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos (detalle, codigoCABYS, precioUnitario)' },
        { status: 400 }
      )
    }

    // Actualizar el producto
    const productRef = doc(db, 'products', id)
    const updateData: any = {
      codigoCABYS,
      detalle,
      precioUnitario: Number(precioUnitario),
      unidadMedida: unidadMedida || 'Sp',
      tipoImpuesto: tipoImpuesto || '01',
      codigoTarifaImpuesto: codigoTarifaImpuesto || '08',
      tarifaImpuesto: Number(tarifaImpuesto) || 13,
      tieneExoneracion: tieneExoneracion || false,
      fechaActualizacion: serverTimestamp()
    }

    // Agregar campos de exoneración si aplica
    if (tieneExoneracion) {
      if (porcentajeExoneracion !== undefined) {
        updateData.porcentajeExoneracion = Number(porcentajeExoneracion)
      }
      if (numeroDocumentoExoneracion) {
        updateData.numeroDocumentoExoneracion = numeroDocumentoExoneracion
      }
      if (nombreInstitucionExoneracion) {
        updateData.nombreInstitucionExoneracion = nombreInstitucionExoneracion
      }
      if (fechaEmisionExoneracion) {
        updateData.fechaEmisionExoneracion = fechaEmisionExoneracion
      }
      if (montoExoneracion !== undefined) {
        updateData.montoExoneracion = Number(montoExoneracion)
      }
    } else {
      // Limpiar campos de exoneración si no tiene
      updateData.porcentajeExoneracion = null
      updateData.numeroDocumentoExoneracion = null
      updateData.nombreInstitucionExoneracion = null
      updateData.fechaEmisionExoneracion = null
      updateData.montoExoneracion = null
    }

    await updateDoc(productRef, updateData)

    console.log(`✅ Producto ${id} actualizado exitosamente`)

    return NextResponse.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      productId: id
    })

  } catch (error) {
    console.error('❌ Error al actualizar producto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
