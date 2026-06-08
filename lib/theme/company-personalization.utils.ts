import { DEFAULT_COMPANY_THEME } from "@/lib/theme/company-theme.presets"
import { DEFAULT_INVOICE_PDF_TEMPLATE } from "@/lib/pdf-builder/default-template"
import { normalizeInvoicePdfTemplate } from "@/lib/pdf-builder/normalize-template"
import { collectAllBlockIds } from "@/lib/pdf-builder/tree-utils"
import type { CompanyPersonalization, InvoicePersonalization } from "@/lib/theme/company-personalization.types"
import { normalizeCompanyTheme, sanitizeHexColor, type CompanyTheme } from "@/lib/theme/company-theme.utils"

export const DEFAULT_INVOICE_PERSONALIZATION: InvoicePersonalization = {
  headerColor: DEFAULT_COMPANY_THEME.primaryColor,
  tableAccentColor: DEFAULT_COMPANY_THEME.accentColor,
  showLogoOnPdf: true,
  pdfTemplate: DEFAULT_INVOICE_PDF_TEMPLATE,
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

  const headerColor = sanitizeHexColor(String(input?.headerColor || ""), base.headerColor)
  const tableAccentColor = sanitizeHexColor(String(input?.tableAccentColor || ""), base.tableAccentColor)
  const showLogoOnPdf = typeof input?.showLogoOnPdf === "boolean" ? input.showLogoOnPdf : base.showLogoOnPdf

  const pdfTemplate = normalizeInvoicePdfTemplate(input?.pdfTemplate, {
    primary: headerColor,
    accent: tableAccentColor,
  })

  return {
    headerColor,
    tableAccentColor,
    showLogoOnPdf,
    pdfTemplate: {
      ...pdfTemplate,
      primaryColor: headerColor,
      accentColor: tableAccentColor,
      showLogo: showLogoOnPdf,
    },
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

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)).filter((item) => item !== undefined) as T
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const sanitized = stripUndefinedDeep(item)
      if (sanitized !== undefined) {
        output[key] = sanitized
      }
    }
    return output as T
  }
  return value
}

/** Normaliza y limpia la personalización completa (incl. pdfTemplate) para persistir en Firestore. */
export function preparePersonalizationForFirestore(
  input: Partial<CompanyPersonalization> | Record<string, unknown>
): CompanyPersonalization {
  const normalized = personalizationFromCompanyRecord({ personalization: input })
  return stripUndefinedDeep(normalized)
}

export function countPdfTemplateBlocks(personalization: CompanyPersonalization): number {
  return collectAllBlockIds(personalization.invoices.pdfTemplate.blocks).length
}
