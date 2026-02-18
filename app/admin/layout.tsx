"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { useAuthGuard } from "@/hooks/use-auth-redirect"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // TODO: Agregar verificación de rol super-admin
  // Por ahora, permitir acceso a todos para pruebas
  const { user, loading } = useAuthGuard()

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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  )
}
