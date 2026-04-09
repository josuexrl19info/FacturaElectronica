"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Building2, Package, Plus, Users } from "lucide-react"
import type { TenantCatalogItem } from "@/components/tenant-admin/tenant-admin-provider"

interface TenantAdminHeaderProps {
  tenants: TenantCatalogItem[]
  activeTenantId: string
  activeTenantName: string
  switching: boolean
  summary: {
    users: number
    companies: number
    products: number
  }
  onSwitchTenant: (tenantId: string) => void
  onCreateTenant: () => void
}

export function TenantAdminHeader({
  tenants,
  activeTenantId,
  activeTenantName,
  switching,
  summary,
  onSwitchTenant,
  onCreateTenant
}: TenantAdminHeaderProps) {
  return (
    <Card className="p-5 border-border/70 shadow-sm bg-gradient-to-r from-card via-card to-primary/5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tenant activo</p>
          <h1 className="text-2xl font-bold tracking-tight">Trabajando en: {activeTenantName || "Sin tenant"}</h1>
          <p className="text-sm text-muted-foreground">
            Todas las secciones (Usuarios, Empresas, Productos) dependen del tenant seleccionado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <Users className="w-3 h-3" />
            Usuarios: {summary.users}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <Building2 className="w-3 h-3" />
            Empresas: {summary.companies}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <Package className="w-3 h-3" />
            Productos: {summary.products}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
        <div className="space-y-1">
          <Select
            value={activeTenantId}
            onValueChange={onSwitchTenant}
            disabled={switching || tenants.length === 0}
          >
            <SelectTrigger className="w-full h-10 bg-background/80 border-border/70">
              <SelectValue placeholder="Seleccionar tenant activo" />
            </SelectTrigger>
            <SelectContent>
              {tenants.length === 0 ? (
                <SelectItem value="__none" disabled>
                  No hay tenants disponibles
                </SelectItem>
              ) : (
                tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                    {tenant.id === activeTenantId ? " (activo)" : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {switching ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground"
            >
              Actualizando contexto del tenant...
            </motion.p>
          ) : null}
        </div>

        <Button onClick={onCreateTenant} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" />
          Crear nuevo tenant
        </Button>
      </div>
    </Card>
  )
}
