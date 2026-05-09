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
  onUndo,
  onRedo,
}) {
  // Estado: celda activa = { rowIndex, field }
  const [activePos, setActivePos] = useState(null);
  const [editMode, setEditMode] = useState('selection');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRefs = useRef({});
  const pendingFocusRef = useRef(null);
  const focusFrameRef = useRef(null);
  const focusTimeoutRef = useRef(null);

  const fieldOrder = useMemo(() => columns.map(c => c.key), [columns]);
  const lastField = fieldOrder[fieldOrder.length - 1];
  const activeRow = activePos?.rowIndex;
  const activeField = activePos?.field;
  const isEditing = editMode !== 'selection';

  const clearScheduledFocus = useCallback(() => {
    if (focusFrameRef.current !== null) {
      cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = null;
    }
    if (focusTimeoutRef.current !== null) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
  }, []);

  const scheduleFocus = useCallback((callback) => {
    clearScheduledFocus();
    focusFrameRef.current = requestAnimationFrame(() => {
      focusTimeoutRef.current = setTimeout(() => {
        focusFrameRef.current = null;
        focusTimeoutRef.current = null;
        callback();
      }, 0);
    });
  }, [clearScheduledFocus]);

  const focusInput = useCallback((rowIndex, field, { selectAll = true, cursorToEnd = false } = {}) => {
    scheduleFocus(() => {
      const input = inputRefs.current[`${rowIndex}-${field}`];
      if (input) {
        input.focus();
        if (selectAll && typeof input.select === 'function') {
          input.select();
        }
        if (cursorToEnd && typeof input.setSelectionRange === 'function') {
          const end = String(input.value ?? '').length;
          input.setSelectionRange(end, end);
        }
      }
    });
  }, [scheduleFocus]);

  const focusCell = (rowIndex, field, mode = 'selection', focusOptions = undefined) => {
    setActivePos({ rowIndex, field });
    setEditMode(mode);
    if (mode !== 'selection') {
      focusInput(rowIndex, field, focusOptions);
    } else {
      focusSelectedCell(rowIndex, field);
    }
  };

  const focusSelectedCell = useCallback((rowIndex, field) => {
    scheduleFocus(() => {
      const input = inputRefs.current[`${rowIndex}-${field}`];
      if (input) {
        input.focus();
      }
    });
  }, [scheduleFocus]);

  // Undo/Redo
  const saveHistory = useCallback(() => {
    const state = JSON.stringify(rows);
    setHistory(prev => {
      const h = prev.slice(0, historyIndex + 1);
      h.push(state);
      return h.length > 50 ? h.slice(1) : h;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [rows, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      onRowsChange(() => JSON.parse(history[historyIndex - 1]));
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex, onRowsChange]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      onRowsChange(() => JSON.parse(history[historyIndex + 1]));
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex, onRowsChange]);

  useEffect(() => {
    if (onUndo) onUndo(undo);
    if (onRedo) onRedo(redo);
  }, [undo, redo, onUndo, onRedo]);

  useEffect(() => () => {
    clearScheduledFocus();
  }, [clearScheduledFocus]);

  useEffect(() => {
    if (!pendingFocusRef.current) return;
    const { rowIndex, field, mode = 'selection' } = pendingFocusRef.current;
    if (rowIndex >= rows.length) {
      pendingFocusRef.current = null;
      return;
    }

    pendingFocusRef.current = null;
    if (mode === 'selection') {
      focusSelectedCell(rowIndex, field);
    } else {
      focusInput(rowIndex, field, { selectAll: false, cursorToEnd: true });
    }
  }, [rows.length]);

  const sanitize = (field, value) => {
    if (['l1', 'l2', 'a1', 'a2'].includes(field)) {
      if (value === '') return '';
      if (!/^\d+$/.test(value)) return null;
      const n = Number(value);
      if (n < 1 || n > 8) return null;
      return String(n);
    }
    if (field === 'rotar') return value === '1' ? '1' : '';
    return value;
  };

  // Handle cambio - activa celda y guarda
  const handleChange = (rowIndex, field, value) => {
    const v = sanitize(field, value);
    if (v === null) return;
    saveHistory();
    setActivePos({ rowIndex, field });
    onRowsChange(prev => prev.map((r, i) => i === rowIndex ? { ...r, [field]: v } : r));
  };

  const handleQuickEdit = (rowIndex, field, event) => {
    const isActiveCell = activeRow === rowIndex && activeField === field;
    if (!isActiveCell || isEditing) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      handleChange(rowIndex, field, '');
      setEditMode('quick');
      focusInput(rowIndex, field, { selectAll: false, cursorToEnd: true });
      return;
    }

    if (event.key.length === 1) {
      event.preventDefault();
      handleChange(rowIndex, field, event.key);
      setEditMode('quick');
      focusInput(rowIndex, field, { selectAll: false, cursorToEnd: true });
    }
  };

  const addRow = () => {
    const nextRowIndex = rows.length;
    saveHistory();
    onRowsChange(prev => [...prev, createRow()]);
    setActivePos({ rowIndex: nextRowIndex, field: fieldOrder[0] });
    setEditMode('selection');
    pendingFocusRef.current = { rowIndex: nextRowIndex, field: fieldOrder[0], mode: 'selection' };
  };

  const handleKeyDown = (e, rowIndex, field) => {
    const fieldIdx = fieldOrder.indexOf(field);

    // Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { undo(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Z')) { redo(); return; }

    if (e.key === 'F2') {
      e.preventDefault();
      focusCell(rowIndex, field, 'immersive', { selectAll: false, cursorToEnd: true });
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setEditMode('selection');
      return;
    }

    if (editMode === 'immersive') {
      if (e.key === 'Enter') {
        e.preventDefault();
        setEditMode('selection');
      } else if (e.key === 'Tab') {
        e.preventDefault();
      }
      return;
    }

    if (!isEditing) {
      handleQuickEdit(rowIndex, field, e);
      if (e.defaultPrevented) return;
    }

    // Navigation - siempre funciona
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          focusCell(rowIndex - 1, field, 'selection');
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (rowIndex < rows.length - 1) {
          focusCell(rowIndex + 1, field, 'selection');
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (fieldIdx > 0) {
          focusCell(rowIndex, fieldOrder[fieldIdx - 1], 'selection');
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (fieldIdx < fieldOrder.length - 1) {
          focusCell(rowIndex, fieldOrder[fieldIdx + 1], 'selection');
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (rowIndex < rows.length - 1) {
          focusCell(rowIndex + 1, field, 'selection');
        } else if (field === lastField) {
          addRow();
        }
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          if (fieldIdx > 0) {
            focusCell(rowIndex, fieldOrder[fieldIdx - 1], 'selection');
          } else if (rowIndex > 0) {
            focusCell(rowIndex - 1, lastField, 'selection');
          }
        } else {
          if (fieldIdx < fieldOrder.length - 1) {
            focusCell(rowIndex, fieldOrder[fieldIdx + 1], 'selection');
          } else {
            addRow();
          }
        }
        break;
      default:
        break;
    }
  };

  // Click = selecciona celda (sin enfocar, sin editar)
  const handleClick = (rowIndex, field, e) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePos({ rowIndex, field });
    setEditMode('selection');
    focusSelectedCell(rowIndex, field);
  };

  // Doble click = enfoca y permite editar
  const handleDblClick = (rowIndex, field, e) => {
    e.preventDefault();
    e.stopPropagation();
    focusCell(rowIndex, field, 'immersive', { selectAll: false, cursorToEnd: true });
  };

  const handlePaste = (e, rowIdx, fld) => {
    if (editMode === 'immersive') {
      return;
    }
    e.preventDefault();
    onRowsChange(prev => {
      const { rows: r } = applyClipboardToRows({
        clipboardText: e.clipboardData.getData('text/plain'),
        rows: prev,
        createRow,
        fieldOrder,
        startRowIndex: rowIdx,
        startField: fld,
      });
      return r;
    });
  };

  const renderHeaders = () => {
    if (!headerGroups.length) return null;
    return (
      <tr>
        {headerGroups.map(g => (
          <th key={g.label} colSpan={g.colSpan} className="border-b border-r border-gray-600 p-2 font-bold text-xs uppercase text-center">
            {g.label}
          </th>
        ))}
        <th rowSpan={2} className="border-b border-gray-600 p-2 font-bold text-xs uppercase" />
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table id={tableId} className="w-full bg-gray-800 border border-gray-600">
        <colgroup>
          {columns.map(c => <col key={c.key} style={{ width: c.width }} />)}
          <col style={{ width: actionsColumn?.width }} />
        </colgroup>
        <thead className="bg-gray-700 text-gray-200 sticky top-0">
          {renderHeaders()}
          <tr>
            {columns.map(c => (
              <th key={c.key} className="border-b border-r border-gray-600 p-2 text-xs font-bold uppercase">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-600">
          {rows.map((row, rowIdx) => (
            <tr key={row.id || rowIdx} className="hover:bg-gray-700/70">
              {columns.map(col => {
                const isActive = activeRow === rowIdx && activeField === col.key;
                const cellId = `${rowIdx}-${col.key}`;
                const alignment = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';

                return (
                  <td key={col.key} className="border-b border-r border-gray-600 p-0" style={{ height: '36px' }}>
                    {col.inputType === 'select' ? (
                      <select
                        id={cellId}
                        ref={el => inputRefs.current[cellId] = el}
                        value={row[col.key] || ''}
                        onChange={e => handleChange(rowIdx, col.key, e.target.value)}
                        onMouseDown={e => e.preventDefault()}
                        onClick={e => handleClick(rowIdx, col.key, e)}
                        onDoubleClick={e => handleDblClick(rowIdx, col.key, e)}
                        onKeyDown={e => handleKeyDown(e, rowIdx, col.key)}
                        style={{ width: '100%', height: '100%', cursor: isActive ? 'pointer' : 'pointer' }}
                        className={`w-full h-full px-2 bg-transparent border-none text-white ${alignment} ${isActive ? 'ring-2 ring-cyan-400' : ''}`}
                      >
                        {(col.options || []).map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={cellId}
                        ref={el => inputRefs.current[cellId] = el}
                        value={row[col.key] || ''}
                        onChange={e => handleChange(rowIdx, col.key, e.target.value)}
                        onMouseDown={e => editMode === 'selection' && e.preventDefault()}
                        onClick={e => handleClick(rowIdx, col.key, e)}
                        onDoubleClick={e => handleDblClick(rowIdx, col.key, e)}
                        onKeyDown={e => handleKeyDown(e, rowIdx, col.key)}
                        onPaste={e => handlePaste(e, rowIdx, col.key)}
                        readOnly={!isActive || editMode === 'selection'}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          cursor: isActive && editMode !== 'selection' ? 'text' : 'pointer',
                          caretColor: isActive && editMode !== 'selection' ? 'auto' : 'transparent'
                        }}
                        className={`w-full h-full px-2 bg-transparent border-none outline-none text-white ${alignment} ${isActive ? 'ring-2 ring-cyan-400' : ''}`}
                      />
                    )}
                  </td>
                );
              })}
              <td className="border-b border-gray-600 p-0 text-center w-16">
                {rows.length > 1 && (
                  <button onClick={() => { saveHistory(); onRemoveRow(rowIdx); }} className="text-red-400 hover:text-red-300 p-2">
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
