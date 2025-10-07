"use client"

import { motion } from 'framer-motion'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Edit, 
  Trash2, 
  Eye, 
  FileText,
  Calendar,
  User,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileDown
} from "lucide-react"
import { Invoice } from '@/lib/invoice-types'
import { useRouter } from 'next/navigation'

interface InvoiceCardProps {
  invoice: Invoice
  onEdit?: (invoice: Invoice) => void
  onDelete?: (invoiceId: string) => void
  onView?: (invoice: Invoice) => void
  onViewHaciendaStatus?: (invoice: Invoice) => void
}

export function InvoiceCard({ invoice, onEdit, onDelete, onView, onViewHaciendaStatus }: InvoiceCardProps) {
  const router = useRouter()
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const downloadXMLFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownloadSignedXML = () => {
    if (!invoice.haciendaSubmission || !invoice.haciendaSubmission.clave) {
      console.error('No hay clave de Hacienda disponible para descargar XML firmado')
      return
    }

    const clave = invoice.haciendaSubmission.clave
    
    // Descargar XML firmado si existe
    if (invoice.xmlSigned) {
      downloadXMLFile(invoice.xmlSigned, `${clave}.xml`)
    } else {
      console.error('No hay XML firmado disponible')
    }
  }

  const handleDownloadResponseXML = () => {
    if (!invoice.haciendaSubmission || !invoice.haciendaSubmission.clave) {
      console.error('No hay clave de Hacienda disponible para descargar XML de respuesta')
      return
    }

    const clave = invoice.haciendaSubmission.clave
    
    // Descargar XML de respuesta de Hacienda si existe
    if (invoice.haciendaSubmission['respuesta-xml']) {
      try {
        // Decodificar el Base64
        const decodedXML = atob(invoice.haciendaSubmission['respuesta-xml'])
        downloadXMLFile(decodedXML, `${clave}_respuesta.xml`)
      } catch (error) {
        console.error('Error al decodificar XML de respuesta de Hacienda:', error)
      }
    } else {
      console.error('No hay XML de respuesta de Hacienda disponible')
    }
  }

  const isHaciendaAccepted = () => {
    return invoice.haciendaSubmission && 
           invoice.haciendaSubmission['ind-estado'] === 'aceptado'
  }

  const handleDownloadPDF = async () => {
    try {
      // Cargar company y client desde Firestore si no vienen en la factura
      let companyData = invoice.companyData
      let clientData = invoice.cliente

      // Si no tenemos companyData, cargar desde Firestore
      if (!companyData && invoice.companyId) {
        const companyResponse = await fetch(`/api/companies/${invoice.companyId}`)
        if (companyResponse.ok) {
          companyData = await companyResponse.json()
          console.log('✅ Company cargada:', companyData?.name)
        }
      }

      // Si no tenemos clientData, cargar desde Firestore
      if (!clientData && invoice.clientId && invoice.tenantId) {
        const clientResponse = await fetch(`/api/clients?tenantId=${invoice.tenantId}&companyId=${invoice.companyId}`)
        if (clientResponse.ok) {
          const result = await clientResponse.json()
          const clients = result.clients || []
          clientData = clients.find((c: any) => c.id === invoice.clientId)
        }
      }

      // Fallback a emisor/receptor si aún no hay datos
      if (!companyData && invoice.emisor) {
        companyData = {
          name: invoice.emisor.nombreComercial || invoice.emisor.nombre,
          identification: (invoice.emisor as any)?.identificacion?.numero || (invoice.emisor as any)?.numero,
          email: (invoice.emisor as any)?.correoElectronico,
          phone: (invoice.emisor as any)?.telefono,
          provincia: (invoice.emisor as any)?.ubicacion?.provinciaNombre,
          canton: (invoice.emisor as any)?.ubicacion?.cantonNombre,
          distrito: (invoice.emisor as any)?.ubicacion?.distritoNombre,
          otrasSenas: (invoice.emisor as any)?.ubicacion?.otrasSenas
        }
      }

      if (!clientData && (invoice as any).receptor) {
        const receptor = (invoice as any).receptor
        clientData = {
          name: receptor.nombre || receptor.nombreCompleto,
          identification: receptor?.identificacion?.numero || receptor.cedula,
          email: receptor.email || receptor.correoElectronico,
          phone: receptor.telefono,
          provincia: receptor?.ubicacion?.provinciaNombre,
          canton: receptor?.ubicacion?.cantonNombre,
          distrito: receptor?.ubicacion?.distritoNombre,
          direccion: receptor?.ubicacion?.otrasSenas
        }
      }

      console.log('📤 Enviando a PDF:', {
        hasCompany: !!companyData,
        companyName: companyData?.name || companyData?.nombreComercial,
        hasClient: !!clientData,
        clientName: clientData?.name || clientData?.nombre
      })

      // Usar el mismo servicio que se usa para el email
      const response = await fetch('/api/generate-pdf-optimized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoice: invoice,
          company: companyData,
          client: clientData,
          haciendaResponse: invoice.haciendaSubmission
        })
      })

      if (!response.ok) {
        throw new Error(`Error generando PDF: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error generando PDF')
      }

      // Descargar el PDF
      const pdfData = atob(result.pdf_base64)
      const pdfBytes = new Uint8Array(pdfData.length)
      for (let i = 0; i < pdfData.length; i++) {
        pdfBytes[i] = pdfData.charCodeAt(i)
      }
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      // Usar la clave de Hacienda si está disponible, sino usar consecutivo o ID
      const fileName = invoice.haciendaSubmission?.clave || invoice.consecutivo || invoice.id
      link.download = `${fileName}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Error descargando PDF:', error)
      // Fallback: navegar a la página de preview
      router.push(`/dashboard/documents/invoice/preview?id=${invoice.id}`)
    }
  }

  const formatDate = (date: Date | string) => {
    if (!date) return 'N/A'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'Aceptada':
      case 'aceptado':
      case 'Aceptado':
        return { 
          label: 'Aceptado', 
          variant: 'default' as const, 
          icon: CheckCircle,
          color: 'text-green-600'
        }
      case 'rejected':
      case 'Rechazada':
      case 'rechazado':
      case 'Rechazado':
        return { 
          label: 'Rechazado', 
          variant: 'destructive' as const, 
          icon: XCircle,
          color: 'text-red-600'
        }
      case 'pending':
      case 'Pendiente':
      case 'Pendiente Envío Hacienda':
        return { 
          label: 'Pendiente', 
          variant: 'secondary' as const, 
          icon: Clock,
          color: 'text-yellow-600'
        }
      case 'error':
      case 'Error':
      case 'Error Envío Hacienda':
        return { 
          label: 'Error', 
          variant: 'destructive' as const, 
          icon: AlertCircle,
          color: 'text-red-600'
        }
      case 'Enviando Hacienda':
        return { 
          label: 'Enviando Hacienda', 
          variant: 'secondary' as const, 
          icon: Clock,
          color: 'text-blue-600'
        }
      case 'Borrador':
        return { 
          label: 'Borrador', 
          variant: 'outline' as const, 
          icon: FileText,
          color: 'text-gray-600'
        }
      default:
        return { 
          label: status || 'Desconocido', 
          variant: 'outline' as const, 
          icon: AlertCircle,
          color: 'text-gray-600'
        }
    }
  }

  const statusInfo = getStatusInfo(invoice.status)
  const StatusIcon = statusInfo.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className="group"
    >
      <Card className="p-4 hover:shadow-md transition-all duration-300 border-l-4 border-l-primary/20 hover:border-l-primary/60 cursor-pointer">
        <div className="flex items-start gap-3">
          {/* Icono de la factura */}
          <motion.div 
            className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 shadow-sm"
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <FileText className="w-5 h-5" />
          </motion.div>

          {/* Info Principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold truncate">{invoice.consecutivo}</h3>
                  <Badge variant={statusInfo.variant} className="text-xs px-1.5 py-0.5">
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Cliente ID: {invoice.clientId}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    Empresa ID: {invoice.companyId}
                  </span>
                </div>
              </div>

              {/* Acciones */}
              <motion.div 
                className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                initial={{ x: 10 }}
                animate={{ x: 0 }}
              >
                {onViewHaciendaStatus && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7" 
                    onClick={() => onViewHaciendaStatus(invoice)}
                    title="Ver estado de Hacienda"
                    disabled={!invoice.haciendaSubmission}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                )}
                
                {/* Botones adicionales solo si Hacienda está aceptado */}
                {isHaciendaAccepted() && (
                  <>
                    {/* Botón PDF */}
                    {/* Botón para descargar PDF */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={handleDownloadPDF}
                      title="Descargar PDF"
                    >
                      <FileDown className="w-3 h-3" />
                    </Button>
                    
                    {/* Botón para descargar XML firmado */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={handleDownloadSignedXML}
                      title="Descargar XML firmado"
                      disabled={!invoice.xmlSigned || !invoice.haciendaSubmission?.clave}
                    >
                      <FileText className="w-3 h-3 text-blue-600" />
                    </Button>
                    
                    {/* Botón para descargar XML de respuesta de Hacienda */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={handleDownloadResponseXML}
                      title="Descargar XML de respuesta de Hacienda"
                      disabled={!invoice.haciendaSubmission?.['respuesta-xml']}
                    >
                      <FileText className="w-3 h-3 text-green-600" />
                    </Button>
                  </>
                )}
              </motion.div>
            </div>

            {/* Información de totales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <motion.div 
                className="flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div>
                  <p className="font-semibold text-green-600 text-xs">
                    ₡{formatAmount(invoice.total)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </motion.div>

              <div className="flex items-center gap-2">
                <FileText className="w-3 h-3 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-xs">
                    {invoice.items?.length || 0} items
                  </p>
                  <p className="text-xs text-muted-foreground">Productos/Servicios</p>
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(invoice.createdAt)}
                </span>
                {invoice.haciendaSubmission && (
                  <Badge 
                    variant={invoice.haciendaSubmission['ind-estado'] === 'aceptado' ? 'default' : 'destructive'} 
                    className="text-xs px-1.5 py-0.5"
                  >
                    Hacienda: {invoice.haciendaSubmission['ind-estado']}
                  </Badge>
                )}
              </div>

              {/* Estado de Hacienda */}
              {invoice.haciendaSubmission && (
                <Badge 
                  variant={invoice.haciendaSubmission['ind-estado'] === 'aceptado' ? 'default' : 'destructive'}
                  className="text-xs px-1.5 py-0.5"
                >
                  {invoice.haciendaSubmission['ind-estado'] === 'aceptado' ? '✓ Aceptada' : '✗ Rechazada'}
                </Badge>
              )}
            </div>

            {/* Información de items (si hay pocos) */}
            {invoice.items && invoice.items.length <= 2 && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="space-y-1">
                  {invoice.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-muted-foreground truncate flex-1 mr-2">
                        {item.detalle}
                      </span>
                      <span className="font-medium">
                        ₡{formatAmount(item.montoTotalLinea)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
