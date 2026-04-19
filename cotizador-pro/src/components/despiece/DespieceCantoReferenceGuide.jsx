export default function DespieceCantoReferenceGuide({ cantos = [] }) {
  if (!cantos.length) return null;

  return (
    <div className="mb-3 bg-[#0a1122] border border-[#1a233a] rounded-xl p-3">
      <div className="text-[#a3aac4] text-[11px] uppercase tracking-widest font-bold mb-2">Referencias de canto</div>
      <div className="flex flex-wrap gap-2">
        {cantos.map((canto) => (
          <div key={canto.ref} className="px-2.5 py-1.5 rounded-lg bg-[#10182d] border border-[#1a233a] text-xs text-[#dee5ff]">
            <span className="text-[#00e0fe] font-bold mr-1">{canto.ref}</span>
            {canto.nombre}
            <span className="text-[#6f7a97] ml-1">· {canto.tipo} · {canto.calibre}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
