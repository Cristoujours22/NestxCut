export const CANTO_COLUMNS = [
  { key: 'codigo', label: 'Código' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'tipo_canto', label: 'Tipo' },
  { key: 'calibre', label: 'Calibre' },
  { key: 'color', label: 'Color' },
  { key: 'cantidad_disponible', label: 'Disponible', align: 'right' },
  { key: 'stock_minimo', label: 'Mínimo', align: 'right' },
  {
    key: 'costo_unitario',
    label: 'Costo compra',
    align: 'right',
    render: (item) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(item.costo_unitario || 0)),
  },
  { key: 'ubicacion', label: 'Ubicación' },
];
