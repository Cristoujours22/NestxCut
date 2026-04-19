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
