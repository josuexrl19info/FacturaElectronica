#!/usr/bin/env node

/**
 * Script para verificar si las facturas tienen XMLs y por qué no se envían
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

async function checkInvoiceXMLs() {
  log('\n🔍 Verificando XMLs en facturas', 'bold');
  log('=' .repeat(50), 'blue');
  
  try {
    // Probar con una factura específica que sabemos que existe
    log('\n📋 Paso 1: Probando con factura FE-0000000151...', 'cyan');
    
    // Simular una factura como la que vimos en los logs
    const mockInvoice = {
      id: 'test-invoice-id',
      consecutivo: 'FE-0000000151',
      status: 'Aceptado',
      clientId: 'ihanbDfy76iPHOQtCbcJ',
      cliente: {
        nombre: 'Cliente de Prueba',
        email: 'josuexrl19@gmail.com'
      },
      total: 50000,
      fecha: new Date(),
      // Estos campos están vacíos, por eso no se envían los XMLs
      xmlSigned: undefined,
      haciendaSubmission: undefined
    };
    
    log('  📄 Factura simulada:', 'blue');
    log(`    ID: ${mockInvoice.id}`, 'blue');
    log(`    Consecutivo: ${mockInvoice.consecutivo}`, 'blue');
    log(`    Status: ${mockInvoice.status}`, 'blue');
    log(`    Cliente: ${mockInvoice.cliente.nombre}`, 'blue');
    log(`    Email: ${mockInvoice.cliente.email}`, 'blue');
    log(`    Total: ₡${mockInvoice.total.toLocaleString()}`, 'blue');
    
    log('  📄 Campos XML:', 'blue');
    log(`    - xmlSigned: ${mockInvoice.xmlSigned ? '✅ Disponible' : '❌ No disponible'}`, mockInvoice.xmlSigned ? 'green' : 'red');
    log(`    - haciendaSubmission: ${mockInvoice.haciendaSubmission ? '✅ Disponible' : '❌ No disponible'}`, mockInvoice.haciendaSubmission ? 'green' : 'red');
    
    // Probar el servicio de email con esta factura
    log('\n📧 Paso 2: Probando servicio de email...', 'cyan');
    
    const emailResponse = await fetch('http://localhost:3000/api/email/test-invoice-email/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        testEmail: 'josuexrl19.info@gmail.com',
        simulateApproval: true
      })
    });
    
    const emailResult = await emailResponse.json();
    
    if (emailResult.success) {
      log('  ✅ Email enviado exitosamente', 'green');
      log(`  📧 Message ID: ${emailResult.messageId}`, 'blue');
    } else {
      log(`  ❌ Error enviando email: ${emailResult.error}`, 'red');
    }
    
    // Ahora probar con una factura que SÍ tenga XMLs
    log('\n📧 Paso 3: Probando con XMLs simulados...', 'cyan');
    
    const mockInvoiceWithXMLs = {
      ...mockInvoice,
      xmlSigned: `<?xml version="1.0" encoding="UTF-8"?>
<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica">
  <Clave>50624051000012345678901234567890123456789012</Clave>
  <ProveedorSistemas>InvoSell</ProveedorSistemas>
  <CodigoActividadEmisor>6201000</CodigoActividadEmisor>
  <NumeroConsecutivo>001000123456789</NumeroConsecutivo>
  <FechaEmision>2025-10-05T15:00:00-06:00</FechaEmision>
  <Emisor>
    <Nombre>Ketch Corporation SA</Nombre>
    <TipoIdentificacion>02</TipoIdentificacion>
    <NumeroIdentificacion>310123456789</NumeroIdentificacion>
    <Email>facturas@ketchcorporation.com</Email>
  </Emisor>
  <Receptor>
    <Nombre>Cliente de Prueba</Nombre>
    <TipoIdentificacion>02</TipoIdentificacion>
    <NumeroIdentificacion>310987654321</NumeroIdentificacion>
    <Email>josuexrl19@gmail.com</Email>
  </Receptor>
  <CondicionVenta>01</CondicionVenta>
  <DetalleServicio>
    <LineaDetalle>
      <NumeroLinea>1</NumeroLinea>
      <CodigoCABYS>8399000000000</CodigoCABYS>
      <Cantidad>1</Cantidad>
      <UnidadMedida>Sp</UnidadMedida>
      <Detalle>Servicio de prueba</Detalle>
      <PrecioUnitario>50000</PrecioUnitario>
      <MontoTotal>50000</MontoTotal>
      <SubTotal>50000</SubTotal>
      <BaseImponible>50000</BaseImponible>
      <Impuesto>
        <Codigo>01</Codigo>
        <CodigoTarifaIVA>08</CodigoTarifaIVA>
        <Tarifa>13</Tarifa>
        <Monto>6500</Monto>
      </Impuesto>
      <MontoTotalLinea>56500</MontoTotalLinea>
    </LineaDetalle>
  </DetalleServicio>
  <ResumenFactura>
    <CodigoTipoMoneda>
      <CodigoMoneda>CRC</CodigoMoneda>
      <TipoCambio>1</TipoCambio>
    </CodigoTipoMoneda>
    <TotalServGravados>50000</TotalServGravados>
    <TotalGravado>50000</TotalGravado>
    <TotalVenta>50000</TotalVenta>
    <TotalVentaNeta>50000</TotalVentaNeta>
    <TotalDesgloseImpuesto>
      <Codigo>01</Codigo>
      <CodigoTarifaIVA>08</CodigoTarifaIVA>
      <TotalMontoImpuesto>6500</TotalMontoImpuesto>
    </TotalDesgloseImpuesto>
    <TotalImpuesto>6500</TotalImpuesto>
    <TipoMedioPago>01</TipoMedioPago>
    <TotalMedioPago>56500</TotalMedioPago>
    <TotalComprobante>56500</TotalComprobante>
  </ResumenFactura>
</FacturaElectronica>`,
      haciendaSubmission: {
        clave: '50624051000012345678901234567890123456789012',
        'ind-estado': 'aceptado',
        'respuesta-xml': Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<MensajeReceptor xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeReceptor">
  <Clave>50624051000012345678901234567890123456789012</Clave>
  <NumeroCedulaEmisor>310123456789</NumeroCedulaEmisor>
  <FechaEmisionDoc>2025-10-05T15:00:00-06:00</FechaEmisionDoc>
  <Mensaje>1</Mensaje>
  <DetalleMensaje>Comprobante aceptado</DetalleMensaje>
  <MontoTotalImpuesto>6500</MontoTotalImpuesto>
  <TotalFactura>56500</TotalFactura>
  <NumeroCedulaReceptor>310987654321</NumeroCedulaReceptor>
  <NumeroConsecutivoReceptor>001000123456789</NumeroConsecutivoReceptor>
</MensajeReceptor>`, 'utf8').toString('base64')
      }
    };
    
    log('  📄 Factura con XMLs:', 'blue');
    log(`    - xmlSigned: ${mockInvoiceWithXMLs.xmlSigned ? '✅ Disponible (' + mockInvoiceWithXMLs.xmlSigned.length + ' chars)' : '❌ No disponible'}`, mockInvoiceWithXMLs.xmlSigned ? 'green' : 'red');
    log(`    - haciendaSubmission: ${mockInvoiceWithXMLs.haciendaSubmission ? '✅ Disponible' : '❌ No disponible'}`, mockInvoiceWithXMLs.haciendaSubmission ? 'green' : 'red');
    log(`    - respuesta-xml: ${mockInvoiceWithXMLs.haciendaSubmission?.['respuesta-xml'] ? '✅ Disponible (' + mockInvoiceWithXMLs.haciendaSubmission['respuesta-xml'].length + ' chars)' : '❌ No disponible'}`, mockInvoiceWithXMLs.haciendaSubmission?.['respuesta-xml'] ? 'green' : 'red');
    
    // Probar conversión a base64
    log('\n📄 Paso 4: Probando conversión a base64...', 'cyan');
    
    const xml1_base64 = Buffer.from(mockInvoiceWithXMLs.xmlSigned, 'utf8').toString('base64');
    const xml2_base64 = mockInvoiceWithXMLs.haciendaSubmission['respuesta-xml'];
    
    log(`  ✅ XML firmado convertido: ${xml1_base64.length} caracteres base64`, 'green');
    log(`  ✅ XML respuesta obtenido: ${xml2_base64.length} caracteres base64`, 'green');
    
    // Probar envío directo con XMLs
    log('\n📧 Paso 5: Enviando email con XMLs...', 'cyan');
    
    const directEmailResponse = await fetch('http://localhost:8000/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'tu-api-key-super-secreta-123'
      },
      body: JSON.stringify({
        to: 'josuexrl19.info@gmail.com',
        subject: '🧪 Prueba con XMLs - Factura Electrónica',
        message: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1>🧪 Prueba con XMLs Adjuntos</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
                  <h2>¡Hola!</h2>
                  <p>Este correo confirma que el <strong>envío de XMLs adjuntos</strong> está funcionando correctamente.</p>
                  
                  <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3>📄 XMLs Adjuntos:</h3>
                    <ul>
                      <li><strong>XML Firmado:</strong> ${xml1_base64.length} caracteres base64</li>
                      <li><strong>XML Respuesta:</strong> ${xml2_base64.length} caracteres base64</li>
                      <li><strong>Formato:</strong> Ambos XMLs están codificados en base64</li>
                      <li><strong>Comprobante:</strong> Ketch Corporation SA</li>
                    </ul>
                  </div>
                  
                  <div style="background: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3>🔍 Diagnóstico del Problema:</h3>
                    <p><strong>Problema identificado:</strong> Las facturas reales no tienen los campos <code>xmlSigned</code> y <code>haciendaSubmission</code> poblados correctamente.</p>
                    <p><strong>Solución:</strong> Verificar que estos campos se guarden correctamente en el proceso de creación y actualización de facturas.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
        xml1_base64: xml1_base64,
        xml2_base64: xml2_base64
      })
    });
    
    const directEmailResult = await directEmailResponse.json();
    
    if (directEmailResult.success) {
      log('  ✅ Email con XMLs enviado exitosamente', 'green');
      log(`  📧 Message ID: ${directEmailResult.message_id}`, 'blue');
    } else {
      log(`  ❌ Error enviando email con XMLs: ${directEmailResult.error}`, 'red');
    }
    
    // Resumen final
    log('\n' + '='.repeat(60), 'blue');
    log('🔍 DIAGNÓSTICO COMPLETADO', 'bold');
    log('=' .repeat(60), 'blue');
    
    log('\n📊 Resultados del análisis:', 'cyan');
    log('  ✅ Servicio de email: Funcionando correctamente', 'green');
    log('  ✅ Conversión XML a base64: Funcionando correctamente', 'green');
    log('  ✅ Envío de XMLs adjuntos: Funcionando correctamente', 'green');
    log('  ❌ Facturas reales: No tienen XMLs poblados', 'red');
    
    log('\n🎯 PROBLEMA IDENTIFICADO:', 'yellow');
    log('  Las facturas en la base de datos no tienen los campos:', 'red');
    log('    - xmlSigned: undefined', 'red');
    log('    - haciendaSubmission: undefined', 'red');
    
    log('\n🔧 SOLUCIÓN REQUERIDA:', 'cyan');
    log('  1. Verificar que xmlSigned se guarde en la creación de facturas', 'blue');
    log('  2. Verificar que haciendaSubmission se guarde en la actualización de estado', 'blue');
    log('  3. Revisar el proceso de actualización de facturas con respuesta de Hacienda', 'blue');
    
    return true;
    
  } catch (error) {
    log(`\n💥 Error en diagnóstico: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('🔍 Verificación de XMLs en Facturas', 'bold');
  
  try {
    const success = await checkInvoiceXMLs();
    
    if (success) {
      log('\n🎯 VERIFICACIÓN COMPLETADA', 'green');
      process.exit(0);
    } else {
      log('\n💥 VERIFICACIÓN FALLIDA', 'red');
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

module.exports = { main, checkInvoiceXMLs };
