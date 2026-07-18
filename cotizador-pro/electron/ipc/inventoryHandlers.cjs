// ── inventory mode guard ──────────────────────────────────────────────
function getInventoryMode() {
  try {
    const { app } = require('electron');
    const path = require('path');
    const fs = require('fs');
    const settingsPath = path.join(app.getPath('userData'), 'company-settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      return settings.inventory_mode || 'con_inventario';
    }
  } catch (e) {
    console.error('[inventoryHandlers] Error reading inventory mode:', e.message);
  }
  return 'con_inventario';
}

function assertInventoryEnabled() {
  const mode = getInventoryMode();
  if (mode !== 'con_inventario') {
    throw new Error('INVENTORY_DISABLED: Operación no permitida cuando el modo de inventario está deshabilitado o no pudo determinarse.');
  }
}
// ───────────────────────────────────────────────────────────────────────

function registerInventoryHandlers({ ipcMain, getDb, saveState, getInventoryStore }) {
  // ── reads (no guard needed) ──────────────────────────────────────────
  ipcMain.handle('get-inventory-purchases', async () => {
    const inventoryStore = getInventoryStore?.();
    if (inventoryStore?.getInventoryPurchases) {
      return inventoryStore.getInventoryPurchases();
    }
    const db = getDb();
    return [...(db?.state?.inventory_purchases || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  });

  ipcMain.handle('save-inventory-purchase', async (event, purchase) => {
    assertInventoryEnabled();
    const inventoryStore = getInventoryStore?.();
    if (inventoryStore?.saveInventoryPurchase) {
      return inventoryStore.saveInventoryPurchase(purchase);
    }
    const db = getDb();
    if (!db) throw new Error('Database not connected.');

    db.state.inventory_purchases = db.state.inventory_purchases || [];

    const proveedor_id = purchase.proveedor_id || '';
    const proveedor_nombre = String(purchase.proveedor_nombre || '').trim();
    const items = Array.isArray(purchase.items) ? purchase.items : [];
    if (!proveedor_id || !proveedor_nombre) throw new Error('Proveedor obligatorio.');
    if (!items.length) throw new Error('La orden de compra debe tener al menos un item.');

    const normalizedItems = items.map((item) => ({
      item_id: item.item_id,
      nombre: item.nombre,
      codigo: item.codigo,
      cantidad: Number(item.cantidad || 0),
      costo_unitario: Number(item.costo_unitario || 0),
      total: Number(item.total || (Number(item.cantidad || 0) * Number(item.costo_unitario || 0))),
    })).filter((item) => item.item_id && item.cantidad > 0);

    if (!normalizedItems.length) throw new Error('No hay items válidos en la orden de compra.');

    const total = normalizedItems.reduce((acc, item) => acc + item.total, 0);

    if (purchase.id) {
      const index = db.state.inventory_purchases.findIndex((entry) => entry.id === purchase.id);
      if (index === -1) throw new Error('Orden de compra no encontrada.');
      const current = db.state.inventory_purchases[index];
      if (current.status === 'recibida') throw new Error('No podés editar una orden ya recibida.');
      db.state.inventory_purchases[index] = {
        ...current,
        proveedor_id,
        proveedor_nombre,
        items: normalizedItems,
        total,
        notas: purchase.notas || '',
        updated_at: new Date().toISOString(),
      };
      saveState();
      return { success: true, id: purchase.id };
    }

    const newPurchase = {
      id: `po_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      proveedor_id,
      proveedor_nombre,
      items: normalizedItems,
      total,
      notas: purchase.notas || '',
      status: 'pendiente',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      received_at: '',
    };

    db.state.inventory_purchases.push(newPurchase);
    saveState();
    return { success: true, id: newPurchase.id };
  });

  ipcMain.handle('receive-inventory-purchase', async (event, purchaseId) => {
    assertInventoryEnabled();
    const inventoryStore = getInventoryStore?.();
    if (inventoryStore?.receiveInventoryPurchase) {
      return inventoryStore.receiveInventoryPurchase(purchaseId);
    }
    const db = getDb();
    if (!db) throw new Error('Database not connected.');

    db.state.inventory_purchases = db.state.inventory_purchases || [];
    db.state.inventory_items = db.state.inventory_items || [];
    db.state.inventory_movements = db.state.inventory_movements || [];

    const purchase = db.state.inventory_purchases.find((entry) => entry.id === purchaseId);
    if (!purchase) throw new Error('Orden de compra no encontrada.');
    if (purchase.status === 'recibida') throw new Error('La orden ya fue recibida.');

    purchase.items.forEach((line) => {
      const item = db.state.inventory_items.find((entry) => entry.id === line.item_id);
      if (!item) return;

      item.cantidad_disponible = Number(item.cantidad_disponible || 0) + Number(line.cantidad || 0);
      item.costo_unitario = Number(line.costo_unitario || item.costo_unitario || 0);
      item.updated_at = new Date().toISOString();

      db.state.inventory_movements.push({
        id: `mov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        item_id: item.id,
        item_name_snapshot: item.nombre || line.nombre || '',
        item_type_snapshot: item.item_type || '',
        movement_type: 'purchase_receive',
        direction: 'in',
        cantidad: Number(line.cantidad || 0),
        unit_cost: Number(line.costo_unitario || 0),
        total_cost: Number(line.total || 0),
        reference_type: 'purchase',
        reference_id: purchase.id,
        reason: `Recepción orden de compra ${purchase.id}`,
        motivo: `Recepción orden de compra ${purchase.id}`,
        notes: '',
        location_from: '',
        location_to: item.ubicacion || '',
        created_by: 'system',
        created_at: new Date().toISOString(),
      });
    });

    purchase.status = 'recibida';
    purchase.received_at = new Date().toISOString();
    purchase.updated_at = new Date().toISOString();
    saveState();
    return { success: true };
  });

  ipcMain.handle('get-inventory-providers', async () => {
    const inventoryStore = getInventoryStore?.();
    if (inventoryStore?.getInventoryProviders) {
      return inventoryStore.getInventoryProviders();
    }
    const db = getDb();
    return [...(db?.state?.inventory_providers || [])].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  });

  ipcMain.handle('save-inventory-provider', async (event, provider) => {
    const inventoryStore = getInventoryStore?.();
    if (inventoryStore?.saveInventoryProvider) {
      return inventoryStore.saveInventoryProvider(provider);
    }
    const db = getDb();
    if (!db) throw new Error('Database not connected.');

    db.state.inventory_providers = db.state.inventory_providers || [];

    const nombre = String(provider.nombre || '').trim();
    const documento = String(provider.documento || '').trim();
    if (!nombre) throw new Error('El nombre del proveedor es obligatorio.');

    const duplicatedDocument = documento && db.state.inventory_providers.some((entry) => (
      entry.documento?.trim().toLowerCase() === documento.toLowerCase() && entry.id !== provider.id
    ));
    if (duplicatedDocument) throw new Error('Ya existe un proveedor con ese documento.');

    if (provider.id) {
      const index = db.state.inventory_providers.findIndex((entry) => entry.id === provider.id);
      if (index === -1) throw new Error('Proveedor no encontrado.');
      db.state.inventory_providers[index] = {
        ...db.state.inventory_providers[index],
        ...provider,
        nombre,
        documento,
        updated_at: new Date().toISOString(),
      };
      saveState();
      return { success: true, id: provider.id };
    }

    const inventoryProvider = {
      ...provider,
      id: `prov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      nombre,
      documento,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.state.inventory_providers.push(inventoryProvider);
    saveState();
    return { success: true, id: inventoryProvider.id };
  });

  ipcMain.handle('delete-inventory-provider', async (event, id) => {
    const inventoryStore = getInventoryStore?.();
    if (inventoryStore?.deleteInventoryProvider) {
      return inventoryStore.deleteInventoryProvider(id);
    }
    const db = getDb();
    if (!db) throw new Error('Database not connected.');

    const linkedItems = (db.state.inventory_items || []).some((item) => item.proveedor_id === id);
    if (linkedItems) throw new Error('No podés eliminar un proveedor vinculado a items de inventario.');

    db.state.inventory_providers = (db.state.inventory_providers || []).filter((entry) => entry.id !== id);
    saveState();
    return { success: true };
  });

  ipcMain.handle('get-inventory-items', async () => {
    const inventoryStore = getInventoryStore?.();
    if (inventoryStore?.getInventoryItems) {
      return inventoryStore.getInventoryItems();
    }
    const db = getDb();
    return [...(db?.state?.inventory_items || [])].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  });

  ipcMain.handle('add-inventory-item', async (event, item) => {
    assertInventoryEnabled();
    const inventoryStore = getInventoryStore?.();
    if (inventoryStore?.addInventoryItem) {
      return inventoryStore.addInventoryItem(item);
    }
    const db = getDb();
    if (!db) throw new Error('Database not connected.');

    db.state.inventory_items = db.state.inventory_items || [];
    const duplicatedCode = db.state.inventory_items.some((entry) => (
      entry.codigo?.trim().toLowerCase() === item.codigo?.trim().toLowerCase()
    ));
    if (duplicatedCode) throw new Error('Ya existe un item de inventario con ese código.');

    const inventoryItem = {
      ...item,
      id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      cantidad_disponible: Number(item.cantidad_disponible || 0),
      cantidad_reservada: Number(item.cantidad_reservada || 0),
      stock_minimo: Number(item.stock_minimo || 0),
      stock_objetivo: Number(item.stock_objetivo || 0),
      costo_unitario: Number(item.costo_unitario || 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.state.inventory_items.push(inventoryItem);
    saveState();
    return { success: true, id: inventoryItem.id };
  });

  ipcMain.handle('update-inventory-item', async (event, item) => {
    assertInventoryEnabled();
    const inventoryStore = getInventoryStore?.();
    if (inventoryStore?.updateInventoryItem) {
      return inventoryStore.updateInventoryItem(item);
    }
    const db = getDb();
    if (!db) throw new Error('Database not connected.');

    db.state.inventory_items = db.state.inventory_items || [];
    const duplicatedCode = db.state.inventory_items.some((entry) => (
      entry.codigo?.trim().toLowerCase() === item.codigo?.trim().toLowerCase()
      && entry.id !== item.id
    ));
    if (duplicatedCode) throw new Error('Ya existe un item de inventario con ese código.');

    const index = db.state.inventory_items.findIndex((entry) => entry.id === item.id);
    if (index === -1) throw new Error('Inventory item not found.');

    db.state.inventory_items[index] = {
      ...db.state.inventory_items[index],
      ...item,
      cantidad_disponible: Number(item.cantidad_disponible || 0),
      cantidad_reservada: Number(item.cantidad_reservada || 0),
      stock_minimo: Number(item.stock_minimo || 0),
      stock_objetivo: Number(item.stock_objetivo || 0),
      costo_unitario: Number(item.costo_unitario || 0),
      updated_at: new Date().toISOString(),
    };

    saveState();
    return { success: true };
  });

  ipcMain.handle('delete-inventory-item', async (event, id) => {
    assertInventoryEnabled();
    const inventoryStore = getInventoryStore?.();
    if (inventoryStore?.deleteInventoryItem) {
      return inventoryStore.deleteInventoryItem(id);
    }
    const db = getDb();
    if (!db) throw new Error('Database not connected.');

    db.state.inventory_items = (db.state.inventory_items || []).filter((entry) => entry.id !== id);
    saveState();
    return { success: true };
  });

  ipcMain.handle('get-inventory-movements', async () => {
    const inventoryStore = getInventoryStore?.();
    if (inventoryStore?.getInventoryMovements) {
      return inventoryStore.getInventoryMovements();
    }
    const db = getDb();
    return [...(db?.state?.inventory_movements || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  });

  ipcMain.handle('delete-inventory-movement', async (event, id) => {
    assertInventoryEnabled();
    const inventoryStore = getInventoryStore?.();
    if (inventoryStore?.deleteInventoryMovement) {
      return inventoryStore.deleteInventoryMovement(id);
    }
    const db = getDb();
    if (!db) throw new Error('Database not connected.');

    db.state.inventory_movements = (db.state.inventory_movements || []).filter((entry) => entry.id !== id);
    saveState();
    return { success: true };
  });

  ipcMain.handle('add-inventory-movement', async (event, movement) => {
    assertInventoryEnabled();
    const inventoryStore = getInventoryStore?.();
    if (inventoryStore?.addInventoryMovement) {
      return inventoryStore.addInventoryMovement(movement);
    }
    const db = getDb();
    if (!db) throw new Error('Database not connected.');

    const item = (db.state.inventory_items || []).find((entry) => entry.id === movement.item_id);
    if (!item) throw new Error('Inventory item not found.');

    const quantity = Number(movement.cantidad || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('La cantidad del movimiento debe ser mayor a 0.');

    const movementType = movement.movement_type || 'ajuste';
    const direction = movement.direction || (movementType.includes('entrada') || movementType === 'entry' || movementType === 'adjustment_in' ? 'in' : movementType.includes('salida') || movementType === 'exit' || movementType === 'adjustment_out' ? 'out' : 'neutral');
    const unitCost = Number(movement.unit_cost ?? item.costo_unitario ?? 0);
    const totalCost = Number(movement.total_cost ?? (unitCost * quantity));

    const inventoryMovement = {
      ...movement,
      id: `mov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      item_name_snapshot: movement.item_name_snapshot || item.nombre || '',
      item_type_snapshot: movement.item_type_snapshot || item.item_type || '',
      movement_type: movementType,
      direction,
      cantidad: quantity,
      unit_cost: unitCost,
      total_cost: totalCost,
      reference_type: movement.reference_type || 'manual',
      reference_id: movement.reference_id || '',
      reason: movement.reason || movement.motivo || '',
      motivo: movement.motivo || movement.reason || '',
      notes: movement.notes || '',
      location_from: movement.location_from || '',
      location_to: movement.location_to || item.ubicacion || '',
      created_by: movement.created_by || 'system',
      created_at: new Date().toISOString(),
    };

    db.state.inventory_movements = db.state.inventory_movements || [];
    db.state.inventory_movements.push(inventoryMovement);
    saveState();
    return { success: true, id: inventoryMovement.id };
  });
}

module.exports = { registerInventoryHandlers };
