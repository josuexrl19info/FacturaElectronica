import "server-only"

import type { Browser } from "puppeteer-core"
import type { InvoicePdfTemplate } from "@/lib/pdf-builder/types"
import { buildInvoiceHtmlDocument } from "@/lib/pdf-builder/render-invoice-html"
import { launchPuppeteerBrowser } from "@/lib/services/puppeteer-launch"

async function renderWithPuppeteer(
  template: InvoicePdfTemplate,
  invoiceData: Record<string, unknown>
): Promise<ArrayBuffer> {
  const html = buildInvoiceHtmlDocument(template, invoiceData)
  let browser: Browser | null = null

  try {
    browser = await launchPuppeteerBrowser()

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 })

    const pdf = await page.pdf({
      format: template.pageSize === "letter" ? "Letter" : "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    })

    const buffer = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength)
    return buffer as ArrayBuffer
  } finally {
    if (browser) await browser.close()
  }
}

async function renderWithJsPdfFallback(
  template: InvoicePdfTemplate,
  invoiceData: Record<string, unknown>
): Promise<ArrayBuffer> {
  const { generatePdfFromTemplate } = await import("@/lib/pdf-builder/render-pdf-jspdf")
  const doc = await generatePdfFromTemplate(template, invoiceData)
  return doc.output("arraybuffer") as ArrayBuffer
}

export async function renderInvoiceHtmlToPdfBuffer(
  template: InvoicePdfTemplate,
  invoiceData: Record<string, unknown>
): Promise<ArrayBuffer> {
  try {
    return await renderWithPuppeteer(template, invoiceData)
  } catch (error) {
    console.error("[PDF] Puppeteer no disponible, usando fallback jsPDF:", error)
    return renderWithJsPdfFallback(template, invoiceData)
  }
}
