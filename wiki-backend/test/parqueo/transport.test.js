'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const express = require('express');
const { io: connect } = require('socket.io-client');
const { attachParqueo, parseOrigins } = require('../../src/parqueo/attach');
const { configuration } = require('../../src/parqueo/session-manager');

const ORIGIN = 'http://localhost:5173';

async function fixture(t, limits = {}) {
  const app = express();
  const server = http.createServer(app);
  const runtime = attachParqueo({ app, server, options: { origins: [ORIGIN], limits } });
  const clients = [];
  t.after(async () => {
    clients.forEach(client => client.disconnect());
    await runtime.close();
    assert.equal(runtime.manager.liveWorkers, 0, 'el cierre devuelve las cuotas de workers');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  const client = async (origin = ORIGIN) => {
    const socket = connect(url, {
      transports: ['websocket'], reconnection: false, timeout: 5000,
      extraHeaders: { Origin: origin }, autoConnect: false,
    });
    clients.push(socket);
    const connected = new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    socket.connect();
    await connected;
    return socket;
  };
  return { ...runtime, url, client };
}

function command(socket, action, payload = {}, generation = null, id = randomUUID()) {
  return new Promise((resolve, reject) => {
    socket.timeout(12000).emit('parqueo:command', { id, action, payload, generation }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

async function waitFor(predicate, timeout = 7000) {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('No se observó la condición dentro del plazo.');
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

test('configuración y orígenes rechazan parámetros inválidos', () => {
  assert.throws(() => configuration({ capacity: 1 }), /capacidad/);
  assert.throws(() => configuration({ mode: 'inventado' }), /Modo/);
  assert.throws(() => configuration({ autoRecover: 'sí' }), /automática/);
  assert.throws(() => parseOrigins('*'));
  assert.throws(() => parseOrigins('https://example.test/ruta'));
  assert.deepEqual(parseOrigins(ORIGIN), [ORIGIN]);
});

test('servidor autónomo de módulo: salud, sesión explícita y cierre', { timeout: 25000 }, async t => {
  const runtime = await fixture(t);
  const response = await fetch(`${runtime.url}/api/parqueo/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).liveWorkers, 0);
  const socket = await runtime.client();
  assert.equal(runtime.manager.liveWorkers, 0, 'conectar no crea una sesión');
  const result = await command(socket, 'start', { mode: 'normal', capacity: 2 });
  assert.equal(result.ok, true, result.error);
  assert.equal(result.state.pid, process.pid);
  assert.equal(result.state.status, 'running');
  const added = await command(socket, 'add', { count: 3, durationMs: 500 }, result.generation);
  assert.equal(added.ok, true, added.error);
  const stopped = await command(socket, 'stop', {}, result.generation);
  assert.equal(stopped.ok, true, stopped.error);
  assert.equal(runtime.manager.liveWorkers, 0);
  assert.equal(runtime.manager.activeSessions, 0);
});

test('solicitudes duplicadas no arrancan dos ejecuciones y generaciones antiguas se rechazan', { timeout: 25000 }, async t => {
  const runtime = await fixture(t);
  const socket = await runtime.client();
  const id = randomUUID();
  const [first, duplicate] = await Promise.all([
    command(socket, 'start', { mode: 'normal', capacity: 2 }, null, id),
    command(socket, 'start', { mode: 'normal', capacity: 2 }, null, id),
  ]);
  assert.equal(first.ok, true, first.error);
  assert.equal(first.generation, duplicate.generation);
  assert.equal(runtime.manager.activeSessions, 1);
  const reset = await command(socket, 'reset', { mode: 'normal', capacity: 3 }, first.generation);
  assert.equal(reset.ok, true, reset.error);
  assert.notEqual(first.generation, reset.generation);
  const stale = await command(socket, 'add', { count: 1, durationMs: 500 }, first.generation);
  assert.equal(stale.ok, false);
  assert.match(stale.error, /ejecución cambió/);
});

test('clientes aislados, límite de sesiones y limpieza al desconectar', { timeout: 25000 }, async t => {
  const runtime = await fixture(t, { maxSessions: 1 });
  const first = await runtime.client();
  const second = await runtime.client();
  const foreignStates = [];
  second.on('parqueo:state', state => foreignStates.push(state));
  const started = await command(first, 'start', { mode: 'normal', capacity: 2 });
  assert.equal(started.ok, true, started.error);
  const blocked = await command(second, 'start', { mode: 'normal', capacity: 2 });
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /límite de sesiones/);
  assert.equal(foreignStates.length, 0);
  first.disconnect();
  await waitFor(() => runtime.manager.activeSessions === 0 && runtime.manager.liveWorkers === 0);
  const allowed = await command(second, 'start', { mode: 'normal', capacity: 2 });
  assert.equal(allowed.ok, true, allowed.error);
});

test('rechaza origen WebSocket no autorizado', { timeout: 10000 }, async t => {
  const runtime = await fixture(t);
  await assert.rejects(runtime.client('https://unauthorized.invalid'));
  assert.equal(runtime.manager.liveWorkers, 0);
});

test('el límite global incluye el guardián y no se excede al agregar vehículos', { timeout: 20000 }, async t => {
  const runtime = await fixture(t, { maxWorkers: 1 });
  const socket = await runtime.client();
  const start = await command(socket, 'start', { mode: 'normal', capacity: 2 });
  assert.equal(start.ok, true, start.error);
  const added = await command(socket, 'add', { count: 1, durationMs: 500 }, start.generation);
  assert.equal(added.ok, false);
  assert.ok(runtime.manager.liveWorkers <= 1);
});
