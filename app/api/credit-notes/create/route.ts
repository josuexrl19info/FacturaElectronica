import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, doc, getDoc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'
import { HaciendaKeyGenerator } from '@/lib/services/hacienda-key-generator'
import { CreditNoteGenerator, CreditNoteData } from '@/lib/services/credit-note-generator'
import { DigitalSignatureService } from '@/lib/services/digital-signature'
import { HaciendaAuthService } from '@/lib/services/hacienda-auth'
import { HaciendaSubmissionService } from '@/lib/services/hacienda-submission'
import { HaciendaStatusService } from '@/lib/services/hacienda-status'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      referenciaFactura,
      tipoNotaCredito,
      razon,
      esAnulacionTotal,
      itemsAfectados,
      companyId,
      tenantId,
      invoiceId
    } = body

    console.log('📝 Creando Nota de Crédito...')
    console.log('📋 Referencia a factura:', referenciaFactura.consecutivo)
    console.log('📋 Tipo NC:', tipoNotaCredito)
    console.log('📋 Es anulación total:', esAnulacionTotal)

    // 1. Obtener datos de la empresa
    const companyDoc = await getDoc(doc(db, 'companies', companyId))
    if (!companyDoc.exists()) {
      return NextResponse.json(
        { error: 'Empresa no encontrada' },
        { status: 404 }
      )
    }

    const companyData = companyDoc.data()
    console.log('🏢 Empresa obtenida:', companyData.name)
    console.log('🔍 Campos de la empresa:', Object.keys(companyData))
    console.log('🔑 Certificado disponible:', !!companyData.certificadoDigital?.fileData)
    console.log('🔒 Password certificado disponible:', !!companyData.certificadoDigital?.password)

    // 2. Obtener datos de la factura original (si viene de la BD)
    let invoiceData: any = null
    if (invoiceId) {
      const invoiceDoc = await getDoc(doc(db, 'invoices', invoiceId))
      if (invoiceDoc.exists()) {
        invoiceData = { id: invoiceDoc.id, ...invoiceDoc.data() }
        console.log('📄 Factura original obtenida:', invoiceData.consecutivo)
      }
    }

    // 3. Generar consecutivo para la NC usando consecutiveNT de la empresa
    const currentConsecutiveNT = companyData.consecutiveNT || 0
    const nextConsecutiveNT = currentConsecutiveNT + 1
    
    // Actualizar el consecutiveNT en la empresa
    await updateDoc(doc(db, 'companies', companyId), {
      consecutiveNT: nextConsecutiveNT,
      updatedAt: serverTimestamp()
    })
    
    const consecutivoNC = `NC-${String(nextConsecutiveNT).padStart(10, '0')}`
    console.log('✅ Consecutivo NC generado:', consecutivoNC, '(consecutiveNT:', nextConsecutiveNT, ')')

    // 4. Generar clave de Hacienda para la NC
    const fechaCostaRica = new Date().toLocaleString('sv-SE', { timeZone: 'America/Costa_Rica' }).replace(' ', 'T')
    const fechaParaClave = new Date(fechaCostaRica)

    const keyResult = HaciendaKeyGenerator.generateKey({
      fecha: fechaParaClave,
      cedulaEmisor: companyData.identification || '',
      consecutivo: consecutivoNC,
      pais: companyData.countryCode || '506',
      situacion: '1',
      tipoComprobante: '03' // Nota de crédito electrónica
    })

    if (!keyResult.success) {
      return NextResponse.json(
        { error: `Error al generar clave: ${keyResult.error}` },
        { status: 400 }
      )
    }

    const claveNC = keyResult.clave!
    console.log('✅ Clave NC generada:', claveNC)
    
    // Extraer el consecutivo de 20 dígitos de la clave (posiciones 21-40, índice 21-41)
    const consecutivo20Digitos = claveNC.substring(21, 41)
    console.log('✅ Consecutivo 20 dígitos extraído:', consecutivo20Digitos)

    // 5. Preparar datos para el XML de NC
    const clientData = invoiceData?.cliente || referenciaFactura.datosFactura?.emisor
    
    // Determinar items a incluir en la NC
    let itemsNC = []
    if (esAnulacionTotal && invoiceData) {
      // Si es anulación total, incluir todos los items de la factura original
      itemsNC = invoiceData.items || []
      console.log('📦 Items de la factura original:', JSON.stringify(itemsNC[0], null, 2))
    } else if (!esAnulacionTotal && itemsAfectados && invoiceData) {
      // Si es parcial, solo los items seleccionados
      itemsNC = invoiceData.items.filter((item: any) => itemsAfectados.includes(item.id || `item-${item.numeroLinea}`))
      console.log('📦 Items seleccionados:', JSON.stringify(itemsNC[0], null, 2))
    } else if (referenciaFactura.datosFactura?.items) {
      // Si viene de XML subido, usar esos items
      itemsNC = referenciaFactura.datosFactura.items
      console.log('📦 Items del XML subido:', JSON.stringify(itemsNC[0], null, 2))
    }

    // 6. Construir datos de la NC
    const creditNoteData: CreditNoteData = {
      referenciaFactura: {
        tipoDoc: '01', // Factura electrónica
        numero: referenciaFactura.clave,
        fechaEmision: referenciaFactura.fechaEmision,
        codigo: tipoNotaCredito,
        razon: razon
      },
      clave: claveNC,
      consecutivo: consecutivo20Digitos, // Consecutivo de 20 dígitos
      fechaEmision: fechaCostaRica,
      emisor: {
        nombre: companyData.name || '',
        identificacion: (companyData.identification || '').replace(/-/g, ''),
        tipoIdentificacion: companyData.identificationType || '02',
        nombreComercial: companyData.commercialName || companyData.name || '',
        ubicacion: {
          provincia: companyData.provincia || companyData.province || '1',
          canton: companyData.canton || '01',
          distrito: companyData.distrito || companyData.district || '01',
          otrasSenas: companyData.otrasSenas || companyData.address || ''
        },
        telefono: {
          codigoPais: companyData.phoneCountryCode?.replace('+', '') || '506',
          numero: companyData.phone || ''
        },
        correoElectronico: companyData.email || ''
      },
      receptor: clientData ? {
        nombre: clientData.nombre || clientData.name || '',
        identificacion: (clientData.identificacion || clientData.identification || '').replace(/-/g, ''),
        tipoIdentificacion: clientData.tipoIdentificacion || clientData.identificationType || '01',
        nombreComercial: clientData.nombreComercial || clientData.commercialName || clientData.nombre || clientData.name,
        ubicacion: {
          provincia: clientData.provincia || clientData.province || '1',
          canton: clientData.canton || '01',
          distrito: clientData.distrito || clientData.district || '01',
          otrasSenas: clientData.otrasSenas || clientData.direccion || ''
        },
        telefono: clientData.telefono || clientData.phone ? {
          codigoPais: clientData.phoneCountryCode?.replace('+', '') || '506',
          numero: clientData.telefono || clientData.phone || ''
        } : undefined,
        correoElectronico: clientData.email || clientData.correo
      } : undefined,
      actividadEconomicaEmisor: companyData.economicActivity?.codigo,
      actividadEconomicaReceptor: clientData?.economicActivity?.codigo,
      condicionVenta: invoiceData?.condicionVenta || '01',
      medioPago: invoiceData?.paymentMethod || '01',
      items: itemsNC.map((item: any, index: number) => {
        // Calcular valores base
        const cantidad = item.cantidad || 1
        const precioUnitario = item.precioUnitario || item.precio || 0
        const montoTotal = item.montoTotal || (cantidad * precioUnitario)
        const subtotal = item.subtotal || montoTotal
        const baseImponible = item.baseImponible || subtotal
        
        // Determinar impuesto
        let impuestoData = null
        let impuestoNeto = 0
        
        // El impuesto puede venir como array o como objeto
        const impuestoItem = Array.isArray(item.impuesto) ? item.impuesto[0] : item.impuesto
        
        if (impuestoItem && impuestoItem.monto !== undefined) {
          // Si ya tiene impuesto definido, usarlo
          impuestoData = {
            codigo: impuestoItem.codigo || '02',
            codigoTarifa: impuestoItem.codigoTarifa || impuestoItem.codigoTarifaIVA || '08',
            tarifa: impuestoItem.tarifa || 13,
            monto: impuestoItem.monto
          }
          impuestoNeto = impuestoItem.monto
        } else if (item.impuestoNeto && item.impuestoNeto > 0) {
          // Si tiene impuestoNeto, calcular desde ahí
          impuestoNeto = item.impuestoNeto
          const tarifa = item.taxRate || 13
          impuestoData = {
            codigo: '02',
            codigoTarifa: tarifa === 13 ? '08' : '01',
            tarifa: tarifa,
            monto: impuestoNeto
          }
        } else if (item.taxRate && item.taxRate > 0) {
          // Si tiene taxRate, calcular el impuesto
          const tarifa = item.taxRate
          impuestoNeto = (baseImponible * tarifa) / 100
          impuestoData = {
            codigo: '02',
            codigoTarifa: tarifa === 13 ? '08' : '01',
            tarifa: tarifa,
            monto: impuestoNeto
          }
        }
        
        const montoTotalLinea = item.montoTotalLinea || (subtotal + impuestoNeto)
        
        console.log(`📦 Item ${index + 1} mapeado:`, {
          impuestoOriginal: item.impuesto,
          impuestoItem: impuestoItem,
          impuestoData: impuestoData,
          impuestoNeto: impuestoNeto
        })
        
        return {
          numeroLinea: index + 1,
          codigoCABYS: item.codigoCABYS || '8399000000000',
          cantidad,
          unidadMedida: item.unidadMedida || 'Sp',
          detalle: item.detalle || item.descripcion || item.description,
          precioUnitario,
          montoTotal,
          subtotal,
          baseImponible,
          impuesto: impuestoData,
          impuestoNeto,
          montoTotalLinea
        }
      }),
      resumen: {
        codigoTipoMoneda: {
          codigoMoneda: invoiceData?.currency || 'CRC',
          tipoCambio: invoiceData?.exchangeRate || 1
        },
        totalServGravados: itemsNC.reduce((sum: number, item: any) => sum + (item.impuestoNeto || 0), 0),
        totalServExentos: 0,
        totalServExonerado: 0,
        totalMercanciasGravadas: 0,
        totalMercanciasExentas: 0,
        totalMercanciasExoneradas: 0,
        totalGravado: itemsNC.reduce((sum: number, item: any) => sum + (item.baseImponible || 0), 0),
        totalExento: 0,
        totalExonerado: 0,
        totalVenta: itemsNC.reduce((sum: number, item: any) => sum + (item.montoTotalLinea || 0), 0),
        totalDescuentos: 0,
        totalVentaNeta: itemsNC.reduce((sum: number, item: any) => sum + (item.montoTotalLinea || 0), 0),
        totalImpuesto: itemsNC.reduce((sum: number, item: any) => sum + (item.impuestoNeto || 0), 0),
        totalComprobante: itemsNC.reduce((sum: number, item: any) => sum + (item.montoTotalLinea || 0), 0)
      }
    }

    // 7. Generar XML
    console.log('📄 Generando XML de Nota de Crédito...')
    const xml = CreditNoteGenerator.generateXML(creditNoteData)
    console.log('✅ XML generado exitosamente')

    // 8. Firmar XML
    console.log('🔐 Firmando XML...')
    const signResult = await DigitalSignatureService.signXMLWithEncryptedPassword(
      xml,
      companyData.certificadoDigital?.fileData,
      companyData.certificadoDigital?.password
    )

    if (!signResult.success) {
      return NextResponse.json(
        { error: `Error al firmar XML: ${signResult.error}` },
        { status: 400 }
      )
    }

    const signedXml = signResult.signed_xml!
    console.log('✅ XML firmado exitosamente')

    // 9. Autenticar con Hacienda para obtener token
    console.log('🏛️ Iniciando autenticación con Hacienda...')
    let haciendaToken = null
    
    if (companyData.atvCredentials) {
      const authResult = await HaciendaAuthService.authenticateFromCompany(companyData)
      
      if (authResult.success) {
        haciendaToken = authResult.accessToken
        console.log('✅ Autenticación con Hacienda exitosa')
        console.log('🎫 Token obtenido:', haciendaToken?.substring(0, 50) + '...')
        console.log('⏰ Expira en:', authResult.expiresIn, 'segundos')
      } else {
        console.error('❌ Error en autenticación con Hacienda:', authResult.error)
        return NextResponse.json(
          { error: `Error al autenticar con Hacienda: ${authResult.error}` },
          { status: 400 }
        )
      }
    } else {
      console.log('⚠️ No hay credenciales ATV configuradas')
      return NextResponse.json(
        { error: 'No hay credenciales ATV configuradas para esta empresa' },
        { status: 400 }
      )
    }
    
    // 10. Enviar a Hacienda
    console.log('📤 Enviando a Hacienda...')
    
    // Crear datos de la nota de crédito para el envío
    const creditNoteForSubmission = {
      clave: claveNC,
      fecha: fechaCostaRica,
      emisor: {
        tipoIdentificacion: companyData.identificationType || '02',
        numeroIdentificacion: (companyData.identification || '').replace(/-/g, '')
      },
      receptor: {
        tipoIdentificacion: invoiceData?.cliente?.tipoIdentificacion || '02',
        numeroIdentificacion: (invoiceData?.cliente?.identificacion || '').replace(/-/g, '')
      }
    }
    
    const submissionResult = await HaciendaSubmissionService.submitDocument(
      creditNoteForSubmission,
      signedXml,
      haciendaToken!,
      companyData
    )

    if (!submissionResult.success) {
      return NextResponse.json(
        { error: `Error al enviar a Hacienda: ${submissionResult.error}` },
        { status: 400 }
      )
    }

    console.log('✅ Enviado a Hacienda exitosamente')

    // 11. Guardar en Firestore
    const creditNoteRecord = {
      consecutivo: consecutivoNC, // Consecutivo corto para display (NC-0000000016)
      consecutivo20Digitos: consecutivo20Digitos, // Consecutivo de 20 dígitos para XML
      clave: claveNC,
      tipo: 'nota-credito',
      tipoNotaCredito,
      razon,
      esAnulacionTotal,
      referenciaFactura: {
        facturaId: invoiceId,
        clave: referenciaFactura.clave,
        consecutivo: referenciaFactura.consecutivo
      },
      companyId,
      tenantId,
      clientId: invoiceData?.clientId,
      cliente: clientData,
      xml,
      xmlSigned: signedXml,
      items: itemsNC,
      total: creditNoteData.resumen.totalComprobante,
      subtotal: creditNoteData.resumen.totalVenta,
      totalImpuesto: creditNoteData.resumen.totalImpuesto,
      currency: invoiceData?.currency || 'CRC',
      status: 'Enviando Hacienda',
      haciendaSubmission: submissionResult.response,
      createdAt: serverTimestamp(),
      createdBy: tenantId
    }

    const docRef = await addDoc(collection(db, 'creditNotes'), creditNoteRecord)
    console.log('✅ Nota de Crédito guardada:', docRef.id)

    // 12. Consultar estado real de Hacienda después de 10 segundos
    if (submissionResult.response && (submissionResult.response as any).location) {
      const locationUrl = (submissionResult.response as any).location
      
      // Validar URL de location
      if (!HaciendaStatusService.validateLocationUrl(locationUrl)) {
        console.error('❌ URL de location inválida:', locationUrl)
        await updateDoc(docRef, {
          status: 'Error URL Inválida',
          haciendaSubmission: {
            error: 'URL de location inválida',
            locationUrl: locationUrl
          },
          updatedAt: serverTimestamp()
        })
      } else {
        console.log('⏰ Esperando 10 segundos para consultar estado real de Hacienda...')
        
        // Esperar 10 segundos
        await new Promise(resolve => setTimeout(resolve, 10000))
        
        console.log('🔍 Consultando estado real de Hacienda...')
        console.log('📍 URL de consulta:', locationUrl)
        
        // Usar el servicio de consulta de estado
        const statusResult = await HaciendaStatusService.checkDocumentStatus(locationUrl, haciendaToken!)
        
        if (statusResult.success) {
          console.log('✅ Estado real obtenido de Hacienda:', statusResult.status)
          
          // Usar el campo "ind-estado" de la respuesta de Hacienda
          const estadoHacienda = statusResult.status['ind-estado'] || statusResult.status.estado || statusResult.status.state
          
          // Interpretar el estado
          const interpretedStatus = HaciendaStatusService.interpretStatus(statusResult.status)
          
          // Actualizar la nota de crédito con el estado real
          await updateDoc(docRef, {
            haciendaSubmission: statusResult.status,
            status: estadoHacienda || interpretedStatus.status,
            statusDescription: interpretedStatus.description,
            isFinalStatus: interpretedStatus.isFinal,
            updatedAt: serverTimestamp()
          })
          
          console.log('✅ Nota de Crédito actualizada con estado real de Hacienda:', interpretedStatus.status)
        } else {
          console.error('❌ Error al consultar estado de Hacienda:', statusResult.error)
          await updateDoc(docRef, {
            status: 'Error Consulta Estado',
            statusDescription: statusResult.error,
            updatedAt: serverTimestamp()
          })
        }
      }
    } else {
      console.log('⚠️ No hay location URL para consultar estado')
    }

    return NextResponse.json({
      success: true,
      creditNoteId: docRef.id,
      consecutivo: consecutivoNC,
      clave: claveNC
    })

  } catch (error) {
    console.error('❌ Error creando nota de crédito:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

/**
 * Obtiene el siguiente consecutivo para notas de crédito
 */
async function getNextConsecutivo(companyId: string): Promise<{ success: boolean; consecutivo?: string; error?: string }> {
  try {
    const companyRef = doc(db, 'companies', companyId)
    const companySnap = await getDoc(companyRef)
    
    if (!companySnap.exists()) {
      return { success: false, error: 'Empresa no encontrada' }
    }

    const companyData = companySnap.data()
    const currentConsecutive = companyData.consecutiveNC || 0
    const newConsecutive = currentConsecutive + 1

    // Actualizar el consecutivo en la empresa
    await updateDoc(companyRef, {
      consecutiveNC: newConsecutive
    })

    // Formatear como NC-0000000001
    const formattedConsecutive = `NC-${String(newConsecutive).padStart(10, '0')}`
    
    return {
      success: true,
      consecutivo: formattedConsecutive
    }
  } catch (error) {
    console.error('Error obteniendo consecutivo:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Calcula el resumen de totales de la NC
 */
function calculateResumen(items: any[], currency: string, exchangeRate: number) {
  const totalGravado = items.reduce((sum, item) => sum + (item.baseImponible || item.montoTotal || 0), 0)
  const totalImpuesto = items.reduce((sum, item) => sum + (item.impuestoNeto || item.impuesto?.monto || 0), 0)
  const totalVenta = totalGravado
  const totalVentaNeta = totalVenta
  const totalComprobante = totalVenta + totalImpuesto

  return {
    codigoTipoMoneda: {
      codigoMoneda: currency,
      tipoCambio: exchangeRate
    },
    totalServGravados: totalGravado,
    totalGravado,
    totalExento: 0,
    totalExonerado: 0,
    totalVenta,
    totalVentaNeta,
    totalImpuesto,
    totalComprobante
  }
}

// Permitir que esta ruta se exporte estáticamente
export async function generateStaticParams() {
  return []
}

