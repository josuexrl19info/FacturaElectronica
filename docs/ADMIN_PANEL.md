# 🎛️ Panel de Super Administrador

## 📍 Dónde Acceder

El panel de super administrador está disponible en las siguientes rutas:

### **Página Principal del Admin**
```
http://localhost:3000/admin
```
- Dashboard con estadísticas generales
- Accesos rápidos a las funciones principales
- Vista de tenants recientes

### **Lista de Tenants**
```
http://localhost:3000/admin/tenants
```
- Lista completa de todos los tenants registrados
- Búsqueda y filtrado
- Acceso a detalles de cada tenant

### **Crear Nuevo Tenant**
```
http://localhost:3000/admin/tenants/create
```
- Formulario completo para crear un nuevo tenant
- Configuración de límites y plan
- Información del propietario

### **Detalles de Tenant**
```
http://localhost:3000/admin/tenants/[id]
```
- Información completa del tenant
- Estadísticas de documentos
- Límites configurados
- Ejemplo: `http://localhost:3000/admin/tenants/aWBhK37lHJOEyVqMlNCi`

---

## 🚀 Cómo Probar

### **Paso 1: Iniciar el Servidor**
```bash
npm run dev
```

### **Paso 2: Acceder al Panel**
1. Inicia sesión con cualquier usuario (por ahora no hay verificación de roles)
2. Navega directamente a: `http://localhost:3000/admin`
3. O desde el sidebar, busca la opción "Admin" (si está configurada)

### **Paso 3: Ver Tenants Existentes**
1. Ve a `http://localhost:3000/admin/tenants`
2. Deberías ver el tenant existente: `aWBhK37lHJOEyVqMlNCi`
3. Haz clic en "Ver Detalles" para ver toda la información

### **Paso 4: Crear un Nuevo Tenant**
1. Ve a `http://localhost:3000/admin/tenants/create`
2. Completa el formulario:
   - **Nombre del Tenant**: Ej: "Empresa Test S.A."
   - **Nombre del Propietario**: Tu nombre
   - **Email del Propietario**: Tu email
   - **Plan**: Selecciona Basic, Premium o Enterprise
   - **Estado**: Activo, Inactivo, Suspendido o Prueba
3. Haz clic en "Crear Tenant"
4. Serás redirigido a la página de detalles del nuevo tenant

---

## ⚠️ Notas Importantes

### **Seguridad (Pendiente)**
- ⚠️ **ACTUALMENTE NO HAY VERIFICACIÓN DE ROLES**
- Cualquier usuario autenticado puede acceder al panel de admin
- Esto es temporal para facilitar las pruebas
- **Próximamente**: Se implementará verificación de rol `super-admin`

### **Estructura de Datos**
- El panel lee directamente de la colección `tenants` en Firestore
- El tenant existente `aWBhK37lHJOEyVqMlNCi` debería aparecer automáticamente
- Si no aparece, verifica que la colección `tenants` exista en Firestore

### **APIs Disponibles**
- `GET /api/admin/tenants` - Listar todos los tenants
- `POST /api/admin/tenants` - Crear nuevo tenant
- `GET /api/admin/tenants/[id]` - Obtener tenant específico
- `PUT /api/admin/tenants/[id]` - Actualizar tenant

---

## 🔧 Funcionalidades Implementadas

### ✅ Completado
- [x] Dashboard principal con estadísticas
- [x] Lista de tenants con búsqueda
- [x] Formulario de creación de tenant
- [x] Página de detalles de tenant
- [x] APIs para CRUD de tenants
- [x] Servicio `TenantService` para lógica de negocio

### 🚧 Pendiente
- [ ] Verificación de rol super-admin
- [ ] Middleware de autorización
- [ ] Crear usuario para tenant desde el panel
- [ ] Crear empresa inicial para tenant desde el panel
- [ ] Contabilización automática de documentos
- [ ] Estadísticas detalladas y gráficos
- [ ] Edición de tenants desde el panel

---

## 📝 Próximos Pasos

1. **Implementar Sistema de Roles**
   - Agregar campo `role: 'super-admin' | 'admin' | 'user'` a usuarios
   - Actualizar flujo de login para redirigir según rol
   - Crear middleware de autorización

2. **Funcionalidades Adicionales**
   - Wizard completo: Tenant → Usuario → Empresa
   - Contabilización automática cuando se crean documentos
   - Dashboard con gráficos y estadísticas avanzadas

3. **Mejoras de UI/UX**
   - Agregar opción "Admin" al sidebar
   - Mejorar diseño de las tarjetas de tenants
   - Agregar acciones rápidas (suspender, activar, etc.)

---

## 🐛 Troubleshooting

### **No se ven los tenants**
- Verifica que la colección `tenants` exista en Firestore
- Revisa la consola del navegador para errores
- Verifica que las APIs estén funcionando: `http://localhost:3000/api/admin/tenants`

### **Error al crear tenant**
- Verifica que todos los campos requeridos estén completos
- Revisa el formato del email
- Verifica la consola del servidor para errores detallados

### **No puedo acceder a /admin**
- Asegúrate de estar autenticado
- Verifica que el servidor esté corriendo
- Intenta acceder directamente a la URL

---

## 📞 Soporte

Si encuentras algún problema o tienes sugerencias, documenta el error y los pasos para reproducirlo.
