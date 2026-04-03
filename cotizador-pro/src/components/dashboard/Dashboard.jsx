import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const mockConfig = { currency: 'COP' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        if (window.electronAPI?.getProjects) {
          const data = await window.electronAPI.getProjects();
          setProjects(data);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const getStatusStyle = (state) => {
    switch (state) {
      case 'APROBADA': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'EN PROGRESO': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'RECHAZADA': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusIcon = (state) => {
    switch (state) {
      case 'APROBADA': return 'check_circle';
      case 'EN PROGRESO': return 'model_training';
      case 'RECHAZADA': return 'cancel';
      default: return 'hourglass_empty';
    }
  };

  return (
    <div className="p-8 space-y-8 pb-20">
      {/* Header Panel (Mezclado Imagen 2) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f1930] to-[#1a233a] border border-[#40485d]/30 p-8 shadow-xl">
        {/* Decoraciones de fondo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00e0fe]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#99f7ff]/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

        <div className="relative z-10 max-w-2xl">
          <h1 className="font-['Space_Grotesk'] text-4xl sm:text-5xl font-bold text-white mb-4">
            Buenos días, <span className="text-[#99f7ff]">{user?.username || 'Workshop Alpha'}</span>
          </h1>
          <p className="text-[#a3aac4] text-lg mb-8">
            Tienes <strong className="text-white">8 proyectos activos</strong> esta semana. La optimización de materiales está al 94% de eficiencia.
          </p>
          <button className="bg-[#002f33] border border-[#00e0fe]/30 text-[#00e0fe] px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#00e0fe]/10 transition-colors shadow-lg">
            <span className="material-symbols-outlined text-[20px]">analytics</span>
            Ver Reporte Completo
          </button>
        </div>
      </section>

      {/* KPI Cards (Mezclado Imagen 1 & 2) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl p-6 shadow-lg flex flex-col hover:border-[#40485d] transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#00e0fe]/10 flex items-center justify-center border border-[#00e0fe]/20">
              <span className="material-symbols-outlined text-[#00e0fe] text-[20px]">request_quote</span>
            </div>
            <span className="bg-[#00e0fe]/10 text-[#00e0fe] text-xs font-bold px-2 py-1 rounded border border-[#00e0fe]/20">
              +12.5%
            </span>
          </div>
          <span className="text-[#a3aac4] text-xs font-bold tracking-widest uppercase mb-1">Ventas del Mes</span>
          <span className="text-2xl font-bold text-white">$12,500,000</span>
        </div>

        {/* Card 2 */}
        <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl p-6 shadow-lg flex flex-col hover:border-[#40485d] transition-colors relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <span className="material-symbols-outlined text-blue-400 text-[20px]">build</span>
            </div>
            <span className="bg-blue-500/10 text-blue-400 text-xs font-bold px-2 py-1 rounded border border-blue-500/20">
              Activos
            </span>
          </div>
          <span className="text-[#a3aac4] text-xs font-bold tracking-widest uppercase mb-1">Proyectos en Curso</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">8</span>
            <span className="text-[#a3aac4] text-sm">Unidades</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl p-6 shadow-lg flex flex-col hover:border-[#40485d] transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <span className="material-symbols-outlined text-emerald-400 text-[20px]">description</span>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#a3aac4]">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              Estimado
            </span>
          </div>
          <span className="text-[#a3aac4] text-xs font-bold tracking-widest uppercase mb-1">Cotizaciones Pendientes</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">12</span>
            <span className="text-[#a3aac4] text-sm">por revisión</span>
          </div>
        </div>
      </section>

      {/* Table Section */}
      <section className="bg-[#0a1122] border border-[#1a233a] rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="p-6 border-b border-[#1a233a] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">Cotizaciones Recientes</h2>
            <p className="text-sm text-[#a3aac4]">Gestión de estados y presupuestos en tiempo real</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#a3aac4] text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="Buscar proyecto..." 
                className="w-full bg-[#060e20] border border-[#1a233a] text-sm text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-[#99f7ff]/50 transition-colors placeholder:text-[#40485d]"
              />
            </div>
            <button className="w-10 h-10 shrink-0 rounded-lg bg-[#060e20] border border-[#1a233a] flex items-center justify-center text-[#a3aac4] hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">filter_list</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#060e20]/50 text-[#a3aac4] text-[11px] font-bold tracking-widest uppercase">
              <tr>
                <th className="px-6 py-4 font-bold border-b border-[#1a233a]">Cliente / Proyecto</th>
                <th className="px-6 py-4 font-bold border-b border-[#1a233a]">Fecha</th>
                <th className="px-6 py-4 font-bold border-b border-[#1a233a]">Total Estimado</th>
                <th className="px-6 py-4 font-bold border-b border-[#1a233a]">Estado</th>
                <th className="px-6 py-4 font-bold border-b border-[#1a233a] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a233a]">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 flex items-center justify-center">
                    <div className="flex items-center gap-3 text-[#00e0fe]">
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      <span className="font-bold">Cargando proyectos...</span>
                    </div>
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined text-[#1a233a] text-6xl mb-4">folder_open</span>
                    <h3 className="text-[#dee5ff] font-bold mb-2">No hay proyectos</h3>
                    <p className="text-[#a3aac4] text-sm">Comienza creando tu primer proyecto de cotización.</p>
                  </td>
                </tr>
              ) : (
                projects.map((proj) => (
                  <tr 
                    key={proj.id} 
                    onClick={() => navigate(`/proyecto/${proj.id}`)}
                    className="hover:bg-[#1a233a]/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a233a] to-[#0f1930] flex items-center justify-center border border-[#40485d]/30 shrink-0">
                          <span className="material-symbols-outlined text-[#99f7ff] text-[20px]">dataset</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-[14px]">{proj.title}</span>
                          <span className="text-[#a3aac4] text-[12px]">{proj.client}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#dee5ff]">
                      {new Date(proj.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-white text-[15px]">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: mockConfig.currency || 'COP', maximumFractionDigits: 0 }).format(proj.total || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${getStatusStyle(proj.state)}`}>
                        <span className="material-symbols-outlined text-[14px]">{getStatusIcon(proj.state)}</span>
                        {proj.state}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[#a3aac4] hover:text-white p-2 rounded-lg hover:bg-[#1a233a] transition-colors opacity-0 group-hover:opacity-100">
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
