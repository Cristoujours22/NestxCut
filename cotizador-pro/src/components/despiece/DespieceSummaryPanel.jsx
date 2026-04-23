export function DespieceStatsBar({ laminaCount, piezaCount, onOpenNesting }) {
  const stats = [
    { icon: 'layers', label: 'Láminas', value: laminaCount, clickable: true },
    { icon: 'grid_on', label: 'Piezas', value: piezaCount },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      {stats.map((stat) => (
        <button
          key={stat.label}
          type="button"
          onClick={stat.clickable ? onOpenNesting : undefined}
          className={`bg-[#0f172b] border border-[#1a233a] rounded-xl px-3 py-2 min-w-0 text-left ${stat.clickable ? 'hover:border-[#00e0fe]/40 hover:bg-[#121b31] transition-colors cursor-pointer' : 'cursor-default'}`}
        >
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-1.5 text-[#a3aac4] text-[10px] uppercase tracking-wide leading-none min-w-0">
              <span className={`material-symbols-outlined text-[14px] shrink-0 ${stat.accent || 'text-[#00e0fe]'}`}>{stat.icon}</span>
              <span className="truncate">{stat.label}</span>
            </div>
            <div className="text-[28px] font-bold text-[#dee5ff] truncate leading-none shrink-0">{stat.value}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function SummaryItem({ icon, label, value, accent = 'text-[#00e0fe]' }) {
  return (
    <div className="bg-[#0f172b] border border-[#1a233a] rounded-xl p-4">
      <div className="flex items-center gap-2 text-[#a3aac4] text-sm mb-2">
        <span className={`material-symbols-outlined text-[18px] ${accent}`}>{icon}</span>
        {label}
      </div>
      <div className="text-2xl font-bold text-[#dee5ff]">{value}</div>
    </div>
  );
}

function DespieceSummaryPanel({ serviciosDetails }) {
  return (
    <aside className="w-full xl:w-[320px] shrink-0 bg-[#060e20] border border-[#1a233a] rounded-2xl p-4 self-start">
      <h3 className="text-[#dee5ff] font-bold text-lg border-b border-[#1a233a] pb-3 mb-4">Servicios detectados</h3>

      <div className="mt-5">
        {serviciosDetails.length === 0 ? (
          <p className="text-[#6f7a97] text-sm italic">No hay servicios detectados en el detalle de las piezas.</p>
        ) : (
          <ul className="space-y-2 max-h-[320px] overflow-auto pr-1">
            {serviciosDetails.slice(0, 20).map((detail, index) => (
              <li key={`${detail.nombre}-${index}`} className="bg-[#0f172b] border border-[#1a233a] rounded-xl px-3 py-2 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[#dee5ff] text-sm font-medium">{detail.nombre}</div>
                  <div className="text-[#6f7a97] text-xs uppercase">{detail.tipoCobro}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#99f7ff] text-sm font-bold">x{detail.cantidad}</div>
                  <div className="text-emerald-400 text-xs">{formatPrice(detail.costoTotal)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

export default DespieceSummaryPanel;
