import { useEffect, useMemo, useState } from 'react';

const defaultByType = {
  tablero: {
    item_type: 'tablero',
    nombre: '', codigo: '', material: '', acabado: '', espesor_mm: '', largo_mm: '', ancho_mm: '', cantidad_disponible: '', cantidad_reservada: 0,
    stock_minimo: '', stock_objetivo: '', costo_unitario: '', proveedor: '', marca: '', ubicacion: '', unidad_stock: 'lamina', notas: '', activo: true,
  },
  herraje: {
    item_type: 'herraje',
    nombre: '', codigo: '', tipo: '', subtipo: '', medida: '', presentacion: 'unidad', cantidad_disponible: '', cantidad_reservada: 0,
    stock_minimo: '', stock_objetivo: '', costo_unitario: '', proveedor: '', marca: '', ubicacion: '', unidad_stock: 'unidad', notas: '', activo: true, tipologia: '',
  },
  canto: {
    item_type: 'canto',
    nombre: '', codigo: '', tipo_canto: 'rigido', calibre: '19', color: '', medida: '', presentacion: 'metro', cantidad_disponible: '', cantidad_reservada: 0,
    stock_minimo: '', stock_objetivo: '', costo_unitario: '', proveedor: '', marca: '', ubicacion: '', unidad_stock: 'metro', notas: '', activo: true,
  },
};

function Field({ label, children }) {
  return <label className="flex flex-col gap-1 text-sm text-[#a3aac4]"> <span>{label}</span>{children}</label>;
}

export default function InventoryFormModal({ isOpen, type, item, existingItems = [], providers = [], onClose, onSubmit, submitError = '' }) {
  const [form, setForm] = useState(defaultByType.tablero);
  const [errors, setErrors] = useState({});
  const isEdit = Boolean(item?.id);
  const currentType = type || item?.item_type || 'tablero';

  useEffect(() => {
    setForm(item || defaultByType[currentType]);
    setErrors({});
  }, [item, currentType]);

  const title = useMemo(() => `${isEdit ? 'Editar' : 'Nuevo'} ${currentType === 'tablero' ? 'tablero' : currentType === 'canto' ? 'canto' : 'herraje'}`, [isEdit, currentType]);

  if (!isOpen) return null;

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!form.nombre?.trim()) nextErrors.nombre = 'El nombre es obligatorio';
    if (!form.codigo?.trim()) nextErrors.codigo = 'El código es obligatorio';
    if (String(form.cantidad_disponible ?? '').trim() === '') nextErrors.cantidad_disponible = 'La cantidad es obligatoria';
    const duplicatedCode = existingItems.some((entry) => (
      entry.codigo?.trim().toLowerCase() === form.codigo?.trim().toLowerCase()
      && entry.id !== item?.id
    ));
    if (duplicatedCode) nextErrors.codigo = 'Ya existe un item con ese código';
    if (Number(form.cantidad_disponible || 0) < 0) nextErrors.cantidad_disponible = 'La cantidad no puede ser negativa';
    if (Number(form.stock_minimo || 0) < 0) nextErrors.stock_minimo = 'El stock mínimo no puede ser negativo';
    if (Number(form.stock_objetivo || 0) < 0) nextErrors.stock_objetivo = 'El stock objetivo no puede ser negativo';
    if (Number(form.costo_unitario || 0) < 0) nextErrors.costo_unitario = 'El costo no puede ser negativo';
    if (Number(form.stock_objetivo || 0) > 0 && Number(form.stock_objetivo || 0) < Number(form.stock_minimo || 0)) {
      nextErrors.stock_objetivo = 'El stock objetivo no puede ser menor al mínimo';
    }

    if (currentType === 'tablero') {
      if (!form.material?.trim()) nextErrors.material = 'El material es obligatorio';
      if (Number(form.espesor_mm || 0) < 0) nextErrors.espesor_mm = 'El espesor no puede ser negativo';
      if (Number(form.largo_mm || 0) < 0) nextErrors.largo_mm = 'El largo no puede ser negativo';
      if (Number(form.ancho_mm || 0) < 0) nextErrors.ancho_mm = 'El ancho no puede ser negativo';
    }

    if (currentType === 'herraje') {
      if (!form.tipo?.trim()) nextErrors.tipo = 'El tipo es obligatorio';
    }

    if (currentType === 'canto') {
      if (!form.tipo_canto?.trim()) nextErrors.tipo_canto = 'El tipo es obligatorio';
      if (!form.calibre?.trim()) nextErrors.calibre = 'El calibre es obligatorio';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({ ...form, item_type: currentType });
  };

  const inputClass = (field) => `w-full bg-[#060e20] border ${errors[field] ? 'border-red-500/60' : 'border-[#1a233a]'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50`;

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#0a1122] border border-[#1a233a] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a233a] bg-[#060e20]">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-[#a3aac4] hover:text-white"><span className="material-symbols-outlined">close</span></button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Nombre">
              <input value={form.nombre || ''} onChange={(e) => set('nombre', e.target.value)} required className={inputClass('nombre')} />
              {errors.nombre && <span className="text-red-400 text-xs">{errors.nombre}</span>}
            </Field>
            <Field label="Código">
              <input value={form.codigo || ''} onChange={(e) => set('codigo', e.target.value)} required className={inputClass('codigo')} />
              {errors.codigo && <span className="text-red-400 text-xs">{errors.codigo}</span>}
            </Field>
            <Field label="Cantidad disponible">
              <input type="number" value={form.cantidad_disponible || ''} onChange={(e) => set('cantidad_disponible', e.target.value)} className={inputClass('cantidad_disponible')} />
              {errors.cantidad_disponible && <span className="text-red-400 text-xs">{errors.cantidad_disponible}</span>}
            </Field>
            <Field label="Stock mínimo">
              <input type="number" value={form.stock_minimo || ''} onChange={(e) => set('stock_minimo', e.target.value)} className={inputClass('stock_minimo')} />
              {errors.stock_minimo && <span className="text-red-400 text-xs">{errors.stock_minimo}</span>}
            </Field>
            <Field label="Stock objetivo">
              <input type="number" value={form.stock_objetivo || ''} onChange={(e) => set('stock_objetivo', e.target.value)} className={inputClass('stock_objetivo')} />
              {errors.stock_objetivo && <span className="text-red-400 text-xs">{errors.stock_objetivo}</span>}
            </Field>
            <Field label="Costo unitario">
              <input type="number" value={form.costo_unitario || ''} onChange={(e) => set('costo_unitario', e.target.value)} className={inputClass('costo_unitario')} />
              {errors.costo_unitario && <span className="text-red-400 text-xs">{errors.costo_unitario}</span>}
            </Field>
            <Field label="Ubicación">
              <input value={form.ubicacion || ''} onChange={(e) => set('ubicacion', e.target.value)} className="w-full bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50" />
            </Field>
            <Field label="Proveedor">
              <select
                value={form.proveedor_id || ''}
                onChange={(e) => {
                  const provider = providers.find((entry) => entry.id === e.target.value);
                  set('proveedor_id', e.target.value);
                  set('proveedor', provider?.nombre || '');
                }}
                className="w-full bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50"
              >
                <option value="">Sin proveedor</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Marca">
              <input value={form.marca || ''} onChange={(e) => set('marca', e.target.value)} className="w-full bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50" />
            </Field>

            {currentType === 'tablero' ? (
              <>
                <Field label="Material"><input value={form.material || ''} onChange={(e) => set('material', e.target.value)} className={inputClass('material')} />{errors.material && <span className="text-red-400 text-xs">{errors.material}</span>}</Field>
                <Field label="Acabado"><input value={form.acabado || ''} onChange={(e) => set('acabado', e.target.value)} className={inputClass('acabado')} /></Field>
                <Field label="Espesor (mm)"><input type="number" value={form.espesor_mm || ''} onChange={(e) => set('espesor_mm', e.target.value)} className={inputClass('espesor_mm')} />{errors.espesor_mm && <span className="text-red-400 text-xs">{errors.espesor_mm}</span>}</Field>
                <Field label="Largo (mm)"><input type="number" value={form.largo_mm || ''} onChange={(e) => set('largo_mm', e.target.value)} className={inputClass('largo_mm')} />{errors.largo_mm && <span className="text-red-400 text-xs">{errors.largo_mm}</span>}</Field>
                <Field label="Ancho (mm)"><input type="number" value={form.ancho_mm || ''} onChange={(e) => set('ancho_mm', e.target.value)} className={inputClass('ancho_mm')} />{errors.ancho_mm && <span className="text-red-400 text-xs">{errors.ancho_mm}</span>}</Field>
              </>
            ) : currentType === 'canto' ? (
              <>
                <Field label="Tipo"><select value={form.tipo_canto || 'rigido'} onChange={(e) => set('tipo_canto', e.target.value)} className={inputClass('tipo_canto')}><option value="rigido">Rígido</option><option value="flexible">Flexible</option></select>{errors.tipo_canto && <span className="text-red-400 text-xs">{errors.tipo_canto}</span>}</Field>
                <Field label="Calibre"><select value={form.calibre || '19'} onChange={(e) => set('calibre', e.target.value)} className={inputClass('calibre')}><option value="19">19</option><option value="22">22</option><option value="33">33</option><option value="41">41</option></select>{errors.calibre && <span className="text-red-400 text-xs">{errors.calibre}</span>}</Field>
                <Field label="Color / acabado"><input value={form.color || ''} onChange={(e) => set('color', e.target.value)} className={inputClass('color')} /></Field>
                <Field label="Presentación"><input value={form.presentacion || ''} onChange={(e) => set('presentacion', e.target.value)} className={inputClass('presentacion')} /></Field>
              </>
            ) : (
              <>
                <Field label="Tipo"><input value={form.tipo || ''} onChange={(e) => set('tipo', e.target.value)} className={inputClass('tipo')} />{errors.tipo && <span className="text-red-400 text-xs">{errors.tipo}</span>}</Field>
                <Field label="Subtipo"><input value={form.subtipo || ''} onChange={(e) => set('subtipo', e.target.value)} className={inputClass('subtipo')} /></Field>
                <Field label="Tipología"><select value={form.tipologia || ''} onChange={(e) => set('tipologia', e.target.value)} className="w-full bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50"><option value="">Sin tipología</option><option value="puerta">Puerta</option><option value="mueble">Mueble</option></select></Field>
                <Field label="Medida"><input value={form.medida || ''} onChange={(e) => set('medida', e.target.value)} className={inputClass('medida')} /></Field>
                <Field label="Presentación"><input value={form.presentacion || ''} onChange={(e) => set('presentacion', e.target.value)} className={inputClass('presentacion')} /></Field>
              </>
            )}
          </div>

          <Field label="Notas">
            <textarea value={form.notas || ''} onChange={(e) => set('notas', e.target.value)} rows={3} className="w-full bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e0fe]/50" />
          </Field>

          {submitError ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {submitError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#a3aac4] hover:text-white hover:bg-[#1a233a]">Cancelar</button>
            <button type="submit" className="bg-[#00e0fe] text-[#002f33] px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#99f7ff]">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
