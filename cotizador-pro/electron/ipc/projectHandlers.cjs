function registerProjectHandlers({ ipcMain, getDb }) {
  ipcMain.handle('get-projects', async () => {
    const db = getDb();
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not connected.'));
      db.all('SELECT id, title, client, state, total, created_at, updated_at FROM projects ORDER BY updated_at DESC', [], (err, rows) => {
        if (err) {
          console.error('IPC get-projects error:', err.message);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  });

  ipcMain.handle('get-project', async (event, id) => {
    const db = getDb();
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not connected.'));
      db.get('SELECT * FROM projects WHERE id = ?', [id], (err, row) => {
        if (err) reject(new Error('Failed to fetch project.'));
        else resolve(row || null);
      });
    });
  });

  ipcMain.handle('save-project', async (event, project) => {
    const db = getDb();
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
          console.error('Error saving project:', err.message);
          return reject(err);
        }
        resolve({ success: true, id: project.id });
      });
    });
  });

  ipcMain.handle('delete-project', async (event, id) => {
    const db = getDb();
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not connected.'));
      db.run('DELETE FROM projects WHERE id = ?', [id], function(err) {
        if (err) reject(new Error('Failed to delete project.'));
        else resolve({ success: true });
      });
    });
  });
}

module.exports = { registerProjectHandlers };
