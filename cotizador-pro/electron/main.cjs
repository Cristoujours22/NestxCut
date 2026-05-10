const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const crypto = require('crypto');
const { machineIdSync } = require('node-machine-id');
const { registerInventoryHandlers } = require('./ipc/inventoryHandlers.cjs');
const { registerServiceHandlers } = require('./ipc/serviceHandlers.cjs');
const { createSqliteProjectStore } = require('./services/sqliteProjectStore.cjs');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');

let mainWindow;
let sqliteProjectStore;

const isDev = !app.isPackaged;

// ============ AUTO UPDATER ============
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => {
  console.log('[Updater] Checking for update...');
  mainWindow?.webContents.send('update-status', { status: 'checking' });
});

autoUpdater.on('update-available', (info) => {
  console.log('[Updater] Update available:', info.version);
  mainWindow?.webContents.send('update-status', { status: 'available', version: info.version });
});

autoUpdater.on('update-not-available', () => {
  console.log('[Updater] Up to date');
  mainWindow?.webContents.send('update-status', { status: 'up-to-date' });
});

autoUpdater.on('download-progress', (progress) => {
  console.log('[Updater] Download progress:', progress.percent.toFixed(1) + '%');
  mainWindow?.webContents.send('update-status', { status: 'downloading', percent: progress.percent });
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[Updater] Update downloaded:', info.version);
  mainWindow?.webContents.send('update-status', { status: 'downloaded', version: info.version });
});

autoUpdater.on('error', (err) => {
  console.error('[Updater] Error:', err.message);
  mainWindow?.webContents.send('update-status', { status: 'error', message: err.message });
});

// IPC handlers for updater
ipcMain.handle('check-for-updates', async () => {
  if (!isDev) {
    autoUpdater.checkForUpdates();
  }
  return { ok: true };
});

ipcMain.handle('install-update', async () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});
// ============ END AUTO UPDATER ============

const DATA_FILE = () => path.join(app.getPath('userData'), 'cotizador-store.json');

function defaultState() {
  return {
    productos: [],
    servicios: [],
    company_settings: [],
    projects: [],
    clientes: [],
    inventory_items: [],
    inventory_movements: [],
    inventory_providers: [],
    inventory_purchases: [],
  };
}

function loadState() {
  const file = DATA_FILE();
  if (!fs.existsSync(file)) return defaultState();
  try {
    return { ...defaultState(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch (err) {
    console.error('Error reading store, starting fresh:', err.message);
    return defaultState();
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  const startUrl = isDev
    ? 'http://localhost:5174'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  console.log('[main] isDev:', isDev, 'startUrl:', startUrl);

  mainWindow.loadURL(startUrl);
  if (isDev) mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  sqliteProjectStore = createSqliteProjectStore({ app });
  sqliteProjectStore.migrateLegacyData(loadState());
  registerInventoryHandlers({
    ipcMain,
    getDb: () => null,
    saveState: () => {},
    getInventoryStore: () => sqliteProjectStore,
  });
  registerServiceHandlers({
    ipcMain,
    getDb: () => null,
    getServiceStore: () => sqliteProjectStore,
  });
  createWindow();

  // Check for updates after window is ready (production only)
  if (!isDev) {
    mainWindow.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        autoUpdater.checkForUpdates();
      }, 3000);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.handle('get-stable-hid', async () => {
  try {
    const rawId = machineIdSync(true);
    const hash = crypto.createHash('sha256').update(String(rawId)).digest('hex').toUpperCase();
    return `HID-${hash.slice(0, 12)}`;
  } catch (err) {
    console.error('Error generating stable HID:', err.message);
    throw err;
  }
});

// IPC to expose environment variables for Paddle
ipcMain.handle('get-env', async () => {
  return {
    PADDLE_ENV: process.env.PADDLE_ENV || 'sandbox',
    PADDLE_VENDOR_ID: process.env.PADDLE_VENDOR_ID || '54972',
    PADDLE_PRICE_ID: process.env.PADDLE_PRICE_ID || 'pri_01kn8jhf5wjg2pjfdfbfw522pp',
    PADDLE_CLIENT_TOKEN: process.env.PADDLE_CLIENT_TOKEN || 'test_a1214e7982f9490b485c72877e0'
  };
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    try {
      if (sqliteProjectStore) sqliteProjectStore.close();
    } catch (err) {
      console.error('Error closing SQLite store:', err.message);
    }
    app.quit();
  }
});

// Save company logo to file
ipcMain.handle('save-company-logo', async (event, fileData) => {
  return new Promise((resolve, reject) => {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Create logos directory if not exists
      const logosDir = path.join(app.getPath('userData'), 'logos');
      if (!fs.existsSync(logosDir)) {
        fs.mkdirSync(logosDir, { recursive: true });
      }
      
      // Generate filename
      const filename = `logo_${Date.now()}.png`;
      const filePath = path.join(logosDir, filename);
      
      // Convert base64 to buffer and save
      const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);
      
      // Return filename and data URL
      resolve({ filename, dataUrl: fileData });
    } catch (err) {
      reject(new Error('Failed to save logo: ' + err.message));
    }
  });
});

// Get company logo data
ipcMain.handle('get-file-data', async (event, filename) => {
  return new Promise((resolve, reject) => {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const logosDir = path.join(app.getPath('userData'), 'logos');
      const filePath = path.join(logosDir, filename);
      
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const base64 = buffer.toString('base64');
        resolve(`data:image/png;base64,${base64}`);
      } else {
        resolve(null);
      }
    } catch (err) {
      resolve(null);
    }
  });
});

// Open URL in system browser
ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
  return { success: true };
});

// --- PROJECTS IPC HANDLERS ---
ipcMain.handle('get-client-by-document', async (event, documento) => {
  try {
    if (!sqliteProjectStore) throw new Error('SQLite project store not connected.');
    return sqliteProjectStore.getClientByDocument(documento);
  } catch (err) {
    console.error('IPC get-client-by-document error:', err.message);
    throw err;
  }
});

ipcMain.handle('save-client', async (event, client) => {
  try {
    if (!sqliteProjectStore) throw new Error('SQLite project store not connected.');
    return sqliteProjectStore.saveClient(client);
  } catch (err) {
    console.error('IPC save-client error:', err.message);
    throw err;
  }
});

ipcMain.handle('get-projects', async (event, ownerUid) => {
  try {
    if (!sqliteProjectStore) throw new Error('SQLite project store not connected.');
    return sqliteProjectStore.getProjects(ownerUid);
  } catch (err) {
    console.error('IPC get-projects error:', err.message);
    throw err;
  }
});

ipcMain.handle('get-project', async (event, id, ownerUid) => {
  try {
    if (!sqliteProjectStore) throw new Error('SQLite project store not connected.');
    return sqliteProjectStore.getProject(id, ownerUid);
  } catch (err) {
    console.error('IPC get-project error:', err.message);
    throw err;
  }
});

ipcMain.handle('save-project', async (event, project) => {
  try {
    if (!sqliteProjectStore) throw new Error('SQLite project store not connected.');
    return sqliteProjectStore.saveProject(project);
  } catch (err) {
    console.error('Error saving project:', err.message);
    throw err;
  }
});

ipcMain.handle('delete-project', async (event, id, ownerUid) => {
  try {
    if (!sqliteProjectStore) throw new Error('SQLite project store not connected.');
    return sqliteProjectStore.deleteProject(id, ownerUid);
  } catch (err) {
    console.error('Error deleting project:', err.message);
    throw err;
  }
});

// Simple file-based storage for company settings (bypass SQLite issues)
function getCompanySettingsPath() {
  return path.join(app.getPath('userData'), 'company-settings.json');
}

// Get company settings
ipcMain.handle('get-company-settings', async () => {
  const filePath = getCompanySettingsPath();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[main] Error reading settings:', e);
  }
  return {};
});

// Save company settings
ipcMain.handle('save-company-settings', async (event, settings) => {
  console.log('[main] save-company-settings:', { company_name: settings.company_name, logo_data: settings.logo_data?.length });
  const filePath = getCompanySettingsPath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
    console.log('[main] Save success');
    return { success: true, id: 1 };
  } catch (e) {
    console.error('[main] Save error:', e);
    return { success: false, error: e.message };
  }
});
