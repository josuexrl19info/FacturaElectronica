#!/usr/bin/env node

/**
 * Script para debuggear el mapeo de datos en el PDF
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

async function debugPDFMapping() {
  log('\n🔍 Debuggeando Mapeo de Datos en PDF', 'bold');
  log('=' .repeat(60), 'blue');
  
  try {
    // Crear datos de prueba completos
    const testData = {
      invoice: {
        consecutivo: 'FE-0000000171',
        fechaEmision: '2025-10-05',
        elaboradoPor: 'Sistema de Facturación v4.4',
        moneda: 'USD',
        formaPago: '02',
        subtotal: 1000,
        totalExento: 0,
        totalDescuento: 50,
        totalImpuesto: 130,
        ivaDevuelto: 0,
        total: 1080,
        notas: 'Factura de prueba con mapeo completo.',
        items: [
          {
            cantidad: 1,
            unidad: 'Sp',
            codigoCABYS: '8511.00.00.00',
            descripcion: 'Desarrollo de Software Personalizado',
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
    
    log('\n📊 Datos de entrada completos:', 'cyan');
    log('Invoice:', 'blue');
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
    log('🔍 PROBLEMAS IDENTIFICADOS EN EL MAPEO DEL PDF', 'bold');
    log('=' .repeat(70), 'blue');
    
    log('\n❌ Problemas encontrados:', 'red');
    log('1. Información de empresa: falta dirección y actividad económica', 'red');
    log('2. Encabezado: falta la cédula de la empresa', 'red');
    log('3. Información del cliente: falta la cédula', 'red');
    log('4. Información del documento: falta consecutivo, fecha, clave hacienda', 'red');
    log('5. Medio de pago: no se actualiza cuando corresponde a USD', 'red');
    
    log('\n🔧 Soluciones necesarias:', 'yellow');
    log('1. Verificar mapeo de dirección y actividad económica de empresa', 'yellow');
    log('2. Agregar cédula de empresa en el encabezado', 'yellow');
    log('3. Verificar mapeo de cédula del cliente', 'yellow');
    log('4. Verificar mapeo de consecutivo, fecha y clave de Hacienda', 'yellow');
    log('5. Corregir mapeo del medio de pago para USD', 'yellow');
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en debug: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    return false;
  }
}

async function main() {
  log('🔍 Debug de Mapeo de PDF', 'bold');
  
  try {
    const success = await debugPDFMapping();
    
    if (success) {
      log('\n🎯 DEBUG COMPLETADO', 'green');
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

module.exports = { main, debugPDFMapping };
