import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const STATUS_FILTERS = ['TODOS', 'EN PROGRESO', 'APROBADA', 'RECHAZADA'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [companyName, setCompanyName] = useState('Workshop Alpha');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        if (window.electronAPI?.getProjects) {
          const data = await window.electronAPI.getProjects();
          setProjects(data);
        }
        if (window.electronAPI?.getCompanySettings) {
          const settings = await window.electronAPI.getCompanySettings();
          setCompanyName(settings?.company_name || 'Workshop Alpha');
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  };

  const currentMonthSales = useMemo(() => {
    const now = new Date();
    return projects.reduce((acc, proj) => {
      if (proj.state !== 'APROBADA') return acc;
      const dateSource = proj.updated_at || proj.created_at;
      if (!dateSource) return acc;
      const projectDate = new Date(dateSource);
      if (projectDate.getMonth() !== now.getMonth() || projectDate.getFullYear() !== now.getFullYear()) return acc;
      return acc + Number(proj.total || 0);
    }, 0);
  }, [projects]);

  const activeProjects = useMemo(
    () => projects.filter((proj) => proj.state === 'EN PROGRESO').length,
    [projects]
  );

  const pendingQuotes = useMemo(
    () => projects.filter((proj) => proj.state === 'EN PROGRESO' || Number(proj.total || 0) <= 0).length,
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((proj) => {
      const matchesSearch = !query || [proj.title, proj.client]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

      const matchesStatus = statusFilter === 'TODOS' || proj.state === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const nextFilter = () => {
    const currentIndex = STATUS_FILTERS.indexOf(statusFilter);
    const nextIndex = (currentIndex + 1) % STATUS_FILTERS.length;
    setStatusFilter(STATUS_FILTERS[nextIndex]);
  };

  const greetingSummary = useMemo(() => {
    if (loading) return 'Cargando el estado real de tus proyectos...';
    if (!projects.length) return 'Todavía no tenés proyectos cargados. Cuando crees el primero, este panel se va a actualizar solo.';
    return `Tenés ${activeProjects} proyectos en curso y ${pendingQuotes} cotizaciones pendientes. Revisá el tablero y seguí desde donde lo dejaste.`;
  }, [loading, projects, activeProjects, pendingQuotes]);

  return (
    <div className="p-6 md:p-8 space-y-8 pb-20 max-w-[1600px] mx-auto">
      {/* Header Panel (Mezclado Imagen 2) */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0f1930] via-[#16233f] to-[#1a233a] border border-[#40485d]/30 px-7 py-8 md:px-9 md:py-10 shadow-[0_20px_60px_rgba(3,8,20,0.35)]">
        {/* Decoraciones de fondo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00e0fe]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#99f7ff]/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#99f7ff]/15 bg-[#99f7ff]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#99f7ff] mb-5">
              <span className="w-2 h-2 rounded-full bg-[#00e0fe] shadow-[0_0_12px_#00e0fe]"></span>
              Panel principal
            </div>
            <h1 className="font-['Space_Grotesk'] text-[42px] leading-[0.95] sm:text-5xl md:text-6xl font-bold text-white mb-5 tracking-[-0.04em]">
              Buenos días, <span className="text-[#99f7ff]">{companyName}</span>
            </h1>
            <p className="text-[#a9b6d3] text-lg md:text-[20px] leading-8 max-w-[780px]">
              {greetingSummary}
            </p>
          </div>

          <div className="lg:pb-1 lg:shrink-0 lg:self-end">
            <button
              disabled
              title="Próximamente"
              className="bg-[#002f33] border border-[#00e0fe]/20 text-[#5bd8e6] px-6 py-3 rounded-xl font-bold flex items-center gap-2 opacity-60 cursor-not-allowed shadow-lg"
            >
              <span className="material-symbols-outlined text-[20px]">analytics</span>
              Reportes próximamente
            </button>
          </div>
        </div>
      </section>

      {/* KPI Cards (Mezclado Imagen 1 & 2) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
        {/* Card 1 */}
        <div className="bg-gradient-to-br from-[#0b162b] to-[#091120] border border-[#00e0fe]/20 rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,224,254,0.08)] flex flex-col hover:border-[#00e0fe]/40 hover:-translate-y-0.5 transition-all min-h-[190px]">
          <div className="flex justify-between items-start mb-5 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#00e0fe]/12 flex items-center justify-center border border-[#00e0fe]/25 shadow-[0_0_30px_rgba(0,224,254,0.12)] shrink-0">
                <span className="material-symbols-outlined text-[#00e0fe] text-[22px]">request_quote</span>
              </div>
              <span className="text-[#a3aac4] text-[11px] font-bold tracking-[0.18em] uppercase leading-tight">Ventas del Mes</span>
            </div>
            <span className="bg-[#00e0fe]/10 text-[#00e0fe] text-xs font-bold px-2.5 py-1 rounded-lg border border-[#00e0fe]/20">
              Mes actual
            </span>
          </div>
          <span className="text-3xl md:text-4xl font-extrabold text-white tracking-[-0.04em] leading-none">{formatCurrency(currentMonthSales)}</span>
          <span className="text-[#7f8ba8] text-sm mt-3">Ventas cerradas este mes</span>
        </div>

        {/* Card 2 */}
        <div className="bg-gradient-to-br from-[#0c162c] to-[#091120] border border-blue-500/20 rounded-[24px] p-6 shadow-[0_10px_40px_rgba(59,130,246,0.08)] flex flex-col hover:border-blue-400/40 hover:-translate-y-0.5 transition-all relative overflow-hidden min-h-[190px]">
          <div className="absolute right-0 top-0 w-28 h-28 bg-blue-500/8 rounded-bl-full pointer-events-none"></div>
          <div className="flex justify-between items-start mb-5 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-blue-500/12 flex items-center justify-center border border-blue-500/25 shadow-[0_0_30px_rgba(59,130,246,0.12)] shrink-0">
                <span className="material-symbols-outlined text-blue-400 text-[22px]">build</span>
              </div>
              <span className="text-[#a3aac4] text-[11px] font-bold tracking-[0.18em] uppercase leading-tight">Proyectos en Curso</span>
            </div>
            <span className="bg-blue-500/10 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-500/20">
              Activos
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl md:text-5xl font-extrabold text-white tracking-[-0.04em] leading-none">{activeProjects}</span>
            <span className="text-[#a3aac4] text-sm">proyectos</span>
          </div>
          <span className="text-[#7f8ba8] text-sm mt-3">Actualmente en ejecución</span>
        </div>

        {/* Card 3 */}
        <div className="bg-gradient-to-br from-[#0f1726] to-[#091120] border border-emerald-500/20 rounded-[24px] p-6 shadow-[0_10px_40px_rgba(16,185,129,0.08)] flex flex-col hover:border-emerald-400/40 hover:-translate-y-0.5 transition-all min-h-[190px]">
          <div className="flex justify-between items-start mb-5 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/12 flex items-center justify-center border border-emerald-500/25 shadow-[0_0_30px_rgba(16,185,129,0.12)] shrink-0">
                <span className="material-symbols-outlined text-emerald-400 text-[22px]">description</span>
              </div>
              <span className="text-[#a3aac4] text-[11px] font-bold tracking-[0.18em] uppercase leading-tight">Cotizaciones Pendientes</span>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#a3aac4]">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              Estimado
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl md:text-5xl font-extrabold text-white tracking-[-0.04em] leading-none">{pendingQuotes}</span>
            <span className="text-[#a3aac4] text-sm">pendientes</span>
          </div>
          <span className="text-[#7f8ba8] text-sm mt-3">Pendientes por revisar</span>
        </div>
      </section>

      {/* Table Section */}
      <section className="bg-[#0a1122] border border-[#1a233a] rounded-[28px] shadow-xl flex flex-col overflow-hidden">
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar proyecto..." 
                className="w-full bg-[#060e20] border border-[#1a233a] text-sm text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-[#99f7ff]/50 transition-colors placeholder:text-[#40485d]"
              />
            </div>
            <button
              onClick={nextFilter}
              title={`Filtro actual: ${statusFilter}`}
              className="w-auto min-w-10 h-10 shrink-0 rounded-lg bg-[#060e20] border border-[#1a233a] px-3 flex items-center justify-center gap-2 text-[#a3aac4] hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">filter_list</span>
              <span className="hidden md:inline text-xs font-semibold">{statusFilter}</span>
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
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined text-[#1a233a] text-6xl mb-4">folder_open</span>
                    <h3 className="text-[#dee5ff] font-bold mb-2">No hay resultados</h3>
                    <p className="text-[#a3aac4] text-sm">Probá con otra búsqueda o cambiá el filtro de estado.</p>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((proj) => (
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
                        {formatCurrency(proj.total || 0)}
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
