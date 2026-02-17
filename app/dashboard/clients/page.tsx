"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EnhancedClientWizard } from "@/components/clients/enhanced-client-wizard"
import { ClientCard } from "@/components/clients/client-card"
import { ClientViewDetails } from "@/components/clients/client-view-details"
import { useClients, Client } from "@/hooks/use-clients"
import { Plus, Search, Users, FileText, Loader2, RefreshCw } from "lucide-react"

export default function ClientsPage() {
  const [showWizard, setShowWizard] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const { clients, loading, error, fetchClients, addClient } = useClients()

  const handleAddClient = (data: any) => {
    console.log("New client:", data)
    setShowWizard(false)
    setIsEditing(false)
    setSelectedClient(null)
    // Refrescar la lista de clientes
    fetchClients()
  }

  const handleViewClient = (client: Client) => {
    setSelectedClient(client)
    setShowViewModal(true)
  }

  const handleEditClient = (client: Client) => {
    setSelectedClient(client)
    setIsEditing(true)
    setShowWizard(true)
  }

  const handleToggleStatus = async (client: Client) => {
    try {
      const newStatus = client.status === 'active' ? 'inactive' : 'active'
      
      const response = await fetch(`/api/clients/${client.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar el estado del cliente')
      }

      // Refrescar la lista de clientes
      await fetchClients()
    } catch (error) {
      console.error('Error al cambiar estado del cliente:', error)
      // Aquí podrías mostrar un toast de error
    }
  }

  const handleCloseWizard = () => {
    setShowWizard(false)
    setIsEditing(false)
    setSelectedClient(null)
  }

  const handleCloseViewModal = () => {
    setShowViewModal(false)
    setSelectedClient(null)
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
    const totalInvoices = clients.reduce((sum, c) => sum + (c.totalInvoices || 0), 0)

    return {
      totalClients,
      activeClients,
      totalInvoices
    }
  }, [clients])

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
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button onClick={() => setShowWizard(true)} className="gap-2">
                <motion.div
                  animate={{ rotate: [0, 90, 0] }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Plus className="w-4 h-4" />
                </motion.div>
                Agregar Cliente
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Stats */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, staggerChildren: 0.1 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.05 }}
          >
            <Card className="p-6 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"
                  whileHover={{ rotate: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Users className="w-5 h-5 text-blue-600" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clientes</p>
                  <motion.p 
                    className="text-2xl font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    {stats.totalClients}
                  </motion.p>
                </div>
              </div>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            whileHover={{ scale: 1.05 }}
          >
            <Card className="p-6 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"
                  whileHover={{ rotate: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Users className="w-5 h-5 text-green-600" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">Activos</p>
                  <motion.p 
                    className="text-2xl font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    {stats.activeClients}
                  </motion.p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
          >
            <Card className="p-6 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"
                  whileHover={{ rotate: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <FileText className="w-5 h-5 text-purple-600" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Facturas</p>
                  <motion.p 
                    className="text-2xl font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                  >
                    {stats.totalInvoices}
                  </motion.p>
                </div>
              </div>
            </Card>
          </motion.div>

        </motion.div>

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
            <motion.div 
              className="grid grid-cols-1 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence mode="wait">
                {filteredClients.map((client, index) => (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ 
                      duration: 0.3,
                      delay: index * 0.05 // Stagger effect
                    }}
                  >
                    <ClientCard
                      client={client}
                      onToggleStatus={handleToggleStatus}
                      onEdit={handleEditClient}
                      onView={handleViewClient}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

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
      {showWizard && (
        <EnhancedClientWizard 
          onClose={handleCloseWizard} 
          onSubmit={handleAddClient}
          editingClient={isEditing ? selectedClient : undefined}
        />
      )}

      {/* View Client Modal */}
      {showViewModal && selectedClient && (
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-7xl max-h-[90vh] overflow-y-auto w-full">
            <DialogHeader>
              <DialogTitle>Detalles del Cliente</DialogTitle>
            </DialogHeader>
            <ClientViewDetails client={selectedClient} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
