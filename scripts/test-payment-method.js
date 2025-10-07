#!/usr/bin/env node

/**
 * Script para probar la forma de pago específicamente
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

async function testPaymentMethod() {
  log('\n💳 Probando Forma de Pago', 'bold');
  log('=' .repeat(60), 'blue');
  
  try {
    // Probar creando una factura con forma de pago específica
    log('\n🧪 Creando factura con forma de pago Transferencia (04)...', 'cyan');
    
    const invoiceData = {
      clientId: 'ihanbDfy76iPHOQtCbcJ',
      currency: 'USD',
      paymentMethod: '04', // Transferencia
      items: [
        {
          description: 'Servicio de prueba',
          quantity: 1,
          unitPrice: 100
        }
      ]
    };
    
    const response = await fetch('http://localhost:3000/api/invoices/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    });
    
    if (response.ok) {
      const result = await response.json();
      log(`✅ Factura creada exitosamente`, 'green');
      log(`📄 Consecutivo: ${result.consecutivo}`, 'blue');
      
      log('\n📊 Revisa los logs del servidor para ver:', 'cyan');
      log('🔍 [PDF] Debug Forma de Pago:', 'blue');
      log('  - invoiceData.invoice?.paymentMethod: [debe ser "04"]', 'blue');
      log('  - formaPago final: [debe ser "04"]', 'blue');
      log('  - paymentMethodName: [debe ser "Transferencia"]', 'blue');
      
    } else {
      log(`❌ Error creando factura: ${response.status}`, 'red');
      const errorText = await response.text();
      log(`Error: ${errorText}`, 'red');
    }
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en prueba: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('💳 Prueba de Forma de Pago', 'bold');
  
  try {
    const success = await testPaymentMethod();
    
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

module.exports = { main, testPaymentMethod };
