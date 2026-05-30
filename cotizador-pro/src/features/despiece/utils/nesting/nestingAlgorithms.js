/**
 * src/engine/nesting.js
 * 2D Bin-Packing Engine — Multi-Heuristic Guillotine Split & MaxRects (BSSF)
 *
 * All dimensions are in mm. Kerf is applied by expanding each piece's
 * packed footprint by `kerf` on each side (width + kerf, height + kerf).
 * Margin is applied once to the sheet: usable area = sheet - margin.
 */

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

/** Default trim margin removed from each edge (mm). */
export const DEFAULT_MARGIN = 20;

/** Default blade kerf added between pieces (mm). */
export const DEFAULT_KERF = 5;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Expand a piece's dimensions to include kerf spacing.
 * @param {{ width: number, height: number }} piece
 * @param {number} kerf
 * @returns {{ width: number, height: number }}
 */
export function applyKerf(piece, kerf) {
  return { width: piece.width + kerf, height: piece.height + kerf };
}

/**
 * Compute the usable sheet dimensions after applying trim margins.
 * @param {number} sheetWidth  Physical sheet width (mm)
 * @param {number} sheetHeight Physical sheet height (mm)
 * @param {number} marginRight Trim from right + left combined (mm) — default 20
 * @param {number} marginTop   Trim from top + bottom combined (mm) — default 20
 * @returns {{ usableWidth: number, usableHeight: number }}
 */
export function usableArea(sheetWidth, sheetHeight, marginRight = DEFAULT_MARGIN, marginTop = DEFAULT_MARGIN) {
  return {
    usableWidth: sheetWidth - marginRight,
    usableHeight: sheetHeight - marginTop,
  };
}

/**
 * Expand a parts list by `qty` into individual piece descriptors,
 * preserving canRotate, ref, width, height.
 * @param {Array<{ref: any, width: number, height: number, qty: number, canRotate?: boolean}>} parts
 * @returns {Array<{ref: any, width: number, height: number, canRotate: boolean}>}
 */
function expandParts(parts) {
  const expanded = [];
  for (const part of parts) {
    for (let i = 0; i < (part.qty ?? 1); i++) {
      expanded.push({
        ref: part.ref,
        width: part.width,
        height: part.height,
        canRotate: part.canRotate ?? true,
      });
    }
  }
  return expanded;
}

/**
 * Compute per-sheet statistics.
 * @param {Array<{width:number,height:number}>} pieces  Actual (un-kerfed) piece sizes
 * @param {number} usableWidth
 * @param {number} usableHeight
 * @param {number} kerf
 * @returns {{ efficiency: number, waste: number, cutLength: number }}
 */
export function computeSheetStats(pieces, usableWidth, usableHeight, kerf) {
  const usableTotal = usableWidth * usableHeight;
  let pieceArea = 0;
  let cutLength = 0;

  for (const p of pieces) {
    pieceArea += p.width * p.height;
    // Simplified cut length: perimeter of each piece's kerf-expanded bounding box
    cutLength += 2 * ((p.width + kerf) + (p.height + kerf));
  }

  const efficiency = usableTotal > 0 ? (pieceArea / usableTotal) * 100 : 0;
  const waste = usableTotal - pieceArea;

  return {
    efficiency: Math.min(100, Math.max(0, efficiency)),
    waste: Math.max(0, waste),
    cutLength,
  };
}

/**
 * Heuristic sorting functions to try multiple packing orders.
 */
const SORTERS = [
  (a, b) => (b.width * b.height) - (a.width * a.height), // 1. Area
  (a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height), // 2. Max dim
  (a, b) => b.width - a.width, // 3. Width
  (a, b) => b.height - a.height, // 4. Height
  (a, b) => (b.width + b.height) - (a.width + a.height), // 5. Perimeter
  (a, b) => Math.min(b.width, b.height) - Math.min(a.width, a.height), // 6. Min dim
  (a, b) => Math.abs(b.width - b.height) - Math.abs(a.width - a.height), // 7. Difference
  (a, b) => Math.abs(a.width - a.height) - Math.abs(b.width - b.height), // 8. Difference reversed
  (a, b) => (b.width / Math.max(1, b.height)) - (a.width / Math.max(1, a.height)), // 9. Ratio W/H
  (a, b) => (b.height / Math.max(1, b.width)) - (a.height / Math.max(1, a.width)), // 10. Ratio H/W
  (a, b) => (b.width * b.width * b.height) - (a.width * a.width * a.height), // 11. Emphasize width
  (a, b) => (b.height * b.height * b.width) - (a.height * a.height * a.width), // 12. Emphasize height
  (a, b) => (Math.pow(b.width, 1.5) * b.height) - (Math.pow(a.width, 1.5) * a.height), // 13. Emphasize W frac
  (a, b) => (Math.pow(b.height, 1.5) * b.width) - (Math.pow(a.height, 1.5) * a.width), // 14. Emphasize H frac
  (a, b) => (Math.pow(b.width/Math.max(1, b.height), 2)) - (Math.pow(a.width/Math.max(1, a.height), 2)), // 15. Aspect W sq
  (a, b) => (Math.pow(b.height/Math.max(1, b.width), 2)) - (Math.pow(a.height/Math.max(1, a.width), 2)), // 16. Aspect H sq
  (a, b) => (b.width*b.width + b.height*b.height) - (a.width*a.width + a.height*a.height), // 17. Diagonal
  (a, b) => (b.width*b.height + Math.max(b.width, b.height)) - (a.width*a.height + Math.max(a.width, a.height)), // 18. Area + Max dim
  (a, b) => (b.width*b.height + Math.min(b.width, b.height)) - (a.width*a.height + Math.min(a.width, a.height)), // 19. Area + Min dim
  // New mathematical variations to reach 512 deterministic attempts:
  (a, b) => ((b.width * b.height) + Math.pow(b.width, 2)) - ((a.width * a.height) + Math.pow(a.width, 2)), // 20
  (a, b) => ((b.width * b.height) + Math.pow(b.height, 2)) - ((a.width * a.height) + Math.pow(a.height, 2)), // 21
  (a, b) => Math.pow(b.width * b.height, 1.5) - Math.pow(a.width * a.height, 1.5), // 22
  (a, b) => Math.pow(b.width * b.height, 2) - Math.pow(a.width * a.height, 2), // 23
  (a, b) => (b.width * 2 + b.height) - (a.width * 2 + a.height), // 24
  (a, b) => (b.width + b.height * 2) - (a.width + a.height * 2), // 25
  (a, b) => Math.max(b.width * 2, b.height) - Math.max(a.width * 2, a.height), // 26
  (a, b) => Math.max(b.width, b.height * 2) - Math.max(a.width, a.height * 2), // 27
  (a, b) => Math.abs(Math.pow(b.width, 2) - Math.pow(b.height, 2)) - Math.abs(Math.pow(a.width, 2) - Math.pow(a.height, 2)), // 28
  (a, b) => (b.width / Math.max(1, Math.sqrt(b.height))) - (a.width / Math.max(1, Math.sqrt(a.height))), // 29
  (a, b) => (b.height / Math.max(1, Math.sqrt(b.width))) - (a.height / Math.max(1, Math.sqrt(a.width))), // 30
  (a, b) => (Math.pow(b.width, 3) * b.height) - (Math.pow(a.width, 3) * a.height), // 31
  (a, b) => (Math.pow(b.height, 3) * b.width) - (Math.pow(a.height, 3) * a.width) // 32
];

  /**
   * Calculate a "scrap score" to measure how well the waste is consolidated.
   * Squaring the area heavily rewards layouts that leave massive continuous blocks
   * over layouts that leave many small fragmented strips.
   */
  function getScrapScore(layout) {
    let score = 0;
    for (const sheet of layout) {
      if (!sheet.freeRects) continue;
      for (const fr of sheet.freeRects) {
        // Ignore useless tiny trims
        if (fr.width < 50 || fr.height < 50) continue;
        const area = fr.width * fr.height;
        // Square the area so a single large scrap dominates over multiple small ones
        score += (area * area);
      }
    }
    return score;
  }

  function isBetterLayout(current, best) {
    if (!best) return true;
    // Fewer sheets used is always better
    if (current.length < best.length) return true;
    if (current.length > best.length) return false;
    
    // If same number of sheets, tie-break by maximum waste consolidation score
    const curScore = getScrapScore(current);
    const bestScore = getScrapScore(best);
    return curScore > bestScore;
  }

// ─────────────────────────────────────────────
// GUILLOTINE SPLIT PACKER
// ─────────────────────────────────────────────

function packGuillotineCore(sortedPieces, usableWidth, usableHeight, kerf, allowRotation, splitRule, fitRule) {
  const sheets = [];

  function splitRect(freeRect, pieceW, pieceH) {
    const remainW = freeRect.width - pieceW;
    const remainH = freeRect.height - pieceH;
    
    let splitHorizontal = true;
    const horizontalTopArea = freeRect.width * remainH;
    const verticalRightArea = remainW * freeRect.height;

    if (splitRule === 'MAXAS') {
      splitHorizontal = horizontalTopArea >= verticalRightArea;
    } else if (splitRule === 'MINAS') {
      splitHorizontal = horizontalTopArea < verticalRightArea;
    } else if (splitRule === 'SLAS') {
      splitHorizontal = remainH >= remainW;
    } else if (splitRule === 'SSAS') {
      splitHorizontal = remainH < remainW;
    }

    let rightRect = null;
    let topRect = null;

    if (splitHorizontal) {
      if (remainW > 0 && pieceH > 0) rightRect = { x: freeRect.x + pieceW, y: freeRect.y, width: remainW, height: pieceH };
      if (remainH > 0 && freeRect.width > 0) topRect = { x: freeRect.x, y: freeRect.y + pieceH, width: freeRect.width, height: remainH };
    } else {
      if (remainW > 0 && freeRect.height > 0) rightRect = { x: freeRect.x + pieceW, y: freeRect.y, width: remainW, height: freeRect.height };
      if (remainH > 0 && pieceW > 0) topRect = { x: freeRect.x, y: freeRect.y + pieceH, width: pieceW, height: remainH };
    }
    return [rightRect, topRect].filter(Boolean);
  }

  function scoreFit(fr, pw, ph) {
    if (fitRule === 'BSSF') return Math.min(fr.width - pw, fr.height - ph);
    if (fitRule === 'BLSF') return Math.max(fr.width - pw, fr.height - ph);
    if (fitRule === 'BAF') return fr.width * fr.height; // Best Area Fit
    return Math.min(fr.width - pw, fr.height - ph);
  }

  function findBestFit(freeRects, pieceW, pieceH, canRotate) {
    let best = null;
    for (let i = 0; i < freeRects.length; i++) {
      const fr = freeRects[i];
      if (fr.width >= pieceW && fr.height >= pieceH) {
        const score = scoreFit(fr, pieceW, pieceH);
        if (best === null || score < best.score) best = { rectIdx: i, rotated: false, score, w: pieceW, h: pieceH };
      }
      if (allowRotation && canRotate && fr.width >= pieceH && fr.height >= pieceW) {
        const score = scoreFit(fr, pieceH, pieceW);
        if (best === null || score < best.score) best = { rectIdx: i, rotated: true, score, w: pieceH, h: pieceW };
      }
    }
    return best;
  }

  for (const piece of sortedPieces) {
    const kw = piece.width + kerf;
    const kh = piece.height + kerf;
    let placed = false;

    for (const sheet of sheets) {
      const fit = findBestFit(sheet.freeRects, kw, kh, piece.canRotate);
      if (fit) {
        const fr = sheet.freeRects[fit.rectIdx];
        sheet.pieces.push({
          ref: piece.ref,
          x: fr.x,
          y: fr.y,
          width: fit.rotated ? piece.height : piece.width,
          height: fit.rotated ? piece.width : piece.height,
          rotated: fit.rotated,
        });
        const newRects = splitRect(fr, fit.w, fit.h);
        sheet.freeRects.splice(fit.rectIdx, 1, ...newRects);
        placed = true;
        break;
      }
    }

    if (!placed) {
      // MATHEMATICAL FIX: By initializing the virtual free space to usable + kerf,
      // we allow pieces to touch the exact right/bottom edge of the physical board
      // without being rejected for missing a kerf that falls outside the board.
      const virtualWidth = usableWidth + kerf;
      const virtualHeight = usableHeight + kerf;
      
      const fit = findBestFit([{ x: 0, y: 0, width: virtualWidth, height: virtualHeight }], kw, kh, piece.canRotate);
      if (!fit) continue;
      
      const initFreeRect = { x: 0, y: 0, width: virtualWidth, height: virtualHeight };
      const newRects = splitRect(initFreeRect, fit.w, fit.h);
      sheets.push({
        id: sheets.length + 1,
        pieces: [{
          ref: piece.ref,
          x: 0,
          y: 0,
          width: fit.rotated ? piece.height : piece.width,
          height: fit.rotated ? piece.width : piece.height,
          rotated: fit.rotated,
        }],
        freeRects: newRects,
      });
    }
  }

    return sheets.map(sheet => {
      const stats = computeSheetStats(sheet.pieces, usableWidth, usableHeight, kerf);
      return { ...sheet, ...stats, freeRects: sheet.freeRects };
    });
}

const SPLIT_RULES = ['MAXAS', 'MINAS', 'SLAS', 'SSAS'];
const FIT_RULES = ['BSSF', 'BLSF', 'BAF'];

export function packGuillotine(parts, sheetWidth, sheetHeight, options = {}) {
  const { marginTop = DEFAULT_MARGIN, marginRight = DEFAULT_MARGIN, kerf = DEFAULT_KERF, allowRotation = true } = options;
  const { usableWidth, usableHeight } = usableArea(sheetWidth, sheetHeight, marginRight, marginTop);
  const pieces = expandParts(parts);

  let bestLayout = null;
  // Parameter sweep: 9 sorters * 4 split rules * 3 fit rules = 108 configurations!
  for (const sorter of SORTERS) {
    const sortedPieces = [...pieces].sort(sorter);
    for (const splitRule of SPLIT_RULES) {
      for (const fitRule of FIT_RULES) {
        const layout = packGuillotineCore(sortedPieces, usableWidth, usableHeight, kerf, allowRotation, splitRule, fitRule);
        if (isBetterLayout(layout, bestLayout)) bestLayout = layout;
      }
    }
  }
  return bestLayout || [];
}

// ─────────────────────────────────────────────
// MAXRECTS PACKER  (Best Short Side Fit — BSSF)
// ─────────────────────────────────────────────

function packMaxRectsCore(sortedPieces, usableWidth, usableHeight, kerf, allowRotation) {
  const sheets = [];

  function scoreBSSF(freeRect, pieceW, pieceH) {
    return Math.min(freeRect.width - pieceW, freeRect.height - pieceH);
  }

  function findBestFit(freeRects, pieceW, pieceH, canRotate) {
    let best = null;
    for (let i = 0; i < freeRects.length; i++) {
      const fr = freeRects[i];
      if (fr.width >= pieceW && fr.height >= pieceH) {
        const score = scoreBSSF(fr, pieceW, pieceH);
        if (best === null || score < best.score) best = { rectIdx: i, rotated: false, score };
      }
      if (allowRotation && canRotate && fr.width >= pieceH && fr.height >= pieceW) {
        const score = scoreBSSF(fr, pieceH, pieceW);
        if (best === null || score < best.score) best = { rectIdx: i, rotated: true, score };
      }
    }
    return best;
  }

  function isContained(a, b) {
    return b.x >= a.x && b.y >= a.y && b.x + b.width <= a.x + a.width && b.y + b.height <= a.y + a.height;
  }

  function clipRect(freeRect, placed) {
    const result = [];
    const noOverlap = placed.x + placed.width <= freeRect.x || placed.x >= freeRect.x + freeRect.width ||
                      placed.y + placed.height <= freeRect.y || placed.y >= freeRect.y + freeRect.height;
    if (noOverlap) return [freeRect];

    if (placed.x > freeRect.x) result.push({ x: freeRect.x, y: freeRect.y, width: placed.x - freeRect.x, height: freeRect.height });
    if (placed.x + placed.width < freeRect.x + freeRect.width) result.push({ x: placed.x + placed.width, y: freeRect.y, width: (freeRect.x + freeRect.width) - (placed.x + placed.width), height: freeRect.height });
    if (placed.y > freeRect.y) result.push({ x: freeRect.x, y: freeRect.y, width: freeRect.width, height: placed.y - freeRect.y });
    if (placed.y + placed.height < freeRect.y + freeRect.height) result.push({ x: freeRect.x, y: placed.y + placed.height, width: freeRect.width, height: (freeRect.y + freeRect.height) - (placed.y + placed.height) });

    return result.filter(r => r.width > 0 && r.height > 0);
  }

  function pruneContained(freeRects) {
    return freeRects.filter((r, i) => !freeRects.some((other, j) => i !== j && isContained(other, r)));
  }

  for (const piece of sortedPieces) {
    const kw = piece.width + kerf;
    const kh = piece.height + kerf;
    let placed = false;

    for (const sheet of sheets) {
      const best = findBestFit(sheet.freeRects, kw, kh, piece.canRotate);
      if (best !== null) {
        const actualW = best.rotated ? kh : kw;
        const actualH = best.rotated ? kw : kh;
        const fr = sheet.freeRects[best.rectIdx];
        const placedRect = { x: fr.x, y: fr.y, width: actualW, height: actualH };

        sheet.pieces.push({
          ref: piece.ref,
          x: fr.x,
          y: fr.y,
          width: best.rotated ? piece.height : piece.width,
          height: best.rotated ? piece.width : piece.height,
          rotated: best.rotated,
        });

        let newFreeRects = [];
        for (const freeRect of sheet.freeRects) newFreeRects.push(...clipRect(freeRect, placedRect));
        sheet.freeRects = pruneContained(newFreeRects);

        placed = true;
        break;
      }
    }

    if (!placed) {
      const initFreeRects = [{ x: 0, y: 0, width: usableWidth, height: usableHeight }];
      const best = findBestFit(initFreeRects, kw, kh, piece.canRotate);
      if (!best) continue;

      const actualW = best.rotated ? kh : kw;
      const actualH = best.rotated ? kw : kh;
      const placedRect = { x: 0, y: 0, width: actualW, height: actualH };

      let newFreeRects = [];
      for (const freeRect of initFreeRects) newFreeRects.push(...clipRect(freeRect, placedRect));
      
      sheets.push({
        id: sheets.length + 1,
        pieces: [{
          ref: piece.ref,
          x: 0,
          y: 0,
          width: best.rotated ? piece.height : piece.width,
          height: best.rotated ? piece.width : piece.height,
          rotated: best.rotated,
        }],
        freeRects: pruneContained(newFreeRects),
      });
    }
  }

  return sheets.map(sheet => {
    const stats = computeSheetStats(sheet.pieces, usableWidth, usableHeight, kerf);
    
    // Convert MaxRects overlapping freeRects into clean, non-overlapping rectangles for UI
    let cleanFreeRects = [{ x: 0, y: 0, width: usableWidth, height: usableHeight }];
    for (const piece of sheet.pieces) {
      const placed = { x: piece.x, y: piece.y, width: piece.width + kerf, height: piece.height + kerf };
      const nextFree = [];
      for (const fr of cleanFreeRects) {
        const noOverlap = placed.x + placed.width <= fr.x || placed.x >= fr.x + fr.width ||
                          placed.y + placed.height <= fr.y || placed.y >= fr.y + fr.height;
        if (noOverlap) {
          nextFree.push(fr);
          continue;
        }
        let cur = { ...fr };
        if (placed.y > cur.y) {
          nextFree.push({ x: cur.x, y: cur.y, width: cur.width, height: placed.y - cur.y });
          cur.height -= (placed.y - cur.y);
          cur.y = placed.y;
        }
        if (placed.y + placed.height < cur.y + cur.height) {
          nextFree.push({ x: cur.x, y: placed.y + placed.height, width: cur.width, height: (cur.y + cur.height) - (placed.y + placed.height) });
          cur.height = placed.y + placed.height - cur.y;
        }
        if (placed.x > cur.x) {
          nextFree.push({ x: cur.x, y: cur.y, width: placed.x - cur.x, height: cur.height });
          cur.width -= (placed.x - cur.x);
          cur.x = placed.x;
        }
        if (placed.x + placed.width < cur.x + cur.width) {
          nextFree.push({ x: placed.x + placed.width, y: cur.y, width: (cur.x + cur.width) - (placed.x + placed.width), height: cur.height });
        }
      }
      cleanFreeRects = nextFree.filter(r => r.width >= 1 && r.height >= 1);
    }

    return { ...sheet, ...stats, freeRects: cleanFreeRects };
  });
}

export function packMaxRects(parts, sheetWidth, sheetHeight, options = {}) {
  const { marginTop = DEFAULT_MARGIN, marginRight = DEFAULT_MARGIN, kerf = DEFAULT_KERF, allowRotation = true } = options;
  const { usableWidth, usableHeight } = usableArea(sheetWidth, sheetHeight, marginRight, marginTop);
  const pieces = expandParts(parts);

  // Use only Area Descending for MaxRects to preserve neat visual packing
  const areaDescending = (a, b) => (b.width * b.height) - (a.width * a.height);
  const sortedPieces = [...pieces].sort(areaDescending);
  
  const layout = packMaxRectsCore(sortedPieces, usableWidth, usableHeight, kerf, allowRotation);
  return layout || [];
}
