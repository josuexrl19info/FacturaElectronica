"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProgressBar } from "@/components/wizard/progress-bar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToastNotification } from "@/components/providers/toast-provider"
import { CompanyWizardData } from "@/lib/company-wizard-types"
import { ATVValidator } from "@/lib/atv-validator"
import { CertificateValidator } from "@/lib/certificate-validator"
import { CompanySummary } from "@/components/company/company-summary"
import { GeoDropdowns } from "@/components/ui/geo-dropdowns"
import { TaxIdInputClean } from "@/components/ui/tax-id-input-clean"
import { Provincia, Canton, Distrito } from "@/lib/costa-rica-geo"
import { 
  X, 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  Eye, 
  EyeOff,
  Building2,
  Key,
  FileText,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Shield,
  AlertTriangle
} from "lucide-react"

// Removed hardcoded provinces - now using GeoDropdowns component
const COLORS = [
  { name: "Esmeralda", value: "#10b981" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Índigo", value: "#6366f1" },
  { name: "Naranja", value: "#f59e0b" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Rojo", value: "#ef4444" },
]

export default function CompanyOnboardingPage() {
  const router = useRouter()
  const toast = useToastNotification()
  const [currentStep, setCurrentStep] = useState(1)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResults, setValidationResults] = useState<{
    atv?: any
    certificate?: any
  }>({})
  
  const [selectedLocation, setSelectedLocation] = useState<{
    provincia: Provincia | null
    canton: Canton | null
    distrito: Distrito | null
  }>({
    provincia: null,
    canton: null,
    distrito: null
  })
  
  const [formData, setFormData] = useState<CompanyWizardData>({
    personalInfo: {
      legalName: "",
      commercialName: "",
      taxIdType: "juridica",
      taxId: "",
      email: "",
      phone: "",
      province: "",
      canton: "",
      district: "",
      barrio: "",
      logo: null,
    },
    atvCredentials: {
      username: "",
      password: "",
      clientId: "api-stag",
      receptionUrl: "https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/recepcion",
      loginUrl: "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token",
    },
    certificate: {
      p12File: null,
      password: "",
    },
  })

  const [showPasswords, setShowPasswords] = useState({
    atv: false,
    certificate: false,
  })

  const updateField = useCallback((section: keyof CompanyWizardData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }, [])

  const handleLocationChange = useCallback((location: {
    provincia: Provincia | null
    canton: Canton | null
    distrito: Distrito | null
  }) => {
    setSelectedLocation(location)
    updateField('personalInfo', 'province', location.provincia?.nombre || '')
    updateField('personalInfo', 'canton', location.canton?.nombre || '')
    updateField('personalInfo', 'district', location.distrito?.nombre || '')
  }, [updateField])

  // Validaciones para cada paso
  const canProceedStep1 = () => {
    const { personalInfo } = formData
    return !!(
      personalInfo.legalName &&
      personalInfo.commercialName &&
      personalInfo.taxId &&
      personalInfo.email &&
      personalInfo.phone &&
      selectedLocation.provincia &&
      selectedLocation.canton &&
      selectedLocation.distrito
    )
  }

  const canProceedStep2 = () => {
    const { atvCredentials } = formData
    return !!(
      atvCredentials.username &&
      atvCredentials.password &&
      atvCredentials.clientId &&
      atvCredentials.receptionUrl &&
      atvCredentials.loginUrl &&
      validationResults.atv?.isValid
    )
  }

  const canProceedStep3 = () => {
    const { certificate } = formData
    return !!(
      certificate.p12File &&
      certificate.password &&
      validationResults.certificate?.isValid
    )
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return canProceedStep1()
      case 2: return canProceedStep2()
      case 3: return canProceedStep3()
      case 4: return true // Paso de resumen siempre se puede proceder
      default: return false
    }
  }

  const handleNext = async () => {
    if (currentStep === 2 && !validationResults.atv) {
      await validateATVCredentials()
      return
    }
    
    if (currentStep === 3 && !validationResults.certificate) {
      await validateCertificate()
      return
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const validateATVCredentials = async () => {
    setIsValidating(true)
    try {
      const { username, password, clientId } = formData.atvCredentials
      
      const response = await fetch('/api/company/validate-atv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, clientId })
      })

      const result = await response.json()
      setValidationResults(prev => ({ ...prev, atv: result }))

      if (result.isValid) {
        toast.success('Credenciales válidas', 'Conexión exitosa con Hacienda')
      } else {
        toast.error('Credenciales inválidas', result.message)
      }
    } catch (error) {
      toast.error('Error de validación', 'No se pudo validar las credenciales')
    } finally {
      setIsValidating(false)
    }
  }

  const validateCertificate = async () => {
    setIsValidating(true)
    try {
      const { p12File, password } = formData.certificate
      const { taxId } = formData.personalInfo

      const formDataToSend = new FormData()
      formDataToSend.append('p12File', p12File!)
      formDataToSend.append('password', password)
      formDataToSend.append('taxId', taxId)

      const response = await fetch('/api/company/validate-certificate', {
        method: 'POST',
        body: formDataToSend
      })

      const result = await response.json()
      setValidationResults(prev => ({ ...prev, certificate: result }))

      if (result.isValid) {
        toast.success('Certificado válido', 'El certificado corresponde a la razón social')
      } else {
        toast.error('Certificado inválido', result.message)
      }
    } catch (error) {
      toast.error('Error de validación', 'No se pudo validar el certificado')
    } finally {
      setIsValidating(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setIsValidating(true)
      
      // Preparar datos para envío
      const companyData = {
        personalInfo: formData.personalInfo,
        atvCredentials: formData.atvCredentials,
        certificate: {
          p12File: formData.certificate.p12File?.name,
          password: formData.certificate.password,
        },
        primaryColor: '#10b981'
      }

      // Crear empresa via API
      const response = await fetch('/api/company/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Error al crear la empresa')
      }

      toast.success('Empresa creada', 'La empresa se ha registrado exitosamente')
      router.push("/select-company")
    } catch (error: any) {
      console.error('Error creating company:', error)
      toast.error('Error', error.message || 'No se pudo crear la empresa')
    } finally {
      setIsValidating(false)
    }
  }

  const handleCancel = () => {
    router.push("/select-company")
  }

  const formatTaxId = (value: string, type: 'fisica' | 'juridica' = 'juridica') => {
    const numbers = value.replace(/[^\d]/g, '')
    
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

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-background to-muted/20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Crear Nueva Empresa
            </h1>
            <p className="text-lg text-muted-foreground">
              Complete la información para registrar su empresa en el sistema de facturación
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress Bar */}
        <Card className="p-6 mb-8">
          <ProgressBar currentStep={currentStep} totalSteps={4} />
        </Card>

        {/* Form Content */}
        <Card className="p-8 shadow-lg">
          {/* Step 1: Información Personal */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Información Personal</h2>
                  <p className="text-muted-foreground">Datos básicos de la empresa</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="commercialName">Nombre Comercial *</Label>
                    <Input
                      id="commercialName"
                      placeholder="Ej: TechCorp CR"
                      value={formData.personalInfo.commercialName}
                      onChange={(e) => updateField('personalInfo', 'commercialName', e.target.value)}
                      className="h-12"
                    />
                    <p className="text-sm text-muted-foreground">Nombre con el que se conoce su empresa</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="legalName">Razón Social *</Label>
                    <Input
                      id="legalName"
                      placeholder="Ej: TechCorp Costa Rica S.A."
                      value={formData.personalInfo.legalName}
                      onChange={(e) => updateField('personalInfo', 'legalName', e.target.value)}
                      className="h-12"
                    />
                    <p className="text-sm text-muted-foreground">Nombre legal registrado ante Hacienda</p>
                  </div>
                </div>

                {/* Identificación Tributaria */}
                <TaxIdInputClean
                  value={{
                    type: formData.personalInfo.taxIdType,
                    number: formData.personalInfo.taxId
                  }}
                  onChange={(taxIdData) => {
                    updateField('personalInfo', 'taxIdType', taxIdData.type)
                    updateField('personalInfo', 'taxId', taxIdData.number)
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
                      placeholder="facturacion@empresa.cr"
                      value={formData.personalInfo.email}
                      onChange={(e) => updateField('personalInfo', 'email', e.target.value)}
                      className="h-12"
                    />
                    <p className="text-sm text-muted-foreground">Para notificaciones de Hacienda</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      placeholder="+506 2222-3333"
                      value={formData.personalInfo.phone}
                      onChange={(e) => updateField('personalInfo', 'phone', e.target.value)}
                      className="h-12"
                    />
                    <p className="text-sm text-muted-foreground">Con código de país</p>
                  </div>
                </div>

                {/* Ubicación con dropdowns dependientes */}
                <GeoDropdowns
                  onLocationChange={handleLocationChange}
                  className="mb-6"
                />

                {/* Barrio (opcional) */}
                <div className="space-y-2">
                  <Label htmlFor="barrio">Barrio (Opcional)</Label>
                  <Input
                    id="barrio"
                    placeholder="Ej: Centro"
                    value={formData.personalInfo.barrio}
                    onChange={(e) => updateField('personalInfo', 'barrio', e.target.value)}
                    className="h-12"
                  />
                  <p className="text-sm text-muted-foreground">
                    Especificar el barrio o sector si es necesario
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Logo de la Empresa</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                    <input
                      id="logo"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) updateField('personalInfo', 'logo', file)
                      }}
                    />
                    <label htmlFor="logo" className="cursor-pointer">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="font-medium mb-1">
                        {formData.personalInfo.logo ? formData.personalInfo.logo.name : "Subir logo"}
                      </p>
                      <p className="text-sm text-muted-foreground">PNG, JPG o SVG (máx. 2MB)</p>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Credenciales ATV */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Key className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Credenciales ATV</h2>
                  <p className="text-muted-foreground">Credenciales de Administración Tributaria Virtual</p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Estas credenciales se validarán automáticamente contra el sistema de Hacienda.
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="username">Usuario ATV *</Label>
                    <Input
                      id="username"
                      placeholder="cpf-03-0447-0021@stag.comprobanteselectronicos.go.cr"
                      value={formData.atvCredentials.username}
                      onChange={(e) => updateField('atvCredentials', 'username', e.target.value)}
                      className="h-12"
                    />
                    <p className="text-sm text-muted-foreground">Email de usuario en ATV</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña ATV *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPasswords.atv ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.atvCredentials.password}
                        onChange={(e) => updateField('atvCredentials', 'password', e.target.value)}
                        className="h-12 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-12 px-3"
                        onClick={() => setShowPasswords(prev => ({ ...prev, atv: !prev.atv }))}
                      >
                        {showPasswords.atv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">Contraseña de acceso a ATV</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID *</Label>
                  <Input
                    id="clientId"
                    placeholder="api-stag"
                    value={formData.atvCredentials.clientId}
                    onChange={(e) => updateField('atvCredentials', 'clientId', e.target.value)}
                    className="h-12"
                  />
                  <p className="text-sm text-muted-foreground">Identificador del cliente para la API</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="receptionUrl">URL de Recepción *</Label>
                    <Input
                      id="receptionUrl"
                      placeholder="https://api.comprobanteselectronicos.go.cr/..."
                      value={formData.atvCredentials.receptionUrl}
                      onChange={(e) => updateField('atvCredentials', 'receptionUrl', e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loginUrl">URL de Login *</Label>
                    <Input
                      id="loginUrl"
                      placeholder="https://idp.comprobanteselectronicos.go.cr/..."
                      value={formData.atvCredentials.loginUrl}
                      onChange={(e) => updateField('atvCredentials', 'loginUrl', e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Validation Result */}
                {validationResults.atv && (
                  <Alert variant={validationResults.atv.isValid ? "default" : "destructive"}>
                    {validationResults.atv.isValid ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {validationResults.atv.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Certificado Digital */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Certificado Digital</h2>
                  <p className="text-muted-foreground">Certificado .p12 para firma digital</p>
                </div>
              </div>

              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  El certificado se validará automáticamente para verificar que corresponda a la razón social ingresada.
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="p12File">Archivo .p12 *</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                    <input
                      id="p12File"
                      type="file"
                      accept=".p12,.pfx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) updateField('certificate', 'p12File', file)
                      }}
                    />
                    <label htmlFor="p12File" className="cursor-pointer">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="font-medium mb-1">
                        {formData.certificate.p12File ? formData.certificate.p12File.name : "Subir certificado .p12"}
                      </p>
                      <p className="text-sm text-muted-foreground">Certificado digital .p12 o .pfx (máx. 5MB)</p>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certPassword">Clave del Certificado *</Label>
                  <div className="relative">
                    <Input
                      id="certPassword"
                      type={showPasswords.certificate ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.certificate.password}
                      onChange={(e) => updateField('certificate', 'password', e.target.value)}
                      className="h-12 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-12 px-3"
                      onClick={() => setShowPasswords(prev => ({ ...prev, certificate: !prev.certificate }))}
                    >
                      {showPasswords.certificate ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Clave para acceder al certificado digital</p>
                </div>

                {/* Validation Result */}
                {validationResults.certificate && (
                  <Alert variant={validationResults.certificate.isValid ? "default" : "destructive"}>
                    {validationResults.certificate.isValid ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {validationResults.certificate.message}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Certificate Info */}
                {validationResults.certificate?.isValid && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Información del Certificado:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Sujeto:</span>
                        <p className="text-muted-foreground">{validationResults.certificate.subject}</p>
                      </div>
                      <div>
                        <span className="font-medium">Emisor:</span>
                        <p className="text-muted-foreground">{validationResults.certificate.issuer}</p>
                      </div>
                      <div>
                        <span className="font-medium">Válido desde:</span>
                        <p className="text-muted-foreground">
                          {new Date(validationResults.certificate.validFrom).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Válido hasta:</span>
                        <p className="text-muted-foreground">
                          {new Date(validationResults.certificate.validTo).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Resumen */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <CompanySummary data={formData} />
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-8 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Anterior
            </Button>

            <div className="flex items-center gap-4">
              {currentStep === 2 && (
                <Button
                  variant="secondary"
                  onClick={validateATVCredentials}
                  disabled={isValidating}
                  className="flex items-center gap-2"
                >
                  {isValidating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Validar Credenciales
                </Button>
              )}

              {currentStep === 3 && (
                <Button
                  variant="secondary"
                  onClick={validateCertificate}
                  disabled={isValidating}
                  className="flex items-center gap-2"
                >
                  {isValidating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  Validar Certificado
                </Button>
              )}

              <Button
                onClick={currentStep === 4 ? handleSubmit : handleNext}
                disabled={!canProceed() || isValidating}
                className="flex items-center gap-2"
              >
                {currentStep === 4 ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Crear Empresa
                  </>
                ) : (
                  <>
                    Siguiente
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
