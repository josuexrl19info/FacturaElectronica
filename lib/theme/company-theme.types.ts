export type ThemeRadius = "sm" | "md" | "lg" | "xl"

export type CompanyTheme = {
  version: 1
  presetId: string | null
  primaryColor: string
  accentColor: string
  radius: ThemeRadius
}

export type CompanyThemeInput = Partial<CompanyTheme> & {
  primaryColor?: string
  accentColor?: string
}

export const THEME_RADIUS_VALUES: Record<ThemeRadius, string> = {
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.25rem",
}

export const COMPANY_THEME_UPDATED_EVENT = "company-theme-updated"
