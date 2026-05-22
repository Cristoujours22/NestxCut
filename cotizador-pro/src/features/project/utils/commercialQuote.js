// src/features/project/utils/commercialQuote.js
/**
 * Capa comercial para cotización a todo costo.
 * Fase 1A: UI + cálculo en memoria, sin persistencia.
 *
 * Aplica sobre el costo directo (despiece + herrajes) los ajustes comerciales:
 * - Desperdicio %
 * - Mano de obra %
 * - Utilidad %
 * - IVA (tasa editable, ON/OFF)
 *
 * Defaults seguros: modo OFF, todo en 0, no rompe proyectos viejos.
 */

export const DEFAULT_COMMERCIAL_CONFIG = {
  enabled: false,       // OFF por defecto = no cambia nada
  desperdicioPct: 0,     // 0% desperdicio
  manoObraPct: 0,        // 0% mano de obra
  utilidadPct: 0,         // 0% utilidad
  ivaEnabled: false,     // IVA apagado por defecto
  ivaTasa: 19,           // 19% estándar Colombian
};

/**
 * Aplica ajustes comerciales sobre el costo directo.
 *
 * @param {number} costoDirecto - Costo base (despiece + herrajes + cantos)
 * @param {object} config - Configuración comercial (ver DEFAULT_COMMERCIAL_CONFIG)
 * @returns {object} - Desglose completo del cálculo comercial
 */
export function calculateCommercialQuote(costoDirecto, config = {}) {
  const cfg = { ...DEFAULT_COMMERCIAL_CONFIG, ...config };

  if (!cfg.enabled) {
    return {
      enabled: false,
      costoDirecto,
      ajusteDesperdicio: 0,
      ajusteManoObra: 0,
      ajusteUtilidad: 0,
      subtotalAntesIva: costoDirecto,
      ivaMonto: 0,
      totalFinal: costoDirecto,
      // Para depuración
      _debug: {
        desperdicioPct: cfg.desperdicioPct,
        manoObraPct: cfg.manoObraPct,
        utilidadPct: cfg.utilidadPct,
        ivaEnabled: cfg.ivaEnabled,
        ivaTasa: cfg.ivaTasa,
      }
    };
  }

  // 1. Aplicar desperdicio sobre costo directo
  //    Formula: costoDirecto * (1 + desperdicioPct / 100)
  const ajusteDesperdicio = costoDirecto * (cfg.desperdicioPct / 100);
  const conDesperdicio = costoDirecto + ajusteDesperdicio;

  // 2. Aplicar mano de obra sobre el resultado anterior
  //    Formula: conDesperdicio * (1 + manoObraPct / 100)
  const ajusteManoObra = conDesperdicio * (cfg.manoObraPct / 100);
  const conManoObra = conDesperdicio + ajusteManoObra;

  // 3. Aplicar utilidad sobre el resultado anterior
  //    Formula: conManoObra * (1 + utilidadPct / 100)
  const ajusteUtilidad = conManoObra * (cfg.utilidadPct / 100);
  const subtotalAntesIva = conManoObra + ajusteUtilidad;

  // 4. Aplicar IVA si está habilitado
  //    Formula: subtotalAntesIva * (ivaTasa / 100)
  const ivaMonto = cfg.ivaEnabled ? subtotalAntesIva * (cfg.ivaTasa / 100) : 0;
  const totalFinal = subtotalAntesIva + ivaMonto;

  return {
    enabled: true,
    costoDirecto,
    ajusteDesperdicio: Math.round(ajusteDesperdicio),
    ajusteManoObra: Math.round(ajusteManoObra),
    ajusteUtilidad: Math.round(ajusteUtilidad),
    subtotalAntesIva: Math.round(subtotalAntesIva),
    ivaMonto: Math.round(ivaMonto),
    totalFinal: Math.round(totalFinal),
    _debug: {
      desperdicioPct: cfg.desperdicioPct,
      manoObraPct: cfg.manoObraPct,
      utilidadPct: cfg.utilidadPct,
      ivaEnabled: cfg.ivaEnabled,
      ivaTasa: cfg.ivaTasa,
    }
  };
}

/**
 * Formatea precio en COP
 */
export const formatPrice = (price) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price);
};

export default { calculateCommercialQuote, formatPrice, DEFAULT_COMMERCIAL_CONFIG };