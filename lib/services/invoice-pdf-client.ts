import { normalizeInvoicePdfTemplate } from "@/lib/pdf-builder/normalize-template"
import type { InvoicePdfTemplate } from "@/lib/pdf-builder/types"
import { personalizationFromCompanyRecord } from "@/lib/theme/company-personalization.utils"

export type InvoicePdfApiPayload = {
  invoice: Record<string, unknown>
  company: Record<string, unknown>
  client: Record<string, unknown>
  haciendaResponse?: unknown
  tieneExoneracion?: unknown
  exoneracion?: unknown
  pdfTemplate: InvoicePdfTemplate
  documentType: string
}

export function detectDocumentTypeLabel(invoice: Record<string, unknown>): string {
  const isNotaCredito =
    invoice.tipo === "nota-credito" || Boolean(invoice.tipoNotaCredito) || Boolean(invoice.referenciaFactura)
  const isTiquete =
    invoice.documentType === "tiquetes" ||
    invoice.tipo === "tiquete" ||
    String(invoice.consecutivo || "").startsWith("TE-")

  if (isNotaCredito) return "Nota de Crédito Electrónica"
  if (isTiquete) return "Tiquete Electrónico"
  return "Factura Electrónica"
}

export function resolvePdfTemplateFromSources(options: {
  company?: Record<string, unknown> | null
  pdfTemplateOverride?: unknown
}): InvoicePdfTemplate {
  const personalization = personalizationFromCompanyRecord(options.company)
  return normalizeInvoicePdfTemplate(
    (options.pdfTemplateOverride || personalization.invoices.pdfTemplate) as Partial<InvoicePdfTemplate>,
    {
      primary: personalization.invoices.headerColor,
      accent: personalization.invoices.tableAccentColor,
    }
  )
}

export function buildInvoicePdfApiPayload(
  invoice: Record<string, unknown>,
  company: Record<string, unknown> | null | undefined,
  client: Record<string, unknown> | null | undefined,
  options?: { pdfTemplateOverride?: unknown }
): InvoicePdfApiPayload {
  const companyRecord = (company || {}) as Record<string, unknown>
  const pdfTemplate = resolvePdfTemplateFromSources({
    company: companyRecord,
    pdfTemplateOverride: options?.pdfTemplateOverride,
  })

  return {
    invoice,
    company: companyRecord,
    client: (client || {}) as Record<string, unknown>,
    haciendaResponse: invoice.haciendaSubmission || invoice.haciendaResponse,
    tieneExoneracion: invoice.tieneExoneracion,
    exoneracion: invoice.exoneracion,
    pdfTemplate,
    documentType: detectDocumentTypeLabel(invoice),
  }
}

/**
 * Vista previa / descarga en navegador: HTML + jsPDF (compatible con Vercel Hobby).
 * En servidor (correos, etc.): intenta Puppeteer; en Vercel puede fallar por límites de memoria.
 */
export async function fetchInvoicePdfFromApi(
  payload: InvoicePdfApiPayload
): Promise<{ blob: Blob; base64: string }> {
  if (typeof window !== "undefined") {
    return fetchInvoicePdfInBrowser(payload)
  }
  return fetchInvoicePdfFromServerApi(payload)
}

async function fetchInvoicePdfInBrowser(
  payload: InvoicePdfApiPayload
): Promise<{ blob: Blob; base64: string }> {
  const response = await fetch("/api/generate-pdf-html", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Error generando HTML del PDF: ${response.status}`)
  }

  const result = await response.json()
  if (!result.success || !result.html) {
    throw new Error(result.error || "Error generando HTML del PDF")
  }

  const { convertInvoiceHtmlToPdfBlob, blobToBase64 } = await import("@/lib/services/invoice-pdf-browser")
  const blob = await convertInvoiceHtmlToPdfBlob(result.html, payload.pdfTemplate.pageSize)
  const base64 = await blobToBase64(blob)
  return { blob, base64 }
}

async function fetchInvoicePdfFromServerApi(
  payload: InvoicePdfApiPayload
): Promise<{ blob: Blob; base64: string }> {
  const apiPath = "/api/generate-pdf-optimized"
  const url =
    typeof window !== "undefined"
      ? apiPath
      : `${(await import("@/lib/utils")).getBaseUrl()}${apiPath}`

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Error generando PDF: ${response.status}`)
  }

  const result = await response.json()
  if (!result.success || !result.pdf_base64) {
    throw new Error(result.error || "Error generando PDF")
  }

  const pdfData = atob(result.pdf_base64)
  const pdfBytes = new Uint8Array(pdfData.length)
  for (let i = 0; i < pdfData.length; i++) {
    pdfBytes[i] = pdfData.charCodeAt(i)
  }

  return {
    blob: new Blob([pdfBytes], { type: "application/pdf" }),
    base64: result.pdf_base64,
  }
}

export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function getPdfFilenameFromInvoice(invoice: Record<string, unknown>): string {
  const hacienda = invoice.haciendaSubmission as Record<string, unknown> | undefined
  const clave = hacienda?.clave || invoice.clave
  const name = clave || invoice.consecutivo || invoice.id || "documento"
  return String(name)
}
