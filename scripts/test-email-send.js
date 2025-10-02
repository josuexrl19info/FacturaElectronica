#!/usr/bin/env node

/**
 * Script de prueba de envío de correos
 * Ejecuta: node scripts/test-email-send.js
 */

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const https = require('https');

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

async function getAccessToken() {
  log('\n🔑 Obteniendo token de acceso...', 'blue');
  
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

async function testEmailSend(accessToken) {
  log('\n📧 Probando envío de correo...', 'blue');
  
  const senderEmail = process.env.OFFICE365_SENDER_EMAIL;
  const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;

  const emailPayload = {
    message: {
      subject: 'Prueba de configuración - InvoSell',
      body: {
        contentType: 'HTML',
        content: `
          <html>
            <body>
              <h1>🎉 ¡Prueba exitosa!</h1>
              <p>Este es un correo de prueba desde InvoSell.</p>
              <p>Si recibes este correo, significa que la configuración está funcionando correctamente.</p>
              <hr>
              <p><small>Enviado desde InvoSell - Sistema de Facturación Electrónica</small></p>
            </body>
          </html>
        `
      },
      toRecipients: [
        {
          emailAddress: {
            address: senderEmail,
            name: 'Prueba'
          }
        }
      ]
    },
    saveToSentItems: true
  };

  try {
    const response = await makeRequest(graphUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (response.status === 202) {
      log('  ✅ Correo enviado exitosamente', 'green');
      log('  📬 Revisa tu bandeja de entrada', 'blue');
      return true;
    } else {
      log(`  ❌ Error enviando correo: ${response.status}`, 'red');
      log(`  📝 Respuesta: ${JSON.stringify(response.data, null, 2)}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`  ❌ Error de conexión: ${error.message}`, 'red');
    return false;
  }
}

async function testUserPermissions(accessToken) {
  log('\n👤 Probando permisos de usuario...', 'blue');
  
  const senderEmail = process.env.OFFICE365_SENDER_EMAIL;
  
  // Probar diferentes endpoints para ver qué permisos tenemos
  const endpoints = [
    {
      name: 'User Profile',
      url: `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}`,
      method: 'GET'
    },
    {
      name: 'User Mailbox',
      url: `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/mailFolders`,
      method: 'GET'
    }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        log(`  ✅ ${endpoint.name}: Acceso permitido`, 'green');
      } else {
        log(`  ❌ ${endpoint.name}: ${response.status} - ${response.data.error?.message || 'Sin acceso'}`, 'red');
      }
    } catch (error) {
      log(`  ❌ ${endpoint.name}: Error de conexión`, 'red');
    }
  }
}

async function main() {
  log('🚀 Prueba de Envío de Correos InvoSell', 'bold');
  log('=' .repeat(50), 'blue');

  // Obtener token
  const accessToken = await getAccessToken();
  if (!accessToken) {
    log('\n❌ No se pudo obtener token. Revisa la configuración.', 'red');
    process.exit(1);
  }

  // Probar permisos de usuario
  await testUserPermissions(accessToken);

  // Probar envío de correo
  const emailSent = await testEmailSend(accessToken);

  // Resumen
  log('\n' + '='.repeat(50), 'blue');
  if (emailSent) {
    log('🎉 ¡Prueba exitosa!', 'green');
    log('✅ El sistema de correos está funcionando', 'green');
    log('\n📋 Próximos pasos:', 'blue');
    log('  1. Ve a Dashboard > Pruebas de Correo', 'blue');
    log('  2. Envía correos desde la interfaz', 'blue');
  } else {
    log('❌ Error en el envío de correos', 'red');
    log('\n🔧 Posibles soluciones:', 'yellow');
    log('  1. Verificar permisos en Azure AD', 'yellow');
    log('  2. Confirmar que el usuario tiene licencia de Exchange', 'yellow');
    log('  3. Esperar unos minutos para propagación de permisos', 'yellow');
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
