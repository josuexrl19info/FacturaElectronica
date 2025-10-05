/**
 * Servicio para generar claves de comprobantes electrónicos de Hacienda
 * Basado en las especificaciones oficiales de la Dirección General de Tributación
 * 
 * Estructura de clave (50 dígitos):
 * - Posiciones 1-3:   Código país (extraído de la empresa, por defecto 506)
 * - Posiciones 4-5:   Día de emisión (día actual)
 * - Posiciones 6-7:   Mes de emisión (mes actual)
 * - Posiciones 8-9:   Año de emisión (últimos 2 dígitos del año actual)
 * - Posiciones 10-21: Cédula del emisor (12 dígitos, rellenada con ceros)
 * - Posiciones 22-41: Consecutivo (20 dígitos: 0010000101XXXXXXXXXX)
 * - Posición 42:      Situación (1=Normal, siempre normal)
 * - Posiciones 43-50: Código de seguridad (8 dígitos aleatorios)
 */

export interface HaciendaKeyData {
  fecha: Date
  cedulaEmisor: string
  consecutivo: string
  situacion?: '1' | '2' | '3' // Normal, Contingencia, Sin internet
  codigoSeguridad?: string
  pais?: string // Código de país extraído de la empresa
}

export interface HaciendaKeyResult {
  success: boolean
  clave?: string
  error?: string
  parts?: {
    pais: string
    dia: string
    mes: string
    anio: string
    cedula: string
    consecutivo: string
    situacion: string
    codigoSeguridad: string
  }
}

export class HaciendaKeyGenerator {
  /**
   * Genera la clave de Hacienda según las especificaciones oficiales
   */
  static generateKey(keyData: HaciendaKeyData): HaciendaKeyResult {
    try {
      console.log('🔑 Generando clave de Hacienda...')
      console.log('📅 Fecha:', keyData.fecha)
      console.log('👤 Cédula emisor:', keyData.cedulaEmisor)
      console.log('📄 Consecutivo:', keyData.consecutivo)

      // Validar datos de entrada
      const validation = this.validateKeyData(keyData)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Generar cada parte de la clave
      const parts = this.generateKeyParts(keyData)
      
      // Combinar todas las partes
      const clave = this.combineKeyParts(parts)

      console.log('✅ Clave generada exitosamente:', clave)
      console.log('📋 Partes de la clave:', parts)

      return {
        success: true,
        clave,
        parts
      }

    } catch (error) {
      console.error('❌ Error al generar clave de Hacienda:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al generar clave'
      }
    }
  }

  /**
   * Genera cada parte de la clave según las especificaciones
   */
  private static generateKeyParts(keyData: HaciendaKeyData): {
    pais: string
    dia: string
    mes: string
    anio: string
    cedula: string
    consecutivo: string
    situacion: string
    codigoSeguridad: string
  } {
    const fecha = new Date(keyData.fecha)

    // a) Código del país (3 dígitos) - extraído de la empresa
    const pais = keyData.pais || '506' // Por defecto Costa Rica

    // b) Día (2 dígitos)
    const dia = fecha.getDate().toString().padStart(2, '0')

    // c) Mes (2 dígitos)
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0')

    // d) Año (2 dígitos) - últimos dos dígitos del año
    const anio = fecha.getFullYear().toString().slice(-2)

    // e) Cédula del emisor (12 dígitos) - rellenar con ceros a la izquierda
    const cedula = keyData.cedulaEmisor.padStart(12, '0')

    // f) Consecutivo (20 dígitos) - formato específico: 0010000101XXXXXXXXXX
    const consecutivo = this.formatConsecutiveForKey(keyData.consecutivo)

    // g) Situación (1 dígito) - siempre normal
    const situacion = '1' // Siempre normal

    // h) Código de seguridad (8 dígitos) - random
    const codigoSeguridad = this.generateSecurityCode()

    return {
      pais,
      dia,
      mes,
      anio,
      cedula,
      consecutivo,
      situacion,
      codigoSeguridad
    }
  }

  /**
   * Combina todas las partes de la clave en una sola cadena
   */
  private static combineKeyParts(parts: {
    pais: string
    dia: string
    mes: string
    anio: string
    cedula: string
    consecutivo: string
    situacion: string
    codigoSeguridad: string
  }): string {
    return `${parts.pais}${parts.dia}${parts.mes}${parts.anio}${parts.cedula}${parts.consecutivo}${parts.situacion}${parts.codigoSeguridad}`
  }

  /**
   * Genera un código de seguridad aleatorio de 8 dígitos
   */
  private static generateSecurityCode(): string {
    const min = 10000000
    const max = 99999999
    const code = Math.floor(Math.random() * (max - min + 1)) + min
    return code.toString()
  }

  /**
   * Formatea el consecutivo para la clave con el formato específico: 0010000101XXXXXXXXXX
   */
  private static formatConsecutiveForKey(consecutivo: string): string {
    // Extraer solo los números del consecutivo (ignorar prefijo FAC-)
    let numeroConsecutivo = consecutivo
    
    // Si tiene formato FAC-XXXXXXXXXX, extraer solo los números
    const match = consecutivo.match(/FAC-(\d+)/)
    if (match) {
      numeroConsecutivo = match[1]
    }
    
    // Formato: 0010000101XXXXXXXXXX (20 dígitos)
    // - 0010000101: Parte fija (10 dígitos)
    // - XXXXXXXXXX: Número consecutivo (10 dígitos)
    const parteFija = '0010000101'
    const numeroFormateado = numeroConsecutivo.padStart(10, '0')
    
    return parteFija + numeroFormateado
  }

  /**
   * Valida los datos de entrada para generar la clave
   */
  private static validateKeyData(keyData: HaciendaKeyData): {
    valid: boolean
    error?: string
  } {
    if (!keyData.fecha) {
      return { valid: false, error: 'Fecha requerida para generar la clave' }
    }

    if (!keyData.cedulaEmisor || keyData.cedulaEmisor.trim().length === 0) {
      return { valid: false, error: 'Cédula del emisor requerida' }
    }

    if (!keyData.consecutivo || keyData.consecutivo.trim().length === 0) {
      return { valid: false, error: 'Consecutivo requerido' }
    }

    // Validar que la cédula no exceda 12 dígitos
    if (keyData.cedulaEmisor.length > 12) {
      return { valid: false, error: 'Cédula del emisor no puede exceder 12 dígitos' }
    }

    // Validar que el consecutivo no exceda 20 dígitos
    if (keyData.consecutivo.length > 20) {
      return { valid: false, error: 'Consecutivo no puede exceder 20 dígitos' }
    }

    // Validar situación si se proporciona
    if (keyData.situacion && !['1', '2', '3'].includes(keyData.situacion)) {
      return { valid: false, error: 'Situación debe ser 1 (Normal), 2 (Contingencia) o 3 (Sin internet)' }
    }

    return { valid: true }
  }

  /**
   * Genera clave desde datos de factura
   */
  static generateKeyFromInvoice(invoiceData: any, companyData: any): HaciendaKeyResult {
    try {
      console.log('📋 Generando clave desde datos de factura...')

      // Extraer datos necesarios
      const fecha = invoiceData.fecha ? new Date(invoiceData.fecha) : new Date()
      const cedulaEmisor = companyData.identification || ''
      
      // Extraer código de país de la empresa (por defecto 506 para Costa Rica)
      const pais = companyData.countryCode || '506'
      
      // Extraer número consecutivo del formato FAC-XXXXXXXXXX
      let consecutivo = '1'
      if (invoiceData.consecutivo) {
        // Si viene en formato FAC-XXXXXXXXXX, extraer solo el número
        const match = invoiceData.consecutivo.match(/FAC-(\d+)/)
        if (match) {
          consecutivo = match[1]
        } else {
          // Si no tiene formato, usar tal como viene
          consecutivo = invoiceData.consecutivo
        }
      } else if (invoiceData.numero) {
        consecutivo = invoiceData.numero
      }
      
      const situacion = invoiceData.situacion || '1' // Normal por defecto

      console.log('📊 Datos extraídos:', {
        fecha: fecha.toISOString(),
        cedulaEmisor,
        pais,
        consecutivo,
        situacion,
        consecutivoOriginal: invoiceData.consecutivo
      })

      return this.generateKey({
        fecha,
        cedulaEmisor,
        consecutivo,
        situacion: situacion as '1' | '2' | '3',
        pais
      })

    } catch (error) {
      console.error('❌ Error al generar clave desde factura:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * Valida una clave existente
   */
  static validateKey(clave: string): {
    valid: boolean
    error?: string
    parts?: any
  } {
    try {
      // La clave debe tener exactamente 50 dígitos
      if (clave.length !== 50) {
        return {
          valid: false,
          error: `La clave debe tener exactamente 50 dígitos, tiene ${clave.length}`
        }
      }

      // Verificar que solo contenga dígitos
      if (!/^\d+$/.test(clave)) {
        return {
          valid: false,
          error: 'La clave solo puede contener dígitos'
        }
      }

      // Extraer partes para validación
      const parts = {
        pais: clave.substring(0, 3),
        dia: clave.substring(3, 5),
        mes: clave.substring(5, 7),
        anio: clave.substring(7, 9),
        cedula: clave.substring(9, 21),
        consecutivo: clave.substring(21, 41),
        situacion: clave.substring(41, 42),
        codigoSeguridad: clave.substring(42, 50)
      }

      // Validar código de país
      if (parts.pais !== '506') {
        return {
          valid: false,
          error: 'Código de país inválido (debe ser 506 para Costa Rica)'
        }
      }

      // Validar día (01-31)
      const dia = parseInt(parts.dia)
      if (dia < 1 || dia > 31) {
        return {
          valid: false,
          error: 'Día inválido (debe estar entre 01 y 31)'
        }
      }

      // Validar mes (01-12)
      const mes = parseInt(parts.mes)
      if (mes < 1 || mes > 12) {
        return {
          valid: false,
          error: 'Mes inválido (debe estar entre 01 y 12)'
        }
      }

      // Validar situación
      if (!['1', '2', '3'].includes(parts.situacion)) {
        return {
          valid: false,
          error: 'Situación inválida (debe ser 1, 2 o 3)'
        }
      }

      return {
        valid: true,
        parts
      }

    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Error al validar clave'
      }
    }
  }

  /**
   * Obtiene información descriptiva de una clave
   */
  static getKeyInfo(clave: string): {
    success: boolean
    info?: any
    error?: string
  } {
    try {
      const validation = this.validateKey(clave)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        }
      }

      const parts = validation.parts!
      
      // Extraer número consecutivo real del formato 0010000101XXXXXXXXXX
      let consecutivoReal = parts.consecutivo
      let consecutivoFormateado = parts.consecutivo
      
      if (parts.consecutivo.startsWith('0010000101')) {
        const numeroReal = parts.consecutivo.substring(10) // Últimos 10 dígitos
        consecutivoReal = numeroReal.replace(/^0+/, '') || '1' // Remover ceros a la izquierda
        consecutivoFormateado = `FAC-${numeroReal}`
      } else {
        consecutivoReal = parts.consecutivo.replace(/^0+/, '') || '1'
      }

      const info = {
        clave,
        pais: 'Costa Rica (506)',
        fecha: {
          dia: parts.dia,
          mes: parts.mes,
          anio: `20${parts.anio}`,
          completa: `${parts.dia}/${parts.mes}/20${parts.anio}`
        },
        emisor: {
          cedula: parts.cedula.replace(/^0+/, '') // Remover ceros a la izquierda
        },
        consecutivo: consecutivoReal,
        consecutivoFormateado,
        situacion: {
          codigo: parts.situacion,
          descripcion: this.getSituacionDescription(parts.situacion)
        },
        codigoSeguridad: parts.codigoSeguridad
      }

      return {
        success: true,
        info
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener información de la clave'
      }
    }
  }

  /**
   * Obtiene la descripción de la situación
   */
  private static getSituacionDescription(situacion: string): string {
    switch (situacion) {
      case '1':
        return 'Normal'
      case '2':
        return 'Contingencia'
      case '3':
        return 'Sin internet'
      default:
        return 'Desconocida'
    }
  }
}
