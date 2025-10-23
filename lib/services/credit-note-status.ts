import { getFirestore, doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'
import { HaciendaStatusService } from '@/lib/services/hacienda-status'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export interface StatusResult {
  success: boolean
  message?: string
  status?: string
  error?: string
  facturaAnulada?: {
    id: string
    consecutivo: string
    nuevoEstado: string
  }
}

/**
 * Función para consultar el estado de una nota de crédito
 * Optimizada para Vercel serverless functions
 */
export async function checkCreditNoteStatus(creditNoteId: string, locationUrl: string, accessToken: string): Promise<StatusResult> {
  try {
    if (!creditNoteId || !locationUrl || !accessToken) {
      return {
        success: false,
        error: 'creditNoteId, locationUrl y accessToken son requeridos'
      }
    }

    console.log('🔍 Consultando estado de nota de crédito:', creditNoteId)
    console.log('📍 URL:', locationUrl)
    console.log('🔑 Access Token disponible:', !!accessToken)

    // Validar URL de location
    if (!HaciendaStatusService.validateLocationUrl(locationUrl)) {
      return {
        success: false,
        error: 'URL de location inválida'
      }
    }

    // Consultar estado en Hacienda
    const statusResult = await HaciendaStatusService.checkDocumentStatus(locationUrl, accessToken)

    if (!statusResult.success) {
      return {
        success: false,
        error: statusResult.error
      }
    }

    // Interpretar el estado
    const interpretedStatus = HaciendaStatusService.interpretStatus(statusResult.status)

    // Actualizar la nota de crédito en Firestore
    try {
      const creditNoteRef = doc(db, 'creditNotes', creditNoteId)
      const creditNoteSnap = await getDoc(creditNoteRef)

      if (!creditNoteSnap.exists()) {
        return {
          success: false,
          error: 'Nota de crédito no encontrada'
        }
      }

      const creditNoteData = creditNoteSnap.data()
      
      await updateDoc(creditNoteRef, {
        haciendaSubmission: statusResult.status,
        status: interpretedStatus.status,
        statusDescription: interpretedStatus.description,
        isFinalStatus: interpretedStatus.isFinal,
        lastStatusCheck: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      console.log('✅ Nota de crédito actualizada con estado:', interpretedStatus.status)

      // 🚨 LÓGICA DE ANULACIÓN: Si es de tipo "Anulación" y fue aceptada
      console.log('🔍 Verificando condiciones para anulación:', {
        isFinal: interpretedStatus.isFinal,
        status: interpretedStatus.status,
        tipoNotaCredito: creditNoteData.tipoNotaCredito,
        esAnulacionTotal: creditNoteData.esAnulacionTotal
      })
      
      // Verificar si cumple las condiciones para anulación
      const cumpleCondiciones = interpretedStatus.isFinal && 
                                interpretedStatus.status === 'Aceptado' && 
                                creditNoteData.tipoNotaCredito === '01'
      
      console.log('🎯 ¿Cumple condiciones para anulación?', cumpleCondiciones)
      
      if (cumpleCondiciones) {
        console.log('🚨 Nota de crédito de ANULACIÓN aceptada - Buscando factura original para anular...')
        
        try {
          // Extraer consecutivo de la clave de la factura de referencia
          const facturaClave = creditNoteData.referenciaFactura?.clave
          
          console.log('📋 Datos de referencia de la NC:', {
            facturaClave: facturaClave,
            tenantId: creditNoteData.tenantId,
            companyId: creditNoteData.companyId
          })
          
          if (!facturaClave) {
            console.log('⚠️ No se encontró clave de factura de referencia en la nota de crédito')
            return {
              success: true,
              message: 'Nota de crédito actualizada, pero no se pudo anular la factura original (clave no encontrada)',
              status: interpretedStatus.status
            }
          }

          // Extraer consecutivo de la clave (posiciones 32-41 de la clave de 50 dígitos)
          // Ejemplo: 50621102500310286786000100001010000000060191797745
          //          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
          //          Posiciones 32-41: 0000000060
          const consecutivoFactura = facturaClave.substring(31, 41)
          const consecutivoFormateado = `FE-${consecutivoFactura}`
          
          console.log('🔍 Extracción de consecutivo:', {
            facturaClave: facturaClave,
            consecutivoExtraido: consecutivoFactura,
            consecutivoFormateado: consecutivoFormateado
          })

          // Buscar la factura original en Firestore
          const invoicesRef = collection(db, 'invoices')
          const q = query(
            invoicesRef,
            where('consecutivo', '==', consecutivoFormateado),
            where('tenantId', '==', creditNoteData.tenantId),
            where('companyId', '==', creditNoteData.companyId)
          )
          
          const querySnapshot = await getDocs(q)
          
          if (querySnapshot.empty) {
            console.log('⚠️ No se encontró la factura original para anular')
            console.log('🔍 Parámetros de búsqueda:', {
              consecutivo: consecutivoFormateado,
              tenantId: creditNoteData.tenantId,
              companyId: creditNoteData.companyId
            })
            
            // Log de facturas disponibles para debugging
            const allInvoicesRef = collection(db, 'invoices')
            const allQuery = query(
              allInvoicesRef,
              where('tenantId', '==', creditNoteData.tenantId),
              where('companyId', '==', creditNoteData.companyId)
            )
            const allQuerySnapshot = await getDocs(allQuery)
            
            if (!allQuerySnapshot.empty) {
              const firstInvoice = allQuerySnapshot.docs[0].data()
              console.log('📋 Facturas disponibles en la empresa:', {
                total: allQuerySnapshot.size,
                primeraFactura: {
                  consecutivo: firstInvoice.consecutivo,
                  tenantId: firstInvoice.tenantId,
                  companyId: firstInvoice.companyId
                }
              })
            }
            
            return {
              success: true,
              message: 'Nota de crédito actualizada, pero no se encontró la factura original para anular',
              status: interpretedStatus.status
            }
          }

          // Actualizar la factura original a "Anulada Completamente"
          const facturaDoc = querySnapshot.docs[0]
          const facturaRef = doc(db, 'invoices', facturaDoc.id)
          
          await updateDoc(facturaRef, {
            status: 'Anulada Completamente',
            anulacionData: {
              anuladaPor: 'Nota de Crédito',
              notaCreditoId: creditNoteId,
              notaCreditoConsecutivo: creditNoteData.consecutivo,
              fechaAnulacion: serverTimestamp(),
              motivo: 'Anulación Total vía Nota de Crédito'
            },
            updatedAt: serverTimestamp()
          })

          console.log('✅ Factura anulada exitosamente:', facturaDoc.id)
          console.log('📋 Datos de anulación:', {
            facturaId: facturaDoc.id,
            facturaConsecutivo: consecutivoFormateado,
            notaCreditoId: creditNoteId,
            notaCreditoConsecutivo: creditNoteData.consecutivo
          })

          return {
            success: true,
            message: 'Nota de crédito aceptada y factura original anulada exitosamente',
            status: interpretedStatus.status,
            facturaAnulada: {
              id: facturaDoc.id,
              consecutivo: consecutivoFormateado,
              nuevoEstado: 'Anulada Completamente'
            }
          }

        } catch (anulacionError) {
          console.error('❌ Error al anular la factura original:', anulacionError)
          
          return {
            success: true,
            message: 'Nota de crédito actualizada, pero hubo un error al anular la factura original',
            status: interpretedStatus.status,
            error: anulacionError instanceof Error ? anulacionError.message : 'Error desconocido'
          }
        }
      }

      // Si no es de tipo anulación o no fue aceptada, solo devolver el resultado normal
      return {
        success: true,
        message: 'Nota de crédito actualizada exitosamente',
        status: interpretedStatus.status
      }

    } catch (updateError) {
      console.error('❌ Error actualizando nota de crédito:', updateError)
      return {
        success: false,
        error: 'Error actualizando la nota de crédito en Firestore'
      }
    }

  } catch (error) {
    console.error('❌ Error consultando estado de nota de crédito:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}
