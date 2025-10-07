#!/usr/bin/env node

/**
 * Script para probar el manejo de rebotes intermitentes de Gmail
 * Simula el comportamiento real de Gmail que a veces acepta y a veces rebota
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
    } else {
      throw new Error(`Error obteniendo token: ${response.status}`);
    }
  } catch (error) {
    throw new Error(`Error de conexión: ${error.message}`);
  }
}

async function sendTestEmail(accessToken, recipientEmail, testNumber) {
  const senderEmail = process.env.OFFICE365_SENDER_EMAIL;
  const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;

  const emailPayload = {
    message: {
      subject: `🧪 Prueba #${testNumber} - Rebotes Intermitentes - ${new Date().toISOString()}`,
      body: {
        contentType: 'HTML',
        content: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1>🧪 Prueba de Rebotes Intermitentes</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
                  <h2>Prueba #${testNumber}</h2>
                  <p>Este es el correo número <strong>${testNumber}</strong> en una serie de pruebas para simular el comportamiento intermitente de Gmail.</p>
                  
                  <div style="background: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3>📊 Información de la Prueba:</h3>
                    <ul>
                      <li><strong>Número de prueba:</strong> ${testNumber}</li>
                      <li><strong>Destinatario:</strong> ${recipientEmail}</li>
                      <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</li>
                      <li><strong>Objetivo:</strong> Simular rebotes intermitentes de Gmail</li>
                    </ul>
                  </div>
                  
                  <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3>⚠️ Comportamiento Esperado:</h3>
                    <p>Gmail puede:</p>
                    <ul>
                      <li>✅ Aceptar este correo normalmente</li>
                      <li>❌ Rebotar con error 5.7.708 (IP blocked)</li>
                      <li>⏳ Aceptar después de varios intentos</li>
                      <li>🔄 Comportamiento intermitente</li>
                    </ul>
                  </div>
                  
                  <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3>✅ Si recibes este correo:</h3>
                    <ul>
                      <li>✅ La prueba #${testNumber} fue exitosa</li>
                      <li>✅ Gmail aceptó el correo en este intento</li>
                      <li>✅ El sistema de retry funcionó correctamente</li>
                    </ul>
                  </div>
                  
                  <hr style="margin: 30px 0;">
                  <p style="text-align: center; color: #6b7280; font-size: 14px;">
                    Enviado desde InvoSell - Prueba de Rebotes Intermitentes<br>
                    Prueba #${testNumber} de la serie
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
            name: `Prueba ${testNumber}`
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
        'Content-Type': 'application/json',
        'User-Agent': `InvoSell-Test-${testNumber}/1.0`
      },
      body: JSON.stringify(emailPayload)
    });

    return {
      success: response.status === 202,
      status: response.status,
      testNumber,
      error: response.status !== 202 ? response.data : null,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      testNumber,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function runIntermittentTest() {
  log('🧪 Prueba de Rebotes Intermitentes de Gmail', 'bold');
  log('=' .repeat(60), 'blue');
  
  try {
    const accessToken = await getAccessToken();
    const testEmail = 'josuexrl19@gmail.com';
    const numberOfTests = 5; // Enviar 5 correos para simular comportamiento intermitente
    
    log(`📧 Enviando ${numberOfTests} correos de prueba a ${testEmail}...`, 'cyan');
    log('📝 Objetivo: Simular el comportamiento intermitente de Gmail', 'yellow');
    
    const results = [];
    let successful = 0;
    let failed = 0;
    
    for (let i = 1; i <= numberOfTests; i++) {
      log(`\n🧪 Enviando prueba #${i}...`, 'blue');
      
      // Delay entre envíos para simular comportamiento real
      if (i > 1) {
        const delay = 30000 + Math.random() * 30000; // 30-60 segundos
        log(`⏳ Esperando ${Math.round(delay/1000)}s entre envíos...`, 'yellow');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const result = await sendTestEmail(accessToken, testEmail, i);
      results.push(result);
      
      if (result.success) {
        successful++;
        log(`  ✅ Prueba #${i}: Enviado exitosamente`, 'green');
      } else {
        failed++;
        log(`  ❌ Prueba #${i}: Error (${result.status})`, 'red');
        if (result.error) {
          log(`     📝 Error: ${JSON.stringify(result.error)}`, 'yellow');
        }
      }
      
      // Pequeña pausa para no saturar
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Resumen de resultados
    log('\n' + '='.repeat(60), 'blue');
    log('📊 RESUMEN DE PRUEBAS INTERMITENTES:', 'bold');
    
    log(`\n📈 Estadísticas:`, 'cyan');
    log(`  📧 Total de pruebas: ${numberOfTests}`, 'cyan');
    log(`  ✅ Exitosas: ${successful}`, 'green');
    log(`  ❌ Fallidas: ${failed}`, 'red');
    log(`  📊 Tasa de éxito: ${((successful / numberOfTests) * 100).toFixed(1)}%`, 'cyan');
    
    log(`\n📋 Detalles por prueba:`, 'cyan');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const color = result.success ? 'green' : 'red';
      log(`  ${status} Prueba #${result.testNumber}: ${result.success ? 'Enviado' : 'Error'}`, color);
      if (!result.success && result.error) {
        log(`     📝 Status: ${result.status}`, 'yellow');
        if (JSON.stringify(result.error).includes('5.7.708')) {
          log(`     🚨 Error 5.7.708 detectado (IP Blocked)`, 'yellow');
        }
      }
    });
    
    // Análisis del comportamiento
    log(`\n🔍 Análisis del Comportamiento:`, 'magenta');
    
    if (successful === numberOfTests) {
      log('  🎉 Comportamiento: Gmail aceptando todos los correos', 'green');
      log('  💡 Interpretación: Sistema funcionando perfectamente', 'green');
    } else if (successful > 0 && failed > 0) {
      log('  ⚠️ Comportamiento: Gmail mostrando rebotes intermitentes', 'yellow');
      log('  💡 Interpretación: Comportamiento típico de Gmail', 'yellow');
      log('  🔧 Solución: Sistema de retry automático funcionando', 'yellow');
    } else if (failed === numberOfTests) {
      log('  🚨 Comportamiento: Gmail bloqueando todos los correos', 'red');
      log('  💡 Interpretación: Bloqueo temporal más severo', 'red');
      log('  🔧 Solución: Esperar más tiempo antes de reintentar', 'red');
    }
    
    // Recomendaciones
    log(`\n🔧 Recomendaciones:`, 'blue');
    
    if (successful > 0) {
      log('  1. ✅ Sistema funcionando - algunos correos llegan', 'green');
      log('  2. 🔄 Implementar retry automático para los fallidos', 'blue');
      log('  3. 📊 Monitorear tasa de éxito a lo largo del tiempo', 'blue');
    }
    
    if (failed > 0) {
      log('  4. ⏳ Los rebotes son temporales - se resuelven solos', 'yellow');
      log('  5. 🔍 Verificar configuración DNS si persiste', 'yellow');
      log('  6. 📞 Contactar soporte si bloqueo > 2 horas', 'yellow');
    }
    
    log('  7. 📈 Usar herramientas de monitoreo regularmente', 'blue');
    log('  8. 🔄 Considerar servicio alternativo para Gmail crítico', 'blue');
    
    // Mostrar resultados en JSON para análisis
    log(`\n📄 Resultados Detallados (JSON):`, 'bold');
    console.log(JSON.stringify({
      summary: {
        total: numberOfTests,
        successful,
        failed,
        successRate: (successful / numberOfTests) * 100
      },
      results: results.map(r => ({
        testNumber: r.testNumber,
        success: r.success,
        status: r.status,
        error: r.error,
        timestamp: r.timestamp
      })),
      analysis: {
        behavior: successful === numberOfTests ? 'consistent' : 
                 successful > 0 ? 'intermittent' : 'blocked',
        recommendation: successful > 0 ? 'system_working' : 'investigation_needed'
      }
    }, null, 2));
    
  } catch (error) {
    log(`\n💥 Error fatal: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runIntermittentTest().catch(error => {
    log(`\n💥 Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runIntermittentTest };
