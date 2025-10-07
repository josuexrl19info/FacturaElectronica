import { Invoice } from '@/lib/invoice-types'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'
import { PDFGeneratorService } from '@/lib/services/pdf-generator'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export interface InvoiceEmailData {
  to: string
  subject: string
  message: string
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
                  identificacion: clientData.identification
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
   * Crea los datos del email para factura aprobada
   */
  private static async createApprovalEmailData(invoice: Invoice, recipientEmail: string): Promise<InvoiceEmailData> {
    const subject = `Factura Electrónica ${invoice.consecutivo} - Aprobada por Hacienda`
    
    const message = this.createApprovalEmailHTML(invoice)
    
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
    
    // PDF: Generar PDF de la factura
    try {
      console.log('📄 Generando PDF de la factura...')
      
      // Obtener datos de la empresa y cliente para el PDF
      let companyData = invoice.companyData || {}
      let clientData = invoice.cliente || {}
      
      // Si no tenemos datos completos, intentar obtenerlos desde Firestore
      if (!companyData || !clientData || Object.keys(companyData).length === 0) {
        console.log('🔍 Obteniendo datos completos para PDF...')
        
        // Obtener datos de la empresa
        if (invoice.companyId) {
          try {
            const companyRef = doc(db, 'companies', invoice.companyId)
            const companySnap = await getDoc(companyRef)
            if (companySnap.exists()) {
              companyData = companySnap.data()
              console.log('✅ Datos de empresa obtenidos para PDF')
            }
          } catch (error) {
            console.error('❌ Error obteniendo datos de empresa:', error)
          }
        }
        
        // Obtener datos del cliente
        if (invoice.clientId) {
          try {
            const clientRef = doc(db, 'clients', invoice.clientId)
            const clientSnap = await getDoc(clientRef)
            if (clientSnap.exists()) {
              clientData = clientSnap.data()
              console.log('✅ Datos de cliente obtenidos para PDF')
            }
          } catch (error) {
            console.error('❌ Error obteniendo datos de cliente:', error)
          }
        }
      }
      
      // Preparar datos para el PDF optimizado
      const pdfData = {
        invoice: invoice,
        company: companyData,
        client: clientData,
        haciendaResponse: invoice.haciendaSubmission
      }
      
      // Generar PDF en base64 usando el endpoint optimizado
      const response = await fetch('http://localhost:3000/api/generate-pdf-optimized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pdfData)
      })
      
      if (!response.ok) {
        throw new Error(`Error en endpoint de PDF optimizado: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error generando PDF optimizado')
      }
      
      pdf_base64 = result.pdf_base64
      console.log('✅ PDF generado en base64:', pdf_base64.length, 'caracteres')
      
    } catch (error) {
      console.error('❌ Error generando PDF:', error)
      console.warn('⚠️ Continuando sin PDF adjunto')
    }
    
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
      xml2_filename
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
      invoiceData: {
        id: invoice.id || '',
        consecutivo: invoice.consecutivo || '',
        cliente: invoice.cliente?.nombre || invoice.cliente?.razonSocial || 'Cliente',
        total: invoice.total || 0,
        fecha: invoice.fecha?.toLocaleDateString('es-ES') || new Date().toLocaleDateString('es-ES'),
        estado: 'Aceptado'
      }
    }
  }

  /**
   * Crea el HTML del email de aprobación
   */
  private static createApprovalEmailHTML(invoice: Invoice): string {
    const cliente = invoice.cliente?.nombre || invoice.cliente?.razonSocial || 'Cliente'
    const consecutivo = invoice.consecutivo || 'N/A'
    // Obtener la moneda de la factura
    const currency = invoice.currency || invoice.moneda || 'CRC'
    console.log('🔍 [EMAIL] Debug Moneda:', {
      'invoice.currency': invoice.currency,
      'invoice.moneda': invoice.moneda,
      'currency final': currency
    })
    const total = invoice.total?.toLocaleString('es-CR', { 
      style: 'currency', 
      currency: currency 
    }) || (currency === 'USD' ? '$0.00' : '₡0')
    const fecha = invoice.fecha?.toLocaleDateString('es-ES') || new Date().toLocaleDateString('es-ES')
    
    // Obtener el nombre comercial de la empresa
    const nombreEmpresa = invoice.emisor?.nombreComercial || 
                         invoice.emisor?.nombre || 
                         invoice.companyData?.nombreComercial ||
                         invoice.companyData?.name ||
                         'la empresa emisora' // Fallback por si no se encuentra

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Factura Electrónica Aprobada</title>
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
            background: linear-gradient(135deg, #10b981, #059669);
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
            <h1> Factura Electrónica Aprobada</h1>
            <div class="subtitle">Su factura ha sido aceptada por Hacienda</div>
          </div>

          <!-- Content -->
          <div class="content">
            <div class="greeting">
              ¡Hola <strong>${cliente}</strong>!
            </div>


            <p>
              Nos complace informarle que su <strong>Factura Electrónica ${consecutivo}</strong> 
              ha sido <strong>aceptada y aprobada</strong> por el Ministerio de Hacienda de Costa Rica.
            </p>

            <!-- Detalles de la Factura -->
            <div class="invoice-details">
              <h3>📋 Detalles de la Factura</h3>
              
              <div class="detail-row">
                <span class="detail-label">Número de Factura:</span>
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
              Si tiene alguna pregunta sobre esta factura, no dude en contactarnos. 
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
