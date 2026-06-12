import type { InvoicePdfApiPayload } from "@/lib/services/invoice-pdf-client"

/** Serializa payloads de PDF omitiendo valores no válidos en JSON (Firestore, undefined, etc.). */
export function stringifyInvoicePdfPayload(payload: InvoicePdfApiPayload): string {
  return JSON.stringify(payload, (_key, value) => {
    if (value === undefined) return null
    if (typeof value === "function") return undefined
    if (typeof value === "bigint") return value.toString()
    if (value instanceof Date) return value.toISOString()
    if (value && typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
      try {
        return (value as { toDate: () => Date }).toDate().toISOString()
      } catch {
        return null
      }
    }
    return value
  })
}
