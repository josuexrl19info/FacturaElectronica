"use client"

import type React from "react"
import { DashboardHeader } from "@/components/layout/dashboard-header"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Configuración" description="Administre la configuración del sistema" />
      <div className="p-6">{children}</div>
    </div>
  )
}
