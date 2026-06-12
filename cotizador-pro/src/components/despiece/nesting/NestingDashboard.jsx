import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { ArrowLeft, Play, Layout, Grid, Maximize, FileDown } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import NestingSidebar from './NestingSidebar';
import NestingStats from './NestingStats';
import NestingSheetPreview from './NestingSheetPreview';
import NestingExportSheet from './NestingExportSheet';
import { buildNestingPreview } from '../../../features/despiece/utils/nestingLayout';
import { generateNestingPDF } from '../../../features/despiece/utils/pdfExport';

export default function NestingDashboard({
  onClose,
  despieceData,
  boardDimensions,
  onOptimizationChange,
  projectName = 'Proyecto sin título',
  clientName = 'Cliente sin nombre',
  materialName = '',
}) {
  const [config, setConfig] = useState({
    boardWidth: boardDimensions?.width || 2440,
    boardHeight: boardDimensions?.height || 2150,
    kerf: 5,
    refiladoX: 20,
    refiladoY: 20,
    allowGlobalRotation: false,
    algorithm: 'guillotine'
  });

  const [optimizedSheets, setOptimizedSheets] = useState([]);
  const [unplacedParts, setUnplacedParts] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'detail'

  // We extract the rows from despieceData.
  const rows = useMemo(() => {
    return Array.isArray(despieceData?.filas) ? despieceData.filas : 
           Array.isArray(despieceData?.items) ? despieceData.items : 
           Array.isArray(despieceData) ? despieceData : [];
  }, [despieceData]);

  const runTimerRef = useRef(null);
  const exportInFlightRef = useRef(false);
  const rowsRef = useRef(rows);
  const onOptimizationChangeRef = useRef(onOptimizationChange);

  const rowContentKey = useMemo(
    () => rows.map((row) => [
      row?.cantidad ?? row?.cant ?? '',
      row?.largo ?? '',
      row?.ancho ?? '',
      row?.ref ?? '',
      row?.detalle ?? '',
      row?.rotar ?? '',
    ].join('|')).join('||'),
    [rows]
  );

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    onOptimizationChangeRef.current = onOptimizationChange;
  }, [onOptimizationChange]);

  const handleRun = useCallback(() => {
    if (runTimerRef.current) clearTimeout(runTimerRef.current);
    setIsRunning(true);
    const timer = setTimeout(() => {
      try {
        const result = buildNestingPreview({
          rows: rowsRef.current,
          boardWidth: config.boardWidth,
          boardHeight: config.boardHeight,
          kerf: config.kerf,
          refiladoX: config.refiladoX,
          refiladoY: config.refiladoY,
          allowGlobalRotation: config.allowGlobalRotation,
          algorithm: config.algorithm || 'guillotine'
        });
        setOptimizedSheets(result.sheets || []);
        setUnplacedParts(result.unplaced || []);
        onOptimizationChangeRef.current?.({
          sheetCount: result.sheets?.length ?? 0,
          unplacedCount: result.unplaced?.length ?? 0,
          config: {
            boardWidth: config.boardWidth,
            boardHeight: config.boardHeight,
            kerf: config.kerf,
            refiladoX: config.refiladoX,
            refiladoY: config.refiladoY,
            allowGlobalRotation: config.allowGlobalRotation,
            algorithm: config.algorithm,
          },
        });
      } catch (err) {
        console.error("Optimizer error:", err);
      } finally {
        setIsRunning(false);
        runTimerRef.current = null;
      }
    }, 100);
    runTimerRef.current = timer;
  }, [
    config.boardWidth,
    config.boardHeight,
    config.kerf,
    config.refiladoX,
    config.refiladoY,
    config.allowGlobalRotation,
    config.algorithm,
  ]);

  useEffect(() => {
    return () => { if (runTimerRef.current) clearTimeout(runTimerRef.current); };
  }, []);

  const handleExportPDF = useCallback(async () => {
    if (!optimizedSheets.length || isExporting || exportInFlightRef.current) return;
    try {
      exportInFlightRef.current = true;
      setIsExporting(true);

      // Dedicated technical export: render offscreen, capture, dispose
      // No live preview dependency, no clone patching, no string-replacement skin hacks
      const sheetImages = {};
      const sheetImageCache = new Map();
      const offscreenRoot = document.createElement('div');
      offscreenRoot.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:800px;height:600px;overflow:hidden;';
      document.body.appendChild(offscreenRoot);
      const reactRoot = createRoot(offscreenRoot);

      try {
        for (const sheet of optimizedSheets) {
          const sheetSignature = JSON.stringify({
            boardWidth: config.boardWidth,
            boardHeight: config.boardHeight,
            refiladoX: config.refiladoX,
            refiladoY: config.refiladoY,
            pieces: (sheet.pieces || []).map((piece) => ({
              ref: piece.ref,
              x: piece.x,
              y: piece.y,
              width: piece.width,
              height: piece.height,
              rotated: piece.rotated,
              originalRowIndex: piece.originalRowIndex,
            })),
            freeRects: (sheet.freeRects || []).map((rect) => ({
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            })),
          });

          if (sheetImageCache.has(sheetSignature)) {
            sheetImages[sheet.index] = sheetImageCache.get(sheetSignature);
            continue;
          }

          // Render the dedicated technical export sheet
          await new Promise(resolve => {
            reactRoot.render(
              <NestingExportSheet
                sheet={sheet}
                boardWidth={config.boardWidth}
                boardHeight={config.boardHeight}
                refiladoX={config.refiladoX}
                refiladoY={config.refiladoY}
                rows={rows}
                cantos={despieceData?.cantos || []}
              />
            );
            // Wait for React to paint
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          });

          // Capture only the rendered board node
          const exportNode = offscreenRoot.querySelector('[data-export-canvas]');
          if (!exportNode) {
            throw new Error(`No se encontró el nodo de captura exportable para la lámina ${sheet.index}.`);
          }
          const rect = exportNode.getBoundingClientRect();
          const dataUrl = await toJpeg(exportNode, {
            quality: 0.92,
            backgroundColor: '#ffffff',
            pixelRatio: 1.5,
            skipFonts: true,
          });
          if (!dataUrl) {
            throw new Error(`No se pudo capturar la lámina ${sheet.index}.`);
          }

          const capturedSheet = {
            data: dataUrl,
            width: rect.width,
            height: rect.height,
          };
          sheetImages[sheet.index] = capturedSheet;
          sheetImageCache.set(sheetSignature, capturedSheet);
        }
      } finally {
        reactRoot.unmount();
        document.body.removeChild(offscreenRoot);
      }

      const doc = await generateNestingPDF({
        sheets: optimizedSheets,
        sheetImages,
        unplacedPieces: unplacedParts,
        projectName,
        clientName,
        materialName,
        paperSize: 'Carta',
        boardWidth: config.boardWidth,
        boardHeight: config.boardHeight,
        usableWidth: config.boardWidth - config.refiladoX,
        usableHeight: config.boardHeight - config.refiladoY,
        cantos: despieceData?.cantos || [],
        rows,
      });
      doc.save(`PlanoCorte_${projectName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Error al exportar PDF: ' + err.message);
    } finally {
      exportInFlightRef.current = false;
      setIsExporting(false);
    }
  }, [optimizedSheets, unplacedParts, projectName, clientName, materialName, config, despieceData, rows, isExporting]);

  useEffect(() => {
    if (rows.length > 0) {
      handleRun();
    }
  }, [
    rowContentKey,
    handleRun,
  ]);

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

          {optimizedSheets.length > 0 && (
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 transition-all shadow-[0_0_10px_rgba(245,158,11,0.25)]"
              title="Exportar a plano de corte"
            >
              <FileDown size={16} />
              {isExporting ? 'Exportando…' : 'Exportar a plano de corte'}
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-md border border-slate-700/50">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Algoritmo</span>
              <span className="text-sm text-amber-400 font-bold">
                {config.algorithm === 'hybrid' ? 'Híbrido' : config.algorithm === 'maxrects' ? 'MaxRects' : 'Guillotina'}
              </span>
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
            {isRunning ? 'Optimizando...' : 'Recalcular'}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR CONFIGURATION */}
        <div className="w-80 flex-shrink-0 bg-[#0f172a]/80 border-r border-slate-800 overflow-y-auto">
          <NestingSidebar 
            config={config} 
            onChange={(newConfig) => setConfig((prev) => ({
              ...prev,
              ...(typeof newConfig === 'function' ? newConfig(prev) : newConfig || {})
            }))}
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
            
            {/* CONFIG SUMMARY BAR */}
            <div className="flex items-center gap-3 text-[11px] bg-slate-800/40 border border-slate-700/50 rounded-lg px-4 py-2 mb-2">
              <span className="font-bold text-slate-400 uppercase tracking-widest">Config</span>
              <span className="text-slate-400">Lámina:</span>
              <span className="text-white font-mono font-bold">{config.boardWidth} × {config.boardHeight} mm</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Kerf:</span>
              <span className="text-white font-mono font-bold">{config.kerf} mm</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Refilado (der./sup.):</span>
              <span className="text-white font-mono font-bold">{config.refiladoX}/{config.refiladoY} mm</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Rotación:</span>
              <span className={config.allowGlobalRotation ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                {config.allowGlobalRotation ? 'Sí' : 'No'}
              </span>
            </div>

            {/* ERROR ALERTS */}
            {unplacedParts.length > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex flex-col gap-2">
                <h3 className="text-rose-400 font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  Piezas sin ubicar ({unplacedParts.length})
                </h3>
                <p className="text-xs text-rose-300/80">
                  Algunas piezas exceden el tamaño de la lámina o no lograron acomodarse. Revisá las dimensiones de las piezas listadas a continuación o cambiá la rotación.
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

            {/* STATUS LEGEND */}
            <div className="flex items-center gap-4 px-2 text-[11px] text-slate-500 mb-1">
              <span className="font-bold text-slate-400 uppercase tracking-widest">Leyenda</span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#00e0fe40] border border-[#00e0fe80]" />
                <span>Pieza colocada</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#6ee7b70d] border border-dashed border-[#6ee7b74d]" />
                <span>Espacio libre (no usado)</span>
              </span>
              {unplacedParts.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-rose-500/20 border border-rose-500/40" />
                  <span>Pieza sin ubicar</span>
                </span>
              )}
            </div>

            {/* PREVIEW SVG CANVAS */}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 2xl:grid-cols-2 gap-4" : "flex flex-col gap-6"}>
              {optimizedSheets.map((sheet, index) => (
                <NestingSheetPreview
                  key={sheet.id || index}
                  id={sheet.id || `sheet-preview-${sheet.index}`}
                  sheet={sheet}
                  boardWidth={config.boardWidth}
                  boardHeight={config.boardHeight}
                  refiladoX={config.refiladoX}
                  refiladoY={config.refiladoY}
                  compact={viewMode === 'grid'}
                  rows={rows}
                  cantos={despieceData?.cantos || []}
                />
              ))}
            </div>

            {/* NOTHING FIT STATE — rows exist but zero fitted sheets */}
            {!isRunning && optimizedSheets.length === 0 && rows.length > 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <div className="text-amber-400/60 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-lg text-amber-300/80 font-bold">No se encontró solución de acomodo</p>
                <p className="text-sm mt-2 opacity-60">Las piezas exceden el espacio disponible o no se pudieron acomodar en la lámina.</p>
                {unplacedParts.length > 0 && (
                  <p className="text-xs mt-3 text-amber-500/70 bg-amber-500/10 px-3 py-2 rounded border border-amber-500/30">
                    {unplacedParts.length} pieza{unplacedParts.length !== 1 ? 's' : ''} sin ubicar.
                    Revisá las dimensiones o habilitá la rotación.
                  </p>
                )}
              </div>
            )}

            {/* TRUE EMPTY STATE — no rows at all */}
            {!isRunning && optimizedSheets.length === 0 && rows.length === 0 && (
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
