const DEFAULT_REFILADO_X = 20;
const DEFAULT_REFILADO_Y = 20;
const DEFAULT_SAW_KERF = 5;
const DEFAULT_EDGE_ALLOWANCE = 60;

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateEstimatedSheets({ rows = [], material }) {
  const largoTablero = toNumber(material?.largo_mm);
  const anchoTablero = toNumber(material?.ancho_mm);

  const usableLargo = Math.max(0, largoTablero - (DEFAULT_REFILADO_X * 2) - DEFAULT_SAW_KERF);
  const usableAncho = Math.max(0, anchoTablero - (DEFAULT_REFILADO_Y * 2) - DEFAULT_SAW_KERF);
  const boardArea = usableLargo * usableAncho;

  const piecesArea = rows.reduce((total, row) => {
    const cantidad = Math.max(0, toNumber(row?.cantidad ?? row?.cant));
    const largo = Math.max(0, toNumber(row?.largo));
    const ancho = Math.max(0, toNumber(row?.ancho));
    if (!cantidad || !largo || !ancho) return total;

    const largoConMargen = largo + DEFAULT_EDGE_ALLOWANCE;
    const anchoConMargen = ancho + DEFAULT_EDGE_ALLOWANCE;
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
    usableLargo,
    usableAncho,
    utilization,
    settings: {
      refiladoX: DEFAULT_REFILADO_X,
      refiladoY: DEFAULT_REFILADO_Y,
      sawKerf: DEFAULT_SAW_KERF,
      edgeAllowance: DEFAULT_EDGE_ALLOWANCE,
    },
  };
}
