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
  DollarSign,
  Calendar,
  User,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react"
import { Invoice } from '@/lib/invoice-types'

interface InvoiceCardProps {
  invoice: Invoice
  onEdit?: (invoice: Invoice) => void
  onDelete?: (invoiceId: string) => void
  onView?: (invoice: Invoice) => void
}

export function InvoiceCard({ invoice, onEdit, onDelete, onView }: InvoiceCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0
    }).format(amount)
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
        return { 
          label: 'Aceptada', 
          variant: 'default' as const, 
          icon: CheckCircle,
          color: 'text-green-600'
        }
      case 'rejected':
        return { 
          label: 'Rechazada', 
          variant: 'destructive' as const, 
          icon: XCircle,
          color: 'text-red-600'
        }
      case 'pending':
        return { 
          label: 'Pendiente', 
          variant: 'secondary' as const, 
          icon: Clock,
          color: 'text-yellow-600'
        }
      case 'error':
        return { 
          label: 'Error', 
          variant: 'destructive' as const, 
          icon: AlertCircle,
          color: 'text-red-600'
        }
      default:
        return { 
          label: 'Borrador', 
          variant: 'outline' as const, 
          icon: FileText,
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
                {onView && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(invoice)}>
                    <Eye className="w-3 h-3" />
                  </Button>
                )}
                {onEdit && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(invoice)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(invoice.id!)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
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
                <DollarSign className="w-3 h-3 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-600 text-xs">
                    {formatCurrency(invoice.total)}
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
                {invoice.haciendaStatus && (
                  <Badge 
                    variant={invoice.haciendaStatus === 'aceptado' ? 'default' : 'destructive'} 
                    className="text-xs px-1.5 py-0.5"
                  >
                    Hacienda: {invoice.haciendaStatus}
                  </Badge>
                )}
              </div>

              {/* Estado de Hacienda */}
              {invoice.haciendaStatus && (
                <Badge 
                  variant={invoice.haciendaStatus === 'aceptado' ? 'default' : 'destructive'}
                  className="text-xs px-1.5 py-0.5"
                >
                  {invoice.haciendaStatus === 'aceptado' ? '✓ Aceptada' : '✗ Rechazada'}
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
                        {formatCurrency(item.montoTotalLinea)}
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
