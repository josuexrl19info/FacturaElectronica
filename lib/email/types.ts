/**
 * Tipos e interfaces para el servicio de correos electrónicos
 * Compatible con Microsoft Graph API (Office 365)
 */

export interface EmailAttachment {
  /** Nombre del archivo */
  name: string
  /** Tipo MIME del archivo (ej: 'image/jpeg', 'application/pdf') */
  contentType: string
  /** Contenido del archivo en base64 */
  contentBytes: string
  /** Tamaño del archivo en bytes */
  size?: number
  /** ID único del adjunto */
  id?: string
  /** Si es un adjunto inline para usar en HTML */
  isInline?: boolean
  /** CID para referenciar en HTML (ej: "cid:logo") */
  contentId?: string
}

export interface EmailRecipient {
  /** Dirección de correo electrónico */
  emailAddress: string
  /** Nombre del destinatario (opcional) */
  name?: string
}

export interface EmailMessage {
  /** Asunto del correo */
  subject: string
  /** Contenido HTML del correo */
  body: {
    contentType: 'HTML' | 'Text'
    content: string
  }
  /** Lista de destinatarios (para, cc, bcc) */
  toRecipients: EmailRecipient[]
  ccRecipients?: EmailRecipient[]
  bccRecipients?: EmailRecipient[]
  /** Lista de archivos adjuntos */
  attachments?: EmailAttachment[]
  /** Si el correo es de alta prioridad */
  importance?: 'Low' | 'Normal' | 'High'
  /** Si solicitar confirmación de lectura */
  isReadReceiptRequested?: boolean
  /** Si solicitar confirmación de entrega */
  isDeliveryReceiptRequested?: boolean
  /** Fecha programada para envío (ISO string) */
  scheduledDateTime?: string
}

export interface EmailTemplate {
  /** ID único del template */
  id: string
  /** Nombre del template */
  name: string
  /** Descripción del template */
  description?: string
  /** Asunto del template con variables */
  subject: string
  /** Contenido HTML del template */
  htmlContent: string
  /** Variables disponibles en el template */
  variables?: string[]
  /** Si el template está activo */
  isActive: boolean
  /** Fecha de creación */
  createdAt: Date
  /** Fecha de última modificación */
  updatedAt: Date
}

export interface EmailSendOptions {
  /** Si guardar una copia en la bandeja de envío */
  saveToSentItems?: boolean
  /** Timeout para el envío en milisegundos */
  timeout?: number
  /** Si usar template de respuesta automática */
  autoReply?: boolean
  /** Configuración de reintentos */
  retryConfig?: {
    maxRetries: number
    retryDelay: number
  }
}

export interface EmailSendResult {
  /** ID del mensaje enviado */
  messageId: string
  /** Si el envío fue exitoso */
  success: boolean
  /** Mensaje de error si falló */
  error?: string
  /** Código de estado HTTP */
  statusCode?: number
  /** Fecha y hora del envío */
  sentAt: Date
  /** IDs de los destinatarios que recibieron el correo */
  deliveredTo: string[]
  /** IDs de los destinatarios que fallaron */
  failedTo: string[]
  /** Análisis específico del proveedor (si hay error) */
  providerAnalysis?: {
    provider: string
    errorType: string
    recommendation: string
  }
}

export interface EmailConfig {
  /** Tenant ID de Office 365 */
  tenantId: string
  /** Client ID de la aplicación */
  clientId: string
  /** Client Secret de la aplicación */
  clientSecret: string
  /** URL base de Microsoft Graph */
  graphEndpoint: string
  /** Email del remitente */
  senderEmail: string
  /** Nombre del remitente */
  senderName?: string
}

export interface EmailValidationResult {
  /** Si la dirección es válida */
  isValid: boolean
  /** Tipo de error si no es válida */
  errorType?: 'invalid-format' | 'domain-not-found' | 'mx-record-not-found'
  /** Mensaje de error */
  errorMessage?: string
  /** Sugerencias de corrección */
  suggestions?: string[]
}

/**
 * Tipos para templates predefinidos
 */
export type EmailTemplateType = 
  | 'welcome'
  | 'password-reset'
  | 'invoice'
  | 'notification'
  | 'report'
  | 'custom'

/**
 * Tipos para adjuntos inline
 */
export interface InlineAttachment extends EmailAttachment {
  /** Debe ser true para adjuntos inline */
  isInline: true
  /** CID requerido para referenciar en HTML */
  contentId: string
}

/**
 * Configuración para envío masivo
 */
export interface BulkEmailOptions {
  /** Lista de destinatarios */
  recipients: EmailRecipient[]
  /** Template a usar */
  template: EmailTemplate
  /** Variables para personalizar el template */
  variables: Record<string, string>
  /** Configuración de envío */
  sendOptions: EmailSendOptions
  /** Delay entre envíos en milisegundos */
  delayBetweenSends?: number
  /** Límite de envíos por minuto */
  rateLimit?: number
}
