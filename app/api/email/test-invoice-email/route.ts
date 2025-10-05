import { NextRequest, NextResponse } from 'next/server'
import { InvoiceEmailService } from '@/lib/services/invoice-email-service'

/**
 * API route para probar el servicio de email de facturas aprobadas
 * POST /api/email/test-invoice-email
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 API: Probando servicio de email de facturas aprobadas...')

    const body = await request.json()
    const { testEmail, simulateApproval = true } = body

    if (!testEmail) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'testEmail es requerido' 
        },
        { status: 400 }
      )
    }

    console.log('📧 Email de prueba:', testEmail)
    console.log('🎭 Simular aprobación:', simulateApproval)

    // Verificar disponibilidad del servicio
    console.log('🔍 Verificando disponibilidad del servicio...')
    const serviceAvailable = await InvoiceEmailService.isEmailServiceAvailable()
    
    if (!serviceAvailable) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Servicio de email no disponible en localhost:8000/email',
          details: 'Verifica que el endpoint esté ejecutándose'
        },
        { status: 503 }
      )
    }

    console.log('✅ Servicio de email disponible')

    let result

    if (simulateApproval) {
      console.log('🎭 Simulando aprobación de factura...')
      result = await InvoiceEmailService.sendTestEmail(testEmail)
    } else {
      console.log('📧 Enviando email de prueba simple...')
      // Para email simple, usar el servicio directamente
      const emailData = {
        to: testEmail,
        subject: '🧪 Prueba Simple - InvoSell',
        message: '<h1>Prueba Simple</h1><p>Este es un email de prueba simple.</p>'
      }

      try {
        const response = await fetch('http://localhost:8000/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'tu-api-key-super-secreta-123'
          },
          body: JSON.stringify(emailData)
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const emailResult = await response.json()

        result = {
          success: true,
          messageId: emailResult.messageId || emailResult.id || `email-${Date.now()}`,
          deliveredTo: [testEmail],
          sentAt: new Date().toISOString()
        }
      } catch (error) {
        result = {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    }

    if (result.success) {
      console.log('✅ Email enviado exitosamente')
      console.log('📧 Message ID:', result.messageId)
      
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        deliveredTo: result.deliveredTo,
        sentAt: result.sentAt,
        message: simulateApproval 
          ? 'Email de factura aprobada enviado exitosamente'
          : 'Email de prueba enviado exitosamente'
      })
    } else {
      console.error('❌ Error enviando email:', result.error)
      
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: 'Error enviando email de prueba'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error en API de prueba de email:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/email/test-invoice-email
 * Verifica la disponibilidad del servicio de email
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verificando disponibilidad del servicio de email...')

    const serviceAvailable = await InvoiceEmailService.isEmailServiceAvailable()

    if (serviceAvailable) {
      return NextResponse.json({
        success: true,
        available: true,
        endpoint: 'http://localhost:8000/email',
        message: 'Servicio de email disponible'
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          available: false,
          endpoint: 'http://localhost:8000/email',
          error: 'Servicio de email no disponible',
          message: 'Verifica que el endpoint esté ejecutándose en localhost:8000'
        },
        { status: 503 }
      )
    }

  } catch (error) {
    console.error('❌ Error verificando servicio:', error)
    return NextResponse.json(
      {
        success: false,
        available: false,
        error: 'Error verificando servicio de email',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
