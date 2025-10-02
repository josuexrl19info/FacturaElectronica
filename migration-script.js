#!/usr/bin/env node

/**
 * Script de Migración Firebase para InvoSell
 * 
 * Este script te ayuda a migrar tu aplicación actual a InvoSell
 * manteniendo tu base de datos intacta.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Iniciando proceso de migración a InvoSell...\n');

// Función para ejecutar comandos
function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    const result = execSync(command, { encoding: 'utf8' });
    console.log(`✅ ${description} completado\n`);
    return result;
  } catch (error) {
    console.error(`❌ Error en ${description}:`, error.message);
    process.exit(1);
  }
}

// Función para verificar Firebase CLI
function checkFirebaseCLI() {
  try {
    execSync('firebase --version', { stdio: 'ignore' });
    console.log('✅ Firebase CLI está instalado\n');
    return true;
  } catch (error) {
    console.log('❌ Firebase CLI no está instalado');
    console.log('📦 Instalando Firebase CLI...');
    runCommand('npm install -g firebase-tools', 'Instalación de Firebase CLI');
    return true;
  }
}

// Función principal
async function main() {
  console.log('🎯 MIGRACIÓN A INVOSELL');
  console.log('========================\n');
  
  // 1. Verificar Firebase CLI
  checkFirebaseCLI();
  
  // 2. Verificar login
  try {
    execSync('firebase projects:list', { stdio: 'ignore' });
    console.log('✅ Autenticado en Firebase\n');
  } catch (error) {
    console.log('🔐 Necesitas autenticarte en Firebase...');
    runCommand('firebase login', 'Autenticación en Firebase');
  }
  
  // 3. Mostrar proyectos disponibles
  console.log('📋 Proyectos Firebase disponibles:');
  runCommand('firebase projects:list', 'Listando proyectos');
  
  console.log('\n🎯 PASOS SIGUIENTES:');
  console.log('===================');
  console.log('1. Selecciona tu proyecto actual: firebase use [PROJECT_ID]');
  console.log('2. Crea backup: firebase firestore:export gs://tu-bucket/backup-$(date +%Y%m%d)');
  console.log('3. Configura variables de entorno con tus credenciales');
  console.log('4. Despliega InvoSell: firebase deploy --only hosting');
  
  console.log('\n📄 Archivos creados:');
  console.log('- FIREBASE_MIGRATION.md (guía completa)');
  console.log('- firebase-config-template.env (plantilla de configuración)');
  
  console.log('\n⚠️  IMPORTANTE:');
  console.log('- Haz backup completo antes de proceder');
  console.log('- Prueba en ambiente de desarrollo primero');
  console.log('- Mantén la aplicación actual como respaldo');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
