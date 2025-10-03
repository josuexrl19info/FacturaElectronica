"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/lib/firebase-client"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { X, ChevronLeft, ChevronRight, Check, Building2, User, MapPin, FileText } from "lucide-react"
import { 
  ClientFormData, 
  IDENTIFICATION_TYPES, 
  EXEMPTION_TYPES, 
  INSTITUTION_TYPES 
} from "@/lib/client-wizard-types"
import { PhoneInputWithFlags } from "@/components/ui/phone-input-with-flags"
import { GeoDropdowns } from "@/components/ui/geo-dropdowns"
import { EconomicActivitySelector } from "@/components/ui/economic-activity-selector"
import { TaxIdInputClean } from "@/components/ui/tax-id-input-clean"

interface EnhancedClientWizardProps {
  onClose: () => void
  onSubmit: (data: ClientFormData) => void
}

export function EnhancedClientWizard({ onClose, onSubmit }: EnhancedClientWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const [formData, setFormData] = useState<ClientFormData>({
    // Información general
    name: "",
    commercialName: "",
    identification: "",
    identificationType: "01",
    email: "",
    phone: "",
    phoneCountryCode: "+506",
    
    // Ubicación
    province: "",
    canton: "",
    district: "",
    otrasSenas: "",
    
    // Actividad económica
    economicActivity: {
      codigo: "",
      descripcion: "",
      estado: ""
    },
    
    // Exoneración
    hasExemption: false,
    exemptionType: "",
    exemptionDocumentNumber: "",
    exemptionDocumentDate: "",
    exemptionInstitution: "",
    exemptionInstitutionOthers: "",
    exemptionTariff: 0,
    exemptionObservations: ""
  })

  // Función para formatear la cédula
  const formatTaxId = (value: string, type: 'fisica' | 'juridica') => {
    const numbers = value.replace(/\D/g, '')
    
    if (type === 'fisica') {
      // Cédula física: 9 dígitos - formato 1-1234-5678
      if (numbers.length <= 1) return numbers
      if (numbers.length <= 5) return `${numbers.slice(0, 1)}-${numbers.slice(1)}`
      return `${numbers.slice(0, 1)}-${numbers.slice(1, 5)}-${numbers.slice(5, 9)}`
    } else {
      // Cédula jurídica: 10 dígitos - formato 3-101-123456
      if (numbers.length <= 3) return numbers
      if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
    }
  }

  // Estados para almacenar los nombres de ubicación
  const [locationNames, setLocationNames] = useState<{
    provincia: string
    canton: string
    distrito: string
  }>({
    provincia: '',
    canton: '',
    distrito: ''
  })

  // Función para obtener nombres de ubicación
  const getLocationNames = async () => {
    if (!formData.province || !formData.canton || !formData.district) return

    try {
      // Cargar provincias
      const provincesResponse = await fetch('/data/costa-rica/provincias.json')
      if (!provincesResponse.ok) {
        console.warn('No se pudo cargar provincias.json')
        return
      }
      const provinces = await provincesResponse.json()
      const provincia = provinces.find((p: any) => p.codigo.toString() === formData.province)

      if (provincia) {
        // Cargar cantones
        const cantonsResponse = await fetch('/data/costa-rica/cantones.json')
        if (!cantonsResponse.ok) {
          console.warn('No se pudo cargar cantones.json')
          setLocationNames({
            provincia: provincia.nombre,
            canton: formData.canton,
            distrito: formData.district
          })
          return
        }
        const cantons = await cantonsResponse.json()
        const canton = cantons.find((c: any) => c.codigo.toString() === formData.canton)

        if (canton) {
          // Cargar distritos
          const districtsResponse = await fetch('/data/costa-rica/distritos.json')
          if (!districtsResponse.ok) {
            console.warn('No se pudo cargar distritos.json')
            setLocationNames({
              provincia: provincia.nombre,
              canton: canton.nombre,
              distrito: formData.district
            })
            return
          }
          const districts = await districtsResponse.json()
          const distrito = districts.find((d: any) => d.codigo.toString() === formData.district)

          setLocationNames({
            provincia: provincia.nombre,
            canton: canton.nombre,
            distrito: distrito?.nombre || formData.district
          })
        } else {
          setLocationNames({
            provincia: provincia.nombre,
            canton: formData.canton,
            distrito: formData.district
          })
        }
      }
    } catch (error) {
      console.error('Error al cargar nombres de ubicación:', error)
      // En caso de error, mantener los códigos como fallback
      setLocationNames({
        provincia: formData.province,
        canton: formData.canton,
        distrito: formData.district
      })
    }
  }

  // Cargar nombres de ubicación cuando cambien los códigos
  useEffect(() => {
    if (currentStep === 3) {
      getLocationNames()
    }
  }, [currentStep, formData.province, formData.canton, formData.district])

  // Función para convertir estado de actividad económica
  const getEconomicActivityStatus = (estado: string) => {
    switch (estado) {
      case 'A':
        return 'Activo'
      case 'I':
        return 'Inactivo'
      case 'S':
        return 'Suspendido'
      default:
        return estado
    }
  }

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateNestedField = (parentField: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField as keyof ClientFormData] as any,
        [field]: value
      }
    }))
  }

  // Estabilizar la función onChange para EconomicActivitySelector
  const handleEconomicActivityChange = useCallback((activity: any) => {
    updateField("economicActivity", activity)
  }, [])

  // Validaciones por paso
  const canProceedStep1 = formData.name && formData.identification && formData.email && formData.identificationType && formData.phone && formData.phoneCountryCode && formData.province && formData.canton && formData.district && formData.otrasSenas && formData.economicActivity && formData.economicActivity.codigo && formData.economicActivity.descripcion
  const canProceedStep2 = !formData.hasExemption || (formData.hasExemption && formData.exemptionType && formData.exemptionDocumentNumber)
  const canProceedStep3 = true // El resumen siempre se puede ver

  const canProceed = () => {
    switch (currentStep) {
      case 1: return canProceedStep1
      case 2: return canProceedStep2
      case 3: return canProceedStep3
      default: return false
    }
  }

  const handleNext = () => {
    if (currentStep < 3 && canProceed()) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!canProceed() || !user) return

    setIsSubmitting(true)
    
    try {
      console.log('🚀 Enviando datos del cliente:', formData)
      
      const response = await fetch('/api/clients/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tenantId: user.tenantId,
          createdBy: user.id,
          selectedCompanyId: localStorage.getItem('selectedCompanyId')
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear cliente')
      }

      console.log('✅ Cliente creado exitosamente:', result)
      
      // Llamar al callback original si existe
      if (onSubmit) {
        onSubmit(formData)
      }
      
      // Cerrar el wizard
      onClose()
      
    } catch (error) {
      console.error('❌ Error al crear cliente:', error)
      alert(`Error al crear cliente: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLocationChange = useCallback((location: any) => {
    updateField("province", location.provincia?.codigo?.toString() || "")
    updateField("canton", location.canton?.codigo?.toString() || "")
    updateField("district", location.distrito?.codigo?.toString() || "")
  }, [])

  const steps = [
    {
      number: 1,
      title: "Información General",
      description: "Datos básicos, ubicación y actividad económica",
      icon: User,
      color: "bg-blue-500"
    },
    {
      number: 2,
      title: "Exoneraciones",
      description: "Exenciones fiscales (opcional)",
      icon: FileText,
      color: "bg-orange-500"
    },
    {
      number: 3,
      title: "Resumen",
      description: "Revisión de todos los datos",
      icon: Check,
      color: "bg-purple-500"
    }
  ]

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Agregar Cliente</h2>
              <p className="text-muted-foreground mt-1">Complete la información del nuevo cliente</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {steps.map((step) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              
              return (
                <motion.div
                  key={step.number}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                    isActive 
                      ? "border-primary bg-primary/10" 
                      : isCompleted 
                        ? "border-green-500 bg-green-50" 
                        : "border-border"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive ? "bg-primary text-white" : isCompleted ? "bg-green-500 text-white" : "bg-muted"
                    }`}>
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{step.title}</h3>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Paso 1: Información General */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Información del Cliente</h2>
                      <p className="text-muted-foreground">Datos básicos del cliente</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">
                          {formData.identificationType === "02" ? "Razón Social" : "Nombre Completo"} *
                        </Label>
                        <Input
                          id="name"
                          placeholder={formData.identificationType === "02" ? "Ej: Corporación XYZ S.A." : "Ej: Juan Pérez Rodríguez"}
                          value={formData.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          className="h-12"
                        />
                        <p className="text-sm text-muted-foreground">
                          {formData.identificationType === "02" ? "Nombre legal registrado ante Hacienda" : "Nombre completo de la persona"}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="commercialName">Nombre Comercial</Label>
                        <Input
                          id="commercialName"
                          placeholder="Ej: XYZ Corp"
                          value={formData.commercialName}
                          onChange={(e) => updateField("commercialName", e.target.value)}
                          className="h-12"
                        />
                        <p className="text-sm text-muted-foreground">Nombre con el que se conoce comercialmente</p>
                      </div>
                    </div>

                    {/* Identificación Tributaria */}
                    <TaxIdInputClean
                      value={{
                        type: formData.identificationType === "01" ? 'fisica' : 'juridica',
                        number: formData.identification
                      }}
                      onChange={(taxIdData) => {
                        updateField("identificationType", taxIdData.type === 'fisica' ? "01" : "02")
                        updateField("identification", taxIdData.number)
                      }}
                      onFormatTaxId={formatTaxId}
                      className="mb-6"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="cliente@ejemplo.com"
                          value={formData.email}
                          onChange={(e) => updateField("email", e.target.value)}
                          className="h-12"
                        />
                        <p className="text-sm text-muted-foreground">Para notificaciones y comunicación</p>
                      </div>

                      <PhoneInputWithFlags
                        value={{
                          countryCode: formData.phoneCountryCode,
                          phoneNumber: formData.phone
                        }}
                        onChange={(phoneData) => {
                          updateField("phoneCountryCode", phoneData.countryCode)
                          updateField("phone", phoneData.phoneNumber)
                        }}
                        label="Teléfono *"
                        description="Seleccione el país y ingrese el número de teléfono"
                      />
                    </div>

                    {/* Ubicación con dropdowns dependientes */}
                    <GeoDropdowns
                      onLocationChange={handleLocationChange}
                      className="mb-6"
                    />

                    {/* Barrio (opcional) */}
                    <div className="space-y-2">
                      <Label htmlFor="otrasSenas">Dirección Exacta *</Label>
                      <Textarea
                        id="otrasSenas"
                        placeholder="Ej: De la Iglesia Católica, 200 metros norte, 50 metros este"
                        value={formData.otrasSenas}
                        onChange={(e) => updateField("otrasSenas", e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                      <p className="text-sm text-muted-foreground">
                        Especificar la dirección exacta del cliente
                      </p>
                    </div>

                    {/* Actividad Económica */}
                    <div className="space-y-4">
                      <Label>Actividad Económica</Label>
                      <EconomicActivitySelector
                        taxId={formData.identification}
                        value={formData.economicActivity && formData.economicActivity.codigo ? formData.economicActivity : undefined}
                        onChange={handleEconomicActivityChange}
                      />
                      <p className="text-sm text-muted-foreground">
                        Se consultará automáticamente la información desde Hacienda basada en la cédula ingresada
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 2: Exoneraciones */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold mb-2">Exoneraciones Fiscales</h3>
                    <p className="text-muted-foreground">
                      Configure las exenciones fiscales si el cliente las tiene (opcional)
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hasExemption"
                      checked={formData.hasExemption}
                      onCheckedChange={(checked) => updateField("hasExemption", checked)}
                    />
                    <Label htmlFor="hasExemption">El cliente tiene exoneraciones fiscales</Label>
                  </div>

                  {formData.hasExemption && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6 border rounded-lg p-6 bg-muted/30"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="exemptionType">Tipo de Exoneración *</Label>
                          <Select
                            value={formData.exemptionType}
                            onValueChange={(value) => updateField("exemptionType", value)}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Seleccione el tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {EXEMPTION_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div>
                                    <div className="font-medium">{type.label}</div>
                                    <div className="text-sm text-muted-foreground">{type.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="exemptionDocumentNumber">Número de Documento *</Label>
                          <Input
                            id="exemptionDocumentNumber"
                            placeholder="Ej: 105-2021"
                            value={formData.exemptionDocumentNumber}
                            onChange={(e) => updateField("exemptionDocumentNumber", e.target.value)}
                            className="h-12"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="exemptionDocumentDate">Fecha del Documento</Label>
                          <Input
                            id="exemptionDocumentDate"
                            type="date"
                            value={formData.exemptionDocumentDate}
                            onChange={(e) => updateField("exemptionDocumentDate", e.target.value)}
                            className="h-12"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="exemptionInstitution">Institución</Label>
                          <Select
                            value={formData.exemptionInstitution}
                            onValueChange={(value) => updateField("exemptionInstitution", value)}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Seleccione la institución" />
                            </SelectTrigger>
                            <SelectContent>
                              {INSTITUTION_TYPES.map((institution) => (
                                <SelectItem key={institution.value} value={institution.value}>
                                  {institution.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {formData.exemptionInstitution === "99" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-2"
                        >
                          <Label htmlFor="exemptionInstitutionOthers">Nombre de la Institución</Label>
                          <Input
                            id="exemptionInstitutionOthers"
                            placeholder="Ej: PROCOMER"
                            value={formData.exemptionInstitutionOthers}
                            onChange={(e) => updateField("exemptionInstitutionOthers", e.target.value)}
                            className="h-12"
                          />
                        </motion.div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="exemptionTariff">Porcentaje de Tarifa Exonerada</Label>
                        <Input
                          id="exemptionTariff"
                          type="number"
                          min="0"
                          max="100"
                          placeholder="13"
                          value={formData.exemptionTariff}
                          onChange={(e) => updateField("exemptionTariff", Number(e.target.value) || 0)}
                          className="h-12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="exemptionObservations">Observaciones</Label>
                        <Textarea
                          id="exemptionObservations"
                          placeholder="Observaciones adicionales sobre la exoneración"
                          value={formData.exemptionObservations}
                          onChange={(e) => updateField("exemptionObservations", e.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Paso 3: Resumen */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-semibold mb-2">Resumen del Cliente</h3>
                    <p className="text-muted-foreground">
                      Revise toda la información antes de crear el cliente
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Información General */}
                    <Card className="p-6">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-500" />
                        Información General
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Tipo</Label>
                          <p className="font-medium">
                            {IDENTIFICATION_TYPES.find(t => t.value === formData.identificationType)?.label}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Nombre</Label>
                          <p className="font-medium">{formData.name}</p>
                        </div>
                        {formData.commercialName && (
                          <div>
                            <Label className="text-sm text-muted-foreground">Nombre Comercial</Label>
                            <p className="font-medium">{formData.commercialName}</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm text-muted-foreground">Cédula</Label>
                          <p className="font-medium">{formData.identification}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Email</Label>
                          <p className="font-medium">{formData.email}</p>
                        </div>
                        {formData.phone && (
                          <div>
                            <Label className="text-sm text-muted-foreground">Teléfono</Label>
                            <p className="font-medium">{formData.phoneCountryCode} {formData.phone}</p>
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Ubicación */}
                    <Card className="p-6">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-purple-500" />
                        Ubicación
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Provincia</Label>
                          <p className="font-medium">{locationNames.provincia || formData.province}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Cantón</Label>
                          <p className="font-medium">{locationNames.canton || formData.canton}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Distrito</Label>
                          <p className="font-medium">{locationNames.distrito || formData.district}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Dirección</Label>
                          <p className="font-medium">{formData.otrasSenas}</p>
                        </div>
                      </div>
                    </Card>

                    {/* Actividad Económica */}
                    <Card className="p-6">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-green-500" />
                        Actividad Económica
                      </h4>
                      {formData.economicActivity && formData.economicActivity.codigo ? (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm text-muted-foreground">Código</Label>
                            <p className="font-medium">{formData.economicActivity.codigo}</p>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Descripción</Label>
                            <p className="font-medium">{formData.economicActivity.descripcion}</p>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Estado</Label>
                            <p className="font-medium">{getEconomicActivityStatus(formData.economicActivity.estado)}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No seleccionada</p>
                      )}
                    </Card>

                    {/* Exoneraciones */}
                    <Card className="p-6">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-orange-500" />
                        Exoneraciones
                      </h4>
                      {formData.hasExemption ? (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm text-muted-foreground">Tipo</Label>
                            <p className="font-medium">
                              {EXEMPTION_TYPES.find(t => t.value === formData.exemptionType)?.label}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Documento</Label>
                            <p className="font-medium">{formData.exemptionDocumentNumber}</p>
                          </div>
                          {formData.exemptionDocumentDate && (
                            <div>
                              <Label className="text-sm text-muted-foreground">Fecha</Label>
                              <p className="font-medium">{formData.exemptionDocumentDate}</p>
                            </div>
                          )}
                          {formData.exemptionTariff > 0 && (
                            <div>
                              <Label className="text-sm text-muted-foreground">Porcentaje</Label>
                              <p className="font-medium">{formData.exemptionTariff}%</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Sin exoneraciones</p>
                      )}
                    </Card>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            <div className="flex items-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index + 1 === currentStep ? "bg-primary" : 
                    index + 1 < currentStep ? "bg-green-500" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="gap-2"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Crear Cliente
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
