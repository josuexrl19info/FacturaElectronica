/**
 * Servicio de encriptación para datos sensibles
 * Utiliza Web Crypto API para encriptar/desencriptar datos
 */

export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12

  /**
   * Genera una clave de encriptación desde una contraseña
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encripta un texto usando una contraseña
   */
  static async encrypt(text: string, password: string): Promise<string> {
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(text)
      
      // Generar salt aleatorio
      const salt = crypto.getRandomValues(new Uint8Array(16))
      
      // Generar IV aleatorio
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
      
      // Derivar clave
      const key = await this.deriveKey(password, salt)
      
      // Encriptar
      const encrypted = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv: iv },
        key,
        data
      )
      
      // Combinar salt + iv + encrypted data
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
      combined.set(salt, 0)
      combined.set(iv, salt.length)
      combined.set(new Uint8Array(encrypted), salt.length + iv.length)
      
      // Convertir a base64
      return btoa(String.fromCharCode(...combined))
      
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Error al encriptar los datos')
    }
  }

  /**
   * Desencripta un texto usando una contraseña
   */
  static async decrypt(encryptedText: string, password: string): Promise<string> {
    try {
      // Convertir de base64
      const combined = new Uint8Array(
        atob(encryptedText).split('').map(char => char.charCodeAt(0))
      )
      
      // Extraer salt, iv y datos encriptados
      const salt = combined.slice(0, 16)
      const iv = combined.slice(16, 16 + this.IV_LENGTH)
      const encrypted = combined.slice(16 + this.IV_LENGTH)
      
      // Derivar clave
      const key = await this.deriveKey(password, salt)
      
      // Desencriptar
      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv: iv },
        key,
        encrypted
      )
      
      // Convertir a string
      const decoder = new TextDecoder()
      return decoder.decode(decrypted)
      
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error('Error al desencriptar los datos')
    }
  }

  /**
   * Genera una contraseña maestra para la aplicación
   * En producción, esto debería venir de variables de entorno
   */
  static getMasterPassword(): string {
    // En producción, usar una variable de entorno
    const masterPassword = process.env.MASTER_ENCRYPTION_KEY || 'default-key-change-in-production'
    
    if (masterPassword === 'default-key-change-in-production') {
      console.warn('⚠️ Usando clave de encriptación por defecto. Cambie MASTER_ENCRYPTION_KEY en producción.')
    }
    
    return masterPassword
  }
}
