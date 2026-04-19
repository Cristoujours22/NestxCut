export default function DespieceCantoSummary({ summary }) {
  return (
    <aside className="w-full xl:w-[320px] shrink-0 bg-[#060e20] border border-[#1a233a] rounded-2xl p-4 self-start">
      <h3 className="text-[#dee5ff] font-bold text-lg border-b border-[#1a233a] pb-3 mb-4">Resumen de cantos</h3>
      {summary.length === 0 ? (
        <p className="text-[#6f7a97] text-sm italic">Todavía no hay metros de canto calculados para este despiece.</p>
      ) : (
        <ul className="space-y-2">
          {summary.map((item) => (
            <li key={item.ref} className="bg-[#0f172b] border border-[#1a233a] rounded-xl px-3 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[#dee5ff] text-sm font-medium">Ref {item.ref} · {item.nombre}</div>
                <div className="text-[#6f7a97] text-xs uppercase">{item.tipo} · {item.calibre || '-'} {item.color ? `· ${item.color}` : ''}</div>
              </div>
              <div className="text-right">
                <div className="text-[#99f7ff] text-sm font-bold">{item.metros.toFixed(2)} m</div>
                <div className="text-[#6f7a97] text-xs">{item.lados} lados</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
