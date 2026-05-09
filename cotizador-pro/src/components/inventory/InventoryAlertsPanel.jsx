import InventoryStatusBadge from './InventoryStatusBadge';
import { getStockStatus, getStockReal, getReorderQuantity, getReorderTarget, getRestockPriority } from '../../features/inventory/utils/inventoryStock';

export default function InventoryAlertsPanel({ items, onOpenStockEntry, onOpenEdit }) {
  const low = items.filter((item) => getStockStatus(item) !== 'ok');
  const exhausted = low.filter((item) => getStockStatus(item) === 'agotado');
  const lowOnly = low.filter((item) => getStockStatus(item) === 'bajo');
  const prioritized = [...low].sort((a, b) => {
    const pa = getRestockPriority(a);
    const pb = getRestockPriority(b);
    if (pb.score !== pa.score) return pb.score - pa.score;
    return pb.faltante - pa.faltante;
  }).slice(0, 5);

  const getPriorityBadge = (item) => {
    const priority = getRestockPriority(item);
    const map = {
      critica: 'bg-red-500/10 text-red-400 border-red-500/20',
      alta: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      media: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
      normal: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
    return <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border ${map[priority.level]}`}>{priority.label}</span>;
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl p-5">
        <div className="text-[#a3aac4] text-xs uppercase tracking-widest font-bold">Items monitoreados</div>
        <div className="text-3xl font-bold text-white mt-2">{items.length}</div>
      </div>
      <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl p-5">
        <div className="text-[#a3aac4] text-xs uppercase tracking-widest font-bold">Stock bajo o agotado</div>
        <div className="text-3xl font-bold text-amber-300 mt-2">{low.length}</div>
      </div>
      <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl p-5">
        <div className="text-[#a3aac4] text-xs uppercase tracking-widest font-bold">Agotados</div>
        <div className="text-3xl font-bold text-red-400 mt-2">{exhausted.length}</div>
      </div>
      <div className="bg-[#0a1122] border border-red-500/20 rounded-2xl p-5">
        <div className="text-[#a3aac4] text-xs uppercase tracking-widest font-bold">Requieren acción</div>
        <div className="text-sm text-red-300 mt-3">Ver agotados y priorizar reposición</div>
      </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl overflow-hidden xl:col-span-2">
        <div className="px-5 py-4 border-b border-[#1a233a]">
          <h3 className="text-white font-bold">Prioridad de reposición</h3>
        </div>
        <div className="divide-y divide-[#1a233a]">
          {prioritized.length === 0 ? (
            <div className="px-5 py-8 text-[#6f7a97] text-sm">No hay items que requieran reposición.</div>
          ) : prioritized.map((item) => (
            <div key={item.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-[#dee5ff] font-semibold">{item.nombre}</div>
                <div className="text-[#6f7a97] text-sm">{item.codigo} · real: {getStockReal(item)} · mínimo: {Number(item.stock_minimo || 0)} · objetivo: {getReorderTarget(item)}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#a3aac4]">Reponer: <strong className="text-white">{getReorderQuantity(item)}</strong></span>
                {getPriorityBadge(item)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a233a]">
          <h3 className="text-white font-bold">Items agotados</h3>
        </div>
        <div className="divide-y divide-[#1a233a]">
          {exhausted.length === 0 ? (
            <div className="px-5 py-8 text-[#6f7a97] text-sm">No hay items agotados. Buen síntoma.</div>
          ) : exhausted.map((item) => (
            <div key={item.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-[#dee5ff] font-semibold">{item.nombre}</div>
                <div className="text-[#6f7a97] text-sm">{item.codigo} · stock real: {getStockReal(item)} · reponer: {getReorderQuantity(item)}</div>
              </div>
              <div className="flex items-center gap-2">
                <InventoryStatusBadge status={getStockStatus(item)} />
                <button onClick={() => onOpenStockEntry?.(item)} className="px-3 py-1.5 rounded-lg border border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/15 text-xs font-bold">Registrar entrada</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a233a]">
          <h3 className="text-white font-bold">Stock bajo</h3>
        </div>
        <div className="divide-y divide-[#1a233a]">
          {lowOnly.length === 0 ? (
            <div className="px-5 py-8 text-[#6f7a97] text-sm">No hay items por debajo del mínimo.</div>
          ) : lowOnly.map((item) => (
            <div key={item.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-[#dee5ff] font-semibold">{item.nombre}</div>
                <div className="text-[#6f7a97] text-sm">{item.codigo} · real: {getStockReal(item)} · mínimo: {Number(item.stock_minimo || 0)} · objetivo: {getReorderTarget(item)}</div>
              </div>
              <div className="flex items-center gap-2">
                <InventoryStatusBadge status={getStockStatus(item)} />
                <button onClick={() => onOpenEdit?.(item)} className="px-3 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/15 text-xs font-bold">Ajustar mínimo</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
