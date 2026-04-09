"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, Settings, Sparkles } from "lucide-react"

type TenantCardProps = {
  id: string
  name: string
  status?: string
  ownerName?: string
  ownerEmail?: string
  isActive: boolean
  onEnter: () => void
  onOpenSettings: () => void
}

function statusLabel(status?: string) {
  if (status === "active") return "Activo"
  if (status === "inactive") return "Inactivo"
  if (status === "suspended") return "Suspendido"
  if (status === "trial") return "Trial"
  return status || "N/D"
}

export function TenantCard({
  name,
  status,
  ownerName,
  ownerEmail,
  isActive,
  onEnter,
  onOpenSettings
}: TenantCardProps) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <Card
        onClick={onEnter}
        className={`p-4 cursor-pointer transition-all duration-200 ${
          isActive
            ? "border-green-500 shadow-lg shadow-green-500/10 bg-gradient-to-br from-green-50/40 to-card dark:from-green-900/10"
            : "border-border/70 hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{isActive ? "Tenant en foco actual" : "Tenant disponible"}</p>
          </div>
          <Badge variant={isActive ? "default" : "secondary"} className="gap-1">
            {isActive ? <Sparkles className="w-3 h-3" /> : null}
            {isActive ? "Activo" : statusLabel(status)}
          </Badge>
        </div>

        <div className="mt-3 space-y-1.5">
          <p className="text-xs text-muted-foreground truncate">Correo: {ownerEmail || "Sin correo"}</p>
          <p className="text-xs text-muted-foreground truncate">Propietario: {ownerName || "Sin propietario"}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" onClick={onEnter} className="gap-1.5">
            Entrar
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-foreground hover:text-foreground"
          onClick={onOpenSettings}
        >
            <Settings className="w-3.5 h-3.5" />
            Configuración
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}
