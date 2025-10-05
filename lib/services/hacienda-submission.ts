/**
 * Servicio para envío de documentos a Hacienda
 * Maneja el envío de documentos XML firmados a la API de Hacienda
 */

import { HaciendaKeyGenerator } from '@/lib/services/hacienda-key-generator'

export interface HaciendaSubmissionRequest {
  clave: string
  fecha: string
  emisor: {
    tipoIdentificacion: string
    numeroIdentificacion: string
  }
  receptor: {
    tipoIdentificacion: string
    numeroIdentificacion: string
  }
  comprobanteXml: string
}

export interface HaciendaSubmissionResponse {
  success: boolean
  clave?: string
  estado?: string
  mensaje?: string
  error?: string
  detalles?: any
}

export interface HaciendaSubmissionResult {
  success: boolean
  response?: HaciendaSubmissionResponse
  error?: string
}

export class HaciendaSubmissionService {
  /**
   * Envía un documento a Hacienda usando el XML firmado y access token
   */
  static async submitDocument(
    invoiceData: any,
    signedXml: string,
    accessToken: string,
    companyData: any
  ): Promise<HaciendaSubmissionResult> {
    try {
      console.log('📤 Iniciando envío de documento a Hacienda...')
      console.log('🔑 Access token disponible:', !!accessToken)
      console.log('📄 XML firmado disponible:', !!signedXml)

      // Validar que tenemos los datos necesarios
      if (!companyData.atvCredentials?.receptionUrl) {
        return {
          success: false,
          error: 'No se encontró receptionUrl en las credenciales ATV'
        }
      }

      // Generar clave de Hacienda si no existe
      let clave = invoiceData.clave
      if (!clave) {
        console.log('🔑 Generando clave de Hacienda...')
        const keyResult = HaciendaKeyGenerator.generateKeyFromInvoice(invoiceData, companyData)
        if (keyResult.success) {
          clave = keyResult.clave
          console.log('✅ Clave generada:', clave)
        } else {
          return {
            success: false,
            error: `Error al generar clave: ${keyResult.error}`
          }
        }
      }

      // Construir el request de envío
      const submissionRequest: HaciendaSubmissionRequest = {
        clave: clave,
        fecha: invoiceData.fecha || new Date().toISOString(),
        emisor: {
          tipoIdentificacion: companyData.identificationType || '02',
          numeroIdentificacion: companyData.identification || ''
        },
        receptor: {
          tipoIdentificacion: invoiceData.receptor?.tipoIdentificacion || '02',
          numeroIdentificacion: invoiceData.receptor?.numeroIdentificacion || ''
        },
        comprobanteXml: signedXml
      }

      console.log('📋 Datos de envío preparados:', {
        clave: submissionRequest.clave,
        fecha: submissionRequest.fecha,
        emisor: submissionRequest.emisor,
        receptor: submissionRequest.receptor,
        xmlSize: signedXml.length
      })

      // Realizar el envío a Hacienda
      const response = await fetch(companyData.atvCredentials.receptionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(submissionRequest)
      })

      console.log('📊 Status de respuesta Hacienda:', response.status)
      console.log('📊 Status text:', response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error en respuesta de Hacienda:', response.status, errorText)
        
        let errorMessage = `Error de envío a Hacienda: ${response.status}`
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.mensaje || errorData.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }

        return {
          success: false,
          error: errorMessage
        }
      }

      const submissionResponse: HaciendaSubmissionResponse = await response.json()
      console.log('✅ Respuesta de Hacienda:', submissionResponse)

      if (submissionResponse.success !== false) {
        console.log('🎉 Documento enviado exitosamente a Hacienda')
        console.log('🔑 Clave:', submissionResponse.clave)
        console.log('📊 Estado:', submissionResponse.estado)
        console.log('💬 Mensaje:', submissionResponse.mensaje)

        return {
          success: true,
          response: submissionResponse
        }
      } else {
        console.error('❌ Error en el proceso de envío:', submissionResponse.mensaje)
        return {
          success: false,
          error: submissionResponse.mensaje || 'Error desconocido en el envío'
        }
      }

    } catch (error) {
      console.error('❌ Error al enviar documento a Hacienda:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al enviar documento'
      }
    }
  }


  /**
   * Valida que los datos requeridos para el envío estén disponibles
   */
  static validateSubmissionData(
    invoiceData: any,
    signedXml: string,
    accessToken: string,
    companyData: any
  ): { valid: boolean; error?: string } {
    if (!invoiceData) {
      return { valid: false, error: 'Datos de factura requeridos' }
    }

    if (!signedXml || signedXml.trim().length === 0) {
      return { valid: false, error: 'XML firmado requerido' }
    }

    if (!accessToken || accessToken.trim().length === 0) {
      return { valid: false, error: 'Access token requerido' }
    }

    if (!companyData?.atvCredentials?.receptionUrl) {
      return { valid: false, error: 'URL de recepción de Hacienda no configurada' }
    }

    if (!companyData.identification || !companyData.identificationType) {
      return { valid: false, error: 'Datos de identificación de la empresa requeridos' }
    }

    return { valid: true }
  }

  /**
   * Proceso completo de envío de documento
   */
  static async submitInvoiceToHacienda(
    invoiceData: any,
    signedXml: string,
    accessToken: string,
    companyData: any
  ): Promise<HaciendaSubmissionResult> {
    try {
      console.log('🚀 Iniciando proceso completo de envío a Hacienda...')

      // 1. Validar datos
      const validation = this.validateSubmissionData(invoiceData, signedXml, accessToken, companyData)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // 2. Enviar documento
      const submissionResult = await this.submitDocument(invoiceData, signedXml, accessToken, companyData)
      
      if (submissionResult.success) {
        console.log('🎉 Proceso de envío completo exitoso')
        return submissionResult
      } else {
        console.error('❌ Falló el envío:', submissionResult.error)
        return submissionResult
      }

    } catch (error) {
      console.error('❌ Error en proceso de envío:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido en proceso de envío'
      }
    }
  }

  /**
   * Extrae información del XML firmado para validación
   */
  static extractXmlInfo(signedXml: string): {
    clave?: string
    fecha?: string
    emisor?: any
    receptor?: any
  } {
    try {
      // Parsear XML para extraer información
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(signedXml, 'text/xml')
      
      const clave = xmlDoc.querySelector('Clave')?.textContent
      const fecha = xmlDoc.querySelector('FechaEmision')?.textContent
      const emisor = {
        tipoIdentificacion: xmlDoc.querySelector('Emisor TipoIdentificacion')?.textContent,
        numeroIdentificacion: xmlDoc.querySelector('Emisor NumeroIdentificacion')?.textContent
      }
      const receptor = {
        tipoIdentificacion: xmlDoc.querySelector('Receptor TipoIdentificacion')?.textContent,
        numeroIdentificacion: xmlDoc.querySelector('Receptor NumeroIdentificacion')?.textContent
      }

      return { clave, fecha, emisor, receptor }
    } catch (error) {
      console.error('❌ Error al extraer información del XML:', error)
      return {}
    }
  }
}
