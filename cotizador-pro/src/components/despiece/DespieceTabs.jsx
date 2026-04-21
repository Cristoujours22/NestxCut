import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function formatMaterialLabel(material) {
  if (!material) return 'Seleccionar material';
  const code = material.codigo?.trim();
  const name = material.nombre?.trim() || 'Sin nombre';
  const espesor = material.espesor_mm ? `${material.espesor_mm}mm` : null;
  const largo = material.largo_mm || material.ancho_mm ? `${material.largo_mm || 0}x${material.ancho_mm || 0}mm` : null;
  return [code, name, espesor, largo].filter(Boolean).join(' · ');
}

function MaterialCombobox({ materials, value, onChange, onOpenChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState(null);

  const selectedMaterial = useMemo(
    () => materials.find((item) => item.id === value) || null,
    [materials, value]
  );

  const clearSelection = () => {
    onChange?.(null);
    setOpen(false);
    setSearch('');
  };

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter((material) => {
      const code = material.codigo?.toLowerCase() || '';
      const name = material.nombre?.toLowerCase() || '';
      return code.includes(q) || name.includes(q);
    });
  }, [materials, search]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      const isInsideTrigger = rootRef.current?.contains(event.target);
      const isInsideDropdown = dropdownRef.current?.contains(event.target);
      if (!isInsideTrigger && !isInsideDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 520),
        maxWidth: '70vw',
        zIndex: 9999,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const dropdown = open && dropdownStyle ? createPortal(
    <div ref={dropdownRef} style={dropdownStyle} className="rounded-xl border border-[#1a233a] bg-[#0a1122] shadow-2xl overflow-hidden">
      <div className="p-2 border-b border-[#1a233a] bg-[#060e20]">
        <div className="relative">
          <span className={`material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[#6f7a97] text-[16px] pointer-events-none transition-opacity ${open ? 'opacity-0' : 'opacity-100'}`}>search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por referencia o nombre..."
            className="w-full bg-[#0a1122] border border-[#1a233a] text-[12px] text-white rounded-lg pl-7 pr-2 py-2 focus:outline-none focus:border-[#00e0fe]/50"
            autoFocus
          />
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto bg-[#0a1122]">
        {!value && (
          <button
            type="button"
            onClick={clearSelection}
            className="w-full px-3 py-2.5 text-left text-[12px] text-[#a3aac4] hover:bg-[#121b31] transition-colors border-b border-[#1a233a]"
          >
            Sin material seleccionado
          </button>
        )}

        {filteredMaterials.length === 0 ? (
          <div className="px-3 py-4 text-[12px] text-[#6f7a97] text-center">No hay materiales que coincidan.</div>
        ) : filteredMaterials.map((material) => {
          const isSelected = material.id === value;
          return (
            <button
              key={material.id}
              type="button"
              onClick={() => {
                onChange?.(material.id);
                setOpen(false);
                setSearch('');
              }}
              className={`w-full px-3 py-2.5 text-left transition-colors border-b border-[#1a233a]/80 last:border-b-0 ${isSelected ? 'bg-[#121b31]' : 'hover:bg-[#10182d]'}`}
            >
              <div className="text-[12px] font-semibold text-white break-words pr-2">
                {material.codigo ? `${material.codigo} · ` : ''}{material.nombre || 'Sin nombre'}
              </div>
              <div className="text-[11px] text-[#a3aac4] break-words pr-2">
                {[material.espesor_mm ? `${material.espesor_mm}mm` : null, material.largo_mm || material.ancho_mm ? `${material.largo_mm || 0} x ${material.ancho_mm || 0} mm` : null].filter(Boolean).join(' · ')}
              </div>
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={rootRef} className="relative w-full min-w-[420px]" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if ((event.key === 'Delete' || event.key === 'Backspace') && value) {
            event.preventDefault();
            clearSelection();
          }
        }}
        className={`w-full min-w-0 bg-[#060e20] border ${open ? 'border-[#00e0fe]/50' : 'border-[#1a233a]'} rounded-lg px-3 py-2 text-left text-[12px] text-white focus:outline-none transition-colors`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="truncate">{selectedMaterial ? formatMaterialLabel(selectedMaterial) : 'Seleccionar material...'}</span>
          <span className={`material-symbols-outlined text-[18px] text-[#a3aac4] transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
        </div>
      </button>

      {dropdown}
    </div>
  );
}

function DespieceTabs({ despieces, activeDespieceId, onChangeName, onSelect, onAdd, onRemove, materialOptions = [], materialValue = '', onMaterialChange }) {
  const [openComboboxId, setOpenComboboxId] = useState(null);

  const getInactiveLabel = (materialId) => {
    if (!materialId) return 'Seleccionar material';
    const material = materialOptions.find((item) => item.id === materialId);
    return formatMaterialLabel(material);
  };

  return (
    <div className="relative overflow-visible mt-[3px] pb-1">
      <div className="flex gap-1.5 overflow-x-auto items-start">
        {despieces.map((despiece) => {
        const isActive = activeDespieceId === despiece.id;
        const materialLabel = getInactiveLabel(despiece.material_id);

        return (
          <div
            key={despiece.id}
            onClick={() => onSelect(despiece.id)}
            className={`flex items-center gap-1 px-1.5 py-1 rounded-md border cursor-pointer transition-all ${
              isActive
                ? 'bg-[#121b31] text-[#dee5ff] border-[#00e0fe]/35 shadow-[0_0_0_1px_rgba(0,224,254,0.05)] min-w-[460px]'
                : 'bg-[#0d1528] text-[#a3aac4] border-[#1a233a] hover:text-[#dee5ff] hover:bg-[#162038] min-w-[170px]'
            }`}
          >
            {isActive ? (
              <MaterialCombobox
                materials={materialOptions}
                value={materialValue || ''}
                onChange={(materialId) => onMaterialChange?.(materialId || null)}
                onOpenChange={(isOpen) => setOpenComboboxId(isOpen ? despiece.id : null)}
              />
            ) : (
              <div className="bg-transparent border border-[#40485d]/30 rounded-md px-2 py-1 text-inherit font-semibold min-w-[130px] text-[13px] leading-none truncate flex-1">
                {materialLabel}
              </div>
            )}

            {despieces.length > 1 && openComboboxId !== despiece.id && (
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
          className="h-[34px] px-3 rounded-md bg-[#0f8b5f] hover:bg-[#0c6c49] text-white font-bold transition-colors inline-flex items-center justify-center shrink-0"
          title="Agregar nuevo despiece"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default DespieceTabs;
