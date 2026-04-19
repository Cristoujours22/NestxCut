import { useMemo, useRef, useState } from 'react';
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
}) {
  const [uncontrolledActiveCell, setUncontrolledActiveCell] = useState(null);
  const [uncontrolledIsEditing, setUncontrolledIsEditing] = useState(false);
  const [uncontrolledSelection, setUncontrolledSelection] = useState(null);
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

  const focusCell = (rowIndex, field) => {
    const input = inputRefs.current[`${rowIndex}-${field}`];
    if (!input) return;
    input.focus();
    input.select?.();
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

    onRowsChange((prevRows) => prevRows.map((row, index) => (
      index === rowIndex ? { ...row, [field]: sanitizedValue } : row
    )));
  };

  const handleAddRow = () => {
    onRowsChange((prevRows) => [...prevRows, createRow()]);
    setTimeout(() => focusCell(rows.length, fieldOrder[0]), 0);
  };

  const moveFocus = (event, rowIndex, fieldIndex) => {
    if (rowIndex >= 0 && rowIndex < rows.length && fieldIndex >= 0 && fieldIndex < fieldOrder.length) {
      event.preventDefault();
      focusCell(rowIndex, fieldOrder[fieldIndex]);
      return;
    }

    if (rowIndex === rows.length && fieldIndex === 0) {
      event.preventDefault();
      handleAddRow();
    }
  };

  const handleKeyDown = (event, rowIndex, field) => {
    const currentFieldIndex = fieldOrder.indexOf(field);
    const currentInput = inputRefs.current[`${rowIndex}-${field}`];

    switch (event.key) {
      case 'F2':
        event.preventDefault();
        setActiveCell({ rowIndex, field });
        setIsEditing(true);
        return;
      case 'Escape':
        setIsEditing(false);
        return;
      case 'Enter':
        if (rowIndex === rows.length - 1 && field === lastField) {
          event.preventDefault();
          handleAddRow();
          return;
        }
        moveFocus(event, rowIndex + 1, 0);
        return;
      case 'Tab':
        event.preventDefault();
        if (event.shiftKey) {
          if (currentFieldIndex > 0) moveFocus(event, rowIndex, currentFieldIndex - 1);
          else if (rowIndex > 0) moveFocus(event, rowIndex - 1, fieldOrder.length - 1);
          return;
        }

        if (currentFieldIndex < fieldOrder.length - 1) moveFocus(event, rowIndex, currentFieldIndex + 1);
        else moveFocus(event, rowIndex + 1, 0);
        return;
      case 'ArrowUp':
        moveFocus(event, rowIndex - 1, currentFieldIndex);
        return;
      case 'ArrowDown':
        moveFocus(event, rowIndex + 1, currentFieldIndex);
        return;
      case 'ArrowLeft':
        if (currentInput && currentInput.selectionStart === 0) {
          moveFocus(event, rowIndex, currentFieldIndex - 1);
        }
        return;
      case 'ArrowRight':
        if (currentInput && currentInput.selectionStart === currentInput.value.length) {
          moveFocus(event, rowIndex, currentFieldIndex + 1);
        }
        return;
      default:
        return;
    }
  };

  const handlePaste = (event, startRowIndex, startField) => {
    event.preventDefault();

    onRowsChange((prevRows) => {
      const { rows: nextRows, nextFocus } = applyClipboardToRows({
        clipboardText: event.clipboardData.getData('text/plain'),
        rows: prevRows,
        createRow,
        fieldOrder,
        startRowIndex,
        startField,
      });

      if (nextFocus) {
        setTimeout(() => focusCell(nextFocus.rowIndex, nextFocus.field), 0);
      }

      return nextRows;
    });
  };

  const renderHeaderGroups = () => {
    if (!headerGroups.length) return null;

    return (
      <tr>
        {headerGroups.map((group) => (
          <th
            key={`${group.label}-${group.colSpan}`}
            colSpan={group.colSpan}
            className="border-b border-r border-gray-600 p-1 font-semibold text-center text-xs uppercase tracking-wider"
          >
            {group.label}
          </th>
        ))}
        <th rowSpan={2} className="border-b border-gray-600 p-1 font-semibold text-xs uppercase tracking-wider col-actions" />
      </tr>
    );
  };

  return (
    <div className="align-middle inline-block min-w-full overflow-x-auto shadow sm:rounded-lg">
      <table id={tableId} className="sheet-table min-w-full divide-y divide-gray-600 bg-gray-800 border border-gray-600">
        <colgroup>
          {columns.map((column) => (
            <col
              key={`col-${column.key}`}
              style={{
                width: column.width,
                minWidth: column.minWidth,
              }}
            />
          ))}
          <col
            key="col-actions"
            style={{
              width: actionsColumn?.width,
              minWidth: actionsColumn?.minWidth,
            }}
          />
        </colgroup>
        <thead className="bg-gray-700 text-gray-200 sticky top-0 z-10">
          {renderHeaderGroups()}
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`border-b border-r border-gray-600 p-1 font-semibold text-xs uppercase tracking-wider ${column.className || ''}`}
              >
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
                const alignment = column.align === 'right'
                  ? 'text-right'
                  : column.align === 'center'
                    ? 'text-center'
                    : 'text-left';
                const isActive = activeCell?.rowIndex === rowIndex && activeCell?.field === column.key;
                let isSelected = false;

                if (selection?.start && selection?.end) {
                  const startRow = Math.min(selection.start.rowIndex, selection.end.rowIndex);
                  const endRow = Math.max(selection.start.rowIndex, selection.end.rowIndex);
                  const startColumn = Math.min(fieldOrder.indexOf(selection.start.field), fieldOrder.indexOf(selection.end.field));
                  const endColumn = Math.max(fieldOrder.indexOf(selection.start.field), fieldOrder.indexOf(selection.end.field));
                  isSelected = rowIndex >= startRow && rowIndex <= endRow && columnIndex >= startColumn && columnIndex <= endColumn;
                }

                return (
                  <td key={column.key} className={`border-b border-r border-gray-600 p-0 relative ${column.className || ''}`}>
                    {column.inputType === 'select' ? (
                      <select
                        ref={(el) => {
                          inputRefs.current[`${rowIndex}-${column.key}`] = el;
                        }}
                        value={value}
                        onChange={(event) => handleCellChange(rowIndex, column.key, event.target.value)}
                        onKeyDown={(event) => handleKeyDown(event, rowIndex, column.key)}
                        onFocus={() => setActiveCell({ rowIndex, field: column.key })}
                        onMouseDown={() => setIsEditing(true)}
                        onBlur={() => setIsEditing(false)}
                        onClick={(event) => {
                          setActiveCell({ rowIndex, field: column.key });
                          setIsEditing(true);
                          if (event.shiftKey && selection?.start) {
                            setSelection({ start: selection.start, end: { rowIndex, field: column.key } });
                          } else {
                            setSelection({ start: { rowIndex, field: column.key }, end: { rowIndex, field: column.key } });
                          }
                        }}
                        title={column.options?.find((option) => String(option.value) === String(value))?.title || ''}
                        style={{
                          backgroundColor: isSelected && !isActive ? '#15213b' : undefined,
                        }}
                        className={`input-cell h-full w-full p-1 bg-transparent border-none outline-none focus:outline-none focus:ring-2 focus:ring-[#00e0fe] focus:z-10 focus:relative text-white ${alignment} ${isActive ? 'ring-2 ring-[#00e0fe] z-10 relative' : ''}`}
                      >
                        {(column.options || []).map((option) => (
                          <option key={`${column.key}-${option.value}`} value={option.value} title={option.title || ''}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        ref={(el) => {
                          inputRefs.current[`${rowIndex}-${column.key}`] = el;
                        }}
                        type={column.inputType || 'text'}
                        inputMode={column.inputMode}
                        maxLength={column.maxLength}
                        step={column.step}
                        min={column.min}
                        value={value}
                        onChange={(event) => handleCellChange(rowIndex, column.key, event.target.value)}
                        onKeyDown={(event) => handleKeyDown(event, rowIndex, column.key)}
                        onPaste={(event) => handlePaste(event, rowIndex, column.key)}
                        onFocus={() => {
                          setActiveCell({ rowIndex, field: column.key });
                          setIsEditing(true);
                        }}
                        onMouseDown={() => setIsEditing(true)}
                        onBlur={() => setIsEditing(false)}
                        onClick={(event) => {
                          setActiveCell({ rowIndex, field: column.key });
                          setIsEditing(true);
                          if (event.shiftKey && selection?.start) {
                            setSelection({ start: selection.start, end: { rowIndex, field: column.key } });
                          } else {
                            setSelection({ start: { rowIndex, field: column.key }, end: { rowIndex, field: column.key } });
                          }
                        }}
                        onDoubleClick={() => {
                          setActiveCell({ rowIndex, field: column.key });
                          setIsEditing(true);
                        }}
                        placeholder={column.placeholder || ''}
                        style={{
                          backgroundColor: isSelected && !isActive ? '#15213b' : undefined,
                        }}
                        className={`input-cell h-full w-full p-1 bg-transparent border-none outline-none focus:outline-none focus:ring-2 focus:ring-[#00e0fe] focus:z-10 focus:relative text-white ${alignment} ${isActive ? 'ring-2 ring-[#00e0fe] z-10 relative' : ''}`}
                      />
                    )}
                  </td>
                );
              })}
              <td className="border-b border-gray-600 p-0 text-center align-middle col-actions">
                {rows.length > 1 && (
                  <button
                    onClick={() => onRemoveRow(rowIndex)}
                    className="text-red-400 hover:text-red-300 p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-red-500 rounded"
                    title="Eliminar fila"
                    aria-label={`Eliminar fila ${rowIndex + 1}`}
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
