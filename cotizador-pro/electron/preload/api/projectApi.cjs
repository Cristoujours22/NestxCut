function createProjectApi(ipcRenderer) {
  return {
    getProjects: (ownerUid) => ipcRenderer.invoke('get-projects', ownerUid),
    getProject: (id, ownerUid) => ipcRenderer.invoke('get-project', id, ownerUid),
    saveProject: (project) => ipcRenderer.invoke('save-project', project),
    deleteProject: (id, ownerUid) => ipcRenderer.invoke('delete-project', id, ownerUid),
    getClientByDocument: (documento) => ipcRenderer.invoke('get-client-by-document', documento),
    saveClient: (client) => ipcRenderer.invoke('save-client', client),
  };
}

module.exports = { createProjectApi };
