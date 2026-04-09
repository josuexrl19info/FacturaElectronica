export const TENANT_ADMIN_ALLOWED_EMAIL = "josuexrl19.info@gmail.com"

export function isTenantAdminEmail(email?: string | null): boolean {
  const normalized = (email || "").trim().toLowerCase()
  return normalized === TENANT_ADMIN_ALLOWED_EMAIL
}

export function getTenantAdminHeaderValue(email?: string | null): string {
  return (email || "").trim().toLowerCase()
}
