import type { PdfBlock, PdfBlockType, PdfPaletteItem } from "@/lib/pdf-builder/types"
import { defaultPropsForType } from "@/lib/pdf-builder/block-defaults"
import { createColumnSlots } from "@/lib/pdf-builder/tree-utils"

export const PDF_BLOCK_CATALOG: PdfPaletteItem[] = [
  { type: "logo", label: "Logo", description: "Logo de la empresa", category: "header", icon: "Image" },
  { type: "document-badge", label: "Tipo documento", description: "Badge Factura / NC / Tiquete", category: "header", icon: "Badge" },
  { type: "company-name", label: "Nombre empresa", description: "Razón social / comercial", category: "header", icon: "Building2" },
  { type: "custom-text", label: "Texto libre", description: "Texto personalizado", category: "header", icon: "Type" },
  { type: "custom-image", label: "Imagen", description: "URL de imagen o banner", category: "header", icon: "ImagePlus" },
  { type: "emitter-info", label: "Emisor", description: "Datos del emisor", category: "data", icon: "Factory" },
  { type: "receiver-info", label: "Receptor", description: "Datos del cliente", category: "data", icon: "User" },
  { type: "document-meta", label: "Info documento", description: "Clave, fecha, moneda, pago", category: "data", icon: "FileKey" },
  { type: "line-items", label: "Detalle líneas", description: "Tabla de productos/servicios", category: "detail", icon: "Table" },
  { type: "totals", label: "Totales", description: "Subtotal, IVA, descuento, total", category: "detail", icon: "Calculator" },
  { type: "notes", label: "Notas", description: "Comentarios del documento", category: "detail", icon: "StickyNote" },
  { type: "container", label: "Contenedor", description: "Layout con 1–3 columnas y título opcional", category: "layout", icon: "LayoutPanelTop" },
  { type: "divider", label: "Separador", description: "Línea horizontal", category: "layout", icon: "Minus" },
  { type: "spacer", label: "Espacio", description: "Espacio vertical", category: "layout", icon: "MoveVertical" },
  { type: "legal-text", label: "Texto legal", description: "Pie legal Hacienda", category: "footer", icon: "Scale" },
]

export const PDF_LAYOUT_QUICK_ADD: PdfBlockType[] = ["container"]

export const PDF_PALETTE_CATEGORIES = [
  { id: "layout", label: "Layouts" },
  { id: "header", label: "Encabezado" },
  { id: "data", label: "Datos" },
  { id: "detail", label: "Detalle" },
  { id: "footer", label: "Pie" },
] as const

export function getPaletteItem(type: PdfBlockType): PdfPaletteItem | undefined {
  return PDF_BLOCK_CATALOG.find((item) => item.type === type)
}

export function createBlockId(type: PdfBlockType): string {
  return `${type}_${Math.random().toString(36).slice(2, 9)}`
}

export function createBlockFromType(type: PdfBlockType): PdfBlock {
  const base: PdfBlock = {
    id: createBlockId(type),
    type: type === "section" || type === "columns-2" || type === "columns-3" ? "container" : type,
    props: defaultPropsForType(type),
  }

  if (type === "container" || type === "section" || type === "columns-2" || type === "columns-3") {
    const cols = type === "columns-3" ? 3 : type === "columns-2" ? 2 : 2
    return {
      ...base,
      type: "container",
      props: { ...defaultPropsForType("container"), columns: cols },
      columnSlots: createColumnSlots(cols),
    }
  }

  return base
}

export function createContainerBlock(columns: 1 | 2 | 3 = 2): PdfBlock {
  const block = createBlockFromType("container")
  return {
    ...block,
    props: { ...block.props, columns },
    columnSlots: createColumnSlots(columns),
  }
}
