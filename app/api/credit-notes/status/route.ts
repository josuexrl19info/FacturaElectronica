import { NextRequest, NextResponse } from 'next/server'
import { checkCreditNoteStatus } from '@/lib/services/credit-note-status'

/**
 * POST /api/credit-notes/status
 * Endpoint HTTP que mantiene compatibilidad
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { creditNoteId, locationUrl, accessToken } = body

    const result = await checkCreditNoteStatus(creditNoteId, locationUrl, accessToken)
    
    return NextResponse.json(result, { 
      status: result.success ? 200 : 400 
    })
  } catch (error) {
    console.error('❌ Error en endpoint POST:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    )
  }
}