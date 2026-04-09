import { NextRequest, NextResponse } from "next/server"
import { InvoiceReceptionService } from "@/lib/services/invoice-reception-service"
import { NylasService } from "@/lib/services/nylas-service"
import { buildCandidateFromMessage } from "@/lib/services/nylas-message-processor"
import { buildUniqueFiscalId } from "@/lib/services/nylas-utils"

const COSTA_RICA_OFFSET_HOURS = 6 // America/Costa_Rica = UTC-6

function parseYmd(value?: string | null): { year: number; month: number; day: number } | null {
  const raw = String(value || "").trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function getCostaRicaTodayParts(): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(new Date())
  const year = Number(parts.find((part) => part.type === "year")?.value || "0")
  const month = Number(parts.find((part) => part.type === "month")?.value || "0")
  const day = Number(parts.find((part) => part.type === "day")?.value || "0")
  return { year, month, day }
}

function buildCostaRicaDayStartUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, COSTA_RICA_OFFSET_HOURS, 0, 0, 0))
}

function buildCostaRicaDayEndUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day + 1, COSTA_RICA_OFFSET_HOURS, 0, 0, 0) - 1)
}

function buildCostaRicaMonthRangeUtc(year: number, month: number): { from: Date; to: Date } {
  const from = buildCostaRicaDayStartUtc(year, month, 1)
  const to = new Date(Date.UTC(year, month, 1, COSTA_RICA_OFFSET_HOURS, 0, 0, 0) - 1)
  return { from, to }
}

function resolveRange(params: URLSearchParams): { from: Date | null; to: Date | null } {
  const mode = params.get("dateMode") || "currentMonth"
  const crToday = getCostaRicaTodayParts()

  if (mode === "previousMonth") {
    const previousMonth = crToday.month === 1 ? 12 : crToday.month - 1
    const previousYear = crToday.month === 1 ? crToday.year - 1 : crToday.year
    return buildCostaRicaMonthRangeUtc(previousYear, previousMonth)
  }

  if (mode === "range") {
    const fromParts = parseYmd(params.get("fromDate"))
    const toParts = parseYmd(params.get("toDate"))
    const from = fromParts ? buildCostaRicaDayStartUtc(fromParts.year, fromParts.month, fromParts.day) : null
    const to = toParts ? buildCostaRicaDayEndUtc(toParts.year, toParts.month, toParts.day) : null
    return { from, to }
  }

  return buildCostaRicaMonthRangeUtc(crToday.year, crToday.month)
}

function inDateRange(unixSeconds: number, from: Date | null, to: Date | null): boolean {
  const value = new Date(unixSeconds * 1000)
  if (!Number.isFinite(value.getTime())) return true
  if (from && value < from) return false
  if (to && value > to) return false
  return true
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return []
  const workers = Math.max(1, Math.min(concurrency, items.length))
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(Array.from({ length: workers }, () => runWorker()))
  return results
}

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId")
    if (!companyId) {
      return NextResponse.json({ error: "companyId es requerido" }, { status: 400 })
    }

    const config = await InvoiceReceptionService.getConfig(companyId)
    if (!config?.nylas?.grantId || !config.email) {
      return NextResponse.json({
        success: true,
        connected: false,
        messages: [],
      })
    }

    const requestedPageToken = request.nextUrl.searchParams.get("pageToken") || undefined
    const MAX_MESSAGES_SCAN = 1000
    const PAGE_SIZE = 100
    let pageToken: string | undefined = requestedPageToken
    let messages: any[] = []

    // Si viene pageToken explícito, respetamos paginación manual.
    // Si no viene, recorremos páginas para no perder correos del rango elegido.
    if (requestedPageToken) {
      const messageResponse = await NylasService.getMessages({
        grantId: config.nylas.grantId,
        limit: PAGE_SIZE,
        pageToken,
      })
      messages = messageResponse.data || []
      pageToken = messageResponse.next_cursor || undefined
    } else {
      while (messages.length < MAX_MESSAGES_SCAN) {
        const response = await NylasService.getMessages({
          grantId: config.nylas.grantId,
          limit: PAGE_SIZE,
          pageToken,
        })
        const chunk = response.data || []
        messages.push(...chunk)
        pageToken = response.next_cursor || undefined
        if (!pageToken || chunk.length === 0) break
      }
    }

    const { from, to } = resolveRange(request.nextUrl.searchParams)
    const sorted = messages.sort((a, b) => Number(b.date || 0) - Number(a.date || 0))
    const inRange = sorted.filter((message) => inDateRange(Number(message.date || 0), from, to))

    const candidates = await mapWithConcurrency(inRange, 4, async (message) => {
      const candidate = await buildCandidateFromMessage(config.nylas.grantId, message)

      // Clave fiscal consistente con el POST de procesamiento:
      // invalidamos duplicados por `consecutivo-emisor(cedula)`.
      const uniqueValidationId = buildUniqueFiscalId({
        companyId,
        messageId: candidate.messageId,
        consecutivo: candidate.invoiceSummary?.numeroConsecutivo,
        emisorId: candidate.invoiceSummary?.emisorId,
        clave: candidate.invoiceSummary?.clave,
      })

      const alreadyProcessed = await InvoiceReceptionService.existsProcessed(uniqueValidationId)
      return { ...candidate, uniqueValidationId, alreadyProcessed }
    })

    // Omite duplicados funcionales dentro de la misma consulta (consecutivo + cédula emisor).
    const deduplicated = new Map<string, (typeof candidates)[number]>()
    for (const item of candidates) {
      const key = item.uniqueValidationId || item.messageId
      if (!deduplicated.has(key)) {
        deduplicated.set(key, item)
      }
    }

    await InvoiceReceptionService.touchLastSync(companyId)

    return NextResponse.json({
      success: true,
      connected: true,
      provider: config.provider,
      messages: Array.from(deduplicated.values()),
      nextCursor: pageToken || null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? `No se pudieron cargar correos candidatos: ${error.message}`
            : "No se pudieron cargar correos candidatos",
      },
      { status: 500 }
    )
  }
}
