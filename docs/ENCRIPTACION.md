# 🔐 Sistema de Encriptación de Contraseñas

## 📋 Resumen

Este documento explica cómo se encriptan y almacenan las contraseñas sensibles de las empresas en la aplicación de Facturación Electrónica.

---

## 🔒 Datos que se Encriptan

Cuando se crea una empresa, se encriptan los siguientes datos sensibles:

1. **Contraseña ATV (Hacienda)** - `atvCredentials.password`
2. **Contraseña del Certificado Digital (.p12)** - `certificate.password`

---

## 🛠️ Proceso de Encriptación

### 1. Flujo Completo

```
Usuario ingresa datos
       ↓
Frontend: app/onboarding/company/page.tsx
       ↓
API Route: app/api/company/create/route.ts
       ↓
Servicio: lib/services/company-service.ts
       ↓
Encriptación: lib/encryption.ts (EncryptionService)
       ↓
Guardado en Firestore (companies collection)
```

### 2. Código Detallado

#### A. Frontend (Recolección de Datos)
**Archivo:** `app/onboarding/company/page.tsx`

```typescript
// Líneas 464-478
const companyData = {
  personalInfo: {
    ...formData.personalInfo,
    logoBase64: logoBase64
  },
  atvCredentials: formData.atvCredentials, // Incluye password sin encriptar
  certificate: {
    p12File: formData.certificate.p12File?.name,
    p12FileData: certificateBase64,
    password: formData.certificate.password, // Password sin encriptar
    certificateInfo: formData.certificate.certificateInfo
  },
  primaryColor: '#10b981',
  userId: user.uid
}
```

#### B. API Route (Recepción)
**Archivo:** `app/api/company/create/route.ts`

```typescript
// Líneas 10-50
export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const { personalInfo, atvCredentials, certificate, primaryColor, userId } = body
  
  // Crear empresa usando el servicio (aquí se encripta)
  const result = await CompanyService.createCompany({
    wizardData: { personalInfo, atvCredentials, certificate },
    primaryColor,
    userId
  })
  
  return NextResponse.json(result, { status: 201 })
}
```

#### C. Servicio de Empresa (Encriptación)
**Archivo:** `lib/services/company-service.ts`

```typescript
// Líneas 75-117
static async createCompany(request: CreateCompanyRequest): Promise<CreateCompanyResponse> {
  const { wizardData, primaryColor = '#007bff', userId } = request
  const { personalInfo, atvCredentials, certificate } = wizardData

  // 1. Obtener la Master Password
  const masterPassword = EncryptionService.getMasterPassword()
  
  console.log('🔐 Debug encriptación:', {
    masterPassword: masterPassword ? 'Definida' : 'No definida',
    atvPasswordOriginal: atvCredentials.password,
    certPasswordOriginal: certificate.password
  })

  // 2. Encriptar contraseña de ATV
  const encryptedAtvPassword = await EncryptionService.encrypt(
    atvCredentials.password,  // Password en texto plano
    masterPassword            // Master key desde env
  )
  
  // 3. Encriptar contraseña del certificado
  const encryptedCertPassword = await EncryptionService.encrypt(
    certificate.password,     // Password en texto plano
    masterPassword           // Master key desde env
  )

  console.log('🔐 Resultado encriptación:', {
    atvPasswordEncrypted: encryptedAtvPassword,
    certPasswordEncrypted: encryptedCertPassword,
    atvPasswordLength: encryptedAtvPassword?.length,
    certPasswordLength: encryptedCertPassword?.length
  })
  
  // 4. Preparar datos para Firestore
  const companyData = {
    // ... otros campos ...
    
    // Credenciales ATV con password ENCRIPTADA
    atvCredentials: {
      username: atvCredentials.username,
      password: encryptedAtvPassword,  // ✅ ENCRIPTADA
      clientId: atvCredentials.clientId,
      environment: environment,
      receptionUrl: atvCredentials.receptionUrl,
      authUrl: atvCredentials.loginUrl,
    },
    
    // Certificado con password ENCRIPTADA
    certificadoDigital: {
      fileName: certificate.p12File?.name || '',
      password: encryptedCertPassword,  // ✅ ENCRIPTADA
      fileData: certificate.p12FileData || '',
      subject: certificate.certificateInfo?.subject || '',
      issuer: certificate.certificateInfo?.issuer || '',
      serialNumber: certificate.certificateInfo?.serialNumber || '',
      validFrom: certificate.certificateInfo?.validFrom || '',
      validTo: certificate.certificateInfo?.validTo || '',
      isActive: true,
    },
  }
  
  // 5. Guardar en Firestore
  const docRef = await addDoc(collection(db, 'companies'), firestoreData)
}
```

---

## 🔐 Servicio de Encriptación (EncryptionService)

**Archivo:** `lib/encryption.ts`

### Algoritmo Utilizado

- **Algoritmo:** `AES-GCM` (Advanced Encryption Standard - Galois/Counter Mode)
- **Longitud de Clave:** 256 bits
- **Longitud de IV:** 12 bytes
- **Derivación de Clave:** `PBKDF2` con 100,000 iteraciones y SHA-256

### Método de Encriptación

```typescript
// Líneas 41-75
static async encrypt(text: string, password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  
  // 1. Generar salt aleatorio (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  
  // 2. Generar IV aleatorio (12 bytes)
  const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
  
  // 3. Derivar clave usando PBKDF2
  const key = await this.deriveKey(password, salt)
  
  // 4. Encriptar usando AES-GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: this.ALGORITHM, iv: iv },
    key,
    data
  )
  
  // 5. Combinar salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)
  
  // 6. Convertir a base64
  return btoa(String.fromCharCode(...combined))
}
```

### Estructura del Dato Encriptado

```
[16 bytes: salt] + [12 bytes: IV] + [N bytes: datos encriptados]
                    ↓
             Convertido a Base64
```

### Master Password

```typescript
// Líneas 116-125
static getMasterPassword(): string {
  // Lee desde variable de entorno
  const masterPassword = process.env.MASTER_ENCRYPTION_KEY || 'default-key-change-in-production'
  
  if (masterPassword === 'default-key-change-in-production') {
    console.warn('⚠️ Usando clave de encriptación por defecto. Cambie MASTER_ENCRYPTION_KEY en producción.')
  }
  
  return masterPassword
}
```

**Variable de entorno requerida:**
```env
MASTER_ENCRYPTION_KEY=your-super-secure-master-key-here
```

---

## 🔓 Desencriptación

### Método de Desencriptación

```typescript
// Líneas 80-110
static async decrypt(encryptedText: string, password: string): Promise<string> {
  // 1. Convertir de base64
  const combined = new Uint8Array(
    atob(encryptedText).split('').map(char => char.charCodeAt(0))
  )
  
  // 2. Extraer componentes
  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 16 + this.IV_LENGTH)
  const encrypted = combined.slice(16 + this.IV_LENGTH)
  
  // 3. Derivar la misma clave usando el salt guardado
  const key = await this.deriveKey(password, salt)
  
  // 4. Desencriptar
  const decrypted = await crypto.subtle.decrypt(
    { name: this.ALGORITHM, iv: iv },
    key,
    encrypted
  )
  
  // 5. Convertir a string
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}
```

### Ejemplo de Uso (Desencriptación)

```typescript
// En cualquier servicio que necesite usar la contraseña
const masterPassword = EncryptionService.getMasterPassword()
const decryptedPassword = await EncryptionService.decrypt(
  company.atvCredentials.password,  // Password encriptada desde Firestore
  masterPassword                    // Misma master key
)

// Usar decryptedPassword para autenticación
```

---

## 🗄️ Estructura en Firestore

### Colección: `companies`

```json
{
  "id": "abc123xyz",
  "name": "Mi Empresa S.A.",
  "atvCredentials": {
    "username": "cpf-03-0447-0021@stag.comprobanteselectronicos.go.cr",
    "password": "U2FsdGVkX1+abcdefghijklmnop...",  // ✅ ENCRIPTADA (Base64)
    "clientId": "api-stag",
    "environment": "sandbox",
    "receptionUrl": "https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/...",
    "authUrl": "https://idp.comprobanteselectronicos.go.cr/auth/realms/..."
  },
  "certificadoDigital": {
    "fileName": "certificado.p12",
    "password": "V2VuY3J5cHRlZFBhc3N3b3Jk...",  // ✅ ENCRIPTADA (Base64)
    "fileData": "MIIKPAIBAzCCCf...",
    "subject": "CN=MI EMPRESA SA, ...",
    "issuer": "CN=Banco Central de Costa Rica, ...",
    "serialNumber": "1234567890",
    "validFrom": "2024-01-01T00:00:00Z",
    "validTo": "2025-12-31T23:59:59Z",
    "isActive": true
  }
}
```

---

## 🔒 Seguridad

### Características de Seguridad

1. **AES-GCM 256-bit:**
   - Algoritmo de encriptación simétrica estándar de la industria
   - Modo GCM proporciona autenticación e integridad

2. **PBKDF2:**
   - Deriva una clave criptográfica fuerte desde la master password
   - 100,000 iteraciones dificultan ataques de fuerza bruta
   - SHA-256 como función hash

3. **Salt único:**
   - Cada encriptación genera un salt aleatorio de 16 bytes
   - Previene ataques de tabla arcoíris

4. **IV único:**
   - Cada encriptación genera un IV aleatorio de 12 bytes
   - Asegura que el mismo texto plano produzca diferentes textos cifrados

5. **Web Crypto API:**
   - Usa APIs nativas del navegador/Node.js
   - Implementaciones optimizadas y seguras

### Recomendaciones

✅ **SI:**
- Usa una `MASTER_ENCRYPTION_KEY` fuerte (mínimo 32 caracteres aleatorios)
- Guarda la master key en variables de entorno (nunca en código)
- Rota la master key periódicamente
- Usa HTTPS/SSL para todas las comunicaciones

❌ **NO:**
- Nunca guardes contraseñas en texto plano
- Nunca commits la master key al repositorio
- Nunca uses la clave por defecto en producción
- Nunca compartas la master key

---

## 🧪 Ejemplo de Flujo Completo

### 1. Usuario Crea Empresa

```typescript
// Frontend envía (passwords en texto plano - solo en tránsito HTTPS)
POST /api/company/create
{
  "atvCredentials": {
    "username": "user@example.com",
    "password": "MiPasswordSeguro123!"  // Texto plano
  },
  "certificate": {
    "password": "CertPass456!"  // Texto plano
  }
}
```

### 2. Backend Encripta

```typescript
// Backend
const masterPassword = "mi-super-master-key-secreta-de-256-bits"

// Encriptar password ATV
const encryptedAtv = await EncryptionService.encrypt(
  "MiPasswordSeguro123!",
  masterPassword
)
// Resultado: "U2FsdGVkX1+9dK3mN/vQ7w8Y..."

// Encriptar password certificado
const encryptedCert = await EncryptionService.encrypt(
  "CertPass456!",
  masterPassword
)
// Resultado: "V2VuY3J5cHRlZFBhc3N3b3Jk..."
```

### 3. Guardado en Firestore

```typescript
// Firestore guarda las contraseñas ENCRIPTADAS
await addDoc(collection(db, 'companies'), {
  atvCredentials: {
    username: "user@example.com",
    password: "U2FsdGVkX1+9dK3mN/vQ7w8Y..."  // ✅ Encriptada
  },
  certificadoDigital: {
    password: "V2VuY3J5cHRlZFBhc3N3b3Jk..."  // ✅ Encriptada
  }
})
```

### 4. Uso Posterior (Autenticación con Hacienda)

```typescript
// Leer de Firestore
const company = await getDoc(doc(db, 'companies', companyId))
const encryptedPassword = company.data().atvCredentials.password

// Desencriptar
const masterPassword = EncryptionService.getMasterPassword()
const decryptedPassword = await EncryptionService.decrypt(
  encryptedPassword,
  masterPassword
)
// Resultado: "MiPasswordSeguro123!"

// Usar para autenticación
await authenticateWithHacienda(username, decryptedPassword)
```

---

## 📚 Referencias

- **Web Crypto API:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- **AES-GCM:** https://en.wikipedia.org/wiki/Galois/Counter_Mode
- **PBKDF2:** https://en.wikipedia.org/wiki/PBKDF2

---

## 🆘 Troubleshooting

### Error: "Usando clave de encriptación por defecto"
**Solución:** Configura la variable de entorno `MASTER_ENCRYPTION_KEY`

```bash
# .env.local
MASTER_ENCRYPTION_KEY=tu-clave-super-segura-de-al-menos-32-caracteres
```

### Error: "Error al desencriptar los datos"
**Causas posibles:**
1. La master key cambió
2. Los datos están corruptos
3. Los datos no fueron encriptados correctamente

**Solución:** Verifica que estés usando la misma master key que se usó para encriptar.

---

## ✅ Checklist de Seguridad

- [ ] `MASTER_ENCRYPTION_KEY` configurada en producción
- [ ] Master key tiene mínimo 32 caracteres aleatorios
- [ ] Master key no está en el código fuente
- [ ] HTTPS/SSL habilitado en producción
- [ ] Logs no muestran contraseñas desencriptadas
- [ ] Variables de entorno no están en el repositorio
- [ ] Backups de Firestore están encriptados
- [ ] Plan de rotación de master key establecido

