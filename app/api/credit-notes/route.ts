import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const companyId = searchParams.get('companyId')

    if (!tenantId || !companyId) {
      return NextResponse.json(
        { error: 'tenantId y companyId son requeridos' },
        { status: 400 }
      )
    }

    console.log('📋 Obteniendo notas de crédito para:', { tenantId, companyId })

    // Consultar notas de crédito de la empresa
    const creditNotesRef = collection(db, 'creditNotes')
    const q = query(
      creditNotesRef,
      where('tenantId', '==', tenantId),
      where('companyId', '==', companyId)
    )

    const querySnapshot = await getDocs(q)
    const creditNotes = querySnapshot.docs.map(doc => {
      const data = doc.data()
      
      // Convertir Timestamps a objetos Date
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate()
        : data.createdAt

      return {
        id: doc.id,
        ...data,
        createdAt
      }
    })

    // Ordenar por consecutivo descendente (más alto primero)
    creditNotes.sort((a, b) => {
      const consecutivoA = a.consecutivo || ''
      const consecutivoB = b.consecutivo || ''
      
      // Extraer número del consecutivo para comparación numérica
      const numeroA = parseInt(consecutivoA.replace(/[^\d]/g, '')) || 0
      const numeroB = parseInt(consecutivoB.replace(/[^\d]/g, '')) || 0
      
      return numeroB - numeroA // Descendente: mayor primero
    })

    console.log(`✅ ${creditNotes.length} notas de crédito encontradas`)

    return NextResponse.json({
      creditNotes,
      count: creditNotes.length
    })

  } catch (error) {
    console.error('❌ Error obteniendo notas de crédito:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

// Permitir que esta ruta se exporte estáticamente
export async function generateStaticParams() {
  return []
}

