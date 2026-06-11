import type { PdfMockInvoiceData } from "@/lib/pdf-builder/types"
import { formatPdfCurrency } from "@/lib/pdf-builder/pdf-layout"

export const PDF_MOCK_INVOICE: PdfMockInvoiceData = {
  documentType: "Factura Electrónica",
  consecutivo: "FE-00100001010000000001",
  clave: "50608060600310123456789012345678901234567890123456789012",
  fecha: "08/06/2026 14:30",
  moneda: "Colones (CRC)",
  formaPago: "Transferencia",
  condicionVenta: "Contado",
  company: {
    name: "Innovación Digital CR S.A.",
    commercialName: "InvoSell Demo",
    id: "3-101-234567",
    phone: "+506 2222-3333",
    email: "facturacion@invosell.cr",
    address: "San José, Escazú, Centro Corporativo",
  },
  client: {
    name: "Comercial El Roble S.A.",
    id: "3-102-987654",
    phone: "+506 8888-7777",
    email: "compras@elroble.cr",
    address: "Alajuela, Centro, 200m oeste del parque",
    economicActivity: "Comercio al por mayor",
  },
  items: [
    {
      line: 1,
      cabys: "4321150000100",
      description: "Licencia software facturación electrónica - plan anual",
      qty: 1,
      unit: "Unid",
      unitPrice: 350000,
      discount: 0,
      subtotal: 350000,
    },
    {
      line: 2,
      cabys: "8111220000100",
      description: "Soporte técnico premium mensual",
      qty: 3,
      unit: "Serv",
      unitPrice: 45000,
      discount: 5000,
      subtotal: 130000,
    },
    {
      line: 3,
      cabys: "4323240000100",
      description: "Capacitación presencial equipo administrativo",
      qty: 2,
      unit: "Hora",
      unitPrice: 25000,
      discount: 0,
      subtotal: 50000,
    },
  ],
  subtotal: 530000,
  totalDiscount: 5000,
  totalTax: 68250,
  totalExempt: 0,
  total: 593250,
  notes: "Gracias por su preferencia. Pago a 15 días calendario.",
  legalText:
    "Documento electrónico autorizado por el Ministerio de Hacienda de Costa Rica. " +
    "Autorizado mediante resolución MH-DGT-RES-0027-2024.",
}

export function formatMockCurrency(amount: number): string {
  return formatPdfCurrency(amount, "CRC")
}
