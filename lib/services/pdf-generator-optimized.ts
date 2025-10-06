import jsPDF from 'jspdf'
import sharp from 'sharp'

// Función para optimizar logo desde Firebase (base64 puro) usando Sharp
function optimizeLogoForPDF(logoData: string): Promise<string> {
  return new Promise(async (resolve) => {
    try {
      console.log('🖼️ [PDF] Optimizando logo para el PDF...')
      
      // El logo desde Firebase viene como base64 puro (sin data:image/ prefix)
      const originalSize = Buffer.byteLength(logoData, 'utf8')
      const originalSizeKB = originalSize / 1024
      
      console.log(`🖼️ [PDF] Logo original: ${originalSizeKB.toFixed(0)}KB`)
      
      // Convertir base64 a buffer
      const imageBuffer = Buffer.from(logoData, 'base64')
      
      // Redimensionar a máximo 500x500 píxeles para alta calidad
      const maxSize = 500
      
      // Usar Sharp para optimizar la imagen
      const optimizedBuffer = await sharp(imageBuffer)
        .resize(maxSize, maxSize, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .png({
          quality: 90, // Alta calidad pero comprimido
          compressionLevel: 6 // Balance entre tamaño y calidad
        })
        .toBuffer()
      
      // Convertir de vuelta a base64
      const optimizedBase64 = optimizedBuffer.toString('base64')
      const optimizedSizeKB = Buffer.byteLength(optimizedBase64, 'utf8') / 1024
      
      console.log(`✅ [PDF] Logo optimizado de ${originalSizeKB.toFixed(0)}KB a ${optimizedSizeKB.toFixed(0)}KB`)
      console.log(`📊 [PDF] Reducción: ${((originalSizeKB - optimizedSizeKB) / originalSizeKB * 100).toFixed(1)}%`)
      
      resolve(optimizedBase64)
      
    } catch (error) {
      console.warn('🖼️ [PDF] Error optimizando logo:', error)
      // En caso de error, retornar el logo original
      resolve(logoData)
    }
  })
}

// Función para convertir colores oklch a hex basado en el CSS de V0
function oklchToHex(oklch: string): string {
  const colorMap: { [key: string]: string } = {
    'oklch(0.99 0.005 106.423)': '#FEFEFE', // background
    'oklch(0.145 0.015 106.423)': '#1A1A1A', // foreground
    'oklch(1 0 0)': '#FFFFFF', // card
    'oklch(0.396 0.141 164.25)': '#3B82F6', // primary
    'oklch(0.985 0.005 106.423)': '#FEFEFE', // primary-foreground
    'oklch(0.97 0.01 106.423)': '#F5F5F5', // muted
    'oklch(0.556 0.01 106.423)': '#8B8B8B', // muted-foreground
    'oklch(0.627 0.265 164.25)': '#10B981', // accent
    'oklch(0.577 0.245 27.325)': '#DC2626', // destructive
    'oklch(0.922 0.005 106.423)': '#E5E5E5', // border
    'oklch(0.205 0.015 106.423)': '#404040', // secondary-foreground
  }
  
  return colorMap[oklch] || '#000000'
}

// Función para obtener el nombre completo de la moneda
function getCurrencyName(currencyCode: string): string {
  const currencyMap: { [key: string]: string } = {
    'CRC': 'Colones (CRC)',
    'USD': 'Dólares (USD)',
    'EUR': 'Euros (EUR)',
    'MXN': 'Pesos Mexicanos (MXN)',
    'NIO': 'Córdobas (NIO)',
    'CAD': 'Dólares Canadienses (CAD)',
    'GBP': 'Libras Esterlinas (GBP)',
    'JPY': 'Yenes (JPY)',
    'CHF': 'Francos Suizos (CHF)'
  }
  return currencyMap[currencyCode] || currencyCode
}

// Función para obtener el nombre de la forma de pago
function getPaymentMethodName(paymentCode: string): string {
  const paymentMap: { [key: string]: string } = {
    '01': 'Efectivo',
    '02': 'Tarjeta',
    '03': 'Cheque',
    '04': 'Transferencia',
    '05': 'Recaudado por Terceros',
    '99': 'Otros'
  }
  return paymentMap[paymentCode] || paymentCode
}

// Función para formatear moneda
function formatCurrency(amount: number, currency: string = 'CRC'): string {
  if (amount === 0) {
    return currency === 'USD' ? 'USD 0.00' : 'CRC 0.00'
  }
  
  // Formato con separadores de miles y decimales
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  
  return currency === 'USD' ? `USD ${formatted}` : `CRC ${formatted}`
}

// Función para dividir texto en múltiples líneas
function splitTextToLines(doc: jsPDF, text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  
  doc.setFontSize(fontSize)
  
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word
    const textWidth = doc.getTextWidth(testLine)
    
    if (textWidth <= maxWidth) {
      currentLine = testLine
    } else {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        lines.push(word)
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine)
  }
  
  return lines
}

export async function generateInvoicePDFOptimized(invoiceData: any): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const pageHeight = 297
  const margin = 10 // Reducido de 15 a 10
  const contentWidth = pageWidth - (margin * 2)
  
  // Obtener la moneda de la factura
  const currency = invoiceData.invoice?.currency || invoiceData.invoice?.moneda || invoiceData.moneda || 'CRC'
  console.log('🔍 [PDF] Debug Moneda:', {
    'invoiceData.invoice?.currency': invoiceData.invoice?.currency,
    'invoiceData.invoice?.moneda': invoiceData.invoice?.moneda,
    'invoiceData.moneda': invoiceData.moneda,
    'currency final': currency
  })
  
  // Debug de forma de pago
  const formaPago = invoiceData.invoice?.paymentMethod || invoiceData.invoice?.formaPago || invoiceData.formaPago || '01'
  console.log('🔍 [PDF] Debug Forma de Pago:', {
    'invoiceData.invoice?.paymentMethod': invoiceData.invoice?.paymentMethod,
    'invoiceData.invoice?.formaPago': invoiceData.invoice?.formaPago,
    'invoiceData.formaPago': invoiceData.formaPago,
    'formaPago final': formaPago,
    'paymentMethodName': getPaymentMethodName(formaPago)
  })
  
  // Debug de IVA
  console.log('🔍 [PDF] Debug IVA:', {
    'invoiceData.invoice?.totalImpuesto': invoiceData.invoice?.totalImpuesto,
    'invoiceData.totalImpuesto': invoiceData.totalImpuesto,
    'invoiceData.invoice?.impuestos': invoiceData.invoice?.impuestos,
    'invoiceData.impuestos': invoiceData.impuestos,
    'invoiceData.invoice?.iva': invoiceData.invoice?.iva,
    'invoiceData.iva': invoiceData.iva,
    'IVA final mapeado': invoiceData.invoice?.totalImpuesto || invoiceData.totalImpuesto || invoiceData.invoice?.impuestos || invoiceData.impuestos || 0
  })
  
  // Colores basados en la captura real
  const colors = {
    background: '#FFFFFF',
    foreground: '#000000',
    accent: '#3B82F6', // Azul para Factura Electrónica
    accentForeground: '#FFFFFF',
  }
  
  let yPosition = margin
  
  // Fondo blanco
  doc.setFillColor(colors.background)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
  
  // Header con logo y tipo de documento
  yPosition = margin + 5 // Reducido de 10 a 5
  
  // Logo de la empresa con optimización de calidad
  let logoLoaded = false
  
  if (invoiceData.company?.logo) {
    try {
      let logoData = ''
      
      // Manejar diferentes estructuras de logo desde Firebase
      if (typeof invoiceData.company.logo === 'string') {
        logoData = invoiceData.company.logo
      } else if (invoiceData.company.logo.fileData) {
        logoData = invoiceData.company.logo.fileData
      } else if (invoiceData.company.logo.filedata) {
        logoData = invoiceData.company.logo.filedata
      } else if (invoiceData.company.logo.url) {
        logoData = invoiceData.company.logo.url
      } else {
        logoData = String(invoiceData.company.logo)
      }
      
      if (logoData && logoData.length > 0) {
        console.log(`🖼️ [PDF] Procesando logo de la empresa desde Firebase...`)
        
        // Optimizar logo antes de agregarlo (redimensionar y comprimir)
        const optimizedLogo = await optimizeLogoForPDF(logoData)
        
        if (optimizedLogo && optimizedLogo !== '') {
          try {
            // El logo optimizado viene como base64 puro desde Sharp
            const base64Data = optimizedLogo
            const format = 'PNG' // Sharp siempre devuelve PNG
            
            // Verificar que el base64 sea válido antes de agregarlo
            if (base64Data.length > 0 && base64Data.length % 4 === 0) {
              // Agregar el logo optimizado al PDF
              doc.addImage(base64Data, format, margin, yPosition, 35, 30)
              console.log(`🖼️ [PDF] Logo optimizado agregado al PDF (${format}) - Tamaño: ${Math.round(base64Data.length / 1024)}KB`)
              logoLoaded = true
            } else {
              console.log('🖼️ [PDF] Logo base64 inválido, omitiendo')
              logoLoaded = false
            }
          } catch (logoError) {
            console.warn('🖼️ [PDF] Error agregando logo al PDF:', logoError instanceof Error ? logoError.message : String(logoError))
            // Si hay error, no agregar logo pero continuar
            logoLoaded = false
          }
        } else {
          console.log('🖼️ [PDF] Logo omitido (error en procesamiento)')
          logoLoaded = false
        }
      }
    } catch (error) {
      console.warn('🖼️ [PDF] Error procesando logo:', error)
      logoLoaded = false
    }
  }
  
  // Si no se cargó el logo, mostrar un placeholder
  if (!logoLoaded) {
    doc.setFillColor('#E5E5E5')
    doc.rect(margin, yPosition, 35, 30, 'F') // Ancho 35, altura 30 (reducida)
    doc.setTextColor('#999999')
    doc.setFontSize(10)
    doc.setFont('times', 'normal')
    doc.text('LOGO', margin + 17.5, yPosition + 17, { align: 'center' }) // Ajustado para el logo más bajo
  }
  
  // Nombre de la empresa - al lado del logo, con salto de línea si es necesario
  doc.setTextColor(colors.foreground)
  doc.setFontSize(14) // Aumentado de 13 a 14 para mejor legibilidad
  doc.setFont('times', 'bold') // Cambio a fuente más elegante
  
  const companyName = invoiceData.company?.name || 'Empresa'
  const maxNameWidth = 85 // Aumentado de 75 a 85 para dar más espacio al nombre
  const nameLines = splitTextToLines(doc, companyName, maxNameWidth, 14)
  
  let nameY = yPosition + 8 // Subido aún más para mejor posicionamiento
  nameLines.forEach((line, index) => {
    doc.text(line, margin + 42, nameY + (index * 4)) // Movido más a la derecha (40 → 42) para el logo más grande
  })
  
  // Cédula de la empresa - responsive: cerca del nombre si es corto, nueva línea si es largo
  doc.setFontSize(11) // Aumentado de 10 a 11
  doc.setFont('times', 'normal') // Cambio a fuente más elegante
  doc.setTextColor('#666666') // Color más elegante
  
  const cedulaText = `Cédula: ${invoiceData.company?.identification || 'N/A'}`
  const cedulaWidth = doc.getTextWidth(cedulaText)
  const nameLastLineWidth = doc.getTextWidth(nameLines[nameLines.length - 1])
  const availableSpace = maxNameWidth - nameLastLineWidth
  
  // Siempre poner la cédula en una nueva línea para evitar traslapes
  doc.text(cedulaText, margin + 42, nameY + (nameLines.length * 4) + 6)
  
  // Badge "Factura Electrónica" en la esquina superior derecha - compacto y fino
  const badgeWidth = 35
  const badgeHeight = 8
  const badgeX = pageWidth - margin - badgeWidth
  const badgeY = yPosition + 3
  
  // Fondo del badge azul principal - más sutil
  doc.setFillColor(colors.accent)
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'F')
  
  // Borde del badge sutil
  doc.setDrawColor('#2563EB')
  doc.setLineWidth(0.1)
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'S')
  
  // Texto del badge - más grande pero en badge compacto
  doc.setTextColor(colors.accentForeground)
  doc.setFontSize(8) // Aumentado de 7 a 8
  doc.setFont('times', 'bold') // Cambio a fuente más elegante
  doc.text('Factura Electrónica', badgeX + badgeWidth/2, badgeY + badgeHeight/2 + 1, { align: 'center' })
  
  // Número consecutivo debajo del badge - más pequeño
  doc.setTextColor(colors.foreground)
  doc.setFontSize(7) // Reducido de 8 a 7
  doc.setFont('times', 'normal') // Cambio a fuente más elegante
  doc.text(`No. ${invoiceData.consecutivo || invoiceData.invoice?.consecutivo || 'N/A'}`, badgeX + badgeWidth/2, badgeY + badgeHeight + 4, { align: 'center' })
  
  // Ajustar yPosition basado en la altura del contenido del header
  const headerHeight = Math.max(25, (nameLines.length * 4) + 12) // Ajustado para el nuevo espaciado
  yPosition += headerHeight + 25 // Agregar más espacio antes de las secciones de información (3 saltos de línea más)
  
  // Información de empresa y cliente en dos columnas
  const columnWidth = (contentWidth - 10) / 2
  
  // Columna izquierda - Información de la empresa
  doc.setTextColor(colors.foreground)
  doc.setFontSize(13) // Aumentado de 12 a 13
  doc.setFont('times', 'bold') // Cambio a fuente más elegante
  doc.text('Información de la Empresa', margin, yPosition)
  
  // Línea separadora horizontal
  doc.setDrawColor(colors.foreground)
  doc.setLineWidth(0.2)
  doc.line(margin, yPosition + 2, margin + columnWidth, yPosition + 2)
  
  doc.setFontSize(9) // Reducido a 9 para igualar con cliente y documento
  doc.setFont('times', 'normal') // Cambio a fuente más elegante
  
  // Construir dirección concatenada
  const addressParts = []
  if (invoiceData.company?.provincia && invoiceData.company.provincia !== 'N/A') {
    addressParts.push(invoiceData.company.provincia)
  }
  if (invoiceData.company?.canton && invoiceData.company.canton !== 'N/A') {
    addressParts.push(invoiceData.company.canton)
  }
  if (invoiceData.company?.distrito && invoiceData.company.distrito !== 'N/A') {
    addressParts.push(invoiceData.company.distrito)
  }
  if (invoiceData.company?.otrasSenas && invoiceData.company.otrasSenas !== 'N/A') {
    addressParts.push(invoiceData.company.otrasSenas)
  }
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'N/A'

  const companyInfo = [
    `Teléfono: ${invoiceData.company?.phone || 'N/A'}`,
    `Correo: ${invoiceData.company?.email || 'N/A'}`
  ]
  
  let companyY = yPosition + 7 // Reducido de 8 a 7
  companyInfo.forEach(info => {
    doc.text(info, margin, companyY)
    companyY += 3.5 // Reducido de 4 a 3.5
  })
  
  // Dirección con manejo de líneas múltiples para evitar traslape
  const direccionText = `Dirección: ${fullAddress}`
  const direccionLines = splitTextToLines(doc, direccionText, columnWidth - 5, 9)
  direccionLines.forEach((line, index) => {
    doc.text(line, margin, companyY)
    companyY += 3.5
  })
  
  // Actividad Económica con manejo de líneas múltiples para evitar traslape
  const actividadEmpresaText = invoiceData.company?.economicActivity 
    ? `Actividad: ${invoiceData.company.economicActivity.codigo} - ${invoiceData.company.economicActivity.descripcion}`
    : `Actividad: N/A`
  const actividadEmpresaLines = splitTextToLines(doc, actividadEmpresaText, columnWidth - 5, 9)
  actividadEmpresaLines.forEach((line, index) => {
    doc.text(line, margin, companyY)
    companyY += 3.5
  })
  
  // Columna derecha - Información del cliente
  const clientX = margin + columnWidth + 10
  doc.setTextColor(colors.foreground)
  doc.setFontSize(13)
  doc.setFont('times', 'bold')
  doc.text('Información del Cliente', clientX, yPosition)
  
  // Línea separadora horizontal
  doc.setDrawColor(colors.foreground)
  doc.setLineWidth(0.2)
  doc.line(clientX, yPosition + 2, pageWidth - margin, yPosition + 2)
  
  doc.setFontSize(9) // Reducido a 9 para evitar traslapes
  doc.setFont('times', 'normal')
  
  const clientInfo = [
    `Nombre: ${invoiceData.client?.name || 'N/A'}`,
    `Cédula: ${invoiceData.client?.identification || 'N/A'}`,
    `Teléfono: ${invoiceData.client?.phone || 'N/A'}`,
    `Correo: ${invoiceData.client?.email || 'N/A'}`
  ]
  
  let clientY = yPosition + 7
  clientInfo.forEach(info => {
    const infoLines = splitTextToLines(doc, info, columnWidth - 5, 9)
    infoLines.forEach((line, index) => {
      doc.text(line, clientX, clientY + (index * 3.5))
    })
    clientY += infoLines.length * 3.5 + 1
  })
  
  // Actividad Económica del cliente con manejo de líneas múltiples
  if (invoiceData.client?.economicActivity) {
    const clientActividadText = `Actividad: ${invoiceData.client.economicActivity.codigo} - ${invoiceData.client.economicActivity.descripcion}`
    const clientActividadLines = splitTextToLines(doc, clientActividadText, columnWidth - 5, 9)
    clientActividadLines.forEach((line, index) => {
      doc.text(line, clientX, clientY + (index * 3.5))
    })
    clientY += clientActividadLines.length * 3.5 + 1
  }
  
  // Ajustar yPosition para la siguiente sección
  const leftColumnHeight = companyY + (direccionLines.length * 3.5) + 5
  const rightColumnHeight = clientY + 5
  yPosition = Math.max(leftColumnHeight, rightColumnHeight) + 15
  
  // Información del documento - ancho completo (igual que tiquete)
  doc.setTextColor(colors.foreground)
  doc.setFontSize(13)
  doc.setFont('times', 'bold')
  doc.text('Información del Documento', margin, yPosition)
  
  // Línea separadora horizontal
  doc.setDrawColor(colors.foreground)
  doc.setLineWidth(0.2)
  doc.line(margin, yPosition + 2, margin + contentWidth, yPosition + 2)
  
  doc.setFontSize(9) // Reducido a 9 para igualar con empresa y cliente
  doc.setFont('times', 'normal')
  
  const documentInfo = [
    `Consecutivo: ${invoiceData.consecutivo || invoiceData.invoice?.consecutivo || 'N/A'}`,
    `Fecha: ${invoiceData.fechaEmision || invoiceData.invoice?.fechaEmision || invoiceData.haciendaResponse?.fecha || 'N/A'}`,
    `Elaborado por: ${invoiceData.elaboradoPor || invoiceData.invoice?.elaboradoPor || 'Sistema de Facturación v4.4'}`,
    `Moneda: ${getCurrencyName(currency)}`,
    `Forma de Pago: ${getPaymentMethodName(invoiceData.invoice?.paymentMethod || invoiceData.invoice?.formaPago || invoiceData.formaPago || '01')}`
  ]
  
  let docY = yPosition + 8
  documentInfo.forEach(info => {
    doc.text(info, margin, docY)
    docY += 4
  })
  
  // Clave de Hacienda en la parte inferior derecha
  doc.text('Clave Hacienda:', margin + columnWidth + 10, yPosition + 8)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  
  // Dividir la clave en líneas para que no se salga de la pantalla
  const clave = invoiceData.haciendaResponse?.clave || invoiceData.clave || invoiceData.invoice?.clave || 'N/A'
  const claveLines = splitTextToLines(doc, clave, columnWidth - 5, 9)
  let claveY = yPosition + 14
  claveLines.forEach(line => {
    doc.text(line, margin + columnWidth + 10, claveY)
    claveY += 3
  })
  
  yPosition += 35
  
  // Tabla de productos/servicios (igual a tiquete)
  doc.setTextColor(colors.foreground)
  doc.setFontSize(13)
  doc.setFont('times', 'bold')
  doc.text('Detalle de Productos/Servicios', margin, yPosition)
  
  // Línea separadora horizontal
  doc.setDrawColor(colors.foreground)
  doc.setLineWidth(0.2)
  doc.line(margin, yPosition + 2, margin + contentWidth, yPosition + 2)
  
  yPosition += 15
  
  // Headers de la tabla
  const colWidths = [12, 12, 22, 46, 32, 28, 38] // Cant., Unidad, CABYS (más ancho), Descripción, Precio Unit., Descuento, SubTotal
  const colX = margin
  const headers = ['Cant.', 'Unidad', 'CABYS', 'Descripción', 'Precio Unit.', 'Descuento', 'SubTotal']
  
  // Fondo del header
  doc.setFillColor('#F8F9FA')
  doc.rect(colX, yPosition - 3, contentWidth, 12, 'F')
  
  // Borde del header
  doc.setDrawColor('#DEE2E6')
  doc.setLineWidth(0.2)
  doc.rect(colX, yPosition - 3, contentWidth, 12, 'S')
  
  // Líneas de separación del header
  doc.setDrawColor('#DEE2E6')
  doc.setLineWidth(0.1)
  let lineX2 = colX
  headers.forEach((_, index) => {
    if (index > 0) {
      doc.line(lineX2, yPosition - 3, lineX2, yPosition + 9)
    }
    lineX2 += colWidths[index]
  })
  
  doc.setTextColor(colors.foreground)
  doc.setFontSize(9)
  doc.setFont('times', 'bold')
  
  let headerX = colX + 2
  headers.forEach((header, index) => {
    const textWidth = doc.getTextWidth(header)
    const centerX = headerX + (colWidths[index] / 2) - (textWidth / 2)
    doc.text(header, centerX, yPosition + 6)
    headerX += colWidths[index]
  })
  
  yPosition += 15
  
  // Filas de productos
  doc.setFont('times', 'normal')
  let subtotal = 0
  let totalImpuestos = 0
  
  const items = invoiceData.items || invoiceData.invoice?.items || []
  if (items && items.length > 0) {
    items.forEach((item: any) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage()
        yPosition = margin
      }
      
      // Calcular altura basada en descripción
      const description = item.description || item.descripcion || item.detalle || 'N/A'
      const descriptionLines = splitTextToLines(doc, description, colWidths[3] - 4, 8)
      const rowHeight = Math.max(8, descriptionLines.length * 2.5 + 4)
      
      // Líneas verticales
      doc.setDrawColor('#E9ECEF')
      doc.setLineWidth(0.1)
      let lineX = colX
      headers.forEach((_, colIndex) => {
        if (colIndex > 0) {
          doc.line(lineX, yPosition - 2, lineX, yPosition + rowHeight)
        }
        lineX += colWidths[colIndex]
      })
      
      // Línea horizontal inferior
      doc.line(colX, yPosition + rowHeight, colX + contentWidth, yPosition + rowHeight)
      
      doc.setTextColor(colors.foreground)
      doc.setFontSize(8)
      doc.setFont('times', 'normal')
      
      let itemX = colX + 2
      
      const itemQuantity = parseFloat(item.quantity?.toString() || item.cantidad?.toString() || '0')
      const itemUnitPrice = item.unitPrice || item.precioUnitario || 0
      
      // Cantidad
      const quantityText = itemQuantity.toString()
      const quantityWidth = doc.getTextWidth(quantityText)
      const quantityCenterX = itemX + (colWidths[0] / 2) - (quantityWidth / 2)
      const quantityCenterY = yPosition + (rowHeight / 2) + 2
      doc.text(quantityText, quantityCenterX, quantityCenterY)
      itemX += colWidths[0]
      
      // Unidad
      const unidad = item.unidad || 'Sp' // Sp = Servicio Profesional (código estándar de Hacienda)
      const unidadWidth = doc.getTextWidth(unidad)
      const unidadCenterX = itemX + (colWidths[1] / 2) - (unidadWidth / 2)
      const unidadCenterY = yPosition + (rowHeight / 2) + 2
      doc.text(unidad, unidadCenterX, unidadCenterY)
      itemX += colWidths[1]
      
      // CABYS
      const cabys = item.codigoCABYS || 'N/A'
      const cabysWidth = doc.getTextWidth(cabys)
      const cabysCenterX = itemX + (colWidths[2] / 2) - (cabysWidth / 2)
      const cabysCenterY = yPosition + (rowHeight / 2) + 2
      doc.text(cabys, cabysCenterX, cabysCenterY)
      itemX += colWidths[2]
      
      // Descripción (centrado vertical)
      const cellCenterY = yPosition + (rowHeight / 2) + 2
      const lineSpacing = 2.5
      const totalTextHeight = (descriptionLines.length - 1) * lineSpacing
      const startY = cellCenterY - (totalTextHeight / 2)
      descriptionLines.forEach((line, lineIndex) => {
        const lineWidth = doc.getTextWidth(line)
        const centerX = itemX + (colWidths[3] - lineWidth) / 2
        doc.text(line, centerX, startY + (lineIndex * lineSpacing))
      })
      itemX += colWidths[3]
      
      // Precio Unitario (formateado)
      const unitPriceText = formatCurrency(itemUnitPrice, currency)
      doc.setFont('helvetica', 'normal')
      const unitPriceWidth = doc.getTextWidth(unitPriceText)
      const unitPriceCenterX = itemX + (colWidths[4] - unitPriceWidth) / 2
      const unitPriceCenterY = yPosition + (rowHeight / 2) + 2
      doc.text(unitPriceText, unitPriceCenterX, unitPriceCenterY)
      itemX += colWidths[4]
      
      // Descuento
      const descuentoText = formatCurrency(item.descuento || 0, currency)
      const descuentoWidth = doc.getTextWidth(descuentoText)
      const descuentoCenterX = itemX + (colWidths[5] - descuentoWidth) / 2
      const descuentoCenterY = yPosition + (rowHeight / 2) + 2
      doc.text(descuentoText, descuentoCenterX, descuentoCenterY)
      itemX += colWidths[5]
      
      // SubTotal (cantidad * precio unitario)
      const sub = itemQuantity * itemUnitPrice
      subtotal += sub
      const subtotalText = formatCurrency(sub, currency)
      const subtotalWidth2 = doc.getTextWidth(subtotalText)
      doc.setFont('helvetica', 'bold')
      const subtotalCenterX = itemX + (colWidths[6] - subtotalWidth2) / 2
      const subtotalCenterY = yPosition + (rowHeight / 2) + 2
      doc.text(subtotalText, subtotalCenterX, subtotalCenterY)
      
      // Restaurar fuente
      doc.setFont('times', 'normal')
      
      yPosition += rowHeight
    })
  }
  
  yPosition += 20
  
  // Resumen de cargos en dos columnas
  const summaryColumnWidth = (contentWidth - 10) / 2
  
  // Columna izquierda - Comentarios/Notas
  doc.setTextColor(colors.foreground)
  doc.setFontSize(13)
  doc.setFont('times', 'bold')
  doc.text('Comentarios', margin, yPosition)
  
  // Línea separadora horizontal
  doc.setDrawColor(colors.foreground)
  doc.setLineWidth(0.2)
  doc.line(margin, yPosition + 2, margin + summaryColumnWidth, yPosition + 2)
  
  doc.setFontSize(11)
  doc.setFont('times', 'normal')
  
  let infoY = yPosition + 8
  
  // Notas si existen
  if (invoiceData.notas && invoiceData.notas.trim() !== '') {
    const notesLines = splitTextToLines(doc, invoiceData.notas, summaryColumnWidth - 5, 11)
    notesLines.forEach(line => {
      doc.text(line, margin, infoY)
      infoY += 3.5
    })
  } else {
    doc.text('Sin comentarios adicionales', margin, infoY)
  }
  
  // Columna derecha - Resumen de totales
  doc.setTextColor(colors.foreground)
  doc.setFontSize(11)
  doc.setFont('times', 'bold')
  doc.text('Resumen de Cargos', margin + summaryColumnWidth + 10, yPosition)
  
  // Línea separadora horizontal
  doc.setDrawColor(colors.foreground)
  doc.setLineWidth(0.2)
  doc.line(margin + summaryColumnWidth + 10, yPosition + 2, margin + contentWidth, yPosition + 2)
  
  doc.setFontSize(9)
  doc.setFont('times', 'normal')
  
  const totals = [
    `Total Exento: ${formatCurrency(invoiceData.totalExento || invoiceData.invoice?.totalExento || 0, currency)}`,
    `Subtotal: ${formatCurrency(invoiceData.subtotal || invoiceData.invoice?.subtotal || 0, currency)}`,
    `Descuento: ${formatCurrency(invoiceData.descuentos || invoiceData.invoice?.descuentos || 0, currency)}`,
    `IVA: ${formatCurrency(invoiceData.invoice?.totalImpuesto || invoiceData.totalImpuesto || invoiceData.invoice?.impuestos || invoiceData.impuestos || 0, currency)}`,
    `IVA Devuelto: ${formatCurrency(invoiceData.ivaDevuelto || invoiceData.invoice?.ivaDevuelto || 0, currency)}`
  ]
  
  let totalY = yPosition + 8
  totals.forEach(total => {
    // Separar el texto del número para usar diferentes fuentes
    const colonIndex = total.indexOf(':')
    const label = total.substring(0, colonIndex + 1)
    const amount = total.substring(colonIndex + 1)
    
    doc.setFont('times', 'normal')
    doc.text(label, margin + summaryColumnWidth + 10, totalY)
    
    // Alinear el monto a la derecha
    doc.setFont('helvetica', 'normal') // Helvetica para números
    const amountWidth = doc.getTextWidth(amount)
    const rightMargin = margin + contentWidth - 5 // 5mm del borde derecho
    doc.text(amount, rightMargin - amountWidth, totalY)
    
    totalY += 3.5 // Espaciado más compacto y elegante
  })
  
  // Línea separadora antes del total
  doc.setDrawColor(colors.foreground)
  doc.setLineWidth(0.2)
  doc.line(margin + summaryColumnWidth + 10, totalY, margin + contentWidth, totalY)
  totalY += 6
  
  // Total final
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold') // Helvetica bold para el total
  doc.setTextColor(colors.accent)
  const totalText = `TOTAL: ${formatCurrency(invoiceData.total || invoiceData.invoice?.total || 0, currency)}`
  const totalWidth = doc.getTextWidth(totalText)
  const rightMargin = margin + contentWidth - 5 // 5mm del borde derecho
  doc.text(totalText, rightMargin - totalWidth, totalY)
  
  yPosition += 60
  
  // Información legal
  doc.setFillColor('#F5F5F5')
  doc.roundedRect(margin, yPosition, contentWidth, 20, 2, 2, 'F')
  
  doc.setTextColor('#666666')
  doc.setFontSize(10)
  doc.setFont('times', 'normal')
  
  const legalInfo = [
    `Autorizado mediante resolución MH-RES-0027-2024 del 13 de noviembre de 2024.`,
    `Versión del Documento Electrónico: 4.4`
  ]
  
  let legalY = yPosition + 8
  legalInfo.forEach(info => {
    doc.text(info, margin + 5, legalY)
    legalY += 4
  })
  
  yPosition += 30
  
  // Firma del cliente
  doc.setDrawColor(colors.foreground)
  doc.setLineWidth(0.2)
  doc.line(margin, yPosition, margin + 50, yPosition)
  
  doc.setTextColor('#666666')
  doc.setFontSize(10)
  doc.setFont('times', 'normal')
  doc.text('Firma del Cliente', margin, yPosition + 6)
  
  // Log del tamaño final del PDF (usando arraybuffer para medición precisa)
  const pdfArrayBuffer = doc.output('arraybuffer')
  const pdfSizeKB = Math.round(pdfArrayBuffer.byteLength / 1024)
  console.log(`📄 [PDF] Tamaño final del PDF optimizado: ${pdfSizeKB}KB`)
  
  return doc
}

export async function formatInvoiceDataForPDFOptimized(invoice: any, company: any, client: any) {
  // Función auxiliar para formatear fechas
  const formatDate = (date: any): string => {
    if (!date) return 'N/A'
    try {
      if (date instanceof Date) {
        return date.toLocaleDateString('es-CR')
      }
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('es-CR')
      }
      if (date.toDate && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString('es-CR')
      }
      return 'N/A'
    } catch {
      return 'N/A'
    }
  }

  const result = {
    invoice: {
      ...invoice,
      tipo: 'Factura Electrónica',
      fechaEmision: formatDate(invoice.fechaEmision || invoice.haciendaResponse?.fecha),
      consecutivo: invoice.consecutivo || invoice.number || 'N/A',
      clave: invoice.haciendaResponse?.clave || invoice.clave || invoice.key || 'N/A',
      elaboradoPor: invoice.elaboradoPor || invoice.createdBy || 'Sistema de Facturación v4.4',
      subtotal: invoice.subtotal || invoice.subTotal || 0,
      totalGravado: invoice.totalGravado || invoice.totalTaxable || 0,
      totalExento: invoice.totalExento || invoice.totalExempt || 0,
      impuestos: invoice.totalImpuesto || invoice.totalTax || invoice.taxes || invoice.impuestos || invoice.iva || 0,
      descuentos: invoice.totalDescuento || invoice.totalDiscount || invoice.discounts || 0,
      ivaDevuelto: invoice.ivaDevuelto || invoice.ivaReturned || 0,
      total: invoice.total || invoice.totalAmount || 0,
      moneda: invoice.currency || invoice.moneda || invoice.currencyCode || 'CRC',
      formaPago: invoice.paymentMethod || invoice.formaPago || invoice.paymentMethodCode || '01',
      items: invoice.items || invoice.lineItems || [],
      notas: invoice.notes || invoice.notas || invoice.comments || ''
    },
    haciendaResponse: invoice.haciendaResponse || invoice.haciendaSubmission, // Preservar respuesta de Hacienda
    company: {
      name: company?.name || company?.nombre || company?.nombreComercial || 'N/A',
      identification: company?.identification || company?.cedula || company?.taxId || 'N/A',
      phone: company?.phone || company?.telefono || company?.phoneNumber || 'N/A',
      email: company?.email || company?.correo || company?.emailAddress || 'N/A',
      economicActivity: company?.economicActivity || company?.actividadEconomica || null,
      otrasSenas: company?.otrasSenas || company?.direccion || company?.address || 'N/A',
      logo: company?.logo || company?.logotipo || null,
      // Datos de ubicación con múltiples mapeos
      provincia: company?.provincia || company?.province || company?.provinciaNombre || 'N/A',
      canton: company?.canton || company?.cantonNombre || 'N/A',
      distrito: company?.distrito || company?.district || company?.distritoNombre || 'N/A'
    },
    client: {
      name: client?.name || client?.nombre || client?.nombreCompleto || 'Consumidor Final',
      identification: client?.identification || client?.cedula || client?.taxId || 'N/A',
      email: client?.email || client?.correo || client?.emailAddress || 'N/A',
      phone: client?.phone || client?.telefono || client?.phoneNumber || 'N/A',
      economicActivity: client?.economicActivity || client?.actividadEconomica || null,
      direccion: client?.direccion || client?.address || client?.direccionCompleta || 'N/A',
      // Datos de ubicación del cliente con múltiples mapeos
      provincia: client?.provincia || client?.province || client?.provinciaNombre || 'N/A',
      canton: client?.canton || client?.cantonNombre || 'N/A',
      distrito: client?.distrito || client?.district || client?.distritoNombre || 'N/A'
    }
  }
  
  // Debug de mapeo de moneda y forma de pago
  console.log('🔍 [PDF] Debug Mapeo Moneda:', {
    'invoice.currency': invoice.currency,
    'invoice.moneda': invoice.moneda,
    'invoice.currencyCode': invoice.currencyCode,
    'mapped moneda': result.invoice.moneda
  })
  
  console.log('🔍 [PDF] Debug Mapeo Forma de Pago:', {
    'invoice.paymentMethod': invoice.paymentMethod,
    'invoice.formaPago': invoice.formaPago,
    'invoice.paymentMethodCode': invoice.paymentMethodCode,
    'mapped formaPago': result.invoice.formaPago
  })
  
  return result
}
