"use client"

import { useState, useEffect } from 'react'
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
  Receipt, 
  User, 
  Package, 
  DollarSign, 
  Calculator,
  ShoppingCart,
  Building,
  Calendar,
  CheckCircle,
  Globe,
  Settings,
  Shield,
  Mail,
  AlertCircle,
  CreditCard
} from "lucide-react"
import { InvoiceFormData, InvoiceItemFormData, CONDICIONES_VENTA, METODOS_PAGO, TIPOS_IMPUESTO, TARIFAS_IMPUESTO, calculateInvoiceTotals } from '@/lib/invoice-types'
import { useClients } from '@/hooks/use-clients'
import { useProducts } from '@/hooks/use-products'
import { useToastNotification } from '@/components/providers/toast-provider'

interface TicketCreationModalProps {
  onClose: () => void
  onSubmit: (data: InvoiceFormData) => Promise<void>
}

export function TicketCreationModal({ onClose, onSubmit }: TicketCreationModalProps) {
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
  const [clientEmailError, setClientEmailError] = useState<string>('')
  const toast = useToastNotification()
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
  const totals = calculateInvoiceTotals(formData.items, selectedClient)

  const handleClientSelect = (clientId: string) => {
    if (clientId === 'none' || clientId === '') {
      // Cliente deseleccionado
      setSelectedClient(null)
      setFormData(prev => ({ ...prev, clientId: '' }))
      setClientEmailError('')
      return
    }

    const client = clients.find(c => c.id === clientId)
    setSelectedClient(client)
    setFormData(prev => ({ ...prev, clientId }))
    
    // Validar que el cliente tenga correo si se selecciona
    if (client && !client.email) {
      setClientEmailError('Este cliente no tiene correo electrónico configurado. Se requiere correo para notificar la creación del tiquete.')
    } else {
      setClientEmailError('')
    }
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
      precioUnitario: 0, // Se inicializa en 0 pero el input mostrará vacío
      tipoImpuesto: '01',
      codigoTarifa: '08',
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
    // Validar que haya al menos un item
    if (formData.items.length === 0) {
      toast.error('Datos incompletos', 'Por favor agrega al menos un producto o servicio.')
      return
    }

    // Validar que todos los precios unitarios sean mayores a 0
    const itemsConPrecioInvalido = formData.items.filter((item, index) => {
      const precioUnitario = item.precioUnitario || 0
      return precioUnitario <= 0
    })

    if (itemsConPrecioInvalido.length > 0) {
      const lineasInvalidas = itemsConPrecioInvalido.map((_, idx) => {
        const itemIndex = formData.items.findIndex((item, i) => 
          item === itemsConPrecioInvalido[idx]
        )
        return itemIndex + 1
      }).join(', ')
      toast.error('Precio inválido', `El precio unitario debe ser mayor a cero en todas las líneas. Líneas con precio inválido: ${lineasInvalidas}`)
      return
    }

    // Si hay cliente seleccionado, validar que tenga correo
    if (formData.clientId && formData.clientId !== 'none' && selectedClient && !selectedClient.email) {
      toast.error('Cliente sin correo', 'El cliente seleccionado no tiene correo electrónico. Se requiere correo para notificar la creación del tiquete.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      toast.success('Tiquete creado', 'El tiquete se ha creado exitosamente.')
      onClose()
    } catch (error) {
      console.error('Error al crear tiquete:', error)
      
      let errorMessage = 'Error desconocido al crear el tiquete'
      let errorTitle = 'Error al crear tiquete'
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        if (error.message.includes('XML')) {
          errorTitle = '📄 Error en el documento'
          errorMessage = 'Hubo un problema al generar o firmar el XML del tiquete.'
        }
      }
      
      toast.error(errorTitle, errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Para tiquetes, el cliente es opcional, solo necesitamos items
  // Validar que todos los precios unitarios sean mayores a 0
  const todosLosPreciosValidos = formData.items.every(item => (item.precioUnitario || 0) > 0)
  
  const canSubmit = formData.items.length > 0 && 
                    todosLosPreciosValidos &&
                    (!formData.clientId || formData.clientId === 'none' || (selectedClient && selectedClient.email))

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
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Crear Nuevo Tiquete Electrónico</h2>
                <p className="text-sm text-muted-foreground">
                  El cliente es opcional. Si seleccionas un cliente, debe tener correo para notificar.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
            
            {/* Columna Izquierda: Cliente, Configuración, Productos y Líneas */}
            <div className="lg:col-span-4 space-y-3 flex flex-col">
              {/* Cliente y Configuración en una sola fila */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Cliente - OPCIONAL */}
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-3 h-3 text-blue-600" />
                    <h3 className="font-medium text-sm">Cliente (Opcional)</h3>
                    <Badge variant="outline" className="text-xs">Opcional</Badge>
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
                    <Select value={formData.clientId || 'none'} onValueChange={handleClientSelect}>
                      <SelectTrigger className="h-10 text-sm w-full min-w-0 border-2 hover:border-primary/50 transition-colors bg-background">
                        <SelectValue placeholder="Seleccionar cliente (opcional)...">
                          {selectedClient ? (
                            <div className="flex items-center gap-2 w-full min-w-0">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-white" />
                              </div>
                              <span className="font-medium text-sm truncate text-foreground">
                                {selectedClient.name}
                              </span>
                              {selectedClient.email ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 ml-auto" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 ml-auto" />
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="w-4 h-4" />
                              <span>Seleccionar cliente (opcional)...</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-w-md">
                        <SelectItem value="none" className="py-3">
                          <div className="flex items-center gap-3 w-full">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">Sin cliente</p>
                              <p className="text-xs text-muted-foreground">Tiquete sin cliente asociado</p>
                            </div>
                          </div>
                        </SelectItem>
                        {clients.filter(client => client.status === 'active').map((client) => (
                          <SelectItem key={client.id} value={client.id} className="py-3">
                            <div className="flex items-center gap-3 w-full py-1 max-w-full min-w-0">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                                client.email 
                                  ? 'bg-gradient-to-br from-green-500 to-green-600' 
                                  : 'bg-gradient-to-br from-amber-500 to-amber-600'
                              }`}>
                                <User className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-sm truncate text-foreground" title={client.name}>
                                    {client.name.length > 32 
                                      ? `${client.name.substring(0, 32)}...` 
                                      : client.name
                                    }
                                  </p>
                                  {client.email ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                                  ) : (
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 min-w-0">
                                  <p className="text-xs text-muted-foreground truncate font-medium">{client.identification}</p>
                                  {client.email && (
                                    <>
                                      <span className="text-xs text-muted-foreground flex-shrink-0">•</span>
                                      <Mail className="w-3 h-3 text-green-600 flex-shrink-0" />
                                      <span className="text-xs text-green-600 truncate max-w-[120px]">{client.email}</span>
                                    </>
                                  )}
                                  {!client.email && (
                                    <>
                                      <span className="text-xs text-muted-foreground flex-shrink-0">•</span>
                                      <span className="text-xs text-amber-600">Sin correo</span>
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

                  {/* Mensaje de error si el cliente no tiene correo */}
                  {clientEmailError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs"
                    >
                      <div className="flex items-center gap-1 text-red-800">
                        <AlertCircle className="w-3 h-3" />
                        <span className="font-medium">{clientEmailError}</span>
                      </div>
                    </motion.div>
                  )}

                  {selectedClient && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3"
                    >
                      {/* Información básica del cliente */}
                      <div className={`p-4 border-2 rounded-xl shadow-md transition-all ${
                        selectedClient.email 
                          ? 'bg-gradient-to-br from-green-50 via-green-50 to-emerald-50 border-green-400' 
                          : 'bg-gradient-to-br from-amber-50 via-amber-50 to-orange-50 border-amber-400'
                      }`}>
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-current/20">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                            selectedClient.email 
                              ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                              : 'bg-gradient-to-br from-amber-500 to-orange-600'
                          }`}>
                            {selectedClient.email ? (
                              <CheckCircle className="w-5 h-5 text-white" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className={`font-bold text-sm ${
                              selectedClient.email ? 'text-green-900' : 'text-amber-900'
                            }`}>
                              {selectedClient.email ? 'Cliente Seleccionado' : 'Cliente sin Correo'}
                            </h4>
                            <p className={`text-xs ${selectedClient.email ? 'text-green-700' : 'text-amber-700'}`}>
                              {selectedClient.email ? 'Listo para notificar por correo' : 'No se enviará notificación por correo'}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <p className={`text-xs font-semibold ${selectedClient.email ? 'text-green-700' : 'text-amber-700'}`}>Nombre</p>
                            <p className={`text-sm font-medium ${selectedClient.email ? 'text-green-900' : 'text-amber-900'}`}>{selectedClient.name}</p>
                          </div>
                          <div className="space-y-1">
                            <p className={`text-xs font-semibold ${selectedClient.email ? 'text-green-700' : 'text-amber-700'}`}>Cédula</p>
                            <p className={`text-sm font-medium ${selectedClient.email ? 'text-green-900' : 'text-amber-900'}`}>{selectedClient.identification}</p>
                          </div>
                          <div className="space-y-1">
                            <p className={`text-xs font-semibold ${selectedClient.email ? 'text-green-700' : 'text-amber-700'}`}>Email</p>
                            <p className={`text-sm font-medium truncate ${selectedClient.email ? 'text-green-900' : 'text-amber-900'}`}>
                              {selectedClient.email || 'No configurado'}
                            </p>
                          </div>
                          {selectedClient.phone && (
                            <div className="space-y-1">
                              <p className={`text-xs font-semibold ${selectedClient.email ? 'text-green-700' : 'text-amber-700'}`}>Teléfono</p>
                              <p className={`text-sm font-medium ${selectedClient.email ? 'text-green-900' : 'text-amber-900'}`}>{selectedClient.phone}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Indicativo de exoneración */}
                      {(selectedClient.tieneExoneracion || selectedClient.hasExemption) && (
                        <div className="p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                          <div className="flex items-center gap-1 mb-1">
                            <Shield className="w-2.5 h-2.5 text-purple-600" />
                            <span className="font-medium text-purple-800">🛡️ Cliente con Exoneración</span>
                          </div>
                          <div className="space-y-1">
                            {(selectedClient.exoneracion || selectedClient.exemption) && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-purple-700 font-medium">Tipo:</span>
                                  <span className="text-purple-800">
                                    {(selectedClient.exoneracion?.tipoDocumento || selectedClient.exemption?.exemptionType) && 
                                      (selectedClient.exoneracion?.tipoDocumento === '03' ? 'Ley Especial' :
                                       selectedClient.exoneracion?.tipoDocumento === '08' ? 'Zona Franca' :
                                       selectedClient.exoneracion?.tipoDocumento || selectedClient.exemption?.exemptionType || 'N/A')}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-purple-700 font-medium">Documento:</span>
                                  <span className="text-purple-800 truncate">
                                    {selectedClient.exoneracion?.numeroDocumento || selectedClient.exemption?.documentNumber || 'N/A'}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                </Card>

                {/* Configuración */}
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-3 h-3 text-purple-600" />
                    <h3 className="font-medium text-sm">Configuración</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="w-full">
                      <Label className="text-xs mb-1.5 block">Moneda</Label>
                      <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                        <SelectTrigger className="w-full h-10 text-sm border-2 hover:border-primary/50 transition-colors bg-background">
                          <SelectValue>
                            {formData.currency ? (
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-primary" />
                                <span className="font-medium">
                                  {CURRENCIES.find(c => c.code === formData.currency)?.symbol} {formData.currency}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Seleccionar moneda...</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((curr) => (
                            <SelectItem key={curr.code} value={curr.code} className="py-2.5">
                              <div className="flex items-center gap-3 w-full">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <DollarSign className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">{curr.symbol} {curr.name}</p>
                                  <p className="text-xs text-muted-foreground">Código: {curr.code}</p>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full">
                      <Label className="text-xs mb-1.5 block">Condición de Venta</Label>
                      <Select value={formData.condicionVenta} onValueChange={(value) => setFormData(prev => ({ ...prev, condicionVenta: value }))}>
                        <SelectTrigger className="w-full h-10 text-sm border-2 hover:border-primary/50 transition-colors bg-background">
                          <SelectValue>
                            {formData.condicionVenta ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span className="font-medium">
                                  {CONDICIONES_VENTA.find(c => c.codigo === formData.condicionVenta)?.descripcion || formData.condicionVenta}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Seleccionar condición...</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {CONDICIONES_VENTA.map((cond) => (
                            <SelectItem key={cond.codigo} value={cond.codigo} className="py-2.5">
                              <div className="flex items-center gap-3 w-full">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <Calendar className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">{cond.descripcion}</p>
                                  <p className="text-xs text-muted-foreground">Código: {cond.codigo}</p>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full">
                      <Label className="text-xs mb-1.5 block">Método de Pago</Label>
                      <Select value={formData.paymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}>
                        <SelectTrigger className="w-full h-10 text-sm border-2 hover:border-primary/50 transition-colors bg-background">
                          <SelectValue>
                            {formData.paymentMethod ? (
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-primary" />
                                <span className="font-medium">
                                  {METODOS_PAGO.find(m => m.codigo === formData.paymentMethod)?.descripcion || formData.paymentMethod}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Seleccionar método...</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {METODOS_PAGO.map((met) => (
                            <SelectItem key={met.codigo} value={met.codigo} className="py-2.5">
                              <div className="flex items-center gap-3 w-full">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <CreditCard className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">{met.descripcion}</p>
                                  <p className="text-xs text-muted-foreground">Código: {met.codigo}</p>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Productos y Líneas de Detalle */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-orange-600" />
                    <h3 className="font-medium">Productos y Servicios</h3>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowProductSelector(!showProductSelector)}
                      className="text-xs"
                    >
                      <Package className="w-3 h-3 mr-1" />
                      Agregar Producto
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddManualItem}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Agregar Manual
                    </Button>
                  </div>
                </div>

                {/* Selector de productos */}
                {showProductSelector && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3 p-3 bg-muted rounded-lg"
                  >
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {productsLoading ? (
                        <div className="text-center py-2 text-xs text-muted-foreground">Cargando productos...</div>
                      ) : products.length === 0 ? (
                        <div className="text-center py-2 text-xs text-muted-foreground">No hay productos disponibles</div>
                      ) : (
                        products.map((product) => (
                          <Button
                            key={product.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddProduct(product)}
                            className="w-full justify-start text-xs h-auto py-2"
                          >
                            <Package className="w-3 h-3 mr-2" />
                            <div className="text-left flex-1">
                              <p className="font-medium">{product.detalle}</p>
                              <p className="text-muted-foreground">
                                {formatCurrency(product.precioUnitario)} • {product.codigoCABYS}
                              </p>
                            </div>
                          </Button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Lista de items */}
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-12 md:col-span-4">
                          <Label className="text-xs">Descripción</Label>
                          <Input
                            value={item.detalle}
                            onChange={(e) => handleUpdateItem(index, 'detalle', e.target.value)}
                            placeholder="Descripción del producto/servicio"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="col-span-6 md:col-span-2">
                          <Label className="text-xs">Cantidad</Label>
                          <Input
                            type="number"
                            value={item.cantidad}
                            onChange={(e) => handleUpdateItem(index, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-6 md:col-span-2">
                          <Label className="text-xs">Precio Unit.</Label>
                          <Input
                            type="text"
                            value={item.precioUnitario === 0 ? '' : item.precioUnitario.toString()}
                            onChange={(e) => {
                              const value = e.target.value
                              // Permitir vacío o solo números con decimales
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                const numValue = value === '' ? 0 : parseFloat(value)
                                handleUpdateItem(index, 'precioUnitario', isNaN(numValue) ? 0 : numValue)
                              }
                            }}
                            onBlur={(e) => {
                              // Si está vacío al perder el foco, mantenerlo como 0 internamente pero mostrar vacío
                              if (e.target.value === '') {
                                handleUpdateItem(index, 'precioUnitario', 0)
                              }
                            }}
                            placeholder="0.00"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="col-span-6 md:col-span-2">
                          <Label className="text-xs">Tarifa IVA</Label>
                          <Select
                            value={item.codigoTarifa}
                            onValueChange={(value) => {
                              const tarifa = TARIFAS_IMPUESTO.find(t => t.codigo === value)
                              handleUpdateItem(index, 'codigoTarifa', value)
                              handleUpdateItem(index, 'tarifa', tarifa?.porcentaje || 13)
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue>
                                {item.codigoTarifa 
                                  ? TARIFAS_IMPUESTO.find(t => t.codigo === item.codigoTarifa)?.descripcion || 'Seleccionar...'
                                  : 'Seleccionar...'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {TARIFAS_IMPUESTO.map((tar) => (
                                <SelectItem key={tar.codigo} value={tar.codigo}>
                                  {tar.descripcion}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-6 md:col-span-1">
                          <Label className="text-xs">Total</Label>
                          <div className="h-8 flex items-center text-xs font-medium">
                            {item.precioUnitario > 0 
                              ? formatCurrency((item.cantidad * item.precioUnitario) + ((item.cantidad * item.precioUnitario) * item.tarifa / 100))
                              : formatCurrency(0)
                            }
                          </div>
                        </div>
                        <div className="col-span-12 md:col-span-1 flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Código CABYS</Label>
                        <Input
                          value={item.codigoCABYS}
                          onChange={(e) => handleUpdateItem(index, 'codigoCABYS', e.target.value)}
                          placeholder="8399000000000"
                          className="h-7 text-xs"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {formData.items.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No hay productos agregados</p>
                    <p className="text-xs">Agrega productos desde el catálogo o crea uno manualmente</p>
                  </div>
                )}
              </Card>

              {/* Notas */}
              <Card className="p-3">
                <Label className="text-sm font-medium">Notas Adicionales (Opcional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas adicionales para el tiquete..."
                  className="mt-2 text-sm"
                  rows={3}
                />
              </Card>
            </div>

            {/* Columna Derecha: Resumen */}
            <div className="lg:col-span-1 flex">
              <Card className="p-4 w-full flex flex-col">
                <div className="flex-1 overflow-y-auto">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-sm">Resumen del Tiquete</h3>
                </div>

                <Separator className="mb-4" />

                {/* Información del Cliente */}
                {selectedClient ? (
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <h4 className="font-semibold text-xs">Cliente</h4>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="font-medium text-xs text-blue-900 truncate">{selectedClient.name}</p>
                      <p className="text-xs text-blue-700 mt-1">Cédula: {selectedClient.identification}</p>
                      {selectedClient.email && (
                        <div className="flex items-center gap-1 mt-1">
                          <Mail className="w-2.5 h-2.5 text-blue-600" />
                          <p className="text-xs text-blue-700 truncate">{selectedClient.email}</p>
                        </div>
                      )}
                      {(selectedClient.tieneExoneracion || selectedClient.hasExemption) && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5 mt-1 border-purple-200 text-purple-700">
                          <Shield className="w-2.5 h-2.5 mr-1" />
                          Exonerado
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <h4 className="font-semibold text-xs text-muted-foreground">Cliente</h4>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg border border-dashed">
                      <p className="text-xs text-muted-foreground text-center">Sin cliente</p>
                    </div>
                  </div>
                )}

                <Separator className="my-4" />

                {/* Configuración */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-3.5 h-3.5 text-purple-600" />
                    <h4 className="font-semibold text-xs">Configuración</h4>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Moneda:</span>
                      <span className="font-medium">
                        {CURRENCIES.find(c => c.code === formData.currency)?.symbol} {formData.currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Condición:</span>
                      <span className="font-medium">
                        {CONDICIONES_VENTA.find(c => c.codigo === formData.condicionVenta)?.descripcion || formData.condicionVenta}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pago:</span>
                      <span className="font-medium">
                        {METODOS_PAGO.find(m => m.codigo === formData.paymentMethod)?.descripcion || formData.paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Líneas de la Venta */}
                {formData.items.length > 0 ? (
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="w-3.5 h-3.5 text-orange-600" />
                      <h4 className="font-semibold text-xs">Líneas ({formData.items.length})</h4>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {formData.items.map((item, index) => {
                        const itemSubtotal = item.cantidad * item.precioUnitario
                        const itemTax = (itemSubtotal * (item.tarifa || 0)) / 100
                        const itemTotal = itemSubtotal + itemTax
                        return (
                          <div key={index} className="p-2 bg-muted/30 rounded-lg border border-border/50">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-medium text-xs flex-1 truncate">{item.detalle || `Línea ${index + 1}`}</p>
                              <span className="font-semibold text-xs">{formatCurrency(itemTotal)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{item.cantidad}x</span>
                              <span>{formatCurrency(item.precioUnitario)}</span>
                              {item.tarifa && item.tarifa > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{item.tarifa}% IVA</span>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
                      <h4 className="font-semibold text-xs text-muted-foreground">Líneas</h4>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg border border-dashed">
                      <p className="text-xs text-muted-foreground text-center">No hay productos agregados</p>
                    </div>
                  </div>
                )}

                <Separator className="my-4" />

                {/* Totales */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-3.5 h-3.5 text-green-600" />
                    <h4 className="font-semibold text-xs">Totales</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{formatCurrency(totals.totalImpuesto)}</span>
                        {selectedClient && (selectedClient.tieneExoneracion || selectedClient.hasExemption) && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            <Shield className="w-2 h-2 mr-0.5" />
                            Exento
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">Total:</span>
                      <span className="font-bold text-lg text-green-600">{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Botón de Crear */}
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="mr-2"
                      >
                        <Receipt className="w-4 h-4" />
                      </motion.div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <Receipt className="w-4 h-4 mr-2" />
                      Crear Tiquete
                    </>
                  )}
                </Button>

                {!canSubmit && formData.items.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Agrega al menos un producto
                  </p>
                )}

                {!canSubmit && formData.items.length > 0 && !todosLosPreciosValidos && (
                  <p className="text-xs text-red-600 mt-2 text-center">
                    Corrige los precios unitarios inválidos
                  </p>
                )}

                {!canSubmit && formData.items.length > 0 && todosLosPreciosValidos && formData.clientId && formData.clientId !== 'none' && !selectedClient?.email && (
                  <p className="text-xs text-red-600 mt-2 text-center">
                    El cliente debe tener correo electrónico
                  </p>
                )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
