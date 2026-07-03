import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ onOpenNewProject, onOpenFeedback, collapsed = false, onToggleCollapsed }) {
  const { user } = useAuth();
  const location = useLocation();
  const [companyName, setCompanyName] = useState('Workshop Alpha');

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
      </div>
    </aside>
  );
}
