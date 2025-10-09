import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, query, where, getDocs } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'
import { HaciendaKeyGenerator } from '@/lib/services/hacienda-key-generator'
import { CreditNoteGenerator, CreditNoteData } from '@/lib/services/credit-note-generator'
import { DigitalSignatureService } from '@/lib/services/digital-signature'
import { HaciendaAuthService } from '@/lib/services/hacienda-auth'
import { HaciendaSubmissionService } from '@/lib/services/hacienda-submission'
import { HaciendaStatusService } from '@/lib/services/hacienda-status'
import { XMLParser } from '@/lib/services/xml-parser'
import { InvoiceEmailService } from '@/lib/services/invoice-email-service'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      facturaData: facturaDataFromFrontend,
      xmlFacturaOriginal,
      tipoNotaCredito,
      razon,
      esAnulacionTotal,
      itemsAfectados,
      companyId,
      tenantId
    } = body

    console.log('📝 Creando Nota de Crédito...')
    console.log('📋 Tipo NC:', tipoNotaCredito)
    console.log('📋 Es anulación total:', esAnulacionTotal)
    console.log('📄 XML original disponible:', !!xmlFacturaOriginal)
    console.log('📊 Datos parseados del frontend disponibles:', !!facturaDataFromFrontend)

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
    console.log('🔑 Certificado disponible:', !!companyData.certificadoDigital?.fileData)
    console.log('🔒 Password certificado disponible:', !!companyData.certificadoDigital?.password)

    // 2. Usar datos parseados del frontend o parsear XML en el backend
    let facturaData
    if (facturaDataFromFrontend) {
      console.log('📊 Usando datos parseados del frontend')
      facturaData = facturaDataFromFrontend
      console.log('✅ Factura:', facturaData.consecutivo)
      console.log('🔍 Datos del frontend:', {
        tieneEmisor: !!facturaData.emisor,
        tieneReceptor: !!facturaData.receptor,
        tieneCondicionVenta: !!facturaData.condicionVenta,
        tieneMedioPago: !!facturaData.medioPago,
        cantidadItems: facturaData.items?.length || 0,
        primerItem: facturaData.items?.[0] ? {
          tieneCodigoCABYS: !!facturaData.items[0].codigoCABYS,
          tieneUnidadMedida: !!facturaData.items[0].unidadMedida,
          tieneSubtotal: !!facturaData.items[0].subtotal,
          tieneBaseImponible: !!facturaData.items[0].baseImponible,
          tieneMontoTotalLinea: !!facturaData.items[0].montoTotalLinea
        } : null,
        resumen: {
          tieneTipoCambio: facturaData.resumen?.tipoCambio !== undefined,
          tieneTotalGravado: facturaData.resumen?.totalGravado !== undefined,
          tieneTotalVentaNeta: facturaData.resumen?.totalVentaNeta !== undefined
        }
      })
    } else if (xmlFacturaOriginal) {
      console.log('📄 Parseando XML de factura original en backend...')
      facturaData = XMLParser.parseInvoiceXML(xmlFacturaOriginal)
      console.log('✅ Factura parseada:', facturaData.consecutivo)
    } else {
      return NextResponse.json(
        { error: 'No se proporcionó XML ni datos de la factura original' },
        { status: 400 }
      )
    }
    
    // 2.5. Usar datos del XML parseado (ya contiene toda la información necesaria)
    const clienteCompleto = facturaData.receptor
    const formaPagoOriginal = facturaData.medioPago || '01'
    
    console.log('📊 Datos de la factura original (del XML):', {
      clave: facturaData.clave,
      consecutivo: facturaData.consecutivo,
      medioPago: facturaData.medioPago,
      condicionVenta: facturaData.condicionVenta,
      tieneReceptor: !!facturaData.receptor,
      receptorNombre: facturaData.receptor?.nombre
    })

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

    // 5. Determinar items a incluir en la NC (desde el XML parseado)
    let itemsNC = []
    if (esAnulacionTotal) {
      // Si es anulación total, incluir todos los items de la factura
      itemsNC = facturaData.items
      console.log('📦 Items de la factura (anulación total):', itemsNC.length)
    } else if (itemsAfectados && itemsAfectados.length > 0) {
      // Si es parcial, solo los items seleccionados por número de línea
      itemsNC = facturaData.items.filter((item: any) => 
        itemsAfectados.includes(item.numeroLinea)
      )
      console.log('📦 Items seleccionados (parcial):', itemsNC.length)
    } else {
      // Por defecto, todos los items
      itemsNC = facturaData.items
      console.log('📦 Items por defecto:', itemsNC.length)
    }
    
    if (itemsNC.length > 0) {
      console.log('📦 Primer item:', JSON.stringify(itemsNC[0], null, 2))
    }

    // 6. Construir datos de la NC usando datos parseados del XML
    const creditNoteData: CreditNoteData = {
      referenciaFactura: {
        tipoDoc: '01', // Factura electrónica
        numero: facturaData.clave,
        fechaEmision: facturaData.fechaEmision,
        codigo: tipoNotaCredito,
        razon: razon
      },
      clave: claveNC,
      consecutivo: consecutivo20Digitos, // Consecutivo de 20 dígitos
      fechaEmision: fechaCostaRica,
      // Emisor: usar datos del XML parseado (quien emitió la factura original)
      emisor: {
        nombre: facturaData.emisor.nombre,
        identificacion: facturaData.emisor.identificacion,
        tipoIdentificacion: facturaData.emisor.tipoIdentificacion,
        nombreComercial: facturaData.emisor.nombreComercial,
        ubicacion: facturaData.emisor.ubicacion,
        telefono: facturaData.emisor.telefono,
        correoElectronico: facturaData.emisor.correoElectronico
      },
      // Receptor: usar datos parseados del XML (el receptor de la factura original)
      receptor: {
        nombre: facturaData.receptor.nombre || '',
        identificacion: facturaData.receptor.identificacion || '',
        tipoIdentificacion: facturaData.receptor.tipoIdentificacion || '01',
        nombreComercial: facturaData.receptor.nombreComercial || facturaData.receptor.nombre || '',
        ubicacion: facturaData.receptor.ubicacion || {
          provincia: '1',
          canton: '01',
          distrito: '01',
          otrasSenas: ''
        },
        telefono: facturaData.receptor.telefono,
        correoElectronico: facturaData.receptor.correoElectronico || ''
      },
      actividadEconomicaEmisor: companyData.economicActivity?.codigo,
      actividadEconomicaReceptor: clienteCompleto.codigoActividadReceptor || undefined, // Del XML de la factura
      condicionVenta: facturaData.condicionVenta,
      medioPago: formaPagoOriginal, // Usar el medioPago de la factura original
      // Items: ya vienen parseados del XML con la estructura correcta, agregar valores por defecto
      items: itemsNC.map((item: any, index: number) => ({
        numeroLinea: index + 1,
        codigoCABYS: item.codigoCABYS || '8399000000000',
        cantidad: item.cantidad || 1,
        unidadMedida: item.unidadMedida || 'Sp',
        detalle: item.detalle || '',
        precioUnitario: item.precioUnitario || 0,
        montoTotal: item.montoTotal || 0,
        subtotal: item.subtotal || item.montoTotal || 0,
        baseImponible: item.baseImponible || item.subtotal || item.montoTotal || 0,
        impuesto: item.impuesto, // Ya viene con la estructura correcta del XML
        impuestoNeto: item.impuestoNeto || 0,
        montoTotalLinea: item.montoTotalLinea || (item.subtotal || item.montoTotal || 0) + (item.impuestoNeto || 0)
      })),
      // Resumen: usar datos parseados del XML de la factura original con valores por defecto
      resumen: {
        codigoTipoMoneda: {
          codigoMoneda: facturaData.resumen.codigoMoneda || 'CRC',
          tipoCambio: facturaData.resumen.tipoCambio || 1
        },
        totalServGravados: facturaData.resumen.totalServGravados || 0,
        totalServExentos: facturaData.resumen.totalServExentos || 0,
        totalServExonerado: facturaData.resumen.totalServExonerado || 0,
        totalMercanciasGravadas: facturaData.resumen.totalMercanciasGravadas || 0,
        totalMercanciasExentas: facturaData.resumen.totalMercanciasExentas || 0,
        totalMercanciasExoneradas: facturaData.resumen.totalMercanciasExoneradas || 0,
        totalGravado: facturaData.resumen.totalGravado || 0,
        totalExento: facturaData.resumen.totalExento || 0,
        totalExonerado: facturaData.resumen.totalExonerado || 0,
        totalVenta: facturaData.resumen.totalVenta || 0,
        totalDescuentos: facturaData.resumen.totalDescuentos || 0,
        totalVentaNeta: facturaData.resumen.totalVentaNeta || 0,
        // Agregar TotalDesgloseImpuesto si hay impuestos
        totalDesgloseImpuesto: (facturaData.resumen.totalImpuesto || 0) > 0 ? {
          codigo: '01', // IVA
          codigoTarifaIVA: '08', // 13%
          totalMontoImpuesto: facturaData.resumen.totalImpuesto || 0
        } : undefined,
        totalImpuesto: facturaData.resumen.totalImpuesto || 0,
        totalComprobante: facturaData.resumen.totalComprobante || 0
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
        tipoIdentificacion: facturaData.emisor.tipoIdentificacion,
        numeroIdentificacion: facturaData.emisor.identificacion
      },
      receptor: {
        tipoIdentificacion: facturaData.receptor.tipoIdentificacion,
        numeroIdentificacion: facturaData.receptor.identificacion
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
        clave: facturaData.clave,
        consecutivo: facturaData.consecutivo,
        fechaEmision: facturaData.fechaEmision
      },
      companyId,
      tenantId,
      cliente: clienteCompleto, // Cliente completo con economicActivity de Firestore
      formaPago: formaPagoOriginal, // Forma de pago de la factura original (de Firestore o XML)
      condicionVenta: facturaData.condicionVenta || '01', // Condición de venta
      xml,
      xmlSigned: signedXml,
      xmlFacturaOriginal, // Guardar el XML original de la factura
      items: itemsNC,
      total: creditNoteData.resumen.totalComprobante,
      subtotal: creditNoteData.resumen.totalVenta,
      totalImpuesto: creditNoteData.resumen.totalImpuesto,
      currency: facturaData.resumen.codigoMoneda,
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
          
          // Si la NC fue aceptada, enviar email al cliente
          if (interpretedStatus.status === 'aceptado' || estadoHacienda === 'aceptado') {
            console.log('🎉 Nota de Crédito APROBADA - Enviando email al cliente...')
            
            try {
              // Crear la NC completa con todos los datos actualizados
              const completeCreditNoteData = {
                ...creditNoteRecord,
                id: docRef.id,
                status: interpretedStatus.status,
                statusDescription: interpretedStatus.description,
                isFinalStatus: interpretedStatus.isFinal,
                haciendaSubmission: statusResult.status,
                xmlSigned: signedXml,
                tipo: 'nota-credito' // Identificar como NC para el email
              }
              
              console.log('📧 Enviando email con NC completa:', {
                id: completeCreditNoteData.id,
                consecutivo: completeCreditNoteData.consecutivo,
                hasXmlSigned: !!completeCreditNoteData.xmlSigned,
                hasHaciendaSubmission: !!completeCreditNoteData.haciendaSubmission,
                hasRespuestaXml: !!completeCreditNoteData.haciendaSubmission?.['respuesta-xml']
              })
              
              // Usar el mismo servicio de email (adaptado para NC)
              const emailResult = await InvoiceEmailService.sendApprovalEmail(completeCreditNoteData as any)
              
              if (emailResult.success) {
                console.log('✅ Email de aprobación enviado exitosamente')
                console.log('📧 Message ID:', emailResult.messageId)
                
                // Actualizar NC con información del email enviado
                await updateDoc(docRef, {
                  emailSent: true,
                  emailSentAt: serverTimestamp(),
                  emailMessageId: emailResult.messageId,
                  emailDeliveredTo: emailResult.deliveredTo
                })
              } else {
                console.error('❌ Error enviando email de aprobación:', emailResult.error)
                
                // Marcar que hubo error enviando email
                await updateDoc(docRef, {
                  emailError: emailResult.error,
                  emailErrorAt: serverTimestamp()
                })
              }
            } catch (emailError) {
              console.error('❌ Error en proceso de email:', emailError)
              
              // Marcar error en la NC
              await updateDoc(docRef, {
                emailError: emailError instanceof Error ? emailError.message : 'Error desconocido',
                emailErrorAt: serverTimestamp()
              })
            }
          }
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

