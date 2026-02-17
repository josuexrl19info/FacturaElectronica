'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, EyeOff, Download, Copy, CheckCircle, XCircle, Clock, AlertCircle, FileText, Building, User, ShoppingCart, DollarSign, Receipt, Package } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Invoice } from '@/lib/invoice-types'

interface HaciendaStatusModalProps {
  isOpen: boolean
  onClose: () => void
  haciendaSubmission: any
  consecutivo: string
  document?: Invoice | null // Documento completo
}

export function HaciendaStatusModal({ isOpen, onClose, haciendaSubmission, consecutivo, document }: HaciendaStatusModalProps) {
  const [showXml, setShowXml] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Función helper para formatear fechas de manera segura
  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A'
    
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    // Verificar que la fecha sea válida
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      console.warn('Fecha inválida recibida:', date)
      return 'N/A'
    }
    
    // Verificar que toLocaleString existe y es una función
    if (typeof dateObj.toLocaleString !== 'function') {
      console.warn('toLocaleString no es una función para:', dateObj)
      return 'N/A'
    }
    
    try {
      return dateObj.toLocaleString('es-CR')
    } catch (error) {
      console.error('Error formateando fecha:', error, 'Fecha:', date)
      return 'N/A'
    }
  }

  // Si no hay documento ni haciendaSubmission, mostrar mensaje informativo
  // Pero permitir mostrar el modal si hay al menos uno de los dos

  // Decodificar el XML de respuesta
  const decodeResponseXml = () => {
    try {
      if (haciendaSubmission['respuesta-xml']) {
        const decoded = atob(haciendaSubmission['respuesta-xml'])
        return decoded
      }
      return 'No hay respuesta XML disponible'
    } catch (error) {
      console.error('Error decodificando XML:', error)
      return 'Error al decodificar XML'
    }
  }

  // Obtener icono según estado
  const getStatusIcon = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'aceptado':
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'rechazado':
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'procesando':
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
    }
  }

  // Obtener color del badge según estado
  const getStatusBadgeColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'aceptado':
      case 'accepted':
        return 'bg-green-100 text-green-800 hover:bg-green-200'
      case 'rechazado':
      case 'rejected':
        return 'bg-red-100 text-red-800 hover:bg-red-200'
      case 'procesando':
      case 'processing':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      default:
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
    }
  }

  // Copiar al portapapeles
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast({
        title: "Copiado",
        description: "Contenido copiado al portapapeles",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles",
        variant: "destructive"
      })
    }
  }

  // Descargar XML
  const downloadXml = () => {
    try {
      const xmlContent = decodeResponseXml()
      const blob = new Blob([xmlContent], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `respuesta-hacienda-${consecutivo}.xml`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Descargado",
        description: "XML de respuesta descargado exitosamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el XML",
        variant: "destructive"
      })
    }
  }

  const estado = haciendaSubmission?.['ind-estado'] || haciendaSubmission?.estado || haciendaSubmission?.state
  const xmlDecodificado = haciendaSubmission ? decodeResponseXml() : 'No hay respuesta XML disponible'

  // Función para formatear moneda
  const formatCurrency = (amount: number, currency: string = 'CRC') => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'USD' ? 2 : 0
    }).format(amount)
  }

  // Determinar tipo de documento
  const getDocumentType = () => {
    if (!document) return 'Documento'
    if (document.documentType === 'tiquetes') return 'Tiquete Electrónico'
    if (document.documentType === 'facturas') return 'Factura Electrónica'
    if (document.documentType === 'notas-credito') return 'Nota de Crédito'
    return 'Documento Electrónico'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {getDocumentType()} - {consecutivo}
          </DialogTitle>
          <DialogDescription>
            Información completa del documento y estado de Hacienda
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="documento" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="documento" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Información del Documento
            </TabsTrigger>
            <TabsTrigger value="hacienda" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Estado de Hacienda
            </TabsTrigger>
          </TabsList>

          {/* Tab: Información del Documento */}
          <TabsContent value="documento" className="flex-1 overflow-auto space-y-4 mt-4">
            {document ? (
              <>
                {/* Información General */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-sm">Información General</h3>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Consecutivo:</span>
                        <span className="text-sm font-medium">{document.consecutivo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Estado:</span>
                        <Badge variant={document.status === 'Aceptado' ? 'default' : 'secondary'}>
                          {document.status || 'Pendiente'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Moneda:</span>
                        <span className="text-sm font-medium">{document.currency || 'CRC'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Fecha de Creación:</span>
                        <span className="text-sm font-medium">
                          {document.createdAt ? formatDate(document.createdAt) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Información del Cliente */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <h3 className="font-semibold text-sm">Cliente</h3>
                    </div>
                    {document.cliente ? (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Nombre:</span>
                          <span className="text-sm font-medium">{document.cliente.nombre || document.cliente.commercialName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Identificación:</span>
                          <span className="text-sm font-medium">{document.cliente.identificacion || 'N/A'}</span>
                        </div>
                        {document.cliente.email && (
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Email:</span>
                            <span className="text-sm font-medium truncate">{document.cliente.email}</span>
                          </div>
                        )}
                        {(document.cliente.tieneExoneracion || document.cliente.hasExemption) && (
                          <Badge variant="outline" className="w-full justify-center mt-2">
                            <Shield className="w-3 h-3 mr-1" />
                            Cliente Exonerado
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="bg-muted/50 p-3 rounded-lg text-center text-sm text-muted-foreground">
                        Sin cliente asociado
                      </div>
                    )}
                  </div>
                </div>

                {/* Productos y Servicios */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-orange-600" />
                    <h3 className="font-semibold text-sm">Productos y Servicios ({document.items?.length || 0})</h3>
                  </div>
                  {document.items && document.items.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-2 font-medium">#</th>
                              <th className="text-left p-2 font-medium">Descripción</th>
                              <th className="text-right p-2 font-medium">Cantidad</th>
                              <th className="text-right p-2 font-medium">Precio Unit.</th>
                              <th className="text-right p-2 font-medium">IVA %</th>
                              <th className="text-right p-2 font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {document.items.map((item: any, index: number) => {
                              const itemSubtotal = (item.cantidad || 0) * (item.precioUnitario || 0)
                              const itemTax = item.impuesto?.[0]?.monto || 0
                              const itemTotal = itemSubtotal + itemTax
                              const taxRate = item.impuesto?.[0]?.tarifa || 0
                              
                              return (
                                <tr key={index} className="border-t">
                                  <td className="p-2">{item.numeroLinea || index + 1}</td>
                                  <td className="p-2">
                                    <div>
                                      <p className="font-medium">{item.detalle || 'N/A'}</p>
                                      {item.codigoCABYS && (
                                        <p className="text-xs text-muted-foreground">CABYS: {item.codigoCABYS}</p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-2 text-right">{item.cantidad || 0}</td>
                                  <td className="p-2 text-right">{formatCurrency(item.precioUnitario || 0, document.currency || 'CRC')}</td>
                                  <td className="p-2 text-right">{taxRate}%</td>
                                  <td className="p-2 text-right font-medium">{formatCurrency(itemTotal, document.currency || 'CRC')}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/50 p-4 rounded-lg text-center text-sm text-muted-foreground">
                      No hay productos o servicios registrados
                    </div>
                  )}
                </div>

                {/* Totales */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <h3 className="font-semibold text-sm">Totales</h3>
                  </div>
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Subtotal:</span>
                      <span className="text-sm font-medium">{formatCurrency(document.subtotal || 0, document.currency || 'CRC')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">IVA:</span>
                      <span className="text-sm font-medium">{formatCurrency(document.totalImpuesto || 0, document.currency || 'CRC')}</span>
                    </div>
                    {document.totalDescuento > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Descuento:</span>
                        <span className="text-sm font-medium text-red-600">-{formatCurrency(document.totalDescuento || 0, document.currency || 'CRC')}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold">Total:</span>
                      <span className="text-lg font-bold text-green-600">{formatCurrency(document.total || 0, document.currency || 'CRC')}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay información del documento disponible</p>
              </div>
            )}
          </TabsContent>

          {/* Tab: Estado de Hacienda */}
          <TabsContent value="hacienda" className="flex-1 overflow-auto space-y-4 mt-4">
            {!haciendaSubmission ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay información de envío a Hacienda disponible</p>
                <p className="text-xs mt-2">Esta factura no ha sido enviada a Hacienda o no hay información de estado disponible.</p>
              </div>
            ) : (
              <>
                {/* Estado y información básica */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-600 mb-1">Estado</h4>
                    <Badge className={getStatusBadgeColor(estado)}>
                      {getStatusIcon(estado)}
                      <span className="ml-1">{estado || 'Desconocido'}</span>
                    </Badge>
                  </div>
                  
                  <div className="md:col-span-2">
                    <h4 className="font-medium text-sm text-gray-600 mb-1">Fecha</h4>
                    <p className="text-sm">
                      {formatDate(haciendaSubmission.fecha)}
                    </p>
                  </div>
                </div>

                {/* Clave en sección separada */}
                <div>
                  <h4 className="font-medium text-sm text-gray-600 mb-2">Clave de Hacienda</h4>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <p className="text-xs font-mono break-all select-all">
                      {haciendaSubmission.clave || 'N/A'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Mensaje de error de Hacienda */}
                {haciendaSubmission.DetalleMensaje && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-600">Mensaje de Error de Hacienda</h4>
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <p className="text-sm text-red-800 whitespace-pre-wrap leading-relaxed">
                        {haciendaSubmission.DetalleMensaje}
                      </p>
                    </div>
                  </div>
                )}

                {/* XML de respuesta */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-gray-600">Respuesta XML de Hacienda</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowXml(!showXml)}
                      className="flex items-center gap-1"
                    >
                      {showXml ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showXml ? 'Ocultar' : 'Mostrar'} XML
                    </Button>
                  </div>

                  {showXml && (
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg max-h-80 overflow-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed">
                        {xmlDecodificado}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Datos completos con XML decodificado */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-600">Datos Completos de Respuesta</h4>
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg max-h-60 overflow-auto">
                    <pre className="text-xs font-mono leading-relaxed">
                      {JSON.stringify({
                        ...haciendaSubmission,
                        'respuesta-xml-decoded': xmlDecodificado
                      }, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex-shrink-0 flex justify-end pt-4 border-t border-gray-200">
          <Button onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
