"use client"

import { useState, useEffect } from 'react'
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Mail, 
  Phone, 
  MapPin, 
  Building2,
  Calendar,
  DollarSign,
  FileText,
  User,
  Shield
} from "lucide-react"
import { Client } from '@/hooks/use-clients'
import { getLocationNames, getIdentificationTypeName, getEconomicActivityStatusName } from '@/lib/services/location-service'

interface ClientViewDetailsProps {
  client: Client
}

export function ClientViewDetails({ client }: ClientViewDetailsProps) {
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

  const formatDate = (date: Date | string) => {
    if (!date) return 'N/A'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'long',
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
    <div className="space-y-6">
      {/* Información General */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Información General</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Nombre / Razón Social</label>
            <p className="text-sm">{client.name}</p>
          </div>
          
          {client.commercialName && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nombre Comercial</label>
              <p className="text-sm">{client.commercialName}</p>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Identificación</label>
            <div className="flex items-center gap-2">
              <p className="text-sm">{client.identification}</p>
              <Badge variant="outline">
                {getIdentificationTypeName(client.identificationType)}
              </Badge>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Estado</label>
            <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
              {client.status === 'active' ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Información de Contacto */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold">Información de Contacto</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Correo Electrónico</label>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm">{client.email}</p>
            </div>
          </div>
          
          {client.phone && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Teléfono</label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm">{client.phoneCountryCode} {client.phone}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Ubicación */}
      {(client.province || client.canton || client.district || client.otrasSenas) && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Ubicación</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingLocation ? (
              <div className="col-span-2 text-sm text-muted-foreground">Cargando ubicación...</div>
            ) : (
              <>
                {locationNames.provincia && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Provincia</label>
                    <p className="text-sm">{locationNames.provincia}</p>
                  </div>
                )}
                
                {locationNames.canton && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cantón</label>
                    <p className="text-sm">{locationNames.canton}</p>
                  </div>
                )}
                
                {locationNames.distrito && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Distrito</label>
                    <p className="text-sm">{locationNames.distrito}</p>
                  </div>
                )}
                
                {client.otrasSenas && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Otras Señas</label>
                    <p className="text-sm">{client.otrasSenas}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      )}

      {/* Actividad Económica */}
      {client.economicActivity && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold">Actividad Económica</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Código</label>
              <p className="text-sm font-mono">{client.economicActivity.codigo}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <Badge variant={client.economicActivity.estado === 'A' ? 'default' : 'secondary'}>
                {getEconomicActivityStatusName(client.economicActivity.estado)}
              </Badge>
            </div>
            
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Descripción</label>
              <p className="text-sm">{client.economicActivity.descripcion}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Exoneración */}
      {(client.tieneExoneracion && client.exoneracion) && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold">Información de Exoneración</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {client.exoneracion.tipoDocumento && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tipo de Documento</label>
                <p className="text-sm">{client.exoneracion.tipoDocumento}</p>
              </div>
            )}
            
            {client.exoneracion.numeroDocumento && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Número de Documento</label>
                <p className="text-sm">{client.exoneracion.numeroDocumento}</p>
              </div>
            )}
            
            {client.exoneracion.nombreInstitucion && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Institución</label>
                <p className="text-sm">{client.exoneracion.nombreInstitucion}</p>
              </div>
            )}
            
            {client.exoneracion.fechaEmision && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Fecha de Emisión</label>
                <p className="text-sm">{formatDate(client.exoneracion.fechaEmision)}</p>
              </div>
            )}
            
            {client.exoneracion.articulo && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Artículo</label>
                <p className="text-sm">{client.exoneracion.articulo}</p>
              </div>
            )}
            
            {client.exoneracion.inciso && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Inciso</label>
                <p className="text-sm">{client.exoneracion.inciso}</p>
              </div>
            )}
            
            {client.exoneracion.tarifaExonerada && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tarifa Exonerada</label>
                <p className="text-sm">{client.exoneracion.tarifaExonerada}%</p>
              </div>
            )}
            
            {client.exoneracion.nombreLey && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Nombre de la Ley</label>
                <p className="text-sm">{client.exoneracion.nombreLey}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Estadísticas */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold">Estadísticas</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Total de Facturas</label>
            <p className="text-2xl font-bold">{client.totalInvoices || 0}</p>
          </div>
          
          {client.createdAt && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha de Registro</label>
              <p className="text-sm">{formatDate(client.createdAt)}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
