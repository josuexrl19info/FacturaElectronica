#!/usr/bin/env node
/**
 * Script para encriptar contraseñas usando la MASTER_ENCRYPTION_KEY
 * Uso: node scripts/encrypt-password.js "tu-contraseña-aqui"
 */

const crypto = require('crypto');

class EncryptionService {
  static ALGORITHM = 'aes-256-gcm';
  static IV_LENGTH = 12;

  static async deriveKey(password, salt) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  static async encrypt(text, password) {
    try {
      // Generar salt aleatorio
      const salt = crypto.randomBytes(16);
      
      // Generar IV aleatorio
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      // Derivar clave
      const key = await this.deriveKey(password, salt);
      
      // Encriptar
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      let encrypted = cipher.update(text, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Obtener auth tag
      const authTag = cipher.getAuthTag();
      
      // Combinar salt + iv + encrypted + authTag
      const combined = Buffer.concat([salt, iv, encrypted, authTag]);
      
      // Convertir a base64
      return combined.toString('base64');
      
    } catch (error) {
      console.error('❌ Error de encriptación:', error);
      throw new Error('Error al encriptar los datos');
    }
  }

  static async decrypt(encryptedBase64, password) {
    try {
      const combined = Buffer.from(encryptedBase64, 'base64');
      
      // Extraer componentes
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 16 + this.IV_LENGTH);
      const authTag = combined.slice(-16);
      const encrypted = combined.slice(16 + this.IV_LENGTH, -16);
      
      // Derivar clave
      const key = await this.deriveKey(password, salt);
      
      // Desencriptar
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('❌ Error de desencriptación:', error);
      throw new Error('Error al desencriptar los datos');
    }
  }
}

async function main() {
  // Obtener contraseña desde argumentos de línea de comandos
  const passwordToEncrypt = process.argv[2];
  
  if (!passwordToEncrypt) {
    console.error('\n❌ Error: Debes proporcionar una contraseña');
    console.log('\n📖 Uso: node scripts/encrypt-password.js "tu-contraseña-aqui"\n');
    process.exit(1);
  }

  // Obtener master key desde variable de entorno
  const masterKey = process.env.MASTER_ENCRYPTION_KEY;
  
  if (!masterKey) {
    console.error('\n❌ Error: MASTER_ENCRYPTION_KEY no está configurada');
    console.log('\n💡 Configura la variable de entorno:');
    console.log('   export MASTER_ENCRYPTION_KEY="tu-master-key"\n');
    process.exit(1);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║         🔐 ENCRIPTACIÓN DE CONTRASEÑA                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log('📝 DATOS DE ENTRADA:');
  console.log('  ├─ Contraseña:', passwordToEncrypt);
  console.log('  ├─ Longitud:', passwordToEncrypt.length, 'caracteres');
  console.log('  ├─ Master Key:', masterKey.substring(0, 10) + '...');
  console.log('  ├─ Algoritmo: AES-256-GCM');
  console.log('  ├─ Iteraciones PBKDF2: 100,000');
  console.log('  └─ Hash: SHA-256\n');

  try {
    // Encriptar
    const encrypted = await EncryptionService.encrypt(passwordToEncrypt, masterKey);
    
    console.log('✅ ENCRIPTACIÓN EXITOSA:\n');
    console.log('╭─────────────────────────────────────────────────────────╮');
    console.log('│ 📦 CONTRASEÑA ENCRIPTADA (Base64):                     │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│', encrypted);
    console.log('╰─────────────────────────────────────────────────────────╯\n');
    
    // Verificar desencriptación
    console.log('🔍 VERIFICANDO DESENCRIPTACIÓN...');
    const decrypted = await EncryptionService.decrypt(encrypted, masterKey);
    
    if (decrypted === passwordToEncrypt) {
      console.log('✅ Verificación exitosa - La contraseña se puede desencriptar correctamente\n');
    } else {
      console.error('❌ Error: La contraseña desencriptada no coincide\n');
      process.exit(1);
    }
    
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  💾 COPIA ESTE VALOR PARA FIRESTORE:                     ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║');
    console.log('║  ' + encrypted);
    console.log('║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 EJEMPLO DE USO:\n');
    console.log('  atvCredentials: {');
    console.log('    username: "usuario@example.com",');
    console.log('    password: "' + encrypted + '",');
    console.log('    clientId: "api-stag"');
    console.log('  }\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message, '\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Error fatal:', error, '\n');
  process.exit(1);
});

