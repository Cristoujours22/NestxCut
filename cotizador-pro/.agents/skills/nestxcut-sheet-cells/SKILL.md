---
name: nestxcut-sheet-cells
description: >
  Guía para implementar y mantener el comportamiento de celdas tipo Excel en NestxCut.
  Trigger: usar cuando el agente implemente, depure o refactorice navegación, selección,
  edición rápida, edición inmersiva, pegado o creación de filas en tablas tipo grilla.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

Usar esta skill cuando el trabajo toque:

- `TableSheet.jsx`
- tablas tipo grilla con comportamiento tipo Excel
- navegación por teclado entre celdas
- selección simple de celdas
- edición rápida o inmersiva
- copy/paste en celdas o filas
- creación de filas al final de la tabla

No usar esta skill para:

- modales o formularios convencionales
- tablas solamente visuales sin interacción por celda
- tabs de despiece o cantos si no se modifica la grilla

## Critical Patterns

### 1. Separar selección de edición

Una celda activa NO significa que está en edición.

Mantener un estado explícito de modo:

```js
editMode = 'selection' | 'quick' | 'immersive'
```

Reglas:

- `selection` → la celda está seleccionada, pero no se escribe todavía
- `quick` → se activó al teclear desde selección
- `immersive` → se activó con doble click o `F2`

### 2. Contrato UX obligatorio

| Acción | Resultado |
|--------|-----------|
| Click simple | Selecciona celda |
| Doble click | Entra en edición inmersiva |
| F2 | Entra en edición inmersiva |
| Escribir en selección | Activa edición rápida |
| Escape en quick | Vuelve a selección |
| Escape en immersive | Sale de inmersiva y vuelve a selección |
| Enter en immersive | Sale de inmersiva |
| Flechas en selection | Navegan |
| Flechas en quick | Salen de quick y navegan |
| Flechas en immersive | NO deben navegar la grilla |

### 3. Edición rápida no selecciona todo

Cuando la edición rápida arranca por tecla imprimible o `Backspace/Delete`:

- no usar `select()` sobre todo el contenido
- dejar el cursor al final
- permitir seguir escribiendo de manera natural

Patrón:

```js
focusInput(row, field, { selectAll: false, cursorToEnd: true })
```

### 4. Edición inmersiva permite editar texto real

En modo inmersivo:

- permitir `Ctrl+V` dentro del texto
- NO seleccionar automáticamente todo el contenido al entrar
- el cursor debe quedar al final salvo que el usuario cambie la posición

Nunca romper la edición normal del input con navegación global cuando el modo es `immersive`.

### 5. El foco de selección debe ser real

Si la grilla navega con flechas en modo selección, la celda nueva debe recibir foco real.

Si no hay foco real:

- la navegación funciona una sola vez
- la siguiente flecha se pierde

Usar helper explícito para foco de selección:

```js
focusSelectedCell(rowIndex, field)
```

### 6. Crear fila nueva sin race conditions

Al crear fila desde la última celda:

- setear primero `activePos`
- usar `pendingFocusRef` si hace falta esperar el re-render
- resolver el foco después del render real

No depender solo de `setTimeout` suelto sin guard de render.

### 7. Paste tiene dos comportamientos distintos

- En `immersive` → dejar pegar dentro del input nativo
- En `selection` o `quick` → interceptar y usar parser de tabla (`applyClipboardToRows`)

### 8. Selects y refs controladas

Las celdas tipo select (`L1/L2/A1/A2`) no deben comportarse exactamente igual que inputs de texto.

Reglas:

- navegación por teclado debe seguir funcionando
- no aceptar texto arbitrario
- respetar validación del rango permitido

## Common Anti-Patterns

Evitar:

- usar solo `isActive` como equivalente de edición
- enfocar input en click simple si la intención era solo seleccionar
- usar `select()` al entrar en inmersiva cuando el usuario necesita pegar sin reemplazar todo
- navegar la grilla con flechas mientras el usuario está editando en inmersiva
- crear fila nueva y luego intentar enfocar con un timeout ciego

## Files to Touch

- `src/components/sheet/TableSheet.jsx`
- `src/utils/sheet/applyClipboardToRows.js`
- `src/components/despiece/DespieceTable.jsx`

## Commands

```bash
# Revisar grilla y navegación
rg "TableSheet|handleKeyDown|handleQuickEdit|focusCell|pendingFocusRef" src

# Revisar pegado de clipboard
rg "applyClipboardToRows|onPaste" src
```

## Resources

- **Tabla principal**: `src/components/sheet/TableSheet.jsx`
- **Parser clipboard**: `src/utils/sheet/applyClipboardToRows.js`
- **Tabla de despiece**: `src/components/despiece/DespieceTable.jsx`
