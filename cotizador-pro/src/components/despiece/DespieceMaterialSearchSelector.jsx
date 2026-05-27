import { useState, useMemo } from 'react';

export default function DespieceMaterialSearchSelector({
  value,
  materials,
  onChange,
  title = 'Material del despiece',
  subtitle = 'Definí el tablero base para conectar inventario y cotización.',
  placeholder = 'Buscar material por código, nombre o material...',
}) {
  const [search, setSearch] = useState('');

  const filteredMaterials = useMemo(() => {
    if (!search) return materials;
    
    const searchLower = search.toLowerCase();
    return materials.filter((material) => {
      const nombreMatch = material.nombre?.toLowerCase()?.includes(searchLower);
      const codigoMatch = material.codigo?.toLowerCase()?.includes(searchLower);
      const materialMatch = material.material?.toLowerCase()?.includes(searchLower);
       return nombreMatch || codigoMatch || materialMatch;
    });
  }, [materials, search]);

  return (
    <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl p-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="min-w-[180px]">
          <div className="text-[#a3aac4] text-xs uppercase tracking-widest font-bold">{title}</div>
          <div className="text-[#6f7a97] text-sm mt-1">{subtitle}</div>
        </div>

        <div className="flex-1 min-w-[250px]">
          <div className="mb-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={placeholder}
              className="w-full bg-[#060e20] border border-[#1a233a] text-sm text-white rounded-xl pl-3 pr-4 py-2.5 focus:outline-none focus:border-[#00e0fe]/50"
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
                {material.nombre} {material.material ? `· ${material.material}` : ''} {material.espesor_mm ? `· ${material.espesor_mm}mm` : ''} {material.codigo ? `· ${material.codigo}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
