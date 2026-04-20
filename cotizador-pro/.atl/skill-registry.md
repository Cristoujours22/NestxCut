# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| usar cuando el agente implemente, refactorice o extienda inventario, stock, tableros, herrajes, movimientos, reservas o integraciones con despiece/cotización | nestxcut-inventory | C:\Users\Cristian\Desktop\DespieceAPP\cotizador-pro\.agents\skills\nestxcut-inventory\SKILL.md |
| usar cuando el agente implemente, refactorice o depure tabs de despiece, selección de material por tab, cantos por tab o sincronización parent-child del despiece | nestxcut-despiece-tabs | C:\Users\Cristian\Desktop\DespieceAPP\cotizador-pro\.agents\skills\nestxcut-despiece-tabs\SKILL.md |
| usar cuando el agente implemente, depure o refactorice navegación, selección, edición rápida, edición inmersiva, pegado o creación de filas en tablas tipo grilla | nestxcut-sheet-cells | C:\Users\Cristian\Desktop\DespieceAPP\cotizador-pro\.agents\skills\nestxcut-sheet-cells\SKILL.md |
| electron, contextBridge, IPC, security, packaging, react, desktop app | electron-best-practices | C:\Users\Cristian\Desktop\DespieceAPP\cotizador-pro\.agents\skills\electron-best-practices\SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### nestxcut-inventory
- Separar siempre inventario en dominios visibles: tableros, herrajes y, en este proyecto, cantos.
- `stock_real` es derivado: `cantidad_disponible - cantidad_reservada`; nunca pedirlo manual.
- Toda modificación relevante de stock debe generar movimiento (`entrada`, `salida`, `ajuste`, `reserva`, `liberacion`, `consumo`).
- Tableros y herrajes usan columnas, filtros y formularios distintos aunque el backend comparta store.
- Diseñar inventario pensando en integración futura con despiece y cotización, sin acoplarla de forma frágil.
- Mantener toolbar con búsqueda, filtros y CTA específico por dominio.

### nestxcut-despiece-tabs
- Cada tab de despiece es un contexto completo: `{ id, nombre, material_id, cantos, filas }`.
- No regenerar IDs al normalizar; usar fallback determinístico (`desp_${index}`, `row_${despieceIndex}_${rowIndex}`).
- Proteger sincronización parent-child con guard semántico para evitar loops y ecos.
- El selector de material vive en la banda de tabs; tabs inactivas muestran label compacto.
- `L1/L2/A1/A2` deben depender de refs de cantos controladas; no aceptar texto libre arbitrario.
- Mantener panel de cantos separado de la tabla y resumen derivado fuera de las celdas.

### nestxcut-sheet-cells
- Separar siempre `selection`, `quick` e `immersive`; una celda activa no implica edición.
- Click simple selecciona; doble click o `F2` entran en inmersiva.
- Escribir sobre celda seleccionada activa edición rápida; `Backspace/Delete` limpian y entran en quick.
- En `quick`, flechas o `Escape` cierran edición y navegan; en `immersive`, flechas no navegan la grilla.
- En `immersive`, no seleccionar todo automáticamente; permitir `Ctrl+V` dentro del texto sin reemplazo forzado.
- Al crear fila nueva, resolver foco post-render con pending focus para evitar bloqueos de navegación.

### electron-best-practices
- Mantener `contextIsolation: true`, `sandbox: true` y `nodeIntegration: false`.
- Exponer APIs por `contextBridge`, nunca `ipcRenderer` crudo al renderer.
- Preferir patrón `invoke/handle` para request-response entre renderer y main.
- Validar argumentos IPC y serializar errores con resultado controlado (`success/data/error`).
- El renderer React no debe depender de Node directo; todo acceso nativo pasa por preload.
- Mantener CSP estricta y evitar `unsafe-eval` fuera del entorno de desarrollo.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| package.json | C:\Users\Cristian\Desktop\DespieceAPP\cotizador-pro\package.json | React 18 + Vite 6 + Electron 28 + react-router-dom 7 + Tailwind 4 + Firebase |
| .gitignore | C:\Users\Cristian\Desktop\DespieceAPP\cotizador-pro\.gitignore | `.atl` ignorado para no contaminar commits del proyecto |

## Project-Specific Technical Notes

- Firebase se usa para auth/suscripción (`src/firebase.js`, `src/context/AuthContext.jsx`).
- Datos de negocio usan `window.electronAPI` / SQLite o store local: proyectos, inventario, servicios y settings.
- `ProjectWorkspace` es la ruta real del editor de proyecto; la ruta estática `/despiece` debe reutilizar el mismo módulo real.
- `ServicesModal.jsx` es la implementación más completa para servicios; `ServicesPanel.jsx` queda como versión paralela/legacy.
- `InventoryPage.jsx` es la pantalla real de inventario y debe exponerse por ruta protegida.

## Recommended Auto-Use

- Si se toca `src/components/inventory/` o `src/features/inventory/` → inyectar `nestxcut-inventory`.
- Si se toca `src/components/despiece/`, `src/components/sheet/` o sincronización con `ProjectWorkspace` → inyectar `nestxcut-despiece-tabs`.
- Si se toca comportamiento por celda, teclado, focus o clipboard de grillas → inyectar `nestxcut-sheet-cells`.
- Si se toca `electron/`, preload, IPC o seguridad renderer/main → inyectar `electron-best-practices`.
