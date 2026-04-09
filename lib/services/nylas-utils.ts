import dns from "node:dns/promises"

export type DetectedProvider = "google" | "microsoft"

export type ProviderDetectionResult = {
  provider: DetectedProvider
  confidence: number
  source: "heuristic" | "mx" | "fallback"
  mxHosts: string[]
}

export function sanitizeUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeUndefined(item))
      .filter((item) => item !== undefined) as T
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const sanitized = sanitizeUndefined(item)
      if (sanitized !== undefined) {
        output[key] = sanitized
      }
    }
    return output as T
  }

  return value
}

export function canonicalizeEmail(email: string): string {
  const normalized = String(email || "").trim().toLowerCase()
  if (!normalized.includes("@")) return normalized

  const [local, domain] = normalized.split("@")
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const withoutAlias = local.split("+")[0].replace(/\./g, "")
    return `${withoutAlias}@gmail.com`
  }

  return `${local}@${domain}`
}

export function detectEmailProvider(email: string): ProviderDetectionResult {
  const normalized = String(email || "").trim().toLowerCase()
  const domain = normalized.split("@")[1] || ""

  const googleDomains = new Set([
    "gmail.com",
    "googlemail.com",
    "googleworkspace.com",
  ])

  if (googleDomains.has(domain) || domain.includes("google")) {
    return {
      provider: "google",
      confidence: 0.9,
      source: "heuristic",
      mxHosts: [],
    }
  }

  const microsoftSignals = [
    "outlook.com",
    "hotmail.com",
    "live.com",
    "office365.com",
    "microsoft",
  ]
  const isMicrosoft = microsoftSignals.some((token) => domain.includes(token))

  return {
    provider: isMicrosoft ? "microsoft" : "google",
    confidence: isMicrosoft ? 0.88 : 0.55,
    source: isMicrosoft ? "heuristic" : "fallback",
    mxHosts: [],
  }
}

export async function detectEmailProviderAdvanced(email: string): Promise<ProviderDetectionResult> {
  const fast = detectEmailProvider(email)
  const normalized = String(email || "").trim().toLowerCase()
  const domain = normalized.split("@")[1] || ""

  if (!domain) return fast

  try {
    const records = await dns.resolveMx(domain)
    const mxHosts = records
      .map((record) => record.exchange.toLowerCase())
      .sort((a, b) => a.localeCompare(b))

    const mxJoined = mxHosts.join(" ")
    if (mxJoined.includes("google.com")) {
      return {
        provider: "google",
        confidence: 0.98,
        source: "mx",
        mxHosts,
      }
    }

    if (mxJoined.includes("outlook.com") || mxJoined.includes("protection.outlook.com")) {
      return {
        provider: "microsoft",
        confidence: 0.98,
        source: "mx",
        mxHosts,
      }
    }

    return {
      ...fast,
      source: "fallback",
      mxHosts,
    }
  } catch {
    return fast
  }
}

export function buildUniqueFiscalId(params: {
  companyId: string
  messageId: string
  consecutivo?: string
  emisorId?: string
  clave?: string
}): string {
  const consecutivo = sanitizeIdChunk(params.consecutivo)
  const emisorId = sanitizeIdChunk(params.emisorId)

  if (consecutivo && emisorId) return `${consecutivo}-${emisorId}`

  const clave = sanitizeIdChunk(params.clave)
  if (clave && clave.length >= 30) {
    const fromClaveConsecutivo = clave.slice(20, 40)
    const fromClaveEmisor = clave.slice(3, 15)
    if (fromClaveConsecutivo && fromClaveEmisor) {
      return `${fromClaveConsecutivo}-${fromClaveEmisor}`
    }
  }

  return `${sanitizeIdChunk(params.companyId)}_${sanitizeIdChunk(params.messageId)}`
}

function sanitizeIdChunk(value?: string): string {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
}

export function toCostaRicaDateLabel(value: Date): string {
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: "America/Costa_Rica",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value)
}
