"use client"

import { Card } from "@/components/ui/card"
import { Shield } from "lucide-react"

type RolesSettingsPanelProps = {
  embedded?: boolean
}

export function RolesSettingsPanel({ embedded = false }: RolesSettingsPanelProps) {
  return (
    <div className="space-y-6">
      {!embedded ? (
        <div>
          <h2 className="text-2xl font-bold">Gestión de Roles</h2>
          <p className="text-muted-foreground">Configure permisos y roles del sistema</p>
        </div>
      ) : null}

      <Card className="p-12 text-center">
        <Shield className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
        <h3 className="mb-2 text-2xl font-semibold">Próximamente</h3>
        <p className="mx-auto mb-6 max-w-md text-muted-foreground">
          La gestión avanzada de roles y permisos estará disponible en una próxima actualización. Por ahora, los roles
          se configuran directamente desde la base de datos.
        </p>
        <div className="mx-auto max-w-md rounded-lg bg-muted/50 p-4">
          <h4 className="mb-2 font-medium">Roles actuales disponibles:</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>• Administrador - Acceso completo</div>
            <div>• Colaborador - Acceso limitado</div>
            <div>• Vendedor - Solo ventas</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
