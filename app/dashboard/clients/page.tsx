"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ClientWizard } from "@/components/clients/client-wizard"
import { Plus, Search, Mail, Phone, MapPin, Edit, Trash2 } from "lucide-react"

const mockClients = [
  {
    id: "1",
    name: "Corporación XYZ S.A.",
    type: "juridica",
    taxId: "3-101-123456",
    email: "contacto@xyz.cr",
    phone: "2222-3333",
    address: "San José, Central, Carmen",
    paymentTerms: "credito",
    balance: 450000,
  },
  {
    id: "2",
    name: "Juan Pérez Rodríguez",
    type: "fisica",
    taxId: "1-0234-0567",
    email: "juan.perez@email.com",
    phone: "8888-9999",
    address: "Alajuela, Central, Alajuela",
    paymentTerms: "contado",
    balance: 0,
  },
  {
    id: "3",
    name: "Distribuidora ABC",
    type: "juridica",
    taxId: "3-101-789012",
    email: "ventas@abc.cr",
    phone: "2555-6666",
    address: "Heredia, Central, Heredia",
    paymentTerms: "credito",
    balance: 1250000,
  },
]

export default function ClientsPage() {
  const [showWizard, setShowWizard] = useState(false)
  const [clients, setClients] = useState(mockClients)
  const [searchTerm, setSearchTerm] = useState("")

  const handleAddClient = (data: any) => {
    console.log("New client:", data)
    setShowWizard(false)
    // Add to clients list
  }

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.taxId.includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Clientes" description="Gestione su cartera de clientes" />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, cédula o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button onClick={() => setShowWizard(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Agregar Cliente
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Clientes</p>
            <p className="text-3xl font-bold">{clients.length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Clientes a Crédito</p>
            <p className="text-3xl font-bold">{clients.filter((c) => c.paymentTerms === "credito").length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Saldo Pendiente</p>
            <p className="text-3xl font-bold">
              ₡{clients.reduce((sum, c) => sum + c.balance, 0).toLocaleString("es-CR")}
            </p>
          </Card>
        </div>

        {/* Clients List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
                  {client.name.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold">{client.name}</h3>
                        <Badge variant={client.type === "juridica" ? "default" : "secondary"}>
                          {client.type === "juridica" ? "Jurídica" : "Física"}
                        </Badge>
                        {client.paymentTerms === "credito" && <Badge variant="outline">Crédito</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">Cédula: {client.taxId}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  </div>

                  {client.balance > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Saldo Pendiente</span>
                        <span className="font-bold text-orange-600">₡{client.balance.toLocaleString("es-CR")}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No se encontraron clientes</h3>
            <p className="text-muted-foreground">Intente con otros términos de búsqueda</p>
          </Card>
        )}
      </div>

      {/* Wizard Modal */}
      {showWizard && <ClientWizard onClose={() => setShowWizard(false)} onSubmit={handleAddClient} />}
    </div>
  )
}
