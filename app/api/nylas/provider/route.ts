import { NextRequest, NextResponse } from "next/server"
import { NylasService } from "@/lib/services/nylas-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body?.email || "").trim().toLowerCase()
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalido" }, { status: 400 })
    }

    const result = await NylasService.detectReceptionProvider(email)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo detectar proveedor" },
      { status: 500 }
    )
  }
}
