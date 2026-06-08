import jsPDF from "jspdf"
import sharp from "sharp"
import type { InvoicePdfTemplate, PdfBlock, PdfBlockProps, PdfMockInvoiceData } from "@/lib/pdf-builder/types"
import { isContainerBlock } from "@/lib/pdf-builder/types"
import { PDF_MOCK_INVOICE } from "@/lib/pdf-builder/mock-invoice-data"
import { buildCompanyNameLines, buildDocumentMetaEntries, buildPartyLines, getCondicionVentaLabel, getPaymentMethodLabel } from "@/lib/pdf-builder/block-render-helpers"
import { hexToRgbSafe, resolveContainerStyles } from "@/lib/pdf-builder/container-styles"
import { formatEconomicActivity, formatPdfDateField, formatPdfTextValue, rawPdfFieldValue, resolveConsecutivoDisplay } from "@/lib/pdf-builder/pdf-text-utils"
import { ensureContainerSlots, normalizeBlockTree } from "@/lib/pdf-builder/tree-utils"

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return [r, g, b]
}

function formatCurrency(amount: number, currency = "CRC"): string {
  const formatted = Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return currency === "USD" ? `USD ${formatted}` : `CRC ${formatted}`
}

function getPaymentName(code: string): string {
  return getPaymentMethodLabel(code)
}

async function optimizeLogo(logoData: string): Promise<string | null> {
  try {
    const buffer = Buffer.from(logoData.replace(/^data:image\/\w+;base64,/, ""), "base64")
    const optimized = await sharp(buffer)
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 6 })
      .toBuffer()
    return optimized.toString("base64")
  } catch {
    return null
  }
}

function extractLogoData(company: Record<string, unknown> | undefined): string | null {
  if (!company?.logo) return null
  const logo = company.logo
  if (typeof logo === "string") return logo
  if (typeof logo === "object" && logo !== null) {
    const l = logo as Record<string, unknown>
    return String(l.fileData || l.filedata || l.url || "")
  }
  return null
}

export function mapInvoiceDataToPdfContext(invoiceData: Record<string, unknown>): PdfMockInvoiceData {
  const invoice = (invoiceData.invoice || {}) as Record<string, unknown>
  const company = (invoiceData.company || {}) as Record<string, unknown>
  const client = (invoiceData.client || {}) as Record<string, unknown>
  const currency = String(invoice.currency || invoice.moneda || "CRC")
  const cliente = invoice.cliente as Record<string, unknown> | undefined
  const isNC =
    invoiceData.tipo === "nota-credito" ||
    invoice.tipo === "nota-credito" ||
    Boolean(invoiceData.tipoNotaCredito) ||
    Boolean(invoice.referenciaFactura)

  const isTiquete =
    invoice.documentType === "tiquetes" ||
    invoice.tipo === "tiquete" ||
    String(invoice.consecutivo || "").startsWith("TE-")

  const documentType = isNC
    ? "Nota de Crédito Electrónica"
    : isTiquete
      ? "Tiquete Electrónico"
      : String(invoiceData.documentType || invoice.documentTypeLabel || "Factura Electrónica")

  const itemsRaw = (invoice.items || invoice.lineas || []) as Array<Record<string, unknown>>
  const items = itemsRaw.map((item, i) => ({
    line: Number(item.numeroLinea || i + 1),
    cabys: String(item.codigoCABYS || item.cabys || "—"),
    description: String(item.detalle || item.description || "—"),
    qty: Number(item.cantidad || item.quantity || 0),
    unit: String(item.unidadMedida || item.unit || "Unid"),
    unitPrice: Number(item.precioUnitario || item.unitPrice || 0),
    discount: Number(item.descuento || item.discount || 0),
    subtotal: Number(item.subTotal || item.subtotal || item.montoTotalLinea || 0),
  }))

  const hacienda = (invoiceData.haciendaResponse || invoiceData.haciendaSubmission) as
    | Record<string, unknown>
    | undefined

  return {
    documentType,
    consecutivo: resolveConsecutivoDisplay(invoice, hacienda),
    clave: String(invoice.clave || hacienda?.clave || "—"),
    fecha: rawPdfFieldValue(invoice.fechaEmision || invoice.createdAt || new Date()),
    moneda: currency === "USD" ? "Dólares (USD)" : "Colones (CRC)",
    formaPago: getPaymentName(String(invoice.formaPago || invoice.paymentMethod || invoiceData.formaPago || "01")),
    condicionVenta: getCondicionVentaLabel(String(invoice.condicionVenta || "01")),
    company: {
      name: String(company.name || company.nombre || "Empresa"),
      commercialName: String(company.nombreComercial || company.commercialName || company.name || ""),
      id: String(company.identification || company.cedula || company.numeroIdentificacion || "—"),
      phone: String(company.phone || company.telefono || "—"),
      email: String(company.email || company.correo || "—"),
      address: String(company.address || company.direccion || company.otrasSenas || "—"),
      logo: extractLogoData(company) || undefined,
    },
    client: {
      name: String(client.name || client.nombre || cliente?.nombre || "Cliente"),
      id: String(client.identification || client.identificacion || client.cedula || "—"),
      phone: String(client.phone || client.telefono || "—"),
      email: String(client.email || client.correo || "—"),
      address: String(client.address || client.direccion || "—"),
      economicActivity: formatEconomicActivity(
        client.economicActivity ||
          client.actividadEconomica ||
          (cliente as Record<string, unknown> | undefined)?.actividadEconomica ||
          (cliente as Record<string, unknown> | undefined)?.economicActivity
      ),
    },
    items: items.length > 0 ? items : PDF_MOCK_INVOICE.items,
    subtotal: Number(invoice.subtotal || invoice.totalVenta || 0),
    totalDiscount: Number(invoice.totalDescuento || invoice.totalDiscount || 0),
    totalTax: Number(invoice.totalImpuesto || invoice.totalTax || 0),
    totalExempt: Number(invoice.totalExento || 0),
    total: Number(invoice.total || 0),
    notes: String(invoice.notes || invoice.notas || ""),
    legalText: PDF_MOCK_INVOICE.legalText,
  }
}

type RenderCtx = {
  doc: jsPDF
  data: PdfMockInvoiceData
  template: InvoicePdfTemplate
  margin: number
  contentWidth: number
  y: number
  pageHeight: number
  logoBase64: string | null
}

function ensureSpace(ctx: RenderCtx, needed: number): void {
  if (ctx.y + needed > ctx.pageHeight - ctx.margin) {
    ctx.doc.addPage()
    ctx.y = ctx.margin
  }
}

function drawSectionTitle(ctx: RenderCtx, title: string, x: number, width: number): number {
  const [r, g, b] = hexToRgb(ctx.template.accentColor)
  ctx.doc.setFillColor(r, g, b)
  ctx.doc.roundedRect(x, ctx.y, width, 7, 1, 1, "F")
  ctx.doc.setTextColor(255, 255, 255)
  ctx.doc.setFontSize(9)
  ctx.doc.setFont(ctx.template.fontFamily, "bold")
  ctx.doc.text(title, x + 3, ctx.y + 5)
  ctx.doc.setTextColor(0, 0, 0)
  return ctx.y + 10
}

function pxToMm(px: number): number {
  return px * 0.264583
}

function setFontStyle(doc: jsPDF, family: string, bold: boolean): void {
  doc.setFont(family, bold ? "bold" : "normal")
}

function splitTextLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  const safeWidth = Math.max(4, maxWidth)
  const lines = doc.splitTextToSize(String(text), safeWidth)
  return Array.isArray(lines) ? lines : [String(lines)]
}

function wrappedLineCount(doc: jsPDF, text: string, maxWidth: number, fontSize: number): number {
  doc.setFontSize(fontSize)
  return splitTextLines(doc, text, maxWidth).length
}

function writeWrappedText(
  ctx: RenderCtx,
  text: string,
  x: number,
  maxWidth: number,
  fontSize: number,
  lineHeight = 4.5,
  options?: { bold?: boolean; align?: "left" | "right" | "center" }
): void {
  ctx.doc.setFontSize(fontSize)
  setFontStyle(ctx.doc, ctx.template.fontFamily, options?.bold ?? false)
  for (const line of splitTextLines(ctx.doc, text, maxWidth)) {
    ensureSpace(ctx, lineHeight)
    ctx.doc.text(line, x, ctx.y, { align: options?.align || "left", maxWidth })
    ctx.y += lineHeight
  }
}

async function renderBlock(ctx: RenderCtx, block: PdfBlock, width: number, x: number): Promise<void> {
  const props = block.props

  if (isContainerBlock(block.type)) {
    await renderContainer(ctx, block, width, x)
    return
  }

  switch (block.type) {
    case "logo": {
      if (!ctx.template.showLogo) break
      const logoW = pxToMm(props?.logoWidth ?? 88)
      const logoH = pxToMm(props?.logoHeight ?? 56)
      const drawW = Math.min(width, logoW)
      const drawH = Math.min(logoH, drawW * (logoH / logoW))
      if (ctx.logoBase64) {
        try {
          ctx.doc.addImage(ctx.logoBase64, "PNG", x, ctx.y, drawW, drawH)
          ctx.y += drawH + 4
        } catch {
          ctx.y += 4
        }
      } else {
        ctx.doc.setDrawColor(200, 200, 200)
        ctx.doc.setFillColor(248, 248, 248)
        ctx.doc.roundedRect(x, ctx.y, drawW, drawH, 2, 2, "FD")
        ctx.doc.setFontSize(8)
        ctx.doc.setTextColor(150, 150, 150)
        ctx.doc.text("LOGO", x + drawW / 2 - 6, ctx.y + drawH / 2 + 2)
        ctx.doc.setTextColor(0, 0, 0)
        ctx.y += drawH + 4
      }
      break
    }
    case "document-badge": {
      const [r, g, b] = hexToRgb(ctx.template.primaryColor)
      ctx.doc.setFillColor(r, g, b)
      const badgeW = Math.min(width, 70)
      const badgeX = x + Math.max(0, width - badgeW)
      const fs = props?.badgeFontSize || 10
      ctx.doc.setFontSize(fs)
      setFontStyle(ctx.doc, ctx.template.fontFamily, props?.bold !== false)
      const badgeLines = splitTextLines(ctx.doc, ctx.data.documentType, badgeW - 8)
      const badgeH = Math.max(14, badgeLines.length * 5 + 6)
      ctx.doc.roundedRect(badgeX, ctx.y, badgeW, badgeH, 2, 2, "F")
      ctx.doc.setTextColor(255, 255, 255)
      badgeLines.forEach((line, idx) => {
        ctx.doc.text(line, badgeX + 4, ctx.y + 7 + idx * 5, { maxWidth: badgeW - 8 })
      })
      ctx.doc.setTextColor(0, 0, 0)
      ctx.y += badgeH + 4
      break
    }
    case "company-name": {
      const lines = buildCompanyNameLines(ctx.data, props?.nameDisplay || "both")
      const fs = props?.nameFontSize || 14
      const innerW = Math.max(4, width - 2)
      if (lines.primary) {
        ctx.y += 5
        writeWrappedText(ctx, lines.primary, x, innerW, fs, 4.5, { bold: props?.nameBold !== false })
      }
      if (lines.secondary) {
        writeWrappedText(ctx, lines.secondary, x, innerW, Math.max(8, fs * 0.65), 4, { bold: false })
      }
      ctx.y += 2
      break
    }
    case "emitter-info":
    case "receiver-info": {
      const isEmitter = block.type === "emitter-info"
      const title = isEmitter ? "Emisor" : "Receptor"
      ctx.y = drawSectionTitle(ctx, title, x, width)
      const innerW = Math.max(4, width - 4)
      for (const line of buildPartyLines(ctx.data, isEmitter, props)) {
        writeWrappedText(ctx, line, x + 2, innerW, 8, 4.5)
      }
      ctx.y += 4
      break
    }
    case "document-meta": {
      ctx.y = drawSectionTitle(ctx, "Información del documento", x, width)
      const entries = buildDocumentMetaEntries(ctx.data, props)
      const metaCols = props?.documentMetaColumns === 2 ? 2 : 1
      const gap = 3
      const colW = metaCols === 2 ? (width - gap) / 2 : width
      const columns: typeof entries[] =
        metaCols === 2
          ? [entries.slice(0, Math.ceil(entries.length / 2)), entries.slice(Math.ceil(entries.length / 2))]
          : [entries]

      let maxY = ctx.y
      columns.forEach((colEntries, colIndex) => {
        const colX = x + colIndex * (colW + gap)
        const innerW = Math.max(4, colW - 4)
        let colY = ctx.y
        ctx.y = colY
        for (const entry of colEntries) {
          writeWrappedText(ctx, `${entry.label}:`, colX + 2, innerW, 8, 4, { bold: true })
          writeWrappedText(ctx, entry.value, colX + 2, innerW, 8, 4.5)
          ctx.y += 1
        }
        maxY = Math.max(maxY, ctx.y)
      })
      ctx.y = maxY + 2
      break
    }
    case "line-items": {
      ensureSpace(ctx, 40)
      ctx.y = drawSectionTitle(ctx, "Detalle", x, width)
      const [hr, hg, hb] = hexToRgb(ctx.template.primaryColor)
      const numW = Math.max(8, width * 0.07)
      const qtyW = Math.max(10, width * 0.1)
      const unitW = Math.max(14, width * 0.16)
      const totalW = Math.max(14, width * 0.16)
      const descW = Math.max(12, width - numW - qtyW - unitW - totalW - 4)
      const colX = [x + 1, x + numW + 1, x + numW + descW + 2, x + numW + descW + qtyW + 3, x + width - totalW]

      ctx.doc.setFillColor(hr, hg, hb)
      ctx.doc.rect(x, ctx.y, width, 7, "F")
      ctx.doc.setTextColor(255, 255, 255)
      ctx.doc.setFontSize(7)
      ctx.doc.setFont(ctx.template.fontFamily, "bold")
      ;["#", "Descripción", "Cant.", "P.Unit.", "Total"].forEach((c, i) => {
        const colWidths = [numW, descW, qtyW, unitW, totalW]
        ctx.doc.text(c, colX[i], ctx.y + 5, { maxWidth: colWidths[i] - 1 })
      })
      ctx.doc.setTextColor(0, 0, 0)
      ctx.y += 9
      ctx.doc.setFont(ctx.template.fontFamily, "normal")
      ctx.doc.setFontSize(7)

      for (const item of ctx.data.items) {
        const descLines = splitTextLines(ctx.doc, item.description, descW - 2)
        const rowH = Math.max(7, descLines.length * 3.5 + 2)
        ensureSpace(ctx, rowH)
        const rowY = ctx.y
        const bg = item.line % 2 === 0 ? 248 : 255
        ctx.doc.setFillColor(bg, bg, bg)
        ctx.doc.rect(x, rowY - 3, width, rowH, "F")
        ctx.doc.text(String(item.line), colX[0], rowY, { maxWidth: numW - 1 })
        descLines.forEach((line, idx) => {
          ctx.doc.text(line, colX[1], rowY + idx * 3.5, { maxWidth: descW - 2 })
        })
        ctx.doc.text(String(item.qty), colX[2], rowY, { maxWidth: qtyW - 1 })
        ctx.doc.text(formatCurrency(item.unitPrice).replace("CRC ", ""), colX[3], rowY, { maxWidth: unitW - 1 })
        ctx.doc.text(formatCurrency(item.subtotal).replace("CRC ", ""), colX[4], rowY, {
          maxWidth: totalW - 1,
          align: "right",
        })
        ctx.y += rowH
      }
      ctx.y += 4
      break
    }
    case "totals": {
      ctx.y = drawSectionTitle(ctx, "Resumen", x, width)
      ctx.doc.setFontSize(9)
      const labelW = Math.max(20, width * 0.45)
      const valueW = Math.max(12, width - labelW - 4)
      for (const [label, val] of [
        ["Subtotal", formatCurrency(ctx.data.subtotal)],
        ["Descuento", formatCurrency(ctx.data.totalDiscount)],
        ["IVA", formatCurrency(ctx.data.totalTax)],
      ]) {
        ctx.doc.setFont(ctx.template.fontFamily, "normal")
        ctx.doc.text(label, x + 2, ctx.y, { maxWidth: labelW })
        ctx.doc.text(val, x + width - 2, ctx.y, { align: "right", maxWidth: valueW })
        ctx.y += 5
      }
      const [pr, pg, pb] = hexToRgb(ctx.template.primaryColor)
      ctx.doc.setFillColor(pr, pg, pb)
      ctx.doc.roundedRect(x, ctx.y, width, 10, 1, 1, "F")
      ctx.doc.setTextColor(255, 255, 255)
      ctx.doc.setFont(ctx.template.fontFamily, "bold")
      ctx.doc.text("TOTAL", x + 4, ctx.y + 7)
      ctx.doc.text(formatCurrency(ctx.data.total), x + width - 4, ctx.y + 7, { align: "right" })
      ctx.doc.setTextColor(0, 0, 0)
      ctx.y += 14
      break
    }
    case "notes": {
      if (!ctx.data.notes) break
      ctx.y = drawSectionTitle(ctx, "Notas", x, width)
      writeWrappedText(ctx, ctx.data.notes, x + 2, Math.max(4, width - 4), 8, 4.5)
      ctx.y += 4
      break
    }
    case "legal-text": {
      ctx.doc.setTextColor(100, 100, 100)
      writeWrappedText(
        ctx,
        props?.text || ctx.data.legalText,
        x,
        Math.max(4, width),
        props?.fontSize || 7,
        4,
        { bold: Boolean(props?.bold) }
      )
      ctx.doc.setTextColor(0, 0, 0)
      ctx.y += 2
      break
    }
    case "custom-text": {
      writeWrappedText(
        ctx,
        formatPdfTextValue(props?.text || ""),
        x,
        Math.max(4, width),
        props?.fontSize || 10,
        (props?.fontSize || 10) * 0.45 + 2,
        { bold: Boolean(props?.bold), align: props?.align || "left" }
      )
      ctx.y += 2
      break
    }
    case "custom-image": {
      const imgW = pxToMm(props?.imageWidth ?? 120)
      const imgH = pxToMm(props?.imageHeight ?? 48)
      if (props?.imageUrl) {
        try {
          ctx.doc.addImage(props.imageUrl, "PNG", x, ctx.y, Math.min(width, imgW), imgH)
          ctx.y += imgH + 4
        } catch {
          ctx.y += 4
        }
      } else {
        ctx.doc.setDrawColor(200, 200, 200)
        ctx.doc.roundedRect(x, ctx.y, Math.min(width, imgW), imgH, 1, 1, "S")
        ctx.y += imgH + 4
      }
      break
    }
    case "divider": {
      const [dr, dg, db] = hexToRgb(ctx.template.accentColor)
      ctx.doc.setDrawColor(dr, dg, db)
      ctx.doc.line(x, ctx.y, x + width, ctx.y)
      ctx.y += 6
      break
    }
    case "spacer": {
      ctx.y += pxToMm(props?.height || 10)
      break
    }
    default:
      break
  }
}

function applyPdfBorderDash(doc: jsPDF, style: "solid" | "dashed" | "dotted"): void {
  if (style === "dashed") {
    doc.setLineDashPattern([1.5, 1.2], 0)
  } else if (style === "dotted") {
    doc.setLineDashPattern([0.4, 1], 0)
  } else {
    doc.setLineDashPattern([], 0)
  }
}

function estimateBlockHeightMm(block: PdfBlock, ctx: RenderCtx, width: number): number {
  const props = block.props
  const doc = ctx.doc
  if (isContainerBlock(block.type)) {
    return estimateContainerHeightMm(block, ctx, width)
  }
  switch (block.type) {
    case "logo":
      return pxToMm(props?.logoHeight ?? 56) + 4
    case "document-badge": {
      const badgeW = Math.min(width, 70)
      const fs = props?.badgeFontSize || 10
      doc.setFontSize(fs)
      const lines = wrappedLineCount(doc, ctx.data.documentType, badgeW - 8, fs)
      return Math.max(18, lines * 5 + 10)
    }
    case "company-name": {
      const lines = buildCompanyNameLines(ctx.data, props?.nameDisplay)
      const fs = props?.nameFontSize || 14
      const innerW = Math.max(4, width - 2)
      let h = 7
      if (lines.primary) h += wrappedLineCount(doc, lines.primary, innerW, fs) * 4.5
      if (lines.secondary) h += wrappedLineCount(doc, lines.secondary, innerW, Math.max(8, fs * 0.65)) * 4
      return h + 2
    }
    case "emitter-info":
    case "receiver-info": {
      const innerW = Math.max(4, width - 4)
      const partyLines = buildPartyLines(ctx.data, block.type === "emitter-info", props)
      const textH = partyLines.reduce(
        (sum, line) => sum + wrappedLineCount(doc, line, innerW, 8) * 4.5,
        0
      )
      return 10 + textH + 4
    }
    case "document-meta": {
      const metaCols = props?.documentMetaColumns === 2 ? 2 : 1
      const colW = metaCols === 2 ? (width - 3) / 2 : width
      const innerW = Math.max(4, colW - 4)
      const entries = buildDocumentMetaEntries(ctx.data, props)
      const perCol = Math.ceil(entries.length / metaCols)
      let h = 10
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        h += 4 + wrappedLineCount(doc, entry.value, innerW, 8) * 4.5 + 1
        if (metaCols === 2 && (i + 1) % perCol === 0 && i + 1 < entries.length) {
          // parallel columns share height — handled by max column; approximate evenly
        }
      }
      return h + 2
    }
    case "line-items": {
      const numW = Math.max(8, width * 0.07)
      const qtyW = Math.max(10, width * 0.1)
      const unitW = Math.max(14, width * 0.16)
      const totalW = Math.max(14, width * 0.16)
      const descW = Math.max(12, width - numW - qtyW - unitW - totalW - 4)
      doc.setFontSize(7)
      const rowsH = ctx.data.items.reduce((sum, item) => {
        const lines = wrappedLineCount(doc, item.description, descW - 2, 7)
        return sum + Math.max(7, lines * 3.5 + 2)
      }, 0)
      return 10 + 9 + rowsH + 4
    }
    case "totals":
      return 10 + 3 * 5 + 14
    case "notes":
      return ctx.data.notes
        ? 10 + wrappedLineCount(doc, ctx.data.notes, Math.max(4, width - 4), 8) * 4.5 + 6
        : 0
    case "legal-text":
      return wrappedLineCount(doc, props?.text || ctx.data.legalText, Math.max(4, width), props?.fontSize || 7) * 4 + 4
    case "custom-text": {
      const fs = props?.fontSize || 10
      const lines = wrappedLineCount(doc, String(props?.text || ""), Math.max(4, width), fs)
      return lines * (fs * 0.45 + 2) + 4
    }
    case "custom-image":
      return pxToMm(props?.imageHeight ?? 48) + 4
    case "divider":
      return 6
    case "spacer":
      return pxToMm(props?.height || 10)
    default:
      return 8
  }
}

function estimateContainerHeightMm(block: PdfBlock, ctx: RenderCtx, width: number): number {
  const normalized = ensureContainerSlots(block)
  const props = normalized.props as PdfBlockProps
  const padding = pxToMm(props?.padding ?? 10)
  const gap = pxToMm(props?.gap ?? 8)
  const cols = props?.columns || 2
  const titleOffset = props?.showTitle && props.title ? 6 + padding : padding * 0.5
  const innerWidth = width - padding * 2
  const colW = (innerWidth - gap * (cols - 1)) / cols
  let maxColH = 0

  normalized.columnSlots?.forEach((slot) => {
    let colH = 0
    slot.blocks.forEach((child) => {
      colH += estimateBlockHeightMm(child, ctx, colW) + gap * 0.25
    })
    maxColH = Math.max(maxColH, colH)
  })

  return titleOffset + maxColH + padding
}

function drawContainerDecoration(
  ctx: RenderCtx,
  x: number,
  y: number,
  width: number,
  height: number,
  styles: ReturnType<typeof resolveContainerStyles>,
  mode: "fill" | "stroke"
): void {
  const radius = pxToMm(styles.borderRadius)
  if (mode === "fill" && styles.backgroundEnabled) {
    const [r, g, b] = hexToRgbSafe(styles.backgroundColor)
    ctx.doc.setFillColor(r, g, b)
    ctx.doc.roundedRect(x, y, width, height, radius, radius, "F")
    return
  }
  if (mode === "stroke" && styles.borderEnabled && styles.borderWidth > 0) {
    const [r, g, b] = hexToRgbSafe(styles.borderColor)
    ctx.doc.setDrawColor(r, g, b)
    ctx.doc.setLineWidth(pxToMm(styles.borderWidth))
    applyPdfBorderDash(ctx.doc, styles.borderStyle)
    ctx.doc.roundedRect(x, y, width, height, radius, radius, "S")
    ctx.doc.setLineDashPattern([], 0)
  }
}

async function renderContainer(ctx: RenderCtx, block: PdfBlock, width: number, x: number): Promise<void> {
  const normalized = ensureContainerSlots(block)
  const props = normalized.props as PdfBlockProps
  const styles = resolveContainerStyles(props)
  const cols = props?.columns || 2
  const gap = pxToMm(props?.gap ?? 8)
  const padding = pxToMm(props?.padding ?? 10)
  const startY = ctx.y
  const estimatedHeight = estimateContainerHeightMm(normalized, ctx, width)

  if (styles.backgroundEnabled) {
    drawContainerDecoration(ctx, x, startY, width, estimatedHeight, styles, "fill")
  }

  if (props?.showTitle && props.title) {
    ctx.doc.setFontSize(9)
    setFontStyle(ctx.doc, ctx.template.fontFamily, true)
    ctx.doc.setTextColor(80, 80, 80)
    ctx.doc.text(props.title, x + padding, ctx.y + padding)
    ctx.doc.setTextColor(0, 0, 0)
    ctx.y += 6 + padding
  } else {
    ctx.y += padding * 0.5
  }

  const innerWidth = width - padding * 2
  const colW = (innerWidth - gap * (cols - 1)) / cols
  const colYs: number[] = []

  for (let i = 0; i < cols; i++) {
    const colX = x + padding + i * (colW + gap)
    ctx.y = startY + (props?.showTitle && props.title ? 6 + padding : padding * 0.5)
    const slot = normalized.columnSlots?.[i]
    if (slot) {
      for (const child of slot.blocks) {
        await renderBlock(ctx, child, colW, colX)
        ctx.y += gap * 0.25
      }
    }
    colYs.push(ctx.y)
  }

  ctx.y = Math.max(...colYs, startY) + padding
  const actualHeight = ctx.y - startY

  if (styles.backgroundEnabled && actualHeight > estimatedHeight) {
    const [r, g, b] = hexToRgbSafe(styles.backgroundColor)
    ctx.doc.setFillColor(r, g, b)
    ctx.doc.rect(x, startY + estimatedHeight, width, actualHeight - estimatedHeight, "F")
  }

  if (styles.borderEnabled && styles.borderWidth > 0) {
    drawContainerDecoration(ctx, x, startY, width, actualHeight, styles, "stroke")
  }
}

export async function generatePdfFromTemplate(
  template: InvoicePdfTemplate,
  invoiceData: Record<string, unknown>
): Promise<jsPDF> {
  const data = mapInvoiceDataToPdfContext(invoiceData)
  const pageW = template.pageSize === "letter" ? 216 : 210
  const pageH = template.pageSize === "letter" ? 279 : 297
  const doc = new jsPDF("p", "mm", template.pageSize)
  const margin = template.margin
  const contentWidth = pageW - margin * 2

  let logoBase64: string | null = null
  if (template.showLogo && data.company.logo) {
    logoBase64 = await optimizeLogo(data.company.logo)
  }

  const ctx: RenderCtx = {
    doc,
    data,
    template,
    margin,
    contentWidth,
    y: margin,
    pageHeight: pageH,
    logoBase64,
  }

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageW, pageH, "F")

  for (const block of normalizeBlockTree(template.blocks)) {
    await renderBlock(ctx, block, contentWidth, margin)
  }

  return doc
}
