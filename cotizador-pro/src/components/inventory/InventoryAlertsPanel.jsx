import InventoryStatusBadge from './InventoryStatusBadge';
import { getStockStatus, getStockReal } from '../../features/inventory/utils/inventoryStock';

export default function InventoryAlertsPanel({ items }) {
  const low = items.filter((item) => getStockStatus(item) !== 'ok');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
        <div className="text-3xl font-bold text-red-400 mt-2">{items.filter((item) => getStockStatus(item) === 'agotado').length}</div>
      </div>

      <div className="lg:col-span-3 bg-[#0a1122] border border-[#1a233a] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a233a]">
          <h3 className="text-white font-bold">Alertas activas</h3>
        </div>
        <div className="divide-y divide-[#1a233a]">
          {low.length === 0 ? (
            <div className="px-5 py-8 text-[#6f7a97] text-sm">No hay alertas activas. El inventario está estable.</div>
          ) : low.map((item) => (
            <div key={item.id} className="px-5 py-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[#dee5ff] font-semibold">{item.nombre}</div>
                <div className="text-[#6f7a97] text-sm">{item.codigo} · stock real: {getStockReal(item)}</div>
              </div>
              <InventoryStatusBadge status={getStockStatus(item)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
