import { createDespieceRow } from './despieceRow';

function normalizeRows(rows = [], despieceIndex = 0) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [{
      ...createDespieceRow(),
      id: `row_${despieceIndex}_0`,
    }];
  }

  return rows.map((row, rowIndex) => ({
    ...createDespieceRow(),
    ...row,
    id: row?.id || `row_${despieceIndex}_${rowIndex}`,
  }));
}

export const createDespieceTab = (name = 'Despiece 1', rows = [createDespieceRow()]) => ({
  id: `desp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  nombre: name,
  material_id: null,
  cantos: [],
  filas: normalizeRows(rows),
});

export function getDespieceComparableSignature(data) {
  return JSON.stringify((data || []).map((despiece) => ({
    nombre: despiece.nombre || '',
    material_id: despiece.material_id || null,
    cantos: (despiece.cantos || []).map((canto) => ({
      ref: canto.ref ?? '',
      inventory_item_id: canto.inventory_item_id || '',
      nombre: canto.nombre || '',
      tipo: canto.tipo || '',
      calibre: canto.calibre || '',
      color: canto.color || '',
    })),
    filas: (despiece.filas || []).map((row) => ({
      cantidad: row.cantidad ?? '',
      largo: row.largo ?? '',
      ancho: row.ancho ?? '',
      detalle: row.detalle ?? '',
      rotar: row.rotar ?? '',
      l1: row.l1 ?? '',
      l2: row.l2 ?? '',
      a1: row.a1 ?? '',
      a2: row.a2 ?? '',
    })),
  })));
}

export const normalizeInitialDespieces = (initialData) => {
  if (!initialData || (Array.isArray(initialData) && initialData.length === 0)) {
    return [{
      id: 'desp_0',
      nombre: 'Despiece 1',
      material_id: null,
      cantos: [],
      filas: normalizeRows([], 0),
    }];
  }

  if (Array.isArray(initialData) && initialData.every((item) => item && Array.isArray(item.filas))) {
    return initialData.map((despiece, index) => ({
      ...despiece,
      id: despiece.id || `desp_${index}`,
      nombre: despiece.nombre || `Despiece ${index + 1}`,
      material_id: despiece.material_id || null,
      cantos: Array.isArray(despiece.cantos) ? despiece.cantos : [],
      filas: normalizeRows(despiece.filas, index),
    }));
  }

  return [createDespieceTab('Despiece 1', initialData)];
};
