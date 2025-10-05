/**
 * API Route para probar envío de correos a diferentes proveedores
 * 
 * POST /api/email/test-providers - Prueba envío a Gmail, iCloud, etc.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getEmailService } from '@/lib/email/email-service'

/**
 * POST /api/email/test-providers
 * Prueba el envío de correos a diferentes proveedores de email
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar que el servicio esté configurado
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
    const { testEmails } = body

    // Emails de prueba por defecto si no se proporcionan
    const defaultTestEmails = {
      gmail: [
        'test@gmail.com',
        // Agrega tu email de Gmail aquí para pruebas reales
      ],
      icloud: [
        'test@icloud.com',
        // Agrega tu email de iCloud aquí para pruebas reales
      ],
      outlook: [
        'test@outlook.com',
        // Agrega tu email de Outlook aquí para pruebas reales
      ],
      yahoo: [
        'test@yahoo.com',
        // Agrega tu email de Yahoo aquí para pruebas reales
      ]
    }

    const emailsToTest = testEmails || defaultTestEmails

    // Ejecutar pruebas
    const results = await emailService.testProviderDelivery(emailsToTest)

    // Analizar resultados
    const summary = {
      total: Object.keys(results).length,
      successful: Object.values(results).filter(r => r.success).length,
      failed: Object.values(results).filter(r => !r.success).length,
      byProvider: {} as Record<string, { successful: number; failed: number; errors: string[] }>
    }

    // Agrupar resultados por proveedor
    Object.entries(results).forEach(([key, result]) => {
      const [provider] = key.split('_')
      if (!summary.byProvider[provider]) {
        summary.byProvider[provider] = { successful: 0, failed: 0, errors: [] }
      }
      
      if (result.success) {
        summary.byProvider[provider].successful++
      } else {
        summary.byProvider[provider].failed++
        if (result.error) {
          summary.byProvider[provider].errors.push(result.error)
        }
      }
    })

    return NextResponse.json({
      success: true,
      summary,
      results,
      recommendations: generateRecommendations(summary.byProvider),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en API de prueba de proveedores:', error)
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
 * Genera recomendaciones basadas en los resultados de las pruebas
 */
function generateRecommendations(providerResults: Record<string, { successful: number; failed: number; errors: string[] }>): string[] {
  const recommendations: string[] = []

  Object.entries(providerResults).forEach(([provider, stats]) => {
    if (stats.failed > 0) {
      switch (provider.toLowerCase()) {
        case 'gmail':
          recommendations.push(
            'Gmail: Verifica que tu dominio tenga configurados los registros SPF, DKIM y DMARC correctamente.',
            'Gmail: Considera usar Google Postmaster Tools para monitorear la reputación de tu dominio.',
            'Gmail: Asegúrate de que tu dominio no esté en listas negras.'
          )
          break
        case 'icloud':
          recommendations.push(
            'iCloud: Configura los registros SPF y DKIM para tu dominio.',
            'iCloud: Considera solicitar whitelist a Apple si es un dominio comercial.',
            'iCloud: Verifica que tu dominio tenga buena reputación.'
          )
          break
        case 'yahoo':
          recommendations.push(
            'Yahoo: Configura los registros SPF y DKIM.',
            'Yahoo: Considera usar Yahoo Postmaster Tools.'
          )
          break
        default:
          recommendations.push(
            `${provider}: Verifica la configuración de SPF, DKIM y DMARC para tu dominio.`
          )
      }
    }
  })

  if (recommendations.length === 0) {
    recommendations.push('¡Excelente! Todos los proveedores están funcionando correctamente.')
  }

  return recommendations
}
