// Wrapper para conectar ProjectWorkspace con el módulo de despiece
import { useState, useCallback } from 'react';
import DespieceTabs from './DespieceTabs';

export default function Despiece({ initialData = [], onChange, isNested }) {
  const [despieces, setDespieces] = useState(() => {
    // inicializar con los datos
    if (initialData && initialData.length > 0) {
      return initialData;
    }
    // crear un despiece vacío por defecto
    return [{
      id: `desp_${Date.now()}`,
      material_id: null,
      cantos: [],
      filas: [{ id: `row_0`, cantidad: '', largo: '', ancho: '', detalle: '', l1: '', l2: '', a1: '', a2: '', rotar: '' }]
    }];
  });

  const [activeDespieceId, setActiveDespieceId] = useState(despieces[0]?.id);

  // Cuando cambian los datos, notificar al padre
  const handleChange = useCallback((newDespieces) => {
    setDespieces(newDespieces);
    if (onChange) {
      onChange(newDespieces);
    }
  }, [onChange]);

  // Seleccionar un despiece
  const handleSelect = useCallback((id) => {
    setActiveDespieceId(id);
  }, []);

  // Agregar un nuevo despiece
  const handleAdd = useCallback(() => {
    const newId = `desp_${Date.now()}`;
    const newDespieces = [...despieces, {
      id: newId,
      material_id: null,
      cantos: [],
      filas: [{ id: `row_${Date.now()}`, cantidad: '', largo: '', ancho: '', detalle: '', l1: '', l2: '', a1: '', a2: '', rotar: '' }]
    }];
    setDespieces(newDespieces);
    setActiveDespieceId(newId);
    if (onChange) onChange(newDespieces);
  }, [despieces, onChange]);

  // Eliminar un despiece
  const handleRemove = useCallback((id) => {
    if (despieces.length <= 1) return;
    const newDespieces = despieces.filter(d => d.id !== id);
    setDespieces(newDespieces);
    if (activeDespieceId === id) {
      setActiveDespieceId(newDespieces[0]?.id);
    }
    if (onChange) onChange(newDespieces);
  }, [despieces, activeDespieceId, onChange]);

  // Obtener el despiece activo
  const activeDespiece = despieces.find(d => d.id === activeDespieceId);

  // Manejar cambios en las filas
  const handleFilasChange = useCallback((newFilas) => {
    const newDespieces = despieces.map(d => 
      d.id === activeDespieceId ? { ...d, filas: newFilas } : d
    );
    handleChange(newDespieces);
  }, [despieces, activeDespieceId, handleChange]);

  // Manejar cambio de material
  const handleMaterialChange = useCallback((materialId) => {
    const newDespieces = despieces.map(d =>
      d.id === activeDespieceId ? { ...d, material_id: materialId } : d
    );
    handleChange(newDespieces);
  }, [despieces, activeDespieceId, handleChange]);

  // Renderizar solo el despiece activo usando DespieceTable
  // Por ahora renderizamos una vista simple
  return (
    <div className="h-full">
      {/* Render tabs简单的 - solo mostrar el activo */}
      <div className="flex gap-2 mb-2">
        {despieces.map((d, i) => (
          <button
            key={d.id}
            onClick={() => handleSelect(d.id)}
            className={`px-3 py-1 rounded ${d.id === activeDespieceId ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Tablero {i + 1}
          </button>
        ))}
        <button onClick={handleAdd} className="px-3 py-1 rounded bg-green-600 text-white">
          + Agregar
        </button>
      </div>
      
      {/* Aquí iría la tabla de despiece */}
      <div className="text-white p-4">
        <pre>{JSON.stringify(activeDespiece?.filas || [], null, 2)}</pre>
      </div>
    </div>
  );
}
