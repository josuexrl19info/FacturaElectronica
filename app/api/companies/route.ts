import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

/**
 * GET /api/companies
 * Obtiene todas las empresas del usuario autenticado
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    console.log('🔍 API Companies - tenantId recibido:', tenantId)

    if (!tenantId) {
      return NextResponse.json(
        { message: 'El tenantId es requerido' },
        { status: 400 }
      )
    }

    // Consultar empresas del tenant
    const companiesRef = collection(db, 'companies')
    const q = query(
      companiesRef,
      where('tenantId', '==', tenantId)
    )

    const querySnapshot = await getDocs(q)
    const companies = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return NextResponse.json(companies, { status: 200 })

  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
