#!/usr/bin/env node

/**
 * Script para ayudar a revisar los logs del servidor
 */

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

log('\n📋 Cómo Revisar los Logs del Servidor', 'bold');
log('=' .repeat(60), 'blue');

log('\n🔍 Pasos para encontrar el problema de moneda:', 'cyan');
log('1. Abre la terminal donde está corriendo tu servidor Next.js', 'blue');
log('2. Busca las líneas que empiezan con "🔍 [EMAIL] Debug Moneda:"', 'blue');
log('3. Busca las líneas que empiezan con "🔍 [PDF] Debug Mapeo Moneda:"', 'blue');
log('4. Busca las líneas que empiezan con "🔍 [PDF] Debug Moneda:"', 'blue');

log('\n📊 Información que necesito ver:', 'cyan');
log('🔍 [EMAIL] Debug Moneda:', 'blue');
log('  - invoice.currency: [¿qué valor?]', 'blue');
log('  - invoice.moneda: [¿qué valor?]', 'blue');
log('  - currency final: [¿qué valor?]', 'blue');

log('\n🔍 [PDF] Debug Mapeo Moneda:', 'blue');
log('  - invoice.currency: [¿qué valor?]', 'blue');
log('  - invoice.moneda: [¿qué valor?]', 'blue');
log('  - invoice.currencyCode: [¿qué valor?]', 'blue');
log('  - mapped moneda: [¿qué valor?]', 'blue');

log('\n🔍 [PDF] Debug Moneda:', 'blue');
log('  - invoiceData.invoice?.currency: [¿qué valor?]', 'blue');
log('  - invoiceData.invoice?.moneda: [¿qué valor?]', 'blue');
log('  - invoiceData.moneda: [¿qué valor?]', 'blue');
log('  - currency final: [¿qué valor?]', 'blue');

log('\n💡 Una vez que veas estos valores, compártelos conmigo para hacer la corrección exacta.', 'green');
