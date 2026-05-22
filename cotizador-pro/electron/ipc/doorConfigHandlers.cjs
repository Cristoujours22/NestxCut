function registerDoorConfigHandlers({ ipcMain }) {
  function getConfigFilePath() {
    const { app } = require('electron');
    const path = require('path');
    return path.join(app.getPath('userData'), 'puertas-config.json');
  }

  function defaultConfig() {
    return {
      geometry: {
        espesorTotalPuertaMm: 40,
        descuentoAltoPuertaMm: 30,
        descuentoAnchoPuertaMm: 35,
        descuentoSuperiorMm: 30,
        holguraRecibidorMm: 10,
      },
      composition: {
        fondoExteriorAmm: 6,
        fondoExteriorBmm: 6,
        bastidorInternoMm: 28,
        anchoBastidorVerticalMm: 80,
        anchoBastidorHorizontalMm: 80,
        incluirBastidorInferior: true,
        tipoAlmaDefault: 'honeycomb',
      },
      production: {
        consumoPegantePorM2: 0,
        usarNestingParaFondos: true,
      },
    };
  }

  function loadConfig() {
    const fs = require('fs');
    const file = getConfigFilePath();
    if (!fs.existsSync(file)) return defaultConfig();
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      return {
        ...defaultConfig(),
        ...parsed,
        geometry: { ...defaultConfig().geometry, ...(parsed.geometry || {}) },
        composition: { ...defaultConfig().composition, ...(parsed.composition || {}) },
        production: { ...defaultConfig().production, ...(parsed.production || {}) },
      };
    } catch (error) {
      console.error('[doorConfigHandlers] Error reading puertas config:', error.message);
      return defaultConfig();
    }
  }

  function saveConfig(config) {
    const fs = require('fs');
    const file = getConfigFilePath();
    const next = {
      ...defaultConfig(),
      ...config,
      geometry: { ...defaultConfig().geometry, ...(config.geometry || {}) },
      composition: { ...defaultConfig().composition, ...(config.composition || {}) },
      production: { ...defaultConfig().production, ...(config.production || {}) },
    };
    fs.writeFileSync(file, JSON.stringify(next, null, 2));
    return next;
  }

  ipcMain.handle('get-door-config', async () => loadConfig());
  ipcMain.handle('save-door-config', async (event, config) => {
    const saved = saveConfig(config || {});
    return { success: true, config: saved };
  });
}

module.exports = { registerDoorConfigHandlers };
