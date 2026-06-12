import { NextRequest, NextResponse } from 'next/server'
import { InvalidJsonBodyError, parseRequestJsonBody } from '@/lib/api/parse-request-json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const invoiceData = await parseRequestJsonBody(request)

    const { generateInvoicePDFOptimized } = await import('@/lib/services/pdf-generator-optimized')
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
    
    // Generar PDF usando HTML + Puppeteer (idéntico a vista previa)
    const pdfArrayBuffer = await generateInvoicePDFOptimized(invoiceData)
    
    // Validar que el PDF tenga el formato correcto (debe empezar con %PDF)
    const pdfHeader = new Uint8Array(pdfArrayBuffer.slice(0, 4))
    const pdfHeaderString = String.fromCharCode(...pdfHeader)
    
    if (pdfHeaderString !== '%PDF') {
      console.error('❌ [PDF] Error: El PDF generado no tiene el formato correcto')
      console.error('❌ [PDF] Header encontrado:', pdfHeaderString)
      throw new Error('El PDF generado no tiene el formato correcto (debe empezar con %PDF)')
    }
    
    console.log('✅ [PDF] Validación de formato: El PDF tiene el header correcto (%PDF)')
    
    // Convertir ArrayBuffer a base64
    const base64Data = Buffer.from(pdfArrayBuffer).toString('base64')
    
    // Validar que el base64 no esté vacío
    if (!base64Data || base64Data.length === 0) {
      throw new Error('Error: El PDF en base64 está vacío')
    }
    
    // Validar formato base64 (debe contener solo caracteres válidos)
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
    if (!base64Regex.test(base64Data)) {
      console.warn('⚠️ [PDF] Advertencia: El base64 puede tener caracteres inválidos')
    }
    
    // Calcular el tamaño del PDF original
    const pdfSizeBytes = pdfArrayBuffer.byteLength
    const pdfSizeKB = Math.round(pdfSizeBytes / 1024)
    const pdfSizeMB = (pdfSizeBytes / (1024 * 1024)).toFixed(2)
    
    // Calcular el tamaño del base64
    const base64Size = Buffer.byteLength(base64Data, 'utf8')
    const base64SizeKB = Math.round(base64Size / 1024)
    const base64SizeMB = (base64Size / (1024 * 1024)).toFixed(2)
    
    console.log(`📄 [PDF] Tamaño del PDF: ${pdfSizeKB}KB (${pdfSizeMB}MB)`)
    console.log(`📄 [PDF] Tamaño base64: ${base64SizeKB}KB (${base64SizeMB}MB)`)
    console.log(`📄 [PDF] Ratio base64/PDF: ${((base64Size / pdfSizeBytes) * 100).toFixed(1)}% (esperado ~133%)`)
    console.log(`✅ [PDF] PDF generado correctamente: ${base64Data.length} caracteres base64`)
    
    // Verificar si el PDF es razonable
    if (base64Size > 5 * 1024 * 1024) { // 5 MB
      console.warn(`⚠️ ADVERTENCIA: PDF muy grande (${base64SizeMB} MB), considere optimizar más`)
    } else {
      console.log(`✅ PDF de tamaño óptimo (${base64SizeMB} MB)`)
    }
    
    // Validar que el base64 se pueda decodificar correctamente
    try {
      const decodedBuffer = Buffer.from(base64Data, 'base64')
      const decodedHeader = decodedBuffer.slice(0, 4).toString('utf8')
      if (decodedHeader !== '%PDF') {
        throw new Error('El base64 decodificado no produce un PDF válido')
      }
      console.log('✅ [PDF] Validación de decodificación: El base64 se puede decodificar correctamente')
    } catch (error) {
      console.error('❌ [PDF] Error al validar decodificación del base64:', error)
      throw new Error('El base64 generado no se puede decodificar correctamente')
    }
    
    return NextResponse.json({
      success: true,
      pdf_base64: base64Data,
      size: base64Data.length,
      size_mb: base64SizeMB,
      pdf_size_kb: pdfSizeKB,
      pdf_size_mb: pdfSizeMB,
      pdf_size_bytes: pdfSizeBytes,
      method: 'puppeteer-html',
      compressed: true,
      format_valid: true
    })
    
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      console.warn('⚠️ PDF optimizado: solicitud con JSON inválido:', error.message)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }
    console.error('❌ Error generando PDF optimizado:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
