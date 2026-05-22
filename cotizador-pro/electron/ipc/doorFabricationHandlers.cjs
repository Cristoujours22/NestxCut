function registerDoorFabricationHandlers({ ipcMain, getInventoryStore }) {
  // JSON file fallback path for puerta fabrication records
  function getPuertasStorePath() {
    const { app } = require('electron');
    return require('path').join(app.getPath('userData'), 'puertas-records.json');
  }

  function defaultPuertasState() {
    return { fabrications: [] };
  }

  function loadPuertasState() {
    const fs = require('fs');
    const path = require('path');
    const file = getPuertasStorePath();
    if (!fs.existsSync(file)) return defaultPuertasState();
    try {
      return { ...defaultPuertasState(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch (err) {
      console.error('[doorFabricationHandlers] Error reading state:', err.message);
      return defaultPuertasState();
    }
  }

  function savePuertasState(state) {
    const fs = require('fs');
    const path = require('path');
    const file = getPuertasStorePath();
    try {
      fs.writeFileSync(file, JSON.stringify(state, null, 2));
    } catch (err) {
      console.error('[doorFabricationHandlers] Error saving state:', err.message);
    }
  }

  ipcMain.handle('get-door-fabrications', async () => {
    const state = loadPuertasState();
    return [...(state.fabrications || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  });

  ipcMain.handle('save-door-fabrication', async (event, record) => {
    const state = loadPuertasState();
    const id = record.id || `door_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    if (record.id) {
      const index = state.fabrications.findIndex((f) => f.id === record.id);
      if (index !== -1) {
        state.fabrications[index] = { ...state.fabrications[index], ...record, updated_at: now };
        savePuertasState(state);
        return { success: true, id: record.id };
      }
    }

    const fabrication = {
      id,
      created_at: now,
      updated_at: now,
      nombre: record.nombre || '',
      cantidad: Number(record.cantidad || 1),
      input: record.input || {},
      calculationSnapshot: record.calculationSnapshot || {},
      selectedMaterial: record.selectedMaterial || null,
      selectedHerrajes: record.selectedHerrajes || [],
      selectedServicios: record.selectedServicios || [],
      nestingSummary: record.nestingSummary || {},
      inventoryImpact: record.inventoryImpact || {},
      scrapsCreated: record.scrapsCreated || [],
      status: record.status || 'confirmed',
    };

    state.fabrications.push(fabrication);
    savePuertasState(state);
    return { success: true, id };
  });

  ipcMain.handle('delete-door-fabrication', async (event, id) => {
    const state = loadPuertasState();
    state.fabrications = (state.fabrications || []).filter((fabrication) => fabrication.id !== id);
    savePuertasState(state);
    return { success: true };
  });
}

module.exports = { registerDoorFabricationHandlers };
