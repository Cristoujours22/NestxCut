function createProjectApi(ipcRenderer) {
  return {
    getProjects: () => ipcRenderer.invoke('get-projects'),
    getProject: (id) => ipcRenderer.invoke('get-project', id),
    saveProject: (project) => ipcRenderer.invoke('save-project', project),
    deleteProject: (id) => ipcRenderer.invoke('delete-project', id),
  };
}

module.exports = { createProjectApi };
