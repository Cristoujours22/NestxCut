import { useEffect, useState } from 'react';

export default function InventoryProviderModal({ isOpen, provider, onClose, onSubmit, submitError = '' }) {
  const [form, setForm] = useState({ nombre: '', documento: '', celular: '', email: '', contacto: '', notas: '' });
  const [errors, setErrors] = useState({});
  const isEdit = Boolean(provider?.id);

  useEffect(() => {
    setForm(provider || { nombre: '', documento: '', celular: '', email: '', contacto: '', notas: '' });
    setErrors({});
  }, [provider]);

  if (!isOpen) return null;

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.nombre?.trim()) nextErrors.nombre = 'El nombre es obligatorio';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSubmit({ ...form });
  };

  const inputClass = (field) => `w-full bg-[#060e20] border ${errors[field] ? 'border-red-500/60' : 'border-[#1a233a]'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50`;

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0a1122] border border-[#1a233a] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a233a] bg-[#060e20]">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
          <button onClick={onClose} className="text-[#a3aac4] hover:text-white"><span className="material-symbols-outlined">close</span></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm text-[#a3aac4]">
              <span>Nombre</span>
              <input value={form.nombre || ''} onChange={(e) => set('nombre', e.target.value)} className={inputClass('nombre')} />
              {errors.nombre && <span className="text-red-400 text-xs">{errors.nombre}</span>}
            </label>
            <label className="flex flex-col gap-1 text-sm text-[#a3aac4]">
              <span>Cédula / NIT</span>
              <input value={form.documento || ''} onChange={(e) => set('documento', e.target.value)} className={inputClass('documento')} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-[#a3aac4]">
              <span>Celular</span>
              <input value={form.celular || ''} onChange={(e) => set('celular', e.target.value)} className={inputClass('celular')} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-[#a3aac4]">
              <span>Email</span>
              <input value={form.email || ''} onChange={(e) => set('email', e.target.value)} className={inputClass('email')} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-[#a3aac4] md:col-span-2">
              <span>Contacto</span>
              <input value={form.contacto || ''} onChange={(e) => set('contacto', e.target.value)} className={inputClass('contacto')} />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-[#a3aac4]">
            <span>Notas</span>
            <textarea value={form.notas || ''} onChange={(e) => set('notas', e.target.value)} rows={3} className="w-full bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50" />
          </label>

          {submitError ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{submitError}</div> : null}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#a3aac4] hover:text-white hover:bg-[#1a233a]">Cancelar</button>
            <button type="submit" className="bg-[#00e0fe] text-[#002f33] px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#99f7ff]">Guardar proveedor</button>
          </div>
        </form>
      </div>
    </div>
  );
}
