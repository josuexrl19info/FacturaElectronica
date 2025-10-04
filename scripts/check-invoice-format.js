const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function checkInvoiceFormat() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔍 Consultando factura con ID: 76yALPRjfgTA7bqzcD50');
    
    const docRef = doc(db, 'invoices', '76yALPRjfgTA7bqzcD50');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('✅ Factura encontrada:');
      console.log('📋 Estructura completa:');
      console.log(JSON.stringify(data, null, 2));
      
      console.log('\n🔍 Análisis detallado de campos:');
      console.log('=' .repeat(50));
      
      // Información básica
      console.log('\n📄 INFORMACIÓN BÁSICA:');
      console.log(`- consecutivo: ${data.consecutivo || 'NO ENCONTRADO'}`);
      console.log(`- status: ${data.status || 'NO ENCONTRADO'}`);
      console.log(`- createdAt: ${data.createdAt || 'NO ENCONTRADO'}`);
      console.log(`- updatedAt: ${data.updatedAt || 'NO ENCONTRADO'}`);
      
      // Relaciones
      console.log('\n🔗 RELACIONES:');
      console.log(`- clientId: ${data.clientId || 'NO ENCONTRADO'}`);
      console.log(`- companyId: ${data.companyId || 'NO ENCONTRADO'}`);
      console.log(`- tenantId: ${data.tenantId || 'NO ENCONTRADO'}`);
      console.log(`- createdBy: ${data.createdBy || 'NO ENCONTRADO'}`);
      
      // Totales
      console.log('\n💰 TOTALES:');
      console.log(`- subtotal: ${data.subtotal || 'NO ENCONTRADO'}`);
      console.log(`- totalImpuesto: ${data.totalImpuesto || 'NO ENCONTRADO'}`);
      console.log(`- totalDescuento: ${data.totalDescuento || 'NO ENCONTRADO'}`);
      console.log(`- total: ${data.total || 'NO ENCONTRADO'}`);
      console.log(`- exchangeRate: ${data.exchangeRate || 'NO ENCONTRADO'}`);
      console.log(`- currency: ${data.currency || 'NO ENCONTRADO'}`);
      
      // Condiciones de venta y pago
      console.log('\n📋 CONDICIONES DE VENTA Y PAGO:');
      console.log(`- condicionVenta: ${data.condicionVenta || 'NO ENCONTRADO'}`);
      console.log(`- paymentTerm: ${data.paymentTerm || 'NO ENCONTRADO'}`);
      console.log(`- paymentMethod: ${data.paymentMethod || 'NO ENCONTRADO'}`);
      
      // Notas
      console.log('\n📝 NOTAS:');
      console.log(`- notes: ${data.notes || 'NO ENCONTRADO'}`);
      
      // Items
      console.log('\n📦 ITEMS:');
      if (data.items && Array.isArray(data.items)) {
        console.log(`- Cantidad de items: ${data.items.length}`);
        data.items.forEach((item, index) => {
          console.log(`\n  Item ${index + 1}:`);
          console.log(`    - numeroLinea: ${item.numeroLinea || 'NO ENCONTRADO'}`);
          console.log(`    - codigoCABYS: ${item.codigoCABYS || 'NO ENCONTRADO'}`);
          console.log(`    - cantidad: ${item.cantidad || 'NO ENCONTRADO'}`);
          console.log(`    - unidadMedida: ${item.unidadMedida || 'NO ENCONTRADO'}`);
          console.log(`    - detalle: ${item.detalle || 'NO ENCONTRADO'}`);
          console.log(`    - precioUnitario: ${item.precioUnitario || 'NO ENCONTRADO'}`);
          console.log(`    - montoTotal: ${item.montoTotal || 'NO ENCONTRADO'}`);
          console.log(`    - subTotal: ${item.subTotal || 'NO ENCONTRADO'}`);
          console.log(`    - baseImponible: ${item.baseImponible || 'NO ENCONTRADO'}`);
          console.log(`    - montoTotalLinea: ${item.montoTotalLinea || 'NO ENCONTRADO'}`);
          
          // Impuestos
          if (item.impuesto && Array.isArray(item.impuesto)) {
            console.log(`    - impuesto (${item.impuesto.length} elementos):`);
            item.impuesto.forEach((imp, idx) => {
              console.log(`      Impuesto ${idx + 1}:`);
              console.log(`        - codigo: ${imp.codigo || 'NO ENCONTRADO'}`);
              console.log(`        - codigoTarifa: ${imp.codigoTarifa || 'NO ENCONTRADO'}`);
              console.log(`        - tarifa: ${imp.tarifa || 'NO ENCONTRADO'}`);
              console.log(`        - monto: ${imp.monto || 'NO ENCONTRADO'}`);
            });
          } else {
            console.log(`    - impuesto: NO ENCONTRADO`);
          }
          
          console.log(`    - impuestoAsumidoEmisorFabrica: ${item.impuestoAsumidoEmisorFabrica || 'NO ENCONTRADO'}`);
          console.log(`    - impuestoNeto: ${item.impuestoNeto || 'NO ENCONTRADO'}`);
        });
      } else {
        console.log('- items: NO ENCONTRADO O NO ES ARRAY');
      }
      
      // Respuesta de Hacienda
      console.log('\n🏛️ RESPUESTA DE HACIENDA:');
      console.log(`- haciendaStatus: ${data.haciendaStatus || 'NO ENCONTRADO'}`);
      console.log(`- haciendaValidationDate: ${data.haciendaValidationDate || 'NO ENCONTRADO'}`);
      if (data.haciendaResponse) {
        console.log('- haciendaResponse:');
        Object.keys(data.haciendaResponse).forEach(key => {
          console.log(`  - ${key}: ${data.haciendaResponse[key]}`);
        });
      } else {
        console.log('- haciendaResponse: NO ENCONTRADO');
      }
      
      // XML firmado
      console.log('\n📄 XML FIRMADO:');
      console.log(`- xmlSigned: ${data.xmlSigned ? 'PRESENTE' : 'NO ENCONTRADO'}`);
      
      console.log('\n' + '=' .repeat(50));
      console.log('✅ Análisis completado');
      
    } else {
      console.log('❌ No se encontró la factura con ese ID');
    }
    
  } catch (error) {
    console.error('❌ Error al consultar factura:', error);
  }
}

checkInvoiceFormat();
