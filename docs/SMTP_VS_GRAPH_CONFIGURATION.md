# 📧 Configuración SMTP vs Microsoft Graph

## 🔍 **Problema Identificado**

**Situación actual:**
- ✅ Los correos se "envían" exitosamente (status 202)
- ❌ **NINGÚN correo llega al destinatario**
- 🔄 Gmail los rebota sistemáticamente
- ⚠️ Problema de **configuración**, no de código

## 🛠️ **Solución Implementada: Servicio Híbrido**

### **Arquitectura:**
```
📧 Servicio Híbrido
├── 🎯 Microsoft Graph (Principal)
├── 🔄 SMTP (Fallback)
└── 🧠 Lógica inteligente de selección
```

---

## ⚙️ **Configuración SMTP**

### **1. Variables de Entorno Requeridas**

```bash
# SMTP Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=facturas@innovasmartcr.com
SMTP_PASS=tu-app-password-aqui
SMTP_SENDER_EMAIL=facturas@innovasmartcr.com
SMTP_SENDER_NAME=InvoSell System
```

### **2. Configuración de App Password (Office 365)**

**Para Office 365, necesitas crear un App Password:**

1. **Ve a Office 365 Admin Center**
2. **Security & Compliance > Permissions**
3. **Crear App Password:**
   - Nombre: "InvoSell SMTP"
   - Copiar la contraseña generada
   - Usar como `SMTP_PASS`

**O usando Azure AD:**
1. **Azure Portal > Azure Active Directory**
2. **Users > [Tu Usuario] > Authentication methods**
3. **Security info > Add method > App password**
4. **Crear y copiar la contraseña**

### **3. Configuración de Gmail (Alternativa)**

Si prefieres usar Gmail como servidor SMTP:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password-gmail
```

**Para Gmail App Password:**
1. **Google Account > Security**
2. **2-Step Verification > App passwords**
3. **Generate app password**
4. **Usar como SMTP_PASS**

---

## 🔧 **Uso del Servicio Híbrido**

### **1. API Endpoint Actualizado**

```javascript
// Enviar usando proveedor específico
const response = await fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: ['usuario@gmail.com'],
    subject: 'Mi correo',
    htmlContent: '<h1>Hola</h1>',
    provider: 'hybrid' // 'graph', 'smtp', 'hybrid'
  })
})
```

### **2. Proveedores Disponibles**

#### **`provider: 'graph'`**
- Usa solo Microsoft Graph API
- Requiere configuración OAuth2
- Mejor integración con Office 365

#### **`provider: 'smtp'`**
- Usa solo SMTP directo
- Configuración más simple
- Mejor compatibilidad con Gmail

#### **`provider: 'hybrid'` (Recomendado)**
- Intenta Graph primero
- Fallback automático a SMTP
- Máxima confiabilidad

### **3. Respuesta de la API**

```json
{
  "success": true,
  "messageId": "smtp-1234567890-abc123",
  "sentAt": "2025-10-05T14:30:00.000Z",
  "deliveredTo": ["usuario@gmail.com"],
  "provider": "SMTP",
  "message": "Correo enviado exitosamente usando SMTP"
}
```

---

## 🧪 **Scripts de Prueba**

### **1. Prueba SMTP vs Graph**
```bash
node scripts/test-smtp-delivery.js
```

**Funcionalidades:**
- ✅ Verifica configuración SMTP
- ✅ Envía correo de prueba
- ✅ Compara con Microsoft Graph
- ✅ Recomendaciones automáticas

### **2. Prueba del Servicio Híbrido**
```bash
# Probar con diferentes proveedores
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{"to":["test@gmail.com"],"subject":"Test","htmlContent":"<h1>Test</h1>","provider":"smtp"}'
```

### **3. Panel Web Actualizado**
- **URL:** `http://localhost:3000/dashboard/email-test/`
- **Nuevos botones:**
  - 🔄 "Probar SMTP"
  - 📊 "Comparar Proveedores"
  - 🎯 "Servicio Híbrido"

---

## 📊 **Ventajas y Desventajas**

### **Microsoft Graph API**

#### **✅ Ventajas:**
- Integración profunda con Office 365
- Autenticación OAuth2 segura
- Gestión avanzada de permisos
- APIs modernas y bien documentadas

#### **❌ Desventajas:**
- Configuración compleja inicial
- Posibles bloqueos de IP por Gmail
- Dependencia de Azure AD
- Debugging más complejo

### **SMTP Directo**

#### **✅ Ventajas:**
- Configuración simple
- Mejor compatibilidad con Gmail
- Menos bloqueos de IP
- Estándar universal
- Debugging más fácil

#### **❌ Desventajas:**
- Autenticación básica (App Password)
- Menos integración con Office 365
- Configuración manual de headers
- Menos funcionalidades avanzadas

### **Servicio Híbrido**

#### **✅ Ventajas:**
- Lo mejor de ambos mundos
- Fallback automático
- Máxima confiabilidad
- Flexibilidad de configuración

#### **❌ Desventajas:**
- Mayor complejidad del código
- Múltiples configuraciones
- Más dependencias

---

## 🎯 **Recomendaciones por Caso de Uso**

### **Para Gmail específicamente:**
```bash
# Usar SMTP como principal
provider: 'smtp'
```

### **Para Office 365 interno:**
```bash
# Usar Graph como principal
provider: 'graph'
```

### **Para máxima confiabilidad:**
```bash
# Usar híbrido con fallback
provider: 'hybrid'
```

### **Para desarrollo/testing:**
```bash
# SMTP es más fácil de debuggear
provider: 'smtp'
```

---

## 🔧 **Configuración Recomendada**

### **Variables de Entorno Completas:**

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Office 365 Graph API
OFFICE365_TENANT_ID=your-tenant-id
OFFICE365_CLIENT_ID=your-client-id
OFFICE365_CLIENT_SECRET=your-client-secret
OFFICE365_SENDER_EMAIL=facturas@innovasmartcr.com
OFFICE365_SENDER_NAME=InvoSell System
OFFICE365_GRAPH_ENDPOINT=https://graph.microsoft.com

# SMTP Configuration (Fallback)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=facturas@innovasmartcr.com
SMTP_PASS=your-app-password
SMTP_SENDER_EMAIL=facturas@innovasmartcr.com
SMTP_SENDER_NAME=InvoSell System

# App Configuration
NEXT_PUBLIC_APP_NAME=InvoSell
NEXT_PUBLIC_COMPANY_NAME=InnovaSell
```

---

## 🚀 **Pasos de Implementación**

### **1. Configurar SMTP (Inmediato)**
```bash
# 1. Crear App Password en Office 365
# 2. Agregar variables SMTP al .env.local
# 3. Ejecutar prueba: node scripts/test-smtp-delivery.js
```

### **2. Configurar Servicio Híbrido**
```bash
# 1. Actualizar API para usar proveedor híbrido
# 2. Probar con provider: 'hybrid'
# 3. Monitorear logs para ver qué proveedor se usa
```

### **3. Optimizar Configuración**
```bash
# 1. Analizar qué proveedor funciona mejor
# 2. Ajustar configuración según resultados
# 3. Implementar en producción
```

---

## 📈 **Monitoreo y Métricas**

### **Métricas a Rastrear:**
- 📊 **Tasa de éxito por proveedor** - Graph vs SMTP
- ⏱️ **Tiempo de entrega** - Por método
- 🔄 **Uso de fallback** - Frecuencia de cambio
- 📧 **Rebotes por proveedor** - Gmail específicamente

### **Alertas Recomendadas:**
- 🚨 **Fallback frecuente** - SMTP se usa mucho
- ⏰ **Tiempo de entrega alto** - > 30 segundos
- 📉 **Tasa de éxito baja** - < 90%
- 🔄 **Ambos proveedores fallan** - Problema crítico

---

## 💡 **Conclusión**

**El problema de "ningún correo llega" se resuelve con:**

1. ✅ **SMTP como alternativa** - Mejor compatibilidad con Gmail
2. ✅ **Servicio híbrido** - Máxima confiabilidad
3. ✅ **Fallback automático** - Sin intervención manual
4. ✅ **Configuración flexible** - Adaptable por caso de uso

**Recomendación inmediata:**
1. 🔧 **Configurar SMTP** con App Password
2. 🧪 **Probar ambos métodos** con scripts
3. 🎯 **Usar servicio híbrido** en producción
4. 📊 **Monitorear resultados** y optimizar

**Estado esperado: 🟢 CORREOS LLEGANDO AL DESTINATARIO**
