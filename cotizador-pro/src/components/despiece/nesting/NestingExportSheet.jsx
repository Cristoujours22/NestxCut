import React, { useRef, useEffect, useState } from 'react';
import { getPieceCantoInfo } from '../../../features/despiece/utils/pdfExport';
import { computePieceAnnotation, computeFreeRectAnnotation } from './nestingAnnotation';

// Fixed technical export skin — no live preview dependencies
const TECHNICAL_SKIN = {
  boardBg: '#ffffff',
  pieceBg: '#ffffff',
  pieceBorder: '#000000',
  freeRectBg: '#d0d0d0',
  freeRectBorder: '#000000',
  cantoColor: '#000000',
  textColor: '#000000',
  refiladoBg: '#e8e8e8',
  usableBorder: '#000000',
};

function sanitizeCoord(value) {
  return Number.isFinite(value) ? value : 0;
}

function sanitizeSize(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function clampCoord(value, max) {
  return Math.min(Math.max(value, 0), max);
}

/**
 * Dedicated technical export sheet renderer.
 * Renders the nesting geometry with a fixed technical skin.
 * Does NOT depend on live preview state, zoom, hover, or skin toggles.
 * 
 * Rendered offscreen, captured, then unmounted.
 */
export default function NestingExportSheet({
  sheet,
  boardWidth,
  boardHeight,
  refiladoX = 20,
  refiladoY = 20,
  rows = [],
  cantos = [],
  viewportWidth = 800,
  viewportHeight = 600,
}) {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: viewportWidth, h: viewportHeight });

  const safeBoardWidth = Number.isFinite(boardWidth) && boardWidth > 0 ? boardWidth : 1;
  const safeBoardHeight = Number.isFinite(boardHeight) && boardHeight > 0 ? boardHeight : 1;
  const safeRefiladoX = Math.max(0, Number.isFinite(refiladoX) ? refiladoX : 0);
  const safeRefiladoY = Math.max(0, Number.isFinite(refiladoY) ? refiladoY : 0);

  const usableWidth = Math.max(0, safeBoardWidth - safeRefiladoX);
  const usableHeight = Math.max(0, safeBoardHeight - safeRefiladoY);

  // Measure container size via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate scale to fit board in container with padding
  const padding = 40;
  const baseScale = Math.min(
    Math.max((containerSize.w - padding) / safeBoardWidth, 0.0001),
    Math.max((containerSize.h - padding) / safeBoardHeight, 0.0001)
  );

  // Use a fixed 1:1 scale for export — no zoom dependency
  const currentScale = baseScale;

  const offsetX = (containerSize.w - safeBoardWidth * currentScale) / 2;
  const offsetY = (containerSize.h - safeBoardHeight * currentScale) / 2;

  const skin = TECHNICAL_SKIN;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
      }}
    >
      <div
        data-export-canvas
        style={{
          position: 'absolute',
          left: offsetX,
          top: offsetY,
          width: containerSize.w,
          height: containerSize.h,
        }}
      >
        {/* Board background with border */}
        <div
          data-export-board
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: safeBoardWidth,
            height: safeBoardHeight,
            transform: `scale(${currentScale})`,
            transformOrigin: '0 0',
            backgroundColor: skin.boardBg,
            border: `${Math.max(1.2, 2 / currentScale)}px solid #000000`,
            boxSizing: 'border-box',
          }}
        >
          {/* Refilado (trim) overlays — one-sided: X from right, Y from top */}
          {safeRefiladoX > 0 && (
            <div
              data-refilado
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                width: safeRefiladoX,
                backgroundColor: skin.refiladoBg,
                borderLeft: `${Math.max(1, 1.4 / currentScale)}px dashed #000000`,
                boxSizing: 'border-box',
                zIndex: 3,
              }}
            />
          )}
          {safeRefiladoY > 0 && (
            <div
              data-refilado
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: safeRefiladoY,
                backgroundColor: skin.refiladoBg,
                borderBottom: `${Math.max(1, 1.4 / currentScale)}px dashed #000000`,
                boxSizing: 'border-box',
                zIndex: 3,
              }}
            />
          )}

          {/* Usable area boundary — one-sided: usable starts below top trim */}
          {(safeRefiladoX > 0 || safeRefiladoY > 0) && (
            <div
              data-refilado
              style={{
                position: 'absolute',
                left: 0,
                top: safeRefiladoY,
                width: usableWidth,
                height: usableHeight,
                border: `${Math.max(1, 1.4 / currentScale)}px solid #000000`,
                boxSizing: 'border-box',
                zIndex: 4,
              }}
            />
          )}

          {/* Free rects (scraps/spaces) */}
          {(sheet.freeRects || []).map((rect, index) => {
            const rawRectX = sanitizeCoord(rect?.x);
            const rawRectY = sanitizeCoord(rect?.y);
            const rectX = clampCoord(rawRectX, safeBoardWidth);
            const rectYWithTrim = rawRectY + safeRefiladoY;
            const rectY = clampCoord(rectYWithTrim, safeBoardHeight);
            const clippedRectLeft = Math.max(0, rectX - rawRectX);
            const clippedRectTop = Math.max(0, rectY - rectYWithTrim);
            const rectWidth = Math.min(
              Math.max(0, sanitizeSize(rect?.width) - clippedRectLeft),
              Math.max(0, safeBoardWidth - rectX)
            );
            const rectHeight = Math.min(
              Math.max(0, sanitizeSize(rect?.height) - clippedRectTop),
              Math.max(0, safeBoardHeight - rectY)
            );

            if (rectWidth <= 0 || rectHeight <= 0) return null;

            const rectScreenW = rectWidth * currentScale;
            const rectScreenH = rectHeight * currentScale;
            const { showWidthLabel, showHeightLabel } = computeFreeRectAnnotation({ screenW: rectScreenW, screenH: rectScreenH, currentZoom: 1 });
            const rectDimFontPx = Math.max(12, Math.min(16, Math.min(rectScreenW, rectScreenH) * 0.24));
            const rectDimFontSize = rectDimFontPx / currentScale;
            const rectBorderWidth = Math.max(1, 1 / currentScale);

            return (
              <div
                key={`free_${index}`}
                data-free-rect
                style={{
                  position: 'absolute',
                  left: rectX,
                  top: rectY,
                  width: rectWidth,
                  height: rectHeight,
                  backgroundColor: skin.freeRectBg,
                  border: `${rectBorderWidth}px solid #000000`,
                  boxSizing: 'border-box',
                  zIndex: 5,
                }}
              >
                {showHeightLabel && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${Math.max(8, rectDimFontSize * 0.9)}px`,
                      top: '50%',
                      transform: 'translateY(-50%) rotate(-90deg)',
                      fontSize: `${rectDimFontSize}px`,
                      color: skin.textColor,
                      backgroundColor: 'transparent',
                      border: 'none',
                      padding: '0',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      fontWeight: 500,
                    }}
                  >
                    {Math.round(sanitizeSize(rect?.height))}
                  </div>
                )}
                {showWidthLabel && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      bottom: '4px',
                      transform: 'translateX(-50%)',
                      fontSize: `${rectDimFontSize}px`,
                      color: skin.textColor,
                      backgroundColor: 'transparent',
                      border: 'none',
                      padding: '0',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      fontWeight: 500,
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
            const pWidth = Math.min(
              Math.max(0, pieceWidth - clippedPieceLeft),
              Math.max(0, safeBoardWidth - pLeft)
            );
            const pHeight = Math.min(
              Math.max(0, pieceHeight - clippedPieceTop),
              Math.max(0, safeBoardHeight - pTop)
            );

            if (pWidth <= 0 || pHeight <= 0) return null;

            const screenW = pWidth * currentScale;
            const screenH = pHeight * currentScale;
            const isVertical = pHeight > pWidth;
            const fullLabelSource = (piece.label || piece.ref || `P${i + 1}`).trim();

            const ann = computePieceAnnotation({
              pieceWidth, pieceHeight,
              screenW, screenH,
              isVertical,
              fullLabelSource,
              currentScale,
              currentZoom: 1,
            });

            const cantoInfo = getPieceCantoInfo(piece, rows, cantos);
            const bottomCanto = piece.rotated ? cantoInfo?.a1 : cantoInfo?.l1;
            const topCanto = piece.rotated ? cantoInfo?.a2 : cantoInfo?.l2;
            const leftCanto = piece.rotated ? cantoInfo?.l1 : cantoInfo?.a1;
            const rightCanto = piece.rotated ? cantoInfo?.l2 : cantoInfo?.a2;
            const hasAnyCanto = bottomCanto || topCanto || leftCanto || rightCanto;

            return (
              <div
                key={`piece_${piece.instanceId || i}`}
                data-piece
                style={{
                  position: 'absolute',
                  left: pLeft,
                  top: pTop,
                  width: pWidth,
                  height: pHeight,
                  backgroundColor: skin.pieceBg,
                  border: `${Math.max(1, 1.4 / currentScale)}px solid #000000`,
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  overflow: 'hidden',
                }}
              >
                {/* Piece label */}
                {ann.pieceLabel && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      padding: '0 2px',
                      fontSize: `${ann.labelFontSize}px`,
                      color: skin.textColor,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      transform: isVertical ? 'translateY(-50%) rotate(-90deg)' : 'translateY(-50%)',
                      top: '50%',
                      pointerEvents: 'none',
                    }}
                  >
                    {ann.pieceLabel}
                  </span>
                )}

                {/* Piece index in corner when cantos shown */}
                {hasAnyCanto && ann.showCanto && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      fontSize: `${Math.max(3 / currentScale, ann.dimFontSize * 0.75)}px`,
                      padding: '1px 2px',
                      color: skin.textColor,
                      pointerEvents: 'none',
                    }}
                  >
                    {i + 1}
                  </span>
                )}

                {/* Horizontal dimension near bottom edge */}
                {ann.showDimValue && ann.showHorizontalDim && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: `${ann.isMiniPiece ? 1 : 2 / currentScale}px`,
                      ...(ann.placeHorizontalDimAtRight
                        ? { right: `${Math.max(4, ann.dimFontSize * 0.8)}px` }
                        : { left: '50%', transform: 'translateX(-50%)' }),
                      fontSize: `${ann.dimFontSize}px`,
                      color: skin.textColor,
                      backgroundColor: 'transparent',
                      border: 'none',
                      padding: ann.isMiniPiece ? '0.02em 0.12em' : '0.12em 0.35em',
                      fontWeight: ann.isMiniPiece ? 700 : 600,
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {Math.round(pieceWidth)}
                  </span>
                )}

                {/* Vertical dimension near left edge */}
                {ann.showDimValue && ann.showVerticalDim && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: ann.verticalDimInset,
                      transform: 'translateY(-50%) rotate(-90deg)',
                      transformOrigin: isVertical ? 'left center' : 'center center',
                      fontSize: `${ann.dimFontSize}px`,
                      color: skin.textColor,
                      backgroundColor: 'transparent',
                      border: 'none',
                      padding: ann.isMiniPiece ? '0.02em 0.12em' : '0.12em 0.35em',
                      fontWeight: ann.isMiniPiece ? 700 : 600,
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {Math.round(pieceHeight)}
                  </span>
                )}

                {/* Canto edge indicators — solid black lines */}
                {hasAnyCanto && ann.showCanto && (
                  <>
                    {bottomCanto && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: '2px',
                          backgroundColor: skin.cantoColor,
                          zIndex: 20,
                        }}
                      />
                    )}
                    {topCanto && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: 0,
                          height: '2px',
                          backgroundColor: skin.cantoColor,
                          zIndex: 20,
                        }}
                      />
                    )}
                    {leftCanto && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: 0,
                          width: '2px',
                          backgroundColor: skin.cantoColor,
                          zIndex: 20,
                        }}
                      />
                    )}
                    {rightCanto && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          right: 0,
                          width: '2px',
                          backgroundColor: skin.cantoColor,
                          zIndex: 20,
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
  );
}
