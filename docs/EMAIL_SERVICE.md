# Servicio de Correos Electrónicos

## 📧 Descripción General

El servicio de correos electrónicos de InvoSell utiliza **Microsoft Graph API** para enviar correos a través de Office 365. Es un servicio moderno, robusto y completamente documentado que soporta HTML, adjuntos, imágenes inline y múltiples destinatarios.

## 🚀 Características

### **Funcionalidades Principales:**
- ✅ **Envío de correos HTML** con estilos avanzados
- ✅ **Adjuntos de archivos** (PDF, imágenes, documentos)
- ✅ **Imágenes inline** para usar en contenido HTML
- ✅ **Múltiples destinatarios** (Para, CC, BCC)
- ✅ **Templates dinámicos** con variables
- ✅ **Confirmaciones de lectura y entrega**
- ✅ **Prioridad de correos** (Baja, Normal, Alta)
- ✅ **Envío masivo** con control de velocidad
- ✅ **Validación de correos** electrónicos
- ✅ **Logs detallados** de envío

## 🔧 Configuración

### **Variables de Entorno Requeridas:**

```bash
# Office 365 Configuration
OFFICE365_TENANT_ID=your-tenant-id
OFFICE365_CLIENT_ID=your-client-id
OFFICE365_CLIENT_SECRET=your-client-secret
OFFICE365_SENDER_EMAIL=your-email@domain.com
OFFICE365_SENDER_NAME=InvoSell System
OFFICE365_GRAPH_ENDPOINT=https://graph.microsoft.com
```

### **Configuración en Azure AD:**

1. **Registrar Aplicación en Azure AD:**
   - Ve a Azure Portal > Azure Active Directory > App registrations
   - Crea una nueva aplicación
   - Anota el `Application (client) ID` y `Directory (tenant) ID`

2. **Crear Client Secret:**
   - En tu aplicación > Certificates & secrets
   - Crea un nuevo client secret
   - Anota el valor (solo se muestra una vez)

3. **Configurar Permisos:**
   - En tu aplicación > API permissions
   - Agrega permisos de Microsoft Graph:
     - `Mail.Send` (Application)
     - `Mail.ReadWrite` (Application)

4. **Conceder Permisos:**
   - Haz clic en "Grant admin consent"

## 📚 Uso del Servicio

### **1. Importación Básica:**

```typescript
import { getEmailService } from '@/lib/email/email-service'
import { EmailMessage, EmailAttachment } from '@/lib/email/types'

const emailService = getEmailService()
```

### **2. Envío Simple:**

```typescript
const message: EmailMessage = {
  subject: 'Bienvenido a InvoSell',
  body: {
    contentType: 'HTML',
    content: '<h1>¡Hola!</h1><p>Bienvenido a nuestro sistema.</p>'
  },
  toRecipients: [
    { emailAddress: 'usuario@ejemplo.com', name: 'Juan Pérez' }
  ]
}

const result = await emailService.sendEmail(message)
```

### **3. Con Adjuntos:**

```typescript
const attachment: EmailAttachment = {
  name: 'factura.pdf',
  contentType: 'application/pdf',
  contentBytes: 'base64-content-here',
  size: 1024000
}

const message: EmailMessage = {
  subject: 'Factura adjunta',
  body: {
    contentType: 'HTML',
    content: '<p>Adjunto encontrará su factura.</p>'
  },
  toRecipients: [{ emailAddress: 'cliente@ejemplo.com' }],
  attachments: [attachment]
}
```

### **4. Con Imágenes Inline:**

```typescript
const inlineImage: InlineAttachment = {
  name: 'logo.png',
  contentType: 'image/png',
  contentBytes: 'base64-content-here',
  isInline: true,
  contentId: 'logo'
}

const message: EmailMessage = {
  subject: 'Correo con logo',
  body: {
    contentType: 'HTML',
    content: '<img src="cid:logo" alt="Logo" />'
  },
  toRecipients: [{ emailAddress: 'usuario@ejemplo.com' }],
  attachments: [inlineImage]
}
```

## 🌐 API Endpoints

### **POST /api/email/send**

Envía un correo electrónico.

**Request Body:**
```json
{
  "to": ["usuario@ejemplo.com"],
  "cc": ["copia@ejemplo.com"],
  "bcc": ["oculto@ejemplo.com"],
  "subject": "Asunto del correo",
  "htmlContent": "<h1>Contenido HTML</h1>",
  "textContent": "Contenido texto plano",
  "attachments": [
    {
      "name": "archivo.pdf",
      "contentType": "application/pdf",
      "contentBytes": "base64-content"
    }
  ],
  "importance": "Normal",
  "isReadReceiptRequested": true,
  "isDeliveryReceiptRequested": false
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg-123456789",
  "sentAt": "2024-01-15T10:30:00Z",
  "deliveredTo": ["usuario@ejemplo.com"],
  "message": "Correo enviado exitosamente"
}
```

### **POST /api/email/validate**

Valida direcciones de correo electrónico.

**Request Body:**
```json
{
  "emails": ["usuario@ejemplo.com", "invalid-email"]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "email": "usuario@ejemplo.com",
      "isValid": true
    },
    {
      "email": "invalid-email",
      "isValid": false,
      "errorType": "invalid-format",
      "errorMessage": "Formato de correo electrónico inválido"
    }
  ],
  "summary": {
    "total": 2,
    "valid": 1,
    "invalid": 1
  }
}
```

## 🎨 Templates de Correo

### **Sistema de Variables:**

Los templates soportan variables dinámicas usando la sintaxis `{{variable}}`:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .header { background: #3b82f6; color: white; padding: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>¡Hola {{nombre}}!</h1>
    </div>
    <div class="content">
        <p>Bienvenido a {{empresa}}.</p>
        <p>Fecha: {{fecha}}</p>
    </div>
</body>
</html>
```

### **Envío con Template:**

```typescript
const template: EmailTemplate = {
  id: 'welcome',
  name: 'Bienvenida',
  subject: 'Bienvenido a {{empresa}}',
  htmlContent: '...',
  isActive: true,
  // ... otros campos
}

const result = await emailService.sendTemplateEmail(
  template,
  [{ emailAddress: 'usuario@ejemplo.com' }],
  { nombre: 'Juan', empresa: 'Mi Empresa', fecha: '2024-01-15' }
)
```

## 🚀 Envío Masivo

### **Configuración de Envío Masivo:**

```typescript
const bulkOptions: BulkEmailOptions = {
  recipients: [
    { emailAddress: 'usuario1@ejemplo.com', name: 'Usuario 1' },
    { emailAddress: 'usuario2@ejemplo.com', name: 'Usuario 2' }
  ],
  template: welcomeTemplate,
  variables: { empresa: 'Mi Empresa' },
  sendOptions: { saveToSentItems: true },
  delayBetweenSends: 2000, // 2 segundos entre envíos
  rateLimit: 60 // 60 correos por minuto
}

const results = await emailService.sendBulkEmails(bulkOptions)
```

## 🔍 Validación de Correos

### **Validación Individual:**

```typescript
const result = await emailService.validateEmail('usuario@ejemplo.com')

if (result.isValid) {
  console.log('Correo válido')
} else {
  console.log('Error:', result.errorMessage)
}
```

### **Validación Múltiple:**

```typescript
const emails = ['usuario@ejemplo.com', 'invalido', 'otro@ejemplo.com']
const results = await Promise.all(
  emails.map(email => emailService.validateEmail(email))
)
```

## 📊 Monitoreo y Logs

### **Resultados de Envío:**

```typescript
interface EmailSendResult {
  messageId: string
  success: boolean
  error?: string
  statusCode?: number
  sentAt: Date
  deliveredTo: string[]
  failedTo: string[]
}
```

### **Logging Recomendado:**

```typescript
const result = await emailService.sendEmail(message)

if (result.success) {
  console.log(`Correo enviado: ${result.messageId}`)
  console.log(`Entregado a: ${result.deliveredTo.join(', ')}`)
} else {
  console.error(`Error enviando correo: ${result.error}`)
}
```

## 🛡️ Seguridad

### **Mejores Prácticas:**

1. **Variables de Entorno:**
   - Nunca hardcodear credenciales
   - Usar variables de entorno para toda configuración

2. **Validación de Entrada:**
   - Validar todas las direcciones de correo
   - Sanitizar contenido HTML
   - Limitar tamaño de adjuntos

3. **Rate Limiting:**
   - Implementar límites de envío
   - Usar delays entre envíos masivos
   - Monitorear uso de API

4. **Logs de Auditoría:**
   - Registrar todos los envíos
   - Mantener logs de errores
   - Monitorear actividad sospechosa

## 🧪 Panel de Pruebas

### **Acceso:**
- Ve a Dashboard > Pruebas de Correo
- Prueba diferentes configuraciones
- Valida templates y adjuntos

### **Funcionalidades del Panel:**
- ✅ **Formulario completo** de configuración
- ✅ **Vista previa** del contenido HTML
- ✅ **Upload de archivos** con validación
- ✅ **Variables dinámicas** para templates
- ✅ **Resultados detallados** de envío
- ✅ **Validación en tiempo real**

## 🔧 Troubleshooting

### **Problemas Comunes:**

1. **Error de Autenticación:**
   ```
   Error: No se pudo obtener el token de acceso
   ```
   - Verificar variables de entorno
   - Confirmar permisos en Azure AD

2. **Error de Envío:**
   ```
   Error: 403 Forbidden
   ```
   - Verificar permisos de Mail.Send
   - Confirmar que el remitente existe

3. **Adjuntos No Enviados:**
   - Verificar formato base64
   - Confirmar tipo MIME
   - Validar tamaño de archivo

### **Debug:**

```typescript
// Habilitar logs detallados
const emailService = getEmailService()

// Verificar configuración
const isValid = await emailService.validateConfig()
console.log('Configuración válida:', isValid)

// Probar envío simple
try {
  const result = await emailService.sendEmail(testMessage)
  console.log('Resultado:', result)
} catch (error) {
  console.error('Error:', error)
}
```

## 📈 Límites y Cuotas

### **Microsoft Graph API:**
- **Rate Limit:** 10,000 requests por 10 minutos
- **Mail Send:** 30,000 correos por día (Office 365)
- **Adjuntos:** 25MB máximo por correo
- **Destinatarios:** 500 máximo por correo

### **Recomendaciones:**
- Implementar cola de envío para grandes volúmenes
- Usar delays apropiados entre envíos
- Monitorear cuotas de uso
- Implementar fallbacks para errores

## 🔄 Actualizaciones y Mantenimiento

### **Versionado:**
- El servicio usa Microsoft Graph API v1.0
- Compatible con Office 365 y Exchange Online
- Actualizaciones automáticas de Microsoft

### **Monitoreo:**
- Revisar logs de envío regularmente
- Monitorear tasas de entrega
- Actualizar templates según necesidades
- Optimizar contenido HTML para diferentes clientes

## 📞 Soporte

Para problemas técnicos:
1. Revisar logs de la aplicación
2. Verificar configuración de Azure AD
3. Consultar documentación de Microsoft Graph
4. Contactar al administrador del sistema
