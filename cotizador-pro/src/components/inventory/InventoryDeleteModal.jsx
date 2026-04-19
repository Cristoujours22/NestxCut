export default function InventoryDeleteModal({ item, isOpen, onClose, onConfirm }) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0a1122] border border-[#1a233a] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-[#1a233a] bg-[#060e20]">
          <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-300 flex items-center justify-center border border-red-500/20">
            <span className="material-symbols-outlined">delete</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#dee5ff]">Eliminar item</h2>
            <p className="text-sm text-[#6f7a97]">Esta acción registrará una salida y quitará el item del inventario.</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-[#10182d] border border-[#1a233a] p-4 text-sm text-[#a3aac4]">
            Vas a eliminar <strong className="text-[#dee5ff]">{item.nombre}</strong> ({item.codigo}).
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#a3aac4] hover:text-white hover:bg-[#1a233a] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
