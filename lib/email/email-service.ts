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
   * Detecta si un error es recuperable (temporal)
   * @param error - Error a analizar
   * @returns boolean - Si el error es recuperable
   */
  private isRecoverableError(error: string): boolean {
    const recoverablePatterns = [
      '5.7.708', // Gmail IP blocking
      '5.7.1',   // General temporary failure
      '4.2.2',   // Mailbox full
      '4.3.1',   // Insufficient system storage
      '4.4.1',   // Connection timeout
      '4.4.2',   // Connection dropped
      '5.4.4',   // Host not found
      '5.4.6',   // Routing loop detected
      'timeout',
      'network error',
      'connection refused'
    ]
    
    return recoverablePatterns.some(pattern => 
      error.toLowerCase().includes(pattern.toLowerCase())
    )
  }

  /**
   * Detecta errores específicos de proveedores
   * @param error - Error a analizar
   * @returns object - Información del error específico
   */
  private analyzeProviderError(error: string): { provider: string; errorType: string; recommendation: string } {
    if (error.includes('5.7.708')) {
      return {
        provider: 'Gmail',
        errorType: 'IP_BLOCKED',
        recommendation: 'Gmail está bloqueando la IP de Office 365. Espera 15-30 minutos antes de reintentar.'
      }
    }
    
    if (error.includes('icloud.com') || error.includes('me.com') || error.includes('mac.com')) {
      return {
        provider: 'iCloud',
        errorType: 'SECURITY_POLICY',
        recommendation: 'iCloud tiene políticas de seguridad muy restrictivas. Verifica SPF/DKIM/DMARC.'
      }
    }
    
    if (error.includes('yahoo.com') || error.includes('ymail.com')) {
      return {
        provider: 'Yahoo',
        errorType: 'RATE_LIMIT',
        recommendation: 'Yahoo puede estar aplicando límites de velocidad. Reduce la frecuencia de envío.'
      }
    }
    
    return {
      provider: 'Unknown',
      errorType: 'GENERIC',
      recommendation: 'Error genérico. Revisa la configuración del dominio.'
    }
  }

  /**
   * Implementa retry con backoff exponencial y estrategias específicas para Gmail
   * @param fn - Función a ejecutar
   * @param maxRetries - Número máximo de reintentos
   * @param baseDelay - Delay base en milisegundos
   * @param isGmailTarget - Si el destino incluye Gmail
   * @returns Promise<any>
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>, 
    maxRetries: number = 3,
    baseDelay: number = 1000,
    isGmailTarget: boolean = false
  ): Promise<T> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          throw lastError
        }
        
        // Solo reintentar si el error es recuperable
        if (!this.isRecoverableError(lastError.message)) {
          throw lastError
        }
        
        // Estrategias específicas para Gmail
        let delay: number
        if (isGmailTarget) {
          // Para Gmail: delays más largos y progresivos
          if (attempt === 0) {
            delay = 10000 // 10 segundos inicial para Gmail
          } else if (attempt === 1) {
            delay = 15000 // 15 segundos en segundo intento
          } else {
            delay = 30000 // 30 segundos en intentos posteriores
          }
          
          // Agregar jitter aleatorio para Gmail
          delay += Math.random() * 5000
          
          console.log(`🚨 Gmail Target - Reintentando en ${Math.round(delay/1000)}s (intento ${attempt + 1}/${maxRetries + 1})`)
          console.log(`   📧 Error: ${lastError.message.includes('5.7.708') ? 'IP Blocked (5.7.708)' : 'Other Gmail Error'}`)
        } else {
          // Para otros proveedores: backoff exponencial estándar
          delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
          console.log(`🔄 Reintentando envío en ${Math.round(delay)}ms (intento ${attempt + 1}/${maxRetries + 1})`)
        }
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }

  /**
   * Envía un correo electrónico usando Microsoft Graph API con retry automático
   * @param message - Configuración del mensaje
   * @returns Promise<EmailSendResult>
   */
  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // Detectar si hay destinatarios de Gmail
      const hasGmailRecipients = message.toRecipients.some(r => 
        r.emailAddress.toLowerCase().includes('gmail.com')
      ) || message.ccRecipients?.some(r => 
        r.emailAddress.toLowerCase().includes('gmail.com')
      ) || message.bccRecipients?.some(r => 
        r.emailAddress.toLowerCase().includes('gmail.com')
      )

      if (hasGmailRecipients) {
        console.log(`🚨 Detectados destinatarios de Gmail - Aplicando estrategia especial`)
      }

      return await this.retryWithBackoff(async () => {
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
          let errorDetails = ''
          
          try {
            const errorData = JSON.parse(errorText)
            errorDetails = errorData.error?.message || errorText
          } catch {
            errorDetails = errorText
          }
          
          // Analizar error específico del proveedor
          const providerAnalysis = this.analyzeProviderError(errorDetails)
          
          // Log detallado para debugging
          console.error('Error detallado de Microsoft Graph:', {
            status: response.status,
            statusText: response.statusText,
            error: errorDetails,
            provider: providerAnalysis.provider,
            errorType: providerAnalysis.errorType,
            recommendation: providerAnalysis.recommendation,
            headers: Object.fromEntries(response.headers.entries()),
            payload: JSON.stringify(payload, null, 2)
          })
          
          throw new Error(`Error enviando correo: ${response.status} ${response.statusText} - ${errorDetails}`)
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
      }, 5, 1000, hasGmailRecipients) // 5 reintentos, delay base 1s, Gmail target
    } catch (error) {
      console.error('Error enviando correo (después de reintentos):', error)
      
      const errorAnalysis = this.analyzeProviderError(error instanceof Error ? error.message : 'Error desconocido')
      
      return {
        messageId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        statusCode: 500,
        sentAt: new Date(),
        deliveredTo: [],
        failedTo: message.toRecipients.map(r => r.emailAddress),
        providerAnalysis: errorAnalysis
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
   * Prueba el envío a diferentes proveedores de email
   * @param testEmails - Lista de emails de prueba por proveedor
   * @returns Promise<Record<string, EmailSendResult>>
   */
  async testProviderDelivery(testEmails: Record<string, string[]>): Promise<Record<string, EmailSendResult>> {
    const results: Record<string, EmailSendResult> = {}
    
    for (const [provider, emails] of Object.entries(testEmails)) {
      console.log(`\n🧪 Probando envío a ${provider}...`)
      
      for (const email of emails) {
        const testMessage: EmailMessage = {
          subject: `Prueba de entrega - ${provider} - ${new Date().toISOString()}`,
          body: {
            contentType: 'HTML',
            content: `
              <html>
                <body>
                  <h2>🧪 Prueba de Entrega - ${provider}</h2>
                  <p>Este es un correo de prueba para verificar la entrega a <strong>${provider}</strong>.</p>
                  <p><strong>Destinatario:</strong> ${email}</p>
                  <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
                  <p><strong>Proveedor:</strong> ${provider}</p>
                  <hr>
                  <p><small>Si recibes este correo, la entrega a ${provider} está funcionando correctamente.</small></p>
                  <p><small>Enviado desde InvoSell - Sistema de Facturación Electrónica</small></p>
                </body>
              </html>
            `
          },
          toRecipients: [{ emailAddress: email }],
          importance: 'Normal'
        }
        
        try {
          const result = await this.sendEmail(testMessage)
          results[`${provider}_${email}`] = result
          
          if (result.success) {
            console.log(`  ✅ ${email}: Enviado exitosamente`)
          } else {
            console.log(`  ❌ ${email}: ${result.error}`)
          }
        } catch (error) {
          console.log(`  ❌ ${email}: Error - ${error instanceof Error ? error.message : 'Error desconocido'}`)
          results[`${provider}_${email}`] = {
            messageId: '',
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
            statusCode: 500,
            sentAt: new Date(),
            deliveredTo: [],
            failedTo: [email]
          }
        }
        
        // Pequeña pausa entre envíos para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return results
  }

  /**
   * Maneja errores específicos de Gmail con estrategias especiales
   * @param message - Mensaje a enviar
   * @returns Promise<EmailSendResult>
   */
  async sendEmailWithGmailWorkaround(message: EmailMessage): Promise<EmailSendResult> {
    // Detectar si hay destinatarios de Gmail
    const gmailRecipients = message.toRecipients.filter(r => 
      r.emailAddress.toLowerCase().includes('gmail.com')
    )
    
    if (gmailRecipients.length === 0) {
      // No hay destinatarios de Gmail, usar envío normal
      return await this.sendEmail(message)
    }
    
    console.log(`🚨 Detectados ${gmailRecipients.length} destinatarios de Gmail. Aplicando estrategia especial...`)
    
    // Estrategia 1: Envío con delay más largo
    const result = await this.retryWithBackoff(async () => {
      // Delay inicial más largo para Gmail
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      const accessToken = await this.getAccessToken()
      
      // Preparar payload con headers adicionales para Gmail
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
          importance: 'Normal', // Usar importancia normal para Gmail
          isReadReceiptRequested: false, // Deshabilitar confirmaciones para Gmail
          isDeliveryReceiptRequested: false
        },
        saveToSentItems: true
      }

      const response = await fetch(
        `${this.config.graphEndpoint}/v1.0/users/${this.config.senderEmail}/sendMail`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'InvoSell/1.0 (Gmail-Compatible)'
          },
          body: JSON.stringify(payload)
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorDetails = ''
        
        try {
          const errorData = JSON.parse(errorText)
          errorDetails = errorData.error?.message || errorText
        } catch {
          errorDetails = errorText
        }
        
        throw new Error(`Gmail Error: ${response.status} ${response.statusText} - ${errorDetails}`)
      }

      const messageId = `gmail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      return {
        messageId,
        success: true,
        statusCode: response.status,
        sentAt: new Date(),
        deliveredTo: message.toRecipients.map(r => r.emailAddress),
        failedTo: []
      }
    }, 5, 3000) // 5 reintentos con delay de 3 segundos base
    
    return result
  }

  /**
   * Diagnostica problemas de IP blocking
   * @returns Promise<object> - Información de diagnóstico
   */
  async diagnoseIPBlocking(): Promise<{
    status: 'blocked' | 'limited' | 'ok'
    recommendations: string[]
    nextSteps: string[]
  }> {
    const recommendations: string[] = []
    const nextSteps: string[] = []
    
    // Simular envío de prueba a Gmail
    try {
      const testMessage: EmailMessage = {
        subject: 'Diagnóstico de IP - ' + new Date().toISOString(),
        body: {
          contentType: 'Text',
          content: 'Correo de diagnóstico para verificar bloqueo de IP'
        },
        toRecipients: [{ emailAddress: 'test@gmail.com' }]
      }
      
      const result = await this.sendEmail(testMessage)
      
      if (!result.success && result.error?.includes('5.7.708')) {
        return {
          status: 'blocked',
          recommendations: [
            'Gmail está bloqueando temporalmente la IP de Office 365',
            'Espera 15-30 minutos antes de reintentar',
            'Considera usar un servicio de email transaccional alternativo',
            'Verifica que tu dominio tenga SPF/DKIM/DMARC configurado correctamente'
          ],
          nextSteps: [
            'Configurar registros DNS: SPF, DKIM, DMARC',
            'Contactar soporte de Microsoft si el problema persiste',
            'Implementar rate limiting más conservador',
            'Considerar usar SendGrid o Mailgun para Gmail'
          ]
        }
      } else if (!result.success) {
        return {
          status: 'limited',
          recommendations: [
            'Hay limitaciones temporales en el envío',
            'Reduce la frecuencia de envío',
            'Implementa delays más largos entre correos'
          ],
          nextSteps: [
            'Implementar rate limiting',
            'Usar backoff exponencial',
            'Monitorear métricas de entrega'
          ]
        }
      }
      
      return {
        status: 'ok',
        recommendations: ['El envío a Gmail está funcionando correctamente'],
        nextSteps: ['Continuar con el envío normal']
      }
      
    } catch (error) {
      return {
        status: 'blocked',
        recommendations: [
          'Error de conectividad con Gmail',
          'Posible bloqueo de IP temporal'
        ],
        nextSteps: [
          'Verificar conectividad',
          'Reintentar en unos minutos',
          'Contactar soporte técnico'
        ]
      }
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
