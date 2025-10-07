import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

/**
 * GET /api/clients
 * Obtiene todos los clientes de la empresa seleccionada
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    const companyId = searchParams.get('companyId')

    console.log('🔍 API Clientes - Parámetros recibidos:', { tenantId, companyId })

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId es requerido' },
        { status: 400 }
      )
    }

    // Construir query base - simplificado para evitar índices compuestos
    let q = query(
      collection(db, 'clients'),
      where('tenantId', '==', tenantId)
    )

    // Si se especifica companyId, filtrar por esa empresa
    if (companyId) {
      q = query(
        collection(db, 'clients'),
        where('tenantId', '==', tenantId),
        where('companyIds', 'array-contains', companyId)
      )
    }

    const snapshot = await getDocs(q)
    const clients = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      clients.push({
        id: doc.id,
        ...data,
        // Convertir timestamps a fechas legibles
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
      })
    })

    // Ordenar por fecha de creación (más recientes primero) en el cliente
    clients.sort((a, b) => {
      const dateA = new Date(a.createdAt)
      const dateB = new Date(b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })

    console.log(`✅ Se encontraron ${clients.length} clientes`)

    return NextResponse.json({
      success: true,
      clients,
      total: clients.length
    })

  } catch (error) {
    console.error('❌ Error al obtener clientes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
