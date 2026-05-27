import React, { useEffect, useMemo, useRef, useState } from 'react';
import PuertasTabs from './PuertasTabs';
import { DEFAULT_PUERTA_CONFIG, PUERTAS_TABS } from '../../features/puertas/config/puertasConfig';
import { createPuertaConfig, createPuertaDraft } from '../../features/puertas/utils/puertasModel';
import { calcularPuerta } from '../../features/puertas/utils/puertasCalculations';
import { buildFondosNestingPreview, buildPuertasNestingSummary } from '../../features/puertas/utils/puertasNestingAdapter';
import { filterHerrajesForPuertas } from '../../features/inventory/utils/inventoryStock';
import DespieceNestingModal from '../despiece/DespieceNestingModal';
import PuertasMaterialDropdown from './PuertasMaterialDropdown';
import PuertasMultiSelectDropdown from './PuertasMultiSelectDropdown';

const PUERTAS_NESTING_DEFAULTS = {
  refiladoX: 20,
  refiladoY: 20,
  sawKerf: 5,
  edgeAllowance: 60,
  boardMode: 'full',
};

function SectionCard({ title, icon, description, badge, children }) {
  return (
    <article className="rounded-[28px] border border-[#1a233a] bg-[#0a1122] p-6 shadow-xl transition-transform hover:-translate-y-1 hover:border-[#99f7ff]/25">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="w-12 h-12 rounded-2xl border border-[#40485d]/30 bg-[#10182d] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[#99f7ff]">{icon}</span>
        </div>
        <span className="inline-flex items-center rounded-full border border-[#99f7ff]/15 bg-[#99f7ff]/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#99f7ff]">
          {badge}
        </span>
      </div>

      <h2 className="text-white text-xl font-bold font-['Space_Grotesk'] tracking-[-0.03em] mb-3">
        {title}
      </h2>
      <p className="text-[#a3aac4] text-sm leading-7">
        {description}
      </p>
      {children ? <div className="mt-5">{children}</div> : null}
    </article>
  );
}

function InputField({ label, value, onChange, type = 'number', min = 0, placeholder }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a3aac4]">{label}</span>
      <input
        type={type}
        min={min}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)}
        className="rounded-2xl border border-[#1a233a] bg-[#060e20] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#99f7ff]/40"
      />
    </label>
  );
}

function ConfigField({ label, value, onChange }) {
  return <InputField label={label} value={value} onChange={onChange} />;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesSome(value, keywords = []) {
  const text = normalizeText(value);
  return keywords.some((keyword) => text.includes(keyword));
}

export default function PuertasPage() {
  const [activeTab, setActiveTab] = useState('nueva');
  const [config, setConfig] = useState(() => createPuertaConfig(DEFAULT_PUERTA_CONFIG));
  const [draft, setDraft] = useState(() => createPuertaDraft());
  const [inventoryItems, setInventoryItems] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [showNestingModal, setShowNestingModal] = useState(false);
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [fabricationStatus, setFabricationStatus] = useState({ type: '', message: '' });
  const [isConfirmingFabrication, setIsConfirmingFabrication] = useState(false);
  const [configStatus, setConfigStatus] = useState({ type: '', message: '' });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [historyStatus, setHistoryStatus] = useState({ type: '', message: '' });
  const [historialRecords, setHistorialRecords] = useState([]);
const [draftStatus, setDraftStatus] = useState({ type: '', message: '' });
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftRecords, setDraftRecords] = useState([]);
  const confirmingFabricationRef = useRef(false);
  const inventoryReservationBaselineRef = useRef({});
  const inventoryItemsRef = useRef([]);
  const inventoryReservationSessionIdRef = useRef(`door_draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const reservationSequenceRef = useRef(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const API = window.electronAPI;
        const [items, serviciosResult] = await Promise.all([
          API?.getInventoryItems ? API.getInventoryItems() : Promise.resolve([]),
          API?.getServicios ? API.getServicios() : Promise.resolve([]),
        ]);
        setInventoryItems(Array.isArray(items) ? items : []);
        setServicios(Array.isArray(serviciosResult) ? serviciosResult : []);
        if (API?.getDoorConfig) {
          const savedConfig = await API.getDoorConfig();
          if (savedConfig) setConfig(createPuertaConfig(savedConfig));
        }
      } catch (error) {
        console.error('Error loading puertas dependencies:', error);
      }
    };

    loadData();
  }, []);

  // Load historial when tab changes to historial
  useEffect(() => {
    if (activeTab !== 'historial') return;
    const loadHistorial = async () => {
      try {
        const API = window.electronAPI;
        if (!API?.getDoorFabrications) return;
        const records = await API.getDoorFabrications();
        setHistorialRecords(Array.isArray(records) ? records : []);
      } catch (error) {
        console.error('Error loading historial:', error);
      }
    };
    loadHistorial();
  }, [activeTab]);

  // Load door drafts when tab changes to historial
  useEffect(() => {
    if (activeTab !== 'historial') return;
    const loadDrafts = async () => {
      try {
        const API = window.electronAPI;
        if (!API?.getDoorDrafts) return;
        const drafts = await API.getDoorDrafts();
        setDraftRecords(Array.isArray(drafts) ? drafts : []);
      } catch (error) {
        console.error('Error loading door drafts:', error);
      }
    };
    loadDrafts();
  }, [activeTab]);

  const tableros = useMemo(
    () => inventoryItems.filter((item) => item.item_type === 'tablero'),
    [inventoryItems]
  );

  const tableros6mm = useMemo(
    () => tableros.filter((item) => Number(item.espesor_mm || 0) === 6),
    [tableros]
  );

  const allHerrajes = useMemo(
    () => inventoryItems.filter((item) => item.item_type === 'herraje'),
    [inventoryItems]
  );

  const herrajes = useMemo(() => filterHerrajesForPuertas(allHerrajes), [allHerrajes]);

  const cantos = useMemo(
    () => inventoryItems.filter((item) => item.item_type === 'canto'),
    [inventoryItems]
  );

  const bastidorOptions = useMemo(
    () => tableros.filter((item) => (
      matchesSome(item.nombre, ['pino', 'bastidor', 'liston', 'listón'])
      || matchesSome(item.material, ['pino', 'bastidor', 'liston', 'listón'])
    )),
    [tableros]
  );

  const peganteOptions = useMemo(
    () => allHerrajes.filter((item) => (
      matchesSome(item.nombre, ['pegante', 'cola', 'adhesivo', 'colbon'])
      || matchesSome(item.tipo, ['pegante', 'cola', 'adhesivo'])
    )),
    [allHerrajes]
  );

  const honeycombOptions = useMemo(
    () => allHerrajes.filter((item) => (
      matchesSome(item.nombre, ['honeycomb', 'alma', 'panal', 'abeja'])
      || matchesSome(item.tipo, ['honeycomb', 'alma', 'panal', 'abeja'])
    )),
    [allHerrajes]
  );

  const selectedMaterial = useMemo(
    () => tableros6mm.find((item) => item.id === draft.material.materialId) || null,
    [tableros6mm, draft.material.materialId]
  );

  const selectedBastidor = useMemo(
    () => bastidorOptions.find((item) => item.id === draft.insumosSeleccionados?.bastidorItemId) || null,
    [bastidorOptions, draft.insumosSeleccionados?.bastidorItemId]
  );

  const selectedPegante = useMemo(
    () => peganteOptions.find((item) => item.id === draft.insumosSeleccionados?.peganteItemId) || null,
    [peganteOptions, draft.insumosSeleccionados?.peganteItemId]
  );

  const selectedHoneycomb = useMemo(
    () => honeycombOptions.find((item) => item.id === draft.insumosSeleccionados?.honeycombItemId) || null,
    [honeycombOptions, draft.insumosSeleccionados?.honeycombItemId]
  );

  const selectedCanto = useMemo(
    () => cantos.find((item) => item.id === draft.insumosSeleccionados?.cantoItemId) || null,
    [cantos, draft.insumosSeleccionados?.cantoItemId]
  );

  const calculation = useMemo(() => calcularPuerta(draft, config), [draft, config]);


  const supplyValidation = useMemo(() => {
    const selectedIsFondo6mm = Boolean(selectedMaterial) && Number(selectedMaterial.espesor_mm || 0) === 6;
    const ownReservedMap = inventoryReservationBaselineRef.current || {};
    const available = (item) => item
      ? Number(item.cantidad_disponible || 0) - Math.max(0, Number(item.cantidad_reservada || 0) - Number(ownReservedMap[item.id] || 0))
      : 0;

    const qtyDoors = Math.max(1, Number(draft.cantidad || 1));
    const bastidorQty = (calculation?.estructuraInterna?.bastidores || []).reduce((acc, piece) => acc + Number(piece.cantidad || 0), 0) * qtyDoors;
    const peganteQty = Math.max(1, Math.ceil(Number(calculation?.estructuraInterna?.pegante?.cantidad || 0))) * qtyDoors;
    const honeycombQty = Number(calculation?.estructuraInterna?.alma?.cantidad || 0) * qtyDoors;
    const cantoQty = Math.max(1, Math.ceil(Number(calculation?.estructuraInterna?.canto?.linealesMm || 0) / 1000)) * qtyDoors;

    const pinoExists = Boolean(selectedBastidor) && available(selectedBastidor) >= bastidorQty;
    const peganteExists = Boolean(selectedPegante) && available(selectedPegante) >= peganteQty;
    const honeycombExists = Boolean(selectedHoneycomb) && available(selectedHoneycomb) >= honeycombQty;
    const cantoExists = Boolean(selectedCanto) && available(selectedCanto) >= cantoQty;

    const checks = [
      {
        key: 'fondo6mm',
        label: 'Fondo 6mm en Tablero/Material',
        ok: selectedIsFondo6mm,
        help: 'El tablero base seleccionado debe tener espesor 6 mm.',
      },
      {
        key: 'pino',
        label: 'Pino / bastidor en Tablero/Material',
        ok: pinoExists,
        help: 'Debe existir un item de pino o bastidor en Tablero/Material.',
      },
      {
        key: 'pegante',
        label: 'Pegante en Herrajes',
        ok: peganteExists,
        help: 'Debe existir un item de pegante en Herrajes.',
      },
      {
        key: 'honeycomb',
        label: 'Honeycomb / alma en Herrajes',
        ok: honeycombExists,
        help: 'Debe existir un item de honeycomb o alma en Herrajes.',
      },
      {
        key: 'canto',
        label: 'Canto en Cantos',
        ok: cantoExists,
        help: 'Debe existir al menos un item de canto en Cantos.',
      },
    ];

    return {
      checks,
      missing: checks.filter((check) => !check.ok),
      canFabricate: checks.every((check) => check.ok),
    };
  }, [selectedMaterial, selectedBastidor, selectedPegante, selectedHoneycomb, selectedCanto, calculation, draft.cantidad]);

  const selectedHerrajes = useMemo(
    () => draft.herrajesSeleccionados
      .map((selected) => {
        const item = allHerrajes.find((entry) => entry.id === selected.id);
        return item ? { ...item, selectedQuantity: Number(selected.cantidad || 1) } : null;
      })
      .filter(Boolean),
    [allHerrajes, draft.herrajesSeleccionados]
  );

  useEffect(() => {
    inventoryItemsRef.current = inventoryItems;
  }, [inventoryItems]);

  const selectedServicios = useMemo(
    () => draft.serviciosSeleccionados
      .map((selected) => {
        const item = servicios.find((entry) => entry.id === selected.id);
        return item ? { ...item, selectedQuantity: Number(selected.cantidad || 1) } : null;
      })
      .filter(Boolean),
    [servicios, draft.serviciosSeleccionados]
  );

  const scrapInventoryItems = useMemo(
    () => inventoryItems.filter((item) => {
      const code = String(item.codigo || '').toUpperCase();
      const location = String(item.ubicacion || '').toLowerCase();
      return item.item_type === 'tablero' && (code.startsWith('SCRAP-') || location.includes('sobrantes puertas'));
    }),
    [inventoryItems]
  );

  const scrapSuggestions = useMemo(() => {
    if (!selectedMaterial) return [];

    const fondos = calculation?.estructuraInterna?.fondos || [];
    const bastidores = calculation?.estructuraInterna?.bastidores || [];
    const recibidorPieces = calculation?.recibidor?.piezas || [];
    const marcoPieces = calculation?.marco?.piezas || [];

    const candidatePieces = [
      ...fondos.map((piece) => ({ ...piece, suggestionCategory: 'Fondo exterior' })),
      ...bastidores.map((piece) => ({ ...piece, suggestionCategory: 'Bastidor interno' })),
      ...recibidorPieces.map((piece) => ({ ...piece, suggestionCategory: 'Recibidor' })),
      ...marcoPieces.map((piece) => ({ ...piece, suggestionCategory: 'Marco' })),
    ];

    if (!candidatePieces.length) return [];

    const materialRef = String(selectedMaterial.material || selectedMaterial.nombre || '').trim().toLowerCase();
    const espesorRef = Number(selectedMaterial.espesor_mm || 0);

    return scrapInventoryItems
      .filter((scrap) => {
        const scrapMaterial = String(scrap.material || scrap.nombre || '').trim().toLowerCase();
        const sameMaterial = !materialRef || scrapMaterial === materialRef;
        const sameThickness = !espesorRef || Number(scrap.espesor_mm || 0) === espesorRef;
        return sameMaterial && sameThickness;
      })
      .map((scrap) => {
        const largo = Number(scrap.largo_mm || 0);
        const ancho = Number(scrap.ancho_mm || 0);
        const matchingPieces = candidatePieces.filter((piece) => {
          const pieceLargo = Number(piece.largoMm || 0);
          const pieceAncho = Number(piece.anchoMm || 0);
          const fitsNormal = largo >= pieceLargo && ancho >= pieceAncho;
          const fitsRotated = largo >= pieceAncho && ancho >= pieceLargo;
          return fitsNormal || fitsRotated;
        });

        return {
          ...scrap,
          matchingPieces,
          canBeUsed: matchingPieces.length > 0,
        };
      })
      .filter((scrap) => scrap.canBeUsed)
      .sort((a, b) => b.matchingPieces.length - a.matchingPieces.length);
  }, [selectedMaterial, scrapInventoryItems, calculation]);

  const nestingData = useMemo(() => {
    if (!selectedMaterial) return null;

    return buildPuertasNestingSummary({
      hoja: calculation.hoja,
      config,
      cantidad: draft.cantidad,
      fondoMaterial: selectedMaterial,
      bastidorItem: selectedBastidor,
      settings: {
        refiladoX: PUERTAS_NESTING_DEFAULTS.refiladoX,
        refiladoY: PUERTAS_NESTING_DEFAULTS.refiladoY,
        sawKerf: PUERTAS_NESTING_DEFAULTS.sawKerf,
        edgeAllowance: PUERTAS_NESTING_DEFAULTS.edgeAllowance,
      },
      boardMode: PUERTAS_NESTING_DEFAULTS.boardMode,
    });
  }, [selectedMaterial, selectedBastidor, calculation.hoja, config, draft.cantidad]);

  const selectedSupplyItemsWithQty = useMemo(() => {
    const qtyDoors = Math.max(1, Number(draft.cantidad || 1));
    const bastidorQty = (calculation?.estructuraInterna?.bastidores || []).reduce((acc, item) => acc + Number(item.cantidad || 0), 0) * qtyDoors;
    const honeycombQty = Number(calculation?.estructuraInterna?.alma?.cantidad || 0) * qtyDoors;
    const peganteQty = Math.max(1, Math.ceil(Number(calculation?.estructuraInterna?.pegante?.cantidad || 0))) * qtyDoors;
    const cantoQty = Math.max(1, Math.ceil(Number(calculation?.estructuraInterna?.canto?.linealesMm || 0) / 1000)) * qtyDoors;

    return [
      selectedMaterial && nestingData?.estimate?.estimatedSheets ? { item: selectedMaterial, qty: Number(nestingData.estimate.estimatedSheets || 0), kind: 'material' } : null,
      selectedBastidor ? { item: selectedBastidor, qty: bastidorQty, kind: 'bastidor' } : null,
      selectedPegante ? { item: selectedPegante, qty: peganteQty, kind: 'pegante' } : null,
      selectedHoneycomb ? { item: selectedHoneycomb, qty: honeycombQty, kind: 'honeycomb' } : null,
      selectedCanto ? { item: selectedCanto, qty: cantoQty, kind: 'canto' } : null,
      ...selectedHerrajes.map((item) => ({ item, qty: Number(item.selectedQuantity || 0), kind: 'herraje' })),
    ].filter(Boolean);
  }, [selectedMaterial, nestingData, selectedBastidor, selectedPegante, selectedHoneycomb, selectedCanto, selectedHerrajes, calculation, draft.cantidad]);

  const reservedInventoryTargets = useMemo(() => {
    const map = {};

    selectedSupplyItemsWithQty.forEach(({ item, qty }) => {
      if (!item?.id) return;
      map[item.id] = (map[item.id] || 0) + Number(qty || 0);
    });

    return map;
  }, [selectedSupplyItemsWithQty]);

  const nestingInterpretation = useMemo(() => {
    if (!nestingData?.fondos?.preview?.sheets?.length || !nestingData?.fondos?.estimate) return null;

    const primarySheet = nestingData.fondos.preview.sheets[0];
    const freeRects = [...(primarySheet?.freeRects || [])]
      .map((rect) => ({
        ...rect,
        area: Number(rect.width || 0) * Number(rect.height || 0),
      }))
      .sort((a, b) => b.area - a.area);

    return {
      usableLargo: nestingData.fondos.estimate.usableLargo,
      usableAncho: nestingData.fondos.estimate.usableAncho,
      freeRects,
    };
  }, [nestingData]);

  const costSummary = useMemo(() => {
    // Use actual nested sheet counts from the combined nesting summary
    const fondoSheets = nestingData?.fondos?.sheetCount || 0;
    const bastidorSheets = nestingData?.bastidores?.sheetCount || 0;

    const fondoCost = Number(selectedMaterial?.costo_unitario || 0) * fondoSheets;
    const bastidorCost = Number(selectedBastidor?.costo_unitario || 0) * bastidorSheets;
    const materialCost = fondoCost + bastidorCost;

    // Pegante cost
    const peganteCost = selectedPegante
      ? (Number(selectedPegante.costo_unitario || 0) * Math.max(1, Math.ceil(Number(calculation?.estructuraInterna?.pegante?.cantidad || 0))) * Math.max(1, Number(draft.cantidad || 1)))
      : 0;

    // Canto cost
    const cantoCost = selectedCanto
      ? (Number(selectedCanto.costo_unitario || 0) * Math.max(1, Math.ceil(Number(calculation?.estructuraInterna?.canto?.linealesMm || 0) / 1000)) * Math.max(1, Number(draft.cantidad || 1)))
      : 0;

    const hardwareCost = selectedHerrajes.reduce((total, item) => total + (Number(item.costo_unitario || 0) * Number(item.selectedQuantity || 1)), 0);
    const servicesCost = selectedServicios.reduce((total, item) => total + (Number(item.precio_base || item.precio || 0) * Number(item.selectedQuantity || 1)), 0);

    const unitDoorCost = Math.max(1, Number(draft.cantidad || 1)) > 0
      ? (materialCost + peganteCost + cantoCost + hardwareCost + servicesCost) / Math.max(1, Number(draft.cantidad || 1))
      : 0;

    return {
      materialCost,
      fondoCost,
      bastidorCost,
      peganteCost,
      cantoCost,
      hardwareCost,
      servicesCost,
      total: materialCost + peganteCost + cantoCost + hardwareCost + servicesCost,
      unitDoorCost,
      // Expose sheet counts for UI
      fondoSheets,
      bastidorSheets,
    };
  }, [selectedMaterial, selectedBastidor, selectedPegante, selectedCanto, selectedHerrajes, selectedServicios, nestingData, calculation, draft.cantidad]);

  const updateDraft = (path, value) => {
    setDraft((current) => {
      const next = structuredClone(current);
      if (path.startsWith('vano.')) {
        next.vano[path.replace('vano.', '')] = value;
      } else if (path.startsWith('insumosSeleccionados.')) {
        next.insumosSeleccionados[path.replace('insumosSeleccionados.', '')] = value;
      } else if (path.startsWith('material.')) {
        next.material[path.replace('material.', '')] = value;
      } else {
        next[path] = value;
      }
      return next;
    });
  };

  const handleMaterialChange = (materialId) => {
    const material = tableros6mm.find((item) => item.id === materialId) || null;
    setDraft((current) => ({
      ...current,
      material: {
        materialId: material?.id || null,
        nombre: material?.nombre || '',
        color: material?.material || material?.nombre || '',
      },
    }));
  };

  const toggleHerraje = (item) => {
    setDraft((current) => {
      const exists = current.herrajesSeleccionados.some((selected) => selected.id === item.id);
      return {
        ...current,
        herrajesSeleccionados: exists
          ? current.herrajesSeleccionados.filter((selected) => selected.id !== item.id)
          : [...current.herrajesSeleccionados, { id: item.id, cantidad: 1 }],
      };
    });
  };

  const updateHerrajeQuantity = (id, nextQuantity) => {
    setDraft((current) => ({
      ...current,
      herrajesSeleccionados: current.herrajesSeleccionados.map((selected) => (
        selected.id === id
          ? { ...selected, cantidad: Math.max(1, Number(nextQuantity || 1)) }
          : selected
      )),
    }));
  };

  const toggleServicio = (item) => {
    setDraft((current) => {
      const exists = current.serviciosSeleccionados.some((selected) => selected.id === item.id);
      return {
        ...current,
        serviciosSeleccionados: exists
          ? current.serviciosSeleccionados.filter((selected) => selected.id !== item.id)
          : [...current.serviciosSeleccionados, { id: item.id, cantidad: 1 }],
      };
    });
  };

  const updateServicioQuantity = (id, nextQuantity) => {
    setDraft((current) => ({
      ...current,
      serviciosSeleccionados: current.serviciosSeleccionados.map((selected) => (
        selected.id === id
          ? { ...selected, cantidad: Math.max(1, Number(nextQuantity || 1)) }
          : selected
      )),
    }));
  };

  useEffect(() => {
    const API = window.electronAPI;
    if (!API?.updateInventoryItem || !API?.addInventoryMovement) return;

    const nextMap = reservedInventoryTargets;
    const previousMap = inventoryReservationBaselineRef.current || {};
    const currentSequence = ++reservationSequenceRef.current;

    const changes = Object.keys({ ...previousMap, ...nextMap }).map((itemId) => ({
      itemId,
      delta: Number(nextMap[itemId] || 0) - Number(previousMap[itemId] || 0),
    })).filter((entry) => entry.delta !== 0);

    if (!changes.length) return;

    Promise.all(changes.map(async ({ itemId, delta }) => {
      const inventoryItem = inventoryItemsRef.current.find((item) => item.id === itemId);
      if (!inventoryItem) return { itemId, skipped: true };

      const stockReal = Number(inventoryItem.cantidad_disponible || 0) - Number(inventoryItem.cantidad_reservada || 0);
      if (delta > 0 && delta > stockReal) {
        return {
          itemId,
          conflict: true,
          message: `Sin stock suficiente para reservar item: ${inventoryItem.nombre}`,
        };
      }

      const nextReserved = Math.max(0, Number(inventoryItem.cantidad_reservada || 0) + delta);
      await API.updateInventoryItem({ ...inventoryItem, cantidad_reservada: nextReserved });
      await API.addInventoryMovement({
        item_id: inventoryItem.id,
        item_name_snapshot: inventoryItem.nombre,
        item_type_snapshot: inventoryItem.item_type,
        movement_type: delta > 0 ? 'door_reserve' : 'door_release',
        direction: 'neutral',
        cantidad: Math.abs(delta),
        unit_cost: Number(inventoryItem.costo_unitario || 0),
        total_cost: Number(inventoryItem.costo_unitario || 0) * Math.abs(delta),
        reference_type: 'door_draft',
        reference_id: inventoryReservationSessionIdRef.current,
        motivo: delta > 0 ? 'Reserva temporal para puerta en edición' : 'Liberación de reserva temporal de puerta',
      });

      return { itemId, nextReserved, applied: true };
    })).then((results) => {
      if (currentSequence !== reservationSequenceRef.current) return;

      const nextBaseline = { ...previousMap };
      let conflictMessage = '';

      results.forEach((result) => {
        if (!result) return;
        if (result.conflict && !conflictMessage) conflictMessage = result.message;
        if (result.applied) {
          nextBaseline[result.itemId] = Number(nextMap[result.itemId] || 0);
        }
      });

      inventoryReservationBaselineRef.current = nextBaseline;

      const reservedById = Object.fromEntries(results.filter((r) => r?.applied).map((r) => [r.itemId, r.nextReserved]));
      if (Object.keys(reservedById).length) {
        setInventoryItems((prev) => prev.map((item) => (
          reservedById[item.id] !== undefined ? { ...item, cantidad_reservada: reservedById[item.id] } : item
        )));
      }

      if (conflictMessage) {
        setFabricationStatus({ type: 'error', message: conflictMessage });
      }
    }).catch((error) => {
      if (currentSequence !== reservationSequenceRef.current) return;
      console.error('Error reservando insumos para puerta', error);
      setFabricationStatus({ type: 'error', message: error?.message || 'Conflicto de stock en insumos.' });
    });
  }, [reservedInventoryTargets]);

  useEffect(() => {
    return () => {
      const API = window.electronAPI;
      if (!API?.updateInventoryItem || !API?.addInventoryMovement) return;
      const baseline = inventoryReservationBaselineRef.current || {};
      const entries = Object.entries(baseline).filter(([, qty]) => Number(qty || 0) > 0);
      if (!entries.length) return;

      Promise.all(entries.map(async ([itemId, qty]) => {
        const inventoryItem = inventoryItemsRef.current.find((item) => item.id === itemId);
        if (!inventoryItem) return;
        const nextReserved = Math.max(0, Number(inventoryItem.cantidad_reservada || 0) - Number(qty || 0));
        await API.updateInventoryItem({ ...inventoryItem, cantidad_reservada: nextReserved });
        await API.addInventoryMovement({
          item_id: inventoryItem.id,
          item_name_snapshot: inventoryItem.nombre,
          item_type_snapshot: inventoryItem.item_type,
          movement_type: 'door_release',
          direction: 'neutral',
          cantidad: Number(qty || 0),
          unit_cost: Number(inventoryItem.costo_unitario || 0),
          total_cost: Number(inventoryItem.costo_unitario || 0) * Number(qty || 0),
          reference_type: 'door_draft',
          reference_id: inventoryReservationSessionIdRef.current,
          motivo: 'Liberación automática al salir del módulo Puertas',
        });
      })).catch((error) => {
        console.error('Error liberando reserva temporal de insumos', error);
      });
    };
  }, []);

  const buildScrapItemsFromPreview = () => {
    if (!nestingData?.fondos?.preview?.sheets?.length || !selectedMaterial) return [];

    const timestamp = Date.now();
    const scraps = [];

    nestingData.fondos.preview.sheets.forEach((sheet) => {
      (sheet.freeRects || []).forEach((rect, index) => {
        if (Number(rect.width || 0) < 120 || Number(rect.height || 0) < 120) return;

        scraps.push({
          codigo: `SCRAP-${timestamp}-${sheet.index}-${index}`,
          nombre: `Sobrante ${selectedMaterial.nombre} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
          item_type: 'tablero',
          material: selectedMaterial.material || selectedMaterial.nombre || draft.material.color || '',
          espesor_mm: Number(selectedMaterial.espesor_mm || 0),
          largo_mm: Math.round(rect.width),
          ancho_mm: Math.round(rect.height),
          cantidad_disponible: 1,
          cantidad_reservada: 0,
          stock_minimo: 0,
          stock_objetivo: 0,
          costo_unitario: Number(selectedMaterial.costo_unitario || 0),
          ubicacion: selectedMaterial.ubicacion || 'Sobrantes puertas',
          proveedor_id: selectedMaterial.proveedor_id || '',
        });
      });
    });

    return scraps;
  };

  const confirmFabrication = async () => {
    if (!selectedMaterial || !nestingData) return;
    if (confirmingFabricationRef.current) return;

    const API = window.electronAPI;
    if (!API?.updateInventoryItem || !API?.addInventoryMovement || !API?.addInventoryItem) {
      setFabricationStatus({
        type: 'error',
        message: 'Faltan métodos de inventario disponibles en electronAPI para confirmar fabricación.',
      });
      return;
    }

    if (!supplyValidation.canFabricate) {
      setFabricationStatus({
        type: 'error',
        message: `No se puede fabricar. Faltan insumos requeridos: ${supplyValidation.missing.map((item) => item.label).join(', ')}.`,
      });
      return;
    }

    const requiredBoards = Number(nestingData.estimate?.estimatedSheets || 0);
    const ownReservedMap = inventoryReservationBaselineRef.current || {};
    const availableBoards = Number(selectedMaterial.cantidad_disponible || 0) - Math.max(0, Number(selectedMaterial.cantidad_reservada || 0) - Number(ownReservedMap[selectedMaterial.id] || 0));

    if (requiredBoards <= 0) {
      setFabricationStatus({ type: 'error', message: 'No hay tableros calculados para fabricar esta puerta.' });
      return;
    }

    if (availableBoards < requiredBoards) {
      setFabricationStatus({
        type: 'error',
        message: `No alcanza el stock del tablero base. Disponible: ${availableBoards}, requerido: ${requiredBoards}.`,
      });
      return;
    }

    const selectedHardwareWithQty = draft.herrajesSeleccionados
      .map((selected) => {
        const item = allHerrajes.find((entry) => entry.id === selected.id);
        return item ? { ...item, selectedQuantity: Number(selected.cantidad || 1) } : null;
      })
      .filter(Boolean);

    const insufficientHardware = selectedHardwareWithQty.find((item) => {
      const real = Number(item.cantidad_disponible || 0) - Math.max(0, Number(item.cantidad_reservada || 0) - Number(ownReservedMap[item.id] || 0));
      return real < Number(item.selectedQuantity || 0);
    });

    if (insufficientHardware) {
      setFabricationStatus({
        type: 'error',
        message: `No alcanza el stock de ${insufficientHardware.nombre}.`,
      });
      return;
    }

    confirmingFabricationRef.current = true;
    setIsConfirmingFabrication(true);
    setFabricationStatus({ type: '', message: '' });

    const rollbackInventorySnapshots = [];
    const createdScrapInventoryIds = [];
    const createdMovementIds = [];

    const rememberInventorySnapshot = (item) => {
      if (!item?.id) return;
      if (rollbackInventorySnapshots.some((entry) => entry.id === item.id)) return;
      rollbackInventorySnapshots.push({ ...item });
    };

    try {
      const referenceId = `door_prod_${Date.now()}`;

      const nextBoardQty = Number(selectedMaterial.cantidad_disponible || 0) - requiredBoards;
      const nextBoardReserved = Math.max(0, Number(selectedMaterial.cantidad_reservada || 0) - requiredBoards);
      rememberInventorySnapshot(selectedMaterial);
      await API.updateInventoryItem({
        ...selectedMaterial,
        cantidad_disponible: nextBoardQty,
        cantidad_reservada: nextBoardReserved,
      });

      const boardMovement = await API.addInventoryMovement({
        item_id: selectedMaterial.id,
        item_name_snapshot: selectedMaterial.nombre,
        item_type_snapshot: selectedMaterial.item_type,
        movement_type: 'door_production_material_out',
        direction: 'out',
        cantidad: requiredBoards,
        unit_cost: Number(selectedMaterial.costo_unitario || 0),
        total_cost: Number(selectedMaterial.costo_unitario || 0) * requiredBoards,
        reference_type: 'door_production',
        reference_id: referenceId,
        motivo: `Fabricación puerta ${draft.nombre || `${calculation.hoja.altoMm}x${calculation.hoja.anchoMm}`}`,
      });
      if (boardMovement?.id) createdMovementIds.push(boardMovement.id);

      const supplyItemsToConsume = [
        selectedBastidor ? { item: selectedBastidor, qty: (calculation?.estructuraInterna?.bastidores || []).reduce((acc, piece) => acc + Number(piece.cantidad || 0), 0) * Math.max(1, Number(draft.cantidad || 1)), movement: 'door_production_bastidor_out' } : null,
        selectedPegante ? { item: selectedPegante, qty: Math.max(1, Math.ceil(Number(calculation?.estructuraInterna?.pegante?.cantidad || 0))) * Math.max(1, Number(draft.cantidad || 1)), movement: 'door_production_pegante_out' } : null,
        selectedHoneycomb ? { item: selectedHoneycomb, qty: Number(calculation?.estructuraInterna?.alma?.cantidad || 0) * Math.max(1, Number(draft.cantidad || 1)), movement: 'door_production_honeycomb_out' } : null,
        selectedCanto ? { item: selectedCanto, qty: Math.max(1, Math.ceil(Number(calculation?.estructuraInterna?.canto?.linealesMm || 0) / 1000)) * Math.max(1, Number(draft.cantidad || 1)), movement: 'door_production_canto_out' } : null,
      ].filter((entry) => entry && Number(entry.qty || 0) > 0);

      for (const entry of supplyItemsToConsume) {
        const nextQty = Number(entry.item.cantidad_disponible || 0) - Number(entry.qty || 0);
        const nextReserved = Math.max(0, Number(entry.item.cantidad_reservada || 0) - Number(entry.qty || 0));
        rememberInventorySnapshot(entry.item);
        await API.updateInventoryItem({
          ...entry.item,
          cantidad_disponible: nextQty,
          cantidad_reservada: nextReserved,
        });

        const supplyMovement = await API.addInventoryMovement({
          item_id: entry.item.id,
          item_name_snapshot: entry.item.nombre,
          item_type_snapshot: entry.item.item_type,
          movement_type: entry.movement,
          direction: 'out',
          cantidad: Number(entry.qty || 0),
          unit_cost: Number(entry.item.costo_unitario || 0),
          total_cost: Number(entry.item.costo_unitario || 0) * Number(entry.qty || 0),
          reference_type: 'door_production',
          reference_id: referenceId,
          motivo: `Insumo puerta ${draft.nombre || `${calculation.hoja.altoMm}x${calculation.hoja.anchoMm}`}`,
        });
        if (supplyMovement?.id) createdMovementIds.push(supplyMovement.id);
      }

      for (const item of selectedHardwareWithQty) {
        const nextQty = Number(item.cantidad_disponible || 0) - Number(item.selectedQuantity || 0);
        const nextReserved = Math.max(0, Number(item.cantidad_reservada || 0) - Number(item.selectedQuantity || 0));
        rememberInventorySnapshot(item);
        await API.updateInventoryItem({
          ...item,
          cantidad_disponible: nextQty,
          cantidad_reservada: nextReserved,
        });

        const hardwareMovement = await API.addInventoryMovement({
          item_id: item.id,
          item_name_snapshot: item.nombre,
          item_type_snapshot: item.item_type,
          movement_type: 'door_production_hardware_out',
          direction: 'out',
          cantidad: Number(item.selectedQuantity || 0),
          unit_cost: Number(item.costo_unitario || 0),
          total_cost: Number(item.costo_unitario || 0) * Number(item.selectedQuantity || 0),
          reference_type: 'door_production',
          reference_id: referenceId,
          motivo: `Complemento puerta ${draft.nombre || `${calculation.hoja.altoMm}x${calculation.hoja.anchoMm}`}`,
        });
        if (hardwareMovement?.id) createdMovementIds.push(hardwareMovement.id);
      }

      inventoryReservationBaselineRef.current = {};

      const scrapItems = buildScrapItemsFromPreview();
      for (const scrap of scrapItems) {
        const response = await API.addInventoryItem(scrap);
        if (response?.id) {
          createdScrapInventoryIds.push(response.id);
          const scrapMovement = await API.addInventoryMovement({
            item_id: response.id,
            item_name_snapshot: scrap.nombre,
            item_type_snapshot: scrap.item_type,
            movement_type: 'door_production_scrap_in',
            direction: 'in',
            cantidad: 1,
            unit_cost: Number(scrap.costo_unitario || 0),
            total_cost: Number(scrap.costo_unitario || 0),
            reference_type: 'door_production',
            reference_id: referenceId,
            motivo: `Alta sobrante reutilizable ${draft.nombre || `${calculation.hoja.altoMm}x${calculation.hoja.anchoMm}`}`,
          });
          if (scrapMovement?.id) createdMovementIds.push(scrapMovement.id);
        }
      }

      const refreshedItems = API?.getInventoryItems ? await API.getInventoryItems() : [];
      setInventoryItems(Array.isArray(refreshedItems) ? refreshedItems : []);

      // Persist fabrication record
      try {
        await API.saveDoorFabrication({
          nombre: draft.nombre || '',
          cantidad: Number(draft.cantidad || 1),
          input: {
            vano: { ...draft.vano },
            materialColor: draft.material.color,
          },
          calculationSnapshot: {
            hoja: calculation.hoja,
            recibidor: calculation.recibidor,
            marco: calculation.marco,
            estructuraInterna: calculation.estructuraInterna,
          },
          selectedMaterial: selectedMaterial ? {
            id: selectedMaterial.id,
            nombre: selectedMaterial.nombre,
            largo_mm: selectedMaterial.largo_mm,
            ancho_mm: selectedMaterial.ancho_mm,
            costo_unitario: selectedMaterial.costo_unitario,
          } : null,
          selectedSupplies: {
            bastidor: selectedBastidor ? { id: selectedBastidor.id, nombre: selectedBastidor.nombre } : null,
            pegante: selectedPegante ? { id: selectedPegante.id, nombre: selectedPegante.nombre } : null,
            honeycomb: selectedHoneycomb ? { id: selectedHoneycomb.id, nombre: selectedHoneycomb.nombre } : null,
            canto: selectedCanto ? { id: selectedCanto.id, nombre: selectedCanto.nombre } : null,
          },
          selectedHerrajes: selectedHardwareWithQty.map((item) => ({
            id: item.id,
            nombre: item.nombre,
            cantidad: item.selectedQuantity,
            costo_unitario: item.costo_unitario,
          })),
          selectedServicios: selectedServicios.map((item) => ({
            id: item.id,
            nombre: item.nombre,
            cantidad: item.selectedQuantity || 1,
            precio: item.precio_base || item.precio || 0,
          })),
          nestingSummary: {
            estimatedSheets: nestingData.summary.totalSheets,
            fondosSheets: nestingData.summary.fondosSheetCount,
            bastidoresSheets: nestingData.summary.bastidoresSheetCount,
            utilization: nestingData.summary.avgUtilization,
            totalPieces: nestingData.summary.totalPieces,
            unplacedCount: nestingData.fondos?.preview?.unplaced?.length || 0,
            almaStatus: 'pending',
          },
          inventoryImpact: {
            boardsConsumed: requiredBoards,
            herrajesConsumed: selectedHardwareWithQty.length,
            scrapsGenerated: scrapItems.length,
          },
          totals: {
            materialCost: costSummary.materialCost,
            hardwareCost: costSummary.hardwareCost,
            servicesCost: costSummary.servicesCost,
            total: costSummary.total,
            unitDoorCost: costSummary.unitDoorCost,
          },
          scrapsCreated: scrapItems.map((s) => ({
            id: s.codigo,
            nombre: s.nombre,
            dimensions: `${s.largo_mm} x ${s.ancho_mm}`,
          })),
        });
      } catch (fabError) {
        console.warn('Could not persist fabrication record:', fabError);
      }

      setFabricationStatus({
        type: 'success',
        message: `Fabricación confirmada. Se descontaron ${requiredBoards} tableros y se generaron ${scrapItems.length} sobrantes reutilizables.`,
      });
    } catch (error) {
      console.error('Error confirming door fabrication:', error);
      try {
        if (API?.deleteInventoryMovement) {
          for (const movementId of createdMovementIds.reverse()) {
            await API.deleteInventoryMovement(movementId);
          }
        }
        for (const snapshot of [...rollbackInventorySnapshots].reverse()) {
          await API.updateInventoryItem(snapshot);
        }
        if (API?.deleteInventoryItem) {
          for (const scrapId of createdScrapInventoryIds.reverse()) {
            await API.deleteInventoryItem(scrapId);
          }
        }
      } catch (rollbackError) {
        console.error('Error during rollback of door fabrication:', rollbackError);
      }
      setFabricationStatus({
        type: 'error',
        message: `${error?.message || 'No se pudo confirmar la fabricación.'} Se intentó revertir el inventario al estado previo.`,
      });
    } finally {
      confirmingFabricationRef.current = false;
      setIsConfirmingFabrication(false);
    }
  };

  const updateConfig = (section, field, value) => {
    setConfig((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const saveDoorConfig = async () => {
    const API = window.electronAPI;
    if (!API?.saveDoorConfig) {
      setConfigStatus({ type: 'error', message: 'No existe el método para guardar configuración.' });
      return;
    }

    setIsSavingConfig(true);
    setConfigStatus({ type: '', message: '' });
    try {
      const result = await API.saveDoorConfig(config);
      if (result?.config) setConfig(createPuertaConfig(result.config));
      setConfigStatus({ type: 'success', message: 'Configuración guardada correctamente.' });
    } catch (error) {
      console.error('Error saving door config:', error);
      setConfigStatus({ type: 'error', message: error?.message || 'No se pudo guardar la configuración.' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const reloadHistorial = async () => {
    try {
      const API = window.electronAPI;
      if (!API?.getDoorFabrications) return;
      const records = await API.getDoorFabrications();
      setHistorialRecords(Array.isArray(records) ? records : []);
    } catch (error) {
      console.error('Error reloading historial:', error);
    }
  };

  const reuseFabrication = (record) => {
    setDraft(createPuertaDraft({
      nombre: record.nombre || '',
      cantidad: Number(record.cantidad || 1),
      material: {
        materialId: record.selectedMaterial?.id || null,
        nombre: record.selectedMaterial?.nombre || '',
        color: record.input?.materialColor || '',
      },
      vano: {
        altoMm: Number(record.input?.vano?.altoMm || 0),
        anchoMm: Number(record.input?.vano?.anchoMm || 0),
        profundidadMm: Number(record.input?.vano?.profundidadMm || 0),
      },
      insumosSeleccionados: {
        bastidorItemId: record.selectedSupplies?.bastidor?.id || null,
        peganteItemId: record.selectedSupplies?.pegante?.id || null,
        honeycombItemId: record.selectedSupplies?.honeycomb?.id || null,
        cantoItemId: record.selectedSupplies?.canto?.id || null,
      },
      herrajesSeleccionados: (record.selectedHerrajes || []).map((item) => ({ id: item.id, cantidad: Number(item.cantidad || 1) })),
      serviciosSeleccionados: (record.selectedServicios || []).map((item) => ({ id: item.id, cantidad: Number(item.cantidad || 1) })),
    }));
    setActiveTab('nueva');
    setHistoryStatus({ type: 'success', message: `Se cargó ${record.nombre || 'la puerta'} para reutilizar sus datos.` });
  };

  const deleteFabrication = async (record) => {
    const confirmed = window.confirm(`¿Eliminar ${record.nombre || 'esta fabricación'} del historial?\n\nEsto solo borra el registro histórico. No revierte consumos ni movimientos de inventario.`);
    if (!confirmed) return;

    try {
      const API = window.electronAPI;
      if (!API?.deleteDoorFabrication) {
        setHistoryStatus({ type: 'error', message: 'No existe el método para eliminar fabricaciones.' });
        return;
      }
      await API.deleteDoorFabrication(record.id);
      await reloadHistorial();
      setHistoryStatus({ type: 'success', message: `Se eliminó ${record.nombre || 'la fabricación'} del historial.` });
    } catch (error) {
      console.error('Error deleting fabrication:', error);
      setHistoryStatus({ type: 'error', message: error?.message || 'No se pudo eliminar la fabricación.' });
    }
  };

  const reloadDrafts = async () => {
    try {
      const API = window.electronAPI;
      if (!API?.getDoorDrafts) return;
      const drafts = await API.getDoorDrafts();
      setDraftRecords(Array.isArray(drafts) ? drafts : []);
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  };

  const saveDoorDraft = async () => {
    const API = window.electronAPI;
    if (!API?.saveDoorDraft) {
      setDraftStatus({ type: 'error', message: 'No existe el método para guardar borradores.' });
      return;
    }
    setIsSavingDraft(true);
    setDraftStatus({ type: '', message: '' });
    try {
      await API.saveDoorDraft({
        nombre: draft.nombre || '',
        cantidad: Number(draft.cantidad || 1),
        vano: { ...draft.vano },
        material: {
          materialId: draft.material.materialId,
          nombre: selectedMaterial?.nombre || '',
          color: draft.material.color || '',
        },
        insumosSeleccionados: { ...draft.insumosSeleccionados },
        herrajesSeleccionados: [...draft.herrajesSeleccionados],
        serviciosSeleccionados: [...draft.serviciosSeleccionados],
      });
      await reloadDrafts();
      setDraftStatus({ type: 'success', message: 'Borrador guardado correctamente.' });
    } catch (error) {
      setDraftStatus({ type: 'error', message: error?.message || 'No se pudo guardar el borrador.' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const openDraft = (draftRecord) => {
    setDraft(createPuertaDraft({
      nombre: draftRecord.nombre || '',
      cantidad: Number(draftRecord.cantidad || 1),
      material: {
        materialId: draftRecord.material?.materialId || null,
        nombre: draftRecord.material?.nombre || '',
        color: draftRecord.material?.color || '',
      },
      vano: {
        altoMm: Number(draftRecord.vano?.altoMm || 2340),
        anchoMm: Number(draftRecord.vano?.anchoMm || 860),
        profundidadMm: Number(draftRecord.vano?.profundidadMm || 120),
      },
      insumosSeleccionados: { ...draftRecord.insumosSeleccionados },
      herrajesSeleccionados: [...(draftRecord.herrajesSeleccionados || [])],
      serviciosSeleccionados: [...(draftRecord.serviciosSeleccionados || [])],
    }));
    setActiveTab('nueva');
    setDraftStatus({ type: 'success', message: `Borrador "${draftRecord.nombre || 'Sin nombre'}" cargado.` });
  };

  const deleteDraft = async (draftRecord) => {
    const confirmed = window.confirm(`¿Eliminar borrador "${draftRecord.nombre || 'Sin nombre'}"?`);
    if (!confirmed) return;
    try {
      await window.electronAPI.deleteDoorDraft(draftRecord.id);
      await reloadDrafts();
      setDraftStatus({ type: 'success', message: 'Borrador eliminado.' });
    } catch (error) {
      setDraftStatus({ type: 'error', message: error?.message || 'No se pudo eliminar el borrador.' });
    }
  };

  return (
    <div className="min-h-screen bg-[#060e20] text-[#dee5ff] p-6 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0f1930] via-[#16233f] to-[#1a233a] border border-[#40485d]/30 px-7 py-8 md:px-9 md:py-10 shadow-[0_20px_60px_rgba(3,8,20,0.35)]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00e0fe]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10 max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#99f7ff]/15 bg-[#99f7ff]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#99f7ff] mb-5">
              <span className="w-2 h-2 rounded-full bg-[#00e0fe] shadow-[0_0_12px_#00e0fe]"></span>
              Módulo de fabricación
            </div>
            <h1 className="font-['Space_Grotesk'] text-[42px] leading-[0.95] sm:text-5xl md:text-6xl font-bold text-white mb-5 tracking-[-0.04em]">
              Puertas
            </h1>

          </div>
        </section>

        <PuertasTabs items={PUERTAS_TABS} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'nueva' && (
          <section className="grid grid-cols-1 2xl:grid-cols-[1.05fr_0.95fr] gap-6">
            <SectionCard
              title="Nueva puerta"
              icon="add_box"
              description="Ingresá el vano, el material y la cantidad para correr el motor geométrico base del módulo."
              badge="Activo"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Nombre" type="text" value={draft.nombre} onChange={(value) => updateDraft('nombre', value)} placeholder="Puerta RH Fresno" />
                <InputField label="Cantidad" value={draft.cantidad} onChange={(value) => updateDraft('cantidad', value)} min={1} />
                <InputField label="Alto vano (mm)" value={draft.vano.altoMm} onChange={(value) => updateDraft('vano.altoMm', value)} />
                <InputField label="Ancho vano (mm)" value={draft.vano.anchoMm} onChange={(value) => updateDraft('vano.anchoMm', value)} />
                <InputField label="Profundidad vano (mm)" value={draft.vano.profundidadMm} onChange={(value) => updateDraft('vano.profundidadMm', value)} />
                <PuertasMaterialDropdown
                  value={draft.material.materialId}
                  materials={tableros6mm}
                  onChange={handleMaterialChange}
                  compact
                />
              </div>

              {tableros6mm.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
                  No hay tableros de 6 mm en inventario para usar como fondo visible.
                </div>
              ) : null}

              <div className="mt-6 rounded-2xl border border-[#1a233a] bg-[#060e20] p-5">
                <div className="text-[#99f7ff] text-[11px] font-bold uppercase tracking-[0.18em] mb-2">Materiales e insumos</div>
                <p className="text-[#6f7a97] text-sm mb-4">
                  Seleccioná los insumos base requeridos para fabricar la puerta además del fondo visible.
                </p>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <PuertasMaterialDropdown
                    compact
                    title="Bastidor / Pino"
                    value={draft.insumosSeleccionados?.bastidorItemId}
                    materials={bastidorOptions}
                    onChange={(value) => updateDraft('insumosSeleccionados.bastidorItemId', value)}
                    buttonPlaceholder="Seleccionar bastidor / pino..."
                    searchPlaceholder="Buscar bastidor o pino..."
                    status={supplyValidation.checks.find((c) => c.key === 'pino')?.ok}
                  />
                  <PuertasMaterialDropdown
                    compact
                    title="Pegante"
                    value={draft.insumosSeleccionados?.peganteItemId}
                    materials={peganteOptions}
                    onChange={(value) => updateDraft('insumosSeleccionados.peganteItemId', value)}
                    buttonPlaceholder="Seleccionar pegante..."
                    searchPlaceholder="Buscar pegante..."
                    status={supplyValidation.checks.find((c) => c.key === 'pegante')?.ok}
                  />
                  <PuertasMaterialDropdown
                    compact
                    title="Honeycomb / Alma"
                    value={draft.insumosSeleccionados?.honeycombItemId}
                    materials={honeycombOptions}
                    onChange={(value) => updateDraft('insumosSeleccionados.honeycombItemId', value)}
                    buttonPlaceholder="Seleccionar honeycomb / alma..."
                    searchPlaceholder="Buscar honeycomb o alma..."
                    status={supplyValidation.checks.find((c) => c.key === 'honeycomb')?.ok}
                  />
                  <PuertasMaterialDropdown
                    compact
                    title="Canto"
                    value={draft.insumosSeleccionados?.cantoItemId}
                    materials={cantos}
                    onChange={(value) => updateDraft('insumosSeleccionados.cantoItemId', value)}
                    buttonPlaceholder="Seleccionar canto..."
                    searchPlaceholder="Buscar canto..."
                    status={supplyValidation.checks.find((c) => c.key === 'canto')?.ok}
                  />
                </div>

                {/* Compact supply status bar */}
                <div className={`mt-4 rounded-xl px-4 py-2 text-sm font-semibold ${supplyValidation.canFabricate
                  ? 'bg-emerald-400/10 border border-emerald-400/20 text-emerald-300'
                  : 'bg-amber-400/10 border border-amber-400/20 text-amber-300'}`}>
                  {supplyValidation.canFabricate
                    ? '✅ Insumos: todos presentes'
                    : `⚠️ Faltan: ${supplyValidation.missing.map((m) => m.label).join(', ')}`}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Resultado geométrico"
              icon="calculate"
              description="Salida base del motor: hoja, recibidor, marco e insumos estructurales principales."
              badge="T4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                  <div className="text-[#a3aac4] text-[11px] font-bold uppercase tracking-[0.18em] mb-2">Hoja</div>
                  <div className="text-xl font-bold text-white">{calculation.hoja.altoMm} × {calculation.hoja.anchoMm}</div>
                  <div className="text-sm text-[#6f7a97] mt-2">Espesor: {calculation.hoja.espesorMm} mm</div>
                </div>
                <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                  <div className="text-[#a3aac4] text-[11px] font-bold uppercase tracking-[0.18em] mb-2">Recibidor</div>
                  <div className="text-xl font-bold text-white">{calculation.recibidor.anchoMm} mm</div>
                  <div className="text-sm text-[#6f7a97] mt-2">Ancho calculado</div>
                </div>
                <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                  <div className="text-[#a3aac4] text-[11px] font-bold uppercase tracking-[0.18em] mb-2">Canto</div>
                  <div className="text-xl font-bold text-white">{calculation.estructuraInterna.canto.linealesMm} mm</div>
                  <div className="text-sm text-[#6f7a97] mt-2">Perímetro estimado</div>
                </div>
              </div>

              <div className="space-y-5 text-sm">
                <div>
                  <div className="text-[#99f7ff] font-bold uppercase tracking-[0.18em] text-[11px] mb-2">Recibidor y marco</div>
                  <div className="space-y-2">
                    {[...calculation.recibidor.piezas, ...calculation.marco.piezas].map((piece) => (
                      <div key={piece.id} className="rounded-2xl border border-[#1a233a] bg-[#060e20] px-4 py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-white font-semibold">{piece.detalle}</div>
                          <div className="text-[#6f7a97]">{piece.largoMm} × {piece.anchoMm} mm</div>
                        </div>
                        <div className="text-[#a3aac4] font-bold">x{piece.cantidad}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[#99f7ff] font-bold uppercase tracking-[0.18em] text-[11px] mb-2">Estructura interna</div>
                  <div className="space-y-2">
                    {[...calculation.estructuraInterna.fondos, ...calculation.estructuraInterna.bastidores, ...(calculation.estructuraInterna.chapero ? [calculation.estructuraInterna.chapero] : [])].map((piece) => (
                      <div key={piece.id} className="rounded-2xl border border-[#1a233a] bg-[#060e20] px-4 py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-white font-semibold">{piece.detalle}</div>
                          <div className="text-[#6f7a97]">{piece.largoMm} × {piece.anchoMm} × {piece.espesorMm} mm</div>
                        </div>
                        <div className="text-[#a3aac4] font-bold">x{piece.cantidad}</div>
                      </div>
                    ))}
                    <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] px-4 py-3">
                      <div className="text-white font-semibold">{calculation.estructuraInterna.alma.detalle}</div>
                      <div className="text-[#6f7a97]">{calculation.estructuraInterna.alma.altoMm} × {calculation.estructuraInterna.alma.anchoMm} × {calculation.estructuraInterna.alma.espesorMm} mm</div>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          </section>
        )}

        {activeTab === 'nueva' && (
          <section className="rounded-[28px] border border-[#1a233a] bg-[#0a1122] p-6 md:p-8 shadow-xl">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <PuertasMultiSelectDropdown
                title="Herrajes desde inventario"
                items={herrajes}
                selectedItems={draft.herrajesSeleccionados}
                onToggle={toggleHerraje}
                getItemMeta={(item) => `${item.tipo || 'Herraje'} · ${item.medida || 'Sin medida'} · ${formatCurrency(item.costo_unitario || 0)}`}
                buttonPlaceholder="Seleccionar herrajes..."
                searchPlaceholder="Buscar herraje por nombre, código o tipo..."
              />

              <PuertasMultiSelectDropdown
                title="Servicios configurados"
                items={servicios}
                selectedItems={draft.serviciosSeleccionados}
                onToggle={toggleServicio}
                getItemMeta={(item) => `${item.descripcion || 'Servicio configurado'} · ${formatCurrency(item.precio_base || item.precio || 0)}`}
                buttonPlaceholder="Seleccionar servicios..."
                searchPlaceholder="Buscar servicio por nombre o descripción..."
              />
            </div>
          </section>
        )}

        {activeTab === 'nueva' && selectedHerrajes.length > 0 && (
          <section className="rounded-[28px] border border-[#1a233a] bg-[#0a1122] p-6 md:p-8 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl border border-[#40485d]/30 bg-[#10182d] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#99f7ff]">hardware</span>
              </div>
              <div className="flex-1">
                <h2 className="text-white text-xl font-bold font-['Space_Grotesk'] tracking-[-0.03em] mb-2">
                  Cantidades de herrajes
                </h2>
                <p className="text-[#a3aac4] text-sm leading-7 max-w-4xl mb-4">
                  Ajustá la cantidad real por herraje para que el costo y el consumo de inventario reflejen la fabricación de esta puerta.
                </p>

                <div className="space-y-3">
                  {selectedHerrajes.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[#1a233a] bg-[#060e20] px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <div className="text-white font-semibold">{item.nombre}</div>
                        <div className="text-[#6f7a97] text-sm mt-1">
                          {item.tipo || 'Herraje'} · {item.medida || 'Sin medida'} · {formatCurrency(item.costo_unitario || 0)} c/u
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => updateHerrajeQuantity(item.id, Number(item.selectedQuantity || 1) - 1)}
                          className="w-10 h-10 rounded-xl border border-[#1a233a] bg-[#0a1122] text-[#dee5ff] hover:border-[#99f7ff]/30 hover:text-[#99f7ff] transition-colors"
                        >
                          −
                        </button>
                        <div className="min-w-[64px] text-center">
                          <div className="text-white text-lg font-bold">{item.selectedQuantity || 1}</div>
                          <div className="text-[#6f7a97] text-[10px] uppercase tracking-[0.15em]">cantidad</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateHerrajeQuantity(item.id, Number(item.selectedQuantity || 1) + 1)}
                          className="w-10 h-10 rounded-xl border border-[#1a233a] bg-[#0a1122] text-[#dee5ff] hover:border-[#99f7ff]/30 hover:text-[#99f7ff] transition-colors"
                        >
                          +
                        </button>
                        <div className="ml-2 rounded-xl border border-[#1a233a] bg-[#0a1122] px-3 py-2 text-sm text-emerald-300 font-semibold">
                          {formatCurrency((Number(item.costo_unitario || 0) * Number(item.selectedQuantity || 1)))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'nueva' && selectedServicios.length > 0 && (
          <section className="rounded-[28px] border border-[#1a233a] bg-[#0a1122] p-6 md:p-8 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl border border-[#40485d]/30 bg-[#10182d] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#99f7ff]">build_circle</span>
              </div>
              <div className="flex-1">
                <h2 className="text-white text-xl font-bold font-['Space_Grotesk'] tracking-[-0.03em] mb-2">
                  Cantidades de servicios
                </h2>
                <p className="text-[#a3aac4] text-sm leading-7 max-w-4xl mb-4">
                  Ajustá cuántas veces necesitás cada servicio para esta puerta: mecanizados, cajas, huecos o cualquier operación configurada.
                </p>

                <div className="space-y-3">
                  {selectedServicios.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[#1a233a] bg-[#060e20] px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <div className="text-white font-semibold">{item.nombre}</div>
                        <div className="text-[#6f7a97] text-sm mt-1">
                          {item.descripcion || 'Servicio configurado'} · {formatCurrency(item.precio_base || item.precio || 0)} c/u
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => updateServicioQuantity(item.id, Number(item.selectedQuantity || 1) - 1)}
                          className="w-10 h-10 rounded-xl border border-[#1a233a] bg-[#0a1122] text-[#dee5ff] hover:border-[#99f7ff]/30 hover:text-[#99f7ff] transition-colors"
                        >
                          −
                        </button>
                        <div className="min-w-[64px] text-center">
                          <div className="text-white text-lg font-bold">{item.selectedQuantity || 1}</div>
                          <div className="text-[#6f7a97] text-[10px] uppercase tracking-[0.15em]">cantidad</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateServicioQuantity(item.id, Number(item.selectedQuantity || 1) + 1)}
                          className="w-10 h-10 rounded-xl border border-[#1a233a] bg-[#0a1122] text-[#dee5ff] hover:border-[#99f7ff]/30 hover:text-[#99f7ff] transition-colors"
                        >
                          +
                        </button>
                        <div className="ml-2 rounded-xl border border-[#1a233a] bg-[#0a1122] px-3 py-2 text-sm text-emerald-300 font-semibold">
                          {formatCurrency((Number(item.precio_base || item.precio || 0) * Number(item.selectedQuantity || 1)))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'nueva' && (
          <section className="rounded-[28px] border border-[#1a233a] bg-[#0a1122] p-4 md:p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl border border-[#40485d]/30 bg-[#10182d] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#99f7ff]">payments</span>
                </div>
                <div>
                  <div className="text-white font-bold font-['Space_Grotesk'] tracking-[-0.03em]">Total estimado</div>
                  <div className="text-2xl font-extrabold text-[#00e0fe] tracking-[-0.04em]">{formatCurrency(costSummary.total)}</div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-[#a3aac4]">
                    <span>Unitario: <span className="text-[#dee5ff] font-semibold">{formatCurrency(costSummary.unitDoorCost)}</span></span>
                    <span>Láminas: <span className="text-[#dee5ff] font-semibold">{nestingData?.summary?.totalSheets || 0}</span></span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCostBreakdown((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#40485d]/30 bg-[#10182d] px-4 py-2 text-sm font-semibold text-[#a3aac4] hover:text-[#dee5ff] hover:border-[#99f7ff]/30 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">{showCostBreakdown ? 'expand_less' : 'expand_more'}</span>
                {showCostBreakdown ? 'Ocultar desglose' : 'Ver desglose'}
              </button>
            </div>

            {showCostBreakdown && (
              <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                  <div className="text-[#6f7a97] text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Fondos 6mm</div>
                  <div className="text-lg font-extrabold text-white">{formatCurrency(costSummary.fondoCost)}</div>
                </div>
                <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                  <div className="text-[#6f7a97] text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Bastidor / pino</div>
                  <div className="text-lg font-extrabold text-cyan-300">{formatCurrency(costSummary.bastidorCost)}</div>
                </div>
                <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                  <div className="text-[#6f7a97] text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Herrajes</div>
                  <div className="text-lg font-extrabold text-emerald-300">{formatCurrency(costSummary.hardwareCost)}</div>
                </div>
                <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                  <div className="text-[#6f7a97] text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Peg + canto</div>
                  <div className="text-lg font-extrabold text-amber-300">{formatCurrency(costSummary.peganteCost + costSummary.cantoCost)}</div>
                </div>
                <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                  <div className="text-[#6f7a97] text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Servicios</div>
                  <div className="text-lg font-extrabold text-blue-300">{formatCurrency(costSummary.servicesCost)}</div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'nueva' && selectedMaterial && (
          <section className="rounded-[28px] border border-[#1a233a] bg-[#0a1122] p-6 md:p-8 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl border border-[#40485d]/30 bg-[#10182d] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#99f7ff]">lightbulb</span>
              </div>
              <div className="flex-1">
                <h2 className="text-white text-xl font-bold font-['Space_Grotesk'] tracking-[-0.03em] mb-2">
                  Sugerencia de sobrantes
                </h2>
                <p className="text-[#a3aac4] text-sm leading-7 max-w-4xl">
                  El sistema revisó el inventario de retales reutilizables. Si alguno sirve para fondos, bastidores, recibidores o marcos de esta puerta, te lo muestra para que vos decidas si querés usarlo o ignorarlo.
                </p>

                {scrapSuggestions.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-[#1a233a] bg-[#060e20] px-4 py-4 text-sm text-[#6f7a97]">
                    No se encontraron sobrantes compatibles para las piezas principales de esta puerta.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                      Hay {scrapSuggestions.length} sobrante(s) que podrían servir para esta fabricación.
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {scrapSuggestions.slice(0, 6).map((scrap) => (
                        <div key={scrap.id} className="rounded-2xl border border-[#1a233a] bg-[#060e20] px-4 py-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="text-white font-semibold">{scrap.nombre}</div>
                              <div className="text-[#6f7a97] text-xs mt-1">{scrap.codigo}</div>
                            </div>
                            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase tracking-[0.1em]">
                              Compatible
                            </span>
                          </div>

                          <div className="text-sm text-[#a3aac4] mb-3">
                            Medida: <span className="text-white font-semibold">{scrap.largo_mm} × {scrap.ancho_mm} mm</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {scrap.matchingPieces.map((piece) => (
                              <span key={`${scrap.id}-${piece.id}`} className="rounded-lg border border-[#1a233a] bg-[#0a1122] px-2 py-1 text-xs text-[#dee5ff]">
                                {piece.suggestionCategory}: {piece.detalle}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'nueva' && selectedMaterial && nestingData && (
          <section className="rounded-[28px] border border-[#1a233a] bg-[#0a1122] p-6 md:p-8 shadow-xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#99f7ff]/15 bg-[#99f7ff]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#99f7ff] mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#00e0fe]"></span>
                  Nesting completo
                </div>
                <h2 className="text-white text-2xl font-bold font-['Space_Grotesk'] tracking-[-0.03em] mb-2">Aprovechamiento nesting</h2>
                <p className="text-[#a3aac4] text-sm leading-7 max-w-3xl">
                  Incluye nesting de fondos 6mm y bastidores/listones con板材 real del inventario. Alma honeycomb excluded pending.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNestingModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#99f7ff]/25 bg-[#99f7ff]/10 px-5 py-3 text-sm font-bold text-[#99f7ff] transition-colors hover:bg-[#99f7ff]/15"
              >
                <span className="material-symbols-outlined text-[18px]">view_in_ar</span>
                Ver nesting
              </button>
            </div>

            {/* Combined nesting stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                <div className="text-[#a3aac4] text-[11px] font-bold uppercase tracking-[0.18em] mb-2">Láminas fondos</div>
                <div className="text-2xl font-extrabold text-white">{nestingData.summary.fondosSheetCount}</div>
              </div>
              <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                <div className="text-[#a3aac4] text-[11px] font-bold uppercase tracking-[0.18em] mb-2">Láminas bastidores</div>
                <div className="text-2xl font-extrabold text-cyan-300">{nestingData.summary.bastidoresSheetCount}</div>
              </div>
              <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                <div className="text-[#a3aac4] text-[11px] font-bold uppercase tracking-[0.18em] mb-2">Sin ubicar (fondos)</div>
                <div className="text-2xl font-extrabold text-amber-300">{nestingData.fondos.preview?.unplaced?.length || 0}</div>
              </div>
            </div>

            {/* Bastidor nesting detail when selected */}
            {nestingData.bastidores && (
              <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-[#060e20] p-4">
                <div className="text-[#99f7ff] text-[11px] font-bold uppercase tracking-[0.18em] mb-3">Detalle nesting bastidores</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-[#6f7a97]">Board bastidor</div>
                    <div className="text-white font-semibold">{nestingData.bastidores.boardName}</div>
                    <div className="text-[#6f7a7a] text-xs">{nestingData.bastidores.boardDimensions}</div>
                  </div>
                  <div>
                    <div className="text-[#6f7a97]">Láminas estimadas</div>
                    <div className="text-cyan-300 font-bold text-lg">{nestingData.bastidores.sheetCount}</div>
                  </div>
                  <div>
                    <div className="text-[#6f7a97]">Costo unitario</div>
                    <div className="text-white font-semibold">{formatCurrency(nestingData.bastidores.unitCost || 0)}</div>
                  </div>
                  <div>
                    <div className="text-[#6f7a97]">Utilización</div>
                    <div className="text-cyan-300 font-bold text-lg">{nestingData.bastidores.estimate?.utilization?.toFixed(1) || 0}%</div>
                  </div>
                </div>
              </div>
            )}

            {/* Fondo nesting detail */}
            {nestingData.fondos && (
              <div className="mt-4 rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                <div className="text-[#99f7ff] text-[11px] font-bold uppercase tracking-[0.18em] mb-3">Detalle nesting fondos 6mm</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-[#6f7a97]">Láminas estimadas</div>
                    <div className="text-white font-bold text-lg">{nestingData.fondos.sheetCount}</div>
                  </div>
                  <div>
                    <div className="text-[#6f7a97]">Costo unitario</div>
                    <div className="text-white font-semibold">{formatCurrency(nestingData.fondos.unitCost || 0)}</div>
                  </div>
                  <div>
                    <div className="text-[#6f7a97]">Utilización</div>
                    <div className="text-cyan-300 font-bold text-lg">{nestingData.fondos.estimate?.utilization?.toFixed(1) || 0}%</div>
                  </div>
                  <div>
                    <div className="text-[#6f7a97]">Piezas enviadas</div>
                    <div className="text-blue-300 font-bold text-lg">{nestingData.fondos.rows?.reduce((t, r) => t + Number(r.cantidad || 0), 0) || 0}</div>
                  </div>
                </div>
              </div>
            )}

            {nestingInterpretation && nestingData.fondos?.preview ? (
              <div className="mt-6 grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-4">
                <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                  <div className="text-[#99f7ff] text-[11px] font-bold uppercase tracking-[0.18em] mb-2">Lectura del tablero útil</div>
                  <div className="text-white text-lg font-bold mb-2">
                    {nestingInterpretation.usableLargo} × {nestingInterpretation.usableAncho} mm
                  </div>
                  <p className="text-[#a3aac4] text-sm leading-7">
                    Esta es el área realmente cortable después del refilado. Las piezas de puerta se acomodan dentro de este rectángulo, no del tablero bruto completo.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#1a233a] bg-[#060e20] p-4">
                  <div className="text-[#99f7ff] text-[11px] font-bold uppercase tracking-[0.18em] mb-3">Sobrantes detectados (fondos)</div>
                  {nestingInterpretation.freeRects.length === 0 ? (
                    <p className="text-[#6f7a97] text-sm">No quedaron áreas libres en la primera lámina.</p>
                  ) : (
                    <div className="space-y-2">
                      {nestingInterpretation.freeRects.slice(0, 3).map((rect, index) => (
                        <div key={`${rect.x}-${rect.y}-${index}`} className="rounded-xl border border-[#1a233a] bg-[#0a1122] px-4 py-3 flex items-center justify-between gap-4">
                          <div>
                            <div className="text-white font-semibold">Sobrante {index + 1}</div>
                            <div className="text-[#6f7a97] text-sm">{Math.round(rect.width)} × {Math.round(rect.height)} mm</div>
                          </div>
                          <div className="text-right">
                            <div className="text-emerald-300 font-bold">{(rect.area / 1000000).toFixed(2)} m²</div>
                            <div className="text-[#6f7a97] text-xs">reutilizable potencial</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {fabricationStatus.message ? (
              <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${fabricationStatus.type === 'success'
                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                : 'border-red-400/20 bg-red-400/10 text-red-300'}`}>
                {fabricationStatus.message}
              </div>
            ) : null}

            {draftStatus.message ? (
              <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${draftStatus.type === 'success'
                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                : 'border-red-400/20 bg-red-400/10 text-red-300'}`}>
                {draftStatus.message}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={saveDoorDraft}
                disabled={isSavingDraft}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#99f7ff]/25 bg-[#99f7ff]/10 px-5 py-3 text-sm font-bold text-[#99f7ff] transition-colors hover:bg-[#99f7ff]/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                {isSavingDraft ? 'Guardando...' : 'Guardar borrador'}
              </button>
              <button
                type="button"
                onClick={confirmFabrication}
                disabled={isConfirmingFabrication || !supplyValidation.canFabricate}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">precision_manufacturing</span>
                {isConfirmingFabrication ? 'Confirmando...' : 'Confirmar fabricación'}
              </button>
            </div>
          </section>
        )}

        {activeTab === 'configuracion' && (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SectionCard title="Geometría" icon="straighten" description="Parámetros base para el cálculo de hoja, superiores y recibidor." badge="Activo">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ConfigField label="Espesor total puerta" value={config.geometry.espesorTotalPuertaMm} onChange={(value) => updateConfig('geometry', 'espesorTotalPuertaMm', value)} />
                <ConfigField label="Descuento alto puerta" value={config.geometry.descuentoAltoPuertaMm} onChange={(value) => updateConfig('geometry', 'descuentoAltoPuertaMm', value)} />
                <ConfigField label="Descuento ancho puerta" value={config.geometry.descuentoAnchoPuertaMm} onChange={(value) => updateConfig('geometry', 'descuentoAnchoPuertaMm', value)} />
                <ConfigField label="Descuento superior" value={config.geometry.descuentoSuperiorMm} onChange={(value) => updateConfig('geometry', 'descuentoSuperiorMm', value)} />
                <ConfigField label="Holgura recibidor" value={config.geometry.holguraRecibidorMm} onChange={(value) => updateConfig('geometry', 'holguraRecibidorMm', value)} />
              </div>
            </SectionCard>

            <SectionCard title="Composición" icon="layers" description="Reglas base de fondos, bastidores y alma de la puerta entamborada." badge="Activo">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ConfigField label="Fondo exterior A" value={config.composition.fondoExteriorAmm} onChange={(value) => updateConfig('composition', 'fondoExteriorAmm', value)} />
                <ConfigField label="Fondo exterior B" value={config.composition.fondoExteriorBmm} onChange={(value) => updateConfig('composition', 'fondoExteriorBmm', value)} />
                <ConfigField label="Bastidor interno" value={config.composition.bastidorInternoMm} onChange={(value) => updateConfig('composition', 'bastidorInternoMm', value)} />
                <ConfigField label="Bastidor vertical" value={config.composition.anchoBastidorVerticalMm} onChange={(value) => updateConfig('composition', 'anchoBastidorVerticalMm', value)} />
                <ConfigField label="Bastidor horizontal" value={config.composition.anchoBastidorHorizontalMm} onChange={(value) => updateConfig('composition', 'anchoBastidorHorizontalMm', value)} />
                <ConfigField label="Chapero alto" value={config.composition.chaperoAltoMm} onChange={(value) => updateConfig('composition', 'chaperoAltoMm', value)} />
                <ConfigField label="Chapero ancho" value={config.composition.chaperoAnchoMm} onChange={(value) => updateConfig('composition', 'chaperoAnchoMm', value)} />
              </div>
            </SectionCard>

            <SectionCard title="Persistencia" icon="save" description="Guardá estos parámetros como configuración base del módulo de puertas." badge="Activo">
              <div className="space-y-4">
                <p className="text-[#a3aac4] text-sm leading-7">
                  Esta configuración se guarda fuera del frontend, así que al reiniciar la app el módulo vuelve a abrir con estos mismos descuentos, holguras y medidas base.
                </p>

                {configStatus.message ? (
                  <div className={`rounded-2xl border px-4 py-3 text-sm ${configStatus.type === 'success'
                    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                    : 'border-red-400/20 bg-red-400/10 text-red-300'}`}>
                    {configStatus.message}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={saveDoorConfig}
                    disabled={isSavingConfig}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#00e0fe] px-5 py-3 text-sm font-bold text-[#002f33] transition-colors hover:bg-[#99f7ff] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    {isSavingConfig ? 'Guardando...' : 'Guardar configuración'}
                  </button>
                </div>
              </div>
            </SectionCard>
          </section>
        )}

        {activeTab === 'historial' && (
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl border border-[#40485d]/30 bg-[#10182d] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#99f7ff]">history</span>
              </div>
              <div>
                <h2 className="text-white text-xl font-bold font-['Space_Grotesk'] tracking-[-0.03em]">Historial de fabricaciones</h2>
                <p className="text-[#a3aac4] text-sm">Registros de puertas confirmadas</p>
              </div>
            </div>

            {draftRecords.length === 0 && historialRecords.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-[#1a233a] bg-[#0a1122] p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-[#40485d] mb-3">inventory_2</span>
                <p className="text-[#6f7a97] text-sm">No hay fabricaciones registradas.</p>
                <p className="text-[#6f7a97] text-sm mt-1">Completá una puerta y confirmá fabricación para verla acá.</p>
              </div>
            ) : (
              <>
                {draftStatus.message ? (
                  <div className={`rounded-2xl border px-4 py-3 text-sm ${draftStatus.type === 'success'
                    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                    : 'border-red-400/20 bg-red-400/10 text-red-300'}`}>
                    {draftStatus.message}
                  </div>
                ) : null}
                {historyStatus.message ? (
                  <div className={`rounded-2xl border px-4 py-3 text-sm ${historyStatus.type === 'success'
                    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                    : 'border-red-400/20 bg-red-400/10 text-red-300'}`}>
                    {historyStatus.message}
                  </div>
                ) : null}
                {draftRecords.length > 0 && (
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[#99f7ff] text-[18px]">draft</span>
                      <h3 className="text-[#dee5ff] font-bold font-['Space_Grotesk']">Borradores</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {draftRecords.map((d) => (
                        <div key={d.id} className="rounded-[24px] border border-amber-400/20 bg-[#0a1122] p-5 shadow-xl">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <div className="text-white font-bold text-base">{d.nombre || 'Borrador sin nombre'}</div>
                              <div className="text-[#6f7a97] text-xs mt-1">
                                {new Date(d.updated_at || d.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-[0.1em]">Borrador</span>
                          </div>
                          <div className="text-[#a3aac4] text-sm mb-3">
                            {d.vano?.altoMm || '-'} × {d.vano?.anchoMm || '-'} mm
                            {d.material?.nombre ? ` · ${d.material.nombre}` : ''}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => openDraft(d)} className="inline-flex items-center gap-1 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-400/15">
                              <span className="material-symbols-outlined text-[14px]">edit</span>Abrir
                            </button>
                            <button onClick={() => deleteDraft(d)} className="inline-flex items-center gap-1 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-400/15">
                              <span className="material-symbols-outlined text-[14px]">delete</span>Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {historialRecords.map((record) => (
                    <div key={record.id} className="rounded-[24px] border border-[#1a233a] bg-[#0a1122] p-5 shadow-xl">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="text-white font-bold text-base">{record.nombre || 'Puerta sin nombre'}</div>
                        <div className="text-[#6f7a97] text-xs mt-1">
                          {new Date(record.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase tracking-[0.1em]">
                        {record.status || 'OK'}
                      </span>
                    </div>

                    {record.selectedMaterial && (
                      <div className="mb-3 rounded-xl border border-[#1a233a] bg-[#060e20] px-3 py-2">
                        <div className="text-[#6f7a97] text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Material</div>
                        <div className="text-white text-sm">{record.selectedMaterial.nombre}</div>
                        <div className="text-[#6f7a97] text-xs">{record.selectedMaterial.largo_mm} × {record.selectedMaterial.ancho_mm} mm</div>
                      </div>
                    )}

                    {record.nestingSummary ? (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="rounded-xl border border-[#1a233a] bg-[#060e20] px-2 py-2 text-center">
                          <div className="text-cyan-300 text-lg font-extrabold">{record.nestingSummary.estimatedSheets || 0}</div>
                          <div className="text-[#6f7a97] text-[10px]">Láminas</div>
                        </div>
                        <div className="rounded-xl border border-[#1a233a] bg-[#060e20] px-2 py-2 text-center">
                          <div className="text-cyan-300 text-lg font-extrabold">{record.nestingSummary.totalPieces || 0}</div>
                          <div className="text-[#6f7a97] text-[10px]">Piezas</div>
                        </div>
                        <div className="rounded-xl border border-[#1a233a] bg-[#060e20] px-2 py-2 text-center">
                          <div className="text-emerald-300 text-lg font-extrabold">{record.nestingSummary.utilization?.toFixed(1) || 0}%</div>
                          <div className="text-[#6f7a97] text-[10px]">Utilización</div>
                        </div>
                      </div>
                    ) : null}

                    {record.totals ? (
                      <div className="rounded-xl border border-[#1a233a] bg-[#060e20] px-3 py-3 mb-3">
                        <div className="text-[#6f7a97] text-[10px] font-bold uppercase tracking-[0.15em] mb-2">Desglose de costos</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[#a3aac4]">Material</span>
                            <span className="text-white font-semibold">{formatCurrency(record.totals.materialCost || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[#a3aac4]">Herrajes</span>
                            <span className="text-white font-semibold">{formatCurrency(record.totals.hardwareCost || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[#a3aac4]">Servicios</span>
                            <span className="text-white font-semibold">{formatCurrency(record.totals.servicesCost || 0)}</span>
                          </div>
                          <div className="border-t border-[#1a233a] pt-2 mt-2 flex items-center justify-between gap-3">
                            <span className="text-[#99f7ff] font-bold">Total fabricación</span>
                            <span className="text-emerald-300 font-extrabold">{formatCurrency(record.totals.total || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[#a3aac4]">Costo unitario puerta</span>
                            <span className="text-cyan-300 font-bold">{formatCurrency(record.totals.unitDoorCost || 0)}</span>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {record.inventoryImpact ? (
                      <div className="flex gap-2 text-xs">
                        <span className="rounded-lg border border-[#1a233a] bg-[#060e20] px-2 py-1 text-amber-300">
                          -{record.inventoryImpact.boardsConsumed || 0} tableros
                        </span>
                        <span className="rounded-lg border border-[#1a233a] bg-[#060e20] px-2 py-1 text-red-300">
                          -{record.inventoryImpact.herrajesConsumed || 0} herrajes
                        </span>
                        <span className="rounded-lg border border-[#1a233a] bg-[#060e20] px-2 py-1 text-emerald-300">
                          +{record.inventoryImpact.scrapsGenerated || 0} scraps
                        </span>
                      </div>
                    ) : null}

                    {record.scrapsCreated?.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[#6f7a97] text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Sobrantes</div>
                        <div className="flex flex-wrap gap-1">
                          {record.scrapsCreated.slice(0, 4).map((scrap, i) => (
                            <span key={i} className="rounded-md border border-[#1a233a] bg-[#060e20] px-2 py-0.5 text-[10px] text-[#a3aac4]">
                              {scrap.nombre || scrap.id}
                            </span>
                          ))}
                          {record.scrapsCreated.length > 4 && (
                            <span className="text-[#6f7a97] text-[10px] px-1 py-1">+{record.scrapsCreated.length - 4}</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => reuseFabrication(record)}
                        className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-400/15 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                        Reusar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFabrication(record)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-400/15 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'sobrantes' && (
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl border border-[#40485d]/30 bg-[#10182d] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#99f7ff]">inventory</span>
              </div>
              <div>
                <h2 className="text-white text-xl font-bold font-['Space_Grotesk'] tracking-[-0.03em]">Sobrantes reutilizables</h2>
                <p className="text-[#a3aac4] text-sm">Retales generados por fabricación de puertas y dados de alta en inventario.</p>
              </div>
            </div>

            {scrapInventoryItems.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-[#1a233a] bg-[#0a1122] p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-[#40485d] mb-3">inventory_2</span>
                <p className="text-[#6f7a97] text-sm">No hay sobrantes registrados todavía.</p>
                <p className="text-[#6f7a97] text-sm mt-1">Confirmá una fabricación con nesting para que aparezcan acá.</p>
              </div>
            ) : (
              <>
                <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="bg-[#0a1122] border border-[#1a233a] rounded-[24px] p-6 shadow-xl">
                    <div className="text-[#a3aac4] text-[11px] font-bold tracking-[0.18em] uppercase mb-2">Sobrantes</div>
                    <div className="text-2xl font-extrabold text-white tracking-[-0.04em]">{scrapInventoryItems.length}</div>
                  </div>
                  <div className="bg-[#0a1122] border border-[#1a233a] rounded-[24px] p-6 shadow-xl">
                    <div className="text-[#a3aac4] text-[11px] font-bold tracking-[0.18em] uppercase mb-2">Área total</div>
                    <div className="text-2xl font-extrabold text-cyan-300 tracking-[-0.04em]">
                      {(scrapInventoryItems.reduce((acc, item) => acc + ((Number(item.largo_mm || 0) * Number(item.ancho_mm || 0)) / 1000000), 0)).toFixed(2)} m²
                    </div>
                  </div>
                  <div className="bg-[#0a1122] border border-[#1a233a] rounded-[24px] p-6 shadow-xl">
                    <div className="text-[#a3aac4] text-[11px] font-bold tracking-[0.18em] uppercase mb-2">Materiales</div>
                    <div className="text-2xl font-extrabold text-blue-300 tracking-[-0.04em]">
                      {new Set(scrapInventoryItems.map((item) => item.material || item.nombre)).size}
                    </div>
                  </div>
                  <div className="bg-[#0a1122] border border-[#1a233a] rounded-[24px] p-6 shadow-xl">
                    <div className="text-[#a3aac4] text-[11px] font-bold tracking-[0.18em] uppercase mb-2">Costo acumulado</div>
                    <div className="text-2xl font-extrabold text-emerald-300 tracking-[-0.04em]">
                      {formatCurrency(scrapInventoryItems.reduce((acc, item) => acc + Number(item.costo_unitario || 0), 0))}
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {scrapInventoryItems.map((item) => {
                    const areaM2 = ((Number(item.largo_mm || 0) * Number(item.ancho_mm || 0)) / 1000000).toFixed(2);
                    const realStock = Number(item.cantidad_disponible || 0) - Number(item.cantidad_reservada || 0);
                    return (
                      <div key={item.id} className="rounded-[24px] border border-[#1a233a] bg-[#0a1122] p-5 shadow-xl">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="text-white font-bold text-base leading-6">{item.nombre}</div>
                            <div className="text-[#6f7a97] text-xs mt-1">{item.codigo}</div>
                          </div>
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase tracking-[0.1em]">
                            Reutilizable
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          <div className="rounded-xl border border-[#1a233a] bg-[#060e20] px-3 py-2">
                            <div className="text-[#6f7a97] text-[10px] uppercase tracking-[0.15em] mb-1">Medida</div>
                            <div className="text-white font-semibold">{item.largo_mm} × {item.ancho_mm}</div>
                          </div>
                          <div className="rounded-xl border border-[#1a233a] bg-[#060e20] px-3 py-2">
                            <div className="text-[#6f7a97] text-[10px] uppercase tracking-[0.15em] mb-1">Espesor</div>
                            <div className="text-white font-semibold">{item.espesor_mm || '-'} mm</div>
                          </div>
                          <div className="rounded-xl border border-[#1a233a] bg-[#060e20] px-3 py-2">
                            <div className="text-[#6f7a97] text-[10px] uppercase tracking-[0.15em] mb-1">Área</div>
                            <div className="text-cyan-300 font-semibold">{areaM2} m²</div>
                          </div>
                          <div className="rounded-xl border border-[#1a233a] bg-[#060e20] px-3 py-2">
                            <div className="text-[#6f7a97] text-[10px] uppercase tracking-[0.15em] mb-1">Stock real</div>
                            <div className="text-emerald-300 font-semibold">{realStock}</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="rounded-lg border border-[#1a233a] bg-[#060e20] px-2 py-1 text-[#a3aac4]">
                            {item.material || 'Sin material'}
                          </span>
                          <span className="rounded-lg border border-[#1a233a] bg-[#060e20] px-2 py-1 text-[#a3aac4]">
                            {formatCurrency(item.costo_unitario || 0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </section>
              </>
            )}
          </section>
        )}

        {selectedMaterial && nestingData ? (
          <DespieceNestingModal
            isOpen={showNestingModal}
            onClose={() => setShowNestingModal(false)}
            boardName={selectedMaterial?.nombre || 'Tablero seleccionado'}
            boardDimensions={`${selectedMaterial?.largo_mm || 0} × ${selectedMaterial?.ancho_mm || 0} mm`}
            boardWidth={Number(selectedMaterial?.largo_mm || 0)}
            boardHeight={Number(selectedMaterial?.ancho_mm || 0)}
            estimatedSheets={nestingData.fondos?.estimate?.estimatedSheets || 0}
            pieceCount={nestingData.fondos?.rows?.reduce((total, row) => total + Number(row.cantidad || row.cant || 0), 0) || 0}
            estimate={nestingData.fondos?.estimate}
            preview={nestingData.fondos?.preview}
            rows={nestingData.fondos?.rows || []}
            cantos={[]}
            projectName={draft.nombre || 'Puerta'}
            clientName={draft.material.color || ''}
          />
        ) : null}
      </div>
    </div>
  );
}
