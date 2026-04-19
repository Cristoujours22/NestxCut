export default function DiscardChangesModal({ isOpen, onStay, onDiscard, onSaveAndLeave, isSaving }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0a1122] border border-[#1a233a] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#1a233a] bg-[#060e20]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-300 flex items-center justify-center border border-amber-500/20">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#dee5ff]">Cambios sin guardar</h2>
              <p className="text-sm text-[#6f7a97]">Si salís ahora, vas a perder lo que editaste.</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-[#10182d] border border-[#1a233a] p-4 text-sm text-[#a3aac4]">
            ¿Querés seguir editando, guardar antes de salir o descartar los cambios y volver al menú principal?
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={onStay}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#a3aac4] hover:text-white hover:bg-[#1a233a] transition-colors"
            >
              Seguir editando
            </button>
            <button
              type="button"
              onClick={onDiscard}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors"
            >
              Descartar y salir
            </button>
            <button
              type="button"
              onClick={onSaveAndLeave}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#00e0fe] text-[#002f33] hover:bg-[#99f7ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Guardando...' : 'Guardar y salir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
