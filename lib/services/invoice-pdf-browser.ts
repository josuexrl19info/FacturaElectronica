import type { InvoicePdfTemplate } from "@/lib/pdf-builder/types"

const PAGE_MM = {
  a4: { w: 210, h: 297 },
  letter: { w: 216, h: 279 },
} as const

/** Fallback en navegador: html2canvas + jsPDF dentro de iframe aislado (sin estilos oklch de la app). */
export async function convertInvoiceHtmlToPdfBlob(
  html: string,
  pageSize: InvoicePdfTemplate["pageSize"]
): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ])

  const page = PAGE_MM[pageSize === "letter" ? "letter" : "a4"]

  const iframe = document.createElement("iframe")
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;visibility:hidden"
  document.body.appendChild(iframe)

  try {
    iframe.srcdoc = html
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("Timeout cargando HTML del PDF")), 20000)
      iframe.onload = () => {
        window.clearTimeout(timer)
        resolve()
      }
    })

    const doc = iframe.contentDocument
    const root = doc?.documentElement
    const body = doc?.body
    if (!doc || !root || !body) throw new Error("No se pudo renderizar el HTML de la factura")

    const canvas = await html2canvas(body, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      width: root.scrollWidth,
      height: root.scrollHeight,
      windowWidth: root.scrollWidth,
      windowHeight: root.scrollHeight,
      window: iframe.contentWindow ?? undefined,
      onclone: (clonedDoc) => {
        clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((node) => node.remove())
        clonedDoc.querySelectorAll("style").forEach((styleEl) => {
          if (styleEl.textContent?.includes("oklch")) {
            styleEl.textContent = styleEl.textContent.replace(/oklch\([^)]+\)/g, "#111827")
          }
        })
      },
    })

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: pageSize === "letter" ? "letter" : "a4",
    })

    const imgData = canvas.toDataURL("image/jpeg", 0.98)
    const imgWidth = page.w
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight, undefined, "FAST")

    return pdf.output("blob")
  } finally {
    iframe.remove()
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.split(",")[1] || "")
    }
    reader.onerror = () => reject(new Error("No se pudo codificar el PDF"))
    reader.readAsDataURL(blob)
  })
}
