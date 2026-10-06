'use strict';

// Un único bloque por generación. Sólo STOP/CANCEL y los contadores de despertar
// se escriben fuera del monitor; la carrera didáctica es la excepción explícita.
const H = Object.freeze({ MONITOR: 0, EPOCH: 1, STOP: 2, AVAILABLE: 3, SIZE: 8 });
const V = Object.freeze({
  ACTIVE: 0, STATE: 1, WAIT: 2, SPACE: 3, PERMIT: 4, CANCEL: 5,
  DONE: 6, OBSERVED: 7, ATTEMPT: 8, CONFIRMED: 9, SIZE: 10,
});
const R = Object.freeze({ ENTRANCE: 0, EXIT: 1, SPACES: 2, A: 3, B: 4, CAPACITY: 5 });
const RESOURCE_IDS = Object.freeze(['entrada', 'salida', 'espacios', 'zona-a', 'zona-b', 'capacidad']);
const RESOURCE_LABELS = Object.freeze(['Entrada', 'Salida', 'Tabla de espacios', 'Zona A', 'Zona B', 'Capacidad']);
const S = Object.freeze({
  STARTING: 0, CAPACITY: 1, ENTERING: 2, RESERVING: 3, CIRCULATING: 4,
  PARKED: 5, EXITING: 6, FINISHED: 7, CANCELLED: 8, BARRIER: 9,
  WAIT_A: 10, WAIT_B: 11, REJECTED: 12, FAILED: 13,
});
const STATE_LABELS = Object.freeze([
  'Iniciando', 'Esperando capacidad', 'Ingresando', 'Reservando espacio', 'Circulando',
  'Estacionado', 'Saliendo', 'Finalizado', 'Cancelado', 'Esperando barrera',
  'Esperando Zona A', 'Esperando Zona B', 'Reserva rechazada', 'Fallido',
]);
const BARRIER_COUNT = 3;

function attachShared({ buffer, capacity, maxVehicles }) {
  if (!(buffer instanceof SharedArrayBuffer)) throw new TypeError('Se requiere SharedArrayBuffer');
  const locksOffset = H.SIZE;
  const spacesOffset = locksOffset + 5;
  const barriersOffset = spacesOffset + capacity;
  const vehiclesOffset = barriersOffset + BARRIER_COUNT * 2;
  const words = vehiclesOffset + maxVehicles * V.SIZE;
  if (buffer.byteLength !== words * Int32Array.BYTES_PER_ELEMENT) {
    throw new Error('Distribución de memoria compartida incompatible');
  }
  return {
    buffer, capacity, maxVehicles, words, a: new Int32Array(buffer),
    locksOffset, spacesOffset, barriersOffset, vehiclesOffset,
  };
}

function createShared(capacity, maxVehicles) {
  const words = H.SIZE + 5 + capacity + BARRIER_COUNT * 2 + maxVehicles * V.SIZE;
  const shared = attachShared({ buffer: new SharedArrayBuffer(words * 4), capacity, maxVehicles });
  Atomics.store(shared.a, H.AVAILABLE, capacity);
  for (let id = 1; id <= maxVehicles; id++) {
    Atomics.store(shared.a, vehicleIndex(shared, id, V.OBSERVED), -1);
  }
  return shared;
}

function descriptor(shared) {
  return { buffer: shared.buffer, capacity: shared.capacity, maxVehicles: shared.maxVehicles };
}

function vehicleIndex(shared, id, field = 0) {
  if (!Number.isInteger(id) || id < 1 || id > shared.maxVehicles) throw new RangeError('Vehículo inválido');
  return shared.vehiclesOffset + (id - 1) * V.SIZE + field;
}

function resourceId(code) {
  return code < RESOURCE_IDS.length ? RESOURCE_IDS[code] : `plaza-${code - RESOURCE_IDS.length + 1}`;
}

function resourceCode(id) {
  const known = RESOURCE_IDS.indexOf(id);
  if (known !== -1) return known;
  const match = /^plaza-([1-9]\d*)$/.exec(id);
  return match ? RESOURCE_IDS.length + Number(match[1]) - 1 : -1;
}

// El llamador DEBE poseer el monitor. Se copian enteros; no DFS ni JSON aquí.
// La plaza insegura puede cambiar durante la copia: ésa es justamente la
// operación sin protección que se expone en modo race, no una transacción normal.
function copyLocked(shared) {
  const { a } = shared;
  return {
    available: Atomics.load(a, H.AVAILABLE),
    locks: Array.from(a.subarray(shared.locksOffset, shared.spacesOffset)),
    spaces: Array.from(a.subarray(shared.spacesOffset, shared.barriersOffset)),
    rows: Array.from({ length: shared.maxVehicles }, (_, n) => {
      const base = vehicleIndex(shared, n + 1);
      return Array.from(a.subarray(base, base + V.SIZE));
    }),
  };
}

// Conversión fuera del monitor. Los recursos físicos y el mutex de la tabla
// son entidades distintas; el permiso no se confunde con una plaza concreta.
function snapshotFromCopy(copy, shared, mode) {
  const resources = RESOURCE_IDS.map((id, code) => ({
    id, label: RESOURCE_LABELS[code], kind: code === R.CAPACITY ? 'semaphore' : 'mutex',
    capacity: code === R.CAPACITY ? shared.capacity : 1,
    owners: code === R.CAPACITY
      ? copy.rows.flatMap((row, n) => row[V.PERMIT] ? [n + 1] : [])
      : copy.locks[code] ? [copy.locks[code]] : [],
    waiting: [],
  }));
  copy.spaces.forEach((owner, n) => resources.push({
    id: `plaza-${n + 1}`, label: `Plaza ${n + 1}`, kind: 'space', capacity: 1,
    owners: owner ? [owner] : [], waiting: [],
  }));
  const vehicles = [];
  copy.rows.forEach((row, n) => {
    if (!row[V.ACTIVE]) return;
    const id = n + 1;
    const waitCode = row[V.WAIT] - 1;
    if (waitCode >= 0 && resources[waitCode]) resources[waitCode].waiting.push(id);
    vehicles.push({
      id, name: `Vehículo ${id}`, threadId: null, state: STATE_LABELS[row[V.STATE]],
      waitingFor: waitCode >= 0 ? resourceId(waitCode) : null,
      heldResources: resources.filter(resource => resource.owners.includes(id)).map(resource => resource.id),
      space: row[V.SPACE] || null, heapUsed: null, sampledAt: null,
    });
  });
  const attempts = copy.rows.flatMap((row, n) => row[V.ATTEMPT] ? [{
    vehicleId: n + 1, observedOwner: row[V.OBSERVED], confirmed: Boolean(row[V.CONFIRMED]),
  }] : []);
  return {
    capacity: shared.capacity, available: copy.available, vehicles, resources,
    spaces: copy.spaces.map((owner, n) => ({ id: n + 1, owner: owner || null })),
    race: mode === 'race' || mode === 'protected'
      ? { attempts, confirmed: attempts.filter(attempt => attempt.confirmed).length, expected: 1 }
      : null,
  };
}

module.exports = {
  H, V, R, S, RESOURCE_IDS, RESOURCE_LABELS, STATE_LABELS, BARRIER_COUNT,
  createShared, attachShared, descriptor, vehicleIndex, resourceId, resourceCode,
  copyLocked, snapshotFromCopy,
};
