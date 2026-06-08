"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Download, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import {
  buildInvoicePdfApiPayload,
  detectDocumentTypeLabel,
  downloadPdfBlob,
  fetchInvoicePdfFromApi,
  getPdfFilenameFromInvoice,
} from "@/lib/services/invoice-pdf-client"

export default function InvoicePreviewPage() {
  const searchParams = useSearchParams()
  const invoiceId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [documentLabel, setDocumentLabel] = useState("Documento")
  const [consecutivo, setConsecutivo] = useState("")
  const [invoiceRecord, setInvoiceRecord] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!invoiceId) {
      setError("No se especificó un documento para previsualizar")
      setLoading(false)
      return
    }

    let objectUrl: string | null = null

    const loadPreview = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/invoices/get-by-id?id=${invoiceId}`)
        if (!response.ok) throw new Error("Error al obtener datos del documento")

        const data = await response.json()
        if (!data.success) throw new Error(data.error || "Error al cargar datos")

        const invoice = data.invoice as Record<string, unknown>
        const company = data.company as Record<string, unknown> | null
        const client = data.client as Record<string, unknown> | null

        setInvoiceRecord(invoice)
        setDocumentLabel(detectDocumentTypeLabel(invoice))
        setConsecutivo(String(invoice.consecutivo || ""))

        const payload = buildInvoicePdfApiPayload(invoice, company, client)
        const { blob } = await fetchInvoicePdfFromApi(payload)

        objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
        setPdfBlob(blob)
        setLoading(false)
      } catch (err) {
        console.error("Error al generar vista previa:", err)
        setError(err instanceof Error ? err.message : "Error al generar la vista previa")
        setLoading(false)
      }
    }

    loadPreview()

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [invoiceId])

  const handleDownloadPDF = async () => {
    if (!pdfBlob || !invoiceRecord) {
      toast({
        title: "Error",
        description: "No hay PDF disponible para descargar",
        variant: "destructive",
      })
      return
    }

    try {
      downloadPdfBlob(pdfBlob, getPdfFilenameFromInvoice(invoiceRecord))
      toast({
        title: "Éxito",
        description: "PDF descargado correctamente",
      })
    } catch (err) {
      console.error("Error al descargar PDF:", err)
      toast({
        title: "Error",
        description: "Error al descargar el PDF",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Generando vista previa del PDF...</p>
        </div>
      </div>
    )
  }

  if (error || !previewUrl) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "No se pudo generar la vista previa"}</p>
          <Button asChild>
            <Link href="/dashboard/documents">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Documentos
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/documents">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold">Vista Previa — {documentLabel}</h1>
              <p className="text-sm text-muted-foreground">
                {consecutivo ? `No. ${consecutivo}` : "Documento electrónico"}
              </p>
            </div>
          </div>
          <Button onClick={handleDownloadPDF} className="gap-2 gradient-primary text-white">
            <Download className="w-4 h-4" />
            Descargar PDF
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ minHeight: "80vh" }}>
          <iframe
            src={previewUrl}
            title="Vista previa del PDF"
            className="w-full border-0"
            style={{ minHeight: "80vh" }}
          />
        </div>
      </div>
    </div>
  )
}
