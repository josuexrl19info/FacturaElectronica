/**
 * Tipos TypeScript para el sistema de facturación electrónica
 * Basado en la estructura real de Firestore
 */

export interface Invoice {
  id?: string
  // Información básica de la factura
  consecutivo: string
  status: 'draft' | 'pending' | 'accepted' | 'rejected' | 'error' | 'aceptado'
  createdAt: Date | any
  updatedAt: Date | any
  
  // Relaciones
  companyId: string
  clientId: string
  tenantId: string
  
  // Totales
  subtotal: number
  totalImpuesto: number
  totalDescuento: number
  total: number
  exchangeRate: number
  currency: string
  
  // Condiciones de venta y pago
  condicionVenta: string // '01' = Contado, '02' = Crédito directo, etc.
  paymentTerm: string
  paymentMethod: string // '01' = Efectivo, '02' = Tarjeta, etc.
  
  // Notas
  notes: string
  
  // Fecha de emisión
  fecha?: Date | any
  
  // Clave de Hacienda
  clave?: string
  
  // Cliente (para compatibilidad)
  cliente?: {
    nombre: string
    commercialName?: string
    identificacion: string
    email?: string
    telefono?: string
    [key: string]: any
  }
  
  // Respuesta de Hacienda
  haciendaStatus?: 'aceptado' | 'rechazado' | 'error'
  haciendaValidationDate?: Date | any
  haciendaSubmission?: {
    clave: string
    'ind-estado': string
    'respuesta-xml': string
    fecha: string
    estado?: string
    state?: string
    [key: string]: any // Para campos adicionales que pueda tener
  }
  
  // XML firmado
  xmlSigned?: string
  
  // Items de la factura
  items: InvoiceItem[]
}

export interface InvoiceItem {
  numeroLinea: number
  codigoCABYS: string
  cantidad: number
  unidadMedida: string
  unidadMedidaComercial?: string
  detalle: string
  codigoComercial?: string
  precioUnitario: number
  montoTotal: number
  subTotal: number
  baseImponible: number
  montoTotalLinea: number
  
  // Impuestos
  impuesto: TaxItem[]
  impuestoAsumidoEmisorFabrica?: number
  impuestoNeto: number
}

export interface TaxItem {
  codigo: string // '01' = IVA, '02' = Selectivo, etc.
  codigoTarifaIVA: string // '08' = 13%, '09' = 4%, etc. (formato real de Hacienda)
  tarifa: number // Porcentaje
  monto: number
}

// Tipos para el formulario de creación
export interface InvoiceFormData {
  // Información del cliente
  clientId: string
  clientName?: string
  
  // Condiciones de venta
  condicionVenta: string
  paymentTerm: string
  paymentMethod: string
  currency: string
  
  // Notas
  notes: string
  
  // Items
  items: InvoiceItemFormData[]
}

export interface InvoiceItemFormData {
  // Producto seleccionado
  productId?: string
  codigoCABYS: string
  detalle: string
  unidadMedida: string
  
  // Cantidades y precios
  cantidad: number
  precioUnitario: number
  
  // Impuestos
  tipoImpuesto: string
  codigoTarifa: string
  tarifa: number
}

// Constantes para dropdowns
export const CONDICIONES_VENTA = [
  { codigo: '01', descripcion: 'Contado' },
  { codigo: '02', descripcion: 'Crédito Directo' },
  { codigo: '03', descripcion: 'Consignación' },
  { codigo: '04', descripcion: 'Apartado' },
  { codigo: '05', descripcion: 'Arrendamiento con Opción de Compra' },
  { codigo: '06', descripcion: 'Leasing con Opción de Compra' },
  { codigo: '07', descripcion: 'Crédito Documentario' },
  { codigo: '08', descripcion: 'Otros' }
]

export const METODOS_PAGO = [
  { codigo: '01', descripcion: 'Efectivo' },
  { codigo: '02', descripcion: 'Tarjeta' },
  { codigo: '03', descripcion: 'Cheque' },
  { codigo: '04', descripcion: 'Transferencia' },
  { codigo: '05', descripcion: 'Recaudado por Terceros' },
  { codigo: '06', descripcion: 'Otros' }
]

export const TIPOS_IMPUESTO = [
  { codigo: '01', descripcion: 'Impuesto General sobre las Ventas' },
  { codigo: '02', descripcion: 'Impuesto Selectivo de Consumo' },
  { codigo: '03', descripcion: 'Impuesto Único a los Combustibles' },
  { codigo: '04', descripcion: 'Impuesto Específico de Bebidas Alcohólicas' },
  { codigo: '05', descripcion: 'Impuesto Específico sobre las Bebidas en Envases Retornables' },
  { codigo: '06', descripcion: 'Impuesto a los Productos de Tabaco' },
  { codigo: '07', descripcion: 'Servicio de Taxis Colectivos' },
  { codigo: '08', descripcion: 'Impuesto de Ventas' },
  { codigo: '12', descripcion: 'Impuesto Específico al Cemento' },
  { codigo: '98', descripcion: 'Otros' }
]

export const TARIFAS_IMPUESTO = [
  { codigo: '07', descripcion: '13%', porcentaje: 13 },
  { codigo: '08', descripcion: '4%', porcentaje: 4 },
  { codigo: '09', descripcion: '2%', porcentaje: 2 },
  { codigo: '10', descripcion: '1%', porcentaje: 1 },
  { codigo: '11', descripcion: '0%', porcentaje: 0 },
  { codigo: '12', descripcion: 'Exento', porcentaje: 0 }
]

// Tipos de Exoneración
export const TIPOS_EXONERACION = [
  { codigo: '01', descripcion: 'Compras autorizadas por la Dirección General de Tributación' },
  { codigo: '02', descripcion: 'Ventas exentas a diplomáticos' },
  { codigo: '03', descripcion: 'Autorizado por Ley Especial' },
  { codigo: '04', descripcion: 'Exenciones DGH Autorización Local Genérica' },
  { codigo: '05', descripcion: 'Exenciones DGH Transitorio V (servicios de ingeniería, arquitectura, topografía obra civil)' },
  { codigo: '06', descripcion: 'Servicios turísticos inscritos ante el ICT' },
  { codigo: '07', descripcion: 'Transitorio XVII (Recolección, Clasificación, almacenamiento de Reciclaje)' },
  { codigo: '08', descripcion: 'Exoneración a Zona Franca' },
  { codigo: '09', descripcion: 'Exoneración de servicios complementarios para la exportación artículo 11 RLIVA' },
  { codigo: '10', descripcion: 'Órgano de las corporaciones municipales' },
  { codigo: '11', descripcion: 'Exenciones DGH Autorización de Impuesto Local Concreta' },
  { codigo: '99', descripcion: 'Otros' }
]

// Instituciones que emiten exoneraciones
export const INSTITUCIONES_EXONERACION = [
  { codigo: '01', descripcion: 'Ministerio de Hacienda' },
  { codigo: '02', descripcion: 'Ministerio de Relaciones Exteriores y Culto' },
  { codigo: '03', descripcion: 'Ministerio de Agricultura y Ganadería' },
  { codigo: '04', descripcion: 'Ministerio de Economía, Industria y Comercio' },
  { codigo: '05', descripcion: 'Cruz Roja Costarricense' },
  { codigo: '06', descripcion: 'Benemérito Cuerpo de Bomberos de Costa Rica' },
  { codigo: '07', descripcion: 'Asociación Obras del Espíritu Santo' },
  { codigo: '08', descripcion: 'Federación Cruzada Nacional de protección al Anciano (Fecrunapa)' },
  { codigo: '09', descripcion: 'Escuela de Agricultura de la Región Húmeda (EARTH)' },
  { codigo: '10', descripcion: 'Instituto Centroamericano de Administración de Empresas (INCAE)' },
  { codigo: '11', descripcion: 'Junta de Protección Social (JPS)' },
  { codigo: '12', descripcion: 'Autoridad Reguladora de los Servicios Públicos (Aresep)' },
  { codigo: '99', descripcion: 'Otros' }
]

// Interface para Exoneración
export interface Exoneracion {
  tipoDocumento: string // TipoDocumentoEX1
  tipoDocumentoOtro?: string // Obligatorio si tipoDocumento = '99'
  numeroDocumento: string // 3-40 caracteres
  articulo?: number // Opcional, 6 dígitos
  inciso?: number // Opcional, 6 dígitos
  nombreInstitucion: string // Código de institución
  nombreInstitucionOtros?: string // Obligatorio si nombreInstitucion = '99'
  fechaEmision: string // DateTime
  tarifaExonerada: number // Decimal, 4 dígitos totales, 2 decimales
  montoExoneracion: number // Monto del impuesto exonerado
}

// Función para calcular totales de un item
export const calculateItemTotals = (item: InvoiceItemFormData): Partial<InvoiceItem> => {
  const montoTotal = item.cantidad * item.precioUnitario
  const baseImponible = montoTotal
  const montoImpuesto = (baseImponible * item.tarifa) / 100
  const montoTotalLinea = montoTotal + montoImpuesto

  return {
    montoTotal,
    subTotal: montoTotal,
    baseImponible,
    montoTotalLinea,
    impuesto: [{
      codigo: item.tipoImpuesto,
      codigoTarifa: item.codigoTarifa,
      tarifa: item.tarifa,
      monto: montoImpuesto
    }],
    impuestoNeto: montoImpuesto
  }
}

// Función para calcular totales de la factura
export const calculateInvoiceTotals = (items: InvoiceItemFormData[]): {
  subtotal: number
  totalImpuesto: number
  total: number
} => {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.cantidad * item.precioUnitario)
  }, 0)

  const totalImpuesto = items.reduce((sum, item) => {
    const baseImponible = item.cantidad * item.precioUnitario
    return sum + (baseImponible * item.tarifa) / 100
  }, 0)

  const total = subtotal + totalImpuesto

  return { subtotal, totalImpuesto, total }
}
