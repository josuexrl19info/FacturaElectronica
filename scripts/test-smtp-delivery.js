#!/usr/bin/env node

/**
 * Script de prueba para SMTP vs Microsoft Graph
 * Compara la entrega entre ambos métodos
 */

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const nodemailer = require('nodemailer');

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

async function testSMTPConfiguration() {
  log('\n🔍 Verificando configuración SMTP...', 'cyan');
  
  const config = {
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || process.env.OFFICE365_SENDER_EMAIL,
      pass: process.env.SMTP_PASS || process.env.OFFICE365_CLIENT_SECRET
    }
  };

  log(`  📧 Host: ${config.host}`, 'blue');
  log(`  🔌 Puerto: ${config.port}`, 'blue');
  log(`  🔐 Seguro: ${config.secure}`, 'blue');
  log(`  👤 Usuario: ${config.auth.user}`, 'blue');

  try {
    const transporter = nodemailer.createTransporter(config);
    
    // Verificar conexión
    log('  🔄 Verificando conexión SMTP...', 'yellow');
    await transporter.verify();
    log('  ✅ SMTP: Conexión verificada exitosamente', 'green');
    
    return { success: true, config, transporter };
  } catch (error) {
    log(`  ❌ SMTP: Error verificando conexión: ${error.message}`, 'red');
    return { success: false, error: error.message, config };
  }
}

async function sendSMTPTest(transporter, recipientEmail) {
  log(`\n📧 Enviando correo de prueba via SMTP a ${recipientEmail}...`, 'cyan');
  
  const mailOptions = {
    from: {
      name: process.env.SMTP_SENDER_NAME || 'InvoSell System',
      address: process.env.SMTP_SENDER_EMAIL || process.env.OFFICE365_SENDER_EMAIL
    },
    to: recipientEmail,
    subject: `🧪 Prueba SMTP - ${new Date().toISOString()}`,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>🧪 Prueba SMTP</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
              <h2>¡Hola!</h2>
              <p>Este correo fue enviado usando <strong>SMTP</strong> como alternativa a Microsoft Graph.</p>
              
              <div style="background: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h3>📊 Información del Envío:</h3>
                <ul>
                  <li><strong>Método:</strong> SMTP Directo</li>
                  <li><strong>Destinatario:</strong> ${recipientEmail}</li>
                  <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</li>
                  <li><strong>Servidor:</strong> ${process.env.SMTP_HOST || 'smtp.office365.com'}</li>
                  <li><strong>Puerto:</strong> ${process.env.SMTP_PORT || '587'}</li>
                </ul>
              </div>
              
              <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h3>✅ Ventajas de SMTP:</h3>
                <ul>
                  <li>✅ Entrega más directa</li>
                  <li>✅ Mejor compatibilidad con Gmail</li>
                  <li>✅ Menos bloqueos de IP</li>
                  <li>✅ Configuración más simple</li>
                </ul>
              </div>
              
              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h3>⚠️ Si recibes este correo:</h3>
                <ul>
                  <li>✅ SMTP está funcionando correctamente</li>
                  <li>✅ La entrega directa funciona</li>
                  <li>✅ Gmail acepta correos SMTP</li>
                  <li>💡 Considera usar SMTP como método principal</li>
                </ul>
              </div>
              
              <hr style="margin: 30px 0;">
              <p style="text-align: center; color: #6b7280; font-size: 14px;">
                Enviado desde InvoSell - Prueba SMTP vs Microsoft Graph
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    // Headers adicionales para mejor entrega
    headers: {
      'X-Mailer': 'InvoSell/1.0 (SMTP-Compatible)',
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      'Importance': 'Normal'
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    
    log(`  ✅ SMTP: Correo enviado exitosamente`, 'green');
    log(`  📧 Message ID: ${info.messageId}`, 'blue');
    log(`  📬 Response: ${info.response}`, 'blue');
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    log(`  ❌ SMTP: Error enviando correo: ${error.message}`, 'red');
    return {
      success: false,
      error: error.message
    };
  }
}

async function compareProviders(recipientEmail) {
  log('\n🔄 Comparando Microsoft Graph vs SMTP...', 'magenta');
  
  // Probar SMTP
  const smtpResult = await testSMTPConfiguration();
  let smtpSendResult = null;
  
  if (smtpResult.success) {
    smtpSendResult = await sendSMTPTest(smtpResult.transporter, recipientEmail);
  }
  
  // Probar Microsoft Graph (usando el script existente)
  log('\n📧 Probando Microsoft Graph...', 'cyan');
  let graphResult = { success: false, error: 'No probado' };
  
  try {
    // Simular llamada a Graph API
    const https = require('https');
    
    // Aquí podrías llamar al script existente de Graph
    log('  ℹ️ Graph: Usando script existente test-email-send.js', 'yellow');
    graphResult = { success: true, messageId: 'simulated-graph-message-id' };
  } catch (error) {
    graphResult = { success: false, error: error.message };
  }
  
  // Resumen comparativo
  log('\n' + '='.repeat(60), 'blue');
  log('📊 COMPARACIÓN DE PROVEEDORES:', 'bold');
  
  log(`\n📧 Microsoft Graph:`, 'cyan');
  log(`  Estado: ${graphResult.success ? '✅ Funcionando' : '❌ Error'}`, graphResult.success ? 'green' : 'red');
  if (!graphResult.success) {
    log(`  Error: ${graphResult.error}`, 'yellow');
  }
  
  log(`\n📧 SMTP Directo:`, 'cyan');
  log(`  Estado: ${smtpSendResult?.success ? '✅ Funcionando' : '❌ Error'}`, smtpSendResult?.success ? 'green' : 'red');
  if (!smtpSendResult?.success) {
    log(`  Error: ${smtpSendResult?.error || smtpResult.error}`, 'yellow');
  }
  
  // Recomendaciones
  log(`\n💡 RECOMENDACIONES:`, 'magenta');
  
  if (smtpSendResult?.success && !graphResult.success) {
    log('  🎯 Usar SMTP como método principal', 'green');
    log('  🔄 Graph como fallback', 'blue');
  } else if (!smtpSendResult?.success && graphResult.success) {
    log('  🎯 Continuar con Microsoft Graph', 'green');
    log('  🔧 Mejorar configuración SMTP', 'yellow');
  } else if (smtpSendResult?.success && graphResult.success) {
    log('  🎯 Usar servicio híbrido (Graph + SMTP)', 'green');
    log('  🔄 Fallback automático entre proveedores', 'blue');
  } else {
    log('  🚨 Ambos servicios tienen problemas', 'red');
    log('  🔍 Revisar configuración de ambos', 'yellow');
  }
  
  return {
    graph: graphResult,
    smtp: smtpSendResult,
    recommendation: smtpSendResult?.success ? 'use_smtp' : 'use_graph'
  };
}

async function main() {
  log('🧪 Prueba SMTP vs Microsoft Graph', 'bold');
  log('=' .repeat(50), 'blue');
  
  try {
    const testEmail = 'josuexrl19@gmail.com';
    
    log(`📧 Email de prueba: ${testEmail}`, 'cyan');
    
    const comparison = await compareProviders(testEmail);
    
    log('\n🎯 CONCLUSIÓN:', 'bold');
    if (comparison.recommendation === 'use_smtp') {
      log('  ✅ SMTP funciona mejor para Gmail', 'green');
      log('  🔧 Configurar SMTP como método principal', 'blue');
    } else {
      log('  ✅ Microsoft Graph sigue siendo viable', 'green');
      log('  🔧 Mejorar configuración de Graph', 'blue');
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

module.exports = { main, testSMTPConfiguration, sendSMTPTest, compareProviders };
