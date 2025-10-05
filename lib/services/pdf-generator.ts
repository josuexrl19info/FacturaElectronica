import html2pdf from 'html2pdf.js'

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
      // Crear un elemento temporal para renderizar el PDF
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '210mm' // A4 width
      tempDiv.style.minHeight = '297mm' // A4 height
      
      document.body.appendChild(tempDiv)

      // Importar dinámicamente el template
      const { InvoicePDFTemplate } = await import('@/components/pdf/invoice-pdf-template')
      
      // Renderizar el template en el elemento temporal
      const { createElement } = await import('react')
      const { createRoot } = await import('react-dom/client')
      
      const root = createRoot(tempDiv)
      root.render(createElement(InvoicePDFTemplate, { data: invoiceData }))

      // Esperar un momento para que se renderice
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Configuración para html2pdf
      const options = {
        margin: 10,
        filename: filename || `Factura_${invoiceData.number}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        }
      }

      // Generar y descargar el PDF
      await html2pdf().set(options).from(tempDiv).save()

      // Limpiar el elemento temporal
      root.unmount()
      document.body.removeChild(tempDiv)

    } catch (error) {
      console.error('Error al generar PDF:', error)
      throw new Error('Error al generar el PDF de la factura')
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
      const dateObj = typeof date === 'string' ? new Date(date) : date
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
