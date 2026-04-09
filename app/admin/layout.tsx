"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { useAuth } from "@/lib/firebase-client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { isTenantAdminEmail } from "@/lib/tenant-admin-access"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push("/")
      return
    }
    if (!isTenantAdminEmail(user.email)) {
      router.push("/dashboard")
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  if (!user || !isTenantAdminEmail(user.email)) {
    return null
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  )
}
