'use strict';

const { Server } = require('socket.io');
const { SessionManager } = require('./session-manager');

const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:4173', 'http://127.0.0.1:4173'];

function parseOrigins(value) {
  const origins = value ? value.split(',').map(item => item.trim()).filter(Boolean) : DEFAULT_ORIGINS;
  for (const origin of origins) {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error('PARQUEO_ORIGINS debe contener orígenes HTTP/HTTPS exactos, sin rutas ni comodines.');
    }
  }
  return origins;
}

/** El servidor integrado y el autónomo utilizan el mismo motor y transporte. */
function attachParqueo({ app, server, options = {} }) {
  const origins = options.origins ?? parseOrigins(process.env.PARQUEO_ORIGINS);
  const manager = new SessionManager(options.limits);
  const allowed = new Set(origins);
  const io = new Server(server, {
    maxHttpBufferSize: 8192,
    connectTimeout: 10000,
    cors: { origin: origins, methods: ['GET', 'POST'] },
    // CORS por sí solo no protege el handshake WebSocket. No aceptar Origin ausente.
    allowRequest: (req, callback) => callback(null, allowed.has(req.headers.origin)),
  });

  app.get('/api/parqueo/health', (_req, res) => {
    res.json({ status: 'OK', module: 'parqueo', pid: process.pid,
      platform: process.platform, activeSessions: manager.activeSessions,
      liveWorkers: manager.liveWorkers });
  });
  app.get('/api/parqueo/capabilities', (_req, res) => {
    res.json({ modes: ['normal', 'race', 'protected', 'deadlock'], limits: manager.limits,
      realWorkers: true, linuxEvidenceRequired: true, persistence: false });
  });

  io.on('connection', socket => {
    if (!manager.register(socket)) return;
    socket.on('parqueo:command', (command, acknowledge) => {
      if (typeof acknowledge !== 'function') return;
      void manager.command(socket, command).then(acknowledge).catch(() => {
        acknowledge({ ok: false, error: 'No se pudo completar el comando.' });
      });
    });
    socket.on('disconnect', () => {
      void manager.disconnect(socket).catch(error => {
        console.error('No se pudo cerrar una sesión de parqueo:', error.message);
      });
    });
  });

  let closing;
  function close() {
    if (!closing) {
      closing = manager.close().finally(() => new Promise(resolve => io.close(resolve)));
    }
    return closing;
  }
  return { io, manager, close };
}

module.exports = { attachParqueo, parseOrigins };
