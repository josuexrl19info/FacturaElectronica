"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className="group"
    >
      <Card className="p-4 hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/20 hover:border-l-primary/60 cursor-pointer">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <motion.div 
            className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0 shadow-sm"
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            {getInitials(client.name)}
          </motion.div>

          {/* Info Principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold truncate">{client.name}</h3>
                  <Badge 
                    variant={client.identificationType === "02" ? "default" : "secondary"}
                    className="flex-shrink-0 text-xs px-2 py-0.5"
                  >
                    {getIdentificationTypeName(client.identificationType)}
                  </Badge>
                  <Badge 
                    variant={client.status === 'active' ? 'default' : 'destructive'}
                    className="flex-shrink-0 text-xs px-2 py-0.5"
                  >
                    {client.status === 'active' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Cédula: {client.identification}</span>
                  {client.commercialName && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {client.commercialName}
                    </span>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <motion.div 
                className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                initial={{ x: 10 }}
                animate={{ x: 0 }}
              >
                {onView && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(client)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                )}
                {onEdit && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(client)}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(client.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
              </motion.div>
            </div>

            {/* Información de contacto compacta */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{client.email}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="w-3 h-3 flex-shrink-0" />
                <span>{client.phoneCountryCode} {client.phone}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {loadingLocation ? (
                    'Cargando...'
                  ) : (
                    `${locationNames.provincia}, ${locationNames.canton}`
                  )}
                </span>
              </div>
            </div>

            {/* Información adicional compacta */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {client.economicActivity?.codigo && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {client.economicActivity.codigo}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(client.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {client.totalInvoices}
                </span>
              </div>

              {/* Saldo pendiente compacto */}
              {client.totalAmount > 0 && (
                <motion.div 
                  className="flex items-center gap-1"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <DollarSign className="w-3 h-3 text-orange-500" />
                  <span className="font-semibold text-orange-600 text-sm">
                    {formatCurrency(client.totalAmount)}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Exoneración compacta */}
            {client.exemption?.isExempt && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  Exonerado - {client.exemption.exemptionType}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
