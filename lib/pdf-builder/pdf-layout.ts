import { pxToMm } from "@/lib/pdf-builder/block-render-helpers"

/** Ancho de referencia del contenido en la vista previa HTML (~420px − padding). */
export const PREVIEW_CONTENT_WIDTH_PX = 388

/** Columnas de líneas: mismas proporciones que el grid HTML (20 | 1fr | 32 | 48 | 48). */
export const LINE_ITEMS_COL_PX = {
  num: 20,
  qty: 32,
  unit: 48,
  total: 48,
} as const

export function getLineItemsColumnWidthsMm(contentWidthMm: number) {
  const base = PREVIEW_CONTENT_WIDTH_PX
  const fixed =
    LINE_ITEMS_COL_PX.num + LINE_ITEMS_COL_PX.qty + LINE_ITEMS_COL_PX.unit + LINE_ITEMS_COL_PX.total
  const descPx = Math.max(40, base - fixed)
  const scale = contentWidthMm / base

  const num = LINE_ITEMS_COL_PX.num * scale
  const qty = LINE_ITEMS_COL_PX.qty * scale
  const unit = LINE_ITEMS_COL_PX.unit * scale
  const total = LINE_ITEMS_COL_PX.total * scale
  const desc = descPx * scale

  return { num, desc, qty, unit, total }
}

export function formatPdfCurrency(amount: number, currency = "CRC"): string {
  const formatted = Number(amount || 0).toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (currency === "USD") return `USD ${formatted}`
  return `₡${formatted}`
}

/** Monto sin símbolo (columnas P.Unit. / Total). */
export function formatPdfCurrencyPlain(amount: number, currency = "CRC"): string {
  return formatPdfCurrency(amount, currency).replace(/^₡/, "").replace(/^USD /, "")
}

export function resolvePdfCurrencyCode(moneda: string | undefined, fallback = "CRC"): string {
  if (!moneda) return fallback
  const upper = moneda.toUpperCase()
  if (upper.includes("USD") || upper.includes("DÓLAR") || upper.includes("DOLAR")) return "USD"
  return "CRC"
}

/** Espaciados alineados con la vista previa en vivo (Tailwind en pdf-block-preview). */
export const PDF_PREVIEW_LAYOUT = {
  /** space-y-3 entre bloques raíz */
  blockGapPx: 12,
  /** gap horizontal entre columnas de un contenedor (grid column-gap) */
  containerColumnGapPx: 8,
  /** space-y-2 entre bloques dentro de una columna de contenedor */
  columnChildGapPx: 8,
  /** p-2 en tarjetas */
  cardPaddingPx: 8,
  /** gap-3 en meta documento (2 columnas) */
  metaColumnGapPx: 12,
  /** space-y-1 / mb-1 entre entradas meta */
  metaEntryGapPx: 4,
  /** mb-2 título de contenedor */
  containerTitleMbPx: 8,
  /** px-3 py-2 badge documento */
  badgePaddingX: 12,
  badgePaddingY: 8,
  /** py-1.5 px-2 encabezado tabla */
  tableHeaderPaddingY: 6,
  tableHeaderPaddingX: 8,
  /** py-1 px-2 filas tabla */
  tableRowPaddingY: 4,
  tableRowPaddingX: 8,
  /** py-0.5 filas totales */
  totalsRowPaddingY: 2,
  /** mt-1 px-2 py-1.5 caja TOTAL */
  totalsBoxMarginTop: 4,
  totalsBoxPaddingY: 6,
  totalsBoxPaddingX: 8,
  /** mb-1 título notas */
  notesTitleMbPx: 4,
  /** altura mínima contenido notas vacío */
  notesEmptyMinHeightPx: 12,
} as const

/** Separación horizontal entre columnas; respeta `props.gap` del contenedor si existe. */
export function resolveContainerColumnGap(gap?: number): number {
  if (typeof gap === "number" && Number.isFinite(gap) && gap >= 0) return gap
  return PDF_PREVIEW_LAYOUT.containerColumnGapPx
}

export function formatNotesDisplayText(notes: unknown): string {
  if (notes == null || notes === "") return ""
  return String(notes).trim()
}

export const PDF_CARD = {
  paddingMm: pxToMm(8),
  radiusMm: pxToMm(8),
  borderRgb: [210, 210, 210] as [number, number, number],
  mutedRgb: [120, 120, 120] as [number, number, number],
  labelFontPt: 7,
  bodyFontPt: 7,
  titleFontPt: 7,
  lineHeightMm: 4,
  bodyLineHeightMm: 4.5,
} as const
