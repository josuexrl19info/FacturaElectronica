/**
 * API Route para datos geográficos de Costa Rica
 * GET /api/costa-rica/geo?type=provincias|cantones|distritos&parent=code
 */

import { NextRequest, NextResponse } from 'next/server'
import { costaRicaGeo } from '@/lib/costa-rica-geo'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const parent = searchParams.get('parent')

    // Inicializar el servicio
    await costaRicaGeo.initialize()

    switch (type) {
      case 'provincias':
        const provincias = await costaRicaGeo.getProvincias()
        return NextResponse.json({ data: provincias })

      case 'cantones':
        if (!parent) {
          return NextResponse.json(
            { error: 'Parent code is required for cantones' },
            { status: 400 }
          )
        }
        const cantones = await costaRicaGeo.getCantonesByProvincia(Number(parent))
        return NextResponse.json({ data: cantones })

      case 'distritos':
        if (!parent) {
          return NextResponse.json(
            { error: 'Parent code is required for distritos' },
            { status: 400 }
          )
        }
        const distritos = await costaRicaGeo.getDistritosByCanton(Number(parent))
        return NextResponse.json({ data: distritos })

      case 'ubicacion':
        const provinciaCode = searchParams.get('provincia')
        const cantonCode = searchParams.get('canton')
        const distritoCode = searchParams.get('distrito')

        if (!provinciaCode || !cantonCode || !distritoCode) {
          return NextResponse.json(
            { error: 'provincia, canton and distrito codes are required' },
            { status: 400 }
          )
        }

        const ubicacion = await costaRicaGeo.getUbicacionCompleta(
          Number(provinciaCode),
          Number(cantonCode),
          Number(distritoCode)
        )

        if (!ubicacion) {
          return NextResponse.json(
            { error: 'Ubicación no encontrada' },
            { status: 404 }
          )
        }

        return NextResponse.json({ data: ubicacion })

      case 'estadisticas':
        const estadisticas = await costaRicaGeo.getEstadisticas()
        return NextResponse.json({ data: estadisticas })

      case 'buscar':
        const nombreProvincia = searchParams.get('provincia')
        const nombreCanton = searchParams.get('canton')
        const nombreDistrito = searchParams.get('distrito')

        if (!nombreProvincia || !nombreCanton || !nombreDistrito) {
          return NextResponse.json(
            { error: 'provincia, canton and distrito names are required' },
            { status: 400 }
          )
        }

        const ubicacionEncontrada = await costaRicaGeo.buscarUbicacionPorNombres(
          nombreProvincia,
          nombreCanton,
          nombreDistrito
        )

        if (!ubicacionEncontrada) {
          return NextResponse.json(
            { error: 'Ubicación no encontrada' },
            { status: 404 }
          )
        }

        return NextResponse.json({ data: ubicacionEncontrada })

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Use: provincias, cantones, distritos, ubicacion, estadisticas, buscar' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in geo API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
