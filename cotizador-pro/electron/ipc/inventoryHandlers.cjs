function registerInventoryHandlers({ ipcMain, getDb, saveState }) {
  ipcMain.handle('get-inventory-items', async () => {
    const db = getDb();
    return [...(db?.state?.inventory_items || [])].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  });

  ipcMain.handle('add-inventory-item', async (event, item) => {
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
      costo_unitario: Number(item.costo_unitario || 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.state.inventory_items.push(inventoryItem);
    saveState();
    return { success: true, id: inventoryItem.id };
  });

  ipcMain.handle('update-inventory-item', async (event, item) => {
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
      costo_unitario: Number(item.costo_unitario || 0),
      updated_at: new Date().toISOString(),
    };

    saveState();
    return { success: true };
  });

  ipcMain.handle('delete-inventory-item', async (event, id) => {
    const db = getDb();
    if (!db) throw new Error('Database not connected.');

    db.state.inventory_items = (db.state.inventory_items || []).filter((entry) => entry.id !== id);
    saveState();
    return { success: true };
  });

  ipcMain.handle('get-inventory-movements', async () => {
    const db = getDb();
    return [...(db?.state?.inventory_movements || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  });

  ipcMain.handle('add-inventory-movement', async (event, movement) => {
    const db = getDb();
    if (!db) throw new Error('Database not connected.');

    const inventoryMovement = {
      ...movement,
      id: `mov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      cantidad: Number(movement.cantidad || 0),
      created_at: new Date().toISOString(),
    };

    db.state.inventory_movements = db.state.inventory_movements || [];
    db.state.inventory_movements.push(inventoryMovement);
    saveState();
    return { success: true, id: inventoryMovement.id };
  });
}

module.exports = { registerInventoryHandlers };
