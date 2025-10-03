#!/usr/bin/env node

/**
 * Script de verificación de configuración de correos
 * Ejecuta: node scripts/verify-email-config.js
 */

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const https = require('https');
const readline = require('readline');

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function checkEnvironmentVariables() {
  log('\n📋 Verificando variables de entorno...', 'blue');
  
  const requiredVars = [
    'OFFICE365_TENANT_ID',
    'OFFICE365_CLIENT_ID', 
    'OFFICE365_CLIENT_SECRET',
    'OFFICE365_SENDER_EMAIL',
    'OFFICE365_SENDER_NAME',
    'OFFICE365_GRAPH_ENDPOINT'
  ];

  const missing = [];
  const present = [];

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      present.push(varName);
      log(`  ✅ ${varName}: ${process.env[varName].substring(0, 20)}...`, 'green');
    } else {
      missing.push(varName);
      log(`  ❌ ${varName}: No configurada`, 'red');
    }
  }

  if (missing.length > 0) {
    log(`\n⚠️  Variables faltantes: ${missing.join(', ')}`, 'yellow');
    log('   Crea un archivo .env.local con estas variables', 'yellow');
    return false;
  }

  log(`\n✅ Todas las variables están configuradas`, 'green');
  return true;
}

async function testTokenRequest() {
  log('\n🔑 Probando solicitud de token...', 'blue');
  
  const tenantId = process.env.OFFICE365_TENANT_ID;
  const clientId = process.env.OFFICE365_CLIENT_ID;
  const clientSecret = process.env.OFFICE365_CLIENT_SECRET;

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  try {
    const response = await makeRequest(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (response.status === 200 && response.data.access_token) {
      log('  ✅ Token obtenido exitosamente', 'green');
      log(`  📅 Expira en: ${response.data.expires_in} segundos`, 'blue');
      return response.data.access_token;
    } else {
      log(`  ❌ Error obteniendo token: ${response.status}`, 'red');
      log(`  📝 Respuesta: ${JSON.stringify(response.data, null, 2)}`, 'yellow');
      return null;
    }
  } catch (error) {
    log(`  ❌ Error de conexión: ${error.message}`, 'red');
    return null;
  }
}

async function testGraphAPI(accessToken) {
  log('\n🌐 Probando conexión con Microsoft Graph...', 'blue');
  
  const senderEmail = process.env.OFFICE365_SENDER_EMAIL;
  const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}`;

  try {
    const response = await makeRequest(graphUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      log('  ✅ Conexión con Graph API exitosa', 'green');
      log(`  👤 Usuario encontrado: ${response.data.displayName}`, 'blue');
      return true;
    } else if (response.status === 404) {
      log(`  ❌ Usuario no encontrado: ${senderEmail}`, 'red');
      log('  💡 Verifica que el email del remitente sea válido', 'yellow');
      return false;
    } else {
      log(`  ❌ Error en Graph API: ${response.status}`, 'red');
      log(`  📝 Respuesta: ${JSON.stringify(response.data, null, 2)}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`  ❌ Error de conexión: ${error.message}`, 'red');
    return false;
  }
}

async function testEmailAPI() {
  log('\n📧 Probando API de correos local...', 'blue');
  
  try {
    const response = await makeRequest('http://localhost:3000/api/email/send', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      log('  ✅ API de correos respondiendo', 'green');
      log(`  📊 Estado del servicio: ${response.data.status}`, 'blue');
      log(`  🔧 Funcionalidades: ${response.data.features.join(', ')}`, 'blue');
      return true;
    } else {
      log(`  ❌ API de correos no responde: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`  ❌ Error conectando con API local: ${error.message}`, 'red');
    log('  💡 Asegúrate de que el servidor esté corriendo (npm run dev)', 'yellow');
    return false;
  }
}

async function main() {
  log('🚀 Verificador de Configuración de Correos InvoSell', 'bold');
  log('=' .repeat(50), 'blue');

  // Verificar variables de entorno
  const envOk = await checkEnvironmentVariables();
  if (!envOk) {
    log('\n❌ Configuración incompleta. Revisa las variables de entorno.', 'red');
    process.exit(1);
  }

  // Probar solicitud de token
  const accessToken = await testTokenRequest();
  if (!accessToken) {
    log('\n❌ No se pudo obtener token. Revisa la configuración de Azure AD.', 'red');
    process.exit(1);
  }

  // Probar Graph API
  const graphOk = await testGraphAPI(accessToken);
  if (!graphOk) {
    log('\n❌ Problema con Graph API. Revisa permisos y usuario.', 'red');
    process.exit(1);
  }

  // Probar API local
  const apiOk = await testEmailAPI();
  if (!apiOk) {
    log('\n⚠️  API local no disponible. Inicia el servidor con: npm run dev', 'yellow');
  }

  // Resumen final
  log('\n' + '='.repeat(50), 'blue');
  if (envOk && accessToken && graphOk) {
    log('🎉 ¡Configuración exitosa!', 'green');
    log('✅ El sistema de correos está listo para usar', 'green');
    log('\n📋 Próximos pasos:', 'blue');
    log('  1. Ve a Dashboard > Pruebas de Correo', 'blue');
    log('  2. Envía un correo de prueba', 'blue');
    log('  3. Verifica que llegue a tu bandeja de entrada', 'blue');
  } else {
    log('❌ Configuración incompleta', 'red');
    log('📝 Revisa los errores anteriores y la documentación', 'red');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    log(`\n💥 Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main };
