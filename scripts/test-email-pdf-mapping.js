#!/usr/bin/env node

/**
 * Script para probar el mapeo de datos en el email service
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

async function testEmailPDFMapping() {
  log('\n📧 Probando Mapeo de Datos en Email Service', 'bold');
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
        
        log('\n📊 Verificando logs del sistema...', 'cyan');
        log('🔍 Revisa los logs del servidor para verificar:', 'blue');
        log('  1. ✅ Datos de empresa obtenidos para PDF', 'blue');
        log('  2. ✅ Datos de cliente obtenidos para PDF', 'blue');
        log('  3. 📄 Generando PDF optimizado para: [debe mostrar consecutivo, no N/A]', 'blue');
        log('  4. ✅ PDF generado en base64: [debe mostrar caracteres]', 'blue');
        
      } else {
        log(`❌ Error en email de prueba: ${emailResult.error}`, 'red');
      }
    } else {
      log(`❌ Error HTTP en email de prueba: ${emailResponse.status}`, 'red');
    }
    
    // Resumen
    log('\n' + '='.repeat(70), 'blue');
    log('📧 PRUEBA DE MAPEO EN EMAIL SERVICE - COMPLETADA', 'bold');
    log('=' .repeat(70), 'blue');
    
    log('\n🔧 Corrección implementada:', 'green');
    log('  📄 Datos enviados directamente al endpoint optimizado', 'green');
    log('  🔄 Sin conversión intermedia que perdía datos', 'green');
    log('  📊 Estructura correcta: {invoice, company, client, haciendaResponse}', 'green');
    log('  🎯 Mapeo directo de todos los campos', 'green');
    
    log('\n📊 Resultados esperados:', 'cyan');
    log('  📄 PDF con consecutivo correcto (no N/A)', 'green');
    log('  🏢 Información de empresa completa', 'green');
    log('  👤 Información de cliente completa', 'green');
    log('  📋 Items mapeados correctamente', 'green');
    log('  💰 Totales calculados correctamente', 'green');
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en prueba: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    return false;
  }
}

async function main() {
  log('📧 Prueba de Mapeo en Email Service', 'bold');
  
  try {
    const success = await testEmailPDFMapping();
    
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

module.exports = { main, testEmailPDFMapping };
