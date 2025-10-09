import { NextRequest, NextResponse } from 'next/server'
import { generateInvoicePDFOptimized } from '@/lib/services/pdf-generator-optimized'

export async function POST(request: NextRequest) {
  try {
    const invoiceData = await request.json()
    
    console.log('📄 Generando PDF optimizado para:', invoiceData.invoice?.consecutivo || 'N/A')

    // Log de datos recibidos
    console.log('🏢 Company recibida:', {
      hasCompany: !!invoiceData.company,
      name: invoiceData.company?.name || invoiceData.company?.nombreComercial
    })
    console.log('👤 Client recibido:', {
      hasClient: !!invoiceData.client,
      name: invoiceData.client?.name || invoiceData.client?.nombre,
      identification: invoiceData.client?.identification || invoiceData.client?.identificacion || invoiceData.client?.cedula,
      email: invoiceData.client?.email || invoiceData.client?.correo,
      phone: invoiceData.client?.phone || invoiceData.client?.telefono
    })
    console.log('👤 Client RAW keys:', Object.keys(invoiceData.client || {}))
    console.log('👤 Client RAW data:', {
      nombre: invoiceData.client?.nombre,
      identificacion: invoiceData.client?.identificacion,
      email: invoiceData.client?.email,
      phone: invoiceData.client?.phone,
      telefono: invoiceData.client?.telefono,
      economicActivity: invoiceData.client?.economicActivity,
      actividadEconomica: invoiceData.client?.actividadEconomica
    })
    console.log('📄 Invoice RAW keys:', Object.keys(invoiceData.invoice || {}))
    console.log('📄 Invoice RAW data:', {
      formaPago: invoiceData.invoice?.formaPago,
      paymentMethod: invoiceData.invoice?.paymentMethod,
      condicionVenta: invoiceData.invoice?.condicionVenta,
      currency: invoiceData.invoice?.currency,
      tipo: invoiceData.invoice?.tipo
    })
    
    // Generar PDF usando la implementación optimizada
    const doc = await generateInvoicePDFOptimized(invoiceData)
    
    // Generar PDF como string de datos primero
    const pdfDataString = doc.output('datauristring')
    const base64Data = pdfDataString.split(',')[1] // Extraer solo la parte base64
    
    // Calcular el tamaño del PDF original estimado
    const estimatedPdfSize = Math.round(base64Data.length * 0.75) // base64 es ~33% más grande
    const pdfSizeKB = Math.round(estimatedPdfSize / 1024)
    const pdfSizeMB = (estimatedPdfSize / (1024 * 1024)).toFixed(2)
    
    console.log(`📄 [PDF] Tamaño estimado del PDF: ${pdfSizeKB}KB (${pdfSizeMB}MB)`)
    console.log(`📄 [PDF] Tamaño base64 real: ${Math.round(base64Data.length / 1024)}KB`)
    
    const base64Size = Buffer.byteLength(base64Data, 'utf8')
    const base64SizeMB = (base64Size / (1024 * 1024)).toFixed(2)
    
    console.log('✅ PDF optimizado generado:', base64Data.length, 'caracteres base64')
    console.log(`📊 Tamaño base64: ${base64SizeMB} MB (esperado: ~${(estimatedPdfSize * 1.33 / (1024 * 1024)).toFixed(2)} MB)`)
    
    // Verificar si el PDF es razonable (usando el tamaño base64)
    if (base64Size > 5 * 1024 * 1024) { // 5 MB
      console.warn(`⚠️ ADVERTENCIA: PDF muy grande (${base64SizeMB} MB), considere optimizar más`)
    } else {
      console.log(`✅ PDF de tamaño óptimo (${base64SizeMB} MB)`)
    }
    
    return NextResponse.json({
      success: true,
      pdf_base64: base64Data,
      size: base64Data.length,
      size_mb: base64SizeMB,
      pdf_size_kb: pdfSizeKB,
      pdf_size_mb: pdfSizeMB,
      method: 'jsPDF-optimized-arraybuffer',
      compressed: true
    })
    
  } catch (error) {
    console.error('❌ Error generando PDF optimizado:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
