import "server-only"

import { buildInvoicePdfApiPayload } from "@/lib/services/invoice-pdf-client"
import {
  mergePersonalizationIntoCompanyData,
  personalizationFromCompanyRecord,
} from "@/lib/theme/company-personalization.utils"
import { collectAllBlockIds } from "@/lib/pdf-builder/tree-utils"

export type GenerateInvoicePdfBase64Options = {
  company?: Record<string, unknown> | null
  client?: Record<string, unknown> | null
}

/**
 * Genera el PDF del documento con la plantilla guardada en Firebase (o default).
 * Uso en servidor: email, APIs, etc.
 */
export async function generateInvoicePdfBase64(
  invoice: Record<string, unknown>,
  options?: GenerateInvoicePdfBase64Options
): Promise<{ base64: string; blockCount: number }> {
  const companyRecord = (options?.company || {}) as Record<string, unknown>
  const clientRecord = (options?.client || {}) as Record<string, unknown>

  const payload = buildInvoicePdfApiPayload(invoice, companyRecord, clientRecord)
  const { generateInvoicePDFOptimized } = await import("@/lib/services/pdf-generator-optimized")
  const arrayBuffer = await generateInvoicePDFOptimized(payload)
  const base64 = Buffer.from(arrayBuffer).toString("base64")
  const blockCount = collectAllBlockIds(payload.pdfTemplate.blocks).length

  return { base64, blockCount }
}

/** Empresa con personalización normalizada (incl. pdfTemplate) desde Firestore. */
export function enrichCompanyWithPersonalization(
  companyData: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!companyData) return {}
  const personalization = personalizationFromCompanyRecord(companyData)
  return mergePersonalizationIntoCompanyData(companyData, personalization)
}
