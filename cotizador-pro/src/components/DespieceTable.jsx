import { useState } from 'react';

export default function DespieceTable() {
  const [data, setData] = useState([
    { cantidad: '', alto: '', ancho: '', detalle: '', idModulo: '' },
  ]);

  const handleChange = (index, field, value) => {
    const updatedData = [...data];
    updatedData[index][field] = value;
    setData(updatedData);
  };

  const addRow = () => {
    setData([...data, { cantidad: '', alto: '', ancho: '', detalle: '', idModulo: '' }]);
  };

  const removeRow = (index) => {
    const updatedData = data.filter((_, i) => i !== index);
    setData(updatedData);
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const clipboardData = event.clipboardData.getData('Text');
    const rows = clipboardData.split('\n').filter(row => row.trim() !== '');

    const pastedData = rows.map(row => {
      const cols = row.split('\t');
      return {
        cantidad: cols[0] || '',
        alto: cols[1] || '',
        ancho: cols[2] || '',
        detalle: cols[3] || '',
        idModulo: cols[4] || '',
      };
    });

    setData([...data, ...pastedData]);
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-blue-600">Despiece</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">Cantidad</th>
              <th className="border p-2">Alto</th>
              <th className="border p-2">Ancho</th>
              <th className="border p-2">Detalle Material</th>
              <th className="border p-2">ID Módulo</th>
              <th className="border p-2">Acciones</th>
            </tr>
          </thead>
          <tbody onPaste={handlePaste}>
            {data.map((row, index) => (
              <tr key={index}>
                <td className="border">
                  <input
                    type="text"
                    value={row.cantidad}
                    onChange={(e) => handleChange(index, 'cantidad', e.target.value)}
                    className="w-full p-2"
                  />
                </td>
                <td className="border">
                  <input
                    type="text"
                    value={row.alto}
                    onChange={(e) => handleChange(index, 'alto', e.target.value)}
                    className="w-full p-2"
                  />
                </td>
                <td className="border">
                  <input
                    type="text"
                    value={row.ancho}
                    onChange={(e) => handleChange(index, 'ancho', e.target.value)}
                    className="w-full p-2"
                  />
                </td>
                <td className="border">
                  <input
                    type="text"
                    value={row.detalle}
                    onChange={(e) => handleChange(index, 'detalle', e.target.value)}
                    className="w-full p-2"
                  />
                </td>
                <td className="border">
                  <input
                    type="text"
                    value={row.idModulo}
                    onChange={(e) => handleChange(index, 'idModulo', e.target.value)}
                    className="w-full p-2"
                  />
                </td>
                <td className="border">
                  <button
                    onClick={() => removeRow(index)}
                    className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <button
          onClick={addRow}
          className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
        >
          Agregar fila
        </button>
      </div>
    </div>
  );
}
