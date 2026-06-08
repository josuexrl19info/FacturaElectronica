import type { ContainerColumns, DocumentMetaFieldsVisibility, InfoFieldsVisibility, PdfBlockProps, PdfBlockType } from "@/lib/pdf-builder/types"

export const DEFAULT_EMITTER_FIELDS: InfoFieldsVisibility = {
  id: true,
  phone: true,
  email: true,
  address: true,
}

export const DEFAULT_RECEIVER_FIELDS: InfoFieldsVisibility = {
  id: true,
  phone: true,
  email: true,
  address: true,
  economicActivity: true,
}

export const DEFAULT_DOCUMENT_META_FIELDS: Required<DocumentMetaFieldsVisibility> = {
  consecutivo: true,
  clave: true,
  fecha: true,
  moneda: true,
  formaPago: true,
  condicionVenta: true,
}

export function defaultPropsForType(type: PdfBlockType): PdfBlockProps {
  switch (type) {
    case "container":
    case "section":
    case "columns-2":
    case "columns-3":
      return {
        columns: type === "columns-3" ? 3 : type === "columns-2" ? 2 : 2,
        showTitle: false,
        title: "",
        gap: 8,
        padding: 10,
        backgroundEnabled: false,
        backgroundColor: "#f5f3ff",
        borderEnabled: false,
        borderColor: "#c4b5fd",
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: 8,
      }
    case "logo":
      return { logoWidth: 88, logoHeight: 56 }
    case "company-name":
      return { nameDisplay: "both", nameBold: true, nameFontSize: 14 }
    case "custom-text":
      return { text: "Texto personalizado", fontSize: 10, bold: false, align: "left" }
    case "legal-text":
      return { fontSize: 7, bold: false }
    case "document-badge":
      return { badgeFontSize: 10, bold: true }
    case "emitter-info":
      return { showFields: { ...DEFAULT_EMITTER_FIELDS } }
    case "receiver-info":
      return { showFields: { ...DEFAULT_RECEIVER_FIELDS } }
    case "document-meta":
      return {
        documentMetaColumns: 1,
        documentMetaFields: { ...DEFAULT_DOCUMENT_META_FIELDS },
      }
    case "custom-image":
      return { imageUrl: "", imageWidth: 120, imageHeight: 48 }
    case "spacer":
      return { height: 10 }
    default:
      return {}
  }
}

export function mergeBlockProps(type: PdfBlockType, props?: PdfBlockProps): PdfBlockProps {
  return { ...defaultPropsForType(type), ...(props || {}) }
}

export function defaultContainerColumns(type: PdfBlockType): ContainerColumns {
  if (type === "columns-3") return 3
  if (type === "columns-2") return 2
  return 2
}
