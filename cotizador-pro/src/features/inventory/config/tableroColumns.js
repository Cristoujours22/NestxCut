export const TABLERO_COLUMNS = [
  { key: 'codigo', label: 'Código' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'material', label: 'Material' },
  { key: 'espesor_mm', label: 'Espesor' },
  {
    key: 'medidas',
    label: 'Medidas',
    render: (item) => `${item.largo_mm || 0} x ${item.ancho_mm || 0} mm`,
  },
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
