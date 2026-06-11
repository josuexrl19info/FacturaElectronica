import { normalizeInvoicePdfTemplate } from "@/lib/pdf-builder/normalize-template"
import { buildPreviewInvoiceData } from "@/lib/pdf-builder/preview-invoice-data"
import type { InvoicePdfTemplate } from "@/lib/pdf-builder/types"
import type { InvoicePdfApiPayload } from "@/lib/services/invoice-pdf-client"

/** Payload idéntico al de descarga/correo, con datos demo del builder. */
export function buildBuilderPreviewPdfPayload(
  template: InvoicePdfTemplate,
  company: Record<string, unknown> | null | undefined
): InvoicePdfApiPayload {
  const data = buildPreviewInvoiceData(company)
  const pdfTemplate = normalizeInvoicePdfTemplate(template, {
    primary: template.primaryColor,
    accent: template.accentColor,
  })

  return {
    pdfTemplate,
    documentType: data.documentType,
    invoice: {
      consecutivo: data.consecutivo,
      clave: data.clave,
      fechaEmision: data.fecha,
      currency: "CRC",
      moneda: "CRC",
      formaPago: "04",
      condicionVenta: "01",
      items: data.items.map((item) => ({
        numeroLinea: item.line,
        codigoCABYS: item.cabys,
        detalle: item.description,
        cantidad: item.qty,
        unidadMedida: item.unit,
        precioUnitario: item.unitPrice,
        descuento: item.discount,
        subTotal: item.subtotal,
      })),
      subtotal: data.subtotal,
      totalDescuento: data.totalDiscount,
      totalImpuesto: data.totalTax,
      totalExento: data.totalExempt,
      total: data.total,
      notas: data.notes,
    },
    company: {
      ...(company || {}),
      name: data.company.name,
      nombre: data.company.name,
      nombreComercial: data.company.commercialName,
      commercialName: data.company.commercialName,
      identification: data.company.id,
      cedula: data.company.id,
      phone: data.company.phone,
      telefono: data.company.phone,
      email: data.company.email,
      address: data.company.address,
      direccion: data.company.address,
      logo: data.company.logo,
    },
    client: {
      name: data.client.name,
      nombre: data.client.name,
      identification: data.client.id,
      identificacion: data.client.id,
      cedula: data.client.id,
      phone: data.client.phone,
      telefono: data.client.phone,
      email: data.client.email,
      address: data.client.address,
      direccion: data.client.address,
      economicActivity: data.client.economicActivity,
      actividadEconomica: data.client.economicActivity,
    },
  }
}
