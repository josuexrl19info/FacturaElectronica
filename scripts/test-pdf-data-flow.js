#!/usr/bin/env node

/**
 * Script para probar el flujo de datos completo al PDF
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

async function testPDFDataFlow() {
  log('\n🔍 Probando Flujo de Datos Completo al PDF', 'bold');
  log('=' .repeat(60), 'blue');
  
  try {
    // Crear datos de prueba que simulen exactamente lo que llega desde el frontend
    const testData = {
      invoice: {
        consecutivo: 'FE-0000000171',
        fechaEmision: '2025-10-05',
        elaboradoPor: 'Sistema de Facturación v4.4',
        currency: 'USD', // Nota: usando 'currency' en lugar de 'moneda'
        paymentMethod: '02', // Nota: usando 'paymentMethod' en lugar de 'formaPago'
        subtotal: 1000,
        totalExento: 0,
        totalDescuento: 50,
        totalImpuesto: 130,
        ivaDevuelto: 0,
        total: 1080,
        notes: 'Factura de prueba con flujo de datos completo.',
        items: [
          {
            cantidad: 1,
            unidad: 'Sp',
            codigoCABYS: '8511.00.00.00',
            description: 'Desarrollo de Software Personalizado', // Nota: usando 'description' en lugar de 'descripcion'
            precioUnitario: 1000,
            descuento: 50,
            impuestoNeto: 130,
            montoTotalLinea: 1080
          }
        ]
      },
      haciendaResponse: {
        clave: '50605102500310286786000100001010000000171196090626',
        fecha: '2025-10-05T17:57:21+00:00'
      },
      company: {
        name: 'InnovaSell Costa Rica',
        identification: '310123456789',
        phone: '+506 2222-3333',
        email: 'facturas@innovasmartcr.com',
        otrasSenas: 'Avenida Central, Edificio Torre Empresarial, Piso 5',
        province: '01',
        canton: '01',
        district: '01',
        economicActivity: {
          codigo: '6201',
          descripcion: 'Programación de computadoras'
        }
      },
      client: {
        name: 'Josué Rodríguez - Cliente Empresarial',
        identification: '310987654321',
        phone: '+506 8888-8888',
        email: 'josuexrl19@gmail.com',
        direccion: 'Barrio Escalante, Avenida Central',
        province: '01',
        canton: '01',
        district: '01',
        economicActivity: {
          codigo: '6201',
          descripcion: 'Programación de computadoras'
        }
      }
    };
    
    log('\n📊 Datos de prueba enviados:', 'cyan');
    log('Invoice (con campos en inglés):', 'blue');
    console.log(JSON.stringify(testData.invoice, null, 2));
    
    log('\nCompany:', 'blue');
    console.log(JSON.stringify(testData.company, null, 2));
    
    log('\nClient:', 'blue');
    console.log(JSON.stringify(testData.client, null, 2));
    
    log('\nHacienda Response:', 'blue');
    console.log(JSON.stringify(testData.haciendaResponse, null, 2));
    
    // Llamar al endpoint para ver cómo se procesan los datos
    log('\n🔧 Probando procesamiento de datos...', 'cyan');
    
    const response = await fetch('http://localhost:3000/api/generate-pdf-optimized', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
      log(`❌ Error HTTP: ${response.status}`, 'red');
      const errorText = await response.text();
      log(`Error details: ${errorText}`, 'red');
      return false;
    }
    
    const result = await response.json();
    
    if (!result.success) {
      log(`❌ Error en procesamiento: ${result.error}`, 'red');
      return false;
    }
    
    log(`✅ PDF generado exitosamente: ${result.size} caracteres`, 'green');
    
    // Resumen de problemas identificados
    log('\n' + '='.repeat(70), 'blue');
    log('🔍 ANÁLISIS DEL FLUJO DE DATOS AL PDF', 'bold');
    log('=' .repeat(70), 'blue');
    
    log('\n📊 Campos que pueden tener problemas de mapeo:', 'yellow');
    log('1. currency vs moneda (invoice)', 'yellow');
    log('2. paymentMethod vs formaPago (invoice)', 'yellow');
    log('3. description vs descripcion (items)', 'yellow');
    log('4. notes vs notas (invoice)', 'yellow');
    log('5. Dirección y actividad económica (company/client)', 'yellow');
    
    log('\n🔧 Verificaciones necesarias:', 'cyan');
    log('1. Verificar que el mapeo en formatInvoiceDataForPDFOptimized funcione', 'cyan');
    log('2. Verificar que los datos lleguen con la estructura correcta', 'cyan');
    log('3. Verificar que los campos se mapeen correctamente en el PDF', 'cyan');
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en prueba: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    return false;
  }
}

async function main() {
  log('🔍 Prueba de Flujo de Datos al PDF', 'bold');
  
  try {
    const success = await testPDFDataFlow();
    
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

module.exports = { main, testPDFDataFlow };
