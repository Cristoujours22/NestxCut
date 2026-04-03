// src/components/Despiece.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext'; // Para acceder a user y logout
import { Link } from 'react-router-dom';

// Define la estructura inicial de una fila de despiece
const createNewRow = () => ({
    id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    cantidad: '', largo: '', ancho: '', detalle: '', 
    l1: '', l2: '', a1: '', a2: '',
});

// Define el orden de los campos correspondiente a las columnas visibles
const fieldOrder = ['cantidad', 'largo', 'ancho', 'detalle material', 'l1', 'l2', 'a1', 'a2'];
const lastField = fieldOrder[fieldOrder.length - 1]; // El último campo editable ('a2')

// Define los nombres de las clases CSS para cada columna
const columnClasses = {
    cantidad: 'col-cantidad', largo: 'col-largo', ancho: 'col-ancho',
    detalle: 'col-detalle', l1: 'col-l1',
    l2: 'col-l2', a1: 'col-a1', a2: 'col-a2', actions: 'col-actions'
};

// --- Componente Principal Despiece ---
function Despiece({ initialData, onChange, isNested }) {
    const { user, logout } = useAuth();
    const [rows, setRows] = useState(initialData && initialData.length > 0 ? initialData : [createNewRow()]);
    const [error, setError] = useState('');
    const [activeCell, setActiveCell] = useState(null);
    const inputRefs = useRef({});

    // --- Placeholder States for Summary ---
    const [laminaCount, setLaminaCount] = useState(0);
    const [piezaCount, setPiezaCount] = useState(0);
    const [cantoRigido, setCantoRigido] = useState(0);
    const [cantoFlexible, setCantoFlexible] = useState(0);

    // --- Funciones (handleAddRow, handleInputChange, handleKeyDown, handleRemoveRow, handlePaste) ---

    const handleAddRow = useCallback(() => {
        const newRow = createNewRow();
        setRows(prevRows => [...prevRows, newRow]);
        setTimeout(() => {
            const newRowIndex = rows.length; // Corrected index
            const firstField = fieldOrder[0];
            const inputKey = `${newRowIndex}-${firstField}`;
            inputRefs.current[inputKey]?.focus();
        }, 0);
    }, [rows.length]); // Use rows.length directly

    const handleInputChange = useCallback((index, field, value) => {
        setRows(prevRows => {
            const newRows = prevRows.map((row, i) => {
                if (i === index) {
                    return { ...row, [field]: value };
                }
                return row;
            });
            return newRows;
        });
        if (error) setError('');
    }, [error]);

    // Transmit changes up to Workspace
    useEffect(() => {
        if (onChange) {
            onChange(rows);
        }
    }, [rows, onChange]);

    const handleKeyDown = useCallback((event, rowIndex, field) => {
        const currentInputKey = `${rowIndex}-${field}`;
        const currentInput = inputRefs.current[currentInputKey];
        const currentFieldIndex = fieldOrder.indexOf(field);

        const moveFocus = (newRowIndex, newFieldIndex) => {
            if (newRowIndex >= 0 && newRowIndex < rows.length && newFieldIndex >= 0 && newFieldIndex < fieldOrder.length) {
                const nextField = fieldOrder[newFieldIndex];
                const nextInputKey = `${newRowIndex}-${nextField}`;
                const nextInput = inputRefs.current[nextInputKey];
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select(); // Select text in the next input
                    event.preventDefault();
                }
            } else if (newRowIndex === rows.length && newFieldIndex === 0) {
                // If trying to move past the last row, add a new row and focus its first cell
                handleAddRow();
                 event.preventDefault();
            }
        };

        switch (event.key) {
            case 'Enter':
                 // Add new row only if Enter is pressed in the last cell of the last row
                if (rowIndex === rows.length - 1 && field === lastField) {
                    event.preventDefault();
                    handleAddRow();
                } else {
                    // Otherwise, move to the first cell of the next row (or add row if last)
                     moveFocus(rowIndex + 1, 0);
                }
                break;
            case 'Tab':
                // Allow default Tab behavior for now, could customize later if needed
                // If Shift+Tab on first cell or Tab on last cell, default behavior is fine
                 if (event.shiftKey && rowIndex === 0 && currentFieldIndex === 0) return;
                 if (!event.shiftKey && rowIndex === rows.length - 1 && field === lastField) {
                    // Prevent adding row on Tab in last cell, let it move focus out or handleAddRow?
                    // For now, prevent default to stop focus leaving grid easily, and manually add row
                    event.preventDefault();
                    handleAddRow();
                    return;
                 }
                  // Let browser handle other tab cases within the grid for simplicity
                 // OR implement full tab navigation:
                 /*
                 event.preventDefault();
                 if (event.shiftKey) {
                     if (currentFieldIndex > 0) moveFocus(rowIndex, currentFieldIndex - 1);
                     else if (rowIndex > 0) moveFocus(rowIndex - 1, fieldOrder.length - 1);
                 } else {
                     if (currentFieldIndex < fieldOrder.length - 1) moveFocus(rowIndex, currentFieldIndex + 1);
                     else if (rowIndex < rows.length - 1) moveFocus(rowIndex + 1, 0);
                     else handleAddRow(); // Add row if tabbing from last cell
                 }
                 */
                break;
            case 'ArrowUp':
                moveFocus(rowIndex - 1, currentFieldIndex);
                break;
            case 'ArrowDown':
                moveFocus(rowIndex + 1, currentFieldIndex);
                break;
            case 'ArrowLeft':
                // Move left only if cursor is at the beginning of the input
                 if (currentInput && currentInput.selectionStart === 0) {
                    moveFocus(rowIndex, currentFieldIndex - 1);
                 }
                break;
            case 'ArrowRight':
                 // Move right only if cursor is at the end of the input
                 if (currentInput && currentInput.selectionStart === currentInput.value.length) {
                    moveFocus(rowIndex, currentFieldIndex + 1);
                 }
                break;
            default:
                break;
        }
    }, [rows.length, handleAddRow, lastField]);

    const handleRemoveRow = (indexToRemove) => {
        setRows(prevRows => prevRows.filter((_, index) => index !== indexToRemove));
    };

    const handlePaste = useCallback((event, startRowIndex, startField) => {
        event.preventDefault();
        const pasteData = event.clipboardData.getData('text/plain');
        const parsedRows = pasteData
            .split(/\r?\n/)
            .filter(row => row.trim() !== '')
            .map(row => row.split('\t'));

        if (parsedRows.length === 0) return;

        setRows(prevRows => {
            let newRows = prevRows.map(row => ({ ...row })); // Shallow copy existing rows
            const startFieldIndex = fieldOrder.indexOf(startField);

            if (startFieldIndex === -1) {
                 console.error("Paste starting field not found in fieldOrder");
                 return prevRows; // Should not happen if called correctly
            }

            let maxRowIndexAffected = startRowIndex;

            parsedRows.forEach((parsedRowData, rowIndexOffset) => {
                const targetRowIndex = startRowIndex + rowIndexOffset;
                maxRowIndexAffected = Math.max(maxRowIndexAffected, targetRowIndex);

                // Add new rows if paste goes beyond current rows
                while (targetRowIndex >= newRows.length) {
                    newRows.push(createNewRow());
                }

                parsedRowData.forEach((cellValue, colIndexOffset) => {
                    const targetFieldIndex = startFieldIndex + colIndexOffset;
                    // Ensure we don't paste beyond the defined fields
                    if (targetFieldIndex < fieldOrder.length) {
                        const targetField = fieldOrder[targetFieldIndex];
                        if (newRows[targetRowIndex]) {
                            newRows[targetRowIndex][targetField] = cellValue;
                        }
                    }
                });
            });

             // Optional: Set focus to the cell after the last pasted cell
             setTimeout(() => {
                 const lastPastedRowIndex = startRowIndex + parsedRows.length - 1;
                 const lastPastedColIndex = startFieldIndex + parsedRows[parsedRows.length - 1].length - 1;

                 let nextFocusRowIndex = lastPastedRowIndex;
                 let nextFocusFieldIndex = lastPastedColIndex + 1;

                 // If next field index is out of bounds, move to the first field of the next row
                 if (nextFocusFieldIndex >= fieldOrder.length) {
                     nextFocusRowIndex++;
                     nextFocusFieldIndex = 0;
                 }

                 // Ensure the target focus cell exists
                 if (nextFocusRowIndex < newRows.length && nextFocusFieldIndex < fieldOrder.length) {
                     const nextField = fieldOrder[nextFocusFieldIndex];
                     const inputKey = `${nextFocusRowIndex}-${nextField}`;
                     inputRefs.current[inputKey]?.focus();
                     inputRefs.current[inputKey]?.select();
                 } else if (lastPastedRowIndex + 1 < newRows.length) {
                     // Fallback: if calculation failed, try focusing the first cell of the row after the paste ended
                      const nextField = fieldOrder[0];
                      const inputKey = `${lastPastedRowIndex + 1}-${nextField}`;
                      inputRefs.current[inputKey]?.focus();
                      inputRefs.current[inputKey]?.select();
                 }

             }, 0);

            return newRows;
        });

        if (error) setError('');
    }, [error]); // Removed fieldOrder from dependencies as it's constant

    // --- Función para guardar los datos (Placeholder) ---
    const handleSaveChanges = async () => {
        setError('');
        console.log("[Despiece] Attempting to save changes...");
        // Filter out potentially empty rows added automatically but not filled
        const dataToSave = rows.filter(row =>
            fieldOrder.some(field => row[field] && row[field].toString().trim() !== '')
        );
        console.log("Data to save:", dataToSave);

        // Validation: Check if essential fields are filled in non-empty rows
        const isEmptyRow = dataToSave.some(row => !row.cantidad || !row.detalle);
        if (isEmptyRow) {
            setError("Por favor, completa al menos Cantidad y Detalle en todas las filas antes de guardar.");
            return;
        }

        try {
            if (!window.electronAPI || typeof window.electronAPI.invoke !== 'function') {
                console.log("Running outside Electron environment. Skipping IPC invoke.");
                alert("Funcionalidad 'Guardar Cambios' aún no implementada en el backend (main.cjs). Datos mostrados en consola.");
                return;
            }
            // const result = await window.electronAPI.invoke('save-despiece-data', dataToSave); // Use filtered data
            // console.log('[Despiece] Save result:', result);
             alert("Funcionalidad 'Guardar Cambios' aún no implementada en el backend (main.cjs). Datos mostrados en consola.");
             // Implement actual saving logic here
        } catch (err) {
            console.error('[Despiece] Error saving changes:', err);
            setError(`Error al guardar: ${err.message || 'Error desconocido'}`);
        }
    };

    // --- Función para Exportar (Placeholder) ---
    const handleExport = () => {
        console.log("[Despiece] Exportar Despiece clicked (implementar lógica)");
        alert("Funcionalidad 'Exportar Despiece' no implementada.");
        // Add actual export logic here (e.g., generate CSV/Excel)
    };

    // --- Cálculo de totales ---
    useEffect(() => {
        // Filter out rows where 'cantidad' is not a positive number
        const validRows = rows.filter(row => Number(row.cantidad) > 0);

        const totalPiezas = validRows.reduce((sum, row) => sum + Number(row.cantidad), 0);
        setPiezaCount(totalPiezas);

        // Example logic (adjust as needed)
        setLaminaCount(Math.ceil(totalPiezas / 10)); // Assuming 10 pieces per sheet
        setCantoRigido(totalPiezas * 2); // Assuming 2m rigid edge per piece
        setCantoFlexible(totalPiezas * 1.5); // Assuming 1.5m flexible edge per piece

    }, [rows]);


    // --- Renderizado del Componente ---
    return (
        <div className={`flex flex-col flex-1 ${isNested ? '' : 'h-screen'} bg-[#0a1122] text-[#dee5ff]`}>
            {/* Si NO estamos anidados, mostrar top bar falso para fallback, si no delegar al Workspace */}
            {!isNested && (
                <header className="flex justify-between items-center p-4 bg-[#060e20] border-b border-[#1a233a]">
                    <div className="font-bold">Despiece Standalone</div>
                    <button onClick={logout} className="text-red-400">Salir</button>
                </header>
            )}

            {/* Sección de Resumen */}
            <div className="shrink-0 bg-[#060e20] border-b border-[#1a233a] p-3 flex items-center justify-center gap-6 text-sm font-bold text-[#a3aac4]">
                <div className="flex gap-2 items-center"><span className="material-symbols-outlined text-[#00e0fe]">layers</span> Cant. Láminas: <span className="text-white">{laminaCount}</span></div>
                <div className="flex gap-2 items-center"><span className="material-symbols-outlined text-[#00e0fe]">grid_on</span> Cant. Piezas: <span className="text-white">{piezaCount}</span></div>
                <div className="flex gap-2 items-center"><span className="material-symbols-outlined text-[#00e0fe]">straighten</span> Canto Rígido: <span className="text-white">{cantoRigido.toFixed(2)}m</span></div>
                <div className="flex gap-2 items-center"><span className="material-symbols-outlined text-[#00e0fe]">gesture</span> Canto Flexible: <span className="text-white">{cantoFlexible.toFixed(2)}m</span></div>
            </div>

             {/* Mensaje de Error General */}
            {error && (
                <div className="flex-shrink-0 bg-red-500/20 text-red-300 font-bold text-center p-2 text-sm border-b border-red-500/30">
                    Error: {error}
                </div>
            )}

            {/* Contenedor de la tabla con scroll */}
            <div className="flex-grow overflow-auto p-4">
                {/* Usamos min-w-full para asegurar que la tabla intente ocupar el ancho */}
                 {/* overflow-hidden en el wrapper puede ser problemático con sticky header, revisar si es necesario */}
                 {/* border-b border-gray-200 en wrapper - ¿aplicar a tabla directamente? */}
                <div className="align-middle inline-block min-w-full shadow sm:rounded-lg">
                    {/* Tabla de Despiece */}
                    <table className="despiece-table min-w-full divide-y divide-gray-600 bg-gray-800 border border-gray-600"> {/* Ajustado color de división y añadido borde */}
                        <thead className="bg-gray-700 text-gray-200 sticky top-0 z-10"> {/* Texto ya es claro aquí */}
                            {/* Encabezados de tabla */} 
                            <tr>
                                 
                            </tr> 
                            <tr>
                            </tr>
                            <tr>
                            </tr>
                            <tr>
                            </tr>
                            <tr>
                            </tr>  
                            <tr>
                            </tr>
                            <tr>
                            </tr>
                            <tr>
                                {/* Usamos border-gray-600 para consistencia con tema oscuro */}
                                <th colSpan="3" className="border-b border-r border-gray-600 p-1 font-semibold text-center text-xs uppercase tracking-wider">MEDIDAS</th>
                                <th colSpan="2" className="border-b border-r border-gray-600 p-1 font-semibold text-center text-xs uppercase tracking-wider"></th>
                                <th colSpan="3" className="border-b border-r border-gray-600 p-1 font-semibold text-center text-xs uppercase tracking-wider">CANTO</th>
                                <th rowSpan="2" className={`border-b border-gray-600 p-1 font-semibold ${columnClasses.actions}`}></th> {/* Columna acciones sin borde derecho en CSS */}
                            </tr>
                            <tr>
                                {/* Fila 2 de Encabezados - Usamos border-gray-600 */}
                                <th className={`border-b border-r border-gray-600 p-1 font-semibold text-xs uppercase tracking-wider ${columnClasses.cantidad}`}>CANT</th>
                                <th className={`border-b border-r border-gray-600 p-1 font-semibold text-xs uppercase tracking-wider ${columnClasses.largo}`}>LARGO</th>
                                <th className={`border-b border-r border-gray-600 p-1 font-semibold text-xs uppercase tracking-wider ${columnClasses.ancho}`}>ANCHO</th>
                                <th className={`border-b border-r border-gray-600 p-1 font-semibold text-xs uppercase tracking-wider col-detalle`}>DETALLE MATERIAL</th>
                                <th className={`border-b border-r border-gray-600 p-1 font-semibold text-center text-xs uppercase tracking-wider ${columnClasses.l1}`}>L1</th>
                                <th className={`border-b border-r border-gray-600 p-1 font-semibold text-center text-xs uppercase tracking-wider ${columnClasses.l2}`}>L2</th>
                                <th className={`border-b border-r border-gray-600 p-1 font-semibold text-center text-xs uppercase tracking-wider ${columnClasses.a1}`}>A1</th>
                                <th className={`border-b border-r border-gray-600 p-1 font-semibold text-center text-xs uppercase tracking-wider ${columnClasses.a2}`}>A2</th>
                            </tr>
                        </thead>
                        {/* Usamos divide-gray-600 para tema oscuro */}
                        <tbody className="divide-y divide-gray-600">
                            {/* Mapeo de filas y celdas */}
                            {rows.map((row, index) => (
                                <tr key={row.id} className="group hover:bg-gray-700">
                                    {/* Renderizamos las celdas */}
                                    {fieldOrder.map((field) => (
                                        // Usamos border-gray-600
                                        field === 'detalle material' ? (
                                            <td key="detalle" className={`border-b border-r border-gray-600 p-0 relative col-detalle`}>
                                                <input
                                                    type="text"
                                                    value={row.detalle}
                                                    onChange={(e) => handleInputChange(index, 'detalle', e.target.value)}
                                                    className="input-cell h-full p-1 bg-transparent border-none outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 focus:relative text-white"
                                                    placeholder="Detalle"
                                                />
                                            </td>
                                        ) : (
                                            <td key={field} className={`border-b border-r border-gray-600 p-0 relative ${columnClasses[field]}`}>
                                                <input
                                                    ref={(el) => { inputRefs.current[`${index}-${field}`] = el; }}
                                                    type={field === 'cantidad' || field === 'largo' || field === 'ancho' || field.startsWith('l') || field.startsWith('a') ? "number" : "text"}
                                                    step={field === 'cantidad' ? "1" : "any"} // Allows decimals for dimensions
                                                    min={field === 'cantidad' ? "1" : undefined} // Min quantity 1?
                                                    value={row[field]}
                                                    onChange={(e) => handleInputChange(index, field, e.target.value)}
                                                    onPaste={(e) => handlePaste(e, index, field)}
                                                    onKeyDown={(e) => handleKeyDown(e, index, field)}
                                                    onFocus={() => setActiveCell({ rowIndex: index, field })}
                                                    onBlur={() => setActiveCell(null)}
                                                    // Clases para estilo: Texto blanco, sin fondo/borde, foco azul, alineación
                                                    className={`input-cell h-full w-full p-1 bg-transparent border-none outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 focus:relative text-white ${field === 'cantidad' ? 'text-center' : ''} ${field === 'largo' || field === 'ancho' || field.startsWith('l') || field.startsWith('a') ? 'text-right' : 'text-left'} ${activeCell?.rowIndex === index && activeCell?.field === field ? 'ring-2 ring-blue-500 z-10 relative' : ''} `}
                                                    placeholder={field === 'cantidad' ? '0' : ''} // Placeholder subtle
                                                />
                                            </td>
                                        )
                                    ))}
                                    {/* Celda de acciones (Eliminar) - Usamos border-gray-600 */}
                                    <td className={`border-b border-gray-600 p-0 text-center align-middle ${columnClasses.actions}`}>
                                        {rows.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveRow(index)}
                                                className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-red-500 rounded"
                                                title="Eliminar fila"
                                                aria-label={`Eliminar fila ${index + 1}`}
                                            >
                                                X
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Botón Añadir Fila al final, fuera del scroll */}
                 {/* <div className="p-4 flex-shrink-0">
                    <button
                        onClick={handleAddRow}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                    >
                        Añadir Fila
                    </button>
                 </div> */}
            </div>
             {/* Pie de página (opcional) */}
             {/* <footer className="footer"> ... </footer> */}
        </div>
    );
}

export default Despiece;