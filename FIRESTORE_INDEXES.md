# Índices de Firestore Requeridos

## Índice para consulta de usuarios por tenant

Para que la consulta de usuarios funcione correctamente, necesitas crear el siguiente índice compuesto en Firebase Console:

### Colección: `users`

**Campos del índice:**
1. `tenantId` (Ascendente)
2. `createdAt` (Descendente)
3. `__name__` (Ascendente)

### Pasos para crear el índice:

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto `invosellcr`
3. Ve a **Firestore Database** → **Índices**
4. Haz clic en **Crear índice**
5. Configura:
   - **Colección ID**: `users`
   - **Campos**:
     - Campo: `tenantId`, Orden: `Ascendente`
     - Campo: `createdAt`, Orden: `Descendente`
     - Campo: `__name__`, Orden: `Ascendente`
6. Haz clic en **Crear**

### Enlace directo:
```
https://console.firebase.google.com/v1/r/project/invosellcr/firestore/indexes?create_composite=Ckhwcm9qZWN0cy9pbnZvc2VsbGNyL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy91c2Vycy9pbmRleGVzL18QARoMCgh0ZW5hbnRJZBABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI
```

### Alternativa: Usar Firebase CLI

Si tienes Firebase CLI configurado, puedes crear el índice con:

```bash
firebase firestore:indexes
```

Y agregar esta configuración a `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "tenantId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

## Nota importante

Una vez creado el índice, puedes descomentar la línea `orderBy('createdAt', 'desc')` en `/app/api/users/route.ts` para usar el ordenamiento nativo de Firestore, que será más eficiente.
