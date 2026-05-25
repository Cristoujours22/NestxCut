import { useMemo, useState, useRef } from 'react';
import { buildNestingPreview } from '../../features/despiece/utils/nestingLayout';
import { calculateEstimatedSheetsWithSettings } from '../../features/despiece/utils/nestingEstimate';
import { groupIdenticalSheets, generateNestingPDF, getPieceCantoInfo } from '../../features/despiece/utils/pdfExport';
import { toJpeg } from 'html-to-image';

function formatSheetCount(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return '0';
  const integer = Math.floor(numeric);
  const decimal = numeric - integer;
  if (decimal === 0) return String(integer);
  if (decimal === 0.5) {
    if (integer === 0) return '1/2';
    return `${integer} 1/2`;
  }
  return String(numeric);
}

function formatPhysicalSheetSummary(sheets = []) {
  const fullCount = sheets.filter((sheet) => sheet.boardMode !== 'half').length;
  const halfCount = sheets.filter((sheet) => sheet.boardMode === 'half').length;
  const parts = [];
  if (fullCount > 0) parts.push(`${fullCount} entera${fullCount === 1 ? '' : 's'}`);
  if (halfCount > 0) parts.push(`${halfCount} media${halfCount === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' + ') : '0';
}

function SheetPreview({ sheet, boardWidth, boardHeight, usableWidth, usableHeight, insetX = 0, insetY = 0, zoom = 1, rows = [], cantos = [], id, isPrintMode = false, boardMode = 'full' }) {
  const boardInset = 3;

  // Print Mode color palette (toner-friendly: white bg, black lines, dark text)
  const colors = isPrintMode ? {
    cardBg: 'bg-white', cardBorder: 'border-gray-300',
    frameBg: '#ffffff', frameBorder: '#cccccc',
    boardBg: '#ffffff', boardBorder: '#333333',
    innerGlow: 'border-transparent',
    gradientFrom: 'from-transparent', gradientTo: 'to-transparent',
    usableBorder: 'border-[#555555]', usableBg: 'bg-transparent',
    pieceBorder: 'border-[#000000]', pieceBg: 'bg-[#f0f0f0]',
    pieceText: 'text-black', labelBg: 'bg-white', labelBorder: 'border-[#999999]',
    labelText: 'text-black', cantoText: 'text-[#333333]', cantoBg: 'bg-white', cantoBorder: 'border-[#999999]',
    freeBorder: 'border-[#aaaaaa]', freeBg: 'bg-[#f5f5f5]', freeText: 'text-[#666666]', freeLabelBg: 'bg-white',
    refiladoBg: 'bg-[#e0e0e0]', refiladoBorder: 'border-[#999999]',
    refiladoXBg: 'bg-[#e8e8e8]', refiladoXBorder: 'border-[#aaaaaa]',
    dimText: 'text-black', dimBg: 'bg-white', dimBorder: 'border-[#999999]',
  } : {
    cardBg: 'bg-[#0f172b]', cardBorder: 'border-[#1a233a]',
    frameBg: '#060e20b3', frameBorder: '#1a233a',
    boardBg: '#060e20', boardBorder: '#2a3552',
    innerGlow: 'border-[#ffffff1f]',
    gradientFrom: 'from-[#f43f5e1a]', gradientTo: 'to-[#f59e0b1a]',
    usableBorder: 'border-[#99f7ffcc]', usableBg: 'bg-[#00e0fe0a]',
    pieceBorder: 'border-[#00e0fe80]', pieceBg: 'bg-[#00e0fe14]',
    pieceText: 'text-[#dee5ff]', labelBg: 'bg-[#060e20e6]', labelBorder: 'border-[#00e0fe4d]',
    labelText: 'text-[#dee5ff]', cantoText: 'text-[#facc15]', cantoBg: 'bg-[#060e20e6]', cantoBorder: 'border-[#facc154d]',
    freeBorder: 'border-[#6ee7b74d]', freeBg: 'bg-[#6ee7b70d]', freeText: 'text-[#a7f3d0]', freeLabelBg: 'bg-[#060e20cc]',
    refiladoBg: 'bg-[#f43f5e47]', refiladoBorder: 'border-[#fda4af99]',
    refiladoXBg: 'bg-[#f59e0b47]', refiladoXBorder: 'border-[#fcd34d99]',
    dimText: 'text-[#99f7ff]', dimBg: 'bg-[#060e20cc]', dimBorder: 'border-[#1a233a]',
  };
  const baseScale = Math.min(1, 640 / Math.max(boardWidth, boardHeight, 1));
  const scale = baseScale * zoom;
  const previewWidth = Math.round(boardWidth * scale);
  const previewHeight = Math.round(boardHeight * scale);
  const usableLeft = boardInset;
  const usableTop = boardInset;
  const usablePreviewWidth = Math.max(0, Math.round(usableWidth * scale));
  const usablePreviewHeight = Math.max(0, Math.round(usableHeight * scale));
  const innerBoardWidth = Math.max(0, previewWidth - (boardInset * 2));
  const innerBoardHeight = Math.max(0, previewHeight - (boardInset * 2));
  const refiladoRightWidth = Math.max(0, innerBoardWidth - usablePreviewWidth);
  const refiladoBottomHeight = Math.max(0, innerBoardHeight - usablePreviewHeight);

  const usedArea = sheet.pieces.reduce((total, piece) => total + (piece.width * piece.height), 0);
  const boardArea = usableWidth * usableHeight;
  const utilization = boardArea > 0 ? (usedArea / boardArea) * 100 : 0;
  const brutoArea = boardWidth * boardHeight;
  const refiladoArea = Math.max(0, brutoArea - boardArea);

  return (
    <div className={`${colors.cardBg} border ${colors.cardBorder} rounded-2xl p-4 space-y-3 w-fit max-w-full min-w-[320px] overflow-hidden`}>
      {!isPrintMode && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-[#dee5ff] font-semibold">Lámina {sheet.index}{sheet.boardMode === 'half' ? ' · MEDIA' : ''}</div>
          <div className="text-[11px] uppercase tracking-wide text-[#6f7a97]">{sheet.pieces.length} piezas · {utilization.toFixed(1)}% uso</div>
        </div>
      )}

      <div className="w-full overflow-visible flex justify-center">
        <div id={id} className={`relative rounded-2xl border inline-block ${isPrintMode ? '' : 'shadow-inner'}`} style={{ padding: '12px 24px 24px 12px', backgroundColor: colors.frameBg, borderColor: colors.frameBorder }}>
          <div className="relative rounded-xl border" style={{ width: previewWidth, height: previewHeight, backgroundColor: colors.boardBg, borderColor: colors.boardBorder }}>
            {!isPrintMode && <div className={`absolute inset-[3px] rounded-[10px] border ${colors.innerGlow} pointer-events-none z-40`} />}
            <div className="absolute inset-0 rounded-xl">
              {!isPrintMode && <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradientFrom} ${colors.gradientTo} pointer-events-none`} />}
              <div
                className={`absolute ${colors.usableBorder} ${colors.usableBg} rounded-sm pointer-events-none z-20 ${isPrintMode ? '' : 'shadow-[inset_0_0_0_1px_rgba(153,247,255,0.08)]'}`}
                style={{
                  left: usableLeft,
                  top: usableTop,
                  width: usablePreviewWidth,
                  height: usablePreviewHeight,
                }}
              />
              {null}
              {(sheet.freeRects || []).map((rect, index) => {
                const rectLeft = usableLeft + Math.round(rect.x * scale);
                const rectTop = usableTop + Math.round(rect.y * scale);
                const rectWidth = Math.max(1, Math.round(rect.width * scale));
                const rectHeight = Math.max(1, Math.round(rect.height * scale));
                const showRectWidthLabel = rectWidth >= 44 && rectHeight >= 16;
                const showRectHeightLabel = rectHeight >= 44 && rectWidth >= 16;
                return (
                  <div
                    key={`free_${sheet.index}_${index}`}
                    className={`absolute pointer-events-none z-[5] rounded-sm border border-dashed ${colors.freeBorder} ${colors.freeBg}`}
                    style={{
                      left: rectLeft,
                      top: rectTop,
                      width: rectWidth,
                      height: rectHeight,
                    }}
                    title={`Área libre ${rect.width}x${rect.height}`}
                    >
                      {showRectHeightLabel ? (
                      <div
                        className={`absolute text-[8px] ${colors.freeText} ${colors.freeLabelBg} px-1 py-0.5 rounded-sm border border-[#6ee7b733] whitespace-nowrap`}
                        style={{ left: '16px', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
                      >
                        {rect.height}
                      </div>
                    ) : null}
                    {showRectWidthLabel ? (
                      <div
                        className={`absolute text-[8px] ${colors.freeText} ${colors.freeLabelBg} px-1 py-0.5 rounded-sm border border-[#6ee7b733] pointer-events-none`}
                        style={{ left: '50%', bottom: '4px', transform: 'translateX(-50%)' }}
                      >
                        {rect.width}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {sheet.pieces.map((piece) => (
                (() => {
                  const scaledLeft = usableLeft + Math.round(piece.x * scale);
                  const scaledTop = usableTop + Math.round(piece.y * scale);
                  const scaledWidth = Math.max(2, Math.min(Math.round(piece.width * scale), usablePreviewWidth - Math.round(piece.x * scale)));
                  const scaledHeight = Math.max(2, Math.min(Math.round(piece.height * scale), usablePreviewHeight - Math.round(piece.y * scale)));
                  const showWidthLabel = scaledWidth >= 44 && scaledHeight >= 16;
                  const showHeightLabel = scaledHeight >= 44 && scaledWidth >= 16;
                  const showDetailLabel = scaledWidth >= 80 && scaledHeight >= 24;
                  const cantoInfo = getPieceCantoInfo(piece, rows, cantos);

                  const bottomCanto = piece.rotated ? cantoInfo?.a1 : cantoInfo?.l1;
                  const topCanto = piece.rotated ? cantoInfo?.a2 : cantoInfo?.l2;
                  const leftCanto = piece.rotated ? cantoInfo?.l1 : cantoInfo?.a1;
                  const rightCanto = piece.rotated ? cantoInfo?.l2 : cantoInfo?.a2;

                  return (
                    <div
                      key={piece.instanceId}
                      className={`absolute border ${colors.pieceBorder} ${colors.pieceBg} ${colors.pieceText} text-[10px] rounded-sm overflow-hidden z-10`}
                      style={{
                        left: scaledLeft,
                        top: scaledTop,
                        width: scaledWidth,
                        height: scaledHeight,
                      }}
                      title={`${piece.label} · ${piece.width}x${piece.height}${piece.rotated ? ' · rotada' : ''}`}
                    >
                      {showDetailLabel ? (
                        <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] ${colors.labelText} ${colors.labelBg} px-1.5 py-0.5 rounded-sm border ${colors.labelBorder} pointer-events-none whitespace-nowrap overflow-hidden text-ellipsis max-w-[calc(100%-8px)]`}>
                          {piece.label}
                        </div>
                      ) : null}

                      {showHeightLabel ? (
                        <div className={`absolute text-[8px] ${colors.dimText} ${colors.dimBg} px-1 py-0.5 rounded-sm border ${colors.dimBorder} pointer-events-none whitespace-nowrap z-10`}
                          style={{ left: '16px', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}>
                          {piece.height}
                        </div>
                      ) : null}

                      {showWidthLabel ? (
                        <div className={`absolute left-1/2 bottom-[14px] -translate-x-1/2 text-[8px] ${colors.dimText} ${colors.dimBg} px-1 py-0.5 rounded-sm border ${colors.dimBorder} pointer-events-none z-10`}>
                          {piece.width}
                        </div>
                      ) : null}

                      {/* BOTTOM CANTO */}
                      {bottomCanto && showWidthLabel ? (
                        <div className={`absolute left-1/2 bottom-[1px] -translate-x-1/2 text-[6px] ${colors.cantoText} ${colors.cantoBg} px-1 py-[1px] rounded-[2px] border ${colors.cantoBorder} pointer-events-none whitespace-nowrap z-20`}>
                          {`${bottomCanto.codigo} ${bottomCanto.calibre}`.trim()}
                        </div>
                      ) : null}

                      {/* TOP CANTO */}
                      {topCanto && showWidthLabel ? (
                        <div className={`absolute left-1/2 top-[1px] -translate-x-1/2 text-[6px] ${colors.cantoText} ${colors.cantoBg} px-1 py-[1px] rounded-[2px] border ${colors.cantoBorder} pointer-events-none whitespace-nowrap z-20`}>
                          {`${topCanto.codigo} ${topCanto.calibre}`.trim()}
                        </div>
                      ) : null}

                      {/* LEFT CANTO */}
                      {leftCanto && showHeightLabel ? (
                        <div className={`absolute text-[6px] ${colors.cantoText} ${colors.cantoBg} px-1 py-[1px] rounded-[2px] border ${colors.cantoBorder} pointer-events-none whitespace-nowrap z-20`}
                          style={{ left: '4px', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}>
                          {`${leftCanto.codigo} ${leftCanto.calibre}`.trim()}
                        </div>
                      ) : null}

                      {/* RIGHT CANTO */}
                      {rightCanto && showHeightLabel ? (
                        <div className={`absolute text-[6px] ${colors.cantoText} ${colors.cantoBg} px-1 py-[1px] rounded-[2px] border ${colors.cantoBorder} pointer-events-none whitespace-nowrap z-20`}
                          style={{ right: '4px', top: '50%', transform: 'translate(50%, -50%) rotate(90deg)' }}>
                          {`${rightCanto.codigo} ${rightCanto.calibre}`.trim()}
                        </div>
                      ) : null}
                    </div>
                  );
                })()
              ))}
            </div>
          </div>

          <div
            className={`absolute left-1/2 bottom-[2px] -translate-x-1/2 text-[8px] ${colors.dimText} ${colors.dimBg} px-1 py-0.5 rounded-sm border ${colors.dimBorder} pointer-events-none z-30 whitespace-nowrap`}
          >
            {boardWidth}
          </div>
          <div
            className={`absolute text-[8px] ${colors.dimText} ${colors.dimBg} px-1 py-0.5 rounded-sm border ${colors.dimBorder} pointer-events-none z-30 whitespace-nowrap`}
            style={{ left: 'calc(100% - 16px)', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
          >
            {boardHeight}
          </div>
        </div>
      </div>

      {null}
    </div>
  );
}

export default function DespieceNestingModal({ isOpen, onClose, boardName, boardDimensions, estimatedSheets, pieceCount, estimate, preview, rows = [], cantos = [], boardWidth = 0, boardHeight = 0, projectName = 'Proyecto sin título', clientName = 'Cliente sin nombre', commercialPacking = null }) {
  const [zoom, setZoom] = useState(1);
  const [ignoreBeta, setIgnoreBeta] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [boardMode, setBoardMode] = useState('full');
  const [paperSize, setPaperSize] = useState('Carta');
  const [isExporting, setIsExporting] = useState(false);
  const pdfPreviewRef = useRef(null);
  const [settings, setSettings] = useState(() => ({
    refiladoX: estimate?.settings?.refiladoX ?? 20,
    refiladoY: estimate?.settings?.refiladoY ?? 20,
    sawKerf: estimate?.settings?.sawKerf ?? 5,
    edgeAllowance: estimate?.settings?.edgeAllowance ?? 60,
  }));

  const modalEstimate = useMemo(() => calculateEstimatedSheetsWithSettings({
    rows,
    material: { largo_mm: boardWidth, ancho_mm: boardHeight },
    settings,
    boardMode,
  }), [rows, boardWidth, boardHeight, settings, boardMode]);

// When commercial packing is available, use it for sheet display (it has boardMode per sheet)
  // Otherwise fall back to the manual board mode preview
  const effectiveSheets = useMemo(() => {
    if (commercialPacking?.sheets?.length) {
      const refX = settings?.refiladoX ?? 20;
      const refY = settings?.refiladoY ?? 20;
      const enriched = commercialPacking.sheets.map(sheet => {
        const isHalf = sheet.boardMode === 'half';
        const bw = isHalf ? boardWidth : boardWidth;
        const bh = isHalf ? boardHeight / 2 : boardHeight;
        return {
          ...sheet,
          sheetUsableWidth: Math.max(0, bw - refX),
          sheetUsableHeight: Math.max(0, bh - refY),
        };
      });

      const fullSheets = enriched.filter((sheet) => sheet.boardMode !== 'half');
      const halfSheets = enriched.filter((sheet) => sheet.boardMode === 'half');
      const groupedSheets = [...fullSheets];

      for (let i = 0; i < halfSheets.length; i += 2) {
        const top = halfSheets[i];
        const bottom = halfSheets[i + 1];
        if (!bottom) {
          groupedSheets.push({ ...top });
          continue;
        }

        // Build a fresh full-sheet layout from the combined pieces
        // so the preview shows optimal packing instead of naive vertical stacking
        const combinedRows = [
          ...(top.pieces || []).map((p) => ({
            largo: p.width,
            ancho: p.height,
            cantidad: 1,
            rotar: p.rotated ? '1' : '0',
            id: p.instanceId || p.id || 'piece',
            detalle: p.label || '',
          })),
          ...(bottom.pieces || []).map((p) => ({
            largo: p.width,
            ancho: p.height,
            cantidad: 1,
            rotar: p.rotated ? '1' : '0',
            id: p.instanceId || p.id || 'piece',
            detalle: p.label || '',
          })),
        ];

        const fullUsableW = Math.max(0, boardWidth - refX);
        const fullUsableH = Math.max(0, boardHeight - refY);

        const repacked = buildNestingPreview({
          rows: combinedRows,
          boardWidth: fullUsableW,
          boardHeight: fullUsableH,
          kerf: settings.sawKerf ?? 5,
          allowGlobalRotation: ignoreBeta,
        });

        const repackedSheet = repacked.sheets[0] || { pieces: [], freeRects: [] };

        // Reconstruct instanceIds so SheetPreview keys stay stable
        const topOffset = top.sheetUsableHeight || 0;

        groupedSheets.push({
          ...top,
          boardMode: 'full',
          _displayFromTwoHalves: true,
          sheetUsableHeight: topOffset + (bottom.sheetUsableHeight || 0),
          pieces: repackedSheet.pieces.map((p, idx) => ({
            ...p,
            instanceId: `${p.instanceId || p.id || 'piece'}_repacked_${i}_${idx}`,
          })),
          freeRects: repackedSheet.freeRects.map((r, idx) => ({
            ...r,
          })),
        });
      }

      return groupedSheets.map((sheet, index) => ({ ...sheet, index: index + 1 }));
    }
    const result = buildNestingPreview({
      rows,
      boardWidth: modalEstimate.usableLargo || boardWidth || 0,
      boardHeight: modalEstimate.usableAncho || boardHeight || 0,
      kerf: settings.sawKerf ?? 5,
      allowGlobalRotation: ignoreBeta,
    });
    return result.sheets.map(s => ({ ...s, sheetUsableWidth: modalEstimate.usableLargo || 0, sheetUsableHeight: modalEstimate.usableAncho || 0 }));
  }, [ignoreBeta, rows, settings, boardWidth, boardHeight, modalEstimate, commercialPacking]);

  const effectiveUnplaced = commercialPacking?.unplaced ?? [];

  // Whether commercial packing overrides the manual board mode selector
  const usingCommercialPacking = commercialPacking?.sheets?.length > 0;

  if (!isOpen) return null;

  const unplacedPiecesCount = effectiveUnplaced?.length || 0;
  const totalBoardArea = (modalEstimate?.boardAncho || 0) * (modalEstimate?.boardLargo || 0) * (effectiveSheets?.length || 0);
  const placedArea = effectiveSheets?.reduce((total, sheet) => total + sheet.pieces.reduce((sheetTotal, piece) => sheetTotal + (piece.width * piece.height), 0), 0) || 0;
  const globalUtilization = totalBoardArea > 0 ? (placedArea / totalBoardArea) * 100 : 0;
  const previewColumns = zoom >= 0.95 ? 1 : zoom >= 0.7 ? 2 : 3;
  const previewGridStyle = {
    gridTemplateColumns: `repeat(${previewColumns}, minmax(320px, max-content))`,
  };
  const displaySheetCount = formatSheetCount(commercialPacking?.commercialCount ?? modalEstimate?.estimatedSheets ?? estimatedSheets ?? 0);
  const physicalSheetSummary = formatPhysicalSheetSummary(effectiveSheets || []);

  const handleExportPDF = async () => {
    if (!effectiveSheets?.length) return;

    setIsExporting(true);

    try {
      // Wait for React to re-render in print mode (white bg)
      await new Promise(resolve => setTimeout(resolve, 150));

      // Capture each sheet preview as an image
      const sheetImages = {};
      for (const sheet of effectiveSheets) {
        const element = document.getElementById(`sheet-preview-${sheet.index}`);
        if (element) {
          const originalStyle = element.style.cssText;
          element.style.maxHeight = 'none';
          element.style.maxWidth = 'none';

          try {
            const rect = element.getBoundingClientRect();

            const dataUrl = await toJpeg(element, {
              quality: 0.92,
              backgroundColor: '#ffffff',
              pixelRatio: 2,
              skipFonts: true,
              style: {
                transform: 'scale(1)',
                transformOrigin: 'top left'
              }
            });

            sheetImages[sheet.index] = {
              data: dataUrl,
              width: rect.width,
              height: rect.height
            };
          } catch (err) {
            console.error('Error renderizando imagen de lamina:', err);
          } finally {
            element.style.cssText = originalStyle;
          }
        }
      }

      const doc = await generateNestingPDF({
        sheets: effectiveSheets,
        sheetImages: sheetImages,
        unplacedPieces: effectiveUnplaced,
        projectName,
        clientName,
        materialName: boardName,
        paperSize,
        boardWidth: modalEstimate.boardLargo || boardWidth || 0,
        boardHeight: modalEstimate.boardAncho || boardHeight || 0,
        usableWidth: modalEstimate.usableLargo || 0,
        usableHeight: modalEstimate.usableAncho || 0,
        cantos: cantos,
        rows: rows
      });

      // Save the PDF
      doc.save(`Nesting_${projectName.replace(/\s+/g, '_')}_${clientName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar PDF: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
      <div className="w-[96vw] max-w-[1800px] bg-[#0a1122] border border-[#1a233a] rounded-2xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[#1a233a] bg-[#060e20]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-white">Optimización de láminas</div>
              <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#a3aac4]">
                <span className="text-[#dee5ff] font-bold">Láminas: {displaySheetCount}</span>
                <span className="truncate">{boardName || 'Sin material seleccionado'}{boardDimensions ? ` · ${boardDimensions}` : ''}</span>
                <span><span className="text-[#99f7ff]">Área útil base:</span> {modalEstimate.usableLargo || 0} × {modalEstimate.usableAncho || 0} mm</span>
                <span><span className="text-amber-300">Ref. X:</span> {modalEstimate.settings?.refiladoX || 0} mm</span>
                <span><span className="text-rose-300">Ref. Y:</span> {modalEstimate.settings?.refiladoY || 0} mm</span>
              </div>
            </div>
            <div className="flex items-center gap-2 xl:shrink-0">
            <button onClick={() => setShowSettings((prev) => !prev)} className="text-[#a3aac4] hover:text-white inline-flex items-center gap-1 text-sm border border-[#1a233a] rounded-lg px-3 py-2 bg-[#0f172b]">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Ajustes
            </button>
            <div className="flex items-center gap-2">
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
                className="text-sm bg-[#060e20] border border-[#1a233a] rounded-lg px-2 py-1 text-[#dee5ff] focus:outline-none focus:border-[#00e0fe]/50"
              >
                <option value="Carta">Carta</option>
                <option value="A4">A4</option>
                <option value="Oficio">Oficio</option>
              </select>
              <button
                onClick={handleExportPDF}
                disabled={isExporting || !effectiveSheets?.length}
                className="text-[#a3aac4] hover:text-white inline-flex items-center gap-1 text-sm border border-[#1a233a] rounded-lg px-2 py-1.5 bg-[#0f172b] disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                {isExporting ? 'Generando...' : 'Exportar PDF'}
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#dee5ff] font-medium cursor-pointer shrink-0 border border-[#1a233a] rounded-lg px-3 py-2 bg-[#0f172b]">
              <input
                type="checkbox"
                checked={ignoreBeta}
                onChange={(e) => setIgnoreBeta(e.target.checked)}
                className="w-4 h-4 rounded border-[#40485d] bg-[#060e20] text-[#00e0fe] focus:ring-[#00e0fe]/40"
              />
              <span>No respetar veta</span>
            </label>
            <button onClick={onClose} className="text-[#a3aac4] hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
          </div>
        </div>

          <div className="p-5 space-y-4 overflow-y-auto">
            {showSettings && (
            <div className="rounded-2xl border border-[#1a233a] bg-[#0f172b] p-4 space-y-4">
              <div className="text-[#dee5ff] font-semibold">Ajustes de optimización</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="text-sm text-[#a3aac4] flex flex-col gap-1">
                  <span>Refilado X</span>
                  <input type="number" value={settings.refiladoX} onChange={(e) => setSettings((prev) => ({ ...prev, refiladoX: Number(e.target.value) || 0 }))} className="w-full bg-[#060e20] border border-[#1a233a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00e0fe]/50" />
                </label>
                <label className="text-sm text-[#a3aac4] flex flex-col gap-1">
                  <span>Refilado Y</span>
                  <input type="number" value={settings.refiladoY} onChange={(e) => setSettings((prev) => ({ ...prev, refiladoY: Number(e.target.value) || 0 }))} className="w-full bg-[#060e20] border border-[#1a233a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00e0fe]/50" />
                </label>
                <label className="text-sm text-[#a3aac4] flex flex-col gap-1">
                  <span>Desp. sierra</span>
                  <input type="number" value={settings.sawKerf} onChange={(e) => setSettings((prev) => ({ ...prev, sawKerf: Number(e.target.value) || 0 }))} className="w-full bg-[#060e20] border border-[#1a233a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00e0fe]/50" />
                </label>
                <label className="text-sm text-[#a3aac4] flex flex-col gap-1">
                  <span>Desp. tapacantos</span>
                  <input type="number" value={settings.edgeAllowance} onChange={(e) => setSettings((prev) => ({ ...prev, edgeAllowance: Number(e.target.value) || 0 }))} className="w-full bg-[#060e20] border border-[#1a233a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00e0fe]/50" />
                </label>
                {!usingCommercialPacking && (
                  <>
                    <label className="text-sm text-[#a3aac4] flex flex-col gap-1">
                      <span>Formato tablero</span>
                      <select value={boardMode} onChange={(e) => setBoardMode(e.target.value)} className="w-full bg-[#060e20] border border-[#1a233a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00e0fe]/50">
                        <option value="full">Tablero entero</option>
                        <option value="half">Medio tablero</option>
                      </select>
                    </label>
                    <div className="text-sm text-[#6f7a97] flex items-end">
                      El medio tablero toma la mitad del lado ancho del tablero activo.
                    </div>
                  </>
                )}
                {usingCommercialPacking && (
                  <div className="text-sm text-[#6f7a97] flex items-end">
                    Escenario: {commercialPacking.scenario === 'all-full' ? 'Tablero entero' : commercialPacking.scenario === 'all-half' ? 'Medio tablero' : 'Mixto entero+medio'} · {commercialPacking.commercialCount} láminas comerciales
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border border-dashed border-[#1a233a] rounded-2xl p-5 bg-[#060e20]/40">
            {effectiveSheets?.length ? (
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[#dee5ff] font-bold">Visual preliminar de láminas</h3>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-sm text-[#a3aac4]">Comercial: {displaySheetCount} · Físico: {physicalSheetSummary}</div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-sm text-[#a3aac4]">Zoom</div>
                      <div className="flex items-center gap-1 rounded-lg border border-[#1a233a] bg-[#0f172b] px-2 py-1">
                        <button type="button" onClick={() => setZoom((prev) => Math.max(0.3, +(prev - 0.1).toFixed(2)))} className="text-[#a3aac4] hover:text-white">
                          <span className="material-symbols-outlined text-[16px]">remove</span>
                        </button>
                        <span className="text-[11px] text-[#dee5ff] w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <button type="button" onClick={() => setZoom((prev) => Math.min(2, +(prev + 0.1).toFixed(2)))} className="text-[#a3aac4] hover:text-white">
                          <span className="material-symbols-outlined text-[16px]">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 justify-center items-start" style={previewGridStyle}>
                  {effectiveSheets.map((sheet) => {
                    const isHalf = sheet.boardMode === 'half';
                    const physW = isHalf ? boardWidth : boardWidth;
                    const physH = isHalf ? boardHeight / 2 : boardHeight;
                    const utilW = sheet.sheetUsableWidth ?? (modalEstimate.usableLargo || 0);
                    const utilH = sheet.sheetUsableHeight ?? (modalEstimate.usableAncho || 0);
                    return (
                    <SheetPreview
                      key={sheet.index}
                      id={`sheet-preview-${sheet.index}`}
                      sheet={sheet}
                      boardWidth={physW}
                      boardHeight={physH}
                      usableWidth={utilW}
                      usableHeight={utilH}
                      insetX={modalEstimate.settings?.refiladoX || 0}
                      insetY={modalEstimate.settings?.refiladoY || 0}
                      zoom={zoom}
                      rows={rows}
                      cantos={cantos}
                      isPrintMode={isExporting}
                      boardMode={sheet.boardMode || 'full'}
                    />);
                  })}
                </div>

                {effectiveUnplaced?.length ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 space-y-2">
                    <div>{effectiveUnplaced.length} piezas no pudieron ubicarse en la vista preliminar.</div>
                    <div className="flex flex-wrap gap-2">
                      {effectiveUnplaced.map((piece) => (
                        <span key={piece.instanceId} className="px-2.5 py-1 rounded-lg bg-[#0f172b] border border-amber-500/20 text-[11px] text-amber-100">
                          {piece.label} · {piece.width}×{piece.height}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-[#40485d] text-5xl">dashboard_customize</span>
                <h3 className="text-[#dee5ff] font-bold mt-3">Visual de nesting sin piezas</h3>
                <p className="text-[#6f7a97] text-sm mt-2 max-w-2xl mx-auto">
                  Agregá piezas válidas y seleccioná un tablero en el tab activo para generar la visual preliminar de las láminas.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
