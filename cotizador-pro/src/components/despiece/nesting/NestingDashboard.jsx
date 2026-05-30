import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Play, Layout, Grid, Maximize } from 'lucide-react';
import { createPortal } from 'react-dom';
import NestingSidebar from './NestingSidebar';
import NestingStats from './NestingStats';
import NestingSheetPreview from './NestingSheetPreview';
import { buildNestingPreview } from '../../../features/despiece/utils/nestingLayout';

export default function NestingDashboard({
  onClose,
  despieceData,
  boardDimensions
}) {
  const [config, setConfig] = useState({
    boardWidth: boardDimensions?.width || 2440,
    boardHeight: boardDimensions?.height || 2150,
    kerf: 5,
    margin: 20,
    allowGlobalRotation: false
  });

  const [optimizedSheets, setOptimizedSheets] = useState([]);
  const [unplacedParts, setUnplacedParts] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'detail'

  // We extract the rows from despieceData.
  const rows = useMemo(() => {
    return Array.isArray(despieceData?.filas) ? despieceData.filas : 
           Array.isArray(despieceData?.items) ? despieceData.items : 
           Array.isArray(despieceData) ? despieceData : [];
  }, [despieceData]);

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      try {
        const result = buildNestingPreview({
          rows,
          boardWidth: config.boardWidth,
          boardHeight: config.boardHeight,
          kerf: config.kerf,
          margin: config.margin,
          allowGlobalRotation: config.allowGlobalRotation
        });
        setOptimizedSheets(result.sheets || []);
        setUnplacedParts(result.unplaced || []);
      } catch (err) {
        console.error("Optimizer error:", err);
      } finally {
        setIsRunning(false);
      }
    }, 100);
  };

  useEffect(() => {
    if (rows.length > 0) {
      handleRun();
    }
  }, [rows]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#0B1121] text-slate-200 font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="h-14 flex-shrink-0 bg-[#0f172a] border-b border-slate-800 flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
            title="Volver al Despiece"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Layout className="text-teal-400" size={20} />
            <h1 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">
              Optimización de Láminas
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {optimizedSheets.length > 0 && (
            <div className="flex items-center bg-slate-800/80 p-1 rounded-md border border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-slate-700 text-teal-400 shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                title="Vista Resumen (Cuadrícula)"
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('detail')}
                className={`p-1.5 rounded flex items-center justify-center transition-colors ${viewMode === 'detail' ? 'bg-slate-700 text-teal-400 shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                title="Vista Detallada (Ampliada)"
              >
                <Maximize size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-md border border-slate-700/50">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Algoritmo</span>
            <span className="text-sm text-amber-400 font-bold">Guillotina</span>
          </div>
          <button
            onClick={handleRun}
            disabled={isRunning || rows.length === 0}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-bold transition-all
              ${isRunning 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-teal-500 hover:bg-teal-400 text-slate-900 shadow-[0_0_15px_rgba(20,184,166,0.3)]'
              }`}
          >
            {isRunning ? (
              <span className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
            {isRunning ? 'Optimizando...' : 'Re-calcular'}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR CONFIGURATION */}
        <div className="w-80 flex-shrink-0 bg-[#0f172a]/80 border-r border-slate-800 overflow-y-auto">
          <NestingSidebar 
            config={config} 
            onChange={(newConfig) => setConfig({ ...config, ...newConfig })}
            totalParts={rows.reduce((sum, row) => sum + Math.max(0, Number(row?.cantidad || row?.cant || 0)), 0)}
            statsComponent={optimizedSheets.length > 0 ? (
              <NestingStats 
                sheets={optimizedSheets} 
                unplacedCount={unplacedParts.length}
                boardWidth={config.boardWidth}
                boardHeight={config.boardHeight}
                layout="vertical"
              />
            ) : null}
          />
        </div>

        {/* DASHBOARD AND PREVIEWS */}
        <div className="flex-1 overflow-y-auto p-2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1121] to-[#0B1121]">
          <div className="w-full max-w-full px-2 mx-auto space-y-4 pb-10">
            
            {/* ERROR ALERTS */}
            {unplacedParts.length > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex flex-col gap-2">
                <h3 className="text-rose-400 font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  Piezas no posicionadas ({unplacedParts.length})
                </h3>
                <p className="text-xs text-rose-300/80">
                  Algunas piezas exceden el tamaño de la lámina o no lograron acomodarse. Revisa las dimensiones de las piezas listadas a continuación o cambia la rotación.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {unplacedParts.map((p, i) => (
                    <div key={i} className="text-[10px] bg-rose-500/20 text-rose-200 px-2 py-1 rounded border border-rose-500/30">
                      {p.label || p.ref} ({p.width} × {p.height})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PREVIEW SVG CANVAS */}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 2xl:grid-cols-2 gap-4" : "flex flex-col gap-6"}>
              {optimizedSheets.map((sheet, index) => (
                <NestingSheetPreview
                  key={sheet.id || index}
                  sheet={sheet}
                  boardWidth={config.boardWidth}
                  boardHeight={config.boardHeight}
                  compact={viewMode === 'grid'}
                />
              ))}
            </div>

            {/* EMPTY STATE */}
            {!isRunning && optimizedSheets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Layout size={64} className="mb-4 opacity-20" />
                <p className="text-lg">No hay datos de despiece para optimizar.</p>
                <p className="text-sm mt-2 opacity-60">Agrega piezas en la tabla de Despiece.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
