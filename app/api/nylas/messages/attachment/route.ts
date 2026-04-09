import { NextRequest, NextResponse } from "next/server"
import { InvoiceReceptionService } from "@/lib/services/invoice-reception-service"
import { NylasService } from "@/lib/services/nylas-service"

function resolveContentType(filename: string, fallback: string): string {
  const lower = String(filename || "").toLowerCase()
  if (lower.endsWith(".pdf")) return "application/pdf"
  if (lower.endsWith(".xml")) return "application/xml; charset=utf-8"
  return fallback || "application/octet-stream"
}

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId") || ""
    const messageId = request.nextUrl.searchParams.get("messageId") || ""
    const attachmentId = request.nextUrl.searchParams.get("attachmentId") || ""
    const filename = request.nextUrl.searchParams.get("filename") || "adjunto"

    if (!companyId || !messageId || !attachmentId) {
      return NextResponse.json({ error: "companyId, messageId y attachmentId son requeridos" }, { status: 400 })
    }

    const config = await InvoiceReceptionService.getConfig(companyId)
    const grantId = config?.nylas?.grantId
    if (!grantId) {
      return NextResponse.json({ error: "Nylas no conectado" }, { status: 400 })
    }

    const downloaded = await NylasService.downloadAttachment({
      grantId,
      messageId,
      attachmentId,
    })
    const contentType = resolveContentType(filename, downloaded.contentType)
    const safeFileName = encodeURIComponent(filename)

    return new NextResponse(downloaded.buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"; filename*=UTF-8''${safeFileName}`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo descargar adjunto" },
      { status: 500 }
    )
  }
}
