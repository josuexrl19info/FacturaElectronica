/**
 * Servicio de correos electrónicos usando Microsoft Graph API
 * Compatible con Office 365 y Exchange Online
 */

import { 
  EmailMessage, 
  EmailAttachment, 
  EmailSendResult, 
  EmailConfig, 
  EmailTemplate,
  EmailValidationResult,
  BulkEmailOptions,
  InlineAttachment
} from './types'

export class EmailService {
  private config: EmailConfig
  private accessToken: string | null = null
  private tokenExpiresAt: Date | null = null

  constructor(config: EmailConfig) {
    this.config = config
  }

  /**
   * Obtiene un token de acceso válido para Microsoft Graph API
   * @returns Promise<string> - Token de acceso
   */
  private async getAccessToken(): Promise<string> {
    // Si tenemos un token válido, lo devolvemos
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.accessToken
    }

    try {
      const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`
      
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      })

      if (!response.ok) {
        throw new Error(`Error obteniendo token: ${response.status} ${response.statusText}`)
      }

      const tokenData = await response.json()
      
      this.accessToken = tokenData.access_token
      this.tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))
      
      return this.accessToken
    } catch (error) {
      console.error('Error obteniendo access token:', error)
      throw new Error('No se pudo obtener el token de acceso para Microsoft Graph')
    }
  }

  /**
   * Valida una dirección de correo electrónico
   * @param email - Dirección de correo a validar
   * @returns Promise<EmailValidationResult>
   */
  async validateEmail(email: string): Promise<EmailValidationResult> {
    try {
      // Validación básica de formato
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return {
          isValid: false,
          errorType: 'invalid-format',
          errorMessage: 'Formato de correo electrónico inválido'
        }
      }

      // Validación de dominio (opcional - puede ser costoso)
      // En producción, considera usar un servicio de validación externo
      
      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        errorType: 'domain-not-found',
        errorMessage: 'No se pudo validar la dirección de correo'
      }
    }
  }

  /**
   * Convierte un archivo a base64
   * @param file - Archivo a convertir
   * @returns Promise<string> - Contenido en base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * Prepara los adjuntos para Microsoft Graph API
   * @param attachments - Lista de adjuntos
   * @returns Array de adjuntos formateados
   */
  private prepareAttachments(attachments: EmailAttachment[] = []) {
    return attachments.map((attachment, index) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: attachment.name,
      contentType: attachment.contentType,
      contentBytes: attachment.contentBytes,
      size: attachment.size || Buffer.from(attachment.contentBytes, 'base64').length,
      isInline: attachment.isInline || false,
      contentId: attachment.isInline ? attachment.contentId : undefined,
      id: attachment.id || `attachment-${index}`
    }))
  }

  /**
   * Envía un correo electrónico usando Microsoft Graph API
   * @param message - Configuración del mensaje
   * @returns Promise<EmailSendResult>
   */
  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const accessToken = await this.getAccessToken()
      
      // Preparar el payload para Microsoft Graph
      const payload = {
        message: {
          subject: message.subject,
          body: {
            contentType: message.body.contentType,
            content: message.body.content
          },
          toRecipients: message.toRecipients.map(recipient => ({
            emailAddress: {
              address: recipient.emailAddress,
              name: recipient.name
            }
          })),
          ccRecipients: message.ccRecipients?.map(recipient => ({
            emailAddress: {
              address: recipient.emailAddress,
              name: recipient.name
            }
          })) || [],
          bccRecipients: message.bccRecipients?.map(recipient => ({
            emailAddress: {
              address: recipient.emailAddress,
              name: recipient.name
            }
          })) || [],
          attachments: this.prepareAttachments(message.attachments),
          importance: message.importance || 'Normal',
          isReadReceiptRequested: message.isReadReceiptRequested || false,
          isDeliveryReceiptRequested: message.isDeliveryReceiptRequested || false
        },
        saveToSentItems: true
      }

      // Enviar el correo
      const response = await fetch(
        `${this.config.graphEndpoint}/v1.0/users/${this.config.senderEmail}/sendMail`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error enviando correo: ${response.status} ${response.statusText} - ${errorText}`)
      }

      // Microsoft Graph no devuelve un ID específico en sendMail, pero podemos generar uno
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      return {
        messageId,
        success: true,
        statusCode: response.status,
        sentAt: new Date(),
        deliveredTo: message.toRecipients.map(r => r.emailAddress),
        failedTo: []
      }

    } catch (error) {
      console.error('Error enviando correo:', error)
      return {
        messageId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        statusCode: 500,
        sentAt: new Date(),
        deliveredTo: [],
        failedTo: message.toRecipients.map(r => r.emailAddress)
      }
    }
  }

  /**
   * Envía un correo usando un template
   * @param template - Template a usar
   * @param recipients - Lista de destinatarios
   * @param variables - Variables para reemplazar en el template
   * @param attachments - Adjuntos opcionales
   * @returns Promise<EmailSendResult>
   */
  async sendTemplateEmail(
    template: EmailTemplate,
    recipients: { emailAddress: string; name?: string }[],
    variables: Record<string, string> = {},
    attachments: EmailAttachment[] = []
  ): Promise<EmailSendResult> {
    try {
      // Reemplazar variables en el asunto y contenido
      let subject = template.subject
      let htmlContent = template.htmlContent

      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`
        subject = subject.replace(new RegExp(placeholder, 'g'), value)
        htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value)
      })

      const message: EmailMessage = {
        subject,
        body: {
          contentType: 'HTML',
          content: htmlContent
        },
        toRecipients: recipients,
        attachments,
        importance: 'Normal'
      }

      return await this.sendEmail(message)
    } catch (error) {
      return {
        messageId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Error procesando template',
        sentAt: new Date(),
        deliveredTo: [],
        failedTo: recipients.map(r => r.emailAddress)
      }
    }
  }

  /**
   * Envía correos en lote con control de velocidad
   * @param options - Opciones para envío masivo
   * @returns Promise<EmailSendResult[]>
   */
  async sendBulkEmails(options: BulkEmailOptions): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = []
    const delay = options.delayBetweenSends || 1000 // 1 segundo por defecto
    const rateLimit = options.rateLimit || 60 // 60 emails por minuto por defecto

    for (let i = 0; i < options.recipients.length; i++) {
      const recipient = options.recipients[i]
      
      try {
        // Control de velocidad
        if (i > 0 && i % rateLimit === 0) {
          await new Promise(resolve => setTimeout(resolve, 60000)) // Esperar 1 minuto
        }

        const result = await this.sendTemplateEmail(
          options.template,
          [recipient],
          options.variables,
          []
        )

        results.push(result)

        // Delay entre envíos
        if (i < options.recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }

      } catch (error) {
        results.push({
          messageId: '',
          success: false,
          error: error instanceof Error ? error.message : 'Error en envío masivo',
          sentAt: new Date(),
          deliveredTo: [],
          failedTo: [recipient.emailAddress]
        })
      }
    }

    return results
  }

  /**
   * Crea un adjunto inline para usar en HTML
   * @param file - Archivo a adjuntar
   * @param contentId - ID único para referenciar en HTML (ej: "logo")
   * @returns Promise<InlineAttachment>
   */
  async createInlineAttachment(file: File, contentId: string): Promise<InlineAttachment> {
    const base64 = await this.fileToBase64(file)
    
    return {
      name: file.name,
      contentType: file.type,
      contentBytes: base64,
      size: file.size,
      isInline: true,
      contentId: contentId,
      id: `inline-${contentId}-${Date.now()}`
    }
  }

  /**
   * Valida la configuración del servicio
   * @returns Promise<boolean>
   */
  async validateConfig(): Promise<boolean> {
    try {
      await this.getAccessToken()
      return true
    } catch (error) {
      console.error('Error validando configuración:', error)
      return false
    }
  }
}

// Instancia singleton del servicio
let emailServiceInstance: EmailService | null = null

/**
 * Obtiene la instancia del servicio de correos
 * @returns EmailService
 */
export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    const config: EmailConfig = {
      tenantId: process.env.OFFICE365_TENANT_ID || '',
      clientId: process.env.OFFICE365_CLIENT_ID || '',
      clientSecret: process.env.OFFICE365_CLIENT_SECRET || '',
      graphEndpoint: process.env.OFFICE365_GRAPH_ENDPOINT || 'https://graph.microsoft.com',
      senderEmail: process.env.OFFICE365_SENDER_EMAIL || '',
      senderName: process.env.OFFICE365_SENDER_NAME || 'InvoSell'
    }

    emailServiceInstance = new EmailService(config)
  }

  return emailServiceInstance
}
