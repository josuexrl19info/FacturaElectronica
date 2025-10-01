import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Building2, Bell, Shield } from "lucide-react"

const settingsSections = [
  {
    title: "Usuarios y Roles",
    description: "Gestione usuarios y permisos del sistema",
    icon: Users,
    href: "/dashboard/settings/users",
  },
  {
    title: "Información de Empresa",
    description: "Actualice datos de su empresa",
    icon: Building2,
    href: "/dashboard/settings/company",
  },
  {
    title: "Notificaciones",
    description: "Configure alertas y notificaciones",
    icon: Bell,
    href: "/dashboard/settings/notifications",
  },
  {
    title: "Seguridad",
    description: "Opciones de seguridad y privacidad",
    icon: Shield,
    href: "/dashboard/settings/security",
  },
]

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Configuración" description="Administre la configuración del sistema" />

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsSections.map((section) => {
            const Icon = section.icon
            return (
              <Card key={section.title} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1">{section.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
                    <Button variant="outline">Configurar</Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
