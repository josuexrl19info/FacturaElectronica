"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InvoiceCard } from "@/components/documents/invoice-card"
import { InvoiceCreationModal } from "@/components/documents/invoice-creation-modal"
import { TicketCreationModal } from "@/components/documents/ticket-creation-modal"
import CreditNoteCreationModal from "@/components/documents/credit-note-creation-modal"
import { HaciendaStatusModal } from "@/components/documents/hacienda-status-modal"
import { useDocuments } from "@/hooks/use-documents"
import { useToast } from "@/hooks/use-toast"
import { InvoiceFormData, Invoice } from "@/lib/invoice-types"
import { DocumentType } from "@/components/documents/document-type-tabs"
import { Plus, Search, FileText, DollarSign, TrendingUp, RefreshCw, Receipt, CreditCard } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/firebase-client"

interface DocumentContentProps {
  documentType: DocumentType
  searchTerm: string
  onSearchChange: (term: string) => void
  onRefresh: () => void
  onCreateDocument: (data: InvoiceFormData) => Promise<void>
  showCreateModal: boolean
  onShowCreateModal: (show: boolean) => void
}

const documentConfig = {
  facturas: {
    title: "Facturas Electrónicas",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-600 hover:bg-blue-700",
    createButton: "Nueva Factura",
    emptyMessage: "No hay facturas creadas",
    emptyDescription: "Crea tu primera factura electrónica para comenzar",
    stats: {
      total: "Total Facturas",
      amount: "Monto Total",
      accepted: "Aceptadas",
      pending: "Pendientes"
    }
  },
  tiquetes: {
    title: "Tiquetes Electrónicos",
    icon: Receipt,
    color: "text-green-600",
    bgColor: "bg-green-600 hover:bg-green-700",
    createButton: "Nuevo Tiquete",
    emptyMessage: "No hay tiquetes creados",
    emptyDescription: "Crea tu primer tiquete electrónico para comenzar",
    stats: {
      total: "Total Tiquetes",
      amount: "Monto Total",
      accepted: "Aceptados",
      pending: "Pendientes"
    }
  },
  'notas-credito': {
    title: "Notas de Crédito",
    icon: CreditCard,
    color: "text-purple-600",
    bgColor: "bg-purple-600 hover:bg-purple-700",
    createButton: "Nueva Nota de Crédito",
    emptyMessage: "No hay notas de crédito creadas",
    emptyDescription: "Crea tu primera nota de crédito para comenzar",
    stats: {
      total: "Total Notas",
      amount: "Monto Total",
      accepted: "Aceptadas",
      pending: "Pendientes"
    }
  },
  'notas-debito': {
    title: "Notas de Débito",
    icon: CreditCard,
    color: "text-orange-600",
    bgColor: "bg-orange-600 hover:bg-orange-700",
    createButton: "Nueva Nota de Débito",
    emptyMessage: "No hay notas de débito creadas",
    emptyDescription: "Crea tu primera nota de débito para comenzar",
    stats: {
      total: "Total Notas",
      amount: "Monto Total",
      accepted: "Aceptadas",
      pending: "Pendientes"
    }
  }
}

export function DocumentContent({
  documentType,
  searchTerm,
  onSearchChange,
  onRefresh,
  onCreateDocument,
  showCreateModal,
  onShowCreateModal
}: DocumentContentProps) {
  const { documents, loading, error, isReady, fetchDocuments } = useDocuments(documentType)
  
  // Refrescar documentos cuando cambie el tipo de documento
  useEffect(() => {
    fetchDocuments()
  }, [documentType, fetchDocuments])
  const { toast } = useToast()
  const { user } = useAuth()
  const [showHaciendaModal, setShowHaciendaModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const router = useRouter()
  
  const config = documentConfig[documentType]
  const Icon = config.icon
  
  // Filtrar documentos por búsqueda
  const filteredDocuments = documents.filter(document =>
    (document.consecutivo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (document.clientId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (document.status || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Función para refrescar documentos
  const handleRefresh = () => {
    fetchDocuments()
    if (onRefresh) {
      onRefresh()
    }
  }

  const handleViewHaciendaStatus = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowHaciendaModal(true)
  }

  const handleCloseHaciendaModal = () => {
    setShowHaciendaModal(false)
    setSelectedInvoice(null)
  }

  // Filtrar documentos aceptados por Hacienda Y con status aceptado
  const acceptedDocuments = filteredDocuments.filter(document => 
    document.status === 'aceptado' &&
    document.haciendaSubmission && 
    document.haciendaSubmission['ind-estado'] === 'aceptado'
  )

  // Calcular totales separados por moneda (solo documentos aceptados)
  const getCurrencyCode = (currency?: string) => (currency || 'CRC').toUpperCase()
  const getIvaAmount = (document: any) => (document.tieneExoneracion === true ? 0 : (document.totalImpuesto || 0))

  const stats = {
    totalDocuments: filteredDocuments.length,
    totalAmountCRC: acceptedDocuments
      .filter(document => getCurrencyCode(document.currency) === 'CRC')
      .reduce((sum, document) => {
        // Si tiene exoneración, usar subtotal; si no, usar total
        const amount = document.tieneExoneracion === true ? (document.subtotal || 0) : (document.total || 0)
        return sum + amount
      }, 0),
    totalAmountUSD: acceptedDocuments
      .filter(document => getCurrencyCode(document.currency) === 'USD')
      .reduce((sum, document) => {
        // Si tiene exoneración, usar subtotal; si no, usar total
        const amount = document.tieneExoneracion === true ? (document.subtotal || 0) : (document.total || 0)
        return sum + amount
      }, 0),
    totalIvaCRC: acceptedDocuments
      .filter(document => getCurrencyCode(document.currency) === 'CRC')
      .reduce((sum, document) => sum + getIvaAmount(document), 0),
    totalIvaUSD: acceptedDocuments
      .filter(document => getCurrencyCode(document.currency) === 'USD')
      .reduce((sum, document) => sum + getIvaAmount(document), 0),
    acceptedDocuments: acceptedDocuments.length,
    pendingDocuments: filteredDocuments.filter(document => document.status === 'pending').length
  }


  const formatCurrency = (amount: number, currency: string = 'CRC') => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'USD' ? 2 : 0
    }).format(amount)
  }

  if (loading && filteredDocuments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Cargando {config.title.toLowerCase()}...</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      key={documentType}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{config.stats.total}</p>
              <p className="text-lg font-bold">{stats.totalDocuments}</p>
            </div>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>
        </Card>

        {/* Monto en Colones (Solo Aceptados) */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Monto Total (₡)</p>
              <p className="text-xs text-green-600 mb-1">Solo Aceptados</p>
              <p className="text-lg font-bold">{formatCurrency(stats.totalAmountCRC, 'CRC')}</p>
            </div>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        {/* Monto en Dólares (Solo Aceptados) */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Monto Total ($)</p>
              <p className="text-xs text-green-600 mb-1">Solo Aceptados</p>
              <p className="text-lg font-bold">{formatCurrency(stats.totalAmountUSD, 'USD')}</p>
            </div>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        {/* IVA en Colones (Solo Aceptados) */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">IVA (₡)</p>
              <p className="text-xs text-green-600 mb-1">Solo Aceptados</p>
              <p className="text-lg font-bold">{formatCurrency(stats.totalIvaCRC, 'CRC')}</p>
            </div>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        {/* IVA en Dólares (Solo Aceptados) */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">IVA ($)</p>
              <p className="text-xs text-green-600 mb-1">Solo Aceptados</p>
              <p className="text-lg font-bold">{formatCurrency(stats.totalIvaUSD, 'USD')}</p>
            </div>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{config.stats.accepted}</p>
              <p className="text-lg font-bold">{stats.acceptedDocuments}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{config.stats.pending}</p>
              <p className="text-lg font-bold">{stats.pendingDocuments}</p>
            </div>
            <FileText className="h-5 w-5 text-yellow-600" />
          </div>
        </Card>
      </motion.div>

      {/* Search and Actions */}
      <motion.div 
        className="flex flex-col sm:flex-row gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={`Buscar ${config.title.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button variant="outline" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button 
            onClick={() => onShowCreateModal(true)} 
            className={cn("gap-2 text-white", config.bgColor)}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Plus className="h-4 w-4" />
            </motion.div>
            {config.createButton}
          </Button>
        </motion.div>
      </motion.div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/20 rounded-lg p-4"
        >
          <p className="text-destructive text-sm">
            Error al cargar {config.title.toLowerCase()}: {error}
          </p>
        </motion.div>
      )}

      {/* No Auth Data State */}
      {!isReady && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
        >
          <p className="text-yellow-800 text-sm">
            ⚠️ No se encontraron datos de autenticación. Asegúrate de estar logueado y haber seleccionado una empresa.
          </p>
        </motion.div>
      )}

      {/* Documents List */}
      <AnimatePresence mode="wait">
        {filteredDocuments.length === 0 && !loading ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-12"
          >
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", config.bgColor)}>
              <Icon className={cn("h-8 w-8", config.color)} />
            </div>
            <h3 className="text-lg font-semibold mb-2">{config.emptyMessage}</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? `No se encontraron ${config.title.toLowerCase()} que coincidan con tu búsqueda.` : config.emptyDescription}
            </p>
            <Button 
              onClick={() => onShowCreateModal(true)} 
              className={cn("gap-2 text-white", config.bgColor)}
            >
              <Plus className="h-4 w-4" />
              {config.createButton}
            </Button>
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <AnimatePresence>
              {filteredDocuments.map((document, index) => (
                <motion.div
                  key={document.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <InvoiceCard 
                    invoice={document as any}
                    onView={(document) => {
                      if (documentType === 'facturas') {
                        router.push(`/dashboard/documents/invoice/preview?id=${document.id}`)
                      }
                    }}
                    onEdit={(document) => console.log('Editar documento:', document)}
                    onDelete={(documentId) => console.log('Eliminar documento:', documentId)}
                    onViewHaciendaStatus={handleViewHaciendaStatus}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Creación */}
      {showCreateModal && documentType === 'facturas' && (
        <InvoiceCreationModal
          onClose={() => onShowCreateModal(false)}
          onSubmit={onCreateDocument}
        />
      )}

      {/* Modal de Creación de Tiquete */}
      {showCreateModal && documentType === 'tiquetes' && (
        <TicketCreationModal
          onClose={() => onShowCreateModal(false)}
          onSubmit={onCreateDocument}
        />
      )}

      {/* Modal de Nota de Crédito */}
      {showCreateModal && documentType === 'notas-credito' && user && (() => {
        // Obtener companyId de manera segura
        const companyId = typeof window !== 'undefined' && localStorage.getItem('selectedCompanyId')
          ? localStorage.getItem('selectedCompanyId')!
          : ''
        const tenantId = user.tenantId || ''
        
        // Solo renderizar si tenemos ambos valores
        if (!companyId || !tenantId) {
          console.warn('⚠️ [Document Content] Missing required props for Credit Note Modal:', {
            companyId: companyId || 'MISSING',
            tenantId: tenantId || 'MISSING'
          })
          return null
        }
        
        return (
          <CreditNoteCreationModal
            isOpen={showCreateModal}
            onClose={() => onShowCreateModal(false)}
            companyId={companyId}
            tenantId={tenantId}
            onSuccess={() => {
              fetchDocuments()
              onRefresh()
            }}
          />
        )
      })()}

      {/* Modal de Estado de Hacienda */}
      {showHaciendaModal && selectedInvoice && (
        <HaciendaStatusModal
          isOpen={showHaciendaModal}
          onClose={handleCloseHaciendaModal}
          haciendaSubmission={selectedInvoice.haciendaSubmission}
          consecutivo={selectedInvoice.consecutivo}
          document={selectedInvoice}
        />
      )}
    </motion.div>
  )
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
