import type { CompanyTheme } from "@/lib/theme/company-theme.types"

export type ThemePreset = {
  id: string
  label: string
  description: string
  theme: CompanyTheme
}

export const DEFAULT_COMPANY_THEME: CompanyTheme = {
  version: 1,
  presetId: "invosell",
  primaryColor: "#2dd4bf",
  accentColor: "#14b8a6",
  radius: "md",
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "invosell",
    label: "InvoSell",
    description: "Turquesa corporativo (predeterminado)",
    theme: DEFAULT_COMPANY_THEME,
  },
  {
    id: "ocean",
    label: "Océano",
    description: "Azul profesional",
    theme: {
      version: 1,
      presetId: "ocean",
      primaryColor: "#3b82f6",
      accentColor: "#2563eb",
      radius: "md",
    },
  },
  {
    id: "navy",
    label: "Corporativo",
    description: "Azul marino elegante",
    theme: {
      version: 1,
      presetId: "navy",
      primaryColor: "#314e7c",
      accentColor: "#1e3a5f",
      radius: "md",
    },
  },
  {
    id: "emerald",
    label: "Esmeralda",
    description: "Verde contable",
    theme: {
      version: 1,
      presetId: "emerald",
      primaryColor: "#10b981",
      accentColor: "#059669",
      radius: "md",
    },
  },
  {
    id: "violet",
    label: "Violeta",
    description: "Moderno y distintivo",
    theme: {
      version: 1,
      presetId: "violet",
      primaryColor: "#8b5cf6",
      accentColor: "#7c3aed",
      radius: "lg",
    },
  },
  {
    id: "sunset",
    label: "Atardecer",
    description: "Naranja energético",
    theme: {
      version: 1,
      presetId: "sunset",
      primaryColor: "#f97316",
      accentColor: "#ea580c",
      radius: "md",
    },
  },
]

export function getPresetById(presetId: string | null | undefined): ThemePreset | undefined {
  if (!presetId) return undefined
  return THEME_PRESETS.find((item) => item.id === presetId)
}
