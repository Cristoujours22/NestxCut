import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { getPieceCantoInfo } from '../../../features/despiece/utils/pdfExport';

const CANTO_EDGE_COLOR = '#fde047';
// Live preview skin colors
const LIVE_SKIN = {
  boardBg: '#ffffff',
  pieceBg: '#76e3e8',
  pieceBorder: '#0f172a',
  freeRectBg: '#e5e7eb',
  freeRectBorder: '#4b5563',
  cantoColor: '#000000',
  textColor: '#0f172a',
  refiladoBg: '#f43f5e15',
  usableBorder: 'rgba(110,231,183,0.35)',
};

function getCantoTypeRef(canto) {
  const typeRef = Number(canto?.tipo ?? canto?.ref);
  return Number.isFinite(typeRef) ? typeRef : 0;
}

function getCantoEdgePattern(typeRef, orientation, thickness, cantoColor = CANTO_EDGE_COLOR) {
  const isHorizontal = orientation === 'horizontal';
  const axis = isHorizontal ? '90deg' : '180deg';
  const dotSpan = Math.max(3, thickness * 1.3);

  switch (typeRef) {
    case 1:
      return {
        backgroundColor: cantoColor,
      };
    case 2:
      return {
        backgroundImage: `repeating-linear-gradient(${axis}, ${cantoColor} 0 ${Math.max(2, thickness)}px, transparent ${Math.max(2, thickness)}px ${Math.max(4, thickness * 2)}px)`,
      };
    case 3:
      return {
        backgroundImage: `repeating-linear-gradient(${axis}, ${cantoColor} 0 ${Math.max(4, thickness * 2)}px, transparent ${Math.max(4, thickness * 2)}px ${Math.max(7, thickness * 3.5)}px)`,
      };
    case 4:
      return {
        backgroundImage: `repeating-linear-gradient(${axis}, ${cantoColor} 0 ${Math.max(7, thickness * 3)}px, transparent ${Math.max(7, thickness * 3)}px ${Math.max(10, thickness * 4.5)}px)`,
      };
    case 5:
      return {
        backgroundImage: `repeating-linear-gradient(${axis}, ${cantoColor} 0 ${Math.max(8, thickness * 3.5)}px, transparent ${Math.max(8, thickness * 3.5)}px ${Math.max(10, thickness * 4.4)}px, ${cantoColor} ${Math.max(10, thickness * 4.4)}px ${Math.max(12, thickness * 5.2)}px, transparent ${Math.max(12, thickness * 5.2)}px ${Math.max(16, thickness * 6.5)}px)`,
      };
    case 6:
      return {
        backgroundImage: `radial-gradient(circle, ${cantoColor} 60%, transparent 65%)`,
        backgroundSize: isHorizontal ? `${dotSpan}px ${thickness}px` : `${thickness}px ${dotSpan}px`,
        backgroundRepeat: 'repeat',
        backgroundPosition: 'center',
      };
    case 7:
      return {
        backgroundImage: `repeating-linear-gradient(${axis}, ${cantoColor} 0 ${Math.max(3, thickness)}px, transparent ${Math.max(3, thickness)}px ${Math.max(5, thickness * 2)}px, ${cantoColor} ${Math.max(5, thickness * 2)}px ${Math.max(11, thickness * 4.2)}px, transparent ${Math.max(11, thickness * 4.2)}px ${Math.max(14, thickness * 5.4)}px)`,
      };
    case 8:
      return {
        backgroundImage: `repeating-linear-gradient(${axis}, ${cantoColor} 0 ${Math.max(10, thickness * 4)}px, transparent ${Math.max(10, thickness * 4)}px ${Math.max(14, thickness * 5.8)}px)`,
      };
    default:
      return {
        backgroundImage: `repeating-linear-gradient(${axis}, ${cantoColor} 0 ${Math.max(5, thickness * 2.5)}px, transparent ${Math.max(5, thickness * 2.5)}px ${Math.max(8, thickness * 4)}px)`,
      };
  }
}

function getCantoEdgeStyle(canto, orientation, currentScale, cantoColor = CANTO_EDGE_COLOR) {
  const typeRef = getCantoTypeRef(canto);
  const baseThickness = Math.max(1.2, 1.75 / currentScale);
  const thicknessByType = {
    1: 1.35,
    2: 1,
    3: 1,
    4: 1.15,
    5: 1,
    6: 1.1,
    7: 1.2,
    8: 1.35,
  };
  const thickness = baseThickness * (thicknessByType[typeRef] || 1);

  return {
    ...(orientation === 'horizontal'
      ? { height: `${thickness}px` }
      : { width: `${thickness}px` }),
    ...getCantoEdgePattern(typeRef, orientation, thickness, cantoColor),
    boxShadow: 'none',
    opacity: 0.95,
  };
}

export default function NestingSheetPreview({ sheet, boardWidth, boardHeight, refiladoX = 20, refiladoY = 20, compact = false, rows = [], cantos = [], id, exportSkin = false }) {
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
  const getRowDimension = (row, key, fallback) => {
    const value = Number(row?.[key]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [hoveredPiece, setHoveredPiece] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ w: 800, h: 500 });

  // Get active skin based on mode
  const skin = LIVE_SKIN;

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
    <div id={id} className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative flex flex-col">
      
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
            data-export-board
            className="relative box-content"
              style={{ 
                width: safeBoardWidth, 
                height: safeBoardHeight,
                backgroundColor: skin.boardBg,
                border: `${Math.max(1, 2 / currentScale)}px solid #0f172a`
              }}
          >
            {/* Trim/Refilado overlay — non-usable boundary bands */}
            {/* Trim/Refilado overlay — one-sided: X from right edge, Y from top edge */}
            {safeRefiladoX > 0 && (
              <div data-refilado className="absolute top-0 bottom-0 pointer-events-none z-[3]"
                style={{ 
                  right: 0, 
                  width: safeRefiladoX,
                  backgroundColor: '#f43f5e15',
                  borderLeft: '1px dashed #f43f5e55'
                }}
              />
            )}
            {safeRefiladoY > 0 && (
              <div data-refilado className="absolute left-0 right-0 pointer-events-none z-[3]"
                style={{ 
                  top: 0, 
                  height: safeRefiladoY,
                  backgroundColor: '#f43f5e15',
                  borderBottom: '1px dashed #f43f5e55'
                }}
              />
            )}
{/* Usable boundary indicator (dashed inner rectangle) — one-sided trim: usable starts below top trim */}
            {safeRefiladoX > 0 || safeRefiladoY > 0 ? (
              <div
                data-refilado
                className="absolute pointer-events-none z-[4]"
                style={{
                  left: 0,
                  top: safeRefiladoY,
                  width: Math.max(0, usableWidth),
                  height: Math.max(0, usableHeight),
                  border: `${Math.max(1, 1.5 / currentScale)}px solid #0f172a`,
                  boxShadow: 'none'
                }}
              />
            ) : null}
            <div className="absolute inset-0 overflow-visible">
              {!exportSkin && null}
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
                const rectDimFontPx = Math.max(10, Math.min(14, Math.min(rectScreenW, rectScreenH) * 0.22));
                const rectDimFontSize = rectDimFontPx / currentScale;
                const rectBorderWidth = 1.8 / currentScale;
                const showRectWidthLabel = canShowSecondaryLabel({
                  primaryPx: rectScreenW,
                  crossPx: rectScreenH,
                  minPrimaryPx: 64,
                  minCrossPx: 18,
                  minZoom: 0.9,
                });
                const showRectHeightLabel = canShowSecondaryLabel({
                  primaryPx: rectScreenH,
                  crossPx: rectScreenW,
                  minPrimaryPx: 64,
                  minCrossPx: 18,
                  minZoom: 0.9,
                });
                
return (
                  <div
                    key={`free_${sheet.id || sheet.index}_${index}`}
                    data-free-rect
                    className="absolute pointer-events-none z-[5] rounded-sm border-dashed"
                    style={{
                      left: rectX,
                      top: rectY,
                      width: rectWidth,
                      height: rectHeight,
                      borderWidth: `${rectBorderWidth}px`,
                      borderColor: skin.freeRectBorder,
                      backgroundColor: skin.freeRectBg,
                      boxShadow: exportSkin ? 'none' : `inset 0 0 0 ${0.9 / currentScale}px rgba(255,255,255,0.2)`,
                    }}
                  >
                      {showRectHeightLabel && (
                        <div
                          className="absolute whitespace-nowrap pointer-events-none font-semibold"
                          style={{ 
                            left: `${Math.max(8, rectDimFontSize * 0.9)}px`, top: '50%', transform: 'translateY(-50%) rotate(-90deg)',
                            fontSize: `${rectDimFontSize}px`,
                            padding: '0',
                            color: skin.textColor,
                            backgroundColor: 'transparent',
                            border: 'none'
                          }}
                        >
                          {Math.round(sanitizeSize(rect?.height))}
                       </div>
                     )}
                        {showRectWidthLabel && (
                         <div
                          className="absolute pointer-events-none font-semibold"
                           style={{ 
                             left: '50%', bottom: '4px', transform: 'translateX(-50%)',
                             fontSize: `${rectDimFontSize}px`,
                             padding: '0',
                             color: skin.textColor,
                             backgroundColor: 'transparent',
                             border: 'none'
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
                const MIN_FULL_LABEL_W = 78;
                const MIN_FULL_LABEL_H = 36;
                const MIN_SHORT_LABEL_W = 36;
                const MIN_SHORT_LABEL_H = 16;
                const MIN_DIM_W = 30;
                const MIN_DIM_H = 28;
                const MIN_VERTICAL_LABEL_W = 18;
                const MIN_VERTICAL_LABEL_H = 52;
                const isMiniPiece = screenH < 24 || screenW < 60 || (isVertical && screenW < 28);
                const isSub100Piece = Math.min(pieceWidth, pieceHeight) < 100;

                // Determine label tier based on rendered size
                const canShowFullLabel = !isMiniPiece && screenW >= MIN_FULL_LABEL_W && screenH >= MIN_FULL_LABEL_H;
                const canShowShortLabel = screenW >= MIN_SHORT_LABEL_W && screenH >= MIN_SHORT_LABEL_H;

                const showHorizontalDim = canShowSecondaryLabel({
                  primaryPx: screenW,
                  crossPx: screenH,
                  minPrimaryPx: isSub100Piece ? 24 : MIN_DIM_W,
                  minCrossPx: isSub100Piece ? 10 : 18,
                  minZoom: 0.95,
                });
                const showVerticalDim = canShowSecondaryLabel({
                  primaryPx: screenH,
                  crossPx: screenW,
                  minPrimaryPx: isSub100Piece ? 24 : MIN_DIM_H,
                  minCrossPx: isSub100Piece ? 10 : 18,
                  minZoom: 0.95,
                });

                // Dynamic font sizes
                const maxLabelSize = Math.min(pWidth, pHeight) * 0.55;
                const targetLabelSize = (isMiniPiece ? 10 : 12) / currentScale;
                const labelFontSize = Math.max((isMiniPiece ? 3 : 3.5) / currentScale, Math.min(maxLabelSize, targetLabelSize));

                const maxDimSize = Math.min(pWidth, pHeight) * 0.4;
                const targetDimSize = (isMiniPiece ? 9 : 11) / currentScale;
                const dimFontSize = Math.max((isMiniPiece ? 2.8 : 3) / currentScale, Math.min(maxDimSize, targetDimSize));
                const dimEdgeInset = Math.max(2 / currentScale, dimFontSize + (2 / currentScale));

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
                const canShowVerticalFullLabel = isVertical
                  && !isMiniPiece
                  && screenW >= 26
                  && screenH >= 96;

                const estimateTextWidth = (text, fontPx) => text.length * fontPx * 0.58;
                const projectedRightDimWidth = showHorizontalDim ? Math.max(18, dimFontSize * currentScale * 3.2) : 0;
                const projectedLeftDimWidth = showVerticalDim ? Math.max(14, dimFontSize * currentScale * 1.8) : 0;
                const centerAvailablePx = Math.max(0, screenW - projectedLeftDimWidth - projectedRightDimWidth - 10);
                const fullLabelFitsCenter = estimateTextWidth(fullLabelSource, labelFontSize * currentScale) <= centerAvailablePx;
                const shortLabelFitsCenter = estimateTextWidth(shortAlias, labelFontSize * currentScale) <= centerAvailablePx;

                const pieceLabel = isMiniPiece
                  ? (canShowShortLabel ? shortAlias : '')
                  : isVertical
                  ? (canShowVerticalFullLabel ? fullLabelSource : (canShowVerticalLabel ? shortAlias : ''))
                  : canShowFullLabel && fullLabelFitsCenter
                    ? fullLabelSource
                    : (canShowShortLabel && shortLabelFitsCenter)
                      ? shortAlias
                      : '';
                const isShortLabel = Boolean(pieceLabel) && pieceLabel !== fullLabelSource;
                const showDimValue = isSub100Piece
                  ? true
                  : (canShowFullLabel || (canShowShortLabel && !isShortLabel) || canShowVerticalFullLabel);
                const useHorizontalThreeZoneLayout = !isVertical && showHorizontalDim;
                const reserveBottomBand = showDimValue && showHorizontalDim && !useHorizontalThreeZoneLayout;
                const labelTop = (!isVertical && reserveBottomBand) ? '42%' : '50%';
                const placeHorizontalDimAtRight = showHorizontalDim && isVertical;
                const verticalDimInset = isVertical
                  ? `${Math.max(12, dimFontSize * 1.6)}px`
                  : `${isMiniPiece ? 1 : 2 / currentScale}px`;
                const hoverKey = piece.instanceId != null ? `instance:${piece.instanceId}` : `fallback:${i}`;

                // Get canto info per side
                const cantoInfo = getPieceCantoInfo(piece, rows, cantos);
                const bottomCanto = piece.rotated ? cantoInfo?.a1 : cantoInfo?.l1;
                const topCanto = piece.rotated ? cantoInfo?.a2 : cantoInfo?.l2;
                const leftCanto = piece.rotated ? cantoInfo?.l1 : cantoInfo?.a1;
                const rightCanto = piece.rotated ? cantoInfo?.l2 : cantoInfo?.a2;

                // Canto markers only on sides where canto applies
                const hasAnyCanto = bottomCanto || topCanto || leftCanto || rightCanto;

                return (
                  <div
                    key={`piece_${piece.instanceId || i}`}
                    data-piece
                    className={`absolute border-2 flex items-center justify-center transition-colors duration-150 ease-in-out cursor-pointer
                      ${hoveredPiece?.hoverKey === hoverKey ? 'z-30 shadow-[0_0_15px_rgba(0,188,212,0.35)]' : 'z-10'}`}
                    style={{
                      left: pLeft,
                      top: pTop,
                      width: pWidth,
                      height: pHeight,
                      backgroundColor: hoveredPiece?.hoverKey === hoverKey ? '#55dfe7' : '#76e3e8',
                      borderColor: skin.pieceBorder,
                      boxShadow: hoveredPiece?.hoverKey === hoverKey
                        ? '0 0 0 1px rgba(255,255,255,0.45), 0 0 15px rgba(0,188,212,0.35)'
                        : 'inset 0 0 0 1px rgba(255,255,255,0.12)',
                    }}
                    onMouseEnter={(e) => {
                      setHoveredPiece({ ...piece, hoverKey, cantoInfo });
                      const rect = containerRef.current.getBoundingClientRect();
                      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onMouseMove={(e) => {
                      const rect = containerRef.current.getBoundingClientRect();
                      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onMouseLeave={() => setHoveredPiece(null)}
                  >
                    {/* 1. Piece code/name centered inside */}
                    {pieceLabel && (
                      <span
                        className="pointer-events-none absolute left-0 right-0 px-1 overflow-hidden"
                        style={{
                          top: labelTop,
                          fontSize: `${labelFontSize}px`,
                          color: skin.textColor,
                          whiteSpace: 'nowrap',
                          textAlign: 'center',
                          transform: isVertical ? 'translateY(-50%) rotate(-90deg)' : 'translateY(-50%)',
                        }}
                      >
                        {pieceLabel}
                      </span>
                    )}

                    {/* 4. Small piece index in corner when cantos shown */}
                    {hasAnyCanto && (screenW >= MIN_SHORT_LABEL_W && screenH >= MIN_SHORT_LABEL_H) && (
                      <span
                        className="absolute top-0 left-0 pointer-events-none"
                        style={{ fontSize: `${Math.max(3 / currentScale, dimFontSize * 0.75)}px`, padding: '1px 2px', color: exportSkin ? '#000' : '#0f172a' }}
                      >
                        {i + 1}
                      </span>
                    )}

                    {/* 2. Horizontal dimension near bottom edge, reading left→right */}
                    {showDimValue && showHorizontalDim && (
                      <span
                        className={`absolute pointer-events-none whitespace-nowrap ${placeHorizontalDimAtRight ? '' : 'left-1/2 -translate-x-1/2'}`}
                        style={{ 
                           bottom: `${isMiniPiece ? 1 : 2 / currentScale}px`, 
                           right: placeHorizontalDimAtRight ? `${Math.max(4, dimFontSize * 0.8)}px` : undefined,
                           fontSize: `${dimFontSize}px`, 
                           padding: isMiniPiece ? '0 0.15em 1px' : '0 0.3em 2px',
                           color: skin.textColor,
                           opacity: isMiniPiece ? 0.95 : 0.8,
                           fontWeight: isMiniPiece ? 700 : 500,
                         }}
                      >
                        {Math.round(pieceWidth)}
                      </span>
                    )}

                    {/* 3. Vertical dimension near left edge, reading vertically */}
                    {showDimValue && showVerticalDim && (
                      <span
                        className="absolute pointer-events-none whitespace-nowrap"
                        style={{
                          top: '50%',
                           left: verticalDimInset,
                            fontSize: `${dimFontSize}px`,
                            padding: isMiniPiece ? '1px 0 0 1px' : '2px 0 0 2px',
                            transform: 'translateY(-50%) rotate(-90deg)',
                            transformOrigin: isVertical ? 'left center' : 'center center',
                            color: skin.textColor,
                           opacity: isMiniPiece ? 0.95 : 0.8,
                           fontWeight: isMiniPiece ? 700 : 500,
                         }}
                      >
                        {Math.round(pieceHeight)}
                      </span>
                    )}

                    {/* Canto border treatment — full treated edge on applicable sides */}
                    {hasAnyCanto && (screenW >= MIN_SHORT_LABEL_W && screenH >= MIN_SHORT_LABEL_H) && (
                      <>
                        {bottomCanto && (
                          <div
                            className="absolute pointer-events-none z-20"
                            style={{
                              left: 0,
                              right: 0,
                              bottom: 0,
                              ...getCantoEdgeStyle(bottomCanto, 'horizontal', currentScale, skin.cantoColor),
                            }}
                          />
                        )}
                        {topCanto && (
                          <div
                            className="absolute pointer-events-none z-20"
                            style={{
                              left: 0,
                              right: 0,
                              top: 0,
                              ...getCantoEdgeStyle(topCanto, 'horizontal', currentScale, skin.cantoColor),
                            }}
                          />
                        )}
                        {leftCanto && (
                          <div
                            className="absolute pointer-events-none z-20"
                            style={{
                              top: 0,
                              bottom: 0,
                              left: 0,
                              ...getCantoEdgeStyle(leftCanto, 'vertical', currentScale, skin.cantoColor),
                            }}
                          />
                        )}
                        {rightCanto && (
                          <div
                            className="absolute pointer-events-none z-20"
                            style={{
                              top: 0,
                              bottom: 0,
                              right: 0,
                              ...getCantoEdgeStyle(rightCanto, 'vertical', currentScale, skin.cantoColor),
                            }}
                          />
                        )}
                      </>
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
        (() => {
          const hoveredRow = hoveredPiece.originalRowIndex != null ? rows?.[hoveredPiece.originalRowIndex] : null;
          const tooltipLargo = getRowDimension(hoveredRow, 'largo', hoveredPiece.rotated ? hoveredPiece.height : hoveredPiece.width);
          const tooltipAncho = getRowDimension(hoveredRow, 'ancho', hoveredPiece.rotated ? hoveredPiece.width : hoveredPiece.height);

          return (
        <div 
          className="absolute z-50 pointer-events-none bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-lg shadow-2xl flex flex-col gap-1 min-w-[150px] transform -translate-x-1/2 -translate-y-[120%]"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-1 border-b border-slate-700 pb-1">
            {hoveredPiece.label || hoveredPiece.ref}
          </div>
          <div className="flex justify-between text-xs text-slate-300">
            <span>Largo:</span>
            <span className="font-mono font-bold text-white">{tooltipLargo} mm</span>
          </div>
          <div className="flex justify-between text-xs text-slate-300">
            <span>Ancho:</span>
            <span className="font-mono font-bold text-white">{tooltipAncho} mm</span>
          </div>
          <div className="flex justify-between text-xs text-slate-300">
            <span>Rotada:</span>
            <span className="font-mono font-bold text-white">{hoveredPiece.rotated ? 'Sí' : 'No'}</span>
          </div>
          {hoveredPiece.cantoInfo && (
            <div className="mt-1 pt-1 border-t border-slate-700">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Cantos</div>
              {hoveredPiece.cantoInfo.l1 && (
                <div className="flex justify-between text-xs text-slate-300">
                  <span>L1:</span>
                  <span className="font-mono text-[#facc15]">{hoveredPiece.cantoInfo.l1.codigo} {hoveredPiece.cantoInfo.l1.calibre}</span>
                </div>
              )}
              {hoveredPiece.cantoInfo.l2 && (
                <div className="flex justify-between text-xs text-slate-300">
                  <span>L2:</span>
                  <span className="font-mono text-[#facc15]">{hoveredPiece.cantoInfo.l2.codigo} {hoveredPiece.cantoInfo.l2.calibre}</span>
                </div>
              )}
              {hoveredPiece.cantoInfo.a1 && (
                <div className="flex justify-between text-xs text-slate-300">
                  <span>A1:</span>
                  <span className="font-mono text-[#facc15]">{hoveredPiece.cantoInfo.a1.codigo} {hoveredPiece.cantoInfo.a1.calibre}</span>
                </div>
              )}
              {hoveredPiece.cantoInfo.a2 && (
                <div className="flex justify-between text-xs text-slate-300">
                  <span>A2:</span>
                  <span className="font-mono text-[#facc15]">{hoveredPiece.cantoInfo.a2.codigo} {hoveredPiece.cantoInfo.a2.calibre}</span>
                </div>
              )}
            </div>
          )}
        </div>
          );
        })()
      )}

    </div>
  );
}
