export function getStockReal(item) {
  return Number(item?.cantidad_disponible || 0) - Number(item?.cantidad_reservada || 0);
}

export function getStockStatus(item) {
  const real = getStockReal(item);
  const minimo = Number(item?.stock_minimo || 0);

  if (real <= 0) return 'agotado';
  if (real <= minimo) return 'bajo';
  return 'ok';
}

export function getReorderTarget(item) {
  const minimo = Number(item?.stock_minimo || 0);
  const objetivo = Number(item?.stock_objetivo || 0);
  return objetivo > 0 ? objetivo : minimo;
}

export function getReorderQuantity(item) {
  const real = getStockReal(item);
  const target = getReorderTarget(item);
  return Math.max(0, target - real);
}

export function getRestockPriority(item) {
  const real = getStockReal(item);
  const minimo = Number(item?.stock_minimo || 0);
  const faltante = getReorderQuantity(item);

  if (real <= 0) return { level: 'critica', label: 'Crítica', score: 3, faltante };
  if (minimo > 0 && real <= minimo) return { level: 'alta', label: 'Alta', score: 2, faltante };
  if (faltante > 0) return { level: 'media', label: 'Media', score: 1, faltante };
  return { level: 'normal', label: 'Normal', score: 0, faltante: 0 };
}

export function filterInventoryItems(items, { type, search, status, specificFilter }) {
  return items.filter((item) => {
    if (type && item.item_type !== type) return false;

    if (search) {
      const haystack = [item.nombre, item.codigo, item.material, item.tipo, item.medida, item.ubicacion]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }

    if (status && status !== 'todos') {
      if (getStockStatus(item) !== status) return false;
    }

    if (specificFilter?.value) {
      if (type === 'tablero' && specificFilter.field === 'material') {
        if ((item.material || '').toLowerCase() !== specificFilter.value.toLowerCase()) return false;
      }
      if (type === 'herraje' && specificFilter.field === 'tipo') {
        if ((item.tipo || '').toLowerCase() !== specificFilter.value.toLowerCase()) return false;
      }
      if (type === 'canto' && specificFilter.field === 'tipo_canto') {
        if ((item.tipo_canto || '').toLowerCase() !== specificFilter.value.toLowerCase()) return false;
      }
    }

    return true;
  });
}
