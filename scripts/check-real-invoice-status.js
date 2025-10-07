#!/usr/bin/env node

/**
 * Script para consultar el estado real de una factura específica
 * y verificar si tiene los XMLs poblados
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

async function checkRealInvoiceStatus() {
  log('\n🔍 Consultando estado real de factura', 'bold');
  log('=' .repeat(50), 'blue');
  
  try {
    // Usar la factura que vimos en los logs
    const invoiceId = 'vHGSyfK7d5at4c6O96NBxNa7fTR2'; // ID de la factura FE-0000000151
    
    log('\n📋 Paso 1: Consultando estado de factura específica...', 'cyan');
    log(`  ID de factura: ${invoiceId}`, 'blue');
    
    // Consultar estado usando el API
    const statusResponse = await fetch(`http://localhost:3000/api/invoices/status?invoiceId=${invoiceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!statusResponse.ok) {
      log(`  ❌ Error consultando estado: ${statusResponse.status}`, 'red');
      const errorText = await statusResponse.text();
      log(`  Error: ${errorText}`, 'red');
      return false;
    }
    
    const statusResult = await statusResponse.json();
    
    if (!statusResult.success) {
      log(`  ❌ Error en respuesta: ${statusResult.error}`, 'red');
      return false;
    }
    
    log('  ✅ Estado obtenido exitosamente', 'green');
    
    const invoice = statusResult.invoice;
    log('\n📄 Información de la factura:', 'cyan');
    log(`  ID: ${invoice.id}`, 'blue');
    log(`  Consecutivo: ${invoice.consecutivo}`, 'blue');
    log(`  Status: ${invoice.status}`, 'blue');
    log(`  Status Description: ${invoice.statusDescription}`, 'blue');
    log(`  Is Final Status: ${invoice.isFinalStatus}`, 'blue');
    log(`  Created At: ${invoice.createdAt}`, 'blue');
    log(`  Updated At: ${invoice.updatedAt}`, 'blue');
    log(`  Last Status Check: ${invoice.lastStatusCheck}`, 'blue');
    
    log('\n📄 Campos XML:', 'cyan');
    log(`  xmlSigned: ${invoice.xmlSigned ? '✅ Disponible (' + invoice.xmlSigned.length + ' chars)' : '❌ No disponible'}`, invoice.xmlSigned ? 'green' : 'red');
    log(`  haciendaSubmission: ${invoice.haciendaSubmission ? '✅ Disponible' : '❌ No disponible'}`, invoice.haciendaSubmission ? 'green' : 'red');
    
    if (invoice.haciendaSubmission) {
      log('  📊 Estructura de haciendaSubmission:', 'blue');
      log(`    - ind-estado: ${invoice.haciendaSubmission['ind-estado'] || 'N/A'}`, 'blue');
      log(`    - estado: ${invoice.haciendaSubmission.estado || 'N/A'}`, 'blue');
      log(`    - state: ${invoice.haciendaSubmission.state || 'N/A'}`, 'blue');
      log(`    - clave: ${invoice.haciendaSubmission.clave || 'N/A'}`, 'blue');
      log(`    - respuesta-xml: ${invoice.haciendaSubmission['respuesta-xml'] ? '✅ Disponible (' + invoice.haciendaSubmission['respuesta-xml'].length + ' chars)' : '❌ No disponible'}`, invoice.haciendaSubmission['respuesta-xml'] ? 'green' : 'red');
      
      // Mostrar estructura completa si está disponible
      log('\n  📋 Estructura completa:', 'blue');
      console.log(JSON.stringify(invoice.haciendaSubmission, null, 2));
    }
    
    // Probar envío de email con esta factura real
    if (invoice.status === 'Aceptado' || invoice.status === 'accepted') {
      log('\n📧 Paso 2: Probando envío de email con factura real...', 'cyan');
      
      // Simular la factura completa para el servicio de email
      const fullInvoice = {
        id: invoice.id,
        consecutivo: invoice.consecutivo,
        status: invoice.status,
        clientId: 'ihanbDfy76iPHOQtCbcJ', // ID del cliente que vimos en los logs
        cliente: {
          nombre: 'Cliente de Prueba',
          email: 'josuexrl19@gmail.com'
        },
        total: 50000,
        fecha: new Date(),
        xmlSigned: invoice.xmlSigned,
        haciendaSubmission: invoice.haciendaSubmission
      };
      
      log('  📄 Factura preparada para email:', 'blue');
      log(`    - xmlSigned: ${fullInvoice.xmlSigned ? '✅ Disponible' : '❌ No disponible'}`, fullInvoice.xmlSigned ? 'green' : 'red');
      log(`    - haciendaSubmission: ${fullInvoice.haciendaSubmission ? '✅ Disponible' : '❌ No disponible'}`, fullInvoice.haciendaSubmission ? 'green' : 'red');
      log(`    - respuesta-xml: ${fullInvoice.haciendaSubmission?.['respuesta-xml'] ? '✅ Disponible' : '❌ No disponible'}`, fullInvoice.haciendaSubmission?.['respuesta-xml'] ? 'green' : 'red');
      
      // Probar el servicio de email
      const emailResponse = await fetch('http://localhost:3000/api/email/test-invoice-email/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testEmail: 'josuexrl19.info@gmail.com',
          simulateApproval: true,
          mockInvoice: fullInvoice
        })
      });
      
      const emailResult = await emailResponse.json();
      
      if (emailResult.success) {
        log('  ✅ Email enviado exitosamente con factura real', 'green');
        log(`  📧 Message ID: ${emailResult.messageId}`, 'blue');
      } else {
        log(`  ❌ Error enviando email: ${emailResult.error}`, 'red');
      }
    } else {
      log('\n⚠️ La factura no está en estado "Aceptado", no se enviará email', 'yellow');
    }
    
    // Resumen final
    log('\n' + '='.repeat(60), 'blue');
    log('🔍 CONSULTA COMPLETADA', 'bold');
    log('=' .repeat(60), 'blue');
    
    log('\n📊 Resultados de la consulta:', 'cyan');
    log(`  📋 Factura encontrada: ${invoice.id}`, 'green');
    log(`  📄 Consecutivo: ${invoice.consecutivo}`, 'blue');
    log(`  📊 Status: ${invoice.status}`, 'blue');
    log(`  📄 xmlSigned: ${invoice.xmlSigned ? '✅ Disponible' : '❌ No disponible'}`, invoice.xmlSigned ? 'green' : 'red');
    log(`  📄 haciendaSubmission: ${invoice.haciendaSubmission ? '✅ Disponible' : '❌ No disponible'}`, invoice.haciendaSubmission ? 'green' : 'red');
    
    if (invoice.haciendaSubmission) {
      log(`  📄 respuesta-xml: ${invoice.haciendaSubmission['respuesta-xml'] ? '✅ Disponible' : '❌ No disponible'}`, invoice.haciendaSubmission['respuesta-xml'] ? 'green' : 'red');
    }
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en consulta: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('🔍 Consulta de Estado Real de Factura', 'bold');
  
  try {
    const success = await checkRealInvoiceStatus();
    
    if (success) {
      log('\n🎯 CONSULTA COMPLETADA', 'green');
      process.exit(0);
    } else {
      log('\n💥 CONSULTA FALLIDA', 'red');
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

module.exports = { main, checkRealInvoiceStatus };
