import { PDF_MOCK_INVOICE } from "@/lib/pdf-builder/mock-invoice-data"
import { getCondicionVentaLabel, getPaymentMethodLabel } from "@/lib/pdf-builder/block-render-helpers"
import { buildAddress } from "@/lib/pdf-builder/preview-invoice-data"
import { formatEconomicActivity, rawPdfFieldValue, resolveConsecutivoDisplay } from "@/lib/pdf-builder/pdf-text-utils"
import type { PdfMockInvoiceData } from "@/lib/pdf-builder/types"

function getPaymentName(code: string): string {
  return getPaymentMethodLabel(code)
}

export function extractLogoData(company: Record<string, unknown> | undefined): string | null {
  if (!company?.logo) return null
  const logo = company.logo
  if (typeof logo === "string") return logo
  if (typeof logo === "object" && logo !== null) {
    const l = logo as Record<string, unknown>
    return String(l.fileData || l.filedata || l.url || "")
  }
  return null
}

/** Mapeo factura → datos del PDF. Sin dependencias Node (safe para cliente). */
export function mapInvoiceDataToPdfContext(invoiceData: Record<string, unknown>): PdfMockInvoiceData {
  const invoice = (invoiceData.invoice || {}) as Record<string, unknown>
  const company = (invoiceData.company || {}) as Record<string, unknown>
  const client = (invoiceData.client || {}) as Record<string, unknown>
  const currency = String(invoice.currency || invoice.moneda || "CRC")
  const cliente = invoice.cliente as Record<string, unknown> | undefined
  const isNC =
    invoiceData.tipo === "nota-credito" ||
    invoice.tipo === "nota-credito" ||
    Boolean(invoiceData.tipoNotaCredito) ||
    Boolean(invoice.referenciaFactura)

  const isTiquete =
    invoice.documentType === "tiquetes" ||
    invoice.tipo === "tiquete" ||
    String(invoice.consecutivo || "").startsWith("TE-")

  const documentType = isNC
    ? "Nota de Crédito Electrónica"
    : isTiquete
      ? "Tiquete Electrónico"
      : String(invoiceData.documentType || invoice.documentTypeLabel || "Factura Electrónica")

  const itemsRaw = (invoice.items || invoice.lineas || []) as Array<Record<string, unknown>>
  const items = itemsRaw.map((item, i) => ({
    line: Number(item.numeroLinea || i + 1),
    cabys: String(item.codigoCABYS || item.cabys || "—"),
    description: String(item.detalle || item.description || "—"),
    qty: Number(item.cantidad || item.quantity || 0),
    unit: String(item.unidadMedida || item.unit || "Unid"),
    unitPrice: Number(item.precioUnitario || item.unitPrice || 0),
    discount: Number(item.descuento || item.discount || 0),
    subtotal: Number(item.subTotal || item.subtotal || item.montoTotalLinea || 0),
  }))

  const hacienda = (invoiceData.haciendaResponse || invoiceData.haciendaSubmission) as
    | Record<string, unknown>
    | undefined

  return {
    documentType,
    consecutivo: resolveConsecutivoDisplay(invoice, hacienda),
    clave: String(invoice.clave || hacienda?.clave || "—"),
    fecha: invoice.fechaEmision ?? invoice.createdAt ?? new Date(),
    moneda: currency === "USD" ? "Dólares (USD)" : "Colones (CRC)",
    formaPago: getPaymentName(String(invoice.formaPago || invoice.paymentMethod || invoiceData.formaPago || "01")),
    condicionVenta: getCondicionVentaLabel(String(invoice.condicionVenta || "01")),
    company: {
      name: String(company.name || company.nombre || "Empresa"),
      commercialName: String(company.nombreComercial || company.commercialName || company.name || ""),
      id: String(company.identification || company.cedula || company.numeroIdentificacion || "—"),
      phone: String(company.phone || company.telefono || "—"),
      email: String(company.email || company.correo || "—"),
      address: buildAddress(company),
      logo: extractLogoData(company) || undefined,
    },
    client: {
      name: String(client.name || client.nombre || cliente?.nombre || "Cliente"),
      id: String(client.identification || client.identificacion || client.cedula || "—"),
      phone: String(client.phone || client.telefono || "—"),
      email: String(client.email || client.correo || "—"),
      address: String(client.address || client.direccion || "—"),
      economicActivity: formatEconomicActivity(
        client.economicActivity ||
          client.actividadEconomica ||
          (cliente as Record<string, unknown> | undefined)?.actividadEconomica ||
          (cliente as Record<string, unknown> | undefined)?.economicActivity
      ),
    },
    items: items.length > 0 ? items : PDF_MOCK_INVOICE.items,
    subtotal: Number(invoice.subtotal || invoice.totalVenta || 0),
    totalDiscount: Number(invoice.totalDescuento || invoice.totalDiscount || 0),
    totalTax: Number(invoice.totalImpuesto || invoice.totalTax || 0),
    totalExempt: Number(invoice.totalExento || 0),
    total: Number(invoice.total || 0),
    notes: String(invoice.notes || invoice.notas || ""),
    legalText: PDF_MOCK_INVOICE.legalText,
  }
}
