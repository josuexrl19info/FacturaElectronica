import { DEFAULT_INVOICE_PDF_TEMPLATE } from "@/lib/pdf-builder/default-template"
import { createBlockId } from "@/lib/pdf-builder/block-catalog"
import { DEFAULT_LOGO_HEIGHT_PX, DEFAULT_LOGO_WIDTH_PX, mergeBlockProps } from "@/lib/pdf-builder/block-defaults"
import { ensureContainerSlots, normalizeBlockTree } from "@/lib/pdf-builder/tree-utils"
import type { InvoicePdfTemplate, PdfBlock, PdfBlockType } from "@/lib/pdf-builder/types"
import { isContainerBlock } from "@/lib/pdf-builder/types"
import { sanitizeHexColor } from "@/lib/theme/company-theme.utils"

const VALID_TYPES = new Set<PdfBlockType>([
  "container",
  "logo",
  "document-badge",
  "company-name",
  "emitter-info",
  "receiver-info",
  "document-meta",
  "line-items",
  "totals",
  "notes",
  "legal-text",
  "custom-text",
  "custom-image",
  "divider",
  "spacer",
  "columns-2",
  "columns-3",
  "section",
])

function normalizeBlock(raw: Partial<PdfBlock> | undefined): PdfBlock | null {
  if (!raw?.type || !VALID_TYPES.has(raw.type)) return null

  const block: PdfBlock = {
    id: typeof raw.id === "string" && raw.id ? raw.id : createBlockId(raw.type),
    type: raw.type,
    props: mergeBlockProps(raw.type, raw.props),
    children: isContainerBlock(raw.type) ? raw.children : undefined,
    columnSlots: raw.columnSlots,
  }

  if (!isContainerBlock(raw.type)) return block
  return ensureContainerSlots(block)
}

function cloneBlocks(blocks: PdfBlock[]): PdfBlock[] {
  return JSON.parse(JSON.stringify(blocks)) as PdfBlock[]
}

function clampLogoSize(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(Math.round(n), 16), 480)
}

function findLogoSizeInBlocks(blocks: PdfBlock[]): { width?: number; height?: number } {
  for (const block of blocks) {
    if (block.type === "logo") {
      return { width: block.props?.logoWidth, height: block.props?.logoHeight }
    }
    if (isContainerBlock(block.type) && block.columnSlots) {
      for (const slot of block.columnSlots) {
        const nested = findLogoSizeInBlocks(slot.blocks)
        if (nested.width || nested.height) return nested
      }
    }
  }
  return {}
}

export function normalizeInvoicePdfTemplate(
  input: Partial<InvoicePdfTemplate> | undefined,
  fallbackColors?: { primary?: string; accent?: string }
): InvoicePdfTemplate {
  const base = DEFAULT_INVOICE_PDF_TEMPLATE
  const primary = sanitizeHexColor(String(input?.primaryColor || ""), fallbackColors?.primary || base.primaryColor)
  const accent = sanitizeHexColor(String(input?.accentColor || ""), fallbackColors?.accent || base.accentColor)

  const sourceBlocks = Array.isArray(input?.blocks)
    ? input!.blocks.map(normalizeBlock).filter(Boolean) as PdfBlock[]
    : cloneBlocks(base.blocks)

  const blocks = normalizeBlockTree(sourceBlocks)
  const logoFromBlocks = findLogoSizeInBlocks(blocks)
  const logoWidth = clampLogoSize(
    input?.logoWidth ?? logoFromBlocks.width,
    base.logoWidth ?? DEFAULT_LOGO_WIDTH_PX
  )
  const logoHeight = clampLogoSize(
    input?.logoHeight ?? logoFromBlocks.height,
    base.logoHeight ?? DEFAULT_LOGO_HEIGHT_PX
  )

  return {
    version: 2,
    pageSize: input?.pageSize === "letter" ? "letter" : "a4",
    margin: typeof input?.margin === "number" ? Math.min(Math.max(input.margin, 8), 24) : base.margin,
    primaryColor: primary,
    accentColor: accent,
    fontFamily:
      input?.fontFamily === "times" || input?.fontFamily === "courier" ? input.fontFamily : "helvetica",
    showLogo: typeof input?.showLogo === "boolean" ? input.showLogo : base.showLogo,
    logoWidth,
    logoHeight,
    blocks: blocks.length > 0 ? blocks : base.blocks,
  }
}
