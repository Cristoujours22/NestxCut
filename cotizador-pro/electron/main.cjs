const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const ipcContract = require('./ipcContract.cjs');
const LicensingService = require('./licensing/licensingService.cjs');
const { registerInventoryHandlers } = require('./ipc/inventoryHandlers.cjs');
const { registerServiceHandlers } = require('./ipc/serviceHandlers.cjs');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let mainWindow;
let db;
let licensingService;
let activeSession = null;

const isDev = process.env.ELECTRON_IS_DEV === 'true' || process.env.NODE_ENV !== 'production';

const DATA_FILE = () => path.join(app.getPath('userData'), 'cotizador-store.json');

function defaultState() {
  return {
    users: [],
    productos: [],
    servicios: [],
    plans: [],
    licenses: [],
    promo_codes: [],
    license_promos: [],
    company_settings: [],
    projects: []
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

function saveState() {
  try {
    fs.writeFileSync(DATA_FILE(), JSON.stringify(db.state, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving store:', err.message);
  }
}

function nextId(arr) {
  return arr.length ? Math.max(...arr.map((x) => Number(x.id) || 0)) + 1 : 1;
}

function createDb() {
  const state = loadState();

  const api = {
    state,
    serialize(fn) {
      fn();
    },
    close(cb) {
      saveState();
      if (cb) cb(null);
    },
    run(sql, params, cb) {
      const q = sql.replace(/\s+/g, ' ').trim().toLowerCase();
      let lastID = 0;
      try {
        if (q.startsWith('create table if not exists')) {
          if (q.includes('users')) state.users = state.users || [];
          if (q.includes('productos')) state.productos = state.productos || [];
          if (q.includes('servicios')) state.servicios = state.servicios || [];
          if (q.includes('plans')) state.plans = state.plans || [];
          if (q.includes('licenses')) state.licenses = state.licenses || [];
          if (q.includes('promo_codes')) state.promo_codes = state.promo_codes || [];
          if (q.includes('license_promos')) state.license_promos = state.license_promos || [];
          if (q.includes('company_settings')) state.company_settings = state.company_settings || [];
          if (q.includes('projects')) state.projects = state.projects || [];
          saveState();
        } else if (q.startsWith('insert into users')) {
          const [username, password] = params;
          const row = { id: nextId(state.users), username, password };
          state.users.push(row);
          lastID = row.id;
          saveState();
        } else if (q.startsWith('insert into productos')) {
          const [nombre, precio] = params;
          const row = { id: nextId(state.productos), nombre, precio: Number(precio) };
          state.productos.push(row);
          lastID = row.id;
          saveState();
        } else if (q.startsWith('insert into servicios')) {
          const [id, nombre, descripcion, atributos, modo_origen] = params;
          state.servicios = state.servicios || [];
          state.servicios.push({ id, nombre, descripcion, atributos, modo_origen: modo_origen || 'despiece', created_at: new Date().toISOString() });
          lastID = id;
          saveState();
        } else if (q.startsWith('insert into plans')) {
          const [name, price, currency, interval, trial_days, features] = params;
          const row = { id: nextId(state.plans), name, price: Number(price), currency, interval, trial_days: Number(trial_days), features, created_at: new Date().toISOString() };
          state.plans.push(row);
          lastID = row.id;
          saveState();
        } else if (q.startsWith('insert into licenses')) {
          const [license_key, user_id, plan_id, status, started_at, ends_at, trial_ends_at] = params;
          const row = { id: nextId(state.licenses), license_key, user_id, plan_id, status, started_at, ends_at, trial_ends_at, created_at: new Date().toISOString() };
          state.licenses.push(row);
          lastID = row.id;
          saveState();
        } else if (q.startsWith('update licenses set user_id')) {
          const [userId, id] = params;
          const row = state.licenses.find((r) => Number(r.id) === Number(id));
          if (row) row.user_id = userId;
          saveState();
        } else if (q.startsWith('insert into license_promos')) {
          const [license_id, promo_code_id, discount_applied] = params;
          const row = { id: nextId(state.license_promos), license_id, promo_code_id, discount_applied, applied_at: new Date().toISOString() };
          state.license_promos.push(row);
          lastID = row.id;
          saveState();
        } else if (q.startsWith('insert or replace into company_settings')) {
          const [company_name, logo_path, currency, tax_rate, contact_email, contact_phone, address] = params;
          state.company_settings = [{
            id: 1, company_name, logo_path, currency, tax_rate, contact_email, contact_phone, address, updated_at: new Date().toISOString()
          }];
          lastID = 1;
          saveState();
        } else if (q.includes('insert or replace into projects')) {
          const [id, title, client, propState, total, despiece_data, hardware_data, summary_data] = params;
          state.projects = state.projects || [];
          const i = state.projects.findIndex(p => p.id === id);
          if (i >= 0) {
            state.projects[i] = { ...state.projects[i], title, client, state: propState, total, despiece_data, hardware_data, summary_data, updated_at: new Date().toISOString() };
          } else {
            state.projects.push({ id, title, client, state: propState, total, despiece_data, hardware_data, summary_data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
          }
          saveState();
        } else if (q.includes('delete from projects')) {
          const [id] = params;
          state.projects = state.projects.filter(p => p.id !== id);
          saveState();
        } else if (q.startsWith('update users set password')) {
          const [password, id] = params;
          const u = state.users.find((r) => Number(r.id) === Number(id));
          if (u) { u.password = password; saveState(); }
        } else if (q.startsWith('update servicios')) {
          const [nombre, descripcion, atributos, modo_origen, id] = params;
          state.servicios = state.servicios || [];
          const servicio = state.servicios.find((r) => r.id === id);
          if (servicio) {
            servicio.nombre = nombre;
            servicio.descripcion = descripcion;
            servicio.atributos = atributos;
            servicio.modo_origen = modo_origen || servicio.modo_origen || 'despiece';
            saveState();
          }
        } else if (q.startsWith('delete from servicios')) {
          const [id] = params;
          state.servicios = (state.servicios || []).filter((r) => r.id !== id);
          saveState();
        } else {
          throw new Error(`Unsupported SQL in run(): ${sql}`);
        }
        if (cb) cb.call({ lastID }, null);
      } catch (err) {
        if (cb) cb(err);
      }
    },
    get(sql, params, cb) {
      const q = sql.replace(/\s+/g, ' ').trim().toLowerCase();
      try {
        let row = null;
        if (q === 'select count(*) as count from users') row = { count: state.users.length };
        else if (q === 'select count(*) as count from plans') row = { count: state.plans.length };
        else if (q === 'select id, username, password from users where username = ?') {
          const [username] = params;
          const u = state.users.find((x) => x.username === username);
          row = u ? { id: u.id, username: u.username, password: u.password } : undefined;
        } else if (q === 'select * from servicios where id = ?') {
          const [id] = params;
          row = (state.servicios || []).find((x) => x.id === id) || undefined;
        } else if (q === 'select * from plans order by id limit 1') {
          row = state.plans[0] || undefined;
        } else if (q === 'select * from licenses where license_key = ? and status = ?') {
          const [licenseKey, status] = params;
          row = state.licenses.find((x) => x.license_key === licenseKey && x.status === status) || undefined;
        } else if (q.includes('select id from licenses where user_id = ? and status = ?')) {
          const [userId, status] = params;
          row = state.licenses.find((x) => Number(x.user_id) === Number(userId) && x.status === status) || undefined;
        } else if (q.includes('from licenses l left join plans p on l.plan_id = p.id where l.user_id = ? and l.status = \'active\' order by l.created_at desc limit 1')) {
          const [userId] = params;
          const l = [...state.licenses].filter((x) => Number(x.user_id) === Number(userId) && x.status === 'active').sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          if (l) {
            const p = state.plans.find((x) => Number(x.id) === Number(l.plan_id));
            row = { ...l, plan_name: p?.name, price: p?.price, features: p?.features, trial_days: p?.trial_days };
            if (row.trial_ends_at) {
              const trialEnd = new Date(row.trial_ends_at);
              const now = new Date();
              row.is_trial_active = trialEnd > now;
              row.days_remaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
            }
          }
        } else if (q === 'select * from company_settings order by id desc limit 1') {
          row = state.company_settings[state.company_settings.length - 1] || undefined;
        } else if (q === 'select * from promo_codes where code = ? and is_active = 1') {
          const [code] = params;
          row = state.promo_codes.find((x) => x.code === code && Number(x.is_active) === 1) || undefined;
        } else if (q.includes('select * from projects where id = ?')) {
          const [id] = params;
          row = state.projects.find(p => p.id === id) || undefined;
        } else {
          throw new Error(`Unsupported SQL in get(): ${sql}`);
        }
        cb(null, row);
      } catch (err) {
        cb(err);
      }
    },
    all(sql, params, cb) {
      const q = sql.replace(/\s+/g, ' ').trim().toLowerCase();
      try {
        let rows = [];
        if (q === 'select * from productos') rows = state.productos;
        else if (q === 'select * from servicios order by nombre asc') rows = [...(state.servicios || [])].sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')));
        else if (q === 'select * from plans where 1=1') rows = state.plans;
        else if (q === 'select * from company_settings') rows = state.company_settings;
        else if (q === 'select id, username, password from users') rows = state.users.map(u => ({ id: u.id, username: u.username, password: u.password }));
        else if (q.includes('select id, title, client, state, total, created_at, updated_at from projects')) {
          rows = [...(state.projects || [])].sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
        }
        else {
          throw new Error(`Unsupported SQL in all(): ${sql}`);
        }
        cb(null, rows);
      } catch (err) {
        cb(err);
      }
    }
  };

  return api;
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

  mainWindow.loadURL(startUrl);
  if (isDev) mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initializeDatabase() {
  const dbPath = DATA_FILE();
  console.log(`Database path: ${dbPath}`);
  db = createDb();

  console.log('Successfully connected to the JSON-backed store.');

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )`, [], (err) => {
      if (err) console.error('Error creating users table:', err.message);
      db.get('SELECT COUNT(*) as count FROM users', [], (err2, row) => {
        if (!err2 && row && row.count === 0) {
          const defaultHash = bcrypt.hashSync('160490', 10);
          db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['Admin160490', defaultHash], (err3) => {
            if (err3) console.error('Error inserting default user:', err3.message);
            else console.log('Default user inserted securely.');
          });
        } else {
          // Auto-migrate: if existing user passwords are plaintext (don't start with $2), hash them
          db.all('SELECT id, username, password FROM users', [], (errM, users) => {
            if (!errM && users) {
              users.forEach(u => {
                if (u.password && !u.password.startsWith('$2')) {
                  const hashed = bcrypt.hashSync(u.password, 10);
                  db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, u.id], (errU) => {
                    if (errU) console.error(`Error migrating password for ${u.username}:`, errU.message);
                    else console.log(`[Auth] Password migrated to bcrypt for user: ${u.username}`);
                  });
                }
              });
            }
          });
        }
      });
    });

    db.run(`CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL
    )`, [], (err) => { if (err) console.error('Error creating productos table:', err.message); });

    db.run(`CREATE TABLE IF NOT EXISTS servicios (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      atributos TEXT,
      modo_origen TEXT DEFAULT 'despiece',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, [], (err) => { if (err) console.error('Error creating servicios table:', err.message); });

    db.run(`CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      interval TEXT DEFAULT 'monthly',
      trial_days INTEGER DEFAULT 0,
      features TEXT,
      paddle_product_id TEXT,
      paddle_price_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, [], (err) => {
      if (err) console.error('Error creating plans table:', err.message);
      else {
        db.get('SELECT COUNT(*) as count FROM plans', [], (err2, row) => {
          if (!err2 && row && row.count === 0) {
            db.run('INSERT INTO plans (name, price, currency, interval, trial_days, features) VALUES (?, ?, ?, ?, ?, ?)', ['Basic', 9.99, 'USD', 'monthly', 14, 'Despiece,Inventario,Cotizaciones'], (err3) => {
              if (err3) console.error('Error inserting default plan:', err3.message);
              else console.log('Default plan inserted.');
            });
          }
        });
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      plan_id INTEGER,
      status TEXT DEFAULT 'active',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ends_at DATETIME,
      trial_ends_at DATETIME,
      paddle_subscription_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, [], (err) => { if (err) console.error('Error creating licenses table:', err.message); });

    db.run(`CREATE TABLE IF NOT EXISTS promo_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      max_uses INTEGER,
      used_count INTEGER DEFAULT 0,
      start_date DATE,
      end_date DATE,
      applies_to_plan_ids TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, [], (err) => { if (err) console.error('Error creating promo_codes table:', err.message); });

    db.run(`CREATE TABLE IF NOT EXISTS license_promos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_id INTEGER,
      promo_code_id INTEGER,
      discount_applied REAL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, [], (err) => { if (err) console.error('Error creating license_promos table:', err.message); });

    db.run(`CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT,
      logo_path TEXT,
      currency TEXT DEFAULT 'USD',
      tax_rate REAL DEFAULT 0,
      contact_email TEXT,
      contact_phone TEXT,
      address TEXT,
      nit TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, [], (err) => { if (err) console.error('Error creating company_settings table:', err.message); });

    db.run(`CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      client TEXT,
      state TEXT DEFAULT 'EN PROGRESO',
      total REAL DEFAULT 0,
      despiece_data TEXT,
      hardware_data TEXT,
      summary_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, [], (err) => { if (err) console.error('Error creating projects table:', err.message); });
  });
}

app.whenReady().then(() => {
  initializeDatabase();
  registerInventoryHandlers({
    ipcMain,
    getDb: () => db,
    saveState,
  });
  registerServiceHandlers({
    ipcMain,
    getDb: () => db,
  });
  createWindow();
  licensingService = new LicensingService(db);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
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


ipcMain.handle(ipcContract.IPC_CHANNELS.LICENSING_GET_STATUS, async (event, payload) => {
  if (!payload || !payload.companyId) {
    return { success: false, error: 'MISSING_ARGS', message: 'companyId is required' };
  }
  return licensingService.getStatus(payload.companyId);
});

ipcMain.handle(ipcContract.IPC_CHANNELS.LICENSING_PURCHASE, async (event, payload) => {
  if (!payload || !payload.companyId || !payload.planId) {
    return { success: false, error: 'MISSING_ARGS', message: 'companyId and planId are required' };
  }
  const { companyId, planId, promoCode } = payload;
  return licensingService.purchase(companyId, planId, promoCode);
});

ipcMain.handle(ipcContract.IPC_CHANNELS.LICENSING_UPGRADE, async (event, payload) => {
  if (!payload || !payload.companyId || !payload.newPlanId) {
    return { success: false, error: 'MISSING_ARGS', message: 'companyId and newPlanId are required' };
  }
  const { companyId, newPlanId } = payload;
  return licensingService.upgrade(companyId, newPlanId);
});

ipcMain.handle(ipcContract.IPC_CHANNELS.LICENSING_APPLY_PROMO, async (event, payload) => {
  if (!payload || !payload.promoCode) {
    return { success: false, error: 'MISSING_ARGS', message: 'promoCode is required' };
  }
  const { promoCode } = payload;
  return licensingService.applyPromo(promoCode);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      db.close((err) => {
        if (err) console.error('Error closing store:', err.message);
        else console.log('Store connection closed.');
        app.quit();
      });
    } else {
      app.quit();
    }
  }
});

ipcMain.handle('login', async (event, username, password) => {
  console.log(`Login attempt for user: ${username}`);
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database connection error.'));
    db.get('SELECT id, username, password FROM users WHERE username = ?', [username], (err, row) => {
      if (err) return reject(new Error('Error during login process.'));
      if (row && bcrypt.compareSync(password, row.password)) {
        activeSession = { id: row.id, username: row.username };
        resolve({ success: true, userId: row.id, username: row.username });
      } else {
        resolve({ success: false, message: 'Usuario o contraseña incorrectos.' });
      }
    });
  });
});

ipcMain.handle('get-session', async () => {
  return activeSession;
});

ipcMain.handle('logout', async () => {
  activeSession = null;
  return { success: true };
});

ipcMain.handle('get-productos', async () => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not connected.'));
    db.all('SELECT * FROM productos', [], (err, rows) => {
      if (err) reject(new Error('Failed to fetch products.'));
      else resolve(rows);
    });
  });
});

ipcMain.handle('add-producto', async (event, nombre, precio) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not connected.'));
    db.run('INSERT INTO productos (nombre, precio) VALUES (?, ?)', [nombre, precio], function (err) {
      if (err) reject(new Error('Failed to add product.'));
      else resolve({ success: true, id: this.lastID });
    });
  });
});

ipcMain.handle('get-plans', async () => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not connected.'));
    db.all('SELECT * FROM plans WHERE 1=1', [], (err, rows) => {
      if (err) reject(new Error('Failed to fetch plans.'));
      else resolve(rows);
    });
  });
});

ipcMain.handle('get-license-status', async (event, userId) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not connected.'));
    const sql = `
      SELECT l.*, p.name as plan_name, p.price, p.features, p.trial_days
      FROM licenses l
      LEFT JOIN plans p ON l.plan_id = p.id
      WHERE l.user_id = ? AND l.status = 'active'
      ORDER BY l.created_at DESC LIMIT 1
    `;
    db.get(sql, [userId], (err, row) => {
      if (err) reject(new Error('Failed to fetch license.'));
      else {
        if (row && row.trial_ends_at) {
          const trialEnd = new Date(row.trial_ends_at);
          const now = new Date();
          row.is_trial_active = trialEnd > now;
          row.days_remaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        }
        resolve(row || { no_license: true });
      }
    });
  });
});

ipcMain.handle('activate-license', async (event, userId, licenseKey) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not connected.'));
    db.get('SELECT * FROM licenses WHERE license_key = ? AND status = ?', [licenseKey, 'active'], (err, existingLicense) => {
      if (err) return reject(new Error('Error checking license.'));
      if (!existingLicense) {
        db.get('SELECT * FROM plans ORDER BY id LIMIT 1', [], (err2, plan) => {
          if (err2 || !plan) return reject(new Error('No plan available.'));
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1);
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + (plan.trial_days || 14));
          db.run('INSERT INTO licenses (license_key, user_id, plan_id, status, started_at, ends_at, trial_ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [licenseKey, userId, plan.id, 'active', startDate.toISOString(), endDate.toISOString(), trialEnd.toISOString()], function (err3) {
            if (err3) return reject(new Error('Failed to create license.'));
            resolve({ success: true, license_id: this.lastID, plan });
          });
        });
      } else {
        if (existingLicense.user_id) return resolve({ success: false, message: 'License key already used.' });
        db.run('UPDATE licenses SET user_id = ? WHERE id = ?', [userId, existingLicense.id], (err2) => {
          if (err2) return reject(new Error('Failed to assign license.'));
          resolve({ success: true, license_id: existingLicense.id });
        });
      }
    });
  });
});

ipcMain.handle('apply-promo-code', async (event, code, planId) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not connected.'));
    db.get('SELECT * FROM promo_codes WHERE code = ? AND is_active = 1', [code], (err, promo) => {
      if (err) return reject(new Error('Error checking promo code.'));
      if (!promo) return resolve({ valid: false, message: 'Código inválido o expirado.' });
      const now = new Date();
      if (promo.start_date && new Date(promo.start_date) > now) return resolve({ valid: false, message: 'Código aún no válido.' });
      if (promo.end_date && new Date(promo.end_date) < now) return resolve({ valid: false, message: 'Código expirado.' });
      if (promo.max_uses && promo.used_count >= promo.max_uses) return resolve({ valid: false, message: 'Código alcanzó el límite de usos.' });
      if (promo.applies_to_plan_ids) {
        const plans = JSON.parse(promo.applies_to_plan_ids);
        if (!plans.includes(planId)) return resolve({ valid: false, message: 'Código no aplicable a este plan.' });
      }
      resolve({ valid: true, promo });
    });
  });
});

ipcMain.handle('get-company-settings', async () => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not connected.'));
    db.get('SELECT * FROM company_settings ORDER BY id DESC LIMIT 1', [], (err, row) => {
      if (err) reject(new Error('Failed to fetch settings.'));
      else resolve(row || {});
    });
  });
});

ipcMain.handle('save-company-settings', async (event, settings) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not connected.'));
    const sql = `
      INSERT OR REPLACE INTO company_settings
      (company_name, logo_path, currency, tax_rate, contact_email, contact_phone, address, nit, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    db.run(sql, [
      settings.company_name || '',
      settings.logo_path || '',
      settings.currency || 'USD',
      settings.tax_rate || 0,
      settings.contact_email || '',
      settings.contact_phone || '',
      settings.address || '',
      settings.nit || ''
    ], function (err) {
      if (err) reject(new Error('Failed to save settings.'));
      else resolve({ success: true, id: this.lastID });
    });
  });
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
  });
});

ipcMain.handle('generate-license-key', async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) key += '-';
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return { license_key: key };
});

// Open URL in system browser
ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
  return { success: true };
});

// Activate license after successful Paddle payment
ipcMain.handle('activate-license-after-payment', async (event, paymentData) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not connected.'));

    const { userId, subscriptionId, customerId, priceId } = paymentData;

    if (!userId) return reject(new Error('userId is required.'));

    console.log('[License] Activating for user:', userId, 'subscription:', subscriptionId);

    // Use default plan (id=1) since payment was successful
    const planId = 1;
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setMonth(endsAt.getMonth() + 1);

    // Check if user already has an active license
    db.get('SELECT id FROM licenses WHERE user_id = ? AND status = ?', [userId, 'active'], (err2, existing) => {
      if (err2) {
        console.error('[License] Error checking existing:', err2);
        return reject(new Error('Error checking existing license.'));
      }

      if (existing) {
        // Update existing license
        db.run('UPDATE licenses SET ends_at = ?, paddle_subscription_id = ?, status = ? WHERE id = ?',
          [endsAt.toISOString(), subscriptionId, 'active', existing.id],
          (err3) => {
            if (err3) {
              console.error('[License] Error updating:', err3);
              return reject(new Error('Error updating license.'));
            }
            console.log('[License] Updated existing license:', existing.id);
            resolve({ success: true, action: 'updated', license_id: existing.id, ends_at: endsAt.toISOString() });
          });
      } else {
        // Create new license
        const licenseKey = `LIC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        db.run(
          'INSERT INTO licenses (license_key, user_id, plan_id, status, started_at, ends_at, paddle_subscription_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [licenseKey, userId, planId, 'active', now.toISOString(), endsAt.toISOString(), subscriptionId],
          function(err3) {
            if (err3) {
              console.error('[License] Error creating:', err3);
              return reject(new Error('Error creating license.'));
            }
            console.log('[License] Created new license:', this.lastID);
            resolve({ success: true, action: 'created', license_id: this.lastID, license_key: licenseKey, ends_at: endsAt.toISOString() });
          }
        );
      }
    });
  });
});

// --- PROJECTS IPC HANDLERS ---
ipcMain.handle('get-projects', async () => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not connected.'));
    db.all('SELECT id, title, client, state, total, created_at, updated_at FROM projects ORDER BY updated_at DESC', [], (err, rows) => {
      if (err) {
        console.error("IPC get-projects error:", err.message);
        reject(err);
      }
      else resolve(rows || []);
    });
  });
});

ipcMain.handle('get-project', async (event, id) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not connected.'));
    db.get('SELECT * FROM projects WHERE id = ?', [id], (err, row) => {
      if (err) reject(new Error('Failed to fetch project.'));
      else resolve(row || null);
    });
  });
});

ipcMain.handle('save-project', async (event, project) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not connected.'));
    const sql = `
      INSERT OR REPLACE INTO projects
      (id, title, client, state, total, despiece_data, hardware_data, summary_data, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    db.run(sql, [
      project.id,
      project.title || 'Proyecto sin título',
      project.client || '',
      project.state || 'EN PROGRESO',
      project.total || 0,
      project.despiece_data || '[]',
      project.hardware_data || '{}',
      project.summary_data || '{}'
    ], function(err) {
      if (err) {
        console.error("Error saving project:", err.message);
        return reject(err);
      }
      resolve({ success: true, id: project.id });
    });
  });
});

ipcMain.handle('delete-project', async (event, id) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not connected.'));
    db.run('DELETE FROM projects WHERE id = ?', [id], function(err) {
      if (err) reject(new Error('Failed to delete project.'));
      else resolve({ success: true });
    });
  });
});
