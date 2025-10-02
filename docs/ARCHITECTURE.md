# Arquitectura del Sistema InvoSell

## 📁 Estructura del Proyecto

```
facturacion-cr/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── users/               # Endpoints para gestión de usuarios
│   │   │   ├── route.ts         # GET (listar), POST (crear)
│   │   │   └── [id]/route.ts    # GET, PUT, DELETE por ID
│   │   └── profile/             # Endpoints para perfil de usuario
│   │       └── route.ts         # GET, PUT perfil actual
│   ├── dashboard/               # Páginas del dashboard
│   │   ├── settings/            # Configuración del sistema
│   │   ├── clients/             # Gestión de clientes
│   │   ├── products/            # Gestión de productos
│   │   ├── documents/           # Facturas y documentos
│   │   └── reports/             # Reportes
│   ├── layout.tsx               # Layout principal
│   └── page.tsx                 # Página de inicio
├── components/                   # Componentes reutilizables
│   ├── auth/                    # Componentes de autenticación
│   ├── dashboard/               # Componentes del dashboard
│   ├── documents/               # Componentes de documentos
│   ├── layout/                  # Componentes de layout
│   ├── ui/                      # Componentes UI base
│   └── wizard/                  # Componentes de wizard
├── lib/                         # Utilidades y servicios
│   ├── firebase-auth.ts         # Autenticación Firebase
│   ├── firebase-config.ts       # Configuración Firebase
│   ├── firebase-users.ts        # Gestión de usuarios
│   ├── firebase-password.ts     # Gestión de contraseñas
│   ├── api-client.ts            # Cliente para API routes
│   └── utils.ts                 # Utilidades generales
├── hooks/                       # Custom hooks
├── styles/                      # Estilos globales
└── docs/                        # Documentación
```

## 🔧 Servicios y APIs

### 🔐 Autenticación (`lib/firebase-auth.ts`)
- **Propósito**: Manejo completo de autenticación con Firebase Auth
- **Funciones principales**:
  - `signIn()` - Iniciar sesión
  - `signOut()` - Cerrar sesión
  - `onAuthStateChange()` - Escuchar cambios de estado
  - `getCurrentUser()` - Obtener usuario actual
  - `hasPermission()` - Verificar permisos

### 👥 Gestión de Usuarios (`lib/firebase-users.ts`)
- **Propósito**: Operaciones CRUD de usuarios en Firestore
- **Funciones principales**:
  - `getCurrentUserProfile()` - Perfil del usuario actual
  - `updateCurrentUserProfile()` - Actualizar perfil
  - `getUsersByTenant()` - Usuarios por tenant
  - `createUser()` - Crear nuevo usuario
  - `updateUser()` - Actualizar usuario
  - `deleteUser()` - Eliminar usuario

### 🔑 Gestión de Contraseñas (`lib/firebase-password.ts`)
- **Propósito**: Manejo de contraseñas y recuperación
- **Funciones principales**:
  - `sendPasswordResetEmail()` - Enviar email de recuperación

### 🌐 API Client (`lib/api-client.ts`)
- **Propósito**: Cliente HTTP para comunicación con API routes
- **Servicios**:
  - `usersApi` - Operaciones de usuarios
  - `profileApi` - Operaciones de perfil
  - `passwordApi` - Operaciones de contraseñas

## 🛣️ API Routes

### `/api/users`
- **GET**: Lista usuarios por tenant
  - Query params: `tenantId`
- **POST**: Crea nuevo usuario
  - Body: `{ name, email, roleId, tenantId, status?, profile? }`

### `/api/users/[id]`
- **GET**: Obtiene usuario por ID
- **PUT**: Actualiza usuario
- **DELETE**: Elimina usuario

### `/api/profile`
- **GET**: Obtiene perfil del usuario actual
  - Query params: `userId`
- **PUT**: Actualiza perfil del usuario actual
  - Query params: `userId`

## 📊 Modelos de Datos

### Usuario (UserProfile)
```typescript
interface UserProfile {
  id: string
  email: string
  name: string
  status: 'active' | 'inactive' | 'suspended'
  roleId: string
  tenantId: string
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  role: {
    name: string
    permissions: string[]
  }
  profile: {
    preferences: {
      notifications: boolean
      language: string
      timezone: string
    }
  }
}
```

## 🔄 Flujo de Datos

### 1. Autenticación
```
Login → Firebase Auth → Firestore (users) → Estado Global → UI
```

### 2. Gestión de Usuarios
```
UI → API Client → API Route → Firebase Firestore → Response → UI
```

### 3. Perfil de Usuario
```
UI → Firebase Service → Firebase Firestore → Response → UI
```

## 🎯 Patrones de Diseño

### 1. **Repository Pattern**
- Los servicios (`firebase-*.ts`) actúan como repositorios
- Abstraen las operaciones de Firebase
- Facilitan testing y mantenimiento

### 2. **API Routes Pattern**
- Endpoints centralizados para operaciones comunes
- Reutilización de lógica entre componentes
- Mejor manejo de errores

### 3. **Service Layer Pattern**
- Separación clara entre UI y lógica de negocio
- Fácil testing y mantenimiento
- Reutilización de código

## 🔒 Seguridad

### 1. **Autenticación**
- Firebase Auth para autenticación
- Tokens JWT automáticos
- Estado de autenticación persistente

### 2. **Autorización**
- Verificación de permisos por rol
- Filtrado por tenant (multi-tenancy)
- Validación en API routes

### 3. **Validación**
- Validación de datos en API routes
- Sanitización de inputs
- Manejo de errores consistente

## 🚀 Mejores Prácticas

### 1. **Código**
- TypeScript para type safety
- Documentación JSDoc
- Manejo consistente de errores
- Separación de responsabilidades

### 2. **Performance**
- Lazy loading de componentes
- Caching de datos
- Optimización de queries
- Estados de carga

### 3. **UX/UI**
- Estados de carga y error
- Feedback visual
- Navegación intuitiva
- Responsive design

## 📝 Convenciones

### 1. **Nombres de archivos**
- `kebab-case` para archivos
- `PascalCase` para componentes
- `camelCase` para funciones

### 2. **Estructura de componentes**
- Props tipadas
- Documentación JSDoc
- Manejo de estados
- Cleanup de efectos

### 3. **API Routes**
- Métodos HTTP semánticos
- Respuestas consistentes
- Manejo de errores
- Validación de datos
