import { Invoice } from '@/lib/invoice-types'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'
import { detectDocumentTypeLabel } from '@/lib/services/invoice-pdf-client'
import { enrichCompanyWithPersonalization, generateInvoicePdfBase64 } from '@/lib/services/invoice-pdf-server'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export interface InvoiceEmailData {
  to: string
  subject: string
  message: string
  /** Destinatarios en copia oculta */
  bcc?: string[]
  xml1_base64?: string  // XML firmado que se envió a Hacienda
  xml2_base64?: string  // XML de respuesta de Hacienda
  pdf_base64?: string   // PDF de la factura en base64
  pdf_filename?: string // Nombre del archivo PDF
  xml1_filename?: string // Nombre del archivo XML firmado
  xml2_filename?: string // Nombre del archivo XML respuesta
  invoiceData?: {
    id: string
    consecutivo: string
    cliente: string
    total: number
    fecha: string
    estado: string
  }
}

export interface InvoiceEmailResult {
  success: boolean
  messageId?: string
  error?: string
  deliveredTo?: string[]
  sentAt?: string
}

/**
 * Servicio para enviar emails de facturas aprobadas
 * Usa el endpoint de producción en api.innovasmartcr.com/email
 */
export class InvoiceEmailService {
  private static readonly EMAIL_ENDPOINT = 'https://api.innovasmartcr.com/email'
  private static readonly API_KEY = 'ae2cda74a93f34fc9093ea31358ba5b500d43a82ff1fc7a1bae1604e835105d2'

  /**
   * Envía email cuando una factura es aprobada por Hacienda
   */
  static async sendApprovalEmail(invoice: Invoice, clientEmail?: string): Promise<InvoiceEmailResult> {
    try {
      console.log('📧 Enviando email de factura aprobada:', invoice.consecutivo)
      
      // 🔍 DEBUG: Verificar campos de exoneración al inicio
      console.log('🔍 [EMAIL DEBUG] Invoice recibido:', {
        id: invoice.id,
        consecutivo: invoice.consecutivo,
        tieneExoneracion: (invoice as any).tieneExoneracion,
        exoneracion: (invoice as any).exoneracion ? 'presente' : 'ausente',
        cliente: invoice.cliente ? 'presente' : 'ausente',
        clienteKeys: invoice.cliente ? Object.keys(invoice.cliente) : [],
        allInvoiceKeys: Object.keys(invoice)
      })
      
      console.log('📝 Debug invoice notes:', {
        'invoice.notes': invoice.notes,
        'invoice.notas': (invoice as any).notas
      })
      
      // Debug: Mostrar estructura de la factura
      console.log('🔍 Estructura de la factura recibida:', JSON.stringify({
        consecutivo: invoice.consecutivo,
        clientId: invoice.clientId,
        cliente: invoice.cliente,
        hasClienteEmail: !!invoice.cliente?.email,
        hasClienteCorreoElectronico: !!invoice.cliente?.correoElectronico,
        hasClientEmail: !!invoice.clientEmail,
        hasCustomerEmail: !!invoice.customerEmail,
        hasEmail: !!invoice.email
      }, null, 2))
      
      let recipientEmail = clientEmail
      
      // Si no se proporciona email, intentar obtenerlo de la factura o del cliente
      if (!recipientEmail) {
        // Primero intentar desde la factura directamente
        recipientEmail = invoice.cliente?.email || 
                        invoice.cliente?.correoElectronico ||
                        invoice.clientEmail ||
                        invoice.customerEmail ||
                        invoice.email
        
        // Si no está en la factura y tenemos clientId, obtenerlo desde Firestore
        if (!recipientEmail && invoice.clientId) {
          console.log('🔍 Obteniendo datos del cliente desde Firestore:', invoice.clientId)
          
          try {
            const clientRef = doc(db, 'clients', invoice.clientId)
            const clientSnap = await getDoc(clientRef)
            
            if (clientSnap.exists()) {
              const clientData = clientSnap.data()
              recipientEmail = clientData.email
              console.log('✅ Email del cliente obtenido desde Firestore:', recipientEmail)
              
              // Actualizar la factura con los datos del cliente para uso posterior
              if (!invoice.cliente) {
                invoice.cliente = {
                  nombre: clientData.name,
                  email: clientData.email,
                  identificacion: clientData.identification,
                  telefono: clientData.phone || clientData.telefono,  // ✅ Agregar teléfono
                  economicActivity: clientData.economicActivity || clientData.actividadEconomica  // ✅ Agregar actividad económica
                }
              }
            } else {
              console.error('❌ Cliente no encontrado en Firestore:', invoice.clientId)
            }
          } catch (clientError) {
            console.error('❌ Error obteniendo cliente desde Firestore:', clientError)
          }
        }
      }
      
      if (!recipientEmail) {
        console.error('❌ No se encontró email del cliente. Campos disponibles:', Object.keys(invoice))
        return {
          success: false,
          error: 'No se encontró email del cliente en la factura'
        }
      }

      // Crear contenido del email
      const emailData = await this.createApprovalEmailData(invoice, recipientEmail)
      
      // Enviar email
      const result = await this.sendEmail(emailData)
      
      if (result.success) {
        console.log('✅ Email de factura aprobada enviado exitosamente')
        console.log('📧 Destinatario:', recipientEmail)
        console.log('📧 Message ID:', result.messageId)
      } else {
        console.error('❌ Error enviando email de factura aprobada:', result.error)
      }
      
      return result
      
    } catch (error) {
      console.error('❌ Error en sendApprovalEmail:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * Crea los datos del email para factura/NC aprobada
   */
  private static async createApprovalEmailData(invoice: Invoice, recipientEmail: string): Promise<InvoiceEmailData> {
    // Detectar tipo de documento
    const isNotaCredito = (invoice as any).tipo === 'nota-credito' || 
                          (invoice as any).tipoNotaCredito ||
                          (invoice as any).referenciaFactura
    
    const isTiquete = (invoice as any).documentType === 'tiquetes' ||
                      (invoice as any).tipo === 'tiquete' ||
                      (invoice.consecutivo?.startsWith('TE-') || false)
    
    let tipoDocumento = 'Factura Electrónica'
    if (isNotaCredito) {
      tipoDocumento = 'Nota de Crédito Electrónica'
    } else if (isTiquete) {
      tipoDocumento = 'Tiquete Electrónico'
    }
    
    const subject = `${tipoDocumento} ${invoice.consecutivo} - Aprobada por Hacienda`
    
    const message = this.createApprovalEmailHTML(invoice, isNotaCredito, isTiquete)
    
    // Preparar XMLs en base64
    let xml1_base64: string | undefined
    let xml2_base64: string | undefined
    let pdf_base64: string | undefined
    
    // XML1: XML firmado que se envió a Hacienda
    if (invoice.xmlSigned) {
      try {
        xml1_base64 = Buffer.from(invoice.xmlSigned, 'utf8').toString('base64')
        console.log('📄 XML firmado convertido a base64:', xml1_base64.length, 'caracteres')
      } catch (error) {
        console.error('❌ Error convirtiendo XML firmado a base64:', error)
      }
    } else {
      console.warn('⚠️ No se encontró XML firmado en la factura')
    }
    
    // XML2: XML de respuesta de Hacienda
    if (invoice.haciendaSubmission && invoice.haciendaSubmission['respuesta-xml']) {
      try {
        // El XML de respuesta ya viene en base64 desde Hacienda
        xml2_base64 = invoice.haciendaSubmission['respuesta-xml']
        console.log('📄 XML de respuesta de Hacienda obtenido:', xml2_base64.length, 'caracteres')
      } catch (error) {
        console.error('❌ Error obteniendo XML de respuesta de Hacienda:', error)
      }
    } else {
      console.warn('⚠️ No se encontró XML de respuesta de Hacienda')
    }
    
    // PDF: Generar con plantilla personalizada de la empresa (Firebase)
    let companyData: Record<string, unknown> | undefined = invoice.companyData as Record<string, unknown> | undefined
    let clientData: Record<string, unknown> | undefined = (invoice.cliente || undefined) as Record<string, unknown> | undefined
    try {
      console.log('📄 Generando PDF con plantilla de personalización...')

      const companyId = invoice.companyId || (invoice as Record<string, unknown>).companyId
      if (companyId) {
        try {
          const companySnap = await getDoc(doc(db, 'companies', String(companyId)))
          if (companySnap.exists()) {
            companyData = enrichCompanyWithPersonalization(companySnap.data() as Record<string, unknown>)
            console.log('✅ Empresa cargada con personalización PDF desde Firebase')
          }
        } catch (error) {
          console.error('❌ Error obteniendo empresa para PDF:', error)
        }
      } else if (companyData) {
        companyData = enrichCompanyWithPersonalization(companyData)
      }

      if ((!clientData || Object.keys(clientData).length === 0) && invoice.clientId) {
        try {
          const clientSnap = await getDoc(doc(db, 'clients', invoice.clientId))
          if (clientSnap.exists()) {
            clientData = clientSnap.data() as Record<string, unknown>
            console.log('✅ Cliente cargado para PDF:', clientData?.name || clientData?.nombre)
          }
        } catch (error) {
          console.error('❌ Error obteniendo cliente para PDF:', error)
        }
      }

      const invoiceRecord = {
        ...(invoice as unknown as Record<string, unknown>),
        documentType:
          (invoice as Record<string, unknown>).documentType ||
          ((isTiquete ? 'tiquetes' : 'facturas') as string),
      }

      const { base64, blockCount } = await generateInvoicePdfBase64(invoiceRecord, {
        company: companyData,
        client: clientData,
      })

      pdf_base64 = base64
      console.log('✅ PDF generado con plantilla personalizada:', {
        blockCount,
        documentType: detectDocumentTypeLabel(invoiceRecord),
        base64Length: pdf_base64.length,
      })
      
      // Validar formato del PDF antes de usarlo
      if (pdf_base64) {
        try {
          // Validar que el base64 no esté vacío
          if (!pdf_base64 || pdf_base64.length === 0) {
            throw new Error('El PDF en base64 está vacío')
          }
          
          // Validar formato base64
          const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
          if (!base64Regex.test(pdf_base64)) {
            throw new Error('El PDF en base64 tiene formato inválido')
          }
          
          // Decodificar y validar que sea un PDF válido
          const decodedBuffer = Buffer.from(pdf_base64, 'base64')
          const pdfHeader = decodedBuffer.slice(0, 4).toString('utf8')
          
          if (pdfHeader !== '%PDF') {
            console.error('❌ [EMAIL] Error: El PDF decodificado no tiene el formato correcto')
            console.error('❌ [EMAIL] Header encontrado:', pdfHeader)
            throw new Error('El PDF decodificado no tiene el formato correcto (debe empezar con %PDF)')
          }
          
          console.log('✅ [EMAIL] Validación de PDF: Formato correcto (%PDF)')
          console.log('✅ [EMAIL] Tamaño del PDF decodificado:', decodedBuffer.length, 'bytes')
          
        } catch (validationError) {
          console.error('❌ [EMAIL] Error validando formato del PDF:', validationError)
          console.warn('⚠️ [EMAIL] Continuando sin PDF adjunto debido a error de validación')
          pdf_base64 = undefined
        }
      }
      
    } catch (error) {
      console.error('❌ Error generando PDF:', error)
      console.warn('⚠️ Continuando sin PDF adjunto')
      pdf_base64 = undefined
    }
    
    // Determinar BCC (correo de la empresa u otros)
    const bccRecipients: string[] = []
    const companyEmail = (companyData as any)?.email || (companyData as any)?.correo || (companyData as any)?.emailAddress || invoice.emisor?.correoElectronico
    
    // Solo agregar al BCC si es diferente al destinatario principal para evitar duplicados
    if (companyEmail && typeof companyEmail === 'string') {
      const normalizedCompanyEmail = companyEmail.toLowerCase().trim()
      const normalizedRecipientEmail = recipientEmail.toLowerCase().trim()
      
      if (normalizedCompanyEmail !== normalizedRecipientEmail) {
        bccRecipients.push(companyEmail)
        console.log('📧 Agregando email de empresa al BCC:', companyEmail)
      } else {
        console.log('⚠️ Email de empresa es el mismo que el destinatario, omitiendo BCC para evitar duplicado:', companyEmail)
      }
    }
    
    // Función para eliminar duplicados de la lista BCC
    const uniqueBccRecipients = bccRecipients.filter((email, index, array) => 
      array.findIndex(e => e.toLowerCase().trim() === email.toLowerCase().trim()) === index
    )
    
    console.log('📧 BCC final (sin duplicados):', uniqueBccRecipients)

    // Generar nombres de archivo basados en la clave de Hacienda
    let pdf_filename: string | undefined
    let xml1_filename: string | undefined
    let xml2_filename: string | undefined
    
    // Obtener la clave de Hacienda para los nombres de archivo
    const haciendaKey = invoice.haciendaSubmission?.clave || invoice.consecutivo || 'documento'
    
    if (xml1_base64) {
      xml1_filename = `${haciendaKey}.xml`
      console.log('📄 Nombre XML firmado:', xml1_filename)
    }
    
    if (xml2_base64) {
      xml2_filename = `${haciendaKey}_respuesta.xml`
      console.log('📄 Nombre XML respuesta:', xml2_filename)
    }
    
    // El PDF siempre se incluye (aunque no tengamos el contenido base64)
    pdf_filename = `${haciendaKey}.pdf`
    console.log('📄 Nombre PDF:', pdf_filename)
    
    console.log('📧 Preparando email con adjuntos:', {
      hasXml1: !!xml1_base64,
      hasXml2: !!xml2_base64,
      hasPdf: !!pdf_base64,
      xml1Size: xml1_base64?.length || 0,
      xml2Size: xml2_base64?.length || 0,
      pdfSize: pdf_base64?.length || 0,
      pdf_filename,
      xml1_filename,
      xml2_filename,
      bcc: uniqueBccRecipients  // ✅ Agregar BCC al log
    })
    
    return {
      to: recipientEmail,
      subject,
      message,
      xml1_base64,
      xml2_base64,
      pdf_base64,
      pdf_filename,
      xml1_filename,
      xml2_filename,
      bcc: uniqueBccRecipients,  // ✅ Agregar BCC al objeto de retorno
      invoiceData: {
        id: invoice.id || '',
        consecutivo: invoice.consecutivo || '',
        cliente: invoice.cliente?.nombre || invoice.cliente?.razonSocial || invoice.cliente?.name || 'Cliente',
        total: invoice.total || 0,
        fecha: (() => {
          try {
            if (invoice.fecha) {
              // Manejar diferentes tipos de fecha: Date, string, Timestamp de Firestore
              let dateObj: Date
              if (invoice.fecha instanceof Date) {
                dateObj = invoice.fecha
              } else if (typeof invoice.fecha === 'string') {
                dateObj = new Date(invoice.fecha)
              } else if (invoice.fecha && typeof invoice.fecha === 'object' && 'toDate' in invoice.fecha) {
                // Timestamp de Firestore
                dateObj = (invoice.fecha as any).toDate()
              } else if (invoice.fecha && typeof invoice.fecha === 'object' && 'seconds' in invoice.fecha) {
                // Timestamp de Firestore (formato alternativo)
                dateObj = new Date((invoice.fecha as any).seconds * 1000)
              } else {
                dateObj = new Date()
              }
              
              if (!isNaN(dateObj.getTime())) {
                return dateObj.toLocaleDateString('es-ES')
              }
            }
            // Si no hay fecha válida, usar fechaEmision o fecha actual
            if (invoice.fechaEmision) {
              const dateObj = new Date(invoice.fechaEmision)
              if (!isNaN(dateObj.getTime())) {
                return dateObj.toLocaleDateString('es-ES')
              }
            }
            return new Date().toLocaleDateString('es-ES')
          } catch (error) {
            console.error('Error formateando fecha en invoiceData:', error)
            return new Date().toLocaleDateString('es-ES')
          }
        })(),
        estado: 'Aceptado'
      }
    }
  }

  /**
   * Crea el HTML del email de aprobación
   */
  private static createApprovalEmailHTML(invoice: Invoice, isNotaCredito: boolean = false, isTiquete: boolean = false): string {
    // Mejorar la obtención del nombre del cliente buscando en múltiples campos
    const cliente = invoice.cliente?.nombre || 
                   invoice.cliente?.razonSocial || 
                   invoice.cliente?.name ||
                   invoice.cliente?.nombreCompleto ||
                   invoice.cliente?.nombreCliente ||
                   (invoice as any).clientData?.name ||
                   (invoice as any).clientData?.nombre ||
                   'Cliente'
    
    // Debug: Verificar nombre del cliente
    console.log('🔍 [EMAIL] Debug Nombre Cliente:', {
      'invoice.cliente?.nombre': invoice.cliente?.nombre,
      'invoice.cliente?.razonSocial': invoice.cliente?.razonSocial,
      'invoice.cliente?.name': invoice.cliente?.name,
      'invoice.clienteKeys': invoice.cliente ? Object.keys(invoice.cliente) : [],
      'clientData present': !!(invoice as any).clientData,
      'cliente final': cliente
    })
    
    const consecutivo = invoice.consecutivo || 'N/A'
    // Obtener la moneda de la factura
    const currency = invoice.currency || invoice.moneda || 'CRC'
    console.log('🔍 [EMAIL] Debug Moneda:', {
      'invoice.currency': invoice.currency,
      'invoice.moneda': invoice.moneda,
      'currency final': currency
    })
    // Debug: Verificar estructura de datos del cliente para exoneración
    console.log('🔍 [EMAIL] Debug Cliente Exento:', {
      'invoice.tieneExoneracion': invoice.tieneExoneracion,
      'invoice.exoneracion': invoice.exoneracion ? 'presente' : 'ausente',
      'invoice.cliente': invoice.cliente ? 'presente' : 'ausente',
      'invoice.cliente?.tieneExoneracion': invoice.cliente?.tieneExoneracion,
      'invoice.cliente?.hasExemption': invoice.cliente?.hasExemption,
      'invoice.clienteKeys': invoice.cliente ? Object.keys(invoice.cliente) : [],
      'invoice.clientData': (invoice as any).clientData ? 'presente' : 'ausente',
      'invoice.clientData?.tieneExoneracion': (invoice as any).clientData?.tieneExoneracion,
      'invoice.clientData?.hasExemption': (invoice as any).clientData?.hasExemption,
      'invoice.subtotal': invoice.subtotal,
      'invoice.total': invoice.total
    })
    
    // Detectar si el cliente está exento para ajustar el total mostrado
    // Lógica más estricta para evitar falsos positivos
    const isClientExempt = Boolean(
      invoice.tieneExoneracion === true ||
      (invoice.cliente && invoice.cliente.tieneExoneracion === true) ||
      (invoice as any).clientData && (invoice as any).clientData.tieneExoneracion === true
    )
    
    console.log('🔍 [EMAIL] Cliente exento detectado:', isClientExempt)
    console.log('🔍 [EMAIL] Debug Exoneración Detallado:', {
      'invoice.tieneExoneracion': invoice.tieneExoneracion,
      'invoice.cliente?.tieneExoneracion': invoice.cliente?.tieneExoneracion,
      'invoice.clientData?.tieneExoneracion': (invoice as any).clientData?.tieneExoneracion,
      'isClientExempt': isClientExempt
    })
    
    // Si el cliente está exento, mostrar solo el subtotal (sin impuestos)
    const totalAmount = isClientExempt ? (invoice.subtotal || 0) : (invoice.total || 0)
    console.log('🔍 [EMAIL] Total amount calculado:', {
      isClientExempt,
      subtotal: invoice.subtotal,
      total: invoice.total,
      finalAmount: totalAmount
    })
    const total = totalAmount?.toLocaleString('es-CR', { 
      style: 'currency', 
      currency: currency 
    }) || (currency === 'USD' ? '$0.00' : '₡0')
    // Formatear fecha de manera segura
    let fecha = 'N/A'
    try {
      if (invoice.fecha) {
        const dateObj = invoice.fecha instanceof Date ? invoice.fecha : new Date(invoice.fecha)
        if (!isNaN(dateObj.getTime())) {
          fecha = dateObj.toLocaleDateString('es-ES')
        }
      }
      if (fecha === 'N/A') {
        fecha = new Date().toLocaleDateString('es-ES')
      }
    } catch (error) {
      console.error('Error formateando fecha en email:', error)
      fecha = new Date().toLocaleDateString('es-ES')
    }
    
    // Obtener el nombre comercial de la empresa
    const nombreEmpresa = invoice.emisor?.nombreComercial || 
                         invoice.emisor?.nombre || 
                         invoice.companyData?.nombreComercial ||
                         invoice.companyData?.name ||
                         'la empresa emisora' // Fallback por si no se encuentra
    
    // Texto dinámico según el tipo de documento
    let tipoDocumento = 'Factura Electrónica'
    let colorPrincipal = '#3B82F6' // Azul por defecto
    
    if (isNotaCredito) {
      tipoDocumento = 'Nota de Crédito Electrónica'
      colorPrincipal = '#9333EA' // Morado para NC
    } else if (isTiquete) {
      tipoDocumento = 'Tiquete Electrónico'
      colorPrincipal = '#10b981' // Verde para Tiquete
    }

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${tipoDocumento} Aprobada</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, ${colorPrincipal}, ${isNotaCredito ? '#7C3AED' : '#2563EB'});
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .header .subtitle {
            margin-top: 10px;
            opacity: 0.9;
            font-size: 16px;
          }
          .content {
            padding: 30px;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #1f2937;
          }
          .status-badge {
            display: inline-block;
            background-color: #10b981;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 20px;
          }
          .invoice-details {
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #10b981;
          }
          .invoice-details h3 {
            margin-top: 0;
            color: #1f2937;
            font-size: 18px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
          }
          .detail-label {
            font-weight: 600;
            color: #6b7280;
          }
          .detail-value {
            color: #1f2937;
            font-weight: 500;
          }
          .total-row {
            border-top: 2px solid #e5e7eb;
            padding-top: 15px;
            margin-top: 15px;
            font-size: 18px;
            font-weight: 700;
          }
          .actions {
            margin: 30px 0;
            text-align: center;
          }
          .btn {
            display: inline-block;
            background-color: #10b981;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 0 10px;
            transition: background-color 0.3s;
          }
          .btn:hover {
            background-color: #059669;
          }
          .info-box {
            background-color: #dbeafe;
            border: 1px solid #93c5fd;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
          }
          .info-box h4 {
            margin-top: 0;
            color: #1e40af;
            font-size: 16px;
          }
          .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
          .footer a {
            color: #10b981;
            text-decoration: none;
          }
          @media (max-width: 600px) {
            .container {
              margin: 10px;
              border-radius: 0;
            }
            .header {
              padding: 20px;
            }
            .content {
              padding: 20px;
            }
            .detail-row {
              flex-direction: column;
            }
            .detail-label {
              margin-bottom: 5px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>${tipoDocumento} Aprobada</h1>
            <div class="subtitle">Su ${isNotaCredito ? 'nota de crédito' : isTiquete ? 'tiquete' : 'factura'} ha sido aceptada por Hacienda</div>
          </div>

          <!-- Content -->
          <div class="content">
            <div class="greeting">
              ¡Hola <strong>${cliente}</strong>!
            </div>


            <p>
              Nos complace informarle que su <strong>${tipoDocumento} ${consecutivo}</strong> 
              ha sido <strong>aceptada y aprobada</strong> por el Ministerio de Hacienda de Costa Rica.
            </p>

            <!-- Detalles del Documento -->
            <div class="invoice-details">
              <h3>📋 Detalles ${isNotaCredito ? 'de la Nota de Crédito' : isTiquete ? 'del Tiquete' : 'de la Factura'}</h3>
              
              <div class="detail-row">
                <span class="detail-label">Número ${isNotaCredito ? 'de NC' : isTiquete ? 'de Tiquete' : 'de Factura'}:</span>
                <span class="detail-value">${consecutivo}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Cliente:</span>
                <span class="detail-value">${cliente}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Fecha de Emisión:</span>
                <span class="detail-value">${fecha}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Estado Hacienda:</span>
                <span class="detail-value" style="color: #10b981; font-weight: 600;">✅ Aceptado</span>
              </div>
              
              <div class="detail-row total-row">
                <span class="detail-label">Total:</span>
                <span class="detail-value" style="color: #10b981;">${total}</span>
              </div>
            </div>

            <!-- Documentos Adjuntos -->
            <div class="info-box" style="background-color: #f0fdf4; border: 1px solid #bbf7d0;">
              <h4 style="color: #166534;">📎 Documentos Adjuntos</h4>
              <p style="margin: 15px 0; font-size: 15px; line-height: 1.6; color: #166534;">
                Adjunto a este correo encontrará un <strong>Comprobante Electrónico en formato XML</strong> y su correspondiente 
                <strong>representación en formato PDF</strong>, por concepto de facturación de <strong>${nombreEmpresa}</strong>. 
                Lo anterior con base en las especificaciones del <strong>Ministerio de Hacienda</strong>.
              </p>
            </div>



            <p>
              Si tiene alguna pregunta sobre este ${isNotaCredito ? 'documento' : isTiquete ? 'tiquete' : 'factura'}, no dude en contactarnos. 
              Estamos aquí para ayudarle.
            </p>

            <p>
              <strong>¡Gracias por confiar en nosotros!</strong>
            </p>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>
              Este correo fue enviado automáticamente por nuestro sistema de facturación electrónica.<br>
              <a href="#">InvoSell Costa Rica</a> | 
              <a href="#">Soporte Técnico</a>
            </p>
            <p style="margin-top: 15px; font-size: 12px;">
              © 2025 InvoSell. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Envía el email usando el endpoint específico
   */
  private static async sendEmail(emailData: InvoiceEmailData): Promise<InvoiceEmailResult> {
    try {
      console.log('📤 Enviando email a endpoint:', this.EMAIL_ENDPOINT)
      console.log('📧 Destinatario:', emailData.to)
      console.log('📧 Asunto:', emailData.subject)
      
      // Calcular y mostrar el tamaño de los datos
      const jsonString = JSON.stringify(emailData)
      const dataSize = Buffer.byteLength(jsonString, 'utf8')
      const dataSizeMB = (dataSize / (1024 * 1024)).toFixed(2)
      
      console.log('📊 Tamaño de datos a enviar:', `${dataSizeMB} MB (${dataSize} bytes)`)
      
      // Mostrar tamaños de cada componente
      if (emailData.pdf_base64) {
        const pdfSize = Buffer.byteLength(emailData.pdf_base64, 'utf8')
        const pdfSizeMB = (pdfSize / (1024 * 1024)).toFixed(2)
        console.log('📄 Tamaño del PDF:', `${pdfSizeMB} MB (${pdfSize} bytes)`)
      }
      
      if (emailData.xml1_base64) {
        const xml1Size = Buffer.byteLength(emailData.xml1_base64, 'utf8')
        console.log('📄 Tamaño del XML1:', `${xml1Size} bytes`)
      }
      
      if (emailData.xml2_base64) {
        const xml2Size = Buffer.byteLength(emailData.xml2_base64, 'utf8')
        console.log('📄 Tamaño del XML2:', `${xml2Size} bytes`)
      }
      
      // Verificar si excede límites razonables y ajustar si es necesario
      const maxSize = 7 * 1024 * 1024 // 7 MB (por debajo del límite de 8 MB de PHP)
      
      if (dataSize > maxSize) {
        console.warn('⚠️ ADVERTENCIA: Datos exceden límite seguro para envío')
        console.warn(`📊 Tamaño actual: ${dataSizeMB} MB, límite seguro: ${(maxSize / (1024 * 1024)).toFixed(2)} MB`)
        
        // Si el PDF es muy grande, enviarlo sin PDF y agregar nota
        if (emailData.pdf_base64 && Buffer.byteLength(emailData.pdf_base64, 'utf8') > 5 * 1024 * 1024) {
          console.log('📄 PDF muy grande, enviando email sin PDF adjunto')
          
          // Crear versión sin PDF
          const emailDataWithoutPDF = {
            ...emailData,
            pdf_base64: undefined,
            pdf_filename: undefined,
            message: emailData.message + `
              <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <h4 style="color: #92400e;">📎 Nota sobre PDF</h4>
                <p style="color: #92400e;">El PDF de esta factura es demasiado grande para enviar por email. Puede descargarlo desde la aplicación web.</p>
              </div>
            `
          }
          
          // Recalcular tamaño sin PDF
          const newJsonString = JSON.stringify(emailDataWithoutPDF)
          const newDataSize = Buffer.byteLength(newJsonString, 'utf8')
          const newDataSizeMB = (newDataSize / (1024 * 1024)).toFixed(2)
          
          console.log('📊 Nuevo tamaño sin PDF:', `${newDataSizeMB} MB (${newDataSize} bytes)`)
          
          if (newDataSize <= maxSize) {
            console.log('✅ Enviando email sin PDF (dentro del límite)')
            return this.sendEmailRequest(emailDataWithoutPDF)
          }
        }
        
        // Si aún es muy grande, intentar reducir el mensaje HTML
        if (dataSize > maxSize) {
          console.log('📧 Reduciendo tamaño del mensaje HTML')
          
          const emailDataReduced = {
            ...emailData,
            message: emailData.message.replace(/<div[^>]*style="[^"]*"[^>]*>/g, '<div>')
                                     .replace(/\s+/g, ' ')
                                     .trim()
          }
          
          const reducedJsonString = JSON.stringify(emailDataReduced)
          const reducedDataSize = Buffer.byteLength(reducedJsonString, 'utf8')
          const reducedDataSizeMB = (reducedDataSize / (1024 * 1024)).toFixed(2)
          
          console.log('📊 Tamaño reducido:', `${reducedDataSizeMB} MB (${reducedDataSize} bytes)`)
          
          if (reducedDataSize <= maxSize) {
            console.log('✅ Enviando email con mensaje reducido')
            return this.sendEmailRequest(emailDataReduced)
          }
        }
        
        // Si todo lo anterior falla, enviar solo los datos esenciales
        console.log('🚨 Enviando email mínimo (sin archivos adjuntos)')
        
        const minimalEmailData = {
          to: emailData.to,
          subject: emailData.subject,
          message: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #14b8a6;">¡Su Factura ha sido Aprobada!</h2>
              <p>Estimado cliente,</p>
              <p>Nos complace informarle que su factura ha sido aprobada por el Ministerio de Hacienda.</p>
              
              <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <h4 style="color: #92400e;">📎 Documentos</h4>
                <p style="color: #92400e;">Los documentos de esta factura son demasiado grandes para enviar por email. Puede descargarlos desde la aplicación web.</p>
              </div>
              
              <p>Gracias por su confianza.</p>
              <p><strong>InnovaSell Costa Rica</strong></p>
            </div>
          `
        }
        
        return this.sendEmailRequest(minimalEmailData)
      }
      
      return this.sendEmailRequest(emailData)
    } catch (error) {
      console.error('❌ Error enviando email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido enviando email'
      }
    }
  }

  /**
   * Envía la petición HTTP al endpoint de email
   */
  private static async sendEmailRequest(emailData: InvoiceEmailData): Promise<InvoiceEmailResult> {
    try {
      const response = await fetch(this.EMAIL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.API_KEY
        },
        body: JSON.stringify(emailData)
      })

      // Obtener el texto de la respuesta primero
      const responseText = await response.text()
      
      console.log('📊 Status de respuesta:', response.status)
      console.log('📊 Headers de respuesta:', Object.fromEntries(response.headers.entries()))
      console.log('📊 Contenido de respuesta:', responseText.substring(0, 200) + '...')

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`)
      }

      // Verificar el Content-Type
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('⚠️ Respuesta no es JSON, Content-Type:', contentType)
        throw new Error(`Respuesta no es JSON. Content-Type: ${contentType}. Respuesta: ${responseText.substring(0, 200)}`)
      }

      // Intentar parsear JSON
      let result
      try {
        result = JSON.parse(responseText)
      } catch (jsonError) {
        console.error('❌ Error parseando JSON:', jsonError)
        console.error('❌ Respuesta recibida:', responseText)
        throw new Error(`Error parseando JSON: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}. Respuesta: ${responseText.substring(0, 200)}`)
      }
      
      console.log('✅ Respuesta del endpoint de email:', result)

      return {
        success: true,
        messageId: result.message_id || result.messageId || result.id || `email-${Date.now()}`,
        deliveredTo: [emailData.to],
        sentAt: new Date().toISOString()
      }

    } catch (error) {
      console.error('❌ Error enviando email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido enviando email'
      }
    }
  }

  /**
   * Verifica si el servicio de email está disponible
   */
  static async isEmailServiceAvailable(): Promise<boolean> {
    try {
      // Hacer un POST simple para verificar disponibilidad
      const response = await fetch(this.EMAIL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.API_KEY
        },
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'Health Check',
          message: '<p>Health check</p>'
        })
      })
      
      // Si responde con cualquier status (incluso error), significa que está disponible
      return response.status !== undefined
    } catch (error) {
      console.warn('⚠️ Servicio de email no disponible:', error)
      return false
    }
  }

  /**
   * Envía email de prueba - DESACTIVADO PARA EVITAR GASTOS
   */
  static async sendTestEmail(testEmail: string): Promise<InvoiceEmailResult> {
    console.log('⚠️ [EMAIL] Emails de prueba desactivados para evitar gastos innecesarios')
    
    // Retornar éxito simulado sin enviar email real
    return {
      success: true,
      messageId: `test-email-disabled-${Date.now()}`,
      deliveredTo: [testEmail],
      sentAt: new Date().toISOString()
    }
  }
}
