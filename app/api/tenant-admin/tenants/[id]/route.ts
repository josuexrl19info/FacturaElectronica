import { NextRequest, NextResponse } from "next/server"
import { TenantService, UpdateTenantRequest } from "@/lib/services/tenant-service"
import { assertTenantAdminAccess } from "@/lib/server/tenant-admin-guard"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = assertTenantAdminAccess(request)
  if (unauthorized) return unauthorized

  try {
    const tenantId = params.id
    if (!tenantId) {
      return NextResponse.json({ error: "ID del tenant requerido" }, { status: 400 })
    }

    const tenant = await TenantService.getTenantById(tenantId)
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, tenant })
  } catch (error) {
    console.error("Error obteniendo tenant por id:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = assertTenantAdminAccess(request)
  if (unauthorized) return unauthorized

  try {
    const tenantId = params.id
    if (!tenantId) {
      return NextResponse.json({ error: "ID del tenant requerido" }, { status: 400 })
    }

    const body = await request.json()
    const updateRequest: UpdateTenantRequest = {
      id: tenantId,
      updates: body || {}
    }

    await TenantService.updateTenant(updateRequest)
    return NextResponse.json({ success: true, message: "Tenant actualizado correctamente" })
  } catch (error) {
    console.error("Error actualizando tenant:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    )
  }
}
