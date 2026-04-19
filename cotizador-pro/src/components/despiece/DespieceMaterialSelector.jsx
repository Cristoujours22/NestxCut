export default function DespieceMaterialSelector({ value, materials, onChange }) {
  return (
    <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl p-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="min-w-[180px]">
          <div className="text-[#a3aac4] text-xs uppercase tracking-widest font-bold">Material del despiece</div>
          <div className="text-[#6f7a97] text-sm mt-1">Definí el tablero base para conectar inventario y cotización.</div>
        </div>

        <select
          value={value || ''}
          onChange={(event) => onChange(event.target.value || null)}
          className="flex-1 bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50"
        >
          <option value="">Seleccionar material de inventario...</option>
          {materials.map((material) => (
            <option key={material.id} value={material.id}>
              {material.nombre} {material.espesor_mm ? `· ${material.espesor_mm}mm` : ''} {material.codigo ? `· ${material.codigo}` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
