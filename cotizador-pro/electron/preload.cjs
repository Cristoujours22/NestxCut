// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

// Define a whitelist of channels for security
const validInvokeChannels = [
  'get-company-settings',
  'save-company-settings',
  'get-servicios',
  'get-servicio',
  'add-servicio',
  'update-servicio',
  'delete-servicio',
  'get-env',
  'get-stable-hid',
  'open-external',
  'get-projects',
  'get-project',
  'save-project',
  'delete-project',
  'get-inventory-items',
  'add-inventory-item',
  'update-inventory-item',
  'delete-inventory-item',
  'get-inventory-movements',
  'add-inventory-movement',
  'check-for-updates',
  'install-update',
  'get-app-version'
]; // Add other DB channels
const validSendChannels = []; // Channels for sending one-way messages to main
const validOnChannels = ['update-status'];   // Channels for receiving messages from main

console.log('Preload script executing.'); // Log for debugging

// Expose a method to get env vars from main process
const validChannelsForEnv = ['get-env'];

contextBridge.exposeInMainWorld('electronAPI', {
  // Function to call IPC handlers in the main process that return a value (using ipcMain.handle)
  invoke: (channel, ...data) => {
    if (validInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...data);
    }
    console.warn(`[Preload] Blocked invoke to invalid channel: ${channel}`);
    return Promise.reject(new Error(`Invalid invoke channel: ${channel}`)); // Reject promise for invalid channels
  },

getCompanySettings: () => ipcRenderer.invoke('get-company-settings'),
  saveCompanySettings: (settings) => ipcRenderer.invoke('save-company-settings', settings),
  saveCompanyLogo: (fileData) => ipcRenderer.invoke('save-company-logo', fileData),
  getFileData: (filename) => ipcRenderer.invoke('get-file-data', filename),

  // Services API
  getServicios: () => ipcRenderer.invoke('get-servicios'),
  getServicio: (id) => ipcRenderer.invoke('get-servicio', id),
  addServicio: (servicio) => ipcRenderer.invoke('add-servicio', servicio),
  updateServicio: (servicio) => ipcRenderer.invoke('update-servicio', servicio),
  deleteServicio: (id) => ipcRenderer.invoke('delete-servicio', id),

  // Client API
  getClientByDocument: (documento) => ipcRenderer.invoke('get-client-by-document', documento),
  saveClient: (client) => ipcRenderer.invoke('save-client', client),

  // Get Paddle config from main process
  getPaddleConfig: () => ipcRenderer.invoke('get-env'),
  getStableHid: () => ipcRenderer.invoke('get-stable-hid'),

  // Open URL in system browser
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Projects API
  getProjects: (ownerUid) => ipcRenderer.invoke('get-projects', ownerUid),
  getProject: (id, ownerUid) => ipcRenderer.invoke('get-project', id, ownerUid),
  saveProject: (project) => ipcRenderer.invoke('save-project', project),
  deleteProject: (id, ownerUid) => ipcRenderer.invoke('delete-project', id, ownerUid),

  // Inventory API
  getInventoryItems: () => ipcRenderer.invoke('get-inventory-items'),
  addInventoryItem: (item) => ipcRenderer.invoke('add-inventory-item', item),
  updateInventoryItem: (item) => ipcRenderer.invoke('update-inventory-item', item),
  deleteInventoryItem: (id) => ipcRenderer.invoke('delete-inventory-item', id),
  getInventoryMovements: () => ipcRenderer.invoke('get-inventory-movements'),
  addInventoryMovement: (movement) => ipcRenderer.invoke('add-inventory-movement', movement),

  // Updater API
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateStatus: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('update-status', subscription);
    return () => { ipcRenderer.removeListener('update-status', subscription); };
  },

  // Function to send one-way messages to the main process (using ipcMain.on)
  send: (channel, data) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
       console.warn(`[Preload] Blocked send to invalid channel: ${channel}`);
    }
  },

  // Function to subscribe to messages from the main process (using mainWindow.webContents.send)
  on: (channel, func) => {
    if (validOnChannels.includes(channel)) {
      // Wrap the callback to avoid exposing the full 'event' object
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);

      // Return a cleanup function to remove the listener
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    } else {
      console.warn(`[Preload] Blocked subscription to invalid channel: ${channel}`);
      // Return a no-op function for invalid channels
      return () => {};
    }
  }
});

console.log('electronAPI exposed to window.'); // Confirm exposure
