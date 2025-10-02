/**
 * API Route para validación de certificados .p12
 * POST /api/company/validate-certificate
 */

import { NextRequest, NextResponse } from 'next/server'
import { CertificateValidator } from '@/lib/certificate-validator'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const p12File = formData.get('p12File') as File
    const password = formData.get('password') as string
    const taxId = formData.get('taxId') as string

    // Validaciones básicas
    if (!p12File) {
      return NextResponse.json(
        {
          isValid: false,
          message: 'Archivo .p12 es requerido',
          errors: ['Archivo no proporcionado']
        },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        {
          isValid: false,
          message: 'Clave del certificado es requerida',
          errors: ['Clave no proporcionada']
        },
        { status: 400 }
      )
    }

    if (!taxId) {
      return NextResponse.json(
        {
          isValid: false,
          message: 'Cédula jurídica es requerida para validación',
          errors: ['Cédula jurídica no proporcionada']
        },
        { status: 400 }
      )
    }

    // Validar tipo de archivo
    if (!p12File.name.toLowerCase().endsWith('.p12') && !p12File.name.toLowerCase().endsWith('.pfx')) {
      return NextResponse.json(
        {
          isValid: false,
          message: 'El archivo debe ser un certificado .p12 o .pfx',
          errors: ['Tipo de archivo inválido']
        },
        { status: 400 }
      )
    }

    // Validar tamaño del archivo (máximo 5MB)
    if (p12File.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          isValid: false,
          message: 'El archivo es demasiado grande. Máximo 5MB.',
          errors: ['Archivo muy grande']
        },
        { status: 400 }
      )
    }

    // Validar certificado
    const validationResult = await CertificateValidator.validateP12Certificate(
      p12File,
      password,
      taxId
    )

    return NextResponse.json(validationResult, {
      status: validationResult.isValid ? 200 : 400
    })

  } catch (error) {
    console.error('Error validating certificate:', error)
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
