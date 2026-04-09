import { NextRequest, NextResponse } from "next/server"
import { isTenantAdminEmail } from "@/lib/tenant-admin-access"

export function assertTenantAdminAccess(request: NextRequest): NextResponse | null {
  const callerEmail = request.headers.get("x-tenant-admin-email")

  if (!isTenantAdminEmail(callerEmail)) {
    return NextResponse.json(
      {
        error: "No autorizado para el módulo de administración de tenants.",
        detail: "Acceso temporal restringido por correo."
      },
      { status: 403 }
    )
  }

  return null
}
