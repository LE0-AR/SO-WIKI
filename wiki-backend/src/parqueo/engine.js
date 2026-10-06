'use strict';

const { EventEmitter } = require('node:events');
const { Worker } = require('node:worker_threads');
const path = require('node:path');
const { V, S, createShared, descriptor, vehicleIndex } = require('./shared-state');
const { withMonitorAsync, requestStop } = require('./sync');

const START_TIMEOUT_MS = 10000;
const STOP_GRACE_MS = 3500;
const RECOVERY_TIMEOUT_MS = 6000;
const MODES = new Set(['normal', 'race', 'protected', 'deadlock']);

function positiveInteger(value, name, max) {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new RangeError(`${name} debe ser un entero entre 1 y ${max}`);
  }
}

class ParkingEngine extends EventEmitter {
  constructor({
    id, generation, mode = 'normal', capacity = 6, maxVehicles = 12,
    autoRecover = true, reserveWorker = () => {}, releaseWorker = () => {},
  } = {}) {
    super();
    if (typeof id !== 'string' || !id.length) throw new TypeError('Se requiere id de sesión');
    if (!(typeof generation === 'string' && generation.length > 0)
      && !(Number.isSafeInteger(generation) && generation >= 0)) throw new TypeError('Generación inválida');
    if (!MODES.has(mode)) throw new TypeError('Modo inválido');
    positiveInteger(capacity, 'Capacidad', 256);
    positiveInteger(maxVehicles, 'Máximo de vehículos', 256);
    if (mode !== 'normal' && maxVehicles < 2) throw new RangeError('La demostración requiere dos vehículos');
    if (typeof autoRecover !== 'boolean') throw new TypeError('autoRecover debe ser booleano');
    if (typeof reserveWorker !== 'function' || typeof releaseWorker !== 'function') {
      throw new TypeError('Las cuotas requieren callbacks síncronos');
    }
    this.id = id;
    this.generation = generation;
    this.mode = mode;
    this.capacity = capacity;
    this.maxVehicles = maxVehicles;
    this.autoRecover = autoRecover;
    this._reserveWorker = reserveWorker;
    this._releaseWorker = releaseWorker;
    this._shared = createShared(capacity, maxVehicles);
    this._records = new Map();
    this._spawnedVehicles = new Set();
    this._metrics = new Map();
    // EventEmitter reserva _events para sus listeners; el historial va separado.
    this._eventHistory = [];
    this._eventSequence = 0;
    this._revision = 0;
    this._totalVehicles = 0;
    this._status = 'stopped';
    this._started = false;
    this._closing = false;
    this._closed = false;
    this._failed = false;
    this._core = null;
    this._snapshot = null;
    this._startWork = null;
    this._startPromise = null;
    this._closePromise = null;
    this._commands = Promise.resolve();
    this._waiters = new Set();
    this._requests = new Map();
    this._requestSequence = 0;
    this._recoveryTimer = null;
  }

  get liveWorkers() { return this._records.size; }

  // Antes de start no existe todavía una captura: no inventar observaciones.
  getSnapshot() { return this._snapshot ? structuredClone(this._snapshot) : null; }

  start() {
    if (this._closing || this._closed) return Promise.reject(new Error('La generación está cerrada; reiniciar'));
    if (this._startPromise) return this._startPromise;
    this._status = 'running';
    this._log('start', `Generación ${this.generation}: modo ${this.mode}`);
    this._startWork = this._startImpl();
    this._startPromise = this._startWork.catch(async error => {
      if (!this._closing) this._fail(error.message);
      await this.close();
      throw error;
    });
    return this._startPromise;
  }

  async _startImpl() {
    this._spawn('guardian', null, { autoRecover: this.autoRecover });
    if (this.mode !== 'normal') await this._createVehicles(2, 4000);
    const expected = this.mode === 'normal' ? 0 : 2;
    const snapshot = await this._waitSnapshot(value => value.vehicles.length >= expected
      && value.guardian.threadId !== null && value.status === 'running', START_TIMEOUT_MS);
    this._assertRunning();
    this._started = true;
    return snapshot;
  }

  addVehicles(count = 1, durationMs = 4000) {
    return this._enqueue(async () => {
      this._assertStarted();
      if (this.mode !== 'normal') throw new Error('Sólo el modo normal permite agregar vehículos');
      positiveInteger(count, 'Cantidad', this.maxVehicles);
      if (!Number.isInteger(durationMs) || durationMs < 0 || durationMs > 60000) {
        throw new RangeError('Duración debe ser un entero entre 0 y 60000 ms');
      }
      if (this._totalVehicles + count > this.maxVehicles) {
        throw new Error(`Límite de ${this.maxVehicles} vehículos por generación alcanzado; reiniciar para agregar más`);
      }
      try {
        await this._createVehicles(count, durationMs);
        return await this._waitSnapshot(value => value.vehicles.length === this._totalVehicles, START_TIMEOUT_MS);
      } catch (error) {
        // No dejar media orden en ejecución si una cuota o un constructor falla.
        if (!this._closing) this._fail(error.message);
        throw error;
      }
    });
  }

  recover() {
    return this._enqueue(async () => {
      this._assertStarted();
      const guardian = this._records.get('guardian');
      if (!guardian) throw new Error('El guardián no está disponible');
      const requestId = ++this._requestSequence;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this._requests.delete(requestId);
          reject(new Error('El guardián no respondió a recuperación'));
        }, RECOVERY_TIMEOUT_MS);
        this._requests.set(requestId, { resolve, reject, timer });
        try { guardian.worker.postMessage({ type: 'recover', requestId }); }
        catch (error) {
          clearTimeout(timer);
          this._requests.delete(requestId);
          reject(error);
        }
      });
      return this._waitSnapshot(value => Boolean(value.incident && value.incident.recovered), RECOVERY_TIMEOUT_MS);
    });
  }

  // Idempotente incluso si se invoca desde fault, timeout y desconexión juntos.
  close() {
    if (this._closePromise) return this._closePromise;
    this._closing = true;
    if (!this._failed) this._status = 'stopping';
    requestStop(this._shared);
    this._rejectPending(new Error('Generación detenida; reiniciar para continuar'));
    clearTimeout(this._recoveryTimer);
    this._log('stop', 'Cancelación solicitada; esperando salida de los hilos');
    // Asignar la promesa antes de emitir evita reentrancia desde los listeners.
    this._closePromise = Promise.resolve().then(() => this._closeImpl());
    this._publish();
    return this._closePromise;
  }

  async _closeImpl() {
    if (this._startWork) await this._startWork.catch(() => {});
    await this._commands.catch(() => {});
    await this._drain([...this._records.values()].filter(record => record.kind === 'vehicle'));
    if (!this._failed) {
      // close puede intercalarse entre registrar una orden y crear sus hilos.
      // Esas filas nunca tuvieron propietario ni recursos que devolver.
      try {
        await withMonitorAsync(this._shared, () => {
          for (let id = 1; id <= this._totalVehicles; id++) {
            if (!this._spawnedVehicles.has(id)) {
              const base = vehicleIndex(this._shared, id);
              this._shared.a[base + V.STATE] = S.CANCELLED;
              this._shared.a[base + V.DONE] = 1;
            }
          }
        }, { ignoreCancel: true });
      } catch (error) { this._fail(error.message); }
    }
    const guardian = this._records.get('guardian');
    if (guardian) {
      try { guardian.worker.postMessage({ type: 'finish' }); }
      catch (error) { this._fail(`No se pudo cerrar el guardián: ${error.message}`); }
      await this._drain([guardian]);
    }
    this._closed = true;
    this._status = this._failed ? 'failed' : 'stopped';
    this._log('closed', this._failed
      ? 'Generación descartada; todos sus hilos han salido'
      : 'Parqueo detenido; todos sus hilos han salido');
    this._publish();
    return this.getSnapshot();
  }

  async _drain(records) {
    if (!records.length) return;
    let timer;
    const completed = await Promise.race([
      Promise.all(records.map(record => record.exited)).then(() => true),
      new Promise(resolve => { timer = setTimeout(() => resolve(false), STOP_GRACE_MS); }),
    ]);
    clearTimeout(timer);
    if (completed) return;
    // Nunca reparar este SAB: terminate puede interrumpir una sección crítica.
    // Se espera exit y se descarta TODA la generación, no sólo la víctima.
    this._fail('Un hilo no cooperó con la cancelación; terminación y descarte de la generación');
    await Promise.all(records.filter(record => !record.hasExited).map(async record => {
      record.forced = true;
      try { await record.worker.terminate(); }
      catch (error) { this._log('termination', `Error al terminar hilo: ${error.message}`); }
      await record.exited;
    }));
  }

  _assertRunning() {
    if (this._closing || this._closed || this._status !== 'running') {
      throw new Error('La generación no está en ejecución; reiniciar');
    }
  }

  _assertStarted() {
    this._assertRunning();
    if (!this._started) throw new Error('Esperar start() antes de enviar órdenes');
  }

  _enqueue(operation) {
    const result = this._commands.then(operation);
    this._commands = result.catch(() => {});
    return result;
  }

  async _createVehicles(count, durationMs) {
    this._assertRunning();
    const first = this._totalVehicles + 1;
    await withMonitorAsync(this._shared, () => {
      for (let id = first; id < first + count; id++) {
        const base = vehicleIndex(this._shared, id);
        this._shared.a[base + V.ACTIVE] = 1;
        this._shared.a[base + V.STATE] = S.STARTING;
      }
    });
    this._totalVehicles += count;
    this._assertRunning();
    for (let id = first; id < first + count; id++) {
      this._spawn('vehicle', id, { durationMs });
      this._log('vehicle', `Vehículo ${id}: hilo creado`);
    }
    const guardian = this._records.get('guardian');
    if (guardian) guardian.worker.postMessage({ type: 'capture' });
  }

  _spawn(kind, id, extra) {
    this._assertRunning();
    // reserveWorker debe lanzar síncronamente si no hay cuota. En ese caso no
    // hubo reserva y NO se devuelve. Cada reserva válida tiene una devolución.
    this._reserveWorker();
    let worker;
    try {
      worker = new Worker(path.join(__dirname, `${kind}.worker.js`), {
        workerData: { shared: descriptor(this._shared), mode: this.mode, id, ...extra },
      });
    } catch (error) {
      this._releaseWorker(); // Fallo síncrono de constructor: no habrá evento exit.
      throw error;
    }
    const key = kind === 'guardian' ? 'guardian' : id;
    const record = { kind, id, worker, done: false, forced: false, hasExited: false, threadId: worker.threadId };
    record.exited = new Promise(resolve => { record.resolveExit = resolve; });
    this._records.set(key, record);
    if (kind === 'vehicle') this._spawnedVehicles.add(id);
    worker.on('message', message => this._onMessage(record, message));
    worker.on('error', error => this._fail(`${kind === 'guardian' ? 'Guardián' : `Vehículo ${id}`}: ${error.message}`));
    worker.on('exit', code => {
      if (record.hasExited) return;
      record.hasExited = true;
      this._records.delete(key);
      try { this._releaseWorker(); }
      catch (error) { this._fail(`Error al devolver cuota: ${error.message}`); }
      // Ni un código cero basta: el protocolo done confirma finally completo.
      if ((!record.done || code !== 0 || (kind === 'guardian' && !this._closing)) && !record.forced) {
        this._fail(`Salida inesperada de ${kind === 'guardian' ? 'guardián' : `vehículo ${id}`} (código ${code}); descartar generación`);
      }
      this._log('exit', `${kind === 'guardian' ? 'Guardián' : `Vehículo ${id}`}: hilo finalizado`);
      record.resolveExit();
    });
    return record;
  }

  _onMessage(record, message) {
    if (this._closed || record.hasExited || !message || typeof message.type !== 'string') return;
    if (message.type === 'done') { record.done = true; return; }
    if (message.type === 'fatal') { this._fail(message.message); return; }
    if (message.type === 'metrics' && record.kind === 'vehicle') {
      this._metrics.set(record.id, {
        heapUsed: message.heapUsed, sampledAt: message.sampledAt,
      });
    } else if (message.type === 'event') {
      this._log(message.eventType, message.message);
    } else if (message.type === 'snapshot' && record.kind === 'guardian') {
      this._core = message.snapshot;
      this._publish();
    } else if (message.type === 'incident') {
      this._log('deadlock', `Interbloqueo confirmado; víctima determinista: vehículo ${message.victim}`);
    } else if (message.type === 'recovery-started') {
      this._log('recovery', `Cancelando vehículo ${message.victim}; su finally devolverá los recursos`);
      clearTimeout(this._recoveryTimer);
      if (!this._closing) this._recoveryTimer = setTimeout(() => {
        this._fail('La recuperación no progresó dentro del plazo; descartar generación');
      }, RECOVERY_TIMEOUT_MS);
    } else if (message.type === 'recovered') {
      clearTimeout(this._recoveryTimer);
      this._log('recovered', `Víctima ${message.victim} liberó recursos y el superviviente avanzó`);
    } else if (message.type === 'reply') {
      const request = this._requests.get(message.requestId);
      if (request) {
        this._requests.delete(message.requestId);
        clearTimeout(request.timer);
        if (message.ok) request.resolve();
        else request.reject(new Error(message.message));
      }
    }
  }

  _log(type, message) {
    this._eventHistory.push({
      id: `${this.id}:${this.generation}:${++this._eventSequence}`,
      time: new Date().toISOString(), type, message,
    });
    if (this._eventHistory.length > 200) this._eventHistory.splice(0, this._eventHistory.length - 200);
  }

  _publish() {
    if (!this._core) return;
    const core = structuredClone(this._core);
    const guardian = this._records.get('guardian');
    this._snapshot = {
      sessionId: this.id, generation: this.generation, revision: ++this._revision,
      mode: this.mode, status: this._status, capturedAt: core.capturedAt,
      pid: process.pid, platform: process.platform,
      capacity: core.capacity, available: core.available,
      vehicles: core.vehicles.map(vehicle => ({
        ...vehicle, threadId: this._records.get(vehicle.id)?.threadId ?? null,
        ...(this._metrics.get(vehicle.id) || {}),
      })),
      resources: core.resources, spaces: core.spaces, graph: core.graph,
      incident: core.incident, race: core.race, events: structuredClone(this._eventHistory),
      memory: { rss: process.memoryUsage().rss, sampledAt: new Date().toISOString() },
      guardian: { threadId: guardian ? guardian.threadId : null },
    };
    for (const waiter of [...this._waiters]) {
      if (waiter.predicate(this._snapshot)) {
        this._waiters.delete(waiter);
        clearTimeout(waiter.timer);
        waiter.resolve(this.getSnapshot());
      }
    }
    this.emit('snapshot', this.getSnapshot());
  }

  _waitSnapshot(predicate, timeout) {
    if (this._closing) return Promise.reject(new Error('Generación detenida'));
    if (this._snapshot && predicate(this._snapshot)) return Promise.resolve(this.getSnapshot());
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, reject };
      waiter.timer = setTimeout(() => {
        this._waiters.delete(waiter);
        reject(new Error('Tiempo agotado esperando una instantánea del guardián'));
      }, timeout);
      this._waiters.add(waiter);
    });
  }

  _rejectPending(error) {
    for (const waiter of this._waiters) { clearTimeout(waiter.timer); waiter.reject(error); }
    this._waiters.clear();
    for (const request of this._requests.values()) { clearTimeout(request.timer); request.reject(error); }
    this._requests.clear();
  }

  _fail(message) {
    if (this._failed) return;
    this._failed = true;
    this._status = 'failed';
    this._log('fault', message);
    requestStop(this._shared);
    this._rejectPending(new Error(message));
    this.emit('fault', { message }); // Nunca emitir 'error' sin listener.
    void this.close();
  }
}

module.exports = { ParkingEngine };
