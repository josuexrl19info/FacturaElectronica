import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

/**
 * GET /api/invoices/get-by-id?id=xxx
 * Obtiene una factura específica por ID usando query parameter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de factura requerido' },
        { status: 400 }
      )
    }

    // Obtener la factura
    const invoiceRef = doc(db, 'invoices', id)
    const invoiceSnap = await getDoc(invoiceRef)

    if (!invoiceSnap.exists()) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      )
    }

    const invoiceData = invoiceSnap.data()

    // Obtener datos de la empresa
    let companyData = null
    if (invoiceData.companyId) {
      const companyRef = doc(db, 'companies', invoiceData.companyId)
      const companySnap = await getDoc(companyRef)
      if (companySnap.exists()) {
        companyData = companySnap.data()
        
        // Debug: Verificar datos del logo en la API
        console.log('🔍 DEBUG API - Company data loaded:', !!companyData)
        console.log('🔍 DEBUG API - Logo available:', !!companyData?.logo?.fileData)
      }
    }

    // Obtener datos del cliente
    let clientData = null
    if (invoiceData.clientId) {
      const clientRef = doc(db, 'clients', invoiceData.clientId)
      const clientSnap = await getDoc(clientRef)
      if (clientSnap.exists()) {
        clientData = clientSnap.data()
      }
    }

    // Convertir timestamps a fechas
    const invoice = {
      id: invoiceSnap.id,
      ...invoiceData,
      createdAt: invoiceData.createdAt?.toDate ? invoiceData.createdAt.toDate() : invoiceData.createdAt,
      updatedAt: invoiceData.updatedAt?.toDate ? invoiceData.updatedAt.toDate() : invoiceData.updatedAt,
      haciendaValidationDate: invoiceData.haciendaValidationDate?.toDate ? invoiceData.haciendaValidationDate.toDate() : invoiceData.haciendaValidationDate
    }

    return NextResponse.json({
      success: true,
      invoice,
      company: companyData,
      client: clientData
    })

  } catch (error) {
    console.error('Error al obtener factura:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
