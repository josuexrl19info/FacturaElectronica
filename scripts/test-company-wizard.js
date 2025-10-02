#!/usr/bin/env node

/**
 * Script de prueba para el wizard de creación de empresas
 * Prueba las validaciones y endpoints del wizard
 */

const fs = require('fs')
const path = require('path')
require('dotenv').config()

// Colores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step, message) {
  log(`\n${colors.bright}[${step}]${colors.reset} ${message}`, 'cyan')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

async function testATVValidation() {
  logStep('1', 'Probando validación de credenciales ATV...')
  
  const testCredentials = {
    username: 'cpf-03-0447-0021@stag.comprobanteselectronicos.go.cr',
    password: 'xn5_/]#8E.GyG4K$/?2#',
    clientId: 'api-stag'
  }

  try {
    const response = await fetch('http://localhost:3000/api/company/validate-atv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCredentials)
    })

    const result = await response.json()
    
    if (response.ok && result.isValid) {
      logSuccess('Credenciales ATV válidas')
      log(`   Token obtenido: ${result.token ? 'Sí' : 'No'}`, 'blue')
      log(`   Expira en: ${result.expiresAt || 'N/A'}`, 'blue')
    } else {
      logError(`Credenciales ATV inválidas: ${result.message}`)
      if (result.errors) {
        result.errors.forEach(error => log(`   - ${error}`, 'red'))
      }
    }
  } catch (error) {
    logError(`Error de conexión: ${error.message}`)
    logWarning('Asegúrese de que el servidor esté ejecutándose en localhost:3000')
  }
}

async function testCertificateValidation() {
  logStep('2', 'Probando validación de certificado...')
  
  // Crear un archivo .p12 de prueba (simulado)
  const testCertificatePath = path.join(__dirname, 'test-certificate.p12')
  
  if (!fs.existsSync(testCertificatePath)) {
    logWarning('Archivo de certificado de prueba no encontrado')
    log('   Creando certificado simulado para prueba...', 'yellow')
    
    // Crear un archivo binario simulado
    const mockCertificate = Buffer.from('PKCS#12 Mock Certificate Data')
    fs.writeFileSync(testCertificatePath, mockCertificate)
  }

  const formData = new FormData()
  formData.append('p12File', fs.createReadStream(testCertificatePath))
  formData.append('password', 'testpassword')
  formData.append('taxId', '3-101-123456')

  try {
    const response = await fetch('http://localhost:3000/api/company/validate-certificate', {
      method: 'POST',
      body: formData
    })

    const result = await response.json()
    
    if (response.ok && result.isValid) {
      logSuccess('Certificado válido')
      log(`   Sujeto: ${result.subject || 'N/A'}`, 'blue')
      log(`   Emisor: ${result.issuer || 'N/A'}`, 'blue')
      log(`   Válido desde: ${result.validFrom || 'N/A'}`, 'blue')
      log(`   Válido hasta: ${result.validTo || 'N/A'}`, 'blue')
    } else {
      logError(`Certificado inválido: ${result.message}`)
      if (result.errors) {
        result.errors.forEach(error => log(`   - ${error}`, 'red'))
      }
    }
  } catch (error) {
    logError(`Error de validación: ${error.message}`)
  } finally {
    // Limpiar archivo de prueba
    if (fs.existsSync(testCertificatePath)) {
      fs.unlinkSync(testCertificatePath)
    }
  }
}

async function testCompanyCreation() {
  logStep('3', 'Probando creación de empresa...')
  
  const testCompanyData = {
    personalInfo: {
      legalName: 'Empresa de Prueba S.A.',
      commercialName: 'Prueba CR',
      taxIdType: 'juridica',
      taxId: '3-101-123456',
      email: 'test@empresa.cr',
      phone: '+506 2222-3333',
      province: 'San José',
      canton: 'San José',
      district: 'Carmen',
      barrio: 'Centro',
      logo: null
    },
    atvCredentials: {
      username: 'cpf-03-0447-0021@stag.comprobanteselectronicos.go.cr',
      password: 'xn5_/]#8E.GyG4K$/?2#',
      clientId: 'api-stag',
      receptionUrl: 'https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/recepcion',
      loginUrl: 'https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token'
    },
    certificate: {
      p12File: 'test-certificate.p12',
      password: 'testpassword'
    },
    primaryColor: '#10b981'
  }

  try {
    const response = await fetch('http://localhost:3000/api/company/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCompanyData)
    })

    const result = await response.json()
    
    if (response.ok) {
      logSuccess('Empresa creada exitosamente')
      log(`   ID: ${result.id}`, 'blue')
      log(`   Mensaje: ${result.message}`, 'blue')
    } else {
      logError(`Error al crear empresa: ${result.message}`)
    }
  } catch (error) {
    logError(`Error de creación: ${error.message}`)
    logWarning('Asegúrese de estar autenticado para crear empresas')
  }
}

async function testEncryption() {
  logStep('4', 'Probando servicio de encriptación...')
  
  try {
    const { EncryptionService } = require('../lib/encryption')
    
    const testData = 'datos sensibles de prueba'
    const testPassword = 'clave-de-prueba'
    
    // Encriptar
    const encrypted = await EncryptionService.encrypt(testData, testPassword)
    logSuccess('Datos encriptados correctamente')
    log(`   Original: ${testData}`, 'blue')
    log(`   Encriptado: ${encrypted.substring(0, 50)}...`, 'blue')
    
    // Desencriptar
    const decrypted = await EncryptionService.decrypt(encrypted, testPassword)
    
    if (decrypted === testData) {
      logSuccess('Datos desencriptados correctamente')
      log(`   Resultado: ${decrypted}`, 'blue')
    } else {
      logError('Error en la desencriptación')
      log(`   Esperado: ${testData}`, 'red')
      log(`   Obtenido: ${decrypted}`, 'red')
    }
  } catch (error) {
    logError(`Error de encriptación: ${error.message}`)
  }
}

function checkEnvironment() {
  logStep('0', 'Verificando configuración del entorno...')
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'MASTER_ENCRYPTION_KEY'
  ]
  
  let allConfigured = true
  
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      logSuccess(`${envVar} configurado`)
    } else {
      logError(`${envVar} no configurado`)
      allConfigured = false
    }
  })
  
  if (!allConfigured) {
    logWarning('Algunas variables de entorno no están configuradas')
    log('   Revise el archivo .env.local', 'yellow')
  }
  
  return allConfigured
}

async function runTests() {
  log('🧪 Iniciando pruebas del wizard de empresas...', 'bright')
  log('=' * 50, 'cyan')
  
  const envOk = checkEnvironment()
  
  if (!envOk) {
    logWarning('Continuando con las pruebas, pero algunos servicios pueden fallar')
  }
  
  await testATVValidation()
  await testCertificateValidation()
  await testEncryption()
  await testCompanyCreation()
  
  log('\n' + '=' * 50, 'cyan')
  log('✅ Pruebas completadas', 'green')
  log('Revise los resultados arriba para verificar el funcionamiento del wizard', 'blue')
}

// Ejecutar pruebas
if (require.main === module) {
  runTests().catch(error => {
    logError(`Error ejecutando pruebas: ${error.message}`)
    process.exit(1)
  })
}

module.exports = {
  testATVValidation,
  testCertificateValidation,
  testCompanyCreation,
  testEncryption,
  checkEnvironment
}
