function registerManualQuoteHandlers({ ipcMain }) {
  function getQuotesFilePath() {
    const { app } = require('electron');
    const path = require('path');
    return path.join(app.getPath('userData'), 'manual-quotes.json');
  }

  function defaultState() {
    return { quotes: [] };
  }

  function loadState() {
    const fs = require('fs');
    const file = getQuotesFilePath();
    if (!fs.existsSync(file)) return defaultState();
    try {
      return { ...defaultState(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch (error) {
      console.error('[manualQuoteHandlers] Error reading manual quotes:', error.message);
      return defaultState();
    }
  }

  function saveState(state) {
    const fs = require('fs');
    const file = getQuotesFilePath();
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
  }

  ipcMain.handle('get-manual-quotes', async () => {
    const state = loadState();
    return [...(state.quotes || [])].sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  });

  ipcMain.handle('save-manual-quote', async (event, quote) => {
    const state = loadState();
    const now = new Date().toISOString();

    const record = {
      id: quote.id || `mq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      created_at: quote.created_at || now,
      updated_at: now,
      client: quote.client || {},
      doors: Array.isArray(quote.doors) ? quote.doors : [],
      totals: quote.totals || {},
      status: quote.status || 'draft',
      notes: quote.notes || '',
    };

    const index = state.quotes.findIndex((entry) => entry.id === record.id);
    if (index >= 0) {
      state.quotes[index] = { ...state.quotes[index], ...record };
    } else {
      state.quotes.push(record);
    }

    saveState(state);
    return { success: true, id: record.id };
  });
}

module.exports = { registerManualQuoteHandlers };
