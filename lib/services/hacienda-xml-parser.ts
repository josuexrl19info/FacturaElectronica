import { XMLParser } from "fast-xml-parser"

export type ParsedInvoiceLineTax = {
  tarifa: number
  monto: number
  exonerado: number
}

export type ParsedInvoiceLine = {
  numeroLinea: number
  detalle: string
  cantidad: number
  subtotal: number
  impuesto: number
  totalLinea: number
  tasaIvaPrincipal: number
  impuestos: ParsedInvoiceLineTax[]
}

export type ParsedHaciendaInvoiceSummary = {
  tipoDocumento: string
  clave: string
  numeroConsecutivo: string
  fechaEmision: string
  condicionVenta: string
  moneda: string
  tipoCambio: number
  totalComprobante: number
  totalImpuesto: number
  totalExonerado: number
  emisorNombre: string
  emisorId: string
  receptorNombre: string
  receptorId: string
  esCompra: boolean
  esVenta: boolean
  lineas: ParsedInvoiceLine[]
  ivaPorTarifa: Array<{ tarifa: number; monto: number }>
}

const DOCUMENT_TYPES = [
  "FacturaElectronica",
  "TiqueteElectronico",
  "NotaCreditoElectronica",
  "NotaDebitoElectronica",
  "FacturaElectronicaCompra",
]

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
})

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function asString(value: unknown): string {
  return String(value ?? "").trim()
}

function asNumber(value: unknown, fallback = 0): number {
  const normalized = String(value || "").replace(",", ".").trim()
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

function detectDocumentType(rawRootName: string): string {
  for (const type of DOCUMENT_TYPES) {
    if (rawRootName === type) {
      return type
    }
  }
  return "Desconocido"
}

function resolveRootNode(parsed: Record<string, any>): { rootName: string; root: any } {
  const keys = Object.keys(parsed || {})
  const preferred = keys.find((key) => DOCUMENT_TYPES.includes(String(key)))
  if (preferred) {
    return { rootName: preferred, root: parsed?.[preferred] || {} }
  }

  const filtered = keys.filter((key) => !String(key).startsWith("?"))
  const fallbackName = filtered[0] || keys[0] || ""
  return { rootName: fallbackName, root: parsed?.[fallbackName] || {} }
}

export function parseHaciendaXml(xmlRaw: string): ParsedHaciendaInvoiceSummary {
  const xml = String(xmlRaw || "").trim()
  const parsed = parser.parse(xml) as Record<string, any>
  const { rootName, root } = resolveRootNode(parsed)
  const tipoDocumento = detectDocumentType(rootName)

  const resumenNode = root?.ResumenFactura || {}
  const emisorNode = root?.Emisor || {}
  const receptorNode = root?.Receptor || {}
  const lineNodes = asArray(root?.DetalleServicio?.LineaDetalle)
  const monedaNode = root?.ResumenFactura?.CodigoTipoMoneda || {}

  const lineas: ParsedInvoiceLine[] = lineNodes.map((lineNode: any) => {
    const impuestosNode = asArray(lineNode?.Impuesto)
    const impuestos = impuestosNode.map((taxNode: any) => {
      const montoExoneracion = asNumber(taxNode?.Exoneracion?.MontoExoneracion, 0)
      return {
        tarifa: asNumber(taxNode?.Tarifa, 0),
        monto: asNumber(taxNode?.Monto, 0),
        exonerado: montoExoneracion,
      }
    })

    const totalImpuestoLinea =
      asNumber(lineNode?.ImpuestoNeto, 0) ||
      impuestos.reduce((sum, current) => sum + Math.max(current.monto - current.exonerado, 0), 0)

    const tasaPrincipal = impuestos.reduce((max, current) => Math.max(max, current.tarifa), 0)

    return {
      numeroLinea: asNumber(lineNode?.NumeroLinea, 0),
      detalle: asString(lineNode?.Detalle),
      cantidad: asNumber(lineNode?.Cantidad, 0),
      subtotal: asNumber(lineNode?.SubTotal, 0),
      impuesto: totalImpuestoLinea,
      totalLinea: asNumber(lineNode?.MontoTotalLinea, 0),
      tasaIvaPrincipal: tasaPrincipal,
      impuestos,
    }
  })

  const ivaByTarifaMap = new Map<number, number>()
  for (const line of lineas) {
    for (const tax of line.impuestos) {
      const current = ivaByTarifaMap.get(tax.tarifa) || 0
      const netAmount = Math.max(tax.monto - tax.exonerado, 0)
      ivaByTarifaMap.set(tax.tarifa, current + netAmount)
    }
  }

  const ivaPorTarifa = Array.from(ivaByTarifaMap.entries())
    .map(([tarifa, monto]) => ({ tarifa, monto }))
    .sort((a, b) => a.tarifa - b.tarifa)

  const totalExonerado =
    asNumber(resumenNode?.TotalExonerado, 0) ||
    lineas.reduce(
      (sum, line) => sum + line.impuestos.reduce((inner, tax) => inner + (tax.exonerado || 0), 0),
      0
    )

  const esCompra = tipoDocumento === "FacturaElectronicaCompra"
  const esVenta = !esCompra

  return {
    tipoDocumento,
    clave: asString(root?.Clave),
    numeroConsecutivo: asString(root?.NumeroConsecutivo),
    fechaEmision: asString(root?.FechaEmision),
    condicionVenta: asString(root?.CondicionVenta),
    moneda: asString(monedaNode?.CodigoMoneda) || "CRC",
    tipoCambio: asNumber(monedaNode?.TipoCambio, 1),
    totalComprobante: asNumber(resumenNode?.TotalComprobante, 0),
    totalImpuesto: asNumber(resumenNode?.TotalImpuesto, 0),
    totalExonerado,
    emisorNombre: asString(emisorNode?.Nombre),
    emisorId: asString(emisorNode?.Identificacion?.Numero),
    receptorNombre: asString(receptorNode?.Nombre),
    receptorId: asString(receptorNode?.Identificacion?.Numero),
    esCompra,
    esVenta,
    lineas,
    ivaPorTarifa,
  }
}

export function parseHaciendaResponseStatus(xmlRaw: string): "ACEPTADO" | "RECHAZADO" | "RECIBIDO" | "PROCESANDO" | "DESCONOCIDO" {
  const xml = String(xmlRaw || "").toUpperCase()

  const normalized = xml
    .replace(/\s+/g, " ")
    .replace(/[^A-Z ]/g, " ")
    .trim()

  if (normalized.includes("ACEPTADO")) return "ACEPTADO"
  if (normalized.includes("RECHAZADO")) return "RECHAZADO"
  if (normalized.includes("RECIBIDO")) return "RECIBIDO"
  if (normalized.includes("PROCESANDO")) return "PROCESANDO"
  if (normalized.includes("IN PROCESS")) return "PROCESANDO"
  if (normalized.includes("PROCESSING")) return "PROCESANDO"

  return "DESCONOCIDO"
}
