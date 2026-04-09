import { NextRequest, NextResponse } from "next/server"
import { decodeOAuthState } from "@/lib/services/nylas-state"
import { NylasService } from "@/lib/services/nylas-service"
import { InvoiceReceptionService } from "@/lib/services/invoice-reception-service"

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL || "http://localhost:3000"
  const renderPopupResponse = (status: "success" | "error", message: string) => {
    const safeMessage = JSON.stringify(message)
    const safeStatus = JSON.stringify(status)
    const safeAppUrl = JSON.stringify(appUrl)
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>OAuth Nylas</title>
  </head>
  <body style="font-family: Arial, sans-serif; padding: 16px;">
    <p>${status === "success" ? "Conectando cuenta..." : "No fue posible completar la conexión."}</p>
    <script>
      (function () {
        try {
          var payload = { type: "NYLAS_OAUTH_RESULT", status: ${safeStatus}, message: ${safeMessage} };
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, ${safeAppUrl});
            window.close();
            return;
          }
        } catch (e) {}
        window.location.href = ${safeAppUrl} + "/dashboard/acceptance-invoices?oauth=" + ${safeStatus};
      })();
    </script>
  </body>
</html>`
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  }

  try {
    const code = request.nextUrl.searchParams.get("code") || ""
    const state = request.nextUrl.searchParams.get("state") || ""
    if (!code || !state) {
      return renderPopupResponse("error", "Faltan parametros OAuth")
    }

    const decoded = decodeOAuthState(state)
    const { grantId } = await NylasService.exchangeCodeForGrant(code)
    await InvoiceReceptionService.upsertOAuthGrant(decoded.companyId, grantId, {
      email: decoded.receptionEmail,
      provider: decoded.provider,
    })
    if (decoded.popup) {
      return renderPopupResponse("success", "Conexion OAuth completada")
    }
    return NextResponse.redirect(`${appUrl}/dashboard/acceptance-invoices?oauth=success`)
  } catch (error) {
    console.error("❌ Error en callback OAuth Nylas:", error)
    const message = error instanceof Error ? error.message : "Error OAuth"
    return renderPopupResponse("error", message)
  }
}
