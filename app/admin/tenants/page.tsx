"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Building2, 
  Plus, 
  Search, 
  Eye,
  Edit,
  TrendingUp,
  FileText,
  Users,
  Calendar
} from "lucide-react"
import { motion } from "framer-motion"

interface Tenant {
  id: string
  name: string
  status: string
  plan?: string
  ownerName?: string
  ownerEmail?: string
  documentsThisMonth?: number
  totalDocuments?: number
  createdAt?: Date
}

export default function TenantsListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/tenants')
      if (!response.ok) {
        throw new Error('Error al cargar tenants')
      }

      const data = await response.json()
      setTenants(data.tenants || [])
    } catch (err) {
      console.error('Error cargando tenants:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const filteredTenants = tenants.filter(tenant => {
    const search = searchTerm.toLowerCase()
    return (
      tenant.name?.toLowerCase().includes(search) ||
      tenant.ownerName?.toLowerCase().includes(search) ||
      tenant.ownerEmail?.toLowerCase().includes(search) ||
      tenant.id.toLowerCase().includes(search)
    )
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'active': { variant: 'default', label: 'Activo' },
      'inactive': { variant: 'secondary', label: 'Inactivo' },
      'suspended': { variant: 'destructive', label: 'Suspendido' },
      'trial': { variant: 'outline', label: 'Prueba' }
    }
    const config = variants[status] || { variant: 'secondary' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(d)
  }

  const formatNumber = (num?: number) => {
    return num ? new Intl.NumberFormat('es-CR').format(num) : '0'
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Gestión de Tenants" 
        description="Administra todas las licencias y tenants del sistema"
      />

      <div className="p-6 space-y-6">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar tenants por nombre, propietario, email o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Link href="/admin/tenants/create">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Crear Tenant
            </Button>
          </Link>
        </div>

        {error && (
          <Card className="p-4 border-destructive">
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        )}

        {/* Tenants List */}
        {loading ? (
          <Card className="p-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Cargando tenants...</p>
            </div>
          </Card>
        ) : filteredTenants.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'No se encontraron tenants' : 'No hay tenants registrados'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Crea tu primer tenant para comenzar'
                }
              </p>
              {!searchTerm && (
                <Link href="/admin/tenants/create">
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Crear Primer Tenant
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTenants.map((tenant, index) => (
              <motion.div
                key={tenant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="p-6 hover:shadow-lg transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg truncate">{tenant.name || 'Sin nombre'}</h3>
                          <p className="text-xs text-muted-foreground truncate">ID: {tenant.id}</p>
                        </div>
                      </div>
                      {getStatusBadge(tenant.status)}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {tenant.ownerName && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Propietario:</span>
                        <span className="font-medium">{tenant.ownerName}</span>
                      </div>
                    )}
                    {tenant.ownerEmail && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium truncate">{tenant.ownerEmail}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Documentos:</span>
                      <span className="font-medium">{formatNumber(tenant.totalDocuments)} total</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Este mes:</span>
                      <span className="font-medium">{formatNumber(tenant.documentsThisMonth)}</span>
                    </div>
                    {tenant.createdAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Creado:</span>
                        <span className="font-medium">{formatDate(tenant.createdAt)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Link href={`/admin/tenants/${tenant.id}`} className="flex-1">
                      <Button variant="outline" className="w-full gap-2" size="sm">
                        <Eye className="w-4 h-4" />
                        Ver Detalles
                      </Button>
                    </Link>
                    <Button variant="outline" className="gap-2" size="sm" disabled>
                      <Edit className="w-4 h-4" />
                      Editar
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
