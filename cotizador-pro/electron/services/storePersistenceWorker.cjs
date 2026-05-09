const { parentPort } = require('worker_threads');
const fs = require('fs');

if (!parentPort) {
  throw new Error('storePersistenceWorker must run in a worker thread');
}

parentPort.on('message', ({ filePath, state }) => {
  try {
    const payload = JSON.stringify(state, null, 2);
    fs.writeFile(filePath, payload, 'utf8', (err) => {
      if (err) {
        parentPort.postMessage({ ok: false, error: err.message });
        return;
      }
      parentPort.postMessage({ ok: true });
    });
  } catch (error) {
    parentPort.postMessage({ ok: false, error: error.message });
  }
});
