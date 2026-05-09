import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Despiece from '../despiece/Despiece';
import { DespieceStatsBar } from '../despiece/DespieceSummaryPanel';
import HerajesPanel from './HerajesPanel';
import ResumenPanel from './ResumenPanel';
import { generateCotizacionPDF } from '../../features/project/utils/cotizacionPdfExport';
import { calculateServicesTotal } from '../../features/project/utils/mergeProjectServices';
import { getStockReal } from '../../features/inventory/utils/inventoryStock';
import { useAuth } from '../../context/AuthContext';

function useLatestRef(value) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

function normalizeServicio(servicio) {
  let atributos = servicio?.atributos || [];
  if (typeof atributos === 'string') {
    try {
      atributos = JSON.parse(atributos);
    } catch {
      atributos = [];
    }
  }

  const attrs = Array.isArray(atributos) ? atributos : [];
  return {
    ...servicio,
    atributos: attrs,
    precio: Number(servicio?.precio || attrs?.[0]?.precio || 0)
  };
}

function buildBoardReservationMap(despieceData = []) {
  return (Array.isArray(despieceData) ? despieceData : []).reduce((acc, despiece) => {
    const materialId = despiece?.material_id;
    if (!materialId) return acc;

    const filas = Array.isArray(despiece?.filas) ? despiece.filas : [];
    const fallbackCount = Math.ceil(filas.reduce((sum, row) => sum + (parseInt(row?.cantidad || 0, 10) || 0), 0) / 4) || 0;
    const reservedBoards = Number(despiece?.cantidad || despiece?.laminas || fallbackCount || 0);

    acc[materialId] = (acc[materialId] || 0) + reservedBoards;
    return acc;
  }, {});
}

function buildCantoReservationMap(despieceData = []) {
  return (Array.isArray(despieceData) ? despieceData : []).reduce((acc, despiece) => {
    const cantos = Array.isArray(despiece?.cantos) ? despiece.cantos : [];
    const filas = Array.isArray(despiece?.filas) ? despiece.filas : [];

    filas.forEach((row) => {
      const cantidad = parseInt(row?.cantidad || 0, 10) || 0;
      if (cantidad <= 0) return;

      ['l1', 'l2', 'a1', 'a2'].forEach((side) => {
        const ref = Number(row?.[side]);
        if (!ref || ref <= 0) return;

        const canto = cantos.find((entry) => Number(entry.ref) === ref);
        const inventoryItemId = canto?.inventory_item_id;
        if (!inventoryItemId) return;

        const dimensionMm = side === 'l1' || side === 'l2'
          ? Number(row?.largo || 0)
          : Number(row?.ancho || 0);
        const metros = (dimensionMm * cantidad) / 1000;
        if (metros <= 0) return;

        acc[inventoryItemId] = (acc[inventoryItemId] || 0) + metros;
      });
    });

    return acc;
  }, {});
}

function buildHardwareReservationMap(hardwareItems = []) {
  return (Array.isArray(hardwareItems) ? hardwareItems : []).reduce((acc, item) => {
    if (item.heraje_id) acc[item.heraje_id] = (acc[item.heraje_id] || 0) + Number(item.cantidad || 0);
    return acc;
  }, {});
}

export default function ProjectWorkspace() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('despiece');
  const [project, setProject] = useState(null);
  const [despieceData, setDespieceData] = useState({ items: [] });
  const [hardwareData, setHardwareData] = useState({ items: [] });
  const [servicios, setServicios] = useState([]);
  const [herajesInventory, setHerajesInventory] = useState([]);
  const [cantosInventory, setCantosInventory] = useState([]);
  const [materialesInventory, setMaterialesInventory] = useState([]);
  const [companySettings, setCompanySettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [despieceStats, setDespieceStats] = useState({ laminaCount: 0, piezaCount: 0 });
  const [openNestingHandler, setOpenNestingHandler] = useState(null);
  const [servicePicker, setServicePicker] = useState({ open: false, materialId: null, query: '' });
  const reservationBaselineRef = useRef({});
  const reservationsReadyRef = useRef(false);
  const boardReservationBaselineRef = useRef({});
  const boardReservationsReadyRef = useRef(false);
  const cantoReservationBaselineRef = useRef({});
  const cantoReservationsReadyRef = useRef(false);
  const toastTimeoutRef = useRef(null);
  const latestHerrajesInventoryRef = useLatestRef(herajesInventory);
  const latestCantosInventoryRef = useLatestRef(cantosInventory);
  const latestMaterialesInventoryRef = useLatestRef(materialesInventory);

  const showToast = React.useCallback((type, message, duration = 3000) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, duration);
  }, []);

  useEffect(() => () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    setServicePicker({ open: false, materialId: null, query: '' });
    setBillingModalOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      setServicePicker({ open: false, materialId: null, query: '' });
      setBillingModalOpen(false);
    };
  }, []);

  // Cargar info del proyecto desde la base de datos
  useEffect(() => {
    setLoading(true);
    reservationBaselineRef.current = {};
    reservationsReadyRef.current = false;
    boardReservationBaselineRef.current = {};
    boardReservationsReadyRef.current = false;
    cantoReservationBaselineRef.current = {};
    cantoReservationsReadyRef.current = false;

    const fetchProject = async () => {
      try {
        if (window.electronAPI?.getProject) {
          const data = await window.electronAPI.getProject(id, user?.uid);
          if (!data) {
            navigate('/dashboard');
            return;
          }
          setProject(data);
          try {
            setDespieceData(JSON.parse(data.despiece_data || "[]"));
          } catch(e) {
            console.error("Error parsing despiece DB data", e);
          }
          try {
            const hw = JSON.parse(data.hardware_data || "{}");
            setHardwareData(hw);
          } catch(e) {
            console.error("Error parsing hardware data", e);
          }
        }
        
        // Cargar servicios para el resumen
        if (window.electronAPI?.getServicios) {
          const srv = await window.electronAPI.getServicios();
          setServicios((srv || []).map(normalizeServicio));
        }
        
        // Cargar cantos del inventario para el resumen
        if (window.electronAPI?.getInventoryItems) {
          const inv = await window.electronAPI.getInventoryItems() || [];
          setHerajesInventory(inv.filter(item => item.item_type === 'herraje'));
          setCantosInventory(inv.filter(item => item.item_type === 'canto'));
          setMaterialesInventory(inv.filter(item => item.item_type === 'tablero'));
        }

        // Cargar configuración de la empresa
        if (window.electronAPI?.getCompanySettings) {
          let settings = await window.electronAPI.getCompanySettings() || {};
          // Logo se guarda directamente como logo_data en la DB
          setCompanySettings(settings);
        }
      } catch (error) {
        console.error("Error fetching project:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id, user?.uid]);

  useEffect(() => {
    if (loading || reservationsReadyRef.current) return;

    reservationBaselineRef.current = (hardwareData.items || []).reduce((acc, item) => {
      if (item.heraje_id) acc[item.heraje_id] = Number(item.cantidad || 0);
      return acc;
    }, {});
    reservationsReadyRef.current = true;
  }, [loading, hardwareData.items]);

  useEffect(() => {
    if (loading || boardReservationsReadyRef.current) return;

    boardReservationBaselineRef.current = buildBoardReservationMap(despieceData);
    boardReservationsReadyRef.current = true;
  }, [loading, despieceData]);

  useEffect(() => {
    if (loading || cantoReservationsReadyRef.current) return;

    cantoReservationBaselineRef.current = buildCantoReservationMap(despieceData);
    cantoReservationsReadyRef.current = true;
  }, [loading, despieceData]);

  useEffect(() => {
    if (!reservationsReadyRef.current || !project?.id || !window.electronAPI?.updateInventoryItem || !window.electronAPI?.addInventoryMovement || !['EDICION', 'COTIZACION', 'ACEPTADA'].includes(project?.state || 'EDICION')) return;

    const nextMap = (hardwareData.items || []).reduce((acc, item) => {
      if (item.heraje_id) acc[item.heraje_id] = (acc[item.heraje_id] || 0) + Number(item.cantidad || 0);
      return acc;
    }, {});

    const previousMap = reservationBaselineRef.current || {};
    const changes = Object.keys({ ...previousMap, ...nextMap }).map((herajeId) => ({
      herajeId,
      delta: Number(nextMap[herajeId] || 0) - Number(previousMap[herajeId] || 0),
    })).filter((entry) => entry.delta !== 0);

    if (!changes.length) return;

    Promise.all(changes.map(async ({ herajeId, delta }) => {
      const inventoryItem = latestHerrajesInventoryRef.current.find((item) => item.id === herajeId);
      if (!inventoryItem) return { herajeId, skipped: true };
      if (delta > 0 && delta > getStockReal(inventoryItem)) {
        return {
          herajeId,
          conflict: true,
          message: `Sin stock suficiente para reservar herraje: ${inventoryItem.nombre}`,
        };
      }

      const nextReserved = Math.max(0, Number(inventoryItem.cantidad_reservada || 0) + delta);

      await window.electronAPI.updateInventoryItem({
        ...inventoryItem,
        cantidad_reservada: nextReserved,
      });

      await window.electronAPI.addInventoryMovement({
        item_id: inventoryItem.id,
        item_name_snapshot: inventoryItem.nombre,
        item_type_snapshot: inventoryItem.item_type,
        movement_type: delta > 0 ? 'project_reserve' : 'project_release',
        direction: 'neutral',
        cantidad: Math.abs(delta),
        unit_cost: Number(inventoryItem.costo_unitario || 0),
        total_cost: Number(inventoryItem.costo_unitario || 0) * Math.abs(delta),
        reference_type: 'project',
        reference_id: project.id,
        motivo: delta > 0
          ? `Reserva para proyecto ${project.title || project.id}`
          : `Liberación de reserva proyecto ${project.title || project.id}`,
      });

      return { herajeId, nextReserved, applied: true };
    })).then((results) => {
      const appliedIds = new Set();
      const nextBaseline = { ...previousMap };
      let conflictMessage = '';

      results.forEach((result) => {
        if (!result) return;
        if (result.conflict && !conflictMessage) conflictMessage = result.message;
        if (result.applied) {
          appliedIds.add(result.herajeId);
          nextBaseline[result.herajeId] = Number(nextMap[result.herajeId] || 0);
        }
      });

      reservationBaselineRef.current = nextBaseline;

      if (appliedIds.size) {
        setHerajesInventory((prev) => prev.map((item) => {
          const result = results.find((entry) => entry?.applied && entry.herajeId === item.id);
          return result ? { ...item, cantidad_reservada: result.nextReserved } : item;
        }));
      }

      if (conflictMessage) {
        showToast('error', conflictMessage);
      }
    }).catch((error) => {
      console.error('Error reservando stock para proyecto', error);
      showToast('error', error.message || 'Conflicto de stock en herrajes');
    });
  }, [hardwareData.items, project?.id, project?.state, loading, showToast]);

  useEffect(() => {
    if (!boardReservationsReadyRef.current || !project?.id || !window.electronAPI?.updateInventoryItem || !window.electronAPI?.addInventoryMovement || !['EDICION', 'COTIZACION', 'ACEPTADA'].includes(project?.state || 'EDICION')) return;

    const nextMap = buildBoardReservationMap(despieceData);
    const previousMap = boardReservationBaselineRef.current || {};

    const changes = Object.keys({ ...previousMap, ...nextMap }).map((materialId) => ({
      materialId,
      delta: Number(nextMap[materialId] || 0) - Number(previousMap[materialId] || 0),
    })).filter((entry) => entry.delta !== 0);

    if (!changes.length) return;

    Promise.all(changes.map(async ({ materialId, delta }) => {
      const inventoryItem = latestMaterialesInventoryRef.current.find((item) => item.id === materialId);
      if (!inventoryItem) return { materialId, skipped: true };
      if (delta > 0 && delta > getStockReal(inventoryItem)) {
        return {
          materialId,
          conflict: true,
          message: `Sin stock suficiente para reservar tablero: ${inventoryItem.nombre}`,
        };
      }

      const nextReserved = Math.max(0, Number(inventoryItem.cantidad_reservada || 0) + delta);

      await window.electronAPI.updateInventoryItem({
        ...inventoryItem,
        cantidad_reservada: nextReserved,
      });

      await window.electronAPI.addInventoryMovement({
        item_id: inventoryItem.id,
        item_name_snapshot: inventoryItem.nombre,
        item_type_snapshot: inventoryItem.item_type,
        movement_type: delta > 0 ? 'project_reserve' : 'project_release',
        direction: 'neutral',
        cantidad: Math.abs(delta),
        unit_cost: Number(inventoryItem.costo_unitario || 0),
        total_cost: Number(inventoryItem.costo_unitario || 0) * Math.abs(delta),
        reference_type: 'project',
        reference_id: project.id,
        motivo: delta > 0
          ? `Reserva tablero para proyecto ${project.title || project.id}`
          : `Liberación tablero proyecto ${project.title || project.id}`,
      });

      return { materialId, nextReserved, applied: true };
    })).then((results) => {
      const nextBaseline = { ...previousMap };
      let conflictMessage = '';

      results.forEach((result) => {
        if (!result) return;
        if (result.conflict && !conflictMessage) conflictMessage = result.message;
        if (result.applied) {
          nextBaseline[result.materialId] = Number(nextMap[result.materialId] || 0);
        }
      });

      boardReservationBaselineRef.current = nextBaseline;

      if (results.some((entry) => entry?.applied)) {
        setMaterialesInventory((prev) => prev.map((item) => {
          const result = results.find((entry) => entry?.applied && entry.materialId === item.id);
          return result ? { ...item, cantidad_reservada: result.nextReserved } : item;
        }));
      }

      if (conflictMessage) {
        showToast('error', conflictMessage);
      }
    }).catch((error) => {
      console.error('Error reservando tableros para proyecto', error);
      showToast('error', error.message || 'Conflicto de stock en tableros');
    });
  }, [despieceData, project?.id, project?.state, showToast]);

  useEffect(() => {
    if (!cantoReservationsReadyRef.current || !project?.id || !window.electronAPI?.updateInventoryItem || !window.electronAPI?.addInventoryMovement || !['EDICION', 'COTIZACION', 'ACEPTADA'].includes(project?.state || 'EDICION')) return;

    const nextMap = buildCantoReservationMap(despieceData);
    const previousMap = cantoReservationBaselineRef.current || {};

    const changes = Object.keys({ ...previousMap, ...nextMap }).map((itemId) => ({
      itemId,
      delta: Number(nextMap[itemId] || 0) - Number(previousMap[itemId] || 0),
    })).filter((entry) => Math.abs(entry.delta) > 0.0001);

    if (!changes.length) return;

    Promise.all(changes.map(async ({ itemId, delta }) => {
      const inventoryItem = latestCantosInventoryRef.current.find((item) => item.id === itemId);
      if (!inventoryItem) return { itemId, skipped: true };
      if (delta > 0 && delta > getStockReal(inventoryItem)) {
        return {
          itemId,
          conflict: true,
          message: `Sin stock suficiente para reservar canto: ${inventoryItem.nombre}`,
        };
      }

      const nextReserved = Math.max(0, Number(inventoryItem.cantidad_reservada || 0) + delta);

      await window.electronAPI.updateInventoryItem({
        ...inventoryItem,
        cantidad_reservada: nextReserved,
      });

      await window.electronAPI.addInventoryMovement({
        item_id: inventoryItem.id,
        item_name_snapshot: inventoryItem.nombre,
        item_type_snapshot: inventoryItem.item_type,
        movement_type: delta > 0 ? 'project_reserve' : 'project_release',
        direction: 'neutral',
        cantidad: Math.abs(delta),
        unit_cost: Number(inventoryItem.costo_unitario || 0),
        total_cost: Number(inventoryItem.costo_unitario || 0) * Math.abs(delta),
        reference_type: 'project',
        reference_id: project.id,
        motivo: delta > 0
          ? `Reserva canto para proyecto ${project.title || project.id}`
          : `Liberación canto proyecto ${project.title || project.id}`,
      });

      return { itemId, nextReserved, applied: true };
    })).then((results) => {
      const nextBaseline = { ...previousMap };
      let conflictMessage = '';

      results.forEach((result) => {
        if (!result) return;
        if (result.conflict && !conflictMessage) conflictMessage = result.message;
        if (result.applied) {
          nextBaseline[result.itemId] = Number(nextMap[result.itemId] || 0);
        }
      });

      cantoReservationBaselineRef.current = nextBaseline;

      if (results.some((entry) => entry?.applied)) {
        setCantosInventory((prev) => prev.map((item) => {
          const result = results.find((entry) => entry?.applied && entry.itemId === item.id);
          return result ? { ...item, cantidad_reservada: result.nextReserved } : item;
        }));
      }

      if (conflictMessage) {
        showToast('error', conflictMessage);
      }
    }).catch((error) => {
      console.error('Error reservando cantos para proyecto', error);
      showToast('error', error.message || 'Conflicto de stock en cantos');
    });
  }, [despieceData, project?.id, project?.state, showToast]);

  const handleSave = async () => {
    if (!project || !window.electronAPI?.saveProject) return;
    setIsSaving(true);
    try {
      await window.electronAPI.saveProject({
        ...project,
        despiece_data: JSON.stringify(despieceData),
        hardware_data: JSON.stringify(hardwareData)
      });
      showToast('success', 'Cambios guardados correctamente');
    } catch(err) {
      console.error("Error guardando proyecto", err);
      showToast('error', 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const updateProjectState = async (nextState) => {
    if (!project || !window.electronAPI?.saveProject) return;
    const nextProject = { ...project, state: nextState };
    await window.electronAPI.saveProject({
      ...nextProject,
      despiece_data: JSON.stringify(despieceData),
      hardware_data: JSON.stringify(hardwareData)
    });
    setProject(nextProject);
  };

  const applyFinalInventoryTransition = async ({ mode }) => {
    if (!window.electronAPI?.updateInventoryItem || !window.electronAPI?.addInventoryMovement || !project?.id) return;

    const herrajeMap = buildHardwareReservationMap(hardwareData.items || []);
    const tableroMap = buildBoardReservationMap(despieceData);
    const cantoMap = buildCantoReservationMap(despieceData);

    const applyMap = async (reservationMap, inventoryList, itemTypeLabel) => {
      await Promise.all(Object.entries(reservationMap).map(async ([itemId, quantity]) => {
        const amount = Number(quantity || 0);
        if (amount <= 0) return;

        const inventoryItem = inventoryList.find((item) => item.id === itemId);
        if (!inventoryItem) return;

        const currentReserved = Number(inventoryItem.cantidad_reservada || 0);
        const nextAvailable = mode === 'consume'
          ? Math.max(0, Number(inventoryItem.cantidad_disponible || 0) - amount)
          : mode === 'reopen'
            ? Number(inventoryItem.cantidad_disponible || 0) + amount
            : Number(inventoryItem.cantidad_disponible || 0);
        const nextReserved = mode === 'reopen'
          ? currentReserved + amount
          : Math.max(0, currentReserved - amount);

        await window.electronAPI.updateInventoryItem({
          ...inventoryItem,
          cantidad_disponible: nextAvailable,
          cantidad_reservada: nextReserved,
        });

        await window.electronAPI.addInventoryMovement({
          item_id: inventoryItem.id,
          item_name_snapshot: inventoryItem.nombre,
          item_type_snapshot: inventoryItem.item_type,
          movement_type: mode === 'consume' ? 'project_consume' : mode === 'reopen' ? 'project_reopen_reserve' : 'project_release_cancel',
          direction: mode === 'consume' ? 'out' : mode === 'reopen' ? 'in' : 'neutral',
          cantidad: amount,
          unit_cost: Number(inventoryItem.costo_unitario || 0),
          total_cost: Number(inventoryItem.costo_unitario || 0) * amount,
          reference_type: 'project',
          reference_id: project.id,
          motivo: mode === 'consume'
            ? `Consumo final ${itemTypeLabel} proyecto ${project.title || project.id}`
            : mode === 'reopen'
              ? `Reversión a edición ${itemTypeLabel} proyecto ${project.title || project.id}`
              : `Liberación cancelación ${itemTypeLabel} proyecto ${project.title || project.id}`,
        });
      }));
    };

    await applyMap(herrajeMap, herajesInventory, 'herraje');
    await applyMap(tableroMap, materialesInventory, 'tablero');
    await applyMap(cantoMap, cantosInventory, 'canto');

    setHerajesInventory((prev) => prev.map((item) => {
      const amount = Number(herrajeMap[item.id] || 0);
      return amount ? { ...item, cantidad_disponible: mode === 'consume' ? Math.max(0, Number(item.cantidad_disponible || 0) - amount) : mode === 'reopen' ? Number(item.cantidad_disponible || 0) + amount : item.cantidad_disponible, cantidad_reservada: mode === 'reopen' ? Number(item.cantidad_reservada || 0) + amount : Math.max(0, Number(item.cantidad_reservada || 0) - amount) } : item;
    }));
    setMaterialesInventory((prev) => prev.map((item) => {
      const amount = Number(tableroMap[item.id] || 0);
      return amount ? { ...item, cantidad_disponible: mode === 'consume' ? Math.max(0, Number(item.cantidad_disponible || 0) - amount) : mode === 'reopen' ? Number(item.cantidad_disponible || 0) + amount : item.cantidad_disponible, cantidad_reservada: mode === 'reopen' ? Number(item.cantidad_reservada || 0) + amount : Math.max(0, Number(item.cantidad_reservada || 0) - amount) } : item;
    }));
    setCantosInventory((prev) => prev.map((item) => {
      const amount = Number(cantoMap[item.id] || 0);
      return amount ? { ...item, cantidad_disponible: mode === 'consume' ? Math.max(0, Number(item.cantidad_disponible || 0) - amount) : mode === 'reopen' ? Number(item.cantidad_disponible || 0) + amount : item.cantidad_disponible, cantidad_reservada: mode === 'reopen' ? Number(item.cantidad_reservada || 0) + amount : Math.max(0, Number(item.cantidad_reservada || 0) - amount) } : item;
    }));

    reservationBaselineRef.current = {};
    boardReservationBaselineRef.current = {};
    cantoReservationBaselineRef.current = {};
    reservationsReadyRef.current = true;
    boardReservationsReadyRef.current = true;
    cantoReservationsReadyRef.current = true;
  };

  const handleApproveProject = async () => {
    try {
      await updateProjectState('ACEPTADA');
      showToast('success', 'Cotización aceptada');
    } catch (error) {
      console.error('Error aprobando proyecto', error);
      showToast('error', 'No se pudo aprobar el proyecto');
    }
  };

  const handleRejectProject = async () => {
    try {
      await applyFinalInventoryTransition({ mode: 'release' });
      await updateProjectState('RECHAZADA');
      showToast('success', 'Proyecto rechazado y reservas liberadas');
    } catch (error) {
      console.error('Error rechazando proyecto', error);
      showToast('error', 'No se pudo rechazar el proyecto');
    }
  };

  const handleInvoiceProject = async () => {
    try {
      await updateProjectState('FACTURACION');
      setBillingModalOpen(true);
      setCashReceived('');
    } catch (error) {
      console.error('Error preparando facturación', error);
      showToast('error', 'No se pudo iniciar facturación');
    }
  };

  const completeBilling = async () => {
    try {
      await applyFinalInventoryTransition({ mode: 'consume' });
      await updateProjectState('FACTURADA');
      setBillingModalOpen(false);
      setCashReceived('');
      showToast('success', 'Proyecto facturado y stock consumido');
    } catch (error) {
      console.error('Error completando facturación', error);
      showToast('error', 'No se pudo completar la facturación');
    }
  };

  const handleBackToEdition = async () => {
    try {
      await applyFinalInventoryTransition({ mode: 'reopen' });
      await updateProjectState('EDICION');
      setBillingModalOpen(false);
      setCashReceived('');
      showToast('success', 'Proyecto volvió a edición');
    } catch (error) {
      console.error('Error regresando proyecto a edición', error);
      showToast('error', 'No se pudo volver a edición');
    }
  };

  const recalculateHardwareTotal = (items = []) => {
    return items.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  };

  const addManualServiceToMaterial = (servicio, materialId) => {
    if (!servicio) return;

    setHardwareData((prev) => {
      const currentItems = prev?.items || [];
      const existing = currentItems.find((item) => item.origen === 'manual' && item.servicio_id === servicio.id && item.material_id === materialId);

      let nextItems;
      if (existing) {
        nextItems = currentItems.map((item) => item === existing
          ? {
              ...item,
              cantidad: Number(item.cantidad || 0) + 1,
              subtotal: (Number(item.cantidad || 0) + 1) * Number(item.precio || 0)
            }
          : item
        );
      } else {
        const precio = Number(servicio.precio || 0);
        nextItems = [
          ...currentItems,
          {
            id: `srv_${materialId}_${Date.now()}`,
            material_id: materialId,
            servicio_id: servicio.id,
            nombre: servicio.nombre,
            origen: 'manual',
            cantidad: 1,
            precio,
            subtotal: precio
          }
        ];
      }

      return { ...prev, items: nextItems, total: recalculateHardwareTotal(nextItems) };
    });

    setToast({ type: 'success', message: `${servicio.nombre} agregado` });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddService = (materialId) => {
    if (!servicios.length) {
      setToast({ type: 'error', message: 'No hay servicios configurados' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setServicePicker({ open: true, materialId, query: '' });
  };

  const closeServicePicker = () => {
    setServicePicker({ open: false, materialId: null, query: '' });
  };

  const filteredServices = servicios.filter((s) =>
    (s.nombre || '').toLowerCase().includes((servicePicker.query || '').toLowerCase())
  );

  const handleUpdateManualQuantity = (servicioId, materialId, nuevaCantidad) => {
    setHardwareData((prev) => {
      const currentItems = prev?.items || [];
      const filteredItems = currentItems.filter(
        (item) => !(item.origen === 'manual' && item.servicio_id === servicioId && item.material_id === materialId && Number(nuevaCantidad) <= 0)
      );

      const nextItems = Number(nuevaCantidad) <= 0
        ? filteredItems
        : filteredItems.map((item) => (
            item.origen === 'manual' && item.servicio_id === servicioId && item.material_id === materialId
              ? {
                  ...item,
                  cantidad: Number(nuevaCantidad),
                  subtotal: Number(nuevaCantidad) * Number(item.precio || 0)
                }
              : item
          ));

      return { ...prev, items: nextItems, total: recalculateHardwareTotal(nextItems) };
    });
  };

  const handleExportPDF = async () => {
    try {
      // Get servicios consolidados
      const serviciosManuales = (hardwareData.items || []).filter(item => item.servicio_id || item.origen === 'manual');
      const serviciosData = calculateServicesTotal(despieceData, servicios, serviciosManuales, materialesInventory, cantosInventory);

      const validity = new Date();
      validity.setDate(validity.getDate() + 3);
      const validez = validity.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

      const doc = await generateCotizacionPDF({
        projectName: project?.title || project?.name || 'Proyecto',
        clientName: project?.client || project?.client_name || '',
        clientDoc: project?.client_doc || '',
        clientPhone: project?.client_phone || '',
        clientEmail: project?.client_email || '',
        advisorName: project?.advisor_name || '',
        advisorPhone: project?.advisor_phone || '',
        validez,
        despieceData,
        serviciosData,
        hardwareData,
        companyName: companySettings?.company_name || 'Mi Empresa',
        companyNit: companySettings?.nit || 'XXX.XXX.XXX-X',
        companyLogo: companySettings?.logo_data || '',
        companyAddress: companySettings?.address || '',
        companyEmail: companySettings?.contact_email || '',
        companyPhone: companySettings?.contact_phone || '',
        conditions: [
          'Validez de la oferta 3 días.',
          'Cotización sujeta a revisión de condiciones.',
          'Precios incluyen IVA.',
          'Antes de comprar verifique existencias.'
        ]
      });

      doc.save(`${project?.title || project?.name || 'cotizacion'}_${new Date().toISOString().split('T')[0]}.pdf`);
      if (state === 'EDICION') {
        await updateProjectState('COTIZACION');
      }
    } catch(err) {
      console.error("Error exportando PDF:", err);
      alert("Error al exportar PDF: " + err.message);
    }
  };

  const projectName = project?.title || `Proyecto #${id}`;
  const clientName = project?.client || 'Cliente No Asignado';
  const state = project?.state || 'EDICION';
  const totalToCharge = Number(project?.total || hardwareData?.total || 0);
  const changeDue = Math.max(0, Number(cashReceived || 0) - totalToCharge);

  const tabs = [
    { id: 'despiece', label: 'Despiece', icon: 'architecture' },
    { id: 'herajes', label: 'Herrajes y Extras', icon: 'hardware' },
    { id: 'resumen', label: 'Cotización', icon: 'receipt_long' }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Toast notification */}
      {toast && (
        <div 
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {servicePicker.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#1a233a] bg-[#0a1122] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1a233a] px-5 py-4 bg-[#060e20]">
              <div>
                <h3 className="text-[#dee5ff] font-bold font-['Space_Grotesk']">Agregar servicio a la lámina</h3>
                <p className="text-[#a3aac4] text-sm mt-1">Elegí un servicio del catálogo</p>
              </div>
              <button
                onClick={closeServicePicker}
                className="text-[#a3aac4] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 border-b border-[#1a233a]">
              <input
                type="text"
                autoFocus
                value={servicePicker.query}
                onChange={(e) => setServicePicker((prev) => ({ ...prev, query: e.target.value }))}
                placeholder="Buscar servicio..."
                className="w-full bg-[#060e20] border border-[#1a233a] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#00e0fe]/50 focus:ring-1 focus:ring-[#00e0fe]/50 transition-all placeholder:text-[#40485d]"
              />
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-3">
              {filteredServices.length === 0 ? (
                <div className="text-center text-[#a3aac4] py-10">
                  <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                  <p>No hay servicios que coincidan</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredServices.map((servicio) => (
                    <button
                      key={servicio.id}
                      onClick={() => {
                        addManualServiceToMaterial(servicio, servicePicker.materialId);
                        closeServicePicker();
                      }}
                      className="w-full text-left rounded-xl border border-[#1a233a] bg-[#060e20] px-4 py-3 hover:border-[#00d1ed]/50 hover:bg-[#0f1930] transition-all"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[#dee5ff] font-medium">{servicio.nombre}</div>
                          <div className="text-[#a3aac4] text-sm">{servicio.descripcion || 'Sin descripción'}</div>
                        </div>
                        <div className="text-[#00d1ed] font-bold whitespace-nowrap">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(servicio.precio || 0))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {billingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#1a233a] bg-[#0a1122] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1a233a] px-5 py-4 bg-[#060e20]">
              <div>
                <h3 className="text-[#dee5ff] font-bold font-['Space_Grotesk']">Facturación</h3>
                <p className="text-[#a3aac4] text-sm mt-1">Calculá vuelto o omití</p>
              </div>
              <button onClick={() => setBillingModalOpen(false)} className="text-[#a3aac4] hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-[#1a233a] bg-[#060e20] px-4 py-3">
                <div className="text-[#a3aac4] text-sm">Total</div>
                <div className="text-[#dee5ff] font-bold text-2xl">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalToCharge)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#a3aac4] mb-2">Efectivo recibido</label>
                <input type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className="w-full bg-[#060e20] border border-[#1a233a] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#00e0fe]/50" />
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
                <div className="text-cyan-200 text-sm">Vuelto</div>
                <div className="text-cyan-300 font-bold text-2xl">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(changeDue)}</div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={completeBilling} className="px-4 py-2 rounded-lg border border-[#1a233a] bg-[#10182d] text-[#99f7ff] hover:bg-[#15213b]">Omitir</button>
                <button onClick={completeBilling} className="px-4 py-2 rounded-lg border border-[#00e0fe] bg-[#00e0fe] text-[#0a1122] font-semibold hover:bg-[#00d0ff]">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Header Fijo del Workspace */}
      <header className="shrink-0 bg-[#060e20] border-b border-[#1a233a] sticky top-0 z-10">
        <div className="px-5 pt-4 pb-0">
          
          <div className="flex items-start justify-between mb-4 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => navigate('/dashboard')}
                className="group w-9 h-9 flex items-center justify-center rounded-full bg-[#1a233a]/50 text-[#a3aac4] hover:text-[#99f7ff] border border-[#40485d]/30 transition-all shrink-0"
                title="Volver a Proyectos"
              >
                <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
              </button>
              
              <div className="min-w-0">
                <h1 className="font-['Space_Grotesk'] text-[26px] font-bold text-[#dee5ff] flex items-center gap-2 min-w-0">
                  <span className="truncate">{projectName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider border align-middle ${
                    state === 'FACTURADA' ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' : 
                    state === 'FACTURACION' ? 'bg-violet-500/10 text-violet-300 border-violet-500/20' : 
                    state === 'ACEPTADA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                    state === 'COTIZACION' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 
                    state === 'RECHAZADA' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {state}
                  </span>
                </h1>
                <p className="text-[#a3aac4] text-sm mt-0.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">person</span>
                  Cliente: <strong className="text-[#dee5ff]">{clientName}</strong>
                </p>
              </div>
            </div>

             <div className="flex gap-2">
                {state === 'EDICION' && activeTab === 'resumen' && (
                  <>
                    <button
                      onClick={handleExportPDF}
                      className="bg-amber-500/10 border border-amber-500/20 text-amber-300 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-500/15 transition-colors flex items-center gap-2 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                      Emitir cotización
                    </button>
                  </>
                )}
                {state === 'COTIZACION' && (
                  <>
                    <button
                      onClick={handleRejectProject}
                      className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-500/15 transition-colors flex items-center gap-2 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                      Rechazar
                    </button>
                    <button
                      onClick={handleApproveProject}
                      className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-500/15 transition-colors flex items-center gap-2 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      Aceptar
                    </button>
                  </>
                )}
                {state === 'ACEPTADA' && (
                  <button
                    onClick={handleInvoiceProject}
                    className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-cyan-500/15 transition-colors flex items-center gap-2 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                    Ir a facturación
                  </button>
                )}
                {state === 'FACTURACION' && (
                  <button
                    onClick={() => setBillingModalOpen(true)}
                    className="bg-violet-500/10 border border-violet-500/20 text-violet-300 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-500/15 transition-colors flex items-center gap-2 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">calculate</span>
                    Completar facturación
                  </button>
                )}
                {state === 'FACTURADA' && (
                  <button
                    onClick={handleBackToEdition}
                    className="bg-blue-500/10 border border-blue-500/20 text-blue-300 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-500/15 transition-colors flex items-center gap-2 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Volver a edición
                  </button>
                )}
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#1a233a] border border-[#40485d]/50 text-[#dee5ff] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#202b46] transition-colors flex items-center gap-2 disabled:opacity-50 shrink-0"
                >
                  {isSaving ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin text-[#00e0fe]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">save</span>
                  )}
                  {isSaving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
             
             {/* Compact Stats - Moved from Despiece body */}
             {activeTab === 'despiece' && (
                <div className="flex gap-2">
                   <DespieceStatsBar 
                     laminaCount={despieceStats.laminaCount}
                     piezaCount={despieceStats.piezaCount}
                     onOpenNesting={openNestingHandler}
                     compact={true}
                   />
                </div>
              )}
          </div>

          {/* Nav Tabs */}
          <nav className="flex gap-1 overflow-x-auto scroolbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#00e0fe] text-[#00e0fe]'
                    : 'border-transparent text-[#a3aac4] hover:text-[#dee5ff] hover:bg-[#1a233a]/20 rounded-t-lg'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${activeTab === tab.id ? 'text-[#00e0fe]' : ''}`}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Area para las pestañas */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#0a1122]">
        {loading ? (
           <div className="flex h-full items-center justify-center text-[#00e0fe]">
             <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
             Cargando proyecto...
           </div>
        ) : (
          <>
             {activeTab === 'despiece' && (
                <Despiece 
                  initialData={despieceData} 
                  onChange={setDespieceData}
                  onStatsChange={setDespieceStats}
                  onOpenNesting={setOpenNestingHandler}
                  isNested={true} 
                  projectName={projectName}
                  clientName={clientName}
                />
             )}
            {activeTab === 'herajes' && (
              <HerajesPanel 
                initialData={hardwareData} 
                onChange={setHardwareData} 
              />
            )}
            {activeTab === 'resumen' && (
              <ResumenPanel 
                despieceData={despieceData}
                despieceStats={despieceStats}
                hardwareData={hardwareData}
                servicios={servicios}
                cantosInventory={cantosInventory}
                inventoryItems={materialesInventory}
                onExportPDF={handleExportPDF}
                onAddService={handleAddService}
                onUpdateManualQuantity={handleUpdateManualQuantity}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
