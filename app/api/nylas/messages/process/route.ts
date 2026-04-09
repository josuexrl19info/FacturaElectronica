import { NextRequest, NextResponse } from "next/server"
import { InvoiceReceptionService } from "@/lib/services/invoice-reception-service"
import { buildUniqueFiscalId, canonicalizeEmail } from "@/lib/services/nylas-utils"

const VALID_TYPES = new Set(["FacturaElectronica", "FacturaElectronicaCompra"])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const companyId = String(body?.companyId || "").trim()
    const selectedCandidates: any[] = Array.isArray(body?.selectedCandidates) ? body.selectedCandidates : []

    if (!companyId) {
      return NextResponse.json({ error: "companyId es requerido" }, { status: 400 })
    }

    const config = await InvoiceReceptionService.getConfig(companyId)
    if (!config?.nylas?.grantId || !config.email) {
      return NextResponse.json({ error: "La empresa no tiene Nylas conectado." }, { status: 400 })
    }

    if (selectedCandidates.length === 0) {
      return NextResponse.json({ success: true, processed: [], skipped: [] })
    }

    const processed: any[] = []
    const skipped: any[] = []

    for (const candidate of selectedCandidates) {
      const messageId = String(candidate?.messageId || "")
      const summary = candidate.invoiceSummary

      if (!summary || !VALID_TYPES.has(summary.tipoDocumento)) {
        skipped.push({ messageId, reason: "Tipo de documento no permitido para este proceso" })
        continue
      }

      if (candidate.acceptanceStatus !== "ACEPTADO") {
        skipped.push({ messageId, reason: "Estado de Hacienda diferente a ACEPTADO" })
        continue
      }

      if (!candidate.hasThreeRequiredAttachments) {
        skipped.push({ messageId, reason: "Faltan adjuntos requeridos (2 XML + 1 PDF)" })
        continue
      }

      const uniqueId = buildUniqueFiscalId({
        companyId,
        messageId,
        consecutivo: summary.numeroConsecutivo,
        emisorId: summary.emisorId,
        clave: summary.clave,
      })

      const exists = await InvoiceReceptionService.existsProcessed(uniqueId)
      if (exists) {
        skipped.push({ messageId, reason: "Documento duplicado por identificador fiscal", uniqueId })
        continue
      }

      const payload = {
        companyId,
        uniqueId,
        messageId,
        subject: candidate.subject,
        fromName: candidate.fromName,
        fromEmail: candidate.fromEmail,
        date: candidate.date,
        acceptanceStatus: candidate.acceptanceStatus,
        hasThreeRequiredAttachments: candidate.hasThreeRequiredAttachments,
        xmlCount: candidate.xmlCount,
        pdfCount: candidate.pdfCount,
        totalAttachments: candidate.totalAttachments,
        attachments: candidate.attachments,
        invoiceSummary: summary,
        receptionEmail: config.email,
        receptionEmailCanonical: canonicalizeEmail(config.email),
        receptionProvider: config.provider,
        processedAt: new Date().toISOString(),
      }

      await InvoiceReceptionService.saveProcessed(uniqueId, payload)
      processed.push(payload)
    }

    await InvoiceReceptionService.touchLastSync(companyId)

    return NextResponse.json({
      success: true,
      processedCount: processed.length,
      skippedCount: skipped.length,
      processed,
      skipped,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? `Error procesando facturas: ${error.message}` : "Error procesando facturas",
      },
      { status: 500 }
    )
  }
}
