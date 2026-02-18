import { NextRequest, NextResponse } from 'next/server'
import { TenantService, CreateTenantRequest } from '@/lib/services/tenant-service'

/**
 * GET /api/admin/tenants
 * Obtiene todos los tenants (solo para super-admin)
 * 
 * TODO: Agregar verificación de rol super-admin
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Verificar que el usuario sea super-admin
    // const user = await verifySuperAdmin(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    // }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    // Consultar todos los tenants usando el servicio
    const tenants = await TenantService.getAllTenants(status)

    return NextResponse.json({
      success: true,
      tenants,
      total: tenants.length
    })

  } catch (error) {
    console.error('Error al obtener tenants:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/tenants
 * Crea un nuevo tenant (solo para super-admin)
 * 
 * TODO: Agregar verificación de rol super-admin
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Verificar que el usuario sea super-admin
    // const user = await verifySuperAdmin(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    // }

    const body = await request.json()
    
    // Obtener el ID del usuario que crea el tenant (del token de autenticación)
    // TODO: Obtener del token de autenticación
    const createdBy = 'super-admin-user-id' // Temporal

    const createRequest: CreateTenantRequest = {
      ...body,
      createdBy
    }

    // Crear tenant usando el servicio
    const tenantId = await TenantService.createTenant(createRequest)

    return NextResponse.json({
      success: true,
      tenantId,
      message: 'Tenant creado exitosamente'
    })

  } catch (error) {
    console.error('Error al crear tenant:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
