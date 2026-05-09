import { useEffect, useMemo, useState } from 'react';

export default function InventoryPurchaseModal({ isOpen, providers = [], items = [], purchase, onClose, onSubmit, submitError = '' }) {
  const [providerId, setProviderId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [lines, setLines] = useState([]);
  const [notes, setNotes] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (purchase) {
      setProviderId(purchase.proveedor_id || '');
      setLines(purchase.items || []);
      setNotes(purchase.notas || '');
    } else {
      setProviderId('');
      setLines([]);
      setNotes('');
    }
    setSelectedItemId('');
    setQuantity('');
    setUnitCost('');
    setLocalError('');
  }, [purchase, isOpen]);

  const provider = useMemo(() => providers.find((entry) => entry.id === providerId), [providers, providerId]);
  const availableItems = items.filter((item) => item.activo !== false);

  if (!isOpen) return null;

  const addLine = () => {
    const item = availableItems.find((entry) => entry.id === selectedItemId);
    const qty = Number(quantity || 0);
    const cost = Number(unitCost || item?.costo_unitario || 0);
    if (!item || qty <= 0) {
      setLocalError('Elegí item y cantidad válida.');
      return;
    }
    setLines((prev) => [...prev, {
      item_id: item.id,
      nombre: item.nombre,
      codigo: item.codigo,
      cantidad: qty,
      costo_unitario: cost,
      total: qty * cost,
    }]);
    setSelectedItemId('');
    setQuantity('');
    setUnitCost('');
    setLocalError('');
  };

  const removeLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!providerId) {
      setLocalError('Elegí proveedor.');
      return;
    }
    if (!lines.length) {
      setLocalError('Agregá al menos un item.');
      return;
    }
    onSubmit({
      id: purchase?.id,
      proveedor_id: providerId,
      proveedor_nombre: provider?.nombre || '',
      items: lines,
      notas: notes,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#0a1122] border border-[#1a233a] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a233a] bg-[#060e20]">
          <h2 className="text-lg font-bold text-white">{purchase?.id ? 'Editar orden de compra' : 'Nueva orden de compra'}</h2>
          <button onClick={onClose} className="text-[#a3aac4] hover:text-white"><span className="material-symbols-outlined">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm text-[#a3aac4]">
              <span>Proveedor</span>
              <select value={providerId} onChange={(e) => setProviderId(e.target.value)} className="w-full bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50">
                <option value="">Seleccionar proveedor</option>
                {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.nombre}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-[#a3aac4]">
              <span>Notas</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <label className="flex flex-col gap-1 text-sm text-[#a3aac4] md:col-span-2">
              <span>Item</span>
              <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="w-full bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50">
                <option value="">Seleccionar item</option>
                {availableItems.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-[#a3aac4]">
              <span>Cantidad</span>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-[#a3aac4]">
              <span>Costo unit.</span>
              <input type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="w-full bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50" />
            </label>
          </div>

          <button type="button" onClick={addLine} className="bg-[#1a233a] text-[#99f7ff] px-4 py-2 rounded-xl font-bold hover:bg-[#202b46]">Agregar item</button>

          <div className="overflow-x-auto rounded-2xl border border-[#1a233a] bg-[#060e20]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#10182d] text-[#a3aac4] text-[11px] font-bold tracking-widest uppercase">
                <tr>
                  <th className="px-4 py-3 border-b border-[#1a233a]">Item</th>
                  <th className="px-4 py-3 border-b border-[#1a233a]">Cantidad</th>
                  <th className="px-4 py-3 border-b border-[#1a233a]">Costo</th>
                  <th className="px-4 py-3 border-b border-[#1a233a]">Total</th>
                  <th className="px-4 py-3 border-b border-[#1a233a] text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a233a]">
                {lines.length === 0 ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-[#6f7a97] text-center">Todavía no hay items en la orden.</td></tr>
                ) : lines.map((line, index) => (
                  <tr key={`${line.item_id}-${index}`}>
                    <td className="px-4 py-3 text-[#dee5ff]">{line.codigo} · {line.nombre}</td>
                    <td className="px-4 py-3 text-[#dee5ff]">{line.cantidad}</td>
                    <td className="px-4 py-3 text-[#a3aac4]">${Number(line.costo_unitario || 0).toLocaleString('es-CO')}</td>
                    <td className="px-4 py-3 text-[#dee5ff] font-semibold">${Number(line.total || 0).toLocaleString('es-CO')}</td>
                    <td className="px-4 py-3 text-right"><button type="button" onClick={() => removeLine(index)} className="text-red-400 hover:text-red-300">Quitar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(localError || submitError) ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{localError || submitError}</div> : null}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#a3aac4] hover:text-white hover:bg-[#1a233a]">Cancelar</button>
            <button type="submit" className="bg-[#00e0fe] text-[#002f33] px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#99f7ff]">Guardar orden</button>
          </div>
        </form>
      </div>
    </div>
  );
}
