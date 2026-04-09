import { NextRequest, NextResponse } from "next/server"
import { InvoiceReceptionService } from "@/lib/services/invoice-reception-service"
import { buildUniqueFiscalId, canonicalizeEmail } from "@/lib/services/nylas-utils"

function resolveDateRange(params: URLSearchParams): { fromDate?: string; toDate?: string } {
  const mode = params.get("dateMode") || "currentMonth"
  const fromDateParam = params.get("fromDate") || ""
  const toDateParam = params.get("toDate") || ""

  if (mode === "range") {
    return {
      fromDate: fromDateParam || undefined,
      toDate: toDateParam || undefined,
    }
  }

  const now = new Date()
  if (mode === "previousMonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return {
      fromDate: start.toISOString().slice(0, 10),
      toDate: end.toISOString().slice(0, 10),
    }
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate: end.toISOString().slice(0, 10),
  }
}

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId") || ""
    const receptionEmail = request.nextUrl.searchParams.get("receptionEmail") || ""
    const { fromDate, toDate } = resolveDateRange(request.nextUrl.searchParams)

    if (!companyId || !receptionEmail) {
      return NextResponse.json({ error: "companyId y receptionEmail son requeridos" }, { status: 400 })
    }

    const processed = await InvoiceReceptionService.getProcessed({
      companyId,
      receptionEmail,
      fromDate,
      toDate,
    })

    return NextResponse.json({
      success: true,
      count: processed.length,
      records: processed,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error obteniendo procesados" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const companyId = String(body?.companyId || "")
    const receptionEmail = String(body?.receptionEmail || "")
    const summary = body?.invoiceSummary || {}
    const messageId = String(body?.messageId || "")
    if (!companyId || !receptionEmail || !messageId) {
      return NextResponse.json({ error: "companyId, receptionEmail y messageId son requeridos" }, { status: 400 })
    }

    const uniqueId =
      String(body?.uniqueId || "") ||
      buildUniqueFiscalId({
        companyId,
        messageId,
        consecutivo: summary?.numeroConsecutivo,
        emisorId: summary?.emisorId,
        clave: summary?.clave,
      })

    await InvoiceReceptionService.saveProcessed(uniqueId, {
      ...body,
      uniqueId,
      companyId,
      receptionEmail,
      receptionEmailCanonical: canonicalizeEmail(receptionEmail),
      processedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, uniqueId })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error guardando procesado" },
      { status: 500 }
    )
  }
}
