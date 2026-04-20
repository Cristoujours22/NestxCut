import { useEffect, useMemo, useState } from 'react';
import InventoryTabs from './InventoryTabs';
import InventoryToolbar from './InventoryToolbar';
import InventoryTable from './InventoryTable';
import InventoryFormModal from './InventoryFormModal';
import InventoryAlertsPanel from './InventoryAlertsPanel';
import InventoryDeleteModal from './InventoryDeleteModal';
import { CANTO_COLUMNS } from '../../features/inventory/config/cantoColumns';
import { TABLERO_COLUMNS } from '../../features/inventory/config/tableroColumns';
import { HERRAJE_COLUMNS } from '../../features/inventory/config/herrajeColumns';
import { filterInventoryItems } from '../../features/inventory/utils/inventoryStock';

function MovementsView({ movements, items }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#1a233a] bg-[#0a1122]">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-[#060e20]/60 text-[#a3aac4] text-[11px] font-bold tracking-widest uppercase">
          <tr>
            <th className="px-4 py-3 border-b border-[#1a233a]">Fecha</th>
            <th className="px-4 py-3 border-b border-[#1a233a]">Item</th>
            <th className="px-4 py-3 border-b border-[#1a233a]">Tipo</th>
            <th className="px-4 py-3 border-b border-[#1a233a]">Cantidad</th>
            <th className="px-4 py-3 border-b border-[#1a233a]">Motivo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1a233a]">
          {movements.length === 0 ? (
            <tr><td colSpan="5" className="px-4 py-10 text-[#6f7a97] text-center">Todavía no hay movimientos registrados.</td></tr>
          ) : movements.map((movement) => {
            const item = items.find((entry) => entry.id === movement.item_id);
            return (
              <tr key={movement.id}>
                <td className="px-4 py-3 text-[#dee5ff]">{new Date(movement.created_at).toLocaleString('es-CO')}</td>
                <td className="px-4 py-3 text-[#dee5ff]">{item?.nombre || 'Item eliminado'}</td>
                <td className="px-4 py-3 text-[#dee5ff] capitalize">{movement.movement_type}</td>
                <td className="px-4 py-3 text-[#dee5ff]">{movement.cantidad}</td>
                <td className="px-4 py-3 text-[#a3aac4]">{movement.motivo || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function InventoryPage() {
  const API = window.electronAPI;
  const [activeTab, setActiveTab] = useState('tableros');
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('todos');
  const [specificFilter, setSpecificFilter] = useState('todos');
  const [modalState, setModalState] = useState({ open: false, type: 'tablero', item: null });
  const [deleteState, setDeleteState] = useState({ open: false, item: null });
  const [submitError, setSubmitError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [inventoryItems, inventoryMovements] = await Promise.all([
        API?.getInventoryItems ? API.getInventoryItems() : [],
        API?.getInventoryMovements ? API.getInventoryMovements() : [],
      ]);
      setItems(inventoryItems || []);
      setMovements(inventoryMovements || []);
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
  }), [items, itemType, search, status, specificFilter]);
  const columns = activeTab === 'herrajes' ? HERRAJE_COLUMNS : activeTab === 'cantos' ? CANTO_COLUMNS : TABLERO_COLUMNS;
  const specificFilterOptions = useMemo(() => {
    const field = itemType === 'tablero' ? 'material' : itemType === 'canto' ? 'tipo_canto' : 'tipo';
    return [...new Set(items.filter((item) => item.item_type === itemType).map((item) => item[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [items, itemType]);

  const handleDelete = async (item) => {
    if (API?.addInventoryMovement) {
      await API.addInventoryMovement({
        item_id: item.id,
        movement_type: 'salida',
        cantidad: Number(item.cantidad_disponible || 0),
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
          await API.addInventoryMovement({
            item_id: payload.id,
            movement_type: 'ajuste',
            cantidad: Math.abs(nextQuantity - previousQuantity),
            motivo: `Ajuste manual de stock (${previousQuantity} → ${nextQuantity})`,
          });
        }
      } else {
        const result = await API.addInventoryItem(payload);

        if (API?.addInventoryMovement && result?.id && nextQuantity > 0) {
          await API.addInventoryMovement({
            item_id: result.id,
            movement_type: 'entrada',
            cantidad: nextQuantity,
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

  return (
    <div className="p-8 space-y-6 pb-20">
      <InventoryDeleteModal
        isOpen={deleteState.open}
        item={deleteState.item}
        onClose={() => setDeleteState({ open: false, item: null })}
        onConfirm={() => handleDelete(deleteState.item)}
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
          onNewItem={() => {
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
          <InventoryAlertsPanel items={items} />
        ) : activeTab === 'movimientos' ? (
          <MovementsView movements={movements} items={items} />
        ) : (
            <InventoryTable
              columns={columns}
              items={filteredItems}
              onEdit={(item) => {
                setSubmitError('');
                setModalState({ open: true, type: item.item_type, item });
              }}
              onDelete={(item) => setDeleteState({ open: true, item })}
            />
          )}
        </section>

      <InventoryFormModal
        isOpen={modalState.open}
        type={modalState.type}
        item={modalState.item}
        existingItems={items}
        onClose={() => {
          setSubmitError('');
          setModalState({ open: false, type: itemType, item: null });
        }}
        onSubmit={handleSubmit}
        submitError={submitError}
      />
    </div>
  );
}
