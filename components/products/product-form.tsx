"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X, Search } from "lucide-react"

interface ProductFormProps {
  onClose: () => void
  onSubmit: (data: any) => void
  initialData?: any
}

const PRODUCT_TYPES = [
  { value: "product", label: "Producto" },
  { value: "service", label: "Servicio" },
]

const TAX_RATES = [
  { value: 0, label: "Exento (0%)" },
  { value: 1, label: "Reducido (1%)" },
  { value: 2, label: "Reducido (2%)" },
  { value: 4, label: "Reducido (4%)" },
  { value: 13, label: "General (13%)" },
]

// Mock CABYS codes - in production, this would be a searchable database
const mockCABYS = [
  { code: "4620101010000", description: "Computadoras portátiles" },
  { code: "4620101020000", description: "Computadoras de escritorio" },
  { code: "4320101010000", description: "Teléfonos móviles" },
  { code: "8111501010000", description: "Servicios de consultoría en tecnología" },
  { code: "8111502010000", description: "Servicios de desarrollo de software" },
]

export function ProductForm({ onClose, onSubmit, initialData }: ProductFormProps) {
  const [formData, setFormData] = useState({
    type: initialData?.type || "product",
    name: initialData?.name || "",
    description: initialData?.description || "",
    sku: initialData?.sku || "",
    cabysCode: initialData?.cabysCode || "",
    cabysDescription: initialData?.cabysDescription || "",
    price: initialData?.price || 0,
    cost: initialData?.cost || 0,
    taxRate: initialData?.taxRate || 13,
    stock: initialData?.stock || 0,
    minStock: initialData?.minStock || 0,
    unit: initialData?.unit || "unidad",
  })

  const [showCABYSSearch, setShowCABYSSearch] = useState(false)
  const [cabysSearchTerm, setCABYSSearchTerm] = useState("")

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const selectCABYS = (cabys: any) => {
    updateField("cabysCode", cabys.code)
    updateField("cabysDescription", cabys.description)
    setShowCABYSSearch(false)
  }

  const filteredCABYS = mockCABYS.filter(
    (cabys) =>
      cabys.code.includes(cabysSearchTerm) || cabys.description.toLowerCase().includes(cabysSearchTerm.toLowerCase()),
  )

  const handleSubmit = () => {
    onSubmit(formData)
  }

  const canSubmit = formData.name && formData.cabysCode && formData.price > 0

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <Card className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold">{initialData ? "Editar Producto" : "Agregar Producto"}</h2>
              <p className="text-muted-foreground mt-1">Complete la información del producto o servicio</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Type Selection */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="grid grid-cols-2 gap-3">
                {PRODUCT_TYPES.map((type) => (
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

            {/* Basic Info */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="Nombre del producto o servicio"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción detallada"
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* CABYS Code */}
            <div className="space-y-2">
              <Label>Código CABYS *</Label>
              {formData.cabysCode ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-4 bg-muted rounded-lg">
                    <p className="font-mono font-bold">{formData.cabysCode}</p>
                    <p className="text-sm text-muted-foreground mt-1">{formData.cabysDescription}</p>
                  </div>
                  <Button variant="outline" onClick={() => setShowCABYSSearch(true)}>
                    Cambiar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2 bg-transparent"
                  onClick={() => setShowCABYSSearch(true)}
                >
                  <Search className="w-4 h-4" />
                  Buscar Código CABYS
                </Button>
              )}
            </div>

            {/* CABYS Search Modal */}
            {showCABYSSearch && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Buscar Código CABYS</h3>
                    <Button variant="ghost" size="icon" onClick={() => setShowCABYSSearch(false)}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por código o descripción..."
                      value={cabysSearchTerm}
                      onChange={(e) => setCABYSSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredCABYS.map((cabys) => (
                      <button
                        key={cabys.code}
                        onClick={() => selectCABYS(cabys)}
                        className="w-full p-4 text-left rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <p className="font-mono font-bold">{cabys.code}</p>
                        <p className="text-sm text-muted-foreground mt-1">{cabys.description}</p>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio de Venta *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => updateField("price", Number.parseFloat(e.target.value) || 0)}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Costo</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.cost}
                  onChange={(e) => updateField("cost", Number.parseFloat(e.target.value) || 0)}
                  className="h-12"
                />
              </div>
            </div>

            {/* Tax Rate */}
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tarifa de IVA</Label>
              <select
                id="taxRate"
                value={formData.taxRate}
                onChange={(e) => updateField("taxRate", Number.parseFloat(e.target.value))}
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {TAX_RATES.map((rate) => (
                  <option key={rate.value} value={rate.value}>
                    {rate.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Inventory (only for products) */}
            {formData.type === "product" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU / Código Interno</Label>
                  <Input
                    id="sku"
                    placeholder="Código único del producto"
                    value={formData.sku}
                    onChange={(e) => updateField("sku", e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Actual</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.stock}
                      onChange={(e) => updateField("stock", Number.parseFloat(e.target.value) || 0)}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minStock">Stock Mínimo</Label>
                    <Input
                      id="minStock"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.minStock}
                      onChange={(e) => updateField("minStock", Number.parseFloat(e.target.value) || 0)}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit">Unidad de Medida</Label>
                    <Input
                      id="unit"
                      placeholder="unidad"
                      value={formData.unit}
                      onChange={(e) => updateField("unit", e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {initialData ? "Guardar Cambios" : "Agregar Producto"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
