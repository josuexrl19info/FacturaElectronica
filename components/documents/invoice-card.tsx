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

interface InvoiceCardProps {
  invoice: Invoice
  onEdit?: (invoice: Invoice) => void
  onDelete?: (invoiceId: string) => void
  onView?: (invoice: Invoice) => void
  onViewHaciendaStatus?: (invoice: Invoice) => void
}

export function InvoiceCard({ invoice, onEdit, onDelete, onView, onViewHaciendaStatus }: InvoiceCardProps) {
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

  const handleDownloadBothXMLs = () => {
    if (!invoice.haciendaSubmission || !invoice.haciendaSubmission.clave) {
      console.error('No hay clave de Hacienda disponible para descargar archivos')
      return
    }

    const clave = invoice.haciendaSubmission.clave
    
    // Descargar XML firmado si existe
    if (invoice.xmlSigned) {
      downloadXMLFile(invoice.xmlSigned, `${clave}.xml`)
    }
    
    // Descargar XML de respuesta de Hacienda si existe
    if (invoice.haciendaSubmission['respuesta-xml']) {
      try {
        // Decodificar el Base64
        const decodedXML = atob(invoice.haciendaSubmission['respuesta-xml'])
        downloadXMLFile(decodedXML, `${clave}_respuesta.xml`)
      } catch (error) {
        console.error('Error al decodificar XML de Hacienda:', error)
      }
    }
  }

  const isHaciendaAccepted = () => {
    return invoice.haciendaSubmission && 
           invoice.haciendaSubmission['ind-estado'] === 'aceptado'
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
                    {/* Botón PDF (solo visual por ahora) */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      title="Descargar PDF"
                      disabled={true}
                    >
                      <FileDown className="w-3 h-3" />
                    </Button>
                    
                    {/* Botón para descargar ambos XML */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={handleDownloadBothXMLs}
                      title="Descargar XML firmado y respuesta de Hacienda"
                      disabled={!invoice.haciendaSubmission?.clave}
                    >
                      <FileText className="w-3 h-3" />
                    </Button>
                  </>
                )}
                
                {onEdit && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(invoice)}>
                    <Edit className="w-3 h-3" />
                  </Button>
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
