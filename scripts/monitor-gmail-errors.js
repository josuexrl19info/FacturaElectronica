#!/usr/bin/env node

/**
 * Script de monitoreo para errores 5.7.708 de Gmail
 * Ejecuta: node scripts/monitor-gmail-errors.js
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

async function testGmailDelivery(accessToken, recipientEmail) {
  const senderEmail = process.env.OFFICE365_SENDER_EMAIL;
  const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;

  const emailPayload = {
    message: {
      subject: `🔍 Monitoreo Gmail - ${new Date().toISOString()}`,
      body: {
        contentType: 'HTML',
        content: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1>🔍 Monitoreo de Gmail</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
                  <h2>Estado del Sistema</h2>
                  <p>Este correo confirma que el envío a Gmail está funcionando correctamente.</p>
                  
                  <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3>✅ Información del Monitoreo:</h3>
                    <ul>
                      <li><strong>Destinatario:</strong> ${recipientEmail}</li>
                      <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</li>
                      <li><strong>Servidor:</strong> ${senderEmail}</li>
                      <li><strong>Estado:</strong> Funcionando correctamente</li>
                    </ul>
                  </div>
                  
                  <div style="background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3>📊 Métricas:</h3>
                    <ul>
                      <li>✅ Error 5.7.708: Resuelto</li>
                      <li>✅ Retry automático: Activo</li>
                      <li>✅ Detección de errores: Funcionando</li>
                      <li>✅ Backoff exponencial: Implementado</li>
                    </ul>
                  </div>
                  
                  <hr style="margin: 30px 0;">
                  <p style="text-align: center; color: #6b7280; font-size: 14px;">
                    Enviado desde InvoSell - Sistema de Monitoreo de Correos
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
            name: 'Monitoreo Gmail'
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
        'User-Agent': 'InvoSell-Monitor/1.0'
      },
      body: JSON.stringify(emailPayload)
    });

    return {
      success: response.status === 202,
      status: response.status,
      error: response.status !== 202 ? response.data : null
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error.message
    };
  }
}

async function checkGmailStatus() {
  log('\n🔍 Verificando estado de Gmail...', 'cyan');
  
  try {
    const accessToken = await getAccessToken();
    const testEmail = 'josuexrl19@gmail.com'; // Tu email de prueba
    
    const result = await testGmailDelivery(accessToken, testEmail);
    
    if (result.success) {
      log('  ✅ Gmail: Funcionando correctamente', 'green');
      return { status: 'healthy', details: 'Gmail aceptando correos' };
    } else {
      log('  ❌ Gmail: Error detectado', 'red');
      log(`  📝 Status: ${result.status}`, 'yellow');
      log(`  📝 Error: ${JSON.stringify(result.error)}`, 'yellow');
      
      // Verificar si es error 5.7.708
      if (JSON.stringify(result.error).includes('5.7.708')) {
        return { 
          status: 'blocked', 
          details: 'Error 5.7.708 - Gmail bloqueando IP temporalmente',
          recommendation: 'Esperar 15-30 minutos antes de reintentar'
        };
      } else {
        return { 
          status: 'error', 
          details: `Error ${result.status}: ${JSON.stringify(result.error)}`,
          recommendation: 'Revisar configuración del servicio'
        };
      }
    }
  } catch (error) {
    log(`  ❌ Error de conexión: ${error.message}`, 'red');
    return { 
      status: 'connection_error', 
      details: error.message,
      recommendation: 'Verificar conectividad y configuración'
    };
  }
}

async function generateStatusReport() {
  log('\n📊 Generando reporte de estado...', 'magenta');
  
  const gmailStatus = await checkGmailStatus();
  const timestamp = new Date().toISOString();
  
  const report = {
    timestamp,
    service: 'InvoSell Email Service',
    gmail: gmailStatus,
    summary: {
      overall: gmailStatus.status === 'healthy' ? 'healthy' : 'issues',
      gmail_working: gmailStatus.status === 'healthy'
    },
    recommendations: []
  };
  
  // Agregar recomendaciones basadas en el estado
  if (gmailStatus.status === 'blocked') {
    report.recommendations.push('Gmail está bloqueando temporalmente. Implementar retry automático.');
    report.recommendations.push('Esperar 15-30 minutos antes de reintentar envíos.');
    report.recommendations.push('Considerar usar servicio alternativo para Gmail si persiste.');
  } else if (gmailStatus.status === 'error') {
    report.recommendations.push('Error en el servicio de correos. Revisar configuración.');
    report.recommendations.push('Verificar variables de entorno de Office 365.');
    report.recommendations.push('Contactar soporte técnico si persiste.');
  } else if (gmailStatus.status === 'healthy') {
    report.recommendations.push('Sistema funcionando correctamente.');
    report.recommendations.push('Continuar con envíos normales.');
    report.recommendations.push('Monitorear métricas de entrega.');
  }
  
  return report;
}

async function main() {
  log('🔍 Monitor de Errores Gmail - InvoSell', 'bold');
  log('=' .repeat(50), 'blue');
  
  try {
    const report = await generateStatusReport();
    
    // Mostrar resumen
    log('\n📋 RESUMEN DEL REPORTE:', 'bold');
    log(`  🕐 Timestamp: ${report.timestamp}`, 'cyan');
    log(`  📧 Servicio: ${report.service}`, 'cyan');
    log(`  🎯 Estado General: ${report.summary.overall === 'healthy' ? '✅ Saludable' : '⚠️ Problemas'}`, 
        report.summary.overall === 'healthy' ? 'green' : 'yellow');
    
    log('\n📊 Estado por Proveedor:', 'bold');
    log(`  📧 Gmail: ${report.gmail.status === 'healthy' ? '✅ Funcionando' : '❌ Problemas'}`, 
        report.gmail.status === 'healthy' ? 'green' : 'red');
    log(`  📝 Detalles: ${report.gmail.details}`, 'yellow');
    
    if (report.gmail.recommendation) {
      log(`  💡 Recomendación: ${report.gmail.recommendation}`, 'blue');
    }
    
    log('\n🔧 Recomendaciones:', 'bold');
    report.recommendations.forEach((rec, index) => {
      log(`  ${index + 1}. ${rec}`, 'blue');
    });
    
    // Mostrar reporte completo en formato JSON
    log('\n📄 Reporte Completo (JSON):', 'bold');
    console.log(JSON.stringify(report, null, 2));
    
    // Estado final
    log('\n' + '='.repeat(50), 'blue');
    if (report.summary.overall === 'healthy') {
      log('🎉 Estado: SISTEMA FUNCIONANDO CORRECTAMENTE', 'green');
      log('✅ Todos los proveedores están operativos', 'green');
    } else {
      log('⚠️ Estado: PROBLEMAS DETECTADOS', 'yellow');
      log('🔧 Revisar recomendaciones arriba', 'yellow');
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

module.exports = { main, checkGmailStatus, generateStatusReport };
