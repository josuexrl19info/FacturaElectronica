"use client"

import { useState, useMemo } from "react"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EnhancedClientWizard } from "@/components/clients/enhanced-client-wizard"
import { ClientCard } from "@/components/clients/client-card"
import { useClients, Client } from "@/hooks/use-clients"
import { Plus, Search, Users, DollarSign, FileText, Loader2, RefreshCw } from "lucide-react"

export default function ClientsPage() {
  const [showWizard, setShowWizard] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const { clients, loading, error, fetchClients, addClient } = useClients()

  const handleAddClient = (data: any) => {
    console.log("New client:", data)
    setShowWizard(false)
    // Refrescar la lista de clientes
    fetchClients()
  }

  const handleRefresh = () => {
    fetchClients()
  }

  // Filtrar clientes basado en el término de búsqueda
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients

    const term = searchTerm.toLowerCase()
    return clients.filter((client) =>
      client.name.toLowerCase().includes(term) ||
      client.identification.includes(term) ||
      client.email.toLowerCase().includes(term) ||
      (client.commercialName && client.commercialName.toLowerCase().includes(term)) ||
      (client.economicActivity?.descripcion && client.economicActivity.descripcion.toLowerCase().includes(term))
    )
  }, [clients, searchTerm])

  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalClients = clients.length
    const activeClients = clients.filter(c => c.status === 'active').length
    const totalAmount = clients.reduce((sum, c) => sum + c.totalAmount, 0)
    const totalInvoices = clients.reduce((sum, c) => sum + c.totalInvoices, 0)

    return {
      totalClients,
      activeClients,
      totalAmount,
      totalInvoices
    }
  }, [clients])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Clientes" description="Gestione su cartera de clientes" />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, cédula, correo o actividad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setShowWizard(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Agregar Cliente
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold">{stats.activeClients}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Facturas</p>
                <p className="text-2xl font-bold">{stats.totalInvoices}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto Total</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Loading State */}
        {loading && (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
            </div>
            <h3 className="text-xl font-bold mb-2">Cargando clientes...</h3>
            <p className="text-muted-foreground">Por favor espere mientras se cargan los datos</p>
          </Card>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="p-12 text-center border-destructive/20 bg-destructive/5">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-destructive">Error al cargar clientes</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </Card>
        )}

        {/* Clients List */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 gap-4">
              {filteredClients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onEdit={(client) => console.log('Edit client:', client)}
                  onDelete={(clientId) => console.log('Delete client:', clientId)}
                  onView={(client) => console.log('View client:', client)}
                />
              ))}
            </div>

            {/* Empty State */}
            {filteredClients.length === 0 && searchTerm && (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">No se encontraron clientes</h3>
                <p className="text-muted-foreground mb-4">
                  No hay clientes que coincidan con "{searchTerm}"
                </p>
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Limpiar búsqueda
                </Button>
              </Card>
            )}

            {/* No Clients State */}
            {filteredClients.length === 0 && !searchTerm && (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">No tienes clientes aún</h3>
                <p className="text-muted-foreground mb-4">
                  Comienza agregando tu primer cliente para gestionar tu cartera
                </p>
                <Button onClick={() => setShowWizard(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primer Cliente
                </Button>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Wizard Modal */}
      {showWizard && <EnhancedClientWizard onClose={() => setShowWizard(false)} onSubmit={handleAddClient} />}
    </div>
  )
}
