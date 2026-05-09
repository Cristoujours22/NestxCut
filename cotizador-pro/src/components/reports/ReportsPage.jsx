import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function SectionCard({ title, icon, children }) {
  return (
    <section className="bg-[#0a1122] border border-[#1a233a] rounded-[28px] shadow-xl overflow-hidden">
      <div className="p-6 border-b border-[#1a233a] flex items-center gap-3">
        <span className="material-symbols-outlined text-[#99f7ff]">{icon}</span>
        <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export default function ReportsPage() {
  const API = window.electronAPI;
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          API?.getProjects ? API.getProjects(user?.uid) : [],
          API?.getInventoryItems ? API.getInventoryItems() : [],
          API?.getInventoryMovements ? API.getInventoryMovements() : [],
          API?.getInventoryPurchases ? API.getInventoryPurchases() : [],
        ]);

        setProjects(results[0].status === 'fulfilled' ? results[0].value || [] : []);
        setItems(results[1].status === 'fulfilled' ? results[1].value || [] : []);
        setMovements(results[2].status === 'fulfilled' ? results[2].value || [] : []);
        setPurchases(results[3].status === 'fulfilled' ? results[3].value || [] : []);
      } catch (error) {
        console.error('Error loading reports:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.uid]);

  const commercialMetrics = useMemo(() => {
    const now = new Date();
    const facturadas = projects.filter((project) => project.state === 'FACTURADA');
    const aprobadas = projects.filter((project) => project.state === 'ACEPTADA');
    const pendientes = projects.filter((project) => ['EDICION', 'COTIZACION', 'FACTURACION'].includes(project.state));
    const rechazadas = projects.filter((project) => project.state === 'RECHAZADA');

    const ventasMes = facturadas.reduce((acc, project) => {
      const date = new Date(project.updated_at || project.created_at);
      if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return acc;
      return acc + Number(project.total || 0);
    }, 0);

    return {
      ventasMes,
      facturadas: facturadas.length,
      aprobadas: aprobadas.length,
      pendientes: pendientes.length,
      rechazadas: rechazadas.length,
    };
  }, [projects]);

  const operationalMetrics = useMemo(() => {
    const reservados = items.filter((item) => Number(item.cantidad_reservada || 0) > 0);
    const criticos = items.filter((item) => {
      const real = Number(item.cantidad_disponible || 0) - Number(item.cantidad_reservada || 0);
      return real <= Number(item.stock_minimo || 0);
    });
    const comprasPendientes = purchases.filter((purchase) => purchase.status !== 'recibida');
    const recentMovements = movements.slice(0, 10);

    return {
      reservados,
      criticos,
      comprasPendientes,
      recentMovements,
    };
  }, [items, purchases, movements]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060e20] text-[#dee5ff] p-6 md:p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#00e0fe]">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <span className="font-bold">Cargando reportes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060e20] text-[#dee5ff] p-6 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0f1930] via-[#16233f] to-[#1a233a] border border-[#40485d]/30 px-7 py-8 md:px-9 md:py-10 shadow-[0_20px_60px_rgba(3,8,20,0.35)]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00e0fe]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#99f7ff]/15 bg-[#99f7ff]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#99f7ff] mb-5">
                <span className="w-2 h-2 rounded-full bg-[#00e0fe] shadow-[0_0_12px_#00e0fe]"></span>
                Reportes vivos
              </div>
              <h1 className="font-['Space_Grotesk'] text-[42px] leading-[0.95] sm:text-5xl md:text-6xl font-bold text-white mb-5 tracking-[-0.04em]">
                Reportes
              </h1>
              <p className="text-[#a9b6d3] text-[14px] md:text-[15px] leading-7 max-w-[760px]">
                Vista mixta: métricas comerciales de tus proyectos y métricas operativas globales de la empresa sobre inventario, compras, reservas y movimientos.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-300"></span>
                  Comercial = solo tus proyectos
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-300"></span>
                  Operativo = datos compartidos
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-[#0a1122] border border-[#1a233a] rounded-[24px] p-6 shadow-xl">
            <div className="text-[#a3aac4] text-[11px] font-bold tracking-[0.18em] uppercase mb-2">Ventas del mes</div>
            <div className="text-3xl font-extrabold text-white tracking-[-0.04em]">{formatCurrency(commercialMetrics.ventasMes)}</div>
          </div>
          <div className="bg-[#0a1122] border border-[#1a233a] rounded-[24px] p-6 shadow-xl">
            <div className="text-[#a3aac4] text-[11px] font-bold tracking-[0.18em] uppercase mb-2">Facturadas</div>
            <div className="text-3xl font-extrabold text-cyan-300 tracking-[-0.04em]">{commercialMetrics.facturadas}</div>
          </div>
          <div className="bg-[#0a1122] border border-[#1a233a] rounded-[24px] p-6 shadow-xl">
            <div className="text-[#a3aac4] text-[11px] font-bold tracking-[0.18em] uppercase mb-2">Pendientes</div>
            <div className="text-3xl font-extrabold text-blue-300 tracking-[-0.04em]">{commercialMetrics.pendientes}</div>
          </div>
          <div className="bg-[#0a1122] border border-[#1a233a] rounded-[24px] p-6 shadow-xl">
            <div className="text-[#a3aac4] text-[11px] font-bold tracking-[0.18em] uppercase mb-2">Rechazadas</div>
            <div className="text-3xl font-extrabold text-red-300 tracking-[-0.04em]">{commercialMetrics.rechazadas}</div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionCard title="Estado comercial" icon="analytics">
            <div className="mb-4 text-xs uppercase tracking-[0.18em] font-semibold text-cyan-300">Solo tus proyectos</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                <div className="text-[#a3aac4] text-xs uppercase tracking-widest font-bold">Aprobadas</div>
                <div className="text-2xl font-bold text-emerald-300 mt-2">{commercialMetrics.aprobadas}</div>
              </div>
              <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                <div className="text-[#a3aac4] text-xs uppercase tracking-widest font-bold">Facturadas</div>
                <div className="text-2xl font-bold text-cyan-300 mt-2">{commercialMetrics.facturadas}</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Operación de inventario" icon="inventory_2">
            <div className="mb-4 text-xs uppercase tracking-[0.18em] font-semibold text-amber-300">Datos globales compartidos</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                <div className="text-[#a3aac4] text-xs uppercase tracking-widest font-bold">Items reservados</div>
                <div className="text-2xl font-bold text-amber-300 mt-2">{operationalMetrics.reservados.length}</div>
              </div>
              <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                <div className="text-[#a3aac4] text-xs uppercase tracking-widest font-bold">Items críticos</div>
                <div className="text-2xl font-bold text-red-300 mt-2">{operationalMetrics.criticos.length}</div>
              </div>
            </div>
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionCard title="Compras pendientes" icon="shopping_cart">
            <div className="mb-4 text-xs uppercase tracking-[0.18em] font-semibold text-amber-300">Datos globales compartidos</div>
            <div className="space-y-3">
              {operationalMetrics.comprasPendientes.length === 0 ? (
                <div className="text-[#6f7a97]">No hay compras pendientes.</div>
              ) : operationalMetrics.comprasPendientes.map((purchase) => (
                <div key={purchase.id} className="rounded-2xl border border-[#1a233a] bg-[#060e20] px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[#dee5ff] font-semibold">{purchase.id}</div>
                    <div className="text-[#6f7a97] text-sm">{purchase.proveedor_nombre} · {purchase.items?.length || 0} ítems</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#dee5ff] font-bold">{formatCurrency(purchase.total)}</div>
                    <div className="text-amber-300 text-xs uppercase tracking-widest">{purchase.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Movimientos recientes" icon="swap_horiz">
            <div className="mb-4 text-xs uppercase tracking-[0.18em] font-semibold text-amber-300">Datos globales compartidos</div>
            <div className="space-y-3">
              {operationalMetrics.recentMovements.length === 0 ? (
                <div className="text-[#6f7a97]">No hay movimientos recientes.</div>
              ) : operationalMetrics.recentMovements.map((movement) => (
                <div key={movement.id} className="rounded-2xl border border-[#1a233a] bg-[#060e20] px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[#dee5ff] font-semibold">{movement.item_name_snapshot || 'Item'}</div>
                    <div className="text-[#6f7a97] text-sm">{movement.movement_type} · {movement.reason || movement.motivo || 'sin motivo'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#dee5ff] font-bold">{movement.cantidad}</div>
                    <div className="text-[#6f7a97] text-xs">{new Date(movement.created_at).toLocaleDateString('es-CO')}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>
      </div>
    </div>
  );
}
