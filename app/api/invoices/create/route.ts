import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
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
 * POST /api/invoices/create
 * Crea una nueva factura en Firestore
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Los datos ya vienen completos desde handleCreateInvoice
    const { 
      consecutivo,
      status,
      clientId,
      companyId,
      tenantId,
      createdBy,
      condicionVenta,
      paymentTerm,
      paymentMethod,
      notes,
      items,
      subtotal,
      totalImpuesto,
      totalDescuento,
      total,
      exchangeRate,
      currency
    } = body

    // Validar campos requeridos (consecutivo se generará automáticamente)
    if (!clientId || !items || !tenantId || !companyId || !createdBy) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // 1. Generar consecutivo automáticamente
    console.log('🔢 Generando consecutivo para empresa:', companyId)
    const consecutiveResult = await InvoiceConsecutiveService.getAndUpdateConsecutive(companyId)
    
    if (!consecutiveResult.success) {
      return NextResponse.json(
        { error: `Error al generar consecutivo: ${consecutiveResult.error}` },
        { status: 400 }
      )
    }

    const generatedConsecutivo = consecutiveResult.consecutive!
    console.log('✅ Consecutivo generado:', generatedConsecutivo)

    // Preparar datos para Firestore (usar el consecutivo generado)
    const invoiceData = {
      consecutivo: generatedConsecutivo,
      status,
      clientId,
      companyId,
      tenantId,
      createdBy,
      
      // Condiciones de venta
      condicionVenta,
      paymentTerm,
      paymentMethod,
      
      // Notas
      notes,
      
      // Totales
      subtotal,
      totalImpuesto,
      totalDescuento,
      total,
      exchangeRate,
      currency,
      
      // Items (ya vienen con la estructura correcta)
      items: items.map((item: any, index: number) => {
        const baseImponible = item.cantidad * item.precioUnitario
        const impuestoMonto = (baseImponible * (item.tarifa || 0)) / 100
        
        return {
          numeroLinea: index + 1,
          codigoCABYS: item.codigoCABYS || '8399000000000',
          cantidad: Number(item.cantidad),
          unidadMedida: item.unidadMedida || 'Sp',
          detalle: item.detalle,
          codigoComercial: '', // Campo requerido por formato real
          unidadMedidaComercial: '', // Campo requerido por formato real
          precioUnitario: Number(item.precioUnitario),
          montoTotal: baseImponible,
          subTotal: baseImponible,
          baseImponible: baseImponible,
          montoTotalLinea: baseImponible + impuestoMonto,
          
          // Impuestos (estructura correcta para Hacienda 4.4)
          impuesto: [{
            codigo: item.tipoImpuesto || '01',
            codigoTarifaIVA: item.codigoTarifa || '08', // Corregido: usar codigoTarifaIVA
            tarifa: Number(item.tarifa) || 13,
            monto: impuestoMonto
          }],
          impuestoAsumidoEmisorFabrica: 0,
          impuestoNeto: impuestoMonto
        }
      }),
      
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    // NOTA: La factura se creará en Firestore DESPUÉS del envío a Hacienda
    let docRef: any = null

    // Generar y firmar XML
    try {
      console.log('🔧 Iniciando generación de XML...')
      
      // Obtener datos de la empresa para generar XML
      const companyDoc = await getDoc(doc(db, 'companies', companyId))
      if (!companyDoc.exists()) {
        throw new Error('Empresa no encontrada')
      }

      const companyData = companyDoc.data()
      console.log('📋 Datos de empresa obtenidos:', companyData.nombreComercial)
      console.log('🔍 atvCredentials disponibles:', !!companyData.atvCredentials)
      if (companyData.atvCredentials) {
        console.log('🔍 receptionUrl:', companyData.atvCredentials.receptionUrl)
        console.log('🔍 authUrl:', companyData.atvCredentials.authUrl)
        console.log('🔍 clientId:', companyData.atvCredentials.clientId)
        console.log('🔍 username:', companyData.atvCredentials.username)
      }

      // Obtener datos del cliente
      const clientDoc = await getDoc(doc(db, 'clients', clientId))
      if (!clientDoc.exists()) {
        throw new Error('Cliente no encontrado')
      }

      const clientData = clientDoc.data()
      console.log('👤 Datos de cliente obtenidos:', clientData.name)
      console.log('📞 Campos del cliente desde Firestore:', {
        keys: Object.keys(clientData),
        phone: clientData.phone,
        hasPhone: 'phone' in clientData,
        tieneExoneracion: clientData.tieneExoneracion,
        hasExemption: clientData.hasExemption
      })

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

      // Generar clave de Hacienda usando el método original que funciona
      console.log('🔑 Generando clave de Hacienda para XML y envío...')
      
      // Pasar el consecutivo completo con formato FE-XXXXXXXXXX
      console.log('🔍 Consecutivo completo que se pasa al generador:', generatedConsecutivo)
      
      const fechaParaClave = new Date(fechaCostaRica)
      
      const keyResult = HaciendaKeyGenerator.generateKey({
        fecha: fechaParaClave,
        cedulaEmisor: companyData.identification || '',
        consecutivo: generatedConsecutivo, // Pasar el consecutivo completo
        pais: companyData.countryCode || '506',
        situacion: '1' // Normal
      })
      
      if (!keyResult.success) {
        throw new Error(`Error al generar clave: ${keyResult.error}`)
      }
      
      const haciendaKey = keyResult.clave!
      console.log('✅ Clave generada:', haciendaKey)

      // Generar XML
      const facturaXMLData: FacturaData = {
        clave: haciendaKey,
        proveedorSistemas: companyData.proveedorSistemas || '3102867860',
        codigoActividadEmisor: companyData.economicActivity?.codigo || '924909',
        codigoActividadReceptor: clientData.economicActivity?.codigo || '924103',
        numeroConsecutivo: haciendaKey.substring(21, 41), // Extraer los 20 dígitos del consecutivo de la clave
        fechaEmision: fechaCostaRica, // Fecha en zona horaria de Costa Rica (misma que la clave)
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
        receptor: {
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
          totalMontoImpuesto: totalImpuesto
        },
        totalImpuesto: clientExoneracion ? 0 : totalImpuesto,
        tipoMedioPago: paymentMethod || '01',
        totalMedioPago: clientExoneracion ? subtotal : total, // Sin impuesto si hay exoneración
        totalComprobante: clientExoneracion ? subtotal : total, // Sin impuesto si hay exoneración
        otros: notes // Notas adicionales del usuario
      }

      const xml = XMLGenerator.generateFacturaXML(facturaXMLData)
      console.log('📄 XML generado exitosamente')

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

      // 4. Autenticar con Hacienda para envío
      let haciendaToken = null
      if (companyData.atvCredentials) {
        console.log('🏛️ Iniciando autenticación con Hacienda...')
        
        const authResult = await HaciendaAuthService.authenticateFromCompany(companyData)
        
        if (authResult.success) {
          haciendaToken = authResult.accessToken
          console.log('✅ Autenticación con Hacienda exitosa')
          console.log('🎫 Token obtenido:', haciendaToken?.substring(0, 50) + '...')
          console.log('⏰ Expira en:', authResult.expiresIn, 'segundos')
        } else {
          console.error('❌ Error en autenticación con Hacienda:', authResult.error)
        }
      } else {
        console.log('⚠️ No hay credenciales ATV configuradas, saltando autenticación')
      }

      // 5. Enviar documento a Hacienda si tenemos XML firmado y token
      let haciendaSubmissionResult = null
      
      // Debug de variables para envío a Hacienda
      console.log('🔍 Verificando condiciones para envío a Hacienda:')
      console.log('   - signedXml:', !!signedXml, signedXml ? `(${signedXml.length} caracteres)` : 'null')
      console.log('   - haciendaToken:', !!haciendaToken, haciendaToken ? `(${haciendaToken.length} caracteres)` : 'null')
      console.log('   - companyData.atvCredentials:', !!companyData.atvCredentials)
      console.log('   - receptionUrl:', companyData.atvCredentials?.receptionUrl || 'no disponible')
      
      if (signedXml && haciendaToken && companyData.atvCredentials?.receptionUrl) {
        console.log('📤 Iniciando envío de documento a Hacienda...')
        
        // Preparar datos completos para envío a Hacienda
        const submissionData = {
          ...invoiceData,
          clave: haciendaKey, // Usar la misma clave generada para el XML
          client: clientData, // Incluir datos completos del cliente
          receptor: {
            tipoIdentificacion: clientData.identificationType,
            numeroIdentificacion: clientData.identification
          }
        }
        
        console.log('🔍 Verificando consistencia de claves:')
        console.log('   - Clave en XML:', facturaXMLData.clave)
        console.log('   - Clave en submissionData:', submissionData.clave)
        console.log('   - ¿Son iguales?', facturaXMLData.clave === submissionData.clave)

        const submissionResult = await HaciendaSubmissionService.submitInvoiceToHacienda(
          submissionData,
          signedXml,
          haciendaToken,
          companyData
        )
        
        if (submissionResult.success) {
          haciendaSubmissionResult = submissionResult.response
          console.log('✅ Documento enviado exitosamente a Hacienda')
          console.log('🔑 Clave Hacienda:', submissionResult.response?.clave)
          console.log('📊 Estado:', submissionResult.response?.estado)
          
          // Actualizar status según respuesta de Hacienda
          if ((submissionResult.response as any)?.status === 202) {
            invoiceData.status = 'Enviando Hacienda'
            console.log('📊 Status actualizado a: Enviando Hacienda')
          }
        } else {
          console.error('❌ Error al enviar documento a Hacienda:', submissionResult.error)
          // Si falla el envío, lanzar error para que se propague al frontend
          throw new Error(`Error al enviar documento a Hacienda: ${submissionResult.error}`)
        }
      } else {
        console.log('⚠️ Saltando envío a Hacienda - faltan XML firmado, token o receptionUrl')
        // Si no se puede enviar a Hacienda, marcar como pendiente
        invoiceData.status = 'Pendiente Envío Hacienda'
      }

      // 6. CREAR FACTURA EN FIRESTORE DESPUÉS DEL PROCESO DE HACIENDA
      console.log('💾 Creando factura en Firestore...')
      docRef = await addDoc(collection(db, 'invoices'), invoiceData)
      console.log('✅ Factura creada en Firestore:', docRef.id)

      // Actualizar la factura con el XML, token de Hacienda y datos completos del cliente y empresa
      console.log('💾 Guardando clientData en factura:', {
        hasPhone: 'phone' in clientData,
        phone: clientData.phone,
        keys: Object.keys(clientData),
        tieneExoneracion: clientData.tieneExoneracion,
        hasExemption: clientData.hasExemption,
        exoneracion: clientData.exoneracion,
        exemption: clientData.exemption,
        clientDataComplete: clientData
      })
      
      // Determinar valores de exoneración
      const tieneExoneracionValue = clientData.tieneExoneracion || clientData.hasExemption || false
      const exoneracionValue = clientData.exoneracion || clientData.exemption || null
      
      console.log('🛡️ Campos de exoneración a guardar:', {
        tieneExoneracionValue,
        exoneracionValue: exoneracionValue ? 'presente' : null
      })
      
      await updateDoc(docRef, {
        xml: xml,
        xmlSigned: signedXml,
        haciendaToken: haciendaToken,
        cliente: clientData,  // Agregar datos completos del cliente
        companyData: companyData, // Agregar datos completos de la empresa
        // Agregar campos de exoneración directamente en la factura
        tieneExoneracion: tieneExoneracionValue,
        exoneracion: exoneracionValue,
        updatedAt: serverTimestamp()
      })

      console.log('✅ Factura actualizada con XML, token y datos completos')
      
      // 🔍 VERIFICAR que los campos de exoneración se guardaron correctamente
      const verificationSnap = await getDoc(docRef)
      const verificationData = verificationSnap.exists() ? verificationSnap.data() : null
      console.log('🔍 VERIFICACIÓN post-updateDoc:', {
        tieneExoneracion: verificationData?.tieneExoneracion,
        exoneracion: verificationData?.exoneracion ? 'presente' : 'ausente',
        clienteTieneExoneracion: verificationData?.cliente?.tieneExoneracion,
        clienteHasExemption: verificationData?.cliente?.hasExemption
      })

      // 7. CONSULTAR ESTADO REAL DE HACIENDA DESPUÉS DE 10 SEGUNDOS (solo si se envió a Hacienda)
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
            
            // Actualizar la factura con el estado real
            await updateDoc(docRef, {
              haciendaSubmission: statusResult.status,
              status: estadoHacienda || interpretedStatus.status,
              statusDescription: interpretedStatus.description,
              isFinalStatus: interpretedStatus.isFinal,
              updatedAt: serverTimestamp()
            })
            
            console.log('✅ Factura actualizada con estado real de Hacienda:', interpretedStatus.status)
            
            // 📧 ENVIAR EMAIL SI LA FACTURA ES APROBADA
            if (interpretedStatus.isFinal && interpretedStatus.status === 'Aceptado') {
              console.log('🎉 Factura APROBADA - Enviando email al cliente...')
              
              try {
                // 🔧 Leer la factura actualizada desde Firestore para obtener todos los campos, incluyendo exoneración
                const updatedInvoiceSnap = await getDoc(docRef)
                const updatedInvoiceData = updatedInvoiceSnap.exists() ? updatedInvoiceSnap.data() : invoiceData
                
                console.log('🔍 [CRÍTICO] updatedInvoiceData keys:', Object.keys(updatedInvoiceData || {}))
                console.log('🔍 [CRÍTICO] tieneExoneracion:', updatedInvoiceData?.tieneExoneracion)
                console.log('🔍 [CRÍTICO] exoneracion:', updatedInvoiceData?.exoneracion ? 'presente' : 'ausente')
                
                // Crear la factura completa con todos los datos actualizados desde Firestore
                const completeInvoiceData = {
                  ...updatedInvoiceData,
                  id: docRef.id,
                  status: interpretedStatus.status,
                  statusDescription: interpretedStatus.description,
                  isFinalStatus: interpretedStatus.isFinal,
                  haciendaSubmission: statusResult.status,  // ← Incluir la respuesta completa de Hacienda
                  xmlSigned: signedXml,  // ← Asegurar que el XML firmado esté incluido
                  // 🔧 Asegurar que los campos de exoneración estén presentes
                  tieneExoneracion: updatedInvoiceData?.tieneExoneracion,
                  exoneracion: updatedInvoiceData?.exoneracion
                }
                
                console.log('📧 Enviando email con factura completa:', {
                  id: completeInvoiceData.id,
                  consecutivo: completeInvoiceData.consecutivo,
                  hasXmlSigned: !!completeInvoiceData.xmlSigned,
                  hasHaciendaSubmission: !!completeInvoiceData.haciendaSubmission,
                  hasRespuestaXml: !!completeInvoiceData.haciendaSubmission?.['respuesta-xml'],
                  // 🔍 DEBUG: Verificar campos de exoneración antes de enviar email
                  tieneExoneracion: completeInvoiceData.tieneExoneracion,
                  exoneracion: completeInvoiceData.exoneracion ? 'presente' : 'ausente'
                })
                
                const emailResult = await InvoiceEmailService.sendApprovalEmail(completeInvoiceData)

                if (emailResult.success) {
                  console.log('✅ Email de aprobación enviado exitosamente')
                  console.log('📧 Message ID:', emailResult.messageId)
                  
                  // Actualizar factura con información del email enviado
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
                
                // Marcar error en la factura
                await updateDoc(docRef, {
                  emailError: emailError instanceof Error ? emailError.message : 'Error desconocido',
                  emailErrorAt: serverTimestamp()
                })
              }
            }
          } else {
            console.error('❌ Error al consultar estado de Hacienda:', statusResult.error)
            
            // Marcar como error en consulta
            await updateDoc(docRef, {
              status: 'Error Consulta Hacienda',
              haciendaSubmission: {
                error: statusResult.error,
                locationUrl: locationUrl,
                timestamp: new Date().toISOString()
              },
              updatedAt: serverTimestamp()
            })
          }
        }
      } else {
        console.log('⚠️ No se puede consultar estado - no hay location URL disponible')
      }

    } catch (xmlError) {
      console.error('❌ Error al generar/firmar XML:', xmlError)
      // No fallar la creación de la factura si hay error con el XML
    }

    return NextResponse.json({
      success: true,
      invoiceId: docRef.id,
      consecutivo: generatedConsecutivo,
      message: 'Factura creada exitosamente'
    })

  } catch (error) {
    console.error('❌ Error al crear factura:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
