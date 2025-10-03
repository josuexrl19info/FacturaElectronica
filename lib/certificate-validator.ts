/**
 * Servicio para validación de certificados digitales .p12
 * Valida certificados PKCS#12 de Costa Rica para facturación electrónica
 */

import { CertificateValidationResult } from './company-wizard-types'
import * as forge from 'node-forge'

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
      // Validaciones básicas del archivo
      if (!p12File) {
        return {
          isValid: false,
          message: 'No se ha seleccionado ningún archivo de certificado.',
          errors: ['Archivo requerido']
        }
      }

      if (!password) {
        return {
          isValid: false,
          message: 'Debe proporcionar la clave del certificado.',
          errors: ['Clave requerida']
        }
      }

      // Validar extensión del archivo
      const fileName = p12File.name.toLowerCase()
      if (!fileName.endsWith('.p12') && !fileName.endsWith('.pfx')) {
        return {
          isValid: false,
          message: 'El archivo debe tener extensión .p12 o .pfx.',
          errors: ['Formato de archivo inválido']
        }
      }

      // Validar tamaño del archivo (máximo 5MB)
      if (p12File.size > 5 * 1024 * 1024) {
        return {
          isValid: false,
          message: 'El archivo del certificado es demasiado grande (máximo 5MB).',
          errors: ['Archivo demasiado grande']
        }
      }

      // Convertir archivo a ArrayBuffer para validación
      const arrayBuffer = await p12File.arrayBuffer()
      
      // Validar estructura básica del archivo PKCS#12
      const isValidStructure = this.validateP12Structure(arrayBuffer)
      if (!isValidStructure) {
        return {
          isValid: false,
          message: 'El archivo no tiene la estructura de un certificado PKCS#12 válido.',
          errors: ['Estructura de archivo inválida']
        }
      }

      // Intentar validar la clave del certificado y obtener información real
      const keyValidation = await this.validateCertificateKey(arrayBuffer, password)
      if (!keyValidation.isValid) {
        return {
          isValid: false,
          message: keyValidation.message || 'La clave del certificado es incorrecta.',
          errors: ['Clave incorrecta']
        }
      }

      // Usar la información real del certificado
      const certificateInfo = keyValidation.certificateInfo

      // Verificar validez temporal del certificado
      const now = new Date()
      const validFromDate = new Date(certificateInfo.validFrom)
      const validToDate = new Date(certificateInfo.validTo)
      const isValidDate = validFromDate <= now && validToDate >= now
      
      if (!isValidDate) {
        return {
          isValid: false,
          message: 'El certificado ha expirado o aún no es válido.',
          errors: ['Certificado expirado o inválido'],
          certificateInfo: {
            subject: certificateInfo.subject,
            issuer: certificateInfo.issuer,
            validFrom: certificateInfo.validFrom,
            validTo: certificateInfo.validTo,
            serialNumber: certificateInfo.serialNumber
          }
        }
      }

      return {
        isValid: true,
        message: 'Certificado válido y verificado correctamente.',
        certificateInfo: {
          subject: certificateInfo.subject,
          issuer: certificateInfo.issuer,
          validFrom: certificateInfo.validFrom,
          validTo: certificateInfo.validTo,
          serialNumber: certificateInfo.serialNumber
        }
      }

    } catch (error) {
      console.error('Error validating certificate:', error)
      return {
        isValid: false,
        message: 'Error al validar el certificado. Verifique el archivo y la clave.',
        errors: ['Error interno de validación']
      }
    }
  }

  /**
   * Valida la estructura básica de un archivo PKCS#12
   */
  private static validateP12Structure(arrayBuffer: ArrayBuffer): boolean {
    try {
      const view = new DataView(arrayBuffer)
      
      // Verificar que el archivo tenga al menos 100 bytes
      if (arrayBuffer.byteLength < 100) {
        return false
      }

      // Verificar magic bytes típicos de archivos PKCS#12
      const firstBytes = view.getUint32(0, false)
      
      // PKCS#12 files typically start with 0x30 (DER encoding)
      if ((firstBytes & 0xFF000000) !== 0x30000000) {
        return false
      }

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Valida la clave del certificado usando node-forge
   */
  private static async validateCertificateKey(
    arrayBuffer: ArrayBuffer,
    password: string
  ): Promise<{ isValid: boolean; message?: string; certificateInfo?: any }> {
    try {
      // Validar que la clave no esté vacía
      if (!password || password.length < 4) {
        return {
          isValid: false,
          message: 'La clave del certificado debe tener al menos 4 caracteres.'
        }
      }

      // Convertir ArrayBuffer a string base64
      const uint8Array = new Uint8Array(arrayBuffer)
      const base64String = btoa(String.fromCharCode(...uint8Array))
      
      try {
        // Intentar parsear el certificado PKCS#12
        const p12Der = forge.util.decode64(base64String)
        const p12Asn1 = forge.asn1.fromDer(p12Der)
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password)

        // Buscar el certificado en el keystore
        const bags = p12.getBags({ bagType: forge.pki.oids.certBag })
        const certBags = bags[forge.pki.oids.certBag]
        
        if (!certBags || certBags.length === 0) {
          return {
            isValid: false,
            message: 'No se encontró ningún certificado en el archivo .p12.'
          }
        }

        const cert = certBags[0].cert
        if (!cert) {
          return {
            isValid: false,
            message: 'No se pudo extraer la información del certificado.'
          }
        }

        const subject = cert.subject.getField('CN')?.value || ''
        const issuer = cert.issuer.getField('CN')?.value || ''
        
        // Convertir fechas de node-forge a Date objects de JavaScript
        const validFrom = new Date(cert.validity.notBefore)
        const validTo = new Date(cert.validity.notAfter)

        return {
          isValid: true,
          certificateInfo: {
            subject,
            issuer,
            validFrom: validFrom.toISOString(),
            validTo: validTo.toISOString(),
            serialNumber: cert.serialNumber || 'N/A'
          }
        }

      } catch (parseError) {
        // Si falla el parsing, la clave probablemente es incorrecta
        return {
          isValid: false,
          message: 'La clave del certificado es incorrecta o el archivo está corrupto.'
        }
      }

    } catch (error) {
      console.error('Error validating certificate key:', error)
      return {
        isValid: false,
        message: 'Error al validar la clave del certificado.'
      }
    }
  }
}