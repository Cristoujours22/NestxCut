/**
 * src/engine/validator.js
 * Layout Validation — Overlap & Boundary Checks + plan_posiciones.json Parser
 */

import {
  usableArea,
  DEFAULT_MARGIN,
  DEFAULT_KERF,
  getFirstPieceKerfOverflowAllowance,
} from './nestingAlgorithms.js';

// ─────────────────────────────────────────────
// LAYOUT VALIDATOR
// ─────────────────────────────────────────────

/**
 * Validate a packed layout for overlaps and boundary violations.
 *
 * Rules:
 *  1. No two pieces on the same sheet may overlap (including kerf gap).
 *     Pieces are treated as kerf-expanded bounding boxes:
 *       [x, x + width + kerf] × [y, y + height + kerf]
 *     must NOT intersect with another piece's expanded box.
 *  2. Every piece must be within the usable area:
 *       x >= 0, y >= 0, x + width <= usableWidth, y + height <= usableHeight
 *
 * @param {Array<{id:number, pieces:Array<{ref:any,x:number,y:number,width:number,height:number}>}>} sheets
 * @param {number} sheetWidth
 * @param {number} sheetHeight
 * @param {{ marginTop?: number, marginRight?: number, kerf?: number }} [options]
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateLayout(sheets, sheetWidth, sheetHeight, options = {}) {
  const {
    marginTop = DEFAULT_MARGIN,
    marginRight = DEFAULT_MARGIN,
    kerf = DEFAULT_KERF,
  } = options;

  const { usableWidth, usableHeight } = usableArea(sheetWidth, sheetHeight, marginRight, marginTop);
  const errors = [];

  for (const sheet of sheets) {
    const pieces = sheet.pieces ?? [];

    // Boundary check
    for (const piece of pieces) {
      // Boundary check — raw piece must be in-bounds
      if (piece.x < 0) {
        errors.push(`Sheet ${sheet.id}: piece ref=${piece.ref} has x=${piece.x} (< 0).`);
      }
      if (piece.y < 0) {
        errors.push(`Sheet ${sheet.id}: piece ref=${piece.ref} has y=${piece.y} (< 0).`);
      }
      if (piece.x + piece.width > usableWidth) {
        errors.push(
          `Sheet ${sheet.id}: piece ref=${piece.ref} exceeds usable width ` +
          `(x=${piece.x}, width=${piece.width}, limit=${usableWidth}).`
        );
      }
      if (piece.y + piece.height > usableHeight) {
        errors.push(
          `Sheet ${sheet.id}: piece ref=${piece.ref} exceeds usable height ` +
          `(y=${piece.y}, height=${piece.height}, limit=${usableHeight}).`
        );
      }
      // Kerf-expanded boundary check: kerf may spill outside the physical sheet only
      // when the piece itself already touches that physical edge. This matches the
      // virtual-envelope semantics used by the packers for exact edge fits.
      const { allowRightKerfOverflow, allowBottomKerfOverflow } = getFirstPieceKerfOverflowAllowance(
        piece,
        usableWidth,
        usableHeight
      );
      if (!allowRightKerfOverflow && piece.x + piece.width + kerf > usableWidth) {
        errors.push(
          `Sheet ${sheet.id}: piece ref=${piece.ref} exceeds usable width with kerf ` +
          `(x=${piece.x}, width=${piece.width}, kerf=${kerf}, effective_right=${piece.x + piece.width + kerf}, limit=${usableWidth}).`
        );
      }
      if (!allowBottomKerfOverflow && piece.y + piece.height + kerf > usableHeight) {
        errors.push(
          `Sheet ${sheet.id}: piece ref=${piece.ref} exceeds usable height with kerf ` +
          `(y=${piece.y}, height=${piece.height}, kerf=${kerf}, effective_bottom=${piece.y + piece.height + kerf}, limit=${usableHeight}).`
        );
      }
    }

    // Overlap check — O(n²) pairwise, sufficient for ≤200 parts per sheet
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i];
        const b = pieces[j];

        // Kerf-expanded bounding boxes must NOT overlap:
        // a.x + a.width + kerf <= b.x  OR  b.x + b.width + kerf <= a.x
        // a.y + a.height + kerf <= b.y  OR  b.y + b.height + kerf <= a.y
        const separatedX =
          a.x + a.width + kerf <= b.x ||
          b.x + b.width + kerf <= a.x;
        const separatedY =
          a.y + a.height + kerf <= b.y ||
          b.y + b.height + kerf <= a.y;

        if (!separatedX && !separatedY) {
          errors.push(
            `Sheet ${sheet.id}: overlap between ref=${a.ref} ` +
            `[${a.x},${a.y},${a.width}×${a.height}] and ref=${b.ref} ` +
            `[${b.x},${b.y},${b.width}×${b.height}] (kerf=${kerf}).`
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────────
// PLAN_POSICIONES PARSER
// ─────────────────────────────────────────────

/**
 * Parse a `plan_posiciones.json` object into engine-compatible structures.
 *
 * Supported input formats:
 *   A) Object with sheet_1, sheet_2, … keys, each containing an array of piece entries:
 *      { "sheet_1": [{ "ref": 101, "base": 600, "altura": 450, "x": 0, "y": 0 }] }
 *
 *   B) Flat array of pieces with optional sheet key:
 *      [{ "ref": 101, "base": 600, "altura": 450, "qty": 2, "canRotate": true }]
 *
 * @param {object|Array} json   Parsed JSON content
 * @returns {{
 *   manualSheets: Array<{id:string|number, pieces:Array<{ref:any,x:number,y:number,width:number,height:number}>}>,
 *   parts:        Array<{ref:any, width:number, height:number, qty:number, canRotate:boolean}>
 * }}
 */
export function parsePlanPosiciones(json) {
  const manualSheets = [];
  const refCounts = new Map(); // ref -> { width, height, canRotate, count }

  if (Array.isArray(json)) {
    // Format B: flat demand list
    const demandPieces = [];
    for (const entry of json) {
      const ref = entry.ref ?? entry.id ?? entry.code;
      const width = entry.width ?? entry.base ?? entry.w ?? 0;
      const height = entry.height ?? entry.altura ?? entry.h ?? 0;
      const canRotate = entry.canRotate ?? entry.can_rotate ?? true;
      const qty = entry.qty ?? entry.quantity ?? 1;

      demandPieces.push({ ref, x: 0, y: 0, width, height });

      if (!refCounts.has(ref)) {
        refCounts.set(ref, { width, height, canRotate, count: 0 });
      }
      refCounts.get(ref).count += qty;
    }

    // Single synthetic sheet with all pieces at 0,0 (manual layout unknown)
    if (demandPieces.length > 0) {
      manualSheets.push({ id: 1, pieces: demandPieces });
    }
  } else if (typeof json === 'object' && json !== null) {
    // Format A: { sheet_1: [...], sheet_2: [...], ... }
    const sheetKeys = Object.keys(json).filter(k => /^sheet_?\d+$/i.test(k));

    if (sheetKeys.length > 0) {
      for (const key of sheetKeys) {
        const idMatch = key.match(/\d+/);
        const sheetId = idMatch ? parseInt(idMatch[0], 10) : key;
        const rawPieces = Array.isArray(json[key]) ? json[key] : [];

        const pieces = rawPieces.map(entry => {
          const ref = entry.ref ?? entry.id ?? entry.code;
          const width = entry.width ?? entry.base ?? entry.w ?? 0;
          const height = entry.height ?? entry.altura ?? entry.h ?? 0;
          const x = entry.x ?? entry.pos_x ?? 0;
          const y = entry.y ?? entry.pos_y ?? 0;
          const canRotate = entry.canRotate ?? entry.can_rotate ?? true;

          if (!refCounts.has(ref)) {
            refCounts.set(ref, { width, height, canRotate, count: 0 });
          }
          refCounts.get(ref).count += 1;

          return { ref, x, y, width, height };
        });

        manualSheets.push({ id: sheetId, pieces });
      }
    } else {
      // Fallback: treat every key as a ref entry
      for (const [key, value] of Object.entries(json)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const ref = key;
          const width = value.width ?? value.base ?? 0;
          const height = value.height ?? value.altura ?? 0;
          const canRotate = value.canRotate ?? value.can_rotate ?? true;
          const qty = value.qty ?? value.quantity ?? 1;

          if (!refCounts.has(ref)) {
            refCounts.set(ref, { width, height, canRotate, count: 0 });
          }
          refCounts.get(ref).count += qty;
        }
      }
    }
  }

  // Build unified parts list (unique refs, qty = count)
  const parts = Array.from(refCounts.entries()).map(([ref, data]) => ({
    ref,
    width: data.width,
    height: data.height,
    qty: data.count,
    canRotate: data.canRotate,
  }));

  return { manualSheets, parts };
}
