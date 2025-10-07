#!/usr/bin/env node

/**
 * Script para debuggear el tamaño de los datos enviados por email
 */

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function debugEmailSize() {
  log('\n📊 Debuggeando Tamaño de Datos de Email', 'bold');
  log('=' .repeat(50), 'blue');
  
  try {
    // Generar un PDF de prueba para medir su tamaño
    log('\n📄 Paso 1: Generando PDF de prueba...', 'cyan');
    
    const testPDFData = {
      number: 'FE-0000000155',
      key: '50624051000012345678901234567890123456789012',
      date: '2025-10-05',
      dueDate: '2025-10-15',
      company: {
        name: 'InnovaSell Costa Rica',
        id: '310123456789',
        phone: '+506 2222-3333',
        email: 'facturas@innovasmartcr.com',
        address: 'San José, Costa Rica, Avenida Central, Edificio Torre Empresarial, Piso 5'
      },
      client: {
        name: 'Josué Rodríguez - Cliente Empresarial',
        id: '310987654321',
        phone: '+506 8888-8888',
        email: 'josuexrl19@gmail.com',
        address: 'San José, Costa Rica, Barrio Escalante, Avenida Central'
      },
      items: [
        {
          description: 'Desarrollo de Software Personalizado - Sistema de Facturación Electrónica con integración a Hacienda',
          quantity: 1,
          unitPrice: 1500000,
          discount: 0,
          tax: 195000,
          total: 1695000
        }
      ],
      subtotal: 1500000,
      totalDiscount: 0,
      totalTax: 195000,
      totalExempt: 0,
      total: 1695000,
      notes: 'Esta factura incluye el desarrollo completo del sistema de facturación electrónica.'
    };
    
    const pdfResponse = await fetch('http://localhost:3000/api/generate-pdf-alt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPDFData)
    });
    
    if (!pdfResponse.ok) {
      log(`❌ Error generando PDF: ${pdfResponse.status}`, 'red');
      return false;
    }
    
    const pdfResult = await pdfResponse.json();
    
    if (!pdfResult.success) {
      log(`❌ Error en PDF: ${pdfResult.error}`, 'red');
      return false;
    }
    
    const pdfBase64 = pdfResult.pdf_base64;
    const pdfSize = Buffer.byteLength(pdfBase64, 'utf8');
    
    log(`✅ PDF generado exitosamente`, 'green');
    log(`📄 Tamaño del PDF en base64: ${formatBytes(pdfSize)}`, 'blue');
    
    // Simular XMLs
    const xml1Base64 = Buffer.from('<?xml version="1.0" encoding="UTF-8"?><test>XML firmado de prueba</test>', 'utf8').toString('base64');
    const xml2Base64 = 'dGVzdF94bWxfcmVzcHVlc3Rh';
    
    log(`📄 Tamaño del XML1 en base64: ${formatBytes(Buffer.byteLength(xml1Base64, 'utf8'))}`, 'blue');
    log(`📄 Tamaño del XML2 en base64: ${formatBytes(Buffer.byteLength(xml2Base64, 'utf8'))}`, 'blue');
    
    // Crear datos de email completos
    const emailData = {
      to: 'josuexrl19@gmail.com',
      subject: 'Factura Electrónica Aprobada - InnovaSell Costa Rica',
      message: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #14b8a6;">¡Su Factura ha sido Aprobada!</h2>
          <p>Estimado cliente,</p>
          <p>Nos complace informarle que su factura <strong>FE-0000000155</strong> ha sido aprobada por el Ministerio de Hacienda.</p>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <h4 style="color: #166534;">📎 Documentos Adjuntos</h4>
            <p>Adjunto a este correo encontrará un <strong>Comprobante Electrónico en formato XML</strong> y su correspondiente <strong>representación en formato PDF</strong>, por concepto de facturación de <strong>InnovaSell Costa Rica</strong>. Lo anterior con base en las especificaciones del <strong>Ministerio de Hacienda</strong>.</p>
          </div>
          
          <p>Gracias por su confianza.</p>
          <p><strong>InnovaSell Costa Rica</strong></p>
        </div>
      `,
      xml1_base64: xml1Base64,
      xml2_base64: xml2Base64,
      pdf_base64: pdfBase64,
      pdf_filename: '50624051000012345678901234567890123456789012.pdf',
      xml1_filename: '50624051000012345678901234567890123456789012.xml',
      xml2_filename: '50624051000012345678901234567890123456789012_respuesta.xml'
    };
    
    // Calcular tamaños
    const jsonString = JSON.stringify(emailData);
    const totalSize = Buffer.byteLength(jsonString, 'utf8');
    
    log('\n📊 Paso 2: Análisis de tamaños...', 'cyan');
    log(`📧 Tamaño del mensaje HTML: ${formatBytes(Buffer.byteLength(emailData.message, 'utf8'))}`, 'blue');
    log(`📄 Tamaño del PDF en base64: ${formatBytes(pdfSize)}`, 'blue');
    log(`📄 Tamaño del XML1 en base64: ${formatBytes(Buffer.byteLength(xml1Base64, 'utf8'))}`, 'blue');
    log(`📄 Tamaño del XML2 en base64: ${formatBytes(Buffer.byteLength(xml2Base64, 'utf8'))}`, 'blue');
    log(`📦 Tamaño total del JSON: ${formatBytes(totalSize)}`, 'blue');
    
    // Límites del servidor
    const phpLimit = 8 * 1024 * 1024; // 8 MB
    const phpLimitFormatted = formatBytes(phpLimit);
    
    log('\n🚨 Paso 3: Verificación de límites...', 'cyan');
    log(`⚠️ Límite de PHP: ${phpLimitFormatted}`, 'yellow');
    log(`📊 Nuestro tamaño: ${formatBytes(totalSize)}`, 'blue');
    
    if (totalSize > phpLimit) {
      log(`❌ PROBLEMA: Excede el límite de PHP por ${formatBytes(totalSize - phpLimit)}`, 'red');
      log(`📊 Porcentaje del límite: ${((totalSize / phpLimit) * 100).toFixed(1)}%`, 'red');
    } else {
      log(`✅ Tamaño dentro del límite de PHP`, 'green');
    }
    
    // Analizar qué está causando el tamaño excesivo
    log('\n🔍 Paso 4: Análisis detallado...', 'cyan');
    
    const messageSize = Buffer.byteLength(emailData.message, 'utf8');
    const xml1Size = Buffer.byteLength(xml1Base64, 'utf8');
    const xml2Size = Buffer.byteLength(xml2Base64, 'utf8');
    const otherDataSize = totalSize - pdfSize - messageSize - xml1Size - xml2Size;
    
    log(`📊 Desglose de tamaños:`, 'blue');
    log(`  📧 Mensaje HTML: ${formatBytes(messageSize)} (${((messageSize/totalSize)*100).toFixed(1)}%)`, 'blue');
    log(`  📄 PDF base64: ${formatBytes(pdfSize)} (${((pdfSize/totalSize)*100).toFixed(1)}%)`, 'blue');
    log(`  📄 XML1 base64: ${formatBytes(xml1Size)} (${((xml1Size/totalSize)*100).toFixed(1)}%)`, 'blue');
    log(`  📄 XML2 base64: ${formatBytes(xml2Size)} (${((xml2Size/totalSize)*100).toFixed(1)}%)`, 'blue');
    log(`  📦 Otros datos: ${formatBytes(otherDataSize)} (${((otherDataSize/totalSize)*100).toFixed(1)}%)`, 'blue');
    
    // Probar envío sin PDF para comparar
    log('\n🧪 Paso 5: Probando sin PDF...', 'cyan');
    
    const emailDataWithoutPDF = {
      ...emailData,
      pdf_base64: undefined,
      pdf_filename: undefined
    };
    
    const jsonWithoutPDF = JSON.stringify(emailDataWithoutPDF);
    const sizeWithoutPDF = Buffer.byteLength(jsonWithoutPDF, 'utf8');
    
    log(`📦 Tamaño sin PDF: ${formatBytes(sizeWithoutPDF)}`, 'blue');
    log(`📊 Reducción: ${formatBytes(totalSize - sizeWithoutPDF)}`, 'blue');
    
    if (sizeWithoutPDF > phpLimit) {
      log(`❌ Aún excede el límite sin PDF`, 'red');
    } else {
      log(`✅ Sin PDF estaría dentro del límite`, 'green');
    }
    
    // Recomendaciones
    log('\n💡 Paso 6: Recomendaciones...', 'cyan');
    
    if (totalSize > phpLimit) {
      log('\n🔧 Soluciones posibles:', 'yellow');
      log('  1. Reducir el tamaño del PDF (calidad, resolución)', 'blue');
      log('  2. Comprimir el PDF antes de convertir a base64', 'blue');
      log('  3. Enviar PDF por separado (no en el email)', 'blue');
      log('  4. Usar un servicio de almacenamiento para archivos grandes', 'blue');
      log('  5. Configurar límites más altos en el servidor PHP', 'blue');
      log('  6. Dividir el envío en múltiples requests', 'blue');
    }
    
    // Resumen
    log('\n' + '='.repeat(60), 'blue');
    log('📊 ANÁLISIS DE TAMAÑO DE EMAIL - COMPLETADO', 'bold');
    log('=' .repeat(60), 'blue');
    
    log('\n📊 Resumen:', 'cyan');
    log(`  📦 Tamaño total: ${formatBytes(totalSize)}`, 'blue');
    log(`  ⚠️ Límite PHP: ${phpLimitFormatted}`, 'yellow');
    log(`  📄 PDF contribuye: ${formatBytes(pdfSize)} (${((pdfSize/totalSize)*100).toFixed(1)}%)`, 'blue');
    log(`  🚨 Estado: ${totalSize > phpLimit ? 'EXCEDE LÍMITE' : 'DENTRO DEL LÍMITE'}`, totalSize > phpLimit ? 'red' : 'green');
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en análisis: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    return false;
  }
}

async function main() {
  log('📊 Análisis de Tamaño de Email', 'bold');
  
  try {
    const success = await debugEmailSize();
    
    if (success) {
      log('\n🎯 ANÁLISIS COMPLETADO', 'green');
      process.exit(0);
    } else {
      log('\n💥 ANÁLISIS FALLIDO', 'red');
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n💥 Error fatal: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    log(`\n💥 Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main, debugEmailSize };
