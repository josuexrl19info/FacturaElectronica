import "server-only"

import puppeteer from "puppeteer"
import type { InvoicePdfTemplate } from "@/lib/pdf-builder/types"
import { buildInvoiceHtmlDocument } from "@/lib/pdf-builder/render-invoice-html"

const LAUNCH_ARGS = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]

export async function renderInvoiceHtmlToPdfBuffer(
  template: InvoicePdfTemplate,
  invoiceData: Record<string, unknown>
): Promise<ArrayBuffer> {
  const html = buildInvoiceHtmlDocument(template, invoiceData)
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: LAUNCH_ARGS,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 })

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
