import { converter, formatCss, formatHex, interpolate, parse, wcagContrast } from "culori"
import { DEFAULT_COMPANY_THEME, getPresetById } from "@/lib/theme/company-theme.presets"
import {
  type CompanyTheme,
  type CompanyThemeInput,
  type ThemeRadius,
  THEME_RADIUS_VALUES,
} from "@/lib/theme/company-theme.types"

const toOklch = converter("oklch")

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/
const HEX_SHORT_REGEX = /^#([0-9a-fA-F]{3})$/

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_REGEX.test(String(value || "").trim())
}

export function sanitizeHexColor(value: string, fallback: string): string {
  const trimmed = String(value || "").trim().toLowerCase()
  if (HEX_COLOR_REGEX.test(trimmed)) return trimmed

  const shortMatch = HEX_SHORT_REGEX.exec(trimmed)
  if (shortMatch) {
    const [r, g, b] = shortMatch[1].split("")
    return `#${r}${r}${g}${g}${b}${b}`
  }

  return isValidHexColor(fallback) ? fallback.toLowerCase() : DEFAULT_COMPANY_THEME.primaryColor
}

function hexToOklch(value: string, fallback: string): string {
  const safe = sanitizeHexColor(value, fallback)
  const parsed = parse(safe)
  if (!parsed) return fallback
  const oklch = toOklch(parsed)
  if (!oklch) return fallback
  return formatCss(oklch) || fallback
}

function pickForeground(backgroundHex: string): string {
  const bg = parse(sanitizeHexColor(backgroundHex, DEFAULT_COMPANY_THEME.primaryColor))
  if (!bg) return "oklch(0.99 0 0)"
  const whiteContrast = wcagContrast(bg, parse("#ffffff")!)
  const darkContrast = wcagContrast(bg, parse("#0f172a")!)
  return whiteContrast >= darkContrast ? "oklch(0.99 0 0)" : "oklch(0.15 0.02 220)"
}

function mixHex(base: string, target: string, amount: number): string {
  const safeBase = sanitizeHexColor(base, DEFAULT_COMPANY_THEME.primaryColor)
  const safeTarget = sanitizeHexColor(target, "#ffffff")

  try {
    const parsedBase = parse(safeBase)
    const parsedTarget = parse(safeTarget)
    if (!parsedBase || !parsedTarget) return safeBase

    const mixer = interpolate([parsedBase, parsedTarget], "rgb")
    const mixed = mixer(Math.min(Math.max(amount, 0), 1))
    return formatHex(mixed) || safeBase
  } catch {
    return safeBase
  }
}

export function normalizeThemeRadius(value: unknown): ThemeRadius {
  if (value === "sm" || value === "md" || value === "lg" || value === "xl") return value
  return DEFAULT_COMPANY_THEME.radius
}

export function normalizeCompanyTheme(input?: CompanyThemeInput | null, brandColor?: string): CompanyTheme {
  const preset = getPresetById(input?.presetId || undefined)
  const base = preset?.theme || DEFAULT_COMPANY_THEME

  const primaryCandidate = input?.primaryColor || brandColor || base.primaryColor
  const accentCandidate = input?.accentColor || base.accentColor

  return {
    version: 1,
    presetId: input?.presetId ?? base.presetId,
    primaryColor: sanitizeHexColor(primaryCandidate, base.primaryColor),
    accentColor: sanitizeHexColor(accentCandidate, base.accentColor),
    radius: normalizeThemeRadius(input?.radius ?? base.radius),
  }
}

export function themeFromCompanyRecord(company?: Record<string, unknown> | null): CompanyTheme {
  if (!company) return DEFAULT_COMPANY_THEME
  const themeRaw = company.theme as CompanyThemeInput | undefined
  const brandColor = typeof company.brandColor === "string" ? company.brandColor : undefined
  return normalizeCompanyTheme(themeRaw, brandColor)
}

export function buildThemeCssVariables(theme: CompanyTheme): Record<string, string> {
  const safeTheme = normalizeCompanyTheme(theme)
  const primary = hexToOklch(safeTheme.primaryColor, "oklch(0.65 0.15 190)")
  const accent = hexToOklch(safeTheme.accentColor, "oklch(0.6 0.18 180)")
  const primaryForeground = pickForeground(safeTheme.primaryColor)
  const accentForeground = pickForeground(safeTheme.accentColor)
  const radius = THEME_RADIUS_VALUES[safeTheme.radius]

  const muted = hexToOklch(mixHex(safeTheme.primaryColor, "#ffffff", 0.92), "oklch(0.96 0.01 200)")
  const border = hexToOklch(mixHex(safeTheme.primaryColor, "#ffffff", 0.85), "oklch(0.9 0.01 200)")

  return {
    "--primary": primary,
    "--primary-foreground": primaryForeground,
    "--accent": accent,
    "--accent-foreground": accentForeground,
    "--ring": primary,
    "--chart-1": primary,
    "--chart-2": accent,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": primaryForeground,
    "--sidebar-ring": primary,
    "--muted": muted,
    "--border": border,
    "--input": border,
    "--radius": radius,
    "--theme-gradient-from": primary,
    "--theme-gradient-via": accent,
    "--theme-gradient-to": hexToOklch(mixHex(safeTheme.accentColor, "#ffffff", 0.15), accent),
    "--theme-brand-hex": safeTheme.primaryColor,
  }
}

const ROOT_THEME_KEYS = [
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--ring",
  "--chart-1",
  "--chart-2",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-ring",
  "--muted",
  "--border",
  "--input",
  "--radius",
  "--theme-gradient-from",
  "--theme-gradient-via",
  "--theme-gradient-to",
  "--theme-brand-hex",
] as const

export function applyCompanyTheme(theme: CompanyTheme, target: HTMLElement = document.documentElement): void {
  const vars = buildThemeCssVariables(theme)
  for (const [key, value] of Object.entries(vars)) {
    target.style.setProperty(key, value)
  }
}

export function clearCompanyTheme(target: HTMLElement = document.documentElement): void {
  for (const key of ROOT_THEME_KEYS) {
    target.style.removeProperty(key)
  }
}

export function themesAreEqual(a: CompanyTheme, b: CompanyTheme): boolean {
  return (
    a.presetId === b.presetId &&
    a.primaryColor === b.primaryColor &&
    a.accentColor === b.accentColor &&
    a.radius === b.radius
  )
}

export function mergeThemeIntoCompanyData(
  companyData: Record<string, unknown>,
  theme: CompanyTheme
): Record<string, unknown> {
  return {
    ...companyData,
    brandColor: theme.primaryColor,
    theme,
  }
}
