"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { 
  Building2, 
  ArrowLeft,
  Users,
  FileText,
  TrendingUp,
  Calendar,
  Mail,
  Phone,
  Settings,
  BarChart3
} from "lucide-react"
import { motion } from "framer-motion"

interface Tenant {
  id: string
  name: string
  status: string
  plan?: string
  ownerName?: string
  ownerEmail?: string
  ownerPhone?: string
  documentsThisMonth?: number
  documentsLastMonth?: number
  totalDocuments?: number
  maxCompanies?: number
  maxUsers?: number
  maxDocumentsPerMonth?: number
  createdAt?: Date
  updatedAt?: Date
  notes?: string
  tags?: string[]
}

export default function TenantDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)

  useEffect(() => {
    if (tenantId) {
      fetchTenant()
    }
  }, [tenantId])

  const fetchTenant = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/tenants/${tenantId}`)
      if (!response.ok) {
        throw new Error('Error al cargar tenant')
      }

      const data = await response.json()
      setTenant(data.tenant)
    } catch (err) {
      console.error('Error cargando tenant:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d)
  }

  const formatNumber = (num?: number) => {
    return num ? new Intl.NumberFormat('es-CR').format(num) : '0'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Cargando..." description="" />
        <div className="p-6">
          <Card className="p-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Cargando información del tenant...</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Error" description="" />
        <div className="p-6">
          <Card className="p-6 border-destructive">
            <p className="text-destructive mb-4">{error || 'Tenant no encontrado'}</p>
            <Link href="/admin/tenants">
              <Button variant="outline">Volver a la lista</Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title={tenant.name || 'Detalles del Tenant'} 
        description={`ID: ${tenant.id}`}
      />

      <div className="p-6 space-y-6">
        {/* Back Button */}
        <Link href="/admin/tenants">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver a la lista
          </Button>
        </Link>

        {/* Status and Plan */}
        <div className="flex items-center gap-4">
          {getStatusBadge(tenant.status)}
          {tenant.plan && (
            <Badge variant="outline">Plan: {tenant.plan}</Badge>
          )}
        </div>

        {/* Main Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Basic Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Información Básica
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Nombre del Tenant</p>
                  <p className="font-semibold">{tenant.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">ID del Tenant</p>
                  <p className="font-mono text-sm">{tenant.id}</p>
                </div>
                {tenant.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notas</p>
                    <p className="text-sm">{tenant.notes}</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Información del Propietario
              </h3>
              <div className="space-y-4">
                {tenant.ownerName && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Nombre</p>
                    <p className="font-semibold">{tenant.ownerName}</p>
                  </div>
                )}
                {tenant.ownerEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Email</p>
                      <p className="font-semibold">{tenant.ownerEmail}</p>
                    </div>
                  </div>
                )}
                {tenant.ownerPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Teléfono</p>
                      <p className="font-semibold">{tenant.ownerPhone}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - Stats and Limits */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Estadísticas
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Documentos Totales</p>
                  <p className="text-2xl font-bold">{formatNumber(tenant.totalDocuments)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Este Mes</p>
                  <p className="text-xl font-semibold text-green-600">{formatNumber(tenant.documentsThisMonth)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Mes Anterior</p>
                  <p className="text-lg font-medium">{formatNumber(tenant.documentsLastMonth)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Límites Configurados
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Máx. Empresas</p>
                  <p className="font-semibold">{tenant.maxCompanies ? formatNumber(tenant.maxCompanies) : 'Sin límite'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Máx. Usuarios</p>
                  <p className="font-semibold">{tenant.maxUsers ? formatNumber(tenant.maxUsers) : 'Sin límite'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Máx. Documentos/Mes</p>
                  <p className="font-semibold">{tenant.maxDocumentsPerMonth ? formatNumber(tenant.maxDocumentsPerMonth) : 'Sin límite'}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Fechas
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Creado</p>
                  <p className="font-semibold text-sm">{formatDate(tenant.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Última Actualización</p>
                  <p className="font-semibold text-sm">{formatDate(tenant.updatedAt)}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
