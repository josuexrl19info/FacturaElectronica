/**
 * Sistema de cola para manejo inteligente de rebotes intermitentes
 * Especialmente diseñado para Gmail y otros proveedores estrictos
 */

import { EmailMessage, EmailSendResult } from './types'

interface QueuedEmail {
  id: string
  message: EmailMessage
  attempts: number
  lastAttempt: Date
  nextRetry: Date
  priority: 'high' | 'normal' | 'low'
  provider: 'gmail' | 'icloud' | 'outlook' | 'other'
}

interface QueueStats {
  total: number
  pending: number
  processing: number
  failed: number
  successful: number
  byProvider: Record<string, number>
}

export class EmailQueue {
  private queue: Map<string, QueuedEmail> = new Map()
  private processing: Set<string> = new Set()
  private stats: QueueStats = {
    total: 0,
    pending: 0,
    processing: 0,
    failed: 0,
    successful: 0,
    byProvider: {}
  }
  private isProcessing = false

  /**
   * Agrega un correo a la cola
   */
  addEmail(message: EmailMessage, priority: 'high' | 'normal' | 'low' = 'normal'): string {
    const id = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const provider = this.detectProvider(message)
    
    const queuedEmail: QueuedEmail = {
      id,
      message,
      attempts: 0,
      lastAttempt: new Date(),
      nextRetry: new Date(), // Inmediato
      priority,
      provider
    }

    this.queue.set(id, queuedEmail)
    this.updateStats()
    
    console.log(`📧 Email agregado a la cola: ${id} (${provider}, ${priority})`)
    
    // Iniciar procesamiento si no está activo
    if (!this.isProcessing) {
      this.startProcessing()
    }

    return id
  }

  /**
   * Detecta el proveedor principal del email
   */
  private detectProvider(message: EmailMessage): QueuedEmail['provider'] {
    const allRecipients = [
      ...message.toRecipients,
      ...(message.ccRecipients || []),
      ...(message.bccRecipients || [])
    ]

    for (const recipient of allRecipients) {
      const email = recipient.emailAddress.toLowerCase()
      if (email.includes('gmail.com')) return 'gmail'
      if (email.includes('icloud.com') || email.includes('me.com') || email.includes('mac.com')) return 'icloud'
      if (email.includes('outlook.com') || email.includes('hotmail.com') || email.includes('live.com')) return 'outlook'
    }

    return 'other'
  }

  /**
   * Inicia el procesamiento de la cola
   */
  private async startProcessing() {
    if (this.isProcessing) return
    
    this.isProcessing = true
    console.log('🚀 Iniciando procesamiento de cola de correos...')

    while (this.queue.size > 0) {
      try {
        await this.processNextBatch()
        
        // Pequeña pausa entre lotes para no saturar
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('Error procesando cola:', error)
        await new Promise(resolve => setTimeout(resolve, 5000)) // Pausa más larga en caso de error
      }
    }

    this.isProcessing = false
    console.log('✅ Procesamiento de cola completado')
  }

  /**
   * Procesa el siguiente lote de correos
   */
  private async processNextBatch() {
    const now = new Date()
    const readyEmails = Array.from(this.queue.values())
      .filter(email => email.nextRetry <= now)
      .sort((a, b) => {
        // Ordenar por prioridad y luego por tiempo de espera
        const priorityOrder = { high: 0, normal: 1, low: 2 }
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        return a.nextRetry.getTime() - b.nextRetry.getTime()
      })

    if (readyEmails.length === 0) {
      // No hay emails listos, esperar un poco
      await new Promise(resolve => setTimeout(resolve, 5000))
      return
    }

    // Procesar hasta 3 emails a la vez (para no saturar)
    const batchSize = Math.min(3, readyEmails.length)
    const batch = readyEmails.slice(0, batchSize)

    console.log(`📦 Procesando lote de ${batch.length} correos`)

    // Procesar en paralelo
    await Promise.allSettled(
      batch.map(email => this.processEmail(email.id))
    )
  }

  /**
   * Procesa un email individual
   */
  private async processEmail(emailId: string) {
    const queuedEmail = this.queue.get(emailId)
    if (!queuedEmail) return

    this.processing.add(emailId)
    this.updateStats()

    try {
      console.log(`📧 Procesando email: ${emailId} (intento ${queuedEmail.attempts + 1})`)

      // Aquí llamarías al servicio de email real
      // const result = await emailService.sendEmail(queuedEmail.message)
      
      // Por ahora, simulamos el envío
      const result = await this.simulateEmailSend(queuedEmail)

      if (result.success) {
        // Éxito - remover de la cola
        this.queue.delete(emailId)
        this.stats.successful++
        console.log(`✅ Email enviado exitosamente: ${emailId}`)
      } else {
        // Error - programar reintento
        await this.scheduleRetry(emailId, result.error)
      }

    } catch (error) {
      console.error(`❌ Error procesando email ${emailId}:`, error)
      await this.scheduleRetry(emailId, error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      this.processing.delete(emailId)
      this.updateStats()
    }
  }

  /**
   * Programa un reintento para un email
   */
  private async scheduleRetry(emailId: string, error: string) {
    const queuedEmail = this.queue.get(emailId)
    if (!queuedEmail) return

    queuedEmail.attempts++
    queuedEmail.lastAttempt = new Date()

    // Calcular próximo intento basado en el proveedor y número de intentos
    const nextRetryDelay = this.calculateRetryDelay(queuedEmail.provider, queuedEmail.attempts, error)
    queuedEmail.nextRetry = new Date(Date.now() + nextRetryDelay)

    if (queuedEmail.attempts >= this.getMaxRetries(queuedEmail.provider)) {
      // Máximo de intentos alcanzado - marcar como fallido
      this.queue.delete(emailId)
      this.stats.failed++
      console.log(`💀 Email fallido después de ${queuedEmail.attempts} intentos: ${emailId}`)
    } else {
      console.log(`⏰ Email reprogramado para ${queuedEmail.nextRetry.toLocaleTimeString()}: ${emailId} (intento ${queuedEmail.attempts + 1})`)
    }

    this.updateStats()
  }

  /**
   * Calcula el delay para el próximo reintento
   */
  private calculateRetryDelay(provider: QueuedEmail['provider'], attempt: number, error: string): number {
    const baseDelays = {
      gmail: [30000, 60000, 120000, 300000, 600000], // 30s, 1m, 2m, 5m, 10m
      icloud: [60000, 120000, 300000, 600000, 900000], // 1m, 2m, 5m, 10m, 15m
      outlook: [10000, 20000, 30000, 60000, 120000], // 10s, 20s, 30s, 1m, 2m
      other: [5000, 10000, 20000, 30000, 60000] // 5s, 10s, 20s, 30s, 1m
    }

    const delays = baseDelays[provider]
    const delayIndex = Math.min(attempt - 1, delays.length - 1)
    const baseDelay = delays[delayIndex]

    // Agregar jitter aleatorio (10-50% del delay base)
    const jitter = baseDelay * (0.1 + Math.random() * 0.4)
    
    // Si es error 5.7.708 de Gmail, delay más largo
    if (provider === 'gmail' && error.includes('5.7.708')) {
      return baseDelay * 2 + jitter
    }

    return baseDelay + jitter
  }

  /**
   * Obtiene el número máximo de reintentos por proveedor
   */
  private getMaxRetries(provider: QueuedEmail['provider']): number {
    const maxRetries = {
      gmail: 5,
      icloud: 4,
      outlook: 3,
      other: 3
    }
    return maxRetries[provider]
  }

  /**
   * Simula el envío de un email (reemplazar con el servicio real)
   */
  private async simulateEmailSend(queuedEmail: QueuedEmail): Promise<EmailSendResult> {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    // Simular éxito/fallo basado en el proveedor y intentos
    const successRate = this.getSuccessRate(queuedEmail.provider, queuedEmail.attempts)
    const isSuccess = Math.random() < successRate

    if (isSuccess) {
      return {
        messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        success: true,
        statusCode: 202,
        sentAt: new Date(),
        deliveredTo: queuedEmail.message.toRecipients.map(r => r.emailAddress),
        failedTo: []
      }
    } else {
      // Simular diferentes tipos de errores
      const errors = {
        gmail: ['550 5.7.708 Service unavailable. Access denied, traffic not accepted from this IP', '550 5.7.1 Message rejected'],
        icloud: ['550 5.7.1 Message rejected by recipient server', '550 5.1.1 User unknown'],
        outlook: ['550 5.1.1 Recipient address rejected', '550 5.2.1 Mailbox unavailable'],
        other: ['550 5.1.1 User unknown', '550 5.2.1 Mailbox unavailable']
      }

      const providerErrors = errors[queuedEmail.provider]
      const randomError = providerErrors[Math.floor(Math.random() * providerErrors.length)]

      return {
        messageId: '',
        success: false,
        error: randomError,
        statusCode: 550,
        sentAt: new Date(),
        deliveredTo: [],
        failedTo: queuedEmail.message.toRecipients.map(r => r.emailAddress)
      }
    }
  }

  /**
   * Obtiene la tasa de éxito basada en el proveedor y número de intentos
   */
  private getSuccessRate(provider: QueuedEmail['provider'], attempt: number): number {
    const baseRates = {
      gmail: [0.7, 0.8, 0.85, 0.9, 0.95], // Mejora con cada intento
      icloud: [0.6, 0.7, 0.8, 0.9],
      outlook: [0.9, 0.95, 0.98],
      other: [0.8, 0.9, 0.95]
    }

    const rates = baseRates[provider]
    const rateIndex = Math.min(attempt - 1, rates.length - 1)
    return rates[rateIndex]
  }

  /**
   * Actualiza las estadísticas de la cola
   */
  private updateStats() {
    this.stats.total = this.queue.size + this.processing.size + this.stats.failed + this.stats.successful
    this.stats.pending = this.queue.size
    this.stats.processing = this.processing.size

    // Actualizar estadísticas por proveedor
    this.stats.byProvider = {}
    for (const email of this.queue.values()) {
      this.stats.byProvider[email.provider] = (this.stats.byProvider[email.provider] || 0) + 1
    }
  }

  /**
   * Obtiene estadísticas de la cola
   */
  getStats(): QueueStats {
    return { ...this.stats }
  }

  /**
   * Obtiene el estado de un email específico
   */
  getEmailStatus(emailId: string): QueuedEmail | null {
    return this.queue.get(emailId) || null
  }

  /**
   * Obtiene todos los emails en la cola
   */
  getQueueStatus(): QueuedEmail[] {
    return Array.from(this.queue.values())
  }

  /**
   * Limpia emails antiguos de la cola
   */
  cleanup(maxAgeHours: number = 24) {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)
    let cleaned = 0

    for (const [id, email] of this.queue.entries()) {
      if (email.lastAttempt < cutoff) {
        this.queue.delete(id)
        this.stats.failed++
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Limpieza: ${cleaned} emails antiguos removidos`)
      this.updateStats()
    }
  }
}

// Instancia singleton
let emailQueueInstance: EmailQueue | null = null

export function getEmailQueue(): EmailQueue {
  if (!emailQueueInstance) {
    emailQueueInstance = new EmailQueue()
  }
  return emailQueueInstance
}
