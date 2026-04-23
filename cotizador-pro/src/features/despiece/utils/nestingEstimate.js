const DEFAULT_REFILADO_X = 20;
const DEFAULT_REFILADO_Y = 20;
const DEFAULT_SAW_KERF = 5;
const DEFAULT_EDGE_ALLOWANCE = 60;

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
