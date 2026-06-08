"use client"

import { Card } from "@/components/ui/card"
import { Settings2 } from "lucide-react"

export function AdditionalPersonalizationTab() {
  return (
    <Card className="border-primary/15 p-10 text-center">
      <Settings2 className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
      <h3 className="mb-2 text-xl font-semibold">Configuración adicional</h3>
      <p className="mx-auto max-w-lg text-muted-foreground">
        Aquí agregaremos más opciones de personalización del sistema (textos, comportamiento, campos visibles y
        preferencias avanzadas por empresa).
      </p>
    </Card>
  )
}
