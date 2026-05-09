import { useEffect, useState } from 'react';

export default function InventoryStockEntryModal({ isOpen, item, mode = 'entry', onClose, onSubmit, error = '' }) {
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCantidad('');
      setMotivo('');
      setLocalError('');
    }
  }, [isOpen, item?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    if (!cantidad || isNaN(cantidad) || Number(cantidad) <= 0) {
      setLocalError('Ingresá una cantidad válida');
      return;
    }

    if (mode === 'exit' && Number(cantidad) > Number(item?.cantidad_disponible || 0)) {
      setLocalError('La salida no puede superar el stock disponible');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        itemId: item.id,
        cantidad: Number(cantidad),
        mode,
        motivo: motivo.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setLocalError(err.message || 'Error al registrar la entrada de stock');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">{mode === 'exit' ? 'Salida rápida de stock' : 'Entrada rápida de stock'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-[#1a233a] bg-[#10182d] text-[#99f7ff] hover:bg-[#15213b] inline-flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[#a3aac4] mb-1">Item</label>
              <input
                type="text"
                value={`${item.codigo} - ${item.nombre}`}
                readOnly
                className="w-full px-3 py-2 bg-[#060e20] border border-[#1a233a] rounded-lg text-[#dee5ff] focus:outline-none focus:ring-2 focus:ring-[#00e0fe] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a3aac4] mb-1">{mode === 'exit' ? 'Cantidad a retirar' : 'Cantidad a ingresar'}</label>
              <input
                type="number"
                min="1"
                step="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full px-3 py-2 bg-[#060e20] border border-[#1a233a] rounded-lg text-[#dee5ff] focus:outline-none focus:ring-2 focus:ring-[#00e0fe] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a3aac4] mb-1">Motivo (opcional)</label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={mode === 'exit' ? 'Ej: consumo interno, pérdida, traslado, etc.' : 'Ej: compra a proveedor, devolución, etc.'}
                className="w-full px-3 py-2 bg-[#060e20] border border-[#1a233a] rounded-lg text-[#dee5ff] focus:outline-none focus:ring-2 focus:ring-[#00e0fe] focus:border-transparent"
              />
            </div>
          </div>

          {(localError || error) && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {localError || error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#1a233a] bg-[#10182d] text-[#99f7ff] hover:bg-[#15213b] transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg border border-[#00e0fe] bg-[#00e0fe] text-[#0a1122] font-semibold hover:bg-[#00d0ff] transition-colors flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin mr-1">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined mr-1">{mode === 'exit' ? 'remove' : 'add'}</span>
              )}
              {mode === 'exit' ? 'Registrar salida' : 'Registrar entrada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
