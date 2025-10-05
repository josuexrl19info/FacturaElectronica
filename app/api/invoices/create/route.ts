import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'
import { XMLGenerator, FacturaData } from '@/lib/services/xml-generator'
import { DigitalSignatureService } from '@/lib/services/digital-signature'
import { HaciendaAuthService } from '@/lib/services/hacienda-auth'
import { HaciendaSubmissionService } from '@/lib/services/hacienda-submission'
import { InvoiceConsecutiveService } from '@/lib/services/invoice-consecutive'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

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

    // Crear documento en Firestore
    const docRef = await addDoc(collection(db, 'invoices'), invoiceData)

    console.log('✅ Factura creada en Firestore:', docRef.id)

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

      // Obtener datos del cliente
      const clientDoc = await getDoc(doc(db, 'clients', clientId))
      if (!clientDoc.exists()) {
        throw new Error('Cliente no encontrado')
      }

      const clientData = clientDoc.data()
      console.log('👤 Datos de cliente obtenidos:', clientData.name)

      // Generar XML
      const facturaXMLData: FacturaData = {
        clave: XMLGenerator.generateClave(
          '506', // Costa Rica
          '01', // Factura
          companyData.identification || '3102867860',
          '1', // Normal
          '00001', // Código de seguridad
          XMLGenerator.generateConsecutivo(parseInt(consecutivo.split('-')[1]) || 1),
          '1' // Normal
        ),
        proveedorSistemas: companyData.proveedorSistemas || '3102867860',
        codigoActividadEmisor: companyData.economicActivity?.codigo || '924909',
        codigoActividadReceptor: clientData.economicActivity?.codigo || '924103',
        numeroConsecutivo: XMLGenerator.generateConsecutivo(parseInt(consecutivo.split('-')[1]) || 1),
        fechaEmision: new Date().toISOString(),
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
        lineasDetalle: items.map((item: any, index: number) => ({
          numeroLinea: index + 1,
          codigoCABYS: item.codigoCABYS || '8399000000000',
          cantidad: item.cantidad,
          unidadMedida: item.unidadMedida || 'Sp',
          detalle: item.detalle,
          precioUnitario: item.precioUnitario,
          montoTotal: item.montoTotal,
          subTotal: item.subTotal,
          baseImponible: item.baseImponible,
          impuesto: {
            codigo: item.impuesto[0]?.codigo || '01',
            codigoTarifaIVA: item.impuesto[0]?.codigoTarifaIVA || '08',
            tarifa: item.impuesto[0]?.tarifa || 13,
            monto: item.impuesto[0]?.monto || 0
          },
          impuestoAsumidoEmisorFabrica: item.impuestoAsumidoEmisorFabrica || 0,
          impuestoNeto: item.impuestoNeto || 0,
          montoTotalLinea: item.montoTotalLinea
        })),
        codigoMoneda: currency || 'CRC',
        tipoCambio: 1,
        totalServGravados: subtotal,
        totalGravado: subtotal,
        totalVenta: subtotal,
        totalVentaNeta: subtotal,
        totalDesgloseImpuesto: {
          codigo: '01',
          codigoTarifaIVA: '08',
          totalMontoImpuesto: totalImpuesto
        },
        totalImpuesto,
        tipoMedioPago: paymentMethod || '01',
        totalMedioPago: total,
        totalComprobante: total
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
      if (signedXml && haciendaToken && companyData.atvCredentials?.receptionUrl) {
        console.log('📤 Iniciando envío de documento a Hacienda...')
        
        const submissionResult = await HaciendaSubmissionService.submitInvoiceToHacienda(
          invoiceData,
          signedXml,
          haciendaToken,
          companyData
        )
        
        if (submissionResult.success) {
          haciendaSubmissionResult = submissionResult.response
          console.log('✅ Documento enviado exitosamente a Hacienda')
          console.log('🔑 Clave Hacienda:', submissionResult.response?.clave)
          console.log('📊 Estado:', submissionResult.response?.estado)
        } else {
          console.error('❌ Error al enviar documento a Hacienda:', submissionResult.error)
        }
      } else {
        console.log('⚠️ Saltando envío a Hacienda - faltan XML firmado, token o receptionUrl')
      }

      // Actualizar la factura con el XML, token de Hacienda y resultado de envío
      await updateDoc(docRef, {
        xml: xml,
        xmlSigned: signedXml,
        haciendaToken: haciendaToken,
        haciendaSubmission: haciendaSubmissionResult,
        updatedAt: serverTimestamp()
      })

      console.log('✅ Factura actualizada con XML, token de Hacienda y resultado de envío')

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
