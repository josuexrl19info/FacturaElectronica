"use client"

import { useState, useEffect, useCallback } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, MapPin } from "lucide-react"
import { Provincia, Canton, Distrito } from "@/lib/costa-rica-geo"

interface GeoDropdownsProps {
  onLocationChange: (ubicacion: {
    provincia: Provincia | null
    canton: Canton | null
    distrito: Distrito | null
  }) => void
  initialValues?: {
    provinciaCodigo?: number
    cantonCodigo?: number
    distritoCodigo?: number
  }
  className?: string
  disabled?: boolean
}

export function GeoDropdowns({ 
  onLocationChange, 
  initialValues, 
  className = "",
  disabled = false 
}: GeoDropdownsProps) {
  const [provincias, setProvincias] = useState<Provincia[]>([])
  const [cantones, setCantones] = useState<Canton[]>([])
  const [distritos, setDistritos] = useState<Distrito[]>([])
  
  // Cache para evitar múltiples requests
  const [allCantones, setAllCantones] = useState<Canton[]>([])
  const [allDistritos, setAllDistritos] = useState<Distrito[]>([])
  
  const [selectedProvincia, setSelectedProvincia] = useState<Provincia | null>(null)
  const [selectedCanton, setSelectedCanton] = useState<Canton | null>(null)
  const [selectedDistrito, setSelectedDistrito] = useState<Distrito | null>(null)
  
  const [loading, setLoading] = useState({
    provincias: true,
    cantones: false,
    distritos: false
  })
  
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Cargar provincias al montar el componente
  useEffect(() => {
    loadProvincias()
  }, [])

  // Función para cargar valores iniciales
  const loadInitialValues = useCallback(async () => {
    if (!isInitialized || !initialValues || provincias.length === 0) return

    try {
      // Cargar provincia inicial
      if (initialValues.provinciaCodigo) {
        const provincia = provincias.find(p => p.codigo === initialValues.provinciaCodigo)
        if (provincia) {
          setSelectedProvincia(provincia)
          
          // Cargar cantones y cantón inicial si existe
          if (initialValues.cantonCodigo) {
            // Cargar todos los cantones si no están en cache
            let cantonesData = allCantones
            if (cantonesData.length === 0) {
              const response = await fetch('/data/costa-rica/cantones.json')
              if (!response.ok) throw new Error('Error al cargar cantones')
              cantonesData = await response.json()
              setAllCantones(cantonesData)
            }

            // Filtrar cantones por provincia
            const cantonesFiltered = cantonesData.filter((canton: any) => canton.provinciaCodigo === provincia.codigo)
            setCantones(cantonesFiltered)

            // Seleccionar cantón inicial
            const canton = cantonesFiltered.find((c: any) => c.codigo === initialValues.cantonCodigo)
            if (canton) {
              setSelectedCanton(canton)
              
              // Cargar distritos y distrito inicial si existe
              if (initialValues.distritoCodigo) {
                // Cargar todos los distritos si no están en cache
                let distritosData = allDistritos
                if (distritosData.length === 0) {
                  const distResponse = await fetch('/data/costa-rica/distritos.json')
                  if (!distResponse.ok) throw new Error('Error al cargar distritos')
                  distritosData = await distResponse.json()
                  setAllDistritos(distritosData)
                }

                // Filtrar distritos por cantón
                const distritosFiltered = distritosData.filter((distrito: any) => distrito.cantonCodigo === canton.codigo)
                setDistritos(distritosFiltered)

                // Seleccionar distrito inicial
                const distrito = distritosFiltered.find((d: any) => d.codigo === initialValues.distritoCodigo)
                if (distrito) {
                  setSelectedDistrito(distrito)
                }
              }
            }
          } else {
            // Solo cargar cantones sin seleccionar ninguno
            let cantonesData = allCantones
            if (cantonesData.length === 0) {
              const response = await fetch('/data/costa-rica/cantones.json')
              if (!response.ok) throw new Error('Error al cargar cantones')
              cantonesData = await response.json()
              setAllCantones(cantonesData)
            }
            const cantonesFiltered = cantonesData.filter((canton: any) => canton.provinciaCodigo === provincia.codigo)
            setCantones(cantonesFiltered)
          }
        }
      }
    } catch (error) {
      console.error('Error loading initial values:', error)
    }
  }, [isInitialized, initialValues, provincias, allCantones, allDistritos])

  // Manejar valores iniciales cuando se carguen las provincias
  useEffect(() => {
    loadInitialValues()
  }, [loadInitialValues])

  // Estabilizar la función onLocationChange para evitar bucles infinitos
  const stableOnLocationChange = useCallback(onLocationChange, [onLocationChange])

  // Notificar cambios de ubicación solo cuando hay una selección válida
  useEffect(() => {
    if (isInitialized) {
      stableOnLocationChange({
        provincia: selectedProvincia,
        canton: selectedCanton,
        distrito: selectedDistrito
      })
    }
  }, [selectedProvincia, selectedCanton, selectedDistrito, isInitialized, stableOnLocationChange])

  // Cargar cantones cuando cambie la provincia
  useEffect(() => {
    if (selectedProvincia) {
      loadCantones(selectedProvincia.codigo)
      // Limpiar selecciones dependientes
      setSelectedCanton(null)
      setSelectedDistrito(null)
      setDistritos([])
    }
  }, [selectedProvincia])

  // Cargar distritos cuando cambie el cantón
  useEffect(() => {
    if (selectedCanton) {
      loadDistritos(selectedCanton.codigo)
      // Limpiar selección dependiente
      setSelectedDistrito(null)
    }
  }, [selectedCanton])

  const loadProvincias = async () => {
    try {
      setLoading(prev => ({ ...prev, provincias: true }))
      setError(null)

      const response = await fetch('/data/costa-rica/provincias.json')
      if (!response.ok) throw new Error('Error al cargar provincias')

      const provincias = await response.json()
      setProvincias(provincias)
      setIsInitialized(true)
    } catch (error) {
      console.error('Error loading provincias:', error)
      setError('Error al cargar las provincias')
    } finally {
      setLoading(prev => ({ ...prev, provincias: false }))
    }
  }

  const loadCantones = async (provinciaCodigo: number) => {
    try {
      setLoading(prev => ({ ...prev, cantones: true }))
      setError(null)

      let cantonesData = allCantones
      
      // Si no tenemos los cantones en cache, cargarlos
      if (cantonesData.length === 0) {
        const response = await fetch('/data/costa-rica/cantones.json')
        if (!response.ok) throw new Error('Error al cargar cantones')
        
        cantonesData = await response.json()
        setAllCantones(cantonesData)
      }

      const cantonesFiltered = cantonesData.filter((canton: any) => canton.provinciaCodigo === provinciaCodigo)
      setCantones(cantonesFiltered)
    } catch (error) {
      console.error('Error loading cantones:', error)
      setError('Error al cargar los cantones')
    } finally {
      setLoading(prev => ({ ...prev, cantones: false }))
    }
  }

  const loadDistritos = async (cantonCodigo: number) => {
    try {
      setLoading(prev => ({ ...prev, distritos: true }))
      setError(null)

      let distritosData = allDistritos
      
      // Si no tenemos los distritos en cache, cargarlos
      if (distritosData.length === 0) {
        const response = await fetch('/data/costa-rica/distritos.json')
        if (!response.ok) throw new Error('Error al cargar distritos')
        
        distritosData = await response.json()
        setAllDistritos(distritosData)
      }

      const distritosFiltered = distritosData.filter((distrito: any) => distrito.cantonCodigo === cantonCodigo)
      setDistritos(distritosFiltered)
    } catch (error) {
      console.error('Error loading distritos:', error)
      setError('Error al cargar los distritos')
    } finally {
      setLoading(prev => ({ ...prev, distritos: false }))
    }
  }


  const handleProvinciaChange = (value: string) => {
    const codigo = Number(value)
    const provincia = provincias.find(p => p.codigo === codigo)
    setSelectedProvincia(provincia || null)
  }

  const handleCantonChange = (value: string) => {
    const codigo = Number(value)
    const canton = cantones.find(c => c.codigo === codigo)
    setSelectedCanton(canton || null)
  }

  const handleDistritoChange = (value: string) => {
    const codigo = Number(value)
    const distrito = distritos.find(d => d.codigo === codigo)
    setSelectedDistrito(distrito || null)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Provincia */}
        <div className="space-y-2">
          <Label htmlFor="provincia" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Provincia *
          </Label>
          <Select
            value={selectedProvincia?.codigo.toString() || ""}
            onValueChange={handleProvinciaChange}
            disabled={disabled || loading.provincias}
          >
            <SelectTrigger className="h-12 w-full min-w-[200px]">
              <SelectValue placeholder={loading.provincias ? "Cargando..." : "Seleccione una provincia"} />
            </SelectTrigger>
            <SelectContent className="min-w-[200px]">
              {provincias.map((provincia) => (
                <SelectItem key={provincia.codigo} value={provincia.codigo.toString()}>
                  {provincia.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loading.provincias && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Cargando provincias...
            </div>
          )}
        </div>

        {/* Cantón */}
        <div className="space-y-2">
          <Label htmlFor="canton" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Cantón *
          </Label>
          <Select
            value={selectedCanton?.codigo.toString() || ""}
            onValueChange={handleCantonChange}
            disabled={disabled || !selectedProvincia || loading.cantones}
          >
            <SelectTrigger className="h-12 w-full min-w-[200px]">
              <SelectValue 
                placeholder={
                  !selectedProvincia 
                    ? "Seleccione primero una provincia" 
                    : loading.cantones 
                      ? "Cargando..." 
                      : "Seleccione un cantón"
                } 
              />
            </SelectTrigger>
            <SelectContent className="min-w-[200px]">
              {cantones.map((canton) => (
                <SelectItem key={canton.codigo} value={canton.codigo.toString()}>
                  {canton.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loading.cantones && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Cargando cantones...
            </div>
          )}
        </div>

        {/* Distrito */}
        <div className="space-y-2">
          <Label htmlFor="distrito" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Distrito *
          </Label>
          <Select
            value={selectedDistrito?.codigo.toString() || ""}
            onValueChange={handleDistritoChange}
            disabled={disabled || !selectedCanton || loading.distritos}
          >
            <SelectTrigger className="h-12 w-full min-w-[200px]">
              <SelectValue 
                placeholder={
                  !selectedCanton 
                    ? "Seleccione primero un cantón" 
                    : loading.distritos 
                      ? "Cargando..." 
                      : "Seleccione un distrito"
                } 
              />
            </SelectTrigger>
            <SelectContent className="min-w-[200px]">
              {distritos.map((distrito) => (
                <SelectItem key={distrito.codigo} value={distrito.codigo.toString()}>
                  {distrito.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loading.distritos && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Cargando distritos...
            </div>
          )}
        </div>
      </div>

      {/* Información de la ubicación seleccionada */}
      {selectedProvincia && selectedCanton && selectedDistrito && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-medium">
              {selectedDistrito.nombre}, {selectedCanton.nombre}, {selectedProvincia.nombre}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Área del distrito: {selectedDistrito.area} km²
          </p>
        </div>
      )}
    </div>
  )
}
