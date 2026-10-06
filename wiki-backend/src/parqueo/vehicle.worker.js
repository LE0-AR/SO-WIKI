'use strict';

const { parentPort, workerData, threadId } = require('node:worker_threads');
const { V, R, S, attachShared, vehicleIndex } = require('./shared-state');
const {
  CancelledError, checkCancelled, withMonitor, acquire, release, barrier,
  delay, setState, cleanupVehicle,
} = require('./sync');

const shared = attachShared(workerData.shared);
const { id, mode, durationMs } = workerData;
const base = vehicleIndex(shared, id);
let lastSample = 0;

function sample(force = false) {
  const now = Date.now();
  if (!force && now - lastSample < 250) return;
  lastSample = now;
  parentPort.postMessage({ type: 'metrics', id, threadId, heapUsed: process.memoryUsage().heapUsed, sampledAt: new Date(now).toISOString() });
}
const context = { checkpoint: sample };
function event(type, message) { parentPort.postMessage({ type: 'event', eventType: type, message }); }

function normal() {
  acquire(shared, id, R.CAPACITY, S.CAPACITY, context);
  acquire(shared, id, R.ENTRANCE, S.ENTERING, context);
  acquire(shared, id, R.SPACES, S.RESERVING, context);
  withMonitor(shared, () => {
    let selected = -1;
    for (let n = 0; n < shared.capacity; n++) {
      if (shared.a[shared.spacesOffset + n] === 0) { selected = n; break; }
    }
    if (selected === -1) throw new Error('Permiso sin plaza disponible');
    shared.a[shared.spacesOffset + selected] = id;
    shared.a[base + V.SPACE] = selected + 1;
  }, { id });
  release(shared, id, R.SPACES);
  // Orden único A -> B en operación normal, sin retener el monitor.
  acquire(shared, id, R.A, S.WAIT_A, context);
  acquire(shared, id, R.B, S.WAIT_B, context);
  release(shared, id, R.ENTRANCE);
  setState(shared, id, S.CIRCULATING);
  delay(shared, id, 25, context);
  release(shared, id, R.B);
  release(shared, id, R.A);
  setState(shared, id, S.PARKED);
  event('parking', `Vehículo ${id} estacionado`);
  sample(true);
  delay(shared, id, durationMs, context);
  acquire(shared, id, R.EXIT, S.EXITING, context);
  delay(shared, id, 25, context);
  // finally devuelve plaza, permiso y salida en una transición coherente.
}

function reservationDemo() {
  let observedOwner;
  let confirmed;
  if (mode === 'race') {
    checkCancelled(shared, id);
    // Cada load/store individual es atómico; la operación compuesta no lo es.
    observedOwner = Atomics.load(shared.a, shared.spacesOffset);
    barrier(shared, id, 0, 2, context); // AMBOS ya leyeron antes del primer store.
    checkCancelled(shared, id);
    confirmed = observedOwner === 0;
    if (confirmed) Atomics.store(shared.a, shared.spacesOffset, id);
  } else {
    barrier(shared, id, 0, 2, context); // Jamás esperar esta barrera dentro del mutex.
    acquire(shared, id, R.SPACES, S.RESERVING, context);
    withMonitor(shared, () => {
      observedOwner = shared.a[shared.spacesOffset];
      confirmed = observedOwner === 0;
      if (confirmed) shared.a[shared.spacesOffset] = id;
    }, { id });
    release(shared, id, R.SPACES);
  }
  // El escenario aísla la reserva de UNA plaza: no consume permisos de ingreso,
  // pues un semáforo de capacidad 1 ocultaría precisamente la carrera a enseñar.
  withMonitor(shared, () => {
    shared.a[base + V.OBSERVED] = observedOwner;
    shared.a[base + V.ATTEMPT] = 1;
    shared.a[base + V.CONFIRMED] = Number(confirmed);
    shared.a[base + V.SPACE] = confirmed ? 1 : 0;
  }, { id });
  event('reservation', `Vehículo ${id}: leyó propietario ${observedOwner}; reserva ${confirmed ? 'confirmada' : 'rechazada'}`);
  // La reserva ganadora se mantiene hasta que AMBOS terminaron su intento.
  barrier(shared, id, 1, 2, context);
  setState(shared, id, confirmed ? S.PARKED : S.REJECTED);
  sample(true);
  return confirmed ? S.FINISHED : S.REJECTED;
}

function deadlockDemo() {
  const first = id === 1 ? R.A : R.B;
  const second = id === 1 ? R.B : R.A;
  acquire(shared, id, first, first === R.A ? S.WAIT_A : S.WAIT_B, context);
  barrier(shared, id, 0, 2, context);
  event('request', `Vehículo ${id} conserva Zona ${first === R.A ? 'A' : 'B'} y solicita la opuesta`);
  acquire(shared, id, second, second === R.A ? S.WAIT_A : S.WAIT_B, context);
  setState(shared, id, S.CIRCULATING);
  event('progress', `Vehículo ${id} obtuvo ambas zonas y puede avanzar`);
  sample(true);
  delay(shared, id, 100, context);
}

let finalState = S.FINISHED;
let fault = null;
try {
  sample(true);
  checkCancelled(shared, id);
  if (mode === 'normal') normal();
  else if (mode === 'race' || mode === 'protected') finalState = reservationDemo();
  else if (mode === 'deadlock') deadlockDemo();
  else throw new Error('Modo desconocido');
} catch (error) {
  if (error instanceof CancelledError) finalState = S.CANCELLED;
  else { finalState = S.FAILED; fault = error; }
} finally {
  try { cleanupVehicle(shared, id, finalState); }
  catch (error) { fault = error; }
  sample(true);
  if (fault) {
    parentPort.postMessage({ type: 'fatal', message: fault.message });
    process.exitCode = 1;
  } else {
    parentPort.postMessage({ type: 'done', id });
  }
  parentPort.close();
}
