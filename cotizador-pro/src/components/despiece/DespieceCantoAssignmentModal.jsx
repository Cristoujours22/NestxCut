import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function buildAssignmentRows(cantos) {
  return Array.from({ length: 8 }, (_, index) => {
    const ref = index + 1;
    const existing = cantos.find((item) => Number(item.ref) === ref);
    return {
      ref,
      inventory_item_id: existing?.inventory_item_id || '',
      nombre: existing?.nombre || '',
      tipo: existing?.tipo || 'rigido',
      calibre: existing?.calibre || '19',
      color: existing?.color || '',
    };
  });
}

function formatCantoLabel(item) {
  if (!item) return 'Sin asignar';
  return [item.codigo, item.nombre, item.calibre ? `${item.calibre}` : null].filter(Boolean).join(' · ');
}

function CantoSearchSelect({ row, inventoryCantos, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState(null);

  const selectedItem = useMemo(
    () => inventoryCantos.find((item) => item.id === row.inventory_item_id) || null,
    [inventoryCantos, row.inventory_item_id]
  );

  const filteredCantos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventoryCantos;
    return inventoryCantos.filter((item) => {
      const code = item.codigo?.toLowerCase() || '';
      const name = item.nombre?.toLowerCase() || '';
      return code.includes(q) || name.includes(q);
    });
  }, [inventoryCantos, search]);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      const isInsideTrigger = rootRef.current?.contains(event.target);
      const isInsideDropdown = dropdownRef.current?.contains(event.target);
      if (!isInsideTrigger && !isInsideDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
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
        width: Math.max(rect.width, 420),
        maxWidth: '50vw',
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
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por referencia o nombre..."
            className="w-full bg-[#0a1122] border border-[#1a233a] text-[12px] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#00e0fe]/50"
            autoFocus
          />
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto bg-[#0a1122]">
        <button
          type="button"
          onClick={() => {
            onSelect('');
            setOpen(false);
            setSearch('');
          }}
          className="block w-full px-3 py-2.5 text-left text-[12px] text-[#a3aac4] hover:bg-[#121b31] transition-colors border-b border-[#1a233a]"
        >
          Sin asignar
        </button>

        {filteredCantos.length === 0 ? (
          <div className="px-3 py-4 text-[12px] text-[#6f7a97] text-center">No hay cantos que coincidan.</div>
        ) : filteredCantos.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelect(item.id);
              setOpen(false);
              setSearch('');
            }}
            className={`block w-full px-3 py-2.5 text-left transition-colors border-b border-[#1a233a]/80 last:border-b-0 ${item.id === row.inventory_item_id ? 'bg-[#121b31]' : 'hover:bg-[#10182d]'}`}
          >
            <div className="text-[12px] font-semibold text-white break-words pr-2">
              {item.codigo ? `${item.codigo} · ` : ''}{item.nombre || 'Sin nombre'}
            </div>
            <div className="text-[11px] text-[#a3aac4] break-words pr-2">
              {[item.tipo_canto || item.tipo || 'rigido', item.calibre || null, item.color || null].filter(Boolean).join(' · ')}
            </div>
          </button>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={rootRef} className="relative min-w-[280px]">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full bg-[#060e20] border ${open ? 'border-[#00e0fe]/50' : 'border-[#1a233a]'} rounded-xl px-3 py-2.5 text-left text-white focus:outline-none transition-colors`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-[12px]">{selectedItem ? formatCantoLabel(selectedItem) : 'Seleccionar canto...'}</span>
          <span className={`material-symbols-outlined text-[18px] text-[#a3aac4] transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
        </div>
      </button>

      {dropdown}
    </div>
  );
}

export default function DespieceCantoAssignmentModal({ isOpen, cantos, inventoryCantos, onClose, onSubmit }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setRows(buildAssignmentRows(cantos));
    }
  }, [isOpen, cantos]);

  const inventoryMap = useMemo(() => new Map(inventoryCantos.map((item) => [item.id, item])), [inventoryCantos]);

  if (!isOpen) return null;

  const handleSelect = (ref, inventoryItemId) => {
    const selected = inventoryMap.get(inventoryItemId);
    setRows((prev) => prev.map((row) => {
      if (row.ref !== ref) return row;
      if (!selected) {
        return { ref, inventory_item_id: '', nombre: '', tipo: 'rigido', calibre: '19', color: '' };
      }
      return {
        ref,
        inventory_item_id: selected.id,
        nombre: selected.nombre || '',
        tipo: selected.tipo_canto || selected.tipo || 'rigido',
        calibre: selected.calibre || '19',
        color: selected.color || '',
      };
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(rows.filter((row) => row.inventory_item_id));
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#0a1122] border border-[#1a233a] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a233a] bg-[#060e20]">
          <div>
            <h2 className="text-lg font-bold text-white">Cuadrar cantos</h2>
            <p className="text-sm text-[#a3aac4] mt-1">Asigná rápidamente un canto del inventario a cada referencia 1..8.</p>
          </div>
          <button onClick={onClose} className="text-[#a3aac4] hover:text-white"><span className="material-symbols-outlined">close</span></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="overflow-x-auto rounded-xl border border-[#1a233a]">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#060e20]/60 text-[#a3aac4] text-[11px] uppercase tracking-widest">
                <tr>
                  <th className="px-3 py-3 border-b border-[#1a233a]">Ref</th>
                  <th className="px-3 py-3 border-b border-[#1a233a]">Canto del inventario</th>
                  <th className="px-3 py-3 border-b border-[#1a233a]">Tipo</th>
                  <th className="px-3 py-3 border-b border-[#1a233a]">Calibre</th>
                  <th className="px-3 py-3 border-b border-[#1a233a]">Color</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a233a]">
                {rows.map((row) => (
                  <tr key={row.ref} className="hover:bg-[#1a233a]/20">
                    <td className="px-3 py-3 text-[#99f7ff] font-bold">{row.ref}</td>
                    <td className="px-3 py-3">
                      <CantoSearchSelect
                        row={row}
                        inventoryCantos={inventoryCantos}
                        onSelect={(inventoryItemId) => handleSelect(row.ref, inventoryItemId)}
                      />
                    </td>
                    <td className="px-3 py-3 text-[#a3aac4] capitalize">{row.inventory_item_id ? row.tipo : '—'}</td>
                    <td className="px-3 py-3 text-[#a3aac4]">{row.inventory_item_id ? row.calibre : '—'}</td>
                    <td className="px-3 py-3 text-[#a3aac4]">{row.inventory_item_id ? row.color || '—' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#a3aac4] hover:text-white hover:bg-[#1a233a]">Cancelar</button>
            <button type="submit" className="bg-[#00e0fe] text-[#002f33] px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#99f7ff]">Guardar referencias</button>
          </div>
        </form>
      </div>
    </div>
  );
}
