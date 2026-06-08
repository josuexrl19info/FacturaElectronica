"use client"

import type { InvoicePdfTemplate, PdfBlock, PdfMockInvoiceData } from "@/lib/pdf-builder/types"
import { isContainerBlock } from "@/lib/pdf-builder/types"
import { formatMockCurrency } from "@/lib/pdf-builder/mock-invoice-data"
import { buildCompanyNameLines, buildDocumentMetaEntries, buildPartyLines } from "@/lib/pdf-builder/block-render-helpers"
import { formatPdfTextValue } from "@/lib/pdf-builder/pdf-text-utils"
import { companyLogoDataUrl } from "@/lib/pdf-builder/preview-invoice-data"
import { containerBoxStyle } from "@/lib/pdf-builder/container-styles"
import { ensureContainerSlots } from "@/lib/pdf-builder/tree-utils"
import { getPaletteItem } from "@/lib/pdf-builder/block-catalog"

type PdfBlockPreviewProps = {
  block: PdfBlock
  data: PdfMockInvoiceData
  template: InvoicePdfTemplate
}

export function PdfBlockPreview({ block, data, template }: PdfBlockPreviewProps) {
  const primary = template.primaryColor
  const accent = template.accentColor
  const props = block.props

  if (isContainerBlock(block.type)) {
    return <ContainerPreview block={block} data={data} template={template} />
  }

  switch (block.type) {
    case "logo": {
      if (!template.showLogo) return null
      const w = props?.logoWidth ?? 88
      const h = props?.logoHeight ?? 56
      const logoSrc = companyLogoDataUrl(data.company.logo)
      if (logoSrc) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="Logo empresa" style={{ width: w, height: h, objectFit: "contain" }} className="max-w-full" />
        )
      }
      return (
        <div
          className="flex items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 text-[10px] text-muted-foreground"
          style={{ width: w, height: h }}
        >
          LOGO
        </div>
      )
    }
    case "document-badge": {
      const fs = props?.badgeFontSize ?? 10
      const bold = props?.bold !== false
      return (
        <div
          className={`ml-auto max-w-full rounded-lg px-3 py-2 text-white ${bold ? "font-bold" : "font-medium"}`}
          style={{ backgroundColor: primary, fontSize: fs }}
        >
          <span className="break-words">{data.documentType}</span>
        </div>
      )
    }
    case "company-name": {
      const lines = buildCompanyNameLines(data, props?.nameDisplay || "both")
      const fs = props?.nameFontSize ?? 14
      const bold = props?.nameBold !== false
      return (
        <div className="min-w-0 overflow-hidden" style={{ textAlign: "left" }}>
          {lines.primary ? (
            <p className={`break-words ${bold ? "font-bold" : "font-medium"}`} style={{ fontSize: fs }}>
              {lines.primary}
            </p>
          ) : null}
          {lines.secondary ? (
            <p className="break-words text-[10px] text-muted-foreground">{lines.secondary}</p>
          ) : null}
        </div>
      )
    }
    case "emitter-info":
      return <PartyCard title="Emisor" accent={accent} lines={buildPartyLines(data, true, props)} />
    case "receiver-info":
      return <PartyCard title="Receptor" accent={accent} lines={buildPartyLines(data, false, props)} />
    case "document-meta": {
      const entries = buildDocumentMetaEntries(data, props)
      const metaCols = props?.documentMetaColumns === 2 ? 2 : 1
      const mid = Math.ceil(entries.length / 2)
      const columns =
        metaCols === 2 ? [entries.slice(0, mid), entries.slice(mid)] : [entries]

      return (
        <div className="min-w-0 overflow-hidden rounded-lg border border-border/60 p-2 text-[9px]">
          <p className="mb-1 font-semibold" style={{ color: accent }}>
            Información del documento
          </p>
          <div className={metaCols === 2 ? "grid min-w-0 grid-cols-2 gap-3" : "min-w-0"}>
            {columns.map((colEntries, colIndex) => (
              <div key={colIndex} className="min-w-0 space-y-1">
                {colEntries.map((entry) => (
                  <div key={entry.key} className="min-w-0">
                    <p className="font-semibold text-muted-foreground">{entry.label}:</p>
                    <p className="break-words font-medium">{entry.value}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )
    }
    case "line-items":
      return (
        <div className="min-w-0 overflow-hidden rounded-lg border">
          <div
            className="grid gap-1 px-2 py-1.5 text-[8px] font-bold text-white"
            style={{ backgroundColor: primary, gridTemplateColumns: "20px minmax(0,1fr) 32px 48px 48px" }}
          >
            <span>#</span>
            <span className="min-w-0">Descripción</span>
            <span>Cant.</span>
            <span>P.Unit.</span>
            <span className="text-right">Total</span>
          </div>
          {data.items.map((item) => (
            <div
              key={item.line}
              className="grid gap-1 border-t px-2 py-1 text-[8px]"
              style={{
                backgroundColor: item.line % 2 === 0 ? "rgba(0,0,0,0.02)" : "transparent",
                gridTemplateColumns: "20px minmax(0,1fr) 32px 48px 48px",
              }}
            >
              <span>{item.line}</span>
              <span className="min-w-0 break-words">{item.description}</span>
              <span>{item.qty}</span>
              <span className="break-words">{formatMockCurrency(item.unitPrice).replace("₡", "")}</span>
              <span className="break-words text-right font-medium">
                {formatMockCurrency(item.subtotal).replace("₡", "")}
              </span>
            </div>
          ))}
        </div>
      )
    case "totals":
      return (
        <div className="min-w-0 overflow-hidden rounded-lg border p-2 text-[9px]">
          {[
            ["Subtotal", data.subtotal],
            ["Descuento", data.totalDiscount],
            ["IVA", data.totalTax],
          ].map(([label, val]) => (
            <div key={String(label)} className="flex justify-between py-0.5">
              <span className="text-muted-foreground">{label}</span>
              <span>{formatMockCurrency(Number(val))}</span>
            </div>
          ))}
          <div className="mt-1 flex justify-between rounded-md px-2 py-1.5 font-bold text-white" style={{ backgroundColor: primary }}>
            <span>TOTAL</span>
            <span>{formatMockCurrency(data.total)}</span>
          </div>
        </div>
      )
    case "notes":
      return data.notes ? (
        <div className="min-w-0 overflow-hidden rounded-lg border p-2 text-[9px]">
          <p className="mb-1 font-semibold" style={{ color: accent }}>
            Notas
          </p>
          <p className="break-words text-muted-foreground">{data.notes}</p>
        </div>
      ) : null
    case "legal-text":
      return (
        <p
          className="min-w-0 break-words leading-relaxed text-muted-foreground"
          style={{ fontSize: props?.fontSize ?? 7, fontWeight: props?.bold ? "bold" : "normal" }}
        >
          {props?.text || data.legalText}
        </p>
      )
    case "custom-text":
      return (
        <p
          className="min-w-0 break-words"
          style={{
            fontSize: props?.fontSize ?? 10,
            fontWeight: props?.bold ? "bold" : "normal",
            textAlign: props?.align || "left",
            color: props?.color,
          }}
        >
          {formatPdfTextValue(props?.text || "Texto personalizado")}
        </p>
      )
    case "custom-image": {
      const w = props?.imageWidth ?? 120
      const h = props?.imageHeight ?? 48
      return props?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.imageUrl} alt="" style={{ width: w, height: h, objectFit: "contain" }} className="rounded max-w-full" />
      ) : (
        <div
          className="flex items-center justify-center rounded border border-dashed text-[9px] text-muted-foreground"
          style={{ width: w, height: h }}
        >
          Imagen personalizada
        </div>
      )
    }
    case "divider":
      return <hr className="border-t-2" style={{ borderColor: accent }} />
    case "spacer":
      return <div style={{ height: props?.height || 8 }} />
    default:
      return (
        <div className="rounded border p-2 text-[9px] text-muted-foreground">
          {getPaletteItem(block.type)?.label || block.type}
        </div>
      )
  }
}

function ContainerPreview({
  block,
  data,
  template,
}: {
  block: PdfBlock
  data: PdfMockInvoiceData
  template: InvoicePdfTemplate
}) {
  const normalized = ensureContainerSlots(block)
  const props = normalized.props
  const cols = props?.columns || 2
  const gap = props?.gap ?? 8
  const padding = props?.padding ?? 10
  const gridClass = cols === 3 ? "grid-cols-3" : cols === 1 ? "grid-cols-1" : "grid-cols-2"

  return (
    <div
      style={{
        ...containerBoxStyle(props),
        gap,
        padding,
      }}
    >
      {props?.showTitle && props.title ? (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-violet-700">{props.title}</p>
      ) : null}
      <div className={`grid ${gridClass} min-w-0`} style={{ gap }}>
        {normalized.columnSlots!.map((slot) => (
          <div key={slot.id} className="min-w-0 space-y-2 overflow-hidden">
            {slot.blocks.map((child) => (
              <PdfBlockPreview key={child.id} block={child} data={data} template={template} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function PartyCard({ title, accent, lines }: { title: string; accent: string; lines: string[] }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border/60 p-2 text-[9px]">
      <p className="mb-1 rounded px-1.5 py-0.5 text-[8px] font-bold text-white" style={{ backgroundColor: accent }}>
        {title}
      </p>
      {lines.map((line, i) => (
        <p key={`${line}-${i}`} className="break-words text-muted-foreground">
          {formatPdfTextValue(line)}
        </p>
      ))}
    </div>
  )
}
