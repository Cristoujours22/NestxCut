function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePiece(row, index) {
  const width = toNumber(row?.ancho);
  const height = toNumber(row?.largo);
  const quantity = Math.max(0, toNumber(row?.cantidad ?? row?.cant));
  const canRotate = String(row?.rotar || '').trim() === '1';

  return {
    id: row?.id || `piece_${index}`,
    label: row?.detalle?.trim() || `Pieza ${index + 1}`,
    width,
    height,
    quantity,
    canRotate,
  };
}

export function buildNestingPreview({ rows = [], boardWidth = 0, boardHeight = 0, kerf = 5 }) {
  const pieces = rows
    .map(normalizePiece)
    .filter((piece) => piece.width > 0 && piece.height > 0 && piece.quantity > 0)
    .flatMap((piece) => Array.from({ length: piece.quantity }, (_, index) => ({
      ...piece,
      instanceId: `${piece.id}_${index}`,
    })));

  if (!boardWidth || !boardHeight || pieces.length === 0) {
    return { sheets: [], unplaced: pieces };
  }

  const sheets = [];
  let currentSheet = { index: 1, pieces: [] };
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;

  const pushSheet = () => {
    if (currentSheet.pieces.length > 0) sheets.push(currentSheet);
    currentSheet = { index: sheets.length + 1, pieces: [] };
    cursorX = 0;
    cursorY = 0;
    rowHeight = 0;
  };

  const placePiece = (piece, rotated = false) => {
    const pieceWidth = rotated ? piece.height : piece.width;
    const pieceHeight = rotated ? piece.width : piece.height;

    if (cursorX + pieceWidth > boardWidth) {
      cursorX = 0;
      cursorY += rowHeight + kerf;
      rowHeight = 0;
    }

    if (cursorY + pieceHeight > boardHeight) {
      pushSheet();
    }

    if (pieceWidth > boardWidth || pieceHeight > boardHeight) {
      return false;
    }

    if (cursorX + pieceWidth > boardWidth) {
      cursorX = 0;
      cursorY += rowHeight + kerf;
      rowHeight = 0;
    }

    if (cursorY + pieceHeight > boardHeight) {
      pushSheet();
    }

    currentSheet.pieces.push({
      ...piece,
      rotated,
      x: cursorX,
      y: cursorY,
      width: pieceWidth,
      height: pieceHeight,
    });

    cursorX += pieceWidth + kerf;
    rowHeight = Math.max(rowHeight, pieceHeight);
    return true;
  };

  const unplaced = [];

  pieces
    .sort((a, b) => (b.width * b.height) - (a.width * a.height))
    .forEach((piece) => {
      const placed = placePiece(piece, false)
        || (piece.canRotate ? placePiece(piece, true) : false);

      if (!placed) {
        unplaced.push(piece);
      }
    });

  if (currentSheet.pieces.length > 0) sheets.push(currentSheet);

  return { sheets, unplaced };
}
