function registerDoorDraftHandlers({ ipcMain, getProjectStore }) {
  ipcMain.handle('get-door-drafts', async () => {
    const store = getProjectStore?.();
    if (store?.getDoorDrafts) return store.getDoorDrafts();
    return [];
  });

  ipcMain.handle('save-door-draft', async (event, record) => {
    const store = getProjectStore?.();
    if (store?.saveDoorDraft) return store.saveDoorDraft(record);
    throw new Error('Draft storage not available.');
  });

  ipcMain.handle('delete-door-draft', async (event, id) => {
    const store = getProjectStore?.();
    if (store?.deleteDoorDraft) return store.deleteDoorDraft(id);
    throw new Error('Draft storage not available.');
  });
}

module.exports = { registerDoorDraftHandlers };
