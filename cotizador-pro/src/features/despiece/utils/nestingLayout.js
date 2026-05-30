import { packGuillotine, packMaxRects } from './nesting/nestingAlgorithms';

function toNumber(value) {
  const p = Number(value);
  return Number.isFinite(p) ? p : 0;
}

export function buildNestingPreview({ rows = [], boardWidth = 0, boardHeight = 0, kerf = 5, margin = 0, allowGlobalRotation = false, algorithm = 'guillotine' }) {
  console.log(`=== NESTING ENGINE: ${algorithm.toUpperCase()} ===`);

  const parts = [];
  const unplaced = [];

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
      const part = {
        id: row?.id || `piece_${index}`,
        ref: row?.detalle?.trim() || `Pieza ${index + 1}`,
        width: w,
        height: h,
        qty: q,
        canRotate: canRotate
      };
      
      const fitsNormal = (part.width <= boardWidth && part.height <= boardHeight);
      const fitsRotated = part.canRotate && (part.height <= boardWidth && part.width <= boardHeight);
      
      if (fitsNormal || fitsRotated) {
        parts.push(part);
      } else {
        for(let i=0; i < q; i++) {
          unplaced.push({...part, instanceId: `${part.id}_${i}`});
        }
      }
    }
  });

  if (!boardWidth || !boardHeight || parts.length === 0) return { sheets: [], unplaced };

  const options = {
    marginTop: margin, 
    marginRight: margin, 
    kerf: kerf,
    allowRotation: true
  };

  let sheets = [];
  if (algorithm === 'maxrects') {
    sheets = packMaxRects(parts, boardWidth, boardHeight, options);
  } else {
    sheets = packGuillotine(parts, boardWidth, boardHeight, options);
  }
  
  sheets = sheets.map(sheet => ({
    ...sheet,
    index: sheet.id,
    pieces: sheet.pieces.map((p, idx) => ({
      ...p,
      label: p.ref,
      instanceId: `${p.ref}_${idx}_${sheet.id}`
    }))
  }));

  return { sheets, unplaced };
}

