import { useState, useMemo } from 'react';

export default function DespieceMaterialSearchSelector({ value, materials, onChange }) {
  const [search, setSearch] = useState('');

  const filteredMaterials = useMemo(() => {
    if (!search) return materials;
    
    const searchLower = search.toLowerCase();
    return materials.filter((material) => {
      const nombreMatch = material.nombre?.toLowerCase()?.includes(searchLower);
      const codigoMatch = material.codigo?.toLowerCase()?.includes(searchLower);
      return nombreMatch || codigoMatch;
    });
  }, [materials, search]);

  return (
    <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl p-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="min-w-[180px]">
          <div className="text-[#a3aac4] text-xs uppercase tracking-widest font-bold">Material del despiece</div>
          <div className="text-[#6f7a97] text-sm mt-1">Definí el tablero base para conectar inventario y cotización.</div>
        </div>

        <div className="flex-1 min-w-[250px]">
          <div className="relative mb-2">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7a97] text-[18px]">search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar material por código o nombre..."
              className="w-full bg-[#060e20] border border-[#1a233a] text-sm text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#00e0fe]/50"
            />
          </div>

          <select
            value={value || ''}
            onChange={(event) => onChange(event.target.value || null)}
            className="w-full bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50"
            size={Math.min(5, filteredMaterials.length + 1)}
          >
            <option value="">Seleccionar material de inventario...</option>
            {filteredMaterials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.nombre} {material.espesor_mm ? `· ${material.espesor_mm}mm` : ''} {material.codigo ? `· ${material.codigo}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}