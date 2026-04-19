const fs = require('fs');

function createDefaultState() {
  return {
    users: [],
    productos: [],
    plans: [],
    licenses: [],
    promo_codes: [],
    license_promos: [],
    company_settings: [],
    projects: [],
    servicios: [],
    inventory_items: [],
    inventory_movements: [],
  };
}

function createStoreService({ dataFile }) {
  let currentDb = null;

  function loadState() {
    const file = dataFile();
    if (!fs.existsSync(file)) return createDefaultState();
    try {
      return { ...createDefaultState(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch (err) {
      console.error('Error reading store, starting fresh:', err.message);
      return createDefaultState();
    }
  }

  function saveState() {
    if (!currentDb) return;
    try {
      fs.writeFileSync(dataFile(), JSON.stringify(currentDb.state, null, 2), 'utf8');
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
            const i = state.projects.findIndex((p) => p.id === id);
            if (i >= 0) {
              state.projects[i] = { ...state.projects[i], title, client, state: propState, total, despiece_data, hardware_data, summary_data, updated_at: new Date().toISOString() };
            } else {
              state.projects.push({ id, title, client, state: propState, total, despiece_data, hardware_data, summary_data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
            }
            saveState();
          } else if (q.includes('delete from projects')) {
            const [id] = params;
            state.projects = state.projects.filter((p) => p.id !== id);
            saveState();
          } else if (q.startsWith('update users set password')) {
            const [password, id] = params;
            const u = state.users.find((r) => Number(r.id) === Number(id));
            if (u) {
              u.password = password;
              saveState();
            }
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
          } else if (q === 'select * from plans order by id limit 1') {
            row = state.plans[0] || undefined;
          } else if (q === 'select * from licenses where license_key = ? and status = ?') {
            const [licenseKey, status] = params;
            row = state.licenses.find((x) => x.license_key === licenseKey && x.status === status) || undefined;
          } else if (q.includes('select id from licenses where user_id = ? and status = ?')) {
            const [userId, status] = params;
            row = state.licenses.find((x) => Number(x.user_id) === Number(userId) && x.status === status) || undefined;
          } else if (q.includes("from licenses l left join plans p on l.plan_id = p.id where l.user_id = ? and l.status = 'active' order by l.created_at desc limit 1")) {
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
            row = state.projects.find((p) => p.id === id) || undefined;
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
          else if (q === 'select * from plans where 1=1') rows = state.plans;
          else if (q === 'select * from company_settings') rows = state.company_settings;
          else if (q === 'select id, username, password from users') rows = state.users.map((u) => ({ id: u.id, username: u.username, password: u.password }));
          else if (q.includes('select id, title, client, state, total, created_at, updated_at from projects')) {
            rows = [...(state.projects || [])].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
          } else {
            throw new Error(`Unsupported SQL in all(): ${sql}`);
          }
          cb(null, rows);
        } catch (err) {
          cb(err);
        }
      }
    };

    currentDb = api;
    return api;
  }

  return {
    createDefaultState,
    createDb,
    loadState,
    saveState,
  };
}

module.exports = { createStoreService, createDefaultState };
