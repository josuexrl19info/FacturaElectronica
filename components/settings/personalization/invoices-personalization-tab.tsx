"use client"

import { useMemo } from "react"
import { InvoicePdfBuilder } from "@/components/pdf-builder/invoice-pdf-builder"
import type { InvoicePersonalization } from "@/lib/theme/company-personalization.types"
import { normalizeInvoicePdfTemplate } from "@/lib/pdf-builder/normalize-template"

type InvoicesPersonalizationTabProps = {
  draftInvoices: InvoicePersonalization
  onChange: (value: InvoicePersonalization) => void
}

export function InvoicesPersonalizationTab({ draftInvoices, onChange }: InvoicesPersonalizationTabProps) {
  const template = useMemo(
    () =>
      normalizeInvoicePdfTemplate(draftInvoices.pdfTemplate, {
        primary: draftInvoices.headerColor,
        accent: draftInvoices.tableAccentColor,
      }),
    [draftInvoices.pdfTemplate, draftInvoices.headerColor, draftInvoices.tableAccentColor]
  )

  return (
    <InvoicePdfBuilder
      template={template}
      onChange={(pdfTemplate) =>
        onChange({
          ...draftInvoices,
          headerColor: pdfTemplate.primaryColor,
          tableAccentColor: pdfTemplate.accentColor,
          showLogoOnPdf: pdfTemplate.showLogo,
          pdfTemplate,
        })
      }
    />
  )
}
