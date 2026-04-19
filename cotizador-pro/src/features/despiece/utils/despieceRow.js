export const createDespieceRow = () => ({
  id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  cantidad: '',
  largo: '',
  ancho: '',
  detalle: '',
  rotar: '',
  l1: '',
  l2: '',
  a1: '',
  a2: '',
});

export const getMeaningfulDespieceRows = (rows) => rows.filter((row) => (
  ['cantidad', 'largo', 'ancho', 'detalle', 'rotar', 'l1', 'l2', 'a1', 'a2']
    .some((field) => row[field] && row[field].toString().trim() !== '')
));
