import { NextRequest, NextResponse } from 'next/server'
import { generateInvoicePDFOptimized } from '@/lib/services/pdf-generator-optimized'

export async function POST(request: NextRequest) {
  try {
    const invoiceData = await request.json()
    
    console.log('📄 Generando PDF optimizado para:', invoiceData.invoice?.consecutivo || 'N/A')
    
    // Generar PDF usando la implementación optimizada
    const doc = await generateInvoicePDFOptimized(invoiceData)
    
    // Generar PDF como base64 con compresión máxima
    const pdfOutput = doc.output('datauristring', { compression: 'FAST' })
    const base64Data = pdfOutput.split(',')[1]
    
    const finalSize = Buffer.byteLength(base64Data, 'utf8')
    const finalSizeMB = (finalSize / (1024 * 1024)).toFixed(2)
    
    console.log('✅ PDF optimizado generado:', base64Data.length, 'caracteres')
    console.log('📊 Tamaño final del PDF optimizado:', `${finalSizeMB} MB`)
    
    // Verificar si el PDF es razonable
    if (finalSize > 5 * 1024 * 1024) { // 5 MB
      console.warn(`⚠️ ADVERTENCIA: PDF muy grande (${finalSizeMB} MB), considere optimizar más`)
    } else {
      console.log(`✅ PDF de tamaño óptimo (${finalSizeMB} MB)`)
    }
    
    return NextResponse.json({
      success: true,
      pdf_base64: base64Data,
      size: base64Data.length,
      size_mb: finalSizeMB,
      method: 'jsPDF-optimized',
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
