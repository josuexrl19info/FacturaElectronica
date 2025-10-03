#!/usr/bin/env node

/**
 * Script de prueba con múltiples proveedores de email
 * Ejecuta: node scripts/test-multiple-emails.js
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
    req.setTimeout(15000, () => {
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
      return response.data.access_token;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function sendTestEmail(accessToken, recipientEmail, recipientName) {
  log(`\n📧 Enviando a ${recipientEmail}...`, 'blue');
  
  const senderEmail = process.env.OFFICE365_SENDER_EMAIL;
  const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;

  const emailPayload = {
    message: {
      subject: `Prueba de entrega - ${recipientName}`,
      body: {
        contentType: 'HTML',
        content: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1>🚀 InvoSell - Prueba de Entrega</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
                  <h2>¡Hola!</h2>
                  <p>Este es un correo de prueba para verificar la entrega a <strong>${recipientName}</strong>.</p>
                  <p>Si recibes este correo, significa que la configuración está funcionando correctamente.</p>
                  
                  <div style="background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3>📋 Detalles del correo:</h3>
                    <ul>
                      <li><strong>Remitente:</strong> ${process.env.OFFICE365_SENDER_NAME}</li>
                      <li><strong>Email:</strong> ${process.env.OFFICE365_SENDER_EMAIL}</li>
                      <li><strong>Destinatario:</strong> ${recipientEmail}</li>
                      <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</li>
                    </ul>
                  </div>
                  
                  <p>Saludos,<br><strong>Equipo de InvoSell</strong></p>
                </div>
                <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
                  <p>InvoSell - Sistema de Facturación Electrónica</p>
                </div>
              </div>
            </body>
          </html>
        `
      },
      toRecipients: [
        {
          emailAddress: {
            address: recipientEmail,
            name: recipientName
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
      log(`  ✅ Enviado exitosamente a ${recipientEmail}`, 'green');
      return { success: true, email: recipientEmail };
    } else {
      log(`  ❌ Error enviando a ${recipientEmail}: ${response.status}`, 'red');
      if (response.data && response.data.error) {
        log(`  📝 Error: ${response.data.error.message}`, 'yellow');
      }
      return { success: false, email: recipientEmail, error: response.data };
    }
  } catch (error) {
    log(`  ❌ Error de conexión con ${recipientEmail}: ${error.message}`, 'red');
    return { success: false, email: recipientEmail, error: error.message };
  }
}

async function main() {
  log('🚀 Prueba de Entrega a Múltiples Proveedores', 'bold');
  log('=' .repeat(60), 'blue');

  // Lista de emails de prueba con diferentes proveedores
  const testEmails = [
    { email: 'test@outlook.com', name: 'Outlook' },
    { email: 'test@hotmail.com', name: 'Hotmail' },
    { email: 'test@yahoo.com', name: 'Yahoo' },
    { email: 'test@icloud.com', name: 'iCloud' },
    // Gmail es problemático, pero lo incluimos al final
    { email: 'josuexrl19.info@gmail.com', name: 'Gmail (Problemático)' }
  ];

  log('\n📋 Emails que vas a probar:', 'blue');
  testEmails.forEach((test, index) => {
    log(`  ${index + 1}. ${test.email} (${test.name})`, 'blue');
  });

  log('\n💡 Agrega tus propios emails para probar:', 'yellow');
  log('   Edita este script y agrega tus emails reales en la lista', 'yellow');

  // Obtener token
  const accessToken = await getAccessToken();
  if (!accessToken) {
    log('\n❌ No se pudo obtener token. Revisa la configuración.', 'red');
    process.exit(1);
  }

  log('\n🔑 Token obtenido exitosamente', 'green');

  // Enviar a cada proveedor
  const results = [];
  for (const test of testEmails) {
    const result = await sendTestEmail(accessToken, test.email, test.name);
    results.push(result);
    
    // Pequeña pausa entre envíos
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Resumen de resultados
  log('\n' + '='.repeat(60), 'blue');
  log('📊 RESUMEN DE RESULTADOS', 'bold');
  log('=' .repeat(60), 'blue');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  log(`\n✅ Exitosos: ${successful.length}`, 'green');
  successful.forEach(result => {
    log(`  • ${result.email}`, 'green');
  });

  log(`\n❌ Fallidos: ${failed.length}`, 'red');
  failed.forEach(result => {
    log(`  • ${result.email}`, 'red');
    if (result.error && result.error.message) {
      log(`    Error: ${result.error.message}`, 'yellow');
    }
  });

  // Recomendaciones
  log('\n💡 RECOMENDACIONES:', 'blue');
  if (failed.length > 0) {
    log('  1. Gmail es especialmente estricto con Microsoft Graph', 'yellow');
    log('  2. Configura registros SPF y DKIM en tu dominio', 'yellow');
    log('  3. Los correos corporativos suelen funcionar mejor', 'yellow');
    log('  4. Outlook/Hotmail son más compatibles con Microsoft', 'yellow');
  }

  log('\n🎯 Para uso en producción:', 'green');
  log('  • Usa correos corporativos cuando sea posible', 'green');
  log('  • Configura SPF: v=spf1 include:spf.protection.outlook.com ~all', 'green');
  log('  • Habilita DKIM en Exchange Admin Center', 'green');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    log(`\n💥 Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main };
