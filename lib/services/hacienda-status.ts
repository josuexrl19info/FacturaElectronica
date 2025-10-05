/**
 * Servicio para consultar el estado de documentos en Hacienda
 */

export interface HaciendaStatusResult {
  success: boolean
  status?: any
  error?: string
}

export class HaciendaStatusService {
  /**
   * Consulta el estado de un documento en Hacienda usando la URL de location
   */
  static async checkDocumentStatus(locationUrl: string, accessToken: string): Promise<HaciendaStatusResult> {
    try {
      console.log('🔍 Consultando estado de documento en Hacienda...')
      console.log('📍 URL:', locationUrl)
      console.log('🔑 Token disponible:', !!accessToken)

      const response = await fetch(locationUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📊 Status de respuesta:', response.status)
      console.log('📊 Status text:', response.statusText)

      if (response.ok) {
        const statusData = await response.json()
        console.log('✅ Estado obtenido de Hacienda:', statusData)

        return {
          success: true,
          status: statusData
        }
      } else {
        const errorText = await response.text()
        console.error('❌ Error al consultar estado:', response.status, errorText)

        let errorMessage = `Error al consultar estado: ${response.status}`
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

    } catch (error) {
      console.error('❌ Error en consulta de estado:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido en consulta'
      }
    }
  }

  /**
   * Consulta el estado con reintentos automáticos
   */
  static async checkDocumentStatusWithRetries(
    locationUrl: string, 
    accessToken: string, 
    maxRetries: number = 3,
    delayMs: number = 2000
  ): Promise<HaciendaStatusResult> {
    let lastError = ''

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Intento ${attempt}/${maxRetries} de consulta de estado...`)
      
      const result = await this.checkDocumentStatus(locationUrl, accessToken)
      
      if (result.success) {
        return result
      }

      lastError = result.error || 'Error desconocido'
      
      if (attempt < maxRetries) {
        console.log(`⏳ Esperando ${delayMs}ms antes del siguiente intento...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    console.error(`❌ Falló consulta de estado después de ${maxRetries} intentos`)
    return {
      success: false,
      error: `Falló después de ${maxRetries} intentos. Último error: ${lastError}`
    }
  }

  /**
   * Interpreta el estado de Hacienda y devuelve un status legible
   */
  static interpretStatus(statusData: any): {
    status: string
    description: string
    isFinal: boolean
  } {
    const estado = statusData['ind-estado'] || statusData.estado || statusData.state || statusData.status
    const mensaje = statusData.mensaje || statusData.message || statusData.DetalleMensaje || ''

    switch (estado) {
      case 'aceptado':
      case 'accepted':
        return {
          status: 'Aceptado',
          description: 'Documento aceptado por Hacienda',
          isFinal: true
        }
      
      case 'rechazado':
      case 'rejected':
        return {
          status: 'Rechazado',
          description: `Documento rechazado: ${mensaje}`,
          isFinal: true
        }
      
      case 'procesando':
      case 'processing':
        return {
          status: 'Procesando',
          description: 'Documento en procesamiento',
          isFinal: false
        }
      
      case 'pendiente':
      case 'pending':
        return {
          status: 'Pendiente',
          description: 'Documento pendiente de procesamiento',
          isFinal: false
        }
      
      case 'error':
      case 'failed':
        return {
          status: 'Error',
          description: `Error en procesamiento: ${mensaje}`,
          isFinal: true
        }
      
      default:
        return {
          status: 'Desconocido',
          description: `Estado no reconocido: ${estado}`,
          isFinal: false
        }
    }
  }

  /**
   * Valida si una URL de location es válida
   */
  static validateLocationUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      return parsedUrl.hostname.includes('comprobanteselectronicos.go.cr') || 
             parsedUrl.hostname.includes('api-sandbox.comprobanteselectronicos.go.cr')
    } catch {
      return false
    }
  }
}
