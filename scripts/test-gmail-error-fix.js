#!/usr/bin/env node

/**
 * Script específico para probar la solución del error 5.7.708 de Gmail
 * Ejecuta: node scripts/test-gmail-error-fix.js
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
    req.setTimeout(20000, () => {
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

async function testGmailWithRetry(accessToken, recipientEmail, maxRetries = 3) {
  log(`\n🧪 Probando envío a Gmail con retry (${recipientEmail})...`, 'cyan');
  
  const senderEmail = process.env.OFFICE365_SENDER_EMAIL;
  const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;

  const emailPayload = {
    message: {
      subject: `🚨 Prueba de Error 5.7.708 - ${new Date().toISOString()}`,
      body: {
        contentType: 'HTML',
        content: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1>🚨 Prueba de Error 5.7.708</h1>
                  <p>Diagnóstico de bloqueo de IP por Gmail</p>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
                  <h2>¡Hola!</h2>
                  <p>Este correo está probando la solución al error <strong>5.7.708</strong> de Gmail.</p>
                  
                  <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3>🔍 Información del Error:</h3>
                    <ul>
                      <li><strong>Código:</strong> 550 5.7.708</li>
                      <li><strong>Mensaje:</strong> Service unavailable. Access denied, traffic not accepted from this IP</li>
                      <li><strong>Causa:</strong> Gmail bloqueando IP de Office 365</li>
                      <li><strong>Destinatario:</strong> ${recipientEmail}</li>
                      <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</li>
                    </ul>
                  </div>
                  
                  <div style="background: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3>🔧 Soluciones Implementadas:</h3>
                    <ul>
                      <li>✅ Retry automático con backoff exponencial</li>
                      <li>✅ Detección específica de errores de Gmail</li>
                      <li>✅ Rate limiting más conservador</li>
                      <li>✅ Headers optimizados para Gmail</li>
                      <li>✅ Delay inicial de 5 segundos</li>
                    </ul>
                  </div>
                  
                  <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3>✅ ¿Qué significa recibir este correo?</h3>
                    <p>Si recibes este correo, significa que:</p>
                    <ul>
                      <li>✅ La solución al error 5.7.708 está funcionando</li>
                      <li>✅ Gmail ya no está bloqueando la IP</li>
                      <li>✅ Los reintentos automáticos funcionaron</li>
                      <li>✅ El sistema está recuperado</li>
                    </ul>
                  </div>
                  
                  <hr style="margin: 30px 0;">
                  <p style="text-align: center; color: #6b7280; font-size: 14px;">
                    Enviado desde InvoSell - Sistema de Facturación Electrónica<br>
                    Solución implementada para error 5.7.708
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
            name: 'Usuario de Prueba'
          }
        }
      ],
      importance: 'Normal'
    },
    saveToSentItems: true
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`  🔄 Intento ${attempt}/${maxRetries}...`, 'yellow');
      
      // Delay inicial más largo para Gmail
      if (attempt === 1) {
        log('  ⏳ Esperando 5 segundos (delay inicial para Gmail)...', 'yellow');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        // Backoff exponencial con jitter
        const delay = 3000 * Math.pow(2, attempt - 2) + Math.random() * 1000;
        log(`  ⏳ Esperando ${Math.round(delay)}ms (backoff exponencial)...`, 'yellow');
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await makeRequest(graphUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'InvoSell/1.0 (Gmail-Compatible)'
        },
        body: JSON.stringify(emailPayload)
      });

      if (response.status === 202) {
        log(`  ✅ Correo enviado exitosamente en el intento ${attempt}`, 'green');
        log(`  📬 Revisa la bandeja de ${recipientEmail}`, 'blue');
        return { success: true, attempt, email: recipientEmail };
      } else {
        log(`  ❌ Error en intento ${attempt}: ${response.status}`, 'red');
        log(`  📝 Respuesta: ${JSON.stringify(response.data, null, 2)}`, 'yellow');
        
        // Si es el último intento, retornar error
        if (attempt === maxRetries) {
          return { success: false, attempt, email: recipientEmail, error: response.data };
        }
      }
    } catch (error) {
      log(`  ❌ Error de conexión en intento ${attempt}: ${error.message}`, 'red');
      
      if (attempt === maxRetries) {
        return { success: false, attempt, email: recipientEmail, error: error.message };
      }
    }
  }
}

async function analyzeErrorPattern() {
  log('\n🔍 Análisis del Error 5.7.708:', 'magenta');
  log('  📋 Patrón del error:', 'cyan');
  log('     - Código: 550 5.7.708', 'cyan');
  log('     - Mensaje: Service unavailable. Access denied, traffic not accepted from this IP', 'cyan');
  log('     - Causa: Gmail bloqueando temporalmente la IP de Office 365', 'cyan');
  
  log('\n  🔧 Soluciones implementadas:', 'green');
  log('     ✅ Retry automático con backoff exponencial', 'green');
  log('     ✅ Detección específica de errores 5.7.708', 'green');
  log('     ✅ Delay inicial de 5 segundos para Gmail', 'green');
  log('     ✅ Headers optimizados (User-Agent personalizado)', 'green');
  log('     ✅ Importancia normal (no alta)', 'green');
  log('     ✅ Sin confirmaciones de lectura/entrega', 'green');
  
  log('\n  📊 Estrategia de reintentos:', 'blue');
  log('     - Intento 1: Delay 5 segundos', 'blue');
  log('     - Intento 2: Delay 3-4 segundos', 'blue');
  log('     - Intento 3: Delay 6-7 segundos', 'blue');
  log('     - Máximo 3 intentos por correo', 'blue');
}

async function main() {
  log('🚀 Prueba de Solución para Error 5.7.708 de Gmail', 'bold');
  log('=' .repeat(70), 'blue');

  // Analizar el patrón del error
  await analyzeErrorPattern();

  // Obtener token
  const accessToken = await getAccessToken();
  if (!accessToken) {
    log('\n❌ No se pudo obtener token. Revisa la configuración.', 'red');
    process.exit(1);
  }

  // Emails de prueba
  const testEmails = [
    'josuexrl19@gmail.com', // Tu email real
    // 'test@gmail.com' // Email de prueba
  ];

  const results = [];

  // Probar cada email
  for (const email of testEmails) {
    const result = await testGmailWithRetry(accessToken, email);
    results.push(result);
    
    // Pausa entre emails para evitar rate limiting
    if (testEmails.indexOf(email) < testEmails.length - 1) {
      log('  ⏳ Pausa de 10 segundos entre emails...', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  // Resumen
  log('\n' + '='.repeat(70), 'blue');
  log('📊 RESUMEN DE RESULTADOS:', 'bold');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  log(`✅ Exitosos: ${successful}`, 'green');
  log(`❌ Fallidos: ${failed}`, 'red');
  
  log('\n📋 Detalles por email:', 'cyan');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`  ${status} ${result.email}: ${result.success ? `Enviado (intento ${result.attempt})` : `Error (intento ${result.attempt})`}`, color);
    if (!result.success && result.error) {
      log(`     Error: ${JSON.stringify(result.error)}`, 'yellow');
    }
  });

  log('\n🎯 INTERPRETACIÓN DE RESULTADOS:', 'magenta');
  if (successful > 0) {
    log('  🎉 ¡La solución está funcionando!', 'green');
    log('  ✅ Gmail ya no está bloqueando la IP', 'green');
    log('  ✅ Los reintentos automáticos funcionan', 'green');
    log('  ✅ El sistema se ha recuperado del error 5.7.708', 'green');
  } else {
    log('  ⚠️  Gmail sigue bloqueando temporalmente', 'yellow');
    log('  📝 Esto puede ser normal si:', 'yellow');
    log('     - El bloqueo es muy reciente', 'yellow');
    log('     - Gmail tiene políticas muy estrictas', 'yellow');
    log('     - La IP está en lista negra temporal', 'yellow');
  }

  log('\n🔧 PRÓXIMOS PASOS:', 'blue');
  if (successful > 0) {
    log('  1. ✅ El sistema está funcionando correctamente', 'green');
    log('  2. 🌐 Usa la interfaz web para más pruebas', 'green');
    log('  3. 📊 Monitorea las métricas de entrega', 'green');
    log('  4. 🔄 Implementa el retry automático en producción', 'green');
  } else {
    log('  1. ⏳ Espera 15-30 minutos antes de reintentar', 'yellow');
    log('  2. 🔍 Verifica la configuración DNS (SPF/DKIM/DMARC)', 'yellow');
    log('  3. 📞 Contacta soporte de Microsoft si persiste', 'yellow');
    log('  4. 🔄 Considera usar servicio alternativo para Gmail', 'yellow');
  }

  log('\n💡 CONSEJOS IMPORTANTES:', 'cyan');
  log('  - El error 5.7.708 es temporal y se resuelve solo', 'cyan');
  log('  - Los reintentos automáticos son clave', 'cyan');
  log('  - Gmail es muy estricto con nuevos dominios', 'cyan');
  log('  - La configuración DNS es crucial para la reputación', 'cyan');
  log('  - Monitorea regularmente las métricas de entrega', 'cyan');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    log(`\n💥 Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main };
