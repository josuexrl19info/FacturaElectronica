/**
 * Servicio de correos electrónicos usando SMTP
 * Alternativa robusta a Microsoft Graph para mejor entrega
 */

import nodemailer from 'nodemailer'
import { 
  EmailMessage, 
  EmailAttachment, 
  EmailSendResult, 
  EmailConfig 
} from './types'

export interface SMTPConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  senderEmail: string
  senderName: string
}

export class SMTPService {
  private config: SMTPConfig
  private transporter: nodemailer.Transporter | null = null

  constructor(config: SMTPConfig) {
    this.config = config
  }

  /**
   * Inicializa el transporter SMTP
   */
  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter
    }

    this.transporter = nodemailer.createTransporter({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      // Configuraciones adicionales para mejor entrega
      tls: {
        rejectUnauthorized: false // Para servidores con certificados auto-firmados
      },
      // Pooling para mejor rendimiento
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      // Timeouts más largos para Gmail
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000
    })

    // Verificar conexión
    try {
      await this.transporter.verify()
      console.log('✅ SMTP: Conexión verificada exitosamente')
    } catch (error) {
      console.error('❌ SMTP: Error verificando conexión:', error)
      throw new Error('No se pudo conectar al servidor SMTP')
    }

    return this.transporter
  }

  /**
   * Convierte adjuntos de EmailAttachment a formato nodemailer
   */
  private convertAttachments(attachments: EmailAttachment[] = []): any[] {
    return attachments.map(attachment => ({
      filename: attachment.name,
      content: attachment.contentBytes,
      contentType: attachment.contentType,
      cid: attachment.isInline ? attachment.contentId : undefined,
      encoding: 'base64'
    }))
  }

  /**
   * Envía un correo electrónico usando SMTP
   */
  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const transporter = await this.getTransporter()

      // Detectar si hay destinatarios de Gmail para aplicar estrategias especiales
      const hasGmailRecipients = message.toRecipients.some(r => 
        r.emailAddress.toLowerCase().includes('gmail.com')
      ) || message.ccRecipients?.some(r => 
        r.emailAddress.toLowerCase().includes('gmail.com')
      ) || message.bccRecipients?.some(r => 
        r.emailAddress.toLowerCase().includes('gmail.com')
      )

      if (hasGmailRecipients) {
        console.log('🚨 SMTP: Detectados destinatarios de Gmail - Aplicando estrategia especial')
      }

      // Preparar opciones del correo
      const mailOptions: any = {
        from: {
          name: this.config.senderName,
          address: this.config.senderEmail
        },
        to: message.toRecipients.map(r => ({
          name: r.name || '',
          address: r.emailAddress
        })),
        subject: message.subject,
        html: message.body.contentType === 'HTML' ? message.body.content : undefined,
        text: message.body.contentType === 'Text' ? message.body.content : undefined,
        attachments: this.convertAttachments(message.attachments)
      }

      // Agregar CC y BCC si existen
      if (message.ccRecipients && message.ccRecipients.length > 0) {
        mailOptions.cc = message.ccRecipients.map(r => ({
          name: r.name || '',
          address: r.emailAddress
        }))
      }

      if (message.bccRecipients && message.bccRecipients.length > 0) {
        mailOptions.bcc = message.bccRecipients.map(r => ({
          name: r.name || '',
          address: r.emailAddress
        }))
      }

      // Estrategias específicas para Gmail
      if (hasGmailRecipients) {
        // Headers adicionales para Gmail
        mailOptions.headers = {
          'X-Mailer': 'InvoSell/1.0 (Gmail-Compatible)',
          'X-Priority': '3', // Normal priority
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal',
          'List-Unsubscribe': '<mailto:unsubscribe@innovasmartcr.com>',
          'List-Id': 'InvoSell System <system.invosell.com>'
        }

        // Configuraciones específicas para Gmail
        mailOptions.messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@innovasmartcr.com>`
      }

      // Enviar el correo
      const info = await transporter.sendMail(mailOptions)

      console.log('✅ SMTP: Correo enviado exitosamente')
      console.log('📧 Message ID:', info.messageId)
      console.log('📬 Response:', info.response)

      return {
        messageId: info.messageId || `smtp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        success: true,
        statusCode: 250, // SMTP success code
        sentAt: new Date(),
        deliveredTo: message.toRecipients.map(r => r.emailAddress),
        failedTo: []
      }

    } catch (error) {
      console.error('❌ SMTP: Error enviando correo:', error)
      
      return {
        messageId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido en SMTP',
        statusCode: 500,
        sentAt: new Date(),
        deliveredTo: [],
        failedTo: message.toRecipients.map(r => r.emailAddress),
        providerAnalysis: {
          provider: 'SMTP',
          errorType: 'SEND_FAILED',
          recommendation: 'Verificar configuración SMTP y credenciales'
        }
      }
    }
  }

  /**
   * Valida la configuración SMTP
   */
  async validateConfig(): Promise<boolean> {
    try {
      await this.getTransporter()
      return true
    } catch (error) {
      console.error('❌ SMTP: Error validando configuración:', error)
      return false
    }
  }

  /**
   * Cierra la conexión SMTP
   */
  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close()
      this.transporter = null
    }
  }
}

// Configuración para diferentes proveedores SMTP
export const SMTP_PROVIDERS = {
  // Office 365 SMTP
  office365: {
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // true para puerto 465, false para otros puertos
    requiresAuth: true
  },
  
  // Gmail SMTP (para testing)
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requiresAuth: true
  },
  
  // SendGrid SMTP
  sendgrid: {
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    requiresAuth: true
  },
  
  // Mailgun SMTP
  mailgun: {
    host: 'smtp.mailgun.org',
    port: 587,
    secure: false,
    requiresAuth: true
  }
}

/**
 * Crea una instancia del servicio SMTP con configuración automática
 */
export function createSMTPService(): SMTPService {
  // Configuración desde variables de entorno
  const config: SMTPConfig = {
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || process.env.OFFICE365_SENDER_EMAIL || '',
      pass: process.env.SMTP_PASS || process.env.OFFICE365_CLIENT_SECRET || ''
    },
    senderEmail: process.env.SMTP_SENDER_EMAIL || process.env.OFFICE365_SENDER_EMAIL || '',
    senderName: process.env.SMTP_SENDER_NAME || process.env.OFFICE365_SENDER_NAME || 'InvoSell'
  }

  return new SMTPService(config)
}

// Instancia singleton
let smtpServiceInstance: SMTPService | null = null

/**
 * Obtiene la instancia del servicio SMTP
 */
export function getSMTPService(): SMTPService {
  if (!smtpServiceInstance) {
    smtpServiceInstance = createSMTPService()
  }
  return smtpServiceInstance
}
