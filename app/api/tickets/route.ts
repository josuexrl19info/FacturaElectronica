import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { firebaseConfig } from '@/lib/firebase-config'

/**
 * Obtiene tiquetes electrónicos de Firestore
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

    // Inicializar Firebase si no está inicializado
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    const db = getFirestore(app)

    // Consultar tiquetes de la empresa específica
    const ticketsRef = collection(db, 'tickets')
    const q = query(
      ticketsRef,
      where('tenantId', '==', tenantId),
      where('companyId', '==', companyId)
    )

    const querySnapshot = await getDocs(q)
    const tickets: any[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      tickets.push({
        id: doc.id,
        ...data,
        // Convertir Timestamps a Date si es necesario
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
      })
    })

    // Ordenar por fecha de creación (más recientes primero)
    tickets.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })

    return NextResponse.json({
      success: true,
      tickets,
      count: tickets.length
    })

  } catch (error) {
    console.error('Error al obtener tiquetes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
