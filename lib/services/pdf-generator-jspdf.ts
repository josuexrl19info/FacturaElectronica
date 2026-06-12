import "server-only"

import type { InvoicePdfTemplate } from "@/lib/pdf-builder/types"
import { generatePdfFromTemplate } from "@/lib/pdf-builder/render-pdf-jspdf"

/** Genera bytes PDF con jsPDF + plantilla (funciona en Vercel sin Chromium). */
export async function renderInvoiceTemplateToPdfBuffer(
  template: InvoicePdfTemplate,
  invoiceData: Record<string, unknown>
): Promise<ArrayBuffer> {
  const doc = await generatePdfFromTemplate(template, invoiceData)
  return doc.output("arraybuffer") as ArrayBuffer
}
