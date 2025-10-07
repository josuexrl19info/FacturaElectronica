#!/usr/bin/env node

/**
 * Script para debuggear el tamaño excesivo del PDF
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

async function debugPDFSize() {
  log('\n🔍 Debuggeando Tamaño Excesivo del PDF', 'bold');
  log('=' .repeat(50), 'blue');
  
  try {
    // Generar PDF de prueba con datos similares a los del log
    log('\n📄 Paso 1: Generando PDF con datos del log real...', 'cyan');
    
    const testPDFData = {
      number: 'FE-0000000161',
      key: '50605102500310286786000100001010000000161196090626',
      date: '2025-10-05',
      dueDate: '2025-10-15',
      company: {
        name: 'InnovaSell Costa Rica',
        id: '310123456789',
        phone: '+506 2222-3333',
        email: 'facturas@innovasmartcr.com',
        address: 'San José, Costa Rica, Avenida Central, Edificio Torre Empresarial, Piso 5',
        logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' // Logo pequeño de prueba
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
          description: 'Desarrollo de Software Personalizado - Sistema de Facturación Electrónica con integración a Hacienda y procesamiento de documentos',
          quantity: 1,
          unitPrice: 2500000,
          discount: 0,
          tax: 325000,
          total: 2825000
        },
        {
          description: 'Consultoría en Implementación de Procesos Electrónicos y Migración de Sistemas',
          quantity: 40,
          unitPrice: 45000,
          discount: 50000,
          tax: 198500,
          total: 1798500
        }
      ],
      subtotal: 4325000,
      totalDiscount: 50000,
      totalTax: 562250,
      totalExempt: 0,
      total: 4837250,
      notes: 'Esta factura incluye el desarrollo completo del sistema de facturación electrónica, consultoría especializada en implementación, capacitación integral del personal y soporte técnico continuo. Todos los servicios están sujetos a las especificaciones del Ministerio de Hacienda de Costa Rica y cumplen con las normativas vigentes.'
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
      const errorText = await pdfResponse.text();
      log(`Error details: ${errorText}`, 'red');
      return false;
    }
    
    const pdfResult = await pdfResponse.json();
    
    if (!pdfResult.success) {
      log(`❌ Error en PDF: ${pdfResult.error}`, 'red');
      return false;
    }
    
    const pdfBase64 = pdfResult.pdf_base64;
    const pdfSize = Buffer.byteLength(pdfBase64, 'utf8');
    const pdfSizeMB = (pdfSize / (1024 * 1024)).toFixed(2);
    
    log(`✅ PDF generado exitosamente`, 'green');
    log(`📄 Tamaño del PDF: ${formatBytes(pdfSize)} (${pdfSizeMB} MB)`, 'blue');
    
    // Guardar PDF para análisis
    const fs = require('fs');
    const path = require('path');
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const pdfPath = path.join(__dirname, 'debug-large-pdf.pdf');
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    log(`💾 PDF guardado en: ${pdfPath}`, 'blue');
    
    // Analizar el problema
    log('\n🔍 Paso 2: Análisis del problema...', 'cyan');
    
    if (pdfSize > 10 * 1024 * 1024) { // 10 MB
      log(`❌ PROBLEMA CONFIRMADO: PDF demasiado grande (${pdfSizeMB} MB)`, 'red');
      log(`📊 Tamaño esperado: < 2 MB`, 'yellow');
      log(`📊 Tamaño actual: ${pdfSizeMB} MB`, 'red');
      log(`📊 Exceso: ${(pdfSizeMB - 2).toFixed(2)} MB`, 'red');
    } else {
      log(`✅ PDF de tamaño normal (${pdfSizeMB} MB)`, 'green');
    }
    
    // Verificar estructura del PDF
    log('\n📋 Paso 3: Verificando estructura del PDF...', 'cyan');
    
    const header = pdfBuffer.slice(0, 4).toString();
    if (header === '%PDF') {
      log(`✅ Header PDF correcto: "${header}"`, 'green');
    } else {
      log(`❌ Header PDF incorrecto: "${header}"`, 'red');
    }
    
    // Buscar posibles causas del tamaño excesivo
    log('\n🔍 Paso 4: Buscando causas del tamaño excesivo...', 'cyan');
    
    // Buscar imágenes grandes en el PDF
    const pdfContent = pdfBuffer.toString('binary');
    
    // Buscar patrones de imágenes
    const imagePatterns = [
      /\/Image\s+/g,
      /\/FlateDecode/g,
      /\/DCTDecode/g,
      /\/JPXDecode/g
    ];
    
    let imageCount = 0;
    imagePatterns.forEach(pattern => {
      const matches = pdfContent.match(pattern);
      if (matches) {
        imageCount += matches.length;
        log(`📸 Encontrados ${matches.length} patrones de imagen: ${pattern}`, 'blue');
      }
    });
    
    log(`📸 Total de patrones de imagen encontrados: ${imageCount}`, 'blue');
    
    // Buscar strings muy largos (posibles datos duplicados)
    const longStrings = [];
    const lines = pdfContent.split('\n');
    lines.forEach((line, index) => {
      if (line.length > 10000) {
        longStrings.push({ line: index + 1, length: line.length });
      }
    });
    
    if (longStrings.length > 0) {
      log(`📄 Encontradas ${longStrings.length} líneas muy largas:`, 'yellow');
      longStrings.forEach(str => {
        log(`  Línea ${str.line}: ${str.length} caracteres`, 'yellow');
      });
    }
    
    // Verificar si hay datos duplicados
    const contentLength = pdfContent.length;
    const uniqueContent = [...new Set(pdfContent.split(''))].join('');
    const duplicateRatio = (contentLength - uniqueContent.length) / contentLength;
    
    log(`📊 Ratio de duplicación: ${(duplicateRatio * 100).toFixed(2)}%`, 'blue');
    
    if (duplicateRatio > 0.3) {
      log(`⚠️ Posible problema: Alto nivel de duplicación (${(duplicateRatio * 100).toFixed(2)}%)`, 'yellow');
    }
    
    // Recomendaciones
    log('\n💡 Paso 5: Recomendaciones para reducir tamaño...', 'cyan');
    
    log('\n🔧 Soluciones para reducir el tamaño del PDF:', 'yellow');
    log('  1. Optimizar imágenes y logos', 'blue');
    log('  2. Reducir calidad de imágenes', 'blue');
    log('  3. Comprimir el PDF con jsPDF', 'blue');
    log('  4. Eliminar metadatos innecesarios', 'blue');
    log('  5. Usar fuentes más ligeras', 'blue');
    log('  6. Simplificar el diseño', 'blue');
    
    // Probar con PDF optimizado
    log('\n🧪 Paso 6: Probando optimizaciones...', 'cyan');
    
    // Crear versión optimizada sin logo
    const optimizedPDFData = {
      ...testPDFData,
      company: {
        ...testPDFData.company,
        logo: undefined // Sin logo
      }
    };
    
    const optimizedResponse = await fetch('http://localhost:3000/api/generate-pdf-alt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(optimizedPDFData)
    });
    
    if (optimizedResponse.ok) {
      const optimizedResult = await optimizedResponse.json();
      
      if (optimizedResult.success) {
        const optimizedSize = Buffer.byteLength(optimizedResult.pdf_base64, 'utf8');
        const optimizedSizeMB = (optimizedSize / (1024 * 1024)).toFixed(2);
        
        log(`📄 PDF sin logo: ${formatBytes(optimizedSize)} (${optimizedSizeMB} MB)`, 'blue');
        
        const reduction = ((pdfSize - optimizedSize) / pdfSize * 100).toFixed(1);
        log(`📊 Reducción: ${reduction}%`, 'blue');
        
        if (reduction > 10) {
          log(`✅ Logo contribuye significativamente al tamaño`, 'green');
        }
      }
    }
    
    // Resumen
    log('\n' + '='.repeat(60), 'blue');
    log('🔍 ANÁLISIS DE TAMAÑO DE PDF - COMPLETADO', 'bold');
    log('=' .repeat(60), 'blue');
    
    log('\n📊 Resumen del análisis:', 'cyan');
    log(`  📄 Tamaño del PDF: ${formatBytes(pdfSize)} (${pdfSizeMB} MB)`, 'blue');
    log(`  📊 Tamaño esperado: < 2 MB`, 'yellow');
    log(`  🚨 Estado: ${pdfSize > 10 * 1024 * 1024 ? 'DEMASIADO GRANDE' : 'NORMAL'}`, pdfSize > 10 * 1024 * 1024 ? 'red' : 'green');
    log(`  📸 Patrones de imagen: ${imageCount}`, 'blue');
    log(`  📄 Líneas largas: ${longStrings.length}`, 'blue');
    log(`  📊 Duplicación: ${(duplicateRatio * 100).toFixed(2)}%`, 'blue');
    
    log('\n💡 Próximos pasos:', 'cyan');
    log('  1. Implementar optimización de imágenes', 'blue');
    log('  2. Reducir calidad de logos', 'blue');
    log('  3. Comprimir PDF con jsPDF', 'blue');
    log('  4. Simplificar diseño si es necesario', 'blue');
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en análisis: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    return false;
  }
}

async function main() {
  log('🔍 Análisis de Tamaño de PDF', 'bold');
  
  try {
    const success = await debugPDFSize();
    
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

module.exports = { main, debugPDFSize };
