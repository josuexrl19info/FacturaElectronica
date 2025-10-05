/**
 * Servicio para firmar documentos XML digitalmente
 */

import { EncryptionService } from '@/lib/encryption'

export interface SigningRequest {
  xml: string
  certificate_base64: string
  password: string
  encrypted_password?: string
}

export interface SigningResponse {
  success: boolean
  signed_xml?: string
  error?: string
  message?: string
}

export class DigitalSignatureService {
  private static readonly SIGNING_API_URL = 'http://localhost:8000/php-signing-service-secure.php'
  private static readonly API_KEY = process.env.SIGNING_API_KEY || 'tu-api-key-super-secreta-123'

  /**
   * Firma un XML usando el servicio de firma digital
   */
  static async signXML(
    xml: string, 
    certificateBase64: string, 
    password: string
  ): Promise<SigningResponse> {
    try {
      const requestBody: SigningRequest = {
        xml,
        certificate_base64: certificateBase64,
        password
      }

      console.log('🔐 Iniciando proceso de firma digital...')
      console.log('📄 Tamaño del XML:', xml.length, 'caracteres')
      console.log('🔑 Certificado disponible:', !!certificateBase64)
      console.log('🔒 Contraseña disponible:', !!password)

      const response = await fetch(this.SIGNING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.API_KEY
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error en respuesta del servicio de firma:', response.status, errorText)
        throw new Error(`Error del servicio de firma: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ Respuesta del servicio de firma:', result)

      if (result.success) {
        console.log('🎉 XML firmado exitosamente')
        return {
          success: true,
          signed_xml: result.signed_xml,
          message: result.message || 'XML firmado exitosamente'
        }
      } else {
        console.error('❌ Error en el proceso de firma:', result.error)
        return {
          success: false,
          error: result.error || 'Error desconocido en el proceso de firma'
        }
      }

    } catch (error) {
      console.error('❌ Error al firmar XML:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al firmar XML'
      }
    }
  }

  /**
   * Firma un XML usando password encriptado
   * Envía el password encriptado al servicio PHP para que lo desencripte
   * 
   * IMPORTANTE: El servicio PHP debe tener la misma master password configurada
   * para poder desencriptar el password del certificado
   */
  static async signXMLWithEncryptedPassword(
    xml: string, 
    certificateBase64: string, 
    encryptedPassword: string
  ): Promise<SigningResponse> {
    try {
      const requestBody: SigningRequest = {
        xml,
        certificate_base64: certificateBase64,
        password: encryptedPassword, // Enviamos el password encriptado en el campo password
        encrypted_password: encryptedPassword // También lo enviamos en encrypted_password para compatibilidad
      }

      console.log('🔐 Iniciando proceso de firma digital con password encriptado...')
      console.log('📄 Tamaño del XML:', xml.length, 'caracteres')
      console.log('🔑 Certificado disponible:', !!certificateBase64)
      console.log('🔒 Password encriptado disponible:', !!encryptedPassword)

      const response = await fetch(this.SIGNING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.API_KEY
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error en respuesta del servicio de firma:', response.status, errorText)
        throw new Error(`Error del servicio de firma: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ Respuesta del servicio de firma:', result)

      if (result.success) {
        console.log('🎉 XML firmado exitosamente')
        return {
          success: true,
          signed_xml: result.signed_xml,
          message: result.message || 'XML firmado exitosamente'
        }
      } else {
        console.error('❌ Error en el proceso de firma:', result.error)
        return {
          success: false,
          error: result.error || 'Error desconocido en el proceso de firma'
        }
      }

    } catch (error) {
      console.error('❌ Error al firmar XML:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al firmar XML'
      }
    }
  }

  /**
   * Valida que los datos requeridos para la firma estén disponibles
   */
  static validateSigningData(
    xml: string,
    certificateBase64: string,
    password: string
  ): { valid: boolean; error?: string } {
    if (!xml || xml.trim().length === 0) {
      return { valid: false, error: 'XML no puede estar vacío' }
    }

    if (!certificateBase64 || certificateBase64.trim().length === 0) {
      return { valid: false, error: 'Certificado no puede estar vacío' }
    }

    if (!password || password.trim().length === 0) {
      return { valid: false, error: 'Contraseña del certificado no puede estar vacía' }
    }

    // Validar que el XML tenga la estructura básica
    if (!xml.includes('<FacturaElectronica') || !xml.includes('</FacturaElectronica>')) {
      return { valid: false, error: 'XML no tiene la estructura de Factura Electrónica válida' }
    }

    return { valid: true }
  }

  /**
   * Obtiene información del certificado desde la empresa
   */
  static async getCertificateFromCompany(companyId: string): Promise<{
    certificateBase64: string
    password: string
  } | null> {
    try {
      // Aquí deberías obtener los datos del certificado desde la base de datos
      // Por ahora retorno null para indicar que no hay certificado configurado
      console.log('🔍 Buscando certificado para empresa:', companyId)
      
      // TODO: Implementar consulta a la base de datos para obtener:
      // - certificadoDigital.p12FileData (base64)
      // - certificadoDigital.password
      
      return null
    } catch (error) {
      console.error('❌ Error al obtener certificado:', error)
      return null
    }
  }

  /**
   * Procesa la firma completa de una factura
   */
  static async processInvoiceSigning(
    invoiceData: any,
    companyId: string
  ): Promise<{
    success: boolean
    signedXml?: string
    error?: string
  }> {
    try {
      console.log('🚀 Iniciando proceso completo de firma de factura...')

      // 1. Obtener certificado de la empresa
      const certificateData = await this.getCertificateFromCompany(companyId)
      if (!certificateData) {
        return {
          success: false,
          error: 'No se encontró certificado digital configurado para esta empresa'
        }
      }

      // 2. Generar XML (esto se haría en el servicio de facturas)
      // const xml = XMLGenerator.generateFacturaXML(invoiceData)

      // 3. Validar datos
      const validation = this.validateSigningData(
        invoiceData.xml,
        certificateData.certificateBase64,
        certificateData.password
      )

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // 4. Firmar XML
      const signingResult = await this.signXML(
        invoiceData.xml,
        certificateData.certificateBase64,
        certificateData.password
      )

      if (!signingResult.success) {
        return {
          success: false,
          error: signingResult.error
        }
      }

      console.log('✅ Factura firmada exitosamente')
      return {
        success: true,
        signedXml: signingResult.signed_xml
      }

    } catch (error) {
      console.error('❌ Error en proceso de firma:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}
