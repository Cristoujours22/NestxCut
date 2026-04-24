import { useMemo, useState } from 'react';
import DespieceCantoModal from './DespieceCantoModal';
import DespieceCantoAssignmentModal from './DespieceCantoAssignmentModal';

export default function DespieceCantosPanel({ cantos, inventoryCantos, onChange, tabsSlot = null }) {
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const refs = useMemo(() => cantos.map((item) => Number(item.ref)).filter(Boolean), [cantos]);
  const assignedCount = refs.length;

  return (
    <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl p-3 space-y-3">
      <DespieceCantoAssignmentModal
        isOpen={assignmentOpen}
        cantos={cantos}
        inventoryCantos={inventoryCantos}
        onClose={() => setAssignmentOpen(false)}
        onSubmit={(rows) => {
          onChange(rows.sort((a, b) => Number(a.ref) - Number(b.ref)));
          setAssignmentOpen(false);
        }}
      />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-visible">
          {tabsSlot}
        </div>
        <div className="flex gap-2 shrink-0">
           <button onClick={() => setAssignmentOpen(true)} className="bg-[#00e0fe] text-[#002f33] px-3 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#99f7ff] transition-colors">
             <span className="material-symbols-outlined text-[16px]">grid_view</span>
             Cuadrar cantos
           </button>
        </div>
      </div>

    </div>
  );
}
