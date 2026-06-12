import type { InvoicePdfTemplate } from "@/lib/pdf-builder/types"

/** Convierte el HTML de la plantilla a PDF usando el motor del navegador (mismo diseño que Puppeteer). */
export async function convertInvoiceHtmlToPdfBlob(
  html: string,
  pageSize: InvoicePdfTemplate["pageSize"]
): Promise<Blob> {
  const html2pdf = (await import("html2pdf.js")).default
  const format = pageSize === "letter" ? "letter" : "a4"

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

    const body = iframe.contentDocument?.body
    if (!body) throw new Error("No se pudo renderizar el HTML de la factura")

    return (await html2pdf()
      .set({
        margin: 0,
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
        jsPDF: { unit: "mm", format, orientation: "portrait" },
      })
      .from(body)
      .outputPdf("blob")) as Blob
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
