// src/components/ServicesPanel.jsx
import React, { useState, useEffect } from 'react';
import DEFAULT_SERVICIOS from '../data/defaultServicios';

const API = window.electronAPI;

// Tipos de cobro disponibles
const TIPOS_COBRO = [
  { value: 'unidad', label: 'Unidad', desc: 'Por pieza/unidad' },
  { value: 'ml', label: 'Metro Lineal', desc: 'Por metro lineal (largo)' },
  { value: 'm2', label: 'Metro Cuadrado', desc: 'Por metro cuadrado (largo × ancho)' },
  { value: 'escala_60', label: 'Escala 60', desc: 'Escala especial (corte hasta 60cm)' },
  { value: 'escala_120', label: 'Escala 120', desc: 'Escala especial (corte hasta 120cm)' },
];

export default function ServicesPanel() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    tipo_cobro: 'unidad',
    descripcion: ''
  });

  useEffect(() => {
    loadServicios();
  }, []);

  const loadServicios = async () => {
    try {
      if (API?.getServicios) {
        const data = await API.getServicios();
        setServicios(data || []);
        
        // Si no hay servicios, ofrecer cargar los default
        if (!data || data.length === 0) {
          setMsg({ 
            ok: true, 
            text: 'No hay servicios. ¿Deseas cargar los servicios por defecto?',
            showDefaults: true 
          });
        }
      }
    } catch (e) {
      console.error('Error loading servicios:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultServicios = async () => {
    setSaving(true);
    try {
      for (const servicio of DEFAULT_SERVICIOS) {
        await API.addServicio(servicio);
      }
      setMsg({ ok: true, text: 'Servicios por defecto cargados' });
      loadServicios();
    } catch (e) {
      setMsg({ ok: false, text: 'Error al cargar servicios por defecto' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', precio: '', tipo_cobro: 'unidad', descripcion: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (servicio) => {
    setFormData({
      nombre: servicio.nombre,
      precio: servicio.precio.toString(),
      tipo_cobro: servicio.tipo_cobro || 'unidad',
      descripcion: servicio.descripcion || ''
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      if (editing) {
        // Update
        await API.updateServicio({
          id: editing.id,
          ...formData,
          precio: parseFloat(formData.precio) || 0
        });
        setMsg({ ok: true, text: 'Servicio actualizado' });
      } else {
        // Create
        await API.addServicio({
          nombre: formData.nombre,
          precio: parseFloat(formData.precio) || 0,
          tipo_cobro: formData.tipo_cobro,
          descripcion: formData.descripcion
        });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="animate-spin material-symbols-outlined text-[#99f7ff]">sync</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[#99f7ff]">handyman</span>
        <h2 className="font-['Space_Grotesk'] text-[15px] font-bold text-[#99f7ff] uppercase tracking-wider">
          Servicios y precios
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="ml-auto text-xs bg-[#00d1ed]/20 hover:bg-[#00d1ed]/30 text-[#00d1ed] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Nuevo
        </button>
      </div>

      {/* Message */}
      {msg && (
        <div className={`text-sm px-3 py-2 rounded-lg ${msg.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {msg.text}
          {msg.showDefaults && (
            <button
              type="button"
              onClick={loadDefaultServicios}
              disabled={saving}
              className="ml-3 text-[#00d1ed] hover:underline"
            >
              {saving ? 'Cargando...' : 'Cargar servicios por defecto'}
            </button>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="glass-panel rounded-2xl border border-[#1a233a] p-4 space-y-4">
          <h3 className="font-medium text-[#dee5ff]">
            {editing ? 'Editar servicio' : 'Nuevo servicio'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#a3aac4] text-xs uppercase tracking-wider font-bold mb-2">
                Nombre del servicio
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))}
                className="w-full bg-[#060e20] border-2 border-[#1a233a] rounded-lg px-4 py-2.5 text-[#dee5ff] focus:outline-none focus:border-[#99f7ff]"
                placeholder="Ej: Caja, Nariz, Pegado, Calado"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#a3aac4] text-xs uppercase tracking-wider font-bold mb-2">
                  Precio base
                </label>
                <input
                  type="number"
                  value={formData.precio}
                  onChange={e => setFormData(p => ({ ...p, precio: e.target.value }))}
                  className="w-full bg-[#060e20] border-2 border-[#1a233a] rounded-lg px-4 py-2.5 text-[#dee5ff] focus:outline-none focus:border-[#99f7ff]"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-[#a3aac4] text-xs uppercase tracking-wider font-bold mb-2">
                  Tipo de cobro
                </label>
                <select
                  value={formData.tipo_cobro}
                  onChange={e => setFormData(p => ({ ...p, tipo_cobro: e.target.value }))}
                  className="w-full bg-[#060e20] border-2 border-[#1a233a] rounded-lg px-4 py-2.5 text-[#dee5ff] focus:outline-none focus:border-[#99f7ff] appearance-none cursor-pointer"
                >
                  {TIPOS_COBRO.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

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

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-[#00d1ed] to-[#00f1fe] text-[#002f33] px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
              >
                {saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear')}
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
      {servicios.length === 0 && !showForm ? (
        <div className="text-center p-8 text-[#a3aac4]">
          <span className="material-symbols-outlined text-4xl mb-2">construction</span>
          <p>No hay servicios registrados</p>
          <p className="text-sm mt-1">Crea servicios para usarlos en tus despieces</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-[#1a233a] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0f1930] border-b border-[#1a233a]">
              <tr>
                <th className="text-left px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold">Servicio</th>
                <th className="text-left px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold">Tipo</th>
                <th className="text-right px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold">Precio</th>
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
                    <span className="text-[#a3aac4] text-sm">{getTipoLabel(s.tipo_cobro)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[#00d1ed] font-bold">{formatPrice(s.precio)}</span>
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

      {/* Info */}
      <p className="text-xs text-[#a3aac4]">
        Total: {servicios.length} servicio(s). Los servicios se detectan automáticamente en el detalle de las piezas.
      </p>
    </div>
  );
}