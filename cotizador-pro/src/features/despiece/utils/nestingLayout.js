function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePiece(row, index, allowGlobalRotation = false) {
  const width = toNumber(row?.largo);
  const height = toNumber(row?.ancho);
  const quantity = Math.max(0, toNumber(row?.cantidad ?? row?.cant));
  const canRotate = allowGlobalRotation || String(row?.rotar || '').trim() === '1';

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
  const longSide = Math.max(rect.width - width, rect.height - height);
  const longSideFree = Math.max(rect.width - width, rect.height - height);
  return { waste, shortSide, longSide, longSideFree };
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
      if (!best
        || fit.waste < best.fit.waste
        || (fit.waste === best.fit.waste && fit.shortSide < best.fit.shortSide)
        || (fit.waste === best.fit.waste && fit.shortSide === best.fit.shortSide && fit.longSide < best.fit.longSide)) {
        best = { rect, rectIndex, option, fit };
      }
    });
  });

  return best;
}

function isContained(inner, outer) {
  return inner.x >= outer.x
    && inner.y >= outer.y
    && inner.x + inner.width <= outer.x + outer.width
    && inner.y + inner.height <= outer.y + outer.height;
}

function pruneFreeRects(freeRects) {
  return freeRects.filter((rect, index) => !freeRects.some((other, otherIndex) => (
    index !== otherIndex && isContained(rect, other)
  )));
}

function splitFreeRect(sheet, rectIndex, placed, kerf) {
  const rect = sheet.freeRects[rectIndex];
  const remainingW = rect.width - placed.width - kerf;
  const remainingH = rect.height - placed.height - kerf;

  const nextRects = sheet.freeRects.filter((_, index) => index !== rectIndex);

  if (remainingW <= kerf && remainingH <= kerf) {
    sheet.freeRects = nextRects;
    return;
  }

  // Shorter leftover axis: choose the split that maximizes the larger free area.
  // Option A: horizontal split first → right rect (full height) + bottom rect (piece width only)
  // Option B: vertical split first   → right rect (piece height only) + bottom rect (full width)
  const areaA = Math.max(remainingW * rect.height, placed.width * remainingH);
  const areaB = Math.max(remainingW * placed.height, rect.width * remainingH);

  if (areaA >= areaB) {
    if (remainingW > kerf) {
      nextRects.push({ x: rect.x + placed.width + kerf, y: rect.y, width: remainingW, height: rect.height });
    }
    if (remainingH > kerf) {
      nextRects.push({ x: rect.x, y: rect.y + placed.height + kerf, width: placed.width, height: remainingH });
    }
  } else {
    if (remainingW > kerf) {
      nextRects.push({ x: rect.x + placed.width + kerf, y: rect.y, width: remainingW, height: placed.height });
    }
    if (remainingH > kerf) {
      nextRects.push({ x: rect.x, y: rect.y + placed.height + kerf, width: rect.width, height: remainingH });
    }
  }

  sheet.freeRects = pruneFreeRects(
    nextRects.filter((candidate) => candidate.width > kerf && candidate.height > kerf)
  );
}

export function buildNestingPreview({ rows = [], boardWidth = 0, boardHeight = 0, kerf = 5, allowGlobalRotation = false }) {
  const pieces = rows
    .map((row, originalIndex) => ({
      piece: normalizePiece(row, originalIndex, allowGlobalRotation),
      originalRowIndex: originalIndex
    }))
    .filter(({ piece }) => piece.width > 0 && piece.height > 0 && piece.quantity > 0)
    .flatMap(({ piece, originalRowIndex }) => Array.from({ length: piece.quantity }, (_, index) => ({
      ...piece,
      instanceId: `${piece.id}_${index}`,
      originalRowIndex: originalRowIndex // Preserve reference to original row
    })));

  if (!boardWidth || !boardHeight || pieces.length === 0) {
    return { sheets: [], unplaced: pieces };
  }

  // Try two sort strategies — shelf-grouped and largest-first — pick best
  const strategies = [
    // Strategy A: Width descending (shelf packing — group same-width pieces)
    (a, b) => {
      if (b.width - a.width !== 0) return b.width - a.width;
      if (b.height - a.height !== 0) return b.height - a.height;
      return (b.width * b.height) - (a.width * a.height);
    },
    // Strategy B: Largest dimension first (classic MaxRects optimal)
    (a, b) => {
      const maxA = Math.max(a.width, a.height);
      const maxB = Math.max(b.width, b.height);
      if (maxB - maxA !== 0) return maxB - maxA;
      return (b.width * b.height) - (a.width * a.height);
    },
  ];

  let bestResult = null;

  for (const sortFn of strategies) {
    const sorted = [...pieces].sort(sortFn);
    const localSheets = [];
    const localUnplaced = [];

    sorted.forEach((piece) => {
      let placed = false;

      for (const sheet of localSheets) {
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
        const newSheet = createSheet(localSheets.length + 1, boardWidth, boardHeight);
        const best = pickBestFreeRect(newSheet.freeRects, piece);
        if (!best) {
          localUnplaced.push(piece);
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
        localSheets.push(newSheet);
        placed = true;
      }

      if (!placed) {
        localUnplaced.push(piece);
      }
    });

    const nonEmpty = localSheets.filter(s => s.pieces.length > 0);
    const sheetCount = nonEmpty.length + localUnplaced.length * 0.1;

    if (!bestResult || localUnplaced.length < bestResult.unplaced.length || (localUnplaced.length === bestResult.unplaced.length && nonEmpty.length < bestResult.sheets.length)) {
      bestResult = { sheets: nonEmpty, unplaced: localUnplaced };
    }
  }

  return bestResult;
}
