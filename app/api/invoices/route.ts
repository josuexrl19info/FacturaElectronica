import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

/**
 * GET /api/invoices
 * Obtiene las facturas de una empresa específica
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    const companyId = searchParams.get('companyId')

    if (!tenantId || !companyId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos (tenantId, companyId)' },
        { status: 400 }
      )
    }

    // Consultar facturas de la empresa específica
    const invoicesRef = collection(db, 'invoices')
    const q = query(
      invoicesRef,
      where('tenantId', '==', tenantId),
      where('companyId', '==', companyId)
      // Removido orderBy para evitar problemas de índice
    )

    const querySnapshot = await getDocs(q)
    const invoices = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      invoices.push({
        id: doc.id,
        ...data,
        // Convertir timestamps a fechas
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        haciendaValidationDate: data.haciendaValidationDate?.toDate ? data.haciendaValidationDate.toDate() : data.haciendaValidationDate
      })
    })

    // Ordenar por fecha de creación (más reciente primero) del lado del cliente
    invoices.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })

    return NextResponse.json({
      success: true,
      invoices,
      count: invoices.length
    })

  } catch (error) {
    console.error('❌ Error al obtener facturas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
