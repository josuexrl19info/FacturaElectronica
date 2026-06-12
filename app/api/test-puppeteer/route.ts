import { NextRequest, NextResponse } from 'next/server'
import { launchPuppeteerBrowser } from '@/lib/services/puppeteer-launch'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET() {
  let browser
  try {
    console.log('🧪 Probando Puppeteer básico...')
    
    browser = await launchPuppeteerBrowser()
    
    const page = await browser.newPage()
    
    // HTML muy simple
    const simpleHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Test PDF</h1>
          <p>Este es un PDF de prueba.</p>
        </body>
      </html>
    `
    
    await page.setContent(simpleHTML)
    
    // Generar PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    })
    
    // Verificar header
    const header = pdfBuffer.slice(0, 4).toString()
    console.log('Header PDF:', header)
    
    if (header !== '%PDF') {
      throw new Error(`Header incorrecto: ${header}`)
    }
    
    const base64Data = pdfBuffer.toString('base64')
    
    return NextResponse.json({
      success: true,
      header: header,
      size: pdfBuffer.length,
      base64_size: base64Data.length,
      message: 'Puppeteer funcionando correctamente'
    })
    
  } catch (error) {
    console.error('❌ Error en test de Puppeteer:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
