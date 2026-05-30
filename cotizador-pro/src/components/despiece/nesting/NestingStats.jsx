import React from 'react';
import { PieChart, Zap, Scissors, AlertCircle } from 'lucide-react';

export default function NestingStats({ sheets, unplacedCount, boardWidth, boardHeight, layout = 'horizontal' }) {
  const totalSheets = sheets.length;
  
  let totalArea = 0;
  let usedArea = 0;
  let totalCutLength = 0;

  sheets.forEach(sheet => {
    totalArea += (boardWidth * boardHeight);
    sheet.pieces.forEach(p => {
      usedArea += (p.width * p.height);
    });
    totalCutLength += sheet.cutLength || 0;
  });

  const globalYield = totalArea > 0 ? (usedArea / totalArea) * 100 : 0;
  const globalWaste = totalArea - usedArea;
  
  // Format to square meters for display
  const usedAreaM2 = (usedArea / 1000000).toFixed(2);
  const wasteAreaM2 = (globalWaste / 1000000).toFixed(2);
  const cutLengthM = (totalCutLength / 1000).toFixed(1);

  const isVertical = layout === 'vertical';

  return (
    <div className={isVertical ? "flex flex-col gap-4" : "grid grid-cols-1 md:grid-cols-4 gap-4"}>
      
      {/* Placas Usadas */}
      <div className={`bg-slate-800/40 border border-slate-700/50 rounded-xl relative overflow-hidden group hover:bg-slate-800/60 transition-colors ${isVertical ? 'p-3' : 'p-4'}`}>
        <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <PieChart size={18} />
          </div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tableros Usados</h3>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-indigo-300">{totalSheets}</span>
          <span className="text-xs text-slate-500">uds</span>
        </div>
      </div>

      {/* Aprovechamiento Global */}
      <div className={`bg-slate-800/40 border border-slate-700/50 rounded-xl relative overflow-hidden group hover:bg-slate-800/60 transition-colors ${isVertical ? 'p-3' : 'p-4'}`}>
        <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Zap size={100} />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-teal-500/20 text-teal-400 rounded-lg">
            <Zap size={18} />
          </div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aprovechamiento</h3>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-teal-300">{globalYield.toFixed(1)}%</span>
          <span className="text-xs text-slate-500">global</span>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full" 
            style={{ width: `${globalYield}%` }} 
          />
        </div>
      </div>

      {/* Area Desperdicio */}
      <div className={`bg-slate-800/40 border border-slate-700/50 rounded-xl relative overflow-hidden group hover:bg-slate-800/60 transition-colors ${isVertical ? 'p-3' : 'p-4'}`}>
        <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <AlertCircle size={100} />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
            <AlertCircle size={18} />
          </div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Desperdicio</h3>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-rose-300">{wasteAreaM2}</span>
          <span className="text-xs text-slate-500">m²</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-500">
          vs {usedAreaM2} m² útiles
        </div>
      </div>

      {/* Longitud de Corte */}
      <div className={`bg-slate-800/40 border border-slate-700/50 rounded-xl relative overflow-hidden group hover:bg-slate-800/60 transition-colors ${isVertical ? 'p-3' : 'p-4'}`}>
        <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Scissors size={100} />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
            <Scissors size={18} />
          </div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cortes Est.</h3>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-amber-300">{cutLengthM}</span>
          <span className="text-xs text-slate-500">metros</span>
        </div>
      </div>

    </div>
  );
}
