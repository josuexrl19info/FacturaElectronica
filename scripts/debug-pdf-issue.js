#!/usr/bin/env node

/**
 * Script para debuggear el problema del PDF corrupto
 */

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

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

async function debugPDFIssue() {
  log('\n🔍 Debuggeando problema del PDF corrupto', 'bold');
  log('=' .repeat(50), 'blue');
  
  try {
    // Crear datos de prueba simples
    const testPDFData = {
      number: 'FE-0000000155',
      key: '50624051000012345678901234567890123456789012',
      date: '2025-10-05',
      company: {
        name: 'InnovaSell Costa Rica',
        id: '310123456789',
        phone: '+506 2222-3333',
        email: 'facturas@innovasmartcr.com',
        address: 'San José, Costa Rica, Avenida Central'
      },
      client: {
        name: 'Cliente de Prueba',
        id: '310987654321',
        phone: '+506 88888888',
        email: 'josuexrl19@gmail.com',
        address: 'San José, Costa Rica'
      },
      items: [
        {
          description: 'Desarrollo de Software - DEBUG PDF',
          quantity: 1,
          unitPrice: 500000,
          discount: 0,
          tax: 65000,
          total: 565000
        }
      ],
      subtotal: 500000,
      totalDiscount: 0,
      totalTax: 65000,
      totalExempt: 0,
      total: 565000,
      notes: 'Prueba de debug del PDF'
    };
    
    log('\n📄 Paso 1: Generando PDF con datos simples...', 'cyan');
    
    const pdfResponse = await fetch('http://localhost:3000/api/generate-pdf-alt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPDFData)
    });
    
    if (!pdfResponse.ok) {
      log(`❌ Error en respuesta HTTP: ${pdfResponse.status}`, 'red');
      const errorText = await pdfResponse.text();
      log(`Error details: ${errorText}`, 'red');
      return false;
    }
    
    const pdfResult = await pdfResponse.json();
    
    if (!pdfResult.success) {
      log(`❌ Error generando PDF: ${pdfResult.error}`, 'red');
      return false;
    }
    
    log(`✅ PDF generado exitosamente`, 'green');
    log(`📄 Tamaño: ${pdfResult.size} caracteres base64`, 'blue');
    
    // Guardar el PDF para inspección
    const pdfBuffer = Buffer.from(pdfResult.pdf_base64, 'base64');
    const pdfPath = path.join(__dirname, 'debug-invoice.pdf');
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    log(`💾 PDF guardado en: ${pdfPath}`, 'blue');
    
    // Verificar los primeros bytes del PDF
    log('\n🔍 Paso 2: Verificando estructura del PDF...', 'cyan');
    
    const pdfStart = pdfBuffer.slice(0, 10);
    log(`📄 Primeros 10 bytes: ${pdfStart.toString('hex')}`, 'blue');
    
    // Verificar si empieza con el header PDF correcto
    const pdfHeader = pdfBuffer.slice(0, 4).toString();
    log(`📄 Header PDF: "${pdfHeader}"`, 'blue');
    
    if (pdfHeader === '%PDF') {
      log(`✅ Header PDF correcto`, 'green');
    } else {
      log(`❌ Header PDF incorrecto. Debería ser "%PDF"`, 'red');
    }
    
    // Verificar si hay caracteres no válidos
    const invalidChars = [];
    for (let i = 0; i < Math.min(pdfBuffer.length, 1000); i++) {
      const byte = pdfBuffer[i];
      if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
        invalidChars.push(`Byte ${i}: 0x${byte.toString(16)}`);
      }
    }
    
    if (invalidChars.length > 0) {
      log(`⚠️ Caracteres potencialmente problemáticos encontrados:`, 'yellow');
      invalidChars.slice(0, 10).forEach(char => log(`  ${char}`, 'yellow'));
    } else {
      log(`✅ No se encontraron caracteres problemáticos`, 'green');
    }
    
    // Verificar el tamaño del PDF
    log('\n📊 Paso 3: Análisis del tamaño...', 'cyan');
    log(`📄 Tamaño del buffer: ${pdfBuffer.length} bytes`, 'blue');
    log(`📄 Tamaño base64: ${pdfResult.size} caracteres`, 'blue');
    
    if (pdfBuffer.length < 1000) {
      log(`⚠️ PDF muy pequeño, podría estar corrupto`, 'yellow');
    } else {
      log(`✅ Tamaño del PDF parece normal`, 'green');
    }
    
    // Probar con un HTML más simple
    log('\n📄 Paso 4: Probando con HTML simplificado...', 'cyan');
    
    const simplePDFData = {
      ...testPDFData,
      company: {
        ...testPDFData.company,
        name: 'Test Company' // Nombre más simple
      },
      client: {
        ...testPDFData.client,
        name: 'Test Client' // Nombre más simple
      },
      items: [
        {
          description: 'Test Item',
          quantity: 1,
          unitPrice: 100,
          discount: 0,
          tax: 13,
          total: 113
        }
      ],
      subtotal: 100,
      totalDiscount: 0,
      totalTax: 13,
      totalExempt: 0,
      total: 113,
      notes: 'Simple test'
    };
    
    const simplePdfResponse = await fetch('http://localhost:3000/api/generate-pdf-alt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(simplePDFData)
    });
    
    const simplePdfResult = await simplePdfResponse.json();
    
    if (simplePdfResult.success) {
      log(`✅ PDF simple generado exitosamente`, 'green');
      
      const simplePdfBuffer = Buffer.from(simplePdfResult.pdf_base64, 'base64');
      const simplePdfPath = path.join(__dirname, 'debug-simple-invoice.pdf');
      fs.writeFileSync(simplePdfPath, simplePdfBuffer);
      
      log(`💾 PDF simple guardado en: ${simplePdfPath}`, 'blue');
      log(`📄 Tamaño del PDF simple: ${simplePdfBuffer.length} bytes`, 'blue');
      
      // Verificar header del PDF simple
      const simplePdfHeader = simplePdfBuffer.slice(0, 4).toString();
      log(`📄 Header PDF simple: "${simplePdfHeader}"`, 'blue');
      
      if (simplePdfHeader === '%PDF') {
        log(`✅ Header PDF simple correcto`, 'green');
      } else {
        log(`❌ Header PDF simple incorrecto`, 'red');
      }
    } else {
      log(`❌ Error generando PDF simple: ${simplePdfResult.error}`, 'red');
    }
    
    // Resumen
    log('\n' + '='.repeat(60), 'blue');
    log('🔍 DEBUG DE PDF - COMPLETADO', 'bold');
    log('=' .repeat(60), 'blue');
    
    log('\n📊 Archivos generados para inspección:', 'cyan');
    log(`  📄 debug-invoice.pdf (${pdfBuffer.length} bytes)`, 'blue');
    if (simplePdfResult.success) {
      const simplePdfBuffer = Buffer.from(simplePdfResult.pdf_base64, 'base64');
      log(`  📄 debug-simple-invoice.pdf (${simplePdfBuffer.length} bytes)`, 'blue');
    }
    
    log('\n💡 Próximos pasos:', 'cyan');
    log('  1. Abrir los archivos PDF generados en un lector', 'blue');
    log('  2. Verificar si el problema es con caracteres especiales', 'blue');
    log('  3. Revisar el HTML generado en el endpoint', 'blue');
    log('  4. Considerar usar una librería diferente si es necesario', 'blue');
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en debug: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    return false;
  }
}

async function main() {
  log('🔍 Debug del Problema del PDF', 'bold');
  
  try {
    const success = await debugPDFIssue();
    
    if (success) {
      log('\n🎯 DEBUG COMPLETADO', 'green');
      process.exit(0);
    } else {
      log('\n💥 DEBUG FALLIDO', 'red');
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

module.exports = { main, debugPDFIssue };
