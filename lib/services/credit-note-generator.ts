/**
 * Servicio para generar XML de Notas de Crédito según schema NC 4.4 de Costa Rica
 */

export interface CreditNoteData {
  // Referencia a la factura original
  referenciaFactura: {
    tipoDoc: '01' | '02' | '03' | '04' // 01: Factura electrónica
    numero: string // Clave de 50 dígitos
    fechaEmision: string
    codigo: '01' | '02' | '04' | '05' | '06' | '07' | '09' | '10' // Código de referencia
    razon: string // Razón de la NC (max 180 caracteres)
  }

  // Información básica
  clave: string
  consecutivo: string
  fechaEmision: string
  
  // Emisor (empresa)
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

  // Receptor (cliente)
  receptor?: {
    nombre: string
    identificacion: string
    tipoIdentificacion: string
    nombreComercial?: string
    ubicacion?: {
      provincia: string
      canton: string
      distrito: string
      otrasSenas: string
    }
    telefono?: {
      codigoPais: string
      numero: string
    }
    correoElectronico?: string
  }

  // Actividades económicas
  actividadEconomicaEmisor?: string
  actividadEconomicaReceptor?: string

  // Condiciones
  condicionVenta: string
  plazoCredito?: string
  medioPago: string

  // Items
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

  // Resumen
  resumen: {
    codigoTipoMoneda: {
      codigoMoneda: string
      tipoCambio: number
    }
    totalServGravados?: number
    totalServExentos?: number
    totalServExonerado?: number
    totalMercanciasGravadas?: number
    totalMercanciasExentas?: number
    totalMercanciasExoneradas?: number
    totalGravado: number
    totalExento: number
    totalExonerado: number
    totalVenta: number
    totalDescuentos?: number
    totalVentaNeta: number
    totalDesgloseImpuesto?: {
      codigo: string
      codigoTarifaIVA: string
      totalMontoImpuesto: number
    }
    totalImpuesto: number
    totalIVADevuelto?: number
    totalOtrosCargos?: number
    totalComprobante: number
  }
}

export class CreditNoteGenerator {
  /**
   * Genera el XML de una nota de crédito según el schema NC 4.4
   */
  static generateXML(data: CreditNoteData): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NotaCreditoElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaCreditoElectronica" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaCreditoElectronica https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaCreditoElectronica.xsd">
  <Clave>${data.clave}</Clave>
  <ProveedorSistemas>${data.emisor.identificacion}</ProveedorSistemas>
  ${data.actividadEconomicaEmisor ? `<CodigoActividadEmisor>${data.actividadEconomicaEmisor}</CodigoActividadEmisor>` : ''}
  ${data.actividadEconomicaReceptor ? `<CodigoActividadReceptor>${data.actividadEconomicaReceptor}</CodigoActividadReceptor>` : ''}
  <NumeroConsecutivo>${data.consecutivo}</NumeroConsecutivo>
  <FechaEmision>${data.fechaEmision}</FechaEmision>
  <Emisor>
    <Nombre>${this.escapeXml(data.emisor.nombre)}</Nombre>
    <Identificacion>
      <Tipo>${data.emisor.tipoIdentificacion}</Tipo>
      <Numero>${data.emisor.identificacion}</Numero>
    </Identificacion>
    <NombreComercial>${this.escapeXml(data.emisor.nombreComercial)}</NombreComercial>
    <Ubicacion>
      <Provincia>${data.emisor.ubicacion.provincia}</Provincia>
      <Canton>${data.emisor.ubicacion.canton}</Canton>
      <Distrito>${data.emisor.ubicacion.distrito}</Distrito>
      <OtrasSenas>${this.escapeXml(data.emisor.ubicacion.otrasSenas)}</OtrasSenas>
    </Ubicacion>
    <Telefono>
      <CodigoPais>${data.emisor.telefono.codigoPais}</CodigoPais>
      <NumTelefono>${data.emisor.telefono.numero}</NumTelefono>
    </Telefono>
    <CorreoElectronico>${data.emisor.correoElectronico}</CorreoElectronico>
  </Emisor>
  ${data.receptor ? this.generateReceptorXML(data.receptor) : ''}
  <CondicionVenta>${data.condicionVenta}</CondicionVenta>
  ${data.plazoCredito ? `<PlazoCredito>${data.plazoCredito}</PlazoCredito>` : ''}
  <DetalleServicio>
${data.items.map(item => this.generateLineaDetalleXML(item)).join('\n')}
  </DetalleServicio>
  <ResumenFactura>
    <CodigoTipoMoneda>
      <CodigoMoneda>${data.resumen.codigoTipoMoneda.codigoMoneda}</CodigoMoneda>
      <TipoCambio>${data.resumen.codigoTipoMoneda.tipoCambio}</TipoCambio>
    </CodigoTipoMoneda>
    ${data.resumen.totalServGravados ? `<TotalServGravados>${data.resumen.totalServGravados}</TotalServGravados>` : ''}
    ${data.resumen.totalServExentos ? `<TotalServExentos>${data.resumen.totalServExentos}</TotalServExentos>` : ''}
    ${data.resumen.totalServExonerado ? `<TotalServExonerado>${data.resumen.totalServExonerado}</TotalServExonerado>` : ''}
    ${data.resumen.totalMercanciasGravadas ? `<TotalMercanciasGravadas>${data.resumen.totalMercanciasGravadas}</TotalMercanciasGravadas>` : ''}
    ${data.resumen.totalMercanciasExentas ? `<TotalMercanciasExentas>${data.resumen.totalMercanciasExentas}</TotalMercanciasExentas>` : ''}
    ${data.resumen.totalMercanciasExoneradas ? `<TotalMercanciasExoneradas>${data.resumen.totalMercanciasExoneradas}</TotalMercanciasExoneradas>` : ''}
    <TotalGravado>${data.resumen.totalGravado}</TotalGravado>
    <TotalExento>${data.resumen.totalExento}</TotalExento>
    <TotalExonerado>${data.resumen.totalExonerado}</TotalExonerado>
    <TotalVenta>${data.resumen.totalVenta}</TotalVenta>
    ${data.resumen.totalDescuentos ? `<TotalDescuentos>${data.resumen.totalDescuentos}</TotalDescuentos>` : ''}
    <TotalVentaNeta>${data.resumen.totalVentaNeta}</TotalVentaNeta>
    ${data.resumen.totalDesgloseImpuesto ? `<TotalDesgloseImpuesto>
      <Codigo>${data.resumen.totalDesgloseImpuesto.codigo}</Codigo>
      <CodigoTarifaIVA>${data.resumen.totalDesgloseImpuesto.codigoTarifaIVA}</CodigoTarifaIVA>
      <TotalMontoImpuesto>${data.resumen.totalDesgloseImpuesto.totalMontoImpuesto}</TotalMontoImpuesto>
    </TotalDesgloseImpuesto>` : ''}
    <TotalImpuesto>${data.resumen.totalImpuesto}</TotalImpuesto>
    ${data.resumen.totalIVADevuelto ? `<TotalIVADevuelto>${data.resumen.totalIVADevuelto}</TotalIVADevuelto>` : ''}
    ${data.resumen.totalOtrosCargos ? `<TotalOtrosCargos>${data.resumen.totalOtrosCargos}</TotalOtrosCargos>` : ''}
    ${data.medioPago ? `<MedioPago>
      <TipoMedioPago>${data.medioPago}</TipoMedioPago>
      <TotalMedioPago>${data.resumen.totalComprobante}</TotalMedioPago>
    </MedioPago>` : ''}
    <TotalComprobante>${data.resumen.totalComprobante}</TotalComprobante>
  </ResumenFactura>
  <InformacionReferencia>
    <TipoDocIR>${data.referenciaFactura.tipoDoc}</TipoDocIR>
    <Numero>${data.referenciaFactura.numero}</Numero>
    <FechaEmisionIR>${data.referenciaFactura.fechaEmision}</FechaEmisionIR>
    <Codigo>${data.referenciaFactura.codigo}</Codigo>
    <Razon>${this.escapeXml(data.referenciaFactura.razon)}</Razon>
  </InformacionReferencia>
  <Otros>
    <OtroTexto>--- Sistema de Facturación Electrónica ---</OtroTexto>
  </Otros>
</NotaCreditoElectronica>`

    return xml
  }

  /**
   * Genera el XML del receptor
   */
  private static generateReceptorXML(receptor: CreditNoteData['receptor']): string {
    if (!receptor) return ''

    return `  <Receptor>
    <Nombre>${this.escapeXml(receptor.nombre)}</Nombre>
    <Identificacion>
      <Tipo>${receptor.tipoIdentificacion}</Tipo>
      <Numero>${receptor.identificacion}</Numero>
    </Identificacion>
    ${receptor.nombreComercial ? `<NombreComercial>${this.escapeXml(receptor.nombreComercial)}</NombreComercial>` : ''}
    ${receptor.ubicacion ? `<Ubicacion>
      <Provincia>${receptor.ubicacion.provincia}</Provincia>
      <Canton>${receptor.ubicacion.canton}</Canton>
      <Distrito>${receptor.ubicacion.distrito}</Distrito>
      <OtrasSenas>${this.escapeXml(receptor.ubicacion.otrasSenas)}</OtrasSenas>
    </Ubicacion>` : ''}
    ${receptor.telefono ? `<Telefono>
      <CodigoPais>${receptor.telefono.codigoPais}</CodigoPais>
      <NumTelefono>${receptor.telefono.numero}</NumTelefono>
    </Telefono>` : ''}
    ${receptor.correoElectronico ? `<CorreoElectronico>${receptor.correoElectronico}</CorreoElectronico>` : ''}
  </Receptor>`
  }

  /**
   * Genera el XML de una línea de detalle
   */
  private static generateLineaDetalleXML(item: CreditNoteData['items'][0]): string {
    return `    <LineaDetalle>
      <NumeroLinea>${item.numeroLinea}</NumeroLinea>
      <CodigoCABYS>${item.codigoCABYS}</CodigoCABYS>
      <Cantidad>${item.cantidad}</Cantidad>
      <UnidadMedida>${item.unidadMedida}</UnidadMedida>
      <Detalle>${this.escapeXml(item.detalle)}</Detalle>
      <PrecioUnitario>${item.precioUnitario}</PrecioUnitario>
      <MontoTotal>${item.montoTotal}</MontoTotal>
      <SubTotal>${item.subtotal}</SubTotal>
      <BaseImponible>${item.baseImponible}</BaseImponible>
      ${item.impuesto ? `<Impuesto>
        <Codigo>${item.impuesto.codigo}</Codigo>
        <CodigoTarifaIVA>${item.impuesto.codigoTarifa}</CodigoTarifaIVA>
        <Tarifa>${item.impuesto.tarifa}</Tarifa>
        <Monto>${item.impuesto.monto}</Monto>
      </Impuesto>` : ''}
      <ImpuestoAsumidoEmisorFabrica>0</ImpuestoAsumidoEmisorFabrica>
      <ImpuestoNeto>${item.impuestoNeto}</ImpuestoNeto>
      <MontoTotalLinea>${item.montoTotalLinea}</MontoTotalLinea>
    </LineaDetalle>`
  }

  /**
   * Escapa caracteres especiales en XML
   */
  private static escapeXml(text: string): string {
    if (!text) return ''
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}

