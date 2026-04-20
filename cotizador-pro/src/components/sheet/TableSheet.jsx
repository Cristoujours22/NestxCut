import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { applyClipboardToRows } from '../../utils/sheet/applyClipboardToRows';

function TableSheet({
  tableId,
  columns,
  rows,
  createRow,
  onRowsChange,
  onRemoveRow,
  headerGroups = [],
  actionsColumn,
  activeCell: controlledActiveCell,
  onActiveCellChange,
  isEditing: controlledIsEditing,
  onEditingChange,
  selection: controlledSelection,
  onSelectionChange,
  onUndo,
  onRedo,
}) {
  const [uncontrolledActiveCell, setUncontrolledActiveCell] = useState(null);
  const [uncontrolledIsEditing, setUncontrolledIsEditing] = useState(false);
  const [uncontrolledSelection, setUncontrolledSelection] = useState(null);
  const [dragSelection, setDragSelection] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRefs = useRef({});

  const activeCell = controlledActiveCell ?? uncontrolledActiveCell;
  const isEditing = controlledIsEditing ?? uncontrolledIsEditing;
  const selection = controlledSelection ?? uncontrolledSelection;

  const setActiveCell = (value) => {
    if (onActiveCellChange) onActiveCellChange(value);
    else setUncontrolledActiveCell(value);
  };

  const setIsEditing = (value) => {
    if (onEditingChange) onEditingChange(value);
    else setUncontrolledIsEditing(value);
  };

  const setSelection = (value) => {
    if (onSelectionChange) onSelectionChange(value);
    else setUncontrolledSelection(value);
  };

  const fieldOrder = useMemo(() => columns.map((column) => column.key), [columns]);
  const columnsByKey = useMemo(
    () => Object.fromEntries(columns.map((column) => [column.key, column])),
    [columns]
  );
  const lastField = fieldOrder[fieldOrder.length - 1];

  // Historial
  const saveToHistory = useCallback(() => {
    const currentState = JSON.stringify(rows);
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(currentState);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [rows, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = JSON.parse(history[historyIndex - 1]);
      onRowsChange(() => prevState);
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex, onRowsChange]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = JSON.parse(history[historyIndex + 1]);
      onRowsChange(() => nextState);
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex, onRowsChange]);

  // Exponer undo/redo
  useEffect(() => {
    if (onUndo) onUndo(undo);
    if (onRedo) onRedo(redo);
  }, [undo, redo, onUndo, onRedo]);

  const focusCell = (rowIndex, field, editing = true) => {
    setActiveCell({ rowIndex, field });
    setIsEditing(editing);
    setTimeout(() => {
      const input = inputRefs.current[`${rowIndex}-${field}`];
      if (input) {
        input.focus();
        if (editing) input.select();
      }
    }, 0);
  };

  const sanitizeValue = (field, value) => {
    if (['l1', 'l2', 'a1', 'a2'].includes(field)) {
      if (value === '') return '';
      if (!/^\d+$/.test(value)) return null;
      const numeric = Number(value);
      if (numeric < 1 || numeric > 8) return null;
      const allowedValues = columnsByKey[field]?.allowedValues || [];
      const normalized = String(numeric);
      if (allowedValues.length > 0 && !allowedValues.includes(normalized)) return null;
      return normalized;
    }
    if (field === 'rotar') {
      if (value === '') return '';
      if (value === '1') return '1';
      return null;
    }
    return value;
  };

  const handleCellChange = (rowIndex, field, value) => {
    const sanitizedValue = sanitizeValue(field, value);
    if (sanitizedValue === null) return;

    saveToHistory();
    onRowsChange((prevRows) => prevRows.map((row, index) => (
      index === rowIndex ? { ...row, [field]: sanitizedValue } : row
    )));
  };

  const handleAddRow = () => {
    saveToHistory();
    onRowsChange((prevRows) => [...prevRows, createRow()]);
    setTimeout(() => focusCell(rows.length, fieldOrder[0]), 0);
  };

  // Handle keyDown - navegación
  const handleKeyDown = (e, rowIndex, field) => {
    const currentFieldIndex = fieldOrder.indexOf(field);
    
    // Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
      return;
    }
    
    // Editing mode control
    if (e.key === 'F2') {
      e.preventDefault();
      setIsEditing(true);
      focusCell(rowIndex, field, true);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      return;
    }
    
    // Solo navegar si NO está editando, o siempre según necesidad
    if (!isEditing) {
      switch (e.key) {
        case 'ArrowUp':
          if (rowIndex > 0) {
            e.preventDefault();
            focusCell(rowIndex - 1, field, false);
          }
          break;
        case 'ArrowDown':
          if (rowIndex < rows.length - 1) {
            e.preventDefault();
            focusCell(rowIndex + 1, field, false);
          }
          break;
        case 'ArrowLeft':
          if (currentFieldIndex > 0) {
            e.preventDefault();
            focusCell(rowIndex, fieldOrder[currentFieldIndex - 1], false);
          }
          break;
        case 'ArrowRight':
          if (currentFieldIndex < fieldOrder.length - 1) {
            e.preventDefault();
            focusCell(rowIndex, fieldOrder[currentFieldIndex + 1], false);
          }
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            if (currentFieldIndex > 0) focusCell(rowIndex, fieldOrder[currentFieldIndex - 1], false);
            else if (rowIndex > 0) focusCell(rowIndex - 1, lastField, false);
          } else {
            if (currentFieldIndex < fieldOrder.length - 1) focusCell(rowIndex, fieldOrder[currentFieldIndex + 1], false);
            else focusCell(rowIndex + 1, fieldOrder[0], false);
          }
          break;
        case 'Enter':
        case 'F2':
          e.preventDefault();
          focusCell(rowIndex, field, true);
          break;
        default:
          break;
      }
    } else {
      // Cuando está editando
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          setIsEditing(false);
          if (rowIndex < rows.length - 1) {
            focusCell(rowIndex + 1, field, false);
          } else if (field === lastField) {
            handleAddRow();
          }
          break;
        case 'Tab':
          e.preventDefault();
          setIsEditing(false);
          if (e.shiftKey) {
            if (currentFieldIndex > 0) focusCell(rowIndex, fieldOrder[currentFieldIndex - 1], false);
            else if (rowIndex > 0) focusCell(rowIndex - 1, lastField, false);
          } else {
            if (currentFieldIndex < fieldOrder.length - 1) focusCell(rowIndex, fieldOrder[currentFieldIndex + 1], false);
            else handleAddRow();
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsEditing(false);
          break;
        default:
          break;
      }
    }
  };

  // Clickcelda
  const handleCellClick = (rowIndex, field, e) => {
    const isMultiSelect = e.shiftKey;
    setActiveCell({ rowIndex, field });
    setIsEditing(false);
    
    if (isMultiSelect && selection?.start) {
      setSelection({ start: selection.start, end: { rowIndex, field } });
    } else {
      setSelection({ start: { rowIndex, field }, end: { rowIndex, field } });
    }
  };

  // Doble click - entrar en modo edición
  const handleCellDoubleClick = (rowIndex, field) => {
    setActiveCell({ rowIndex, field });
    setIsEditing(true);
    setTimeout(() => {
      const input = inputRefs.current[`${rowIndex}-${field}`];
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  };

  // Drag selection - onMouseEnter mientras arrastra
  const handleDragEnter = (rowIndex, field) => {
    if (dragSelection && dragSelection.startIndex !== null && dragSelection.startField) {
      setDragSelection(prev => ({ 
        ...prev, 
        endIndex: rowIndex, 
        endField: field 
      }));
    }
  };

  // Terminar drag
  const handleMouseUp = () => {
    if (dragSelection && dragSelection.startIndex !== null) {
      // Aplicar drag fill
      const { startIndex, startField, endIndex, endField, value } = dragSelection;
      if (value !== undefined && value !== '') {
        const startRow = Math.min(startIndex, endIndex);
        const endRow = Math.max(startIndex, endIndex);
        const fields = ['cant', 'largo', 'ancho', 'detalle', 'rotar', 'l1', 'l2', 'a1', 'a2'];
        const i1 = fields.indexOf(startField);
        const i2 = fields.indexOf(endField);
        if (i1 !== -1 && i2 !== -1) {
          const startF = Math.min(i1, i2);
          const endF = Math.max(i1, i2);
          
          saveToHistory();
          onRowsChange(prevRows => {
            const newRows = [...prevRows];
            for (let r = startRow; r <= endRow; r++) {
              for (let f = startF; f <= endF; f++) {
                if (newRows[r]) {
                  newRows[r] = { ...newRows[r], [fields[f]]: value };
                }
              }
            }
            return newRows;
          });
        }
      }
      setDragSelection(null);
    }
  };

  const handlePaste = (e, startRowIndex, startField) => {
    e.preventDefault();
    onRowsChange((prevRows) => {
      const { rows: nextRows, nextFocus } = applyClipboardToRows({
        clipboardText: e.clipboardData.getData('text/plain'),
        rows: prevRows,
        createRow,
        fieldOrder,
        startRowIndex,
        startField,
      });
      if (nextFocus) {
        setTimeout(() => focusCell(nextFocus.rowIndex, nextFocus.field, false), 0);
      }
      return nextRows;
    });
  };

  const renderHeaderGroups = () => {
    if (!headerGroups.length) return null;
    return (
      <tr>
        {headerGroups.map((group) => (
          <th key={`${group.label}-${group.colSpan}`} colSpan={group.colSpan} className="border-b border-r border-gray-600 p-2 font-semibold text-center text-xs uppercase tracking-wider">
            {group.label}
          </th>
        ))}
        <th rowSpan={2} className="border-b border-gray-600 p-2 font-semibold text-xs uppercase tracking-wider col-actions" />
      </tr>
    );
  };

  return (
    <div className="align-middle inline-block min-w-full overflow-x-auto shadow sm:rounded-lg" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <table id={tableId} className="sheet-table w-full bg-gray-800 border border-gray-600">
        <colgroup>
          {columns.map((column) => (
            <col key={`col-${column.key}`} style={{ width: column.width, minWidth: column.minWidth }} />
          ))}
          <col style={{ width: actionsColumn?.width, minWidth: actionsColumn?.minWidth }} />
        </colgroup>
        <thead className="bg-gray-700 text-gray-200 sticky top-0 z-10">
          {renderHeaderGroups()}
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="border-b border-r border-gray-600 p-2 font-semibold text-xs uppercase tracking-wider">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-600">
          {rows.map((row, rowIndex) => (
            <tr key={row.id || rowIndex} className="group hover:bg-gray-700/70">
              {columns.map((column) => {
                const value = row[column.key] ?? '';
                const columnIndex = fieldOrder.indexOf(column.key);
                const alignment = column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';
                
                const isActive = activeCell?.rowIndex === rowIndex && activeCell?.field === column.key;
                const isReadOnly = !isActive || !isEditing;
                
                let isSelected = false;
                if (selection?.start && selection?.end) {
                  const startRow = Math.min(selection.start.rowIndex, selection.end.rowIndex);
                  const endRow = Math.max(selection.start.rowIndex, selection.end.rowIndex);
                  const startColumn = Math.min(fieldOrder.indexOf(selection.start.field), fieldOrder.indexOf(selection.end.field));
                  const endColumn = Math.max(fieldOrder.indexOf(selection.start.field), fieldOrder.indexOf(selection.end.field));
                  isSelected = rowIndex >= startRow && rowIndex <= endRow && columnIndex >= startColumn && columnIndex <= endColumn;
                }

                let isDragTarget = false;
                if (dragSelection && dragSelection.startIndex !== null) {
                  const startF = fieldOrder.indexOf(dragSelection.startField);
                  const endF = fieldOrder.indexOf(dragSelection.endField || dragSelection.startField);
                  const minF = Math.min(startF, endF);
                  const maxF = Math.max(startF, endF);
                  const minR = Math.min(dragSelection.startIndex, dragSelection.endIndex);
                  const maxR = Math.max(dragSelection.startIndex, dragSelection.endIndex);
                  isDragTarget = rowIndex >= minR && rowIndex <= maxR && columnIndex >= minF && columnIndex <= maxF;
                }

                const cellId = `${rowIndex}-${column.key}`;
                const inputStyle = {
                  width: '100%',
                  height: '100%',
                  outline: isActive ? '2px solid #1a73e8' : (isSelected ? '1px solid rgba(26, 115, 232, 0.5)' : 'none'),
                  outlineOffset: '-2px',
                  cursor: isEditing && isActive ? 'text' : 'cell',
                  caretColor: isActive && isEditing ? 'auto' : 'transparent',
                  backgroundColor: isDragTarget ? '#2c3e50' : (isSelected && !isActive ? '#15213b' : 'transparent'),
                };

                return (
                  <td key={column.key} className="border-b border-r border-gray-600 p-0" style={{ height: '36px' }}>
                    {column.inputType === 'select' ? (
                      <select
                        ref={(el) => { inputRefs.current[cellId] = el; }}
                        value={value}
                        onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
                        onClick={(e) => handleCellClick(rowIndex, column.key, e)}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, column.key)}
                        onFocus={() => handleCellClick(rowIndex, column.key, {})}
                        readOnly={!isActive}
                        style={inputStyle}
                        className={`input-cell w-full h-full px-2 bg-transparent border-none text-white ${alignment} ${isActive ? 'ring-2 ring-[#00e0fe]' : ''}`}
                      >
                        {(column.options || []).map((option) => (
                          <option key={`${column.key}-${option.value}`} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        ref={(el) => { inputRefs.current[cellId] = el; }}
                        type={column.inputType || 'text'}
                        inputMode={column.inputMode}
                        maxLength={column.maxLength}
                        step={column.step}
                        min={column.min}
                        value={value}
                        onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
                        onClick={(e) => handleCellClick(rowIndex, column.key, e)}
                        onDoubleClick={() => handleCellDoubleClick(rowIndex, column.key)}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, column.key)}
                        onPaste={(e) => handlePaste(e, rowIndex, column.key)}
                        onMouseEnter={() => handleDragEnter(rowIndex, column.key)}
                        readOnly={isReadOnly}
                        style={inputStyle}
                        className={`input-cell w-full h-full px-2 bg-transparent border-none outline-none text-white ${alignment} ${isActive ? 'ring-2 ring-[#00e0fe]' : ''}`}
                      />
                    )}
                  </td>
                );
              })}
              <td className="border-b border-gray-600 p-0 text-center align-middle w-16">
                {rows.length > 1 && (
                  <button
                    onClick={() => { saveToHistory(); onRemoveRow(rowIndex); }}
                    className="text-red-400 hover:text-red-300 p-2 opacity-0 group-hover:opacity-100"
                    title="Eliminar fila"
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
  );
}

export default TableSheet;