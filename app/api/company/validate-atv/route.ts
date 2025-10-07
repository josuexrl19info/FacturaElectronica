/**
 * API Route para validación de credenciales ATV
 * POST /api/company/validate-atv
 */

import { NextRequest, NextResponse } from 'next/server'
import { ATVValidator } from '@/lib/atv-validator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, clientId, authUrl, receptionUrl } = body

    console.log('🔍 Validación ATV recibida:', {
      username: username ? 'Proporcionado' : 'Faltante',
      password: password ? 'Proporcionado' : 'Faltante',
      clientId: clientId || 'No proporcionado',
      authUrl: authUrl || 'No proporcionado',
      receptionUrl: receptionUrl || 'No proporcionado'
    });

    // Validaciones básicas
    if (!username || !password || !clientId || !authUrl) {
      return NextResponse.json(
        { 
          isValid: false, 
          message: 'Usuario, contraseña, Client ID y URL de autenticación son requeridos',
          errors: ['Campos requeridos faltantes']
        },
        { status: 400 }
      )
    }

    // Validar formato de credenciales
    const formatValidation = ATVValidator.validateCredentialFormat(username, password, clientId, authUrl)
    if (!formatValidation.isValid) {
      return NextResponse.json(formatValidation, { status: 400 })
    }

    // Validar credenciales contra Hacienda
    const validationResult = await ATVValidator.validateCredentials(username, password, clientId, authUrl)
    
    // No exponer el token en la respuesta por seguridad
    if (validationResult.token) {
      delete validationResult.token
    }

    return NextResponse.json(validationResult, { 
      status: validationResult.isValid ? 200 : 401 
    })

  } catch (error) {
    console.error('Error validating ATV credentials:', error)
    return NextResponse.json(
      {
        isValid: false,
        message: 'Error interno del servidor',
        errors: ['Error de procesamiento']
      },
      { status: 500 }
    )
  }
}
