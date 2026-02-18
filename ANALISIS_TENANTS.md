# 🔍 Análisis Profundo: Sistema de Tenants y Super Administrador

## 📊 Estado Actual del Sistema

### 1. **Estructura de Datos Actual**

#### ✅ Lo que SÍ existe:
- **Campo `tenantId`** en todas las colecciones:
  - `users` → tiene `tenantId`
  - `companies` → tiene `tenantId`
  - `clients` → tiene `tenantId`
  - `products` → tiene `tenantId`
  - `invoices` → tiene `tenantId`
  - `tickets` → tiene `tenantId`
  - `creditNotes` → tiene `tenantId`

#### ❌ Lo que NO existe:
- **Colección `tenants`** en Firestore (NO encontrada en el código)
- **API endpoints** para gestión de tenants (`/api/tenants/*`)
- **Sistema de roles** con `super-admin`
- **Panel de administración** para super admin
- **Middleware de autorización** por roles

### 2. **Confusión en el Código**

#### En `lib/firebase-config.ts`:
```typescript
export interface Tenant {
  id: string
  name: string // Razón Social
  nombreComercial: string // Nombre Comercial
  identification: string // Cédula/Jurídica
  // ... más campos de empresa
  tenantId: string // ⚠️ CONFUSIÓN: Tenant tiene tenantId?
}
```

**Problema**: Esta interfaz `Tenant` es realmente la estructura de `Company`, no de `Tenant` (licencia).

### 3. **Flujo Actual de Autenticación**

```
1. Usuario hace login
2. Se obtiene `user.tenantId` desde Firestore
3. Se redirige a `/select-company`
4. Se filtran empresas por `user.tenantId`
5. Usuario selecciona empresa
6. Se guarda `selectedCompanyId` en localStorage
7. Se redirige a `/dashboard`
```

**Problema**: No hay diferenciación entre super-admin y usuarios normales.

### 4. **Estructura de Usuarios Actual**

```typescript
interface User {
  id: string
  email: string
  name: string
  status: 'active' | 'inactive' | 'suspended'
  roleId: string  // ⚠️ No hay valores definidos como 'super-admin'
  tenantId: string  // ⚠️ Todos los usuarios tienen tenantId
  role: {
    name: string
    permissions: string[]
  }
}
```

**Problema**: 
- `roleId` no tiene valores definidos como `'super-admin'`
- Todos los usuarios tienen `tenantId` (super-admin NO debería tenerlo)

---

## 🎯 Solución Propuesta

### Fase 1: Crear Colección `tenants` (Licencias)

#### Estructura de la Colección `tenants`:

```typescript
interface Tenant {
  id: string  // ID del documento en Firestore
  name: string  // Nombre de la licencia/tenant (ej: "Empresa ABC S.A.")
  status: 'active' | 'inactive' | 'suspended' | 'trial'
  plan: 'basic' | 'premium' | 'enterprise'
  
  // Información del propietario
  ownerName: string
  ownerEmail: string
  ownerPhone?: string
  
  // Configuración de límites
  maxCompanies?: number
  maxUsers?: number
  maxDocumentsPerMonth?: number
  
  // Estadísticas (para contabilización)
  documentsThisMonth: number
  documentsLastMonth: number
  totalDocuments: number
  lastDocumentDate?: Date
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  createdBy: string  // ID del super-admin que lo creó
  notes?: string
  tags?: string[]
}
```

### Fase 2: Modificar Sistema de Roles

#### Actualizar interfaz `User`:

```typescript
interface User {
  id: string
  email: string
  name: string
  status: 'active' | 'inactive' | 'suspended'
  role: 'super-admin' | 'admin' | 'user'  // ⚠️ CAMBIO: role directo, no roleId
  tenantId: string | null  // ⚠️ CAMBIO: super-admin tiene null
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  profileImage?: string
  permissions: string[]  // Permisos específicos
  profile: {
    preferences: {
      notifications: boolean
      language: string
      timezone: string
    }
  }
}
```

**Reglas**:
- `super-admin`: `tenantId = null`, puede ver todos los tenants
- `admin`: `tenantId = 'xxx'`, administra su tenant
- `user`: `tenantId = 'xxx'`, usuario normal del tenant

### Fase 3: Flujo de Autenticación Modificado

```
1. Usuario hace login
2. Se obtiene `user.role` desde Firestore
3. Si `user.role === 'super-admin'`:
   → Redirigir a `/admin` (panel super admin)
4. Si `user.role === 'admin' || 'user'`:
   → Redirigir a `/select-company` (flujo actual)
```

### Fase 4: APIs para Super Admin

#### Nuevas rutas:
- `GET /api/admin/tenants` - Listar todos los tenants
- `POST /api/admin/tenants` - Crear nuevo tenant
- `GET /api/admin/tenants/[id]` - Obtener tenant específico
- `PUT /api/admin/tenants/[id]` - Actualizar tenant
- `DELETE /api/admin/tenants/[id]` - Eliminar/suspender tenant
- `POST /api/admin/tenants/[id]/create-user` - Crear usuario para tenant
- `POST /api/admin/tenants/[id]/create-company` - Crear empresa inicial
- `GET /api/admin/statistics` - Estadísticas globales

### Fase 5: Middleware de Autorización

```typescript
// lib/middleware/admin-auth.ts
export async function requireSuperAdmin(request: NextRequest) {
  // Verificar token Firebase
  // Verificar que user.role === 'super-admin'
  // Retornar error 403 si no es super-admin
}
```

### Fase 6: Panel de Super Admin

#### Estructura de rutas:
```
/app
  /admin                    # Panel super admin
    /page.tsx              # Dashboard de tenants
    /tenants
      /page.tsx            # Lista de tenants
      /create/page.tsx     # Crear tenant (wizard)
      /[id]/page.tsx       # Detalles del tenant
    /statistics/page.tsx   # Estadísticas globales
```

#### Funcionalidades:
1. **Dashboard Principal**:
   - Total de tenants activos/inactivos
   - Documentos generados este mes (por tenant)
   - Gráficos de uso
   - Alertas (tenants cerca del límite)

2. **Gestión de Tenants**:
   - Lista con filtros y búsqueda
   - Crear tenant (wizard completo):
     - Datos del tenant
     - Crear usuario administrador
     - Crear empresa inicial
     - Configurar límites
   - Editar tenant
   - Suspender/Activar tenant
   - Ver estadísticas del tenant

3. **Estadísticas**:
   - Documentos por mes por tenant
   - Uso de recursos
   - Facturación (si aplica)

---

## 🔧 Plan de Implementación

### Paso 1: Migración de Datos
1. Crear colección `tenants` en Firestore
2. Migrar datos existentes:
   - Agrupar usuarios por `tenantId`
   - Crear documentos en `tenants` para cada `tenantId` único
   - Actualizar usuarios con campo `role` (migrar de `roleId`)

### Paso 2: Actualizar Tipos y Interfaces
1. Corregir interfaz `Tenant` en `lib/firebase-config.ts`
2. Actualizar interfaz `User` con campo `role`
3. Crear tipos para super admin

### Paso 3: Crear Middleware
1. `lib/middleware/admin-auth.ts` - Verificar super-admin
2. `lib/middleware/tenant-auth.ts` - Verificar acceso a tenant

### Paso 4: Crear APIs
1. APIs de tenants (CRUD)
2. API de creación de usuario para tenant
3. API de creación de empresa inicial
4. API de estadísticas

### Paso 5: Crear UI
1. Panel de super admin
2. Lista de tenants
3. Wizard de creación
4. Dashboard de estadísticas

### Paso 6: Actualizar Flujo de Login
1. Modificar `components/auth/login-form.tsx`
2. Agregar lógica de redirección según `role`
3. Actualizar `lib/firebase-auth.ts`

### Paso 7: Contabilización Automática
1. Actualizar contadores en `tenants` cuando se crean documentos
2. Crear Cloud Functions o triggers para actualización automática

---

## ⚠️ Consideraciones Importantes

### 1. **Migración de Usuarios Existentes**
- Todos los usuarios actuales tienen `roleId` pero no `role`
- Necesitamos migrar a `role: 'user'` por defecto
- Crear un usuario super-admin inicial manualmente

### 2. **Seguridad**
- Firestore Security Rules deben actualizarse
- Verificar `role` en cada API route
- Super-admin NO debe tener `tenantId` en queries

### 3. **Retrocompatibilidad**
- Mantener `roleId` temporalmente para no romper código existente
- Migrar gradualmente a `role`

### 4. **Performance**
- Índices de Firestore para queries de tenants
- Caching de datos de tenants
- Paginación en listas grandes

---

## 📝 Próximos Pasos

1. ✅ Confirmar si existe colección `tenants` en Firestore (verificar en consola)
2. ✅ Crear estructura de datos para `tenants`
3. ✅ Implementar migración de datos
4. ✅ Crear APIs de super admin
5. ✅ Crear panel de super admin
6. ✅ Implementar contabilización automática
