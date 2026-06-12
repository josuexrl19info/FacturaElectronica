// Importaciones removidas para evitar problemas de compatibilidad

export interface PDFInvoiceData {
  number: string
  key: string
  date: string
  dueDate?: string
  company: {
    name: string
    id: string
    phone: string
    email: string
    address: string
    logo?: string
  }
  client: {
    name: string
    id: string
    phone?: string
    email?: string
    address?: string
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    discount: number
    tax: number
    total: number
  }>
  subtotal: number
  totalDiscount: number
  totalTax: number
  totalExempt: number
  total: number
  notes?: string
}

export class PDFGeneratorService {
  /**
   * Genera y descarga un PDF de factura
   * @param invoiceData - Datos de la factura
   * @param filename - Nombre del archivo (opcional)
   */
  static async generateAndDownloadPDF(
    invoiceData: PDFInvoiceData,
    filename?: string
  ): Promise<void> {
    try {
      const { buildInvoicePdfApiPayload, downloadPdfBlob, fetchInvoicePdfFromApi } = await import(
        "./invoice-pdf-client"
      )

      let company: Record<string, unknown> = {
        name: invoiceData.company.name,
        identification: invoiceData.company.id,
        phone: invoiceData.company.phone,
        email: invoiceData.company.email,
        address: invoiceData.company.address,
        logo: invoiceData.company.logo,
      }

      try {
        const stored = localStorage.getItem("selectedCompanyData")
        if (stored) {
          const storedCompany = JSON.parse(stored) as Record<string, unknown>
          company = { ...storedCompany, ...company }
        }
      } catch {
        // ignore
      }

      const invoice = {
        consecutivo: invoiceData.number,
        clave: invoiceData.key,
        fechaEmision: invoiceData.date,
        items: invoiceData.items.map((item) => ({
          detalle: item.description,
          cantidad: item.quantity,
          precioUnitario: item.unitPrice,
          descuento: item.discount,
          montoTotalLinea: item.total,
        })),
        subtotal: invoiceData.subtotal,
        totalDescuento: invoiceData.totalDiscount,
        totalImpuesto: invoiceData.totalTax,
        totalExento: invoiceData.totalExempt,
        total: invoiceData.total,
        notes: invoiceData.notes,
      }

      const client = {
        name: invoiceData.client.name,
        identification: invoiceData.client.id,
        phone: invoiceData.client.phone,
        email: invoiceData.client.email,
        address: invoiceData.client.address,
      }

      const payload = buildInvoicePdfApiPayload(invoice, company, client)
      const { blob } = await fetchInvoicePdfFromApi(payload)
      downloadPdfBlob(blob, filename || `Factura_${invoiceData.number}`)
    } catch (error) {
      console.error("Error al generar PDF:", error)
      throw new Error("Error al generar el PDF de la factura")
    }
  }

  /**
   * Genera un PDF en base64 (para uso en servidor)
   * @param invoiceData - Datos de la factura
   * @returns Promise<string> - PDF en base64
   */
  static async generatePDFAsBase64(invoiceData: PDFInvoiceData): Promise<string> {
    try {
      console.log("📄 Generando PDF final optimizado en base64 para:", invoiceData.number)

      const { buildInvoicePdfApiPayload } = await import("./invoice-pdf-client")
      const { generateInvoicePdfBase64 } = await import("./invoice-pdf-server")

      const invoice = {
        consecutivo: invoiceData.number,
        clave: invoiceData.key,
        fechaEmision: invoiceData.date,
        items: invoiceData.items.map((item) => ({
          detalle: item.description,
          cantidad: item.quantity,
          precioUnitario: item.unitPrice,
          descuento: item.discount,
          impuestoNeto: item.tax,
          montoTotalLinea: item.total,
        })),
        subtotal: invoiceData.subtotal,
        totalDescuento: invoiceData.totalDiscount,
        totalImpuesto: invoiceData.totalTax,
        totalExento: invoiceData.totalExempt,
        total: invoiceData.total,
        notes: invoiceData.notes,
      }

      const company = {
        name: invoiceData.company.name,
        identification: invoiceData.company.id,
        phone: invoiceData.company.phone,
        email: invoiceData.company.email,
        address: invoiceData.company.address,
        logo: invoiceData.company.logo,
      }

      const client = {
        name: invoiceData.client.name,
        identification: invoiceData.client.id,
        phone: invoiceData.client.phone,
        email: invoiceData.client.email,
        address: invoiceData.client.address,
      }

      const payload = buildInvoicePdfApiPayload(invoice, company, client)
      const result = await generateInvoicePdfBase64(payload.invoice, {
        company: payload.company,
        client: payload.client,
      })

      if (!result.base64) {
        throw new Error(result.reason || "PDF no disponible en este entorno")
      }

      console.log("✅ PDF final optimizado generado en base64:", result.base64.length, "caracteres")
      return result.base64
    } catch (error) {
      console.error("❌ Error al generar PDF final optimizado en base64:", error)
      throw new Error("Error al generar PDF final optimizado en base64")
    }
  }

  /**
   * Verifica si una cadena es un Base64 válido
   * @param str - Cadena a verificar
   * @returns true si es Base64 válido
   */
  static isValidBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str
    } catch (err) {
      return false
    }
  }

  /**
   * Convierte datos de Invoice (Firestore) a PDFInvoiceData
   * @param invoice - Datos de la factura desde Firestore
   * @param companyData - Datos de la empresa
   * @param clientData - Datos del cliente
   * @returns Datos formateados para el PDF
   */
  static convertInvoiceToPDFData(
    invoice: any,
    companyData: any,
    clientData: any
  ): PDFInvoiceData {
    // Formatear fecha
    const formatDate = (date: any) => {
      if (!date) return 'N/A'
      
      let dateObj: Date
      if (typeof date === 'string') {
        dateObj = new Date(date)
      } else if (date instanceof Date) {
        dateObj = date
      } else if (date.toDate && typeof date.toDate === 'function') {
        // Para objetos Timestamp de Firestore
        dateObj = date.toDate()
      } else {
        // Intentar convertir cualquier otro tipo
        dateObj = new Date(date)
      }
      
      // Verificar que la fecha sea válida
      if (isNaN(dateObj.getTime())) {
        console.warn('⚠️ Fecha inválida recibida:', date)
        return new Date().toLocaleDateString('es-CR')
      }
      
      return dateObj.toLocaleDateString('es-CR')
    }

    // Manejar logo de la empresa
    let logoUrl = null
    if (companyData?.logo?.fileData) {
      // Si es Base64 puro, agregar el prefijo data URL
      if (companyData.logo.fileData.startsWith('data:')) {
        logoUrl = companyData.logo.fileData
      } else if (this.isValidBase64(companyData.logo.fileData)) {
        // Si es Base64 válido sin prefijo, agregar prefijo de imagen
        logoUrl = `data:image/png;base64,${companyData.logo.fileData}`
      } else {
        console.warn('⚠️ Logo fileData no es Base64 válido')
      }
    } else if (companyData?.logo && typeof companyData.logo === 'string') {
      // Si es un string directo
      if (companyData.logo.startsWith('data:')) {
        logoUrl = companyData.logo
      } else if (companyData.logo.startsWith('http')) {
        logoUrl = companyData.logo
      }
    } else if (companyData?.logoUrl) {
      logoUrl = companyData.logoUrl
    }

    // Asegurar que el logo siempre tenga el prefijo correcto
    if (logoUrl && !logoUrl.startsWith('data:') && !logoUrl.startsWith('http') && !logoUrl.startsWith('/')) {
      logoUrl = `data:image/png;base64,${logoUrl}`
    }

    // Optimizar logo si es muy grande
    if (logoUrl && logoUrl.startsWith('data:image')) {
      try {
        const base64Data = logoUrl.replace(/^data:image\/[a-z]+;base64,/, '');
        const logoSize = Buffer.byteLength(base64Data, 'utf8');
        const logoSizeMB = logoSize / (1024 * 1024);

        console.log(`📸 Logo detectado: ${logoSizeMB.toFixed(2)} MB`);

        // Si el logo es muy grande (> 500 KB), omitirlo para reducir tamaño del PDF
        if (logoSizeMB > 0.5) {
          console.warn(`⚠️ Logo demasiado grande (${logoSizeMB.toFixed(2)} MB), omitiendo para reducir tamaño del PDF`);
          logoUrl = undefined;
        } else {
          console.log(`✅ Logo de tamaño aceptable (${logoSizeMB.toFixed(2)} MB)`);
        }
      } catch (error) {
        console.warn('⚠️ Error procesando logo, omitiendo:', error);
        logoUrl = undefined;
      }
    }

    console.log('🔍 DEBUG PDF Generator - Logo processed:', logoUrl ? 'SUCCESS' : 'NULL')

    // Formatear items
    const items = invoice.items?.map((item: any) => ({
      description: item.detalle || item.description || 'Producto/Servicio',
      quantity: item.cantidad || 1,
      unitPrice: item.precioUnitario || item.unitPrice || 0,
      discount: item.descuento || item.discount || 0,
      tax: item.impuestoNeto || item.tax || 0,
      total: item.montoTotalLinea || item.total || 0
    })) || []

    return {
      number: invoice.consecutivo || invoice.number || 'N/A',
      key: invoice.haciendaSubmission?.clave || invoice.key || 'N/A',
      date: formatDate(invoice.createdAt || invoice.date),
      dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : undefined,
      company: {
        name: companyData.nombreComercial || companyData.name || 'Empresa',
        id: companyData.identification || companyData.id || 'N/A',
        phone: companyData.phone || 'N/A',
        email: companyData.email || 'N/A',
        address: companyData.address || 'N/A',
        logo: logoUrl
      },
      client: {
        name: clientData.name || clientData.nombre || 'Cliente',
        id: clientData.identification || clientData.id || 'N/A',
        phone: clientData.phone || clientData.telefono,
        email: clientData.email || clientData.correo,
        address: clientData.address || clientData.direccion
      },
      items,
      subtotal: invoice.subtotal || 0,
      totalDiscount: invoice.totalDescuento || 0,
      totalTax: invoice.totalImpuesto || 0,
      totalExempt: 0, // Por ahora 0, se puede calcular si es necesario
      total: invoice.total || 0,
      notes: invoice.notes || invoice.notas
    }
  }
}
