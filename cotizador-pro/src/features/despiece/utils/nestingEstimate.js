import { buildNestingPreview } from './nestingLayout.js';

const DEFAULT_REFILADO_X = 20;
const DEFAULT_REFILADO_Y = 20;
const DEFAULT_SAW_KERF = 5;
const DEFAULT_EDGE_ALLOWANCE = 60;

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowFitsInBoard(row, usableLargo, usableAncho, edgeAllowance = DEFAULT_EDGE_ALLOWANCE) {
  const largo = Math.max(0, toNumber(row?.largo));
  const ancho = Math.max(0, toNumber(row?.ancho));
  const rotar = String(row?.rotar || '').trim() === '1';
  const largoConMargen = largo + edgeAllowance;
  const anchoConMargen = ancho + edgeAllowance;
  const fitsNormal = largoConMargen <= usableLargo && anchoConMargen <= usableAncho;
  const fitsRotated = rotar && anchoConMargen <= usableLargo && largoConMargen <= usableAncho;
  return fitsNormal || fitsRotated;
}

/**
 * Evaluate a single packing scenario (all full, all half, or mixed).
 * Returns { commercialCount, wasteScore, fullSheets, halfSheets, sheets }
 * where commercialCount = fullSheets + halfSheets * 0.5.
 *
 * @param {Function} buildNestingPreview - imported from nestingLayout to avoid ESM/require issues
 */
function evaluatePackingScenario({ rows, material, settings, scenario, fullLargo, fullAncho, buildNestingPreview }) {
  const refiladoX = toNumber(settings?.refiladoX ?? DEFAULT_REFILADO_X);
  const refiladoY = toNumber(settings?.refiladoY ?? DEFAULT_REFILADO_Y);
  const sawKerf = toNumber(settings?.sawKerf ?? DEFAULT_SAW_KERF);
  const edgeAllowance = toNumber(settings?.edgeAllowance ?? DEFAULT_EDGE_ALLOWANCE);

  // Helper: build nesting for a given board mode and dimensions
  const buildForBoard = (boardMode, largo, ancho) => {
    const usableLargo = Math.max(0, largo - refiladoX);
    const usableAncho = Math.max(0, ancho - refiladoY);
    const usableArea = usableLargo * usableAncho;
    return { usableLargo, usableAncho, usableArea, boardMode };
  };

  if (scenario === 'all-full') {
    const { usableLargo, usableAncho } = buildForBoard('full', fullLargo, fullAncho);
    const result = buildNestingPreview({ rows, boardWidth: fullLargo, boardHeight: fullAncho, kerf: sawKerf, refiladoX, refiladoY });
    const fullCount = result.sheets.length;
    const wasteArea = result.sheets.reduce((acc, sheet) => {
      const used = sheet.pieces.reduce((s, p) => s + p.width * p.height, 0);
      return acc + (usableLargo * usableAncho - used);
    }, 0);
    return {
      scenario,
      commercialCount: fullCount,
      wasteScore: wasteArea,
      fullSheets: fullCount,
      halfSheets: 0,
      sheets: result.sheets.map(s => ({ ...s, boardMode: 'full' })),
      unplaced: result.unplaced,
    };
  }

  if (scenario === 'all-half') {
    const halfLargo = fullLargo;
    const halfAncho = fullAncho / 2;
    const { usableLargo, usableAncho } = buildForBoard('half', halfLargo, halfAncho);
    const result = buildNestingPreview({ rows, boardWidth: halfLargo, boardHeight: halfAncho, kerf: sawKerf, refiladoX, refiladoY });
    const halfCount = result.sheets.length;
    const wasteArea = result.sheets.reduce((acc, sheet) => {
      const used = sheet.pieces.reduce((s, p) => s + p.width * p.height, 0);
      return acc + (usableLargo * usableAncho - used);
    }, 0);
    return {
      scenario,
      commercialCount: halfCount * 0.5,
      wasteScore: wasteArea,
      fullSheets: 0,
      halfSheets: halfCount,
      sheets: result.sheets.map(s => ({ ...s, boardMode: 'half' })),
      unplaced: result.unplaced,
    };
  }

  // scenario === 'mixed': first pack on full sheets, then try leftover pieces on half sheets.
  const fullBoard = buildForBoard('full', fullLargo, fullAncho);
  const halfLargo = fullLargo;
  const halfAncho = fullAncho / 2;
  const halfBoard = buildForBoard('half', halfLargo, halfAncho);

  const allFullResult = buildNestingPreview({ rows, boardWidth: fullLargo, boardHeight: fullAncho, kerf: sawKerf, refiladoX, refiladoY });

  let bestMixed = {
    scenario: 'all-full',
    commercialCount: allFullResult.sheets.length,
    wasteScore: allFullResult.sheets.reduce((acc, sheet) => {
      const used = sheet.pieces.reduce((s, p) => s + p.width * p.height, 0);
      return acc + (fullBoard.usableLargo * fullBoard.usableAncho - used);
    }, 0),
    fullSheets: allFullResult.sheets.length,
    halfSheets: 0,
    sheets: allFullResult.sheets.map((s) => ({ ...s, boardMode: 'full' })),
    unplaced: allFullResult.unplaced,
  };

  // Try k full sheets from the full packing, then pack the remaining pieces into half sheets.
  for (let keepFull = 0; keepFull <= allFullResult.sheets.length; keepFull += 1) {
    const keptFullSheets = allFullResult.sheets.slice(0, keepFull);
    const remainingPlacedPieces = allFullResult.sheets.slice(keepFull).flatMap((sheet) => sheet.pieces || []);
    const remainingRowsSource = [
      ...remainingPlacedPieces.map((piece) => {
        const row = rows[piece.originalRowIndex];
        return row ? { ...row, cantidad: 1, cant: 1 } : { largo: piece.width, ancho: piece.height, rotar: '0', cantidad: 1, cant: 1 };
      }),
      ...(allFullResult.unplaced || []).map((piece) => {
        const row = rows[piece.originalRowIndex];
        return row ? { ...row, cantidad: 1, cant: 1 } : { largo: piece.width, ancho: piece.height, rotar: '0', cantidad: 1, cant: 1 };
      }),
    ];

    const remainingRows = remainingRowsSource
      .filter((row) => rowFitsInBoard(row, halfBoard.usableLargo, halfBoard.usableAncho, edgeAllowance))
      .map((row, idx) => ({ ...row, id: `${row.id || 'row'}_half_${keepFull}_${idx}` }));

    const impossibleRows = remainingRowsSource.filter((row) => !rowFitsInBoard(row, halfBoard.usableLargo, halfBoard.usableAncho, edgeAllowance));

    const halfResult = remainingRows.length
      ? buildNestingPreview({ rows: remainingRows, boardWidth: halfLargo, boardHeight: halfAncho, kerf: sawKerf, refiladoX, refiladoY })
      : { sheets: [], unplaced: [] };

    const fullCount = keptFullSheets.length;
    const halfCount = halfResult.sheets.length;
    const commercialCount = fullCount + (halfCount * 0.5);
    const fullWaste = keptFullSheets.reduce((acc, sheet) => {
      const used = sheet.pieces.reduce((s, p) => s + p.width * p.height, 0);
      return acc + (fullBoard.usableLargo * fullBoard.usableAncho - used);
    }, 0);
    const halfWaste = halfResult.sheets.reduce((acc, sheet) => {
      const used = sheet.pieces.reduce((s, p) => s + p.width * p.height, 0);
      return acc + (halfBoard.usableLargo * halfBoard.usableAncho - used);
    }, 0);

    const candidate = {
      scenario: 'mixed',
      commercialCount,
      wasteScore: fullWaste + halfWaste,
      fullSheets: fullCount,
      halfSheets: halfCount,
      sheets: [
        ...keptFullSheets.map((s) => ({ ...s, boardMode: 'full' })),
        ...halfResult.sheets.map((s) => ({ ...s, boardMode: 'half' })),
      ],
      unplaced: [...impossibleRows, ...(halfResult.unplaced || [])],
    };

    const bestUnplaced = Array.isArray(bestMixed.unplaced) ? bestMixed.unplaced.length : 0;
    const candidateUnplaced = Array.isArray(candidate.unplaced) ? candidate.unplaced.length : 0;
    if (
      candidateUnplaced < bestUnplaced
      || (candidateUnplaced === bestUnplaced && candidate.commercialCount < bestMixed.commercialCount - 0.001)
      || (candidateUnplaced === bestUnplaced && Math.abs(candidate.commercialCount - bestMixed.commercialCount) < 0.001 && candidate.wasteScore < bestMixed.wasteScore)
    ) {
      bestMixed = candidate;
    }
  }

  return bestMixed;
}

/**
 * Select best packing across all candidates by:
 * 1. Minimal commercial equivalent count (full + half*0.5)
 * 2. Then minimal waste
 */
export function calculateCommercialPacking({ rows = [], material, settings = {} }) {
  const fullLargo = toNumber(material?.largo_mm);
  const fullAncho = toNumber(material?.ancho_mm);
  if (!fullLargo || !fullAncho || !rows?.length) {
    return { commercialCount: 0, fullSheets: 0, halfSheets: 0, sheets: [], unplaced: [], scenario: 'none' };
  }

  const scenarios = ['all-full', 'all-half', 'mixed'];
  const results = scenarios.map(s => evaluatePackingScenario({ rows, material, settings, scenario: s, fullLargo, fullAncho, buildNestingPreview }));

  // Sort: first prefer solutions that place more pieces, then minimal commercialCount, then minimal waste.
  results.sort((a, b) => {
    const aUnplaced = Array.isArray(a.unplaced) ? a.unplaced.length : 0;
    const bUnplaced = Array.isArray(b.unplaced) ? b.unplaced.length : 0;
    if (aUnplaced !== bUnplaced) return aUnplaced - bUnplaced;
    if (a.commercialCount !== b.commercialCount) return a.commercialCount - b.commercialCount;
    return a.wasteScore - b.wasteScore;
  });

  const best = results[0];
  return {
    commercialCount: best.commercialCount,
    fullSheets: best.fullSheets,
    halfSheets: best.halfSheets,
    sheets: best.sheets,
    unplaced: best.unplaced,
    scenario: best.scenario,
    // Include settings for reference
    settings: {
      refiladoX: toNumber(settings?.refiladoX ?? DEFAULT_REFILADO_X),
      refiladoY: toNumber(settings?.refiladoY ?? DEFAULT_REFILADO_Y),
      sawKerf: toNumber(settings?.sawKerf ?? DEFAULT_SAW_KERF),
      edgeAllowance: toNumber(settings?.edgeAllowance ?? DEFAULT_EDGE_ALLOWANCE),
      boardLargo: fullLargo,
      boardAncho: fullAncho,
    },
  };
}

export function calculateEstimatedSheets({ rows = [], material }) {
  return calculateEstimatedSheetsWithSettings({ rows, material });
}

export function calculateEstimatedSheetsWithSettings({ rows = [], material, settings = {}, boardMode = 'full' }) {
  const fullLargo = toNumber(material?.largo_mm);
  const fullAncho = toNumber(material?.ancho_mm);
  const largoTablero = fullLargo;
  const anchoTablero = boardMode === 'half' ? fullAncho / 2 : fullAncho;

  const refiladoX = toNumber(settings.refiladoX ?? DEFAULT_REFILADO_X);
  const refiladoY = toNumber(settings.refiladoY ?? DEFAULT_REFILADO_Y);
  const sawKerf = toNumber(settings.sawKerf ?? DEFAULT_SAW_KERF);
  const edgeAllowance = toNumber(settings.edgeAllowance ?? DEFAULT_EDGE_ALLOWANCE);

  const usableLargo = Math.max(0, largoTablero - refiladoX);
  const usableAncho = Math.max(0, anchoTablero - refiladoY);
  const boardArea = usableLargo * usableAncho;

  const piecesArea = rows.reduce((total, row) => {
    const cantidad = Math.max(0, toNumber(row?.cantidad ?? row?.cant));
    const largo = Math.max(0, toNumber(row?.largo));
    const ancho = Math.max(0, toNumber(row?.ancho));
    if (!cantidad || !largo || !ancho) return total;

    const largoConMargen = largo + edgeAllowance;
    const anchoConMargen = ancho + edgeAllowance;
    return total + (cantidad * largoConMargen * anchoConMargen);
  }, 0);

  const estimatedSheets = boardArea > 0 ? Math.ceil(piecesArea / boardArea) : 0;
  const utilization = boardArea > 0 && estimatedSheets > 0
    ? Math.min(100, (piecesArea / (boardArea * estimatedSheets)) * 100)
    : 0;

  return {
    estimatedSheets,
    boardArea,
    piecesArea,
    boardLargo: largoTablero,
    boardAncho: anchoTablero,
    usableLargo,
    usableAncho,
    utilization,
    settings: {
      refiladoX,
      refiladoY,
      sawKerf,
      edgeAllowance,
    },
    boardMode,
  };
}
