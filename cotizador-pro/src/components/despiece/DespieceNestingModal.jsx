import { useMemo, useState } from 'react';
import { buildNestingPreview } from '../../features/despiece/utils/nestingLayout';

function SheetPreview({ sheet, boardWidth, boardHeight, zoom = 1 }) {
  const scale = Math.min(1, 520 / Math.max(boardWidth, boardHeight, 1)) * zoom;
  const previewWidth = Math.max(260, Math.round(boardWidth * scale));
  const previewHeight = Math.max(180, Math.round(boardHeight * scale));

  const usedArea = sheet.pieces.reduce((total, piece) => total + (piece.width * piece.height), 0);
  const boardArea = boardWidth * boardHeight;
  const utilization = boardArea > 0 ? (usedArea / boardArea) * 100 : 0;

  return (
    <div className="bg-[#0f172b] border border-[#1a233a] rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[#dee5ff] font-semibold">Lámina {sheet.index}</div>
        <div className="text-[11px] uppercase tracking-wide text-[#6f7a97]">{sheet.pieces.length} piezas</div>
      </div>

      <div className="relative rounded-xl border border-[#1a233a] bg-[#060e20] overflow-hidden" style={{ width: previewWidth, height: previewHeight }}>
        <div className="absolute top-2 left-2 z-10 text-[10px] text-[#6f7a97] bg-[#060e20]/80 px-2 py-1 rounded-md border border-[#1a233a]">
          {boardHeight} × {boardWidth} mm
        </div>
        {sheet.pieces.map((piece) => (
          <div
            key={piece.instanceId}
            className="absolute border border-[#00e0fe]/50 bg-[#00e0fe]/10 text-[#dee5ff] text-[10px] rounded-sm overflow-hidden"
            style={{
              left: Math.round(piece.x * scale),
              top: Math.round(piece.y * scale),
              width: Math.max(24, Math.round(piece.width * scale)),
              height: Math.max(18, Math.round(piece.height * scale)),
            }}
            title={`${piece.label} · ${piece.width}x${piece.height}${piece.rotated ? ' · rotada' : ''}`}
          >
            <div className="px-1 py-0.5 truncate font-semibold">{piece.label}</div>
            <div className="px-1 pb-0.5 text-[9px] text-[#a3aac4] truncate">{piece.width}×{piece.height}{piece.rotated ? ' · R' : ''}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 text-[11px] text-[#6f7a97]">
        <span>Área visible: {Math.round((boardWidth * boardHeight) / 1000000 * 100) / 100} m²</span>
        <span>{sheet.pieces.filter((piece) => piece.rotated).length} rotadas · {utilization.toFixed(1)}% uso</span>
      </div>
    </div>
  );
}

export default function DespieceNestingModal({ isOpen, onClose, boardName, boardDimensions, estimatedSheets, pieceCount, estimate, preview, rows = [] }) {
  const [zoom, setZoom] = useState(1);
  const [ignoreBeta, setIgnoreBeta] = useState(false);
  if (!isOpen) return null;

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

  const placedPiecesCount = effectivePreview?.sheets?.reduce((total, sheet) => total + sheet.pieces.length, 0) || 0;
  const unplacedPiecesCount = effectivePreview?.unplaced?.length || 0;
  const totalBoardArea = (estimate?.usableAncho || 0) * (estimate?.usableLargo || 0) * (effectivePreview?.sheets?.length || 0);
  const placedArea = effectivePreview?.sheets?.reduce((total, sheet) => total + sheet.pieces.reduce((sheetTotal, piece) => sheetTotal + (piece.width * piece.height), 0), 0) || 0;
  const globalUtilization = totalBoardArea > 0 ? (placedArea / totalBoardArea) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#0a1122] border border-[#1a233a] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a233a] bg-[#060e20]">
          <div>
            <h2 className="text-lg font-bold text-white">Optimización de láminas</h2>
            <p className="text-sm text-[#a3aac4] mt-1">Vista preliminar basada en el tablero activo del tab actual.</p>
          </div>
          <button onClick={onClose} className="text-[#a3aac4] hover:text-white"><span className="material-symbols-outlined">close</span></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0f172b] border border-[#1a233a] rounded-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-[#6f7a97] mb-1">Tablero activo</div>
              <div className="text-[#dee5ff] font-semibold">{boardName || 'Sin material seleccionado'}</div>
            </div>
            <div className="bg-[#0f172b] border border-[#1a233a] rounded-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-[#6f7a97] mb-1">Dimensiones</div>
              <div className="text-[#99f7ff] font-bold">{boardDimensions || '—'}</div>
            </div>
            <div className="bg-[#0f172b] border border-[#1a233a] rounded-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-[#6f7a97] mb-1">Piezas</div>
              <div className="text-[#dee5ff] font-bold">{pieceCount}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0f172b] border border-[#1a233a] rounded-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-[#6f7a97] mb-1">Láminas estimadas</div>
              <div className="text-[#dee5ff] font-bold text-2xl">{estimatedSheets}</div>
            </div>
            <div className="bg-[#0f172b] border border-[#1a233a] rounded-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-[#6f7a97] mb-1">Área útil tablero</div>
              <div className="text-[#dee5ff] font-bold">{Math.round((estimate?.boardArea || 0) / 1000000 * 100) / 100} m²</div>
            </div>
            <div className="bg-[#0f172b] border border-[#1a233a] rounded-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-[#6f7a97] mb-1">Aprovechamiento estimado</div>
              <div className="text-[#99f7ff] font-bold">{(estimate?.utilization || 0).toFixed(1)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0f172b] border border-[#1a233a] rounded-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-[#6f7a97] mb-1">Piezas ubicadas</div>
              <div className="text-[#dee5ff] font-bold text-2xl">{placedPiecesCount}</div>
            </div>
            <div className="bg-[#0f172b] border border-[#1a233a] rounded-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-[#6f7a97] mb-1">Piezas sin ubicar</div>
              <div className={`font-bold text-2xl ${unplacedPiecesCount > 0 ? 'text-amber-300' : 'text-[#dee5ff]'}`}>{unplacedPiecesCount}</div>
            </div>
            <div className="bg-[#0f172b] border border-[#1a233a] rounded-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-[#6f7a97] mb-1">Uso global preview</div>
              <div className="text-[#99f7ff] font-bold">{globalUtilization.toFixed(1)}%</div>
            </div>
          </div>

          <div className="bg-[#0f172b] border border-[#1a233a] rounded-2xl p-4">
            <label className="flex items-center gap-3 text-sm text-[#dee5ff] font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={ignoreBeta}
                onChange={(e) => setIgnoreBeta(e.target.checked)}
                className="w-4 h-4 rounded border-[#40485d] bg-[#060e20] text-[#00e0fe] focus:ring-[#00e0fe]/40"
              />
              <span>No respetar veta</span>
              <span className="text-[#6f7a97] text-xs">Permite rotar libremente las piezas para optimizar mejor.</span>
            </label>
          </div>

          <div className="border border-dashed border-[#1a233a] rounded-2xl p-8 text-center bg-[#060e20]/40">
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
                      boardWidth={estimate?.usableAncho || 0}
                      boardHeight={estimate?.usableLargo || 0}
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

                <div className="rounded-xl border border-[#1a233a] bg-[#0f172b] p-4">
                  <h4 className="text-[#dee5ff] font-semibold mb-3">Leyenda</h4>
                  <div className="flex flex-wrap gap-3 text-sm text-[#a3aac4]">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-sm border border-[#00e0fe]/50 bg-[#00e0fe]/10"></span>
                      Pieza ubicada
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#99f7ff] font-bold">R</span>
                      Pieza rotada 90°
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <span className="material-symbols-outlined text-[#40485d] text-5xl">dashboard_customize</span>
                <h3 className="text-[#dee5ff] font-bold mt-3">Visual de nesting sin piezas</h3>
                <p className="text-[#6f7a97] text-sm mt-2 max-w-2xl mx-auto">
                  Agregá piezas válidas y seleccioná un tablero en el tab activo para generar la visual preliminar de las láminas.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
