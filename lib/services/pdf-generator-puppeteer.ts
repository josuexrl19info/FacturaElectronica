import "server-only"

import type { Browser } from "puppeteer-core"
import type { InvoicePdfTemplate } from "@/lib/pdf-builder/types"
import { buildInvoiceHtmlDocument } from "@/lib/pdf-builder/render-invoice-html"
import { launchPuppeteerBrowser } from "@/lib/services/puppeteer-launch"

/** HTML → PDF en servidor (mismo diseño elegante; Puppeteer local o Chromium en Vercel). */
export async function renderInvoiceHtmlToPdfBuffer(
  template: InvoicePdfTemplate,
  invoiceData: Record<string, unknown>
): Promise<ArrayBuffer> {
  const html = buildInvoiceHtmlDocument(template, invoiceData)
  let browser: Browser | null = null

  try {
    browser = await launchPuppeteerBrowser()

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 })
    await page.emulateMediaType("print")

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
