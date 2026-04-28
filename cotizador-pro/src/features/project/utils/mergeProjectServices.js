// src/features/project/utils/mergeProjectServices.js
/**
 * Utility para consolidar servicios automáticos (despiece) con servicios manuales
 * (Herajes y Extras) mostrando cantidad, valores unitarios y subtotales por origen.
 * 
 * IMPORTANTE: Los servicios se agrupan por MATERIAL (lámina) porque cada material
 * puede tener servicios diferentes y costos diferentes.
 */

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function normalizeAtributos(servicio) {
  if (!servicio) return [];
  let attrs = servicio?.atributos || [];
  if (typeof attrs === 'string') {
    try { attrs = JSON.parse(attrs); }
    catch { attrs = []; }
  }
  return Array.isArray(attrs) ? attrs : [];
}

function getPrecioBase(servicio) {
  const attrs = normalizeAtributos(servicio);
  return Number(attrs[0]?.precio || servicio?.precio || 0);
}

function detectarEnDetalle(detalle, nombre) {
  if (!detalle || !nombre) return 0;
  const detalleLower = detalle.toLowerCase();
  const nombreLower = nombre.toLowerCase();
  if (!detalleLower.includes(nombreLower)) return 0;
  const regexCantidad = new RegExp(`(\\d+)\\s*[x]?\\s*${escapeRegExp(nombreLower)}`, 'gi');
  const match = detalle.match(regexCantidad);
  if (match) return parseInt(match[1], 10) || 1;
  return 1;
}

function calcularCostoAutomatico(servicio, row) {
  const attrs = normalizeAtributos(servicio);
  if (!attrs || attrs.length === 0) return 0;
  const cantidadPieza = parseInt(row.cantidad || 0) || 1;
  const largo = parseFloat(row.largo || 0) || 0;
  const ancho = parseFloat(row.ancho || 0) || 0;
  const cantidadDetectada = detectarEnDetalle(row.detalle || '', servicio.nombre);
  if (cantidadDetectada === 0) return 0;
  const attr = attrs[0];
  let costo = 0;
  switch (attr.tipo) {
    case 'ml': {
      const medida = attr.medida || 'largo';
      let metros = medida === 'largo' ? largo : medida === 'ancho' ? ancho : largo + ancho;
      costo = cantidadDetectada * cantidadPieza * (metros / 1000) * attr.precio;
      break;
    }
    case 'm2':
      costo = cantidadDetectada * cantidadPieza * ((largo * ancho) / 1000000) * attr.precio;
      break;
    case 'cantidad':
    case 'unidad':
    case 'lados':
    case 'canto':
      costo = cantidadDetectada * cantidadPieza * attr.precio;
      break;
    case 'escala_60': {
      const escala = Math.max(0, 60 - Math.min(largo, ancho)) / 60;
      costo = cantidadDetectada * cantidadPieza * attr.precio * (1 + escala);
      break;
    }
    case 'escala_120': {
      const escala = Math.max(0, 120 - Math.min(largo, ancho)) / 120;
      costo = cantidadDetectada * cantidadPieza * attr.precio * (1 + escala);
      break;
    }
    default:
      costo = cantidadDetectada * cantidadPieza * attr.precio;
  }
  return Math.round(costo);
}

function detectarServiciosPorMaterial(despieceData, servicios, inventoryItems = []) {
  const resultadosPorMaterial = [];
  const inventoryMap = new Map((inventoryItems || []).map(item => [item.id, item]));
  
  despieceData.forEach((despiece, idx) => {
    const materialId = despiece.material_id;
    const materialNombre = despiece.material_nombre || `Lámina ${idx + 1}`;
    const filas = despiece?.filas || [];
    const serviciosDetectados = new Map();
    let laminaTotalServicios = 0;
    let piezaCount = 0;
    
    // Buscar precio del material en inventario (campo: costo_unitario)
    const inventoryMaterial = inventoryMap.get(materialId);
    const precioUnitarioLamina = Number(
      despiece.costo_unitario || 
      despiece.precio_unitario || 
      inventoryMaterial?.costo_unitario || 
      inventoryMaterial?.precio || 
      0
    );
    const cantidadLaminas = Number(despiece.cantidad || despiece.laminas || Math.ceil(filas.reduce((acc, r) => acc + (parseInt(r.cantidad || 0) || 0), 0) / 4) || 1);
    const valorTotalLaminas = precioUnitarioLamina * cantidadLaminas;
    
    filas.forEach((row) => {
      const cantidad = parseInt(row.cantidad || 0) || 0;
      if (cantidad <= 0) return;
      piezaCount += cantidad;
      servicios.forEach((servicio) => {
        const cantidadDetectada = detectarEnDetalle(row.detalle || '', servicio.nombre);
        if (cantidadDetectada === 0) return;
        const costo = calcularCostoAutomatico(servicio, row);
        if (!serviciosDetectados.has(servicio.id)) {
          serviciosDetectados.set(servicio.id, {
            servicio_id: servicio.id,
            nombre: servicio.nombre,
            modo_origen: servicio.modo_origen || 'despiece',
            valorUnitario: getPrecioBase(servicio),
            automatico: { cantidad: 0, subtotal: 0 },
            manual: { cantidad: 0, subtotal: 0 },
          });
        }
        const current = serviciosDetectados.get(servicio.id);
        current.automatico.cantidad += cantidadDetectada * cantidad;
        current.automatico.subtotal += costo * cantidad;
        laminaTotalServicios += costo * cantidad;
      });
    });
    if (serviciosDetectados.size > 0 || piezaCount > 0 || valorTotalLaminas > 0) {
      resultadosPorMaterial.push({
        material_id: materialId,
        material_nombre: materialNombre,
        piezaCount,
        cantidadLaminas,
        precioUnitarioLamina,
        valorTotalLaminas,
        servicios: [...serviciosDetectados.values()],
        subtotalAutomatico: laminaTotalServicios,
      });
    }
  });
  return resultadosPorMaterial;
}

function calcularCantosPorMaterial(despieceData) {
  const resultadosPorMaterial = [];
  despieceData.forEach((despiece, idx) => {
    const materialId = despiece.material_id;
    const materialNombre = despiece.material_nombre || `Lámina ${idx + 1}`;
    const cantosData = despiece?.cantos || [];
    const filas = despiece?.filas || [];
    const cantosMap = new Map();
    let totalMetros = 0;
    filas.forEach((row) => {
      const cantidad = parseInt(row.cantidad || 0) || 0;
      if (cantidad <= 0) return;
      ['l1', 'l2', 'a1', 'a2'].forEach(side => {
        const ref = Number(row[side]);
        if (!ref || ref <= 0) return;
        const dimensionMm = (side === 'l1' || side === 'l2') ? Number(row.largo || 0) : Number(row.ancho || 0);
        const metros = (dimensionMm * cantidad) / 1000;
        if (metros <= 0) return;
        if (!cantosMap.has(ref)) {
          const invCanto = cantosData.find(c => Number(c.ref) === ref);
          cantosMap.set(ref, {
            ref,
            nombre: invCanto?.nombre || `Canto #${ref}`,
            tipo: invCanto?.tipo || 'rigido',
            color: invCanto?.color || '',
            calibre: invCanto?.calibre || '',
            metros: 0,
            precio: Number(invCanto?.costo_unitario || 0)
          });
        }
        const current = cantosMap.get(ref);
        current.metros += metros;
        totalMetros += metros;
      });
    });
    if (cantosMap.size > 0 || totalMetros > 0) {
      const cantosArray = [...cantosMap.values()].map(c => ({
        ...c,
        costo: Math.round(c.metros * c.precio)
      }));
      resultadosPorMaterial.push({
        material_id: materialId,
        material_nombre: materialNombre,
        cantos: cantosArray.sort((a, b) => a.ref - b.ref),
        totalMetros,
        costoTotal: cantosArray.reduce((acc, c) => acc + c.costo, 0)
      });
    }
  });
  return resultadosPorMaterial;
}

function extraerServiciosManuales(manualItems) {
  return (manualItems || [])
    .filter(item => item.servicio_id || item.origen === 'manual')
    .map(item => ({
      servicio_id: item.servicio_id,
      nombre: item.nombre,
      modo_origen: item.modo_origen || 'manual',
      valorUnitario: item.precio,
      manual: { cantidad: item.cantidad || 1, subtotal: item.subtotal || item.precio || 0 }
    }));
}

export function mergeProjectServices(despieceData, servicios, manualItems, inventoryItems = []) {
  const porMaterial = detectarServiciosPorMaterial(despieceData, servicios, inventoryItems);
  const cantosPorMaterial = calcularCantosPorMaterial(despieceData);
  const manuales = extraerServiciosManuales(manualItems);
  const manualMap = new Map();
  manuales.forEach(serv => { manualMap.set(serv.servicio_id, serv); });
  const resultado = porMaterial.map(mat => {
    const serviciosConsolidados = mat.servicios.map(serv => {
      const manual = manualMap.get(serv.servicio_id);
      const manualData = manual ? manual.manual : { cantidad: 0, subtotal: 0 };
      return {
        ...serv,
        manual: manualData,
        total: {
          cantidad: serv.automatico.cantidad + manualData.cantidad,
          subtotal: serv.automatico.subtotal + manualData.subtotal
        }
      };
    });
    manualMap.forEach((manual, servId) => {
      if (!serviciosConsolidados.find(s => s.servicio_id === servId)) {
        serviciosConsolidados.push({
          servicio_id: manual.servicio_id,
          nombre: manual.nombre,
          modo_origen: manual.modo_origen,
          valorUnitario: manual.valorUnitario,
          automatico: { cantidad: 0, subtotal: 0 },
          manual: manual.manual,
          total: { cantidad: manual.manual.cantidad, subtotal: manual.manual.subtotal }
        });
      }
    });
    const subtotalManual = serviciosConsolidados.reduce((acc, s) => acc + s.manual.subtotal, 0);
    // El subtotal del material incluye: valor láminas + servicios auto + servicios manuales
    const subtotalMaterial = (mat.valorTotalLaminas || 0) + mat.subtotalAutomatico + subtotalManual;
    return {
      ...mat,
      servicios: serviciosConsolidados.sort((a, b) => a.nombre.localeCompare(b.nombre)),
      subtotalManual,
      subtotal: subtotalMaterial
    };
  });
  cantosPorMaterial.forEach(cantoMat => {
    if (!resultado.find(m => m.material_id === cantoMat.material_id)) {
      resultado.push({
        material_id: cantoMat.material_id,
        material_nombre: cantoMat.material_nombre,
        piezaCount: 0,
        servicios: [],
        subtotalAutomatico: 0,
        subtotalManual: 0,
        subtotal: 0
      });
    }
  });
  return resultado;
}

export function calculateServicesTotal(despieceData, servicios, manualItems, inventoryItems = []) {
  const porMaterial = mergeProjectServices(despieceData, servicios, manualItems, inventoryItems);
  const cantosPorMaterial = calcularCantosPorMaterial(despieceData);
  const subtotalAuto = porMaterial.reduce((acc, mat) => acc + mat.subtotalAutomatico, 0);
  const subtotalManual = porMaterial.reduce((acc, mat) => acc + mat.subtotalManual, 0);
  const subtotalLaminas = porMaterial.reduce((acc, mat) => acc + (mat.valorTotalLaminas || 0), 0);
  const cantosCosto = cantosPorMaterial.reduce((acc, mat) => acc + mat.costoTotal, 0);
  const serviciosUnicos = new Map();
  porMaterial.forEach(mat => {
    mat.servicios.forEach(serv => {
      if (serviciosUnicos.has(serv.servicio_id)) {
        const existing = serviciosUnicos.get(serv.servicio_id);
        existing.automatico.cantidad += serv.automatico.cantidad;
        existing.automatico.subtotal += serv.automatico.subtotal;
        existing.manual.cantidad += serv.manual.cantidad;
        existing.manual.subtotal += serv.manual.subtotal;
        existing.total.cantidad += serv.total.cantidad;
        existing.total.subtotal += serv.total.subtotal;
      } else {
        serviciosUnicos.set(serv.servicio_id, { ...serv });
      }
    });
  });
  serviciosUnicos.forEach(serv => {
    serv.total.cantidad = serv.automatico.cantidad + serv.manual.cantidad;
    serv.total.subtotal = serv.automatico.subtotal + serv.manual.subtotal;
  });
  return {
    porMaterial,
    cantosPorMaterial,
    servicios: [...serviciosUnicos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    subtotalLaminas,
    subtotalAutomatico: subtotalAuto,
    subtotalManual,
    subtotalServicios: subtotalAuto + subtotalManual,
    subtotalCantos: cantosCosto,
    subtotal: subtotalLaminas + subtotalAuto + subtotalManual + cantosCosto
  };
}

export default { mergeProjectServices, calculateServicesTotal };