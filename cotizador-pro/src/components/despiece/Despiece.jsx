import { useCallback, useEffect, useMemo, useState } from 'react';
import DespieceTabs from './DespieceTabs';
import DespieceTable from './DespieceTable';
import DespieceCantosPanel from './DespieceCantosPanel';
import { DespieceStatsBar } from './DespieceSummaryPanel';
import { calculateEstimatedSheets, calculateCommercialPacking } from '../../features/despiece/utils/nestingEstimate';
import { buildNestingPreview } from '../../features/despiece/utils/nestingLayout';
import NestingDashboard from './nesting/NestingDashboard';

const API = window.electronAPI;

const createEmptyRow = () => ({
  id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  cantidad: '',
  largo: '',
  ancho: '',
  detalle: '',
  rotar: '',
  l1: '',
  l2: '',
  a1: '',
  a2: ''
});

const createDespiece = () => ({
  id: `desp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  material_id: null,
  cantos: [],
  filas: [createEmptyRow()]
});

function normalizeDespieces(initialData) {
  if (!Array.isArray(initialData) || initialData.length === 0) return [createDespiece()];
  return initialData.map((despiece, index) => ({
    ...despiece,
    id: despiece.id || `desp_${index}`,
    material_id: despiece.material_id || null,
    cantos: Array.isArray(despiece.cantos) ? despiece.cantos : [],
    filas: Array.isArray(despiece.filas) && despiece.filas.length > 0
      ? despiece.filas.map((row, rowIndex) => ({ ...createEmptyRow(), ...row, id: row.id || `row_${index}_${rowIndex}` }))
      : [createEmptyRow()]
  }));
}

export default function Despiece({ initialData = [], onChange, projectName = 'Proyecto sin título', clientName = 'Cliente sin nombre', onStatsChange, onOpenNesting }) {
  const [despieces, setDespieces] = useState(() => normalizeDespieces(initialData));
  const [activeDespieceId, setActiveDespieceId] = useState(() => normalizeDespieces(initialData)[0].id);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [showNestingModal, setShowNestingModal] = useState(false);

  useEffect(() => {
    setDespieces(normalizeDespieces(initialData));
    const next = normalizeDespieces(initialData);
    setActiveDespieceId((prev) => next.some((item) => item.id === prev) ? prev : next[0].id);
  }, [initialData]);

  useEffect(() => {
    const loadInventory = async () => {
      try {
        if (API?.getInventoryItems) {
          const items = await API.getInventoryItems();
          setInventoryItems(Array.isArray(items) ? items : []);
        }
      } catch (error) {
        console.error('Error loading inventory for despiece:', error);
      }
    };
    loadInventory();
  }, []);

  const activeDespiece = useMemo(
    () => despieces.find((item) => item.id === activeDespieceId) || despieces[0],
    [despieces, activeDespieceId]
  );

  const materialOptions = useMemo(
    () => inventoryItems.filter((item) => item.item_type === 'tablero' || item.tipo === 'tablero' || item.type === 'tablero'),
    [inventoryItems]
  );

  const emitChange = useCallback((next) => {
    const nextWithCounts = next.map((despiece) => {
      const material = materialOptions.find((item) => item.id === despiece.material_id) || null;
      if (!material) {
        const { laminaCount, commercialCount, liveOptimizedLaminaCount, ...despieceWithoutCounts } = despiece;
        return despieceWithoutCounts;
      }

      const commercialPackingForDespiece = calculateCommercialPacking({
        rows: despiece.filas || [],
        material,
        settings: {},
      });

      const laminaCountValue = commercialPackingForDespiece?.commercialCount != null
        ? commercialPackingForDespiece.commercialCount
        : 0;
      const resolvedLaminaCount = despiece.liveOptimizedLaminaCount ?? laminaCountValue;

      return {
        ...despiece,
        laminaCount: resolvedLaminaCount,
        commercialCount: resolvedLaminaCount,
      };
    });

    setDespieces(nextWithCounts);
    onChange?.(nextWithCounts);
  }, [onChange, materialOptions]);

  const inventoryCantos = useMemo(
    () => inventoryItems.filter((item) => item.item_type === 'canto' || item.tipo === 'canto' || item.type === 'canto'),
    [inventoryItems]
  );

  const allowedCantoRefs = useMemo(
    () => (activeDespiece?.cantos || []).map((item) => item.ref).filter(Boolean),
    [activeDespiece]
  );

  const piezaCount = useMemo(
    () => (activeDespiece?.filas || []).reduce((total, row) => total + Number((row.cantidad ?? row.cant) || 0), 0),
    [activeDespiece]
  );

  const activeMaterial = useMemo(
    () => materialOptions.find((item) => item.id === activeDespiece?.material_id) || null,
    [materialOptions, activeDespiece]
  );

  const nestingEstimate = useMemo(
    () => calculateEstimatedSheets({ rows: activeDespiece?.filas || [], material: activeMaterial }),
    [activeDespiece, activeMaterial]
  );

  // Compute commercial packing: best scenario (all-full / all-half / mixed) for commercial billing
  const commercialPacking = useMemo(() => {
    if (!activeMaterial || !activeDespiece?.filas?.length) return null;
    return calculateCommercialPacking({
      rows: activeDespiece.filas,
      material: activeMaterial,
      settings: {},
    });
  }, [activeDespiece, activeMaterial]);

  const nestingPreview = useMemo(
    () => buildNestingPreview({
      rows: activeDespiece?.filas || [],
      boardWidth: Number(activeMaterial?.largo_mm || 0),
      boardHeight: Number(activeMaterial?.ancho_mm || 0),
      kerf: nestingEstimate.settings?.sawKerf ?? 5,
      refiladoX: nestingEstimate.settings?.refiladoX ?? 20,
      refiladoY: nestingEstimate.settings?.refiladoY ?? 20,
    }),
    [activeDespiece, nestingEstimate, activeMaterial]
  );

  const laminaCount = useMemo(() => {
    if (!activeMaterial) return nestingEstimate.estimatedSheets;
    if (activeDespiece?.liveOptimizedLaminaCount != null) return activeDespiece.liveOptimizedLaminaCount;
    // Use commercial count (fractional) from commercial packing for UI display
    if (commercialPacking?.commercialCount != null) return commercialPacking.commercialCount;
    return nestingPreview?.sheets?.length ?? nestingEstimate.estimatedSheets;
  }, [activeDespiece?.liveOptimizedLaminaCount, activeMaterial, nestingEstimate.estimatedSheets, nestingPreview, commercialPacking]);

  // Pass stats to parent component
  useEffect(() => {
    if (onStatsChange) {
      onStatsChange({ laminaCount, piezaCount });
    }
  }, [laminaCount, piezaCount, onStatsChange]);

  // Expose the nesting modal control to parent
  useEffect(() => {
    if (onOpenNesting) {
      onOpenNesting(() => () => setShowNestingModal(true));
    }
  }, [onOpenNesting]);

  const boardDimensions = activeMaterial
    ? `${activeMaterial.largo_mm || 0} x ${activeMaterial.ancho_mm || 0} mm`
    : '';

  const patchActiveDespiece = useCallback((patch) => {
    const shouldResetLiveOptimization = Object.prototype.hasOwnProperty.call(patch, 'filas') || Object.prototype.hasOwnProperty.call(patch, 'material_id');
    emitChange(despieces.map((item) => item.id === activeDespieceId
      ? {
          ...item,
          ...patch,
          ...(shouldResetLiveOptimization ? { liveOptimizedLaminaCount: null } : {}),
        }
      : item));
  }, [despieces, activeDespieceId, emitChange]);

  const handleLiveOptimizationChange = useCallback((result) => {
    const liveOptimizedLaminaCount = result?.sheetCount;
    if (liveOptimizedLaminaCount == null) return;

    emitChange(despieces.map((item) => item.id === activeDespieceId
      ? {
          ...item,
          liveOptimizedLaminaCount,
        }
      : item));
  }, [despieces, activeDespieceId, emitChange]);

  const handleAdd = useCallback(() => {
    const next = [...despieces, createDespiece()];
    emitChange(next);
    setActiveDespieceId(next[next.length - 1].id);
  }, [despieces, emitChange]);

  const handleRemove = useCallback((id) => {
    if (despieces.length <= 1) return;
    const next = despieces.filter((item) => item.id !== id);
    emitChange(next);
    if (activeDespieceId === id) setActiveDespieceId(next[0].id);
  }, [despieces, activeDespieceId, emitChange]);

  if (!activeDespiece) return null;

  return (
    <div className="space-y-3">
        {showNestingModal && activeMaterial && activeDespiece && (
          <NestingDashboard
            onClose={() => setShowNestingModal(false)}
            despieceData={{ filas: activeDespiece.filas || [], cantos: activeDespiece.cantos || [] }}
            boardDimensions={{
              width: Number(activeMaterial?.largo_mm || 0),
              height: Number(activeMaterial?.ancho_mm || 0)
            }}
            onOptimizationChange={handleLiveOptimizationChange}
            projectName={projectName}
            clientName={clientName}
            materialName={activeMaterial?.nombre || ''}
          />
        )}

        <DespieceCantosPanel
          cantos={activeDespiece.cantos || []}
          inventoryCantos={inventoryCantos}
          onChange={(cantos) => patchActiveDespiece({ cantos })}
        tabsSlot={(
          <DespieceTabs
            despieces={despieces}
            activeDespieceId={activeDespieceId}
            onSelect={setActiveDespieceId}
            onAdd={handleAdd}
            onRemove={handleRemove}
            materialOptions={materialOptions}
            materialValue={activeDespiece.material_id || ''}
            onMaterialChange={(material_id) => patchActiveDespiece({ material_id })}
          />
        )}
      />

      <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl p-3 overflow-x-auto">
        <DespieceTable
          rows={activeDespiece.filas || []}
          onRowsChange={(updater) => {
            const nextRows = typeof updater === 'function' ? updater(activeDespiece.filas || []) : updater;
            patchActiveDespiece({ filas: nextRows });
          }}
          onRemoveRow={(rowIndex) => {
            const currentRows = activeDespiece.filas || [];
            const nextRows = currentRows.filter((_, index) => index !== rowIndex);
            patchActiveDespiece({ filas: nextRows.length ? nextRows : [createEmptyRow()] });
          }}
          allowedCantoRefs={allowedCantoRefs}
        />
      </div>
    </div>
  );
}
