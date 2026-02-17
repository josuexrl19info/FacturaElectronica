# Documentación: Cómo se Determina el IVA y la Tarifa en el XML para Hacienda

## Resumen del Flujo

El sistema determina el IVA y la tarifa de la siguiente manera:

1. **Fuente de Datos**: Los datos provienen del formulario de creación (factura/tiquete)
2. **Origen de los Valores**: 
   - Si se agrega un producto del catálogo, toma los valores del producto
   - Si se agrega manualmente, el usuario selecciona la tarifa
3. **Cálculo del Monto**: Se calcula automáticamente basado en la tarifa seleccionada
4. **Envío a Hacienda**: Se incluye en el XML con el código de tarifa correspondiente

---

## 1. Tarifas de IVA Disponibles

Las tarifas están definidas en `lib/invoice-types.ts`:

```typescript
export const TARIFAS_IMPUESTO = [
  { codigo: '08', descripcion: '13%', porcentaje: 13 },
  { codigo: '04', descripcion: '4%', porcentaje: 4 },
  { codigo: '02', descripcion: '2%', porcentaje: 2 },
  { codigo: '01', descripcion: '1%', porcentaje: 1 },
  { codigo: '00', descripcion: '0%', porcentaje: 0 },
  { codigo: '12', descripcion: 'Exento', porcentaje: 0 }
]
```

**⚠️ IMPORTANTE**: Los códigos de tarifa según Hacienda son:
- `08` = 13% (Tarifa General)
- `04` = 4% (Tarifa Reducida)
- `02` = 2% (Tarifa Reducida)
- `01` = 1% (Tarifa Reducida)
- `00` = 0% (Sin impuesto)
- `12` = Exento

---

## 2. Flujo de Datos

### 2.1. Al Agregar un Producto del Catálogo

Cuando el usuario selecciona un producto del catálogo:

```typescript
// components/documents/invoice-creation-modal.tsx
const handleAddProduct = (product: any) => {
  const newItem: InvoiceItemFormData = {
    productId: product.id,
    codigoCABYS: product.codigoCABYS,
    detalle: product.detalle,
    unidadMedida: product.unidadMedida,
    cantidad: 1,
    precioUnitario: product.precioUnitario,
    tipoImpuesto: product.tipoImpuesto,        // Del producto
    codigoTarifa: product.codigoTarifaImpuesto, // Del producto
    tarifa: product.tarifaImpuesto              // Del producto
  }
  // ...
}
```

**Los valores vienen del producto almacenado en Firestore.**

### 2.2. Al Agregar Manualmente

Cuando el usuario agrega un item manualmente:

```typescript
// components/documents/invoice-creation-modal.tsx
const handleAddManualItem = () => {
  const newItem: InvoiceItemFormData = {
    codigoCABYS: '',
    detalle: '',
    unidadMedida: 'Sp',
    cantidad: 1,
    precioUnitario: 0,
    tipoImpuesto: '01',      // Por defecto: IVA
    codigoTarifa: '08',      // Correcto: '08' = 13%
    tarifa: 13               // Por defecto: 13%
  }
  // ...
}
```

**El usuario puede cambiar la tarifa desde el dropdown en el formulario.**

---

## 3. Cálculo del Monto del IVA

El monto del IVA se calcula en múltiples lugares:

### 3.1. En el Frontend (Cálculo en Tiempo Real)

```typescript
// lib/invoice-types.ts
export const calculateItemTotals = (item: InvoiceItemFormData): Partial<InvoiceItem> => {
  const montoTotal = item.cantidad * item.precioUnitario
  const baseImponible = montoTotal
  const montoImpuesto = (baseImponible * item.tarifa) / 100  // ← Cálculo aquí
  const montoTotalLinea = montoTotal + montoImpuesto

  return {
    // ...
    impuesto: [{
      codigo: item.tipoImpuesto,
      codigoTarifa: item.codigoTarifa,
      tarifa: item.tarifa,
      monto: montoImpuesto  // ← Monto calculado
    }],
    // ...
  }
}
```

**Fórmula**: `montoImpuesto = (baseImponible × tarifa) / 100`

### 3.2. En el Backend (Al Crear el Documento)

```typescript
// app/api/invoices/create/route.ts
items: items.map((item: any, index: number) => {
  const baseImponible = item.cantidad * item.precioUnitario
  const impuestoMonto = (baseImponible * (item.tarifa || 0)) / 100  // ← Cálculo aquí
  
  return {
    // ...
    impuesto: [{
      codigo: item.tipoImpuesto || '01',
      codigoTarifaIVA: item.codigoTarifa || '08',  // Correcto: '08' = 13%
      tarifa: Number(item.tarifa) || 13,
      monto: impuestoMonto  // ← Monto calculado
    }],
    // ...
  }
})
```

---

## 4. Generación del XML para Hacienda

El XML se genera en `lib/services/xml-generator.ts`:

```typescript
// lib/services/xml-generator.ts
private static generateLineaDetalleXML(linea: LineaDetalle): string {
  return `<LineaDetalle>
  <NumeroLinea>${linea.numeroLinea}</NumeroLinea>
  <CodigoCABYS>${this.escapeXml(linea.codigoCABYS)}</CodigoCABYS>
  // ... otros campos ...
  <Impuesto>
    <Codigo>${this.escapeXml(linea.impuesto.codigo)}</Codigo>
    <CodigoTarifaIVA>${this.escapeXml(linea.impuesto.codigoTarifaIVA)}</CodigoTarifaIVA>  // ← Código de tarifa
    <Tarifa>${this.formatAmount(linea.impuesto.tarifa)}</Tarifa>  // ← Porcentaje
    <Monto>${this.formatAmount(linea.impuesto.monto)}</Monto>  // ← Monto calculado
  </Impuesto>
  // ...
</LineaDetalle>`
}
```

**Los valores que se envían a Hacienda son:**
- `Codigo`: Tipo de impuesto (generalmente '01' = IVA)
- `CodigoTarifaIVA`: Código de la tarifa ('08', '04', '02', etc.)
- `Tarifa`: Porcentaje numérico (13, 4, 2, 1, 0)
- `Monto`: Monto calculado del impuesto

---

## 5. Consideraciones Especiales

### 5.1. Cliente con Exoneración

Si el cliente tiene exoneración, el IVA se calcula como 0:

```typescript
// lib/invoice-types.ts
const isClientExempt = selectedClient && (selectedClient.tieneExoneracion || selectedClient.hasExemption)

const totalImpuesto = isClientExempt ? 0 : items.reduce((sum, item) => {
  const baseImponible = item.cantidad * item.precioUnitario
  return sum + (baseImponible * item.tarifa) / 100
}, 0)
```

**En el XML se incluye un bloque `<Exoneracion>` con los detalles de la exoneración.**

### 5.2. Valores por Defecto

Si no se especifica una tarifa:
- `codigoTarifa`: '08' (Correcto: '08' = 13%)
- `tarifa`: 13 (porcentaje)
- `tipoImpuesto`: '01' (IVA)

---

## 6. Problemas Identificados

### ✅ CORRECCIÓN APLICADA: Códigos de Tarifa

**Los códigos correctos según Hacienda son:**
- `08` = 13% (Tarifa General) ✅
- `04` = 4% (Tarifa Reducida)
- `02` = 2% (Tarifa Reducida)
- `01` = 1% (Tarifa Reducida)
- `00` = 0% (Sin impuesto)
- `12` = Exento

**Cambios realizados:**
1. ✅ Actualizada la definición en `lib/invoice-types.ts` con los códigos correctos
2. ✅ Los modales ahora muestran solo las tarifas (13%, 4%, etc.) sin mostrar los códigos
3. ✅ El código por defecto '08' para 13% es correcto

---

## 7. Consulta de Tarifas

**¿De dónde consulta el sistema las tarifas?**

1. **Del Producto**: Si el item viene de un producto del catálogo, los valores están almacenados en Firestore en la colección `products`:
   - `product.tipoImpuesto`
   - `product.codigoTarifaImpuesto`
   - `product.tarifaImpuesto`

2. **Del Usuario**: Si el item se agrega manualmente, el usuario selecciona la tarifa desde el dropdown que muestra las opciones de `TARIFAS_IMPUESTO`.

3. **Por Defecto**: Si no se especifica, se usan los valores por defecto (actualmente incorrectos).

**El sistema NO consulta a Hacienda** para obtener las tarifas. Las tarifas son estáticas y están definidas en el código según la normativa de Hacienda.

---

## 8. Resumen de Campos en el XML

En el XML que se envía a Hacienda, cada línea de detalle incluye:

```xml
<LineaDetalle>
  <!-- ... otros campos ... -->
  <Impuesto>
    <Codigo>01</Codigo>                    <!-- Tipo de impuesto: '01' = IVA -->
    <CodigoTarifaIVA>08</CodigoTarifaIVA>  <!-- Código de tarifa: '08' = 13% -->
    <Tarifa>13.00</Tarifa>                 <!-- Porcentaje: 13 -->
    <Monto>130.00</Monto>                  <!-- Monto calculado: (1000 × 13) / 100 -->
  </Impuesto>
  <!-- ... -->
</LineaDetalle>
```

---

## Conclusión

El sistema determina el IVA y la tarifa de la siguiente manera:

1. **Origen**: Del producto (si viene del catálogo) o del usuario (si es manual)
2. **Cálculo**: `monto = (baseImponible × tarifa) / 100`
3. **XML**: Se incluyen el código de tarifa, el porcentaje y el monto calculado
4. **Exoneración**: Si el cliente tiene exoneración, el monto es 0 y se incluye el bloque de exoneración

**No se consulta a Hacienda** para obtener las tarifas. Las tarifas son estáticas según la normativa vigente.

---

## 9. Cómo Consultar las Tarifas en el Código

### 9.1. Ver las Tarifas Definidas

```bash
# Ver la definición correcta de tarifas
cat lib/invoice-types.ts | grep -A 10 "TARIFAS_IMPUESTO"
```

### 9.2. Buscar Dónde se Usa una Tarifa Específica

```bash
# Buscar todos los lugares donde se usa el código '08'
grep -r "codigoTarifa.*08\|'08'.*tarifa" --include="*.ts" --include="*.tsx"
```

### 9.3. Ver Cómo se Calcula el IVA

```bash
# Ver la función de cálculo
cat lib/invoice-types.ts | grep -A 20 "calculateItemTotals"
```

### 9.4. Ver Cómo se Genera el XML

```bash
# Ver cómo se incluye la tarifa en el XML
cat lib/services/xml-generator.ts | grep -A 10 "CodigoTarifaIVA"
```

### 9.5. Consultar en la Base de Datos

Para ver qué tarifas tienen los productos almacenados:

```javascript
// En la consola de Firebase o en una función
const products = await db.collection('products').get()
products.forEach(doc => {
  const product = doc.data()
  console.log(`${product.detalle}: Código=${product.codigoTarifaImpuesto}, Tarifa=${product.tarifaImpuesto}%`)
})
```

### 9.6. Verificar en el XML Generado

Para verificar qué se está enviando a Hacienda, revisar el XML firmado:

```bash
# Buscar en los logs del servidor cuando se crea una factura
# O descargar el XML firmado desde la interfaz y buscar:
grep -A 5 "CodigoTarifaIVA" archivo.xml
```

---

## 10. Resumen Rápido

**¿Cómo sabe el sistema qué IVA poner?**
- Del producto (si viene del catálogo) o del usuario (si es manual)

**¿Cómo sabe qué tarifa usar?**
- Del producto almacenado o seleccionada por el usuario desde el dropdown

**¿Dónde se consulta?**
- **NO se consulta a Hacienda** - las tarifas son estáticas en el código
- Se consulta del producto en Firestore o del formulario del usuario

**¿Cómo se calcula el monto?**
- `monto = (cantidad × precioUnitario × tarifa) / 100`

**¿Qué se envía a Hacienda?**
- Código de tarifa (ej: '08' para 13%)
- Porcentaje (ej: 13)
- Monto calculado (ej: 130.00)

**Nota**: Los modales ahora muestran solo las tarifas (13%, 4%, etc.) sin mostrar los códigos internos, para una mejor experiencia de usuario.
