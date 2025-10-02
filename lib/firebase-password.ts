"use client"

import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from './firebase-auth'

/**
 * Servicio para manejo de contraseñas
 * Proporciona funcionalidades para cambiar contraseñas de usuarios
 */
export const passwordService = {
  /**
   * Envía un email de restablecimiento de contraseña al usuario actual
   * @returns Promise<void>
   * @throws Error si el usuario no está autenticado o si falla el envío
   */
  async sendPasswordResetEmail(): Promise<void> {
    try {
      const currentUser = auth.currentUser
      
      if (!currentUser || !currentUser.email) {
        throw new Error('Usuario no autenticado o sin email')
      }

      // Enviar email de restablecimiento de contraseña
      await sendPasswordResetEmail(auth, currentUser.email)
    } catch (error: any) {
      console.error('Error al enviar email de restablecimiento:', error)
      
      // Manejar errores específicos de Firebase
      switch (error.code) {
        case 'auth/user-not-found':
          throw new Error('Usuario no encontrado')
        case 'auth/invalid-email':
          throw new Error('Email inválido')
        case 'auth/too-many-requests':
          throw new Error('Demasiados intentos. Intenta más tarde')
        case 'auth/network-request-failed':
          throw new Error('Error de conexión. Verifica tu internet')
        default:
          throw new Error('Error al enviar el email de restablecimiento')
      }
    }
  }
}
