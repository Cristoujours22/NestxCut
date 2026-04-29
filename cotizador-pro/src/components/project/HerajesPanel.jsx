// src/components/project/HerajesPanel.jsx
import React, { useState, useEffect, useMemo } from 'react';

const API = window.electronAPI;

function normalizeServicio(servicio) {
  let atributos = servicio?.atributos || [];
  if (typeof atributos === 'string') {
    try {
      atributos = JSON.parse(atributos);
    } catch {
      atributos = [];
    }
  }

  const attrs = Array.isArray(atributos) ? atributos : [];
  return {
    ...servicio,
    atributos: attrs,
    precio_base: Number(servicio?.precio || attrs[0]?.precio || 0),
  };
}

// Cargar servicios del sistema
async function loadServicios() {
  if (API?.getServicios) {
    const servicios = await API.getServicios() || [];
    return servicios.map(normalizeServicio);
  }
  return [];
}

// Cargar inventario (herrajes)
async function loadHerajes() {
  if (API?.getInventoryItems) {
    const items = await API.getInventoryItems() || [];
    return items.filter(item => item.item_type === 'herraje');
  }
  return [];
}

export default function HerajesPanel({ initialData = {}, onChange }) {
  const [items, setItems] = useState(initialData.items || []);
  const [servicios, setServicios] = useState([]);
  const [herajesInventory, setHerajesInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddServicio, setShowAddServicio] = useState(false);
  const [searchItem, setSearchItem] = useState('');
  const [searchServicio, setSearchServicio] = useState('');

  useEffect(() => {
    Promise.all([loadServicios(), loadHerajes()]).then(([srv, inv]) => {
      setServicios(srv);
      setHerajesInventory(inv);
      setLoading(false);
    });
  }, []);

  // Calcular total
  const total = useMemo(() => {
    const sumItems = items.reduce((acc, item) => acc + (item.subtotal || 0), 0);
    return sumItems;
  }, [items]);

  // Emitir cambio
  useEffect(() => {
    onChange?.({ items, total });
  }, [items, total]);

  // Filtrar inventory para búsqueda
  const filteredHerajes = useMemo(() => {
    if (!searchItem) return herajesInventory;
    const q = searchItem.toLowerCase();
    return herajesInventory.filter(h => 
      (h.nombre || '').toLowerCase().includes(q) ||
      (h.codigo || '').toLowerCase().includes(q)
    );
  }, [herajesInventory, searchItem]);

  // Filtrar servicios para búsqueda
  const filteredServicios = useMemo(() => {
    if (!searchServicio) return servicios;
    const q = searchServicio.toLowerCase();
    return servicios.filter(s => 
      (s.nombre || '').toLowerCase().includes(q)
    );
  }, [servicios, searchServicio]);

  const addHeraje = (heraje) => {
    const existente = items.find(i => i.heraje_id === heraje.id);
    if (existente) {
      setItems(prev => prev.map(i => 
        i.heraje_id === heraje.id 
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio }
          : i
      ));
    } else {
      setItems(prev => [...prev, {
        id: `hw_${Date.now()}`,
        heraje_id: heraje.id,
        codigo: heraje.codigo,
        nombre: heraje.nombre,
        cantidad: 1,
        precio: Number(heraje.costo_unitario || 0),
        subtotal: Number(heraje.costo_unitario || 0)
      }]);
    }
    setShowAddItem(false);
  };

  const addServicio = (servicio) => {
    const existente = items.find(i => i.servicio_id === servicio.id);
    if (existente) {
      setItems(prev => prev.map(i => 
        i.servicio_id === servicio.id 
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio }
          : i
      ));
    } else {
      setItems(prev => [...prev, {
        id: `srv_${Date.now()}`,
        servicio_id: servicio.id,
        nombre: servicio.nombre,
        origen: 'manual',
        cantidad: 1,
        precio: Number(servicio.precio_base || 0),
        subtotal: Number(servicio.precio_base || 0)
      }]);
    }
    setShowAddServicio(false);
  };

  const updateCantidad = (id, cantidad) => {
    const qty = Math.max(1, parseInt(cantidad) || 1);
    setItems(prev => prev.map(i => 
      i.id === id 
        ? { ...i, cantidad: qty, subtotal: qty * i.precio }
        : i
    ));
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0 
    }).format(price || 0);
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
      {/* Header Actions */}
      <div className="flex items-center gap-3">
        <h2 className="font-['Space_Grotesk'] text-[15px] font-bold text-[#99f7ff] uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined">handyman</span>
          Herrajes y Extras
        </h2>
        
        <button
          onClick={() => setShowAddItem(true)}
          className="ml-auto text-xs bg-[#1a233a] hover:bg-[#202b46] text-[#dee5ff] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors border border-[#40485d]/30"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Agregar Herraje
        </button>
        <button
          onClick={() => setShowAddServicio(true)}
          className="text-xs bg-[#1a233a] hover:bg-[#202b46] text-[#dee5ff] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors border border-[#40485d]/30"
        >
          <span className="material-symbols-outlined text-[16px]">build</span>
          Agregar Servicio
        </button>
      </div>

      <div className="bg-[#0f1930]/60 border border-[#1a233a] rounded-xl px-4 py-3 text-sm text-[#a3aac4]">
        Los <span className="text-cyan-300 font-semibold">servicios detectados</span> salen del despiece. Acá también podés agregar servicios <span className="text-amber-300 font-semibold">manuales</span> por lámina cuando haga falta.
      </div>

      {/* Modal: Agregar Herraje del Inventario */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1930] border border-[#1a233a] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-[#1a233a] flex items-center justify-between">
              <h3 className="text-[#dee5ff] font-bold">Agregar Herraje</h3>
              <button onClick={() => setShowAddItem(false)} className="text-[#a3aac4] hover:text-[#dee5ff]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-4">
              <input
                type="text"
                placeholder="Buscar herraje..."
                value={searchItem}
                onChange={e => setSearchItem(e.target.value)}
                className="w-full bg-[#060e20] border border-[#1a233a] rounded-lg px-4 py-2 text-[#dee5ff] focus:outline-none focus:border-[#99f7ff]"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 pt-0">
              {filteredHerajes.length === 0 ? (
                <div className="text-center p-8 text-[#a3aac4]">
                  <span className="material-symbols-outlined text-4xl">inventory_2</span>
                  <p>No hay herrades en inventario</p>
                  <p className="text-sm mt-1">Agrega herrajes desde el módulo de Inventario</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredHerajes.map(heraje => (
                    <button
                      key={heraje.id}
                      onClick={() => addHeraje(heraje)}
                      className="w-full text-left p-3 rounded-lg hover:bg-[#1a233a] transition-colors"
                    >
                      <div className="text-[#dee5ff] font-medium">{heraje.nombre}</div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#a3aac4]">Código: {heraje.codigo}</span>
                        <span className="text-[#00d1ed]">{formatPrice(heraje.costo_unitario)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar Servicio */}
      {showAddServicio && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1930] border border-[#1a233a] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-[#1a233a] flex items-center justify-between">
              <h3 className="text-[#dee5ff] font-bold">Agregar Servicio</h3>
              <button onClick={() => setShowAddServicio(false)} className="text-[#a3aac4] hover:text-[#dee5ff]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-xs text-[#a3aac4] mb-3">
                Podés agregar manualmente cualquier servicio del catálogo a esta lámina.
              </p>
              <input
                type="text"
                placeholder="Buscar servicio..."
                value={searchServicio}
                onChange={e => setSearchServicio(e.target.value)}
                className="w-full bg-[#060e20] border border-[#1a233a] rounded-lg px-4 py-2 text-[#dee5ff] focus:outline-none focus:border-[#99f7ff]"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 pt-0">
              {filteredServicios.length === 0 ? (
                <div className="text-center p-8 text-[#a3aac4]">
                  <span className="material-symbols-outlined text-4xl">build</span>
                  <p>No hay servicios registrados</p>
                  <p className="text-sm mt-1">Crea servicios desde Configuración</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredServicios.map(servicio => (
                    <button
                      key={servicio.id}
                      onClick={() => addServicio(servicio)}
                      className="w-full text-left p-3 rounded-lg hover:bg-[#1a233a] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[#dee5ff] font-medium">{servicio.nombre}</div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#a3aac4]">{servicio.descripcion || '—'}</span>
                        <span className="text-[#00d1ed]">{formatPrice(servicio.precio_base)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista de items agregados */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-[#0a1122]/50 border border-[#1a233a] rounded-2xl border-dashed">
          <span className="material-symbols-outlined text-[#40485d] text-4xl mb-4">handyman</span>
          <h3 className="text-[#a3aac4] font-medium font-['Space_Grotesk']">No hay herrades ni servicios agregados</h3>
          <p className="text-[#a3aac4] text-sm mt-1">Agrega herdades del inventario o servicios extras</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-[#1a233a] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0f1930] border-b border-[#1a233a]">
              <tr>
                <th className="text-left px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold">Item</th>
                <th className="text-center px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold w-24">Cant.</th>
                <th className="text-right px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold">Unitario</th>
                <th className="text-right px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold">Subtotal</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a233a]">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-[#0f1930]/40">
                  <td className="px-4 py-3">
                    <div className="text-[#dee5ff] font-medium">{item.nombre}</div>
                    {item.codigo && (
                      <div className="text-[#a3aac4] text-xs">{item.codigo}</div>
                    )}
                    {item.origen === 'manual' && (
                      <div className="text-[11px] mt-1 text-amber-300">Servicio manual</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={e => updateCantidad(item.id, e.target.value)}
                      className="w-16 bg-[#060e20] border border-[#1a233a] rounded px-2 py-1 text-[#dee5ff] text-center focus:outline-none focus:border-[#99f7ff]"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-[#a3aac4]">
                    {formatPrice(item.precio)}
                  </td>
                  <td className="px-4 py-3 text-right text-[#00d1ed] font-bold">
                    {formatPrice(item.subtotal)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-[#a3aac4] hover:text-red-400 p-1"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#0f1930] border-t border-[#1a233a]">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-[#a3aac4] font-bold">
                  TOTAL HERRAJES Y EXTRAS
                </td>
                <td className="px-4 py-3 text-right text-[#00e0fe] font-bold text-lg">
                  {formatPrice(total)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Info Footer */}
      <p className="text-xs text-[#a3aac4]">
        Total: {formatPrice(total)}. Este valor se-sumará al total del proyecto en la cotización final.
      </p>
    </div>
  );
}
