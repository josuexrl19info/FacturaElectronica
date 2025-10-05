#!/usr/bin/env node

/**
 * Script para debuggear el endpoint externo de email
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

async function debugEmailEndpoint() {
  log('\n🔍 Debuggeando Endpoint Externo de Email', 'bold');
  log('=' .repeat(50), 'blue');
  
  const EMAIL_ENDPOINT = 'http://localhost:8000/email'
  const API_KEY = 'tu-api-key-super-secreta-123'
  
  try {
    // Datos de prueba simples
    const testEmailData = {
      to: 'josuexrl19@gmail.com',
      subject: 'Prueba de Endpoint - Debug',
      message: '<h1>Prueba de Email</h1><p>Este es un email de prueba para debuggear el endpoint.</p>',
      xml1_base64: 'dGVzdF94bWwx',
      xml2_base64: 'dGVzdF94bWwy',
      pdf_base64: 'dGVzdF9wZGY=',
      pdf_filename: 'test.pdf',
      xml1_filename: 'test.xml',
      xml2_filename: 'test_respuesta.xml'
    };
    
    log('\n📡 Paso 1: Verificando disponibilidad del endpoint...', 'cyan');
    
    // Primero verificar si el servidor está corriendo
    try {
      const healthResponse = await fetch(EMAIL_ENDPOINT, {
        method: 'GET',
        timeout: 5000
      });
      
      log(`📊 Status del endpoint: ${healthResponse.status}`, 'blue');
      log(`📊 Status text: ${healthResponse.statusText}`, 'blue');
      
      const healthText = await healthResponse.text();
      log(`📊 Respuesta GET: ${healthText.substring(0, 200)}...`, 'blue');
      
    } catch (healthError) {
      log(`⚠️ Error en GET request: ${healthError.message}`, 'yellow');
    }
    
    log('\n📧 Paso 2: Probando envío de email...', 'cyan');
    
    const response = await fetch(EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(testEmailData)
    });
    
    log(`📊 Status de respuesta: ${response.status}`, 'blue');
    log(`📊 Status text: ${response.statusText}`, 'blue');
    log(`📊 Headers:`, 'blue');
    
    // Mostrar headers importantes
    const headers = response.headers;
    headers.forEach((value, key) => {
      log(`  ${key}: ${value}`, 'blue');
    });
    
    // Obtener el texto de la respuesta
    const responseText = await response.text();
    log(`\n📄 Contenido de la respuesta (primeros 500 caracteres):`, 'cyan');
    log(responseText.substring(0, 500), 'yellow');
    
    if (responseText.length > 500) {
      log(`... (${responseText.length - 500} caracteres más)`, 'yellow');
    }
    
    // Verificar si es JSON válido
    log('\n🔍 Paso 3: Verificando formato de respuesta...', 'cyan');
    
    try {
      const jsonData = JSON.parse(responseText);
      log('✅ Respuesta es JSON válido:', 'green');
      log(JSON.stringify(jsonData, null, 2), 'green');
    } catch (jsonError) {
      log('❌ Respuesta NO es JSON válido:', 'red');
      log(`Error: ${jsonError.message}`, 'red');
      
      // Analizar el tipo de respuesta
      if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
        log('🔍 La respuesta parece ser HTML', 'yellow');
      } else if (responseText.includes('<br') || responseText.includes('<b>')) {
        log('🔍 La respuesta parece ser HTML con tags de formato', 'yellow');
      } else {
        log('🔍 La respuesta no parece ser ni JSON ni HTML estándar', 'yellow');
      }
    }
    
    // Verificar si el servidor externo está funcionando
    log('\n📡 Paso 4: Verificando otros endpoints...', 'cyan');
    
    try {
      // Probar un endpoint diferente
      const altResponse = await fetch('http://localhost:8000/', {
        method: 'GET',
        timeout: 5000
      });
      
      log(`📊 Status del endpoint raíz: ${altResponse.status}`, 'blue');
      const altText = await altResponse.text();
      log(`📊 Respuesta del endpoint raíz: ${altText.substring(0, 200)}...`, 'blue');
      
    } catch (altError) {
      log(`❌ Error accediendo al endpoint raíz: ${altError.message}`, 'red');
    }
    
    // Resumen y recomendaciones
    log('\n' + '='.repeat(60), 'blue');
    log('🔍 DIAGNÓSTICO DEL ENDPOINT EXTERNO', 'bold');
    log('=' .repeat(60), 'blue');
    
    log('\n📊 Estado del endpoint:', 'cyan');
    if (response.ok && responseText.includes('{')) {
      log('  ✅ Endpoint funcionando correctamente', 'green');
    } else if (response.status === 404) {
      log('  ❌ Endpoint no encontrado (404)', 'red');
      log('  💡 Verificar que el servidor externo esté corriendo en puerto 8000', 'yellow');
    } else if (response.status === 500) {
      log('  ❌ Error interno del servidor (500)', 'red');
      log('  💡 Verificar logs del servidor externo', 'yellow');
    } else if (responseText.includes('<html>') || responseText.includes('<br')) {
      log('  ❌ Servidor devolviendo HTML en lugar de JSON', 'red');
      log('  💡 El servidor externo no está configurado correctamente', 'yellow');
    } else {
      log(`  ⚠️ Estado inesperado: ${response.status}`, 'yellow');
    }
    
    log('\n💡 Recomendaciones:', 'cyan');
    log('  1. Verificar que el servidor externo esté corriendo en puerto 8000', 'blue');
    log('  2. Verificar que el endpoint /email esté implementado', 'blue');
    log('  3. Verificar que el servidor devuelva JSON, no HTML', 'blue');
    log('  4. Revisar logs del servidor externo para errores', 'blue');
    log('  5. Considerar implementar un endpoint de prueba simple', 'blue');
    
    log('\n🔧 Posibles soluciones:', 'cyan');
    log('  • Implementar manejo de errores más robusto en el cliente', 'blue');
    log('  • Agregar validación de Content-Type en la respuesta', 'blue');
    log('  • Implementar retry logic con diferentes endpoints', 'blue');
    log('  • Crear un endpoint mock para desarrollo', 'blue');
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en debug: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    
    log('\n🔍 Posibles causas:', 'cyan');
    log('  • Servidor externo no está corriendo', 'yellow');
    log('  • Puerto 8000 no está disponible', 'yellow');
    log('  • Firewall bloqueando la conexión', 'yellow');
    log('  • Endpoint no implementado en el servidor externo', 'yellow');
    
    return false;
  }
}

async function main() {
  log('🔍 Debug del Endpoint Externo de Email', 'bold');
  
  try {
    const success = await debugEmailEndpoint();
    
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

module.exports = { main, debugEmailEndpoint };
