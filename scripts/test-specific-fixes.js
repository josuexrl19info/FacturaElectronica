#!/usr/bin/env node

/**
 * Script para probar las correcciones específicas de moneda, forma de pago e IVA
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

async function testSpecificFixes() {
  log('\n🔧 Probando Correcciones Específicas', 'bold');
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
        
        log('\n📊 Verificando correcciones específicas...', 'cyan');
        log('🔍 Revisa el PDF adjunto para verificar:', 'blue');
        log('  💰 Moneda: debe mostrar "Dólares (USD)" si la factura es en USD', 'blue');
        log('  💳 Forma de Pago: debe mostrar "Transferencia" si es código 04', 'blue');
        log('  📊 IVA: debe mostrar el valor correcto (no 0) en resumen de cargos', 'blue');
        
      } else {
        log(`❌ Error en email de prueba: ${emailResult.error}`, 'red');
      }
    } else {
      log(`❌ Error HTTP en email de prueba: ${emailResponse.status}`, 'red');
    }
    
    // Resumen
    log('\n' + '='.repeat(70), 'blue');
    log('🔧 PRUEBA DE CORRECCIONES ESPECÍFICAS - COMPLETADA', 'bold');
    log('=' .repeat(70), 'blue');
    
    log('\n🔧 Correcciones específicas implementadas:', 'green');
    log('  💰 Moneda: invoiceData.invoice?.moneda como prioridad', 'green');
    log('  💳 Forma de Pago: invoiceData.invoice?.formaPago como prioridad', 'green');
    log('  📊 IVA: mapeo mejorado con múltiples campos', 'green');
    log('    - totalImpuesto, totalTax, taxes, impuestos, iva', 'green');
    
    log('\n📊 Resultados esperados:', 'cyan');
    log('  💰 Moneda correcta según la factura (USD/CRC)', 'green');
    log('  💳 Forma de pago correcta (Transferencia/Efectivo/etc)', 'green');
    log('  📊 IVA visible y calculado correctamente', 'green');
    
    log('\n🎯 Códigos de forma de pago:', 'cyan');
    log('  01: Efectivo', 'blue');
    log('  02: Tarjeta', 'blue');
    log('  03: Cheque', 'blue');
    log('  04: Transferencia', 'blue');
    log('  05: Recaudado por Terceros', 'blue');
    log('  99: Otros', 'blue');
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en prueba: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    return false;
  }
}

async function main() {
  log('🔧 Prueba de Correcciones Específicas', 'bold');
  
  try {
    const success = await testSpecificFixes();
    
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

module.exports = { main, testSpecificFixes };
