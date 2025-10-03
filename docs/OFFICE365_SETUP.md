# Configuración Paso a Paso: Office 365 + Sistema de Correos

## 🎯 Objetivo
Configurar Office 365 para que el sistema InvoSell pueda enviar correos electrónicos usando Microsoft Graph API.

---

## 📋 Paso 1: Acceder a Azure Portal

### 1.1 Ir a Azure Portal
- Abre tu navegador y ve a: **https://portal.azure.com**
- Inicia sesión con tu cuenta de **Office 365** (administrador)

### 1.2 Navegar a Azure Active Directory
- En el menú izquierdo, busca **"Azure Active Directory"**
- Haz clic en **"Azure Active Directory"**

---

## 📋 Paso 2: Registrar Nueva Aplicación

### 2.1 Ir a App Registrations
- En el menú izquierdo de Azure AD, haz clic en **"App registrations"**
- Haz clic en **"+ New registration"** (Nueva inscripción)

### 2.2 Configurar la Aplicación
- **Name**: `InvoSell Email Service`
- **Supported account types**: Selecciona **"Accounts in this organizational directory only"**
- **Redirect URI**: Deja vacío por ahora
- Haz clic en **"Register"**

### 2.3 Anotar Información Importante
Después del registro, verás una página de **Overview**. Anota:
- **Application (client) ID** - Lo necesitarás como `OFFICE365_CLIENT_ID`
- **Directory (tenant) ID** - Lo necesitarás como `OFFICE365_TENANT_ID`

---

## 📋 Paso 3: Crear Client Secret

### 3.1 Ir a Certificates & Secrets
- En el menú izquierdo de tu aplicación, haz clic en **"Certificates & secrets"**
- Haz clic en **"+ New client secret"**

### 3.2 Configurar el Secret
- **Description**: `InvoSell Email Service Secret`
- **Expires**: Selecciona **"24 months"** (o el tiempo que prefieras)
- Haz clic en **"Add"**

### 3.3 Copiar el Secret
⚠️ **IMPORTANTE**: Copia el **Value** del secret inmediatamente. Solo se muestra una vez.
- Este será tu `OFFICE365_CLIENT_SECRET`

---

## 📋 Paso 4: Configurar Permisos de API

### 4.1 Ir a API Permissions
- En el menú izquierdo, haz clic en **"API permissions"**
- Haz clic en **"+ Add a permission"**

### 4.2 Seleccionar Microsoft Graph
- Selecciona **"Microsoft Graph"**
- Selecciona **"Application permissions"** (no Delegated permissions)

### 4.3 Agregar Permisos de Correo
Busca y selecciona estos permisos:
- ✅ **Mail.Send** - Enviar correos como cualquier usuario
- ✅ **Mail.ReadWrite** - Leer y escribir correos

### 4.4 Agregar Permisos
- Haz clic en **"Add permissions"**
- Verifica que aparezcan en la lista

### 4.5 Conceder Admin Consent
⚠️ **CRÍTICO**: Debes conceder consentimiento de administrador
- Haz clic en **"Grant admin consent for [tu organización]"**
- Confirma haciendo clic en **"Yes"**
- Deberías ver ✅ verde en "Status"

---

## 📋 Paso 5: Configurar Variables de Entorno

### 5.1 Crear archivo .env.local
En la raíz de tu proyecto, crea o edita el archivo `.env.local`:

```bash
# Configuración de Office 365 para correos
OFFICE365_TENANT_ID=tu-tenant-id-aqui
OFFICE365_CLIENT_ID=tu-client-id-aqui
OFFICE365_CLIENT_SECRET=tu-client-secret-aqui
OFFICE365_SENDER_EMAIL=tu-email@tudominio.com
OFFICE365_SENDER_NAME=InvoSell System
OFFICE365_GRAPH_ENDPOINT=https://graph.microsoft.com
```

### 5.2 Reemplazar Valores
Reemplaza los valores con los que anotaste:

```bash
# Ejemplo con valores reales:
OFFICE365_TENANT_ID=12345678-1234-1234-1234-123456789012
OFFICE365_CLIENT_ID=87654321-4321-4321-4321-210987654321
OFFICE365_CLIENT_SECRET=ABC123~def456ghi789jkl012mno345pqr678stu
OFFICE365_SENDER_EMAIL=admin@tudominio.com
OFFICE365_SENDER_NAME=InvoSell System
OFFICE365_GRAPH_ENDPOINT=https://graph.microsoft.com
```

---

## 📋 Paso 6: Verificar Configuración

### 6.1 Reiniciar el Servidor de Desarrollo
```bash
# Detén el servidor (Ctrl+C)
# Luego reinicia:
npm run dev
```

### 6.2 Probar la Configuración
1. Ve a **Dashboard > Pruebas de Correo**
2. Completa el formulario:
   - **Para**: Tu email personal
   - **Asunto**: `Prueba de configuración`
   - **Contenido**: `Hola, esto es una prueba`
3. Haz clic en **"Enviar Correo de Prueba"**

---

## 🔍 Solución de Problemas

### ❌ Error: "No se pudo obtener el token de acceso"

**Causa**: Configuración incorrecta en Azure AD
**Solución**:
1. Verifica que las variables de entorno estén correctas
2. Confirma que el Client Secret no haya expirado
3. Verifica que los permisos estén concedidos

### ❌ Error: "403 Forbidden"

**Causa**: Permisos insuficientes
**Solución**:
1. Ve a Azure AD > App registrations > Tu app > API permissions
2. Confirma que `Mail.Send` y `Mail.ReadWrite` estén concedidos
3. Haz clic en "Grant admin consent" nuevamente

### ❌ Error: "401 Unauthorized"

**Causa**: Token inválido o expirado
**Solución**:
1. Verifica el Tenant ID y Client ID
2. Regenera el Client Secret si es necesario
3. Reinicia el servidor

### ❌ Error: "Mailbox not found"

**Causa**: Email del remitente incorrecto
**Solución**:
1. Verifica que `OFFICE365_SENDER_EMAIL` sea un email válido de tu organización
2. Confirma que el email tenga permisos de envío

---

## ✅ Lista de Verificación Final

Antes de usar el sistema en producción, verifica:

- [ ] ✅ Aplicación registrada en Azure AD
- [ ] ✅ Client ID anotado correctamente
- [ ] ✅ Client Secret creado y copiado
- [ ] ✅ Permisos Mail.Send y Mail.ReadWrite agregados
- [ ] ✅ Admin consent concedido (estado verde)
- [ ] ✅ Variables de entorno configuradas en .env.local
- [ ] ✅ Servidor reiniciado después de cambios
- [ ] ✅ Prueba de envío exitosa desde el dashboard

---

## 🚀 Uso en Producción

### Para Deploy en Producción:

1. **Configurar Variables de Entorno en el Host:**
   - Agrega las mismas variables en tu plataforma de hosting
   - (Vercel, Netlify, Azure, etc.)

2. **Verificar Límites:**
   - Office 365 tiene límites de envío (30,000 correos/día)
   - Microsoft Graph tiene rate limits (10,000 requests/10 min)

3. **Monitoreo:**
   - Revisa logs de envío regularmente
   - Monitorea tasas de entrega
   - Configura alertas para errores

---

## 📞 Soporte Adicional

Si tienes problemas:

1. **Revisa los logs** del servidor de desarrollo
2. **Verifica la configuración** en Azure Portal
3. **Consulta la documentación** de Microsoft Graph API
4. **Contacta al administrador** de Office 365

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu sistema InvoSell podrá:
- ✅ Enviar correos HTML con estilos
- ✅ Adjuntar archivos (PDF, imágenes, etc.)
- ✅ Usar templates dinámicos
- ✅ Enviar a múltiples destinatarios
- ✅ Obtener confirmaciones de entrega

**¡Tu sistema de correos está listo para usar!** 🚀
