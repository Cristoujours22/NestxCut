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
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRefs = useRef({});

  const fieldOrder = useMemo(() => columns.map(c => c.key), [columns]);
  const lastField = fieldOrder[fieldOrder.length - 1];
  const activeRow = activePos?.rowIndex;
  const activeField = activePos?.field;

  const focusInput = (rowIndex, field) => {
    setTimeout(() => {
      const input = inputRefs.current[`${rowIndex}-${field}`];
      if (input) {
        input.focus();
        input.select();
      }
    }, 10);
  };

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

  const addRow = () => {
    saveHistory();
    onRowsChange(prev => [...prev, createRow()]);
    setTimeout(() => focusInput(rows.length, fieldOrder[0]), 50);
  };

  const handleKeyDown = (e, rowIndex, field) => {
    const fieldIdx = fieldOrder.indexOf(field);
    const isActive = activeRow === rowIndex && activeField === field;

    // Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { undo(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Z')) { redo(); return; }

    // Navigation - siempre funciona
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          setActivePos({ rowIndex: rowIndex - 1, field });
          focusInput(rowIndex - 1, field);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (rowIndex < rows.length - 1) {
          setActivePos({ rowIndex: rowIndex + 1, field });
          focusInput(rowIndex + 1, field);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (fieldIdx > 0) {
          setActivePos({ rowIndex, field: fieldOrder[fieldIdx - 1] });
          focusInput(rowIndex, fieldOrder[fieldIdx - 1]);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (fieldIdx < fieldOrder.length - 1) {
          setActivePos({ rowIndex, field: fieldOrder[fieldIdx + 1] });
          focusInput(rowIndex, fieldOrder[fieldIdx + 1]);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (rowIndex < rows.length - 1) {
          setActivePos({ rowIndex: rowIndex + 1, field });
          focusInput(rowIndex + 1, field);
        }
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          if (fieldIdx > 0) {
            setActivePos({ rowIndex, field: fieldOrder[fieldIdx - 1] });
            focusInput(rowIndex, fieldOrder[fieldIdx - 1]);
          } else if (rowIndex > 0) {
            setActivePos({ rowIndex: rowIndex - 1, field: lastField });
            focusInput(rowIndex - 1, lastField);
          }
        } else {
          if (fieldIdx < fieldOrder.length - 1) {
            setActivePos({ rowIndex, field: fieldOrder[fieldIdx + 1] });
            focusInput(rowIndex, fieldOrder[fieldIdx + 1]);
          } else {
            addRow();
          }
        }
        break;
      case 'Escape':
        setActivePos(null);
        break;
      case 'F2':
        e.preventDefault();
        setActivePos({ rowIndex, field });
        focusInput(rowIndex, field);
        break;
    }
  };

  // Click = selecciona celda
  const handleClick = (rowIndex, field, e) => {
    setActivePos({ rowIndex, field });
  };

  // Doble click = enfoca y permite editar
  const handleDblClick = (rowIndex, field) => {
    setActivePos({ rowIndex, field });
    focusInput(rowIndex, field);
  };

  const handlePaste = (e, rowIdx, fld) => {
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
                        onFocus={() => handleClick(rowIdx, col.key, {})}
                        style={{ width: '100%', height: '100%' }}
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
                        onFocus={() => handleClick(rowIdx, col.key, {})}
                        onClick={e => handleClick(rowIdx, col.key, e)}
                        onDoubleClick={() => handleDblClick(rowIdx, col.key)}
                        onKeyDown={e => handleKeyDown(e, rowIdx, col.key)}
                        onPaste={e => handlePaste(e, rowIdx, col.key)}
                        style={{ width: '100%', height: '100%' }}
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