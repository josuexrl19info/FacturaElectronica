import { NextRequest, NextResponse } from "next/server"
import { InvoiceReceptionService } from "@/lib/services/invoice-reception-service"
import { encodeOAuthState } from "@/lib/services/nylas-state"
import { NylasService } from "@/lib/services/nylas-service"

async function resolveCompanyId(request: NextRequest): Promise<string> {
  if (request.method === "GET") {
    return String(request.nextUrl.searchParams.get("companyId") || "").trim()
  }
  const body = await request.json()
  return String(body?.companyId || "").trim()
}

async function handleStart(request: NextRequest) {
  try {
    const companyId = await resolveCompanyId(request)
    if (!companyId) {
      return NextResponse.json({ error: "companyId es requerido" }, { status: 400 })
    }

    const config = await InvoiceReceptionService.getConfig(companyId)
    if (!config?.email || !config.provider) {
      return NextResponse.json(
        { error: "Debe guardar primero el correo de recepcion antes de conectar Nylas." },
        { status: 400 }
      )
    }

    const state = encodeOAuthState({
      companyId,
      receptionEmail: config.email,
      provider: config.provider,
      popup: true,
    })

    const oauthUrl = NylasService.buildOAuthUrl({
      provider: config.provider,
      state,
      loginHint: config.email,
    })

    if (request.method === "GET") {
      return NextResponse.redirect(oauthUrl)
    }

    return NextResponse.json({ success: true, oauthUrl })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error iniciando OAuth" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return handleStart(request)
}

export async function POST(request: NextRequest) {
  return handleStart(request)
}
