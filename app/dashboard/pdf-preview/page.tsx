import { InvoicePDFTemplate } from "@/components/pdf/invoice-pdf-template"

export default function PdfPreviewPage() {
  // Mock data for preview
  const mockInvoice = {
    number: "FE-001-00000123",
    key: "50621011800012345678901234567890123456789012",
    date: "2024-01-15",
    dueDate: "2024-02-15",
    company: {
      name: "TechCorp CR",
      id: "3-101-123456",
      email: "info@techcorp.cr",
      phone: "+506 2222-3333",
      address: "San José, Costa Rica",
    },
    client: {
      name: "Cliente Ejemplo S.A.",
      id: "3-101-654321",
      email: "cliente@ejemplo.cr",
      phone: "+506 8888-9999",
      address: "Heredia, Costa Rica",
    },
    items: [
      {
        description: "Servicio de Desarrollo Web",
        quantity: 1,
        unitPrice: 500000,
        discount: 0,
        tax: 65000,
        total: 565000,
      },
      {
        description: "Hosting Anual",
        quantity: 1,
        unitPrice: 120000,
        discount: 12000,
        tax: 14040,
        total: 122040,
      },
    ],
    subtotal: 608000,
    totalDiscount: 12000,
    totalTax: 79040,
    totalExempt: 0,
    total: 687040,
    notes: "Gracias por su preferencia. Pago mediante transferencia bancaria.",
  }

  return (
    <div className="min-h-screen bg-muted/30 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient">Vista Previa de PDF</h1>
            <p className="text-muted-foreground mt-1">Esta es la plantilla que se usará para generar las facturas</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border">
          <InvoicePDFTemplate data={mockInvoice} />
        </div>
      </div>
    </div>
  )
}
