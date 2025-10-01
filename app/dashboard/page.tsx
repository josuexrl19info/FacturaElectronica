import { DashboardHeader } from "@/components/layout/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { RecentDocuments } from "@/components/dashboard/recent-documents"
import { FileText, Users, Package, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Dashboard" description="Resumen general de su actividad de facturación" />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Documentos Este Mes"
            value="156"
            change="+12% vs mes anterior"
            changeType="positive"
            icon={FileText}
            color="#10b981"
          />
          <StatCard
            title="Clientes Activos"
            value="48"
            change="+5 nuevos"
            changeType="positive"
            icon={Users}
            color="#3b82f6"
          />
          <StatCard
            title="Productos"
            value="234"
            change="8 sin stock"
            changeType="neutral"
            icon={Package}
            color="#f59e0b"
          />
          <StatCard
            title="Facturación Total"
            value="₡12.5M"
            change="+18% vs mes anterior"
            changeType="positive"
            icon={TrendingUp}
            color="#ec4899"
          />
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Documents - Takes 2 columns */}
          <div className="lg:col-span-2">
            <RecentDocuments />
          </div>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-6">Acciones Rápidas</h2>
            <div className="space-y-3">
              <button className="w-full p-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-left font-medium">
                + Nueva Factura
              </button>
              <button className="w-full p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left font-medium">
                + Nuevo Cliente
              </button>
              <button className="w-full p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left font-medium">
                + Nuevo Producto
              </button>
              <button className="w-full p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left font-medium">
                Ver Reportes
              </button>
            </div>
          </Card>
        </div>

        {/* Additional Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-bold mb-4">Estado de Documentos</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Aceptados</span>
                <span className="font-bold text-green-600">142</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pendientes</span>
                <span className="font-bold text-yellow-600">8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rechazados</span>
                <span className="font-bold text-red-600">6</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold mb-4">Próximos Vencimientos</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">FE-089-2025</p>
                  <p className="text-sm text-muted-foreground">Corporación XYZ</p>
                </div>
                <span className="text-sm font-medium text-orange-600">3 días</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">FE-091-2025</p>
                  <p className="text-sm text-muted-foreground">Distribuidora ABC</p>
                </div>
                <span className="text-sm font-medium text-orange-600">5 días</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
