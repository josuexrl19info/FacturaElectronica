'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, Search, FileText, CheckCircle, XCircle, AlertCircle, Shield } from 'lucide-react'
import { useToastNotification } from '@/components/providers/toast-provider'
import { Invoice } from '@/lib/invoice-types'

interface ParsedFacturaData {
  clave: string
  consecutivo: string
  fechaEmision: string
  condicionVenta: string
  medioPago: string
  emisor: {
    nombre: string
    identificacion: string
    tipoIdentificacion: string
    nombreComercial: string
    ubicacion: {
      provincia: string
      canton: string
      distrito: string
      otrasSenas: string
    }
    telefono: {
      codigoPais: string
      numero: string
    }
    correoElectronico: string
  }
  receptor: {
    nombre: string
    identificacion: string
    tipoIdentificacion: string
    nombreComercial: string
    ubicacion: {
      provincia: string
      canton: string
      distrito: string
      otrasSenas: string
    }
    telefono?: {
      codigoPais: string
      numero: string
    }
    correoElectronico: string
  }
  items: Array<{
    numeroLinea: number
    codigoCABYS: string
    cantidad: number
    unidadMedida: string
    detalle: string
    precioUnitario: number
    montoTotal: number
    subtotal: number
    baseImponible: number
    impuesto?: {
      codigo: string
      codigoTarifa: string
      tarifa: number
      monto: number
      exoneracion?: {
        tipoDocumento: string
        numeroDocumento: string
        nombreInstitucion: string
        fechaEmision: string
        tarifaExonerada: number
        montoExoneracion: number
        // Campos opcionales - solo se incluyen si existen en el XML
        tipoDocumentoOtro?: string
        nombreLey?: string
        articulo?: number
        inciso?: number
        porcentajeCompra?: number
        nombreInstitucionOtros?: string
      }
    }
    impuestoNeto: number
    montoTotalLinea: number
  }>
  resumen: {
    codigoMoneda: string
    tipoCambio: number
    totalServGravados: number
    totalServExentos: number
    totalServExonerado: number
    totalMercanciasGravadas: number
    totalMercanciasExentas: number
    totalMercanciasExoneradas: number
    totalGravado: number
    totalExento: number
    totalExonerado: number
    totalVenta: number
    totalDescuentos: number
    totalVentaNeta: number
    totalImpuesto: number
    totalComprobante: number
  }
}

interface CreditNoteFormData {
  facturaData: ParsedFacturaData | null // Datos parseados del XML
  tipoNotaCredito: '01' | '02' | '06' | '' // 01: Anulación, 02: Corrección, 06: Devolución
  razon: string
  esAnulacionTotal: boolean
  itemsAfectados: number[] // Números de línea de los items afectados (si es parcial)
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
  const [selectedClient, setSelectedClient] = useState<any>(null)

  const [formData, setFormData] = useState<CreditNoteFormData>({
    facturaData: null,
    tipoNotaCredito: '',
    razon: '',
    esAnulacionTotal: true,
    itemsAfectados: []
  })

  // Función para parsear XML de factura
  const parseFacturaXML = (xmlString: string): ParsedFacturaData | null => {
    try {
      // Helper para extraer texto de un tag
      const getTagValue = (xml: string, tagName: string, defaultValue: string = ''): string => {
        const regex = new RegExp(`<${tagName}>([^<]*)<\/${tagName}>`, 'i')
        const match = xml.match(regex)
        return match ? match[1].trim() : defaultValue
      }

      // Helper para extraer número
      const getTagNumber = (xml: string, tagName: string, defaultValue: number = 0): number => {
        const value = getTagValue(xml, tagName, String(defaultValue))
        return parseFloat(value) || defaultValue
      }

      // Extraer datos básicos
      const clave = getTagValue(xmlString, 'Clave')
      const consecutivo = getTagValue(xmlString, 'NumeroConsecutivo')
      const fechaEmision = getTagValue(xmlString, 'FechaEmision')

      // Extraer condición de venta y medio de pago
      const condicionVenta = getTagValue(xmlString, 'CondicionVenta', '01')
      const medioPago = getTagValue(xmlString, 'TipoMedioPago', '01') // Correcto: TipoMedioPago, no MedioPago
      
      // Extraer actividades económicas
      const codigoActividadReceptor = getTagValue(xmlString, 'CodigoActividadReceptor', '')

      // Extraer emisor
      const emisorMatch = xmlString.match(/<Emisor>([\s\S]*?)<\/Emisor>/i)
      const emisorXML = emisorMatch ? emisorMatch[1] : ''
      
      const ubicacionEmisorMatch = emisorXML.match(/<Ubicacion>([\s\S]*?)<\/Ubicacion>/i)
      const ubicacionEmisorXML = ubicacionEmisorMatch ? ubicacionEmisorMatch[1] : ''
      
      const telefonoEmisorMatch = emisorXML.match(/<Telefono>([\s\S]*?)<\/Telefono>/i)
      const telefonoEmisorXML = telefonoEmisorMatch ? telefonoEmisorMatch[1] : ''
      
      // Formatear cantón del emisor a 2 dígitos
      const cantonEmisorRaw = getTagValue(ubicacionEmisorXML, 'Canton', '01')
      const cantonEmisor = cantonEmisorRaw.length > 2 
        ? cantonEmisorRaw.substring(cantonEmisorRaw.length - 2) 
        : cantonEmisorRaw.padStart(2, '0')
      
      const emisor = {
        nombre: getTagValue(emisorXML, 'Nombre'),
        identificacion: getTagValue(emisorXML, 'Numero'),
        tipoIdentificacion: getTagValue(emisorXML, 'Tipo', '02'),
        nombreComercial: getTagValue(emisorXML, 'NombreComercial'),
        ubicacion: {
          provincia: getTagValue(ubicacionEmisorXML, 'Provincia', '1'),
          canton: cantonEmisor,
          distrito: getTagValue(ubicacionEmisorXML, 'Distrito', '01'),
          otrasSenas: getTagValue(ubicacionEmisorXML, 'OtrasSenas', '')
        },
        telefono: {
          codigoPais: getTagValue(telefonoEmisorXML, 'CodigoPais', '506'),
          numero: getTagValue(telefonoEmisorXML, 'NumTelefono', '')
        },
        correoElectronico: getTagValue(emisorXML, 'CorreoElectronico', '')
      }

      // Extraer receptor
      const receptorMatch = xmlString.match(/<Receptor>([\s\S]*?)<\/Receptor>/i)
      const receptorXML = receptorMatch ? receptorMatch[1] : ''
      
      const ubicacionMatch = receptorXML.match(/<Ubicacion>([\s\S]*?)<\/Ubicacion>/i)
      const ubicacionXML = ubicacionMatch ? ubicacionMatch[1] : ''
      
      const telefonoMatch = receptorXML.match(/<Telefono>([\s\S]*?)<\/Telefono>/i)
      const telefonoXML = telefonoMatch ? telefonoMatch[1] : ''
      
      // Formatear cantón a 2 dígitos (si viene con 3, tomar los últimos 2)
      const cantonRaw = getTagValue(ubicacionXML, 'Canton', '01')
      const canton = cantonRaw.length > 2 ? cantonRaw.substring(cantonRaw.length - 2) : cantonRaw.padStart(2, '0')
      
      const receptor = {
        nombre: getTagValue(receptorXML, 'Nombre'),
        identificacion: getTagValue(receptorXML, 'Numero'),
        tipoIdentificacion: getTagValue(receptorXML, 'Tipo', '01'),
        nombreComercial: getTagValue(receptorXML, 'NombreComercial'),
        ubicacion: {
          provincia: getTagValue(ubicacionXML, 'Provincia', '1'),
          canton: canton,
          distrito: getTagValue(ubicacionXML, 'Distrito', '01'),
          otrasSenas: getTagValue(ubicacionXML, 'OtrasSenas', '')
        },
        telefono: telefonoXML ? {
          codigoPais: getTagValue(telefonoXML, 'CodigoPais', '506'),
          numero: getTagValue(telefonoXML, 'NumTelefono', '')
        } : undefined,
        correoElectronico: getTagValue(receptorXML, 'CorreoElectronico', ''),
        codigoActividadReceptor: codigoActividadReceptor // Agregar actividad económica
      }

      // Extraer items
      const detalleMatch = xmlString.match(/<DetalleServicio>([\s\S]*?)<\/DetalleServicio>/i)
      const detalleXML = detalleMatch ? detalleMatch[1] : ''
      const lineaDetalleMatches = detalleXML.match(/<LineaDetalle>([\s\S]*?)<\/LineaDetalle>/gi) || []
      
      const items = lineaDetalleMatches.map((lineaXML) => {
        // Extraer impuesto si existe
        const impuestoMatch = lineaXML.match(/<Impuesto>([\s\S]*?)<\/Impuesto>/i)
        let impuesto = undefined
        
        if (impuestoMatch) {
          const impuestoXML = impuestoMatch[1]
          
          // IMPORTANTE: Extraer el <Monto> ANTES de procesar la exoneración
          // para evitar confusión con <MontoExoneracion>
          // Crear una copia del XML sin el bloque de Exoneracion para extraer el Monto correctamente
          const impuestoSinExoneracion = impuestoXML.replace(/<Exoneracion>[\s\S]*?<\/Exoneracion>/i, '')
          const montoImpuesto = getTagNumber(impuestoSinExoneracion, 'Monto', 0)
          
          // Extraer exoneración si existe
          const exoneracionMatch = impuestoXML.match(/<Exoneracion>([\s\S]*?)<\/Exoneracion>/i)
          let exoneracion = undefined
          
          if (exoneracionMatch) {
            const exoneracionXML = exoneracionMatch[1]
            
            // Solo crear campos que realmente existen en el XML
            exoneracion = {
              tipoDocumento: getTagValue(exoneracionXML, 'TipoDocumentoEX1', ''),
              numeroDocumento: getTagValue(exoneracionXML, 'NumeroDocumento', ''),
              nombreInstitucion: getTagValue(exoneracionXML, 'NombreInstitucion', ''),
              fechaEmision: getTagValue(exoneracionXML, 'FechaEmisionEX', ''),
              tarifaExonerada: getTagNumber(exoneracionXML, 'TarifaExonerada', 0),
              montoExoneracion: getTagNumber(exoneracionXML, 'MontoExoneracion', 0)
            } as any
            
            // Solo agregar campos opcionales si existen en el XML
            const articulo = getTagNumber(exoneracionXML, 'Articulo', 0)
            if (articulo > 0) {
              exoneracion.articulo = articulo
            }
            
            const inciso = getTagNumber(exoneracionXML, 'Inciso', 0)
            if (inciso > 0) {
              exoneracion.inciso = inciso
            }
            
            const nombreLey = getTagValue(exoneracionXML, 'NombreLey', '')
            if (nombreLey) {
              exoneracion.nombreLey = nombreLey
            }
            
            const porcentajeCompra = getTagNumber(exoneracionXML, 'PorcentajeCompra', 0)
            if (porcentajeCompra > 0) {
              exoneracion.porcentajeCompra = porcentajeCompra
            }
            
            const tipoDocumentoOtro = getTagValue(exoneracionXML, 'TipoDocumentoOTRO', '')
            if (tipoDocumentoOtro) {
              exoneracion.tipoDocumentoOtro = tipoDocumentoOtro
            }
            
            const nombreInstitucionOtros = getTagValue(exoneracionXML, 'NombreInstitucionOtros', '')
            if (nombreInstitucionOtros) {
              exoneracion.nombreInstitucionOtros = nombreInstitucionOtros
            }
            
            // Log para debug del monto
            console.log('📋 Parseando impuesto con exoneración:', {
              montoExtraido: montoImpuesto,
              montoExoneracion: exoneracion.montoExoneracion,
              tieneExoneracion: true
            })
          }
          
          impuesto = {
            codigo: getTagValue(impuestoXML, 'Codigo', '02'),
            codigoTarifa: getTagValue(impuestoXML, 'CodigoTarifaIVA', '08'),
            tarifa: getTagNumber(impuestoXML, 'Tarifa', 13),
            monto: montoImpuesto,
            exoneracion: exoneracion
          }
        }

        return {
          numeroLinea: getTagNumber(lineaXML, 'NumeroLinea', 1),
          codigoCABYS: getTagValue(lineaXML, 'CodigoCABYS', '8399000000000'),
          cantidad: getTagNumber(lineaXML, 'Cantidad', 1),
          unidadMedida: getTagValue(lineaXML, 'UnidadMedida', 'Sp'),
          detalle: getTagValue(lineaXML, 'Detalle'),
          precioUnitario: getTagNumber(lineaXML, 'PrecioUnitario', 0),
          montoTotal: getTagNumber(lineaXML, 'MontoTotal', 0),
          subtotal: getTagNumber(lineaXML, 'SubTotal', 0),
          baseImponible: getTagNumber(lineaXML, 'BaseImponible', 0),
          impuesto,
          impuestoNeto: getTagNumber(lineaXML, 'ImpuestoNeto', 0),
          montoTotalLinea: getTagNumber(lineaXML, 'MontoTotalLinea', 0)
        }
      })

      // Extraer resumen
      const resumenMatch = xmlString.match(/<ResumenFactura>([\s\S]*?)<\/ResumenFactura>/i)
      const resumenXML = resumenMatch ? resumenMatch[1] : ''
      
      const resumen = {
        codigoMoneda: getTagValue(resumenXML, 'CodigoMoneda', 'CRC'),
        tipoCambio: getTagNumber(resumenXML, 'TipoCambio', 1),
        totalServGravados: getTagNumber(resumenXML, 'TotalServGravados', 0),
        totalServExentos: getTagNumber(resumenXML, 'TotalServExentos', 0),
        totalServExonerado: getTagNumber(resumenXML, 'TotalServExonerado', 0),
        totalMercanciasGravadas: getTagNumber(resumenXML, 'TotalMercanciasGravadas', 0),
        totalMercanciasExentas: getTagNumber(resumenXML, 'TotalMercanciasExentas', 0),
        totalMercanciasExoneradas: getTagNumber(resumenXML, 'TotalMercanciasExoneradas', 0),
        totalGravado: getTagNumber(resumenXML, 'TotalGravado', 0),
        totalExento: getTagNumber(resumenXML, 'TotalExento', 0),
        totalExonerado: getTagNumber(resumenXML, 'TotalExonerado', 0),
        totalVenta: getTagNumber(resumenXML, 'TotalVenta', 0),
        totalDescuentos: getTagNumber(resumenXML, 'TotalDescuentos', 0),
        totalVentaNeta: getTagNumber(resumenXML, 'TotalVentaNeta', 0),
        totalImpuesto: getTagNumber(resumenXML, 'TotalImpuesto', 0),
        totalComprobante: getTagNumber(resumenXML, 'TotalComprobante', 0)
      }

      return {
        clave,
        consecutivo,
        fechaEmision,
        condicionVenta,
        medioPago,
        emisor,
        receptor,
        items,
        resumen
      }
    } catch (error) {
      console.error('Error parseando XML:', error)
      return null
    }
  }

  // Buscar cliente por identificación
  const fetchClientByIdentification = async (identification: string) => {
    try {
      const response = await fetch(`/api/clients?tenantId=${tenantId}&identification=${identification}`)
      if (response.ok) {
        const data = await response.json()
        if (data.clients && data.clients.length > 0) {
          return data.clients[0] // Retornar el primer cliente encontrado
        }
      }
    } catch (error) {
      console.error('Error fetching client:', error)
    }
    return null
  }

  // Buscar facturas aceptadas en la BD
  const handleSearchInvoices = async () => {
    
    // Validar que tenemos los datos necesarios
    if (!tenantId || !companyId) {
      console.error('❌ [Credit Note Modal] Missing config:', { tenantId, companyId })
      toast.error('Error', 'Faltan datos de configuración (tenantId o companyId). Por favor, verifica que estés logueado y que se haya seleccionado una empresa.')
      return
    }

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
      
      // Usar la misma función de parseo que para las facturas de la DB
      const parsedData = parseFacturaXML(text)
      
      if (!parsedData) {
        toast.error('Error', 'No se pudo parsear el XML. Verifica que sea un XML de factura válido.')
        setIsLoading(false)
        return
      }
      
      // Usar los mismos datos parseados que cuando se selecciona de la DB
      setFormData(prev => ({
        ...prev,
        facturaData: parsedData
      }))

      // Buscar el cliente por identificación para obtener datos de exoneración
      const clientData = await fetchClientByIdentification(parsedData.receptor.identificacion)
      setSelectedClient(clientData)

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
  const handleSelectInvoice = async (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    
    // Parsear el XML firmado para extraer los datos
    if (invoice.xmlSigned) {
      const parsedData = parseFacturaXML(invoice.xmlSigned)
      
      if (parsedData) {
        setFormData(prev => ({
          ...prev,
          facturaData: parsedData
        }))
        
        // Buscar el cliente por identificación para obtener datos de exoneración
        const clientData = await fetchClientByIdentification(parsedData.receptor.identificacion)
        setSelectedClient(clientData)
        
        console.log('✅ Factura seleccionada y parseada:', invoice.consecutivo)
        console.log('📄 Datos parseados:', parsedData)
        console.log('👤 Cliente encontrado:', clientData)
        
        setStep(2)
      } else {
        toast.error('Error', 'No se pudo parsear el XML de la factura')
      }
    } else {
      toast.error('Error', 'La factura no tiene XML firmado')
    }
  }

  // Enviar nota de crédito
  const handleSubmit = async () => {
    if (!formData.facturaData) {
      toast.error('Datos incompletos', 'No se ha seleccionado una factura')
      return
    }

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
          facturaData: formData.facturaData, // Enviar JSON parseado
          xmlFacturaOriginal: selectedInvoice?.xmlSigned || uploadedXml, // XML de DB o XML subido
          tipoNotaCredito: formData.tipoNotaCredito,
          razon: formData.razon,
          esAnulacionTotal: formData.esAnulacionTotal,
          itemsAfectados: formData.itemsAfectados,
          companyId,
          tenantId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear nota de crédito')
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
    setSelectedClient(null)
    setUploadedXml(null)
    setFormData({
      facturaData: null,
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
          <DialogDescription>
            Crea una nueva nota de crédito basada en una factura existente
          </DialogDescription>
        </DialogHeader>

        {/* Validación de configuración */}
        {(!companyId || !tenantId) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
              <div>
                <h4 className="text-red-800 font-medium">Configuración Incompleta</h4>
                <p className="text-red-600 text-sm mt-1">
                  {!companyId && !tenantId 
                    ? 'Faltan el ID de empresa y el ID de inquilino. Por favor, verifica que estés logueado y que se haya seleccionado una empresa.'
                    : !companyId 
                    ? 'Falta el ID de empresa. Por favor, selecciona una empresa desde el menú.'
                    : 'Falta el ID de inquilino. Por favor, verifica tu sesión de usuario.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

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
                              <div className="font-semibold text-green-600 mb-1">
                                {invoice.currency === 'USD' ? '$' : '₡'}{(() => {
                                  // Para facturas con exoneración, mostrar solo el subtotal (sin IVA)
                                  if (invoice.tieneExoneracion === true) {
                                    return (invoice.subtotal || 0).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                  }
                                  // Para facturas normales, mostrar el total (con IVA)
                                  return (invoice.total || 0).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                })()}
                              </div>
                              <div className="text-xs text-gray-500 mb-1">
                                {invoice.tieneExoneracion === true ? 'Monto Total (Exonerado)' : 'Monto Total'}
                              </div>
                              <div className="font-semibold text-blue-600 mb-1">
                                {invoice.currency === 'USD' ? '$' : '₡'}{(invoice.subtotal || 0).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-gray-500 mb-2">
                                {invoice.tieneExoneracion === true ? 'Monto sin IVA (Exonerado)' : 'Monto sin IVA'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {invoice.fecha ? (
                                  typeof invoice.fecha.toDate === 'function' ? 
                                    invoice.fecha.toDate().toLocaleDateString('es-CR') :
                                    new Date(invoice.fecha).toLocaleDateString('es-CR')
                                ) : 'N/A'}
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
        {step === 2 && formData.facturaData && (
          <div className="space-y-6">
            {/* Información de la factura */}
            <Card className="bg-blue-50">
              <CardContent className="p-4">
                <div className="text-sm font-semibold mb-3">Factura de Referencia</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Consecutivo:</span>{' '}
                    <span className="font-medium">{formData.facturaData.consecutivo}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Monto Total:</span>{' '}
                    <span className="font-semibold text-green-600">
                      {formData.facturaData.resumen.codigoMoneda === 'USD' ? '$' : '₡'}
                      {formData.facturaData.resumen.totalComprobante.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Monto sin IVA:</span>{' '}
                    <span className="font-semibold text-blue-600">
                      {formData.facturaData.resumen.codigoMoneda === 'USD' ? '$' : '₡'}
                      {formData.facturaData.resumen.totalVentaNeta.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Cliente:</span>{' '}
                    <span className="font-medium">{formData.facturaData.receptor.nombreComercial || formData.facturaData.receptor.nombre}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fecha:</span>{' '}
                    <span className="font-medium">
                      {new Date(formData.facturaData.fechaEmision).toLocaleDateString('es-CR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Estado:</span>{' '}
                    <span className="font-medium text-green-600">{selectedInvoice?.status || 'Aceptado'}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-gray-600">Clave:</span>{' '}
                    <span className="font-mono text-xs bg-white p-2 rounded border break-all block mt-1">
                      {formData.facturaData.clave}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Indicativo de exoneración - SOLO si la factura original tenía exoneración */}
            {formData.facturaData?.items?.some(item => item.impuesto?.exoneracion) && (
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-1 mb-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-800">🛡️ Factura con Exoneración</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {(() => {
                      // Buscar el primer item con exoneración para mostrar los datos
                      const itemConExoneracion = formData.facturaData?.items?.find(item => item.impuesto?.exoneracion)
                      const exoneracion = itemConExoneracion?.impuesto?.exoneracion
                      
                      if (exoneracion) {
                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-purple-700 font-medium">Tipo:</span>
                              <span className="text-purple-800">
                                {exoneracion.tipoDocumento === '03' ? 'Ley Especial' :
                                 exoneracion.tipoDocumento === '08' ? 'Zona Franca' :
                                 exoneracion.tipoDocumento || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-purple-700 font-medium">Documento:</span>
                              <span className="text-purple-800 truncate">
                                {exoneracion.numeroDocumento || 'N/A'}
                              </span>
                            </div>
                            {exoneracion.nombreLey && (
                              <div className="flex justify-between">
                                <span className="text-purple-700 font-medium">Ley:</span>
                                <span className="text-purple-800 truncate">{exoneracion.nombreLey}</span>
                              </div>
                            )}
                          </>
                        )
                      }
                      return null
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

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
            {!formData.esAnulacionTotal && formData.facturaData?.items && (
              <div className="space-y-2">
                <Label>Selecciona los ítems a anular/devolver</Label>
                <div className="border rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                  {formData.facturaData.items.map((item) => (
                    <div key={item.numeroLinea} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={formData.itemsAfectados.includes(item.numeroLinea)}
                        onChange={(e) => {
                          const newItems = e.target.checked
                            ? [...formData.itemsAfectados, item.numeroLinea]
                            : formData.itemsAfectados.filter(num => num !== item.numeroLinea)
                          setFormData(prev => ({ ...prev, itemsAfectados: newItems }))
                        }}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.detalle}</div>
                        <div className="text-xs text-gray-600">
                          Cantidad: {item.cantidad} | Precio: {formData.facturaData?.resumen.codigoMoneda === 'USD' ? '$' : '₡'}{item.precioUnitario.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">
                        {formData.facturaData?.resumen.codigoMoneda === 'USD' ? '$' : '₡'}{item.montoTotal.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

