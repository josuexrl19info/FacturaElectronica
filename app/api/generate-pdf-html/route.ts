import { NextRequest, NextResponse } from "next/server"
import { normalizeInvoicePdfTemplate } from "@/lib/pdf-builder/normalize-template"
import { buildInvoiceHtmlDocument } from "@/lib/pdf-builder/render-invoice-html"
import { personalizationFromCompanyRecord } from "@/lib/theme/company-personalization.utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const invoiceData = await request.json()
    const company = invoiceData.company as Record<string, unknown> | undefined
    const personalization = personalizationFromCompanyRecord(company)
    const invConfig = personalization.invoices
    const rawTemplate =
      invoiceData.pdfTemplate ||
      ((company?.personalization as Record<string, unknown> | undefined)?.invoices &&
        ((company?.personalization as Record<string, unknown>).invoices as Record<string, unknown>)
          ?.pdfTemplate)

    const template = normalizeInvoicePdfTemplate(rawTemplate, {
      primary: invConfig.headerColor,
      accent: invConfig.tableAccentColor,
    })

    const html = buildInvoiceHtmlDocument(template, invoiceData)

    return NextResponse.json({
      success: true,
      html,
      pageSize: template.pageSize,
    })
  } catch (error) {
    console.error("❌ Error generando HTML de factura:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}
