import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function PuertasMultiSelectDropdown({
  title,
  items,
  selectedItems,
  onToggle,
  getItemMeta,
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

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      const haystack = [item.nombre, item.codigo, item.tipo, item.descripcion, item.material]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [items, search]);

  const selectedCount = selectedItems.length;

  return (
    <div className="flex flex-col gap-2 min-w-0" ref={containerRef}>
      <div className="text-[#a3aac4] text-[11px] font-bold uppercase tracking-[0.18em]">{title}</div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="w-full bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-white text-left focus:outline-none focus:border-[#00e0fe]/50 flex items-center justify-between gap-3"
        >
          <span className={`${selectedCount > 0 ? 'text-white' : 'text-[#6f7a97]'} truncate`}>
            {selectedCount > 0 ? `${selectedCount} seleccionado(s)` : buttonPlaceholder}
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
                  placeholder={searchPlaceholder}
                  className="w-full bg-[#060e20] border border-[#1a233a] text-sm text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#00e0fe]/50"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              {filteredItems.length === 0 ? (
                <div className="rounded-xl px-3 py-4 text-sm text-[#6f7a97] text-center">
                  No hay elementos que coincidan.
                </div>
              ) : filteredItems.map((item) => {
                const active = selectedItems.some((selected) => selected.id === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onToggle(item)}
                    className={`w-full text-left rounded-xl px-3 py-3 transition-colors ${active ? 'bg-[#99f7ff]/10 border border-[#99f7ff]/20' : 'hover:bg-[#1a233a] border border-transparent'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-white font-medium">{item.nombre}</div>
                        <div className="text-[#6f7a97] text-sm mt-1">{getItemMeta(item)}</div>
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
  );
}
