function parseAtributos(atributos) {
  if (!atributos) return [];
  if (Array.isArray(atributos)) return atributos;
  if (typeof atributos === 'string') {
    try {
      const parsed = JSON.parse(atributos);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function recoverPrecio(servicio) {
  const precioActual = Number(servicio?.precio || 0);
  if (precioActual > 0) return precioActual;
  const attrs = parseAtributos(servicio?.atributos);
  return Number(attrs?.[0]?.precio || 0);
}

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
          const servicios = (rows || []).map((row) => {
            const recoveredPrecio = recoverPrecio(row);
            if (Number(row?.precio || 0) <= 0 && recoveredPrecio > 0) {
              db.run('UPDATE servicios SET precio = ? WHERE id = ?', [recoveredPrecio, row.id], () => {});
            }
            return { ...row, precio: recoveredPrecio };
          });
          resolve(servicios);
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
        else if (!row) resolve(null);
        else {
          const recoveredPrecio = recoverPrecio(row);
          if (Number(row?.precio || 0) <= 0 && recoveredPrecio > 0) {
            db.run('UPDATE servicios SET precio = ? WHERE id = ?', [recoveredPrecio, row.id], () => {});
          }
          resolve({ ...row, precio: recoveredPrecio });
        }
      });
    });
  });

  ipcMain.handle('add-servicio', async (event, servicio) => {
    const db = getDb();
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not connected.'));

      const id = 'srv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const atributosJson = JSON.stringify(servicio.atributos || []);
      const precio = Number(servicio.precio || 0);

      if (precio <= 0) {
        return reject(new Error('El precio del servicio debe ser mayor a 0.'));
      }

      db.run(
        `INSERT INTO servicios (id, nombre, precio, descripcion, atributos, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [id, servicio.nombre, precio, servicio.descripcion || '', atributosJson],
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
      const precio = Number(servicio.precio || 0);

      if (precio <= 0) {
        return reject(new Error('El precio del servicio debe ser mayor a 0.'));
      }

      db.run(
        `UPDATE servicios
         SET nombre = ?, precio = ?, descripcion = ?, atributos = ?
         WHERE id = ?`,
        [servicio.nombre, precio, servicio.descripcion || '', atributosJson, servicio.id],
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
