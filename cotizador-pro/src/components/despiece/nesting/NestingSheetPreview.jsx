import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function NestingSheetPreview({ sheet, boardWidth, boardHeight, refiladoX = 20, refiladoY = 20, compact = false }) {
  const containerRef = useRef(null);
  const coerceNumber = (value) => Number(value);
  const sanitizeCoord = (value) => (Number.isFinite(value) ? value : 0);
  const sanitizeSize = (value) => (Number.isFinite(value) && value > 0 ? value : 0);
  const sanitizeTrim = (value) => {
    const numericValue = coerceNumber(value);
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
  };
  const clampCoord = (value, max) => Math.min(Math.max(value, 0), max);
  const safeBoardWidth = Number.isFinite(boardWidth) && boardWidth > 0 ? boardWidth : 1;
  const safeBoardHeight = Number.isFinite(boardHeight) && boardHeight > 0 ? boardHeight : 1;
  const safeRefiladoX = sanitizeTrim(refiladoX);
  const safeRefiladoY = sanitizeTrim(refiladoY);
  
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

  const usableWidth = Math.max(0, safeBoardWidth - safeRefiladoX);
  const usableHeight = Math.max(0, safeBoardHeight - safeRefiladoY);
  const usableArea = usableWidth * usableHeight;
  const usedArea = sheet.pieces.reduce((sum, p) => {
    const pieceWidth = sanitizeSize(p?.width);
    const pieceHeight = sanitizeSize(p?.height);
    return sum + (pieceWidth * pieceHeight);
  }, 0);
  const rawYieldPct = usableArea > 0 ? (usedArea / usableArea) * 100 : 0;
  const safeYieldPct = Number.isFinite(rawYieldPct) ? Math.min(100, Math.max(0, rawYieldPct)) : 0;
  const yieldPct = safeYieldPct.toFixed(1);
  const safeWasteM2 = Number.isFinite(usableArea - usedArea) ? Math.max(0, usableArea - usedArea) / 1000000 : 0;
  const wasteM2 = safeWasteM2.toFixed(2);
  
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
  const baseScale = Math.max(
    0.0001,
    Math.min(
      Math.max(containerSize.w - padding, 1) / safeBoardWidth,
      Math.max(containerSize.h - padding, 1) / safeBoardHeight
    )
  );

  // Center the board dynamically if not panned
  const currentScale = Math.max(baseScale * zoom, 0.0001);
  const offsetX = pan.x + (containerSize.w - (safeBoardWidth * currentScale)) / 2;
  const offsetY = pan.y + (containerSize.h - (safeBoardHeight * currentScale)) / 2;
  const canShowSecondaryLabel = ({ primaryPx, crossPx, minPrimaryPx, minCrossPx, minZoom = 1 }) => (
    zoom >= minZoom && primaryPx >= minPrimaryPx && crossPx >= minCrossPx
  );

  // Color-coded yield indicator
  const yieldNum = parseFloat(yieldPct);
  const yieldColor = yieldNum >= 70 ? 'text-emerald-400' : yieldNum >= 40 ? 'text-amber-400' : 'text-rose-400';
  const yieldBg = yieldNum >= 70 ? 'bg-emerald-500/20 border-emerald-500/40' : yieldNum >= 40 ? 'bg-amber-500/20 border-amber-500/40' : 'bg-rose-500/20 border-rose-500/40';
  
  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative flex flex-col">
      
      {/* Improved Header — board dims + sheet context + stats */}
      <div className={`flex items-start justify-between gap-4 px-3 pt-3 pb-2 shrink-0 ${compact ? '' : 'pointer-events-none'}`}>
        {/* Left: Sheet identity + board dims */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Lámina</span>
            {typeof sheet.totalSheets === 'number' ? (
              <span className="text-sm font-black text-white">{sheet.index} / {sheet.totalSheets}</span>
            ) : (
              <span className="text-sm font-black text-white">#{sheet.index}</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {boardWidth} × {boardHeight} mm
          </div>
          {/* Utilization pill */}
          <div className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${yieldBg} ${yieldColor}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {yieldPct}% aprovechamiento
          </div>
        </div>

        {/* Right: piece count + waste */}
        <div className="text-right flex flex-col gap-0.5 items-end">
          <div className="text-xs text-slate-400">
            <span className="text-white font-bold">{sheet.pieces.length}</span> pieza{sheet.pieces.length !== 1 ? 's' : ''}
          </div>
          <div className="text-[10px] text-slate-500">Desperdicio</div>
          <div className={`text-base font-black ${yieldColor}`}>{wasteM2} m²</div>
          {/* Refilado legend */}
          {(safeRefiladoX > 0 || safeRefiladoY > 0) && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-3 h-2 rounded-sm bg-[#f43f5e25] border border-dashed border-[#f43f5e66]" />
              <span className="text-[10px] text-slate-400">refilado</span>
              <div className="w-3 h-2 rounded-sm border border-[#6ee7b3]" />
              <span className="text-[10px] text-slate-400">útil</span>
            </div>
          )}
        </div>
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
        style={compact ? { aspectRatio: `${safeBoardWidth} / ${safeBoardHeight}` } : undefined}
        onMouseDown={compact ? undefined : handleMouseDown}
        onMouseMove={compact ? undefined : handleMouseMove}
        onMouseLeave={() => setHoveredPiece(null)}
      >
        <div
          style={{
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${currentScale})`,
            transformOrigin: '0 0',
            width: safeBoardWidth,
            height: safeBoardHeight,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            willChange: 'transform'
          }}
        >
          <div 
            className="relative box-content bg-[#09132b] shadow-[0_0_30px_rgba(0,224,254,0.15)]" 
              style={{ 
                width: safeBoardWidth, 
                height: safeBoardHeight,
                border: `${Math.max(1, 2 / currentScale)}px solid rgba(0, 224, 254, 0.5)`
              }}
          >
            {/* Trim/Refilado overlay — non-usable boundary bands */}
            {/* Trim/Refilado overlay — one-sided: X from right edge, Y from top edge */}
            {safeRefiladoX > 0 && (
              <div className="absolute top-0 bottom-0 bg-[#f43f5e15] border-l border-dashed border-[#f43f5e55] pointer-events-none z-[3]"
                style={{ right: 0, width: safeRefiladoX }}
              />
            )}
            {safeRefiladoY > 0 && (
              <div className="absolute left-0 right-0 bg-[#f43f5e15] border-b border-dashed border-[#f43f5e55] pointer-events-none z-[3]"
                style={{ top: 0, height: safeRefiladoY }}
              />
            )}
            {/* Usable boundary indicator (dashed inner rectangle) — one-sided trim: usable starts below top trim */}
            {safeRefiladoX > 0 || safeRefiladoY > 0 ? (
              <div
                className="absolute pointer-events-none z-[4]"
                style={{
                  left: 0,
                  top: safeRefiladoY,
                  width: Math.max(0, usableWidth),
                  height: Math.max(0, usableHeight),
                  border: `${Math.max(1, 1.5 / currentScale)}px solid rgba(110, 231, 183, 0.35)`,
                  boxShadow: 'inset 0 0 0 1px rgba(110,231,183,0.08)'
                }}
              />
            ) : null}
            <div className="absolute inset-0 overflow-visible">
              <div className="absolute inset-0 bg-gradient-to-br from-[#f43f5e1a] to-[#f59e0b1a] pointer-events-none" />
              {(sheet.freeRects || []).map((rect, index) => {
                const rawRectX = sanitizeCoord(rect?.x);
                const rawRectY = sanitizeCoord(rect?.y);
                const rectX = clampCoord(rawRectX, safeBoardWidth);
                const rectYWithTrim = rawRectY + safeRefiladoY;
                const rectY = clampCoord(rectYWithTrim, safeBoardHeight);
                const clippedRectLeft = Math.max(0, rectX - rawRectX);
                const clippedRectTop = Math.max(0, rectY - rectYWithTrim);
                const rectWidth = Math.min(Math.max(0, sanitizeSize(rect?.width) - clippedRectLeft), Math.max(0, safeBoardWidth - rectX));
                const rectHeight = Math.min(Math.max(0, sanitizeSize(rect?.height) - clippedRectTop), Math.max(0, safeBoardHeight - rectY));

                if (rectWidth <= 0 || rectHeight <= 0) return null;

                const rectScreenW = rectWidth * currentScale;
                const rectScreenH = rectHeight * currentScale;
                const rectDimFontSize = Math.max(8, Math.min(11, Math.min(rectScreenW, rectScreenH) * 0.18));
                const showRectWidthLabel = canShowSecondaryLabel({
                  primaryPx: rectScreenW,
                  crossPx: rectScreenH,
                  minPrimaryPx: 84,
                  minCrossPx: 24,
                  minZoom: 1.05,
                });
                const showRectHeightLabel = canShowSecondaryLabel({
                  primaryPx: rectScreenH,
                  crossPx: rectScreenW,
                  minPrimaryPx: 84,
                  minCrossPx: 24,
                  minZoom: 1.05,
                });
                
                return (
                  <div
                    key={`free_${sheet.id || sheet.index}_${index}`}
                    className="absolute pointer-events-none z-[5] rounded-sm border border-dashed border-[#6ee7b74d] bg-[#6ee7b70d]"
                    style={{
                      left: rectX,
                      top: rectY,
                      width: rectWidth,
                      height: rectHeight,
                    }}
                  >
                      {showRectHeightLabel && (
                        <div
                          className="absolute text-[#d1fae5cc] bg-[#08111f99] rounded-sm border border-[#6ee7b726] whitespace-nowrap pointer-events-none"
                          style={{ 
                            left: '16px', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)',
                            fontSize: `${rectDimFontSize}px`,
                            padding: '0.1em 0.3em'
                          }}
                        >
                          {Math.round(sanitizeSize(rect?.height))}
                       </div>
                     )}
                        {showRectWidthLabel && (
                         <div
                          className="absolute text-[#d1fae5cc] bg-[#08111f99] rounded-sm border border-[#6ee7b726] pointer-events-none"
                          style={{ 
                            left: '50%', bottom: '4px', transform: 'translateX(-50%)',
                            fontSize: `${rectDimFontSize}px`,
                            padding: '0.1em 0.3em'
                          }}
                        >
                          {Math.round(sanitizeSize(rect?.width))}
                       </div>
                     )}
                   </div>
                );
              })}

              {/* Pieces */}
              {sheet.pieces.map((piece, i) => {
                const rawPieceX = sanitizeCoord(piece?.x);
                const rawPieceY = sanitizeCoord(piece?.y);
                const pLeft = clampCoord(rawPieceX, safeBoardWidth);
                const pTopWithTrim = rawPieceY + safeRefiladoY;
                const pTop = clampCoord(pTopWithTrim, safeBoardHeight);
                const pieceWidth = sanitizeSize(piece?.width);
                const pieceHeight = sanitizeSize(piece?.height);
                const clippedPieceLeft = Math.max(0, pLeft - rawPieceX);
                const clippedPieceTop = Math.max(0, pTop - pTopWithTrim);
                const pWidth = Math.min(Math.max(0, pieceWidth - clippedPieceLeft), Math.max(0, safeBoardWidth - pLeft));
                const pHeight = Math.min(Math.max(0, pieceHeight - clippedPieceTop), Math.max(0, safeBoardHeight - pTop));

                if (pWidth <= 0 || pHeight <= 0) return null;

                const isVertical = pHeight > pWidth;

                // Minimum rendered sizes (in screen px) for label tiers
                const screenW = pWidth * currentScale;
                const screenH = pHeight * currentScale;
                const MIN_FULL_LABEL_W = 62;
                const MIN_FULL_LABEL_H = 34;
                const MIN_SHORT_LABEL_W = 28;
                const MIN_SHORT_LABEL_H = 16;
                const MIN_DIM_W = 52;
                const MIN_DIM_H = 40;
                const MIN_VERTICAL_LABEL_W = 18;
                const MIN_VERTICAL_LABEL_H = 52;

                // Determine label tier based on rendered size
                const canShowFullLabel = screenW >= MIN_FULL_LABEL_W && screenH >= MIN_FULL_LABEL_H;
                const canShowShortLabel = screenW >= MIN_SHORT_LABEL_W && screenH >= MIN_SHORT_LABEL_H;

                const showDimLabel = canShowSecondaryLabel({
                  primaryPx: Math.min(screenW, screenH),
                  crossPx: Math.max(screenW, screenH),
                  minPrimaryPx: MIN_DIM_W,
                  minCrossPx: 20,
                  minZoom: 0.95,
                });

                // Dynamic font sizes
                const maxLabelSize = Math.min(pWidth, pHeight) * 0.55;
                const targetLabelSize = 14 / currentScale;
                const labelFontSize = Math.max(4 / currentScale, Math.min(maxLabelSize, targetLabelSize));

                const maxDimSize = Math.min(pWidth, pHeight) * 0.4;
                const targetDimSize = 11 / currentScale;
                const dimFontSize = Math.max(3 / currentScale, Math.min(maxDimSize, targetDimSize));

                // Label derivation
                const fullLabelSource = (piece.label || piece.ref || '').trim();
                const shortAlias = (() => {
                  if (!fullLabelSource) return '';
                  const codeMatch = fullLabelSource.match(/^[A-Za-z]{1,4}\d{1,4}[A-Za-z0-9-]*/)?.[0];
                  if (codeMatch) return codeMatch.toUpperCase();
                  const prefix = fullLabelSource.split(/[\s,;:.()[\]{}]+/).filter(Boolean)[0] || '';
                  return prefix.slice(0, 8).toUpperCase();
                })();

                const canShowVerticalLabel = isVertical
                  && screenW >= MIN_VERTICAL_LABEL_W
                  && screenH >= MIN_VERTICAL_LABEL_H;

                const pieceLabel = isVertical
                  ? (canShowVerticalLabel ? shortAlias : '')
                  : canShowFullLabel
                    ? fullLabelSource
                    : canShowShortLabel
                      ? shortAlias
                      : '';
                const isShortLabel = Boolean(pieceLabel) && pieceLabel !== fullLabelSource;
                const showDimValue = showDimLabel && (canShowFullLabel || (canShowShortLabel && !isShortLabel));
                const hoverKey = piece.instanceId != null ? `instance:${piece.instanceId}` : `fallback:${i}`;

                return (
                  <div
                    key={`piece_${piece.instanceId || i}`}
                    className={`absolute border border-[#00e0fe80] flex items-center justify-center
                      ${hoveredPiece?.hoverKey === hoverKey ? 'bg-[#00e0fe40] z-30 shadow-[0_0_15px_rgba(0,224,254,0.5)]' : 'bg-[#060e20] z-10'}
                      transition-colors duration-150 ease-in-out cursor-pointer hover:bg-[#00e0fe30]`}
                    style={{
                      left: pLeft,
                      top: pTop,
                      width: pWidth,
                      height: pHeight,
                    }}
                    onMouseEnter={(e) => {
                      setHoveredPiece({ ...piece, hoverKey });
                      const rect = containerRef.current.getBoundingClientRect();
                      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onMouseMove={(e) => {
                      const rect = containerRef.current.getBoundingClientRect();
                      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onMouseLeave={() => setHoveredPiece(null)}
                  >
                    {/* Clean centered label — no badge, no border, no background */}
                    {pieceLabel && (
                      <span
                        className="pointer-events-none absolute inset-0 flex items-center justify-center px-1 overflow-hidden"
                        style={{
                          fontSize: `${labelFontSize}px`,
                          color: hoveredPiece?.hoverKey === hoverKey ? '#ffffff' : '#cbd5e1',
                          whiteSpace: 'nowrap',
                          textAlign: 'center',
                          transform: isVertical ? 'rotate(-90deg)' : 'none',
                        }}
                      >
                        {pieceLabel}
                      </span>
                    )}

                    {/* Minimal dimension label at bottom — only for large pieces */}
                    {showDimValue && (
                      <span
                        className="absolute bottom-0 left-0 right-0 flex items-center justify-center pointer-events-none text-[#67e8f9] opacity-70"
                        style={{ fontSize: `${dimFontSize}px`, padding: '0 0.2em 2px' }}
                      >
                        {Math.round(pieceWidth)}×{Math.round(pieceHeight)}
                      </span>
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
            <span>Largo:</span>
            <span className="font-mono font-bold text-white">{hoveredPiece.width} mm</span>
          </div>
          <div className="flex justify-between text-xs text-slate-300">
            <span>Ancho:</span>
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
