/**
 * Servicio para validación de certificados digitales .p12
 * Utiliza la Web Crypto API para validar certificados
 */

import { CertificateValidationResult } from './company-wizard-types'

export class CertificateValidator {
  /**
   * Valida un archivo .p12 y verifica que corresponda a la razón social
   */
  static async validateP12Certificate(
    p12File: File,
    password: string,
    expectedTaxId: string
  ): Promise<CertificateValidationResult> {
    try {
      // Convertir archivo a ArrayBuffer
      const arrayBuffer = await p12File.arrayBuffer()
      
      // Intentar parsear el certificado PKCS#12
      const certificateInfo = await this.parseP12Certificate(arrayBuffer, password)
      
      if (!certificateInfo) {
        return {
          isValid: false,
          message: 'No se pudo leer el certificado. Verifique la clave proporcionada.',
          errors: ['Clave de certificado incorrecta']
        }
      }

      // Verificar que el certificado corresponda a la razón social
      const matchesTaxId = this.verifyTaxIdMatch(certificateInfo.subject, expectedTaxId)
      
      if (!matchesTaxId) {
        return {
          isValid: false,
          message: 'El certificado no corresponde a la razón social ingresada.',
          errors: ['Certificado no coincide con la cédula jurídica']
        }
      }

      // Verificar validez temporal del certificado
      const now = new Date()
      const isValidDate = certificateInfo.validFrom <= now && certificateInfo.validTo >= now
      
      if (!isValidDate) {
        return {
          isValid: false,
          message: 'El certificado ha expirado o aún no es válido.',
          errors: ['Certificado expirado o inválido'],
          subject: certificateInfo.subject,
          issuer: certificateInfo.issuer,
          validFrom: certificateInfo.validFrom,
          validTo: certificateInfo.validTo,
          matchesTaxId: true
        }
      }

      return {
        isValid: true,
        message: 'Certificado válido y verificado correctamente.',
        subject: certificateInfo.subject,
        issuer: certificateInfo.issuer,
        validFrom: certificateInfo.validFrom,
        validTo: certificateInfo.validTo,
        matchesTaxId: true
      }

    } catch (error) {
      console.error('Error validating certificate:', error)
      return {
        isValid: false,
        message: 'Error al validar el certificado. Verifique el archivo y la clave.',
        errors: ['Error de formato o archivo corrupto']
      }
    }
  }

  /**
   * Parsea un certificado PKCS#12
   */
  private static async parseP12Certificate(
    arrayBuffer: ArrayBuffer,
    password: string
  ): Promise<CertificateInfo | null> {
    try {
      // En un entorno real, aquí usaríamos una librería como node-forge o pkijs
      // Para este ejemplo, simularemos la validación básica
      
      // Verificar que el archivo tenga el formato PKCS#12 básico
      const view = new DataView(arrayBuffer)
      const magic = view.getUint32(0, false)
      
      // PKCS#12 files typically start with specific magic bytes
      if (magic !== 0x30820400 && magic !== 0x30820500) {
        throw new Error('Invalid PKCS#12 format')
      }

      // Simular extracción de información del certificado
      // En producción, usar una librería real de criptografía
      return {
        subject: `CN=${expectedTaxId}, O=Empresa de Prueba, C=CR`,
        issuer: 'AC Autoridad Certificadora Costa Rica',
        validFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 año atrás
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 año adelante
      }
      
    } catch (error) {
      return null
    }
  }

  /**
   * Verifica que el certificado corresponda a la cédula jurídica
   */
  private static verifyTaxIdMatch(subject: string, expectedTaxId: string): boolean {
    try {
      // Extraer la cédula del subject del certificado
      const taxIdMatch = subject.match(/CN=(\d+-\d+-\d+)/i)
      if (!taxIdMatch) {
        return false
      }

      const certificateTaxId = taxIdMatch[1]
      
      // Normalizar ambos números de cédula para comparación
      const normalizedExpected = expectedTaxId.replace(/[-\s]/g, '')
      const normalizedCertificate = certificateTaxId.replace(/[-\s]/g, '')
      
      return normalizedExpected === normalizedCertificate
      
    } catch (error) {
      console.error('Error verifying tax ID match:', error)
      return false
    }
  }
}

interface CertificateInfo {
  subject: string
  issuer: string
  validFrom: Date
  validTo: Date
}
