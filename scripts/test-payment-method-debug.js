#!/usr/bin/env node

/**
 * Script para debuggear específicamente la forma de pago
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

async function testPaymentMethodDebug() {
  log('\n💳 Debug de Forma de Pago', 'bold');
  log('=' .repeat(60), 'blue');
  
  try {
    // Probar enviando un email de prueba para ver los logs de mapeo
    log('\n🧪 Enviando email de prueba para ver logs de mapeo...', 'cyan');
    
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
        
        log('\n📊 Revisa los logs del servidor para ver:', 'cyan');
        log('🔍 [PDF] Debug Mapeo Forma de Pago:', 'blue');
        log('  - invoice.paymentMethod: [debe ser "04"]', 'blue');
        log('  - invoice.formaPago: [puede ser undefined]', 'blue');
        log('  - invoice.paymentMethodCode: [puede ser undefined]', 'blue');
        log('  - mapped formaPago: [debe ser "04"]', 'blue');
        
        log('\n🔍 [PDF] Debug Forma de Pago:', 'blue');
        log('  - invoiceData.invoice?.paymentMethod: [debe ser "04"]', 'blue');
        log('  - formaPago final: [debe ser "04"]', 'blue');
        log('  - paymentMethodName: [debe ser "Transferencia"]', 'blue');
        
        log('\n💡 Si mapped formaPago es "01" en lugar de "04",', 'yellow');
        log('   entonces el problema está en el mapeo de formatInvoiceDataForPDFOptimized', 'yellow');
        
      } else {
        log(`❌ Error en email de prueba: ${emailResult.error}`, 'red');
      }
    } else {
      log(`❌ Error HTTP en email de prueba: ${emailResponse.status}`, 'red');
    }
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en prueba: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('💳 Debug de Forma de Pago', 'bold');
  
  try {
    const success = await testPaymentMethodDebug();
    
    if (success) {
      log('\n🎯 DEBUG COMPLETADO', 'green');
      log('📋 Revisa los logs del servidor para identificar el problema', 'cyan');
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

module.exports = { main, testPaymentMethodDebug };
