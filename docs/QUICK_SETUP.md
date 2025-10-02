# 🚀 Configuración Rápida: Office 365 + InvoSell

## ⚡ Resumen de Pasos

### 1️⃣ Azure Portal (5 minutos)
```
https://portal.azure.com → Azure Active Directory → App registrations
```
- ✅ Nueva aplicación: "InvoSell Email Service"
- ✅ Anotar: Client ID + Tenant ID
- ✅ Crear Client Secret (copiar inmediatamente)
- ✅ Permisos: Mail.Send + Mail.ReadWrite
- ✅ Grant admin consent

### 2️⃣ Variables de Entorno (2 minutos)
Crear `.env.local`:
```bash
OFFICE365_TENANT_ID=tu-tenant-id
OFFICE365_CLIENT_ID=tu-client-id  
OFFICE365_CLIENT_SECRET=tu-client-secret
OFFICE365_SENDER_EMAIL=tu-email@dominio.com
OFFICE365_SENDER_NAME=InvoSell System
OFFICE365_GRAPH_ENDPOINT=https://graph.microsoft.com
```

### 3️⃣ Verificar Configuración (1 minuto)
```bash
npm run verify-email
```

### 4️⃣ Probar Sistema (2 minutos)
```
Dashboard → Pruebas de Correo → Enviar prueba
```

## 🔍 Comandos Útiles

```bash
# Verificar configuración
npm run verify-email

# Iniciar servidor
npm run dev

# Ver logs de correos
# (Revisa la consola del navegador)
```

## ❌ Problemas Comunes

| Error | Solución |
|-------|----------|
| `No se pudo obtener token` | Verificar Client ID/Secret |
| `403 Forbidden` | Conceder admin consent |
| `Mailbox not found` | Verificar email remitente |
| `API no responde` | Ejecutar `npm run dev` |

## ✅ Checklist Final

- [ ] Aplicación registrada en Azure AD
- [ ] Client Secret creado y copiado
- [ ] Permisos concedidos (estado verde)
- [ ] Variables en `.env.local`
- [ ] `npm run verify-email` exitoso
- [ ] Prueba de envío exitosa

## 🎯 ¡Listo!

Una vez completado, podrás:
- ✅ Enviar correos HTML
- ✅ Adjuntar archivos
- ✅ Usar templates
- ✅ Envío masivo

**Tiempo total: ~10 minutos** ⏱️
