import { buildNestingPreview } from '../../despiece/utils/nestingLayout';
import { calculateEstimatedSheetsWithSettings } from '../../despiece/utils/nestingEstimate';
import { calcularFondos } from './puertasCalculations';

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
    boardWidth: estimate.usableLargo || toNumber(material?.largo_mm),
    boardHeight: estimate.usableAncho || toNumber(material?.ancho_mm),
    kerf: settings.sawKerf ?? estimate.settings?.sawKerf ?? 5,
    allowGlobalRotation: false,
  });

  return {
    rows,
    estimate,
    preview,
  };
}
