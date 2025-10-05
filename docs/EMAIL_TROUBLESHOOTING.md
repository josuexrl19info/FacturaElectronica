# 🔧 Guía de Solución de Problemas - Correos Electrónicos

## 📧 Diagnóstico de Problemas con Gmail e iCloud

### 🎯 **Estado Actual**
✅ **Sistema funcionando correctamente** - Los envíos técnicos están exitosos
✅ **Microsoft Graph API** - Configuración válida
✅ **Office 365** - Token de acceso funcionando
✅ **Envío básico** - Confirmado con script de prueba

---

## 🔍 **Problemas Comunes y Soluciones**

### **1. Gmail - Correos van a Spam**

#### **Causas principales:**
- Falta de registros SPF/DKIM/DMARC
- Reputación del dominio
- Contenido marcado como spam
- Frecuencia de envío alta

#### **Soluciones:**

**A. Configurar registros DNS:**
```dns
# SPF Record (TXT)
v=spf1 include:spf.protection.outlook.com -all

# DKIM (configurar en Office 365 Admin Center)
# DMARC (TXT)
v=DMARC1; p=quarantine; rua=mailto:dmarc@innovasmartcr.com; ruf=mailto:dmarc@innovasmartcr.com; fo=1
```

**B. Verificar en Office 365:**
1. Ve a [Office 365 Admin Center](https://admin.microsoft.com)
2. Configuración > Dominios > innovasmartcr.com
3. Configurar DKIM para el dominio
4. Habilitar "Aplicar políticas de seguridad"

**C. Mejorar reputación:**
- Envía correos regulares (no masivos)
- Incluye opción de desuscripción
- Usa contenido legítimo y profesional
- Evita palabras spam (gratis, oferta, etc.)

### **2. iCloud - Correos bloqueados**

#### **Causas principales:**
- Políticas de seguridad estrictas de Apple
- Dominio no verificado
- Falta de autenticación

#### **Soluciones:**

**A. Configuración DNS completa:**
```dns
# MX Records
innovasmartcr.com.    IN MX    10 innovasmartcr-com.mail.protection.outlook.com.

# SPF Record
v=spf1 include:spf.protection.outlook.com -all

# DKIM (desde Office 365)
# DMARC
v=DMARC1; p=quarantine; rua=mailto:dmarc@innovasmartcr.com
```

**B. Solicitar whitelist a Apple:**
1. Contacta soporte de Apple para dominios comerciales
2. Proporciona información del negocio
3. Demuestra legitimidad del envío

### **3. Problemas de Entrega General**

#### **Verificaciones paso a paso:**

**A. DNS Checker:**
```bash
# Verificar registros SPF
dig TXT innovasmartcr.com | grep spf

# Verificar DKIM
dig TXT selector1._domainkey.innovasmartcr.com

# Verificar DMARC
dig TXT _dmarc.innovasmartcr.com
```

**B. Herramientas online:**
- [MXToolbox](https://mxtoolbox.com/spf.aspx)
- [Google Postmaster Tools](https://postmaster.google.com)
- [Microsoft SNDS](https://sendersupport.olc.protection.outlook.com/snds/)

---

## 🛠️ **Herramientas de Diagnóstico Implementadas**

### **1. Panel de Pruebas Web**
- **URL:** `http://localhost:3000/dashboard/email-test/`
- **Funcionalidades:**
  - Envío de correos de prueba
  - Pruebas específicas por proveedor
  - Análisis de resultados detallado
  - Recomendaciones automáticas

### **2. Scripts de Prueba**

**A. Prueba básica:**
```bash
node scripts/test-email-send.js
```

**B. Prueba específica Gmail/iCloud:**
```bash
node scripts/test-gmail-icloud.js
```

**C. Prueba múltiples proveedores:**
```bash
node scripts/test-multiple-emails.js
```

### **3. API de Diagnóstico**
- **Endpoint:** `/api/email/test-providers`
- **Método:** POST
- **Funcionalidad:** Prueba automática de entrega a diferentes proveedores

---

## 📋 **Checklist de Configuración**

### **✅ Office 365**
- [ ] Aplicación registrada en Azure AD
- [ ] Permisos Mail.Send y Mail.ReadWrite
- [ ] Client Secret configurado
- [ ] Tenant ID correcto

### **✅ DNS Records**
- [ ] SPF: `v=spf1 include:spf.protection.outlook.com -all`
- [ ] DKIM: Configurado en Office 365
- [ ] DMARC: `v=DMARC1; p=quarantine; rua=mailto:dmarc@innovasmartcr.com`
- [ ] MX: Apuntando a Office 365

### **✅ Variables de Entorno**
```bash
OFFICE365_TENANT_ID=tu-tenant-id
OFFICE365_CLIENT_ID=tu-client-id
OFFICE365_CLIENT_SECRET=tu-client-secret
OFFICE365_SENDER_EMAIL=facturas@innovasmartcr.com
OFFICE365_SENDER_NAME=InvoSell System
OFFICE365_GRAPH_ENDPOINT=https://graph.microsoft.com
```

---

## 🚨 **Códigos de Error Comunes**

### **Microsoft Graph API:**
- **403 Forbidden:** Permisos insuficientes
- **401 Unauthorized:** Token expirado o inválido
- **400 Bad Request:** Formato de correo inválido
- **429 Too Many Requests:** Límite de velocidad excedido

### **Proveedores de Email:**
- **Gmail:** Filtros de spam activados
- **iCloud:** Políticas de seguridad restrictivas
- **Yahoo:** Reputación del dominio baja

---

## 🔧 **Mejoras Implementadas**

### **1. Logging Mejorado**
- Detalles completos de errores de Microsoft Graph
- Información de headers y payload
- Análisis específico por proveedor

### **2. Pruebas Automatizadas**
- Función `testProviderDelivery()` en EmailService
- API endpoint `/api/email/test-providers`
- Scripts específicos para Gmail/iCloud

### **3. Interfaz de Diagnóstico**
- Panel de pruebas mejorado
- Resultados detallados por proveedor
- Recomendaciones automáticas

---

## 📞 **Pasos de Escalación**

### **Si los correos siguen sin llegar:**

1. **Verificar DNS (24-48 horas):**
   - Los cambios DNS pueden tardar en propagarse
   - Usar herramientas como `dig` o MXToolbox

2. **Contactar soporte:**
   - **Office 365:** Soporte técnico de Microsoft
   - **Gmail:** Google Postmaster Tools
   - **iCloud:** Soporte de Apple para empresas

3. **Alternativas:**
   - Considerar servicios de email transaccional (SendGrid, Mailgun)
   - Implementar múltiples proveedores de email
   - Usar subdominios para diferentes tipos de correo

---

## 📊 **Monitoreo Continuo**

### **Métricas a revisar:**
- Tasa de entrega por proveedor
- Tiempo de respuesta de la API
- Errores por tipo de proveedor
- Reputación del dominio

### **Herramientas recomendadas:**
- Google Postmaster Tools
- Microsoft SNDS
- MXToolbox SuperTool
- Postmarkapp (para métricas detalladas)

---

## 🎯 **Conclusión**

El sistema de correos está **funcionando correctamente** desde el punto de vista técnico. Los problemas de entrega a Gmail e iCloud son típicamente relacionados con:

1. **Configuración DNS** (SPF/DKIM/DMARC)
2. **Reputación del dominio**
3. **Políticas de filtrado** de los proveedores

**Próximos pasos recomendados:**
1. Configurar correctamente los registros DNS
2. Esperar 24-48 horas para propagación
3. Probar con emails reales (no test@)
4. Monitorear usando las herramientas implementadas
