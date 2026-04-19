function createServiceApi(ipcRenderer) {
  return {
    getServicios: () => ipcRenderer.invoke('get-servicios'),
    getServicio: (id) => ipcRenderer.invoke('get-servicio', id),
    addServicio: (servicio) => ipcRenderer.invoke('add-servicio', servicio),
    updateServicio: (servicio) => ipcRenderer.invoke('update-servicio', servicio),
    deleteServicio: (id) => ipcRenderer.invoke('delete-servicio', id),
  };
}

module.exports = { createServiceApi };
