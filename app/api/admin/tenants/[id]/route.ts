import { NextRequest, NextResponse } from 'next/server'
import { TenantService, UpdateTenantRequest } from '@/lib/services/tenant-service'

/**
 * GET /api/admin/tenants/[id]
 * Obtiene un tenant específico por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Verificar que el usuario sea super-admin
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'ID del tenant es requerido' },
        { status: 400 }
      )
    }

    // Obtener tenant usando el servicio
    const tenant = await TenantService.getTenantById(id)

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      tenant
    })

  } catch (error) {
    console.error('Error al obtener tenant:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/tenants/[id]
 * Actualiza un tenant específico
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Verificar que el usuario sea super-admin
    const { id } = params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID del tenant es requerido' },
        { status: 400 }
      )
    }

    const updateRequest: UpdateTenantRequest = {
      id,
      updates: body
    }

    // Actualizar tenant usando el servicio
    await TenantService.updateTenant(updateRequest)

    return NextResponse.json({
      success: true,
      message: 'Tenant actualizado exitosamente'
    })

  } catch (error) {
    console.error('Error al actualizar tenant:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
