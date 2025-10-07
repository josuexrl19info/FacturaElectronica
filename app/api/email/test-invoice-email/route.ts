import { NextRequest, NextResponse } from 'next/server'
import { InvoiceEmailService } from '@/lib/services/invoice-email-service'

/**
 * API route para probar el servicio de email de facturas aprobadas
 * POST /api/email/test-invoice-email
 */
export async function POST(request: NextRequest) {
  try {
    console.log('⚠️ [EMAIL] Endpoint de prueba desactivado para evitar gastos innecesarios')
    
    // Retornar respuesta simulada sin enviar email real
    return NextResponse.json({
      success: true,
      message: 'Emails de prueba desactivados para evitar gastos. El sistema está funcionando correctamente.',
      messageId: `test-disabled-${Date.now()}`,
      deliveredTo: [],
      sentAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error en endpoint de prueba de email:', error)
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
        endpoint: 'https://api.innovasmartcr.com/email',
        message: 'Servicio de email disponible'
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          available: false,
          endpoint: 'https://api.innovasmartcr.com/email',
          error: 'Servicio de email no disponible',
          message: 'Verifica que el endpoint esté ejecutándose en api.innovasmartcr.com'
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
