import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, query, where, getDocs } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'
import { HaciendaKeyGenerator } from '@/lib/services/hacienda-key-generator'
import { CreditNoteGenerator, CreditNoteData } from '@/lib/services/credit-note-generator'
import { ExoneracionXML } from '@/lib/services/xml-generator'
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

    // 2. PRIORIZAR XML original siempre que esté disponible (contiene información completa incluyendo exoneración)
    // El parser del frontend no extrae exoneración, pero el del backend sí
    let facturaData
    if (xmlFacturaOriginal) {
      console.log('📄 Parseando XML de factura original en backend (incluye exoneración)...')
      facturaData = XMLParser.parseInvoiceXML(xmlFacturaOriginal)
      console.log('✅ Factura parseada desde XML original:', facturaData.consecutivo)
      
      // Verificar si hay exoneraciones en el XML parseado
      const tieneExoneracionesEnXML = facturaData.items?.some((item: any) => item.impuesto?.exoneracion)
      console.log('🛡️ Exoneraciones detectadas en XML:', tieneExoneracionesEnXML)
    } else if (facturaDataFromFrontend) {
      console.log('⚠️ Usando datos parseados del frontend (sin exoneración)')
      facturaData = facturaDataFromFrontend
      console.log('✅ Factura:', facturaData.consecutivo)
    } else {
      return NextResponse.json(
        { error: 'No se proporcionó XML ni datos de la factura original' },
        { status: 400 }
      )
    }
    
    // 2.5. Usar datos del XML parseado (ya contiene toda la información necesaria)
    const clienteCompleto = facturaData.receptor
    const formaPagoOriginal = facturaData.medioPago || '01'
    
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
    
    console.log('📊 Datos de la factura original (del XML):', {
      clave: facturaData.clave,
      consecutivo: facturaData.consecutivo,
      medioPago: facturaData.medioPago,
      condicionVenta: facturaData.condicionVenta,
      tieneReceptor: !!facturaData.receptor,
      receptorNombre: facturaData.receptor?.nombre
    })

    // IMPORTANTE: Para notas de crédito, SOLO usar exoneración si la factura original la tenía
    // NO usar la exoneración actual del cliente en Firestore si la factura no la tenía
    
    // Verificar si la factura original tenía exoneraciones en el XML
    const facturaOriginalTieneExoneracion = facturaData.items?.some((item: any) => item.impuesto?.exoneracion)
    
    console.log('🔍 Verificando exoneración en factura original:')
    console.log('  - Factura tiene exoneración en XML:', facturaOriginalTieneExoneracion)
    console.log('  - Total items en factura:', facturaData.items?.length || 0)
    
    // Solo definir clientExoneracion si la factura original tenía exoneraciones
    let clientExoneracion: ExoneracionXML | undefined = undefined
    
    if (facturaOriginalTieneExoneracion) {
      console.log('✅ La factura original SÍ tiene exoneración - se replicará en la NC')
      
      // Extraer exoneración del primer item que la tenga (todos deberían tener la misma)
      const itemConExoneracion = facturaData.items?.find((item: any) => item.impuesto?.exoneracion)
      
      if (itemConExoneracion?.impuesto?.exoneracion) {
        const exoXML = itemConExoneracion.impuesto.exoneracion
        
        console.log('🔍 EXONERACIÓN COMPLETA del XML original:')
        console.log('  - exoXML completo:', JSON.stringify(exoXML, null, 2))
        console.log('  - tipoDocumento:', exoXML.tipoDocumento, typeof exoXML.tipoDocumento)
        console.log('  - tipoDocumentoOtro:', exoXML.tipoDocumentoOtro, typeof exoXML.tipoDocumentoOtro)
        console.log('  - numeroDocumento:', exoXML.numeroDocumento, typeof exoXML.numeroDocumento)
        console.log('  - nombreLey:', exoXML.nombreLey, typeof exoXML.nombreLey)
        console.log('  - articulo:', exoXML.articulo, typeof exoXML.articulo)
        console.log('  - inciso:', exoXML.inciso, typeof exoXML.inciso)
        console.log('  - porcentajeCompra:', exoXML.porcentajeCompra, typeof exoXML.porcentajeCompra)
        console.log('  - nombreInstitucion:', exoXML.nombreInstitucion, typeof exoXML.nombreInstitucion)
        console.log('  - nombreInstitucionOtros:', exoXML.nombreInstitucionOtros, typeof exoXML.nombreInstitucionOtros)
        console.log('  - fechaEmision:', exoXML.fechaEmision, typeof exoXML.fechaEmision)
        console.log('  - tarifaExonerada:', exoXML.tarifaExonerada, typeof exoXML.tarifaExonerada)
        console.log('  - montoExoneracion:', exoXML.montoExoneracion, typeof exoXML.montoExoneracion)
        
        // Solo crear campos que realmente existen y no son undefined
        clientExoneracion = {
          tipoDocumento: exoXML.tipoDocumento || '',
          numeroDocumento: exoXML.numeroDocumento || '',
          nombreInstitucion: exoXML.nombreInstitucion || '',
          fechaEmision: formatDateWithTimezone(exoXML.fechaEmision || new Date().toLocaleString('sv-SE', { timeZone: 'America/Costa_Rica' }).replace(' ', 'T')),
          tarifaExonerada: parseFloat(exoXML.tarifaExonerada) || 0,
          montoExoneracion: 0 // Se calculará dinámicamente por línea
        }
        
        // Solo agregar campos opcionales si existen y no son undefined
        if (exoXML.tipoDocumentoOtro !== undefined && exoXML.tipoDocumentoOtro !== '') {
          clientExoneracion.tipoDocumentoOtro = exoXML.tipoDocumentoOtro
        }
        
        if (exoXML.nombreLey !== undefined && exoXML.nombreLey !== '') {
          clientExoneracion.nombreLey = exoXML.nombreLey
        }
        
        if (exoXML.articulo !== undefined && exoXML.articulo !== '') {
          clientExoneracion.articulo = parseInt(exoXML.articulo)
        }
        
        if (exoXML.inciso !== undefined && exoXML.inciso !== '') {
          clientExoneracion.inciso = parseInt(exoXML.inciso)
        }
        
        if (exoXML.porcentajeCompra !== undefined && exoXML.porcentajeCompra !== '') {
          clientExoneracion.porcentajeCompra = parseFloat(exoXML.porcentajeCompra)
        }
        
        if (exoXML.nombreInstitucionOtros !== undefined && exoXML.nombreInstitucionOtros !== '') {
          clientExoneracion.nombreInstitucionOtros = exoXML.nombreInstitucionOtros
        }
        
        console.log('📋 Exoneración final construida:', JSON.stringify(clientExoneracion, null, 2))
      }
    } else {
      console.log('ℹ️ La factura original NO tiene exoneración - NC sin exoneración')
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
      items: itemsNC.map((item: any, index: number) => {
        // Calcular montos base
        const baseImponible = item.baseImponible || item.subtotal || item.montoTotal || 0
        const tarifaImpuesto = item.impuesto?.tarifa || 13
        
        // Detectar si hay exoneración en el item del XML original
        const exoneracionDelXML = item.impuesto?.exoneracion
        const tieneExoneracion = exoneracionDelXML || clientExoneracion
        
        // IMPORTANTE: Calcular el monto del impuesto
        // Si el XML trae monto > 0, usar ese valor
        // Si el XML trae monto = 0 pero hay exoneración, calcular el monto teórico (baseImponible * tarifa / 100)
        // Si no hay exoneración y monto = 0, mantener en 0
        let montoImpuesto = item.impuesto?.monto || 0
        
        if (tieneExoneracion && montoImpuesto === 0) {
          // Cuando hay exoneración y el monto es 0, calcular el monto teórico del impuesto
          montoImpuesto = baseImponible * (tarifaImpuesto / 100)
          console.log(`💡 Calculando monto teórico para línea ${index + 1}:`, {
            baseImponible,
            tarifa: tarifaImpuesto,
            montoCalculado: montoImpuesto
          })
        }
        
        const montoTotalOriginal = item.montoTotalLinea || (baseImponible + montoImpuesto)
        
        // Variables para ajustar montos cuando hay exoneración
        // IMPORTANTE: Respetar el ImpuestoNeto original del XML
        let impuestoNeto = item.impuestoNeto !== undefined ? item.impuestoNeto : montoImpuesto
        let montoTotalLinea = item.montoTotalLinea !== undefined ? item.montoTotalLinea : montoTotalOriginal

        // Crear objeto de impuesto - la lógica cambia si hay exoneración
        let impuestoData = undefined
        if (item.impuesto) {
          if (tieneExoneracion) {
            // SIEMPRE usar exoneración del XML original de la factura
            // clientExoneracion solo se define si la factura original tenía exoneración
            const exoneracionFuente = exoneracionDelXML || clientExoneracion
            
            // Construir exoneracionLinea solo con campos que existen y no son undefined
            const exoneracionLinea: any = {
              tipoDocumento: exoneracionFuente.tipoDocumento || '',
              numeroDocumento: exoneracionFuente.numeroDocumento || '',
              nombreInstitucion: exoneracionFuente.nombreInstitucion || '',
              fechaEmision: exoneracionFuente.fechaEmision || '',
              tarifaExonerada: exoneracionFuente.tarifaExonerada || 0,
              montoExoneracion: exoneracionDelXML?.montoExoneracion || montoImpuesto
            }
            
            // Solo agregar campos opcionales si existen y no son undefined
            if (exoneracionFuente.tipoDocumentoOtro !== undefined && exoneracionFuente.tipoDocumentoOtro !== '') {
              exoneracionLinea.tipoDocumentoOtro = exoneracionFuente.tipoDocumentoOtro
            }
            
            if (exoneracionFuente.nombreLey !== undefined && exoneracionFuente.nombreLey !== '') {
              exoneracionLinea.nombreLey = exoneracionFuente.nombreLey
            }
            
            if (exoneracionFuente.articulo !== undefined && exoneracionFuente.articulo !== '') {
              exoneracionLinea.articulo = exoneracionFuente.articulo
            }
            
            if (exoneracionFuente.inciso !== undefined && exoneracionFuente.inciso !== '') {
              exoneracionLinea.inciso = exoneracionFuente.inciso
            }
            
            if (exoneracionFuente.porcentajeCompra !== undefined && exoneracionFuente.porcentajeCompra !== '') {
              exoneracionLinea.porcentajeCompra = exoneracionFuente.porcentajeCompra
            }
            
            if (exoneracionFuente.nombreInstitucionOtros !== undefined && exoneracionFuente.nombreInstitucionOtros !== '') {
              exoneracionLinea.nombreInstitucionOtros = exoneracionFuente.nombreInstitucionOtros
            }
            
            impuestoData = {
              codigo: item.impuesto.codigo || '01',
              codigoTarifa: item.impuesto.codigoTarifa || item.impuesto.codigoTarifaIVA || '08',
              tarifa: item.impuesto.tarifa || 13,
              monto: montoImpuesto, // SIEMPRE incluir monto, aunque haya exoneración
              exoneracion: exoneracionLinea
            }
            
            // Si el ImpuestoNeto original era 0, mantenerlo así
            if (item.impuestoNeto === 0) {
              impuestoNeto = 0
              montoTotalLinea = baseImponible // Solo la base imponible, sin impuesto
            }
            
            console.log(`🛡️ Item con exoneración en línea ${index + 1}:`, {
              baseImponible,
              montoImpuestoDelXML: montoImpuesto,
              montoImpuestoOriginal: item.impuesto?.monto,
              tipoDocumento: exoneracionLinea.tipoDocumento,
              numeroDocumento: exoneracionLinea.numeroDocumento,
              montoExoneracion: exoneracionLinea.montoExoneracion
            })
            
            console.log(`🔍 Exoneración completa para línea ${index + 1}:`, JSON.stringify(exoneracionLinea, null, 2))
          } else {
            // Sin exoneración, incluir el monto normal
            impuestoData = {
              codigo: item.impuesto.codigo || '01',
              codigoTarifa: item.impuesto.codigoTarifa || item.impuesto.codigoTarifaIVA || '08',
              tarifa: item.impuesto.tarifa || 13,
              monto: montoImpuesto
            }
          }
        }

        // 🔍 DEBUG: Verificar impuestoData antes de asignarlo
        if (impuestoData && impuestoData.exoneracion) {
          console.log(`🔍 impuestoData para línea ${index + 1}:`, JSON.stringify(impuestoData, null, 2))
          console.log(`🔍 exoneracion en impuestoData:`, JSON.stringify(impuestoData.exoneracion, null, 2))
        }

        return {
          numeroLinea: index + 1,
          codigoCABYS: item.codigoCABYS || '8399000000000',
          cantidad: item.cantidad || 1,
          unidadMedida: item.unidadMedida || 'Sp',
          detalle: item.detalle || '',
          precioUnitario: item.precioUnitario || 0,
          montoTotal: item.montoTotal || 0,
          subtotal: item.subtotal || item.montoTotal || 0,
          baseImponible: baseImponible,
          impuesto: impuestoData,
          impuestoNeto: impuestoNeto,
          montoTotalLinea: montoTotalLinea
        }
      }),
      // Resumen: usar datos parseados del XML de la factura original con valores por defecto
      resumen: (() => {
        // Calcular totales basados en si hay exoneraciones en la factura original
        const tieneExoneracionesDelXML = itemsNC.some((item: any) => item.impuesto?.exoneracion)
        const tieneExoneraciones = !!clientExoneracion || tieneExoneracionesDelXML
        
        // Calcular totales de servicios exonerados si hay exoneraciones
        let totalServExonerado = 0
        if (tieneExoneraciones) {
          // Usar los datos del resumen original de la factura
          totalServExonerado = facturaData.resumen.totalServExonerado || 0
          
          // Si no está en el resumen, calcular sumando las bases imponibles
          if (totalServExonerado === 0 && tieneExoneracionesDelXML) {
            totalServExonerado = itemsNC.reduce((sum: number, item: any) => {
              const baseImponible = item.baseImponible || item.subtotal || item.montoTotal || 0
              return sum + baseImponible
            }, 0)
          }
        }
        
        return {
          codigoTipoMoneda: {
            codigoMoneda: facturaData.resumen.codigoMoneda || 'CRC',
            tipoCambio: facturaData.resumen.tipoCambio || 1
          },
          totalServGravados: tieneExoneraciones ? 0 : (facturaData.resumen.totalServGravados || 0),
          totalServExentos: facturaData.resumen.totalServExentos || 0,
          totalServExonerado: totalServExonerado || (facturaData.resumen.totalServExonerado || 0),
          totalMercanciasGravadas: facturaData.resumen.totalMercanciasGravadas || 0,
          totalMercanciasExentas: facturaData.resumen.totalMercanciasExentas || 0,
          totalMercanciasExoneradas: facturaData.resumen.totalMercanciasExoneradas || 0,
          totalGravado: tieneExoneraciones ? 0 : (facturaData.resumen.totalGravado || 0),
          totalExento: facturaData.resumen.totalExento || 0,
          totalExonerado: totalServExonerado || (facturaData.resumen.totalExonerado || 0),
          totalVenta: facturaData.resumen.totalVenta || 0,
          totalDescuentos: facturaData.resumen.totalDescuentos || 0,
          totalVentaNeta: facturaData.resumen.totalVentaNeta || 0,
          // Solo incluir desglose de impuestos si NO hay exoneraciones
          totalDesgloseImpuesto: tieneExoneraciones ? undefined : (
            (facturaData.resumen.totalImpuesto || 0) > 0 ? {
              codigo: '01', // IVA
              codigoTarifaIVA: '08', // 13%
              totalMontoImpuesto: facturaData.resumen.totalImpuesto || 0
            } : undefined
          ),
          totalImpuesto: tieneExoneraciones ? 0 : (facturaData.resumen.totalImpuesto || 0),
          totalComprobante: tieneExoneraciones ? 
            (facturaData.resumen.totalVenta || 0) : // Sin impuesto si hay exoneración
            (facturaData.resumen.totalComprobante || 0)
        }
      })()
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
      items: creditNoteData.items,
      total: creditNoteData.resumen.totalComprobante,
      subtotal: creditNoteData.resumen.totalVenta,
      totalImpuesto: creditNoteData.resumen.totalImpuesto,
      currency: facturaData.resumen.codigoMoneda,
      status: 'Enviando Hacienda',
      haciendaSubmission: submissionResult.response,
      createdAt: serverTimestamp(),
      createdBy: tenantId
    }

    // 🔍 DEBUG: Verificar campos undefined antes de guardar en Firestore
    console.log('🔍 Verificando campos undefined antes de guardar en Firestore...')
    
    const checkForUndefined = (obj: any, path: string = '') => {
      for (const key in obj) {
        const currentPath = path ? `${path}.${key}` : key
        const value = obj[key]
        
        if (value === undefined) {
          console.error(`❌ Campo undefined encontrado: ${currentPath}`)
        } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          // Recursivamente verificar objetos anidados (pero no arrays ni fechas)
          checkForUndefined(value, currentPath)
        }
      }
    }
    
    // Verificar campos principales
    console.log('📋 Verificando campos principales:')
    console.log('  - consecutivo:', typeof creditNoteRecord.consecutivo, creditNoteRecord.consecutivo)
    console.log('  - consecutivo20Digitos:', typeof creditNoteRecord.consecutivo20Digitos, creditNoteRecord.consecutivo20Digitos)
    console.log('  - clave:', typeof creditNoteRecord.clave, creditNoteRecord.clave)
    console.log('  - tipoNotaCredito:', typeof creditNoteRecord.tipoNotaCredito, creditNoteRecord.tipoNotaCredito)
    console.log('  - razon:', typeof creditNoteRecord.razon, creditNoteRecord.razon)
    console.log('  - esAnulacionTotal:', typeof creditNoteRecord.esAnulacionTotal, creditNoteRecord.esAnulacionTotal)
    console.log('  - companyId:', typeof creditNoteRecord.companyId, creditNoteRecord.companyId)
    console.log('  - tenantId:', typeof creditNoteRecord.tenantId, creditNoteRecord.tenantId)
    console.log('  - formaPago:', typeof creditNoteRecord.formaPago, creditNoteRecord.formaPago)
    console.log('  - condicionVenta:', typeof creditNoteRecord.condicionVenta, creditNoteRecord.condicionVenta)
    console.log('  - xml:', typeof creditNoteRecord.xml, creditNoteRecord.xml ? 'presente' : 'ausente')
    console.log('  - xmlSigned:', typeof creditNoteRecord.xmlSigned, creditNoteRecord.xmlSigned ? 'presente' : 'ausente')
    console.log('  - xmlFacturaOriginal:', typeof creditNoteRecord.xmlFacturaOriginal, creditNoteRecord.xmlFacturaOriginal ? 'presente' : 'ausente')
    console.log('  - total:', typeof creditNoteRecord.total, creditNoteRecord.total)
    console.log('  - subtotal:', typeof creditNoteRecord.subtotal, creditNoteRecord.subtotal)
    console.log('  - totalImpuesto:', typeof creditNoteRecord.totalImpuesto, creditNoteRecord.totalImpuesto)
    console.log('  - currency:', typeof creditNoteRecord.currency, creditNoteRecord.currency)
    console.log('  - status:', typeof creditNoteRecord.status, creditNoteRecord.status)
    console.log('  - createdBy:', typeof creditNoteRecord.createdBy, creditNoteRecord.createdBy)
    
    // Verificar cliente
    console.log('👤 Verificando cliente:')
    if (creditNoteRecord.cliente) {
      console.log('  - cliente presente:', typeof creditNoteRecord.cliente)
      checkForUndefined(creditNoteRecord.cliente, 'cliente')
    } else {
      console.log('  - cliente: undefined o null')
    }
    
    // Verificar referenciaFactura
    console.log('📄 Verificando referenciaFactura:')
    checkForUndefined(creditNoteRecord.referenciaFactura, 'referenciaFactura')
    
    // Verificar items
    console.log('📦 Verificando items:')
    if (Array.isArray(creditNoteRecord.items)) {
      console.log('  - items count:', creditNoteRecord.items.length)
      creditNoteRecord.items.forEach((item, index) => {
        console.log(`  - item ${index}:`, typeof item)
        checkForUndefined(item, `items[${index}]`)
      })
    } else {
      console.log('  - items: no es array o undefined')
    }
    
    // Verificar haciendaSubmission
    console.log('🏛️ Verificando haciendaSubmission:')
    if (creditNoteRecord.haciendaSubmission) {
      console.log('  - haciendaSubmission presente:', typeof creditNoteRecord.haciendaSubmission)
      checkForUndefined(creditNoteRecord.haciendaSubmission, 'haciendaSubmission')
    } else {
      console.log('  - haciendaSubmission: undefined o null')
    }
    
    // Verificar todo el objeto recursivamente
    console.log('🔍 Verificación recursiva completa:')
    checkForUndefined(creditNoteRecord)
    
    console.log('✅ Verificación de campos undefined completada')

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

