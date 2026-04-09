"use client"

import { TenantAdminProvider } from "@/components/tenant-admin/tenant-admin-provider"

export default function TenantAdminLayout({ children }: { children: React.ReactNode }) {
  return <TenantAdminProvider>{children}</TenantAdminProvider>
}
