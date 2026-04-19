const SIDE_TO_DIMENSION = {
  l1: 'largo',
  l2: 'largo',
  a1: 'ancho',
  a2: 'ancho',
};

export function getSideLength(side, row) {
  const dimension = SIDE_TO_DIMENSION[side];
  return Number(row?.[dimension] || 0);
}

export function normalizeCantoRef(value) {
  if (value === '' || value === null || value === undefined) return '';
  const normalized = Number(value);
  return Number.isNaN(normalized) ? '' : normalized;
}

export function calculateCantoSummary(despiece, inventoryItems = []) {
  const summaryMap = new Map();
  const cantos = despiece?.cantos || [];
  const rows = despiece?.filas || [];

  const resolveCanto = (ref) => {
    const canto = cantos.find((entry) => Number(entry.ref) === Number(ref));
    if (!canto) return null;

    const inventoryItem = inventoryItems.find((entry) => entry.id === canto.inventory_item_id);
    return {
      ...canto,
      nombre: canto.nombre || inventoryItem?.nombre || `Canto ${ref}`,
      tipo: canto.tipo || inventoryItem?.tipo_canto || 'rigido',
      calibre: canto.calibre || inventoryItem?.calibre || '',
      color: canto.color || inventoryItem?.color || '',
    };
  };

  rows.forEach((row) => {
    const cantidad = Number(row.cantidad || 0);
    if (cantidad <= 0) return;

    ['l1', 'l2', 'a1', 'a2'].forEach((side) => {
      const ref = normalizeCantoRef(row[side]);
      if (!ref) return;

      const canto = resolveCanto(ref);
      if (!canto) return;

      const sideLengthInMeters = (getSideLength(side, row) * cantidad) / 1000;
      if (sideLengthInMeters <= 0) return;

      if (!summaryMap.has(ref)) {
        summaryMap.set(ref, {
          ref,
          nombre: canto.nombre,
          tipo: canto.tipo,
          calibre: canto.calibre,
          color: canto.color,
          metros: 0,
          lados: 0,
        });
      }

      const current = summaryMap.get(ref);
      current.metros += sideLengthInMeters;
      current.lados += cantidad;
    });
  });

  const summary = [...summaryMap.values()].sort((a, b) => Number(a.ref) - Number(b.ref));
  return {
    summary,
    rigidMeters: summary.filter((item) => item.tipo === 'rigido').reduce((acc, item) => acc + item.metros, 0),
    flexibleMeters: summary.filter((item) => item.tipo === 'flexible').reduce((acc, item) => acc + item.metros, 0),
  };
}
