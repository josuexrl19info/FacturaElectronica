import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get("challenge")
  if (challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ success: true, message: "Nylas webhook listo" })
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    // TODO: validar firma del webhook de Nylas para entorno productivo.
    return NextResponse.json({ success: true, received: true, event: payload?.type || null })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Webhook payload invalido" }, { status: 400 })
  }
}
