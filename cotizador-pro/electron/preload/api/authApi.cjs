function createAuthApi(ipcRenderer) {
  return {
    login: (username, password) => ipcRenderer.invoke('login', username, password),
    getSession: () => ipcRenderer.invoke('get-session'),
    logout: () => ipcRenderer.invoke('logout'),
  };
}

module.exports = { createAuthApi };
