import { packGuillotine, packMaxRects, packHybrid } from './nesting/nestingAlgorithms';

function toNumber(value) {
  const p = Number(value);
  return Number.isFinite(p) ? p : 0;
}

export function buildNestingPreview({ rows = [], boardWidth = 0, boardHeight = 0, kerf = 5, refiladoX = 0, refiladoY = 0, allowGlobalRotation = false, algorithm = 'guillotine' }) {
  console.log(`=== NESTING ENGINE: ${algorithm.toUpperCase()} ===`);

  const parts = [];
  const unplaced = [];

// One-sided refilado: refiladoX deducts from RIGHT, refiladoY deducts from TOP
  // Refilado already includes edge kerf; kerf (piece spacing) is applied separately
  const usableWidth = Math.max(0, boardWidth - refiladoX);
  const usableHeight = Math.max(0, boardHeight - refiladoY);

  rows.forEach((row, index) => {
    const w = toNumber(row?.largo);
    const h = toNumber(row?.ancho);
    const q = Math.max(0, toNumber(row?.cantidad ?? row?.cant));

    let canRotate = false;
    if (allowGlobalRotation) {
      canRotate = true;
    } else {
      canRotate = String(row?.rotar || '').trim() === '1';
    }

    if (w > 0 && h > 0 && q > 0) {
      const label = row?.detalle?.trim() || `Pieza ${index + 1}`;
      const part = {
        id: row?.id || `piece_${index}`,
        ref: label,
        label,
        originalRowIndex: index,
        width: w,
        height: h,
        qty: q,
        canRotate: canRotate
      };
      
      const fitsNormal = (part.width <= usableWidth && part.height <= usableHeight);
      const fitsRotated = part.canRotate && (part.height <= usableWidth && part.width <= usableHeight);
      
      if (fitsNormal || fitsRotated) {
        parts.push(part);
      } else {
        for(let i=0; i < q; i++) {
          unplaced.push({...part, instanceId: `${part.id}_${i}`});
        }
      }
    }
  });

  if (!usableWidth || !usableHeight) {
    return {
      sheets: [],
      unplaced: [
        ...unplaced.map((part) => ({ ...part, label: part.label || part.ref })),
        ...parts.flatMap((part) => Array.from({ length: part.qty }, (_, i) => ({ ...part, label: part.ref, instanceId: `${part.id}_${i}` })))
      ]
    };
  }

  if (parts.length === 0) return { sheets: [], unplaced };

  const options = {
    marginTop: 0,
    marginRight: 0,
    kerf: kerf,
    allowRotation: true
  };

  let sheets = [];
  if (algorithm === 'maxrects') {
    sheets = packMaxRects(parts, usableWidth, usableHeight, options);
  } else if (algorithm === 'hybrid') {
    sheets = packHybrid(parts, usableWidth, usableHeight, options);
  } else {
    sheets = packGuillotine(parts, usableWidth, usableHeight, options);
  }
  
  sheets = sheets.map((sheet, sIdx) => ({
    ...sheet,
    index: sheet.id,
    pieces: sheet.pieces.map((p, pIdx) => ({
      ...p,
      label: p.ref,
      // Stable per-instance identity for hover/highlight in preview
      instanceId: p.instanceId || `${sheet.id}_${pIdx}_${p.ref}_${sIdx}`
    }))
  }));

  const placedInstanceIds = new Set(
    sheets.flatMap((sheet) => sheet.pieces.map((piece) => piece.instanceId).filter(Boolean))
  );

  const placementFailures = parts.flatMap((part) =>
    Array.from({ length: part.qty }, (_, i) => ({ ...part, instanceId: `${part.id}_${i}` }))
      .filter((piece) => !placedInstanceIds.has(piece.instanceId))
  );

  return { sheets, unplaced: [...unplaced, ...placementFailures] };
}

