"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { useAuthGuard } from "@/hooks/use-auth-redirect"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuthGuard()
  const [company, setCompany] = useState<any>(null)

  useEffect(() => {
    // Solo ejecutar si el usuario está autenticado
    if (!loading && user) {
      // Get selected company from localStorage
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) {
        router.push("/select-company")
        return
      }

      const mockCompany = {
        id: companyId,
        name: "TechCorp CR",
        logo: "/placeholder.svg?key=p4zn6",
        primaryColor: "#14b8a6", // Turquoise color
      }
      setCompany(mockCompany)
    }
  }, [router, user, loading])

  // Mostrar pantalla de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario autenticado, el hook ya redirigió al login
  if (!user) {
    return null
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Sidebar company={company} />
      <main className="ml-64 transition-all duration-300">{children}</main>
      
      {/* AI Chat Assistant - Fixed position in bottom right corner */}
      <button className="fixed bottom-6 right-6 w-12 h-12 gradient-primary rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-primary/25 group border-2 border-background/50 backdrop-blur-sm z-50">
        <MessageSquare className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300" />
        
        {/* Notification dot */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
        </div>
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 px-3 py-2 bg-popover text-popover-foreground rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 shadow-xl border scale-95 group-hover:scale-100">
          Asistente IA - ¡Pregúntame lo que necesites!
          <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-popover" />
        </div>
      </button>
    </div>
  )
}
