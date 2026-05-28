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
    .flatMap(({ piece, ori }) => Array.from({ length: piece.quantity }, (_, idx) => ({ ...piece, instanceId: `${piece.id}_${idx}`, originalRowIndex: ori })));
  if (!boardWidth || !boardHeight || pieces.length === 0) return { sheets: [], unplaced: pieces };

  // Pre-pack 247-wide panels into columns (max 65% board height to avoid displacing large pieces)
  const packingPieces = (() => {
    const grouped = new Set();
    const cols = [];
    const fam247 = pieces.filter(p => p.width === 247);
    if (fam247.length >= 4) {
      const sorted = [...fam247].sort((a, b) => b.height - a.height);
      const maxColH = boardHeight * 0.65;
      const bins = [];
      sorted.forEach(p => {
        let best = -1, bestRem = Infinity;
        for (let i = 0; i < bins.length; i++) {
          const nh = bins[i].h + kerf + p.height;
          if (nh <= maxColH && (maxColH - nh) < bestRem) { bestRem = maxColH - nh; best = i; }
        }
        if (best >= 0) { bins[best].h += kerf + p.height; bins[best].ps.push(p); grouped.add(p.instanceId); }
        else { bins.push({ h: p.height, ps: [p] }); grouped.add(p.instanceId); }
      });
      bins.forEach(b => cols.push({ id: `col247_${cols.length}`, label: `Col 247`, width: 247, height: b.h, quantity: 1, canRotate: false, _kids: b.ps }));
    }
    return [...pieces.filter(p => !grouped.has(p.instanceId)), ...cols];
  })();

  const strategies = [
    (a, b) => { if (b.width !== a.width) return b.width - a.width; if (a.height !== b.height) return a.height - b.height; return (b.width*b.height)-(a.width*a.height); },
    (a, b) => { if (b.width !== a.width) return b.width - a.width; if (b.height !== a.height) return b.height - a.height; return (b.width*b.height)-(a.width*a.height); },
    (a, b) => { const mA = Math.max(a.width, a.height), mB = Math.max(b.width, b.height); if (mB !== mA) return mB - mA; return (b.width*b.height)-(a.width*a.height); },
    // Strategy D: Area descending (largest area first, compact packing)
    (a, b) => (b.width*b.height) - (a.width*a.height),
  ];

  function pack(sorted) {
    const sheets = [], unplaced = [];
    sorted.forEach(p => { let ok = false;
      for (const s of sheets) { const b = pickBestFreeRect(s.freeRects, p); if (!b) continue; s.pieces.push({ ...p, rotated: b.option.rotated, x: b.rect.x, y: b.rect.y, width: b.option.width, height: b.option.height }); splitFreeRect(s, b.rectIndex, { width: b.option.width, height: b.option.height }, kerf); ok = true; break; }
      if (!ok) { const ns = createSheet(sheets.length + 1, boardWidth, boardHeight); const b = pickBestFreeRect(ns.freeRects, p); if (!b) { unplaced.push(p); return; } ns.pieces.push({ ...p, rotated: b.option.rotated, x: b.rect.x, y: b.rect.y, width: b.option.width, height: b.option.height }); splitFreeRect(ns, b.rectIndex, { width: b.option.width, height: b.option.height }, kerf); sheets.push(ns); } });
    return { sheets: sheets.filter(s => s.pieces.length > 0), unplaced };
  }

  let best = null;
  for (const sf of strategies) { const r = pack([...packingPieces].sort(sf)); if (!best || r.unplaced.length < best.unplaced.length || (r.unplaced.length === best.unplaced.length && r.sheets.length < best.sheets.length)) best = r; }

  if (best.unplaced.length > 0) {
    const rem = [];
    for (const p of best.unplaced) { let ok = false; for (const s of best.sheets) { const c = pickBestFreeRect(s.freeRects, p); if (c) { s.pieces.push({ ...p, rotated: c.option.rotated, x: c.rect.x, y: c.rect.y, width: c.option.width, height: c.option.height }); splitFreeRect(s, c.rectIndex, { width: c.option.width, height: c.option.height }, kerf); ok = true; break; } } if (!ok) rem.push(p); }
    best.unplaced = rem;
  }
  if (best.unplaced.length > 0) { for (const sf of strategies) { const r = pack([...best.unplaced, ...packingPieces.filter(p => !best.unplaced.some(u => u.instanceId === p.instanceId))].sort(sf)); if (r.unplaced.length < best.unplaced.length) best = r; } }

  // Expand column groups back to individual pieces
  best.sheets = best.sheets.map(s => ({
    ...s,
    pieces: s.pieces.flatMap(p => {
      if (!p._kids) return [p];
      let cy = p.y;
      return p._kids.map(k => { const ep = { ...k, x: p.x, y: cy, rotated: false, width: k.width, height: k.height }; cy += k.height + kerf; return ep; });
    }),
  }));

  return best;
}
