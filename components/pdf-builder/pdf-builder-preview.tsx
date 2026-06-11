"use client"

import type { InvoicePdfTemplate, PdfMockInvoiceData } from "@/lib/pdf-builder/types"
import { PdfBlockPreview } from "@/components/pdf-builder/pdf-block-preview"
import { PDF_PREVIEW_LAYOUT } from "@/lib/pdf-builder/pdf-layout"

type PdfBuilderPreviewProps = {
  template: InvoicePdfTemplate
  data: PdfMockInvoiceData
  companyName?: string
}

export function PdfBuilderPreview({ template, data, companyName }: PdfBuilderPreviewProps) {
  const pageLabel = template.pageSize === "letter" ? "Carta" : "A4"
  const aspectRatio = template.pageSize === "letter" ? "216/279" : "210/297"

  return (
    <div className="sticky top-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Vista previa en vivo</h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{pageLabel}</span>
      </div>
      {companyName ? (
        <p className="mb-2 truncate text-[10px] text-muted-foreground">
          Emisor: <span className="font-medium text-foreground">{companyName}</span> · Receptor demo
        </p>
      ) : null}
      <div
        className="mx-auto overflow-hidden rounded-xl border bg-white shadow-xl"
        style={{ width: "100%", maxWidth: 420, aspectRatio }}
      >
        <div className="h-full overflow-y-auto p-4 text-foreground" style={{ fontSize: "10px" }}>
          <div className="flex flex-col" style={{ gap: PDF_PREVIEW_LAYOUT.blockGapPx }}>
            {template.blocks.map((block) => (
              <PdfBlockPreview key={block.id} block={block} data={data} template={template} />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        Datos del emisor de tu empresa · Líneas y receptor de demostración
      </p>
    </div>
  )
}
