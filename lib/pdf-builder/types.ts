export type ContainerColumns = 1 | 2 | 3

export type PdfBlockType =
  | "container"
  | "logo"
  | "document-badge"
  | "company-name"
  | "emitter-info"
  | "receiver-info"
  | "document-meta"
  | "line-items"
  | "totals"
  | "notes"
  | "legal-text"
  | "custom-text"
  | "custom-image"
  | "divider"
  | "spacer"
  /** @deprecated migrado a container */
  | "columns-2"
  | "columns-3"
  | "section"

export type CompanyNameDisplay = "commercial" | "legal" | "both"

export type InfoFieldsVisibility = {
  id?: boolean
  phone?: boolean
  email?: boolean
  address?: boolean
  economicActivity?: boolean
}

export type DocumentMetaFieldsVisibility = {
  consecutivo?: boolean
  clave?: boolean
  fecha?: boolean
  moneda?: boolean
  formaPago?: boolean
  condicionVenta?: boolean
}

export type PdfBlockProps = {
  title?: string
  showTitle?: boolean
  columns?: ContainerColumns
  gap?: number
  padding?: number
  backgroundEnabled?: boolean
  backgroundColor?: string
  borderEnabled?: boolean
  borderColor?: string
  borderWidth?: number
  borderStyle?: "solid" | "dashed" | "dotted"
  borderRadius?: number

  text?: string
  fontSize?: number
  bold?: boolean
  align?: "left" | "center" | "right"
  color?: string

  logoWidth?: number
  logoHeight?: number

  nameDisplay?: CompanyNameDisplay
  nameBold?: boolean
  nameFontSize?: number

  showFields?: InfoFieldsVisibility

  documentMetaColumns?: 1 | 2
  documentMetaFields?: DocumentMetaFieldsVisibility

  badgeFontSize?: number

  imageUrl?: string
  imageWidth?: number
  imageHeight?: number

  height?: number
  label?: string
}

export type PdfColumnSlot = {
  id: string
  blocks: PdfBlock[]
}

export type PdfBlock = {
  id: string
  type: PdfBlockType
  props?: PdfBlockProps
  /** @deprecated usar columnSlots en container */
  children?: PdfBlock[]
  columnSlots?: PdfColumnSlot[]
}

export type InvoicePdfTemplate = {
  version: 2
  pageSize: "a4" | "letter"
  margin: number
  primaryColor: string
  accentColor: string
  fontFamily: "helvetica" | "times" | "courier"
  showLogo: boolean
  blocks: PdfBlock[]
}

export type PdfPaletteItem = {
  type: PdfBlockType
  label: string
  description: string
  category: "header" | "data" | "detail" | "layout" | "footer"
  icon: string
}

export type PdfMockLineItem = {
  line: number
  cabys: string
  description: string
  qty: number
  unit: string
  unitPrice: number
  discount: number
  subtotal: number
}

export type PdfMockInvoiceData = {
  documentType: string
  consecutivo: string
  clave: string
  fecha: string
  moneda: string
  formaPago: string
  condicionVenta: string
  company: {
    name: string
    commercialName: string
    id: string
    phone: string
    email: string
    address: string
    logo?: string
  }
  client: {
    name: string
    id: string
    phone: string
    email: string
    address: string
    economicActivity: string
  }
  items: PdfMockLineItem[]
  subtotal: number
  totalDiscount: number
  totalTax: number
  totalExempt: number
  total: number
  notes: string
  legalText: string
}

export function isContainerBlock(type: PdfBlockType): boolean {
  return type === "container" || type === "section" || type === "columns-2" || type === "columns-3"
}

export function isLegacyLayout(type: PdfBlockType): boolean {
  return type === "section" || type === "columns-2" || type === "columns-3"
}
