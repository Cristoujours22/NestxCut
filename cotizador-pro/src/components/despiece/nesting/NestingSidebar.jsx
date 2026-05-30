import React from 'react';
import { Settings2, Maximize, RotateCw } from 'lucide-react';

export default function NestingSidebar({ config, onChange, totalParts, statsComponent }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onChange({ [name]: type === 'checkbox' ? checked : Number(value) });
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a]/90 text-slate-300">
      <div className="p-5 border-b border-slate-800">
        <h2 className="text-sm font-bold uppercase tracking-widest text-teal-500 mb-1 flex items-center gap-2">
          <Settings2 size={16} /> Configuración
        </h2>
        <p className="text-xs text-slate-500">Parámetros del motor de corte</p>
      </div>

      <div className="p-5 space-y-6 flex-1 overflow-y-auto">
        {/* Dimensiones Lámina */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Maximize size={14} /> Dimensiones de Lámina
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Largo (mm)</label>
              <input 
                type="number" 
                name="boardWidth"
                value={config.boardWidth}
                onChange={handleChange}
                className="w-full bg-[#0B1121] border border-slate-700/50 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Ancho (mm)</label>
              <input 
                type="number" 
                name="boardHeight"
                value={config.boardHeight}
                onChange={handleChange}
                className="w-full bg-[#0B1121] border border-slate-700/50 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-800/50 w-full" />

        {/* Corte y Margen */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="10" y1="9" x2="9" y2="9"/></svg>
            Espesor de Disco
          </h3>
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Kerf (mm)</label>
            <input 
              type="number" 
              name="kerf"
              value={config.kerf}
              onChange={handleChange}
              min="0"
              max="20"
              className="w-full bg-[#0B1121] border border-slate-700/50 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Refilado X,Y (mm)</label>
            <input 
              type="number" 
              name="margin"
              value={config.margin}
              onChange={handleChange}
              min="0"
              max="100"
              className="w-full bg-[#0B1121] border border-slate-700/50 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-500 transition-colors"
            />
          </div>
        </div>

        <div className="h-px bg-slate-800/50 w-full" />

        {/* Opciones de Piezas */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <RotateCw size={14} /> Opciones de Piezas
          </h3>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                name="allowGlobalRotation"
                checked={config.allowGlobalRotation}
                onChange={handleChange}
                className="peer sr-only"
              />
              <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-teal-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-300 group-hover:text-teal-400 transition-colors">Permitir Rotación Global</div>
              <div className="text-[10px] text-slate-500">Ignora el estado individual y prueba rotar.</div>
            </div>
          </label>
        </div>

        {statsComponent && (
          <>
            <div className="h-px bg-slate-800/50 w-full my-6" />
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Resultados de Optimización
              </h3>
              {statsComponent}
            </div>
          </>
        )}

      </div>

      <div className="p-5 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Piezas</span>
          <span className="text-lg font-bold text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-md border border-cyan-400/20">{totalParts}</span>
        </div>
      </div>
    </div>
  );
}
