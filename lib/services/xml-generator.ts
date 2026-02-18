/**
 * Servicio para generar XML de Facturas Electrónicas según esquema Hacienda v4.4
 */

export interface EmisorData {
  nombre: string
  tipoIdentificacion: string
  numeroIdentificacion: string
  nombreComercial: string
  provincia: string
  canton: string
  distrito: string
  otrasSenas: string
  codigoPais: string
  numeroTelefono: string
  correoElectronico: string
}

export interface ReceptorData {
  nombre: string
  tipoIdentificacion: string
  numeroIdentificacion: string
  nombreComercial: string
  provincia: string
  canton: string
  distrito: string
  otrasSenas: string
  codigoPais: string
  numeroTelefono?: string | null
  correoElectronico?: string | null
}

export interface ExoneracionXML {
  tipoDocumento: string
  tipoDocumentoOtro?: string
  numeroDocumento: string
  nombreLey?: string // Nombre de la Ley Especial (para tipoDocumento = '03')
  articulo?: number
  inciso?: number
  porcentajeCompra?: number // % de Compra (para tipoDocumento = '03')
  nombreInstitucion: string
  nombreInstitucionOtros?: string
  fechaEmision: string
  tarifaExonerada: number
  montoExoneracion: number
}

export interface LineaDetalle {
  numeroLinea: number
  codigoCABYS: string
  cantidad: number
  unidadMedida: string
  detalle: string
  precioUnitario: number
  montoTotal: number
  subTotal: number
  baseImponible: number
  impuesto: {
    codigo: string
    codigoTarifaIVA: string
    tarifa: number
    monto: number
    exoneracion?: ExoneracionXML // Opcional
  }
  impuestoAsumidoEmisorFabrica: number
  impuestoNeto: number
  montoTotalLinea: number
}

export interface FacturaData {
  clave: string
  proveedorSistemas: string
  codigoActividadEmisor: string
  codigoActividadReceptor: string
  numeroConsecutivo: string
  fechaEmision: string
  emisor: EmisorData
  receptor: ReceptorData
  condicionVenta: string
  lineasDetalle: LineaDetalle[]
  codigoMoneda: string
  tipoCambio: number
  totalServGravados?: number
  totalServExonerado?: number
  totalGravado?: number
  totalExonerado?: number
  totalVenta: number
  totalVentaNeta: number
  totalDesgloseImpuesto?: {
    codigo: string
    codigoTarifaIVA: string
    totalMontoImpuesto: number
  }
  totalImpuesto?: number
  tipoMedioPago: string
  totalMedioPago: number
  totalComprobante: number
  otros?: string // Notas adicionales opcionales
}

export class XMLGenerator {
  /**
   * Formatea un número a máximo 5 decimales para cumplir con las especificaciones de Hacienda
   */
  private static formatAmount(amount: number | string | null | undefined): string {
    // Manejar valores nulos o indefinidos
    if (amount === null || amount === undefined) return '0'
    
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return '0'
    
    // Formatear a máximo 5 decimales, eliminando ceros innecesarios
    return num.toFixed(5).replace(/\.?0+$/, '') || '0'
  }

  /**
   * Convierte códigos de ubicación completos a códigos relativos para Hacienda
   * Provincia: se mantiene igual
   * Cantón: se resta el prefijo de provincia (ej: 302 - 300 = 02)
   * Distrito: se resta el prefijo de cantón (ej: 30205 - 30200 = 05)
   */
  private static convertLocationCodes(provincia: string, canton: string, distrito: string): {
    provinciaRelativa: string
    cantonRelativo: string
    distritoRelativo: string
  } {
    // Provincia se mantiene igual (validar que sea un número válido)
    const provinciaNum = parseInt(provincia) || 1
    const provinciaRelativa = provinciaNum.toString()

    // Validar y convertir cantón
    // Si el cantón viene como número negativo o inválido, usar valor por defecto
    let cantonNum = parseInt(canton)
    if (isNaN(cantonNum) || cantonNum < 0) {
      console.warn(`⚠️ Cantón inválido: ${canton}, usando valor por defecto basado en provincia`)
      cantonNum = provinciaNum * 100 + 1 // Cantón 01 de la provincia
    }
    
    // Cantón: restar prefijo de provincia (multiplicar por 100)
    const provinciaPrefix = provinciaNum * 100
    const cantonRelativoNum = cantonNum - provinciaPrefix
    // Asegurar que el cantón relativo sea positivo y válido
    const cantonRelativo = Math.max(1, cantonRelativoNum).toString().padStart(2, '0')

    // Validar y convertir distrito
    let distritoNum = parseInt(distrito)
    if (isNaN(distritoNum) || distritoNum < 0) {
      console.warn(`⚠️ Distrito inválido: ${distrito}, usando valor por defecto basado en cantón`)
      distritoNum = cantonNum * 100 + 1 // Distrito 01 del cantón
    }
    
    // Distrito: restar prefijo de cantón (multiplicar por 100)
    const cantonPrefix = cantonNum * 100
    const distritoRelativoNum = distritoNum - cantonPrefix
    // Asegurar que el distrito relativo sea positivo y válido
    const distritoRelativo = Math.max(1, distritoRelativoNum).toString().padStart(2, '0')

    return {
      provinciaRelativa,
      cantonRelativo,
      distritoRelativo
    }
  }

  /**
   * Genera el XML de una Factura Electrónica
   */
  static generateFacturaXML(facturaData: FacturaData): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica.xsd">
  <Clave>${this.escapeXml(facturaData.clave)}</Clave>
  <ProveedorSistemas>${this.escapeXml(facturaData.proveedorSistemas)}</ProveedorSistemas>
  <CodigoActividadEmisor>${this.escapeXml(facturaData.codigoActividadEmisor)}</CodigoActividadEmisor>
  <CodigoActividadReceptor>${this.escapeXml(facturaData.codigoActividadReceptor)}</CodigoActividadReceptor>
  <NumeroConsecutivo>${this.escapeXml(facturaData.numeroConsecutivo)}</NumeroConsecutivo>
  <FechaEmision>${this.escapeXml(facturaData.fechaEmision)}</FechaEmision>
  
  ${this.generateEmisorXML(facturaData.emisor)}
  
  ${this.generateReceptorXML(facturaData.receptor)}
  
  <CondicionVenta>${this.escapeXml(facturaData.condicionVenta)}</CondicionVenta>
  
  <DetalleServicio>
    ${facturaData.lineasDetalle.map(linea => this.generateLineaDetalleXML(linea)).join('\n    ')}
  </DetalleServicio>
  
  ${this.generateResumenFacturaXML(facturaData)}
  
  <Otros>
    <OtroTexto>${this.escapeXml(facturaData.otros || '--- Sistema de Facturación Electrónica ---')}</OtroTexto>
  </Otros>
</FacturaElectronica>`

    return xml
  }

  /**
   * Genera el XML de un Tiquete Electrónico
   */
  static generateTiqueteXML(tiqueteData: FacturaData & { receptor?: ReceptorData | null }): string {
    // En tiquetes electrónicos, el receptor es opcional
    // Si no hay cliente, no se incluye el bloque Receptor
    const receptorXML = tiqueteData.receptor 
      ? this.generateReceptorXML(tiqueteData.receptor)
      : ''

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TiqueteElectronico xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico.xsd">
  <Clave>${this.escapeXml(tiqueteData.clave)}</Clave>
  <ProveedorSistemas>${this.escapeXml(tiqueteData.proveedorSistemas)}</ProveedorSistemas>
  <CodigoActividadEmisor>${this.escapeXml(tiqueteData.codigoActividadEmisor)}</CodigoActividadEmisor>
  <NumeroConsecutivo>${this.escapeXml(tiqueteData.numeroConsecutivo)}</NumeroConsecutivo>
  <FechaEmision>${this.escapeXml(tiqueteData.fechaEmision)}</FechaEmision>
  
  ${this.generateEmisorXML(tiqueteData.emisor)}
  
${receptorXML ? `  ${receptorXML}` : ''}
  
  <CondicionVenta>${this.escapeXml(tiqueteData.condicionVenta)}</CondicionVenta>
  
  <DetalleServicio>
    ${tiqueteData.lineasDetalle.map(linea => this.generateLineaDetalleXML(linea)).join('\n    ')}
  </DetalleServicio>
  
  ${this.generateResumenTiqueteXML(tiqueteData)}
  
  <Otros>
    <OtroTexto>${this.escapeXml(tiqueteData.otros || '--- Sistema de Facturación Electrónica ---')}</OtroTexto>
  </Otros>
</TiqueteElectronico>`

    return xml
  }

  /**
   * Genera el XML del emisor
   */
  private static generateEmisorXML(emisor: EmisorData): string {
    // Convertir códigos de ubicación a formato relativo para Hacienda
    const { provinciaRelativa, cantonRelativo, distritoRelativo } = this.convertLocationCodes(
      emisor.provincia,
      emisor.canton,
      emisor.distrito
    )

    // Validar teléfono: NumTelefono debe ser un entero válido (mínimo 8 dígitos según schema)
    // Si no hay teléfono válido, no incluir el bloque Telefono
    const numeroTelefonoLimpio = emisor.numeroTelefono?.replace(/\D/g, '') || ''
    const tieneTelefonoValido = numeroTelefonoLimpio.length >= 8 // Mínimo 8 dígitos según schema
    const telefonoXML = tieneTelefonoValido 
      ? `  <Telefono>
    <CodigoPais>${this.escapeXml(emisor.codigoPais)}</CodigoPais>
    <NumTelefono>${numeroTelefonoLimpio}</NumTelefono>
  </Telefono>`
      : ''

    return `<Emisor>
  <Nombre>${this.escapeXml(emisor.nombre)}</Nombre>
  <Identificacion>
    <Tipo>${this.escapeXml(emisor.tipoIdentificacion)}</Tipo>
    <Numero>${this.escapeXml(emisor.numeroIdentificacion.replace(/-/g, ''))}</Numero>
  </Identificacion>
  <NombreComercial>${this.escapeXml(emisor.nombreComercial)}</NombreComercial>
  <Ubicacion>
    <Provincia>${this.escapeXml(provinciaRelativa)}</Provincia>
    <Canton>${this.escapeXml(cantonRelativo)}</Canton>
    <Distrito>${this.escapeXml(distritoRelativo)}</Distrito>
    <OtrasSenas>${this.escapeXml(emisor.otrasSenas)}</OtrasSenas>
  </Ubicacion>
${telefonoXML}
  <CorreoElectronico>${this.escapeXml(emisor.correoElectronico)}</CorreoElectronico>
</Emisor>`
  }

  /**
   * Genera el XML del receptor
   */
  private static generateReceptorXML(receptor: ReceptorData): string {
    // Convertir códigos de ubicación a formato relativo para Hacienda
    const { provinciaRelativa, cantonRelativo, distritoRelativo } = this.convertLocationCodes(
      receptor.provincia,
      receptor.canton,
      receptor.distrito
    )

    // Validar teléfono: NumTelefono debe ser un entero válido (mínimo 8 dígitos según schema)
    // Si no hay teléfono válido, no incluir el bloque Telefono
    const numeroTelefonoLimpio = receptor.numeroTelefono?.replace(/\D/g, '') || ''
    const tieneTelefonoValido = numeroTelefonoLimpio.length >= 8 // Mínimo 8 dígitos según schema
    const telefonoXML = tieneTelefonoValido 
      ? `  <Telefono>
    <CodigoPais>${this.escapeXml(receptor.codigoPais)}</CodigoPais>
    <NumTelefono>${numeroTelefonoLimpio}</NumTelefono>
  </Telefono>`
      : ''

    // Validar correo electrónico: debe tener formato válido según schema Hacienda
    // Patrón: \s*\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*\s*
    const emailRegex = /^\s*\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*\s*$/
    const tieneEmailValido = receptor.correoElectronico && 
                              receptor.correoElectronico.trim() !== '' && 
                              emailRegex.test(receptor.correoElectronico)
    const correoXML = tieneEmailValido
      ? `  <CorreoElectronico>${this.escapeXml(receptor.correoElectronico.trim())}</CorreoElectronico>`
      : ''

    return `<Receptor>
  <Nombre>${this.escapeXml(receptor.nombre)}</Nombre>
  <Identificacion>
    <Tipo>${this.escapeXml(receptor.tipoIdentificacion)}</Tipo>
    <Numero>${this.escapeXml(receptor.numeroIdentificacion.replace(/-/g, ''))}</Numero>
  </Identificacion>
  <NombreComercial>${this.escapeXml(receptor.nombreComercial)}</NombreComercial>
  <Ubicacion>
    <Provincia>${this.escapeXml(provinciaRelativa)}</Provincia>
    <Canton>${this.escapeXml(cantonRelativo)}</Canton>
    <Distrito>${this.escapeXml(distritoRelativo)}</Distrito>
    <OtrasSenas>${this.escapeXml(receptor.otrasSenas)}</OtrasSenas>
  </Ubicacion>
  <OtrasSenasExtranjero>${this.escapeXml(receptor.otrasSenas)}</OtrasSenasExtranjero>
${telefonoXML}
${correoXML}
</Receptor>`
  }

  /**
   * Genera el XML de una línea de detalle
   */
  private static generateLineaDetalleXML(linea: LineaDetalle): string {
    return `<LineaDetalle>
  <NumeroLinea>${linea.numeroLinea}</NumeroLinea>
  <CodigoCABYS>${this.escapeXml(linea.codigoCABYS)}</CodigoCABYS>
  <Cantidad>${this.formatAmount(linea.cantidad)}</Cantidad>
  <UnidadMedida>${this.escapeXml(linea.unidadMedida)}</UnidadMedida>
  <Detalle>${this.escapeXml(linea.detalle)}</Detalle>
  <PrecioUnitario>${this.formatAmount(linea.precioUnitario)}</PrecioUnitario>
  <MontoTotal>${this.formatAmount(linea.montoTotal)}</MontoTotal>
  <SubTotal>${this.formatAmount(linea.subTotal)}</SubTotal>
  <BaseImponible>${this.formatAmount(linea.baseImponible)}</BaseImponible>
  <Impuesto>
    <Codigo>${this.escapeXml(linea.impuesto.codigo)}</Codigo>
    <CodigoTarifaIVA>${this.escapeXml(linea.impuesto.codigoTarifaIVA)}</CodigoTarifaIVA>
    <Tarifa>${this.formatAmount(linea.impuesto.tarifa)}</Tarifa>
    <Monto>${this.formatAmount(linea.impuesto.monto)}</Monto>${linea.impuesto.exoneracion ? this.generateExoneracionXML(linea.impuesto.exoneracion) : ''}
  </Impuesto>
  <ImpuestoAsumidoEmisorFabrica>${this.formatAmount(linea.impuestoAsumidoEmisorFabrica)}</ImpuestoAsumidoEmisorFabrica>
  <ImpuestoNeto>${this.formatAmount(linea.impuestoNeto)}</ImpuestoNeto>
  <MontoTotalLinea>${this.formatAmount(linea.montoTotalLinea)}</MontoTotalLinea>
</LineaDetalle>`
  }

  /**
   * Genera el XML de Exoneración
   */
  private static generateExoneracionXML(exoneracion: ExoneracionXML): string {
    let xml = '\n    <Exoneracion>'
    xml += `\n      <TipoDocumentoEX1>${this.escapeXml(exoneracion.tipoDocumento)}</TipoDocumentoEX1>`
    
    // Campo "Otros" - obligatorio si tipoDocumento = '99'
    if (exoneracion.tipoDocumento === '99' && exoneracion.tipoDocumentoOtro) {
      xml += `\n      <TipoDocumentoOTRO>${this.escapeXml(exoneracion.tipoDocumentoOtro)}</TipoDocumentoOTRO>`
    }
    
    xml += `\n      <NumeroDocumento>${this.escapeXml(exoneracion.numeroDocumento)}</NumeroDocumento>`
    
    // Nombre de la Ley Especial - opcional, para tipoDocumento = '03'
    if (exoneracion.nombreLey) {
      xml += `\n      <NombreLey>${this.escapeXml(exoneracion.nombreLey)}</NombreLey>`
    }
    
    // Artículo e Inciso - opcionales
    // Si hay artículo, siempre debe incluirse inciso (aunque sea 0)
    if (exoneracion.articulo !== undefined && exoneracion.articulo !== null) {
      xml += `\n      <Articulo>${exoneracion.articulo}</Articulo>`
      // Si hay artículo, incluir inciso (usar 0 si no está definido)
      const incisoValue = exoneracion.inciso !== undefined && exoneracion.inciso !== null ? exoneracion.inciso : 0
      xml += `\n      <Inciso>${incisoValue}</Inciso>`
    } else if (exoneracion.inciso !== undefined && exoneracion.inciso !== null) {
      // Si solo hay inciso sin artículo, también incluirlo
      xml += `\n      <Inciso>${exoneracion.inciso}</Inciso>`
    }
    
    // Porcentaje de Compra - opcional, para tipoDocumento = '03'
    if (exoneracion.porcentajeCompra) {
      xml += `\n      <PorcentajeCompra>${this.formatAmount(exoneracion.porcentajeCompra)}</PorcentajeCompra>`
    }
    
    xml += `\n      <NombreInstitucion>${this.escapeXml(exoneracion.nombreInstitucion)}</NombreInstitucion>`
    
    // Campo "Otros" para institución - obligatorio si nombreInstitucion = '99'
    if (exoneracion.nombreInstitucion === '99' && exoneracion.nombreInstitucionOtros) {
      xml += `\n      <NombreInstitucionOtros>${this.escapeXml(exoneracion.nombreInstitucionOtros)}</NombreInstitucionOtros>`
    }
    
    // Asegurar que la fecha tenga formato xs:dateTime con timezone
    let fechaFormateada = exoneracion.fechaEmision
    if (!fechaFormateada.includes('T')) {
      fechaFormateada = fechaFormateada + 'T00:00:00-06:00'
    } else if (!fechaFormateada.includes('+') && !fechaFormateada.includes('-')) {
      // Si tiene T pero no timezone, agregar timezone de Costa Rica
      fechaFormateada = fechaFormateada + '-06:00'
    }
    
    xml += `\n      <FechaEmisionEX>${this.escapeXml(fechaFormateada)}</FechaEmisionEX>`
    xml += `\n      <TarifaExonerada>${this.formatAmount(exoneracion.tarifaExonerada)}</TarifaExonerada>`
    xml += `\n      <MontoExoneracion>${this.formatAmount(exoneracion.montoExoneracion)}</MontoExoneracion>`
    xml += '\n    </Exoneracion>'
    
    return xml
  }

  /**
   * Escapa caracteres especiales XML
   */
  private static escapeXml(text: string | number | undefined | null): string {
    // Convertir a string si no lo es, o retornar string vacío si es null/undefined
    const textStr = text === null || text === undefined ? '' : String(text)
    return textStr
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  /**
   * Genera la clave de la factura según formato Hacienda
   */
  static generateClave(
    codigoPais: string,
    tipoDocumento: string,
    numeroIdentificacion: string,
    situacion: string,
    codigoSeguridad: string,
    consecutivo: string,
    tipoEmision: string
  ): string {
    return `${codigoPais}${tipoDocumento}${numeroIdentificacion}${situacion}${codigoSeguridad}${consecutivo}${tipoEmision}`
  }

  /**
   * Genera el número consecutivo formateado
   */
  static generateConsecutivo(numero: number): string {
    return numero.toString().padStart(10, '0')
  }

  /**
   * Genera el XML del resumen de la factura, manejando correctamente las exoneraciones
   */
  private static generateResumenFacturaXML(facturaData: FacturaData): string {
    // Detectar si hay exoneraciones en alguna línea
    const tieneExoneraciones = facturaData.lineasDetalle.some(linea => linea.impuesto?.exoneracion)
    
    let resumen = `<ResumenFactura>
    <CodigoTipoMoneda>
      <CodigoMoneda>${this.escapeXml(facturaData.codigoMoneda)}</CodigoMoneda>
      <TipoCambio>${this.formatAmount(facturaData.tipoCambio)}</TipoCambio>
    </CodigoTipoMoneda>`
    
    if (tieneExoneraciones) {
      // Cuando hay exoneraciones:
      // - TotalServExonerado: suma de líneas exoneradas
      // - TotalServGravados: 0 (no hay servicios gravados)
      // - TotalExonerado: suma de base imponible de líneas exoneradas
      // - TotalGravado: 0
      // - TotalImpuesto: 0 (no se cobra impuesto)
      // - No incluir TotalDesgloseImpuesto
      const totalServExonerado = facturaData.lineasDetalle
        .filter(linea => linea.impuesto?.exoneracion)
        .reduce((sum, linea) => sum + linea.baseImponible, 0)
      
      const totalExonerado = totalServExonerado
      
      resumen += `\n    <TotalServGravados>${this.formatAmount(0)}</TotalServGravados>
    <TotalServExonerado>${this.formatAmount(totalServExonerado)}</TotalServExonerado>
    <TotalGravado>${this.formatAmount(0)}</TotalGravado>
    <TotalExonerado>${this.formatAmount(totalExonerado)}</TotalExonerado>
    <TotalVenta>${this.formatAmount(facturaData.totalVenta)}</TotalVenta>
    <TotalVentaNeta>${this.formatAmount(facturaData.totalVentaNeta)}</TotalVentaNeta>
    <TotalImpuesto>${this.formatAmount(0)}</TotalImpuesto>`
    } else {
      // Cuando NO hay exoneraciones, usar los valores normales
      resumen += `\n    <TotalServGravados>${this.formatAmount(facturaData.totalServGravados || 0)}</TotalServGravados>
    <TotalGravado>${this.formatAmount(facturaData.totalGravado || 0)}</TotalGravado>
    <TotalVenta>${this.formatAmount(facturaData.totalVenta)}</TotalVenta>
    <TotalVentaNeta>${this.formatAmount(facturaData.totalVentaNeta)}</TotalVentaNeta>`
      
      // Solo incluir desglose de impuestos si hay impuestos y no hay exoneraciones
      if (facturaData.totalDesgloseImpuesto && facturaData.totalDesgloseImpuesto.totalMontoImpuesto > 0) {
        resumen += `\n    <TotalDesgloseImpuesto>
      <Codigo>${this.escapeXml(facturaData.totalDesgloseImpuesto.codigo)}</Codigo>
      <CodigoTarifaIVA>${this.escapeXml(facturaData.totalDesgloseImpuesto.codigoTarifaIVA)}</CodigoTarifaIVA>
      <TotalMontoImpuesto>${this.formatAmount(facturaData.totalDesgloseImpuesto.totalMontoImpuesto)}</TotalMontoImpuesto>
    </TotalDesgloseImpuesto>`
      }
      
      resumen += `\n    <TotalImpuesto>${this.formatAmount(facturaData.totalImpuesto || 0)}</TotalImpuesto>`
    }
    
    resumen += `\n    <MedioPago>
      <TipoMedioPago>${this.escapeXml(facturaData.tipoMedioPago)}</TipoMedioPago>
      <TotalMedioPago>${this.formatAmount(facturaData.totalMedioPago)}</TotalMedioPago>
    </MedioPago>
    <TotalComprobante>${this.formatAmount(facturaData.totalComprobante)}</TotalComprobante>
  </ResumenFactura>`
    
    return resumen
  }

  /**
   * Genera el resumen para tiquetes electrónicos (sin TotalMedioPago)
   */
  private static generateResumenTiqueteXML(tiqueteData: FacturaData): string {
    // Verificar si hay exoneraciones en las líneas
    const tieneExoneraciones = tiqueteData.lineasDetalle.some(linea => linea.impuesto?.exoneracion)
    
    let resumen = `<ResumenFactura>
    <CodigoTipoMoneda>
      <CodigoMoneda>${this.escapeXml(tiqueteData.codigoMoneda)}</CodigoMoneda>
      <TipoCambio>${this.formatAmount(tiqueteData.tipoCambio)}</TipoCambio>
    </CodigoTipoMoneda>`
    
    if (tieneExoneraciones) {
      const totalServExonerado = tiqueteData.lineasDetalle
        .filter(linea => linea.impuesto?.exoneracion)
        .reduce((sum, linea) => sum + linea.baseImponible, 0)
      
      const totalExonerado = totalServExonerado
      
      resumen += `\n    <TotalServGravados>${this.formatAmount(0)}</TotalServGravados>
    <TotalServExonerado>${this.formatAmount(totalServExonerado)}</TotalServExonerado>
    <TotalGravado>${this.formatAmount(0)}</TotalGravado>
    <TotalExonerado>${this.formatAmount(totalExonerado)}</TotalExonerado>
    <TotalVenta>${this.formatAmount(tiqueteData.totalVenta)}</TotalVenta>
    <TotalVentaNeta>${this.formatAmount(tiqueteData.totalVentaNeta)}</TotalVentaNeta>
    <TotalImpuesto>${this.formatAmount(0)}</TotalImpuesto>`
    } else {
      resumen += `\n    <TotalServGravados>${this.formatAmount(tiqueteData.totalServGravados || 0)}</TotalServGravados>
    <TotalGravado>${this.formatAmount(tiqueteData.totalGravado || 0)}</TotalGravado>
    <TotalVenta>${this.formatAmount(tiqueteData.totalVenta)}</TotalVenta>
    <TotalVentaNeta>${this.formatAmount(tiqueteData.totalVentaNeta)}</TotalVentaNeta>`
      
      if (tiqueteData.totalDesgloseImpuesto && tiqueteData.totalDesgloseImpuesto.totalMontoImpuesto > 0) {
        resumen += `\n    <TotalDesgloseImpuesto>
      <Codigo>${this.escapeXml(tiqueteData.totalDesgloseImpuesto.codigo)}</Codigo>
      <CodigoTarifaIVA>${this.escapeXml(tiqueteData.totalDesgloseImpuesto.codigoTarifaIVA)}</CodigoTarifaIVA>
      <TotalMontoImpuesto>${this.formatAmount(tiqueteData.totalDesgloseImpuesto.totalMontoImpuesto)}</TotalMontoImpuesto>
    </TotalDesgloseImpuesto>`
      }
      
      resumen += `\n    <TotalImpuesto>${this.formatAmount(tiqueteData.totalImpuesto || 0)}</TotalImpuesto>`
    }
    
    // Para tiquetes, incluir TipoMedioPago y TotalMedioPago (igual que facturas)
    resumen += `\n    <MedioPago>
      <TipoMedioPago>${this.escapeXml(tiqueteData.tipoMedioPago)}</TipoMedioPago>
      <TotalMedioPago>${this.formatAmount(tiqueteData.totalMedioPago)}</TotalMedioPago>
    </MedioPago>
    <TotalComprobante>${this.formatAmount(tiqueteData.totalComprobante)}</TotalComprobante>
  </ResumenFactura>`
    
    return resumen
  }

  /**
   * Obtiene el tipo de documento para la clave
   */
  static getTipoDocumento(tipo: 'facturas' | 'tiquetes' | 'notas-credito' | 'notas-debito'): string {
    const tipos = {
      'facturas': '01',
      'tiquetes': '02', 
      'notas-credito': '03',
      'notas-debito': '04'
    }
    return tipos[tipo] || '01'
  }
}
