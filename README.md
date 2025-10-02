# InvoSell - Sistema de Facturación Electrónica

Sistema moderno de facturación electrónica para Costa Rica, desarrollado con Next.js 14, Firebase y TypeScript.

## 🚀 Características

- **Autenticación segura** con Firebase Auth
- **Base de datos en tiempo real** con Firestore
- **Multi-tenant** para múltiples empresas
- **Gestión de usuarios y roles**
- **Interfaz moderna y responsive**
- **Facturación electrónica** compatible con Costa Rica
- **API REST** para integraciones

## 🛠️ Tecnologías

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Firebase (Auth, Firestore, Hosting)
- **UI**: Tailwind CSS, shadcn/ui
- **Deployment**: Firebase Hosting
- **Estado**: React Context API

## 📋 Requisitos

- Node.js 18+
- npm o pnpm
- Cuenta de Firebase

## 🔧 Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd facturacion-cr
```

2. **Instalar dependencias**
```bash
npm install
# o
pnpm install
```

3. **Configurar variables de entorno**
```bash
cp env.example .env.local
```

Editar `.env.local` con tus credenciales de Firebase:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=tu_measurement_id
```

4. **Ejecutar en desarrollo**
```bash
npm run dev
# o
pnpm dev
```

5. **Abrir en el navegador**
```
http://localhost:3000
```

## 📁 Estructura del Proyecto

```
facturacion-cr/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── dashboard/         # Páginas del dashboard
│   └── ...
├── components/            # Componentes React
│   ├── auth/             # Autenticación
│   ├── ui/               # Componentes base
│   └── ...
├── lib/                  # Servicios y utilidades
│   ├── firebase-*.ts     # Servicios Firebase
│   ├── api-client.ts     # Cliente API
│   └── ...
├── hooks/                # Custom hooks
├── styles/               # Estilos globales
└── docs/                 # Documentación
```

## 🔐 Autenticación

El sistema utiliza Firebase Auth para la autenticación. Los usuarios se almacenan en Firestore con la siguiente estructura:

```typescript
interface User {
  id: string
  email: string
  name: string
  status: 'active' | 'inactive' | 'suspended'
  roleId: string
  tenantId: string
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

## 🏢 Multi-tenancy

El sistema soporta múltiples empresas (tenants) con:
- Aislamiento de datos por tenant
- Gestión independiente de usuarios
- Configuraciones personalizadas

## 📊 API Endpoints

### Usuarios
- `GET /api/users?tenantId=xxx` - Listar usuarios
- `POST /api/users` - Crear usuario
- `GET /api/users/[id]` - Obtener usuario
- `PUT /api/users/[id]` - Actualizar usuario
- `DELETE /api/users/[id]` - Eliminar usuario

### Perfil
- `GET /api/profile?userId=xxx` - Obtener perfil
- `PUT /api/profile?userId=xxx` - Actualizar perfil

## 🚀 Deployment

### Firebase Hosting

1. **Instalar Firebase CLI**
```bash
npm install -g firebase-tools
```

2. **Login en Firebase**
```bash
firebase login
```

3. **Inicializar proyecto**
```bash
firebase init hosting
```

4. **Build y deploy**
```bash
npm run build
firebase deploy
```

## 🧪 Testing

```bash
# Tests unitarios
npm run test

# Tests E2E
npm run test:e2e

# Coverage
npm run test:coverage
```

## 📝 Scripts Disponibles

```bash
npm run dev          # Desarrollo
npm run build        # Build para producción
npm run start        # Servidor de producción
npm run lint         # Linter
npm run type-check   # Verificación de tipos
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas:
- Email: soporte@invosell.cr
- Documentación: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## 🗺️ Roadmap

- [ ] Gestión avanzada de roles
- [ ] Reportes avanzados
- [ ] Integración con APIs gubernamentales
- [ ] App móvil
- [ ] Multi-idioma completo
- [ ] Backup automático

---

Desarrollado con ❤️ por InnovaSellCR