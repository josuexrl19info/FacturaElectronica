"use client"

import { DashboardHeader } from "@/components/layout/dashboard-header"
import { DocumentForm } from "@/components/documents/document-form"
import { useRouter } from "next/navigation"

export default function CreditNotePage() {
  const router = useRouter()

  const handleSubmit = (data: any) => {
    console.log("Credit note data:", data)
    alert("Nota de crédito generada exitosamente")
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Nueva Nota de Crédito"
        description="Complete la información para generar una nota de crédito"
      />

      <div className="p-6 max-w-5xl mx-auto">
        <DocumentForm type="credit-note" onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
