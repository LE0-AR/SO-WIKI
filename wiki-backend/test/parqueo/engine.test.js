'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Worker } = require('node:worker_threads');
const path = require('node:path');
const vm = require('node:vm');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const { ParkingEngine } = require('../../src/parqueo/engine');
const {
  H, V, R, S, createShared, descriptor, vehicleIndex, copyLocked, snapshotFromCopy,
} = require('../../src/parqueo/shared-state');
const {
  withMonitorAsync, requestCancel, requestStop, waitEpoch,
} = require('../../src/parqueo/sync');
const {
  buildGraph, findCycle, revalidateCycle, revalidateCycleLocked,
} = require('../../src/parqueo/rag');

const DEADLINE = 15000;
const terminal = vehicle => ['Finalizado', 'Cancelado', 'Reserva rechazada', 'Fallido'].includes(vehicle.state);
let sequence = 0;
function engine(options = {}) {
  return new ParkingEngine({ id: `prueba-${++sequence}`, generation: 1, ...options });
}

// Los plazos sólo detectan fallos; las pruebas esperan estados observables,
// no secuencias de sleeps que supuestamente "demuestren" concurrencia.
function untilSnapshot(instance, predicate, timeout = DEADLINE) {
  const current = instance.getSnapshot();
  if (current && predicate(current)) return Promise.resolve(current);
  return new Promise((resolve, reject) => {
    function finish(error, value) {
      clearTimeout(timer);
      instance.off('snapshot', onSnapshot);
      instance.off('fault', onFault);
      if (error) reject(error); else resolve(value);
    }
    function onSnapshot(value) {
      try { if (predicate(value)) finish(null, value); }
      catch (error) { finish(error); }
    }
    function onFault({ message }) { finish(new Error(message)); }
    const timer = setTimeout(() => finish(new Error('No llegó la instantánea esperada')), timeout);
    instance.on('snapshot', onSnapshot);
    instance.on('fault', onFault);
  });
}

async function bounded(promise, timeout = DEADLINE) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Plazo de prueba agotado')), timeout); }),
    ]);
  } finally { clearTimeout(timer); }
}

function quota(limit = 32) {
  const state = { used: 0, reserved: 0, released: 0, high: 0 };
  return {
    state,
    reserveWorker() {
      if (state.used >= limit) throw new Error('Cuota global de hilos excedida');
      state.used++; state.reserved++; state.high = Math.max(state.high, state.used);
    },
    releaseWorker() {
      assert.ok(state.used > 0, 'no devolver una cuota dos veces');
      state.used--; state.released++;
    },
  };
}

function assertInvariant(snapshot) {
  assert.ok(snapshot.available >= 0 && snapshot.available <= snapshot.capacity);
  const permits = snapshot.resources.find(resource => resource.id === 'capacidad');
  assert.equal(snapshot.available + permits.owners.length, snapshot.capacity);
  assert.equal(new Set(permits.owners).size, permits.owners.length);
  const occupied = snapshot.spaces.filter(space => space.owner !== null);
  assert.equal(new Set(occupied.map(space => space.owner)).size, occupied.length);
  assert.ok(occupied.length <= permits.owners.length);
  for (const space of occupied) {
    assert.ok(permits.owners.includes(space.owner));
    assert.equal(snapshot.vehicles.find(vehicle => vehicle.id === space.owner).space, space.id);
  }
  for (const resource of snapshot.resources.filter(resource => resource.kind !== 'semaphore')) {
    assert.ok(resource.owners.length <= 1);
  }
  for (const vehicle of snapshot.vehicles.filter(terminal)) {
    assert.deepEqual(vehicle.heldResources, []);
    assert.equal(vehicle.waitingFor, null);
  }
  assert.deepEqual(snapshot.graph.cycle, []);
}

function assertDTO(snapshot) {
  assert.deepEqual(Object.keys(snapshot).sort(), [
    'sessionId', 'generation', 'revision', 'mode', 'status', 'capturedAt', 'pid', 'platform',
    'capacity', 'available', 'vehicles', 'resources', 'spaces', 'graph', 'incident', 'race',
    'events', 'memory', 'guardian',
  ].sort());
  assert.equal(snapshot.pid, process.pid);
  assert.equal(snapshot.platform, process.platform);
  assert.ok(Number.isFinite(Date.parse(snapshot.capturedAt)));
  assert.ok(snapshot.memory.rss > 0);
  for (const vehicle of snapshot.vehicles) {
    assert.deepEqual(Object.keys(vehicle).sort(), [
      'id', 'name', 'threadId', 'state', 'waitingFor', 'heldResources', 'space', 'heapUsed', 'sampledAt',
    ].sort());
  }
}

test('historial serializable e independiente de los listeners del motor', { timeout: 20000 }, async () => {
  const instance = engine();
  const snapshots = [];
  instance.on('snapshot', snapshot => snapshots.push(snapshot));
  instance.on('fault', fault => assert.fail(fault.message));
  try {
    const ready = await instance.start();
    assert.ok(snapshots.length > 0, 'los listeners reciben las instantáneas');
    assert.deepEqual(Object.keys(ready.events), ready.events.map((_, index) => String(index)),
      'el historial sólo contiene registros, nunca listeners');
    assert.ok(ready.events.some(event => event.type === 'start'));
    assert.doesNotThrow(() => structuredClone(ready));

    instance.removeAllListeners();
    instance._log('test', 'Evento después de quitar listeners');
    const stopped = await bounded(instance.close());
    assert.ok(stopped.events.some(event => event.type === 'start'), 'quitar listeners conserva el historial');
    assert.ok(stopped.events.some(event => event.message === 'Evento después de quitar listeners'));
    assert.equal(stopped.status, 'stopped');
  } finally { await bounded(instance.close()); }
});

test('normal: workers reales, contención, monitor coherente y conservación de capacidad', { timeout: 30000 }, async () => {
  const q = quota();
  const instance = engine({ capacity: 2, maxVehicles: 12, ...q });
  const snapshots = [];
  instance.on('snapshot', snapshot => snapshots.push(snapshot));
  try {
    assert.equal(instance.getSnapshot(), null);
    const ready = await instance.start();
    assertDTO(ready);
    assert.ok(ready.guardian.threadId > 0);
    assert.equal(instance.liveWorkers, 1);
    await instance.addVehicles(10, 1000);
    const blocked = await untilSnapshot(instance, snapshot => snapshot.available === 0
      && snapshot.vehicles.some(vehicle => vehicle.waitingFor === 'capacidad'));
    assert.ok(blocked.vehicles.some(vehicle => vehicle.threadId > 0));
    assert.equal(new Set(blocked.vehicles.filter(vehicle => vehicle.threadId !== null)
      .map(vehicle => vehicle.threadId)).size, blocked.vehicles.filter(vehicle => vehicle.threadId !== null).length);
    const done = await untilSnapshot(instance, snapshot => snapshot.vehicles.length === 10
      && snapshot.vehicles.every(vehicle => terminal(vehicle) && vehicle.heapUsed > 0));
    assert.equal(done.available, 2);
    assert.equal(done.vehicles.length, 10, 'conservar terminados');
    assert.ok(done.vehicles.every(vehicle => vehicle.heapUsed > 0 && Number.isFinite(Date.parse(vehicle.sampledAt))));
    snapshots.forEach(assertInvariant);
    snapshots.forEach(assertDTO);
    for (let n = 1; n < snapshots.length; n++) assert.ok(snapshots[n].revision > snapshots[n - 1].revision);
    const external = instance.getSnapshot();
    external.vehicles.length = 0;
    assert.equal(instance.getSnapshot().vehicles.length, 10, 'el lector no muta el DTO interno');
    assert.ok(q.state.high > 2);
  } finally {
    await bounded(instance.close());
    assert.equal(instance.liveWorkers, 0);
    assert.equal(q.state.used, 0);
    assert.equal(q.state.reserved, q.state.released);
  }
});

for (const mode of ['race', 'protected']) {
  test(`${mode}: barreras reales y confirmaciones persistentes`, { timeout: 25000 }, async () => {
    const instance = engine({ mode, capacity: 1 });
    try {
      await instance.start();
      const snapshot = await untilSnapshot(instance, value => value.race.attempts.length === 2 && value.vehicles.every(terminal));
      assert.equal(snapshot.race.expected, 1);
      assert.equal(snapshot.race.confirmed, mode === 'race' ? 2 : 1);
      assert.equal(snapshot.race.attempts.filter(attempt => attempt.observedOwner === 0).length, mode === 'race' ? 2 : 1);
      assert.equal(snapshot.race.attempts.filter(attempt => attempt.confirmed).length, mode === 'race' ? 2 : 1);
      assert.deepEqual(snapshot.graph.cycle, []);
      assert.equal(snapshot.incident, null);
      await assert.rejects(instance.addVehicles(), /modo normal/);
    } finally { await bounded(instance.close()); }
  });
}

test('deadlock automático: evidencia revalidada, víctima libera y superviviente progresa', { timeout: 25000 }, async () => {
  const instance = engine({ mode: 'deadlock' });
  try {
    await instance.start();
    const snapshot = await untilSnapshot(instance, value => value.incident?.recovered && value.vehicles.every(terminal)
      && value.events.some(event => event.type === 'progress'));
    assert.equal(snapshot.incident.victim, 2);
    assert.equal(snapshot.vehicles.find(vehicle => vehicle.id === 2).state, 'Cancelado');
    assert.equal(snapshot.vehicles.find(vehicle => vehicle.id === 1).state, 'Finalizado');
    assert.deepEqual(snapshot.graph.cycle, []);
    const history = snapshot.incident.graph;
    assert.equal(history.cycle.length, 5);
    assert.equal(new Set(history.cycle.slice(0, -1)).size, 4);
    for (const edge of [
      { from: 'zona-a', to: 'vehiculo-1', type: 'assignment' },
      { from: 'vehiculo-1', to: 'zona-b', type: 'request' },
      { from: 'zona-b', to: 'vehiculo-2', type: 'assignment' },
      { from: 'vehiculo-2', to: 'zona-a', type: 'request' },
    ]) assert.ok(history.edges.some(candidate => JSON.stringify(candidate) === JSON.stringify(edge)));
    assert.ok(snapshot.events.some(event => event.type === 'progress'));
  } finally { await bounded(instance.close()); }
});

test('deadlock manual: permanece real hasta recover(), sin falsificar progreso', { timeout: 25000 }, async () => {
  const instance = engine({ mode: 'deadlock', autoRecover: false });
  try {
    await instance.start();
    const blocked = await untilSnapshot(instance, value => value.incident && value.graph.cycle.length);
    assert.equal(blocked.incident.recovered, false);
    assert.ok(revalidateCycle(blocked.graph.cycle, blocked));
    assert.equal(instance.liveWorkers, 3);
    const later = await untilSnapshot(instance, value => value.revision > blocked.revision);
    assert.equal(later.incident.recovered, false);
    const recovered = await instance.recover();
    assert.equal(recovered.incident.recovered, true);
    await untilSnapshot(instance, value => value.vehicles.every(terminal));
    const again = await instance.recover();
    assert.equal(again.incident.recovered, true);
  } finally { await bounded(instance.close()); }
});

test('stop cancela vehículos esperando capacidad y cierra cuotas exactamente una vez', { timeout: 25000 }, async () => {
  const q = quota();
  const instance = engine({ capacity: 1, ...q });
  try {
    await instance.start();
    await instance.addVehicles(8, 60000);
    await untilSnapshot(instance, value => value.vehicles.some(vehicle => vehicle.waitingFor === 'capacidad'));
    const first = instance.close();
    assert.equal(instance.close(), first, 'misma promesa de cierre');
    await bounded(first);
    const stopped = instance.getSnapshot();
    assert.equal(stopped.status, 'stopped');
    assert.equal(stopped.available, 1);
    assert.ok(stopped.vehicles.every(terminal));
    assert.equal(stopped.guardian.threadId, null);
    assert.ok(stopped.vehicles.every(vehicle => vehicle.threadId === null));
    assertInvariant(stopped);
    await assert.rejects(instance.addVehicles(), /reiniciar/);
    await assert.rejects(instance.start(), /reiniciar/);
  } finally {
    await bounded(instance.close());
    assert.equal(q.state.used, 0);
    assert.equal(q.state.reserved, q.state.released);
  }
});

test('stop durante espera circular cancela ambos sin afirmar recuperación', { timeout: 25000 }, async () => {
  const instance = engine({ mode: 'deadlock', autoRecover: false });
  try {
    await instance.start();
    await untilSnapshot(instance, value => value.incident && value.graph.cycle.length);
    await bounded(instance.close());
    const stopped = instance.getSnapshot();
    assert.equal(stopped.status, 'stopped');
    assert.equal(stopped.incident.recovered, false);
    assert.deepEqual(stopped.graph.cycle, []);
    assert.ok(stopped.resources.every(resource => resource.owners.length === 0));
  } finally { await bounded(instance.close()); }
});

test('límite acumulado por generación, validación y comandos concurrentes', { timeout: 25000 }, async () => {
  const instance = engine({ maxVehicles: 2 });
  try {
    await instance.start();
    await assert.rejects(instance.addVehicles(0), /entero/);
    await assert.rejects(instance.addVehicles(1, -1), /Duración/);
    await Promise.all([instance.addVehicles(1, 0), instance.addVehicles(1, 0)]);
    await untilSnapshot(instance, value => value.vehicles.length === 2 && value.vehicles.every(terminal));
    await assert.rejects(instance.addVehicles(), /reiniciar/);
    assert.equal(instance.getSnapshot().status, 'running');
    await assert.rejects(instance.recover(), /interbloqueo/);
  } finally { await bounded(instance.close()); }
});

test('cuota incluye guardián y deshace inicio parcial bloqueado en barrera', { timeout: 25000 }, async () => {
  const q = quota(2);
  const instance = engine({ mode: 'deadlock', ...q });
  const faults = [];
  instance.on('fault', fault => faults.push(fault));
  try {
    await assert.rejects(instance.start(), /Cuota/);
    await bounded(instance.close());
    assert.equal(instance.liveWorkers, 0);
    assert.equal(q.state.reserved, 2);
    assert.equal(q.state.released, 2);
    assert.equal(q.state.used, 0);
    assert.equal(faults.length, 1);
  } finally { await bounded(instance.close()); }
});

test('cuota rechazada antes del guardián no devuelve una reserva inexistente', { timeout: 20000 }, async () => {
  const q = quota(0);
  const instance = engine({ ...q });
  try {
    await assert.rejects(instance.start(), /Cuota/);
    assert.equal(instance.liveWorkers, 0);
    assert.equal(q.state.reserved, 0);
    assert.equal(q.state.released, 0);
  } finally { await bounded(instance.close()); }
});

test('error síncrono del constructor Worker devuelve su única reserva', { timeout: 20000 }, async () => {
  // Cargar el módulo aislado permite simular el fallo del constructor nativo sin
  // exponer una factoría de workers falsa en la API de producción.
  const filename = require.resolve('../../src/parqueo/engine');
  const realRequire = createRequire(filename);
  const source = fs.readFileSync(filename, 'utf8');
  const isolatedModule = { exports: {} };
  const wrap = vm.runInThisContext(`(function(require, module, exports, __dirname) {${source}\n})`, { filename });
  wrap(name => name === 'node:worker_threads' ? {
    Worker: class { constructor() { throw new Error('Constructor Worker falló'); } },
  } : realRequire(name), isolatedModule, isolatedModule.exports, path.dirname(filename));
  const q = quota();
  const instance = new isolatedModule.exports.ParkingEngine({ id: 'constructor', generation: 'uuid-generacion', ...q });
  try {
    await assert.rejects(instance.start(), /Constructor Worker/);
    assert.equal(instance.liveWorkers, 0);
    assert.equal(q.state.reserved, 1);
    assert.equal(q.state.released, 1);
  } finally { await bounded(instance.close()); }
});

test('inicio rechaza timeout sin captura del guardián y luego limpia', { timeout: 25000 }, async () => {
  const q = quota();
  const instance = engine({ ...q });
  const onMessage = instance._onMessage.bind(instance);
  instance._onMessage = (record, message) => {
    if (message.type !== 'snapshot') onMessage(record, message);
  };
  try {
    await assert.rejects(instance.start(), /instantánea/);
    assert.equal(instance.liveWorkers, 0);
    assert.equal(instance.getSnapshot(), null, 'no fabricar snapshot cuando guardián nunca publicó');
    assert.equal(q.state.used, 0);
  } finally { await bounded(instance.close()); }
});

test('cuota compartida entre sesiones y guardianes sin interferencia', { timeout: 25000 }, async () => {
  const q = quota(3);
  const first = engine({ ...q });
  const second = engine({ ...q });
  try {
    await Promise.all([first.start(), second.start()]);
    await first.addVehicles(1, 60000);
    await assert.rejects(second.addVehicles(1), /Cuota/);
    await bounded(second.close());
    assert.equal(first.getSnapshot().status, 'running');
    assert.equal(q.state.used, first.liveWorkers);
  } finally {
    await bounded(Promise.all([first.close(), second.close()]));
    assert.equal(q.state.used, 0);
  }
});

test('salida inesperada descarta generación completa y libera cuotas al exit', { timeout: 30000 }, async () => {
  const q = quota();
  const instance = engine({ ...q });
  const faults = [];
  instance.on('fault', fault => faults.push(fault));
  try {
    await instance.start();
    await instance.addVehicles(2, 60000);
    await untilSnapshot(instance, value => value.vehicles.some(vehicle => vehicle.state === 'Estacionado'));
    // Acceso interno deliberado: inyección de fallo, no API pública.
    const record = [...instance._records.values()].find(value => value.kind === 'vehicle');
    await record.worker.terminate();
    await bounded(instance.close());
    assert.ok(faults.length >= 1);
    assert.equal(instance.getSnapshot().status, 'failed');
    assert.equal(instance.liveWorkers, 0);
    assert.equal(q.state.used, 0);
  } finally { await bounded(instance.close()); }
});

test('monitor abandonado: timeout y descarte completo sin reutilizar SAB', { timeout: 30000 }, async () => {
  const q = quota();
  const instance = engine({ ...q });
  let poison;
  let exit;
  try {
    await instance.start();
    poison = new Worker(path.join(__dirname, 'sync.fixture.js'), {
      workerData: { shared: descriptor(instance._shared), id: 1, operation: 'poison' },
    });
    exit = new Promise((resolve, reject) => { poison.once('exit', resolve); poison.once('error', reject); });
    assert.equal(await bounded(exit), 23);
    assert.equal(Atomics.load(instance._shared.a, H.MONITOR), 1);
    await bounded(instance.close());
    assert.equal(instance.getSnapshot().status, 'failed');
    assert.equal(instance.liveWorkers, 0);
    assert.equal(q.state.used, 0);
    await assert.rejects(instance.start(), /cerrada/);
  } finally {
    if (poison) { await poison.terminate(); if (exit) await exit.catch(() => {}); }
    await bounded(instance.close());
  }
});

test('fallback terminate espera exit y descarta, nunca repara memoria incierta', { timeout: 30000 }, async () => {
  const q = quota();
  const instance = engine({ ...q });
  try {
    await instance.start();
    // Un guardián pausado no procesa finish: obliga el camino de respaldo.
    const guardian = instance._records.get('guardian');
    guardian.worker.postMessage({ type: 'capture' });
    // Sustituir solamente el envío del comando reproduce un hilo no cooperante
    // sin introducir una puerta de fallos en el código de producción.
    guardian.worker.postMessage = () => {};
    await bounded(instance.close());
    assert.equal(guardian.hasExited, true);
    assert.equal(instance.liveWorkers, 0);
    assert.equal(instance.getSnapshot().status, 'failed');
    assert.equal(q.state.used, 0);
  } finally { await bounded(instance.close()); }
});

test('cierre inmediato, cierre antes de start y generaciones repetidas', { timeout: 30000 }, async () => {
  const q = quota();
  const unused = engine({ ...q });
  await bounded(unused.close());
  await assert.rejects(unused.start(), /cerrada/);
  for (let n = 0; n < 3; n++) {
    const instance = engine({ mode: 'protected', generation: n, ...q });
    try {
      const started = instance.start();
      const outcome = started.catch(error => error);
      await bounded(instance.close());
      await bounded(outcome);
      assert.equal(instance.liveWorkers, 0);
    } finally { await bounded(instance.close()); }
  }
  assert.equal(q.state.used, 0);
  assert.equal(q.state.reserved, q.state.released);
});

// Un bloque compartido mínimo permite observar que la espera REAL se ha
// inscrito antes de cancelarla, también en una barrera con compañero ausente.
for (const operation of ['barrier', 'barrier-stop', 'mutex', 'capacity']) {
  test(`primitiva cancelable: ${operation}`, { timeout: 20000 }, async () => {
    const shared = createShared(1, 2);
    let worker;
    let exit;
    try {
      await withMonitorAsync(shared, () => {
        shared.a[vehicleIndex(shared, 1, V.ACTIVE)] = 1;
        if (operation === 'mutex') shared.a[shared.locksOffset + R.A] = 2;
        if (operation === 'capacity') {
          shared.a[H.AVAILABLE] = 0;
          shared.a[vehicleIndex(shared, 2, V.PERMIT)] = 1;
        }
      });
      worker = new Worker(path.join(__dirname, 'sync.fixture.js'), {
        workerData: { shared: descriptor(shared), id: 1, operation: operation === 'barrier-stop' ? 'barrier' : operation },
      });
      exit = new Promise((resolve, reject) => { worker.once('exit', resolve); worker.once('error', reject); });
      void exit.catch(() => {}); // Mantener el rechazo observado hasta el finally.
      const seen = await bounded(new Promise((resolve, reject) => {
        const deadline = Date.now() + DEADLINE;
        const poll = async () => {
          try {
            const copy = await withMonitorAsync(shared, () => copyLocked(shared), { mutate: false });
            const row = copy.rows[0];
            const waiting = operation.startsWith('barrier') ? row[V.STATE] === S.BARRIER
              : row[V.WAIT] === (operation === 'mutex' ? R.A : R.CAPACITY) + 1;
            if (waiting) return resolve(copy);
            if (Date.now() >= deadline) return reject(new Error('No se inscribió la espera'));
            setTimeout(poll, 5);
          } catch (error) { reject(error); }
        };
        void poll();
      }));
      assert.equal(seen.rows[0][V.DONE], 0);
      if (operation === 'barrier-stop') requestStop(shared); else requestCancel(shared, 1);
      assert.equal(await bounded(exit), 0);
      const done = await withMonitorAsync(shared, () => copyLocked(shared), { ignoreCancel: true, mutate: false });
      assert.equal(done.rows[0][V.STATE], S.CANCELLED);
      assert.equal(done.rows[0][V.DONE], 1);
      assert.equal(done.rows[0][V.WAIT], 0);
      if (operation === 'mutex') assert.equal(done.locks[R.A], 2, 'no liberar recurso ajeno');
    } finally {
      requestStop(shared);
      if (worker) { await worker.terminate(); if (exit) await exit.catch(() => {}); }
    }
  });
}

test('barrera con participante ausente vence como error de preparación, no como deadlock', { timeout: 20000 }, async () => {
  const shared = createShared(1, 2);
  let worker;
  try {
    worker = new Worker(`
      const { parentPort, workerData } = require('node:worker_threads');
      const { attachShared } = require(workerData.sharedModule);
      const { barrier } = require(workerData.syncModule);
      try { barrier(attachShared(workerData.descriptor), 1, 0, 2); parentPort.postMessage('inesperado'); }
      catch (error) { parentPort.postMessage(error.message); }
    `, { eval: true, workerData: {
      descriptor: descriptor(shared),
      sharedModule: require.resolve('../../src/parqueo/shared-state'),
      syncModule: require.resolve('../../src/parqueo/sync'),
    } });
    const message = await bounded(new Promise((resolve, reject) => {
      worker.once('message', resolve);
      worker.once('error', reject);
    }));
    assert.match(message, /Preparación incompleta/);
  } finally { if (worker) await worker.terminate(); }
});

test('hilo principal nunca entra en Atomics.wait, ni durante el ciclo del motor', { timeout: 25000 }, async () => {
  const shared = createShared(1, 1);
  assert.throws(() => waitEpoch(shared, 0), /hilo principal/);
  const original = Atomics.wait;
  const instance = engine({ capacity: 1 });
  Atomics.wait = () => { throw new Error('Atomics.wait ejecutado en main'); };
  try {
    await withMonitorAsync(shared, () => { shared.a[H.AVAILABLE] = 1; });
    assert.equal(shared.a[H.MONITOR], 0);
    await instance.start();
    await instance.addVehicles(3, 100);
    await untilSnapshot(instance, value => value.vehicles.length === 3 && value.vehicles.every(terminal));
    await bounded(instance.close());
    assert.equal(instance.getSnapshot().status, 'stopped');
  } finally {
    Atomics.wait = original;
    await bounded(instance.close());
  }
});

test('historial limitado a 200 eventos y generación opaca compatible con UUID', { timeout: 20000 }, async () => {
  const instance = engine({ generation: 'generacion-opaca-de-transporte' });
  try {
    await instance.start();
    for (let n = 0; n < 230; n++) instance._log('test', `Evento ${n}`);
    const snapshot = await untilSnapshot(instance, value => value.events.at(-1)?.message === 'Evento 229');
    assert.equal(snapshot.generation, 'generacion-opaca-de-transporte');
    assert.equal(snapshot.events.length, 200);
    assert.equal(new Set(snapshot.events.map(event => event.id)).size, 200);
    assert.ok(snapshot.events.every(event => Number.isFinite(Date.parse(event.time))));
  } finally { await bounded(instance.close()); }
});

test('DFS excluye semáforos multicapacidad y revalida candidatos obsoletos', async () => {
  const shared = createShared(2, 2);
  await withMonitorAsync(shared, () => {
    for (let id = 1; id <= 2; id++) shared.a[vehicleIndex(shared, id, V.ACTIVE)] = 1;
    shared.a[shared.locksOffset + R.A] = 1;
    shared.a[shared.locksOffset + R.B] = 2;
    shared.a[vehicleIndex(shared, 1, V.WAIT)] = R.B + 1;
    shared.a[vehicleIndex(shared, 2, V.WAIT)] = R.A + 1;
  });
  const raw = await withMonitorAsync(shared, () => copyLocked(shared), { mutate: false });
  const snapshot = snapshotFromCopy(raw, shared, 'deadlock');
  const graph = buildGraph(snapshot);
  assert.equal(graph.cycle.length, 5);
  assert.ok(revalidateCycle(graph.cycle, snapshot));
  assert.ok(await withMonitorAsync(shared, () => revalidateCycleLocked(shared, graph.cycle), { mutate: false }));
  await withMonitorAsync(shared, () => { shared.a[shared.locksOffset + R.B] = 0; });
  assert.equal(await withMonitorAsync(shared, () => revalidateCycleLocked(shared, graph.cycle), { mutate: false }), false);
  const changed = structuredClone(snapshot);
  changed.resources.find(resource => resource.id === 'zona-b').owners = [];
  assert.equal(revalidateCycle(graph.cycle, changed), false);
  const multi = {
    vehicles: [{ id: 1, name: 'Vehículo 1' }, { id: 2, name: 'Vehículo 2' }],
    resources: [
      { id: 'capacidad', label: 'Capacidad', kind: 'semaphore', capacity: 2, owners: [1], waiting: [2] },
      { id: 'zona-a', label: 'Zona A', kind: 'mutex', capacity: 1, owners: [2], waiting: [1] },
    ],
  };
  const multiGraph = buildGraph(multi);
  assert.equal(multiGraph.edges.length, 4, 'se muestran todas las asignaciones y solicitudes');
  assert.deepEqual(findCycle(multiGraph, multi.resources), []);
  multi.resources[0].capacity = 1;
  assert.equal(findCycle(multiGraph, multi.resources).length, 5);
  await withMonitorAsync(shared, () => { shared.a[shared.locksOffset + R.B] = 2; });
  requestCancel(shared, 1);
  assert.equal(await withMonitorAsync(shared, () => revalidateCycleLocked(shared, graph.cycle), { mutate: false }), false);
});
