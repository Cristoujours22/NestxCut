export default function InventoryStatusBadge({ status }) {
  const map = {
    ok: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    bajo: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    agotado: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const label = {
    ok: 'Normal',
    bajo: 'Bajo',
    agotado: 'Agotado',
  };

  return <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border ${map[status] || map.ok}`}>{label[status] || label.ok}</span>;
}
