/**
 * Componente para seleccionar actividad económica desde la API de Hacienda
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Building2, CheckCircle, AlertCircle, Star } from 'lucide-react'
import { EconomicActivity, HaciendaCompanyInfo } from '@/lib/company-wizard-types'

interface EconomicActivitySelectorProps {
  taxId: string
  value?: EconomicActivity
  onChange: (activity: EconomicActivity | undefined) => void
  onCompanyInfo?: (info: HaciendaCompanyInfo) => void
  className?: string
}

export function EconomicActivitySelector({
  taxId,
  value,
  onChange,
  onCompanyInfo,
  className
}: EconomicActivitySelectorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [companyInfo, setCompanyInfo] = useState<HaciendaCompanyInfo | null>(null)
  const [activities, setActivities] = useState<EconomicActivity[]>([])

  // Buscar automáticamente cuando cambie el taxId
  useEffect(() => {
    if (taxId && taxId.length >= 9) {
      const cleanTaxId = taxId.replace(/[-\s]/g, '')
      if (/^\d{9,10}$/.test(cleanTaxId)) {
        searchCompanyInfo(cleanTaxId)
      }
    } else {
      // Limpiar datos si no hay taxId válido
      setCompanyInfo(null)
      setActivities([])
      onChange(undefined)
    }
  }, [taxId])

  const searchCompanyInfo = async (cleanTaxId?: string) => {
    const taxIdToUse = cleanTaxId || taxId.replace(/[-\s]/g, '')
    
    if (!taxIdToUse || taxIdToUse.length < 9) {
      setError('Cédula inválida')
      return
    }

    setIsLoading(true)
    setError(null)
    setCompanyInfo(null)
    setActivities([])
    onChange(undefined)

    try {
      const response = await fetch(`/api/hacienda/company-info?identificacion=${taxIdToUse}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Error al consultar información')
      }

      setCompanyInfo(data)
      setActivities(data.actividades || [])
      
      // Notificar al componente padre
      if (onCompanyInfo) {
        onCompanyInfo(data)
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al consultar información')
    } finally {
      setIsLoading(false)
    }
  }

  const selectActivity = (activity: EconomicActivity) => {
    onChange(activity)
  }


  return (
    <div className={className}>
      <div className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Consultando información en Hacienda...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {companyInfo && (
          <Card className="mt-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-primary" />
                {companyInfo.nombre}
              </CardTitle>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{companyInfo.regimen.descripcion}</span>
                <span>•</span>
                <Badge variant={companyInfo.situacion.estado === 'Inscrito' ? 'default' : 'destructive'} className="text-xs px-1 py-0">
                  {companyInfo.situacion.estado}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {activities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Actividades Disponibles:</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {activities.map((activity, index) => (
                      <div 
                        key={`${activity.codigo}-${index}`}
                        className={`p-2 rounded border cursor-pointer transition-all ${
                          value?.codigo === activity.codigo 
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                        onClick={() => selectActivity(activity)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              {activity.tipo === 'P' && (
                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                              )}
                              <p className="text-xs font-medium leading-tight truncate">
                                {activity.descripcion}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Código: {activity.codigo}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              Activa
                            </Badge>
                            {value?.codigo === activity.codigo && (
                              <CheckCircle className="w-3 h-3 text-primary" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activities.length === 0 && (
                <Alert className="py-2">
                  <AlertCircle className="h-3 w-3" />
                  <AlertDescription className="text-xs">
                    Esta empresa no tiene códigos de actividad económica registrados actualmente en Hacienda.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {value && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Actividad Seleccionada:</span>
            </div>
            <div className="p-2 rounded border border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    {value.tipo === 'P' && (
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                    <p className="text-xs font-medium leading-tight truncate">
                      {value.descripcion}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Código: {value.codigo}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    Activa
                  </Badge>
                  <CheckCircle className="w-3 h-3 text-primary" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
