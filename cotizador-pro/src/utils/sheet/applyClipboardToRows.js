export const applyClipboardToRows = ({
  clipboardText,
  rows,
  createRow,
  fieldOrder,
  startRowIndex,
  startField,
}) => {
  const parsedRows = clipboardText
    .split(/\r?\n/)
    .filter((row) => row.trim() !== '')
    .map((row) => row.split('\t'));

  if (!parsedRows.length) {
    return { rows, nextFocus: null };
  }

  const startFieldIndex = fieldOrder.indexOf(startField);
  if (startFieldIndex === -1) {
    return { rows, nextFocus: null };
  }

  const nextRows = rows.map((row) => ({ ...row }));

  parsedRows.forEach((parsedRow, rowOffset) => {
    const targetRowIndex = startRowIndex + rowOffset;

    while (targetRowIndex >= nextRows.length) {
      nextRows.push(createRow());
    }

    parsedRow.forEach((cellValue, columnOffset) => {
      const targetFieldIndex = startFieldIndex + columnOffset;
      if (targetFieldIndex >= fieldOrder.length) return;

      const targetField = fieldOrder[targetFieldIndex];
      nextRows[targetRowIndex][targetField] = cellValue;
    });
  });

  const lastRowIndex = startRowIndex + parsedRows.length - 1;
  const lastColumnIndex = startFieldIndex + parsedRows[parsedRows.length - 1].length - 1;
  const nextColumnIndex = lastColumnIndex + 1;

  let nextFocus = null;
  if (nextColumnIndex < fieldOrder.length) {
    nextFocus = { rowIndex: lastRowIndex, field: fieldOrder[nextColumnIndex] };
  } else if (lastRowIndex + 1 < nextRows.length) {
    nextFocus = { rowIndex: lastRowIndex + 1, field: fieldOrder[0] };
  }

  return { rows: nextRows, nextFocus };
};
