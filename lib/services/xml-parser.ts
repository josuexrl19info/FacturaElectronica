/**
 * Servicio para parsear XML de facturas electrónicas
 * Extrae toda la información necesaria para crear notas de crédito
 */

interface ParsedInvoiceData {
  clave: string
  consecutivo: string
  fechaEmision: string
  emisor: {
    nombre: string
    identificacion: string
    tipoIdentificacion: string
    nombreComercial: string
    ubicacion: {
      provincia: string
      canton: string
      distrito: string
      otrasSenas: string
    }
    telefono: {
      codigoPais: string
      numero: string
    }
    correoElectronico: string
  }
  receptor: {
    nombre: string
    identificacion: string
    tipoIdentificacion: string
    nombreComercial: string
    ubicacion: {
      provincia: string
      canton: string
      distrito: string
      otrasSenas: string
    }
    telefono?: {
      codigoPais: string
      numero: string
    }
    correoElectronico: string
  }
  condicionVenta: string
  medioPago: string
  items: Array<{
    numeroLinea: number
    codigoCABYS: string
    cantidad: number
    unidadMedida: string
    detalle: string
    precioUnitario: number
    montoTotal: number
    subtotal: number
    baseImponible: number
    impuesto?: {
      codigo: string
      codigoTarifa: string
      tarifa: number
      monto: number
    }
    impuestoNeto: number
    montoTotalLinea: number
  }>
  resumen: {
    codigoMoneda: string
    tipoCambio: number
    totalServGravados: number
    totalServExentos: number
    totalServExonerado: number
    totalMercanciasGravadas: number
    totalMercanciasExentas: number
    totalMercanciasExoneradas: number
    totalGravado: number
    totalExento: number
    totalExonerado: number
    totalVenta: number
    totalDescuentos: number
    totalVentaNeta: number
    totalImpuesto: number
    totalComprobante: number
  }
}

export class XMLParser {
  /**
   * Parsea un XML de factura electrónica y extrae toda la información
   */
  static parseInvoiceXML(xmlString: string): ParsedInvoiceData {
    console.log('📄 Parseando XML de factura...')
    
    // Helper para extraer texto de un tag
    const getTagValue = (xml: string, tagName: string, defaultValue: string = ''): string => {
      const regex = new RegExp(`<${tagName}>([^<]*)<\/${tagName}>`, 'i')
      const match = xml.match(regex)
      return match ? match[1].trim() : defaultValue
    }

    // Helper para extraer número
    const getTagNumber = (xml: string, tagName: string, defaultValue: number = 0): number => {
      const value = getTagValue(xml, tagName, String(defaultValue))
      return parseFloat(value) || defaultValue
    }

    // Extraer clave
    const clave = getTagValue(xmlString, 'Clave')
    console.log('🔑 Clave extraída:', clave)

    // Extraer consecutivo
    const consecutivo = getTagValue(xmlString, 'NumeroConsecutivo')
    console.log('📋 Consecutivo extraído:', consecutivo)

    // Extraer fecha de emisión
    const fechaEmision = getTagValue(xmlString, 'FechaEmision')
    console.log('📅 Fecha extraída:', fechaEmision)

    // Extraer datos del emisor (empresa que emitió la factura)
    const emisorMatch = xmlString.match(/<Emisor>([\s\S]*?)<\/Emisor>/i)
    const emisorXML = emisorMatch ? emisorMatch[1] : ''
    
    const ubicacionEmisorMatch = emisorXML.match(/<Ubicacion>([\s\S]*?)<\/Ubicacion>/i)
    const ubicacionEmisorXML = ubicacionEmisorMatch ? ubicacionEmisorMatch[1] : ''
    
    const telefonoEmisorMatch = emisorXML.match(/<Telefono>([\s\S]*?)<\/Telefono>/i)
    const telefonoEmisorXML = telefonoEmisorMatch ? telefonoEmisorMatch[1] : ''
    
    // Formatear cantón del emisor a 2 dígitos
    const cantonEmisorRaw = getTagValue(ubicacionEmisorXML, 'Canton', '01')
    const cantonEmisor = cantonEmisorRaw.length > 2 
      ? cantonEmisorRaw.substring(cantonEmisorRaw.length - 2) 
      : cantonEmisorRaw.padStart(2, '0')
    
    const emisor = {
      nombre: getTagValue(emisorXML, 'Nombre'),
      identificacion: getTagValue(emisorXML, 'Numero'),
      tipoIdentificacion: getTagValue(emisorXML, 'Tipo'),
      nombreComercial: getTagValue(emisorXML, 'NombreComercial'),
      ubicacion: {
        provincia: getTagValue(ubicacionEmisorXML, 'Provincia'),
        canton: cantonEmisor,
        distrito: getTagValue(ubicacionEmisorXML, 'Distrito'),
        otrasSenas: getTagValue(ubicacionEmisorXML, 'OtrasSenas')
      },
      telefono: {
        codigoPais: getTagValue(telefonoEmisorXML, 'CodigoPais', '506'),
        numero: getTagValue(telefonoEmisorXML, 'NumTelefono')
      },
      correoElectronico: getTagValue(emisorXML, 'CorreoElectronico')
    }
    console.log('🏢 Emisor extraído:', emisor.nombre)
    console.log('📍 Cantón emisor formateado:', cantonEmisorRaw, '→', cantonEmisor)

    // Extraer datos del receptor (cliente)
    const receptorMatch = xmlString.match(/<Receptor>([\s\S]*?)<\/Receptor>/i)
    const receptorXML = receptorMatch ? receptorMatch[1] : ''
    
    const ubicacionMatch = receptorXML.match(/<Ubicacion>([\s\S]*?)<\/Ubicacion>/i)
    const ubicacionXML = ubicacionMatch ? ubicacionMatch[1] : ''
    
    // Formatear cantón a 2 dígitos (si viene con 3, tomar los últimos 2)
    const cantonRaw = getTagValue(ubicacionXML, 'Canton', '01')
    const canton = cantonRaw.length > 2 ? cantonRaw.substring(cantonRaw.length - 2) : cantonRaw.padStart(2, '0')
    
    const receptor = {
      nombre: getTagValue(receptorXML, 'Nombre'),
      identificacion: getTagValue(receptorXML, 'Numero'),
      tipoIdentificacion: getTagValue(receptorXML, 'Tipo'),
      nombreComercial: getTagValue(receptorXML, 'NombreComercial'),
      ubicacion: {
        provincia: getTagValue(ubicacionXML, 'Provincia'),
        canton: canton,
        distrito: getTagValue(ubicacionXML, 'Distrito'),
        otrasSenas: getTagValue(ubicacionXML, 'OtrasSenas')
      },
      telefono: receptorXML.includes('<Telefono>') ? {
        codigoPais: getTagValue(receptorXML, 'CodigoPais', '506'),
        numero: getTagValue(receptorXML, 'NumTelefono')
      } : undefined,
      correoElectronico: getTagValue(receptorXML, 'CorreoElectronico'),
      codigoActividadReceptor: codigoActividadReceptor // Agregar actividad económica
    }
    console.log('👤 Receptor extraído:', receptor.nombre)
    console.log('📍 Cantón formateado:', cantonRaw, '→', canton)

    // Extraer condición de venta y medio de pago
    const condicionVenta = getTagValue(xmlString, 'CondicionVenta', '01')
    const medioPago = getTagValue(xmlString, 'TipoMedioPago', '01') // Correcto: TipoMedioPago, no MedioPago
    
    // Extraer actividades económicas
    const codigoActividadReceptor = getTagValue(xmlString, 'CodigoActividadReceptor', '')

    // Extraer items
    const detalleMatch = xmlString.match(/<DetalleServicio>([\s\S]*?)<\/DetalleServicio>/i)
    const detalleXML = detalleMatch ? detalleMatch[1] : ''
    
    const lineaDetalleMatches = detalleXML.match(/<LineaDetalle>([\s\S]*?)<\/LineaDetalle>/gi) || []
    
    const items = lineaDetalleMatches.map((lineaXML) => {
      // Extraer impuesto si existe
      const impuestoMatch = lineaXML.match(/<Impuesto>([\s\S]*?)<\/Impuesto>/i)
      let impuesto = undefined
      
      if (impuestoMatch) {
        const impuestoXML = impuestoMatch[1]
        impuesto = {
          codigo: getTagValue(impuestoXML, 'Codigo', '02'),
          codigoTarifa: getTagValue(impuestoXML, 'CodigoTarifaIVA', '08'),
          tarifa: getTagNumber(impuestoXML, 'Tarifa', 13),
          monto: getTagNumber(impuestoXML, 'Monto', 0)
        }
      }

      return {
        numeroLinea: getTagNumber(lineaXML, 'NumeroLinea', 1),
        codigoCABYS: getTagValue(lineaXML, 'CodigoCABYS', '8399000000000'),
        cantidad: getTagNumber(lineaXML, 'Cantidad', 1),
        unidadMedida: getTagValue(lineaXML, 'UnidadMedida', 'Sp'),
        detalle: getTagValue(lineaXML, 'Detalle'),
        precioUnitario: getTagNumber(lineaXML, 'PrecioUnitario', 0),
        montoTotal: getTagNumber(lineaXML, 'MontoTotal', 0),
        subtotal: getTagNumber(lineaXML, 'SubTotal', 0),
        baseImponible: getTagNumber(lineaXML, 'BaseImponible', 0),
        impuesto,
        impuestoNeto: getTagNumber(lineaXML, 'ImpuestoNeto', 0),
        montoTotalLinea: getTagNumber(lineaXML, 'MontoTotalLinea', 0)
      }
    })
    console.log('📦 Items extraídos:', items.length)

    // Extraer resumen
    const resumenMatch = xmlString.match(/<ResumenFactura>([\s\S]*?)<\/ResumenFactura>/i)
    const resumenXML = resumenMatch ? resumenMatch[1] : ''
    
    const resumen = {
      codigoMoneda: getTagValue(resumenXML, 'CodigoMoneda', 'CRC'),
      tipoCambio: getTagNumber(resumenXML, 'TipoCambio', 1),
      totalServGravados: getTagNumber(resumenXML, 'TotalServGravados', 0),
      totalServExentos: getTagNumber(resumenXML, 'TotalServExentos', 0),
      totalServExonerado: getTagNumber(resumenXML, 'TotalServExonerado', 0),
      totalMercanciasGravadas: getTagNumber(resumenXML, 'TotalMercanciasGravadas', 0),
      totalMercanciasExentas: getTagNumber(resumenXML, 'TotalMercanciasExentas', 0),
      totalMercanciasExoneradas: getTagNumber(resumenXML, 'TotalMercanciasExoneradas', 0),
      totalGravado: getTagNumber(resumenXML, 'TotalGravado', 0),
      totalExento: getTagNumber(resumenXML, 'TotalExento', 0),
      totalExonerado: getTagNumber(resumenXML, 'TotalExonerado', 0),
      totalVenta: getTagNumber(resumenXML, 'TotalVenta', 0),
      totalDescuentos: getTagNumber(resumenXML, 'TotalDescuentos', 0),
      totalVentaNeta: getTagNumber(resumenXML, 'TotalVentaNeta', 0),
      totalImpuesto: getTagNumber(resumenXML, 'TotalImpuesto', 0),
      totalComprobante: getTagNumber(resumenXML, 'TotalComprobante', 0)
    }
    console.log('💰 Resumen extraído - Total:', resumen.totalComprobante)

    console.log('✅ XML parseado exitosamente')
    
    return {
      clave,
      consecutivo,
      fechaEmision,
      emisor,
      receptor,
      condicionVenta,
      medioPago,
      items,
      resumen
    }
  }
}

