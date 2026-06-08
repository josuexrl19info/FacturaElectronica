import type { CSSProperties } from "react"
import type { PdfBlockProps } from "@/lib/pdf-builder/types"
import { isValidHexColor } from "@/lib/theme/company-theme.utils"

export type ContainerBorderStyle = "solid" | "dashed" | "dotted"

export type ResolvedContainerStyles = {
  backgroundEnabled: boolean
  backgroundColor: string
  borderEnabled: boolean
  borderColor: string
  borderWidth: number
  borderStyle: ContainerBorderStyle
  borderRadius: number
}

const DEFAULT_BG = "#f5f3ff"
const DEFAULT_BORDER = "#c4b5fd"

export function resolveContainerStyles(props?: PdfBlockProps): ResolvedContainerStyles {
  return {
    backgroundEnabled: Boolean(props?.backgroundEnabled),
    backgroundColor: isValidHexColor(props?.backgroundColor || "") ? props!.backgroundColor! : DEFAULT_BG,
    borderEnabled: Boolean(props?.borderEnabled),
    borderColor: isValidHexColor(props?.borderColor || "") ? props!.borderColor! : DEFAULT_BORDER,
    borderWidth: Math.max(0, props?.borderWidth ?? 1),
    borderStyle: props?.borderStyle === "dashed" || props?.borderStyle === "dotted" ? props.borderStyle : "solid",
    borderRadius: Math.max(0, props?.borderRadius ?? 8),
  }
}

export function containerBoxStyle(props?: PdfBlockProps): CSSProperties {
  const s = resolveContainerStyles(props)
  const style: CSSProperties = {
    borderRadius: s.borderRadius,
    backgroundColor: s.backgroundEnabled ? s.backgroundColor : "transparent",
  }

  if (s.borderEnabled && s.borderWidth > 0) {
    style.borderWidth = s.borderWidth
    style.borderStyle = s.borderStyle
    style.borderColor = s.borderColor
  } else {
    style.border = "none"
  }

  return style
}

export function hexToRgbSafe(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  if (h.length < 6) return [245, 243, 255]
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ]
}
