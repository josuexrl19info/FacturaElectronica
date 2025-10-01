# InvoSell 💼

**Sistema de Facturación Electrónica para Costa Rica**

Desarrollado por **InnovaSell** - Soluciones tecnológicas innovadoras para el comercio electrónico y la gestión empresarial.

## 🚀 Descripción

InvoSell es una aplicación web moderna y completa para la gestión de facturación electrónica, diseñada específicamente para cumplir con las regulaciones de facturación electrónica de Costa Rica (v4.4). El sistema permite a las empresas gestionar sus documentos fiscales, clientes, productos y reportes de manera eficiente.

## ✨ Características Principales

### 📄 Gestión de Documentos
- **Facturas Electrónicas** - Cumplimiento con normativas CR
- **Notas de Crédito** - Gestión de devoluciones y ajustes
- **Notas de Débito** - Cargos adicionales y correcciones
- **Tickets** - Comprobantes de venta simplificados
- **Vista Previa PDF** - Generación de documentos en PDF

### 👥 Gestión de Clientes
- Registro completo de clientes
- Información fiscal y de contacto
- Historial de transacciones
- Asignación de múltiples empresas

### 📦 Gestión de Productos
- Catálogo de productos y servicios
- Control de inventario
- Precios y descuentos
- Categorización

### 🏢 Sistema Multi-Empresa
- Gestión de múltiples empresas desde una cuenta
- Roles y permisos (Propietario, Admin, Colaborador)
- Configuración personalizada por empresa
- Logo y colores corporativos

### 📊 Reportes y Analytics
- Dashboard con métricas clave
- Reportes de ventas
- Análisis de tendencias
- Exportación de datos

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI/UX**: Tailwind CSS, Radix UI, Lucide Icons
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Formularios**: React Hook Form + Zod
- **Estado**: React Context API
- **PDF**: Generación de documentos PDF
- **Deployment**: Vercel (recomendado)

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o pnpm
- Cuenta de Firebase
- Git

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone <url-del-repositorio>
cd facturacion-cr
```

### 2. Instalar Dependencias
```bash
npm install
# o
pnpm install
```

### 3. Configurar Variables de Entorno
```bash
# Copiar el archivo de ejemplo
cp env.example .env.local

# Editar .env.local con tu configuración de Firebase
```

### 4. Configurar Firebase
1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com)
2. Habilitar Authentication (Email/Password)
3. Crear una base de datos Firestore
4. Configurar Storage (opcional)
5. Copiar las credenciales a `.env.local`

### 5. Ejecutar en Desarrollo
```bash
npm run dev
# o
pnpm dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## 📁 Estructura del Proyecto

```
facturacion-cr/
├── app/                    # Páginas de Next.js (App Router)
│   ├── dashboard/         # Panel principal
│   ├── onboarding/        # Configuración inicial
│   └── select-company/    # Selección de empresa
├── components/            # Componentes reutilizables
│   ├── auth/             # Autenticación
│   ├── clients/          # Gestión de clientes
│   ├── company/          # Gestión de empresas
│   ├── dashboard/        # Componentes del dashboard
│   ├── documents/        # Formularios de documentos
│   ├── layout/           # Layout y navegación
│   ├── pdf/              # Generación de PDFs
│   ├── products/         # Gestión de productos
│   ├── ui/               # Componentes UI base
│   └── wizard/           # Asistentes paso a paso
├── hooks/                # Custom hooks
├── lib/                  # Utilidades y configuración
│   ├── firebase-config.ts
│   ├── firebase-client.ts
│   └── utils.ts
├── public/               # Archivos estáticos
└── styles/               # Estilos globales
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Construcción para producción
npm run build

# Iniciar servidor de producción
npm run start

# Linting
npm run lint
```

## 🚀 Despliegue

### Vercel (Recomendado)
1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Desplegar automáticamente

### Otras Plataformas
- Netlify
- Railway
- Heroku
- AWS Amplify

## 📝 Regulaciones Costa Rica

InvoSell está diseñado para cumplir con:
- **Normativa de Facturación Electrónica v4.4**
- **Ministerio de Hacienda de Costa Rica**
- **Formato XML requerido por el MH**
- **Validaciones fiscales necesarias**

## 🤝 Contribuir

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto es propiedad de **InnovaSell** y está protegido por derechos de autor.

## 📞 Contacto

**InnovaSell**
- Email: info@innovasell.com
- Website: [www.innovasell.com](https://www.innovasell.com)

## 🙏 Agradecimientos

- Comunidad de Next.js
- Radix UI por los componentes accesibles
- Firebase por la infraestructura
- Costa Rica por las regulaciones claras de facturación electrónica

---

**Desarrollado con ❤️ por InnovaSell**
