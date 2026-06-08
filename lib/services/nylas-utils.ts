import dns from "node:dns/promises"

/** Identificador de proveedor según Nylas (google, microsoft, generic, icloud, etc.) */
export type DetectedProvider = string

export type ProviderDetectionResult = {
  provider: DetectedProvider
  providerType?: string
  providerLabel: string
  confidence: number
  source: "nylas" | "heuristic" | "mx" | "fallback"
  detected: boolean
  mxHosts: string[]
}

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google / Gmail",
  microsoft: "Microsoft / Outlook",
  imap: "Correo IMAP",
  generic: "Correo personalizado (IMAP)",
  icloud: "Apple iCloud",
  yahoo: "Yahoo Mail",
  aol: "AOL",
  outlook: "Outlook.com",
  zoho: "Zoho Mail",
  zoho_custom_domain: "Zoho (dominio propio)",
  zoho_eu: "Zoho Mail (EU)",
  fastmail: "Fastmail",
  godaddy: "GoDaddy",
  namecheap: "Namecheap",
  gmx: "GMX",
  mail_com: "Mail.com",
  yandex: "Yandex",
  qq: "QQ Mail",
  aliyun: "Aliyun",
}

export function getProviderLabel(provider: string, providerType?: string): string {
  const normalized = String(provider || "").trim().toLowerCase()
  if (PROVIDER_LABELS[normalized]) return PROVIDER_LABELS[normalized]
  if (providerType === "imap" || normalized === "imap") return "Correo IMAP"
  if (!normalized) return "Sin detectar"
  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
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

function detectEmailProviderHeuristic(email: string): ProviderDetectionResult {
  const normalized = String(email || "").trim().toLowerCase()
  const domain = normalized.split("@")[1] || ""

  const googleDomains = new Set(["gmail.com", "googlemail.com", "googleworkspace.com"])
  if (googleDomains.has(domain) || domain.includes("google")) {
    return {
      provider: "google",
      providerLabel: getProviderLabel("google"),
      confidence: 0.9,
      source: "heuristic",
      detected: true,
      mxHosts: [],
    }
  }

  const microsoftSignals = ["outlook.com", "hotmail.com", "live.com", "office365.com", "microsoft"]
  const isMicrosoft = microsoftSignals.some((token) => domain.includes(token))
  if (isMicrosoft) {
    return {
      provider: "microsoft",
      providerLabel: getProviderLabel("microsoft"),
      confidence: 0.88,
      source: "heuristic",
      detected: true,
      mxHosts: [],
    }
  }

  return {
    provider: "generic",
    providerType: "imap",
    providerLabel: getProviderLabel("generic", "imap"),
    confidence: 0.4,
    source: "fallback",
    detected: false,
    mxHosts: [],
  }
}

async function detectEmailProviderFromMx(email: string): Promise<ProviderDetectionResult | null> {
  const normalized = String(email || "").trim().toLowerCase()
  const domain = normalized.split("@")[1] || ""
  if (!domain) return null

  try {
    const records = await dns.resolveMx(domain)
    const mxHosts = records
      .map((record) => record.exchange.toLowerCase())
      .sort((a, b) => a.localeCompare(b))

    const mxJoined = mxHosts.join(" ")
    if (mxJoined.includes("google.com") || mxJoined.includes("googlemail.com")) {
      return {
        provider: "google",
        providerLabel: getProviderLabel("google"),
        confidence: 0.95,
        source: "mx",
        detected: true,
        mxHosts,
      }
    }

    if (
      mxJoined.includes("outlook.com") ||
      mxJoined.includes("protection.outlook.com") ||
      mxJoined.includes("microsoft.com")
    ) {
      return {
        provider: "microsoft",
        providerLabel: getProviderLabel("microsoft"),
        confidence: 0.95,
        source: "mx",
        detected: true,
        mxHosts,
      }
    }

    if (mxJoined.includes("icloud.com") || mxJoined.includes("me.com")) {
      return {
        provider: "icloud",
        providerLabel: getProviderLabel("icloud"),
        confidence: 0.9,
        source: "mx",
        detected: true,
        mxHosts,
      }
    }

    if (mxJoined.includes("yahoo")) {
      return {
        provider: "yahoo",
        providerLabel: getProviderLabel("yahoo"),
        confidence: 0.9,
        source: "mx",
        detected: true,
        mxHosts,
      }
    }

    if (mxJoined.includes("zoho")) {
      return {
        provider: "zoho",
        providerLabel: getProviderLabel("zoho"),
        confidence: 0.85,
        source: "mx",
        detected: true,
        mxHosts,
      }
    }

    // Dominio corporativo con MX propio: conectar vía IMAP genérico de Nylas.
    return {
      provider: "generic",
      providerType: "imap",
      providerLabel: getProviderLabel("generic", "imap"),
      confidence: 0.7,
      source: "mx",
      detected: false,
      mxHosts,
    }
  } catch {
    return null
  }
}

/** Respaldo local cuando la API de Nylas no está disponible o no detecta el proveedor. */
export async function detectEmailProviderAdvanced(email: string): Promise<ProviderDetectionResult> {
  const mxResult = await detectEmailProviderFromMx(email)
  if (mxResult) return mxResult
  return detectEmailProviderHeuristic(email)
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
