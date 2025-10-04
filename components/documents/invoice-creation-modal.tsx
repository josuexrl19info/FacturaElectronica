"use client"

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  X, 
  Plus, 
  Trash2, 
  FileText, 
  User, 
  Package, 
  DollarSign, 
  Calculator,
  ShoppingCart,
  Building,
  Calendar,
  CheckCircle,
  Globe,
  Settings
} from "lucide-react"
import { InvoiceFormData, InvoiceItemFormData, CONDICIONES_VENTA, METODOS_PAGO, TIPOS_IMPUESTO, TARIFAS_IMPUESTO, calculateInvoiceTotals } from '@/lib/invoice-types'
import { useClients } from '@/hooks/use-clients'
import { useProducts } from '@/hooks/use-products'

interface InvoiceCreationModalProps {
  onClose: () => void
  onSubmit: (data: InvoiceFormData) => Promise<void>
}

export function InvoiceCreationModal({ onClose, onSubmit }: InvoiceCreationModalProps) {
  const [formData, setFormData] = useState<InvoiceFormData>({
    clientId: '',
    condicionVenta: '01',
    paymentTerm: '01',
    paymentMethod: '01',
    currency: 'CRC',
    notes: '',
    items: []
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [showProductSelector, setShowProductSelector] = useState(false)

  // Hooks para obtener datos
  const { clients, loading: clientsLoading } = useClients()
  const { products, loading: productsLoading } = useProducts()

  // Monedas disponibles
  const CURRENCIES = [
    { code: 'CRC', name: 'Colones Costarricenses', symbol: '₡' },
    { code: 'USD', name: 'Dólares Americanos', symbol: '$' }
  ]

  const formatCurrency = (amount: number) => {
    const currency = formData.currency || 'CRC'
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'USD' ? 2 : 0
    }).format(amount)
  }

  // Calcular totales en tiempo real
  const totals = calculateInvoiceTotals(formData.items)

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSelectedClient(client)
    setFormData(prev => ({ ...prev, clientId }))
  }

  const handleAddProduct = (product: any) => {
    const newItem: InvoiceItemFormData = {
      productId: product.id,
      codigoCABYS: product.codigoCABYS,
      detalle: product.detalle,
      unidadMedida: product.unidadMedida,
      cantidad: 1,
      precioUnitario: product.precioUnitario,
      tipoImpuesto: product.tipoImpuesto,
      codigoTarifa: product.codigoTarifaImpuesto,
      tarifa: product.tarifaImpuesto
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
    setShowProductSelector(false)
  }

  const handleAddManualItem = () => {
    const newItem: InvoiceItemFormData = {
      codigoCABYS: '',
      detalle: '',
      unidadMedida: 'Sp',
      cantidad: 1,
      precioUnitario: 0,
      tipoImpuesto: '01',
      codigoTarifa: '08', // Corregido: '08' = 13% según formato real
      tarifa: 13
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleUpdateItem = (index: number, field: keyof InvoiceItemFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const handleSubmit = async () => {
    if (!formData.clientId || formData.items.length === 0) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Error al crear factura:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = formData.clientId && formData.items.length > 0

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
        className="bg-background rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden"
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Crear Nueva Factura</h2>
                <p className="text-sm text-muted-foreground">
                  Selecciona cliente, agrega productos y configura la factura
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Columna Izquierda: Cliente, Configuración, Productos y Líneas */}
            <div className="lg:col-span-4 space-y-3">
              {/* Cliente y Configuración en una sola fila */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Cliente - Con más información */}
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-3 h-3 text-blue-600" />
                    <h3 className="font-medium text-sm">Cliente</h3>
                  </div>

                  {clientsLoading ? (
                    <div className="flex items-center justify-center py-3">
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Building className="w-3 h-3" />
                        </motion.div>
                        <span className="text-xs">Cargando...</span>
                      </div>
                    </div>
                  ) : (
                    <Select value={formData.clientId} onValueChange={handleClientSelect}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Seleccionar cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex items-center gap-3 w-full py-1">
                              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{client.name}</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-muted-foreground">{client.identification}</p>
                                  {client.economicActivity && (
                                    <>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <Badge variant="outline" className="text-xs px-1 py-0">
                                        {client.economicActivity.codigo}
                                      </Badge>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {selectedClient && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs"
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <CheckCircle className="w-2.5 h-2.5 text-green-600" />
                        <span className="font-medium text-green-800">Cliente Seleccionado</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-green-700 font-medium">Nombre:</span>
                          <span className="text-green-800">{selectedClient.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700 font-medium">Cédula:</span>
                          <span className="text-green-800">{selectedClient.identification}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700 font-medium">Email:</span>
                          <span className="text-green-800 truncate">{selectedClient.email}</span>
                        </div>
                        {selectedClient.phone && (
                          <div className="flex justify-between">
                            <span className="text-green-700 font-medium">Teléfono:</span>
                            <span className="text-green-800">{selectedClient.phone}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </Card>

                {/* Configuración */}
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-3 h-3 text-purple-600" />
                    <h3 className="font-medium text-sm">Configuración</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <Label className="text-xs">Moneda</Label>
                      <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              <div className="flex items-center gap-1">
                                <Globe className="w-2.5 h-2.5" />
                                <span className="text-xs">{currency.symbol} {currency.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Tipo de Venta</Label>
                      <Select value={formData.condicionVenta} onValueChange={(value) => setFormData(prev => ({ ...prev, condicionVenta: value }))}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDICIONES_VENTA.map((condicion) => (
                            <SelectItem key={condicion.codigo} value={condicion.codigo}>
                              <span className="text-xs">{condicion.descripcion}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Medio de Pago</Label>
                      <Select value={formData.paymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {METODOS_PAGO.map((metodo) => (
                            <SelectItem key={metodo.codigo} value={metodo.codigo}>
                              <span className="text-xs">{metodo.descripcion}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              </div>


              {/* Botones de Acción para Productos - Más compacto */}
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-3 h-3 text-orange-600" />
                  <h3 className="font-medium text-sm">Productos y Servicios</h3>
                  <Badge variant="secondary" className="text-xs">{formData.items.length} items</Badge>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddManualItem} variant="outline" size="sm" className="gap-1 flex-1 h-7 text-xs">
                    <Plus className="w-3 h-3" />
                    Línea Manual
                  </Button>
                  <Button onClick={() => setShowProductSelector(!showProductSelector)} size="sm" className="gap-1 flex-1 h-7 text-xs">
                    <Package className="w-3 h-3" />
                    {showProductSelector ? 'Ocultar' : 'Ver'} Productos
                  </Button>
                </div>
              </Card>

              {/* Selector de Productos - Más compacto */}
              <AnimatePresence>
                {showProductSelector && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Card className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-3 h-3 text-green-600" />
                        <h3 className="font-medium text-sm">Productos Disponibles</h3>
                      </div>

                      {productsLoading ? (
                        <div className="flex items-center justify-center py-3">
                          <div className="flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Package className="w-3 h-3" />
                            </motion.div>
                            <span className="text-xs">Cargando productos...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                          {products.map((product) => (
                            <motion.div
                              key={product.id}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <Card className="p-2 hover:shadow-sm transition-all">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-xs mb-1">{product.detalle}</h4>
                                    <Badge variant="outline" className="text-xs">
                                      {product.codigoCABYS}
                                    </Badge>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddProduct(product)}
                                    className="h-5 w-5 p-0"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </Button>
                                </div>
                                <div className="flex items-center justify-between text-xs mt-1">
                                  <span className="text-muted-foreground">{product.unidadMedida}</span>
                                  <span className="font-semibold text-green-600">
                                    {formatCurrency(product.precioUnitario)}
                                  </span>
                                </div>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Items de la Factura - Más compacto */}
              {formData.items.length > 0 && (
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-3 h-3 text-purple-600" />
                    <h3 className="font-medium text-sm">Items de la Factura</h3>
                  </div>

                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="border rounded-lg p-3"
                      >
                        <div className="space-y-2">
                          {/* Fila principal */}
                          <div className="grid grid-cols-12 gap-2 items-end">
                            {/* Descripción */}
                            <div className="col-span-6">
                              <Label className="text-xs">Descripción</Label>
                              <Input
                                placeholder="Descripción del producto/servicio"
                                value={item.detalle}
                                onChange={(e) => handleUpdateItem(index, 'detalle', e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>

                            {/* Cantidad */}
                            <div className="col-span-1">
                              <Label className="text-xs">Cant.</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.cantidad}
                                onChange={(e) => handleUpdateItem(index, 'cantidad', Number(e.target.value))}
                                className="h-8 text-xs"
                              />
                            </div>

                            {/* Precio Unitario */}
                            <div className="col-span-2">
                              <Label className="text-xs">Precio Unit.</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.precioUnitario}
                                onChange={(e) => handleUpdateItem(index, 'precioUnitario', Number(e.target.value))}
                                className="h-8 text-xs"
                              />
                            </div>

                            {/* Total */}
                            <div className="col-span-2">
                              <Label className="text-xs">Total</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.cantidad * item.precioUnitario}
                                readOnly
                                className="h-8 text-xs font-semibold text-green-600"
                              />
                            </div>

                            {/* Botón Eliminar */}
                            <div className="col-span-1 flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Segunda fila: Código CABYS, % Impuesto, Tarifa */}
                          <div className="grid grid-cols-12 gap-2">
                            {/* Código CABYS */}
                            <div className="col-span-6">
                              <Label className="text-xs">Código CABYS</Label>
                              <Input
                                placeholder="8399000000000"
                                value={item.codigoCABYS}
                                onChange={(e) => handleUpdateItem(index, 'codigoCABYS', e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>

                            {/* % Impuesto */}
                            <div className="col-span-3">
                              <Label className="text-xs">% Impuesto</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                placeholder="13"
                                value={item.tarifa || 13}
                                onChange={(e) => handleUpdateItem(index, 'tarifa', Number(e.target.value))}
                                className="h-8 text-xs"
                              />
                            </div>

                            {/* Tarifa */}
                            <div className="col-span-3">
                              <Label className="text-xs">Tarifa</Label>
                              <Select value={item.codigoTarifa || '08'} onValueChange={(value) => {
                                const tarifa = TARIFAS_IMPUESTO.find(t => t.codigo === value)
                                if (tarifa) {
                                  handleUpdateItem(index, 'codigoTarifa', value)
                                  handleUpdateItem(index, 'tarifa', tarifa.porcentaje)
                                }
                              }}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {TARIFAS_IMPUESTO.map((tarifa) => (
                                    <SelectItem key={tarifa.codigo} value={tarifa.codigo}>
                                      <span className="text-xs">{tarifa.descripcion} ({tarifa.porcentaje}%)</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Columna Derecha: Solo Totales - Más angosta */}
            <div className="lg:col-span-1 space-y-4">
              {/* Resumen de Totales */}
              <Card className="p-3 sticky top-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-4 h-4 text-green-600" />
                  <h3 className="font-semibold text-sm">Totales</h3>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs">Subtotal:</span>
                    <span className="font-semibold text-xs">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs">Impuestos:</span>
                    <span className="font-semibold text-xs">{formatCurrency(totals.totalImpuesto)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">Total:</span>
                    <span className="font-bold text-green-600 text-sm break-all">{formatCurrency(totals.total)}</span>
                  </div>
                </div>

                {/* Datos de la Empresa */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs"
                >
                  <div className="flex items-center gap-1 mb-1">
                    <Building className="w-3 h-3 text-gray-600" />
                    <span className="font-medium text-gray-800">Empresa</span>
                  </div>
                  <p className="text-gray-800">{(() => {
                    try {
                      const companyData = JSON.parse(localStorage.getItem('selectedCompanyData') || '{}');
                      return companyData.nombreComercial || companyData.name || 'Empresa';
                    } catch {
                      return 'Empresa';
                    }
                  })()}</p>
                </motion.div>

                {selectedClient && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs"
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <User className="w-3 h-3 text-blue-600" />
                      <span className="font-medium text-blue-800">Cliente</span>
                    </div>
                    <p className="text-blue-700">{selectedClient.name}</p>
                  </motion.div>
                )}

                {/* Notas */}
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-3 h-3 text-gray-600" />
                    <h3 className="font-medium text-xs">Notas (Opcional)</h3>
                  </div>
                  <Textarea
                    placeholder="Observaciones adicionales..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="text-xs h-16 resize-none"
                  />
                </div>

                <Button 
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="w-full mt-4 gap-2 h-8 text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <FileText className="w-3 h-3" />
                      </motion.div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <FileText className="w-3 h-3" />
                      Crear Factura
                    </>
                  )}
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
