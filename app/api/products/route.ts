import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

/**
 * GET /api/products
 * Obtiene todos los productos de la empresa seleccionada
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    console.log('🔍 API Productos - Parámetros recibidos:', { tenantId })

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId es requerido' },
        { status: 400 }
      )
    }

    // Construir query - solo productos activos
    const q = query(
      collection(db, 'products'),
      where('tenantId', '==', tenantId),
      where('activo', '==', true)
    )

    const snapshot = await getDocs(q)
    const products = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      products.push({
        id: doc.id,
        ...data,
        // Convertir timestamps a fechas legibles
        fechaCreacion: data.fechaCreacion?.toDate?.() || data.fechaCreacion,
        fechaActualizacion: data.fechaActualizacion?.toDate?.() || data.fechaActualizacion
      })
    })

    // Ordenar por fecha de actualización (más recientes primero)
    products.sort((a, b) => {
      const dateA = new Date(a.fechaActualizacion)
      const dateB = new Date(b.fechaActualizacion)
      return dateB.getTime() - dateA.getTime()
    })

    console.log(`✅ Se encontraron ${products.length} productos`)

    return NextResponse.json({
      success: true,
      products,
      total: products.length
    })

  } catch (error) {
    console.error('❌ Error al obtener productos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
