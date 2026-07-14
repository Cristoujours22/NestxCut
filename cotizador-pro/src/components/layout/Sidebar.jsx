import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import pkg from '../../../package.json' with { type: 'json' };
import { changelog, upcoming } from '../../data/changelog';

export default function Sidebar({ onOpenNewProject, onOpenFeedback, collapsed = false, onToggleCollapsed }) {
  const { user } = useAuth();
  const location = useLocation();
  const [companyName, setCompanyName] = useState('Workshop Alpha');
  const [showChangelog, setShowChangelog] = useState(false);
  const appVersion = pkg.version;

  useEffect(() => {
    const loadCompany = async () => {
      try {
        if (window.electronAPI?.getCompanySettings) {
          const settings = await window.electronAPI.getCompanySettings();
          setCompanyName(settings?.company_name || 'Workshop Alpha');
        }
      } catch (error) {
        console.error('Error loading company settings in sidebar:', error);
      }
    };

    loadCompany();
  }, []);

  const menuItems = [
    { name: 'Home', icon: 'home', path: '/dashboard' },
    { name: 'Reportes', icon: 'analytics', path: '/reportes' },
    { name: 'Inventario', icon: 'inventory_2', path: '/inventario' },
    { name: 'Puertas', icon: 'door_front', path: '/puertas' },
    { name: 'Configuración', icon: 'settings', path: '/settings' },
  ];

  return (
    <aside className={`${collapsed ? 'w-[84px]' : 'w-64'} h-full bg-[#060e20] border-r border-[#1a233a] flex flex-col shrink-0 transition-[width] duration-200`}>
      {/* User Info Header */}
      <div className={`${collapsed ? 'p-4' : 'p-6'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3 mb-8`}>
          {!collapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1a233a] to-[#0f1930] flex items-center justify-center border border-[#40485d]/30 shrink-0">
                <span className="material-symbols-outlined text-[#99f7ff]">person</span>
              </div>
              <div className="flex flex-col overflow-hidden min-w-0">
                <span className="text-[#dee5ff] font-bold text-sm truncate">{companyName}</span>
                <span className="text-[#a3aac4] text-xs font-medium truncate">{user?.username || 'Carpintero Maestro'}</span>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1a233a] to-[#0f1930] flex items-center justify-center border border-[#40485d]/30 shrink-0">
              <span className="material-symbols-outlined text-[#99f7ff]">person</span>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleCollapsed}
            className="w-9 h-9 rounded-lg border border-[#40485d]/30 bg-[#10182d] text-[#a3aac4] hover:text-[#99f7ff] hover:bg-[#15213b] inline-flex items-center justify-center transition-colors shrink-0"
            title={collapsed ? 'Expandir menú' : 'Plegar menú'}
          >
            <span className={`material-symbols-outlined text-[18px] transition-transform ${collapsed ? 'rotate-180' : ''}`}>left_panel_close</span>
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path) || (item.path === '/dashboard' && location.pathname === '/');
            const itemClasses = `flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl transition-all font-medium text-sm border border-transparent ${
              item.disabled
                ? 'text-[#5a647f] bg-transparent cursor-not-allowed opacity-60'
                : isActive 
                  ? 'bg-[#1a233a]/60 text-[#99f7ff] border-[#99f7ff]/20 shadow-[inset_2px_0_0_#99f7ff]' 
                  : 'text-[#a3aac4] hover:bg-[#1a233a]/30 hover:text-[#dee5ff]'
            }`;

            const iconClasses = `material-symbols-outlined text-[20px] ${
              item.disabled ? 'text-[#5a647f]' : isActive ? 'text-[#99f7ff]' : 'text-[#a3aac4]'
            }`;

            if (item.disabled) {
              return (
                <div
                  key={item.path}
                  title={collapsed ? `${item.name} (próximamente)` : 'Próximamente'}
                  aria-disabled="true"
                  className={itemClasses}
                >
                  <span className={iconClasses}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span>{item.name}</span>
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-[#5a647f]">Pronto</span>
                    </>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={collapsed ? item.name : undefined}
                className={itemClasses}
              >
                <span className={iconClasses}>
                  {item.icon}
                </span>
                {!collapsed && item.name}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Primary Action Button (Bottom) */}
      <div className={`${collapsed ? 'mt-auto p-4' : 'mt-auto p-6 space-y-3'}`}>
        <button 
          onClick={onOpenNewProject}
          title={collapsed ? 'Nuevo Proyecto' : undefined}
          className={`w-full bg-[#00e0fe] text-[#002f33] ${collapsed ? 'py-3 px-0' : 'py-3 px-4'} rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#99f7ff] transition-colors shadow-[0_4px_15px_rgba(0,224,254,0.2)] hover:shadow-[0_6px_20px_rgba(0,224,254,0.3)] hover:-translate-y-0.5 active:translate-y-0`}
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          {!collapsed && 'Nuevo Proyecto'}
        </button>

        <button 
          onClick={onOpenFeedback}
          title={collapsed ? 'Enviar sugerencia' : undefined}
          className={`w-full border border-[#40485d]/30 text-[#a3aac4] ${collapsed ? 'py-3 px-0' : 'py-2.5 px-4'} rounded-xl font-medium flex items-center justify-center gap-2 hover:border-[#99f7ff]/30 hover:text-[#dee5ff] transition-colors`}
        >
          <span className="material-symbols-outlined text-[18px]">lightbulb</span>
          {!collapsed && 'Enviar sugerencia'}
        </button>

        {/* Version button */}
        <div className={`${collapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={() => setShowChangelog(true)}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium text-[#7a84a4] hover:text-[#99f7ff] hover:bg-[#1a233a]/40 transition-all duration-300 flex items-center justify-center gap-2"
            title={collapsed ? `v${appVersion} — Ver changelog` : undefined}
          >
            <span className="material-symbols-outlined text-[14px]">info</span>
            {!collapsed && <span>v{appVersion}</span>}
          </button>
        </div>
      </div>

      {/* Changelog / Updates Modal */}
      {showChangelog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowChangelog(false)}>
          <div className="bg-[#0d1528] border border-[#1a233a] rounded-2xl max-w-lg w-full max-h-[75vh] overflow-y-auto shadow-2xl shadow-[#00e0fe]/5" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-[#0d1528] z-10 flex items-center justify-between p-5 border-b border-[#1a233a]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00e0fe]/20 to-[#004466]/20 flex items-center justify-center border border-[#00e0fe]/20">
                  <span className="material-symbols-outlined text-[#00e0fe] text-xl">diamond</span>
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">v{appVersion}</h2>
                  <p className="text-[#7a84a4] text-xs">NestxCut</p>
                </div>
              </div>
              <button 
                onClick={() => setShowChangelog(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5a647f] hover:text-white hover:bg-[#1a233a] transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-6">
              {/* Changelog */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#99f7ff] mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">history</span>
                  Changelog
                </h3>
                <div className="space-y-3">
                  {changelog.map((entry) => (
                    <div key={entry.version} className="bg-[#1a233a]/50 rounded-xl p-4 border border-[#1a233a]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#99f7ff] font-bold text-sm">v{entry.version}</span>
                        <span className="text-[#5a647f] text-xs">{entry.date}</span>
                      </div>
                      <ul className="space-y-1.5 text-[#a3aac4] text-sm">
                        {entry.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-400 mt-0.5 text-xs shrink-0">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              {/* Próximamente */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#99f7ff] mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">rocket_launch</span>
                  Próximamente
                </h3>
                <div className="bg-[#1a233a]/30 rounded-xl p-4 border border-[#1a233a] border-dashed">
                  <ul className="space-y-2.5 text-[#a3aac4] text-sm">
                    {upcoming.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-amber-400 text-base shrink-0">auto_awesome</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
