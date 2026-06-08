import { DEFAULT_COMPANY_THEME } from "@/lib/theme/company-theme.presets"
import type { CompanyPersonalization, InvoicePersonalization } from "@/lib/theme/company-personalization.types"
import { normalizeCompanyTheme, sanitizeHexColor, type CompanyTheme } from "@/lib/theme/company-theme.utils"

export const DEFAULT_INVOICE_PERSONALIZATION: InvoicePersonalization = {
  headerColor: DEFAULT_COMPANY_THEME.primaryColor,
  tableAccentColor: DEFAULT_COMPANY_THEME.accentColor,
  showLogoOnPdf: true,
}

export const DEFAULT_COMPANY_PERSONALIZATION: CompanyPersonalization = {
  version: 1,
  system: DEFAULT_COMPANY_THEME,
  invoices: DEFAULT_INVOICE_PERSONALIZATION,
  additional: {},
}

function normalizeInvoicePersonalization(
  input: Partial<InvoicePersonalization> | undefined,
  systemTheme: CompanyTheme
): InvoicePersonalization {
  const base = {
    ...DEFAULT_INVOICE_PERSONALIZATION,
    headerColor: systemTheme.primaryColor,
    tableAccentColor: systemTheme.accentColor,
  }

  return {
    headerColor: sanitizeHexColor(String(input?.headerColor || ""), base.headerColor),
    tableAccentColor: sanitizeHexColor(String(input?.tableAccentColor || ""), base.tableAccentColor),
    showLogoOnPdf: typeof input?.showLogoOnPdf === "boolean" ? input.showLogoOnPdf : base.showLogoOnPdf,
  }
}

export function personalizationFromCompanyRecord(
  company?: Record<string, unknown> | null
): CompanyPersonalization {
  if (!company) return DEFAULT_COMPANY_PERSONALIZATION

  const legacyTheme = company.theme as CompanyTheme | undefined
  const personalizationRaw = company.personalization as Partial<CompanyPersonalization> | undefined
  const brandColor = typeof company.brandColor === "string" ? company.brandColor : undefined

  const system = normalizeCompanyTheme(personalizationRaw?.system || legacyTheme, brandColor)

  return {
    version: 1,
    system,
    invoices: normalizeInvoicePersonalization(personalizationRaw?.invoices, system),
    additional:
      personalizationRaw?.additional && typeof personalizationRaw.additional === "object"
        ? personalizationRaw.additional
        : {},
  }
}

export function personalizationAreEqual(a: CompanyPersonalization, b: CompanyPersonalization): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function mergePersonalizationIntoCompanyData(
  companyData: Record<string, unknown>,
  personalization: CompanyPersonalization
): Record<string, unknown> {
  return {
    ...companyData,
    brandColor: personalization.system.primaryColor,
    theme: personalization.system,
    personalization,
  }
}
