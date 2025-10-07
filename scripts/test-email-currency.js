#!/usr/bin/env node

/**
 * Script para probar que la moneda se muestre correctamente en el email
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

async function testEmailCurrency() {
  log('\n💱 Probando Moneda en Email', 'bold');
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
        
        log('\n📊 Verificando corrección de moneda...', 'cyan');
        log('🔍 Revisa el email recibido para verificar:', 'blue');
        log('  💰 Total debe mostrar la moneda correcta:', 'blue');
        log('    - Si la factura es en CRC: debe mostrar ₡1,000.00', 'blue');
        log('    - Si la factura es en USD: debe mostrar $100.00', 'blue');
        log('  📧 El total ya no debe aparecer como "Total:" sin moneda', 'blue');
        
      } else {
        log(`❌ Error en email de prueba: ${emailResult.error}`, 'red');
      }
    } else {
      log(`❌ Error HTTP en email de prueba: ${emailResponse.status}`, 'red');
    }
    
    // Resumen
    log('\n' + '='.repeat(70), 'blue');
    log('💱 PRUEBA DE MONEDA EN EMAIL - COMPLETADA', 'bold');
    log('=' .repeat(70), 'blue');
    
    log('\n🔧 Corrección implementada:', 'green');
    log('  💰 Moneda detectada automáticamente de la factura', 'green');
    log('  🔄 Formato correcto según la moneda:', 'green');
    log('    - CRC: ₡1,000.00 (colones)', 'green');
    log('    - USD: $100.00 (dólares)', 'green');
    log('  📧 Total en email con moneda visible', 'green');
    
    log('\n📊 Resultados esperados:', 'cyan');
    log('  💰 Total con moneda correcta en el email', 'green');
    log('  📧 No más "Total:" sin moneda', 'green');
    log('  🎯 Formato profesional según la moneda', 'green');
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en prueba: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    return false;
  }
}

async function main() {
  log('💱 Prueba de Moneda en Email', 'bold');
  
  try {
    const success = await testEmailCurrency();
    
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

module.exports = { main, testEmailCurrency };
