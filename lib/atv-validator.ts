/**
 * Servicio para validación de credenciales ATV (Administración Tributaria Virtual)
 * Valida las credenciales contra el sistema de Hacienda de Costa Rica
 */

import { ATVValidationResult } from './company-wizard-types'

export class ATVValidator {
  /**
   * Valida las credenciales ATV contra el sistema de Hacienda
   */
  static async validateCredentials(
    username: string,
    password: string,
    clientId: string = 'api-stag'
  ): Promise<ATVValidationResult> {
    try {
      // URL del endpoint de autenticación de Hacienda
      const authUrl = 'https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token'
      
      // Preparar datos para la solicitud
      const formData = new URLSearchParams()
      formData.append('grant_type', 'password')
      formData.append('client_id', clientId)
      formData.append('username', username)
      formData.append('password', password)

      // Realizar la solicitud de autenticación
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      })

      const responseData = await response.json()

      if (!response.ok) {
        // Manejar errores específicos de Hacienda
        const errorMessage = this.getErrorMessage(responseData, response.status)
        return {
          isValid: false,
          message: errorMessage,
          errors: [responseData.error_description || responseData.error || 'Error de autenticación']
        }
      }

      // Calcular fecha de expiración del token
      const expiresIn = responseData.expires_in || 3600 // 1 hora por defecto
      const expiresAt = new Date(Date.now() + expiresIn * 1000)

      return {
        isValid: true,
        message: 'Credenciales válidas. Conexión exitosa con Hacienda.',
        token: responseData.access_token,
        expiresAt: expiresAt
      }

    } catch (error) {
      console.error('Error validating ATV credentials:', error)
      
      // Determinar el tipo de error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          isValid: false,
          message: 'Error de conexión. Verifique su conexión a internet.',
          errors: ['Error de red']
        }
      }

      return {
        isValid: false,
        message: 'Error inesperado al validar credenciales.',
        errors: ['Error interno del servidor']
      }
    }
  }

  /**
   * Obtiene un mensaje de error amigable basado en la respuesta de Hacienda
   */
  private static getErrorMessage(responseData: any, statusCode: number): string {
    // Errores específicos de Hacienda
    if (responseData.error === 'invalid_grant') {
      return 'Credenciales incorrectas. Verifique su usuario y contraseña.'
    }
    
    if (responseData.error === 'invalid_client') {
      return 'Client ID inválido. Verifique la configuración del cliente.'
    }
    
    if (responseData.error === 'unauthorized_client') {
      return 'Cliente no autorizado. Contacte al administrador del sistema.'
    }

    if (responseData.error_description) {
      return responseData.error_description
    }

    // Errores de estado HTTP
    switch (statusCode) {
      case 400:
        return 'Solicitud inválida. Verifique los datos enviados.'
      case 401:
        return 'Credenciales inválidas. Verifique su usuario y contraseña.'
      case 403:
        return 'Acceso denegado. Su usuario no tiene permisos para acceder.'
      case 404:
        return 'Servicio no encontrado. El endpoint de Hacienda no está disponible.'
      case 500:
        return 'Error interno del servidor de Hacienda. Intente más tarde.'
      case 503:
        return 'Servicio temporalmente no disponible. Intente más tarde.'
      default:
        return 'Error al validar credenciales. Intente nuevamente.'
    }
  }

  /**
   * Valida el formato de las credenciales antes de enviarlas a Hacienda
   */
  static validateCredentialFormat(username: string, password: string, clientId: string): ATVValidationResult {
    const errors: string[] = []

    // Validar usuario
    if (!username || username.trim().length === 0) {
      errors.push('El usuario es requerido')
    } else if (!username.includes('@')) {
      errors.push('El usuario debe ser un email válido')
    }

    // Validar contraseña
    if (!password || password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres')
    }

    // Validar client ID
    if (!clientId || clientId.trim().length === 0) {
      errors.push('El Client ID es requerido')
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        message: 'Por favor corrija los siguientes errores:',
        errors: errors
      }
    }

    return {
      isValid: true,
      message: 'Formato de credenciales válido'
    }
  }
}
