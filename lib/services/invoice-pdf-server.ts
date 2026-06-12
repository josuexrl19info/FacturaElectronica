import "server-only"

import { generateInvoicePDFOptimized } from "@/lib/services/pdf-generator-optimized"
import { buildInvoicePdfApiPayload } from "@/lib/services/invoice-pdf-client"
import { isServerPuppeteerEnabled } from "@/lib/services/puppeteer-launch"
import {
  mergePersonalizationIntoCompanyData,
  personalizationFromCompanyRecord,
} from "@/lib/theme/company-personalization.utils"
import { collectAllBlockIds } from "@/lib/pdf-builder/tree-utils"

export type GenerateInvoicePdfBase64Options = {
  company?: Record<string, unknown> | null
  client?: Record<string, unknown> | null
}

export type GenerateInvoicePdfBase64Result = {
  base64: string | null
  blockCount: number
  skipped?: boolean
  reason?: string
}

/**
 * Genera el PDF del documento con la plantilla guardada en Firebase (o default).
 * - Local: Puppeteer (diseño HTML elegante).
 * - Vercel Hobby: omitido por defecto (correo sin adjunto); activar con PDF_ENABLE_SERVERLESS=true.
 */
export async function generateInvoicePdfBase64(
  invoice: Record<string, unknown>,
  options?: GenerateInvoicePdfBase64Options
): Promise<GenerateInvoicePdfBase64Result> {
  const companyRecord = (options?.company || {}) as Record<string, unknown>
  const clientRecord = (options?.client || {}) as Record<string, unknown>

  const payload = buildInvoicePdfApiPayload(invoice, companyRecord, clientRecord)
  const blockCount = collectAllBlockIds(payload.pdfTemplate.blocks).length

  if (!isServerPuppeteerEnabled()) {
    console.warn(
      "[PDF] Puppeteer omitido en entorno serverless (Vercel Hobby). " +
        "El correo se enviará sin adjunto PDF. Para intentar en Vercel: PDF_ENABLE_SERVERLESS=true"
    )
    return {
      base64: null,
      blockCount,
      skipped: true,
      reason: "serverless-puppeteer-disabled",
    }
  }

  try {
    const arrayBuffer = await generateInvoicePDFOptimized(payload)
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    return { base64, blockCount }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido generando PDF"
    console.error("[PDF] Error en servidor, continuando sin adjunto:", message)
    return {
      base64: null,
      blockCount,
      skipped: true,
      reason: message,
    }
  }
}

/** Empresa con personalización normalizada (incl. pdfTemplate) desde Firestore. */
export function enrichCompanyWithPersonalization(
  companyData: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!companyData) return {}
  const personalization = personalizationFromCompanyRecord(companyData)
  return mergePersonalizationIntoCompanyData(companyData, personalization)
}
