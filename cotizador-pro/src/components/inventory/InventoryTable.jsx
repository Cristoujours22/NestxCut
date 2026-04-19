import InventoryStatusBadge from './InventoryStatusBadge';
import { getStockReal, getStockStatus } from '../../features/inventory/utils/inventoryStock';

export default function InventoryTable({ columns, items, onEdit, onDelete }) {
  if (!items.length) {
    return (
      <div className="border border-dashed border-[#1a233a] rounded-2xl p-10 text-center bg-[#0a1122]/30">
        <span className="material-symbols-outlined text-[#1a233a] text-5xl">inventory_2</span>
        <h3 className="text-[#dee5ff] font-bold mt-3">No hay registros</h3>
        <p className="text-[#6f7a97] text-sm mt-1">Agregá items al inventario para empezar a controlar stock.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#1a233a] bg-[#0a1122]">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-[#060e20]/60 text-[#a3aac4] text-[11px] font-bold tracking-widest uppercase">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 border-b border-[#1a233a]">{column.label}</th>
            ))}
            <th className="px-4 py-3 border-b border-[#1a233a]">Stock real</th>
            <th className="px-4 py-3 border-b border-[#1a233a]">Estado</th>
            <th className="px-4 py-3 border-b border-[#1a233a] text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1a233a]">
          {items.map((item) => {
            const stockStatus = getStockStatus(item);
            return (
              <tr key={item.id} className="hover:bg-[#1a233a]/20 transition-colors">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-[#dee5ff]">
                    {column.render ? column.render(item) : item[column.key] || '—'}
                  </td>
                ))}
                <td className="px-4 py-3 text-[#dee5ff] font-semibold">{getStockReal(item)}</td>
                <td className="px-4 py-3"><InventoryStatusBadge status={stockStatus} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => onEdit(item)} className="w-9 h-9 rounded-lg border border-[#1a233a] bg-[#10182d] text-[#99f7ff] hover:bg-[#15213b] inline-flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => onDelete(item)} className="w-9 h-9 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/15 inline-flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
