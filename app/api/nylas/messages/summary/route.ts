import { NextRequest, NextResponse } from "next/server"
import { InvoiceReceptionService } from "@/lib/services/invoice-reception-service"

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId") || ""
    const receptionEmail = request.nextUrl.searchParams.get("receptionEmail") || ""
    const fromDate = request.nextUrl.searchParams.get("fromDate") || undefined
    const toDate = request.nextUrl.searchParams.get("toDate") || undefined
    if (!companyId || !receptionEmail) {
      return NextResponse.json({ error: "companyId y receptionEmail son requeridos" }, { status: 400 })
    }

    const records = await InvoiceReceptionService.getProcessed({
      companyId,
      receptionEmail,
      fromDate,
      toDate,
    })

    const totalComprobante = records.reduce((sum, item) => sum + Number(item?.invoiceSummary?.totalComprobante || 0), 0)
    const totalIva = records.reduce((sum, item) => sum + Number(item?.invoiceSummary?.totalImpuesto || 0), 0)
    const totalExonerado = records.reduce((sum, item) => sum + Number(item?.invoiceSummary?.totalExonerado || 0), 0)

    return NextResponse.json({
      success: true,
      count: records.length,
      totals: {
        totalComprobante,
        totalIva,
        totalExonerado,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error creando resumen" },
      { status: 500 }
    )
  }
}
