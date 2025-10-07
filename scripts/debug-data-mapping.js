#!/usr/bin/env node

/**
 * Script para debuggear específicamente el mapeo de datos
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

// Simular la función de mapeo
function formatInvoiceDataForPDFOptimized(invoice, company, client) {
  const formatDate = (date) => {
    if (!date) return 'N/A'
    try {
      if (date instanceof Date) {
        return date.toLocaleDateString('es-CR')
      }
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('es-CR')
      }
      if (date.toDate && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString('es-CR')
      }
      return 'N/A'
    } catch {
      return 'N/A'
    }
  }

  return {
    invoice: {
      ...invoice,
      tipo: 'Factura Electrónica',
      fechaEmision: formatDate(invoice.fechaEmision || invoice.haciendaResponse?.fecha),
      consecutivo: invoice.consecutivo || invoice.number || 'N/A',
      clave: invoice.haciendaResponse?.clave || invoice.clave || invoice.key || 'N/A',
      elaboradoPor: invoice.elaboradoPor || invoice.createdBy || 'Sistema de Facturación v4.4',
      subtotal: invoice.subtotal || invoice.subTotal || 0,
      totalGravado: invoice.totalGravado || invoice.totalTaxable || 0,
      totalExento: invoice.totalExento || invoice.totalExempt || 0,
      impuestos: invoice.totalImpuesto || invoice.totalTax || invoice.taxes || 0,
      descuentos: invoice.totalDescuento || invoice.totalDiscount || invoice.discounts || 0,
      ivaDevuelto: invoice.ivaDevuelto || invoice.ivaReturned || 0,
      total: invoice.total || invoice.totalAmount || 0,
      moneda: invoice.currency || invoice.moneda || 'CRC',
      formaPago: invoice.paymentMethod || invoice.formaPago || invoice.paymentMethodCode || '01',
      items: invoice.items || invoice.lineItems || [],
      notas: invoice.notes || invoice.notas || invoice.comments || ''
    },
    haciendaResponse: invoice.haciendaResponse || invoice.haciendaSubmission,
    company: {
      name: company?.name || company?.nombre || company?.nombreComercial || 'N/A',
      identification: company?.identification || company?.cedula || company?.taxId || 'N/A',
      phone: company?.phone || company?.telefono || company?.phoneNumber || 'N/A',
      email: company?.email || company?.correo || company?.emailAddress || 'N/A',
      economicActivity: company?.economicActivity || company?.actividadEconomica || null,
      otrasSenas: company?.otrasSenas || company?.direccion || company?.address || 'N/A',
      logo: company?.logo || company?.logotipo || null,
      provincia: company?.provincia || company?.province || company?.provinciaNombre || 'N/A',
      canton: company?.canton || company?.cantonNombre || 'N/A',
      distrito: company?.distrito || company?.district || company?.distritoNombre || 'N/A'
    },
    client: {
      name: client?.name || client?.nombre || client?.nombreCompleto || 'Consumidor Final',
      identification: client?.identification || client?.cedula || client?.taxId || 'N/A',
      email: client?.email || client?.correo || client?.emailAddress || 'N/A',
      phone: client?.phone || client?.telefono || client?.phoneNumber || 'N/A',
      economicActivity: client?.economicActivity || client?.actividadEconomica || null,
      direccion: client?.direccion || client?.address || client?.direccionCompleta || 'N/A',
      provincia: client?.provincia || client?.province || client?.provinciaNombre || 'N/A',
      canton: client?.canton || client?.cantonNombre || 'N/A',
      distrito: client?.distrito || client?.district || client?.distritoNombre || 'N/A'
    }
  }
}

async function debugDataMapping() {
  log('\n🔍 Debuggeando Mapeo de Datos', 'bold');
  log('=' .repeat(60), 'blue');
  
  try {
    // Datos de entrada simulando lo que llega desde el frontend
    const invoice = {
      consecutivo: 'FE-0000000171',
      fechaEmision: '2025-10-05',
      elaboradoPor: 'Sistema de Facturación v4.4',
      currency: 'USD',
      paymentMethod: '02',
      subtotal: 1000,
      totalExento: 0,
      totalDescuento: 50,
      totalImpuesto: 130,
      ivaDevuelto: 0,
      total: 1080,
      notes: 'Factura de prueba con mapeo completo.',
      items: [
        {
          cantidad: 1,
          unidad: 'Sp',
          codigoCABYS: '8511.00.00.00',
          description: 'Desarrollo de Software Personalizado',
          precioUnitario: 1000,
          descuento: 50,
          impuestoNeto: 130,
          montoTotalLinea: 1080
        }
      ],
      haciendaResponse: {
        clave: '50605102500310286786000100001010000000171196090626',
        fecha: '2025-10-05T17:57:21+00:00'
      }
    };

    const company = {
      name: 'InnovaSell Costa Rica',
      identification: '310123456789',
      phone: '+506 2222-3333',
      email: 'facturas@innovasmartcr.com',
      otrasSenas: 'Avenida Central, Edificio Torre Empresarial, Piso 5',
      province: '01',
      canton: '01',
      district: '01',
      economicActivity: {
        codigo: '6201',
        descripcion: 'Programación de computadoras'
      }
    };

    const client = {
      name: 'Josué Rodríguez - Cliente Empresarial',
      identification: '310987654321',
      phone: '+506 8888-8888',
      email: 'josuexrl19@gmail.com',
      direccion: 'Barrio Escalante, Avenida Central',
      province: '01',
      canton: '01',
      district: '01',
      economicActivity: {
        codigo: '6201',
        descripcion: 'Programación de computadoras'
      }
    };

    log('\n📊 Datos de entrada:', 'cyan');
    log('Invoice (original):', 'blue');
    console.log(JSON.stringify(invoice, null, 2));

    log('\n📊 Datos mapeados:', 'cyan');
    const mappedData = formatInvoiceDataForPDFOptimized(invoice, company, client);
    
    log('Invoice (mapeado):', 'green');
    console.log(JSON.stringify(mappedData.invoice, null, 2));
    
    log('\nCompany (mapeado):', 'green');
    console.log(JSON.stringify(mappedData.company, null, 2));
    
    log('\nClient (mapeado):', 'green');
    console.log(JSON.stringify(mappedData.client, null, 2));

    log('\n🔍 Verificación de campos específicos:', 'cyan');
    
    // Verificar campos específicos
    const checks = [
      { field: 'consecutivo', value: mappedData.invoice.consecutivo, expected: 'FE-0000000171' },
      { field: 'fechaEmision', value: mappedData.invoice.fechaEmision, expected: '2025-10-05' },
      { field: 'moneda', value: mappedData.invoice.moneda, expected: 'USD' },
      { field: 'formaPago', value: mappedData.invoice.formaPago, expected: '02' },
      { field: 'notas', value: mappedData.invoice.notas, expected: 'Factura de prueba con mapeo completo.' },
      { field: 'company.identification', value: mappedData.company.identification, expected: '310123456789' },
      { field: 'company.otrasSenas', value: mappedData.company.otrasSenas, expected: 'Avenida Central, Edificio Torre Empresarial, Piso 5' },
      { field: 'company.economicActivity', value: mappedData.company.economicActivity ? 'Presente' : 'Ausente', expected: 'Presente' },
      { field: 'client.identification', value: mappedData.client.identification, expected: '310987654321' },
      { field: 'haciendaResponse.clave', value: mappedData.haciendaResponse?.clave, expected: '50605102500310286786000100001010000000171196090626' }
    ];

    checks.forEach(check => {
      const status = check.value === check.expected ? '✅' : '❌';
      const color = check.value === check.expected ? 'green' : 'red';
      log(`${status} ${check.field}: "${check.value}" (esperado: "${check.expected}")`, color);
    });

    return true;
    
  } catch (error) {
    log(`\n💥 Error en debug: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    return false;
  }
}

async function main() {
  log('🔍 Debug de Mapeo de Datos', 'bold');
  
  try {
    const success = await debugDataMapping();
    
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

module.exports = { main, debugDataMapping };
