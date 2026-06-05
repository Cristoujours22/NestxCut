import { buildNestingPreview } from '../../despiece/utils/nestingLayout';
import { calculateEstimatedSheetsWithSettings } from '../../despiece/utils/nestingEstimate';
import { calcularFondos, calcularBastidores } from './puertasCalculations';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function fondosToNestingRows({ hoja, config, cantidad = 1 }) {
  const fondos = calcularFondos(hoja, config);

  return fondos.map((fondo, index) => ({
    id: fondo.id || `fondo_${index}`,
    cantidad: Math.max(1, toNumber(fondo.cantidad || 1) * Math.max(1, toNumber(cantidad || 1))),
    largo: toNumber(fondo.largoMm),
    ancho: toNumber(fondo.anchoMm),
    detalle: fondo.detalle,
    rotar: '',
  }));
}

export function buildFondosNestingPreview({ hoja, config, cantidad = 1, material, settings = {}, boardMode = 'full' }) {
  const rows = fondosToNestingRows({ hoja, config, cantidad });
  const estimate = calculateEstimatedSheetsWithSettings({
    rows,
    material,
    settings,
    boardMode,
  });

  const preview = buildNestingPreview({
    rows,
    boardWidth: toNumber(material?.largo_mm),
    boardHeight: toNumber(material?.ancho_mm),
    kerf: settings.sawKerf ?? estimate.settings?.sawKerf ?? 5,
    refiladoX: settings.refiladoX ?? 20,
    refiladoY: settings.refiladoY ?? 20,
    allowGlobalRotation: false,
  });

  return {
    rows,
    estimate,
    preview,
  };
}

/**
 * Convert bastidor pieces ( verticals + horizontals ) into nesting rows.
 * Each row uses the actual bastidor inventory item dimensions as the piece size.
 * The "board" for nesting is the selected bastidor inventory item itself.
 */
export function bastidoresToNestingRows({ hoja, config, cantidad = 1 }) {
  const bastidores = calcularBastidores(hoja, config);

  return bastidores.map((piece, index) => ({
    id: piece.id || `bastidor_${index}`,
    cantidad: Math.max(1, toNumber(piece.cantidad || 1) * Math.max(1, toNumber(cantidad || 1))),
    largo: toNumber(piece.largoMm),
    ancho: toNumber(piece.anchoMm),
    detalle: piece.detalle,
    rotar: '',
  }));
}

/**
 * Build a nesting preview for bastidor pieces using the bastidor inventory item
 * dimensions as both the piece dimensions AND the board dimensions.
 * This tells us how many sheets of bastidor lumber are needed.
 */
export function buildBastidoresNestingPreview({ hoja, config, cantidad = 1, bastidorItem, settings = {}, boardMode = 'full' }) {
  if (!bastidorItem) return null;

  const rows = bastidoresToNestingRows({ hoja, config, cantidad });

  // Use the bastidor inventory item's dimensions as the board
  const boardWidth = toNumber(bastidorItem.largo_mm);
  const boardHeight = toNumber(bastidorItem.ancho_mm);

  const estimate = calculateEstimatedSheetsWithSettings({
    rows,
    material: bastidorItem,
    settings,
    boardMode,
  });

  const preview = buildNestingPreview({
    rows,
    boardWidth,
    boardHeight,
    kerf: settings.sawKerf ?? estimate.settings?.sawKerf ?? 5,
    refiladoX: settings.refiladoX ?? 20,
    refiladoY: settings.refiladoY ?? 20,
    allowGlobalRotation: false,
  });

  return {
    rows,
    estimate,
    preview,
    boardName: bastidorItem.nombre || 'Bastidor',
    boardDimensions: `${boardWidth} × ${boardHeight} mm`,
  };
}

/**
 * Build a combined nesting summary for Puertas that includes both
 * fondos (6mm sheets) and bastidores, with alma excluded/pending.
 */
export function buildPuertasNestingSummary({
  hoja,
  config,
  cantidad = 1,
  fondoMaterial,
  bastidorItem,
  settings = {},
  boardMode = 'full',
}) {
  const fondosResult = buildFondosNestingPreview({
    hoja,
    config,
    cantidad,
    material: fondoMaterial,
    settings,
    boardMode,
  });

  const bastidoresResult = buildBastidoresNestingPreview({
    hoja,
    config,
    cantidad,
    bastidorItem,
    settings,
    boardMode,
  });

  // Combined totals — use actual preview sheet counts, not area-estimate
  const fondoSheets = fondosResult.preview?.sheets?.length || 0;
  const bastidorSheets = bastidoresResult?.preview?.sheets?.length || 0;
  const totalSheets = fondoSheets + bastidorSheets;

  const allRows = [
    ...fondosResult.rows.map(r => ({ ...r, category: 'fondo' })),
    ...(bastidoresResult?.rows || []).map(r => ({ ...r, category: 'bastidor' })),
  ];

  const totalPieces = allRows.reduce((acc, r) => acc + Number(r.cantidad || 0), 0);

  // Weighted utilization (area-weighted average)
  const fondoArea = (fondosResult.estimate?.piecesArea || 0);
  const bastidorArea = (bastidoresResult?.estimate?.piecesArea || 0);
  const totalPiecesArea = fondoArea + bastidorArea;

  const avgUtilization = totalSheets > 0
    ? (
        ((fondosResult.estimate?.utilization || 0) * fondoSheets
          + (bastidoresResult?.estimate?.utilization || 0) * bastidorSheets)
        / totalSheets
      )
    : 0;

  return {
    fondos: {
      ...fondosResult,
      sheetCount: fondoSheets,
      unitCost: toNumber(fondoMaterial?.costo_unitario || 0),
    },
    bastidores: bastidoresResult ? {
      ...bastidoresResult,
      // Use actual sheet count from preview, not the area-based estimate
      // The estimate formula inflates dimensions with edgeAllowance and can
      // underestimate when pieces barely fit (e.g., a 60mm piece with 60mm
      // allowance becomes 120x120, inflating area 4x and potentially giving 0 sheets
      // when the preview correctly places it on 1 sheet).
      sheetCount: bastidoresResult?.preview?.sheets?.length || bastidorSheets,
      unitCost: toNumber(bastidorItem?.costo_unitario || 0),
    } : null,
    summary: {
      totalSheets,
      totalPieces,
      avgUtilization,
      fondosSheetCount: fondoSheets,
      bastidoresSheetCount: bastidorSheets,
      // Alma explicitly pending
      almaSheets: null,
      almaStatus: 'pending',
    },
  };
}
