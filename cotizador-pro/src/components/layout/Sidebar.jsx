import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ onOpenNewProject }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: 'Home', icon: 'home', path: '/dashboard' },
    { name: 'Despiece', icon: 'architecture', path: '/despiece' },
    { name: 'Cotización', icon: 'request_quote', path: '/cotizacion' },
    { name: 'Inventario', icon: 'inventory_2', path: '/inventario' },
    { name: 'Configuración', icon: 'settings', path: '/settings' },
  ];

  return (
    <aside className="w-64 h-full bg-[#060e20] border-r border-[#1a233a] flex flex-col shrink-0">
      {/* User Info Header */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1a233a] to-[#0f1930] flex items-center justify-center border border-[#40485d]/30 shrink-0">
            <span className="material-symbols-outlined text-[#99f7ff]">person</span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[#dee5ff] font-bold text-sm truncate">{user?.username || 'Workshop Alpha'}</span>
            <span className="text-[#a3aac4] text-xs font-medium truncate">Carpintero Maestro</span>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path) || (item.path === '/dashboard' && location.pathname === '/');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm border border-transparent ${
                  isActive 
                    ? 'bg-[#1a233a]/60 text-[#99f7ff] border-[#99f7ff]/20 shadow-[inset_2px_0_0_#99f7ff]' 
                    : 'text-[#a3aac4] hover:bg-[#1a233a]/30 hover:text-[#dee5ff]'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-[#99f7ff]' : 'text-[#a3aac4]'}`}>
                  {item.icon}
                </span>
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Primary Action Button (Bottom) */}
      <div className="mt-auto p-6">
        <button 
          onClick={onOpenNewProject}
          className="w-full bg-[#00e0fe] text-[#002f33] py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#99f7ff] transition-colors shadow-[0_4px_15px_rgba(0,224,254,0.2)] hover:shadow-[0_6px_20px_rgba(0,224,254,0.3)] hover:-translate-y-0.5 active:translate-y-0"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          Nuevo Proyecto
        </button>
      </div>
    </aside>
  );
}
