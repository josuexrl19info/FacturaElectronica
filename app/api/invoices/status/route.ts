import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'
import { HaciendaStatusService } from '@/lib/services/hacienda-status'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

/**
 * POST /api/invoices/status
 * Consulta el estado de una factura en Hacienda
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId, locationUrl, accessToken } = body

    if (!invoiceId || !locationUrl || !accessToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'invoiceId, locationUrl y accessToken son requeridos' 
        },
        { status: 400 }
      )
    }

    console.log('🔍 Consultando estado de factura:', invoiceId)
    console.log('📍 URL:', locationUrl)

    // Validar URL de location
    if (!HaciendaStatusService.validateLocationUrl(locationUrl)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'URL de location inválida' 
        },
        { status: 400 }
      )
    }

    // Consultar estado en Hacienda
    const statusResult = await HaciendaStatusService.checkDocumentStatus(locationUrl, accessToken)

    if (!statusResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: statusResult.error 
        },
        { status: 400 }
      )
    }

    // Interpretar el estado
    const interpretedStatus = HaciendaStatusService.interpretStatus(statusResult.status)

    // Actualizar la factura en Firestore
    try {
      const invoiceRef = doc(db, 'invoices', invoiceId)
      const invoiceSnap = await getDoc(invoiceRef)

      if (!invoiceSnap.exists()) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Factura no encontrada' 
          },
          { status: 404 }
        )
      }

      await updateDoc(invoiceRef, {
        haciendaSubmission: statusResult.status,
        status: interpretedStatus.status,
        statusDescription: interpretedStatus.description,
        isFinalStatus: interpretedStatus.isFinal,
        lastStatusCheck: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      console.log('✅ Factura actualizada con estado:', interpretedStatus.status)

      return NextResponse.json({
        success: true,
        status: interpretedStatus.status,
        description: interpretedStatus.description,
        isFinal: interpretedStatus.isFinal,
        rawStatus: statusResult.status,
        message: 'Estado consultado y actualizado exitosamente'
      })

    } catch (updateError) {
      console.error('❌ Error al actualizar factura:', updateError)
      
      // Devolver el estado aunque no se haya podido actualizar la factura
      return NextResponse.json({
        success: true,
        status: interpretedStatus.status,
        description: interpretedStatus.description,
        isFinal: interpretedStatus.isFinal,
        rawStatus: statusResult.status,
        warning: 'Estado consultado pero no se pudo actualizar la factura',
        message: 'Estado consultado exitosamente'
      })
    }

  } catch (error) {
    console.error('❌ Error interno:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/invoices/status?invoiceId=xxx
 * Obtiene información de estado de una factura
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoiceId')

    if (!invoiceId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'invoiceId requerido' 
        },
        { status: 400 }
      )
    }

    console.log('📊 Obteniendo estado de factura:', invoiceId)

    const invoiceRef = doc(db, 'invoices', invoiceId)
    const invoiceSnap = await getDoc(invoiceRef)

    if (!invoiceSnap.exists()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Factura no encontrada' 
        },
        { status: 404 }
      )
    }

    const invoiceData = invoiceSnap.data()

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoiceId,
        status: invoiceData.status,
        statusDescription: invoiceData.statusDescription,
        isFinalStatus: invoiceData.isFinalStatus,
        consecutivo: invoiceData.consecutivo,
        createdAt: invoiceData.createdAt,
        updatedAt: invoiceData.updatedAt,
        lastStatusCheck: invoiceData.lastStatusCheck,
        haciendaSubmission: invoiceData.haciendaSubmission
      },
      message: 'Estado de factura obtenido exitosamente'
    })

  } catch (error) {
    console.error('❌ Error interno:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}
