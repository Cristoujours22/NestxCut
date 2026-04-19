function registerServiceHandlers({ ipcMain, getDb }) {
  ipcMain.handle('get-servicios', async () => {
    const db = getDb();
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not connected.'));
      db.all('SELECT * FROM servicios ORDER BY nombre ASC', [], (err, rows) => {
        if (err) {
          console.error('IPC get-servicios error:', err.message);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  });

  ipcMain.handle('get-servicio', async (event, id) => {
    const db = getDb();
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not connected.'));
      db.get('SELECT * FROM servicios WHERE id = ?', [id], (err, row) => {
        if (err) reject(new Error('Failed to fetch servicio.'));
        else resolve(row || null);
      });
    });
  });

  ipcMain.handle('add-servicio', async (event, servicio) => {
    const db = getDb();
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not connected.'));

      const id = 'srv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const atributosJson = JSON.stringify(servicio.atributos || []);

      db.run(
        `INSERT INTO servicios (id, nombre, descripcion, atributos, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [id, servicio.nombre, servicio.descripcion || '', atributosJson],
        function(err) {
          if (err) {
            console.error('Error adding servicio:', err.message);
            return reject(err);
          }
          resolve({ success: true, id });
        }
      );
    });
  });

  ipcMain.handle('update-servicio', async (event, servicio) => {
    const db = getDb();
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not connected.'));

      const atributosJson = JSON.stringify(servicio.atributos || []);

      db.run(
        `UPDATE servicios
         SET nombre = ?, descripcion = ?, atributos = ?
         WHERE id = ?`,
        [servicio.nombre, servicio.descripcion || '', atributosJson, servicio.id],
        function(err) {
          if (err) {
            console.error('Error updating servicio:', err.message);
            return reject(err);
          }
          resolve({ success: true });
        }
      );
    });
  });

  ipcMain.handle('delete-servicio', async (event, id) => {
    const db = getDb();
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not connected.'));
      db.run('DELETE FROM servicios WHERE id = ?', [id], function(err) {
        if (err) reject(new Error('Failed to delete servicio.'));
        else resolve({ success: true });
      });
    });
  });
}

module.exports = { registerServiceHandlers };
