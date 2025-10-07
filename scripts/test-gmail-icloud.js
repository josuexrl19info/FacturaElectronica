#!/usr/bin/env node

/**
 * Script específico para probar envío de correos a Gmail e iCloud
 * Ejecuta: node scripts/test-gmail-icloud.js
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
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
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
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (error) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
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

async function sendTestEmail(accessToken, recipientEmail, provider) {
  log(`\n📧 Enviando prueba a ${provider} (${recipientEmail})...`, 'cyan');
  
  const senderEmail = process.env.OFFICE365_SENDER_EMAIL;
  const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;

  const emailPayload = {
    message: {
      subject: `🧪 Prueba de entrega - ${provider} - ${new Date().toISOString()}`,
      body: {
        contentType: 'HTML',
        content: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1>🧪 Prueba de Entrega - ${provider}</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
                  <h2>¡Hola!</h2>
                  <p>Este es un correo de prueba para verificar la entrega a <strong>${provider}</strong>.</p>
                  
                  <div style="background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3>📋 Información del envío:</h3>
                    <ul>
                      <li><strong>Destinatario:</strong> ${recipientEmail}</li>
                      <li><strong>Proveedor:</strong> ${provider}</li>
                      <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</li>
                      <li><strong>Remitente:</strong> ${senderEmail}</li>
                    </ul>
                  </div>
                  
                  <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3>✅ ¿Qué significa esto?</h3>
                    <p>Si recibes este correo en tu bandeja de entrada (no en spam), significa que:</p>
                    <ul>
                      <li>✅ La configuración de Office 365 está correcta</li>
                      <li>✅ Los registros SPF/DKIM están funcionando</li>
                      <li>✅ ${provider} acepta correos de tu dominio</li>
                    </ul>
                  </div>
                  
                  <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3>⚠️ Si no recibes el correo:</h3>
                    <ul>
                      <li>Revisa tu carpeta de spam/correo no deseado</li>
                      <li>Verifica los registros SPF, DKIM y DMARC de tu dominio</li>
                      <li>Contacta al administrador de Office 365</li>
                    </ul>
                  </div>
                  
                  <hr style="margin: 30px 0;">
                  <p style="text-align: center; color: #6b7280; font-size: 14px;">
                    Enviado desde InvoSell - Sistema de Facturación Electrónica
                  </p>
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
            name: `Usuario de ${provider}`
          }
        }
      ],
      importance: 'Normal'
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
      log(`  ✅ Correo enviado exitosamente a ${provider}`, 'green');
      log(`  📬 Revisa la bandeja de ${recipientEmail}`, 'blue');
      return { success: true, provider, email: recipientEmail };
    } else {
      log(`  ❌ Error enviando a ${provider}: ${response.status}`, 'red');
      log(`  📝 Respuesta: ${JSON.stringify(response.data, null, 2)}`, 'yellow');
      return { success: false, provider, email: recipientEmail, error: response.data };
    }
  } catch (error) {
    log(`  ❌ Error de conexión a ${provider}: ${error.message}`, 'red');
    return { success: false, provider, email: recipientEmail, error: error.message };
  }
}

async function testDomainConfiguration() {
  log('\n🔍 Verificando configuración del dominio...', 'magenta');
  
  const senderEmail = process.env.OFFICE365_SENDER_EMAIL;
  const domain = senderEmail.split('@')[1];
  
  log(`  📧 Dominio: ${domain}`, 'cyan');
  log(`  📧 Email remitente: ${senderEmail}`, 'cyan');
  
  // Verificaciones básicas
  log('\n  📋 Verificaciones recomendadas:', 'yellow');
  log('    1. SPF Record: v=spf1 include:spf.protection.outlook.com -all', 'yellow');
  log('    2. DKIM: Configurado en Office 365 Admin Center', 'yellow');
  log('    3. DMARC: v=DMARC1; p=quarantine; rua=mailto:dmarc@' + domain, 'yellow');
  log('    4. MX Records: Apuntando a Office 365', 'yellow');
}

async function main() {
  log('🚀 Prueba Específica: Gmail e iCloud', 'bold');
  log('=' .repeat(60), 'blue');

  // Verificar configuración del dominio
  await testDomainConfiguration();

  // Obtener token
  const accessToken = await getAccessToken();
  if (!accessToken) {
    log('\n❌ No se pudo obtener token. Revisa la configuración.', 'red');
    process.exit(1);
  }

  // Emails de prueba (reemplaza con tus emails reales)
  const testEmails = {
    gmail: [
      // 'tu-email@gmail.com', // Descomenta y agrega tu email de Gmail
      'test@gmail.com' // Email de prueba (puede no llegar)
    ],
    icloud: [
      // 'tu-email@icloud.com', // Descomenta y agrega tu email de iCloud
      'test@icloud.com' // Email de prueba (puede no llegar)
    ]
  };

  const results = [];

  // Probar Gmail
  for (const email of testEmails.gmail) {
    const result = await sendTestEmail(accessToken, email, 'Gmail');
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Pausa entre envíos
  }

  // Probar iCloud
  for (const email of testEmails.icloud) {
    const result = await sendTestEmail(accessToken, email, 'iCloud');
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Pausa entre envíos
  }

  // Resumen
  log('\n' + '='.repeat(60), 'blue');
  log('📊 RESUMEN DE RESULTADOS:', 'bold');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  log(`✅ Exitosos: ${successful}`, 'green');
  log(`❌ Fallidos: ${failed}`, 'red');
  
  log('\n📋 Detalles por proveedor:', 'cyan');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`  ${status} ${result.provider} (${result.email}): ${result.success ? 'Enviado' : 'Error'}`, color);
    if (!result.success && result.error) {
      log(`     Error: ${JSON.stringify(result.error)}`, 'yellow');
    }
  });

  log('\n🔧 PRÓXIMOS PASOS:', 'magenta');
  if (failed > 0) {
    log('  1. Revisa tu carpeta de spam en Gmail/iCloud', 'yellow');
    log('  2. Verifica los registros DNS de tu dominio:', 'yellow');
    log('     - SPF: v=spf1 include:spf.protection.outlook.com -all', 'yellow');
    log('     - DKIM: Configurar en Office 365 Admin Center', 'yellow');
    log('     - DMARC: v=DMARC1; p=quarantine; rua=mailto:dmarc@tudominio.com', 'yellow');
    log('  3. Usa la interfaz web: http://localhost:3000/dashboard/email-test/', 'yellow');
    log('  4. Prueba con tus emails reales (descomenta las líneas en el script)', 'yellow');
  } else {
    log('  🎉 ¡Excelente! Todos los envíos fueron exitosos', 'green');
    log('  📧 Ve a tu bandeja de entrada para confirmar la recepción', 'green');
    log('  🌐 Usa la interfaz web para más pruebas: http://localhost:3000/dashboard/email-test/', 'green');
  }

  log('\n💡 CONSEJOS:', 'blue');
  log('  - Los emails de prueba (test@) pueden no llegar por filtros anti-spam', 'blue');
  log('  - Para pruebas reales, usa tus emails personales', 'blue');
  log('  - Gmail e iCloud tienen filtros muy estrictos', 'blue');
  log('  - La configuración de SPF/DKIM/DMARC es crucial', 'blue');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    log(`\n💥 Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main };
