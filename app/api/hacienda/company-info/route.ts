/**
 * API Route para consultar información de empresa en Hacienda
 * GET /api/hacienda/company-info?identificacion=3102934151
 */

import { NextRequest, NextResponse } from 'next/server'
import { HaciendaCompanyInfo } from '@/lib/company-wizard-types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const identificacion = searchParams.get('identificacion')

    if (!identificacion) {
      return NextResponse.json(
        { message: 'El parámetro identificacion es requerido' },
        { status: 400 }
      )
    }

    // Validar formato de identificación
    const cleanId = identificacion.replace(/[-\s]/g, '')
    if (!/^\d{9,10}$/.test(cleanId)) {
      return NextResponse.json(
        { message: 'Formato de identificación inválido. Debe tener 9 o 10 dígitos.' },
        { status: 400 }
      )
    }

    // Consultar API de Hacienda
    const haciendaUrl = `https://api.hacienda.go.cr/fe/ae?identificacion=${cleanId}`
    
    const response = await fetch(haciendaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'InvoSell/1.0'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { message: 'No se encontró información para esta identificación en Hacienda' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { message: 'Error al consultar información en Hacienda' },
        { status: response.status }
      )
    }

    const data: HaciendaCompanyInfo = await response.json()

    // Validar que la respuesta tiene la estructura esperada
    if (!data.nombre || !data.actividades || !Array.isArray(data.actividades)) {
      return NextResponse.json(
        { message: 'Respuesta inválida de la API de Hacienda' },
        { status: 500 }
      )
    }

    // Filtrar solo actividades activas
    const actividadesActivas = data.actividades.filter(actividad => actividad.estado === 'A')

    const responseData = {
      ...data,
      actividades: actividadesActivas,
      totalActividades: data.actividades.length,
      actividadesActivas: actividadesActivas.length
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Error fetching company info from Hacienda:', error)
    
    // Si es un error de red o timeout
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { message: 'Error de conexión con Hacienda. Intente nuevamente.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
