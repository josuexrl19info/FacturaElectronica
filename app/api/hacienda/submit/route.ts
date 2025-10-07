import { NextRequest, NextResponse } from 'next/server'
import { HaciendaSubmissionService } from '@/lib/services/hacienda-submission'

/**
 * API route para envío de documentos a Hacienda
 * POST /api/hacienda/submit
 */

export async function POST(request: NextRequest) {
  try {
    console.log('📤 API: Iniciando envío de documento a Hacienda...')

    // Obtener datos del body
    const body = await request.json()
    const { invoiceData, signedXml, accessToken, companyData } = body

    // Validar datos requeridos
    if (!invoiceData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos de factura requeridos' 
        },
        { status: 400 }
      )
    }

    if (!signedXml) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'XML firmado requerido' 
        },
        { status: 400 }
      )
    }

    if (!accessToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Access token requerido' 
        },
        { status: 400 }
      )
    }

    if (!companyData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos de empresa requeridos' 
        },
        { status: 400 }
      )
    }

    console.log('📋 Datos recibidos:', {
      invoiceId: invoiceData.id,
      hasSignedXml: !!signedXml,
      hasAccessToken: !!accessToken,
      hasCompanyData: !!companyData,
      hasReceptionUrl: !!companyData.atvCredentials?.receptionUrl
    })

    // Realizar envío a Hacienda
    const submissionResult = await HaciendaSubmissionService.submitInvoiceToHacienda(
      invoiceData,
      signedXml,
      accessToken,
      companyData
    )

    if (!submissionResult.success) {
      console.error('❌ API: Error en envío:', submissionResult.error)
      return NextResponse.json(
        { 
          success: false, 
          error: submissionResult.error 
        },
        { status: 400 }
      )
    }

    console.log('✅ API: Envío exitoso')
    
    // Retornar resultado exitoso
    return NextResponse.json({
      success: true,
      response: submissionResult.response,
      message: 'Documento enviado exitosamente a Hacienda'
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
 * GET endpoint para obtener información sobre el servicio de envío
 */
export async function GET() {
  return NextResponse.json({
    service: 'Hacienda Document Submission Service',
    version: '1.0.0',
    description: 'Servicio para envío de documentos XML firmados a la API de Hacienda',
    endpoints: {
      POST: '/api/hacienda/submit - Enviar documento a Hacienda'
    },
    requiredFields: {
      invoiceData: 'Datos de la factura',
      signedXml: 'XML firmado del documento',
      accessToken: 'Token de acceso de Hacienda',
      companyData: {
        atvCredentials: {
          receptionUrl: 'URL de recepción de Hacienda'
        },
        identification: 'Identificación de la empresa',
        identificationType: 'Tipo de identificación'
      }
    },
    requestFormat: {
      clave: 'string - Clave del documento',
      fecha: 'string - Fecha de emisión',
      emisor: {
        tipoIdentificacion: 'string - Tipo de identificación del emisor',
        numeroIdentificacion: 'string - Número de identificación del emisor'
      },
      receptor: {
        tipoIdentificacion: 'string - Tipo de identificación del receptor',
        numeroIdentificacion: 'string - Número de identificación del receptor'
      },
      comprobanteXml: 'string - XML firmado del documento'
    }
  })
}
