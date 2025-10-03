/**
 * API Route para crear empresas
 * POST /api/company/create
 */

import { NextRequest, NextResponse } from 'next/server'
import { CompanyService } from '@/lib/services/company-service'
import { CompanyWizardData } from '@/lib/company-wizard-types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Body recibido:', body)
    
    const { personalInfo, atvCredentials, certificate, primaryColor, userId } = body as {
      personalInfo: CompanyWizardData['personalInfo']
      atvCredentials: CompanyWizardData['atvCredentials']
      certificate: CompanyWizardData['certificate']
      primaryColor?: string
      userId: string
    }

    console.log('Datos extraídos:', {
      personalInfo: !!personalInfo,
      atvCredentials: !!atvCredentials,
      certificate: !!certificate,
      userId: !!userId,
      primaryColor
    })

    // Validaciones básicas
    if (!personalInfo || !atvCredentials || !certificate || !userId) {
      console.log('Error: Faltan datos requeridos')
      return NextResponse.json(
        { message: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Crear empresa usando el servicio
    const result = await CompanyService.createCompany({
      wizardData: {
        personalInfo,
        atvCredentials,
        certificate
      },
      primaryColor,
      userId
    })

    return NextResponse.json(result, { status: 201 })

  } catch (error) {
    console.error('Error creating company:', error)
    
    // Determinar el tipo de error y el código de estado
    const isValidationError = error instanceof Error && error.message.includes('es requerid')
    const statusCode = isValidationError ? 400 : 500
    
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: statusCode }
    )
  }
}
