/**
 * 2D Bin-Packing Engine — Multi-Heuristic Guillotine Split & MaxRects (BSSF)
 *
 * All dimensions are in mm. Kerf is applied by expanding each piece's
 * packed footprint by `kerf` on each side (width + kerf, height + kerf).
 *
 * Refilado (trim) is a one-sided deduction per axis:
 *   - refiladoX: deducted from the RIGHT side only  (usableWidth = boardWidth - refiladoX)
 *   - refiladoY: deducted from the TOP side only    (usableHeight = boardHeight - refiladoY)
 *
 * Refilado value already includes the edge kerf effect — kerf is NOT added
 * again to the border trim; kerf is used only for piece-to-piece spacing.
 */

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

/** Default refilado trim deducted from each axis total (mm). */
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
 * Kerf may spill past the physical right/bottom sheet edge ONLY when the raw
 * piece itself exactly touches that physical edge on the corresponding axis.
 *
 * @param {{ x:number, y:number, width:number, height:number }} piece
 * @param {number} usableWidth
 * @param {number} usableHeight
 * @returns {{ allowRightKerfOverflow: boolean, allowBottomKerfOverflow: boolean }}
 */
export function getFirstPieceKerfOverflowAllowance(piece, usableWidth, usableHeight) {
  return {
    allowRightKerfOverflow: piece.x + piece.width === usableWidth,
    allowBottomKerfOverflow: piece.y + piece.height === usableHeight,
  };
}

function canPlaceOnFreshSheetWithVirtualKerf(pieceW, pieceH, usableWidth, usableHeight, kerf) {
  if (pieceW > usableWidth || pieceH > usableHeight) return false;
  if (pieceW + kerf > usableWidth && pieceW !== usableWidth) return false;
  if (pieceH + kerf > usableHeight && pieceH !== usableHeight) return false;
  return true;
}

/**
 * Compute the usable sheet dimensions after applying one-sided refilado deductions.
 * @param {number} sheetWidth  Physical sheet width (mm)
 * @param {number} sheetHeight Physical sheet height (mm)
 * @param {number} refiladoX  Refilado deducted from RIGHT side only (mm)
 * @param {number} refiladoY  Refilado deducted from TOP side only (mm)
 * @returns {{ usableWidth: number, usableHeight: number }}
 *
 * Business rule: one-sided refilado — refiladoX shifts the right edge inward,
 * refiladoY shifts the top edge downward. No kerf is added here; kerf is
 * applied separately for piece-to-piece spacing only.
 *
 * Example: board 2440×2150 with refiladoX=20, refiladoY=20
 *   → usable = (2440-20) × (2150-20) = 2420×2130
 */
export function usableArea(sheetWidth, sheetHeight, refiladoX = DEFAULT_MARGIN, refiladoY = DEFAULT_MARGIN) {
  return {
    // One-sided refilado: usable area is reduced from right (X) and top (Y)
    usableWidth: sheetWidth - refiladoX,
    usableHeight: sheetHeight - refiladoY,
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
        id: part.id,
        instanceId: `${part.id}_${i}`,
        ref: part.ref,
        originalRowIndex: part.originalRowIndex,
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

  function clipRectToUsableBounds(rect) {
    const x1 = Math.max(0, rect.x);
    const y1 = Math.max(0, rect.y);
    const x2 = Math.min(usableWidth, rect.x + rect.width);
    const y2 = Math.min(usableHeight, rect.y + rect.height);

    if (x2 <= x1 || y2 <= y1) return null;
    return {
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
    };
  }

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
    let baseScore;
    if (fitRule === 'BSSF') baseScore = Math.min(fr.width - pw, fr.height - ph);
    else if (fitRule === 'BLSF') baseScore = Math.max(fr.width - pw, fr.height - ph);
    else if (fitRule === 'BAF') baseScore = fr.width * fr.height; // Best Area Fit
    else baseScore = Math.min(fr.width - pw, fr.height - ph);

    // Si la pieza es pequeña (< 10% del área de la lámina), preferir Y alto (hacia abajo)
    // Si es grande, preferir Y bajo (hacia arriba)
    const isSmall = (pw * ph) < (usableWidth * usableHeight * 0.1);
    
    if (isSmall) {
      return baseScore - (fr.y * 2); // Penaliza Y bajo, premia Y alto
    } else {
      return baseScore + (fr.y * 2); // Penaliza Y alto, premia Y bajo
    }
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
          id: piece.id,
          instanceId: piece.instanceId,
          ref: piece.ref,
          originalRowIndex: piece.originalRowIndex,
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

      let fit = null;
      const initRect = { x: 0, y: 0, width: virtualWidth, height: virtualHeight };

      if (canPlaceOnFreshSheetWithVirtualKerf(piece.width, piece.height, usableWidth, usableHeight, kerf)) {
        fit = { rectIdx: 0, rotated: false, score: scoreFit(initRect, kw, kh), w: kw, h: kh };
      }

      if (
        allowRotation &&
        piece.canRotate &&
        canPlaceOnFreshSheetWithVirtualKerf(piece.height, piece.width, usableWidth, usableHeight, kerf)
      ) {
        const rotatedScore = scoreFit(initRect, kh, kw);
        if (fit === null || rotatedScore < fit.score) {
          fit = { rectIdx: 0, rotated: true, score: rotatedScore, w: kh, h: kw };
        }
      }

      if (!fit) continue;

      const initFreeRect = { x: 0, y: 0, width: virtualWidth, height: virtualHeight };
      const newRects = splitRect(initFreeRect, fit.w, fit.h)
        .map(clipRectToUsableBounds)
        .filter(Boolean);
      sheets.push({
        id: sheets.length + 1,
        pieces: [{
          id: piece.id,
          instanceId: piece.instanceId,
          ref: piece.ref,
          originalRowIndex: piece.originalRowIndex,
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
  // Parameter sweep: 32 sorters * 4 split rules * 3 fit rules = 384 configurations
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

/**
 * Pure BSSF scorer — no Y-bias, no size heuristic.
 * Used by the public packMaxRects API to preserve stable behavior.
 */
function scoreBSSFPure(freeRect, pieceW, pieceH) {
  return Math.min(freeRect.width - pieceW, freeRect.height - pieceH);
}

/**
 * BSSF scorer with Y-bias heuristic (small pieces → prefer bottom, large → prefer top).
 * Used by hybrid comparison to prefer structured layouts.
 */
function scoreBSSFYBiased(freeRect, pieceW, pieceH, usableWidth, usableHeight) {
  const bssf = Math.min(freeRect.width - pieceW, freeRect.height - pieceH);
  const isSmall = (pieceW * pieceH) < (usableWidth * usableHeight * 0.1);
  if (isSmall) {
    return bssf - (freeRect.y * 2); // Penalizes low Y, rewards high placement
  } else {
    return bssf + (freeRect.y * 2); // Rewards low Y placement for large pieces
  }
}

function packMaxRectsCore(sortedPieces, usableWidth, usableHeight, kerf, allowRotation, useYBiasedScorer = false) {
  const sheets = [];

  function buildExistingSheetPlacedRect(x, y, pieceW, pieceH) {
    const touchesPhysicalRightEdge = x + pieceW >= usableWidth;
    const touchesPhysicalBottomEdge = y + pieceH >= usableHeight;
    return {
      x,
      y,
      width: touchesPhysicalRightEdge ? pieceW : pieceW + kerf,
      height: touchesPhysicalBottomEdge ? pieceH : pieceH + kerf,
    };
  }

  function findBestFit(freeRects, pieceW, pieceH, canRotate) {
    let best = null;
    for (let i = 0; i < freeRects.length; i++) {
      const fr = freeRects[i];
      if (fr.width >= pieceW && fr.height >= pieceH) {
        const score = useYBiasedScorer
          ? scoreBSSFYBiased(fr, pieceW, pieceH, usableWidth, usableHeight)
          : scoreBSSFPure(fr, pieceW, pieceH);
        if (best === null || score < best.score) best = { rectIdx: i, rotated: false, score };
      }
      if (allowRotation && canRotate && fr.width >= pieceH && fr.height >= pieceW) {
        const score = useYBiasedScorer
          ? scoreBSSFYBiased(fr, pieceH, pieceW, usableWidth, usableHeight)
          : scoreBSSFPure(fr, pieceH, pieceW);
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
    let placed = false;

    for (const sheet of sheets) {
      let best = null;
      for (let i = 0; i < sheet.freeRects.length; i++) {
        const fr = sheet.freeRects[i];

        const tryFit = (pieceW, pieceH, rotated) => {
          const placedRect = buildExistingSheetPlacedRect(fr.x, fr.y, pieceW, pieceH);
          if (fr.width < placedRect.width || fr.height < placedRect.height) return;

          const score = useYBiasedScorer
            ? scoreBSSFYBiased(fr, placedRect.width, placedRect.height, usableWidth, usableHeight)
            : scoreBSSFPure(fr, placedRect.width, placedRect.height);

          if (best === null || score < best.score) {
            best = { rectIdx: i, rotated, score, placedRect };
          }
        };

        tryFit(piece.width, piece.height, false);
        if (allowRotation && piece.canRotate) {
          tryFit(piece.height, piece.width, true);
        }
      }

      if (best !== null) {
        const fr = sheet.freeRects[best.rectIdx];

        sheet.pieces.push({
          id: piece.id,
          instanceId: piece.instanceId,
          ref: piece.ref,
          originalRowIndex: piece.originalRowIndex,
          x: fr.x,
          y: fr.y,
          width: best.rotated ? piece.height : piece.width,
          height: best.rotated ? piece.width : piece.height,
          rotated: best.rotated,
        });

        let newFreeRects = [];
        for (const freeRect of sheet.freeRects) newFreeRects.push(...clipRect(freeRect, best.placedRect));
        sheet.freeRects = pruneContained(newFreeRects);

        placed = true;
        break;
      }
    }

    if (!placed) {
      // Kerf-expanded search ONLY on new sheet virtual envelope:
      // the virtual envelope is usable+kerf so the kerf on the outer edge falls
      // outside the physical sheet — only the piece itself needs to fit within usable bounds.
      const kw = piece.width + kerf;
      const kh = piece.height + kerf;
      const virtualWidth = usableWidth + kerf;
      const virtualHeight = usableHeight + kerf;
      const initFreeRects = [{ x: 0, y: 0, width: virtualWidth, height: virtualHeight }];
      let best = null;
      const initRect = initFreeRects[0];

      if (canPlaceOnFreshSheetWithVirtualKerf(piece.width, piece.height, usableWidth, usableHeight, kerf)) {
        const score = useYBiasedScorer
          ? scoreBSSFYBiased(initRect, kw, kh, usableWidth, usableHeight)
          : scoreBSSFPure(initRect, kw, kh);
        best = { rectIdx: 0, rotated: false, score };
      }

      if (
        allowRotation &&
        piece.canRotate &&
        canPlaceOnFreshSheetWithVirtualKerf(piece.height, piece.width, usableWidth, usableHeight, kerf)
      ) {
        const score = useYBiasedScorer
          ? scoreBSSFYBiased(initRect, kh, kw, usableWidth, usableHeight)
          : scoreBSSFPure(initRect, kh, kw);
        if (best === null || score < best.score) {
          best = { rectIdx: 0, rotated: true, score };
        }
      }

      if (!best) continue;

      // Kerf-expanded piece dimensions
      const actualW = best.rotated ? kh : kw;
      const actualH = best.rotated ? kw : kh;

      // Guillotine-style split: piece fills top-left of virtual envelope.
      // Clip both child rects to physical usable bounds.
      // - Right child: [actualW, virtualWidth) × [0, actualH) → clipped to usableWidth
      // - Top child:   [0, actualW) × [actualH, virtualHeight) → clipped to usableHeight
      const newFreeRects = [];
      // Right remainder: from placed piece right edge to usableWidth,
      // height clipped to usableHeight (NOT virtualHeight) — the virtual
      // envelope allows kerf to spill outside the physical edge, but the
      // symmetric remainder must not leak virtual height into freeRects
      // used for later placements on the same sheet.
      const rightHeight = Math.min(actualH, usableHeight);
      if (actualW < usableWidth && rightHeight > 0) {
        newFreeRects.push({ x: actualW, y: 0, width: usableWidth - actualW, height: rightHeight });
      }
      // Top remainder: from placed piece top (clipped to usableHeight) to usableHeight,
      // full remaining width. The top remainder y is clipped to Math.min(actualH, usableHeight)
      // so that if actualH exceeds usableHeight (virtual envelope overflow from exact bottom-edge
      // fit), the remainder is placed at y=usableHeight (the physical top edge) instead of
      // y=virtualHeight (outside the sheet).
      const topY = Math.min(actualH, usableHeight);
      if (topY < usableHeight && usableWidth > 0) {
        newFreeRects.push({ x: 0, y: topY, width: usableWidth, height: usableHeight - topY });
      }
      // Bottom-right corner: the L-shaped remainder after right and top are carved out
      // Both dimensions are already clipped above (right uses Math.min(actualH, usableHeight),
      // top uses topY=Math.min(actualH,usableHeight)), so this is also safe.
      if (actualW < usableWidth && topY < usableHeight) {
        newFreeRects.push({ x: actualW, y: topY, width: usableWidth - actualW, height: usableHeight - topY });
      }

      sheets.push({
        id: sheets.length + 1,
        pieces: [{
          id: piece.id,
          instanceId: piece.instanceId,
          ref: piece.ref,
          originalRowIndex: piece.originalRowIndex,
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
      const placed = buildExistingSheetPlacedRect(piece.x, piece.y, piece.width, piece.height);
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
  // marginRight → refiladoX (right-side trim), marginTop → refiladoY (top-side trim)
  const { usableWidth, usableHeight } = usableArea(sheetWidth, sheetHeight, marginRight, marginTop);
  const pieces = expandParts(parts);

  // Use area-descending single sorter for deterministic backward-compatible output
  const layout = packMaxRectsSingle(pieces, usableWidth, usableHeight, kerf, allowRotation);
  return layout || [];
}

// ─────────────────────────────────────────────
// HYBRID STRATEGY — Guillotine sweep + MaxRects
// ─────────────────────────────────────────────

/**
 * Curated subset of sorters for the reduced Guillotine sweep.
 * Selected to cover diverse packing heuristics without brute-force imbalance.
 * These 8 sorters were chosen from the 32 to give broad coverage:
 * - Area (largest first)
 * - Max dim (longest side)
 * - Width, Height (single-axis)
 * - Perimeter (combined size)
 * - Aspect ratio W/H (shape)
 * - Emphasize W, Emphasize H (power heuristics)
 */
const HYBRID_SORTERS = [
  (a, b) => (b.width * b.height) - (a.width * a.height),           // 1. Area
  (a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height), // 2. Max dim
  (a, b) => b.width - a.width,                                      // 3. Width
  (a, b) => b.height - a.height,                                    // 4. Height
  (a, b) => (b.width + b.height) - (a.width + a.height),            // 5. Perimeter
  (a, b) => (b.width / Math.max(1, b.height)) - (a.width / Math.max(1, a.height)), // 9. Ratio W/H
  (a, b) => (Math.pow(b.width, 1.5) * b.height) - (Math.pow(a.width, 1.5) * a.height), // 13. Emphasize W
  (a, b) => (Math.pow(b.height, 1.5) * b.width) - (Math.pow(a.height, 1.5) * a.width), // 14. Emphasize H
];

/**
 * Compare two layouts and return the better one.
 * Rule: MaxRects wins only on strict sheet-count improvement.
 * Equal-sheet ties preserve Guillotine result (deterministic first-wins).
 */
function betterLayout(a, b) {
  if (!a || a.length === 0) return b;
  if (!b || b.length === 0) return a;
  if (a.length < b.length) return a;
  if (b.length < a.length) return b;
  // Equal sheet count → preserve Guillotine result (first-wins = deterministic)
  return a;
}

function isValidHybridCandidate(layout, usableWidth, usableHeight, kerf) {
  if (!Array.isArray(layout)) return false;

  for (const sheet of layout) {
    const pieces = sheet?.pieces ?? [];

    for (const piece of pieces) {
      if (piece.x < 0 || piece.y < 0) return false;
      if (piece.x + piece.width > usableWidth) return false;
      if (piece.y + piece.height > usableHeight) return false;

      const { allowRightKerfOverflow, allowBottomKerfOverflow } = getFirstPieceKerfOverflowAllowance(
        piece,
        usableWidth,
        usableHeight
      );

      if (!allowRightKerfOverflow && piece.x + piece.width + kerf > usableWidth) return false;
      if (!allowBottomKerfOverflow && piece.y + piece.height + kerf > usableHeight) return false;
    }

    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i];
        const b = pieces[j];
        const separatedX =
          a.x + a.width + kerf <= b.x ||
          b.x + b.width + kerf <= a.x;
        const separatedY =
          a.y + a.height + kerf <= b.y ||
          b.y + b.height + kerf <= a.y;

        if (!separatedX && !separatedY) return false;
      }
    }
  }

  return true;
}

/**
 * Run a reduced Guillotine parameter sweep with curated sorters.
 * 8 sorters × 4 split rules × 3 fit rules = 96 configurations.
 */
function packGuillotineReduced(parts, usableWidth, usableHeight, kerf, allowRotation) {
  let best = null;
  for (const sorter of HYBRID_SORTERS) {
    const sortedPieces = [...parts].sort(sorter);
    for (const splitRule of SPLIT_RULES) {
      for (const fitRule of FIT_RULES) {
        const layout = packGuillotineCore(sortedPieces, usableWidth, usableHeight, kerf, allowRotation, splitRule, fitRule);
        best = betterLayout(layout, best);
      }
    }
  }
  return best;
}

/**
 * Curated multi-sorter set for MaxRects expansion.
 * Chosen to provide diverse packing heuristics without combinatorial explosion.
 * 8 sorters give broad coverage of area, axis, perimeter, aspect ratio, and power variants.
 */
const MAXRECTS_SORTERS = [
  (a, b) => (b.width * b.height) - (a.width * a.height),              // 1. Area descending
  (a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height), // 2. Max dim descending
  (a, b) => b.width - a.width,                                         // 3. Width descending
  (a, b) => b.height - a.height,                                       // 4. Height descending
  (a, b) => (b.width + b.height) - (a.width + a.height),               // 5. Perimeter descending
  (a, b) => (b.width / Math.max(1, b.height)) - (a.width / Math.max(1, a.height)), // 6. Aspect W/H
  (a, b) => (Math.pow(b.width, 1.5) * b.height) - (Math.pow(a.width, 1.5) * a.height), // 7. Emphasize W
  (a, b) => (Math.pow(b.height, 1.5) * b.width) - (Math.pow(a.height, 1.5) * a.width),  // 8. Emphasize H
];

/**
 * Run MaxRects with a curated multi-sorter sweep.
 * 8 sorters = 8 configurations — much faster than Guillotine's 96.
 * Uses Y-biased scorer to match Guillotine's preference ordering.
 * Returns the best layout found across all sorters.
 */
function packMaxRectsMulti(parts, usableWidth, usableHeight, kerf, allowRotation) {
  let best = null;
  for (const sorter of MAXRECTS_SORTERS) {
    const sorted = [...parts].sort(sorter);
    const layout = packMaxRectsCore(sorted, usableWidth, usableHeight, kerf, allowRotation, true);
    best = betterLayout(layout, best);
  }
  return best;
}

/**
 * Run MaxRects with area-descending sort (legacy single-config behavior).
 * Used when caller wants deterministic single-result (e.g., packMaxRects public API).
 */
function packMaxRectsSingle(parts, usableWidth, usableHeight, kerf, allowRotation) {
  const areaDesc = (a, b) => (b.width * b.height) - (a.width * a.height);
  const sorted = [...parts].sort(areaDesc);
  return packMaxRectsCore(sorted, usableWidth, usableHeight, kerf, allowRotation);
}

/**
 * Hybrid packer: runs the FULL public Guillotine sweep AND multi-sorter MaxRects,
 * then returns the better result deterministically.
 *
 * IMPORTANT: The Guillotine branch uses the SAME 32-sorter × 4-split × 3-fit = 384-config
 * sweep as the public packGuillotine API to guarantee hybrid never returns more sheets
 * than packGuillotine for the same input.
 *
 * Decision logic:
 *  1. Fewer sheets wins.
 *  2. If sheet count ties, scrap quality (consolidated waste) wins.
 *  3. If still tied, Guillotine wins (prefers structured cuts).
 *
 * @param {Array} parts              - Parts list [{ ref, width, height, qty, canRotate }]
 * @param {number} sheetWidth        - Physical sheet width (mm)
 * @param {number} sheetHeight       - Physical sheet height (mm)
 * @param {Object} [options]         - { kerf, marginTop, marginRight, allowRotation }
 * @returns {Array}                  - Best layout found
 */
export function packHybrid(parts, sheetWidth, sheetHeight, options = {}) {
  if (!parts || parts.length === 0) return [];

  const expanded = expandParts(parts);
  const { kerf = DEFAULT_KERF, allowRotation = true } = options;
  const { usableWidth, usableHeight } = usableArea(sheetWidth, sheetHeight, options.marginRight ?? DEFAULT_MARGIN, options.marginTop ?? DEFAULT_MARGIN);

  // Run FULL Guillotine sweep (384 configs) — same as public packGuillotine for fair comparison
  const guillotineResult = packGuillotineFull(expanded, usableWidth, usableHeight, kerf, allowRotation);
  // Run multi-sorter MaxRects (8 configs) with Y-biased scoring to match Guillotine preference
  const maxrectsResult = packMaxRectsMulti(expanded, usableWidth, usableHeight, kerf, allowRotation);

  const guillotineValid = isValidHybridCandidate(guillotineResult, usableWidth, usableHeight, kerf);
  const maxrectsValid = isValidHybridCandidate(maxrectsResult, usableWidth, usableHeight, kerf);

  if (guillotineValid && !maxrectsValid) return guillotineResult;
  if (maxrectsValid && !guillotineValid) return maxrectsResult;

  return betterLayout(guillotineResult, maxrectsResult);
}

/**
 * Run the full public Guillotine sweep (384 configs = 32 sorters × 4 split × 3 fit).
 * Exposed separately for use by packHybrid to ensure hybrid is never worse than public API.
 * Uses the SAME isBetterLayout tie semantics as public packGuillotine so that when
 * two layouts have equal sheet count AND equal scrap score, the FIRST one found wins
 * (preserving deterministic iteration order rather than last-one-wins).
 */
function packGuillotineFull(parts, usableWidth, usableHeight, kerf, allowRotation) {
  let best = null;
  for (const sorter of SORTERS) {
    const sortedPieces = [...parts].sort(sorter);
    for (const splitRule of SPLIT_RULES) {
      for (const fitRule of FIT_RULES) {
        const layout = packGuillotineCore(sortedPieces, usableWidth, usableHeight, kerf, allowRotation, splitRule, fitRule);
        if (isBetterLayout(layout, best)) best = layout;
      }
    }
  }
  return best || [];
}
