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
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Los datos ya vienen completos desde handleCreateDocument
    const { 
      consecutivo,
      status,
      clientId,
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

    // Validar campos requeridos
    if (!consecutivo || !clientId || !companyId || !tenantId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Inicializar Firebase si no está inicializado
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    const db = getFirestore(app)

    // NOTA: El tiquete se creará en Firestore DESPUÉS de generar el XML con exoneración si es necesario
    let docRef: any = null
    let generatedConsecutivo = consecutivo

    // Generar XML con exoneración si el cliente la tiene
    try {
      console.log('🔧 Iniciando generación de XML para tiquete...')
      
      // Obtener datos de la empresa para generar XML
      const companyDoc = await getDoc(doc(db, 'companies', companyId))
      if (!companyDoc.exists()) {
        throw new Error('Empresa no encontrada')
      }

      const companyData = companyDoc.data()
      console.log('📋 Datos de empresa obtenidos:', companyData.nombreComercial)

      // Obtener datos del cliente
      const clientDoc = await getDoc(doc(db, 'clients', clientId))
      if (!clientDoc.exists()) {
        throw new Error('Cliente no encontrado')
      }

      const clientData = clientDoc.data()
      console.log('👤 Datos de cliente obtenidos:', clientData.name)
      console.log('🛡️ Cliente con exoneración:', clientData.tieneExoneracion)

      // Usar la misma fecha para la clave y fecha de emisión (zona horaria Costa Rica)
      const fechaCostaRica = new Date().toLocaleString('sv-SE', { timeZone: 'America/Costa_Rica' }).replace(' ', 'T')

      // Función para formatear fecha con timezone
      const formatDateWithTimezone = (dateString: string): string => {
        if (!dateString) return fechaCostaRica + '-06:00'
        
        // Si ya tiene formato con timezone, devolverlo
        if (dateString.includes('T') && (dateString.includes('+') || dateString.includes('-'))) {
          return dateString
        }
        
        // Si tiene formato YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss, agregar timezone
        if (dateString.includes('T')) {
          return dateString + '-06:00'
        }
        
        // Si es solo fecha, agregar hora por defecto y timezone
        return dateString + 'T00:00:00-06:00'
      }

      // Mapear datos de exoneración del cliente para el XML
      let clientExoneracion: ExoneracionXML | undefined = undefined
      if (clientData.tieneExoneracion && clientData.exoneracion) {
        console.log('🛡️ Cliente con exoneración detectada:', clientData.exoneracion)
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
          montoExoneracion: 0 // Se calculará dinámicamente por línea
        }
      } else if (clientData.hasExemption && clientData.exemption) {
        console.log('🛡️ Cliente con exoneración (formato legacy) detectada:', clientData.exemption)
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
          montoExoneracion: 0 // Se calculará dinámicamente por línea
        }
      }

      // Generar consecutivo si no viene uno
      if (!generatedConsecutivo) {
        const consecutiveResult = await InvoiceConsecutiveService.getNextConsecutive(companyId, 'tiquetes')
        if (consecutiveResult.success && consecutiveResult.consecutive) {
          generatedConsecutivo = `TE-${consecutiveResult.consecutive}`
        } else {
          generatedConsecutivo = `TE-${Date.now()}`
        }
      }

      // Generar clave de Hacienda
      const fechaParaClave = new Date(fechaCostaRica)
      const keyResult = HaciendaKeyGenerator.generateKey({
        fecha: fechaParaClave,
        cedulaEmisor: companyData.identification || '',
        consecutivo: generatedConsecutivo,
        pais: companyData.countryCode || '506',
        situacion: '1' // Normal
      })
      
      if (!keyResult.success) {
        throw new Error(`Error al generar clave: ${keyResult.error}`)
      }

      // Construir datos XML para el tiquete
      const tiqueteXMLData: FacturaData = {
        clave: keyResult.clave || '',
        proveedorSistemas: 'InvoSell',
        codigoActividadEmisor: companyData.economicActivity || '6201000',
        codigoActividadReceptor: clientData.economicActivity || '6201000',
        numeroConsecutivo: generatedConsecutivo,
        fechaEmision: fechaCostaRica,
        emisor: {
          nombre: companyData.name || companyData.nombreComercial || '',
          tipoIdentificacion: companyData.identificationType || '02',
          numeroIdentificacion: companyData.identification || '',
          nombreComercial: companyData.nombreComercial || '',
          provincia: companyData.province || '1',
          canton: companyData.canton || '01',
          distrito: companyData.district || '01',
          otrasSenas: companyData.otrasSenas || '',
          codigoPais: companyData.phoneCountryCode?.replace('+', '') || '506',
          numeroTelefono: companyData.phone || '',
          correoElectronico: companyData.email || ''
        },
        receptor: {
          nombre: clientData.name || '',
          tipoIdentificacion: clientData.identificationType || '02',
          numeroIdentificacion: clientData.identification || '',
          nombreComercial: clientData.commercialName || clientData.name || '',
          provincia: clientData.province || '1',
          canton: clientData.canton || '01',
          distrito: clientData.district || '01',
          otrasSenas: clientData.otrasSenas || '',
          codigoPais: clientData.phoneCountryCode?.replace('+', '') || '506',
          numeroTelefono: clientData.phone || '',
          correoElectronico: clientData.email || ''
        },
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
            // Crear copia de la exoneración con el monto específico de esta línea
            const exoneracionLinea = {
              ...clientExoneracion,
              montoExoneracion: montoImpuesto // El monto del impuesto de esta línea
            }
            impuestoData.exoneracion = exoneracionLinea
            
            // Cuando hay exoneración, el impuesto neto debe ser 0 y el total sin impuesto
            impuestoNeto = 0
            montoTotalLinea = baseImponible // Solo la base imponible, sin impuesto
            
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
        codigoMoneda: currency || 'CRC',
        tipoCambio: await getExchangeRateForCurrency(currency || 'CRC'),
        // Los totales se manejarán automáticamente en generateResumenFacturaXML según si hay exoneraciones
        totalServGravados: clientExoneracion ? 0 : subtotal,
        totalGravado: clientExoneracion ? 0 : subtotal,
        totalVenta: subtotal, // Total de venta siempre es el mismo (con o sin exoneración)
        totalVentaNeta: subtotal,
        totalDesgloseImpuesto: clientExoneracion ? undefined : {
          codigo: '01',
          codigoTarifaIVA: '08',
          totalMontoImpuesto: totalImpuesto || 0
        },
        totalImpuesto: clientExoneracion ? 0 : (totalImpuesto || 0),
        tipoMedioPago: paymentMethod || '01',
        totalMedioPago: clientExoneracion ? subtotal : (total || 0), // Sin impuesto si hay exoneración
        totalComprobante: clientExoneracion ? subtotal : (total || 0) // Sin impuesto si hay exoneración
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
        }
      } else {
        console.log('⚠️ No hay certificado digital configurado, XML sin firmar')
      }

      // Preparar datos para Firestore con XML y exoneración
      const ticketDataWithXML = {
        // Información básica del tiquete
        consecutivo: generatedConsecutivo,
        clave: keyResult.clave || '',
        status: status || 'draft',
        documentType: 'tiquetes',
        
        // Relaciones
        clientId,
        companyId,
        tenantId,
        
        // Totales
        subtotal: subtotal || 0,
        totalImpuesto: totalImpuesto || 0,
        totalDescuento: totalDescuento || 0,
        total: total || 0,
        exchangeRate: exchangeRate || 1,
        currency: currency || 'CRC',
        
        // Condiciones de venta y pago
        condicionVenta: condicionVenta || '01',
        paymentTerm: paymentTerm || '01',
        paymentMethod: paymentMethod || '01',
        
        // Notas
        notes: notes || '',
        
        // Items del tiquete
        items: items || [],
        
        // XML y exoneración
        xml: xml,
        xmlSigned: signedXml,
        fecha: fechaCostaRica,
        
        // Campos de auditoría
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      // Crear documento en Firestore
      docRef = await addDoc(collection(db, 'tickets'), ticketDataWithXML)

    } catch (xmlError) {
      console.error('❌ Error en generación XML:', xmlError)
      
      // Si hay error en XML, crear documento básico sin XML
      const ticketDataBasico = {
      // Información básica del tiquete
      consecutivo,
      status: status || 'draft',
      documentType: 'tiquetes',
      
      // Relaciones
      clientId,
      companyId,
      tenantId,
      
      // Totales
      subtotal: subtotal || 0,
      totalImpuesto: totalImpuesto || 0,
      totalDescuento: totalDescuento || 0,
      total: total || 0,
      exchangeRate: exchangeRate || 1,
      currency: currency || 'CRC',
      
      // Condiciones de venta y pago
      condicionVenta: condicionVenta || '01',
      paymentTerm: paymentTerm || '01',
      paymentMethod: paymentMethod || '01',
      
      // Notas
      notes: notes || '',
      
      // Items del tiquete
      items: items || [],
      
      // Campos de auditoría
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

      docRef = await addDoc(collection(db, 'tickets'), ticketDataBasico)
    }

    return NextResponse.json({
      success: true,
      ticketId: docRef.id,
      consecutivo: generatedConsecutivo || consecutivo,
      message: 'Tiquete creado exitosamente'
    })

  } catch (error) {
    console.error('Error al crear tiquete:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
