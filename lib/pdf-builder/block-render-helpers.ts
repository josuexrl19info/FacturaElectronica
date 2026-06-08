import { CONDICIONES_VENTA } from "@/lib/invoice-types"
import { DEFAULT_EMITTER_FIELDS, DEFAULT_RECEIVER_FIELDS, DEFAULT_DOCUMENT_META_FIELDS } from "@/lib/pdf-builder/block-defaults"
import type {
  DocumentMetaFieldsVisibility,
  InfoFieldsVisibility,
  PdfBlockProps,
  PdfMockInvoiceData,
} from "@/lib/pdf-builder/types"
import { formatEconomicActivity, formatPdfDateField, formatPdfTextValue } from "@/lib/pdf-builder/pdf-text-utils"

export type CompanyNameLines = { primary: string | null; secondary: string | null }

export function getCondicionVentaLabel(code: string): string {
  const match = CONDICIONES_VENTA.find((c) => c.codigo === code)
  return match?.descripcion || code
}

export function getPaymentMethodLabel(code: string): string {
  const map: Record<string, string> = {
    "01": "Efectivo",
    "02": "Tarjeta",
    "03": "Cheque",
    "04": "Transferencia",
    "05": "Recaudado por Terceros",
    "99": "Otros",
  }
  return map[code] || code
}

export { formatEconomicActivity } from "@/lib/pdf-builder/pdf-text-utils"

export function resolveShowFields(
  props: PdfBlockProps | undefined,
  isEmitter: boolean
): Required<InfoFieldsVisibility> {
  const defaults = isEmitter ? DEFAULT_EMITTER_FIELDS : DEFAULT_RECEIVER_FIELDS
  const f = props?.showFields || {}
  return {
    id: f.id ?? defaults.id ?? true,
    phone: f.phone ?? defaults.phone ?? true,
    email: f.email ?? defaults.email ?? true,
    address: f.address ?? defaults.address ?? true,
    economicActivity: isEmitter ? false : (f.economicActivity ?? defaults.economicActivity ?? true),
  }
}

export function resolveDocumentMetaFields(
  props: PdfBlockProps | undefined
): Required<DocumentMetaFieldsVisibility> {
  const f = props?.documentMetaFields || {}
  return {
    consecutivo: f.consecutivo ?? DEFAULT_DOCUMENT_META_FIELDS.consecutivo,
    clave: f.clave ?? DEFAULT_DOCUMENT_META_FIELDS.clave,
    fecha: f.fecha ?? DEFAULT_DOCUMENT_META_FIELDS.fecha,
    moneda: f.moneda ?? DEFAULT_DOCUMENT_META_FIELDS.moneda,
    formaPago: f.formaPago ?? DEFAULT_DOCUMENT_META_FIELDS.formaPago,
    condicionVenta: f.condicionVenta ?? DEFAULT_DOCUMENT_META_FIELDS.condicionVenta,
  }
}

export type DocumentMetaEntry = { key: string; label: string; value: string }

export function buildDocumentMetaEntries(
  data: PdfMockInvoiceData,
  props?: PdfBlockProps
): DocumentMetaEntry[] {
  const fields = resolveDocumentMetaFields(props)
  const entries: DocumentMetaEntry[] = []

  if (fields.consecutivo) {
    entries.push({ key: "consecutivo", label: "Consecutivo", value: formatPdfTextValue(data.consecutivo) })
  }
  if (fields.clave) {
    entries.push({ key: "clave", label: "Clave", value: formatPdfTextValue(data.clave) })
  }
  if (fields.fecha) {
    entries.push({ key: "fecha", label: "Fecha", value: formatPdfDateField(data.fecha) })
  }
  if (fields.moneda) {
    entries.push({ key: "moneda", label: "Moneda", value: formatPdfTextValue(data.moneda) })
  }
  if (fields.formaPago) {
    entries.push({ key: "formaPago", label: "Forma de pago", value: formatPdfTextValue(data.formaPago) })
  }
  if (fields.condicionVenta) {
    entries.push({
      key: "condicionVenta",
      label: "Condición",
      value: formatPdfTextValue(data.condicionVenta),
    })
  }

  return entries
}

export function buildPartyLines(data: PdfMockInvoiceData, isEmitter: boolean, props?: PdfBlockProps): string[] {
  const fields = resolveShowFields(props, isEmitter)
  if (isEmitter) {
    const lines: string[] = [data.company.name]
    if (fields.id) lines.push(`Cédula: ${data.company.id}`)
    if (fields.phone) lines.push(`Tel: ${data.company.phone}`)
    if (fields.email) lines.push(`Email: ${data.company.email}`)
    if (fields.address) lines.push(data.company.address)
    return lines
  }
  const lines: string[] = [data.client.name]
  if (fields.id) lines.push(`Cédula: ${data.client.id}`)
  if (fields.phone) lines.push(`Tel: ${data.client.phone}`)
  if (fields.email) lines.push(`Email: ${data.client.email}`)
  if (fields.economicActivity) lines.push(`Actividad: ${formatEconomicActivity(data.client.economicActivity)}`)
  if (fields.address) lines.push(data.client.address)
  return lines
}

export function buildCompanyNameLines(
  data: PdfMockInvoiceData,
  display: import("@/lib/pdf-builder/types").CompanyNameDisplay = "both"
): CompanyNameLines {
  const commercial = data.company.commercialName?.trim()
  const legal = data.company.name?.trim()
  switch (display) {
    case "commercial":
      return { primary: commercial || legal || null, secondary: null }
    case "legal":
      return { primary: legal || commercial || null, secondary: null }
    case "both":
    default:
      if (commercial && legal && commercial !== legal) {
        return { primary: commercial, secondary: legal }
      }
      return { primary: commercial || legal || null, secondary: null }
  }
}
