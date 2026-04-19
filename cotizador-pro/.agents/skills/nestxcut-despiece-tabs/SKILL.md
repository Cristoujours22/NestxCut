---
name: nestxcut-despiece-tabs
description: >
  Guía para crear y mantener tabs de despiece en NestxCut con estado estable,
  material por tab, catálogo local de cantos y sincronización segura con el workspace.
  Trigger: usar cuando el agente implemente, refactorice o depure tabs de despiece,
  selección de material por tab, cantos por tab o sincronización parent-child del despiece.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

Usar esta skill cuando el trabajo toque:

- creación/eliminación de tabs de despiece
- estado activo de tabs
- material asociado a cada tab
- cantos asociados a cada tab
- sincronización entre `Despiece` y `ProjectWorkspace`
- bugs visuales de tabs que parpadean, aparecen/desaparecen o pierden estado

## Critical Patterns

### 1. Cada tab es un contexto completo

Cada despiece debe modelarse así:

```js
{
  id,
  nombre,
  material_id,
  cantos: [],
  filas: []
}
```

No tratar la tab como un simple nombre o índice visual.

### 2. IDs estables en normalización

Cuando se normaliza data entrante:

- NO usar `Date.now()` para fallback IDs
- usar IDs determinísticos como:

```js
desp_${index}
row_${despieceIndex}_${rowIndex}
```

Los timestamps sirven para entidades nuevas creadas por el usuario, pero NO para normalizar datos persistidos.

### 3. Evitar loops parent-child

`Despiece` empuja cambios hacia arriba con `onChange`, y `ProjectWorkspace` los devuelve como `initialData`.

Siempre proteger esa sincronización con:

- comparación semántica del contenido
- guard para ignorar ecos de la última emisión

Patrón recomendado:

```js
lastEmittedSignatureRef.current = currentSignature;
if (incomingSignature === lastEmittedSignatureRef.current) return;
```

### 4. El selector de material vive en la banda de tabs

En NestxCut, el material debe ir junto a la tab activa, no en un panel separado debajo.

Regla:

- tabs a la izquierda
- el material cambia por tab activa

### Opción de creación recomendada

Cuando el usuario crea un nuevo despiece/tab:

- la tab nueva nace sin material
- la tab activa debe mostrar **solo el select de material**
- tabs inactivas muestran el **label del material** o `Seleccionar material` si todavía no se definió

Patrón visual:

- **tab activa** → select inline
- **tab inactiva** → texto compacto del material

Esto facilita que cada tab represente explícitamente:

> 1 despiece = 1 tablero/material

No mostrar simultáneamente en la tab activa:

- label arriba
- select abajo

Eso duplica información y ensucia la banda de tabs.

### 5. Celdas L1/L2/A1/A2 usan refs controladas

No aceptar texto libre ni números arbitrarios.

Las celdas de canto deben usar selects con refs definidas en `despiece.cantos`.

## UI Rules

- Tabs compactas, no gigantes
- botón `+` pequeño y consistente con NestxCut
- selector de material inline en la banda superior del despiece
- panel de cantos separado de la tabla
- resumen de cantos fuera de la tabla, no embutido en celdas

## Data Rules

### Canto por tab

```js
cantos: [
  {
    ref: 1,
    inventory_item_id,
    nombre,
    tipo,
    calibre,
    color,
  }
]
```

### Resumen derivado

Calcular desde filas:

- `L1`, `L2` usan `largo`
- `A1`, `A2` usan `ancho`
- multiplicar por `cantidad`

No guardar el resumen como fuente primaria.

## Common Anti-Patterns

Evitar:

- tabs sin `id` estable
- regenerar ids al normalizar
- poner `material_id` fuera del tab
- texto libre en `L1/L2/A1/A2`
- usar descripciones de canto directas en celdas
- sincronizar props->state sin guard de eco

## Files to Touch

- `src/features/despiece/utils/despieceModel.js`
- `src/features/despiece/utils/despieceCantos.js`
- `src/components/Despiece.jsx`
- `src/components/despiece/DespieceTabs.jsx`
- `src/components/despiece/DespieceCantosPanel.jsx`
- `src/components/despiece/DespieceCantoSummary.jsx`
- `src/components/despiece/DespieceTable.jsx`
- `src/components/sheet/TableSheet.jsx`

## Commands

```bash
# Buscar piezas del sistema de tabs de despiece
rg "DespieceTabs|material_id|cantos|activeDespieceId|normalizeInitialDespieces" src

# Buscar refs de canto en tabla
rg "l1|l2|a1|a2|inputType: 'select'|cantoOptions" src
```

## Resources

- **Modelo**: `src/features/despiece/utils/despieceModel.js`
- **Cantos**: `src/features/despiece/utils/despieceCantos.js`
- **UI principal**: `src/components/Despiece.jsx`
