import { normalizeInvoicePdfTemplate } from "@/lib/pdf-builder/normalize-template"
import "server-only"
import { renderInvoiceHtmlToPdfBuffer } from "@/lib/services/pdf-generator-puppeteer"

/** Genera bytes PDF desde la plantilla + datos (HTML → Puppeteer, idéntico a la vista previa). */
export async function generateInvoicePDFOptimized(invoiceData: Record<string, unknown>): Promise<ArrayBuffer> {
  const { personalizationFromCompanyRecord } = await import("@/lib/theme/company-personalization.utils")

  const company = invoiceData.company as Record<string, unknown> | undefined
  const personalization = personalizationFromCompanyRecord(company)
  const invConfig = personalization.invoices
  const rawTemplate =
    invoiceData.pdfTemplate ||
    ((company?.personalization as Record<string, unknown> | undefined)?.invoices &&
      ((company?.personalization as Record<string, unknown>).invoices as Record<string, unknown>)?.pdfTemplate)

  const normalized = normalizeInvoicePdfTemplate(rawTemplate, {
    primary: invConfig.headerColor,
    accent: invConfig.tableAccentColor,
  })

  console.log("📄 [PDF] Generando con plantilla HTML:", normalized.blocks.length, "bloques")
  return renderInvoiceHtmlToPdfBuffer(normalized, invoiceData)
}

export async function formatInvoiceDataForPDFOptimized(invoice: any, company: any, client: any) {
  const isNotaCredito =
    invoice.tipo === "nota-credito" || invoice.tipoNotaCredito || invoice.referenciaFactura

  const formatDate = (date: any): string => {
    if (!date) return "N/A"
    try {
      if (date instanceof Date) return date.toLocaleDateString("es-CR")
      if (typeof date === "string") return new Date(date).toLocaleDateString("es-CR")
      if (date.toDate && typeof date.toDate === "function") return date.toDate().toLocaleDateString("es-CR")
      return "N/A"
    } catch {
      return "N/A"
    }
  }

  const isTiquete =
    invoice.documentType === "tiquetes" ||
    invoice.tipo === "tiquete" ||
    (invoice.consecutivo?.startsWith("TE-") || false)

  const result = {
    invoice: {
      ...invoice,
      tipo: isNotaCredito
        ? "Nota Crédito Electrónica"
        : isTiquete
          ? "Tiquete Electrónico"
          : "Factura Electrónica",
      fechaEmision: formatDate(invoice.fechaEmision || invoice.haciendaResponse?.fecha),
      consecutivo: invoice.consecutivo || invoice.number || "N/A",
      clave: invoice.haciendaResponse?.clave || invoice.clave || invoice.key || "N/A",
      elaboradoPor: invoice.elaboradoPor || invoice.createdBy || "Sistema de Facturación v4.4",
      subtotal: invoice.subtotal || invoice.subTotal || 0,
      totalGravado: invoice.totalGravado || invoice.totalTaxable || 0,
      totalExento: invoice.totalExento || invoice.totalExempt || 0,
      impuestos:
        invoice.totalImpuesto || invoice.totalTax || invoice.taxes || invoice.impuestos || invoice.iva || 0,
      descuentos: invoice.totalDescuento || invoice.totalDiscount || invoice.discounts || 0,
      ivaDevuelto: invoice.ivaDevuelto || invoice.ivaReturned || 0,
      total: invoice.total || invoice.totalAmount || 0,
      moneda: invoice.currency || invoice.moneda || invoice.currencyCode || "CRC",
      formaPago: invoice.paymentMethod || invoice.formaPago || invoice.paymentMethodCode || "01",
      items: invoice.items || invoice.lineItems || [],
      notas: invoice.notes || invoice.notas || invoice.comments || "",
    },
    haciendaResponse: invoice.haciendaResponse || invoice.haciendaSubmission,
    company: {
      name: company?.name || company?.nombre || company?.nombreComercial || "N/A",
      identification: company?.identification || company?.cedula || company?.taxId || "N/A",
      phone: company?.phone || company?.telefono || company?.phoneNumber || "N/A",
      email: company?.email || company?.correo || company?.emailAddress || "N/A",
      economicActivity: company?.economicActivity || company?.actividadEconomica || null,
      otrasSenas: company?.otrasSenas || company?.direccion || company?.address || "N/A",
      logo: company?.logo || company?.logotipo || null,
      provincia: company?.provincia || company?.province || company?.provinciaNombre || "N/A",
      canton: company?.canton || company?.cantonNombre || "N/A",
      distrito: company?.distrito || company?.district || company?.distritoNombre || "N/A",
    },
    client: {
      name: client?.name || client?.nombre || client?.nombreCompleto || "Consumidor Final",
      identification: client?.identification || client?.cedula || client?.taxId || "N/A",
      email: client?.email || client?.correo || client?.emailAddress || "N/A",
      phone: client?.phone || client?.telefono || client?.phoneNumber || "N/A",
      economicActivity: client?.economicActivity || client?.actividadEconomica || null,
      direccion: client?.direccion || client?.address || client?.direccionCompleta || "N/A",
      provincia: client?.provincia || client?.province || client?.provinciaNombre || "N/A",
      canton: client?.canton || client?.cantonNombre || "N/A",
      distrito: client?.distrito || client?.district || client?.distritoNombre || "N/A",
      tieneExoneracion: client?.tieneExoneracion || client?.hasExemption || false,
      exoneracion: client?.exoneracion || client?.exemption || null,
    },
  }

  return result
}
