// src/components/ServicesModal.jsx
import React, { useState, useEffect, useRef } from 'react';

const API = window.electronAPI;

// Tipos de cobro disponibles
const TIPOS_COBRO = [
  { value: 'unidad', label: 'Unidad', desc: 'Por pieza/unidad' },
  { value: 'ml', label: 'Metro Lineal', desc: 'Por metro lineal (largo o ancho)' },
  { value: 'm2', label: 'Metro Cuadrado', desc: 'Por metro cuadrado' },
  { value: 'cantidad', label: 'Cantidad (x2, x3)', desc: 'Cantidad específica (x1, x2, etc)' },
  { value: 'lados', label: 'Lados (2L, 3L)', desc: 'Por cantidad de lados (2L, 3L, 4L)' },
  { value: 'canto', label: 'Canto', desc: 'Por canto marcado (L1, L2, A1, A2)' },
  { value: 'escala_60', label: 'Escala 60', desc: 'Corte hasta 60cm' },
  { value: 'escala_120', label: 'Escala 120', desc: 'Corte hasta 120cm' },
];

// Opciones para ml (de dónde tomar la medida)
const MEDIDA_ML = [
  { value: 'largo', label: 'Largo' },
  { value: 'ancho', label: 'Ancho' },
  { value: 'suma', label: 'Largo + Ancho' },
];

// Opciones de lados para canto
const LADOS_CANTO = [
  { value: 'L1', label: 'L1' },
  { value: 'L2', label: 'L2' },
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
];

const MODOS_ORIGEN = [
  { value: 'despiece', label: 'Automático desde despiece', desc: 'Se detecta desde el detalle de las piezas.' },
  { value: 'manual', label: 'Manual en herrajes y extras', desc: 'Se agrega manualmente en la cotización.' },
  { value: 'mixto', label: 'Mixto', desc: 'Puede venir desde despiece o agregarse manualmente; luego se consolida.' },
];

export default function ServicesModal({ isOpen, onClose }) {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const modalRef = useRef(null);

  // Form state - nueva estructura con atributos
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    modo_origen: 'despiece',
    atributos: [{ tipo: 'cantidad', precio: '', medida: 'largo', lados: [] }]
  });

  // Cerrar con ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      loadServicios();
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // Cerrar al hacer click fuera del modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const loadServicios = async () => {
    try {
      if (API?.getServicios) {
        const data = await API.getServicios();
        
        // Convertir formato viejo al nuevo si es necesario
        const converted = (data || []).map(s => {
          // Los atributos pueden venir como string JSON o como array
          let attrs = s.atributos;
          if (typeof attrs === 'string') {
            try {
              attrs = JSON.parse(attrs);
            } catch (e) {
              attrs = [];
            }
          }
          
          // Si no hay atributos pero hay precio viejo, crear uno
          if ((!attrs || attrs.length === 0) && s.precio) {
            attrs = [{ tipo: s.tipo_cobro || 'cantidad', precio: s.precio }];
          }
          
          // Asegurar que cada atributo tenga los campos correctos
          if (attrs && attrs.length > 0) {
            attrs = attrs.map(a => ({
              tipo: a.tipo || 'cantidad',
              precio: a.precio || 0,
              medida: a.medida || 'largo',
              lados: a.lados || []
            }));
          } else {
            attrs = [{ tipo: 'cantidad', precio: 0, medida: 'largo', lados: [] }];
          }
          
          return { ...s, atributos: attrs, modo_origen: s.modo_origen || 'despiece' };
        });
        
        setServicios(converted);
        
      }
    } catch (e) {
      console.error('Error loading servicios:', e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      nombre: '', 
      descripcion: '', 
      modo_origen: 'despiece',
      atributos: [{ tipo: 'cantidad', precio: '', medida: 'largo', lados: [] }] 
    });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (servicio) => {
    setFormData({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
      modo_origen: servicio.modo_origen || 'despiece',
      atributos: servicio.atributos && servicio.atributos.length > 0 
        ? servicio.atributos.map(a => ({ 
            tipo: a.tipo, 
            precio: a.precio?.toString() || '',
            medida: a.medida || 'largo',
            lados: a.lados || []
          }))
        : [{ tipo: 'cantidad', precio: '' }]
    });
    setEditing(servicio);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    try {
      if (API?.deleteServicio) {
        await API.deleteServicio(id);
        setMsg({ ok: true, text: 'Servicio eliminado' });
        loadServicios();
      }
    } catch (e) {
      setMsg({ ok: false, text: 'Error al eliminar' });
    }
  };

  // Agregar atributo
  const addAtributo = () => {
    setFormData(p => ({
      ...p,
      atributos: [...p.atributos, { tipo: 'ml', precio: '', medida: 'largo', lados: [] }]
    }));
  };

  // Eliminar atributo
  const removeAtributo = (index) => {
    if (formData.atributos.length <= 1) return; // Mantener al menos uno
    setFormData(p => ({
      ...p,
      atributos: p.atributos.filter((_, i) => i !== index)
    }));
  };

  // Actualizar atributo
  const updateAtributo = (index, field, value) => {
    setFormData(p => ({
      ...p,
      atributos: p.atributos.map((a, i) => i === index ? { ...a, [field]: value } : a)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      // Guardar todos los atributos que tengan precio
      const servicioData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        modo_origen: formData.modo_origen,
        atributos: formData.atributos
          .filter(a => a.precio && parseFloat(a.precio) > 0)
          .map(a => ({
            tipo: a.tipo,
            precio: parseFloat(a.precio) || 0,
            medida: a.medida || 'largo',
            lados: a.lados || []
          }))
      };

      if (servicioData.atributos.length === 0) {
        setMsg({ ok: false, text: 'Debes agregar al menos un atributo con precio' });
        setSaving(false);
        return;
      }

      if (editing) {
        await API.updateServicio({
          id: editing.id,
          ...servicioData
        });
        setMsg({ ok: true, text: 'Servicio actualizado' });
      } else {
        await API.addServicio(servicioData);
        setMsg({ ok: true, text: 'Servicio creado' });
      }
      loadServicios();
      resetForm();
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0 
    }).format(price);
  };

  const getTipoLabel = (tipo) => {
    const found = TIPOS_COBRO.find(t => t.value === tipo);
    return found ? found.label : tipo;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="w-full max-w-2xl max-h-[80vh] bg-[#060e20] rounded-2xl border border-[#1a233a] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1a233a] shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#99f7ff]">handyman</span>
            <h2 className="font-['Space_Grotesk'] text-xl font-bold text-[#dee5ff]">
              Servicios y Precios
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1a233a]/50 text-[#a3aac4] hover:text-[#dee5ff] hover:bg-[#1a233a] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Message */}
          {msg && (
            <div className={`text-sm px-3 py-2 rounded-lg ${msg.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              <span>{msg.text}</span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center p-8">
              <span className="animate-spin material-symbols-outlined text-[#99f7ff]">sync</span>
            </div>
          )}

          {/* Form Modal */}
          {!loading && showForm && (
            <div className="bg-[#0a1122] rounded-xl p-4 space-y-4 border border-[#1a233a]">
              <h3 className="font-medium text-[#dee5ff]">
                {editing ? 'Editar servicio' : 'Nuevo servicio'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-[#a3aac4] text-xs uppercase tracking-wider font-bold mb-2">
                    Nombre del servicio
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))}
                    className="w-full bg-[#060e20] border-2 border-[#1a233a] rounded-lg px-4 py-2.5 text-[#dee5ff] focus:outline-none focus:border-[#99f7ff]"
                    placeholder="Ej: Pegado, Caja, Nariz"
                    required
                    autoFocus
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-[#a3aac4] text-xs uppercase tracking-wider font-bold mb-2">
                    Descripción (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.descripcion}
                    onChange={e => setFormData(p => ({ ...p, descripcion: e.target.value }))}
                    className="w-full bg-[#060e20] border-2 border-[#1a233a] rounded-lg px-4 py-2.5 text-[#dee5ff] focus:outline-none focus:border-[#99f7ff]"
                    placeholder="Descripción o notas"
                  />
                </div>

                <div>
                  <label className="block text-[#a3aac4] text-xs uppercase tracking-wider font-bold mb-2">
                    Origen del servicio
                  </label>
                  <select
                    value={formData.modo_origen}
                    onChange={e => setFormData(p => ({ ...p, modo_origen: e.target.value }))}
                    className="w-full bg-[#060e20] border-2 border-[#1a233a] rounded-lg px-4 py-2.5 text-[#dee5ff] focus:outline-none focus:border-[#99f7ff] appearance-none cursor-pointer"
                  >
                    {MODOS_ORIGEN.map((modo) => (
                      <option key={modo.value} value={modo.value}>{modo.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-[#a3aac4] mt-2">
                    {MODOS_ORIGEN.find((modo) => modo.value === formData.modo_origen)?.desc}
                  </p>
                </div>

                {/* Atributos */}
                <div>
                  <label className="block text-[#a3aac4] text-xs uppercase tracking-wider font-bold mb-2">
                    Atributos de cobro
                  </label>
                  <p className="text-xs text-[#a3aac4] mb-3">
                    Agrega diferentes formas de cobrar este servicio
                  </p>
                  
                  {formData.atributos.map((attr, index) => (
                    <div key={index} className="bg-[#0a1122] rounded-lg p-3 mb-3 border border-[#1a233a]">
                      <div className="flex gap-2 mb-2">
                        <select
                          value={attr.tipo}
                          onChange={e => updateAtributo(index, 'tipo', e.target.value)}
                          className="bg-[#060e20] border-2 border-[#1a233a] rounded-lg px-3 py-2 text-[#dee5ff] focus:outline-none focus:border-[#99f7ff] appearance-none cursor-pointer min-w-[140px]"
                        >
                          {TIPOS_COBRO.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={attr.precio}
                          onChange={e => updateAtributo(index, 'precio', e.target.value)}
                          className="flex-1 bg-[#060e20] border-2 border-[#1a233a] rounded-lg px-3 py-2 text-[#dee5ff] focus:outline-none focus:border-[#99f7ff]"
                          placeholder="Precio"
                        />
                        {formData.atributos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAtributo(index)}
                            className="p-2 text-[#a3aac4] hover:text-red-400"
                          >
                            <span className="material-symbols-outlined text-[20px]">remove_circle</span>
                          </button>
                        )}
                      </div>
                      
                      {/* Opciones adicionales según tipo */}
                      {attr.tipo === 'ml' && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-[#a3aac4]">Medida:</span>
                          <select
                            value={attr.medida || 'largo'}
                            onChange={e => updateAtributo(index, 'medida', e.target.value)}
                            className="bg-[#060e20] border border-[#1a233a] rounded px-2 py-1 text-xs text-[#dee5ff] appearance-none cursor-pointer"
                          >
                            {MEDIDA_ML.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                          <span className="text-xs text-[#a3aac4]">mm</span>
                        </div>
                      )}
                      
                      {attr.tipo === 'canto' && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-xs text-[#a3aac4]">Cantos:</span>
                          {LADOS_CANTO.map(l => (
                            <label key={l.value} className="flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={attr.lados?.includes(l.value) || false}
                                onChange={e => {
                                  const currentLados = attr.lados || [];
                                  const newLados = e.target.checked
                                    ? [...currentLados, l.value]
                                    : currentLados.filter(x => x !== l.value);
                                  updateAtributo(index, 'lados', newLados);
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-[#dee5ff]">{l.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addAtributo}
                    className="text-xs text-[#00d1ed] hover:underline flex items-center gap-1 mt-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Agregar otro atributo
                  </button>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-gradient-to-r from-[#00d1ed] to-[#00f1fe] text-[#002f33] px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                  >
                    {saving ? '...' : (editing ? 'Actualizar' : 'Crear')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-[#a3aac4] hover:text-[#dee5ff] px-4 py-2 text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de servicios */}
          {!loading && !showForm && (
            <>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowForm(true)}
                  className="text-xs bg-[#00d1ed]/20 hover:bg-[#00d1ed]/30 text-[#00d1ed] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Nuevo
                </button>
              </div>

              {servicios.length === 0 ? (
                <div className="text-center p-8 text-[#a3aac4]">
                  <span className="material-symbols-outlined text-4xl mb-2">construction</span>
                  <p>No hay servicios registrados</p>
                </div>
              ) : (
                <div className="border border-[#1a233a] rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#0f1930] border-b border-[#1a233a]">
                      <tr>
                        <th className="text-left px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold">Servicio</th>
                        <th className="text-left px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold">Origen</th>
                        <th className="text-left px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold">Atributos</th>
                        <th className="text-right px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a233a]">
                      {servicios.map((s) => (
                        <tr key={s.id} className="hover:bg-[#0f1930]/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="text-[#dee5ff] font-medium">{s.nombre}</div>
                            {s.descripcion && (
                              <div className="text-[#a3aac4] text-xs">{s.descripcion}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              s.modo_origen === 'manual'
                                ? 'bg-amber-500/15 text-amber-300'
                                : s.modo_origen === 'mixto'
                                  ? 'bg-violet-500/15 text-violet-300'
                                  : 'bg-cyan-500/15 text-cyan-300'
                            }`}>
                              {MODOS_ORIGEN.find((modo) => modo.value === s.modo_origen)?.label || 'Automático desde despiece'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {(s.atributos || []).map((attr, i) => (
                                <span key={i} className="text-xs bg-[#1a233a]/50 text-[#a3aac4] px-2 py-1 rounded">
                                  {getTipoLabel(attr.tipo)}: {formatPrice(attr.precio)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleEdit(s)}
                              className="text-[#a3aac4] hover:text-[#99f7ff] p-1"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(s.id)}
                              className="text-[#a3aac4] hover:text-red-400 p-1 ml-1"
                              title="Eliminar"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs text-[#a3aac4] text-center">
                Total: {servicios.length} servicio(s)
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
