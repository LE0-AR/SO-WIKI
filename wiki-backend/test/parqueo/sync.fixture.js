'use strict';

// Hilo real usado sólo por las pruebas de cancelación de primitivas.
const { parentPort, workerData } = require('node:worker_threads');
const { attachShared, S, R } = require('../../src/parqueo/shared-state');
const { acquire, barrier, withMonitor, cleanupVehicle, CancelledError } = require('../../src/parqueo/sync');

// node --test puede descubrir también este auxiliar. En main no hace nada.
if (parentPort && workerData) {
  const shared = attachShared(workerData.shared);
  const id = workerData.id;
  parentPort.postMessage({ type: 'ready' });
  let result = S.FINISHED;
  try {
    if (workerData.operation === 'barrier') barrier(shared, id, 0, 2);
    else if (workerData.operation === 'mutex') acquire(shared, id, R.A, S.WAIT_A);
    else if (workerData.operation === 'capacity') acquire(shared, id, R.CAPACITY, S.CAPACITY);
    else if (workerData.operation === 'poison') {
      // Sólo prueba: matar el isolate en plena sección crítica, sin finally.
      withMonitor(shared, () => { process.exit(23); });
    }
  } catch (error) {
    if (!(error instanceof CancelledError)) throw error;
    result = S.CANCELLED;
  } finally {
    cleanupVehicle(shared, id, result);
    parentPort.postMessage({ type: 'done', result });
    parentPort.close();
  }
}
