'use strict';

const { randomUUID } = require('node:crypto');
const { ParkingEngine } = require('./engine');

const MODES = new Set(['normal', 'race', 'protected', 'deadlock']);
const ACTIONS = new Set(['start', 'reset', 'add', 'recover', 'stop']);

function integer(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} debe ser un entero entre ${min} y ${max}.`);
  }
  return value;
}

function configuration(payload) {
  const mode = payload.mode ?? 'normal';
  if (!MODES.has(mode)) throw new Error('Modo de ejecución no válido.');
  if (payload.autoRecover !== undefined && typeof payload.autoRecover !== 'boolean') {
    throw new Error('La recuperación automática debe ser verdadera o falsa.');
  }
  return {
    mode,
    capacity: integer(payload.capacity ?? 6, 2, 12, 'La capacidad'),
    autoRecover: payload.autoRecover ?? true,
  };
}

/** Una sesión por conexión. Las cuotas incluyen hilos iniciándose o cerrándose. */
class SessionManager {
  constructor({ maxSessions = 4, maxWorkers = 32, maxVehicles = 12,
    maxConnections = 64, sessionTtlMs = 15 * 60 * 1000, Engine = ParkingEngine } = {}) {
    this.limits = { maxSessions, maxWorkers, maxVehicles, maxConnections, sessionTtlMs };
    this.Engine = Engine;
    this.entries = new Map();
    this.activeSessions = 0;
    this.liveWorkers = 0;
    this.closing = false;
    this.closePromise = null;
  }

  register(socket) {
    if (this.closing || this.entries.size >= this.limits.maxConnections) {
      socket.emit('parqueo:fault', { message: 'El laboratorio alcanzó su límite de conexiones.' });
      socket.disconnect(true);
      return false;
    }
    this.entries.set(socket.id, {
      socket, engine: null, active: false, disconnected: false,
      queue: Promise.resolve(), requests: new Map(), pendingCommands: 0, timer: null,
      rateStart: Date.now(), rateCount: 0,
    });
    return true;
  }

  reserveWorker = () => {
    if (this.closing || this.liveWorkers >= this.limits.maxWorkers) {
      throw new Error('Se alcanzó el límite global de hilos. Detén otra ejecución o inténtalo después.');
    }
    this.liveWorkers += 1;
  };

  releaseWorker = () => {
    if (this.liveWorkers > 0) this.liveWorkers -= 1;
  };

  enqueue(entry, operation) {
    const task = entry.queue.then(operation);
    // Un comando fallido no impide detener o reiniciar posteriormente.
    entry.queue = task.catch(() => {});
    return task;
  }

  command(socket, command) {
    const entry = this.entries.get(socket.id);
    if (!entry || entry.disconnected || this.closing) {
      return Promise.resolve({ ok: false, error: 'La conexión no está disponible.' });
    }
    if (!command || typeof command !== 'object' || Array.isArray(command)
        || typeof command.id !== 'string' || command.id.length < 1 || command.id.length > 100
        || !ACTIONS.has(command.action)
        || (command.payload !== undefined && (!command.payload || typeof command.payload !== 'object' || Array.isArray(command.payload)))) {
      return Promise.resolve({ ok: false, error: 'Formato de comando no válido.' });
    }
    if (entry.requests.has(command.id)) return entry.requests.get(command.id);
    if (Date.now() - entry.rateStart >= 1000) {
      entry.rateStart = Date.now();
      entry.rateCount = 0;
    }
    if (++entry.rateCount > 12) {
      return Promise.resolve({ ok: false, error: 'Demasiados comandos. Espera un momento.' });
    }
    if (entry.pendingCommands >= 8) {
      return Promise.resolve({ ok: false, error: 'La cola de comandos está llena. Espera las confirmaciones pendientes.' });
    }
    entry.pendingCommands += 1;
    const task = this.enqueue(entry, () => this.execute(entry, command))
      .catch(error => ({ ok: false, error: error.message || 'No se pudo completar la operación.' }))
      .finally(() => { entry.pendingCommands -= 1; });
    entry.requests.set(command.id, task);
    // La deduplicación es acotada; la generación también protege órdenes antiguas.
    if (entry.requests.size > 128) entry.requests.delete(entry.requests.keys().next().value);
    return task;
  }

  async execute(entry, { action, generation, payload = {} }) {
    if (entry.disconnected || this.closing) throw new Error('La conexión se cerró.');
    const previous = entry.engine;
    if (action !== 'start' && previous && generation !== previous.generation) {
      throw new Error('La ejecución cambió. Utiliza el estado más reciente.');
    }
    if (!previous && action !== 'start' && action !== 'reset') {
      throw new Error('Primero inicia una ejecución.');
    }
    if (!previous && generation != null) throw new Error('La sesión anterior ya no está disponible.');
    if (action === 'start' && generation != null) throw new Error('Iniciar requiere una sesión nueva, sin generación anterior.');

    if (action === 'start' || action === 'reset') {
      const options = configuration(payload); // Validar antes de detener una ejecución válida.
      if (action === 'start' && entry.active) throw new Error('Ya hay una ejecución activa. Usa Reiniciar.');
      if (!entry.active && this.activeSessions >= this.limits.maxSessions) {
        throw new Error('Se alcanzó el límite de sesiones activas.');
      }
      await this.closeEngine(entry);
      if (entry.disconnected || this.closing) throw new Error('La conexión se cerró.');
      // Volver a comprobar: otra conexión pudo ocupar la cuota durante el cierre.
      if (this.activeSessions >= this.limits.maxSessions) throw new Error('Se alcanzó el límite de sesiones activas.');
      const engine = new this.Engine({
        ...options, id: randomUUID(), generation: randomUUID(),
        maxVehicles: this.limits.maxVehicles,
        reserveWorker: this.reserveWorker, releaseWorker: this.releaseWorker,
      });
      entry.engine = engine;
      entry.active = true;
      this.activeSessions += 1;
      engine.on('snapshot', state => {
        if (!entry.disconnected && entry.engine === engine) entry.socket.emit('parqueo:state', state);
      });
      engine.on('fault', fault => {
        if (!entry.disconnected && entry.engine === engine) entry.socket.emit('parqueo:fault', fault);
        // Liberar también la cuota de sesión después de un fallo fatal.
        void this.enqueue(entry, async () => {
          if (entry.engine === engine) await this.closeEngine(entry);
        }).catch(() => {});
      });
      try {
        await engine.start();
        if (entry.disconnected || this.closing) {
          await this.closeEngine(entry);
          throw new Error('La conexión se cerró durante el inicio.');
        }
      } catch (error) {
        await this.closeEngine(entry);
        throw error;
      }
      entry.timer = setTimeout(() => {
        void this.enqueue(entry, async () => {
          if (entry.engine !== engine || !entry.active) return;
          entry.socket.emit('parqueo:fault', { message: 'La ejecución alcanzó su duración máxima y se cerró. Puedes iniciar otra.' });
          await this.closeEngine(entry);
        }).catch(() => {});
      }, this.limits.sessionTtlMs);
      entry.timer.unref?.();
      return { ok: true, generation: engine.generation, state: engine.getSnapshot() };
    }

    if (action === 'stop') {
      await this.closeEngine(entry);
    } else {
      if (!entry.active || previous.getSnapshot()?.status !== 'running') throw new Error('La ejecución no está activa. Reiníciala.');
      if (action === 'add') {
        const count = integer(payload.count ?? 1, 1, this.limits.maxVehicles, 'La cantidad de vehículos');
        const durationMs = integer(payload.durationMs ?? 4000, 500, 30000, 'La estancia en milisegundos');
        await previous.addVehicles(count, durationMs);
      } else if (action === 'recover') {
        await previous.recover();
      }
    }
    return { ok: true, generation: previous.generation, state: previous.getSnapshot() };
  }

  async closeEngine(entry) {
    clearTimeout(entry.timer);
    entry.timer = null;
    if (!entry.engine) return;
    // No liberar una cuota hasta que todos los workers hayan salido.
    await entry.engine.close();
    if (entry.active) {
      entry.active = false;
      this.activeSessions -= 1;
    }
  }

  disconnect(socket) {
    const entry = this.entries.get(socket.id);
    if (!entry) return Promise.resolve();
    entry.disconnected = true;
    return this.enqueue(entry, () => this.closeEngine(entry))
      .finally(() => this.entries.delete(socket.id));
  }

  close() {
    if (this.closePromise) return this.closePromise;
    this.closing = true;
    this.closePromise = Promise.allSettled([...this.entries.values()].map(entry => {
      entry.disconnected = true;
      return this.enqueue(entry, () => this.closeEngine(entry));
    })).then(results => {
      this.entries.clear();
      const failure = results.find(result => result.status === 'rejected');
      if (failure) throw failure.reason;
    });
    return this.closePromise;
  }
}

module.exports = { SessionManager, configuration };
