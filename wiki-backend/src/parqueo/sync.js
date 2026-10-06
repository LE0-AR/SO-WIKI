'use strict';

const { isMainThread } = require('node:worker_threads');
const { H, V, R, S, vehicleIndex } = require('./shared-state');
const WAIT_SLICE_MS = 40;
const MONITOR_DEADLINE_MS = 2500;

class CancelledError extends Error {
  constructor() { super('Transacción cancelada'); this.name = 'CancelledError'; }
}

function isCancelled(shared, id) {
  return Boolean(Atomics.load(shared.a, H.STOP)
    || (id && Atomics.load(shared.a, vehicleIndex(shared, id, V.CANCEL))));
}

function checkCancelled(shared, id) {
  if (isCancelled(shared, id)) throw new CancelledError();
}

function wakeAll(shared) {
  Atomics.add(shared.a, H.EPOCH, 1);
  Atomics.notify(shared.a, H.EPOCH);
  Atomics.notify(shared.a, H.MONITOR);
}

function requestCancel(shared, id) {
  Atomics.store(shared.a, vehicleIndex(shared, id, V.CANCEL), 1);
  wakeAll(shared);
}

function requestStop(shared) {
  Atomics.store(shared.a, H.STOP, 1);
  wakeAll(shared);
}

function waitEpoch(shared, epoch, context = {}, timeout = WAIT_SLICE_MS) {
  if (isMainThread) throw new Error('Atomics.wait está prohibido en el hilo principal');
  checkCancelled(shared, context.id);
  if (context.checkpoint) context.checkpoint();
  Atomics.wait(shared.a, H.EPOCH, epoch, Math.min(WAIT_SLICE_MS, Math.max(1, timeout)));
  checkCancelled(shared, context.id);
}

function unlock(shared, mutate) {
  Atomics.store(shared.a, H.MONITOR, 0);
  Atomics.notify(shared.a, H.MONITOR);
  if (mutate) wakeAll(shared);
}

// El callback es síncrono y breve. Jamás adquirir otro recurso, esperar,
// serializar, emitir mensajes ni ejecutar DFS dentro de este monitor.
function withMonitor(shared, callback, { id = 0, ignoreCancel = false, mutate = true } = {}) {
  if (isMainThread) throw new Error('Usar withMonitorAsync en el hilo principal');
  const deadline = Date.now() + MONITOR_DEADLINE_MS;
  while (Atomics.compareExchange(shared.a, H.MONITOR, 0, 1) !== 0) {
    if (!ignoreCancel) checkCancelled(shared, id);
    if (Date.now() >= deadline) throw new Error('Monitor no responde; descartar generación');
    Atomics.wait(shared.a, H.MONITOR, 1, WAIT_SLICE_MS);
  }
  try {
    if (!ignoreCancel) checkCancelled(shared, id);
    return callback();
  } finally { unlock(shared, mutate); }
}

// No usa Atomics.wait, ni siquiera en su camino de contención.
async function withMonitorAsync(shared, callback, { ignoreCancel = false, mutate = true } = {}) {
  const deadline = Date.now() + MONITOR_DEADLINE_MS;
  while (Atomics.compareExchange(shared.a, H.MONITOR, 0, 1) !== 0) {
    if (!ignoreCancel) checkCancelled(shared, 0);
    if (Date.now() >= deadline) throw new Error('Monitor no responde; descartar generación');
    await new Promise(resolve => setTimeout(resolve, 2));
  }
  try {
    if (!ignoreCancel) checkCancelled(shared, 0);
    return callback();
  } finally { unlock(shared, mutate); }
}

function setState(shared, id, state) {
  withMonitor(shared, () => { shared.a[vehicleIndex(shared, id, V.STATE)] = state; }, { id });
}

function acquire(shared, id, resource, state, context = {}) {
  if (resource < 0 || resource > R.CAPACITY) throw new RangeError('Recurso inválido');
  const base = vehicleIndex(shared, id);
  while (true) {
    let epoch;
    const acquired = withMonitor(shared, () => {
      const { a } = shared;
      a[base + V.STATE] = state;
      const free = resource === R.CAPACITY
        ? a[H.AVAILABLE] > 0 : a[shared.locksOffset + resource] === 0;
      if (free) {
        if (resource === R.CAPACITY) {
          if (a[base + V.PERMIT]) throw new Error('Permiso duplicado');
          a[H.AVAILABLE]--;
          a[base + V.PERMIT] = 1;
        } else { a[shared.locksOffset + resource] = id; }
        a[base + V.WAIT] = 0;
        return true;
      }
      if (resource !== R.CAPACITY && a[shared.locksOffset + resource] === id) {
        throw new Error('Mutex no reentrante');
      }
      a[base + V.WAIT] = resource + 1;
      epoch = Atomics.load(a, H.EPOCH);
      return false;
    }, { id, mutate: false });
    // Señalizar únicamente la adquisición: la inscripción de la espera no
    // libera nada. Evita un ping-pong de despertares entre dos bloqueados.
    if (acquired) { wakeAll(shared); return; }
    waitEpoch(shared, epoch, { ...context, id });
  }
}

function release(shared, id, resource) {
  withMonitor(shared, () => {
    const { a } = shared;
    const base = vehicleIndex(shared, id);
    if (resource === R.CAPACITY) {
      if (a[base + V.PERMIT]) {
        a[base + V.PERMIT] = 0;
        a[H.AVAILABLE]++;
      }
    } else if (a[shared.locksOffset + resource] === id) {
      a[shared.locksOffset + resource] = 0;
    }
  }, { id, ignoreCancel: true });
}

// Barrera de un solo uso; cada escenario posee sus propias fases. La llegada
// y la fase se actualizan bajo el monitor, pero la espera siempre ocurre fuera.
function barrier(shared, id, index, parties, context = {}) {
  const deadline = Date.now() + 10000;
  const slot = shared.barriersOffset + index * 2;
  if (!Number.isInteger(index) || index < 0 || index >= 3) throw new RangeError('Barrera inválida');
  withMonitor(shared, () => {
    shared.a[vehicleIndex(shared, id, V.STATE)] = S.BARRIER;
    shared.a[slot]++;
    if (shared.a[slot] > parties) throw new Error('Llegada duplicada a barrera');
    if (shared.a[slot] === parties) Atomics.store(shared.a, slot + 1, 1);
  }, { id });
  while (true) {
    checkCancelled(shared, id);
    const epoch = Atomics.load(shared.a, H.EPOCH);
    if (Atomics.load(shared.a, slot + 1)) return;
    if (Date.now() >= deadline) throw new Error('Preparación incompleta: falta un participante en la barrera');
    waitEpoch(shared, epoch, { ...context, id });
  }
}

// Duración de estacionamiento/circulación del modelo; NO es la sincronización
// que produce una carrera o un interbloqueo (ambos usan barreras auténticas).
function delay(shared, id, durationMs, context = {}) {
  const deadline = Date.now() + durationMs;
  while (Date.now() < deadline) {
    const epoch = Atomics.load(shared.a, H.EPOCH);
    waitEpoch(shared, epoch, { ...context, id }, deadline - Date.now());
  }
  checkCancelled(shared, id);
}

// Sólo el propietario devuelve sus recursos, incluso si ha sido cancelado.
// La finalización es atómica para no mostrar plaza liberada con permiso perdido.
function cleanupVehicle(shared, id, finalState) {
  withMonitor(shared, () => {
    const { a } = shared;
    const base = vehicleIndex(shared, id);
    for (let resource = 0; resource < 5; resource++) {
      if (a[shared.locksOffset + resource] === id) a[shared.locksOffset + resource] = 0;
    }
    for (let n = 0; n < shared.capacity; n++) {
      if (Atomics.load(a, shared.spacesOffset + n) === id) Atomics.store(a, shared.spacesOffset + n, 0);
    }
    if (a[base + V.PERMIT]) { a[base + V.PERMIT] = 0; a[H.AVAILABLE]++; }
    a[base + V.WAIT] = 0;
    a[base + V.SPACE] = 0;
    a[base + V.STATE] = finalState;
    a[base + V.DONE] = 1;
    if (a[H.AVAILABLE] < 0 || a[H.AVAILABLE] > shared.capacity) throw new Error('Capacidad inconsistente');
  }, { id, ignoreCancel: true });
}

module.exports = {
  WAIT_SLICE_MS, MONITOR_DEADLINE_MS, CancelledError, isCancelled, checkCancelled,
  wakeAll, requestCancel, requestStop, waitEpoch, withMonitor, withMonitorAsync,
  setState, acquire, release, barrier, delay, cleanupVehicle,
};
