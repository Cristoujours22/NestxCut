import { useEffect, useState } from 'react';

const DEFAULT_CANTO = {
  ref: '',
  inventory_item_id: '',
  nombre: '',
  tipo: 'rigido',
  calibre: '19',
  color: '',
};

function Field({ label, children, error }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[#a3aac4]">
      <span>{label}</span>
      {children}
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </label>
  );
}

export default function DespieceCantoModal({ isOpen, canto, inventoryCantos, existingRefs, onClose, onSubmit }) {
  const [form, setForm] = useState(DEFAULT_CANTO);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(canto || DEFAULT_CANTO);
    setErrors({});
  }, [canto]);

  if (!isOpen) return null;

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const inputClass = (field) => `w-full bg-[#060e20] border ${errors[field] ? 'border-red-500/60' : 'border-[#1a233a]'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50`;

  const handleInventoryChange = (value) => {
    const selected = inventoryCantos.find((item) => item.id === value);
    if (!selected) {
      set('inventory_item_id', '');
      return;
    }

    setForm((prev) => ({
      ...prev,
      inventory_item_id: selected.id,
      nombre: selected.nombre || prev.nombre,
      tipo: selected.tipo_canto || prev.tipo,
      calibre: selected.calibre || prev.calibre,
      color: selected.color || prev.color,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    const numericRef = Number(form.ref);
    if (!numericRef || numericRef < 1 || numericRef > 8) nextErrors.ref = 'La referencia debe estar entre 1 y 8';
    if (!form.nombre?.trim()) nextErrors.nombre = 'El nombre del canto es obligatorio';
    if (existingRefs.includes(numericRef) && numericRef !== Number(canto?.ref)) nextErrors.ref = 'Esa referencia ya está usada en este despiece';

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({
      ...form,
      ref: numericRef,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0a1122] border border-[#1a233a] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a233a] bg-[#060e20]">
          <h2 className="text-lg font-bold text-white">{canto ? 'Editar canto' : 'Nuevo canto del despiece'}</h2>
          <button onClick={onClose} className="text-[#a3aac4] hover:text-white"><span className="material-symbols-outlined">close</span></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Referencia" error={errors.ref}>
              <input type="number" min="1" max="8" value={form.ref} onChange={(e) => set('ref', e.target.value)} className={inputClass('ref')} />
            </Field>
            <Field label="Canto desde inventario">
              <select value={form.inventory_item_id || ''} onChange={(e) => handleInventoryChange(e.target.value)} className={inputClass('inventory_item_id')}>
                <option value="">Seleccionar canto...</option>
                {inventoryCantos.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre} · {item.tipo_canto || item.tipo || 'rigido'} · {item.calibre || '-'}</option>
                ))}
              </select>
            </Field>
            <Field label="Nombre" error={errors.nombre}>
              <input value={form.nombre || ''} onChange={(e) => set('nombre', e.target.value)} className={inputClass('nombre')} />
            </Field>
            <Field label="Tipo">
              <select value={form.tipo || 'rigido'} onChange={(e) => set('tipo', e.target.value)} className={inputClass('tipo')}>
                <option value="rigido">Rígido</option>
                <option value="flexible">Flexible</option>
              </select>
            </Field>
            <Field label="Calibre">
              <select value={form.calibre || '19'} onChange={(e) => set('calibre', e.target.value)} className={inputClass('calibre')}>
                <option value="19">19</option>
                <option value="22">22</option>
                <option value="33">33</option>
                <option value="41">41</option>
              </select>
            </Field>
            <Field label="Color / acabado">
              <input value={form.color || ''} onChange={(e) => set('color', e.target.value)} className={inputClass('color')} />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#a3aac4] hover:text-white hover:bg-[#1a233a]">Cancelar</button>
            <button type="submit" className="bg-[#00e0fe] text-[#002f33] px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#99f7ff]">Guardar canto</button>
          </div>
        </form>
      </div>
    </div>
  );
}
