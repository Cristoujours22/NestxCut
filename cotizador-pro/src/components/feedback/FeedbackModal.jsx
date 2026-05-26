import { useState } from 'react';

export default function FeedbackModal({ isOpen, onClose }) {
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleSend = () => {
    const body = encodeURIComponent(mensaje || '');
    const subject = encodeURIComponent(asunto || 'Sugerencia NESTXCUT');
    const mailto = `mailto:capaalonso@gmail.com?subject=${subject}&body=${body}`;
    window.open(mailto, '_blank');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#1a233a] bg-[#0a1122] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a233a] bg-[#060e20] flex items-center justify-between">
          <div>
            <h3 className="text-[#dee5ff] font-bold font-['Space_Grotesk']">Enviar sugerencia</h3>
            <p className="text-[#a3aac4] text-xs mt-0.5">Tu opinión ayuda a mejorar NESTXCUT</p>
          </div>
          <button onClick={onClose} className="text-[#a3aac4] hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-[#a3aac4] text-[11px] font-bold uppercase tracking-[0.18em]">Asunto</span>
            <input
              type="text"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Ej: Mejorar el módulo de puertas"
              className="rounded-2xl border border-[#1a233a] bg-[#060e20] px-4 py-3 text-sm text-white outline-none focus:border-[#99f7ff]/40"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[#a3aac4] text-[11px] font-bold uppercase tracking-[0.18em]">Mensaje</span>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={5}
              placeholder="Describí tu sugerencia, idea o problema..."
              className="rounded-2xl border border-[#1a233a] bg-[#060e20] px-4 py-3 text-sm text-white outline-none focus:border-[#99f7ff]/40 resize-none"
            />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#1a233a] bg-[#10182d] text-[#a3aac4] hover:text-white hover:bg-[#15213b] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!mensaje.trim()}
              className="px-4 py-2 rounded-xl bg-[#00e0fe] text-[#002f33] font-bold hover:bg-[#99f7ff] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Abrir correo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
