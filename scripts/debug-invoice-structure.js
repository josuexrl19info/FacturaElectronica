#!/usr/bin/env node

/**
 * Script para inspeccionar la estructura de una factura y verificar los XMLs
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

async function debugInvoiceStructure() {
  log('\n🔍 Inspeccionando estructura de facturas', 'bold');
  log('=' .repeat(50), 'blue');
  
  try {
    // Buscar facturas con estado "Aceptado"
    log('\n📋 Paso 1: Buscando facturas aprobadas...', 'cyan');
    
    const response = await fetch('http://localhost:3000/api/invoices/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      log('  ❌ Error obteniendo facturas', 'red');
      return false;
    }
    
    // Buscar facturas recientes
    log('\n📋 Paso 2: Obteniendo facturas recientes...', 'cyan');
    
    const invoicesResponse = await fetch('http://localhost:3000/api/invoices/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!invoicesResponse.ok) {
      log('  ❌ Error obteniendo lista de facturas', 'red');
      return false;
    }
    
    const invoicesData = await invoicesResponse.json();
    
    if (!invoicesData.success || !invoicesData.invoices || invoicesData.invoices.length === 0) {
      log('  ❌ No se encontraron facturas', 'red');
      return false;
    }
    
    log(`  ✅ Se encontraron ${invoicesData.invoices.length} facturas`, 'green');
    
    // Buscar facturas con estado "Aceptado"
    const acceptedInvoices = invoicesData.invoices.filter(inv => 
      inv.status === 'Aceptado' || inv.status === 'accepted'
    );
    
    if (acceptedInvoices.length === 0) {
      log('  ⚠️ No se encontraron facturas con estado "Aceptado"', 'yellow');
      log('  📋 Mostrando las primeras 3 facturas disponibles:', 'blue');
      
      for (let i = 0; i < Math.min(3, invoicesData.invoices.length); i++) {
        const invoice = invoicesData.invoices[i];
        log(`\n  📄 Factura ${i + 1}:`, 'cyan');
        log(`    ID: ${invoice.id}`, 'blue');
        log(`    Consecutivo: ${invoice.consecutivo}`, 'blue');
        log(`    Status: ${invoice.status}`, 'blue');
        log(`    Cliente: ${invoice.clientId}`, 'blue');
        log(`    Total: ₡${invoice.total?.toLocaleString() || 'N/A'}`, 'blue');
        log(`    Fecha: ${invoice.createdAt}`, 'blue');
        
        // Verificar campos XML
        log(`    XMLs:`, 'blue');
        log(`      - xmlSigned: ${invoice.xmlSigned ? '✅ Disponible' : '❌ No disponible'}`, invoice.xmlSigned ? 'green' : 'red');
        log(`      - haciendaSubmission: ${invoice.haciendaSubmission ? '✅ Disponible' : '❌ No disponible'}`, invoice.haciendaSubmission ? 'green' : 'red');
        
        if (invoice.haciendaSubmission) {
          log(`      - ind-estado: ${invoice.haciendaSubmission['ind-estado'] || 'N/A'}`, 'blue');
          log(`      - respuesta-xml: ${invoice.haciendaSubmission['respuesta-xml'] ? '✅ Disponible' : '❌ No disponible'}`, invoice.haciendaSubmission['respuesta-xml'] ? 'green' : 'red');
          log(`      - clave: ${invoice.haciendaSubmission.clave || 'N/A'}`, 'blue');
        }
      }
    } else {
      log(`  ✅ Se encontraron ${acceptedInvoices.length} facturas aprobadas`, 'green');
      
      for (let i = 0; i < Math.min(3, acceptedInvoices.length); i++) {
        const invoice = acceptedInvoices[i];
        log(`\n  📄 Factura Aprobada ${i + 1}:`, 'cyan');
        log(`    ID: ${invoice.id}`, 'blue');
        log(`    Consecutivo: ${invoice.consecutivo}`, 'blue');
        log(`    Status: ${invoice.status}`, 'blue');
        log(`    Cliente: ${invoice.clientId}`, 'blue');
        log(`    Total: ₡${invoice.total?.toLocaleString() || 'N/A'}`, 'blue');
        
        // Verificar campos XML en detalle
        log(`    XMLs:`, 'blue');
        log(`      - xmlSigned: ${invoice.xmlSigned ? '✅ Disponible (' + invoice.xmlSigned.length + ' chars)' : '❌ No disponible'}`, invoice.xmlSigned ? 'green' : 'red');
        log(`      - haciendaSubmission: ${invoice.haciendaSubmission ? '✅ Disponible' : '❌ No disponible'}`, invoice.haciendaSubmission ? 'green' : 'red');
        
        if (invoice.haciendaSubmission) {
          log(`      - ind-estado: ${invoice.haciendaSubmission['ind-estado'] || 'N/A'}`, 'blue');
          log(`      - respuesta-xml: ${invoice.haciendaSubmission['respuesta-xml'] ? '✅ Disponible (' + invoice.haciendaSubmission['respuesta-xml'].length + ' chars)' : '❌ No disponible'}`, invoice.haciendaSubmission['respuesta-xml'] ? 'green' : 'red');
          log(`      - clave: ${invoice.haciendaSubmission.clave || 'N/A'}`, 'blue');
          
          // Mostrar estructura completa de haciendaSubmission
          log(`      - Estructura completa:`, 'blue');
          console.log(JSON.stringify(invoice.haciendaSubmission, null, 4));
        }
      }
    }
    
    // Probar email con una factura real
    if (acceptedInvoices.length > 0) {
      const testInvoice = acceptedInvoices[0];
      log(`\n📧 Paso 3: Probando email con factura real (${testInvoice.consecutivo})...`, 'cyan');
      
      const emailResponse = await fetch('http://localhost:3000/api/email/test-invoice-email/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testEmail: 'josuexrl19.info@gmail.com',
          simulateApproval: true,
          useRealInvoice: testInvoice.id
        })
      });
      
      const emailResult = await emailResponse.json();
      
      if (emailResult.success) {
        log('  ✅ Email enviado exitosamente con factura real', 'green');
        log(`  📧 Message ID: ${emailResult.messageId}`, 'blue');
      } else {
        log(`  ❌ Error enviando email: ${emailResult.error}`, 'red');
      }
    }
    
    // Resumen final
    log('\n' + '='.repeat(60), 'blue');
    log('🔍 DIAGNÓSTICO DE ESTRUCTURA DE FACTURAS', 'bold');
    log('=' .repeat(60), 'blue');
    
    log('\n📊 Resultados del análisis:', 'cyan');
    log(`  📋 Total facturas: ${invoicesData.invoices.length}`, 'blue');
    log(`  ✅ Facturas aprobadas: ${acceptedInvoices.length}`, acceptedInvoices.length > 0 ? 'green' : 'yellow');
    
    if (acceptedInvoices.length > 0) {
      const withXmlSigned = acceptedInvoices.filter(inv => inv.xmlSigned).length;
      const withHaciendaSubmission = acceptedInvoices.filter(inv => inv.haciendaSubmission).length;
      const withRespuestaXml = acceptedInvoices.filter(inv => inv.haciendaSubmission?.['respuesta-xml']).length;
      
      log(`  📄 Con xmlSigned: ${withXmlSigned}/${acceptedInvoices.length}`, withXmlSigned > 0 ? 'green' : 'red');
      log(`  📊 Con haciendaSubmission: ${withHaciendaSubmission}/${acceptedInvoices.length}`, withHaciendaSubmission > 0 ? 'green' : 'red');
      log(`  📋 Con respuesta-xml: ${withRespuestaXml}/${acceptedInvoices.length}`, withRespuestaXml > 0 ? 'green' : 'red');
    }
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en diagnóstico: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('🔍 Diagnóstico de Estructura de Facturas', 'bold');
  
  try {
    const success = await debugInvoiceStructure();
    
    if (success) {
      log('\n🎯 DIAGNÓSTICO COMPLETADO', 'green');
      process.exit(0);
    } else {
      log('\n💥 DIAGNÓSTICO FALLIDO', 'red');
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

module.exports = { main, debugInvoiceStructure };
