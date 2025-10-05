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
  numeroTelefono: string
  correoElectronico: string
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
  totalServGravados: number
  totalGravado: number
  totalVenta: number
  totalVentaNeta: number
  totalDesgloseImpuesto: {
    codigo: string
    codigoTarifaIVA: string
    totalMontoImpuesto: number
  }
  totalImpuesto: number
  tipoMedioPago: string
  totalMedioPago: number
  totalComprobante: number
}

export class XMLGenerator {
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
    // Provincia se mantiene igual
    const provinciaRelativa = provincia

    // Cantón: restar prefijo de provincia (multiplicar por 100)
    const provinciaPrefix = parseInt(provincia) * 100
    const cantonRelativo = (parseInt(canton) - provinciaPrefix).toString().padStart(2, '0')

    // Distrito: restar prefijo de cantón (multiplicar por 100)
    const cantonPrefix = parseInt(canton) * 100
    const distritoRelativo = (parseInt(distrito) - cantonPrefix).toString().padStart(2, '0')

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
  
  <ResumenFactura>
    <CodigoTipoMoneda>
      <CodigoMoneda>${this.escapeXml(facturaData.codigoMoneda)}</CodigoMoneda>
      <TipoCambio>${facturaData.tipoCambio}</TipoCambio>
    </CodigoTipoMoneda>
    <TotalServGravados>${facturaData.totalServGravados}</TotalServGravados>
    <TotalGravado>${facturaData.totalGravado}</TotalGravado>
    <TotalVenta>${facturaData.totalVenta}</TotalVenta>
    <TotalVentaNeta>${facturaData.totalVentaNeta}</TotalVentaNeta>
    <TotalDesgloseImpuesto>
      <Codigo>${this.escapeXml(facturaData.totalDesgloseImpuesto.codigo)}</Codigo>
      <CodigoTarifaIVA>${this.escapeXml(facturaData.totalDesgloseImpuesto.codigoTarifaIVA)}</CodigoTarifaIVA>
      <TotalMontoImpuesto>${facturaData.totalDesgloseImpuesto.totalMontoImpuesto}</TotalMontoImpuesto>
    </TotalDesgloseImpuesto>
    <TotalImpuesto>${facturaData.totalImpuesto}</TotalImpuesto>
    <MedioPago>
      <TipoMedioPago>${this.escapeXml(facturaData.tipoMedioPago)}</TipoMedioPago>
      <TotalMedioPago>${facturaData.totalMedioPago}</TotalMedioPago>
    </MedioPago>
    <TotalComprobante>${facturaData.totalComprobante}</TotalComprobante>
  </ResumenFactura>
  
  <Otros>
    <OtroTexto>--- Sistema de Facturación Electrónica ---</OtroTexto>
  </Otros>
</FacturaElectronica>`

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
  <Telefono>
    <CodigoPais>${this.escapeXml(emisor.codigoPais)}</CodigoPais>
    <NumTelefono>${this.escapeXml(emisor.numeroTelefono)}</NumTelefono>
  </Telefono>
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
  <Telefono>
    <CodigoPais>${this.escapeXml(receptor.codigoPais)}</CodigoPais>
    <NumTelefono>${this.escapeXml(receptor.numeroTelefono)}</NumTelefono>
  </Telefono>
  <CorreoElectronico>${this.escapeXml(receptor.correoElectronico)}</CorreoElectronico>
</Receptor>`
  }

  /**
   * Genera el XML de una línea de detalle
   */
  private static generateLineaDetalleXML(linea: LineaDetalle): string {
    return `<LineaDetalle>
  <NumeroLinea>${linea.numeroLinea}</NumeroLinea>
  <CodigoCABYS>${this.escapeXml(linea.codigoCABYS)}</CodigoCABYS>
  <Cantidad>${linea.cantidad}</Cantidad>
  <UnidadMedida>${this.escapeXml(linea.unidadMedida)}</UnidadMedida>
  <Detalle>${this.escapeXml(linea.detalle)}</Detalle>
  <PrecioUnitario>${linea.precioUnitario}</PrecioUnitario>
  <MontoTotal>${linea.montoTotal}</MontoTotal>
  <SubTotal>${linea.subTotal}</SubTotal>
  <BaseImponible>${linea.baseImponible}</BaseImponible>
  <Impuesto>
    <Codigo>${this.escapeXml(linea.impuesto.codigo)}</Codigo>
    <CodigoTarifaIVA>${this.escapeXml(linea.impuesto.codigoTarifaIVA)}</CodigoTarifaIVA>
    <Tarifa>${linea.impuesto.tarifa}</Tarifa>
    <Monto>${linea.impuesto.monto}</Monto>
  </Impuesto>
  <ImpuestoAsumidoEmisorFabrica>${linea.impuestoAsumidoEmisorFabrica}</ImpuestoAsumidoEmisorFabrica>
  <ImpuestoNeto>${linea.impuestoNeto}</ImpuestoNeto>
  <MontoTotalLinea>${linea.montoTotalLinea}</MontoTotalLinea>
</LineaDetalle>`
  }

  /**
   * Escapa caracteres especiales XML
   */
  private static escapeXml(text: string): string {
    return text
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
