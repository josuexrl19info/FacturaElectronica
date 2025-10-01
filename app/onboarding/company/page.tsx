"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { WizardStep } from "@/components/wizard/wizard-step"
import { WizardNavigation } from "@/components/wizard/wizard-navigation"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

const PROVINCES = ["San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"]

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
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: "",
    legalName: "",
    taxId: "",
    // Step 2: Location
    province: "",
    canton: "",
    district: "",
    address: "",
    // Step 3: Contact
    phone: "",
    email: "",
    commercialActivity: "",
    // Step 4: Branding
    primaryColor: COLORS[0].value,
    logo: null as File | null,
  })

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const canProceedStep1 = formData.name && formData.legalName && formData.taxId
  const canProceedStep2 = formData.province && formData.canton && formData.district && formData.address
  const canProceedStep3 = formData.phone && formData.email && formData.commercialActivity
  const canProceedStep4 = formData.primaryColor

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return canProceedStep1
      case 2:
        return canProceedStep2
      case 3:
        return canProceedStep3
      case 4:
        return canProceedStep4
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    // Save company data
    console.log("Creating company:", formData)
    // Redirect to company selection
    router.push("/select-company")
  }

  const handleCancel = () => {
    router.push("/select-company")
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Crear Nueva Empresa</h1>
            <p className="text-lg text-muted-foreground">Complete la información para registrar su empresa</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress Steps */}
        <Card className="p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <WizardStep step={1} currentStep={currentStep} title="Información Básica" description="Datos generales" />
            <WizardStep step={2} currentStep={currentStep} title="Ubicación" description="Dirección fiscal" />
            <WizardStep step={3} currentStep={currentStep} title="Contacto" description="Información de contacto" />
            <WizardStep step={4} currentStep={currentStep} title="Personalización" description="Marca y colores" />
          </div>
        </Card>

        {/* Form Content */}
        <Card className="p-8">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Información Básica</h2>
                <p className="text-muted-foreground">Ingrese los datos generales de su empresa</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Comercial *</Label>
                  <Input
                    id="name"
                    placeholder="Ej: TechCorp CR"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="h-12"
                  />
                  <p className="text-sm text-muted-foreground">Nombre con el que se conoce su empresa</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legalName">Razón Social *</Label>
                  <Input
                    id="legalName"
                    placeholder="Ej: TechCorp Costa Rica S.A."
                    value={formData.legalName}
                    onChange={(e) => updateField("legalName", e.target.value)}
                    className="h-12"
                  />
                  <p className="text-sm text-muted-foreground">
                    Nombre legal registrado ante el Ministerio de Hacienda
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxId">Cédula Jurídica *</Label>
                  <Input
                    id="taxId"
                    placeholder="Ej: 3-101-123456"
                    value={formData.taxId}
                    onChange={(e) => updateField("taxId", e.target.value)}
                    className="h-12"
                  />
                  <p className="text-sm text-muted-foreground">Número de identificación tributaria</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Ubicación</h2>
                <p className="text-muted-foreground">Dirección fiscal de su empresa según Hacienda</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="province">Provincia *</Label>
                  <select
                    id="province"
                    value={formData.province}
                    onChange={(e) => updateField("province", e.target.value)}
                    className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Seleccione una provincia</option>
                    {PROVINCES.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="canton">Cantón *</Label>
                    <Input
                      id="canton"
                      placeholder="Ej: Central"
                      value={formData.canton}
                      onChange={(e) => updateField("canton", e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="district">Distrito *</Label>
                    <Input
                      id="district"
                      placeholder="Ej: Carmen"
                      value={formData.district}
                      onChange={(e) => updateField("district", e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección Exacta *</Label>
                  <Textarea
                    id="address"
                    placeholder="Ej: De la Iglesia Católica, 200 metros norte, 50 metros este"
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-sm text-muted-foreground">Dirección completa con señas exactas</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Contact */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Información de Contacto</h2>
                <p className="text-muted-foreground">Datos de contacto para facturación electrónica</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Ej: 2222-3333"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Ej: facturacion@empresa.cr"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="h-12"
                  />
                  <p className="text-sm text-muted-foreground">Correo para recibir notificaciones de Hacienda</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commercialActivity">Actividad Comercial *</Label>
                  <Textarea
                    id="commercialActivity"
                    placeholder="Ej: Desarrollo de software y consultoría tecnológica"
                    value={formData.commercialActivity}
                    onChange={(e) => updateField("commercialActivity", e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-sm text-muted-foreground">Descripción de la actividad económica principal</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Branding */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Personalización</h2>
                <p className="text-muted-foreground">Configure la apariencia de su espacio de trabajo</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Color Principal *</Label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => updateField("primaryColor", color.value)}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg border-2 hover:border-primary transition-colors"
                        style={{
                          borderColor: formData.primaryColor === color.value ? color.value : "transparent",
                        }}
                      >
                        <div className="w-12 h-12 rounded-full" style={{ backgroundColor: color.value }} />
                        <span className="text-sm font-medium">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Logo (Opcional)</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                    <input
                      id="logo"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) updateField("logo", file)
                      }}
                    />
                    <label htmlFor="logo" className="cursor-pointer">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8 text-muted-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <p className="font-medium mb-1">{formData.logo ? formData.logo.name : "Subir logo"}</p>
                      <p className="text-sm text-muted-foreground">PNG, JPG o SVG (máx. 2MB)</p>
                    </label>
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <Label>Vista Previa</Label>
                  <Card
                    className="p-6"
                    style={{
                      background: `linear-gradient(135deg, ${formData.primaryColor}15 0%, transparent 100%)`,
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
                        style={{ backgroundColor: formData.primaryColor }}
                      >
                        {formData.name.charAt(0) || "E"}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{formData.name || "Nombre de Empresa"}</h3>
                        <p className="text-sm text-muted-foreground">{formData.legalName || "Razón Social"}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <WizardNavigation
            currentStep={currentStep}
            totalSteps={4}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSubmit={handleSubmit}
            isLastStep={currentStep === 4}
            canProceed={canProceed()}
          />
        </Card>
      </div>
    </div>
  )
}
