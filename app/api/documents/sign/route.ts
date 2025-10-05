import { NextRequest, NextResponse } from 'next/server'
import { DigitalSignatureService } from '@/lib/services/digital-signature'

/**
 * API para firmar documentos XML digitalmente
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { xml, certificate_base64, password, document_type } = body

    // Validar datos requeridos
    if (!xml || !certificate_base64 || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Faltan datos requeridos: xml, certificate_base64, password' 
        },
        { status: 400 }
      )
    }

    console.log('🔐 Iniciando firma de documento:', document_type || 'documento')

    // Firmar el XML
    const result = await DigitalSignatureService.signXML(
      xml,
      certificate_base64,
      password
    )

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false,
          error: result.error 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      signed_xml: result.signed_xml,
      message: result.message || 'Documento firmado exitosamente'
    })

  } catch (error) {
    console.error('❌ Error en API de firma:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}
