#!/usr/bin/env node

/**
 * Script para corregir las URLs de sandbox en las empresas existentes
 * Cambia las URLs de producción por las de sandbox para que coincidan con el certificado
 */

const admin = require('firebase-admin');
const path = require('path');

// Configurar Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

if (!require('fs').existsSync(serviceAccountPath)) {
  console.error('❌ No se encontró el archivo de credenciales de Firebase');
  console.error('   Asegúrate de tener firebase-service-account.json en la raíz del proyecto');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixSandboxUrls() {
  try {
    console.log('🔧 Iniciando corrección de URLs de sandbox...');

    // Buscar empresas que tengan URLs de producción pero certificados de sandbox
    const companiesSnapshot = await db.collection('companies').get();
    
    let updatedCount = 0;
    
    for (const doc of companiesSnapshot.docs) {
      const companyData = doc.data();
      const companyId = doc.id;
      
      console.log(`\n🏢 Procesando empresa: ${companyData.name || companyId}`);
      
      // Verificar si tiene credenciales ATV
      if (!companyData.atvCredentials) {
        console.log('   ⚠️ No tiene credenciales ATV, saltando...');
        continue;
      }
      
      const atv = companyData.atvCredentials;
      
      // Verificar si está usando URLs de producción
      const isUsingProductionUrls = 
        atv.receptionUrl?.includes('/recepcion/v1/') && 
        !atv.receptionUrl?.includes('sandbox') &&
        atv.clientId === 'api-stag';
      
      if (isUsingProductionUrls) {
        console.log('   🔍 Detectado: URLs de producción con clientId de sandbox');
        console.log('   📍 Reception URL actual:', atv.receptionUrl);
        console.log('   🔑 Client ID:', atv.clientId);
        
        // Actualizar URLs a sandbox
        const updates = {
          'atvCredentials.receptionUrl': 'https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/recepcion/',
          'atvCredentials.authUrl': 'https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token'
        };
        
        await doc.ref.update(updates);
        
        console.log('   ✅ URLs actualizadas a sandbox:');
        console.log('   📍 Nueva Reception URL:', updates['atvCredentials.receptionUrl']);
        console.log('   🔐 Nueva Auth URL:', updates['atvCredentials.authUrl']);
        
        updatedCount++;
      } else {
        console.log('   ✅ URLs ya están correctas o no necesita actualización');
      }
    }
    
    console.log(`\n🎉 Proceso completado. ${updatedCount} empresas actualizadas.`);
    
  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar el script
fixSandboxUrls();
