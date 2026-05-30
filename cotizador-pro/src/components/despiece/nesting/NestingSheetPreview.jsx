import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function NestingSheetPreview({ sheet, boardWidth, boardHeight, compact = false }) {
  const containerRef = useRef(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [hoveredPiece, setHoveredPiece] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ w: 800, h: 500 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const sheetArea = boardWidth * boardHeight;
  const usedArea = sheet.pieces.reduce((sum, p) => sum + (p.width * p.height), 0);
  const yieldPct = sheetArea > 0 ? ((usedArea / sheetArea) * 100).toFixed(1) : 0;
  const wasteM2 = ((sheetArea - usedArea) / 1000000).toFixed(2);
  
  // Handlers for virtual zoom buttons
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Panning logic
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Calculate base scale to fit the board in the container with some padding
  const padding = 50;
  const baseScale = Math.min(
    (containerSize.w - padding) / Math.max(boardWidth, 1),
    (containerSize.h - padding) / Math.max(boardHeight, 1)
  );

  // Center the board dynamically if not panned
  const currentScale = baseScale * zoom;
  const offsetX = pan.x + (containerSize.w - (boardWidth * currentScale)) / 2;
  const offsetY = pan.y + (containerSize.h - (boardHeight * currentScale)) / 2;

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
      
      {/* Header Info */}
      <div className="absolute top-4 left-4 z-50 pointer-events-none">
        <h2 className="text-xl font-bold text-white drop-shadow-md">
          Lámina {sheet.index}
        </h2>
        <div className="text-sm text-slate-300 drop-shadow-md">
          {sheet.pieces.length} piezas • {yieldPct}% aprovechamiento
        </div>
      </div>

      <div className="absolute top-4 right-4 z-50 pointer-events-none text-right">
        <div className="text-sm text-slate-400 drop-shadow-md">Desperdicio</div>
        <div className="text-xl font-bold text-rose-400 drop-shadow-md">{wasteM2} m²</div>
      </div>

      {/* Floating Toolbar */}
      {!compact && (
        <div className="absolute bottom-4 right-4 z-50 flex items-center gap-1 bg-slate-800/80 backdrop-blur-md border border-slate-700 p-1 rounded-lg shadow-xl">
          <button 
            onClick={handleZoomOut}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
            title="Alejar"
          >
            <ZoomOut size={16} />
          </button>
          <button 
            onClick={handleResetZoom}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
            title="Restaurar vista"
          >
            <Maximize2 size={16} />
          </button>
          <button 
            onClick={handleZoomIn}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
            title="Acercar"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      )}

      {/* Grid Canvas */}
      <div 
        ref={containerRef}
        className={`w-full overflow-hidden ${compact ? 'pointer-events-none' : 'h-[93vh] cursor-grab active:cursor-grabbing'} bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik0wIDEwTDEwIDBNMTAgNDBMMDAgMzBNNDAgMTBMMzAgME00MCAzMEwzMCA0ME0yMCAxMEwyMCAwTTIwIDQwTDIwIDMwTTAgMjBMMTAgMjBNMzAgMjBMNDAgMjAiIHN0cm9rZT0icmdiYSg1MSwgNjUsIDg1LCAwLjIpIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+')] bg-repeat`}
        style={compact ? { aspectRatio: `${boardWidth} / ${boardHeight}` } : undefined}
        onMouseDown={compact ? undefined : handleMouseDown}
        onMouseMove={compact ? undefined : handleMouseMove}
        onMouseLeave={() => setHoveredPiece(null)}
      >
        <div
          style={{
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${currentScale})`,
            transformOrigin: '0 0',
            width: boardWidth,
            height: boardHeight,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            willChange: 'transform'
          }}
        >
          <div 
            className="relative box-content bg-[#09132b] shadow-[0_0_30px_rgba(0,224,254,0.15)]" 
            style={{ 
              width: boardWidth, 
              height: boardHeight,
              border: `${Math.max(1, 2 / currentScale)}px solid rgba(0, 224, 254, 0.5)`
            }}
          >
            <div className="absolute inset-0 overflow-visible">
              <div className="absolute inset-0 bg-gradient-to-br from-[#f43f5e1a] to-[#f59e0b1a] pointer-events-none" />
              {(sheet.freeRects || []).map((rect, index) => {
                const rectWidth = Math.max(1, rect.width);
                const rectHeight = Math.max(1, rect.height);
                const showRectWidthLabel = rectWidth >= 44 && rectHeight >= 16;
                const showRectHeightLabel = rectHeight >= 44 && rectWidth >= 16;
                
                return (
                  <div
                    key={`free_${sheet.id || sheet.index}_${index}`}
                    className="absolute pointer-events-none z-[5] rounded-sm border border-dashed border-[#6ee7b74d] bg-[#6ee7b70d]"
                    style={{
                      left: rect.x,
                      top: rect.y,
                      width: rectWidth,
                      height: rectHeight,
                    }}
                  >
                      {showRectHeightLabel && (
                        <div
                          className="absolute text-[#a7f3d0] bg-[#060e20cc] rounded-sm border border-[#6ee7b733] whitespace-nowrap"
                          style={{ 
                            left: '16px', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)',
                            fontSize: `${Math.min(13 / baseScale, rectWidth * 0.25, rectHeight * 0.25)}px`,
                            padding: '0.2em 0.4em'
                          }}
                        >
                          {Math.round(rect.height)}
                      </div>
                    )}
                      {showRectWidthLabel && (
                        <div
                          className="absolute text-[#a7f3d0] bg-[#060e20cc] rounded-sm border border-[#6ee7b733] pointer-events-none"
                          style={{ 
                            left: '50%', bottom: '4px', transform: 'translateX(-50%)',
                            fontSize: `${Math.min(13 / baseScale, rectWidth * 0.25, rectHeight * 0.25)}px`,
                            padding: '0.2em 0.4em'
                          }}
                        >
                          {Math.round(rect.width)}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pieces */}
              {sheet.pieces.map((piece, i) => {
                const pLeft = piece.x;
                const pTop = piece.y;
                const pWidth = Math.max(2, Math.min(piece.width, boardWidth - piece.x));
                const pHeight = Math.max(2, Math.min(piece.height, boardHeight - piece.y));
                

                const isVertical = pHeight > pWidth;
                
                // Dynamic font sizes to prevent overflow on narrow pieces when zoomed out
                // We want 14px on screen for labels, 11px for dimensions
                const maxLabelSize = (isVertical ? pWidth : pHeight) * 0.6;
                const targetLabelSize = 14 / currentScale;
                const labelFontSize = Math.max(4 / currentScale, Math.min(maxLabelSize, targetLabelSize));

                const maxDimSize = Math.min(pWidth, pHeight) * 0.45;
                const targetDimSize = 11 / currentScale;
                const dimFontSize = Math.max(3 / currentScale, Math.min(maxDimSize, targetDimSize));

                const showHeightLabel = pHeight > (40 / currentScale);
                const showWidthLabel = pWidth > (40 / currentScale);
                
                return (
                  <div 
                    key={`piece_${sheet.id || sheet.index}_${i}`}
                    className={`absolute border border-[#00e0fe80] flex items-center justify-center
                      ${hoveredPiece?.id === piece.id ? 'bg-[#00e0fe40] z-30 shadow-[0_0_15px_rgba(0,224,254,0.5)]' : 'bg-[#060e20] z-10'}
                      transition-colors duration-150 ease-in-out cursor-pointer hover:bg-[#00e0fe30]`}
                    style={{
                      left: piece.x,
                      top: piece.y,
                      width: pWidth,
                      height: pHeight,
                    }}
                    onMouseEnter={(e) => {
                      setHoveredPiece(piece);
                      const rect = containerRef.current.getBoundingClientRect();
                      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onMouseMove={(e) => {
                      const rect = containerRef.current.getBoundingClientRect();
                      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onMouseLeave={() => setHoveredPiece(null)}
                  >
                    {/* Center Label (Reference) */}
                    <div className="absolute inset-0 flex items-center justify-center p-1 overflow-hidden pointer-events-none">
                      <span 
                        className="font-bold truncate px-1 text-center flex items-center justify-center" 
                        style={{ 
                          fontSize: `${labelFontSize}px`,
                          width: isVertical ? `${pHeight * 0.85}px` : '90%',
                          transform: isVertical ? 'rotate(-90deg)' : 'none',
                          whiteSpace: 'nowrap',
                          color: hoveredPiece?.id === piece.id ? '#ffffff' : '#e2e8f0'
                        }}
                      >
                        {piece.ref}
                      </span>
                    </div>

                    {/* Height Label (Left edge) */}
                    {showHeightLabel && (
                      <div 
                        className="absolute left-0 top-1/2 -translate-y-1/2 bg-[#060e20] py-[2px] px-[2px] rounded-r shadow-md z-20 flex items-center justify-center border-y border-r border-[#00e0fe40]"
                      >
                        <span className="font-medium text-[#99f7ff] leading-none" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: `${dimFontSize}px` }}>
                          {Math.round(piece.height)}
                        </span>
                      </div>
                    )}

                    {/* Width Label (Bottom edge) */}
                    {showWidthLabel && (
                      <div 
                        className="absolute text-[#99f7ff] bg-[#060e20cc] rounded-t-sm border-x border-t border-[#00e0fe40] pointer-events-none z-10 flex items-center justify-center"
                        style={{ 
                          left: '50%', bottom: '0', transform: 'translateX(-50%)',
                          padding: '0.1em 0.3em'
                        }}
                      >
                        <span className="font-medium leading-none" style={{ fontSize: `${dimFontSize}px` }}>
                          {Math.round(piece.width)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredPiece && (
        <div 
          className="absolute z-50 pointer-events-none bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-lg shadow-2xl flex flex-col gap-1 min-w-[150px] transform -translate-x-1/2 -translate-y-[120%]"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-1 border-b border-slate-700 pb-1">
            {hoveredPiece.label || hoveredPiece.ref}
          </div>
          <div className="flex justify-between text-xs text-slate-300">
            <span>Ancho:</span>
            <span className="font-mono font-bold text-white">{hoveredPiece.width} mm</span>
          </div>
          <div className="flex justify-between text-xs text-slate-300">
            <span>Largo:</span>
            <span className="font-mono font-bold text-white">{hoveredPiece.height} mm</span>
          </div>
          <div className="flex justify-between text-xs text-slate-300">
            <span>Rotada:</span>
            <span className="font-mono font-bold text-white">{hoveredPiece.rotated ? 'Sí' : 'No'}</span>
          </div>
        </div>
      )}

    </div>
  );
}
