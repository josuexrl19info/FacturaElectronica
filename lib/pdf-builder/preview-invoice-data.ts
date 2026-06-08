import { PDF_MOCK_INVOICE } from "@/lib/pdf-builder/mock-invoice-data"
import type { PdfMockInvoiceData } from "@/lib/pdf-builder/types"

function extractLogoFromCompany(company: Record<string, unknown>): string | undefined {
  const logo = company.logo
  if (!logo) return undefined
  if (typeof logo === "string") return logo
  if (typeof logo === "object" && logo !== null) {
    const l = logo as Record<string, unknown>
    const data = l.fileData || l.filedata || l.url
    return typeof data === "string" && data.length > 0 ? data : undefined
  }
  return undefined
}

function buildAddress(company: Record<string, unknown>): string {
  const parts = [
    company.provincia,
    company.canton,
    company.distrito,
    company.address,
    company.direccion,
    company.otrasSenas,
  ]
    .filter(Boolean)
    .map(String)
  return parts.length > 0 ? parts.join(", ") : PDF_MOCK_INVOICE.company.address
}

/** Vista previa: emisor real de la empresa seleccionada, receptor y líneas dummy */
export function buildPreviewInvoiceData(company: Record<string, unknown> | null | undefined): PdfMockInvoiceData {
  if (!company) return PDF_MOCK_INVOICE

  const name = String(company.name || company.nombre || PDF_MOCK_INVOICE.company.name)
  const commercialName = String(
    company.nombreComercial || company.commercialName || company.name || PDF_MOCK_INVOICE.company.commercialName
  )

  return {
    ...PDF_MOCK_INVOICE,
    company: {
      name,
      commercialName,
      id: String(
        company.identification ||
          company.cedula ||
          company.numeroIdentificacion ||
          company.taxId ||
          PDF_MOCK_INVOICE.company.id
      ),
      phone: String(company.phone || company.telefono || company.numeroTelefono || PDF_MOCK_INVOICE.company.phone),
      email: String(company.email || company.correo || company.correoElectronico || PDF_MOCK_INVOICE.company.email),
      address: buildAddress(company),
      logo: extractLogoFromCompany(company),
    },
  }
}

export function companyLogoDataUrl(logo?: string): string | null {
  if (!logo) return null
  if (logo.startsWith("data:image")) return logo
  return `data:image/png;base64,${logo.replace(/^data:image\/\w+;base64,/, "")}`
}
