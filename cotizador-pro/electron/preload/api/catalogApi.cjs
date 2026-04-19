function createCatalogApi(ipcRenderer) {
  return {
    getProductos: () => ipcRenderer.invoke('get-productos'),
    addProducto: (nombre, precio) => ipcRenderer.invoke('add-producto', nombre, precio),
  };
}

module.exports = { createCatalogApi };
