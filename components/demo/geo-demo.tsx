"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { GeoDropdowns } from "@/components/ui/geo-dropdowns"
import { Provincia, Canton, Distrito } from "@/lib/costa-rica-geo"
import { Badge } from "@/components/ui/badge"
import { MapPin, Info } from "lucide-react"

export function GeoDemo() {
  const [selectedLocation, setSelectedLocation] = useState<{
    provincia: Provincia | null
    canton: Canton | null
    distrito: Distrito | null
  }>({
    provincia: null,
    canton: null,
    distrito: null
  })

  const [locationHistory, setLocationHistory] = useState<Array<{
    provincia: Provincia
    canton: Canton
    distrito: Distrito
    timestamp: Date
  }>>([])

  const handleLocationChange = (location: {
    provincia: Provincia | null
    canton: Canton | null
    distrito: Distrito | null
  }) => {
    setSelectedLocation(location)
    
    // Agregar a historial si está completa
    if (location.provincia && location.canton && location.distrito) {
      setLocationHistory(prev => [
        {
          provincia: location.provincia!,
          canton: location.canton!,
          distrito: location.distrito!,
          timestamp: new Date()
        },
        ...prev.slice(0, 4) // Mantener solo los últimos 5
      ])
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold">Demo: Dropdowns Geográficos de Costa Rica</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>
              Seleccione una provincia para cargar sus cantones, luego un cantón para cargar sus distritos.
            </span>
          </div>

          <GeoDropdowns
            onLocationChange={handleLocationChange}
            className="border rounded-lg p-4 bg-muted/20"
          />
        </div>
      </Card>

      {/* Información de la ubicación seleccionada */}
      {selectedLocation.provincia && selectedLocation.canton && selectedLocation.distrito && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4">Ubicación Seleccionada</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Badge variant="outline" className="w-full justify-center">
                Provincia
              </Badge>
              <p className="text-center font-medium">
                {selectedLocation.provincia.nombre}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Código: {selectedLocation.provincia.codigo}
              </p>
            </div>
            
            <div className="space-y-2">
              <Badge variant="outline" className="w-full justify-center">
                Cantón
              </Badge>
              <p className="text-center font-medium">
                {selectedLocation.canton.nombre}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Código: {selectedLocation.canton.codigo}
              </p>
            </div>
            
            <div className="space-y-2">
              <Badge variant="outline" className="w-full justify-center">
                Distrito
              </Badge>
              <p className="text-center font-medium">
                {selectedLocation.distrito.nombre}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Código: {selectedLocation.distrito.codigo}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Área: {selectedLocation.distrito.area} km²
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Historial de ubicaciones */}
      {locationHistory.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4">Historial de Ubicaciones</h4>
          <div className="space-y-3">
            {locationHistory.map((location, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{index + 1}</Badge>
                  <div>
                    <p className="font-medium">
                      {location.distrito.nombre}, {location.canton.nombre}, {location.provincia.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Área: {location.distrito.area} km²
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {location.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
