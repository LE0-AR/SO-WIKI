'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { randomUUID } = require('node:crypto');
const { SessionManager } = require('../../src/parqueo/session-manager');

// Aquí se prueba solo el contrato de sesiones; engine.test.js usa hilos reales.
class TestEngine extends EventEmitter {
  constructor(options) {
    super();
    Object.assign(this, options);
    this.status = 'running';
    this.reserved = false;
    this.closed = false;
  }
  async start() { this.reserveWorker(); this.reserved = true; }
  async close() {
    if (this.reserved) { this.releaseWorker(); this.reserved = false; }
    this.closed = true;
    this.status = 'stopped';
  }
  getSnapshot() { return { generation: this.generation, status: this.status }; }
  async addVehicles() {}
  async recover() {}
}

function socket() {
  return { id: randomUUID(), events: [],
    emit(type, value) { this.events.push({ type, value }); }, disconnect() {} };
}
function request(action, generation = null, payload = {}, id = randomUUID()) {
  return { id, action, generation, payload };
}

test('validar antes del reset conserva la ejecución cuando la configuración es inválida', async t => {
  const manager = new SessionManager({ Engine: TestEngine });
  t.after(() => manager.close());
  const client = socket();
  manager.register(client);
  const started = await manager.command(client, request('start'));
  const previous = manager.entries.get(client.id).engine;
  const invalid = await manager.command(client, request('reset', started.generation, { capacity: 50 }));
  assert.equal(invalid.ok, false);
  assert.equal(previous.closed, false);
  assert.equal(manager.activeSessions, 1);
});

test('desconexión durante el arranque espera limpieza y no pierde las cuotas', async () => {
  let entered;
  const starting = new Promise(resolve => { entered = resolve; });
  let resume;
  const gate = new Promise(resolve => { resume = resolve; });
  class SlowEngine extends TestEngine {
    async start() { await super.start(); entered(); await gate; }
  }
  const manager = new SessionManager({ Engine: SlowEngine });
  const client = socket();
  manager.register(client);
  const start = manager.command(client, request('start'));
  await starting;
  const disconnected = manager.disconnect(client);
  resume();
  assert.equal((await start).ok, false);
  await disconnected;
  assert.equal(manager.entries.size, 0);
  assert.equal(manager.activeSessions, 0);
  assert.equal(manager.liveWorkers, 0);
  await manager.close();
});

test('un fallo de arranque no consume cuota de sesión ni worker', async t => {
  class FailingEngine extends TestEngine {
    async start() { await super.start(); throw new Error('Fallo de prueba'); }
  }
  const manager = new SessionManager({ Engine: FailingEngine });
  t.after(() => manager.close());
  const client = socket();
  manager.register(client);
  const result = await manager.command(client, request('start'));
  assert.equal(result.ok, false);
  assert.equal(manager.activeSessions, 0);
  assert.equal(manager.liveWorkers, 0);
});

test('vencimiento de sesión cierra el motor y permite iniciar otro', async t => {
  const manager = new SessionManager({ Engine: TestEngine, sessionTtlMs: 20 });
  t.after(() => manager.close());
  const client = socket();
  manager.register(client);
  await manager.command(client, request('start'));
  const deadline = Date.now() + 2000;
  while (manager.activeSessions !== 0 && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(manager.activeSessions, 0);
  assert.equal(manager.liveWorkers, 0);
  assert.equal((await manager.command(client, request('start'))).ok, true);
});

test('la cola pendiente está acotada incluso cuando un inicio tarda', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  class WaitingEngine extends TestEngine {
    async start() { await super.start(); await gate; }
  }
  const manager = new SessionManager({ Engine: WaitingEngine });
  const client = socket();
  manager.register(client);
  const commands = Array.from({ length: 8 }, () => manager.command(client, request('start')));
  const overflow = await manager.command(client, request('start'));
  assert.equal(overflow.ok, false);
  assert.match(overflow.error, /cola de comandos/);
  release();
  await Promise.all(commands);
  await manager.close();
  assert.equal(manager.liveWorkers, 0);
});

test('stop y cierre general repetidos son idempotentes', async () => {
  const manager = new SessionManager({ Engine: TestEngine });
  const client = socket();
  manager.register(client);
  const started = await manager.command(client, request('start'));
  await manager.command(client, request('stop', started.generation));
  await manager.command(client, request('stop', started.generation));
  await Promise.all([manager.close(), manager.close()]);
  assert.equal(manager.activeSessions, 0);
  assert.equal(manager.liveWorkers, 0);
});
