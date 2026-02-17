"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { X, Package, DollarSign, Percent, FileText, Calendar } from "lucide-react"
import { ProductFormData, Product, UNIDADES_MEDIDA, TIPOS_IMPUESTO, TARIFAS_IMPUESTO } from '@/lib/product-types'

interface ProductFormProps {
  onClose: () => void
  onSubmit: (data: ProductFormData) => void
  editingProduct?: Product | ProductFormData
}

export function ProductForm({ onClose, onSubmit, editingProduct }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    codigoCABYS: '',
    detalle: '',
    precioUnitario: 0,
    unidadMedida: 'Sp',
    tipoImpuesto: '01',
    codigoTarifaImpuesto: '08',
    tarifaImpuesto: 13,
    tieneExoneracion: false,
    porcentajeExoneracion: 0,
    numeroDocumentoExoneracion: '',
    nombreInstitucionExoneracion: '',
    fechaEmisionExoneracion: '',
    montoExoneracion: 0
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (editingProduct) {
      // Convertir Product a ProductFormData si es necesario
      // Si ya es ProductFormData, se usa directamente
      const productData: ProductFormData = {
        codigoCABYS: editingProduct.codigoCABYS || '',
        detalle: editingProduct.detalle || '',
        precioUnitario: editingProduct.precioUnitario || 0,
        unidadMedida: editingProduct.unidadMedida || 'Sp',
        tipoImpuesto: editingProduct.tipoImpuesto || '01',
        codigoTarifaImpuesto: editingProduct.codigoTarifaImpuesto || '08',
        tarifaImpuesto: editingProduct.tarifaImpuesto || 13,
        tieneExoneracion: editingProduct.tieneExoneracion || false,
        porcentajeExoneracion: editingProduct.porcentajeExoneracion || 0,
        numeroDocumentoExoneracion: editingProduct.numeroDocumentoExoneracion || '',
        nombreInstitucionExoneracion: editingProduct.nombreInstitucionExoneracion || '',
        fechaEmisionExoneracion: editingProduct.fechaEmisionExoneracion || '',
        montoExoneracion: editingProduct.montoExoneracion || 0
      }
      setFormData(productData)
    }
  }, [editingProduct])

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleTarifaChange = (codigo: string) => {
    const tarifa = TARIFAS_IMPUESTO.find(t => t.codigo === codigo)
    if (tarifa) {
      setFormData(prev => ({
        ...prev,
        codigoTarifaImpuesto: codigo,
        tarifaImpuesto: tarifa.porcentaje
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Error al guardar producto:', error)
    } finally {
      setIsSubmitting(false)
    }
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3 }}
        className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-background border-b p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {editingProduct ? 'Editar Producto' : 'Agregar Producto'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {editingProduct ? 'Modifica la información del producto' : 'Agrega un nuevo producto o servicio'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información Básica */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Información Básica</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigoCABYS">Código CABYS *</Label>
                <Input
                  id="codigoCABYS"
                  placeholder="Ej: 8399000000000"
                  value={formData.codigoCABYS}
                  onChange={(e) => handleInputChange('codigoCABYS', e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Código de clasificación oficial de Hacienda
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidadMedida">Unidad de Medida *</Label>
                <Select value={formData.unidadMedida} onValueChange={(value) => handleInputChange('unidadMedida', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES_MEDIDA.map((unidad) => (
                      <SelectItem key={unidad.codigo} value={unidad.codigo}>
                        {unidad.codigo} - {unidad.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="detalle">Descripción del Producto/Servicio *</Label>
              <Textarea
                id="detalle"
                placeholder="Describe detalladamente el producto o servicio..."
                value={formData.detalle}
                onChange={(e) => handleInputChange('detalle', e.target.value)}
                rows={3}
                required
              />
            </div>
          </Card>

          {/* Información de Precio */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">Información de Precio</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="precioUnitario">Precio Unitario (₡) *</Label>
                <Input
                  id="precioUnitario"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={formData.precioUnitario || ''}
                  onChange={(e) => handleInputChange('precioUnitario', Number(e.target.value) || 0)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Precio en colones costarricenses
                </p>
              </div>

              <div className="space-y-2">
                <Label>Precio Formateado</Label>
                <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center">
                  <span className="text-sm font-medium">
                    {formatCurrency(formData.precioUnitario)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Información de Impuestos */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Percent className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Información de Impuestos</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="tipoImpuesto">Tipo de Impuesto *</Label>
                <Select value={formData.tipoImpuesto} onValueChange={(value) => handleInputChange('tipoImpuesto', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_IMPUESTO.map((tipo) => (
                      <SelectItem key={tipo.codigo} value={tipo.codigo}>
                        {tipo.codigo} - {tipo.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tarifaImpuesto">Tarifa de Impuesto *</Label>
                <Select value={formData.codigoTarifaImpuesto} onValueChange={handleTarifaChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar tarifa" />
                  </SelectTrigger>
                  <SelectContent>
                    {TARIFAS_IMPUESTO.map((tarifa) => (
                      <SelectItem key={`${tarifa.codigo}-${tarifa.porcentaje}`} value={tarifa.codigo}>
                        {tarifa.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Exoneración - Próximamente */}
          <Card className="p-6 opacity-60">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold">Exoneración</h3>
              <div className="ml-auto">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Próximamente
                </span>
              </div>
            </div>
            
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
                <FileText className="w-8 h-8 text-orange-600" />
              </div>
              <h4 className="text-lg font-semibold text-muted-foreground mb-2">
                Gestión de Exoneraciones
              </h4>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                La funcionalidad para gestionar exoneraciones de productos estará disponible en una próxima actualización.
              </p>
            </div>
          </Card>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Package className="w-4 h-4" />
                  </motion.div>
                  Guardando...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  {editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}