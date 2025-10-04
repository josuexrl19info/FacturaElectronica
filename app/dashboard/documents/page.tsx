"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InvoiceCard } from "@/components/documents/invoice-card"
import { InvoiceCreationModal } from "@/components/documents/invoice-creation-modal"
import { useInvoices } from "@/hooks/use-invoices"
import { useAuth } from "@/lib/firebase-client"
import { useCompanySelection } from "@/hooks/use-company-selection"
import { useToast } from "@/hooks/use-toast"
import { InvoiceFormData, Invoice } from "@/lib/invoice-types"
import { Plus, Search, FileText, DollarSign, TrendingUp, Loader2, RefreshCw } from "lucide-react"

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { invoices, loading, error, fetchInvoices, isReady, createInvoice } = useInvoices()
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Obtener el ID de la compañía seleccionada desde localStorage
  const selectedCompanyId = typeof window !== 'undefined' ? localStorage.getItem('selectedCompanyId') : null
  
  // Debug temporal
  console.log('🔍 Debug Documents Page:', {
    user: user,
    selectedCompanyId: selectedCompanyId,
    invoices: invoices,
    invoicesLength: invoices?.length,
    loading: loading,
    error: error,
    isReady: isReady
  })
  
  // Debug adicional para verificar localStorage
  if (typeof window !== 'undefined') {
    console.log('🔍 localStorage debug:', {
      user: localStorage.getItem('user'),
      selectedCompanyId: localStorage.getItem('selectedCompanyId'),
      selectedCompanyData: localStorage.getItem('selectedCompanyData')
    })
  }

  const handleRefresh = () => {
    console.log('🔄 Forzando refresh de facturas...')
    fetchInvoices()
  }
  
  // Debug function para verificar datos
  const debugAuthData = () => {
    if (typeof window !== 'undefined') {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const selectedCompanyId = localStorage.getItem('selectedCompanyId')
      console.log('🔍 Debug Auth Data:', { user, selectedCompanyId })
    }
  }

  const handleCreateInvoice = async (invoiceData: InvoiceFormData) => {
    try {
      // Calcular totales
      const subtotal = invoiceData.items.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0)
      const totalImpuesto = invoiceData.items.reduce((sum, item) => sum + ((item.cantidad * item.precioUnitario) * (item.tarifa || 0)) / 100, 0)
      const totalDescuento = 0 // Por ahora sin descuentos
      const total = subtotal + totalImpuesto - totalDescuento

      // Convertir los datos del formulario al formato correcto según estructura Firestore
      const invoicePayload = {
        // Información básica de la factura
        consecutivo: `FAC-${Date.now()}`, // Generar consecutivo único
        status: 'draft' as const, // Estado inicial como borrador
        
        // Relaciones
        clientId: invoiceData.clientId,
        companyId: selectedCompanyId || '',
        tenantId: user?.tenantId,
        
        // Totales
        subtotal: subtotal,
        totalImpuesto: totalImpuesto,
        totalDescuento: totalDescuento,
        total: total,
        exchangeRate: 1, // Por defecto 1 para colones
        currency: invoiceData.currency || 'CRC',
        
        // Condiciones de venta y pago
        condicionVenta: invoiceData.condicionVenta || '01', // '01' = Contado
        paymentTerm: invoiceData.paymentTerm || '01', // Término de pago
        paymentMethod: invoiceData.paymentMethod || '01', // '01' = Efectivo
        
        // Notas
        notes: invoiceData.notes || '',
        
        // Items de la factura (formato completo según estructura Firestore)
        items: invoiceData.items.map((item, index) => {
          const baseImponible = item.cantidad * item.precioUnitario
          const impuestoMonto = (baseImponible * (item.tarifa || 0)) / 100
          
          return {
            numeroLinea: index + 1,
            codigoCABYS: item.codigoCABYS || '8399000000000', // Código por defecto
            cantidad: item.cantidad,
            unidadMedida: item.unidadMedida || 'Sp', // Unidad por defecto (corregido)
            detalle: item.detalle,
            codigoComercial: '', // Campo requerido por formato real
            unidadMedidaComercial: '', // Campo requerido por formato real
            precioUnitario: item.precioUnitario,
            montoTotal: baseImponible,
            subTotal: baseImponible,
            baseImponible: baseImponible,
            montoTotalLinea: baseImponible + impuestoMonto,
            
            // Impuestos (estructura completa para Hacienda 4.4)
            impuesto: [{
              codigo: item.tipoImpuesto || '01', // '01' = IVA por defecto
              codigoTarifaIVA: item.codigoTarifa || '08', // '08' = 13% por defecto (corregido)
              tarifa: item.tarifa || 13, // 13% por defecto
              monto: impuestoMonto
            }],
            impuestoAsumidoEmisorFabrica: 0,
            impuestoNeto: impuestoMonto
          }
        }),
        
        // Campos de auditoría
        createdBy: user?.id
      }

      console.log('📋 Datos de la factura a crear (formato completo):', invoicePayload)
      
      const invoiceId = await createInvoice(invoicePayload as Partial<Invoice>)
      if (invoiceId) {
        console.log('✅ Factura creada exitosamente:', invoiceId)
        
        // Mostrar mensaje de éxito
        toast({
          title: "✅ Factura creada",
          description: `Factura ${invoicePayload.consecutivo} creada exitosamente`,
        })
        
        // El hook ya refresca automáticamente la lista
      }
    } catch (error) {
      console.error('❌ Error al crear factura:', error)
      
      // Mostrar mensaje de error
      toast({
        title: "❌ Error",
        description: "No se pudo crear la factura. Inténtalo de nuevo.",
        variant: "destructive",
      })
      
      throw error // Re-lanzar para que el modal maneje el error
    }
  }

  const filteredInvoices = invoices.filter(invoice =>
    invoice.consecutivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.clientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    totalDocuments: invoices.length,
    totalAmount: invoices.reduce((sum, invoice) => sum + invoice.total, 0),
    acceptedDocuments: invoices.filter(invoice => invoice.status === 'accepted').length,
    pendingDocuments: invoices.filter(invoice => invoice.status === 'pending').length
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Solo mostrar loading si realmente está cargando datos
  if (loading && invoices.length === 0) {
    return (
      <div className="space-y-6">
        <DashboardHeader 
          title="Documentos" 
          description="Gestiona tus facturas y documentos electrónicos"
        />
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Cargando documentos...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Documentos" 
        description="Gestiona tus facturas y documentos electrónicos"
      />

      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Documentos</p>
              <p className="text-lg font-bold">{stats.totalDocuments}</p>
            </div>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Monto Total</p>
              <p className="text-lg font-bold">{formatCurrency(stats.totalAmount)}</p>
            </div>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Aceptadas</p>
              <p className="text-lg font-bold">{stats.acceptedDocuments}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pendientes</p>
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
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por consecutivo, cliente o estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
          <Button variant="outline" onClick={debugAuthData} className="gap-2 text-xs">
            🔍 Debug
          </Button>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Plus className="h-4 w-4" />
            </motion.div>
            Nueva Factura
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
            Error al cargar documentos: {error}
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
      {filteredInvoices.length === 0 && !loading ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay documentos</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'No se encontraron documentos que coincidan con tu búsqueda.' : 'Aún no has creado ningún documento.'}
          </p>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Crear primera factura
          </Button>
        </motion.div>
      ) : (
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <AnimatePresence>
            {filteredInvoices.map((invoice, index) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <InvoiceCard 
                  invoice={invoice}
                  onView={(invoice) => console.log('Ver factura:', invoice)}
                  onEdit={(invoice) => console.log('Editar factura:', invoice)}
                  onDelete={(invoiceId) => console.log('Eliminar factura:', invoiceId)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modal de Creación de Factura */}
      {showCreateModal && (
        <InvoiceCreationModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateInvoice}
        />
      )}
    </div>
  )
}