export const HERRAJE_COLUMNS = [
  { key: 'codigo', label: 'Código' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'medida', label: 'Medida' },
  { key: 'presentacion', label: 'Presentación' },
  { key: 'cantidad_disponible', label: 'Disponible', align: 'right' },
  { key: 'stock_minimo', label: 'Mínimo', align: 'right' },
  {
    key: 'costo_unitario',
    label: 'Costo',
    align: 'right',
    render: (item) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(item.costo_unitario || 0)),
  },
  { key: 'ubicacion', label: 'Ubicación' },
];
