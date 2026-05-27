import { useEffect, useMemo, useState } from 'react';
import InventoryTabs from './InventoryTabs';
import InventoryToolbar from './InventoryToolbar';
import InventoryTable from './InventoryTable';
import InventoryFormModal from './InventoryFormModal';
import InventoryAlertsPanel from './InventoryAlertsPanel';
import InventoryDeleteModal from './InventoryDeleteModal';
import InventoryStockEntryModal from './InventoryStockEntryModal';
import InventoryProviderModal from './InventoryProviderModal';
import InventoryPurchaseModal from './InventoryPurchaseModal';
import { CANTO_COLUMNS } from '../../features/inventory/config/cantoColumns';
import { TABLERO_COLUMNS } from '../../features/inventory/config/tableroColumns';
import { HERRAJE_COLUMNS } from '../../features/inventory/config/herrajeColumns';
import { filterInventoryItems } from '../../features/inventory/utils/inventoryStock';

function MovementsView({ movements, items, filters, onFiltersChange, onClearSelectedItem }) {
  const getMovementBadge = (movement) => {
    switch (movement.direction) {
      case 'in': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'out': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            placeholder="Buscar item o motivo..."
            className="w-full bg-[#060e20] border border-[#1a233a] text-sm text-white rounded-lg pl-3 pr-4 py-2 focus:outline-none focus:border-[#99f7ff]/50 transition-colors placeholder:text-[#40485d]"
          />
        </div>
        <select
          value={filters.direction}
          onChange={(e) => onFiltersChange({ direction: e.target.value })}
          className="bg-[#060e20] border border-[#1a233a] text-sm text-white rounded-lg px-4 py-2 focus:outline-none focus:border-[#99f7ff]/50"
        >
          <option value="todos">Todas direcciones</option>
          <option value="in">Entradas</option>
          <option value="out">Salidas</option>
          <option value="neutral">Neutros</option>
        </select>
        <select
          value={filters.type}
          onChange={(e) => onFiltersChange({ type: e.target.value })}
          className="bg-[#060e20] border border-[#1a233a] text-sm text-white rounded-lg px-4 py-2 focus:outline-none focus:border-[#99f7ff]/50"
        >
          <option value="todos">Todos tipos</option>
          <option value="entry">Entrada</option>
          <option value="exit">Salida</option>
          <option value="adjustment_in">Ajuste +</option>
          <option value="adjustment_out">Ajuste -</option>
        </select>
        {filters.itemId ? (
          <button
            onClick={onClearSelectedItem}
            className="px-4 py-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/15"
          >
            Ver todos
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#1a233a] bg-[#0a1122]">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-[#060e20]/60 text-[#a3aac4] text-[11px] font-bold tracking-widest uppercase">
          <tr>
            <th className="px-4 py-3 border-b border-[#1a233a]">Fecha</th>
            <th className="px-4 py-3 border-b border-[#1a233a]">Item</th>
            <th className="px-4 py-3 border-b border-[#1a233a]">Tipo</th>
            <th className="px-4 py-3 border-b border-[#1a233a]">Dirección</th>
            <th className="px-4 py-3 border-b border-[#1a233a]">Cantidad</th>
            <th className="px-4 py-3 border-b border-[#1a233a]">Costo Unit.</th>
            <th className="px-4 py-3 border-b border-[#1a233a]">Total</th>
            <th className="px-4 py-3 border-b border-[#1a233a]">Motivo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1a233a]">
          {movements.length === 0 ? (
            <tr><td colSpan="8" className="px-4 py-10 text-[#6f7a97] text-center">Todavía no hay movimientos registrados.</td></tr>
          ) : movements.map((movement) => {
            const item = items.find((entry) => entry.id === movement.item_id);
            return (
              <tr key={movement.id}>
                <td className="px-4 py-3 text-[#dee5ff]">{new Date(movement.created_at).toLocaleString('es-CO')}</td>
                <td className="px-4 py-3 text-[#dee5ff]">{movement.item_name_snapshot || item?.nombre || 'Item eliminado'}</td>
                <td className="px-4 py-3 text-[#dee5ff] capitalize">{movement.movement_type}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border uppercase ${getMovementBadge(movement)}`}>
                    {movement.direction || 'neutral'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#dee5ff]">{movement.cantidad}</td>
                <td className="px-4 py-3 text-[#a3aac4]">${Number(movement.unit_cost || 0).toLocaleString('es-CO')}</td>
                <td className="px-4 py-3 text-[#dee5ff] font-semibold">${Number(movement.total_cost || 0).toLocaleString('es-CO')}</td>
                <td className="px-4 py-3 text-[#6f7a97] text-xs">{movement.motivo}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function SuppliersView({ providers, onEdit, onDelete }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return providers;
    const q = search.toLowerCase();
    return providers.filter((p) =>
      [p.nombre, p.documento, p.celular, p.email].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [providers, search]);

  return (
    <div className="space-y-4">
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar proveedor..."
          className="w-full bg-[#060e20] border border-[#1a233a] text-sm text-white rounded-lg pl-3 pr-4 py-2 focus:outline-none focus:border-[#99f7ff]/50"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#1a233a] bg-[#0a1122]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#060e20]/60 text-[#a3aac4] text-[11px] font-bold tracking-widest uppercase">
            <tr>
              <th className="px-4 py-3 border-b border-[#1a233a]">Nombre / Razón social</th>
              <th className="px-4 py-3 border-b border-[#1a233a]">Documento</th>
              <th className="px-4 py-3 border-b border-[#1a233a]">Celular</th>
              <th className="px-4 py-3 border-b border-[#1a233a]">Email</th>
              <th className="px-4 py-3 border-b border-[#1a233a]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a233a]">
            {filtered.length === 0 ? (
              <tr><td colSpan="5" className="px-4 py-10 text-[#6f7a97] text-center">No hay proveedores registrados.</td></tr>
            ) : filtered.map((p) => (
              <tr key={p.id} className="hover:bg-[#0f1930]/40">
                <td className="px-4 py-3 text-[#dee5ff]">{p.nombre}</td>
                <td className="px-4 py-3 text-[#a3aac4]">{p.documento || '—'}</td>
                <td className="px-4 py-3 text-[#a3aac4]">{p.celular || '—'}</td>
                <td className="px-4 py-3 text-[#a3aac4]">{p.email || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => onEdit(p)} className="text-[#6f7a97] hover:text-[#99f7ff] p-1" title="Editar">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => { if (confirm(`Eliminar proveedor "${p.nombre}"?`)) onDelete(p); }} className="text-[#6f7a97] hover:text-red-400 p-1" title="Eliminar">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PurchasesView({ purchases, onEdit, onReceive }) {
  const statusBadge = (status) => {
    switch (status) {
      case 'received': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'partial': return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      default: return 'bg-[#1a233a] text-[#6f7a97] border-[#1a233a]';
    }
  };
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-[#1a233a] bg-[#0a1122]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#060e20]/60 text-[#a3aac4] text-[11px] font-bold tracking-widest uppercase">
            <tr>
              <th className="px-4 py-3 border-b border-[#1a233a]">ID</th>
              <th className="px-4 py-3 border-b border-[#1a233a]">Fecha</th>
              <th className="px-4 py-3 border-b border-[#1a233a]">Proveedor</th>
              <th className="px-4 py-3 border-b border-[#1a233a] text-right">Total</th>
              <th className="px-4 py-3 border-b border-[#1a233a]">Estado</th>
              <th className="px-4 py-3 border-b border-[#1a233a]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a233a]">
            {purchases.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-10 text-[#6f7a97] text-center">Sin órdenes de compra.</td></tr>
            ) : purchases.map((p) => (
              <tr key={p.id} className="hover:bg-[#0f1930]/40">
                <td className="px-4 py-3 text-[#dee5ff] font-mono text-xs">{p.id.slice(0, 10)}</td>
                <td className="px-4 py-3 text-[#a3aac4]">{new Date(p.created_at).toLocaleDateString('es-CO')}</td>
                <td className="px-4 py-3 text-[#dee5ff]">{p.proveedor_nombre}</td>
                <td className="px-4 py-3 text-[#dee5ff] text-right">${Number(p.total || 0).toLocaleString('es-CO')}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusBadge(p.status)}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {p.status !== 'received' && (
                      <button onClick={() => onReceive(p)} className="text-xs text-[#00e0fe] hover:underline">Recibir</button>
                    )}
                    <button onClick={() => onEdit(p)} className="text-xs text-[#6f7a97] hover:text-[#dee5ff]">Ver</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const API = window.electronAPI;
  const [activeTab, setActiveTab] = useState('tableros');
  const [items, setItems] = useState([]);
  const [providers, setProviders] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('todos');
  const [specificFilter, setSpecificFilter] = useState('todos');
  const [tipologiaFilter, setTipologiaFilter] = useState('todos');
  const [modalState, setModalState] = useState({ open: false, type: 'tablero', item: null });
  const [deleteState, setDeleteState] = useState({ open: false, item: null });
  const [stockEntryState, setStockEntryState] = useState({ open: false, item: null, mode: 'entry' });
  const [submitError, setSubmitError] = useState('');
  const [stockEntryError, setStockEntryError] = useState('');
  const [providerState, setProviderState] = useState({ open: false, provider: null });
  const [providerError, setProviderError] = useState('');
  const [purchaseState, setPurchaseState] = useState({ open: false, purchase: null });
  const [purchaseError, setPurchaseError] = useState('');
  const [movementFilters, setMovementFilters] = useState({ search: '', direction: 'todos', type: 'todos', itemId: '' });

  const load = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        API?.getInventoryItems ? API.getInventoryItems() : [],
        API?.getInventoryProviders ? API.getInventoryProviders() : [],
        API?.getInventoryPurchases ? API.getInventoryPurchases() : [],
        API?.getInventoryMovements ? API.getInventoryMovements() : [],
      ]);

      const inventoryItems = results[0].status === 'fulfilled' ? results[0].value : [];
      const inventoryProviders = results[1].status === 'fulfilled' ? results[1].value : [];
      const inventoryPurchases = results[2].status === 'fulfilled' ? results[2].value : [];
      const inventoryMovements = results[3].status === 'fulfilled' ? results[3].value : [];

      setItems(inventoryItems || []);
      setProviders(inventoryProviders || []);
      setPurchases(inventoryPurchases || []);
      setMovements(inventoryMovements || []);

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Error loading inventory segment ${index}:`, result.reason);
        }
      });
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setSearch('');
    setStatus('todos');
    setSpecificFilter('todos');
    setTipologiaFilter('todos');
  }, [activeTab]);

  const itemType = activeTab === 'herrajes' ? 'herraje' : activeTab === 'cantos' ? 'canto' : 'tablero';
  const filteredItems = useMemo(() => filterInventoryItems(items, {
    type: itemType,
    search,
    status,
    specificFilter: {
      field: itemType === 'tablero' ? 'material' : 'tipo',
      value: specificFilter === 'todos' ? '' : specificFilter,
    },
    tipologiaFilter: itemType === 'herraje' ? tipologiaFilter : undefined,
  }), [items, itemType, search, status, specificFilter, tipologiaFilter]);
  const columns = activeTab === 'herrajes' ? HERRAJE_COLUMNS : activeTab === 'cantos' ? CANTO_COLUMNS : TABLERO_COLUMNS;
  const filteredProviders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return providers.filter((provider) => {
      if (!query) return true;
      return [provider.nombre, provider.documento, provider.celular, provider.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [providers, search]);
  const filteredPurchases = useMemo(() => {
    const query = search.trim().toLowerCase();
    return purchases.filter((purchase) => {
      if (!query) return true;
      return [purchase.id, purchase.proveedor_nombre, purchase.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [purchases, search]);
  const filteredMovements = useMemo(() => {
    const searchQuery = movementFilters.search.trim().toLowerCase();
    return movements.filter((movement) => {
      const matchesItem = !movementFilters.itemId || movement.item_id === movementFilters.itemId;
      const matchesDirection = movementFilters.direction === 'todos' || movement.direction === movementFilters.direction;
      const matchesType = movementFilters.type === 'todos' || movement.movement_type === movementFilters.type;
      const matchesSearch = !searchQuery || [movement.item_name_snapshot, movement.reason, movement.motivo]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchQuery));
      return matchesItem && matchesDirection && matchesType && matchesSearch;
    });
  }, [movements, movementFilters]);
  const specificFilterOptions = useMemo(() => {
    const field = itemType === 'tablero' ? 'material' : itemType === 'canto' ? 'tipo_canto' : 'tipo';
    return [...new Set(items.filter((item) => item.item_type === itemType).map((item) => item[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [items, itemType]);

  const handleDelete = async (item) => {
    if (API?.addInventoryMovement) {
          await API.addInventoryMovement({
            item_id: item.id,
            item_name_snapshot: item.nombre,
            item_type_snapshot: item.item_type,
            movement_type: 'exit',
            direction: 'out',
            cantidad: Number(item.cantidad_disponible || 0),
            unit_cost: Number(item.costo_unitario || 0),
            total_cost: Number(item.costo_unitario || 0) * Number(item.cantidad_disponible || 0),
            reference_type: 'manual',
            motivo: 'Eliminación del item del inventario',
          });
        }

    await API.deleteInventoryItem(item.id);
    setDeleteState({ open: false, item: null });
    await load();
  };

  const handleSubmit = async (payload) => {
    setSubmitError('');
    try {
      const previousItem = payload.id ? items.find((item) => item.id === payload.id) : null;
      const previousQuantity = Number(previousItem?.cantidad_disponible || 0);
      const nextQuantity = Number(payload.cantidad_disponible || 0);

      if (payload.id) {
          await API.updateInventoryItem(payload);

        if (API?.addInventoryMovement && previousQuantity !== nextQuantity) {
          const increased = nextQuantity > previousQuantity;
          const diff = Math.abs(nextQuantity - previousQuantity);
          await API.addInventoryMovement({
            item_id: payload.id,
            item_name_snapshot: payload.nombre,
            item_type_snapshot: payload.item_type,
            movement_type: increased ? 'adjustment_in' : 'adjustment_out',
            direction: increased ? 'in' : 'out',
            cantidad: diff,
            unit_cost: Number(payload.costo_unitario || 0),
            total_cost: Number(payload.costo_unitario || 0) * diff,
            reference_type: 'manual',
            motivo: `Ajuste manual de stock (${previousQuantity} → ${nextQuantity})`,
          });
        }
      } else {
        const result = await API.addInventoryItem(payload);

        if (API?.addInventoryMovement && result?.id && nextQuantity > 0) {
          await API.addInventoryMovement({
            item_id: result.id,
            item_name_snapshot: payload.nombre,
            item_type_snapshot: payload.item_type,
            movement_type: 'entry',
            direction: 'in',
            cantidad: nextQuantity,
            unit_cost: Number(payload.costo_unitario || 0),
            total_cost: Number(payload.costo_unitario || 0) * nextQuantity,
            reference_type: 'manual',
            motivo: 'Carga inicial del item en inventario',
          });
        }
      }

      setModalState({ open: false, type: itemType, item: null });
      await load();
    } catch (error) {
      console.error('Error saving inventory item:', error);
      setSubmitError(error?.message || 'No se pudo guardar el item del inventario.');
    }
  };

  const handleStockEntry = async ({ itemId, cantidad, mode, motivo }) => {
    setStockEntryError('');
    try {
      const item = items.find((item) => item.id === itemId);
      if (!item) throw new Error('Item no encontrado');

      const currentQuantity = Number(item.cantidad_disponible || 0);
      const newQuantity = mode === 'exit' ? currentQuantity - cantidad : currentQuantity + cantidad;

      if (mode === 'exit' && newQuantity < 0) {
        throw new Error('La salida no puede superar el stock disponible');
      }

      await API.updateInventoryItem({
        ...item,
        cantidad_disponible: newQuantity,
      });

      if (API?.addInventoryMovement) {
        await API.addInventoryMovement({
          item_id: itemId,
          item_name_snapshot: item.nombre,
          item_type_snapshot: item.item_type,
          movement_type: mode === 'exit' ? 'exit' : 'entry',
          direction: mode === 'exit' ? 'out' : 'in',
          cantidad: cantidad,
          unit_cost: Number(item.costo_unitario || 0),
          total_cost: Number(item.costo_unitario || 0) * Number(cantidad || 0),
          reference_type: 'manual',
          motivo: motivo || (mode === 'exit' ? 'Salida rápida de stock' : 'Entrada rápida de stock'),
        });
      }

      setStockEntryState({ open: false, item: null, mode: 'entry' });
      await load();
    } catch (error) {
      console.error('Error en entrada de stock:', error);
      const message = error?.message || 'No se pudo registrar la entrada de stock';
      setStockEntryError(message);
      throw error;
    }
  };

  const handleProviderSubmit = async (payload) => {
    setProviderError('');
    try {
      await API.saveInventoryProvider(payload);
      setProviderState({ open: false, provider: null });
      await load();
    } catch (error) {
      setProviderError(error?.message || 'No se pudo guardar el proveedor.');
    }
  };

  const handleProviderDelete = async (provider) => {
    setProviderError('');
    try {
      await API.deleteInventoryProvider(provider.id);
      await load();
    } catch (error) {
      setProviderError(error?.message || 'No se pudo eliminar el proveedor.');
    }
  };

  const handlePurchaseSubmit = async (payload) => {
    setPurchaseError('');
    try {
      await API.saveInventoryPurchase(payload);
      setPurchaseState({ open: false, purchase: null });
      await load();
    } catch (error) {
      setPurchaseError(error?.message || 'No se pudo guardar la orden.');
    }
  };

  const handlePurchaseReceive = async (purchase) => {
    setPurchaseError('');
    try {
      await API.receiveInventoryPurchase(purchase.id);
      await load();
    } catch (error) {
      setPurchaseError(error?.message || 'No se pudo recibir la orden.');
    }
  };

  return (
    <div className="p-8 space-y-6 pb-20">
      <InventoryDeleteModal
        isOpen={deleteState.open}
        item={deleteState.item}
        onClose={() => setDeleteState({ open: false, item: null })}
        onConfirm={() => handleDelete(deleteState.item)}
      />

      <InventoryProviderModal
        isOpen={providerState.open}
        provider={providerState.provider}
        onClose={() => {
          setProviderError('');
          setProviderState({ open: false, provider: null });
        }}
        onSubmit={handleProviderSubmit}
        submitError={providerError}
      />

      <InventoryPurchaseModal
        isOpen={purchaseState.open}
        purchase={purchaseState.purchase}
        providers={providers}
        items={items}
        onClose={() => {
          setPurchaseError('');
          setPurchaseState({ open: false, purchase: null });
        }}
        onSubmit={handlePurchaseSubmit}
        submitError={purchaseError}
      />

      <InventoryStockEntryModal
        isOpen={stockEntryState.open}
        item={stockEntryState.item}
        mode={stockEntryState.mode}
        onClose={() => {
          setStockEntryError('');
          setStockEntryState({ open: false, item: null, mode: 'entry' });
        }}
        onSubmit={handleStockEntry}
        submitError={stockEntryError}
      />

      <InventoryFormModal
        isOpen={modalState.open}
        type={modalState.type}
        item={modalState.item}
        existingItems={items}
        providers={providers}
        onClose={() => setModalState({ open: false, type: 'tablero', item: null })}
        onSubmit={handleSubmit}
        submitError={submitError}
      />

      <section className="rounded-3xl bg-gradient-to-br from-[#0f1930] to-[#1a233a] border border-[#40485d]/30 p-8 shadow-xl">
        <div className="max-w-3xl">
          <h1 className="font-['Space_Grotesk'] text-4xl font-bold text-white mb-3">Inventario</h1>
          <p className="text-[#a3aac4] text-lg">Base central para tableros y herrajes que alimentará cotización, compras y producción.</p>
        </div>
      </section>

      <section className="bg-[#0a1122] border border-[#1a233a] rounded-3xl p-6 shadow-xl space-y-5">
        <InventoryTabs activeTab={activeTab} onChange={setActiveTab} />

        <InventoryToolbar
          activeTab={activeTab}
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          specificFilter={specificFilter}
          specificFilterOptions={specificFilterOptions}
          onSpecificFilterChange={setSpecificFilter}
          tipologiaFilter={tipologiaFilter}
          onTipologiaFilterChange={setTipologiaFilter}
          onNewItem={() => {
            if (activeTab === 'proveedores') {
              setProviderError('');
              setProviderState({ open: true, provider: null });
              return;
            }
            if (activeTab === 'compras') {
              setPurchaseError('');
              setPurchaseState({ open: true, purchase: null });
              return;
            }
            setSubmitError('');
            setModalState({ open: true, type: itemType, item: null });
          }}
        />

        {loading ? (
          <div className="flex h-56 items-center justify-center text-[#00e0fe]">
            <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
            Cargando inventario...
          </div>
        ) : activeTab === 'alertas' ? (
          <InventoryAlertsPanel
            items={items}
            onOpenStockEntry={(item) => {
              setStockEntryError('');
              setStockEntryState({ open: true, item, mode: 'entry' });
            }}
            onOpenEdit={(item) => {
              setSubmitError('');
              setModalState({ open: true, type: item.item_type, item });
            }}
          />
        ) : activeTab === 'movimientos' ? (
          <MovementsView
            movements={filteredMovements}
            items={items}
            filters={movementFilters}
            onFiltersChange={(patch) => setMovementFilters((prev) => ({ ...prev, ...patch }))}
            onClearSelectedItem={() => setMovementFilters((prev) => ({ ...prev, itemId: '' }))}
          />
        ) : activeTab === 'proveedores' ? (
          <SuppliersView
            providers={filteredProviders}
            onEdit={(provider) => {
              setProviderError('');
              setProviderState({ open: true, provider });
            }}
            onDelete={handleProviderDelete}
          />
        ) : activeTab === 'compras' ? (
          <PurchasesView
            purchases={filteredPurchases}
            onEdit={(purchase) => {
              setPurchaseError('');
              setPurchaseState({ open: true, purchase });
            }}
            onReceive={handlePurchaseReceive}
          />
        ) : (
                <InventoryTable
                  columns={columns}
                  items={filteredItems}
                  onEdit={(item) => {
                    setSubmitError('');
                    setModalState({ open: true, type: item.item_type, item });
                  }}
                  onDelete={(item) => setDeleteState({ open: true, item })}
                  onStockEntry={(item) => {
                    setStockEntryError('');
                    setStockEntryState({ open: true, item, mode: 'entry' });
                  }}
                  onStockExit={(item) => {
                    setStockEntryError('');
                    setStockEntryState({ open: true, item, mode: 'exit' });
                  }}
                  onViewMovements={(item) => {
                    setMovementFilters({ search: '', direction: 'todos', type: 'todos', itemId: item.id });
                    setActiveTab('movimientos');
                  }}
                />
          )}
        </section>
    </div>
  );
}
