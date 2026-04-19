// src/utils/serviceCalculator.js
/**
 * Utilidad para calcular costos de servicios en despieces
 * Soporta múltiples atributos por servicio con detección avanzada
 * 
 * Detecta:
 * - Cantidad: x1, x2, x3 o número antes del servicio (2 Perf)
 * - Lados: 2L, 3L, 4L
 * - Metro lineal: ml, metro, m (con opción largo/ancho/suma)
 * - Metro cuadrado: m2, cuadrado
 * - Cantos: L1, L2, A1, A2
 * - Escala: escala60, escala120, 60, 120
 */

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Normaliza servicios al formato interno
 */
const normalizarServicios = (servicios) => {
  if (!servicios || servicios.length === 0) return [];
  
  return servicios.map(s => {
    if (s.atributos && Array.isArray(s.atributos)) {
      return {
        nombre: s.nombre,
        atributos: s.atributos.map(a => ({
          tipo: a.tipo,
          precio: parseFloat(a.precio) || 0,
          medida: a.medida || 'largo',  // para ml
          lados: a.lados || []          // para canto
        }))
      };
    }
    
    // Formato viejo
    return {
      nombre: s.nombre,
      atributos: [
        { tipo: s.tipo_cobro || 'unidad', precio: parseFloat(s.precio) || 0 }
      ]
    };
  });
};

/**
 * Detecta cantidad (x1, x2, x3 o número antes)
 */
const detectarCantidad = (detalle, nombre) => {
  if (!detalle || !nombre) return { cantidad: 1, resto: detalle };
  
  const detalleLower = detalle.toLowerCase();
  const nombreLower = nombre.toLowerCase();
  
  // Buscar "x1", "x2", "x3", etc.
  const xRegex = new RegExp(`${escapeRegExp(nombreLower)}\\s*x(\\d+)`, 'gi');
  let match = xRegex.exec(detalleLower);
  if (match) {
    const resto = detalle.replace(new RegExp(`${nombre}\\s*x\\d+`, 'i'), '').trim();
    return { cantidad: parseInt(match[1], 10), resto };
  }
  
  // Buscar número antes del servicio (ej: "2 Perf", "3 Cajas")
  const numAntesRegex = new RegExp(`(\\d+)\\s+${escapeRegExp(nombreLower)}`, 'gi');
  match = numAntesRegex.exec(detalleLower);
  if (match) {
    const resto = detalle.replace(new RegExp(`\\d+\\s+${nombre}`, 'i'), '').trim();
    return { cantidad: parseInt(match[1], 10), resto };
  }
  
  // Si solo está el nombre, es cantidad 1
  if (detalleLower.includes(nombreLower)) {
    const resto = detalle.replace(new RegExp(nombre, 'i'), '').trim();
    return { cantidad: 1, resto };
  }
  
  return { cantidad: 1, resto: detalle };
};

/**
 * Detecta lados (2L, 3L, 4L)
 */
const detectarLados = (detalle) => {
  if (!detalle) return { lados: 0, resto: detalle };
  
  const detalleLower = detalle.toLowerCase();
  
  // Buscar "2l", "3l", "4l"
  const ladosRegex = /(\d)l\b/gi;
  const match = ladosRegex.exec(detalleLower);
  
  if (match) {
    const lados = parseInt(match[1], 10);
    const resto = detalle.replace(new RegExp(`\\d+l`, 'i'), '').trim();
    return { lados, resto };
  }
  
  return { lados: 0, resto: detalle };
};

/**
 * Detecta metros lineales (ml, metro, m)
 */
const detectarML = (detalle) => {
  if (!detalle) return { usarML: false, resto: detalle };
  
  const detalleLower = detalle.toLowerCase();
  
  // Buscar "ml", "metro", "m " seguido de número o al final
  const mlRegex = /(\d+)\s*(?:ml|mm|m(?=\s|$))/gi;
  const match = mlRegex.exec(detalleLower);
  
  if (match) {
    const resto = detalle.replace(mlRegex, '').trim();
    return { usarML: true, resto };
  }
  
  // También detectar si dice solo "ml" o "metro"
  if (detalleLower.includes(' ml') || detalleLower.includes(' metro') || detalleLower.includes(' m ')) {
    const resto = detalle.replace(/\s+(ml|metro|m)\b/gi, '').trim();
    return { usarML: true, resto };
  }
  
  return { usarML: false, resto: detalle };
};

/**
 * Detecta metros cuadrados (m2)
 */
const detectarM2 = (detalle) => {
  if (!detalle) return { usarM2: false };
  const detalleLower = detalle.toLowerCase();
  return { usarM2: detalleLower.includes('m2') || detalleLower.includes('cuadrado') };
};

/**
 * Detecta cantos marcados (L1, L2, A1, A2)
 */
const detectarCantos = (detalle, ladosPermitidos = []) => {
  if (!detalle) return { cantos: 0 };
  
  const detalleLower = detalle.toLowerCase();
  let cantos = 0;
  const ladosEncontrados = [];
  
  ['l1', 'l2', 'a1', 'a2'].forEach(lado => {
    // Si hay lados permitidos, solo contar los que estén permitidos
    if (ladosPermitidos.length > 0 && !ladosPermitidos.includes(lado.toUpperCase())) {
      return;
    }
    
    const regex = new RegExp(`\\b${lado}\\b`, 'gi');
    if (regex.test(detalleLower)) {
      cantos++;
      ladosEncontrados.push(lado.toUpperCase());
    }
  });
  
  return { cantos, ladosEncontrados };
};

/**
 * Detecta escala (60, 120)
 */
const detectarEscala = (detalle) => {
  if (!detalle) return { escala: null };
  
  const detalleLower = detalle.toLowerCase();
  
  if (detalleLower.includes('escala120') || detalleLower.includes('120')) {
    return { escala: 120 };
  }
  if (detalleLower.includes('escala60') || detalleLower.includes('60')) {
    return { escala: 60 };
  }
  
  return { escala: null };
};

/**
 * Calcula el costo de una pieza según sus servicios
 */
export const calcularCostoServicios = (row, servicios) => {
  if (!row || !servicios || servicios.length === 0) {
    return { total: 0, details: [] };
  }

  const serviciosNormalizados = normalizarServicios(servicios);
  const cantidadPieza = parseInt(row.cantidad, 10) || 1;
  const largo = parseFloat(row.largo) || 0;
  const ancho = parseFloat(row.ancho) || 0;
  const detalle = row.detalle || row['detalle material'] || '';
  
  let totalCosto = 0;
  const serviceDetails = [];

  serviciosNormalizados.forEach((servicio) => {
    // 1. Detectar cantidad (x2, x3, o número antes)
    const { cantidad, resto: detalle1 } = detectarCantidad(detalle, servicio.nombre);
    
    // Si no encontró el servicio, continuar
    if (cantidad === 0 && !detalle.toLowerCase().includes(servicio.nombre.toLowerCase())) {
      return;
    }
    
    // 2. Buscar el atributo que corresponde según lo detectado en el detalle
    const { lados, resto: detalle2 } = detectarLados(detalle1);
    const { usarML } = detectarML(detalle2);
    const { usarM2 } = detectarM2(detalle2);
    const { escala } = detectarEscala(detalle2);
    const { cantos } = detectarCantos(detalle2, []);
    
    // Determinar tipo de cobro detectado
    let tipoDetectado = null;
    if (escala === 60) tipoDetectado = 'escala_60';
    else if (escala === 120) tipoDetectado = 'escala_120';
    else if (usarM2) tipoDetectado = 'm2';
    else if (usarML) tipoDetectado = 'ml';
    else if (cantos > 0) tipoDetectado = 'canto';
    else if (lados > 0) tipoDetectado = 'lados';
    else if (cantidad > 1) tipoDetectado = 'cantidad';
    else tipoDetectado = 'unidad'; // Default: usar primer atributo
    
    // Buscar precio del atributo detectado
    let attrEncontrado = null;
    if (tipoDetectado) {
      attrEncontrado = servicio.atributos.find(a => a.tipo === tipoDetectado);
    }
    
    // Si no encuentra el tipo detectado, usar el primer atributo
    if (!attrEncontrado && servicio.atributos && servicio.atributos.length > 0) {
      attrEncontrado = servicio.atributos[0];
      tipoDetectado = attrEncontrado.tipo;
    }
    
    if (!attrEncontrado) return;
    
    let costo = 0;
    const precioUnitario = attrEncontrado.precio;
    
    switch (attrEncontrado.tipo) {
      case 'ml':
        // Metro lineal: depende de la configuración (largo, ancho, suma)
        const medida = attrEncontrado.medida || 'largo';
        let metros = 0;
        if (medida === 'largo') metros = largo;
        else if (medida === 'ancho') metros = ancho;
        else metros = largo + ancho;
        
        costo = cantidad * cantidadPieza * (metros / 1000) * precioUnitario;
        break;
        
      case 'm2':
        // Metro cuadrado
        costo = cantidad * cantidadPieza * ((largo * ancho) / 1000000) * precioUnitario;
        break;
        
      case 'lados':
        // Por cantidad de lados (2L, 3L, 4L)
        costo = cantidad * cantidadPieza * (lados || 1) * precioUnitario;
        break;
        
      case 'cantidad':
        // Por cantidad específica (x2, x3)
        costo = cantidad * cantidadPieza * precioUnitario;
        break;
        
      case 'canto':
        // Por cantos marcados
        costo = cantidad * cantidadPieza * cantos * precioUnitario;
        break;
        
      case 'escala_60':
        const escala60 = Math.max(0, 60 - Math.min(largo, ancho)) / 60;
        costo = cantidad * cantidadPieza * precioUnitario * (1 + escala60);
        break;
        
      case 'escala_120':
        const escala120 = Math.max(0, 120 - Math.min(largo, ancho)) / 120;
        costo = cantidad * cantidadPieza * precioUnitario * (1 + escala120);
        break;
        
      case 'unidad':
      default:
        costo = cantidad * cantidadPieza * precioUnitario;
        break;
    }
    
    if (costo > 0) {
      totalCosto += costo;
      serviceDetails.push({
        nombre: servicio.nombre,
        cantidad,
        tipoCobro: attrEncontrado.tipo,
        precioUnitario,
        costoTotal: costo,
        detectado: tipoDetectado
      });
    }
  });

  return { total: Math.round(totalCosto), details: serviceDetails };
};

/**
 * Calcula totales de servicios para todos los despieces
 */
export const calcularTotalesServicios = (despieces, servicios) => {
  if (!despieces || !servicios) {
    return { totalGeneral: 0, porDespiece: {}, porServicio: {} };
  }

  let totalGeneral = 0;
  const porDespiece = {};
  const porServicio = {};

  despieces.forEach((despiece, idx) => {
    const despieceId = despiece.id || `despiece_${idx}`;
    let totalDespiece = 0;

    (despiece.filas || []).forEach((row) => {
      const { total, details } = calcularCostoServicios(row, servicios);
      totalDespiece += total;
      totalGeneral += total;

      details.forEach((d) => {
        if (!porServicio[d.nombre]) {
          porServicio[d.nombre] = 0;
        }
        porServicio[d.nombre] += d.costoTotal;
      });
    });

    porDespiece[despieceId] = totalDespiece;
  });

  return {
    totalGeneral: Math.round(totalGeneral),
    porDespiece,
    porServicio
  };
};

/**
 * Formatea precio
 */
export const formatPrice = (price) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(price);
};

export default {
  calcularCostoServicios,
  calcularTotalesServicios,
  formatPrice
};