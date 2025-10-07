import { NextRequest, NextResponse } from 'next/server'
import { HaciendaAuthService } from '@/lib/services/hacienda-auth'

/**
 * API route para autenticación con Hacienda
 * POST /api/hacienda/auth
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 API: Iniciando autenticación con Hacienda...')

    // Obtener datos del body
    const body = await request.json()
    const { companyData } = body

    if (!companyData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos de empresa requeridos' 
        },
        { status: 400 }
      )
    }

    console.log('🏢 Datos de empresa recibidos:', {
      id: companyData.id,
      name: companyData.name,
      hasAtvCredentials: !!companyData.atvCredentials
    })

    // Realizar autenticación con Hacienda
    const authResult = await HaciendaAuthService.authenticateFromCompany(companyData)

    if (!authResult.success) {
      console.error('❌ API: Error en autenticación:', authResult.error)
      return NextResponse.json(
        { 
          success: false, 
          error: authResult.error 
        },
        { status: 401 }
      )
    }

    console.log('✅ API: Autenticación exitosa')
    
    // Retornar resultado exitoso
    return NextResponse.json({
      success: true,
      accessToken: authResult.accessToken,
      expiresIn: authResult.expiresIn,
      tokenType: authResult.tokenResponse?.token_type || 'Bearer',
      timeRemaining: authResult.expiresIn ? 
        Math.floor(authResult.expiresIn / 60) : null
    })

  } catch (error) {
    console.error('❌ API: Error interno:', error)
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
 * GET endpoint para obtener información sobre el servicio de autenticación
 */
export async function GET() {
  return NextResponse.json({
    service: 'Hacienda Authentication Service',
    version: '1.0.0',
    description: 'Servicio para autenticación con la API de Hacienda',
    endpoints: {
      POST: '/api/hacienda/auth - Autenticar con Hacienda usando datos de empresa'
    },
    requiredFields: {
      companyData: {
        atvCredentials: {
          authUrl: 'string',
          clientId: 'string', 
          username: 'string',
          password: 'string'
        }
      }
    }
  })
}
