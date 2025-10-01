"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { useRouter } from "next/navigation"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [company, setCompany] = useState<any>(null)

  useEffect(() => {
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
  }, [router])

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
    </div>
  )
}
