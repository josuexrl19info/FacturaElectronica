"use client"

import { useRef } from "react"
import { InvoicePDFTemplate } from "@/components/pdf/invoice-pdf-template"
import { Button } from "@/components/ui/button"
import { Download, ArrowLeft } from "lucide-react"
import Link from "next/link"

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

  const handleDownloadPDF = () => {
    console.log("[v0] Downloading PDF...")
    // Implement PDF generation logic using html2pdf or similar
    alert("Función de descarga PDF en desarrollo")
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
              <p className="text-sm text-muted-foreground">Factura No. {mockInvoiceData.number}</p>
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
          <InvoicePDFTemplate ref={pdfRef} data={mockInvoiceData} />
        </div>
      </div>
    </div>
  )
}
