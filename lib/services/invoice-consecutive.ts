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
   * Obtiene el siguiente consecutivo para una empresa según el tipo de documento
   * @param companyId ID de la empresa
   * @param documentType Tipo de documento: 'facturas' (consecutive), 'tiquetes' (consecutiveTK), 'notas-credito' (consecutiveNT)
   */
  static async getNextConsecutive(companyId: string, documentType?: 'facturas' | 'tiquetes' | 'notas-credito'): Promise<ConsecutiveResult> {
    try {
      console.log('🔢 Obteniendo siguiente consecutivo para empresa:', companyId, 'tipo:', documentType || 'facturas')

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
      
      // Determinar qué campo usar según el tipo de documento
      let fieldName: string
      let prefix: string
      
      if (documentType === 'tiquetes') {
        fieldName = 'consecutiveTK'
        prefix = 'TE'
      } else if (documentType === 'notas-credito') {
        fieldName = 'consecutiveNT'
        prefix = 'NC'
      } else {
        // Por defecto: facturas
        fieldName = 'consecutive'
        prefix = 'FE'
      }
      
      // Obtener el consecutivo actual (si no existe, usar 0)
      const currentConsecutive = companyData[fieldName] ?? 0

      // Generar el siguiente consecutivo
      const nextConsecutive = currentConsecutive + 1
      const consecutiveFormatted = `${prefix}-${nextConsecutive.toString().padStart(10, '0')}`

      console.log('📊 Campo usado:', fieldName)
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
   * Actualiza el consecutivo de una empresa después de crear un documento
   * @param companyId ID de la empresa
   * @param documentType Tipo de documento: 'facturas' (consecutive), 'tiquetes' (consecutiveTK), 'notas-credito' (consecutiveNT)
   */
  static async updateCompanyConsecutive(companyId: string, documentType?: 'facturas' | 'tiquetes' | 'notas-credito'): Promise<ConsecutiveResult> {
    try {
      console.log('🔄 Actualizando consecutivo de empresa:', companyId, 'tipo:', documentType || 'facturas')

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
      
      // Determinar qué campo usar según el tipo de documento
      let fieldName: string
      let prefix: string
      
      if (documentType === 'tiquetes') {
        fieldName = 'consecutiveTK'
        prefix = 'TE'
      } else if (documentType === 'notas-credito') {
        fieldName = 'consecutiveNT'
        prefix = 'NC'
      } else {
        // Por defecto: facturas
        fieldName = 'consecutive'
        prefix = 'FE'
      }
      
      // Obtener el consecutivo actual (si no existe, usar 0)
      const currentConsecutive = companyData[fieldName] ?? 0
      const newConsecutive = currentConsecutive + 1

      // Actualizar el consecutivo en la empresa
      const updateData: any = {
        [fieldName]: newConsecutive,
        updatedAt: serverTimestamp()
      }
      
      await updateDoc(companyRef, updateData)

      const consecutiveFormatted = `${prefix}-${newConsecutive.toString().padStart(10, '0')}`

      console.log('✅ Consecutivo actualizado:', {
        campo: fieldName,
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
   * @param companyId ID de la empresa
   * @param documentType Tipo de documento: 'facturas' (consecutive), 'tiquetes' (consecutiveTK), 'notas-credito' (consecutiveNT)
   */
  static async getAndUpdateConsecutive(companyId: string, documentType?: 'facturas' | 'tiquetes' | 'notas-credito'): Promise<ConsecutiveResult> {
    try {
      console.log('🚀 Proceso completo de consecutivo para empresa:', companyId, 'tipo:', documentType || 'facturas')

      // 1. Obtener el siguiente consecutivo
      const getResult = await this.getNextConsecutive(companyId, documentType)
      if (!getResult.success) {
        return getResult
      }

      // 2. Actualizar el consecutivo en la empresa
      const updateResult = await this.updateCompanyConsecutive(companyId, documentType)
      if (!updateResult.success) {
        return updateResult
      }

      console.log('✅ Proceso de consecutivo completado:', updateResult.consecutive)

      return {
        success: true,
        consecutive: updateResult.consecutive
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
