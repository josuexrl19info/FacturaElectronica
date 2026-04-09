import { initializeApp, getApps } from "firebase/app"
import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import { DetectedProvider, canonicalizeEmail, sanitizeUndefined } from "@/lib/services/nylas-utils"

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)
const COSTA_RICA_OFFSET_HOURS = 6 // America/Costa_Rica = UTC-6

function parseYmd(value?: string): { year: number; month: number; day: number } | null {
  const raw = String(value || "").trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function costaRicaDayStartUtcMillis(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day, COSTA_RICA_OFFSET_HOURS, 0, 0, 0)
}

function costaRicaDayEndUtcMillis(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day + 1, COSTA_RICA_OFFSET_HOURS, 0, 0, 0) - 1
}

export type InvoiceReceptionConfig = {
  email: string
  provider: DetectedProvider
  nylas?: {
    connected: boolean
    grantId?: string
    connectedAt?: string
    lastSyncAt?: string
    webhookEnabled?: boolean
  }
}

type ProcessedDoc = Record<string, any>

export class InvoiceReceptionService {
  static async getConfig(companyId: string): Promise<InvoiceReceptionConfig | null> {
    const ref = doc(db, "company-configurations", companyId)
    const snapshot = await getDoc(ref)
    if (!snapshot.exists()) return null
    return (snapshot.data()?.invoiceReception || null) as InvoiceReceptionConfig | null
  }

  static async saveConfig(companyId: string, config: InvoiceReceptionConfig): Promise<void> {
    const ref = doc(db, "company-configurations", companyId)
    const snapshot = await getDoc(ref)

    const existing = snapshot.exists() ? snapshot.data()?.invoiceReception || {} : {}
    const merged = sanitizeUndefined({
      ...existing,
      email: config.email,
      provider: config.provider,
      nylas: {
        ...(existing?.nylas || {}),
        ...(config.nylas || {}),
      },
    })

    if (!snapshot.exists()) {
      await setDoc(ref, { invoiceReception: merged }, { merge: true })
      return
    }

    await updateDoc(ref, { invoiceReception: merged })
  }

  static async upsertOAuthGrant(
    companyId: string,
    grantId: string,
    fallback?: { email?: string; provider?: DetectedProvider }
  ): Promise<void> {
    const nowIso = new Date().toISOString()
    const current = await InvoiceReceptionService.getConfig(companyId)
    const baseEmail = current?.email || fallback?.email || ""
    const baseProvider = current?.provider || fallback?.provider || "google"

    const next = sanitizeUndefined({
      ...(current || {}),
      email: baseEmail,
      provider: baseProvider,
      nylas: {
        ...(current?.nylas || {}),
        connected: true,
        grantId,
        connectedAt: nowIso,
      },
    })

    await InvoiceReceptionService.saveConfig(companyId, next)
  }

  static async touchLastSync(companyId: string): Promise<void> {
    const current = await InvoiceReceptionService.getConfig(companyId)
    if (!current) return

    await InvoiceReceptionService.saveConfig(
      companyId,
      sanitizeUndefined({
        ...current,
        nylas: {
          ...(current.nylas || {}),
          lastSyncAt: new Date().toISOString(),
        },
      })
    )
  }

  static async saveProcessed(uniqueId: string, data: ProcessedDoc): Promise<void> {
    const ref = doc(db, "invoice-email-receptions", uniqueId)
    const payload = sanitizeUndefined({
      ...data,
      uniqueId,
      processedAt: data.processedAt || new Date().toISOString(),
    })
    await setDoc(ref, payload, { merge: true })
  }

  static async existsProcessed(uniqueId: string): Promise<boolean> {
    const ref = doc(db, "invoice-email-receptions", uniqueId)
    const snapshot = await getDoc(ref)
    return snapshot.exists()
  }

  static async getProcessed(params: {
    companyId: string
    receptionEmail: string
    fromDate?: string
    toDate?: string
  }): Promise<ProcessedDoc[]> {
    const canonical = canonicalizeEmail(params.receptionEmail)
    // Evita dependencia de índice compuesto en entornos donde aún no fue creado.
    const byCompanyQuery = query(collection(db, "invoice-email-receptions"), where("companyId", "==", params.companyId))

    const snapshot = await getDocs(byCompanyQuery)
    const rows = snapshot.docs
      .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
      .filter((row) => canonicalizeEmail(String(row?.receptionEmail || row?.receptionEmailCanonical || "")) === canonical)

    const fromParts = parseYmd(params.fromDate)
    const toParts = parseYmd(params.toDate)
    const fromMs = fromParts ? costaRicaDayStartUtcMillis(fromParts.year, fromParts.month, fromParts.day) : null
    const toMs = toParts ? costaRicaDayEndUtcMillis(toParts.year, toParts.month, toParts.day) : null

    return rows
      .filter((row) => {
      const datePriority =
        row?.invoiceSummary?.fechaEmision || row?.date || row?.processedAt || new Date().toISOString()
      const current = new Date(datePriority).getTime()
      if (Number.isNaN(current)) return true
      if (fromMs !== null && current < fromMs) return false
      if (toMs !== null && current > toMs) return false
      return true
    })
      .sort((a, b) => {
        const aDate = new Date(a?.processedAt || 0).getTime()
        const bDate = new Date(b?.processedAt || 0).getTime()
        return bDate - aDate
      })
      .slice(0, 1000)
  }
}
