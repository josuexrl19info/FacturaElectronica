/**
 * Servicio híbrido de correos electrónicos
 * Usa Microsoft Graph como principal y SMTP como fallback
 */

import { EmailMessage, EmailSendResult } from './types'
import { EmailService, getEmailService } from './email-service'
import { SMTPService, getSMTPService } from './smtp-service'

export interface HybridEmailOptions {
  primaryProvider: 'graph' | 'smtp'
  enableFallback: boolean
  retryWithFallback: boolean
  maxGraphRetries: number
}

export class HybridEmailService {
  private graphService: EmailService
  private smtpService: SMTPService
  private options: HybridEmailOptions

  constructor(options: Partial<HybridEmailOptions> = {}) {
    this.graphService = getEmailService()
    this.smtpService = getSMTPService()
    this.options = {
      primaryProvider: 'graph',
      enableFallback: true,
      retryWithFallback: true,
      maxGraphRetries: 3,
      ...options
    }
  }

  /**
   * Envía un correo usando el servicio híbrido
   */
  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    console.log(`🔄 Hybrid Service: Iniciando envío con proveedor principal: ${this.options.primaryProvider}`)

    // Intentar con el proveedor principal
    let result = await this.tryPrimaryProvider(message)

    // Si falla y está habilitado el fallback, intentar con el proveedor alternativo
    if (!result.success && this.options.enableFallback) {
      console.log(`🔄 Hybrid Service: Fallback habilitado - Intentando con proveedor alternativo`)
      result = await this.tryFallbackProvider(message, result.error)
    }

    return result
  }

  /**
   * Intenta enviar con el proveedor principal
   */
  private async tryPrimaryProvider(message: EmailMessage): Promise<EmailSendResult> {
    const provider = this.options.primaryProvider
    console.log(`📧 Hybrid Service: Intentando envío con ${provider.toUpperCase()}`)

    try {
      if (provider === 'graph') {
        return await this.graphService.sendEmail(message)
      } else {
        return await this.smtpService.sendEmail(message)
      }
    } catch (error) {
      console.error(`❌ Hybrid Service: Error con ${provider.toUpperCase()}:`, error)
      return {
        messageId: '',
        success: false,
        error: error instanceof Error ? error.message : `Error con ${provider.toUpperCase()}`,
        statusCode: 500,
        sentAt: new Date(),
        deliveredTo: [],
        failedTo: message.toRecipients.map(r => r.emailAddress)
      }
    }
  }

  /**
   * Intenta enviar con el proveedor de fallback
   */
  private async tryFallbackProvider(message: EmailMessage, originalError?: string): Promise<EmailSendResult> {
    const fallbackProvider = this.options.primaryProvider === 'graph' ? 'smtp' : 'graph'
    console.log(`🔄 Hybrid Service: Usando fallback: ${fallbackProvider.toUpperCase()}`)

    try {
      if (fallbackProvider === 'graph') {
        return await this.graphService.sendEmail(message)
      } else {
        return await this.smtpService.sendEmail(message)
      }
    } catch (error) {
      console.error(`❌ Hybrid Service: Error con fallback ${fallbackProvider.toUpperCase()}:`, error)
      
      return {
        messageId: '',
        success: false,
        error: `Error con ambos proveedores. Original: ${originalError}, Fallback: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        statusCode: 500,
        sentAt: new Date(),
        deliveredTo: [],
        failedTo: message.toRecipients.map(r => r.emailAddress),
        providerAnalysis: {
          provider: 'Hybrid',
          errorType: 'BOTH_PROVIDERS_FAILED',
          recommendation: 'Verificar configuración de ambos servicios (Graph y SMTP)'
        }
      }
    }
  }

  /**
   * Envía con reintentos automáticos entre proveedores
   */
  async sendEmailWithRetry(message: EmailMessage): Promise<EmailSendResult> {
    const maxRetries = this.options.maxGraphRetries
    let lastError: string = ''

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Hybrid Service: Intento ${attempt}/${maxRetries}`)

      const result = await this.sendEmail(message)

      if (result.success) {
        console.log(`✅ Hybrid Service: Éxito en intento ${attempt}`)
        return result
      }

      lastError = result.error || 'Error desconocido'
      console.log(`❌ Hybrid Service: Fallo en intento ${attempt}: ${lastError}`)

      // Si no es el último intento, esperar antes del siguiente
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 // Backoff exponencial
        console.log(`⏳ Hybrid Service: Esperando ${delay}ms antes del siguiente intento`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    // Todos los intentos fallaron
    return {
      messageId: '',
      success: false,
      error: `Todos los intentos fallaron. Último error: ${lastError}`,
      statusCode: 500,
      sentAt: new Date(),
      deliveredTo: [],
      failedTo: message.toRecipients.map(r => r.emailAddress),
      providerAnalysis: {
        provider: 'Hybrid',
        errorType: 'MAX_RETRIES_EXCEEDED',
        recommendation: 'Verificar configuración de servicios y conectividad'
      }
    }
  }

  /**
   * Valida la configuración de ambos servicios
   */
  async validateConfig(): Promise<{
    graph: boolean
    smtp: boolean
    overall: boolean
  }> {
    console.log('🔍 Hybrid Service: Validando configuración...')

    const [graphValid, smtpValid] = await Promise.all([
      this.graphService.validateConfig(),
      this.smtpService.validateConfig()
    ])

    const overall = graphValid || smtpValid

    console.log(`📊 Hybrid Service: Graph: ${graphValid ? '✅' : '❌'}, SMTP: ${smtpValid ? '✅' : '❌'}, Overall: ${overall ? '✅' : '❌'}`)

    return {
      graph: graphValid,
      smtp: smtpValid,
      overall
    }
  }

  /**
   * Obtiene estadísticas de ambos servicios
   */
  async getStats(): Promise<{
    primaryProvider: string
    fallbackEnabled: boolean
    configStatus: {
      graph: boolean
      smtp: boolean
      overall: boolean
    }
  }> {
    const configStatus = await this.validateConfig()

    return {
      primaryProvider: this.options.primaryProvider,
      fallbackEnabled: this.options.enableFallback,
      configStatus
    }
  }

  /**
   * Cambia la configuración del servicio
   */
  updateOptions(newOptions: Partial<HybridEmailOptions>): void {
    this.options = { ...this.options, ...newOptions }
    console.log(`⚙️ Hybrid Service: Configuración actualizada:`, this.options)
  }
}

// Instancia singleton
let hybridServiceInstance: HybridEmailService | null = null

/**
 * Obtiene la instancia del servicio híbrido
 */
export function getHybridEmailService(): HybridEmailService {
  if (!hybridServiceInstance) {
    hybridServiceInstance = new HybridEmailService({
      primaryProvider: 'graph', // Usar Graph como principal
      enableFallback: true,     // Habilitar fallback a SMTP
      retryWithFallback: true,  // Reintentar con fallback
      maxGraphRetries: 3        // Máximo 3 intentos
    })
  }
  return hybridServiceInstance
}
