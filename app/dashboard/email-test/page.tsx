"use client"

import { DashboardHeader } from "@/components/layout/dashboard-header"
import { EmailTestPanel } from "@/components/email/email-test-panel"

export default function EmailTestPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Pruebas de Correo" 
        description="Prueba el sistema de envío de correos electrónicos con Office 365" 
      />
      
      <div className="p-6">
        <EmailTestPanel />
      </div>
    </div>
  )
}
