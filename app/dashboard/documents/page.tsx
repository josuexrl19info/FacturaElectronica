"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { DocumentTypeTabs, useDocumentTabs, DocumentType } from "@/components/documents/document-type-tabs"
import { DocumentContent } from "@/components/documents/document-content"
import { useAuth } from "@/lib/firebase-client"
import { useToast } from "@/hooks/use-toast"
import { InvoiceFormData, Invoice } from "@/lib/invoice-types"
import { Loader2 } from "lucide-react"

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const { activeType, changeType } = useDocumentTabs()
  const searchParams = useSearchParams()
  
  // Obtener el ID de la compañía seleccionada desde localStorage
  const selectedCompanyId = typeof window !== 'undefined' ? localStorage.getItem('selectedCompanyId') : null

  const didApplyTabParam = useRef(false)

  useEffect(() => {
    if (didApplyTabParam.current) return
    const tabParam = searchParams.get("tab")
    if (tabParam && isDocumentType(tabParam)) {
      changeType(tabParam)
    }
    didApplyTabParam.current = true
  }, [searchParams, changeType])

  const handleCreateDocument = async (invoiceData: InvoiceFormData) => {
    try {
      // Calcular totales
      const subtotal = invoiceData.items.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0)
      const totalImpuesto = invoiceData.items.reduce((sum, item) => sum + ((item.cantidad * item.precioUnitario) * (item.tarifa || 0)) / 100, 0)
      const totalDescuento = 0 // Por ahora sin descuentos
      const total = subtotal + totalImpuesto - totalDescuento

      // NO generar consecutivo en el frontend - la API lo generará automáticamente
      // La API generará el consecutivo usando el servicio de consecutivos (consecutive, consecutiveTK, consecutiveNT)
      
      // Convertir los datos del formulario al formato correcto según estructura Firestore
      const documentPayload = {
        // Información básica del documento
        // consecutivo: se generará automáticamente en la API usando el servicio de consecutivos
        // No enviar consecutivo desde el frontend para que la API lo genere correctamente
        status: 'draft' as const, // Estado inicial como borrador
        documentType: activeType, // Agregar tipo de documento
        
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
        
        // Items del documento (formato completo según estructura Firestore)
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

      console.log('📋 Datos del documento a crear (formato completo):', documentPayload)
      
      // Determinar la URL del API según el tipo de documento
      const apiUrl = activeType === 'tiquetes' ? '/api/tickets/create' : '/api/invoices/create'
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentPayload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear documento')
      }

      console.log('✅ Documento creado exitosamente:', result.documentId || result.invoiceId || result.ticketId)
      
      // Mostrar mensaje de éxito
      // El consecutivo viene en el resultado de la API o en documentPayload
      const consecutivoMostrar = result.consecutivo || documentPayload.consecutivo || 'N/A'
      const tipoDocumento = activeType === 'facturas' ? 'Factura' : 
                           activeType === 'tiquetes' ? 'Tiquete' : 
                           activeType === 'notas-credito' ? 'Nota de Crédito' : 'Documento'
      
      toast({
        title: "✅ Documento creado",
        description: `${tipoDocumento} ${consecutivoMostrar} creado exitosamente`,
      })
      
      // Cerrar modal
      setShowCreateModal(false)
      
      // Esperar un momento para que el documento se guarde en Firestore antes de refrescar
      // La lista se actualizará automáticamente cuando el componente se re-renderice
      // o cuando el usuario haga clic en "Actualizar"
    } catch (error) {
      console.error('❌ Error al crear documento:', error)
      
      // Mostrar mensaje de error
      toast({
        title: "❌ Error",
        description: "No se pudo crear el documento. Inténtalo de nuevo.",
        variant: "destructive",
      })
      
      throw error // Re-lanzar para que el modal maneje el error
    }
  }


  return (
    <div className="space-y-6 px-4 lg:px-6">
      <DashboardHeader 
        title="Documentos Electrónicos" 
        description="Gestiona tus documentos electrónicos con Hacienda"
      />

      {/* Document Type Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <DocumentTypeTabs 
          activeType={activeType}
          onTypeChange={changeType}
        />
      </motion.div>

      {/* Document Content */}
      <AnimatePresence mode="wait">
        <DocumentContent
          key={activeType}
          documentType={activeType}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onRefresh={() => {}} // Función vacía ya que el refresh se maneja internamente
          onCreateDocument={handleCreateDocument}
          showCreateModal={showCreateModal}
          onShowCreateModal={setShowCreateModal}
        />
      </AnimatePresence>
    </div>
  )
}

function isDocumentType(value: string): value is DocumentType {
  return value === "facturas" || value === "tiquetes" || value === "notas-credito" || value === "notas-debito"
}