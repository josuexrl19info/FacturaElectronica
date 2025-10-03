import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'
import { ProductFormData } from '@/lib/product-types'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

/**
 * POST /api/products/create
 * Crea un nuevo producto en Firestore
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
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
      montoExoneracion,
      tenantId,
      createdBy
    } = body

    console.log('🔍 API Productos - Datos recibidos:', body)

    // Validar campos requeridos
    if (!codigoCABYS || !detalle || !precioUnitario || !unidadMedida || !tenantId || !createdBy) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Preparar datos para Firestore
    const productData = {
      codigoCABYS: codigoCABYS.trim(),
      detalle: detalle.trim(),
      precioUnitario: Number(precioUnitario),
      unidadMedida: unidadMedida,
      tipoImpuesto: tipoImpuesto || '01',
      codigoTarifaImpuesto: codigoTarifaImpuesto || '08',
      tarifaImpuesto: Number(tarifaImpuesto) || 13,
      // Campos de exoneración deshabilitados por ahora
      tieneExoneracion: false,
      porcentajeExoneracion: 0,
      numeroDocumentoExoneracion: '',
      nombreInstitucionExoneracion: '',
      fechaEmisionExoneracion: '',
      montoExoneracion: 0,
      activo: true,
      tenantId,
      createdBy,
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: serverTimestamp()
    }

    console.log('💾 Creando producto en Firestore:', productData)

    // Crear documento en Firestore
    const docRef = await addDoc(collection(db, 'products'), productData)

    console.log('✅ Producto creado exitosamente con ID:', docRef.id)

    return NextResponse.json({
      success: true,
      productId: docRef.id,
      message: 'Producto creado exitosamente'
    })

  } catch (error) {
    console.error('❌ Error al crear producto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
