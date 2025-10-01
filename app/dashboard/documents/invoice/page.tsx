"use client"

import { DashboardHeader } from "@/components/layout/dashboard-header"
import { DocumentForm } from "@/components/documents/document-form"
import { useRouter } from "next/navigation"

export default function InvoicePage() {
  const router = useRouter()

  const handleSubmit = (data: any) => {
    console.log("Invoice data:", data)
    // Here you would send to Hacienda API
    alert("Factura generada exitosamente")
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Nueva Factura Electrónica"
        description="Complete la información para generar una factura electrónica"
      />

      <div className="p-6 max-w-5xl mx-auto">
        <DocumentForm type="invoice" onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
