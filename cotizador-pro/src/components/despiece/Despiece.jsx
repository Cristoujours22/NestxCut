import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DespieceTabs from './DespieceTabs';
import DespieceTable from './DespieceTable';
import DespieceCantosPanel from './DespieceCantosPanel';

const API = window.electronAPI;

const createEmptyRow = () => ({
  id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  cant: '',
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
    id: despiece.id || `desp_${index}`,
    material_id: despiece.material_id || null,
    cantos: Array.isArray(despiece.cantos) ? despiece.cantos : [],
    filas: Array.isArray(despiece.filas) && despiece.filas.length > 0
      ? despiece.filas.map((row, rowIndex) => ({ ...createEmptyRow(), ...row, id: row.id || `row_${index}_${rowIndex}` }))
      : [createEmptyRow()]
  }));
}

export default function Despiece({ initialData = [], onChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [despieces, setDespieces] = useState(() => normalizeDespieces(initialData));
  const [activeDespieceId, setActiveDespieceId] = useState(() => normalizeDespieces(initialData)[0].id);
  const [inventoryItems, setInventoryItems] = useState([]);

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

  const emitChange = useCallback((next) => {
    setDespieces(next);
    onChange?.(next);
  }, [onChange]);

  const activeDespiece = useMemo(
    () => despieces.find((item) => item.id === activeDespieceId) || despieces[0],
    [despieces, activeDespieceId]
  );

  const materialOptions = useMemo(
    () => inventoryItems.filter((item) => item.tipo === 'tablero' || item.type === 'tablero'),
    [inventoryItems]
  );

  const inventoryCantos = useMemo(
    () => inventoryItems.filter((item) => item.tipo === 'canto' || item.type === 'canto'),
    [inventoryItems]
  );

  const allowedCantoRefs = useMemo(
    () => (activeDespiece?.cantos || []).map((item) => item.ref).filter(Boolean),
    [activeDespiece]
  );

  const patchActiveDespiece = useCallback((patch) => {
    emitChange(despieces.map((item) => item.id === activeDespieceId ? { ...item, ...patch } : item));
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

  const isStandaloneRoute = location.pathname === '/despiece';

  return (
    <div className="space-y-4">
      {isStandaloneRoute && (
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="group flex items-center justify-center w-10 h-10 rounded-full bg-[#1a233a]/50 border border-[#40485d]/30 text-[#a3aac4] hover:text-[#99f7ff] hover:bg-[#1a233a] hover:border-[#99f7ff]/50 transition-all shadow-sm"
            title="Volver al dashboard"
          >
            <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
          </button>

          <div>
            <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-[#dee5ff]">Despiece</h1>
            <p className="text-[#a3aac4] text-sm mt-1">Editor de tableros, cantos y piezas</p>
          </div>
        </div>
      )}

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

      <DespieceCantosPanel
        cantos={activeDespiece.cantos || []}
        inventoryCantos={inventoryCantos}
        onChange={(cantos) => patchActiveDespiece({ cantos })}
      />

      <div className="bg-[#0a1122] border border-[#1a233a] rounded-2xl p-4 overflow-x-auto">
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
