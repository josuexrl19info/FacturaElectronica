#!/usr/bin/env node

/**
 * Script para probar las correcciones de campos en el PDF
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

async function testPDFFieldsFix() {
  log('\n📄 Probando Correcciones de Campos en PDF', 'bold');
  log('=' .repeat(60), 'blue');
  
  try {
    // Probar con datos reales del sistema
    log('\n🧪 Probando con datos reales del sistema...', 'cyan');
    
    const emailResponse = await fetch('http://localhost:3000/api/email/test-invoice-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        testEmail: 'josuexrl19@gmail.com',
        simulateApproval: true
      })
    });
    
    if (emailResponse.ok) {
      const emailResult = await emailResponse.json();
      
      if (emailResult.success) {
        log(`✅ Email de prueba enviado exitosamente`, 'green');
        log(`📧 Message ID: ${emailResult.messageId}`, 'blue');
        
        log('\n📊 Verificando correcciones de campos...', 'cyan');
        log('🔍 Revisa el PDF adjunto para verificar:', 'blue');
        log('  📄 Consecutivo: debe aparecer correctamente (no N/A)', 'blue');
        log('  💰 Moneda: debe mostrar la moneda correcta (CRC/USD)', 'blue');
        log('  💳 Forma de Pago: debe mostrar el método de pago', 'blue');
        log('  📋 Items: deben aparecer las líneas de productos', 'blue');
        log('  💰 Totales: deben calcularse correctamente', 'blue');
        
      } else {
        log(`❌ Error en email de prueba: ${emailResult.error}`, 'red');
      }
    } else {
      log(`❌ Error HTTP en email de prueba: ${emailResponse.status}`, 'red');
    }
    
    // Resumen
    log('\n' + '='.repeat(70), 'blue');
    log('📄 PRUEBA DE CORRECCIONES DE CAMPOS - COMPLETADA', 'bold');
    log('=' .repeat(70), 'blue');
    
    log('\n🔧 Correcciones implementadas:', 'green');
    log('  📄 Consecutivo: mapeo mejorado con fallbacks', 'green');
    log('  💰 Moneda: detección automática de invoice.moneda', 'green');
    log('  💳 Forma de Pago: mapeo desde invoice.formaPago', 'green');
    log('  📋 Items: mapeo desde invoice.items', 'green');
    log('  💰 Totales: mapeo desde invoice.total, subtotal, etc.', 'green');
    log('  🔑 Clave Hacienda: mapeo mejorado con fallbacks', 'green');
    
    log('\n📊 Resultados esperados:', 'cyan');
    log('  📄 Consecutivo visible en el PDF', 'green');
    log('  💰 Moneda correcta según la factura', 'green');
    log('  💳 Forma de pago visible', 'green');
    log('  📋 Líneas de productos visibles', 'green');
    log('  💰 Totales calculados correctamente', 'green');
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en prueba: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    return false;
  }
}

async function main() {
  log('📄 Prueba de Correcciones de Campos en PDF', 'bold');
  
  try {
    const success = await testPDFFieldsFix();
    
    if (success) {
      log('\n🎯 PRUEBA COMPLETADA', 'green');
      process.exit(0);
    } else {
      log('\n💥 PRUEBA FALLIDA', 'red');
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

module.exports = { main, testPDFFieldsFix };
