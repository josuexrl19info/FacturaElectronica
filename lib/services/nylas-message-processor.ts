import { ParsedHaciendaInvoiceSummary, parseHaciendaResponseStatus, parseHaciendaXml } from "@/lib/services/hacienda-xml-parser"
import { NylasMessage, NylasService } from "@/lib/services/nylas-service"

type AttachmentMeta = {
  id: string
  filename: string
  contentType: string
  size: number
}

export type CandidateMessage = {
  messageId: string
  subject: string
  fromName: string
  fromEmail: string
  date: number
  acceptanceStatus: string
  hasThreeRequiredAttachments: boolean
  xmlCount: number
  pdfCount: number
  totalAttachments: number
  attachments: AttachmentMeta[]
  invoiceSummary: ParsedHaciendaInvoiceSummary | null
  preferredPdfAttachmentId?: string
  preferredPdfFilename?: string
}

function normalizeAttachment(raw: any): AttachmentMeta {
  return {
    id: String(raw?.id || ""),
    filename: String(raw?.filename || "adjunto"),
    contentType: String(raw?.content_type || "application/octet-stream"),
    size: Number(raw?.size || 0),
  }
}

function detectFileKind(filename: string): "xml" | "pdf" | "other" {
  const lower = String(filename || "").toLowerCase()
  if (lower.endsWith(".xml")) return "xml"
  if (lower.endsWith(".pdf")) return "pdf"
  return "other"
}

function pickFirstTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<([a-zA-Z0-9_]+:)?${tagName}>([^<]+)</([a-zA-Z0-9_]+:)?${tagName}>`, "i")
  const match = regex.exec(xml)
  return String(match?.[2] || "").trim()
}

function choosePreferredPdfAttachment(
  pdfAttachments: AttachmentMeta[],
  invoiceXmlFilename: string,
  invoiceSummary: ParsedHaciendaInvoiceSummary | null
): AttachmentMeta | null {
  if (pdfAttachments.length === 0) return null
  if (pdfAttachments.length === 1) return pdfAttachments[0]

  const xmlBase = String(invoiceXmlFilename || "").toLowerCase().replace(/\.xml$/i, "")
  const consecutivo = String(invoiceSummary?.numeroConsecutivo || "").toLowerCase()
  const clave = String(invoiceSummary?.clave || "").toLowerCase()
  const claveTail = clave.length >= 20 ? clave.slice(-20) : clave

  let best: AttachmentMeta | null = null
  let bestScore = -1

  for (const pdf of pdfAttachments) {
    const name = String(pdf.filename || "").toLowerCase()
    let score = 0
    if (consecutivo && name.includes(consecutivo)) score += 5
    if (clave && name.includes(clave)) score += 5
    if (claveTail && name.includes(claveTail)) score += 3
    if (xmlBase && (name.includes(xmlBase) || xmlBase.includes(name.replace(/\.pdf$/i, "")))) score += 2
    if (name.includes("hacienda") || name.includes("respuesta")) score -= 1

    if (score > bestScore) {
      best = pdf
      bestScore = score
    }
  }

  return best || pdfAttachments[0]
}

export async function buildCandidateFromMessage(
  grantId: string,
  message: NylasMessage
): Promise<CandidateMessage> {
  const attachments = (message.attachments || []).map(normalizeAttachment)
  const xmlAttachments = attachments.filter((item) => detectFileKind(item.filename) === "xml")
  const pdfAttachments = attachments.filter((item) => detectFileKind(item.filename) === "pdf")

  let acceptanceStatus = "DESCONOCIDO"
  let invoiceSummary: ParsedHaciendaInvoiceSummary | null = null
  let fallbackConsecutivo = ""
  let fallbackEmisorId = ""
  let invoiceXmlFilename = ""

  for (const xmlMeta of xmlAttachments) {
    try {
      const payload = await NylasService.downloadAttachment({
        grantId,
        messageId: message.id,
        attachmentId: xmlMeta.id,
      })
      const xml = payload.buffer.toString("utf8")

      if (!invoiceSummary) {
        const candidateSummary = parseHaciendaXml(xml)
        if (candidateSummary?.tipoDocumento && candidateSummary.tipoDocumento !== "Desconocido") {
          invoiceSummary = candidateSummary
          invoiceXmlFilename = xmlMeta.filename || ""
        }
      }

      if (!fallbackConsecutivo) {
        fallbackConsecutivo = pickFirstTag(xml, "NumeroConsecutivo") || pickFirstTag(xml, "NumeroConsecutivoReceptor")
      }
      if (!fallbackEmisorId) {
        fallbackEmisorId = pickFirstTag(xml, "NumeroCedulaEmisor") || pickFirstTag(xml, "Numero")
      }

      const status = parseHaciendaResponseStatus(xml)
      if (status !== "DESCONOCIDO") {
        acceptanceStatus = status
      }
    } catch {
      // Se ignora un adjunto aislado con error para no detener el procesamiento total.
    }
  }

  if (!invoiceSummary && (fallbackConsecutivo || fallbackEmisorId)) {
    invoiceSummary = {
      tipoDocumento: "Desconocido",
      clave: "",
      numeroConsecutivo: fallbackConsecutivo,
      fechaEmision: "",
      condicionVenta: "",
      totalComprobante: 0,
      totalImpuesto: 0,
      totalExonerado: 0,
      emisorNombre: message.from?.[0]?.name || "",
      emisorId: fallbackEmisorId,
      receptorNombre: "",
      receptorId: "",
      esCompra: false,
      esVenta: true,
      lineas: [],
      ivaPorTarifa: [],
    }
  }

  const preferredPdf = choosePreferredPdfAttachment(pdfAttachments, invoiceXmlFilename, invoiceSummary)

  return {
    messageId: message.id,
    subject: message.subject || "",
    fromName: message.from?.[0]?.name || "",
    fromEmail: message.from?.[0]?.email || "",
    date: Number(message.date || 0),
    acceptanceStatus,
    hasThreeRequiredAttachments: xmlAttachments.length >= 2 && pdfAttachments.length >= 1,
    xmlCount: xmlAttachments.length,
    pdfCount: pdfAttachments.length,
    totalAttachments: attachments.length,
    attachments,
    invoiceSummary,
    preferredPdfAttachmentId: preferredPdf?.id,
    preferredPdfFilename: preferredPdf?.filename,
  }
}
