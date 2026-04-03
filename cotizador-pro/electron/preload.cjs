// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

// Define a whitelist of channels for security
const validInvokeChannels = [
  'login', 
  'get-productos', 
  'add-producto',
  // Licensing channels
  'get-plans',
  'get-license-status',
  // New licensing channels (contract-driven)
  'licensing:getStatus',
  'licensing:purchase',
  'licensing:upgrade',
  'licensing:applyPromo',
  'activate-license',
  'apply-promo-code',
  'get-company-settings',
  'save-company-settings',
  'generate-license-key',
  'get-env',
  'open-external',
  'activate-license-after-payment'
]; // Add other DB channels
const validSendChannels = []; // Channels for sending one-way messages to main
const validOnChannels = [];   // Channels for receiving messages from main

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

  // Convenience methods for common operations
  login: (username, password) => ipcRenderer.invoke('login', username, password),
  getProductos: () => ipcRenderer.invoke('get-productos'),
  addProducto: (nombre, precio) => ipcRenderer.invoke('add-producto', nombre, precio),
  
  // Licensing methods
  getPlans: () => ipcRenderer.invoke('get-plans'),
  getLicenseStatus: (userId) => ipcRenderer.invoke('get-license-status', userId),
  activateLicense: (userId, licenseKey) => ipcRenderer.invoke('activate-license', userId, licenseKey),
  applyPromoCode: (code, planId) => ipcRenderer.invoke('apply-promo-code', code, planId),
  getCompanySettings: () => ipcRenderer.invoke('get-company-settings'),
  saveCompanySettings: (settings) => ipcRenderer.invoke('save-company-settings', settings),
  generateLicenseKey: () => ipcRenderer.invoke('generate-license-key'),

  // Get Paddle config from main process
  getPaddleConfig: () => ipcRenderer.invoke('get-env'),

  // Licensing IPC wrappers
  licensingGetStatus: (payload) => ipcRenderer.invoke('licensing:getStatus', payload),
  licensingPurchase: (payload) => ipcRenderer.invoke('licensing:purchase', payload),
  licensingUpgrade: (payload) => ipcRenderer.invoke('licensing:upgrade', payload),
  licensingApplyPromo: (payload) => ipcRenderer.invoke('licensing:applyPromo', payload),

  // Open URL in system browser
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Activate license after Paddle payment
  activateLicenseAfterPayment: (paymentData) => ipcRenderer.invoke('activate-license-after-payment', paymentData),

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
