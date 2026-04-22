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

function createSheet(index, boardWidth, boardHeight) {
  return {
    index,
    pieces: [],
    freeRects: [{ x: 0, y: 0, width: boardWidth, height: boardHeight }],
  };
}

function canFit(rect, width, height) {
  return width <= rect.width && height <= rect.height;
}

function scoreFit(rect, width, height) {
  const waste = (rect.width * rect.height) - (width * height);
  const shortSide = Math.min(rect.width - width, rect.height - height);
  return { waste, shortSide };
}

function pickBestFreeRect(freeRects, piece) {
  let best = null;

  freeRects.forEach((rect, rectIndex) => {
    const options = [
      { rotated: false, width: piece.width, height: piece.height },
      ...(piece.canRotate ? [{ rotated: true, width: piece.height, height: piece.width }] : []),
    ];

    options.forEach((option) => {
      if (!canFit(rect, option.width, option.height)) return;
      const fit = scoreFit(rect, option.width, option.height);
      if (!best || fit.waste < best.fit.waste || (fit.waste === best.fit.waste && fit.shortSide < best.fit.shortSide)) {
        best = { rect, rectIndex, option, fit };
      }
    });
  });

  return best;
}

function splitFreeRect(sheet, rectIndex, placed, kerf) {
  const rect = sheet.freeRects[rectIndex];
  const rightX = rect.x + placed.width + kerf;
  const bottomY = rect.y + placed.height + kerf;
  const rightWidth = rect.width - placed.width - kerf;
  const bottomHeight = rect.height - placed.height - kerf;

  const nextRects = sheet.freeRects.filter((_, index) => index !== rectIndex);

  if (rightWidth > 0) {
    nextRects.push({
      x: rightX,
      y: rect.y,
      width: rightWidth,
      height: placed.height,
    });
  }

  if (bottomHeight > 0) {
    nextRects.push({
      x: rect.x,
      y: bottomY,
      width: rect.width,
      height: bottomHeight,
    });
  }

  sheet.freeRects = nextRects.filter((candidate) => candidate.width > 0 && candidate.height > 0);
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
  const boardUsableWidth = Math.max(0, boardWidth - kerf);
  const boardUsableHeight = Math.max(0, boardHeight - kerf);

  const unplaced = [];

  pieces
    .sort((a, b) => (b.width * b.height) - (a.width * a.height))
    .forEach((piece) => {
      let placed = false;

      for (const sheet of sheets) {
        const best = pickBestFreeRect(sheet.freeRects, piece);
        if (!best) continue;

        const placedPiece = {
          ...piece,
          rotated: best.option.rotated,
          x: best.rect.x,
          y: best.rect.y,
          width: best.option.width,
          height: best.option.height,
        };

        sheet.pieces.push(placedPiece);
        splitFreeRect(sheet, best.rectIndex, placedPiece, kerf);
        placed = true;
        break;
      }

      if (!placed) {
        const newSheet = createSheet(sheets.length + 1, boardUsableWidth, boardUsableHeight);
        const best = pickBestFreeRect(newSheet.freeRects, piece);
        if (!best) {
          unplaced.push(piece);
          return;
        }

        const placedPiece = {
          ...piece,
          rotated: best.option.rotated,
          x: best.rect.x,
          y: best.rect.y,
          width: best.option.width,
          height: best.option.height,
        };

        newSheet.pieces.push(placedPiece);
        splitFreeRect(newSheet, best.rectIndex, placedPiece, kerf);
        sheets.push(newSheet);
        placed = true;
      }

      if (!placed) {
        unplaced.push(piece);
      }
    });

  return { sheets, unplaced };
}
