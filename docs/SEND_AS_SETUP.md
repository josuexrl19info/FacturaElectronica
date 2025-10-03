# Configuración de "Send As" para facturas@innovasmartcr.com

## 🎯 Objetivo
Configurar el sistema para que envíe correos como `facturas@innovasmartcr.com` usando el permiso "Send As" de Exchange.

---

## 📋 Paso 1: Verificar Permisos en Exchange Admin Center

### 1.1 Acceder a Exchange Admin Center
- Ve a https://admin.exchange.microsoft.com
- Inicia sesión con tu cuenta de administrador

### 1.2 Verificar el Buzón
- En el menú izquierdo, ve a **"Recipients"** → **"Mailboxes"**
- Busca `facturas@innovasmartcr.com`
- Haz clic en el buzón

### 1.3 Verificar Permisos "Send As"
- En la página del buzón, ve a **"Mailbox permissions"**
- En la sección **"Send as"**, deberías ver tu usuario
- Si no está, agrégalo haciendo clic en **"Add permissions"**

---

## 📋 Paso 2: Actualizar Variables de Entorno

### 2.1 Cambiar el Email Remitente
En tu archivo `.env.local`, cambia:

```bash
# Antes:
OFFICE365_SENDER_EMAIL=jorozco@innovasmartcr.com

# Después:
OFFICE365_SENDER_EMAIL=facturas@innovasmartcr.com
```

### 2.2 Actualizar Nombre del Remitente (Opcional)
```bash
# Antes:
OFFICE365_SENDER_NAME=Facturas

# Después (más profesional):
OFFICE365_SENDER_NAME=Departamento de Facturación - InnovaSmartCR
```

---

## 📋 Paso 3: Verificar Configuración

### 3.1 Reiniciar el Servidor
```bash
# Detén el servidor (Ctrl+C) y reinicia:
npm run dev
```

### 3.2 Probar la Nueva Configuración
```bash
npm run verify-email
```

### 3.3 Enviar Correo de Prueba
```bash
node scripts/test-email-send.js
```

---

## 📋 Paso 4: Probar desde la Interfaz

### 4.1 Ir al Panel de Pruebas
- Ve a **Dashboard → Pruebas de Correo**

### 4.2 Configurar Correo de Prueba
- **Para**: Tu email personal
- **Asunto**: "Prueba desde facturas@innovasmartcr.com"
- **Contenido**: HTML de prueba

### 4.3 Verificar el Remitente
- El correo debe llegar con remitente `facturas@innovasmartcr.com`
- En lugar de `jorozco@innovasmartcr.com`

---

## 🔍 Verificación de "Send As"

### Método 1: Exchange Admin Center
1. Ve a **Recipients** → **Mailboxes**
2. Busca `facturas@innovasmartcr.com`
3. Ve a **Mailbox permissions**
4. Verifica que tu usuario tenga **"Send as"** permissions

### Método 2: PowerShell (Opcional)
```powershell
# Conectar a Exchange Online
Connect-ExchangeOnline

# Ver permisos del buzón
Get-MailboxPermission -Identity "facturas@innovasmartcr.com"

# Deberías ver algo como:
# User: jorozco@innovasmartcr.com
# AccessRights: {SendAs}
```

---

## 🚨 Solución de Problemas

### ❌ Error: "Mailbox not found"
**Causa**: El buzón `facturas@innovasmartcr.com` no existe
**Solución**: Crear el buzón en Exchange Admin Center

### ❌ Error: "Insufficient privileges"
**Causa**: No tienes permisos "Send As"
**Solución**: 
1. Ve a Exchange Admin Center
2. Busca el buzón `facturas@innovasmartcr.com`
3. Ve a Mailbox permissions
4. Agrega tu usuario con permiso "Send as"

### ❌ Error: "Access denied"
**Causa**: Permisos no propagados
**Solución**: Esperar 5-10 minutos y reintentar

---

## ✅ Lista de Verificación

- [ ] ✅ Buzón `facturas@innovasmartcr.com` existe
- [ ] ✅ Permisos "Send As" configurados
- [ ] ✅ Variables de entorno actualizadas
- [ ] ✅ Servidor reiniciado
- [ ] ✅ Prueba de envío exitosa
- [ ] ✅ Correo llega con remitente correcto

---

## 🎉 Beneficios del "Send As"

### **Profesionalismo:**
- Los correos llegan desde `facturas@innovasmartcr.com`
- Más profesional que emails personales
- Consistencia en la comunicación

### **Organización:**
- Todos los correos de facturación desde una cuenta
- Fácil seguimiento y gestión
- Separación clara de responsabilidades

### **Funcionalidad:**
- Respuestas automáticas desde la cuenta correcta
- Historial de correos organizado
- Mejor gestión de contactos

---

## 🔄 Configuración Alternativa: Send on Behalf

Si "Send As" no funciona, también puedes usar "Send on Behalf":

### Ventajas:
- Los destinatarios ven que el correo fue enviado en nombre de alguien
- Más transparente para los clientes

### Configuración:
- En Exchange Admin Center, usa "Send on behalf" en lugar de "Send as"
- El correo llegará como: "Tu Nombre on behalf of facturas@innovasmartcr.com"

---

## 📞 Soporte

Si tienes problemas:
1. Verifica permisos en Exchange Admin Center
2. Revisa logs del servidor
3. Contacta al administrador de Exchange
4. Consulta documentación de Microsoft Exchange
