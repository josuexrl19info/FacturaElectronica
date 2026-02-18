"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/firebase-client"
import { useRouter } from "next/navigation"
import { 
  Building2, 
  Users, 
  FileText, 
  TrendingUp, 
  Plus,
  Settings,
  BarChart3,
  AlertCircle
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

interface TenantStats {
  total: number
  active: number
  inactive: number
  suspended: number
  totalDocuments: number
  documentsThisMonth: number
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<TenantStats>({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    totalDocuments: 0,
    documentsThisMonth: 0
  })

  useEffect(() => {
    // TODO: Verificar que el usuario sea super-admin
    // Por ahora, permitir acceso a todos para pruebas
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/tenants')
      if (!response.ok) {
        throw new Error('Error al cargar tenants')
      }

      const data = await response.json()
      const tenants = data.tenants || []

      // Calcular estadísticas
      const stats: TenantStats = {
        total: tenants.length,
        active: tenants.filter((t: any) => t.status === 'active').length,
        inactive: tenants.filter((t: any) => t.status === 'inactive').length,
        suspended: tenants.filter((t: any) => t.status === 'suspended').length,
        totalDocuments: tenants.reduce((sum: number, t: any) => sum + (t.totalDocuments || 0), 0),
        documentsThisMonth: tenants.reduce((sum: number, t: any) => sum + (t.documentsThisMonth || 0), 0)
      }

      setStats(stats)
    } catch (err) {
      console.error('Error cargando estadísticas:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-CR').format(num)
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Panel de Super Administrador" 
        description="Gestión completa de tenants y licencias del sistema"
      />

      <div className="p-6 space-y-6">
        {error && (
          <Card className="p-4 border-destructive">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm">{error}</p>
            </div>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Tenants</p>
                  <h3 className="text-3xl font-bold">{loading ? "—" : formatNumber(stats.total)}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Licencias registradas</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Tenants Activos</p>
                  <h3 className="text-3xl font-bold text-green-600">{loading ? "—" : formatNumber(stats.active)}</h3>
                  <p className="text-xs text-muted-foreground mt-1">En operación</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Documentos Totales</p>
                  <h3 className="text-3xl font-bold">{loading ? "—" : formatNumber(stats.totalDocuments)}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Acumulado histórico</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Documentos Este Mes</p>
                  <h3 className="text-3xl font-bold text-orange-600">{loading ? "—" : formatNumber(stats.documentsThisMonth)}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Mes actual</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Acciones Rápidas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/admin/tenants/create">
                <Button className="w-full h-20 flex flex-col items-center justify-center gap-2" size="lg">
                  <Plus className="w-6 h-6" />
                  <span>Crear Nuevo Tenant</span>
                </Button>
              </Link>
              
              <Link href="/admin/tenants">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2" size="lg">
                  <Building2 className="w-6 h-6" />
                  <span>Gestionar Tenants</span>
                </Button>
              </Link>

              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2" size="lg" disabled>
                <BarChart3 className="w-6 h-6" />
                <span>Estadísticas Detalladas</span>
                <span className="text-xs text-muted-foreground">Próximamente</span>
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Recent Tenants */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Tenants Recientes</h2>
              <Link href="/admin/tenants">
                <Button variant="ghost" size="sm">Ver todos</Button>
              </Link>
            </div>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Cargando tenants...</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Usa "Gestionar Tenants" para ver la lista completa</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
