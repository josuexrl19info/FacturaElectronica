import type { CompanyTheme } from "@/lib/theme/company-theme.types"

export type InvoicePersonalization = {
  headerColor: string
  tableAccentColor: string
  showLogoOnPdf: boolean
}

export type CompanyPersonalization = {
  version: 1
  system: CompanyTheme
  invoices: InvoicePersonalization
  additional: Record<string, unknown>
}

export const COMPANY_PERSONALIZATION_UPDATED_EVENT = "company-personalization-updated"
