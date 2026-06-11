/** Formato DD/MM/YYYY solo para el campo Fecha del documento. */

function isLikelyDocumentIdentifier(value: string): boolean {
  const digits = value.replace(/\D/g, "")
  if (/^[A-Za-z]{2}-/.test(value)) return true
  if (digits.length >= 10) return true
  if (/^506\d{41,}$/.test(digits)) return true
  return false
}

/** Valor crudo para almacenar en contexto; sin formateo DD-MM-YYYY. */
export function rawPdfFieldValue(value: unknown): string {
  return coerceRawScalar(value)
}

function coerceRawScalar(value: unknown): string {
  if (value == null || value === "") return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object") {
    const o = value as Record<string, unknown>
    if (typeof o.toDate === "function") {
      try {
        return o.toDate().toISOString()
      } catch {
        return ""
      }
    }
    if (typeof o.seconds === "number") {
      return new Date(o.seconds * 1000).toISOString()
    }
  }
  return String(value)
}

export function tryParseDate(value: unknown): Date | null {
  if (value == null || value === "") return null
  if (value instanceof Date && !isNaN(value.getTime())) return value

  if (typeof value === "object" && value !== null) {
    const maybe = value as { toDate?: () => Date; seconds?: number; _seconds?: number; nanoseconds?: number }
    if (typeof maybe.toDate === "function") {
      const d = maybe.toDate()
      if (d instanceof Date && !isNaN(d.getTime())) return d
    }
    const sec = maybe.seconds ?? maybe._seconds
    if (typeof sec === "number") {
      const d = new Date(sec * 1000)
      if (!isNaN(d.getTime())) return d
    }
  }

  if (typeof value !== "string") return null
  const s = value.trim()
  if (!s) return null

  if (isLikelyDocumentIdentifier(s)) return null
  if (/^\d+([.,]\d+)?$/.test(s)) return null
  if (/^3-\d{3}-\d{6}$/.test(s)) return null
  if (/^0\d$/.test(s)) return null

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const normalized = s.includes("T") ? s : s.replace(" ", "T")
    const d = new Date(normalized)
    if (!isNaN(d.getTime())) return d
  }

  const match = s.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  )
  if (match) {
    const day = parseInt(match[1], 10)
    const month = parseInt(match[2], 10) - 1
    const year = parseInt(match[3], 10)
    const hours = match[4] ? parseInt(match[4], 10) : 0
    const minutes = match[5] ? parseInt(match[5], 10) : 0
    const d = new Date(year, month, day, hours, minutes)
    if (!isNaN(d.getTime())) return d
  }

  if (/T\d{2}:\d{2}/.test(s) || /\d{1,2}:\d{2}/.test(s)) {
    const parsed = new Date(s)
    if (!isNaN(parsed.getTime())) return parsed
  }

  return null
}

/** Formatea a DD/MM/YYYY. Usar únicamente en el campo Fecha del bloque document-meta. */
export function formatPdfDateField(value: unknown): string {
  const d = tryParseDate(value)
  if (!d) {
    const raw = coerceRawScalar(value).trim()
    if (!raw) return "—"
    // Último intento: ISO u otros formatos parseables por Date
    const fallback = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"))
    if (!isNaN(fallback.getTime())) {
      const day = String(fallback.getDate()).padStart(2, "0")
      const month = String(fallback.getMonth() + 1).padStart(2, "0")
      const year = fallback.getFullYear()
      return `${day}/${month}/${year}`
    }
    return raw
  }

  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function formatEconomicActivity(value: unknown): string {
  if (value == null || value === "") return "—"
  if (typeof value === "string") return value
  if (typeof value === "object") {
    const o = value as Record<string, unknown>
    const codigo = o.codigo ?? o.code
    const descripcion = o.descripcion ?? o.description
    if (codigo && descripcion) return `${codigo} - ${descripcion}`
    if (codigo) return String(codigo)
    if (descripcion) return String(descripcion)
  }
  return formatPdfTextValue(value)
}

/** Texto plano sin formateo de fecha — para todos los campos excepto Fecha. */
export function formatPdfTextValue(value: unknown): string {
  if (value == null || value === "") return "—"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object") {
    const o = value as Record<string, unknown>
    if (typeof o.toDate === "function" || typeof o.seconds === "number") {
      return coerceRawScalar(value) || "—"
    }
    const codigo = o.codigo ?? o.code
    const descripcion = o.descripcion ?? o.description
    if (codigo && descripcion) return `${codigo} - ${descripcion}`
    if (codigo) return String(codigo)
    if (descripcion) return String(descripcion)
    if (typeof o.numero === "string" || typeof o.numero === "number") return String(o.numero)
  }
  return String(value)
}

export function resolveConsecutivoDisplay(
  invoice: Record<string, unknown>,
  haciendaResponse?: Record<string, unknown> | null
): string {
  const clave = String(invoice.clave || haciendaResponse?.clave || "")
  const fromClave = clave.length >= 41 ? clave.substring(21, 41) : ""

  const raw = invoice.consecutivo ?? invoice.number
  if (raw == null || raw === "") return fromClave || "—"

  if (typeof raw === "object" && raw !== null) {
    const o = raw as Record<string, unknown>
    if (typeof o.toDate === "function" || typeof o.seconds === "number") {
      return fromClave || "—"
    }
  }

  const text = formatPdfTextValue(raw)
  return text === "—" ? fromClave || "—" : text || fromClave || "—"
}
