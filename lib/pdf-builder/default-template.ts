import { DEFAULT_COMPANY_THEME } from "@/lib/theme/company-theme.presets"
import { createBlockId, createBlockFromType } from "@/lib/pdf-builder/block-catalog"
import type { InvoicePdfTemplate, PdfBlock } from "@/lib/pdf-builder/types"

function containerWithBlocks(columns: 1 | 2 | 3, ...columnContents: PdfBlock[][]): PdfBlock {
  const block = createBlockFromType("container")
  block.props = { ...block.props, columns }
  block.columnSlots = block.columnSlots!.map((slot, i) => ({
    ...slot,
    blocks: columnContents[i] || [],
  }))
  return block
}

export const DEFAULT_INVOICE_PDF_TEMPLATE: InvoicePdfTemplate = {
  version: 2,
  pageSize: "a4",
  margin: 12,
  primaryColor: DEFAULT_COMPANY_THEME.primaryColor,
  accentColor: DEFAULT_COMPANY_THEME.accentColor,
  fontFamily: "helvetica",
  showLogo: true,
  logoWidth: 88,
  logoHeight: 56,
  blocks: [
    containerWithBlocks(2, [{ id: createBlockId("logo"), type: "logo", props: { logoWidth: 88, logoHeight: 56 } }], [
      { id: createBlockId("document-badge"), type: "document-badge" },
    ]),
    { id: createBlockId("company-name"), type: "company-name" },
    containerWithBlocks(
      2,
      [{ id: createBlockId("emitter-info"), type: "emitter-info" }],
      [{ id: createBlockId("receiver-info"), type: "receiver-info" }]
    ),
    { id: createBlockId("document-meta"), type: "document-meta" },
    { id: createBlockId("line-items"), type: "line-items" },
    containerWithBlocks(2, [{ id: createBlockId("notes"), type: "notes" }], [{ id: createBlockId("totals"), type: "totals" }]),
    { id: createBlockId("divider"), type: "divider" },
    { id: createBlockId("legal-text"), type: "legal-text" },
  ],
}
