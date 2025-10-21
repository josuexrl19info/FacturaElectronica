import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'
import { HaciendaStatusService } from '@/lib/services/hacienda-status'
import { InvoiceEmailService } from '@/lib/services/invoice-email-service'

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

      const invoiceData = invoiceSnap.data()
      
      await updateDoc(invoiceRef, {
        haciendaSubmission: statusResult.status,
        status: interpretedStatus.status,
        statusDescription: interpretedStatus.description,
        isFinalStatus: interpretedStatus.isFinal,
        lastStatusCheck: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      console.log('✅ Factura actualizada con estado:', interpretedStatus.status)

      // 📧 ENVIAR EMAIL SI LA FACTURA ES APROBADA
      if (interpretedStatus.isFinal && interpretedStatus.status === 'Aceptado') {
        console.log('🎉 Factura APROBADA - Enviando email al cliente...')
        
        try {
          // Pequeña pausa para asegurar que el updateDoc se haya completado
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // Leer los datos actualizados de la factura después del updateDoc para obtener todos los datos del cliente
          const updatedInvoiceSnap = await getDoc(invoiceRef)
          const updatedInvoiceData = updatedInvoiceSnap.exists() ? updatedInvoiceSnap.data() : invoiceData
          
          // 🔍 DEBUG CRÍTICO: Verificar qué datos están realmente en la factura
          console.log('🔍 [CRÍTICO] updatedInvoiceData keys:', Object.keys(updatedInvoiceData || {}))
          console.log('🔍 [CRÍTICO] tieneExoneracion:', updatedInvoiceData?.tieneExoneracion)
          console.log('🔍 [CRÍTICO] exoneracion:', updatedInvoiceData?.exoneracion ? 'presente' : 'ausente')
          
          console.log('🔍 Debug datos del cliente para email:', {
            hasCliente: !!updatedInvoiceData?.cliente,
            clienteKeys: updatedInvoiceData?.cliente ? Object.keys(updatedInvoiceData.cliente) : [],
            // Campos directos de la factura según Firebase
            invoiceTieneExoneracion: updatedInvoiceData?.tieneExoneracion,
            invoiceExoneracion: updatedInvoiceData?.exoneracion ? 'presente' : 'ausente',
            // Campos del cliente
            clienteTieneExoneracion: updatedInvoiceData?.cliente?.tieneExoneracion,
            clienteHasExemption: updatedInvoiceData?.cliente?.hasExemption,
            // Debug completo de la factura
            facturaKeys: Object.keys(updatedInvoiceData || {}),
            facturaTieneExoneracion: updatedInvoiceData?.tieneExoneracion,
            facturaExoneracionKeys: updatedInvoiceData?.exoneracion ? Object.keys(updatedInvoiceData.exoneracion) : []
          })
          
          // Crear la factura completa con todos los datos actualizados
          const completeInvoiceData = {
            ...updatedInvoiceData,
            id: invoiceId,
            status: interpretedStatus.status,
            statusDescription: interpretedStatus.description,
            isFinalStatus: interpretedStatus.isFinal,
            haciendaSubmission: statusResult.status,  // ← Incluir la respuesta completa de Hacienda
            // 🔧 Asegurar que los campos de exoneración estén presentes
            tieneExoneracion: updatedInvoiceData?.tieneExoneracion,
            exoneracion: updatedInvoiceData?.exoneracion
          }
          
          console.log('📧 Enviando email con factura completa:', {
            id: completeInvoiceData.id,
            consecutivo: completeInvoiceData.consecutivo,
            hasXmlSigned: !!completeInvoiceData.xmlSigned,
            hasHaciendaSubmission: !!completeInvoiceData.haciendaSubmission,
            hasRespuestaXml: !!completeInvoiceData.haciendaSubmission?.['respuesta-xml'],
            // 🔍 DEBUG: Verificar campos de exoneración antes de enviar email
            tieneExoneracion: completeInvoiceData.tieneExoneracion,
            exoneracion: completeInvoiceData.exoneracion ? 'presente' : 'ausente',
            clienteTieneExoneracion: completeInvoiceData.cliente?.tieneExoneracion,
            clienteHasExemption: completeInvoiceData.cliente?.hasExemption
          })
          
          const emailResult = await InvoiceEmailService.sendApprovalEmail(completeInvoiceData)

          if (emailResult.success) {
            console.log('✅ Email de aprobación enviado exitosamente')
            console.log('📧 Message ID:', emailResult.messageId)
            
            // Actualizar factura con información del email enviado
            await updateDoc(invoiceRef, {
              emailSent: true,
              emailSentAt: serverTimestamp(),
              emailMessageId: emailResult.messageId,
              emailDeliveredTo: emailResult.deliveredTo
            })
          } else {
            console.error('❌ Error enviando email de aprobación:', emailResult.error)
            
            // Marcar que hubo error enviando email
            await updateDoc(invoiceRef, {
              emailError: emailResult.error,
              emailErrorAt: serverTimestamp()
            })
          }
        } catch (emailError) {
          console.error('❌ Error en proceso de email:', emailError)
          
          // Marcar error en la factura
          await updateDoc(invoiceRef, {
            emailError: emailError instanceof Error ? emailError.message : 'Error desconocido',
            emailErrorAt: serverTimestamp()
          })
        }
      }

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
