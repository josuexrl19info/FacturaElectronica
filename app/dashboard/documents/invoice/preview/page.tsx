"use client"

import { useRef, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { InvoicePDFTemplate } from "@/components/pdf/invoice-pdf-template"
import { Button } from "@/components/ui/button"
import { Download, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { PDFGeneratorService, PDFInvoiceData } from "@/lib/services/pdf-generator"
import { toast } from "@/hooks/use-toast"

// Mock data for preview
const mockInvoiceData = {
  number: "FE-001-00000001",
  key: "50601012025011512345678901234567890123456789012",
  date: "15/01/2025",
  dueDate: "15/02/2025",
  company: {
    name: "Tech Solutions CR",
    id: "3-101-123456",
    phone: "+506 2222-3333",
    email: "info@techsolutions.cr",
    address: "San José, Costa Rica, Avenida Central, Edificio 123",
    logo: "/tech-company-logo.jpg",
  },
  client: {
    name: "Empresa ABC S.A.",
    id: "3-101-654321",
    phone: "+506 2222-4444",
    email: "contacto@empresaabc.cr",
    address: "Heredia, Costa Rica, Calle 5",
  },
  items: [
    {
      description: "Desarrollo de Software Personalizado",
      quantity: 1,
      unitPrice: 500000,
      discount: 0,
      tax: 65000,
      total: 565000,
    },
    {
      description: "Soporte Técnico Mensual",
      quantity: 3,
      unitPrice: 50000,
      discount: 15000,
      tax: 19500,
      total: 154500,
    },
    {
      description: "Licencia de Software Anual",
      quantity: 5,
      unitPrice: 25000,
      discount: 12500,
      tax: 16250,
      total: 128750,
    },
  ],
  subtotal: 650000,
  totalDiscount: 27500,
  totalTax: 100750,
  totalExempt: 0,
  total: 723250,
  notes:
    "Pago a realizar mediante transferencia bancaria. Cuenta IBAN: CR12345678901234567890. Gracias por su preferencia.",
}

export default function InvoicePreviewPage() {
  const pdfRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const [invoiceData, setInvoiceData] = useState<PDFInvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Obtener ID de la factura desde los parámetros de URL
  const invoiceId = searchParams.get('id')

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceData(invoiceId)
    } else {
      // Usar datos mock si no hay ID
      setInvoiceData(mockInvoiceData as PDFInvoiceData)
      setLoading(false)
    }
  }, [invoiceId])

  const loadInvoiceData = async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      // Obtener datos de la factura desde la API
      const response = await fetch(`/api/invoices/get-by-id?id=${id}`)
      
      if (!response.ok) {
        throw new Error('Error al obtener datos de la factura')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Error al cargar datos')
      }


      // Convertir datos de Firestore a formato PDF
      const pdfData = PDFGeneratorService.convertInvoiceToPDFData(
        data.invoice,
        data.company,
        data.client
      )


      setInvoiceData(pdfData)
      setLoading(false)
    } catch (err) {
      console.error('Error al cargar datos de la factura:', err)
      setError('Error al cargar los datos de la factura')
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!invoiceData) {
      toast({
        title: "Error",
        description: "No hay datos de factura disponibles",
        variant: "destructive"
      })
      return
    }

    try {
      await PDFGeneratorService.generateAndDownloadPDF(
        invoiceData, 
        `Factura_${invoiceData.number}.pdf`
      )
      
      toast({
        title: "Éxito",
        description: "PDF descargado correctamente",
      })
    } catch (error) {
      console.error('Error al generar PDF:', error)
      toast({
        title: "Error",
        description: "Error al generar el PDF",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos de la factura...</p>
        </div>
      </div>
    )
  }

  if (error || !invoiceData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'No se encontraron datos de la factura'}</p>
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
              <h1 className="text-xl font-bold">Vista Previa de Factura</h1>
              <p className="text-sm text-muted-foreground">Factura No. {invoiceData.number}</p>
            </div>
          </div>
          <Button onClick={handleDownloadPDF} className="gap-2 gradient-primary text-white">
            <Download className="w-4 h-4" />
            Descargar PDF
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <InvoicePDFTemplate ref={pdfRef} data={invoiceData} />
        </div>
      </div>
    </div>
  )
}
