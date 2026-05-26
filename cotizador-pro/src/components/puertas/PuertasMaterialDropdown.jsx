import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function PuertasMaterialDropdown({
  value,
  materials,
  onChange,
  compact = false,
  title,
  subtitle,
  buttonPlaceholder,
  searchPlaceholder,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = useMemo(
    () => materials.find((material) => material.id === value) || null,
    [materials, value]
  );

  const filteredMaterials = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return materials;
    return materials.filter((material) => {
      const haystack = [material.nombre, material.codigo, material.material]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [materials, search]);

  const handleSelect = (materialId) => {
    onChange(materialId || null);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className={compact ? 'flex flex-col gap-2 min-w-0' : 'bg-[#0a1122] border border-[#1a233a] rounded-2xl p-4'} ref={containerRef}>
      <div className={compact ? 'text-[#a3aac4] text-[11px] font-bold uppercase tracking-[0.18em]' : 'flex flex-col lg:flex-row lg:items-start gap-3'}>
        {compact ? (title || 'Material visible') : (
          <>
            <div className="min-w-[180px]">
              <div className="text-[#a3aac4] text-xs uppercase tracking-widest font-bold">{title || 'Material del despiece'}</div>
              <div className="text-[#6f7a97] text-sm mt-1">{subtitle || 'Definí el tablero base para conectar inventario y cotización.'}</div>
            </div>
          </>
        )}

        <div className={`${compact ? '' : 'flex-1 min-w-[250px]'} relative`}>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="w-full bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-white text-left focus:outline-none focus:border-[#00e0fe]/50 flex items-center justify-between gap-3"
          >
            <span className={`${selected ? 'text-white' : 'text-[#6f7a97]'} truncate`}>
              {selected
                ? `${selected.nombre}${selected.material ? ` · ${selected.material}` : ''}${selected.espesor_mm ? ` · ${selected.espesor_mm}mm` : ''}`
                : (buttonPlaceholder || 'Seleccionar material de inventario...')}
            </span>
            <span className="material-symbols-outlined text-[#a3aac4]">{open ? 'expand_less' : 'expand_more'}</span>
          </button>

          {open && (
            <div className="absolute z-50 mt-2 w-full rounded-2xl border border-[#1a233a] bg-[#0f1930] shadow-2xl overflow-hidden">
              <div className="p-3 border-b border-[#1a233a]">
                <div>
                  <input
                    autoFocus
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={searchPlaceholder || 'Buscar material por color, código o nombre...'}
                    className="w-full bg-[#060e20] border border-[#1a233a] text-sm text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#00e0fe]/50"
                  />
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className="w-full text-left rounded-xl px-3 py-2 text-sm text-[#a3aac4] hover:bg-[#1a233a] transition-colors"
                >
                  Limpiar selección
                </button>

                {filteredMaterials.length === 0 ? (
                  <div className="rounded-xl px-3 py-4 text-sm text-[#6f7a97] text-center">
                    No hay materiales que coincidan.
                  </div>
                ) : filteredMaterials.map((material) => {
                  const active = material.id === value;
                  return (
                    <button
                      key={material.id}
                      type="button"
                      onClick={() => handleSelect(material.id)}
                      className={`w-full text-left rounded-xl px-3 py-3 transition-colors ${active ? 'bg-[#99f7ff]/10 border border-[#99f7ff]/20' : 'hover:bg-[#1a233a] border border-transparent'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-white font-medium">{material.nombre}</div>
                          <div className="text-[#6f7a97] text-sm mt-1">
                            {material.material ? `${material.material} · ` : ''}
                            {material.espesor_mm ? `${material.espesor_mm}mm` : ''}
                            {material.codigo ? ` · ${material.codigo}` : ''}
                          </div>
                        </div>
                        {active ? <span className="material-symbols-outlined text-[#99f7ff] text-[18px]">check_circle</span> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
