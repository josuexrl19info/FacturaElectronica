import jsPDF from "jspdf"
import sharp from "sharp"
import type { InvoicePdfTemplate, PdfBlock, PdfBlockProps, PdfMockInvoiceData } from "@/lib/pdf-builder/types"
import { isContainerBlock } from "@/lib/pdf-builder/types"
import { buildCompanyNameLines, buildDocumentMetaEntries, buildPartyLines, findMaxLogoDimensionsInTemplate, pxToMm, resolveLogoDrawSizeMm } from "@/lib/pdf-builder/block-render-helpers"
import { hexToRgbSafe, resolveContainerStyles } from "@/lib/pdf-builder/container-styles"
import {
  formatPdfCurrency,
  formatPdfCurrencyPlain,
  formatNotesDisplayText,
  getLineItemsColumnWidthsMm,
  PDF_CARD,
  PDF_PREVIEW_LAYOUT,
  resolveContainerColumnGap,
  resolvePdfCurrencyCode,
} from "@/lib/pdf-builder/pdf-layout"
import { extractLogoData, mapInvoiceDataToPdfContext } from "@/lib/pdf-builder/map-invoice-pdf-context"
import { formatPdfTextValue } from "@/lib/pdf-builder/pdf-text-utils"
import { ensureContainerSlots, normalizeBlockTree } from "@/lib/pdf-builder/tree-utils"

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return [r, g, b]
}

function getCurrencyCode(ctx: RenderCtx): string {
  return resolvePdfCurrencyCode(ctx.data.moneda, "CRC")
}

async function optimizeLogo(
  logoData: string,
  targetWidthPx?: number,
  targetHeightPx?: number
): Promise<string | null> {
  try {
    const maxW = targetWidthPx ? Math.min(800, Math.max(64, Math.round(targetWidthPx * 2))) : 400
    const maxH = targetHeightPx ? Math.min(800, Math.max(64, Math.round(targetHeightPx * 2))) : 400
    const buffer = Buffer.from(logoData.replace(/^data:image\/\w+;base64,/, ""), "base64")
    const optimized = await sharp(buffer)
      .resize(maxW, maxH, { fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 6 })
      .toBuffer()
    return optimized.toString("base64")
  } catch {
    return null
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

function drawCardBorder(ctx: RenderCtx, x: number, y: number, w: number, h: number): void {
  const [br, bg, bb] = PDF_CARD.borderRgb
  ctx.doc.setDrawColor(br, bg, bb)
  ctx.doc.setLineWidth(0.25)
  ctx.doc.roundedRect(x, y, w, h, PDF_CARD.radiusMm, PDF_CARD.radiusMm, "S")
}

function drawAccentBadge(ctx: RenderCtx, title: string, x: number, y: number): { w: number; h: number } {
  const [ar, ag, ab] = hexToRgb(ctx.template.accentColor)
  ctx.doc.setFillColor(ar, ag, ab)
  ctx.doc.setFontSize(6)
  setFontStyle(ctx.doc, ctx.template.fontFamily, true)
  const badgeW = ctx.doc.getTextWidth(title) + pxToMm(6)
  const badgeH = pxToMm(14)
  ctx.doc.roundedRect(x, y, badgeW, badgeH, 1, 1, "F")
  ctx.doc.setTextColor(255, 255, 255)
  ctx.doc.text(title, x + pxToMm(3), y + badgeH * 0.72)
  ctx.doc.setTextColor(0, 0, 0)
  return { w: badgeW, h: badgeH }
}

function drawAccentInlineTitle(ctx: RenderCtx, title: string, x: number): void {
  const [ar, ag, ab] = hexToRgb(ctx.template.accentColor)
  ctx.doc.setTextColor(ar, ag, ab)
  ctx.doc.setFontSize(PDF_CARD.titleFontPt)
  setFontStyle(ctx.doc, ctx.template.fontFamily, true)
  ctx.doc.text(title, x, ctx.y)
  ctx.doc.setTextColor(0, 0, 0)
  ctx.y += PDF_CARD.lineHeightMm + 1
}

function drawPartyCard(ctx: RenderCtx, title: string, lines: string[], x: number, width: number): void {
  const pad = PDF_CARD.paddingMm
  const startY = ctx.y
  ctx.y += pad
  const innerX = x + pad
  const innerW = Math.max(4, width - pad * 2)
  const badge = drawAccentBadge(ctx, title, innerX, ctx.y)
  ctx.y += badge.h + pxToMm(4)
  ctx.doc.setTextColor(...PDF_CARD.mutedRgb)
  for (const line of lines) {
    writeWrappedText(ctx, line, innerX, innerW, PDF_CARD.bodyFontPt, PDF_CARD.bodyLineHeightMm)
  }
  ctx.doc.setTextColor(0, 0, 0)
  ctx.y += pad
  drawCardBorder(ctx, x, startY, width, ctx.y - startY)
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
      const { drawW, drawH } = resolveLogoDrawSizeMm(props, ctx.template, width)
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
      const fs = props?.badgeFontSize || 10
      ctx.doc.setFontSize(fs)
      setFontStyle(ctx.doc, ctx.template.fontFamily, props?.bold !== false)
      const maxBadgeW = width
      const badgeLines = splitTextLines(ctx.doc, ctx.data.documentType, maxBadgeW - pxToMm(12))
      const lineWidths = badgeLines.map((line) => ctx.doc.getTextWidth(line))
      const badgeW = Math.min(maxBadgeW, Math.max(...lineWidths, 20) + pxToMm(12))
      const badgeX = x + Math.max(0, width - badgeW)
      const badgeH = Math.max(pxToMm(28), badgeLines.length * pxToMm(10) + pxToMm(8))
      ctx.doc.roundedRect(badgeX, ctx.y, badgeW, badgeH, 2, 2, "F")
      ctx.doc.setTextColor(255, 255, 255)
      badgeLines.forEach((line, idx) => {
        ctx.doc.text(line, badgeX + pxToMm(6), ctx.y + pxToMm(10) + idx * pxToMm(10), { maxWidth: badgeW - pxToMm(12) })
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
        writeWrappedText(ctx, lines.primary, x, innerW, fs, 4.5, { bold: props?.nameBold !== false })
      }
      if (lines.secondary) {
        ctx.doc.setTextColor(...PDF_CARD.mutedRgb)
        writeWrappedText(ctx, lines.secondary, x, innerW, Math.max(8, fs * 0.65), 4, { bold: false })
        ctx.doc.setTextColor(0, 0, 0)
      }
      ctx.y += 2
      break
    }
    case "emitter-info":
    case "receiver-info": {
      const isEmitter = block.type === "emitter-info"
      const title = isEmitter ? "Emisor" : "Receptor"
      drawPartyCard(ctx, title, buildPartyLines(ctx.data, isEmitter, props), x, width)
      ctx.y += 4
      break
    }
    case "document-meta": {
      const pad = PDF_CARD.paddingMm
      const startY = ctx.y
      ctx.y += pad
      const innerX = x + pad
      const innerW = Math.max(4, width - pad * 2)
      drawAccentInlineTitle(ctx, "Información del documento", innerX)
      const entries = buildDocumentMetaEntries(ctx.data, props)
      const metaCols = props?.documentMetaColumns === 2 ? 2 : 1
      const gap = pxToMm(12)
      const colW = metaCols === 2 ? (innerW - gap) / 2 : innerW
      const columns: typeof entries[] =
        metaCols === 2
          ? [entries.slice(0, Math.ceil(entries.length / 2)), entries.slice(Math.ceil(entries.length / 2))]
          : [entries]

      let maxY = ctx.y
      columns.forEach((colEntries, colIndex) => {
        const colX = innerX + colIndex * (colW + gap)
        const colInnerW = Math.max(4, colW - 2)
        let colY = ctx.y
        ctx.y = colY
        for (const entry of colEntries) {
          writeWrappedText(ctx, `${entry.label}:`, colX, colInnerW, PDF_CARD.labelFontPt, PDF_CARD.lineHeightMm, {
            bold: true,
          })
          ctx.doc.setTextColor(0, 0, 0)
          writeWrappedText(ctx, entry.value, colX, colInnerW, PDF_CARD.bodyFontPt, PDF_CARD.bodyLineHeightMm, {
            bold: true,
          })
          ctx.y += 1
        }
        maxY = Math.max(maxY, ctx.y)
      })
      ctx.y = maxY + pad
      drawCardBorder(ctx, x, startY, width, ctx.y - startY)
      ctx.y += 2
      break
    }
    case "line-items": {
      ensureSpace(ctx, 40)
      const startY = ctx.y
      const currency = getCurrencyCode(ctx)
      const [hr, hg, hb] = hexToRgb(ctx.template.primaryColor)
      const cols = getLineItemsColumnWidthsMm(width)
      const colX = [
        x + 1,
        x + cols.num + 1,
        x + cols.num + cols.desc + 2,
        x + cols.num + cols.desc + cols.qty + 3,
        x + width - cols.total,
      ]

      ctx.doc.setFillColor(hr, hg, hb)
      ctx.doc.rect(x, ctx.y, width, pxToMm(18), "F")
      ctx.doc.setTextColor(255, 255, 255)
      ctx.doc.setFontSize(6)
      ctx.doc.setFont(ctx.template.fontFamily, "bold")
      ;["#", "Descripción", "Cant.", "P.Unit.", "Total"].forEach((c, i) => {
        const colWidths = [cols.num, cols.desc, cols.qty, cols.unit, cols.total]
        const align = i === 4 ? "right" : "left"
        ctx.doc.text(c, colX[i], ctx.y + pxToMm(11), { maxWidth: colWidths[i] - 1, align })
      })
      ctx.doc.setTextColor(0, 0, 0)
      ctx.y += pxToMm(20)
      ctx.doc.setFont(ctx.template.fontFamily, "normal")
      ctx.doc.setFontSize(6)

      for (const item of ctx.data.items) {
        const descLines = splitTextLines(ctx.doc, item.description, cols.desc - 2)
        const rowH = Math.max(pxToMm(14), descLines.length * pxToMm(9) + pxToMm(4))
        ensureSpace(ctx, rowH)
        const rowY = ctx.y
        const bg = item.line % 2 === 0 ? 248 : 255
        ctx.doc.setFillColor(bg, bg, bg)
        ctx.doc.rect(x, rowY - pxToMm(3), width, rowH, "F")
        ctx.doc.text(String(item.line), colX[0], rowY, { maxWidth: cols.num - 1 })
        descLines.forEach((line, idx) => {
          ctx.doc.text(line, colX[1], rowY + idx * pxToMm(9), { maxWidth: cols.desc - 2 })
        })
        ctx.doc.text(String(item.qty), colX[2], rowY, { maxWidth: cols.qty - 1 })
        ctx.doc.text(formatPdfCurrencyPlain(item.unitPrice, currency), colX[3], rowY, { maxWidth: cols.unit - 1 })
        ctx.doc.text(formatPdfCurrencyPlain(item.subtotal, currency), colX[4], rowY, {
          maxWidth: cols.total - 1,
          align: "right",
        })
        ctx.y += rowH
      }
      drawCardBorder(ctx, x, startY, width, ctx.y - startY)
      ctx.y += 4
      break
    }
    case "totals": {
      const pad = PDF_CARD.paddingMm
      const startY = ctx.y
      const currency = getCurrencyCode(ctx)
      ctx.y += pad
      const innerX = x + pad
      const innerW = Math.max(4, width - pad * 2)
      const labelW = Math.max(20, innerW * 0.45)
      const valueW = Math.max(12, innerW - labelW - 4)
      ctx.doc.setFontSize(7)
      for (const [label, val] of [
        ["Subtotal", formatPdfCurrency(ctx.data.subtotal, currency)],
        ["Descuento", formatPdfCurrency(ctx.data.totalDiscount, currency)],
        ["IVA", formatPdfCurrency(ctx.data.totalTax, currency)],
      ]) {
        ctx.doc.setFont(ctx.template.fontFamily, "normal")
        ctx.doc.setTextColor(...PDF_CARD.mutedRgb)
        ctx.doc.text(label, innerX, ctx.y, { maxWidth: labelW })
        ctx.doc.setTextColor(0, 0, 0)
        ctx.doc.text(val, innerX + innerW, ctx.y, { align: "right", maxWidth: valueW })
        ctx.y += pxToMm(10)
      }
      const [pr, pg, pb] = hexToRgb(ctx.template.primaryColor)
      ctx.doc.setFillColor(pr, pg, pb)
      ctx.doc.roundedRect(innerX, ctx.y, innerW, pxToMm(22), 2, 2, "F")
      ctx.doc.setTextColor(255, 255, 255)
      ctx.doc.setFont(ctx.template.fontFamily, "bold")
      ctx.doc.text("TOTAL", innerX + pxToMm(4), ctx.y + pxToMm(14))
      ctx.doc.text(formatPdfCurrency(ctx.data.total, currency), innerX + innerW - pxToMm(4), ctx.y + pxToMm(14), {
        align: "right",
      })
      ctx.doc.setTextColor(0, 0, 0)
      ctx.y += pxToMm(24) + pad
      drawCardBorder(ctx, x, startY, width, ctx.y - startY)
      ctx.y += 4
      break
    }
    case "notes": {
      const notesText = formatNotesDisplayText(ctx.data.notes)
      const pad = PDF_CARD.paddingMm
      const startY = ctx.y
      ctx.y += pad
      const innerX = x + pad
      const innerW = Math.max(4, width - pad * 2)
      drawAccentInlineTitle(ctx, "Notas", innerX)
      if (notesText) {
        ctx.doc.setTextColor(...PDF_CARD.mutedRgb)
        writeWrappedText(ctx, notesText, innerX, innerW, PDF_CARD.bodyFontPt, PDF_CARD.bodyLineHeightMm)
        ctx.doc.setTextColor(0, 0, 0)
      } else {
        ctx.y += pxToMm(PDF_PREVIEW_LAYOUT.notesEmptyMinHeightPx)
      }
      ctx.y += pad
      drawCardBorder(ctx, x, startY, width, ctx.y - startY)
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
      if (props?.color && /^#[0-9A-Fa-f]{6}$/.test(props.color)) {
        const [cr, cg, cb] = hexToRgb(props.color)
        ctx.doc.setTextColor(cr, cg, cb)
      }
      writeWrappedText(
        ctx,
        formatPdfTextValue(props?.text || "Texto personalizado"),
        x,
        Math.max(4, width),
        props?.fontSize || 10,
        (props?.fontSize || 10) * 0.45 + 2,
        { bold: Boolean(props?.bold), align: props?.align || "left" }
      )
      ctx.doc.setTextColor(0, 0, 0)
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
      ctx.doc.setLineWidth(pxToMm(2))
      ctx.doc.line(x, ctx.y, x + width, ctx.y)
      ctx.y += pxToMm(8)
      break
    }
    case "spacer": {
      ctx.y += pxToMm(props?.height || 8)
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
      return resolveLogoDrawSizeMm(props, ctx.template, width).drawH + 4
    case "document-badge": {
      const fs = props?.badgeFontSize || 10
      doc.setFontSize(fs)
      const lines = wrappedLineCount(doc, ctx.data.documentType, width - pxToMm(12), fs)
      return Math.max(pxToMm(28), lines * pxToMm(10) + pxToMm(12)) + 4
    }
    case "company-name": {
      const lines = buildCompanyNameLines(ctx.data, props?.nameDisplay)
      const fs = props?.nameFontSize || 14
      const innerW = Math.max(4, width - 2)
      let h = 0
      if (lines.primary) h += wrappedLineCount(doc, lines.primary, innerW, fs) * 4.5
      if (lines.secondary) h += wrappedLineCount(doc, lines.secondary, innerW, Math.max(8, fs * 0.65)) * 4
      return h + 2
    }
    case "emitter-info":
    case "receiver-info": {
      const pad = PDF_CARD.paddingMm
      const innerW = Math.max(4, width - pad * 2)
      const partyLines = buildPartyLines(ctx.data, block.type === "emitter-info", props)
      const textH = partyLines.reduce(
        (sum, line) => sum + wrappedLineCount(doc, line, innerW, PDF_CARD.bodyFontPt) * PDF_CARD.bodyLineHeightMm,
        0
      )
      return pad * 2 + pxToMm(14) + pxToMm(4) + textH + 4
    }
    case "document-meta": {
      const pad = PDF_CARD.paddingMm
      const innerW = Math.max(4, width - pad * 2)
      const metaCols = props?.documentMetaColumns === 2 ? 2 : 1
      const gap = pxToMm(12)
      const colW = metaCols === 2 ? (innerW - gap) / 2 : innerW
      const colInnerW = Math.max(4, colW - 2)
      const entries = buildDocumentMetaEntries(ctx.data, props)
      const perCol = Math.ceil(entries.length / metaCols)
      let colH = PDF_CARD.lineHeightMm + 1
      for (let i = 0; i < perCol; i++) {
        const entry = entries[i]
        if (!entry) continue
        colH +=
          PDF_CARD.lineHeightMm +
          wrappedLineCount(doc, entry.value, colInnerW, PDF_CARD.bodyFontPt) * PDF_CARD.bodyLineHeightMm +
          1
      }
      return pad * 2 + colH + 2
    }
    case "line-items": {
      const cols = getLineItemsColumnWidthsMm(width)
      doc.setFontSize(6)
      const rowsH = ctx.data.items.reduce((sum, item) => {
        const lines = wrappedLineCount(doc, item.description, cols.desc - 2, 6)
        return sum + Math.max(pxToMm(14), lines * pxToMm(9) + pxToMm(4))
      }, 0)
      return pxToMm(20) + rowsH + 4
    }
    case "totals":
      return PDF_CARD.paddingMm * 2 + pxToMm(10) * 3 + pxToMm(24) + 4
    case "notes": {
      const notesText = formatNotesDisplayText(ctx.data.notes)
      const innerW = Math.max(4, width - PDF_CARD.paddingMm * 2)
      const bodyH = notesText
        ? wrappedLineCount(doc, notesText, innerW, PDF_CARD.bodyFontPt) * PDF_CARD.bodyLineHeightMm
        : pxToMm(PDF_PREVIEW_LAYOUT.notesEmptyMinHeightPx)
      return PDF_CARD.paddingMm * 2 + PDF_CARD.lineHeightMm + bodyH + 6
    }
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
      return pxToMm(props?.height || 8)
    default:
      return 8
  }
}

function estimateContainerHeightMm(block: PdfBlock, ctx: RenderCtx, width: number): number {
  const normalized = ensureContainerSlots(block)
  const props = normalized.props as PdfBlockProps
  const padding = pxToMm(props?.padding ?? 10)
  const gap = pxToMm(resolveContainerColumnGap(props?.gap))
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
  const gap = pxToMm(resolveContainerColumnGap(props?.gap))
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

export { mapInvoiceDataToPdfContext } from "@/lib/pdf-builder/map-invoice-pdf-context"

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
    const normalizedBlocks = normalizeBlockTree(template.blocks)
    const logoDims = findMaxLogoDimensionsInTemplate(template, normalizedBlocks)
    const rawLogo = extractLogoData(data.company as Record<string, unknown>)
    if (rawLogo) {
      logoBase64 = await optimizeLogo(rawLogo, logoDims.widthPx, logoDims.heightPx)
    }
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
