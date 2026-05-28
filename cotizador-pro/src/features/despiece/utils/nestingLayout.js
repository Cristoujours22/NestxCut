function toNumber(value) { const p = Number(value); return Number.isFinite(p) ? p : 0; }
function normalizePiece(row, index, allowGlobalRotation = false) {
  const w = toNumber(row?.largo), h = toNumber(row?.ancho), q = Math.max(0, toNumber(row?.cantidad ?? row?.cant));
  return { id: row?.id || `piece_${index}`, label: row?.detalle?.trim() || `Pieza ${index + 1}`, width: w, height: h, quantity: q, canRotate: allowGlobalRotation || String(row?.rotar || '').trim() === '1' };
}
function createSheet(index, boardWidth, boardHeight) { return { index, pieces: [], freeRects: [{ x: 0, y: 0, width: boardWidth, height: boardHeight }] }; }
function canFit(rect, w, h) { return w <= rect.width && h <= rect.height; }
function scoreFit(rect, w, h) { return { waste: (rect.width * rect.height) - (w * h), shortSide: Math.min(rect.width - w, rect.height - h), longSide: Math.max(rect.width - w, rect.height - h) }; }

function pickBestFreeRect(freeRects, piece) {
  let best = null;
  freeRects.forEach((rect, ri) => {
    const opts = [{ rotated: false, width: piece.width, height: piece.height }, ...(piece.canRotate ? [{ rotated: true, width: piece.height, height: piece.width }] : [])];
    opts.forEach(o => { if (!canFit(rect, o.width, o.height)) return; const f = scoreFit(rect, o.width, o.height);
      if (!best || f.waste < best.fit.waste || (f.waste === best.fit.waste && f.shortSide < best.fit.shortSide) || (f.waste === best.fit.waste && f.shortSide === best.fit.shortSide && f.longSide < best.fit.longSide)) best = { rect, rectIndex: ri, option: o, fit: f }; });
  });
  return best;
}

function isContained(a, b) { return a.x >= b.x && a.y >= b.y && a.x + a.width <= b.x + b.width && a.y + a.height <= b.y + b.height; }
function pruneFreeRects(freeRects) { return freeRects.filter((r, i) => !freeRects.some((o, j) => i !== j && isContained(r, o))); }

function splitFreeRect(sheet, rectIndex, placed, kerf) {
  const rect = sheet.freeRects[rectIndex], rw = rect.width - placed.width - kerf, rh = rect.height - placed.height - kerf;
  const next = sheet.freeRects.filter((_, i) => i !== rectIndex);
  if (rw <= kerf && rh <= kerf) { sheet.freeRects = next; return; }
  const aA = Math.max(rw * rect.height, placed.width * rh), aB = Math.max(rw * placed.height, rect.width * rh);
  if (aA >= aB) { if (rw > kerf) next.push({ x: rect.x + placed.width + kerf, y: rect.y, width: rw, height: rect.height });
    if (rh > kerf) next.push({ x: rect.x, y: rect.y + placed.height + kerf, width: placed.width, height: rh }); }
  else { if (rw > kerf) next.push({ x: rect.x + placed.width + kerf, y: rect.y, width: rw, height: placed.height });
    if (rh > kerf) next.push({ x: rect.x, y: rect.y + placed.height + kerf, width: rect.width, height: rh }); }
  sheet.freeRects = pruneFreeRects(next.filter(c => c.width > kerf && c.height > kerf));
}

export function buildNestingPreview({ rows = [], boardWidth = 0, boardHeight = 0, kerf = 5, allowGlobalRotation = false }) {
  const pieces = rows.map((r, i) => ({ piece: normalizePiece(r, i, allowGlobalRotation), originalRowIndex: i }))
    .filter(({ piece }) => piece.width > 0 && piece.height > 0 && piece.quantity > 0)
    .flatMap(({ piece, originalRowIndex: ori }) => Array.from({ length: piece.quantity }, (_, idx) => ({ ...piece, instanceId: `${piece.id}_${idx}`, originalRowIndex: ori })));
  if (!boardWidth || !boardHeight || pieces.length === 0) return { sheets: [], unplaced: pieces };

  let best = null;
  for (const sf of strategies) { const r = pack([...pieces].sort(sf)); if (!best || r.unplaced.length < best.unplaced.length || (r.unplaced.length === best.unplaced.length && r.sheets.length < best.sheets.length)) best = r; }

  if (best.unplaced.length > 0) {
    const rem = [];
    for (const p of best.unplaced) { let ok = false; for (const s of best.sheets) { const c = pickBestFreeRect(s.freeRects, p); if (c) { s.pieces.push({ ...p, rotated: c.option.rotated, x: c.rect.x, y: c.rect.y, width: c.option.width, height: c.option.height }); splitFreeRect(s, c.rectIndex, { width: c.option.width, height: c.option.height }, kerf); ok = true; break; } } if (!ok) rem.push(p); }
    best.unplaced = rem;
  }
  if (best.unplaced.length > 0) { for (const sf of strategies) { const r = pack([...best.unplaced, ...pieces.filter(p => !best.unplaced.some(u => u.instanceId === p.instanceId))].sort(sf)); if (r.unplaced.length < best.unplaced.length) best = r; } }

  return best;
}
