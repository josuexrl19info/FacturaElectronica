/**
 * Servicio para manejar consecutivos de facturas
 * Genera y actualiza consecutivos en formato FAC-XXXXXXXXXX
 */

import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export interface ConsecutiveResult {
  success: boolean
  consecutive?: string
  error?: string
}

export class InvoiceConsecutiveService {
  /**
   * Obtiene el siguiente consecutivo para una empresa
   */
  static async getNextConsecutive(companyId: string): Promise<ConsecutiveResult> {
    try {
      console.log('🔢 Obteniendo siguiente consecutivo para empresa:', companyId)

      // Obtener datos de la empresa
      const companyRef = doc(db, 'companies', companyId)
      const companySnap = await getDoc(companyRef)

      if (!companySnap.exists()) {
        return {
          success: false,
          error: 'Empresa no encontrada'
        }
      }

      const companyData = companySnap.data()
      const currentConsecutive = companyData.consecutive || 0

      // Generar el siguiente consecutivo
      const nextConsecutive = currentConsecutive + 1
      const consecutiveFormatted = `FAC-${nextConsecutive.toString().padStart(10, '0')}`

      console.log('📊 Consecutivo actual:', currentConsecutive)
      console.log('📊 Siguiente consecutivo:', nextConsecutive)
      console.log('📊 Formato:', consecutiveFormatted)

      return {
        success: true,
        consecutive: consecutiveFormatted
      }

    } catch (error) {
      console.error('❌ Error al obtener consecutivo:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * Actualiza el consecutivo de una empresa después de crear una factura
   */
  static async updateCompanyConsecutive(companyId: string): Promise<ConsecutiveResult> {
    try {
      console.log('🔄 Actualizando consecutivo de empresa:', companyId)

      // Obtener datos actuales de la empresa
      const companyRef = doc(db, 'companies', companyId)
      const companySnap = await getDoc(companyRef)

      if (!companySnap.exists()) {
        return {
          success: false,
          error: 'Empresa no encontrada'
        }
      }

      const companyData = companySnap.data()
      const currentConsecutive = companyData.consecutive || 0
      const newConsecutive = currentConsecutive + 1

      // Actualizar el consecutivo en la empresa
      await updateDoc(companyRef, {
        consecutive: newConsecutive,
        updatedAt: serverTimestamp()
      })

      const consecutiveFormatted = `FAC-${newConsecutive.toString().padStart(10, '0')}`

      console.log('✅ Consecutivo actualizado:', {
        anterior: currentConsecutive,
        nuevo: newConsecutive,
        formato: consecutiveFormatted
      })

      return {
        success: true,
        consecutive: consecutiveFormatted
      }

    } catch (error) {
      console.error('❌ Error al actualizar consecutivo:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * Proceso completo: obtener consecutivo y actualizar empresa
   */
  static async getAndUpdateConsecutive(companyId: string): Promise<ConsecutiveResult> {
    try {
      console.log('🚀 Proceso completo de consecutivo para empresa:', companyId)

      // 1. Obtener el siguiente consecutivo
      const getResult = await this.getNextConsecutive(companyId)
      if (!getResult.success) {
        return getResult
      }

      // 2. Actualizar el consecutivo en la empresa
      const updateResult = await this.updateCompanyConsecutive(companyId)
      if (!updateResult.success) {
        return updateResult
      }

      console.log('✅ Proceso de consecutivo completado:', getResult.consecutive)

      return {
        success: true,
        consecutive: getResult.consecutive
      }

    } catch (error) {
      console.error('❌ Error en proceso de consecutivo:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * Formatea un número como consecutivo FAC-XXXXXXXXXX
   */
  static formatConsecutive(number: number): string {
    return `FAC-${number.toString().padStart(10, '0')}`
  }

  /**
   * Extrae el número de un consecutivo en formato FAC-XXXXXXXXXX
   */
  static extractConsecutiveNumber(consecutive: string): number {
    const match = consecutive.match(/FAC-(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * Valida el formato de un consecutivo
   */
  static validateConsecutiveFormat(consecutive: string): {
    valid: boolean
    error?: string
    number?: number
  } {
    if (!consecutive) {
      return {
        valid: false,
        error: 'Consecutivo requerido'
      }
    }

    const match = consecutive.match(/^FAC-(\d{10})$/)
    if (!match) {
      return {
        valid: false,
        error: 'Formato de consecutivo inválido. Debe ser FAC-XXXXXXXXXX (10 dígitos)'
      }
    }

    const number = parseInt(match[1], 10)
    if (number <= 0) {
      return {
        valid: false,
        error: 'El número del consecutivo debe ser mayor a 0'
      }
    }

    return {
      valid: true,
      number
    }
  }

  /**
   * Obtiene el consecutivo actual de una empresa
   */
  static async getCurrentConsecutive(companyId: string): Promise<{
    success: boolean
    consecutive?: number
    formatted?: string
    error?: string
  }> {
    try {
      console.log('📊 Obteniendo consecutivo actual de empresa:', companyId)

      const companyRef = doc(db, 'companies', companyId)
      const companySnap = await getDoc(companyRef)

      if (!companySnap.exists()) {
        return {
          success: false,
          error: 'Empresa no encontrada'
        }
      }

      const companyData = companySnap.data()
      const currentConsecutive = companyData.consecutive || 0
      const formatted = this.formatConsecutive(currentConsecutive)

      console.log('📊 Consecutivo actual:', {
        numero: currentConsecutive,
        formato: formatted
      })

      return {
        success: true,
        consecutive: currentConsecutive,
        formatted
      }

    } catch (error) {
      console.error('❌ Error al obtener consecutivo actual:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}
