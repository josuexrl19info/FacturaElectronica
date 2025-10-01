"use client"

import { DashboardHeader } from "@/components/layout/dashboard-header"
import { DocumentForm } from "@/components/documents/document-form"
import { useRouter } from "next/navigation"

export default function TicketPage() {
  const router = useRouter()

  const handleSubmit = (data: any) => {
    console.log("Ticket data:", data)
    alert("Tiquete generado exitosamente")
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Nuevo Tiquete Electrónico"
        description="Complete la información para generar un tiquete electrónico"
      />

      <div className="p-6 max-w-5xl mx-auto">
        <DocumentForm type="ticket" onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
