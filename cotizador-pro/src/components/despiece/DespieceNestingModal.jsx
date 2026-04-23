import { useMemo, useState } from 'react';
import { buildNestingPreview } from '../../features/despiece/utils/nestingLayout';
import { calculateEstimatedSheetsWithSettings } from '../../features/despiece/utils/nestingEstimate';

function SheetPreview({ sheet, boardWidth, boardHeight, usableWidth, usableHeight, insetX = 0, insetY = 0, zoom = 1 }) {
  const framePadding = 28;
  const boardInset = 3;
  const baseScale = Math.min(1, 640 / Math.max(boardWidth, boardHeight, 1));
  const scale = baseScale * zoom;
  const previewWidth = Math.round(boardWidth * scale);
  const previewHeight = Math.round(boardHeight * scale);
  const frameWidth = previewWidth + (framePadding * 2);
  const frameHeight = previewHeight + (framePadding * 2);
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
    <div className="bg-[#0f172b] border border-[#1a233a] rounded-2xl p-4 space-y-3 w-fit max-w-full min-w-[320px] overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[#dee5ff] font-semibold">Lámina {sheet.index}</div>
        <div className="text-[11px] uppercase tracking-wide text-[#6f7a97]">{sheet.pieces.length} piezas · {utilization.toFixed(1)}% uso</div>
      </div>

      <div className="w-full overflow-x-auto flex justify-center">
        <div className="relative rounded-2xl border border-[#1a233a] bg-[#060e20]/70 inline-block shadow-inner" style={{ width: frameWidth, height: frameHeight, padding: framePadding }}>
        <div className="absolute rounded-xl border border-[#2a3552] bg-[#060e20]" style={{ width: previewWidth, height: previewHeight, inset: framePadding }}>
        <div className="absolute inset-[3px] rounded-[10px] border border-white/12 pointer-events-none z-40" />
        <div className="absolute inset-0 rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-amber-500/10 pointer-events-none" />
        <div
          className="absolute border border-[#99f7ff]/80 bg-[#00e0fe]/[0.04] rounded-sm pointer-events-none z-20 shadow-[inset_0_0_0_1px_rgba(153,247,255,0.08)]"
          style={{
            left: usableLeft,
            top: usableTop,
            width: usablePreviewWidth,
            height: usablePreviewHeight,
          }}
        />
        {insetY > 0 ? (
          <div
            className="absolute left-0 bottom-0 bg-rose-500/28 border-t-2 border-rose-300/60 pointer-events-none z-10"
            style={{ left: boardInset, width: innerBoardWidth, height: refiladoBottomHeight }}
            title={`Refilado Y: ${insetY} mm`}
          />
        ) : null}
        {insetX > 0 ? (
          <div
            className="absolute right-0 top-0 bg-amber-500/28 border-l-2 border-amber-300/60 pointer-events-none z-10"
            style={{ right: boardInset, top: boardInset, width: refiladoRightWidth, height: innerBoardHeight }}
            title={`Refilado X: ${insetX} mm`}
          />
        ) : null}
        {refiladoRightWidth > 0 ? (
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-30 bg-amber-200/70"
            style={{ left: usableLeft + usablePreviewWidth - 1, top: boardInset, height: innerBoardHeight, width: 2 }}
          />
        ) : null}
        {refiladoBottomHeight > 0 ? (
          <div
            className="absolute left-0 right-0 pointer-events-none z-30 bg-rose-200/70"
            style={{ left: boardInset, top: usableTop + usablePreviewHeight - 1, width: innerBoardWidth, height: 2 }}
          />
        ) : null}
        {refiladoRightWidth > 0 && refiladoBottomHeight > 0 ? (
          <div
            className="absolute pointer-events-none z-30 bg-gradient-to-br from-amber-300/45 to-rose-300/45 border-l-2 border-t-2 border-white/25"
            style={{
              left: usableLeft + usablePreviewWidth,
              top: usableTop + usablePreviewHeight,
              width: refiladoRightWidth,
              height: refiladoBottomHeight,
            }}
          />
        ) : null}
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
              className="absolute pointer-events-none z-[5] rounded-sm border border-dashed border-emerald-300/30 bg-emerald-300/[0.05]"
              style={{
                left: rectLeft,
                top: rectTop,
                width: rectWidth,
                height: rectHeight,
              }}
              title={`Área libre ${rect.width}x${rect.height}`}
            >
              {showRectHeightLabel ? (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[8px] text-emerald-200 bg-[#060e20]/80 px-1 py-0.5 rounded-sm border border-emerald-300/20 whitespace-nowrap">
                  {rect.height}
                </div>
              ) : null}
              {showRectWidthLabel ? (
                <div className="absolute left-1/2 bottom-1 -translate-x-1/2 text-[8px] text-emerald-200 bg-[#060e20]/80 px-1 py-0.5 rounded-sm border border-emerald-300/20 pointer-events-none">
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

            return (
              <div
                key={piece.instanceId}
                className="absolute border border-[#00e0fe]/50 bg-[#00e0fe]/8 text-[#dee5ff] text-[10px] rounded-sm overflow-hidden z-10"
                style={{
                  left: scaledLeft,
                  top: scaledTop,
                  width: scaledWidth,
                  height: scaledHeight,
                }}
                title={`${piece.label} · ${piece.width}x${piece.height}${piece.rotated ? ' · rotada' : ''}`}
              >
                {showHeightLabel ? (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[8px] text-[#99f7ff] bg-[#060e20]/80 px-1 py-0.5 rounded-sm border border-[#1a233a] pointer-events-none whitespace-nowrap">
                    {piece.height}
                  </div>
                ) : null}

                {showWidthLabel ? (
                  <div className="absolute left-1/2 bottom-1 -translate-x-1/2 text-[8px] text-[#99f7ff] bg-[#060e20]/80 px-1 py-0.5 rounded-sm border border-[#1a233a] pointer-events-none">
                    {piece.width}
                  </div>
                ) : null}
              </div>
            );
          })()
        ))}
        </div>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-[#6f7a97]">
        <div className="space-y-1">
          <div><span className="text-[#a3aac4]">Tablero bruto:</span> {boardWidth} × {boardHeight} mm</div>
          <div><span className="text-[#99f7ff]">Área útil:</span> {usableWidth} × {usableHeight} mm</div>
          <div className="flex flex-wrap gap-2 pt-1">
            {insetX > 0 ? <span className="text-[10px] text-amber-200 bg-amber-500/10 px-2 py-1 rounded border border-amber-400/20">Ref. X: {insetX} mm</span> : null}
            {insetY > 0 ? <span className="text-[10px] text-rose-200 bg-rose-500/10 px-2 py-1 rounded border border-rose-400/20">Ref. Y: {insetY} mm</span> : null}
          </div>
        </div>
        <div className="space-y-1 md:text-right">
          <div>{sheet.pieces.filter((piece) => piece.rotated).length} rotadas · área útil {Math.round((usableWidth * usableHeight) / 1000000 * 100) / 100} m²</div>
          <div><span className="text-rose-300">Refilado visual:</span> {Math.round((refiladoArea / 1000000) * 100) / 100} m²</div>
        </div>
      </div>
    </div>
  );
}

export default function DespieceNestingModal({ isOpen, onClose, boardName, boardDimensions, estimatedSheets, pieceCount, estimate, preview, rows = [], boardWidth = 0, boardHeight = 0 }) {
  const [zoom, setZoom] = useState(1);
  const [ignoreBeta, setIgnoreBeta] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [boardMode, setBoardMode] = useState('full');
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

  const effectivePreview = useMemo(() => (
    buildNestingPreview({
      rows,
      boardWidth: modalEstimate.usableLargo || boardWidth || 0,
      boardHeight: modalEstimate.usableAncho || boardHeight || 0,
      kerf: settings.sawKerf ?? 5,
      allowGlobalRotation: ignoreBeta,
    })
  ), [ignoreBeta, rows, settings.sawKerf, modalEstimate.usableLargo, modalEstimate.usableAncho, boardWidth, boardHeight]);

  if (!isOpen) return null;

  const unplacedPiecesCount = effectivePreview?.unplaced?.length || 0;
  const totalBoardArea = (modalEstimate?.boardAncho || 0) * (modalEstimate?.boardLargo || 0) * (effectivePreview?.sheets?.length || 0);
  const placedArea = effectivePreview?.sheets?.reduce((total, sheet) => total + sheet.pieces.reduce((sheetTotal, piece) => sheetTotal + (piece.width * piece.height), 0), 0) || 0;
  const globalUtilization = totalBoardArea > 0 ? (placedArea / totalBoardArea) * 100 : 0;
  const previewColumns = zoom >= 0.95 ? 1 : zoom >= 0.7 ? 2 : 3;
  const previewGridStyle = {
    gridTemplateColumns: `repeat(${previewColumns}, minmax(320px, max-content))`,
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-7xl bg-[#0a1122] border border-[#1a233a] rounded-2xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a233a] bg-[#060e20]">
          <div>
            <h2 className="text-lg font-bold text-white">Optimización de láminas</h2>
            <p className="text-sm text-[#a3aac4] mt-1">{boardName || 'Sin material seleccionado'}{boardDimensions ? ` · ${boardDimensions}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings((prev) => !prev)} className="text-[#a3aac4] hover:text-white inline-flex items-center gap-1 text-sm border border-[#1a233a] rounded-lg px-3 py-2 bg-[#0f172b]">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Ajustes
            </button>
            <button onClick={onClose} className="text-[#a3aac4] hover:text-white"><span className="material-symbols-outlined">close</span></button>
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
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1a233a] bg-[#0f172b] px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3 py-2 rounded-xl bg-[#060e20] border border-[#1a233a]">
                <div className="text-[10px] uppercase tracking-wide text-[#6f7a97]">Láminas</div>
                <div className="text-[#dee5ff] font-bold text-xl">{effectivePreview?.sheets?.length || modalEstimate.estimatedSheets}</div>
              </div>
              <div className="px-3 py-2 rounded-xl bg-[#060e20] border border-[#1a233a]">
                <div className="text-[10px] uppercase tracking-wide text-[#6f7a97]">Piezas</div>
                <div className="text-[#dee5ff] font-bold text-xl">{pieceCount}</div>
              </div>
              <div className="px-3 py-2 rounded-xl bg-[#060e20] border border-[#1a233a]">
                <div className="text-[10px] uppercase tracking-wide text-[#6f7a97]">Uso</div>
                <div className="text-[#99f7ff] font-bold text-xl">{globalUtilization.toFixed(1)}%</div>
              </div>
              <div className="px-3 py-2 rounded-xl bg-[#060e20] border border-[#1a233a]">
                <div className="text-[10px] uppercase tracking-wide text-[#6f7a97]">Sin ubicar</div>
                <div className={`font-bold text-xl ${unplacedPiecesCount > 0 ? 'text-amber-300' : 'text-[#dee5ff]'}`}>{unplacedPiecesCount}</div>
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm text-[#dee5ff] font-medium cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={ignoreBeta}
                onChange={(e) => setIgnoreBeta(e.target.checked)}
                className="w-4 h-4 rounded border-[#40485d] bg-[#060e20] text-[#00e0fe] focus:ring-[#00e0fe]/40"
              />
              <span>No respetar veta</span>
            </label>
          </div>

          <div className="border border-dashed border-[#1a233a] rounded-2xl p-5 bg-[#060e20]/40">
            {effectivePreview?.sheets?.length ? (
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[#dee5ff] font-bold">Visual preliminar de láminas</h3>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-[#a3aac4]">{effectivePreview.sheets.length} láminas generadas</div>
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

                <div className="grid gap-4 justify-center items-start" style={previewGridStyle}>
                  {effectivePreview.sheets.map((sheet) => (
                    <SheetPreview
                      key={sheet.index}
                      sheet={sheet}
                      boardWidth={modalEstimate.boardLargo || boardWidth || 0}
                      boardHeight={modalEstimate.boardAncho || boardHeight || 0}
                      usableWidth={modalEstimate.usableLargo || 0}
                      usableHeight={modalEstimate.usableAncho || 0}
                      insetX={modalEstimate.settings?.refiladoX || 0}
                      insetY={modalEstimate.settings?.refiladoY || 0}
                      zoom={zoom}
                    />
                  ))}
                </div>

                {effectivePreview.unplaced?.length ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 space-y-2">
                    <div>{effectivePreview.unplaced.length} piezas no pudieron ubicarse en la vista preliminar.</div>
                    <div className="flex flex-wrap gap-2">
                      {effectivePreview.unplaced.map((piece) => (
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
