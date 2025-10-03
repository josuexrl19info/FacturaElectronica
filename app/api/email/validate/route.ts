/**
 * API Route para validación de correos electrónicos
 * 
 * Endpoints disponibles:
 * POST /api/email/validate - Validar direcciones de correo
 */

import { NextRequest, NextResponse } from 'next/server'
import { getEmailService } from '@/lib/email/email-service'

/**
 * POST /api/email/validate
 * Valida una o múltiples direcciones de correo electrónico
 */
export async function POST(request: NextRequest) {
  try {
    const emailService = getEmailService()
    const body = await request.json()
    const { emails } = body

    if (!emails) {
      return NextResponse.json(
        { error: 'Lista de correos electrónicos es requerida' },
        { status: 400 }
      )
    }

    const emailList = Array.isArray(emails) ? emails : [emails]
    const validationResults = []

    for (const email of emailList) {
      if (typeof email !== 'string') {
        validationResults.push({
          email,
          isValid: false,
          errorType: 'invalid-format',
          errorMessage: 'El correo debe ser una cadena de texto'
        })
        continue
      }

      const result = await emailService.validateEmail(email)
      validationResults.push({
        email,
        ...result
      })
    }

    return NextResponse.json({
      success: true,
      results: validationResults,
      summary: {
        total: validationResults.length,
        valid: validationResults.filter(r => r.isValid).length,
        invalid: validationResults.filter(r => !r.isValid).length
      }
    })

  } catch (error) {
    console.error('Error validando correos:', error)
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
 * GET /api/email/validate
 * Información sobre el servicio de validación
 */
export async function GET() {
  return NextResponse.json({
    service: 'Email Validation Service',
    description: 'Valida direcciones de correo electrónico',
    features: [
      'Validación de formato',
      'Validación de dominio',
      'Validación múltiple',
      'Sugerencias de corrección'
    ]
  })
}
