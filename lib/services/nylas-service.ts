import Nylas from "nylas"
import { DetectedProvider } from "@/lib/services/nylas-utils"

type NylasMessage = {
  id: string
  subject?: string
  from?: Array<{ name?: string; email?: string }>
  date?: number
  folders?: string[]
  snippet?: string
  attachments?: Array<{
    id: string
    filename?: string
    content_type?: string
    size?: number
  }>
}

type NylasMessageListResponse = {
  data?: NylasMessage[]
  next_cursor?: string
}

const RETRIABLE_PATTERNS = [
  "fetch failed",
  "connect timeout",
  "und_err_connect_timeout",
  "und_err_socket",
]

function getEnv(name: string, fallback = ""): string {
  const value = process.env[name] || fallback
  return String(value).trim()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetriableError(status: number | undefined, errorText: string): boolean {
  if (status === 429) return true
  const lower = (errorText || "").toLowerCase()
  return RETRIABLE_PATTERNS.some((pattern) => lower.includes(pattern))
}

export class NylasService {
  private static nylasClient: Nylas | null = null

  private static get client(): Nylas {
    if (!NylasService.nylasClient) {
      NylasService.nylasClient = new Nylas({
        apiKey: NylasService.apiKey,
        apiUri: NylasService.apiUri,
      })
    }
    return NylasService.nylasClient
  }

  static get apiKey(): string {
    return getEnv("NYLAS_API_KEY")
  }

  static get clientId(): string {
    return getEnv("NYLAS_CLIENT_ID")
  }

  static get callbackUri(): string {
    return getEnv("NYLAS_CALLBACK_URI")
  }

  static get appUrl(): string {
    return getEnv("APP_URL", "http://localhost:3000")
  }

  static get apiUri(): string {
    return getEnv("NYLAS_API_URI", "https://api.us.nylas.com")
  }

  static getAuthHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${NylasService.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    }
  }

  static ensureConfigured() {
    if (!NylasService.apiKey || !NylasService.clientId || !NylasService.callbackUri) {
      throw new Error("Configuracion Nylas incompleta. Verifique NYLAS_API_KEY, NYLAS_CLIENT_ID y NYLAS_CALLBACK_URI.")
    }
  }

  private static async withRetries<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    let attempt = 0
    let lastError: Error | null = null

    while (attempt <= retries) {
      try {
        return await operation()
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        lastError = new Error(message)
        const retriable = isRetriableError(undefined, message) || message.toLowerCase().includes("429")
        if (retriable && attempt < retries) {
          await sleep(350 * (attempt + 1))
          attempt += 1
          continue
        }
        break
      }
    }

    throw new Error(`No fue posible comunicarse con Nylas. ${lastError?.message || ""}`.trim())
  }

  static buildOAuthUrl(params: {
    provider: DetectedProvider
    state: string
    loginHint?: string
  }): string {
    NylasService.ensureConfigured()
    return NylasService.client.auth.urlForOAuth2({
      clientId: NylasService.clientId,
      redirectUri: NylasService.callbackUri,
      provider: params.provider,
      accessType: "offline",
      state: params.state,
      loginHint: params.loginHint,
    })
  }

  static async exchangeCodeForGrant(code: string): Promise<{ grantId: string; raw: any }> {
    const response = await NylasService.withRetries(async () =>
      NylasService.client.auth.exchangeCodeForToken({
        client_id: NylasService.clientId,
        // SDK espera camelCase; se mantiene fallback por tipos flexibles del runtime.
        clientId: NylasService.clientId,
        code,
        redirectUri: NylasService.callbackUri,
      } as any)
    )

    const grantId =
      response?.grant_id ||
      response?.grantId ||
      response?.id ||
      response?.data?.grant_id ||
      response?.data?.grantId ||
      response?.data?.id ||
      response?.grant?.id

    if (!grantId) {
      throw new Error(`Nylas no devolvio grant_id en el callback OAuth. Respuesta: ${JSON.stringify(response)}`)
    }

    return { grantId: String(grantId), raw: response }
  }

  static async healthCheck(): Promise<{ ok: boolean; provider: string }> {
    await NylasService.withRetries(async () => NylasService.client.applications.getDetails(), 1)
    return { ok: true, provider: "nylas-v3" }
  }

  static async getMessages(params: {
    grantId: string
    limit?: number
    pageToken?: string
  }): Promise<NylasMessageListResponse> {
    const limit = Math.min(Math.max(params.limit || 50, 1), 100)
    const searchQueryNative = "has:attachment (filename:xml OR filename:pdf)"

    const response = await NylasService.withRetries(
      async () =>
        NylasService.client.messages.list({
          identifier: params.grantId,
          queryParams: {
            // Regla Nylas: no mezclar searchQueryNative con filtros extra.
            searchQueryNative,
            limit,
            ...(params.pageToken ? { pageToken: params.pageToken } : {}),
          },
        }),
      2
    )

    return {
      data: (response?.data as any[]) || [],
      next_cursor: (response as any)?.nextCursor || (response as any)?.next_cursor,
    }
  }

  static async getMessage(params: { grantId: string; messageId: string }): Promise<{ data: NylasMessage }> {
    const response = await NylasService.withRetries(
      async () =>
        NylasService.client.messages.find({
          identifier: params.grantId,
          messageId: params.messageId,
        }),
      2
    )
    return { data: response?.data as any }
  }

  static async downloadAttachment(params: {
    grantId: string
    messageId: string
    attachmentId: string
  }): Promise<{ buffer: Buffer; contentType: string }> {
    const buffer = await NylasService.withRetries(
      async () =>
        NylasService.client.attachments.downloadBytes({
          identifier: params.grantId,
          attachmentId: params.attachmentId,
          queryParams: {
            messageId: params.messageId,
          },
        }),
      2
    )

    return {
      buffer: Buffer.from(buffer),
      contentType: "application/octet-stream",
    }
  }
}

export type { NylasMessage, NylasMessageListResponse }
