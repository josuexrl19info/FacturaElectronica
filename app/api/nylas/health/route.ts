import { NextResponse } from "next/server"
import { NylasService } from "@/lib/services/nylas-service"

export async function GET() {
  try {
    const result = await NylasService.healthCheck()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error de salud Nylas",
      },
      { status: 500 }
    )
  }
}
