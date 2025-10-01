"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { WizardStep } from "@/components/wizard/wizard-step"
import { WizardNavigation } from "@/components/wizard/wizard-navigation"
import { X } from "lucide-react"

const CLIENT_TYPES = [
  { value: "fisica", label: "Persona Física" },
  { value: "juridica", label: "Persona Jurídica" },
  { value: "extranjero", label: "Extranjero" },
]

const PROVINCES = ["San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"]

interface ClientWizardProps {
  onClose: () => void
  onSubmit: (data: any) => void
}

export function ClientWizard({ onClose, onSubmit }: ClientWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    type: "fisica",
    name: "",
    taxId: "",
    email: "",
    phone: "",
    // Step 2: Address
    province: "",
    canton: "",
    district: "",
    address: "",
    // Step 3: Additional Info
    contactPerson: "",
    paymentTerms: "contado",
    creditLimit: 0,
    notes: "",
  })

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const canProceedStep1 = formData.name && formData.taxId && formData.email
  const canProceedStep2 = formData.province && formData.canton && formData.district && formData.address
  const canProceedStep3 = true // Optional fields

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return canProceedStep1
      case 2:
        return canProceedStep2
      case 3:
        return canProceedStep3
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <Card className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
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
            <WizardStep step={1} currentStep={currentStep} title="Información Básica" />
            <WizardStep step={2} currentStep={currentStep} title="Dirección" />
            <WizardStep step={3} currentStep={currentStep} title="Información Adicional" />
          </div>

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Tipo de Cliente</Label>
                <div className="grid grid-cols-3 gap-3">
                  {CLIENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => updateField("type", type.value)}
                      className={`p-4 rounded-lg border-2 transition-colors font-medium ${
                        formData.type === type.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{formData.type === "juridica" ? "Razón Social" : "Nombre Completo"} *</Label>
                <Input
                  id="name"
                  placeholder={formData.type === "juridica" ? "Ej: Corporación XYZ S.A." : "Ej: Juan Pérez Rodríguez"}
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxId">
                  {formData.type === "juridica"
                    ? "Cédula Jurídica"
                    : formData.type === "fisica"
                      ? "Cédula Física"
                      : "Identificación"}{" "}
                  *
                </Label>
                <Input
                  id="taxId"
                  placeholder={
                    formData.type === "juridica"
                      ? "Ej: 3-101-123456"
                      : formData.type === "fisica"
                        ? "Ej: 1-0234-0567"
                        : "Ej: Pasaporte o ID"
                  }
                  value={formData.taxId}
                  onChange={(e) => updateField("taxId", e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="2222-3333"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Address */}
          {currentStep === 2 && (
            <div className="space-y-6">
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
              </div>
            </div>
          )}

          {/* Step 3: Additional Info */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Persona de Contacto</Label>
                <Input
                  id="contactPerson"
                  placeholder="Nombre de la persona de contacto"
                  value={formData.contactPerson}
                  onChange={(e) => updateField("contactPerson", e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Condiciones de Pago</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateField("paymentTerms", "contado")}
                    className={`p-4 rounded-lg border-2 transition-colors font-medium ${
                      formData.paymentTerms === "contado"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    Contado
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("paymentTerms", "credito")}
                    className={`p-4 rounded-lg border-2 transition-colors font-medium ${
                      formData.paymentTerms === "credito"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    Crédito
                  </button>
                </div>
              </div>

              {formData.paymentTerms === "credito" && (
                <div className="space-y-2">
                  <Label htmlFor="creditLimit">Límite de Crédito</Label>
                  <Input
                    id="creditLimit"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={formData.creditLimit}
                    onChange={(e) => updateField("creditLimit", Number.parseFloat(e.target.value) || 0)}
                    className="h-12"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  placeholder="Información adicional sobre el cliente"
                  value={formData.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <WizardNavigation
            currentStep={currentStep}
            totalSteps={3}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSubmit={handleSubmit}
            isLastStep={currentStep === 3}
            canProceed={canProceed()}
          />
        </Card>
      </div>
    </div>
  )
}
