import { Invoice } from '@/lib/invoice-types'

export interface InvoiceEmailData {
  to: string
  subject: string
  message: string
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
 * Usa el endpoint específico en localhost:8000/email
 */
export class InvoiceEmailService {
  private static readonly EMAIL_ENDPOINT = 'http://localhost:8000/email'
  private static readonly API_KEY = 'tu-api-key-super-secreta-123'

  /**
   * Envía email cuando una factura es aprobada por Hacienda
   */
  static async sendApprovalEmail(invoice: Invoice, clientEmail?: string): Promise<InvoiceEmailResult> {
    try {
      console.log('📧 Enviando email de factura aprobada:', invoice.consecutivo)
      
      // Determinar email del cliente
      const recipientEmail = clientEmail || invoice.cliente?.email || invoice.cliente?.correoElectronico
      
      if (!recipientEmail) {
        return {
          success: false,
          error: 'No se encontró email del cliente en la factura'
        }
      }

      // Crear contenido del email
      const emailData = this.createApprovalEmailData(invoice, recipientEmail)
      
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
  private static createApprovalEmailData(invoice: Invoice, recipientEmail: string): InvoiceEmailData {
    const subject = `✅ Factura Electrónica ${invoice.consecutivo} - Aprobada por Hacienda`
    
    const message = this.createApprovalEmailHTML(invoice)
    
    return {
      to: recipientEmail,
      subject,
      message,
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
    const total = invoice.total?.toLocaleString('es-CR', { 
      style: 'currency', 
      currency: 'CRC' 
    }) || '₡0'
    const fecha = invoice.fecha?.toLocaleDateString('es-ES') || new Date().toLocaleDateString('es-ES')

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
            <h1>✅ Factura Electrónica Aprobada</h1>
            <div class="subtitle">Su factura ha sido aceptada por Hacienda</div>
          </div>

          <!-- Content -->
          <div class="content">
            <div class="greeting">
              ¡Hola <strong>${cliente}</strong>!
            </div>

            <div class="status-badge">
              🎉 APROBADA POR HACIENDA
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

            <!-- Información Importante -->
            <div class="info-box">
              <h4>📌 Información Importante</h4>
              <ul>
                <li><strong>Válida Fiscalmente:</strong> Esta factura es completamente válida para efectos fiscales</li>
                <li><strong>Registro Hacienda:</strong> El documento está registrado en los sistemas oficiales</li>
                <li><strong>Descarga:</strong> Puede descargar su factura desde su cuenta de cliente</li>
                <li><strong>Archivo:</strong> Conserve este correo como comprobante de entrega</li>
              </ul>
            </div>

            <!-- Acciones -->
            <div class="actions">
              <a href="#" class="btn">📄 Ver Factura</a>
              <a href="#" class="btn">💾 Descargar PDF</a>
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
              <a href="#">InnoSell Costa Rica</a> | 
              <a href="#">Soporte Técnico</a>
            </p>
            <p style="margin-top: 15px; font-size: 12px;">
              © ${new Date().getFullYear()} InnoSell. Todos los derechos reservados.
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

      const response = await fetch(this.EMAIL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.API_KEY
        },
        body: JSON.stringify(emailData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      
      console.log('✅ Respuesta del endpoint de email:', result)

      return {
        success: true,
        messageId: result.messageId || result.id || `email-${Date.now()}`,
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
   * Envía email de prueba
   */
  static async sendTestEmail(testEmail: string): Promise<InvoiceEmailResult> {
    const testInvoice: Partial<Invoice> = {
      consecutivo: 'TEST-001',
      cliente: {
        nombre: 'Cliente de Prueba',
        email: testEmail
      },
      total: 10000,
      fecha: new Date(),
      status: 'Aceptado'
    }

    return this.sendApprovalEmail(testInvoice as Invoice, testEmail)
  }
}
