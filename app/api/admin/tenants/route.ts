import { NextRequest, NextResponse } from 'next/server'
import { TenantService, CreateTenantRequest } from '@/lib/services/tenant-service'
import { assertTenantAdminAccess } from '@/lib/server/tenant-admin-guard'

/**
 * GET /api/admin/tenants
 * Obtiene todos los tenants (solo para super-admin)
 * 
 * TODO: Agregar verificación de rol super-admin
 */
export async function GET(request: NextRequest) {
  const unauthorized = assertTenantAdminAccess(request)
  if (unauthorized) return unauthorized

  try {
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
  const unauthorized = assertTenantAdminAccess(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    
    const createdBy = request.headers.get('x-tenant-admin-email') || 'tenant-admin'

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
