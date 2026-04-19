function DespieceTabs({ despieces, activeDespieceId, onChangeName, onSelect, onAdd, onRemove, materialOptions = [], materialValue = '', onMaterialChange }) {
  const getMaterialLabel = (materialId) => {
    if (!materialId) return 'Seleccionar material';
    const material = materialOptions.find((item) => item.id === materialId);
    if (!material) return 'Seleccionar material';
    return `${material.nombre}${material.espesor_mm ? ` ${material.espesor_mm}mm` : ''}`;
  };

  return (
    <div className="flex gap-1.5 overflow-x-auto mt-[3px] pb-1 items-start">
        {despieces.map((despiece, index) => {
          const isActive = activeDespieceId === despiece.id;
          const materialLabel = getMaterialLabel(despiece.material_id);

          return (
            <div
              key={despiece.id}
              onClick={() => onSelect(despiece.id)}
              className={`flex items-center gap-1 px-1.5 py-1 rounded-md border cursor-pointer transition-all min-w-[150px] ${
                isActive
                  ? 'bg-[#121b31] text-[#dee5ff] border-[#00e0fe]/35 shadow-[0_0_0_1px_rgba(0,224,254,0.05)]'
                  : 'bg-[#0d1528] text-[#a3aac4] border-[#1a233a] hover:text-[#dee5ff] hover:bg-[#162038]'
              }`}
            >
              {isActive && (
                <select
                  value={materialValue || ''}
                  onChange={(event) => onMaterialChange?.(event.target.value || null)}
                  onClick={(event) => event.stopPropagation()}
                  className="w-full min-w-0 bg-[#060e20] border border-[#1a233a] rounded-lg px-2 py-1.5 text-[12px] text-white focus:outline-none focus:border-[#00e0fe]/50"
                >
                  <option value="">Seleccionar material...</option>
                  {materialOptions.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.nombre} {material.espesor_mm ? `· ${material.espesor_mm}mm` : ''}
                    </option>
                  ))}
                </select>
              )}

              {!isActive && (
                <div className="bg-transparent border border-[#40485d]/30 rounded-md px-2 py-1 text-inherit font-semibold min-w-[110px] text-[13px] leading-none truncate flex-1">
                  {materialLabel}
                </div>
              )}

              {despieces.length > 1 && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(despiece.id);
                  }}
                  className={`w-5 h-5 inline-flex items-center justify-center rounded text-[11px] font-bold ${isActive ? 'text-red-300' : 'text-red-400'} hover:text-red-200 hover:bg-red-500/10 transition-colors shrink-0`}
                  title="Eliminar pestaña"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={onAdd}
          className="h-[34px] px-3 rounded-md bg-[#0f8b5f] hover:bg-[#0c6c49] text-white font-bold transition-colors inline-flex items-center justify-center"
          title="Agregar nuevo despiece"
        >
          +
        </button>
    </div>
  );
}

export default DespieceTabs;
