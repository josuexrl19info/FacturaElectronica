export interface Product {
  id: string
  codigoCABYS: string
  detalle: string
  precioUnitario: number
  unidadMedida: string
  tipoImpuesto: string
  codigoTarifaImpuesto: string
  tarifaImpuesto: number
  tieneExoneracion: boolean
  porcentajeExoneracion?: number
  numeroDocumentoExoneracion?: string
  nombreInstitucionExoneracion?: string
  fechaEmisionExoneracion?: string
  montoExoneracion?: number
  activo: boolean
  tenantId: string
  fechaCreacion: Date
  fechaActualizacion: Date
}

export interface ProductFormData {
  codigoCABYS: string
  detalle: string
  precioUnitario: number
  unidadMedida: string
  tipoImpuesto: string
  codigoTarifaImpuesto: string
  tarifaImpuesto: number
  tieneExoneracion: boolean
  porcentajeExoneracion?: number
  numeroDocumentoExoneracion?: string
  nombreInstitucionExoneracion?: string
  fechaEmisionExoneracion?: string
  montoExoneracion?: number
}

// Unidades de medida comunes para facturación electrónica
export const UNIDADES_MEDIDA = [
  { codigo: 'Sp', descripcion: 'Servicio profesional' },
  { codigo: 'Un', descripcion: 'Unidad' },
  { codigo: 'Kg', descripcion: 'Kilogramo' },
  { codigo: 'g', descripcion: 'Gramo' },
  { codigo: 'L', descripcion: 'Litro' },
  { codigo: 'ml', descripcion: 'Mililitro' },
  { codigo: 'm', descripcion: 'Metro' },
  { codigo: 'cm', descripcion: 'Centímetro' },
  { codigo: 'm²', descripcion: 'Metro cuadrado' },
  { codigo: 'm³', descripcion: 'Metro cúbico' },
  { codigo: 'h', descripcion: 'Hora' },
  { codigo: 'd', descripcion: 'Día' },
  { codigo: 'mes', descripcion: 'Mes' },
  { codigo: 'año', descripcion: 'Año' },
  { codigo: 'pkg', descripcion: 'Paquete' },
  { codigo: 'dz', descripcion: 'Docena' },
  { codigo: 'caja', descripcion: 'Caja' },
  { codigo: 'par', descripcion: 'Par' },
  { codigo: 'juego', descripcion: 'Juego' },
  { codigo: 'ton', descripcion: 'Tonelada' }
]

// Tipos de impuesto
export const TIPOS_IMPUESTO = [
  { codigo: '01', descripcion: 'Impuesto General sobre las Ventas' },
  { codigo: '02', descripcion: 'Impuesto Selectivo de Consumo' },
  { codigo: '03', descripcion: 'Impuesto Único a los Combustibles' },
  { codigo: '04', descripcion: 'Impuesto Específico de Bebidas Alcohólicas' },
  { codigo: '05', descripcion: 'Impuesto Específico sobre las Bebidas en Envases Retornables' },
  { codigo: '06', descripcion: 'Impuesto a los Productos de Tabaco' },
  { codigo: '07', descripcion: 'Servicios de Taxis' },
  { codigo: '08', descripcion: 'Impuesto de Ventas' },
  { codigo: '12', descripcion: 'Impuesto Específico al Cemento' },
  { codigo: '98', descripcion: 'Otros' }
]

// Tarifas de impuesto comunes
export const TARIFAS_IMPUESTO = [
  { codigo: '08', porcentaje: 13, descripcion: 'IVA 13%' },
  { codigo: '01', porcentaje: 0, descripcion: 'Exento' },
  { codigo: '02', porcentaje: 1, descripcion: 'IVA 1%' },
  { codigo: '03', porcentaje: 2, descripcion: 'IVA 2%' },
  { codigo: '04', porcentaje: 4, descripcion: 'IVA 4%' },
  { codigo: '05', porcentaje: 8, descripcion: 'IVA 8%' }
]
