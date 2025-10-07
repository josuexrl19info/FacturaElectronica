/**
 * Servicio de autenticación con la API de Hacienda
 * Maneja la obtención de tokens de acceso para interactuar con los servicios de Hacienda
 */

import { EncryptionService } from '@/lib/encryption'

export interface HaciendaCredentials {
  authUrl: string
  clientId: string
  username: string
  password: string
}

export interface HaciendaTokenResponse {
  access_token: string
  expires_in: number
  refresh_expires_in: number
  refresh_token: string
  token_type: string
  not_before_policy: number
  session_state: string
  scope: string
}

export interface HaciendaAuthResult {
  success: boolean
  accessToken?: string
  expiresIn?: number
  error?: string
  tokenResponse?: HaciendaTokenResponse
}

export class HaciendaAuthService {
  /**
   * Autentica con la API de Hacienda usando las credenciales de la empresa
   */
  static async authenticateWithHacienda(credentials: HaciendaCredentials): Promise<HaciendaAuthResult> {
    try {
      console.log('🔐 Iniciando autenticación con API de Hacienda...')
      console.log('🌐 URL de autenticación:', credentials.authUrl)
      console.log('👤 Username:', credentials.username)
      console.log('🔑 Client ID:', credentials.clientId)
      console.log('🔒 Password encriptado disponible:', !!credentials.password)

      // Desencriptar el password antes de enviarlo
      let decryptedPassword: string
      try {
        const masterPassword = EncryptionService.getMasterPassword()
        decryptedPassword = await EncryptionService.decrypt(credentials.password, masterPassword)
        console.log('✅ Password desencriptado exitosamente')
      } catch (decryptError) {
        console.error('❌ Error al desencriptar password:', decryptError)
        return {
          success: false,
          error: 'Error al desencriptar las credenciales de ATV'
        }
      }

      // Preparar datos para el request
      const formData = new URLSearchParams()
      formData.append('grant_type', 'password')
      formData.append('client_id', credentials.clientId)
      formData.append('username', credentials.username)
      formData.append('password', decryptedPassword)

      console.log('📡 Enviando solicitud de autenticación...')

      // Realizar request de autenticación
      const response = await fetch(credentials.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      })

      console.log('📊 Status de respuesta:', response.status)
      console.log('📊 Status text:', response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error en respuesta de autenticación:', response.status, errorText)
        
        let errorMessage = `Error de autenticación: ${response.status}`
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error_description || errorData.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }

        return {
          success: false,
          error: errorMessage
        }
      }

      const tokenResponse: HaciendaTokenResponse = await response.json()
      console.log('✅ Autenticación exitosa')
      console.log('🎫 Token obtenido:', tokenResponse.access_token.substring(0, 50) + '...')
      console.log('⏰ Expira en:', tokenResponse.expires_in, 'segundos')
      console.log('🔍 Token completo:', tokenResponse.access_token)
      console.log('🔍 Token type:', tokenResponse.token_type)
      console.log('🔍 Scope:', tokenResponse.scope)
      console.log('🔍 Session state:', tokenResponse.session_state)

      return {
        success: true,
        accessToken: tokenResponse.access_token,
        expiresIn: tokenResponse.expires_in,
        tokenResponse
      }

    } catch (error) {
      console.error('❌ Error al autenticar con Hacienda:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al autenticar'
      }
    }
  }

  /**
   * Obtiene credenciales de ATV desde los datos de la empresa
   */
  static extractAtvCredentials(companyData: any): HaciendaCredentials | null {
    try {
      if (!companyData?.atvCredentials) {
        console.error('❌ No se encontraron credenciales ATV en los datos de la empresa')
        return null
      }

      const atv = companyData.atvCredentials
      
      if (!atv.authUrl || !atv.clientId || !atv.username || !atv.password) {
        console.error('❌ Credenciales ATV incompletas:', {
          authUrl: !!atv.authUrl,
          clientId: !!atv.clientId,
          username: !!atv.username,
          password: !!atv.password
        })
        return null
      }

      console.log('✅ Credenciales ATV extraídas correctamente')
      console.log('🌐 Auth URL:', atv.authUrl)
      console.log('🔑 Client ID:', atv.clientId)
      console.log('👤 Username:', atv.username)

      return {
        authUrl: atv.authUrl,
        clientId: atv.clientId,
        username: atv.username,
        password: atv.password
      }

    } catch (error) {
      console.error('❌ Error al extraer credenciales ATV:', error)
      return null
    }
  }

  /**
   * Proceso completo de autenticación desde datos de empresa
   */
  static async authenticateFromCompany(companyData: any): Promise<HaciendaAuthResult> {
    try {
      console.log('🏢 Iniciando autenticación desde datos de empresa...')

      // 1. Extraer credenciales ATV
      const credentials = this.extractAtvCredentials(companyData)
      if (!credentials) {
        return {
          success: false,
          error: 'No se pudieron extraer las credenciales ATV de la empresa'
        }
      }

      // 2. Autenticar con Hacienda
      const authResult = await this.authenticateWithHacienda(credentials)
      
      if (authResult.success) {
        console.log('🎉 Autenticación completa exitosa')
        return authResult
      } else {
        console.error('❌ Falló la autenticación:', authResult.error)
        return authResult
      }

    } catch (error) {
      console.error('❌ Error en proceso de autenticación:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido en autenticación'
      }
    }
  }

  /**
   * Valida si un token está próximo a expirar
   */
  static isTokenExpiring(expiresIn: number, thresholdMinutes: number = 5): boolean {
    const thresholdSeconds = thresholdMinutes * 60
    return expiresIn <= thresholdSeconds
  }

  /**
   * Calcula el tiempo restante del token en minutos
   */
  static getTokenTimeRemaining(expiresIn: number): number {
    return Math.floor(expiresIn / 60)
  }

  /**
   * Obtiene un token válido (con lógica de refresh si es necesario)
   * Esta función se puede expandir para manejar refresh tokens
   */
  static async getValidToken(companyData: any): Promise<HaciendaAuthResult> {
    try {
      console.log('🔍 Obteniendo token válido para la empresa...')
      
      // Por ahora, siempre obtenemos un nuevo token
      // En el futuro se puede implementar caché y refresh
      const authResult = await this.authenticateFromCompany(companyData)
      
      if (authResult.success && authResult.expiresIn) {
        const timeRemaining = this.getTokenTimeRemaining(authResult.expiresIn)
        console.log(`⏰ Token válido por ${timeRemaining} minutos`)
      }

      return authResult

    } catch (error) {
      console.error('❌ Error al obtener token válido:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

}
