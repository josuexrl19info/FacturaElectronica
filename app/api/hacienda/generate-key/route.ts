import { NextRequest, NextResponse } from 'next/server'
import { HaciendaKeyGenerator } from '@/lib/services/hacienda-key-generator'

/**
 * API route para generar claves de Hacienda
 * POST /api/hacienda/generate-key
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🔑 API: Generando clave de Hacienda...')

    // Obtener datos del body
    const body = await request.json()
    const { keyData, invoiceData, companyData } = body

    let result

    if (keyData) {
      // Generar clave con datos específicos
      console.log('📋 Generando clave con datos específicos...')
      result = HaciendaKeyGenerator.generateKey(keyData)
    } else if (invoiceData && companyData) {
      // Generar clave desde datos de factura
      console.log('📋 Generando clave desde datos de factura...')
      result = HaciendaKeyGenerator.generateKeyFromInvoice(invoiceData, companyData)
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Se requieren keyData o (invoiceData y companyData)' 
        },
        { status: 400 }
      )
    }

    if (!result.success) {
      console.error('❌ API: Error al generar clave:', result.error)
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 400 }
      )
    }

    console.log('✅ API: Clave generada exitosamente')
    
    // Retornar resultado exitoso
    return NextResponse.json({
      success: true,
      clave: result.clave,
      parts: result.parts,
      message: 'Clave generada exitosamente'
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
 * API route para validar claves de Hacienda
 * GET /api/hacienda/generate-key?clave=123456789...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clave = searchParams.get('clave')

    if (!clave) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Parámetro clave requerido' 
        },
        { status: 400 }
      )
    }

    console.log('🔍 API: Validando clave de Hacienda...')

    // Validar clave
    const validation = HaciendaKeyGenerator.validateKey(clave)
    
    if (!validation.valid) {
      console.error('❌ API: Clave inválida:', validation.error)
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error 
        },
        { status: 400 }
      )
    }

    // Obtener información de la clave
    const infoResult = HaciendaKeyGenerator.getKeyInfo(clave)
    
    if (!infoResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: infoResult.error 
        },
        { status: 400 }
      )
    }

    console.log('✅ API: Clave válida')
    
    // Retornar resultado exitoso
    return NextResponse.json({
      success: true,
      valid: true,
      info: infoResult.info,
      parts: validation.parts,
      message: 'Clave válida'
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
