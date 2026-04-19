import { useMemo, useState } from 'react';
import DespieceCantoModal from './DespieceCantoModal';

function CantoChip({ canto }) {
  return (
    <div className="px-2 py-1 rounded-lg bg-[#10182d] border border-[#1a233a] text-[11px] text-[#a3aac4] uppercase tracking-wide">
      Ref {canto.ref} · {canto.tipo} · {canto.calibre}
    </div>
  );
}

export default function DespieceCantosPanel({ cantos, inventoryCantos, onChange }) {
  const [modalState, setModalState] = useState({ open: false, canto: null });
  const refs = useMemo(() => cantos.map((item) => Number(item.ref)).filter(Boolean), [cantos]);

  const handleSave = (nextCanto) => {
    const exists = cantos.some((item) => Number(item.ref) === Number(nextCanto.ref));
    const next = exists
      ? cantos.map((item) => (Number(item.ref) === Number(nextCanto.ref) ? nextCanto : item))
      : [...cantos, nextCanto].sort((a, b) => Number(a.ref) - Number(b.ref));
    onChange(next);
    setModalState({ open: false, canto: null });
  };

  const handleRemove = (ref) => onChange(cantos.filter((item) => Number(item.ref) !== Number(ref)));

  return (
    <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl p-4 space-y-4">
      <DespieceCantoModal
        isOpen={modalState.open}
        canto={modalState.canto}
        inventoryCantos={inventoryCantos}
        existingRefs={refs}
        onClose={() => setModalState({ open: false, canto: null })}
        onSubmit={handleSave}
      />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="text-[#a3aac4] text-xs uppercase tracking-widest font-bold">Cantos del despiece</div>
          <div className="text-[#6f7a97] text-sm mt-1">Definí referencias 1..8 para que L1, L2, A1 y A2 apunten a un canto concreto.</div>
        </div>
        <button onClick={() => setModalState({ open: true, canto: null })} className="bg-[#00e0fe] text-[#002f33] px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#99f7ff] transition-colors">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Agregar canto
        </button>
      </div>

      {!cantos.length ? (
        <div className="border border-dashed border-[#1a233a] rounded-xl p-5 text-sm text-[#6f7a97]">Todavía no definiste cantos para este despiece.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#1a233a]">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-[#060e20]/60 text-[#a3aac4] text-[11px] uppercase tracking-widest">
              <tr>
                <th className="px-3 py-3 border-b border-[#1a233a]">Ref</th>
                <th className="px-3 py-3 border-b border-[#1a233a]">Nombre</th>
                <th className="px-3 py-3 border-b border-[#1a233a]">Tipo</th>
                <th className="px-3 py-3 border-b border-[#1a233a]">Calibre</th>
                <th className="px-3 py-3 border-b border-[#1a233a]">Color</th>
                <th className="px-3 py-3 border-b border-[#1a233a] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a233a]">
              {cantos.map((canto) => (
                <tr key={canto.ref} className="hover:bg-[#1a233a]/20">
                  <td className="px-3 py-3"><CantoChip canto={canto} /></td>
                  <td className="px-3 py-3 text-[#dee5ff] font-medium">{canto.nombre}</td>
                  <td className="px-3 py-3 text-[#a3aac4] capitalize">{canto.tipo}</td>
                  <td className="px-3 py-3 text-[#a3aac4]">{canto.calibre}</td>
                  <td className="px-3 py-3 text-[#a3aac4]">{canto.color || '—'}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setModalState({ open: true, canto })} className="w-9 h-9 rounded-lg border border-[#1a233a] bg-[#10182d] text-[#99f7ff] hover:bg-[#15213b] inline-flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                      <button onClick={() => handleRemove(canto.ref)} className="w-9 h-9 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/15 inline-flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
