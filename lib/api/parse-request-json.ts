import type { NextRequest } from "next/server"

export class InvalidJsonBodyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InvalidJsonBodyError"
  }
}

/** Parsea el body JSON de una API route con mensajes claros si el payload es inválido. */
export async function parseRequestJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  const raw = await request.text()

  if (!raw.trim()) {
    throw new InvalidJsonBodyError("El cuerpo de la solicitud está vacío")
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new InvalidJsonBodyError("Se esperaba un objeto JSON con invoice, company y client")
    }
    return parsed as Record<string, unknown>
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) throw error
    const preview = raw.slice(0, 80).replace(/\s+/g, " ")
    console.error("❌ JSON inválido en request:", preview)
    throw new InvalidJsonBodyError(
      error instanceof Error ? error.message : "Formato JSON inválido en el cuerpo de la solicitud"
    )
  }
}
