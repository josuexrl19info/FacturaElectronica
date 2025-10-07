#!/usr/bin/env node

/**
 * Script para debuggear el problema de moneda en PDF
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

async function debugCurrencyIssue() {
  log('\n🔍 Debuggeando Problema de Moneda en PDF', 'bold');
  log('=' .repeat(60), 'blue');
  
  try {
    // Probar con datos reales del sistema
    log('\n🧪 Enviando email de prueba para ver logs de debug...', 'cyan');
    
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
        log('🔍 [PDF] Debug Mapeo Moneda:', 'blue');
        log('  - invoice.currency: [valor]', 'blue');
        log('  - invoice.moneda: [valor]', 'blue');
        log('  - mapped moneda: [valor]', 'blue');
        log('🔍 [PDF] Debug Moneda:', 'blue');
        log('  - invoiceData.invoice?.moneda: [valor]', 'blue');
        log('  - invoiceData.moneda: [valor]', 'blue');
        log('  - currency final: [valor]', 'blue');
        
      } else {
        log(`❌ Error en email de prueba: ${emailResult.error}`, 'red');
      }
    } else {
      log(`❌ Error HTTP en email de prueba: ${emailResponse.status}`, 'red');
    }
    
    // Resumen
    log('\n' + '='.repeat(70), 'blue');
    log('🔍 DEBUG DE MONEDA - COMPLETADO', 'bold');
    log('=' .repeat(70), 'blue');
    
    log('\n🔍 Pasos para debuggear:', 'green');
    log('  1. Revisa los logs del servidor', 'blue');
    log('  2. Busca las líneas que empiezan con "🔍 [PDF]"', 'blue');
    log('  3. Verifica qué valores están llegando:', 'blue');
    log('    - invoice.currency', 'blue');
    log('    - invoice.moneda', 'blue');
    log('    - invoiceData.invoice?.moneda', 'blue');
    log('    - invoiceData.moneda', 'blue');
    log('  4. Identifica cuál campo tiene el valor correcto', 'blue');
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en debug: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    return false;
  }
}

async function main() {
  log('🔍 Debug de Problema de Moneda en PDF', 'bold');
  
  try {
    const success = await debugCurrencyIssue();
    
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

module.exports = { main, debugCurrencyIssue };
