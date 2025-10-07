# 📧 Integración de Email para Facturas Aprobadas

## 🎯 **Objetivo**

Implementar el envío automático de emails cuando las facturas son **aprobadas por Hacienda**, usando el endpoint específico `http://localhost:8000/email` como solicitado.

## 🔄 **Flujo de Integración**

```
📋 Factura Creada
    ↓
🏛️ Enviada a Hacienda
    ↓
⏳ Procesamiento
    ↓
✅ APROBADA POR HACIENDA
    ↓
📧 EMAIL AUTOMÁTICO AL CLIENTE
```

---

## 🛠️ **Componentes Implementados**

### **1. Servicio de Email de Facturas**
**Archivo:** `lib/services/invoice-email-service.ts`

```typescript
// Uso básico
const result = await InvoiceEmailService.sendApprovalEmail(invoice, clientEmail)

// Verificar disponibilidad
const available = await InvoiceEmailService.isEmailServiceAvailable()

// Email de prueba
const testResult = await InvoiceEmailService.sendTestEmail('test@gmail.com')
```

**Funcionalidades:**
- ✅ Envío automático cuando factura es aprobada
- ✅ HTML profesional con detalles de la factura
- ✅ Verificación de disponibilidad del endpoint
- ✅ Manejo de errores y logging detallado

### **2. Integración en Flujo de Hacienda**
**Archivo:** `app/api/invoices/status/route.ts`

**Punto de Integración:**
```typescript
// Cuando el estado es "Aceptado" y es final
if (interpretedStatus.isFinal && interpretedStatus.status === 'Aceptado') {
  console.log('🎉 Factura APROBADA - Enviando email al cliente...')
  
  const emailResult = await InvoiceEmailService.sendApprovalEmail({
    ...invoiceData,
    id: invoiceId,
    status: interpretedStatus.status
  })
  
  // Actualizar factura con información del email
  await updateDoc(invoiceRef, {
    emailSent: true,
    emailSentAt: serverTimestamp(),
    emailMessageId: emailResult.messageId
  })
}
```

### **3. API de Pruebas**
**Archivo:** `app/api/email/test-invoice-email/route.ts`

**Endpoints:**
- `POST /api/email/test-invoice-email` - Probar envío de email
- `GET /api/email/test-invoice-email` - Verificar disponibilidad

### **4. Panel de Pruebas Actualizado**
**Archivo:** `components/email/email-test-panel.tsx`

**Nuevos Botones:**
- 🎯 **"Probar Email Factura Aprobada"** - Simula aprobación completa
- 📧 **"Probar Email Simple"** - Prueba básica del endpoint
- 📊 **Resultados detallados** - Información completa del envío

---

## 📋 **Configuración del Endpoint**

### **Endpoint Especificado:**
```
URL: http://localhost:8000/email
Método: POST
Headers: 
  - Content-Type: application/json
  - X-API-Key: tu-api-key-super-secreta-123
```

### **Formato de Datos:**
```json
{
  "to": "cliente@gmail.com",
  "subject": "✅ Factura Electrónica FE-001 - Aprobada por Hacienda",
  "message": "<html>...contenido HTML completo...</html>"
}
```

### **Respuesta Esperada:**
```json
{
  "success": true,
  "messageId": "email-1234567890-abc123",
  "deliveredTo": ["cliente@gmail.com"],
  "sentAt": "2025-10-05T14:30:00.000Z"
}
```

---

## 🧪 **Scripts de Prueba**

### **1. Prueba Completa de Integración**
```bash
node scripts/test-invoice-email-integration.js
```

**Funcionalidades:**
- ✅ Verifica disponibilidad del endpoint
- ✅ Envía email de prueba básico
- ✅ Simula aprobación de factura
- ✅ Prueba email completo con HTML
- ✅ Genera reporte de resultados

### **2. Prueba Individual**
```bash
# Verificar disponibilidad
curl http://localhost:3000/api/email/test-invoice-email

# Probar email simple
curl -X POST http://localhost:3000/api/email/test-invoice-email \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "test@gmail.com", "simulateApproval": false}'

# Probar factura aprobada
curl -X POST http://localhost:3000/api/email/test-invoice-email \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "test@gmail.com", "simulateApproval": true}'
```

---

## 📧 **Contenido del Email**

### **Template HTML Profesional:**
- ✅ **Header verde** con mensaje de aprobación
- ✅ **Badge de estado** "APROBADA POR HACIENDA"
- ✅ **Detalles de la factura** en tabla estilizada
- ✅ **Información importante** sobre validez fiscal
- ✅ **Botones de acción** (Ver/Descargar)
- ✅ **Footer corporativo** con información de contacto

### **Información Incluida:**
- 📋 Número de factura
- 👤 Nombre del cliente
- 📅 Fecha de emisión
- ✅ Estado de Hacienda
- 💰 Total de la factura
- 🔗 Enlaces de descarga

---

## 🔧 **Configuración en Producción**

### **1. Variables de Entorno**
```bash
# Endpoint de email (producción)
INVOICE_EMAIL_ENDPOINT=https://tu-servidor.com/email
INVOICE_EMAIL_API_KEY=tu-api-key-produccion

# Configuración opcional
INVOICE_EMAIL_SENDER_NAME=InvoSell Costa Rica
INVOICE_EMAIL_SENDER_EMAIL=facturas@innovasmartcr.com
```

### **2. Actualizar Servicio**
```typescript
// En invoice-email-service.ts
private static readonly EMAIL_ENDPOINT = process.env.INVOICE_EMAIL_ENDPOINT || 'http://localhost:8000/email'
private static readonly API_KEY = process.env.INVOICE_EMAIL_API_KEY || 'tu-api-key-super-secreta-123'
```

---

## 📊 **Monitoreo y Logs**

### **Logs Automáticos:**
```
🎉 Factura APROBADA - Enviando email al cliente...
✅ Email de aprobación enviado exitosamente
📧 Message ID: email-1234567890-abc123
📧 Destinatario: cliente@gmail.com
```

### **Campos en Base de Datos:**
```typescript
// Campos agregados a la factura
{
  emailSent: true,
  emailSentAt: serverTimestamp(),
  emailMessageId: "email-1234567890-abc123",
  emailDeliveredTo: ["cliente@gmail.com"],
  emailError: null, // o mensaje de error si falla
  emailErrorAt: null
}
```

---

## 🚀 **Implementación Paso a Paso**

### **1. Verificar Endpoint (Inmediato)**
```bash
# 1. Verificar que localhost:8000/email esté ejecutándose
curl http://localhost:8000/email/health

# 2. Probar envío básico
curl -X POST http://localhost:8000/email \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tu-api-key-super-secreta-123" \
  -d '{"to": "test@gmail.com", "subject": "Test", "message": "<h1>Test</h1>"}'
```

### **2. Probar Integración (5 minutos)**
```bash
# Ejecutar script de prueba completo
node scripts/test-invoice-email-integration.js

# O usar el panel web
# http://localhost:3000/dashboard/email-test/
```

### **3. Crear Factura de Prueba (10 minutos)**
```bash
# 1. Crear factura desde el sistema
# 2. Simular aprobación por Hacienda
# 3. Verificar que el email se envía automáticamente
# 4. Revisar logs en consola
```

### **4. Configurar Producción (Cuando esté listo)**
```bash
# 1. Configurar endpoint real
# 2. Actualizar variables de entorno
# 3. Probar con facturas reales
# 4. Monitorear envíos automáticos
```

---

## ⚠️ **Consideraciones Importantes**

### **1. Disponibilidad del Endpoint**
- ✅ **Desarrollo:** `http://localhost:8000/email`
- 🔧 **Producción:** Configurar endpoint real
- 🚨 **Fallback:** Si falla, registrar error pero no bloquear proceso

### **2. Manejo de Errores**
- ❌ **Endpoint no disponible:** Log error, continuar proceso
- ❌ **Email inválido:** Validar antes de enviar
- ❌ **Timeout:** Configurar timeout apropiado
- ❌ **Rate limiting:** Implementar retry con backoff

### **3. Seguridad**
- 🔐 **API Key:** Usar variable de entorno
- 🔐 **HTTPS:** Obligatorio en producción
- 🔐 **Validación:** Validar datos antes de enviar
- 🔐 **Logs:** No registrar información sensible

---

## 🎯 **Estado Actual**

### **✅ Implementado:**
- ✅ Servicio de email de facturas aprobadas
- ✅ Integración en flujo de Hacienda
- ✅ API de pruebas
- ✅ Panel web actualizado
- ✅ Scripts de prueba
- ✅ Documentación completa

### **🔄 Listo para Probar:**
- 🧪 **Endpoint:** `http://localhost:8000/email`
- 🧪 **Panel:** `http://localhost:3000/dashboard/email-test/`
- 🧪 **Script:** `node scripts/test-invoice-email-integration.js`

### **🚀 Próximos Pasos:**
1. **Verificar endpoint** en localhost:8000
2. **Ejecutar pruebas** con scripts
3. **Probar panel web** con botones nuevos
4. **Crear factura de prueba** y simular aprobación
5. **Configurar producción** cuando esté listo

---

## 📞 **Soporte**

### **Logs a Revisar:**
- 🔍 **Consola del navegador** - Errores de frontend
- 🔍 **Logs de Next.js** - Errores de API
- 🔍 **Logs del endpoint** - Errores de email

### **Comandos de Debug:**
```bash
# Ver logs en tiempo real
npm run dev

# Probar endpoint directamente
curl -X POST http://localhost:8000/email \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tu-api-key-super-secreta-123" \
  -d '{"to": "test@gmail.com", "subject": "Test", "message": "<h1>Test</h1>"}'

# Verificar disponibilidad
curl http://localhost:3000/api/email/test-invoice-email
```

**🎉 ¡La integración está lista para usar!**
