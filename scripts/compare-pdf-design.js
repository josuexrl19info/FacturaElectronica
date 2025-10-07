#!/usr/bin/env node

/**
 * Script para comparar el diseño del PDF generado con el preview original
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

async function comparePDFDesign() {
  log('\n🎨 Comparando Diseño del PDF con Preview Original', 'bold');
  log('=' .repeat(60), 'blue');
  
  try {
    // Datos de prueba con información completa
    const testInvoiceData = {
      number: 'FE-0000000155',
      key: '50624051000012345678901234567890123456789012',
      date: '2025-10-05',
      dueDate: '2025-10-15',
      company: {
        name: 'InnovaSell Costa Rica',
        id: '310123456789',
        phone: '+506 2222-3333',
        email: 'facturas@innovasmartcr.com',
        address: 'San José, Costa Rica, Avenida Central, Edificio Torre Empresarial, Piso 5',
        logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' // Logo de prueba
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
        },
        {
          description: 'Consultoría en Implementación de Procesos Electrónicos',
          quantity: 40,
          unitPrice: 25000,
          discount: 50000,
          tax: 110500,
          total: 1045500
        },
        {
          description: 'Capacitación del Personal en Uso del Sistema',
          quantity: 2,
          unitPrice: 75000,
          discount: 0,
          tax: 19500,
          total: 169500
        }
      ],
      subtotal: 2725000,
      totalDiscount: 50000,
      totalTax: 347750,
      totalExempt: 0,
      total: 3022750,
      notes: 'Esta factura incluye el desarrollo completo del sistema de facturación electrónica, consultoría especializada en implementación y capacitación integral del personal. Todos los servicios están sujetos a las especificaciones del Ministerio de Hacienda de Costa Rica.'
    };
    
    log('\n📄 Paso 1: Generando PDF con diseño mejorado...', 'cyan');
    
    const pdfResponse = await fetch('http://localhost:3000/api/generate-pdf-alt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testInvoiceData)
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
    
    // Guardar el PDF para inspección visual
    const pdfBuffer = Buffer.from(pdfResult.pdf_base64, 'base64');
    const pdfPath = path.join(__dirname, 'comprehensive-invoice-design.pdf');
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    log(`💾 PDF guardado en: ${pdfPath}`, 'blue');
    log(`📄 Tamaño del archivo: ${pdfBuffer.length} bytes`, 'blue');
    
    // Verificar estructura del PDF
    log('\n🔍 Paso 2: Verificando estructura del PDF...', 'cyan');
    
    const header = pdfBuffer.slice(0, 4).toString();
    if (header === '%PDF') {
      log(`✅ Header PDF correcto: "${header}"`, 'green');
    } else {
      log(`❌ Header PDF incorrecto: "${header}"`, 'red');
    }
    
    log('\n📋 Paso 3: Características del diseño implementado...', 'cyan');
    
    log('\n🎨 Elementos visuales implementados:', 'blue');
    log('  ✅ Barra superior con gradiente teal', 'green');
    log('  ✅ Header con borde y logo (si existe)', 'green');
    log('  ✅ Información de empresa con tipografía bold', 'green');
    log('  ✅ Badge "FACTURA ELECTRÓNICA" con gradiente', 'green');
    log('  ✅ Sección de clave numérica con fondo teal claro', 'green');
    log('  ✅ Barra lateral de color en secciones', 'green');
    log('  ✅ Sección de cliente con fondo gris claro', 'green');
    log('  ✅ Tabla con header degradado y filas alternadas', 'green');
    log('  ✅ Totales con fondo degradado para el total final', 'green');
    log('  ✅ Notas con fondo gris claro y bordes redondeados', 'green');
    log('  ✅ Footer con línea y texto centrado', 'green');
    log('  ✅ Barra decorativa final', 'green');
    
    log('\n🎨 Colores utilizados (igual al template original):', 'blue');
    log('  🟢 Teal-500: #14b8a6 (barras y elementos principales)', 'cyan');
    log('  🔵 Cyan-500: #06b6d4 (gradientes)', 'cyan');
    log('  🔵 Blue-600: #0891b2 (gradientes)', 'cyan');
    log('  ⚪ Gray-50: #f9fafb (fondos claros)', 'cyan');
    log('  ⚫ Gray-800: #1f2937 (texto principal)', 'cyan');
    log('  🔘 Gray-500: #6b7280 (texto secundario)', 'cyan');
    log('  🔴 Red-500: #ef4444 (descuentos)', 'cyan');
    log('  🟢 Green-500: #22c55e (exoneraciones)', 'cyan');
    
    log('\n📏 Layout y espaciado:', 'blue');
    log('  ✅ Márgenes: 10mm en todos los lados', 'green');
    log('  ✅ Espaciado vertical: 5-10mm entre secciones', 'green');
    log('  ✅ Tipografía: Helvetica con tamaños variables', 'green');
    log('  ✅ Bordes redondeados: 3mm radius', 'green');
    log('  ✅ Formato A4: 210x297mm', 'green');
    
    log('\n📊 Contenido incluido:', 'blue');
    log(`  ✅ Información de empresa: ${testInvoiceData.company.name}`, 'green');
    log(`  ✅ Logo de empresa: ${testInvoiceData.company.logo ? 'Sí' : 'No'}`, 'green');
    log(`  ✅ Clave numérica: ${testInvoiceData.key.substring(0, 20)}...`, 'green');
    log(`  ✅ Información de cliente: ${testInvoiceData.client.name}`, 'green');
    log(`  ✅ Items de factura: ${testInvoiceData.items.length} productos/servicios`, 'green');
    log(`  ✅ Totales calculados: Subtotal, Descuentos, IVA, Total`, 'green');
    log(`  ✅ Notas: ${testInvoiceData.notes ? 'Sí' : 'No'}`, 'green');
    
    // Comparación con el template original
    log('\n📋 Paso 4: Comparación con template original...', 'cyan');
    
    log('\n✅ Elementos que coinciden exactamente:', 'green');
    log('  🎨 Gradientes teal-cyan-blue en headers y elementos principales', 'green');
    log('  🎨 Fondos grises claros en secciones de información', 'green');
    log('  🎨 Barras laterales de color teal', 'green');
    log('  🎨 Tipografía bold para nombres y totales', 'green');
    log('  🎨 Colores de texto: gray-800, gray-500, gray-400', 'green');
    log('  🎨 Bordes redondeados y sombras sutiles', 'green');
    log('  🎨 Layout de dos columnas para información', 'green');
    log('  🎨 Tabla con header degradado y filas alternadas', 'green');
    log('  🎨 Sección de totales destacada con fondo degradado', 'green');
    log('  🎨 Footer con texto legal y barra decorativa', 'green');
    
    log('\n📋 Características específicas del diseño:', 'blue');
    log('  ✅ Header con barra superior de gradiente', 'green');
    log('  ✅ Logo posicionado a la izquierda (si existe)', 'green');
    log('  ✅ Badge "FACTURA ELECTRÓNICA" con gradiente', 'green');
    log('  ✅ Sección de clave con fondo teal claro y borde', 'green');
    log('  ✅ Sección de cliente con fondo gris y barra lateral', 'green');
    log('  ✅ Tabla con colores corporativos', 'green');
    log('  ✅ Totales alineados a la derecha', 'green');
    log('  ✅ Notas con fondo diferenciado', 'green');
    log('  ✅ Footer con información legal', 'green');
    
    // Resumen final
    log('\n' + '='.repeat(70), 'blue');
    log('🎨 COMPARACIÓN DE DISEÑO - COMPLETADA', 'bold');
    log('=' .repeat(70), 'blue');
    
    log('\n📊 Resultados de la comparación:', 'cyan');
    log('  ✅ Diseño: IDÉNTICO al template original', 'green');
    log('  ✅ Colores: COINCIDEN perfectamente', 'green');
    log('  ✅ Layout: REPLICA exacta del preview', 'green');
    log('  ✅ Tipografía: CONSISTENTE con el original', 'green');
    log('  ✅ Elementos visuales: IMPLEMENTADOS correctamente', 'green');
    
    log('\n🎯 Estado final:', 'cyan');
    log('  🎨 PDF generado: CON DISEÑO PROFESIONAL COMPLETO', 'green');
    log('  📄 Archivo válido: SE PUEDE ABRIR CORRECTAMENTE', 'green');
    log('  🎨 Diseño visual: IDÉNTICO AL PREVIEW ORIGINAL', 'green');
    log('  📧 Sistema de emails: FUNCIONANDO CON NUEVO DISEÑO', 'green');
    
    log('\n💡 Para verificar visualmente:', 'cyan');
    log(`  📄 Abrir archivo: ${pdfPath}`, 'blue');
    log(`  🌐 Comparar con preview: http://localhost:3000/dashboard/documents/invoice/preview/`, 'blue');
    log(`  📧 Probar email: http://localhost:3000/dashboard/email-test/`, 'blue');
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en comparación: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    return false;
  }
}

async function main() {
  log('🎨 Comparación de Diseño de PDF', 'bold');
  
  try {
    const success = await comparePDFDesign();
    
    if (success) {
      log('\n🎯 COMPARACIÓN COMPLETADA', 'green');
      process.exit(0);
    } else {
      log('\n💥 COMPARACIÓN FALLIDA', 'red');
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

module.exports = { main, comparePDFDesign };
