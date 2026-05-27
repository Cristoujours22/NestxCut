const path = require('path');
const Database = require('better-sqlite3');

function asJson(value, fallback = {}) {
  try {
    if (typeof value === 'string') return JSON.parse(value);
    if (value && typeof value === 'object') return value;
  } catch {}
  return fallback;
}

function toJson(value) {
  return JSON.stringify(value ?? {});
}

function createSqliteProjectStore({ app }) {
  const dbPath = path.join(app.getPath('userData'), 'cotizador-projects.db');
  const sqlite = new Database(dbPath);

  sqlite.pragma('journal_mode = WAL');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      documento TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      celular TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      owner_uid TEXT,
      title TEXT NOT NULL,
      client TEXT,
      client_doc TEXT,
      client_phone TEXT,
      client_id INTEGER,
      state TEXT DEFAULT 'EDICION',
      total REAL DEFAULT 0,
      despiece_data TEXT,
      hardware_data TEXT,
      summary_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS servicios (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      precio REAL DEFAULT 0,
      descripcion TEXT,
      atributos TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory_providers (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      documento TEXT,
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      codigo TEXT UNIQUE,
      nombre TEXT NOT NULL,
      item_type TEXT NOT NULL,
      proveedor_id TEXT,
      cantidad_disponible REAL DEFAULT 0,
      cantidad_reservada REAL DEFAULT 0,
      stock_minimo REAL DEFAULT 0,
      stock_objetivo REAL DEFAULT 0,
      costo_unitario REAL DEFAULT 0,
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      item_name_snapshot TEXT,
      item_type_snapshot TEXT,
      movement_type TEXT,
      direction TEXT,
      cantidad REAL DEFAULT 0,
      unit_cost REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      reference_type TEXT,
      reference_id TEXT,
      motivo TEXT,
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory_purchases (
      id TEXT PRIMARY KEY,
      proveedor_id TEXT NOT NULL,
      proveedor_nombre TEXT NOT NULL,
      items_json TEXT NOT NULL,
      total REAL DEFAULT 0,
      notas TEXT,
      status TEXT DEFAULT 'pendiente',
      received_at TEXT,
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    sqlite.exec('ALTER TABLE inventory_items ADD COLUMN tipologia TEXT');
  } catch (err) {
    if (!String(err.message || '').includes('duplicate column name')) throw err;
  }

  try {
    sqlite.exec('ALTER TABLE projects ADD COLUMN owner_uid TEXT');
  } catch (err) {
    if (!String(err.message || '').includes('duplicate column name')) throw err;
  }

  // Door drafts table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS door_drafts (
      id TEXT PRIMARY KEY,
      nombre TEXT DEFAULT '',
      cantidad INTEGER DEFAULT 1,
      vano_json TEXT,
      material_json TEXT,
      insumos_json TEXT,
      herrajes_json TEXT,
      servicios_json TEXT,
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const getProjectsStmt = sqlite.prepare('SELECT id, title, client, state, total, created_at, updated_at FROM projects WHERE owner_uid = ? ORDER BY updated_at DESC');
  const getProjectStmt = sqlite.prepare('SELECT * FROM projects WHERE id = ? AND owner_uid = ?');
  const getProjectAnyOwnerStmt = sqlite.prepare('SELECT * FROM projects WHERE id = ?');
  const getClientByDocumentStmt = sqlite.prepare('SELECT * FROM clientes WHERE documento = ?');
  const insertClientStmt = sqlite.prepare('INSERT INTO clientes (documento, nombre, celular, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
  const updateClientStmt = sqlite.prepare('UPDATE clientes SET nombre = ?, celular = ?, email = ?, updated_at = ? WHERE documento = ?');
  const saveProjectStmt = sqlite.prepare(`
    INSERT INTO projects (id, owner_uid, title, client, client_doc, client_phone, client_id, state, total, despiece_data, hardware_data, summary_data, created_at, updated_at)
    VALUES (@id, @owner_uid, @title, @client, @client_doc, @client_phone, @client_id, @state, @total, @despiece_data, @hardware_data, @summary_data, COALESCE(@created_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      owner_uid = excluded.owner_uid,
      title = excluded.title,
      client = excluded.client,
      client_doc = excluded.client_doc,
      client_phone = excluded.client_phone,
      client_id = excluded.client_id,
      state = excluded.state,
      total = excluded.total,
      despiece_data = excluded.despiece_data,
      hardware_data = excluded.hardware_data,
      summary_data = excluded.summary_data,
      updated_at = CURRENT_TIMESTAMP
  `);
  const deleteProjectStmt = sqlite.prepare('DELETE FROM projects WHERE id = ? AND owner_uid = ?');

  const getServiciosStmt = sqlite.prepare('SELECT * FROM servicios ORDER BY nombre ASC');
  const getServicioStmt = sqlite.prepare('SELECT * FROM servicios WHERE id = ?');
  const addServicioStmt = sqlite.prepare('INSERT INTO servicios (id, nombre, precio, descripcion, atributos, created_at, updated_at) VALUES (@id, @nombre, @precio, @descripcion, @atributos, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)');
  const updateServicioStmt = sqlite.prepare('UPDATE servicios SET nombre = @nombre, precio = @precio, descripcion = @descripcion, atributos = @atributos, updated_at = CURRENT_TIMESTAMP WHERE id = @id');
  const deleteServicioStmt = sqlite.prepare('DELETE FROM servicios WHERE id = ?');

  const getProvidersStmt = sqlite.prepare('SELECT * FROM inventory_providers ORDER BY nombre ASC');
  const getProviderByIdStmt = sqlite.prepare('SELECT * FROM inventory_providers WHERE id = ?');
  const getProviderByDocumentStmt = sqlite.prepare('SELECT * FROM inventory_providers WHERE lower(documento) = lower(?) AND id != ?');
  const saveProviderStmt = sqlite.prepare(`
    INSERT INTO inventory_providers (id, nombre, documento, payload, created_at, updated_at)
    VALUES (@id, @nombre, @documento, @payload, COALESCE(@created_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      nombre = excluded.nombre,
      documento = excluded.documento,
      payload = excluded.payload,
      updated_at = CURRENT_TIMESTAMP
  `);
  const deleteProviderStmt = sqlite.prepare('DELETE FROM inventory_providers WHERE id = ?');

  const getItemsStmt = sqlite.prepare('SELECT * FROM inventory_items ORDER BY nombre ASC');
  const getItemByIdStmt = sqlite.prepare('SELECT * FROM inventory_items WHERE id = ?');
  const getItemByCodeStmt = sqlite.prepare('SELECT * FROM inventory_items WHERE lower(codigo) = lower(?)');
  const saveItemStmt = sqlite.prepare(`
    INSERT INTO inventory_items (id, codigo, nombre, item_type, proveedor_id, cantidad_disponible, cantidad_reservada, stock_minimo, stock_objetivo, costo_unitario, payload, tipologia, created_at, updated_at)
    VALUES (@id, @codigo, @nombre, @item_type, @proveedor_id, @cantidad_disponible, @cantidad_reservada, @stock_minimo, @stock_objetivo, @costo_unitario, @payload, @tipologia, COALESCE(@created_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      codigo = excluded.codigo,
      nombre = excluded.nombre,
      item_type = excluded.item_type,
      proveedor_id = excluded.proveedor_id,
      cantidad_disponible = excluded.cantidad_disponible,
      cantidad_reservada = excluded.cantidad_reservada,
      stock_minimo = excluded.stock_minimo,
      stock_objetivo = excluded.stock_objetivo,
      costo_unitario = excluded.costo_unitario,
      payload = excluded.payload,
      tipologia = excluded.tipologia,
      updated_at = CURRENT_TIMESTAMP
  `);
  const deleteItemStmt = sqlite.prepare('DELETE FROM inventory_items WHERE id = ?');

  const getMovementsStmt = sqlite.prepare('SELECT * FROM inventory_movements ORDER BY created_at DESC');
  const deleteMovementStmt = sqlite.prepare('DELETE FROM inventory_movements WHERE id = ?');
  const addMovementStmt = sqlite.prepare(`
    INSERT INTO inventory_movements (id, item_id, item_name_snapshot, item_type_snapshot, movement_type, direction, cantidad, unit_cost, total_cost, reference_type, reference_id, motivo, payload, created_at)
    VALUES (@id, @item_id, @item_name_snapshot, @item_type_snapshot, @movement_type, @direction, @cantidad, @unit_cost, @total_cost, @reference_type, @reference_id, @motivo, @payload, CURRENT_TIMESTAMP)
  `);

  const getPurchasesStmt = sqlite.prepare('SELECT * FROM inventory_purchases ORDER BY created_at DESC');
  const getPurchaseByIdStmt = sqlite.prepare('SELECT * FROM inventory_purchases WHERE id = ?');
  const savePurchaseStmt = sqlite.prepare(`
    INSERT INTO inventory_purchases (id, proveedor_id, proveedor_nombre, items_json, total, notas, status, received_at, payload, created_at, updated_at)
    VALUES (@id, @proveedor_id, @proveedor_nombre, @items_json, @total, @notas, @status, @received_at, @payload, COALESCE(@created_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      proveedor_id = excluded.proveedor_id,
      proveedor_nombre = excluded.proveedor_nombre,
      items_json = excluded.items_json,
      total = excluded.total,
      notas = excluded.notas,
      status = excluded.status,
      received_at = excluded.received_at,
      payload = excluded.payload,
      updated_at = CURRENT_TIMESTAMP
  `);

  function mapProviderRow(row) {
    if (!row) return null;
    return { ...asJson(row.payload, {}), id: row.id, nombre: row.nombre, documento: row.documento || '', created_at: row.created_at, updated_at: row.updated_at };
  }
  function mapItemRow(row) {
    if (!row) return null;
    return {
      ...asJson(row.payload, {}),
      id: row.id,
      codigo: row.codigo || '',
      nombre: row.nombre,
      item_type: row.item_type,
      proveedor_id: row.proveedor_id || '',
      cantidad_disponible: Number(row.cantidad_disponible || 0),
      cantidad_reservada: Number(row.cantidad_reservada || 0),
      stock_minimo: Number(row.stock_minimo || 0),
      stock_objetivo: Number(row.stock_objetivo || 0),
      costo_unitario: Number(row.costo_unitario || 0),
      tipologia: row.tipologia || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
  function mapMovementRow(row) {
    if (!row) return null;
    return {
      ...asJson(row.payload, {}),
      id: row.id,
      item_id: row.item_id,
      item_name_snapshot: row.item_name_snapshot || '',
      item_type_snapshot: row.item_type_snapshot || '',
      movement_type: row.movement_type || '',
      direction: row.direction || '',
      cantidad: Number(row.cantidad || 0),
      unit_cost: Number(row.unit_cost || 0),
      total_cost: Number(row.total_cost || 0),
      reference_type: row.reference_type || '',
      reference_id: row.reference_id || '',
      motivo: row.motivo || '',
      reason: row.motivo || '',
      created_at: row.created_at,
    };
  }
  function mapPurchaseRow(row) {
    if (!row) return null;
    return {
      ...asJson(row.payload, {}),
      id: row.id,
      proveedor_id: row.proveedor_id,
      proveedor_nombre: row.proveedor_nombre,
      items: asJson(row.items_json, []),
      total: Number(row.total || 0),
      notas: row.notas || '',
      status: row.status || 'pendiente',
      received_at: row.received_at || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  function migrateLegacyData(legacyState) {
    const migrateClients = sqlite.prepare('SELECT COUNT(*) as count FROM clientes').get().count === 0 && Array.isArray(legacyState?.clientes);
    if (migrateClients) {
      const tx = sqlite.transaction((clientes) => {
        clientes.forEach((cliente) => {
          if (!cliente?.documento || !cliente?.nombre) return;
          insertClientStmt.run(cliente.documento, cliente.nombre, cliente.celular || '', cliente.email || '', cliente.created_at || new Date().toISOString(), cliente.updated_at || new Date().toISOString());
        });
      });
      tx(legacyState.clientes);
    }

    const migrateProjects = sqlite.prepare('SELECT COUNT(*) as count FROM projects').get().count === 0 && Array.isArray(legacyState?.projects);
    if (migrateProjects) {
      const tx = sqlite.transaction((projects) => {
        projects.forEach((project) => {
          if (!project?.id) return;
          saveProjectStmt.run({
            id: project.id,
            owner_uid: project.owner_uid || null,
            title: project.title || 'Proyecto sin título',
            client: project.client || '',
            client_doc: project.client_doc || '',
            client_phone: project.client_phone || '',
            client_id: project.client_id || null,
            state: project.state || 'EDICION',
            total: Number(project.total || 0),
            despiece_data: project.despiece_data || '[]',
            hardware_data: project.hardware_data || '{}',
            summary_data: project.summary_data || '{}',
            created_at: project.created_at || new Date().toISOString(),
          });
        });
      });
      tx(legacyState.projects);
    }

    const migrateServicios = sqlite.prepare('SELECT COUNT(*) as count FROM servicios').get().count === 0 && Array.isArray(legacyState?.servicios);
    if (migrateServicios) {
      const tx = sqlite.transaction((servicios) => {
        servicios.forEach((servicio) => {
          if (!servicio?.id || !servicio?.nombre) return;
          addServicioStmt.run({
            id: servicio.id,
            nombre: servicio.nombre,
            precio: Number(servicio.precio || 0),
            descripcion: servicio.descripcion || '',
            atributos: typeof servicio.atributos === 'string' ? servicio.atributos : JSON.stringify(servicio.atributos || []),
          });
        });
      });
      tx(legacyState.servicios);
    }

    const migrateProviders = sqlite.prepare('SELECT COUNT(*) as count FROM inventory_providers').get().count === 0 && Array.isArray(legacyState?.inventory_providers);
    if (migrateProviders) {
      const tx = sqlite.transaction((providers) => {
        providers.forEach((provider) => {
          if (!provider?.id || !provider?.nombre) return;
          saveProviderStmt.run({ id: provider.id, nombre: provider.nombre, documento: provider.documento || '', payload: toJson(provider), created_at: provider.created_at || new Date().toISOString() });
        });
      });
      tx(legacyState.inventory_providers);
    }

    const migrateItems = sqlite.prepare('SELECT COUNT(*) as count FROM inventory_items').get().count === 0 && Array.isArray(legacyState?.inventory_items);
    if (migrateItems) {
      const tx = sqlite.transaction((items) => {
        items.forEach((item) => {
          if (!item?.id || !item?.nombre || !item?.item_type) return;
          saveItemStmt.run({
            id: item.id,
            codigo: item.codigo || '',
            nombre: item.nombre,
            item_type: item.item_type,
            proveedor_id: item.proveedor_id || '',
            cantidad_disponible: Number(item.cantidad_disponible || 0),
            cantidad_reservada: Number(item.cantidad_reservada || 0),
            stock_minimo: Number(item.stock_minimo || 0),
            stock_objetivo: Number(item.stock_objetivo || 0),
            costo_unitario: Number(item.costo_unitario || 0),
            payload: toJson(item),
            created_at: item.created_at || new Date().toISOString(),
          });
        });
      });
      tx(legacyState.inventory_items);
    }

    const migrateMovements = sqlite.prepare('SELECT COUNT(*) as count FROM inventory_movements').get().count === 0 && Array.isArray(legacyState?.inventory_movements);
    if (migrateMovements) {
      const tx = sqlite.transaction((movements) => {
        movements.forEach((movement) => {
          if (!movement?.id || !movement?.item_id) return;
          addMovementStmt.run({
            id: movement.id,
            item_id: movement.item_id,
            item_name_snapshot: movement.item_name_snapshot || '',
            item_type_snapshot: movement.item_type_snapshot || '',
            movement_type: movement.movement_type || '',
            direction: movement.direction || '',
            cantidad: Number(movement.cantidad || 0),
            unit_cost: Number(movement.unit_cost || 0),
            total_cost: Number(movement.total_cost || 0),
            reference_type: movement.reference_type || '',
            reference_id: movement.reference_id || '',
            motivo: movement.motivo || movement.reason || '',
            payload: toJson(movement),
          });
        });
      });
      tx(legacyState.inventory_movements);
    }

    const migratePurchases = sqlite.prepare('SELECT COUNT(*) as count FROM inventory_purchases').get().count === 0 && Array.isArray(legacyState?.inventory_purchases);
    if (migratePurchases) {
      const tx = sqlite.transaction((purchases) => {
        purchases.forEach((purchase) => {
          if (!purchase?.id || !purchase?.proveedor_id || !purchase?.proveedor_nombre) return;
          savePurchaseStmt.run({
            id: purchase.id,
            proveedor_id: purchase.proveedor_id,
            proveedor_nombre: purchase.proveedor_nombre,
            items_json: JSON.stringify(Array.isArray(purchase.items) ? purchase.items : []),
            total: Number(purchase.total || 0),
            notas: purchase.notas || '',
            status: purchase.status || 'pendiente',
            received_at: purchase.received_at || '',
            payload: toJson(purchase),
            created_at: purchase.created_at || new Date().toISOString(),
          });
        });
      });
      tx(legacyState.inventory_purchases);
    }
  }

  return {
    dbPath,
    close() { sqlite.close(); },
    migrateLegacyData,
    getProjects(ownerUid) {
      if (!ownerUid) return [];
      return getProjectsStmt.all(ownerUid);
    },
    getProject(id, ownerUid) {
      if (!ownerUid) return null;
      return getProjectStmt.get(id, ownerUid) || null;
    },
    saveProject(project) {
      const ownerUid = String(project.owner_uid || '').trim();
      if (!ownerUid) throw new Error('owner_uid is required to save a project.');
      const existing = getProjectAnyOwnerStmt.get(project.id);
      if (existing && existing.owner_uid && existing.owner_uid !== ownerUid) {
        throw new Error('No tenés permiso para modificar este proyecto.');
      }
      saveProjectStmt.run({
        id: project.id,
        owner_uid: ownerUid,
        title: project.title || 'Proyecto sin título',
        client: project.client || '',
        client_doc: project.client_doc || '',
        client_phone: project.client_phone || '',
        client_id: project.client_id || null,
        state: project.state || 'EDICION',
        total: Number(project.total || 0),
        despiece_data: project.despiece_data || '[]',
        hardware_data: project.hardware_data || '{}',
        summary_data: project.summary_data || '{}',
        created_at: project.created_at || null,
      });
      return { success: true, id: project.id };
    },
    deleteProject(id, ownerUid) {
      if (!ownerUid) throw new Error('owner_uid is required to delete a project.');
      deleteProjectStmt.run(id, ownerUid);
      return { success: true };
    },
    getClientByDocument(documento) { return getClientByDocumentStmt.get(documento) || null; },
    saveClient(client) {
      const documento = String(client.documento || '').trim();
      const nombre = String(client.nombre || '').trim();
      const celular = String(client.celular || '').trim();
      const email = String(client.email || '').trim();
      if (!documento || !nombre) throw new Error('Documento y nombre son obligatorios.');
      const now = new Date().toISOString();
      const existing = getClientByDocumentStmt.get(documento);
      if (existing) {
        updateClientStmt.run(nombre, celular, email, now, documento);
        return { success: true, client: { ...existing, nombre, celular, email, updated_at: now } };
      }
      const result = insertClientStmt.run(documento, nombre, celular, email, now, now);
      return { success: true, client: { id: result.lastInsertRowid, documento, nombre, celular, email } };
    },
    getServicios() { return getServiciosStmt.all().map((row) => ({ ...row, precio: Number(row.precio || 0) })); },
    getServicio(id) {
      const row = getServicioStmt.get(id);
      return row ? { ...row, precio: Number(row.precio || 0) } : null;
    },
    addServicio(servicio) {
      const id = `srv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      addServicioStmt.run({ id, nombre: servicio.nombre, precio: Number(servicio.precio || 0), descripcion: servicio.descripcion || '', atributos: JSON.stringify(servicio.atributos || []) });
      return { success: true, id };
    },
    updateServicio(servicio) {
      updateServicioStmt.run({ id: servicio.id, nombre: servicio.nombre, precio: Number(servicio.precio || 0), descripcion: servicio.descripcion || '', atributos: JSON.stringify(servicio.atributos || []) });
      return { success: true };
    },
    deleteServicio(id) { deleteServicioStmt.run(id); return { success: true }; },
    getInventoryProviders() { return getProvidersStmt.all().map(mapProviderRow); },
    saveInventoryProvider(provider) {
      const nombre = String(provider.nombre || '').trim();
      const documento = String(provider.documento || '').trim();
      if (!nombre) throw new Error('El nombre del proveedor es obligatorio.');
      if (documento) {
        const duplicated = getProviderByDocumentStmt.get(documento, provider.id || '');
        if (duplicated) throw new Error('Ya existe un proveedor con ese documento.');
      }
      const id = provider.id || `prov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      saveProviderStmt.run({ id, nombre, documento, payload: toJson({ ...provider, id, nombre, documento }), created_at: provider.created_at || null });
      return { success: true, id };
    },
    deleteInventoryProvider(id) {
      const linked = sqlite.prepare('SELECT id FROM inventory_items WHERE proveedor_id = ? LIMIT 1').get(id);
      if (linked) throw new Error('No podés eliminar un proveedor vinculado a items de inventario.');
      deleteProviderStmt.run(id);
      return { success: true };
    },
    getInventoryItems() { return getItemsStmt.all().map(mapItemRow); },
    addInventoryItem(item) {
      const duplicated = item.codigo ? getItemByCodeStmt.get(item.codigo) : null;
      if (duplicated) throw new Error('Ya existe un item de inventario con ese código.');
      const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      saveItemStmt.run({
        id,
        codigo: item.codigo || '',
        nombre: item.nombre,
        item_type: item.item_type,
        proveedor_id: item.proveedor_id || '',
        cantidad_disponible: Number(item.cantidad_disponible || 0),
        cantidad_reservada: Number(item.cantidad_reservada || 0),
        stock_minimo: Number(item.stock_minimo || 0),
        stock_objetivo: Number(item.stock_objetivo || 0),
        costo_unitario: Number(item.costo_unitario || 0),
        payload: toJson({ ...item, id }),
        tipologia: item.tipologia || '',
        created_at: item.created_at || null,
      });
      return { success: true, id };
    },
    updateInventoryItem(item) {
      const duplicated = item.codigo ? getItemByCodeStmt.get(item.codigo) : null;
      if (duplicated && duplicated.id !== item.id) throw new Error('Ya existe un item de inventario con ese código.');
      const current = getItemByIdStmt.get(item.id);
      if (!current) throw new Error('Inventory item not found.');
      saveItemStmt.run({
        id: item.id,
        codigo: item.codigo || '',
        nombre: item.nombre,
        item_type: item.item_type,
        proveedor_id: item.proveedor_id || '',
        cantidad_disponible: Number(item.cantidad_disponible || 0),
        cantidad_reservada: Number(item.cantidad_reservada || 0),
        stock_minimo: Number(item.stock_minimo || 0),
        stock_objetivo: Number(item.stock_objetivo || 0),
        costo_unitario: Number(item.costo_unitario || 0),
        payload: toJson({ ...asJson(current.payload, {}), ...item }),
        tipologia: item.tipologia || '',
        created_at: current.created_at,
      });
      return { success: true };
    },
    deleteInventoryItem(id) { deleteItemStmt.run(id); return { success: true }; },
    getInventoryMovements() { return getMovementsStmt.all().map(mapMovementRow); },
    deleteInventoryMovement(id) { deleteMovementStmt.run(id); return { success: true }; },
    addInventoryMovement(movement) {
      const item = getItemByIdStmt.get(movement.item_id);
      if (!item) throw new Error('Inventory item not found.');
      const quantity = Number(movement.cantidad || 0);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('La cantidad del movimiento debe ser mayor a 0.');
      const movementType = movement.movement_type || 'ajuste';
      const direction = movement.direction || (movementType.includes('entrada') || movementType === 'entry' || movementType === 'adjustment_in' ? 'in' : movementType.includes('salida') || movementType === 'exit' || movementType === 'adjustment_out' ? 'out' : 'neutral');
      const unitCost = Number(movement.unit_cost ?? item.costo_unitario ?? 0);
      const totalCost = Number(movement.total_cost ?? (unitCost * quantity));
      const id = `mov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      addMovementStmt.run({
        id,
        item_id: movement.item_id,
        item_name_snapshot: movement.item_name_snapshot || item.nombre || '',
        item_type_snapshot: movement.item_type_snapshot || item.item_type || '',
        movement_type: movementType,
        direction,
        cantidad: quantity,
        unit_cost: unitCost,
        total_cost: totalCost,
        reference_type: movement.reference_type || 'manual',
        reference_id: movement.reference_id || '',
        motivo: movement.motivo || movement.reason || '',
        payload: toJson({
          ...movement,
          id,
          item_name_snapshot: movement.item_name_snapshot || item.nombre || '',
          item_type_snapshot: movement.item_type_snapshot || item.item_type || '',
          movement_type: movementType,
          direction,
          cantidad: quantity,
          unit_cost: unitCost,
          total_cost: totalCost,
          reason: movement.reason || movement.motivo || '',
        }),
      });
      return { success: true, id };
    },
    getInventoryPurchases() { return getPurchasesStmt.all().map(mapPurchaseRow); },
    saveInventoryPurchase(purchase) {
      const proveedor_id = purchase.proveedor_id || '';
      const proveedor_nombre = String(purchase.proveedor_nombre || '').trim();
      const items = Array.isArray(purchase.items) ? purchase.items : [];
      if (!proveedor_id || !proveedor_nombre) throw new Error('Proveedor obligatorio.');
      if (!items.length) throw new Error('La orden de compra debe tener al menos un item.');
      const normalizedItems = items.map((item) => ({
        item_id: item.item_id,
        nombre: item.nombre,
        codigo: item.codigo,
        cantidad: Number(item.cantidad || 0),
        costo_unitario: Number(item.costo_unitario || 0),
        total: Number(item.total || (Number(item.cantidad || 0) * Number(item.costo_unitario || 0))),
      })).filter((item) => item.item_id && item.cantidad > 0);
      if (!normalizedItems.length) throw new Error('No hay items válidos en la orden de compra.');
      const total = normalizedItems.reduce((acc, item) => acc + item.total, 0);
      const id = purchase.id || `po_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const current = purchase.id ? getPurchaseByIdStmt.get(purchase.id) : null;
      if (current && current.status === 'recibida') throw new Error('No podés editar una orden ya recibida.');
      savePurchaseStmt.run({
        id,
        proveedor_id,
        proveedor_nombre,
        items_json: JSON.stringify(normalizedItems),
        total,
        notas: purchase.notas || '',
        status: current?.status || purchase.status || 'pendiente',
        received_at: current?.received_at || purchase.received_at || '',
        payload: toJson({ ...purchase, id, proveedor_id, proveedor_nombre, items: normalizedItems, total }),
        created_at: current?.created_at || purchase.created_at || null,
      });
      return { success: true, id };
    },
    receiveInventoryPurchase(purchaseId) {
      const purchase = mapPurchaseRow(getPurchaseByIdStmt.get(purchaseId));
      if (!purchase) throw new Error('Orden de compra no encontrada.');
      if (purchase.status === 'recibida') throw new Error('La orden ya fue recibida.');
      const tx = sqlite.transaction(() => {
        purchase.items.forEach((line) => {
          const itemRow = getItemByIdStmt.get(line.item_id);
          if (!itemRow) return;
          const item = mapItemRow(itemRow);
          const nextQuantity = Number(item.cantidad_disponible || 0) + Number(line.cantidad || 0);
          saveItemStmt.run({
            id: item.id,
            codigo: item.codigo || '',
            nombre: item.nombre,
            item_type: item.item_type,
            proveedor_id: item.proveedor_id || '',
            cantidad_disponible: nextQuantity,
            cantidad_reservada: Number(item.cantidad_reservada || 0),
            stock_minimo: Number(item.stock_minimo || 0),
            stock_objetivo: Number(item.stock_objetivo || 0),
            costo_unitario: Number(line.costo_unitario || item.costo_unitario || 0),
            payload: toJson({ ...item, cantidad_disponible: nextQuantity, costo_unitario: Number(line.costo_unitario || item.costo_unitario || 0) }),
            tipologia: item.tipologia || '',
            created_at: item.created_at,
          });
          this.addInventoryMovement({
            item_id: item.id,
            item_name_snapshot: item.nombre || line.nombre || '',
            item_type_snapshot: item.item_type || '',
            movement_type: 'purchase_receive',
            direction: 'in',
            cantidad: Number(line.cantidad || 0),
            unit_cost: Number(line.costo_unitario || 0),
            total_cost: Number(line.total || 0),
            reference_type: 'purchase',
            reference_id: purchase.id,
            motivo: `Recepción orden de compra ${purchase.id}`,
          });
        });
        savePurchaseStmt.run({
          id: purchase.id,
          proveedor_id: purchase.proveedor_id,
          proveedor_nombre: purchase.proveedor_nombre,
          items_json: JSON.stringify(purchase.items),
          total: Number(purchase.total || 0),
          notas: purchase.notas || '',
          status: 'recibida',
          received_at: new Date().toISOString(),
          payload: toJson({ ...purchase, status: 'recibida', received_at: new Date().toISOString() }),
          created_at: purchase.created_at || null,
        });
      });
      tx();
      return { success: true };
    },

    // Door draft methods
    getDoorDrafts() {
      const stmt = sqlite.prepare('SELECT * FROM door_drafts ORDER BY updated_at DESC');
      return stmt.all().map((row) => ({
        ...row,
        vano: asJson(row.vano_json, {}),
        material: asJson(row.material_json, {}),
        insumosSeleccionados: asJson(row.insumos_json, {}),
        herrajesSeleccionados: asJson(row.herrajes_json, []),
        serviciosSeleccionados: asJson(row.servicios_json, []),
      }));
    },

    saveDoorDraft(draft) {
      const id = draft.id || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const stmt = sqlite.prepare(`
        INSERT INTO door_drafts (id, nombre, cantidad, vano_json, material_json, insumos_json, herrajes_json, servicios_json, payload, created_at, updated_at)
        VALUES (@id, @nombre, @cantidad, @vano_json, @material_json, @insumos_json, @herrajes_json, @servicios_json, @payload, COALESCE(@created_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          nombre = excluded.nombre,
          cantidad = excluded.cantidad,
          vano_json = excluded.vano_json,
          material_json = excluded.material_json,
          insumos_json = excluded.insumos_json,
          herrajes_json = excluded.herrajes_json,
          servicios_json = excluded.servicios_json,
          payload = excluded.payload,
          updated_at = CURRENT_TIMESTAMP
      `);
      stmt.run({
        id,
        nombre: draft.nombre || '',
        cantidad: Number(draft.cantidad || 1),
        vano_json: toJson(draft.vano || {}),
        material_json: toJson(draft.material || {}),
        insumos_json: toJson(draft.insumosSeleccionados || {}),
        herrajes_json: toJson(draft.herrajesSeleccionados || []),
        servicios_json: toJson(draft.serviciosSeleccionados || []),
        payload: toJson(draft),
        created_at: draft.created_at || null,
      });
      return { success: true, id };
    },

    deleteDoorDraft(id) {
      const stmt = sqlite.prepare('DELETE FROM door_drafts WHERE id = ?');
      stmt.run(id);
      return { success: true };
    },
  };
}

module.exports = { createSqliteProjectStore };
