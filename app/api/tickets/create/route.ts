import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore'
import { firebaseConfig } from '@/lib/firebase-config'
import { XMLGenerator, FacturaData, ExoneracionXML } from '@/lib/services/xml-generator'
import { DigitalSignatureService } from '@/lib/services/digital-signature'
import { HaciendaAuthService } from '@/lib/services/hacienda-auth'
import { HaciendaSubmissionService } from '@/lib/services/hacienda-submission'
import { HaciendaStatusService } from '@/lib/services/hacienda-status'
import { InvoiceConsecutiveService } from '@/lib/services/invoice-consecutive'
import { HaciendaKeyGenerator } from '@/lib/services/hacienda-key-generator'
import { InvoiceEmailService } from '@/lib/services/invoice-email-service'
import { ExchangeRateService } from '@/lib/services/exchange-rate-service'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

/**
 * Obtiene el tipo de cambio para una moneda específica
 */
async function getExchangeRateForCurrency(currency: string): Promise<number> {
  if (currency?.toUpperCase() === 'USD') {
    console.log('💱 [ExchangeRate] Moneda USD detectada, obteniendo tipo de cambio de Hacienda...')
    const exchangeRate = await ExchangeRateService.getExchangeRate()
    
    if (exchangeRate) {
      console.log(`💱 [ExchangeRate] Tipo de cambio obtenido: ${exchangeRate} CRC por USD`)
      return exchangeRate
    } else {
      console.warn('💱 [ExchangeRate] No se pudo obtener tipo de cambio, usando 1 como fallback')
      return 1
    }
  }
  
  console.log(`💱 [ExchangeRate] Moneda ${currency}, usando tipo de cambio 1`)
  return 1
}

/**
 * Crea un nuevo tiquete electrónico en Firestore
 * El cliente es OPCIONAL para tiquetes
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Los datos ya vienen completos desde handleCreateDocument
    const { 
      consecutivo, // OPCIONAL - se generará automáticamente si no viene
      status,
      clientId, // OPCIONAL - puede ser vacío
      companyId,
      tenantId,
      subtotal,
      totalImpuesto,
      totalDescuento,
      total,
      exchangeRate,
      currency,
      condicionVenta,
      paymentTerm,
      paymentMethod,
      notes,
      items,
      createdBy
    } = body

    // Validar campos requeridos (clientId y consecutivo son opcionales)
    // El consecutivo se generará automáticamente usando consecutiveTK
    if (!companyId || !tenantId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Validar que todos los precios unitarios sean mayores a 0
    const itemsConPrecioInvalido = items.filter((item: any) => {
      const precioUnitario = item.precioUnitario || 0
      return precioUnitario <= 0
    })

    if (itemsConPrecioInvalido.length > 0) {
      return NextResponse.json(
        { error: `El precio unitario debe ser mayor a cero en todas las líneas. Líneas con precio inválido: ${itemsConPrecioInvalido.map((item: any, idx: number) => idx + 1).join(', ')}` },
        { status: 400 }
      )
    }

    // Inicializar Firebase si no está inicializado
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    const db = getFirestore(app)

    let docRef: any = null
    let generatedConsecutivo: string | undefined = consecutivo // Se sobrescribirá con el consecutivo generado
    let clientData: any = null
    let clientExoneracion: ExoneracionXML | undefined = undefined

    // Generar XML, firmar y enviar a Hacienda
    try {
      console.log('🔧 Iniciando generación de XML para tiquete...')
      
      // Obtener datos de la empresa para generar XML
      const companyDoc = await getDoc(doc(db, 'companies', companyId))
      if (!companyDoc.exists()) {
        throw new Error('Empresa no encontrada')
      }

      const companyData = companyDoc.data()
      console.log('📋 Datos de empresa obtenidos:', companyData.nombreComercial)

      // Obtener datos del cliente SOLO si se proporcionó clientId
      if (clientId && clientId !== '') {
        const clientDoc = await getDoc(doc(db, 'clients', clientId))
        if (clientDoc.exists()) {
          clientData = clientDoc.data()
          console.log('👤 Datos de cliente obtenidos:', clientData.name)
          console.log('🛡️ Cliente con exoneración:', clientData.tieneExoneracion)

          // Mapear datos de exoneración del cliente para el XML
          if (clientData.tieneExoneracion && clientData.exoneracion) {
            console.log('🛡️ Cliente con exoneración detectada:', clientData.exoneracion)
            const fechaCostaRica = new Date().toLocaleString('sv-SE', { timeZone: 'America/Costa_Rica' }).replace(' ', 'T')
            
            const formatDateWithTimezone = (dateString: string): string => {
              if (!dateString) return fechaCostaRica + '-06:00'
              if (dateString.includes('T') && (dateString.includes('+') || dateString.includes('-'))) {
                return dateString
              }
              if (dateString.includes('T')) {
                return dateString + '-06:00'
              }
              return dateString + 'T00:00:00-06:00'
            }

            clientExoneracion = {
              tipoDocumento: clientData.exoneracion.tipoDocumento || '',
              tipoDocumentoOtro: clientData.exoneracion.tipoDocumentoOtro || undefined,
              numeroDocumento: clientData.exoneracion.numeroDocumento || '',
              nombreLey: clientData.exoneracion.nombreLey || undefined,
              articulo: clientData.exoneracion.articulo ? parseInt(clientData.exoneracion.articulo) : undefined,
              inciso: clientData.exoneracion.inciso ? parseInt(clientData.exoneracion.inciso) : undefined,
              porcentajeCompra: clientData.exoneracion.porcentajeCompra ? parseFloat(clientData.exoneracion.porcentajeCompra) : undefined,
              nombreInstitucion: clientData.exoneracion.nombreInstitucion || '',
              nombreInstitucionOtros: clientData.exoneracion.nombreInstitucionOtros || undefined,
              fechaEmision: formatDateWithTimezone(clientData.exoneracion.fechaEmision),
              tarifaExonerada: parseFloat(clientData.exoneracion.tarifaExonerada) || 0,
              montoExoneracion: 0
            }
          } else if (clientData.hasExemption && clientData.exemption) {
            console.log('🛡️ Cliente con exoneración (formato legacy) detectada:', clientData.exemption)
            const fechaCostaRica = new Date().toLocaleString('sv-SE', { timeZone: 'America/Costa_Rica' }).replace(' ', 'T')
            
            const formatDateWithTimezone = (dateString: string): string => {
              if (!dateString) return fechaCostaRica + '-06:00'
              if (dateString.includes('T') && (dateString.includes('+') || dateString.includes('-'))) {
                return dateString
              }
              if (dateString.includes('T')) {
                return dateString + '-06:00'
              }
              return dateString + 'T00:00:00-06:00'
            }

            clientExoneracion = {
              tipoDocumento: clientData.exemption.exemptionType || '',
              tipoDocumentoOtro: clientData.exemption.exemptionTypeOthers || undefined,
              numeroDocumento: clientData.exemption.documentNumber || '',
              nombreLey: clientData.exemption.lawName || undefined,
              articulo: clientData.exemption.article ? parseInt(clientData.exemption.article) : undefined,
              inciso: clientData.exemption.subsection ? parseInt(clientData.exemption.subsection) : undefined,
              porcentajeCompra: clientData.exemption.purchasePercentage ? parseFloat(clientData.exemption.purchasePercentage) : undefined,
              nombreInstitucion: clientData.exemption.institutionName || '',
              nombreInstitucionOtros: clientData.exemption.institutionNameOthers || undefined,
              fechaEmision: formatDateWithTimezone(clientData.exemption.documentDate),
              tarifaExonerada: parseFloat(clientData.exemption.tariffExempted) || 0,
              montoExoneracion: 0
            }
          }
        } else {
          console.warn('⚠️ Cliente no encontrado, continuando sin cliente')
        }
      } else {
        console.log('ℹ️ Tiquete sin cliente - continuando con receptor genérico')
      }

      // Usar la misma fecha para la clave y fecha de emisión (zona horaria Costa Rica)
      const fechaCostaRica = new Date().toLocaleString('sv-SE', { timeZone: 'America/Costa_Rica' }).replace(' ', 'T')

      // SIEMPRE generar consecutivo usando el servicio (ignorar el que viene del frontend si existe)
      // Esto asegura que siempre use consecutiveTK de la empresa
      console.log('🔢 Generando consecutivo para tiquete usando consecutiveTK...')
      const consecutiveResult = await InvoiceConsecutiveService.getAndUpdateConsecutive(companyId, 'tiquetes')
      if (consecutiveResult.success && consecutiveResult.consecutive) {
        generatedConsecutivo = consecutiveResult.consecutive // Ya viene con formato TE-XXXXXXXXXX
        console.log('✅ Consecutivo generado:', generatedConsecutivo)
      } else {
        console.error('❌ Error al generar consecutivo:', consecutiveResult.error)
        throw new Error(`Error al generar consecutivo: ${consecutiveResult.error}`)
      }

      // Generar clave de Hacienda
      // IMPORTANTE: Para tiquetes electrónicos, el tipo de comprobante es '04'
      const fechaParaClave = new Date(fechaCostaRica)
      const keyResult = HaciendaKeyGenerator.generateKey({
        fecha: fechaParaClave,
        cedulaEmisor: companyData.identification || '',
        consecutivo: generatedConsecutivo,
        pais: companyData.countryCode || '506',
        situacion: '1', // Normal
        tipoComprobante: '04' // 04 = Tiquete Electrónico (01 = Factura Electrónica)
      })
      
      if (!keyResult.success) {
        throw new Error(`Error al generar clave: ${keyResult.error}`)
      }

      // Construir datos XML para el tiquete
      // IMPORTANTE: En tiquetes electrónicos, si no hay cliente, NO se incluye el bloque Receptor
      const receptorData: ReceptorData | null = clientData ? {
        nombre: clientData.name,
        tipoIdentificacion: clientData.identificationType,
        numeroIdentificacion: clientData.identification,
        nombreComercial: clientData.commercialName || clientData.name,
        provincia: clientData.province,
        canton: clientData.canton,
        distrito: clientData.district,
        otrasSenas: clientData.otrasSenas,
        codigoPais: clientData.phoneCountryCode?.replace('+', '') || '506',
        numeroTelefono: clientData.phone,
        correoElectronico: clientData.email
      } : null // Si no hay cliente, receptor es null (no se incluirá en XML)

      const tiqueteXMLData: FacturaData & { receptor?: ReceptorData | null } = {
        clave: keyResult.clave || '',
        proveedorSistemas: companyData.proveedorSistemas || companyData.identification || '3102867860', // Cédula del emisor como ProveedorSistemas
        codigoActividadEmisor: companyData.economicActivity?.codigo || '924909', // Igual que en facturas: usar .codigo del objeto economicActivity
        // NO incluir CodigoActividadReceptor en tiquetes
        numeroConsecutivo: keyResult.clave ? keyResult.clave.substring(21, 41) : '00100001040000000001', // Extraer los 20 dígitos del consecutivo de la clave
        fechaEmision: fechaCostaRica,
        emisor: {
          nombre: companyData.name,
          tipoIdentificacion: companyData.identificationType,
          numeroIdentificacion: companyData.identification,
          nombreComercial: companyData.nombreComercial,
          provincia: companyData.province,
          canton: companyData.canton,
          distrito: companyData.district,
          otrasSenas: companyData.otrasSenas,
          codigoPais: companyData.phoneCountryCode?.replace('+', '') || '506',
          numeroTelefono: companyData.phone,
          correoElectronico: companyData.email
        },
        receptor: receptorData || undefined, // Solo incluir receptor si hay cliente
        condicionVenta: condicionVenta || '01',
        lineasDetalle: items.map((item: any, index: number) => {
          // Calcular montos base
          const montoImpuesto = item.impuesto[0]?.monto || 0
          const baseImponible = item.baseImponible || item.subTotal || (item.cantidad * item.precioUnitario)
          const montoTotalOriginal = item.montoTotalLinea || (baseImponible + montoImpuesto)

          // Crear objeto de impuesto con exoneración si el cliente la tiene
          const impuestoData = {
            codigo: item.impuesto[0]?.codigo || '01',
            codigoTarifaIVA: item.impuesto[0]?.codigoTarifaIVA || '08',
            tarifa: item.impuesto[0]?.tarifa || 13,
            monto: montoImpuesto
          }

          // Variables para ajustar montos cuando hay exoneración
          let impuestoNeto = item.impuestoNeto || montoImpuesto
          let montoTotalLinea = montoTotalOriginal

          // Agregar exoneración si el cliente la tiene
          if (clientExoneracion) {
            const exoneracionLinea = {
              ...clientExoneracion,
              montoExoneracion: montoImpuesto
            }
            impuestoData.exoneracion = exoneracionLinea
            impuestoNeto = 0
            montoTotalLinea = baseImponible
            console.log(`🛡️ Agregando exoneración a línea ${index + 1}:`, exoneracionLinea)
          }

          return {
            numeroLinea: index + 1,
            codigoCABYS: item.codigoCABYS || '8399000000000',
            cantidad: item.cantidad,
            unidadMedida: item.unidadMedida || 'Sp',
            detalle: item.detalle,
            precioUnitario: item.precioUnitario,
            montoTotal: item.montoTotal,
            subTotal: item.subTotal,
            baseImponible: baseImponible,
            impuesto: impuestoData,
            impuestoAsumidoEmisorFabrica: item.impuestoAsumidoEmisorFabrica || 0,
            impuestoNeto: impuestoNeto,
            montoTotalLinea: montoTotalLinea
          }
        }),
        codigoMoneda: String(currency || 'CRC'),
        tipoCambio: await getExchangeRateForCurrency(currency || 'CRC'),
        totalServGravados: clientExoneracion ? 0 : subtotal,
        totalGravado: clientExoneracion ? 0 : subtotal,
        totalVenta: subtotal,
        totalVentaNeta: subtotal,
        totalDesgloseImpuesto: clientExoneracion ? undefined : {
          codigo: '01',
          codigoTarifaIVA: '08',
          totalMontoImpuesto: totalImpuesto || 0
        },
        totalImpuesto: clientExoneracion ? 0 : (totalImpuesto || 0),
        tipoMedioPago: String(paymentMethod || '01'),
        totalMedioPago: clientExoneracion ? subtotal : (total || 0),
        totalComprobante: clientExoneracion ? subtotal : (total || 0),
        otros: String(notes || '')
      }

      // Generar XML del tiquete
      const xml = XMLGenerator.generateTiqueteXML(tiqueteXMLData)
      console.log('📄 XML de tiquete generado exitosamente')

      // Firmar XML si hay certificado disponible
      let signedXml = null
      if (companyData.certificadoDigital?.fileData && companyData.certificadoDigital?.password) {
        console.log('🔐 Iniciando firma digital...')
        
        const signingResult = await DigitalSignatureService.signXMLWithEncryptedPassword(
          xml,
          companyData.certificadoDigital.fileData,
          companyData.certificadoDigital.password
        )

        if (signingResult.success) {
          signedXml = signingResult.signed_xml
          console.log('✅ XML firmado exitosamente')
        } else {
          console.error('❌ Error al firmar XML:', signingResult.error)
          throw new Error(`Error al firmar XML: ${signingResult.error}`)
        }
      } else {
        console.log('⚠️ No hay certificado digital configurado')
        throw new Error('Certificado digital requerido para firmar el tiquete')
      }

      // 4. Autenticar con Hacienda para envío
      let haciendaToken = null
      if (companyData.atvCredentials) {
        console.log('🏛️ Iniciando autenticación con Hacienda...')
        
        const authResult = await HaciendaAuthService.authenticateFromCompany(companyData)
        
        if (authResult.success) {
          haciendaToken = authResult.accessToken
          console.log('✅ Autenticación con Hacienda exitosa')
          console.log('🎫 Token obtenido:', haciendaToken?.substring(0, 50) + '...')
        } else {
          console.error('❌ Error en autenticación con Hacienda:', authResult.error)
          throw new Error(`Error en autenticación con Hacienda: ${authResult.error}`)
        }
      } else {
        console.log('⚠️ No hay credenciales ATV configuradas')
        throw new Error('Credenciales ATV requeridas para enviar a Hacienda')
      }

      // 5. Preparar datos para Firestore
      const ticketData: any = {
        consecutivo: generatedConsecutivo,
        clave: keyResult.clave || '',
        status: 'draft',
        documentType: 'tiquetes',
        clientId: clientId || '',
        companyId,
        tenantId,
        subtotal: subtotal || 0,
        totalImpuesto: totalImpuesto || 0,
        totalDescuento: totalDescuento || 0,
        total: total || 0,
        exchangeRate: exchangeRate || 1,
        currency: currency || 'CRC',
        condicionVenta: condicionVenta || '01',
        paymentTerm: paymentTerm || '01',
        paymentMethod: paymentMethod || '01',
        notes: notes || '',
        items: items || [],
        xml: xml,
        xmlSigned: signedXml,
        fecha: fechaCostaRica,
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      // Agregar datos del cliente si existe
      if (clientData) {
        ticketData.cliente = clientData
        ticketData.tieneExoneracion = clientData.tieneExoneracion || clientData.hasExemption || false
        ticketData.exoneracion = clientData.exoneracion || clientData.exemption || null
      }

      // 6. CREAR TIQUETE EN FIRESTORE ANTES DE ENVIAR A HACIENDA
      console.log('💾 Creando tiquete en Firestore...')
      docRef = await addDoc(collection(db, 'tickets'), ticketData)
      console.log('✅ Tiquete creado en Firestore:', docRef.id)

      // 7. Enviar documento a Hacienda si tenemos XML firmado y token
      let haciendaSubmissionResult = null
      
      console.log('🔍 Verificando condiciones para envío a Hacienda:')
      console.log('   - signedXml:', !!signedXml, signedXml ? `(${signedXml.length} caracteres)` : 'null')
      console.log('   - haciendaToken:', !!haciendaToken, haciendaToken ? `(${haciendaToken.length} caracteres)` : 'null')
      console.log('   - receptionUrl:', companyData.atvCredentials?.receptionUrl || 'no disponible')
      
      if (signedXml && haciendaToken && companyData.atvCredentials?.receptionUrl) {
        console.log('📤 Iniciando envío de tiquete a Hacienda...')
        
        // Preparar datos completos para envío a Hacienda
        const submissionData = {
          ...ticketData,
          id: docRef.id,
          clave: keyResult.clave,
          client: clientData,
          receptor: receptorData
        }
        
        const submissionResult = await HaciendaSubmissionService.submitInvoiceToHacienda(
          submissionData,
          signedXml,
          haciendaToken,
          companyData
        )
        
        if (submissionResult.success) {
          haciendaSubmissionResult = submissionResult.response
          console.log('✅ Tiquete enviado exitosamente a Hacienda')
          console.log('🔑 Clave Hacienda:', submissionResult.response?.clave)
          
          // Actualizar status según respuesta de Hacienda
          if ((submissionResult.response as any)?.status === 202) {
            await updateDoc(docRef, {
              status: 'Enviando Hacienda',
              haciendaSubmission: submissionResult.response,
              haciendaToken: haciendaToken,
              updatedAt: serverTimestamp()
            })
            console.log('📊 Status actualizado a: Enviando Hacienda')
          }
        } else {
          console.error('❌ Error al enviar tiquete a Hacienda:', submissionResult.error)
          await updateDoc(docRef, {
            status: 'Error Envío Hacienda',
            haciendaSubmission: {
              error: submissionResult.error
            },
            updatedAt: serverTimestamp()
          })
          throw new Error(`Error al enviar tiquete a Hacienda: ${submissionResult.error}`)
        }
      } else {
        console.log('⚠️ Saltando envío a Hacienda - faltan XML firmado, token o receptionUrl')
        await updateDoc(docRef, {
          status: 'Pendiente Envío Hacienda',
          updatedAt: serverTimestamp()
        })
      }

      // 8. CONSULTAR ESTADO REAL DE HACIENDA DESPUÉS DE 10 SEGUNDOS (solo si se envió a Hacienda)
      if (haciendaSubmissionResult && (haciendaSubmissionResult as any).location) {
        const locationUrl = (haciendaSubmissionResult as any).location
        
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
          const statusResult = await HaciendaStatusService.checkDocumentStatus(locationUrl, haciendaToken || '')
          
          if (statusResult.success) {
            console.log('✅ Estado real obtenido de Hacienda:', statusResult.status)
            
            // Usar el campo "ind-estado" de la respuesta de Hacienda
            const estadoHacienda = statusResult.status['ind-estado'] || statusResult.status.estado || statusResult.status.state
            
            // Interpretar el estado
            const interpretedStatus = HaciendaStatusService.interpretStatus(statusResult.status)
            
            // Actualizar el tiquete con el estado real
            await updateDoc(docRef, {
              haciendaSubmission: statusResult.status,
              status: estadoHacienda || interpretedStatus.status,
              statusDescription: interpretedStatus.description,
              isFinalStatus: interpretedStatus.isFinal,
              updatedAt: serverTimestamp()
            })
            
            console.log('✅ Tiquete actualizado con estado real de Hacienda:', interpretedStatus.status)
            
            // 📧 ENVIAR EMAIL SI EL TIQUETE ES APROBADO Y HAY CLIENTE CON CORREO
            if (interpretedStatus.isFinal && interpretedStatus.status === 'Aceptado' && clientData && clientData.email) {
              console.log('🎉 Tiquete APROBADO - Enviando email al cliente...')
              
              try {
                // Leer el tiquete actualizado desde Firestore
                const updatedTicketSnap = await getDoc(docRef)
                const updatedTicketData = updatedTicketSnap.exists() ? updatedTicketSnap.data() : ticketData
                
                // Crear el tiquete completo con todos los datos actualizados
                // Asegurar que la fecha esté disponible (puede venir como Timestamp de Firestore)
                let fechaFormateada = fechaCostaRica // Usar la fecha original del tiquete
                if (updatedTicketData?.fecha) {
                  // Si la fecha viene como Timestamp de Firestore, convertirla
                  if (updatedTicketData.fecha && typeof updatedTicketData.fecha === 'object' && 'toDate' in updatedTicketData.fecha) {
                    fechaFormateada = (updatedTicketData.fecha as any).toDate().toISOString()
                  } else if (updatedTicketData.fecha && typeof updatedTicketData.fecha === 'object' && 'seconds' in updatedTicketData.fecha) {
                    fechaFormateada = new Date((updatedTicketData.fecha as any).seconds * 1000).toISOString()
                  } else if (typeof updatedTicketData.fecha === 'string') {
                    fechaFormateada = updatedTicketData.fecha
                  } else if (updatedTicketData.fecha instanceof Date) {
                    fechaFormateada = updatedTicketData.fecha.toISOString()
                  }
                }
                
                const completeTicketData = {
                  ...updatedTicketData,
                  id: docRef.id,
                  status: interpretedStatus.status,
                  statusDescription: interpretedStatus.description,
                  isFinalStatus: interpretedStatus.isFinal,
                  haciendaSubmission: statusResult.status,
                  xmlSigned: signedXml,
                  tieneExoneracion: updatedTicketData?.tieneExoneracion,
                  exoneracion: updatedTicketData?.exoneracion,
                  fecha: fechaFormateada, // Asegurar que la fecha esté en formato string
                  fechaEmision: fechaFormateada // También incluir como fechaEmision para compatibilidad
                }
                
                // Enviar email al cliente
                await InvoiceEmailService.sendApprovalEmail(
                  completeTicketData,
                  clientData.email,
                  companyData
                )
                
                console.log('✅ Email enviado exitosamente al cliente')
              } catch (emailError) {
                console.error('❌ Error al enviar email:', emailError)
                // No lanzar error, el tiquete ya está aprobado
              }
            }
          } else {
            console.error('❌ Error al consultar estado de Hacienda:', statusResult.error)
            await updateDoc(docRef, {
              status: 'Error Consulta Estado',
              haciendaSubmission: {
                error: statusResult.error
              },
              updatedAt: serverTimestamp()
            })
          }
        }
      }

      return NextResponse.json({
        success: true,
        ticketId: docRef.id,
        consecutivo: generatedConsecutivo,
        message: 'Tiquete creado y enviado a Hacienda exitosamente'
      })

    } catch (xmlError) {
      console.error('❌ Error en generación/envío XML:', xmlError)
      
      // Si hay error, crear documento básico sin XML
      if (!docRef) {
        const ticketDataBasico = {
          consecutivo: generatedConsecutivo || consecutivo,
          status: 'Error',
          documentType: 'tiquetes',
          clientId: clientId || '',
          companyId,
          tenantId,
          subtotal: subtotal || 0,
          totalImpuesto: totalImpuesto || 0,
          totalDescuento: totalDescuento || 0,
          total: total || 0,
          exchangeRate: exchangeRate || 1,
          currency: currency || 'CRC',
          condicionVenta: condicionVenta || '01',
          paymentTerm: paymentTerm || '01',
          paymentMethod: paymentMethod || '01',
          notes: notes || '',
          items: items || [],
          createdBy,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          error: xmlError instanceof Error ? xmlError.message : 'Error desconocido'
        }

        docRef = await addDoc(collection(db, 'tickets'), ticketDataBasico)
      }
      
      return NextResponse.json(
        { 
          error: xmlError instanceof Error ? xmlError.message : 'Error al crear tiquete',
          ticketId: docRef?.id
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error al crear tiquete:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
