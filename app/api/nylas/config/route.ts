import { NextRequest, NextResponse } from "next/server"
import { InvoiceReceptionService } from "@/lib/services/invoice-reception-service"
import { NylasService } from "@/lib/services/nylas-service"

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId")
    if (!companyId) {
      return NextResponse.json({ error: "companyId es requerido" }, { status: 400 })
    }

    const config = await InvoiceReceptionService.getConfig(companyId)
    return NextResponse.json({ success: true, config })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error cargando configuracion" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const companyId = String(body?.companyId || "").trim()
    const email = String(body?.email || "").trim().toLowerCase()
    if (!companyId || !email.includes("@")) {
      return NextResponse.json({ error: "companyId y email son requeridos" }, { status: 400 })
    }

    const providerDetection = await NylasService.detectReceptionProvider(email)
    const current = await InvoiceReceptionService.getConfig(companyId)
    const emailChanged = current?.email && current.email !== email
    const providerChanged = current?.provider && current.provider !== providerDetection.provider

    await InvoiceReceptionService.saveConfig(companyId, {
      email,
      provider: providerDetection.provider,
      providerType: providerDetection.providerType,
      providerLabel: providerDetection.providerLabel,
      providerDetected: providerDetection.detected,
      nylas:
        emailChanged || providerChanged
          ? {
              connected: false,
              grantId: undefined,
              connectedAt: undefined,
              lastSyncAt: undefined,
            }
          : current?.nylas || {
              connected: false,
            },
    })

    return NextResponse.json({
      success: true,
      provider: providerDetection.provider,
      providerType: providerDetection.providerType,
      providerLabel: providerDetection.providerLabel,
      detected: providerDetection.detected,
      confidence: providerDetection.confidence,
      source: providerDetection.source,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error guardando configuracion" },
      { status: 500 }
    )
  }
}
