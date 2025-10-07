/**
 * API Route para diagnosticar problemas de envío de correos
 * 
 * POST /api/email/diagnose - Diagnostica problemas específicos de IP blocking
 */

import { NextRequest, NextResponse } from 'next/server'
import { getEmailService } from '@/lib/email/email-service'

/**
 * POST /api/email/diagnose
 * Diagnostica problemas de IP blocking y entrega
 */
export async function POST(request: NextRequest) {
  try {
    const emailService = getEmailService()
    
    // Validar configuración
    const isConfigValid = await emailService.validateConfig()
    if (!isConfigValid) {
      return NextResponse.json(
        { 
          error: 'Servicio de correos no configurado correctamente',
          details: 'Verifica las variables de entorno de Office 365'
        },
        { status: 500 }
      )
    }

    // Parsear el cuerpo de la petición
    const body = await request.json()
    const { diagnosticType = 'ip_blocking' } = body

    let diagnosticResult: any = {}

    switch (diagnosticType) {
      case 'ip_blocking':
        diagnosticResult = await emailService.diagnoseIPBlocking()
        break
      
      case 'gmail_specific':
        // Diagnóstico específico para Gmail
        const testMessage = {
          subject: 'Diagnóstico Gmail - ' + new Date().toISOString(),
          body: {
            contentType: 'Text',
            content: 'Correo de diagnóstico específico para Gmail'
          },
          toRecipients: [{ emailAddress: 'test@gmail.com' }]
        }
        
        const gmailResult = await emailService.sendEmailWithGmailWorkaround(testMessage)
        
        diagnosticResult = {
          status: gmailResult.success ? 'ok' : 'blocked',
          gmailResult,
          recommendations: gmailResult.success ? 
            ['Gmail está funcionando correctamente'] :
            [
              'Gmail está bloqueando temporalmente',
              'Error 5.7.708: IP blocked by Gmail',
              'Espera 15-30 minutos antes de reintentar',
              'Considera configurar SPF/DKIM/DMARC'
            ],
          nextSteps: gmailResult.success ?
            ['Continuar con envíos normales'] :
            [
              'Configurar registros DNS correctamente',
              'Implementar rate limiting más conservador',
              'Contactar soporte de Microsoft si persiste',
              'Considerar servicio alternativo para Gmail'
            ]
        }
        break
        
      case 'full_diagnostic':
        // Diagnóstico completo
        const ipDiagnostic = await emailService.diagnoseIPBlocking()
        const providerTest = await emailService.testProviderDelivery({
          gmail: ['test@gmail.com'],
          icloud: ['test@icloud.com'],
          outlook: ['test@outlook.com']
        })
        
        diagnosticResult = {
          ipBlocking: ipDiagnostic,
          providerResults: providerTest,
          summary: {
            totalTests: Object.keys(providerTest).length,
            successful: Object.values(providerTest).filter((r: any) => r.success).length,
            failed: Object.values(providerTest).filter((r: any) => !r.success).length
          },
          recommendations: [
            ...ipDiagnostic.recommendations,
            'Verificar configuración DNS completa',
            'Monitorear métricas de entrega',
            'Implementar retry automático'
          ]
        }
        break
        
      default:
        return NextResponse.json(
          { error: 'Tipo de diagnóstico no válido' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      diagnosticType,
      result: diagnosticResult,
      timestamp: new Date().toISOString(),
      serverInfo: {
        senderEmail: process.env.OFFICE365_SENDER_EMAIL,
        tenantId: process.env.OFFICE365_TENANT_ID?.substring(0, 8) + '...'
      }
    })

  } catch (error) {
    console.error('Error en API de diagnóstico:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/email/diagnose
 * Obtiene información básica del servicio
 */
export async function GET() {
  try {
    const emailService = getEmailService()
    
    const isConfigValid = await emailService.validateConfig()
    
    return NextResponse.json({
      success: true,
      serviceStatus: isConfigValid ? 'healthy' : 'unhealthy',
      configValid: isConfigValid,
      timestamp: new Date().toISOString(),
      availableDiagnostics: [
        'ip_blocking',
        'gmail_specific', 
        'full_diagnostic'
      ]
    })
    
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Error obteniendo información del servicio',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
