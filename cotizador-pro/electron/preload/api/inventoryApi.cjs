function createInventoryApi(ipcRenderer) {
  return {
    getInventoryItems: () => ipcRenderer.invoke('get-inventory-items'),
    addInventoryItem: (item) => ipcRenderer.invoke('add-inventory-item', item),
    updateInventoryItem: (item) => ipcRenderer.invoke('update-inventory-item', item),
    deleteInventoryItem: (id) => ipcRenderer.invoke('delete-inventory-item', id),
    getInventoryMovements: () => ipcRenderer.invoke('get-inventory-movements'),
    addInventoryMovement: (movement) => ipcRenderer.invoke('add-inventory-movement', movement),
  };
}

module.exports = { createInventoryApi };
