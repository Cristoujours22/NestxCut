import { useMemo, useState } from 'react';
import { buildNestingPreview } from '../../features/despiece/utils/nestingLayout';

function SheetPreview({ sheet, boardWidth, boardHeight, usableWidth, usableHeight, insetX = 0, insetY = 0, zoom = 1 }) {
  const scale = Math.min(1, 780 / Math.max(boardWidth, boardHeight, 1)) * zoom;
  const previewWidth = Math.max(420, Math.round(boardWidth * scale));
  const previewHeight = Math.max(260, Math.round(boardHeight * scale));
  const usableLeft = Math.round(insetX * scale);
  const usableTop = Math.round(insetY * scale);
  const usablePreviewWidth = Math.max(0, Math.round(usableWidth * scale));
  const usablePreviewHeight = Math.max(0, Math.round(usableHeight * scale));

  const usedArea = sheet.pieces.reduce((total, piece) => total + (piece.width * piece.height), 0);
  const boardArea = usableWidth * usableHeight;
  const utilization = boardArea > 0 ? (usedArea / boardArea) * 100 : 0;

  return (
    <div className="bg-[#0f172b] border border-[#1a233a] rounded-2xl p-4 space-y-3 w-full max-w-[920px]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[#dee5ff] font-semibold">Lámina {sheet.index}</div>
        <div className="text-[11px] uppercase tracking-wide text-[#6f7a97]">{sheet.pieces.length} piezas · {utilization.toFixed(1)}% uso</div>
      </div>

      <div className="relative rounded-xl border border-[#1a233a] bg-[#060e20] overflow-hidden" style={{ width: previewWidth, height: previewHeight }}>
        <div
          className="absolute border border-dashed border-[#99f7ff]/30 bg-[#0a1122]/20 rounded-sm"
          style={{
            left: usableLeft,
            top: usableTop,
            width: usablePreviewWidth,
            height: usablePreviewHeight,
          }}
        />
        {sheet.pieces.map((piece) => (
          <div
            key={piece.instanceId}
            className="absolute border border-[#00e0fe]/50 bg-[#00e0fe]/10 text-[#dee5ff] text-[10px] rounded-sm overflow-hidden"
            style={{
              left: usableLeft + Math.round(piece.x * scale),
              top: usableTop + Math.round(piece.y * scale),
              width: Math.max(24, Math.min(Math.round(piece.width * scale), usablePreviewWidth - Math.round(piece.x * scale))),
              height: Math.max(18, Math.min(Math.round(piece.height * scale), usablePreviewHeight - Math.round(piece.y * scale))),
            }}
            title={`${piece.label} · ${piece.width}x${piece.height}${piece.rotated ? ' · rotada' : ''}`}
          >
            <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[8px] text-[#99f7ff] bg-[#060e20]/80 px-1 py-0.5 rounded-sm border border-[#1a233a] pointer-events-none whitespace-nowrap">
              {piece.height}
            </div>

            <div className="absolute left-1/2 bottom-1 -translate-x-1/2 text-[8px] text-[#99f7ff] bg-[#060e20]/80 px-1 py-0.5 rounded-sm border border-[#1a233a] pointer-events-none">
              {piece.width}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 text-[11px] text-[#6f7a97]">
        <span>{boardHeight} × {boardWidth} mm</span>
        <span>{sheet.pieces.filter((piece) => piece.rotated).length} rotadas · área útil {Math.round((usableWidth * usableHeight) / 1000000 * 100) / 100} m²</span>
      </div>
    </div>
  );
}

export default function DespieceNestingModal({ isOpen, onClose, boardName, boardDimensions, estimatedSheets, pieceCount, estimate, preview, rows = [], boardWidth = 0, boardHeight = 0 }) {
  const [zoom, setZoom] = useState(1);
  const [ignoreBeta, setIgnoreBeta] = useState(false);

  const effectivePreview = useMemo(() => (
    ignoreBeta
      ? buildNestingPreview({
          rows,
          boardWidth: estimate?.usableAncho || 0,
          boardHeight: estimate?.usableLargo || 0,
          kerf: estimate?.settings?.sawKerf || 5,
          allowGlobalRotation: true,
        })
      : preview
  ), [ignoreBeta, rows, estimate, preview]);

  if (!isOpen) return null;

  const unplacedPiecesCount = effectivePreview?.unplaced?.length || 0;
  const totalBoardArea = (estimate?.usableAncho || 0) * (estimate?.usableLargo || 0) * (effectivePreview?.sheets?.length || 0);
  const placedArea = effectivePreview?.sheets?.reduce((total, sheet) => total + sheet.pieces.reduce((sheetTotal, piece) => sheetTotal + (piece.width * piece.height), 0), 0) || 0;
  const globalUtilization = totalBoardArea > 0 ? (placedArea / totalBoardArea) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-7xl bg-[#0a1122] border border-[#1a233a] rounded-2xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a233a] bg-[#060e20]">
          <div>
            <h2 className="text-lg font-bold text-white">Optimización de láminas</h2>
            <p className="text-sm text-[#a3aac4] mt-1">{boardName || 'Sin material seleccionado'}{boardDimensions ? ` · ${boardDimensions}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-[#a3aac4] hover:text-white"><span className="material-symbols-outlined">close</span></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1a233a] bg-[#0f172b] px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3 py-2 rounded-xl bg-[#060e20] border border-[#1a233a]">
                <div className="text-[10px] uppercase tracking-wide text-[#6f7a97]">Láminas</div>
                <div className="text-[#dee5ff] font-bold text-xl">{effectivePreview?.sheets?.length || estimatedSheets}</div>
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
                      <button type="button" onClick={() => setZoom((prev) => Math.max(0.5, +(prev - 0.1).toFixed(2)))} className="text-[#a3aac4] hover:text-white">
                        <span className="material-symbols-outlined text-[16px]">remove</span>
                      </button>
                      <span className="text-[11px] text-[#dee5ff] w-12 text-center">{Math.round(zoom * 100)}%</span>
                      <button type="button" onClick={() => setZoom((prev) => Math.min(2, +(prev + 0.1).toFixed(2)))} className="text-[#a3aac4] hover:text-white">
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 justify-items-start">
                  {effectivePreview.sheets.map((sheet) => (
                    <SheetPreview
                      key={sheet.index}
                      sheet={sheet}
                      boardWidth={boardWidth || estimate?.usableAncho || 0}
                      boardHeight={boardHeight || estimate?.usableLargo || 0}
                      usableWidth={estimate?.usableAncho || 0}
                      usableHeight={estimate?.usableLargo || 0}
                      insetX={estimate?.settings?.refiladoY || 0}
                      insetY={estimate?.settings?.refiladoX || 0}
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
