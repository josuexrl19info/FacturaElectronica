#!/usr/bin/env node

/**
 * Script para probar que todos los montos en el XML tengan máximo 5 decimales
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

// Función para formatear montos (igual que en XMLGenerator)
function formatAmount(amount) {
  // Manejar valores nulos o indefinidos
  if (amount === null || amount === undefined) return '0'
  
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0'
  
  // Formatear a máximo 5 decimales, eliminando ceros innecesarios
  return num.toFixed(5).replace(/\.?0+$/, '') || '0'
}

// Función para validar que un número tenga máximo 5 decimales
function validateDecimalPlaces(number) {
  const str = number.toString()
  const decimalIndex = str.indexOf('.')
  
  if (decimalIndex === -1) {
    return true // Número entero, válido
  }
  
  const decimalPlaces = str.length - decimalIndex - 1
  return decimalPlaces <= 5
}

async function testXMLDecimalFormatting() {
  log('\n🔢 Probando Formateo de Decimales en XML', 'bold');
  log('=' .repeat(60), 'blue');
  
  try {
    // Casos de prueba
    const testCases = [
      { input: 100, expected: '100', description: 'Número entero' },
      { input: 100.5, expected: '100.5', description: 'Un decimal' },
      { input: 100.12345, expected: '100.12345', description: '5 decimales' },
      { input: 100.123456, expected: '100.12346', description: '6 decimales (debe truncar)' },
      { input: 100.123456789, expected: '100.12346', description: 'Muchos decimales (debe truncar)' },
      { input: 100.10000, expected: '100.1', description: 'Ceros innecesarios (debe eliminar)' },
      { input: 100.00000, expected: '100', description: 'Todos ceros (debe eliminar punto)' },
      { input: '100.123', expected: '100.123', description: 'String con decimales' },
      { input: 'invalid', expected: '0', description: 'String inválido' },
      { input: null, expected: '0', description: 'Valor nulo' },
      { input: undefined, expected: '0', description: 'Valor indefinido' }
    ];
    
    log('\n🧪 Ejecutando casos de prueba...', 'cyan');
    
    let allPassed = true;
    
    testCases.forEach((testCase, index) => {
      const result = formatAmount(testCase.input);
      const passed = result === testCase.expected;
      
      if (passed) {
        log(`✅ Test ${index + 1}: ${testCase.description}`, 'green');
        log(`   Input: ${testCase.input} → Output: ${result}`, 'blue');
      } else {
        log(`❌ Test ${index + 1}: ${testCase.description}`, 'red');
        log(`   Input: ${testCase.input} → Expected: ${testCase.expected}, Got: ${result}`, 'red');
        allPassed = false;
      }
    });
    
    // Validar que los resultados tengan máximo 5 decimales
    log('\n🔍 Validando que todos los resultados tengan máximo 5 decimales...', 'cyan');
    
    testCases.forEach((testCase, index) => {
      const result = formatAmount(testCase.input);
      const isValid = validateDecimalPlaces(result);
      
      if (isValid) {
        log(`✅ Validación ${index + 1}: ${result} tiene máximo 5 decimales`, 'green');
      } else {
        log(`❌ Validación ${index + 1}: ${result} tiene más de 5 decimales`, 'red');
        allPassed = false;
      }
    });
    
    // Resumen
    log('\n' + '='.repeat(70), 'blue');
    log('🔢 PRUEBA DE FORMATEO DE DECIMALES - COMPLETADA', 'bold');
    log('=' .repeat(70), 'blue');
    
    if (allPassed) {
      log('\n✅ TODAS LAS PRUEBAS PASARON', 'green');
      log('🎯 El formateo de decimales funciona correctamente', 'green');
      log('📊 Todos los montos tendrán máximo 5 decimales en el XML', 'green');
    } else {
      log('\n❌ ALGUNAS PRUEBAS FALLARON', 'red');
      log('🔧 Revisa la función formatAmount', 'red');
    }
    
    log('\n📋 Campos que se formatean en el XML:', 'cyan');
    log('  💰 Resumen de Factura:', 'blue');
    log('    - TipoCambio, TotalServGravados, TotalGravado', 'blue');
    log('    - TotalVenta, TotalVentaNeta, TotalMontoImpuesto', 'blue');
    log('    - TotalImpuesto, TotalMedioPago, TotalComprobante', 'blue');
    log('  📋 Líneas de Detalle:', 'blue');
    log('    - Cantidad, PrecioUnitario, MontoTotal, SubTotal', 'blue');
    log('    - BaseImponible, Tarifa, Monto, ImpuestoNeto', 'blue');
    log('    - MontoTotalLinea, ImpuestoAsumidoEmisorFabrica', 'blue');
    
    return allPassed;
    
  } catch (error) {
    log(`\n💥 Error en prueba: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    return false;
  }
}

async function main() {
  log('🔢 Prueba de Formateo de Decimales en XML', 'bold');
  
  try {
    const success = await testXMLDecimalFormatting();
    
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

module.exports = { main, testXMLDecimalFormatting };
