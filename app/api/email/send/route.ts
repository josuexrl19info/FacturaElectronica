/**
 * API Route para envío de correos electrónicos
 * 
 * Endpoints disponibles:
 * POST /api/email/send - Enviar correo electrónico
 */

import { NextRequest, NextResponse } from 'next/server'
import { getEmailService } from '@/lib/email/email-service'
import { EmailMessage } from '@/lib/email/types'

/**
 * POST /api/email/send
 * Envía un correo electrónico usando Microsoft Graph API
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar que el servicio esté configurado
    const emailService = getEmailService()
    
    // Validar configuración
    const isConfigValid = await emailService.validateConfig()
    if (!isConfigValid) {
      return NextResponse.json(
        { 
          error: 'Servicio de correos no configurado correctamente',
          details: 'Verifica las variables de entorno de Office 365'
        },
        { status: 500 }
      )
    }

    // Parsear el cuerpo de la petición
    const body = await request.json()
    const { 
      to, 
      cc, 
      bcc, 
      subject, 
      htmlContent, 
      textContent, 
      attachments, 
      importance,
      isReadReceiptRequested,
      isDeliveryReceiptRequested,
      templateId,
      variables
    } = body

    // Validaciones básicas
    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        { error: 'Lista de destinatarios (to) es requerida' },
        { status: 400 }
      )
    }

    if (!subject) {
      return NextResponse.json(
        { error: 'Asunto del correo es requerido' },
        { status: 400 }
      )
    }

    if (!htmlContent && !textContent && !templateId) {
      return NextResponse.json(
        { error: 'Contenido del correo o template es requerido' },
        { status: 400 }
      )
    }

    // Preparar el mensaje
    const message: EmailMessage = {
      subject,
      body: {
        contentType: htmlContent ? 'HTML' : 'Text',
        content: htmlContent || textContent || ''
      },
      toRecipients: to.map((recipient: string | { email: string; name?: string }) => 
        typeof recipient === 'string' 
          ? { emailAddress: recipient }
          : { emailAddress: recipient.email, name: recipient.name }
      ),
      ccRecipients: cc?.map((recipient: string | { email: string; name?: string }) => 
        typeof recipient === 'string' 
          ? { emailAddress: recipient }
          : { emailAddress: recipient.email, name: recipient.name }
      ),
      bccRecipients: bcc?.map((recipient: string | { email: string; name?: string }) => 
        typeof recipient === 'string' 
          ? { emailAddress: recipient }
          : { emailAddress: recipient.email, name: recipient.name }
      ),
      attachments: attachments || [],
      importance: importance || 'Normal',
      isReadReceiptRequested: isReadReceiptRequested || false,
      isDeliveryReceiptRequested: isDeliveryReceiptRequested || false
    }

    // Enviar el correo
    const result = await emailService.sendEmail(message)

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        sentAt: result.sentAt,
        deliveredTo: result.deliveredTo,
        message: 'Correo enviado exitosamente'
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: 'Error enviando el correo'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error en API de envío de correos:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/email/send
 * Información sobre el servicio de correos
 */
export async function GET() {
  try {
    const emailService = getEmailService()
    const isConfigValid = await emailService.validateConfig()

    return NextResponse.json({
      service: 'Microsoft Graph API Email Service',
      status: isConfigValid ? 'active' : 'inactive',
      features: [
        'Envío de correos HTML',
        'Adjuntos de archivos',
        'Imágenes inline',
        'Múltiples destinatarios (to, cc, bcc)',
        'Confirmaciones de lectura y entrega',
        'Prioridad de correos',
        'Templates personalizados'
      ],
      configuration: {
        hasTenantId: !!process.env.OFFICE365_TENANT_ID,
        hasClientId: !!process.env.OFFICE365_CLIENT_ID,
        hasClientSecret: !!process.env.OFFICE365_CLIENT_SECRET,
        hasSenderEmail: !!process.env.OFFICE365_SENDER_EMAIL,
        graphEndpoint: process.env.OFFICE365_GRAPH_ENDPOINT || 'https://graph.microsoft.com'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error obteniendo información del servicio' },
      { status: 500 }
    )
  }
}
