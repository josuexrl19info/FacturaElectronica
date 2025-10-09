'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, Search, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useToastNotification } from '@/components/providers/toast-provider'
import { Invoice } from '@/lib/invoice-types'

interface CreditNoteFormData {
  referenciaFactura: {
    clave: string
    consecutivo: string
    fechaEmision: string
    xmlOriginal?: string
    datosFactura?: any
  }
  tipoNotaCredito: '01' | '02' | '06' | '' // 01: Anulación, 02: Corrección, 06: Devolución
  razon: string
  esAnulacionTotal: boolean
  itemsAfectados: string[] // IDs de los items afectados (si es parcial)
}

interface CreditNoteCreationModalProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
  tenantId: string
  onSuccess?: () => void
}

export default function CreditNoteCreationModal({
  isOpen,
  onClose,
  companyId,
  tenantId,
  onSuccess
}: CreditNoteCreationModalProps) {
  const toast = useToastNotification()
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Selección, 2: Datos, 3: Confirmación
  const [searchMode, setSearchMode] = useState<'db' | 'upload' | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [uploadedXml, setUploadedXml] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<CreditNoteFormData>({
    referenciaFactura: {
      clave: '',
      consecutivo: '',
      fechaEmision: ''
    },
    tipoNotaCredito: '',
    razon: '',
    esAnulacionTotal: true,
    itemsAfectados: []
  })

  // Buscar facturas aceptadas en la BD
  const handleSearchInvoices = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/invoices?tenantId=${tenantId}&companyId=${companyId}`)
      if (!response.ok) throw new Error('Error al buscar facturas')

      const data = await response.json()
      
      console.log('📋 Total facturas obtenidas:', data.invoices?.length || 0)
      console.log('📋 Ejemplo de estados:', data.invoices?.slice(0, 3).map((inv: Invoice) => ({
        consecutivo: inv.consecutivo,
        status: inv.status,
        hasXmlSigned: !!inv.xmlSigned
      })))
      
      // Filtrar solo facturas aceptadas con XML firmado
      const acceptedInvoices = data.invoices.filter((inv: Invoice) => {
        const isAccepted = inv.status?.toLowerCase() === 'aceptado'
        const hasXml = !!inv.xmlSigned
        console.log(`📋 Factura ${inv.consecutivo}:`, { status: inv.status, isAccepted, hasXml })
        return isAccepted && hasXml
      })

      console.log('✅ Facturas aceptadas con XML:', acceptedInvoices.length)

      setInvoices(acceptedInvoices)
      if (acceptedInvoices.length === 0) {
        toast.error('Sin facturas', 'No hay facturas aceptadas disponibles para crear notas de crédito')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error', 'No se pudieron cargar las facturas')
    } finally {
      setIsLoading(false)
    }
  }

  // Manejar subida de XML
  const handleUploadXml = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const text = await file.text()
      setUploadedXml(text)
      
      // Parsear XML para extraer datos
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(text, 'text/xml')
      
      // Extraer clave
      const clave = xmlDoc.getElementsByTagName('Clave')[0]?.textContent || ''
      const consecutivo = xmlDoc.getElementsByTagName('NumeroConsecutivo')[0]?.textContent || ''
      const fechaEmision = xmlDoc.getElementsByTagName('FechaEmision')[0]?.textContent || ''
      
      // Extraer emisor
      const nombreEmisor = xmlDoc.getElementsByTagName('Nombre')[0]?.textContent || ''
      const identificacionEmisor = xmlDoc.getElementsByTagName('Identificacion')[0]?.getElementsByTagName('Numero')[0]?.textContent || ''
      
      // Extraer items
      const lineasDetalle = xmlDoc.getElementsByTagName('LineaDetalle')
      const items = Array.from(lineasDetalle).map((linea, index) => ({
        id: `item-${index}`,
        descripcion: linea.getElementsByTagName('Detalle')[0]?.textContent || '',
        cantidad: parseFloat(linea.getElementsByTagName('Cantidad')[0]?.textContent || '0'),
        precioUnitario: parseFloat(linea.getElementsByTagName('PrecioUnitario')[0]?.textContent || '0'),
        montoTotal: parseFloat(linea.getElementsByTagName('MontoTotalLinea')[0]?.textContent || '0')
      }))

      setFormData(prev => ({
        ...prev,
        referenciaFactura: {
          clave,
          consecutivo,
          fechaEmision,
          xmlOriginal: text,
          datosFactura: {
            emisor: {
              nombre: nombreEmisor,
              identificacion: identificacionEmisor
            },
            items
          }
        }
      }))

      toast.success('XML cargado', 'La factura se ha cargado correctamente')
      setStep(2)
    } catch (error) {
      console.error('Error parsing XML:', error)
      toast.error('Error', 'No se pudo procesar el archivo XML')
    } finally {
      setIsLoading(false)
    }
  }

  // Seleccionar factura de la BD
  const handleSelectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    
    // Convertir fecha de forma segura
    let fechaEmision = new Date().toISOString()
    try {
      if (invoice.fecha) {
        if (typeof invoice.fecha.toDate === 'function') {
          // Es un Timestamp de Firestore
          fechaEmision = invoice.fecha.toDate().toISOString()
        } else if (invoice.fecha instanceof Date) {
          fechaEmision = invoice.fecha.toISOString()
        } else if (typeof invoice.fecha === 'string') {
          fechaEmision = new Date(invoice.fecha).toISOString()
        } else if (typeof invoice.fecha === 'object' && invoice.fecha.seconds) {
          // Es un Timestamp serializado
          fechaEmision = new Date(invoice.fecha.seconds * 1000).toISOString()
        }
      }
    } catch (error) {
      console.error('Error convirtiendo fecha:', error)
      fechaEmision = new Date().toISOString()
    }
    
    setFormData(prev => ({
      ...prev,
      referenciaFactura: {
        clave: invoice.clave || invoice.haciendaSubmission?.clave || '',
        consecutivo: invoice.consecutivo,
        fechaEmision,
        xmlOriginal: invoice.xmlSigned,
        datosFactura: {
          emisor: invoice.cliente,
          items: invoice.items || [],
          total: invoice.total || 0,
          currency: invoice.currency || 'CRC',
          subtotal: invoice.subtotal || 0,
          totalImpuesto: invoice.totalImpuesto || 0,
          totalDescuento: invoice.totalDescuento || 0
        }
      }
    }))
    setStep(2)
  }

  // Enviar nota de crédito
  const handleSubmit = async () => {
    if (!formData.tipoNotaCredito) {
      toast.error('Datos incompletos', 'Selecciona el tipo de nota de crédito')
      return
    }

    if (!formData.razon.trim()) {
      toast.error('Datos incompletos', 'Ingresa la razón de la nota de crédito')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/credit-notes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          companyId,
          tenantId,
          invoiceId: selectedInvoice?.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al crear nota de crédito')
      }

      toast.success('Nota de Crédito Creada', 'La nota de crédito se ha enviado a Hacienda')
      onSuccess?.()
      onClose()
      resetForm()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error', error instanceof Error ? error.message : 'No se pudo crear la nota de crédito')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setSearchMode(null)
    setSearchTerm('')
    setInvoices([])
    setSelectedInvoice(null)
    setUploadedXml(null)
    setFormData({
      referenciaFactura: {
        clave: '',
        consecutivo: '',
        fechaEmision: ''
      },
      tipoNotaCredito: '',
      razon: '',
      esAnulacionTotal: true,
      itemsAfectados: []
    })
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Filtrar facturas por búsqueda
  const filteredInvoices = invoices.filter(inv =>
    inv.consecutivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.clave?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Nueva Nota de Crédito</DialogTitle>
        </DialogHeader>

        {/* Paso 1: Selección de factura */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-sm text-gray-600">
              Selecciona cómo deseas crear la nota de crédito
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Buscar en base de datos */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-lg ${searchMode === 'db' ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => {
                  setSearchMode('db')
                  handleSearchInvoices()
                }}
              >
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <Search className="w-12 h-12 text-blue-600 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Buscar Factura</h3>
                  <p className="text-sm text-gray-600">
                    Busca facturas aceptadas en tu sistema
                  </p>
                </CardContent>
              </Card>

              {/* Subir XML */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-lg ${searchMode === 'upload' ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setSearchMode('upload')}
              >
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <Upload className="w-12 h-12 text-green-600 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Subir XML</h3>
                  <p className="text-sm text-gray-600">
                    Sube el XML de una factura electrónica
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Lista de facturas */}
            {searchMode === 'db' && (
              <div className="space-y-4">
                <Input
                  placeholder="Buscar por consecutivo, clave o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />

                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">Cargando facturas...</div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No hay facturas disponibles</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredInvoices.map((invoice) => (
                      <Card
                        key={invoice.id}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleSelectInvoice(invoice)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-semibold">{invoice.consecutivo}</div>
                              <div className="text-sm text-gray-600">
                                {invoice.cliente?.commercialName || invoice.cliente?.nombre || 'Cliente no especificado'}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Clave: {(invoice.clave || invoice.haciendaSubmission?.clave || 'N/A').substring(0, 30)}...
                              </div>
                              <div className="text-xs text-gray-500">
                                Estado: <span className="font-medium text-green-600">{invoice.status}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-green-600">
                                {invoice.currency === 'USD' ? '$' : '₡'}{invoice.total?.toLocaleString() || '0'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {invoice.fecha ? (
                                  typeof invoice.fecha.toDate === 'function' ? 
                                    invoice.fecha.toDate().toLocaleDateString('es-CR') :
                                    new Date(invoice.fecha).toLocaleDateString('es-CR')
                                ) : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {invoice.currency || 'CRC'}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Upload XML */}
            {searchMode === 'upload' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <input
                  type="file"
                  accept=".xml"
                  onChange={handleUploadXml}
                  className="hidden"
                  id="xml-upload"
                  disabled={isLoading}
                />
                <label
                  htmlFor="xml-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <FileText className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-lg font-semibold mb-2">
                    {isLoading ? 'Procesando...' : 'Selecciona un archivo XML'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Arrastra y suelta o haz clic para seleccionar
                  </p>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Paso 2: Configuración de NC */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Información de la factura */}
            <Card className="bg-blue-50">
              <CardContent className="p-4">
                <div className="text-sm font-semibold mb-3">Factura de Referencia</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Consecutivo:</span>{' '}
                    <span className="font-medium">{formData.referenciaFactura.consecutivo}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Monto Total:</span>{' '}
                    <span className="font-semibold text-green-600">
                      {formData.referenciaFactura.datosFactura?.currency === 'USD' ? '$' : '₡'}
                      {(formData.referenciaFactura.datosFactura?.total || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Moneda:</span>{' '}
                    <span className="font-medium">{formData.referenciaFactura.datosFactura?.currency || 'CRC'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Cliente:</span>{' '}
                    <span className="font-medium">{formData.referenciaFactura.datosFactura?.emisor?.commercialName || formData.referenciaFactura.datosFactura?.emisor?.nombre || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fecha:</span>{' '}
                    <span className="font-medium">{formData.referenciaFactura.fechaEmision ? new Date(formData.referenciaFactura.fechaEmision).toLocaleDateString('es-CR') : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Estado:</span>{' '}
                    <span className="font-medium text-green-600">{selectedInvoice?.status || 'N/A'}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-gray-600">Clave:</span>{' '}
                    <span className="font-mono text-xs bg-white p-2 rounded border break-all block mt-1">
                      {formData.referenciaFactura.clave || 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tipo de nota de crédito */}
            <div className="space-y-2">
              <Label>Tipo de Nota de Crédito *</Label>
              <Select
                value={formData.tipoNotaCredito}
                onValueChange={(value: '01' | '02' | '06') => 
                  setFormData(prev => ({ ...prev, tipoNotaCredito: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <div>
                        <div className="font-semibold">Anulación de documento</div>
                        <div className="text-xs text-gray-600">Anula la factura completamente</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="02">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <div>
                        <div className="font-semibold">Corrección de texto</div>
                        <div className="text-xs text-gray-600">Corrige información de la factura</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="06">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-semibold">Devolución de mercancía</div>
                        <div className="text-xs text-gray-600">Por productos devueltos</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Anulación total o parcial */}
            {formData.tipoNotaCredito === '01' && (
              <div className="space-y-2">
                <Label>Tipo de Anulación</Label>
                <Select
                  value={formData.esAnulacionTotal ? 'total' : 'parcial'}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, esAnulacionTotal: value === 'total' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Anulación Total</SelectItem>
                    <SelectItem value="parcial">Anulación Parcial (por ítem)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Lista de items (si es parcial) */}
            {!formData.esAnulacionTotal && formData.referenciaFactura.datosFactura?.items && (
              <div className="space-y-2">
                <Label>Selecciona los ítems a anular/devolver</Label>
                <div className="border rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                  {formData.referenciaFactura.datosFactura.items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={formData.itemsAfectados.includes(item.id)}
                        onChange={(e) => {
                          const newItems = e.target.checked
                            ? [...formData.itemsAfectados, item.id]
                            : formData.itemsAfectados.filter(id => id !== item.id)
                          setFormData(prev => ({ ...prev, itemsAfectados: newItems }))
                        }}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.descripcion || item.detalle}</div>
                        <div className="text-xs text-gray-600">
                          Cantidad: {item.cantidad} | Precio: ₡{item.precioUnitario?.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">
                        ₡{item.montoTotal?.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Razón */}
            <div className="space-y-2">
              <Label>Razón de la Nota de Crédito * (max 180 caracteres)</Label>
              <Textarea
                value={formData.razon}
                onChange={(e) => setFormData(prev => ({ ...prev, razon: e.target.value.slice(0, 180) }))}
                placeholder="Ej: Anulación por error en monto, Devolución de producto defectuoso, etc."
                rows={3}
                maxLength={180}
              />
              <div className="text-xs text-gray-500 text-right">
                {formData.razon.length} / 180
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Procesando...' : 'Crear Nota de Crédito'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

