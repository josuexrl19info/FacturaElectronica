import { NextRequest, NextResponse } from 'next/server'
import { InvoiceConsecutiveService } from '@/lib/services/invoice-consecutive'

/**
 * API route para manejar consecutivos de facturas
 * GET /api/invoices/consecutive?companyId=xxx - Obtener consecutivo actual
 * POST /api/invoices/consecutive - Obtener siguiente consecutivo
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'companyId requerido' 
        },
        { status: 400 }
      )
    }

    console.log('📊 API: Obteniendo consecutivo actual para empresa:', companyId)

    const result = await InvoiceConsecutiveService.getCurrentConsecutive(companyId)

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
      consecutive: result.consecutive,
      formatted: result.formatted,
      message: 'Consecutivo actual obtenido'
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'companyId requerido' 
        },
        { status: 400 }
      )
    }

    console.log('🔢 API: Obteniendo siguiente consecutivo para empresa:', companyId)

    const result = await InvoiceConsecutiveService.getAndUpdateConsecutive(companyId)

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
      consecutive: result.consecutive,
      message: 'Siguiente consecutivo obtenido y actualizado'
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
