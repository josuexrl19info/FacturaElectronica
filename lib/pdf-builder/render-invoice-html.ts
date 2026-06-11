import { containerBoxStyle } from "@/lib/pdf-builder/container-styles"
import {
  buildCompanyNameLines,
  buildDocumentMetaEntries,
  buildPartyLines,
  resolveLogoDimensions,
} from "@/lib/pdf-builder/block-render-helpers"
import {
  formatPdfCurrency,
  formatPdfCurrencyPlain,
  formatNotesDisplayText,
  PDF_PREVIEW_LAYOUT,
  resolveContainerColumnGap,
  resolvePdfCurrencyCode,
} from "@/lib/pdf-builder/pdf-layout"
import { formatPdfTextValue } from "@/lib/pdf-builder/pdf-text-utils"
import { companyLogoDataUrl } from "@/lib/pdf-builder/preview-invoice-data"
import { mapInvoiceDataToPdfContext } from "@/lib/pdf-builder/map-invoice-pdf-context"
import { ensureContainerSlots, normalizeBlockTree } from "@/lib/pdf-builder/tree-utils"
import type { CSSProperties } from "react"
import type { InvoicePdfTemplate, PdfBlock, PdfMockInvoiceData } from "@/lib/pdf-builder/types"
import { isContainerBlock } from "@/lib/pdf-builder/types"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

const CSS_PX_NUMERIC_PROPS = new Set([
  "gap",
  "rowGap",
  "columnGap",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "top",
  "left",
  "right",
  "bottom",
  "fontSize",
  "borderRadius",
  "borderWidth",
  "letterSpacing",
  "wordSpacing",
])

function css(style: CSSProperties): string {
  return Object.entries(style)
    .filter(([, v]) => v != null && v !== false && v !== undefined)
    .map(([key, value]) => {
      const prop = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
      const formatted =
        typeof value === "number" && CSS_PX_NUMERIC_PROPS.has(key) ? `${value}px` : value
      return `${prop}:${formatted}`
    })
    .join(";")
}

function renderPartyCard(title: string, accent: string, lines: string[]): string {
  const pad = PDF_PREVIEW_LAYOUT.cardPaddingPx
  const body = lines
    .map(
      (line) =>
        `<p style="${css({ margin: "2px 0", wordBreak: "break-word", color: "#64748b" })}">${escapeHtml(formatPdfTextValue(line))}</p>`
    )
    .join("")
  return `<div style="${css({
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: "8px",
    padding: `${pad}px`,
    fontSize: "9px",
    minWidth: 0,
    overflow: "hidden",
  })}">
    <p style="${css({
      display: "inline-block",
      margin: "0 0 4px",
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "8px",
      fontWeight: 700,
      color: "#fff",
      backgroundColor: accent,
    })}">${escapeHtml(title)}</p>
    ${body}
  </div>`
}

function renderBlockHtml(block: PdfBlock, data: PdfMockInvoiceData, template: InvoicePdfTemplate): string {
  const L = PDF_PREVIEW_LAYOUT
  const primary = template.primaryColor
  const accent = template.accentColor
  const props = block.props
  const currency = resolvePdfCurrencyCode(data.moneda, "CRC")

  if (isContainerBlock(block.type)) {
    const normalized = ensureContainerSlots(block)
    const cProps = normalized.props
    const cols = cProps?.columns || 2
    const columnGap = resolveContainerColumnGap(cProps?.gap)
    const padding = cProps?.padding ?? 10
    const gridCols = cols === 3 ? "1fr 1fr 1fr" : cols === 1 ? "1fr" : "1fr 1fr"
    const titleHtml =
      cProps?.showTitle && cProps.title
        ? `<p style="${css({
            margin: `0 0 ${L.containerTitleMbPx}px`,
            fontSize: "10px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#6d28d9",
          })}">${escapeHtml(cProps.title)}</p>`
        : ""

    const columnsHtml = normalized
      .columnSlots!.map(
        (slot) =>
          `<div style="${css({ minWidth: 0, display: "flex", flexDirection: "column", gap: `${L.columnChildGapPx}px` })}">${slot.blocks
            .map((child) => renderBlockHtml(child, data, template))
            .join("")}</div>`
      )
      .join("")

    return `<div style="${css({
      ...containerBoxStyle(cProps),
      padding,
      minWidth: 0,
    })}">${titleHtml}<div style="${css({
      display: "grid",
      gridTemplateColumns: gridCols,
      columnGap,
      rowGap: 0,
      minWidth: 0,
    })}">${columnsHtml}</div></div>`
  }

  switch (block.type) {
    case "logo": {
      if (!template.showLogo) return ""
      const { widthPx: w, heightPx: h } = resolveLogoDimensions(props, template)
      const logoSrc = companyLogoDataUrl(data.company.logo)
      if (logoSrc) {
        return `<img src="${logoSrc}" alt="Logo" style="${css({
          width: `${w}px`,
          height: `${h}px`,
          objectFit: "contain",
          maxWidth: "100%",
          display: "block",
        })}" />`
      }
      return `<div style="${css({
        width: `${w}px`,
        height: `${h}px`,
        border: "1px dashed rgba(0,0,0,0.25)",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
        color: "#64748b",
        backgroundColor: "rgba(0,0,0,0.04)",
      })}">LOGO</div>`
    }
    case "document-badge": {
      const fs = props?.badgeFontSize ?? 10
      const bold = props?.bold !== false
      return `<div style="${css({
        marginLeft: "auto",
        maxWidth: "100%",
        borderRadius: "8px",
        padding: `${L.badgePaddingY}px ${L.badgePaddingX}px`,
        color: "#fff",
        backgroundColor: primary,
        fontSize: `${fs}px`,
        fontWeight: bold ? 700 : 500,
        wordBreak: "break-word",
        width: "fit-content",
      })}">${escapeHtml(data.documentType)}</div>`
    }
    case "company-name": {
      const lines = buildCompanyNameLines(data, props?.nameDisplay || "both")
      const fs = props?.nameFontSize ?? 14
      const bold = props?.nameBold !== false
      return `<div style="${css({ minWidth: 0, overflow: "hidden" })}">
        ${
          lines.primary
            ? `<p style="${css({
                margin: "0 0 2px",
                fontSize: `${fs}px`,
                fontWeight: bold ? 700 : 500,
                wordBreak: "break-word",
              })}">${escapeHtml(lines.primary)}</p>`
            : ""
        }
        ${
          lines.secondary
            ? `<p style="${css({ margin: 0, fontSize: "10px", color: "#64748b", wordBreak: "break-word" })}">${escapeHtml(lines.secondary)}</p>`
            : ""
        }
      </div>`
    }
    case "emitter-info":
      return renderPartyCard("Emisor", accent, buildPartyLines(data, true, props))
    case "receiver-info":
      return renderPartyCard("Receptor", accent, buildPartyLines(data, false, props))
    case "document-meta": {
      const entries = buildDocumentMetaEntries(data, props)
      const metaCols = props?.documentMetaColumns === 2 ? 2 : 1
      const mid = Math.ceil(entries.length / 2)
      const columns = metaCols === 2 ? [entries.slice(0, mid), entries.slice(mid)] : [entries]
      const colsHtml = columns
        .map(
          (col) =>
            `<div style="${css({ minWidth: 0 })}">${col
              .map(
                (entry) =>
                  `<div style="${css({ marginBottom: `${L.metaEntryGapPx}px`, minWidth: 0 })}">
                    <p style="${css({ margin: 0, fontWeight: 600, color: "#64748b" })}">${escapeHtml(entry.label)}:</p>
                    <p style="${css({ margin: 0, fontWeight: 500, wordBreak: "break-word" })}">${escapeHtml(entry.value)}</p>
                  </div>`
              )
              .join("")}</div>`
        )
        .join("")
      return `<div style="${css({
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: "8px",
        padding: `${L.cardPaddingPx}px`,
        fontSize: "9px",
        minWidth: 0,
      })}">
        <p style="${css({ margin: `0 0 ${L.metaEntryGapPx}px`, fontWeight: 600, color: accent })}">Información del documento</p>
        <div style="${css({
          display: "grid",
          gridTemplateColumns: metaCols === 2 ? "1fr 1fr" : "1fr",
          gap: `${L.metaColumnGapPx}px`,
          minWidth: 0,
        })}">${colsHtml}</div>
      </div>`
    }
    case "line-items": {
      const header = `<div style="${css({
        display: "grid",
        gridTemplateColumns: "20px minmax(0,1fr) 32px 48px 48px",
        gap: "4px",
        padding: `${L.tableHeaderPaddingY}px ${L.tableHeaderPaddingX}px`,
        fontSize: "8px",
        fontWeight: 700,
        color: "#fff",
        backgroundColor: primary,
      })}">
        <span>#</span><span>Descripción</span><span>Cant.</span><span>P.Unit.</span><span style="text-align:right">Total</span>
      </div>`
      const rows = data.items
        .map(
          (item) =>
            `<div style="${css({
              display: "grid",
              gridTemplateColumns: "20px minmax(0,1fr) 32px 48px 48px",
              gap: "4px",
              padding: `${L.tableRowPaddingY}px ${L.tableRowPaddingX}px`,
              fontSize: "8px",
              borderTop: "1px solid rgba(0,0,0,0.08)",
              backgroundColor: item.line % 2 === 0 ? "rgba(0,0,0,0.02)" : "transparent",
            })}">
              <span>${item.line}</span>
              <span style="${css({ wordBreak: "break-word", minWidth: 0 })}">${escapeHtml(item.description)}</span>
              <span>${item.qty}</span>
              <span style="${css({ wordBreak: "break-word" })}">${escapeHtml(formatPdfCurrencyPlain(item.unitPrice, currency))}</span>
              <span style="${css({ textAlign: "right", fontWeight: 500, wordBreak: "break-word" })}">${escapeHtml(formatPdfCurrencyPlain(item.subtotal, currency))}</span>
            </div>`
        )
        .join("")
      return `<div style="${css({ border: "1px solid rgba(0,0,0,0.12)", borderRadius: "8px", overflow: "hidden", minWidth: 0 })}">${header}${rows}</div>`
    }
    case "totals": {
      const rows = [
        ["Subtotal", formatPdfCurrency(data.subtotal, currency)],
        ["Descuento", formatPdfCurrency(data.totalDiscount, currency)],
        ["IVA", formatPdfCurrency(data.totalTax, currency)],
      ]
        .map(
          ([label, val]) =>
            `<div style="${css({ display: "flex", justifyContent: "space-between", padding: `${L.totalsRowPaddingY}px 0`, fontSize: "9px" })}">
              <span style="color:#64748b">${escapeHtml(String(label))}</span>
              <span>${escapeHtml(String(val))}</span>
            </div>`
        )
        .join("")
      return `<div style="${css({
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: "8px",
        padding: `${L.cardPaddingPx}px`,
        minWidth: 0,
      })}">
        ${rows}
        <div style="${css({
          display: "flex",
          justifyContent: "space-between",
          marginTop: `${L.totalsBoxMarginTop}px`,
          padding: `${L.totalsBoxPaddingY}px ${L.totalsBoxPaddingX}px`,
          borderRadius: "6px",
          fontWeight: 700,
          color: "#fff",
          backgroundColor: primary,
          fontSize: "9px",
        })}">
          <span>TOTAL</span>
          <span>${escapeHtml(formatPdfCurrency(data.total, currency))}</span>
        </div>
      </div>`
    }
    case "notes": {
      const notesText = formatNotesDisplayText(data.notes)
      return `<div style="${css({
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: "8px",
        padding: `${L.cardPaddingPx}px`,
        fontSize: "9px",
        minWidth: 0,
      })}">
        <p style="${css({ margin: `0 0 ${L.notesTitleMbPx}px`, fontWeight: 600, color: accent })}">Notas</p>
        <p style="${css({
          margin: 0,
          color: "#64748b",
          wordBreak: "break-word",
          minHeight: notesText ? undefined : `${L.notesEmptyMinHeightPx}px`,
        })}">${notesText ? escapeHtml(notesText) : "&nbsp;"}</p>
      </div>`
    }
    case "legal-text":
      return `<p style="${css({
        margin: 0,
        fontSize: `${props?.fontSize ?? 7}px`,
        fontWeight: props?.bold ? 700 : 400,
        lineHeight: 1.6,
        color: "#64748b",
        wordBreak: "break-word",
      })}">${escapeHtml(props?.text || data.legalText)}</p>`
    case "custom-text":
      return `<p style="${css({
        margin: 0,
        fontSize: `${props?.fontSize ?? 10}px`,
        fontWeight: props?.bold ? 700 : 400,
        textAlign: props?.align || "left",
        color: props?.color,
        wordBreak: "break-word",
      })}">${escapeHtml(formatPdfTextValue(props?.text || "Texto personalizado"))}</p>`
    case "custom-image": {
      const w = props?.imageWidth ?? 120
      const h = props?.imageHeight ?? 48
      if (props?.imageUrl) {
        return `<img src="${escapeHtml(props.imageUrl)}" alt="" style="${css({
          width: `${w}px`,
          height: `${h}px`,
          objectFit: "contain",
          maxWidth: "100%",
          borderRadius: "4px",
        })}" />`
      }
      return `<div style="${css({
        width: `${w}px`,
        height: `${h}px`,
        border: "1px dashed rgba(0,0,0,0.25)",
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "9px",
        color: "#64748b",
      })}">Imagen personalizada</div>`
    }
    case "divider":
      return `<hr style="${css({ border: "none", borderTop: `2px solid ${accent}`, margin: "4px 0" })}" />`
    case "spacer":
      return `<div style="${css({ height: `${props?.height || 8}px` })}"></div>`
    default:
      return ""
  }
}

export function buildInvoiceHtmlDocument(
  template: InvoicePdfTemplate,
  invoiceData: Record<string, unknown>
): string {
  const data = mapInvoiceDataToPdfContext(invoiceData)
  const blocksHtml = normalizeBlockTree(template.blocks)
    .map((block) => renderBlockHtml(block, data, template))
    .join("")

  const pageSize = template.pageSize === "letter" ? "letter" : "A4"
  const font =
    template.fontFamily === "times"
      ? "Times New Roman, Times, serif"
      : template.fontFamily === "courier"
        ? "Courier New, Courier, monospace"
        : "Helvetica, Arial, sans-serif"

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${pageSize}; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: ${template.margin}mm;
      color: #0f172a;
      font-family: ${font};
      font-size: 10px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-root {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: ${PDF_PREVIEW_LAYOUT.blockGapPx}px;
    }
  </style>
</head>
<body>
  <div class="invoice-root">${blocksHtml}</div>
</body>
</html>`
}
