"use client"

import { DashboardHeader } from "@/components/layout/dashboard-header"
import { DocumentForm } from "@/components/documents/document-form"
import { useRouter } from "next/navigation"

export default function DebitNotePage() {
  const router = useRouter()

  const handleSubmit = (data: any) => {
    console.log("Debit note data:", data)
    alert("Nota de débito generada exitosamente")
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Nueva Nota de Débito"
        description="Complete la información para generar una nota de débito"
      />

      <div className="p-6 max-w-5xl mx-auto">
        <DocumentForm type="debit-note" onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
