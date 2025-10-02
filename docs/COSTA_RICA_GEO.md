# Sistema Geográfico de Costa Rica

## 📍 Descripción General

Sistema completo de datos geográficos de Costa Rica basado en la **División Territorial Administrativa 2022** del Registro Nacional e Instituto Geográfico Nacional. Proporciona dropdowns dependientes para provincias, cantones y distritos con datos oficiales.

## 🏗️ Arquitectura del Sistema

### **Archivos de Datos (JSON)**
```
data/costa-rica/
├── provincias.json    # 7 provincias
├── cantones.json      # 82 cantones
└── distritos.json     # 489 distritos
```

### **Servicios y Componentes**
```
lib/
├── costa-rica-geo.ts           # Servicio principal
└── company-wizard-types.ts     # Tipos actualizados

components/ui/
└── geo-dropdowns.tsx          # Componente dropdown dependiente

app/api/costa-rica/
└── geo/route.ts               # API endpoints
```

## 📊 Estructura de Datos

### **Provincia**
```typescript
interface Provincia {
  codigo: number      // 1-7
  nombre: string      // "San José", "Alajuela", etc.
}
```

### **Cantón**
```typescript
interface Canton {
  codigo: number      // 101-706
  nombre: string      // "San José", "Escazú", etc.
  provinciaCodigo: number  // Referencia a provincia
}
```

### **Distrito**
```typescript
interface Distrito {
  codigo: number      // 10101-70606
  nombre: string      // "Carmen", "Merced", etc.
  cantonCodigo: number   // Referencia a cantón
  area: number        // Área en km²
}
```

## 🔧 Uso del Servicio

### **Inicialización**
```typescript
import { costaRicaGeo } from '@/lib/costa-rica-geo'

// Inicializar (se hace automáticamente)
await costaRicaGeo.initialize()
```

### **Obtener Datos**
```typescript
// Todas las provincias
const provincias = await costaRicaGeo.getProvincias()

// Cantones de una provincia
const cantones = await costaRicaGeo.getCantonesByProvincia(1) // San José

// Distritos de un cantón
const distritos = await costaRicaGeo.getDistritosByCanton(101) // San José

// Ubicación completa
const ubicacion = await costaRicaGeo.getUbicacionCompleta(1, 101, 10101)
```

### **Validaciones**
```typescript
// Validar ubicación
const esValida = await costaRicaGeo.validarUbicacion(1, 101, 10101)

// Formatear para mostrar
const texto = await costaRicaGeo.formatearUbicacion(1, 101, 10101)
// Resultado: "Carmen, San José, San José"
```

## 🎨 Componente GeoDropdowns

### **Uso Básico**
```tsx
import { GeoDropdowns } from '@/components/ui/geo-dropdowns'

function MiComponente() {
  const [ubicacion, setUbicacion] = useState({
    provincia: null,
    canton: null,
    distrito: null
  })

  return (
    <GeoDropdowns
      onLocationChange={setUbicacion}
      className="mb-6"
    />
  )
}
```

### **Con Valores Iniciales**
```tsx
<GeoDropdowns
  onLocationChange={handleLocationChange}
  initialValues={{
    provinciaCodigo: 1,
    cantonCodigo: 101,
    distritoCodigo: 10101
  }}
/>
```

### **Props del Componente**
```typescript
interface GeoDropdownsProps {
  onLocationChange: (ubicacion: {
    provincia: Provincia | null
    canton: Canton | null
    distrito: Distrito | null
  }) => void
  initialValues?: {
    provinciaCodigo?: number
    cantonCodigo?: number
    distritoCodigo?: number
  }
  className?: string
  disabled?: boolean
}
```

## 🌐 API Endpoints

### **GET /api/costa-rica/geo**

#### **Obtener Provincias**
```bash
GET /api/costa-rica/geo?type=provincias
```
**Respuesta:**
```json
{
  "data": [
    { "codigo": 1, "nombre": "San José" },
    { "codigo": 2, "nombre": "Alajuela" }
  ]
}
```

#### **Obtener Cantones**
```bash
GET /api/costa-rica/geo?type=cantones&parent=1
```
**Respuesta:**
```json
{
  "data": [
    { "codigo": 101, "nombre": "San José", "provinciaCodigo": 1 },
    { "codigo": 102, "nombre": "Escazú", "provinciaCodigo": 1 }
  ]
}
```

#### **Obtener Distritos**
```bash
GET /api/costa-rica/geo?type=distritos&parent=101
```
**Respuesta:**
```json
{
  "data": [
    { "codigo": 10101, "nombre": "Carmen", "cantonCodigo": 101, "area": 1.49 },
    { "codigo": 10102, "nombre": "Merced", "cantonCodigo": 101, "area": 2.2 }
  ]
}
```

#### **Ubicación Completa**
```bash
GET /api/costa-rica/geo?type=ubicacion&provincia=1&canton=101&distrito=10101
```

#### **Búsqueda por Nombres**
```bash
GET /api/costa-rica/geo?type=buscar&provincia=San José&canton=San José&distrito=Carmen
```

#### **Estadísticas**
```bash
GET /api/costa-rica/geo?type=estadisticas
```

## 📱 Integración en Wizard de Empresas

### **Antes (Hardcoded)**
```tsx
// Dropdowns estáticos y manuales
<Select value={province} onValueChange={setProvince}>
  <SelectItem value="San José">San José</SelectItem>
  <SelectItem value="Alajuela">Alajuela</SelectItem>
</Select>

<Input value={canton} onChange={setCanton} />
<Input value={district} onChange={setDistrict} />
```

### **Después (Dinámico)**
```tsx
// Dropdowns dependientes con datos oficiales
<GeoDropdowns
  onLocationChange={(location) => {
    setSelectedLocation(location)
    updateField('personalInfo', 'province', location.provincia?.nombre || '')
    updateField('personalInfo', 'canton', location.canton?.nombre || '')
    updateField('personalInfo', 'district', location.distrito?.nombre || '')
  }}
/>
```

## 🎯 Características Principales

### **✅ Dropdowns Dependientes**
- **Provincia** → Carga cantones automáticamente
- **Cantón** → Carga distritos automáticamente
- **Validación** → Solo muestra opciones válidas

### **✅ Datos Oficiales**
- **Fuente**: Registro Nacional de Costa Rica
- **Año**: 2022 (más reciente)
- **Completitud**: 7 provincias, 82 cantones, 489 distritos

### **✅ Performance Optimizada**
- **Carga bajo demanda**: Solo carga datos necesarios
- **Caché en memoria**: Datos se mantienen en memoria
- **Lazy loading**: Inicialización solo cuando se necesita

### **✅ UX Mejorada**
- **Loading states**: Indicadores de carga
- **Error handling**: Manejo de errores robusto
- **Responsive**: Funciona en móviles y desktop
- **Accesibilidad**: Labels y ARIA apropiados

## 🔍 Validaciones y Seguridad

### **Validación de Códigos**
```typescript
// Verificar que el cantón pertenece a la provincia
if (canton.provinciaCodigo !== provinciaCodigo) {
  return null
}

// Verificar que el distrito pertenece al cantón
if (distrito.cantonCodigo !== cantonCodigo) {
  return null
}
```

### **Manejo de Errores**
```typescript
try {
  const response = await fetch('/api/costa-rica/geo?type=provincias')
  if (!response.ok) throw new Error('Error al cargar provincias')
  // ...
} catch (error) {
  setError('Error al cargar los datos geográficos')
}
```

## 📊 Estadísticas del Sistema

### **Datos Totales**
- **7 Provincias**
- **82 Cantones**
- **489 Distritos**
- **~51,100 km²** de área total

### **Distribución por Provincia**
| Provincia | Cantones | Distritos | Área (km²) |
|-----------|----------|-----------|------------|
| San José | 20 | 118 | 4,965 |
| Alajuela | 16 | 108 | 9,758 |
| Cartago | 8 | 48 | 3,125 |
| Heredia | 10 | 46 | 2,657 |
| Guanacaste | 11 | 59 | 10,141 |
| Puntarenas | 11 | 57 | 11,266 |
| Limón | 6 | 53 | 9,189 |

## 🚀 Casos de Uso

### **1. Formularios de Empresas**
- Registro de empresas
- Direcciones fiscales
- Validación de ubicaciones

### **2. Facturación Electrónica**
- Direcciones de emisión
- Direcciones de entrega
- Validación con Hacienda

### **3. Reportes y Analytics**
- Análisis por ubicación
- Estadísticas regionales
- Segmentación geográfica

### **4. Aplicaciones Móviles**
- Selección de ubicación
- Búsqueda de servicios
- Mapas y geolocalización

## 🔧 Configuración y Deployment

### **Archivos Estáticos**
Los archivos JSON se sirven como archivos estáticos desde `/data/costa-rica/` y son accesibles públicamente.

### **Caché del Navegador**
Los datos se cachean automáticamente en el navegador para mejorar el rendimiento.

### **Actualización de Datos**
Para actualizar los datos:
1. Reemplazar archivos JSON en `/data/costa-rica/`
2. Reiniciar la aplicación
3. El servicio se reinicializa automáticamente

## 🧪 Testing

### **Página de Demo**
Visite `/demo/geo` para probar el sistema completo con:
- Dropdowns interactivos
- Historial de selecciones
- Información detallada
- Estadísticas del sistema

### **Tests Automatizados**
```bash
# Probar API endpoints
curl http://localhost:3000/api/costa-rica/geo?type=provincias
curl http://localhost:3000/api/costa-rica/geo?type=cantones&parent=1
curl http://localhost:3000/api/costa-rica/geo?type=distritos&parent=101
```

## 📚 Referencias

- [Registro Nacional de Costa Rica](https://www.registronacional.go.cr/)
- [Instituto Geográfico Nacional](https://www.ign.go.cr/)
- [División Territorial Administrativa 2022](https://www.registronacional.go.cr/division-territorial-administrativa/)

## 🔄 Actualizaciones Futuras

### **Funcionalidades Planificadas**
- [ ] Búsqueda por nombre (fuzzy search)
- [ ] Códigos postales
- [ ] Coordenadas GPS
- [ ] Mapas interactivos
- [ ] Datos históricos de cambios territoriales

### **Mejoras Técnicas**
- [ ] PWA offline support
- [ ] Service Worker para caché
- [ ] Compresión de datos
- [ ] Lazy loading de archivos JSON
