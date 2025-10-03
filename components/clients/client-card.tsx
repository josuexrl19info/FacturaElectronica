"use client"

import { useState, useEffect } from 'react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Mail, 
  Phone, 
  MapPin, 
  Edit, 
  Trash2, 
  Eye, 
  Building2,
  Calendar,
  DollarSign,
  FileText
} from "lucide-react"
import { Client } from '@/hooks/use-clients'
import { getLocationNames, getIdentificationTypeName, getEconomicActivityStatusName } from '@/lib/services/location-service'

interface ClientCardProps {
  client: Client
  onEdit?: (client: Client) => void
  onDelete?: (clientId: string) => void
  onView?: (client: Client) => void
}

export function ClientCard({ client, onEdit, onDelete, onView }: ClientCardProps) {
  const [locationNames, setLocationNames] = useState({
    provincia: '',
    canton: '',
    distrito: ''
  })
  const [loadingLocation, setLoadingLocation] = useState(true)

  // Cargar nombres de ubicación
  useEffect(() => {
    const loadLocation = async () => {
      if (client.province && client.canton && client.district) {
        setLoadingLocation(true)
        try {
          const names = await getLocationNames(
            client.province,
            client.canton,
            client.district
          )
          setLocationNames(names)
        } catch (error) {
          console.error('Error al cargar ubicación:', error)
        } finally {
          setLoadingLocation(false)
        }
      } else {
        setLoadingLocation(false)
      }
    }

    loadLocation()
  }, [client.province, client.canton, client.district])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (date: Date | string) => {
    if (!date) return 'N/A'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/20">
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0 shadow-sm">
          {getInitials(client.name)}
        </div>

        {/* Info Principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold truncate">{client.name}</h3>
                <Badge 
                  variant={client.identificationType === "02" ? "default" : "secondary"}
                  className="flex-shrink-0"
                >
                  {getIdentificationTypeName(client.identificationType)}
                </Badge>
                <Badge 
                  variant={client.status === 'active' ? 'default' : 'destructive'}
                  className="flex-shrink-0"
                >
                  {client.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              
              {client.commercialName && (
                <p className="text-sm text-muted-foreground mb-1">
                  <Building2 className="w-3 h-3 inline mr-1" />
                  {client.commercialName}
                </p>
              )}
              
              <p className="text-sm text-muted-foreground">
                Cédula: {client.identification}
              </p>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {onView && (
                <Button variant="ghost" size="icon" onClick={() => onView(client)}>
                  <Eye className="w-4 h-4" />
                </Button>
              )}
              {onEdit && (
                <Button variant="ghost" size="icon" onClick={() => onEdit(client)}>
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" onClick={() => onDelete(client.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>

          {/* Información de contacto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>{client.phoneCountryCode} {client.phone}</span>
            </div>
          </div>

          {/* Ubicación */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">
              {loadingLocation ? (
                'Cargando ubicación...'
              ) : (
                `${locationNames.provincia}, ${locationNames.canton}, ${locationNames.distrito}`
              )}
            </span>
          </div>

          {/* Información adicional */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            {/* Actividad Económica */}
            {client.economicActivity?.codigo && (
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {client.economicActivity.descripcion}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {client.economicActivity.codigo} - {getEconomicActivityStatusName(client.economicActivity.estado)}
                  </p>
                </div>
              </div>
            )}

            {/* Fecha de creación */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>Desde {formatDate(client.createdAt)}</span>
            </div>

            {/* Estadísticas */}
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>{client.totalInvoices} facturas</span>
            </div>
          </div>

          {/* Saldo pendiente */}
          {client.totalAmount > 0 && (
            <div className="mt-4 pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Saldo Total
                </span>
                <span className="font-bold text-orange-600">
                  {formatCurrency(client.totalAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Exoneración */}
          {client.exemption?.isExempt && (
            <div className="mt-3 pt-3 border-t">
              <Badge variant="outline" className="text-xs">
                Exonerado - {client.exemption.exemptionType}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
