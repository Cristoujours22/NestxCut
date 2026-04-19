---
name: nestxcut-inventory
description: >
  Guía de dominio para el módulo de inventario de NestxCut.
  Trigger: usar cuando el agente implemente, refactorice o extienda inventario, stock,
  tableros, herrajes, movimientos, reservas o integraciones con despiece/cotización.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

Usar esta skill cuando el trabajo involucre:

- Pantallas o lógica de **Inventario**
- CRUD de **tableros** o **herrajes**
- Cálculo de stock, alertas o movimientos
- Integración de inventario con **despiece**, **cotización**, **compras** o **proyectos**
- Diseño de formularios, tablas o filtros del inventario

No usar esta skill para:

- Servicios detectados del despiece
- Licenciamiento o auth
- Refactors genéricos de React que no toquen inventario

## Critical Patterns

### 1. Inventario NO es una sola tabla Frankenstein

Separar siempre la experiencia en dos dominios visibles:

- **Tableros**
- **Herrajes**

El backend puede compartir colección/tabla (`inventory_items`), pero el frontend debe mostrar:

- columnas distintas
- filtros distintos
- formularios distintos

### 2. Campos mínimos obligatorios

#### Tableros

- `nombre`
- `codigo`
- `material`
- `espesor_mm`
- `largo_mm`
- `ancho_mm`
- `cantidad_disponible`
- `stock_minimo`
- `costo_unitario`
- `ubicacion`

#### Herrajes

- `nombre`
- `codigo`
- `tipo`
- `medida`
- `presentacion`
- `cantidad_disponible`
- `stock_minimo`
- `costo_unitario`
- `ubicacion`

### 3. Stock real es una derivación, no una entrada manual

Usar siempre:

```js
stock_real = cantidad_disponible - cantidad_reservada
```

Nunca pedirle al usuario que cargue `stock_real` a mano.

### 4. Toda modificación relevante de stock debe generar movimiento

Cuando el módulo cambie stock, registrar un movimiento:

- `entrada`
- `salida`
- `ajuste`
- `reserva`
- `liberacion`
- `consumo`

MVP aceptado:

- alta de item con stock inicial → `entrada`
- cambio de cantidad → `ajuste`
- eliminación → `salida`

### 5. Integraciones futuras

Diseñar inventario pensando en:

- **Despiece** → sugerir tablero / validar stock
- **Cotización** → tomar costo real de materiales y herrajes
- **Compras** → detectar faltantes
- **Proyectos** → reservar stock por proyecto aprobado

No acoplar estas integraciones en el MVP; solo preparar el modelo.

## UI Rules

### Toolbar

Mantener:

- búsqueda
- filtro de estado
- filtro específico por tipo
- acción principal `Nuevo tablero` o `Nuevo herraje`

### Tablas

Tableros deben priorizar:

- material
- espesor
- medidas
- stock
- costo

Herrajes deben priorizar:

- tipo
- medida
- presentación
- stock
- costo

### Alertas

Mostrar como mínimo:

- agotados
- stock bajo
- conteo total de alertas activas

## Validation Rules

- `nombre` obligatorio
- `codigo` obligatorio
- números no negativos
- `material` obligatorio en tableros
- `tipo` obligatorio en herrajes
- evitar guardar formularios con campos básicos vacíos

## Data Model Reference

```js
// inventory_items
{
  id,
  item_type, // tablero | herraje
  nombre,
  codigo,
  cantidad_disponible,
  cantidad_reservada,
  stock_minimo,
  costo_unitario,
  proveedor,
  marca,
  ubicacion,
  notas,

  // tablero
  material,
  acabado,
  espesor_mm,
  largo_mm,
  ancho_mm,

  // herraje
  tipo,
  subtipo,
  medida,
  presentacion,
}
```

```js
// inventory_movements
{
  id,
  item_id,
  movement_type,
  cantidad,
  motivo,
  project_id,
  created_at,
}
```

## Commands

```bash
# Revisar módulo inventario en el proyecto
rg "Inventory|inventory|inventario" src electron

# Ver APIs Electron expuestas para inventario
rg "get-inventory|add-inventory|update-inventory|delete-inventory" electron src
```

## Resources

- **Implementación actual**: `src/components/inventory/`, `src/features/inventory/`
- **IPC actual**: `electron/ipc/inventoryHandlers.cjs`
- **Store**: `electron/services/storeService.cjs`
