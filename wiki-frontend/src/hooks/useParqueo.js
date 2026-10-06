import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const COMMAND_TIMEOUT_MS = 15_000;
export const PARQUEO_MODES = ['normal', 'race', 'protected', 'deadlock'];
const SESSION_ACTIONS = ['start', 'reset'];
const TERMINAL_STATUSES = ['stopped', 'failed'];
const validGeneration = (value) => (typeof value === 'string' && value.length > 0)
  || (typeof value === 'number' && Number.isFinite(value));
const integerBetween = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

// La variable configura el origen HTTP, nunca un namespace Socket.IO.
export function parqueoOrigin(value = import.meta.env.VITE_PARQUEO_API_URL) {
  if (!value?.trim()) return '';
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('VITE_PARQUEO_API_URL debe usar HTTP o HTTPS.');
  return url.origin;
}

function isSnapshot(value) {
  return value && typeof value.sessionId === 'string' && value.sessionId.length > 0
    && validGeneration(value.generation) && Number.isInteger(value.revision) && value.revision >= 0
    && PARQUEO_MODES.includes(value.mode)
    && ['running', 'stopping', 'stopped', 'failed'].includes(value.status)
    && Array.isArray(value.vehicles) && Array.isArray(value.resources)
    && Array.isArray(value.spaces) && Array.isArray(value.events)
    && Array.isArray(value.graph?.nodes) && Array.isArray(value.graph?.edges)
    && Array.isArray(value.graph?.cycle);
}

function validatePayload(action, payload) {
  if (SESSION_ACTIONS.includes(action)) {
    if (!PARQUEO_MODES.includes(payload.mode)) return 'Selecciona un modo válido.';
    if (!integerBetween(payload.capacity, 2, 12)) return 'La capacidad debe ser un entero entre 2 y 12.';
    if (typeof payload.autoRecover !== 'boolean') return 'Indica si la recuperación será automática.';
  } else if (action === 'add') {
    if (!integerBetween(payload.count, 1, 12)) return 'La cantidad debe ser un entero entre 1 y 12.';
    if (!integerBetween(payload.durationMs, 500, 30_000)) return 'La duración debe ser un entero entre 500 y 30000 ms.';
  } else if (!['recover', 'stop'].includes(action)) {
    return 'Comando no reconocido.';
  }
  return null;
}

const initialView = {
  connection: 'connecting', snapshot: null, generation: null, pending: null,
  error: null, stale: false, uncertain: false,
};

export function useParqueo(apiUrl = import.meta.env.VITE_PARQUEO_API_URL) {
  const [view, setView] = useState(initialView);
  const runtimeRef = useRef(null);

  useEffect(() => {
    const runtime = {
      live: true, connected: false, socket: null, generation: null, sessionId: null,
      snapshot: null, revision: -1, pending: null, retired: new Set(), uncertain: false,
    };
    runtimeRef.current = runtime;
    const update = (patch) => {
      if (runtime.live) setView((previous) => ({ ...previous, ...patch }));
    };
    // También conserva como antiguas las lecturas al cambiar de origen.
    setView((previous) => ({ ...initialView, snapshot: previous.snapshot, stale: Boolean(previous.snapshot) }));
    let socket;
    try {
      socket = io(parqueoOrigin(apiUrl) || undefined, {
        path: '/socket.io', transports: ['websocket'], autoConnect: false, reconnection: true, retries: 0,
      });
      runtime.socket = socket;
    } catch (error) {
      update({ connection: 'disconnected', error: error.message });
      return () => { runtime.live = false; runtimeRef.current = null; };
    }

    const finish = (request, result) => {
      if (runtime.pending !== request) return;
      clearTimeout(request.timer);
      runtime.pending = null;
      update({ pending: null });
      request.resolve(result);
    };
    const invalidateIdentity = () => {
      runtime.generation = null;
      runtime.sessionId = null;
      runtime.revision = -1;
      runtime.snapshot = null;
      runtime.retired.clear();
      runtime.uncertain = false;
    };
    const acceptSnapshot = (snapshot) => {
      if (!isSnapshot(snapshot) || snapshot.generation !== runtime.generation
        || (runtime.sessionId !== null && snapshot.sessionId !== runtime.sessionId)
        || snapshot.revision < runtime.revision) return;
      runtime.sessionId = snapshot.sessionId;
      runtime.revision = snapshot.revision;
      runtime.snapshot = snapshot;
      update({ snapshot, stale: false });
    };
    const onState = (snapshot) => {
      if (!runtime.live || !runtime.connected || runtime.uncertain || !isSnapshot(snapshot)) return;
      if (runtime.retired.has(snapshot.generation)) return;
      const request = runtime.pending;
      // Un reset puede emitir antes del ack. No adoptamos otra identidad sin confirmación.
      if (request && SESSION_ACTIONS.includes(request.action)
        && snapshot.generation !== request.previousGeneration) {
        const candidate = request.candidate;
        if (!candidate || candidate.generation !== snapshot.generation || snapshot.revision > candidate.revision) {
          request.candidate = snapshot;
        }
        return;
      }
      if (runtime.generation !== null) acceptSnapshot(snapshot);
    };
    const onConnect = () => {
      if (!runtime.live) return;
      invalidateIdentity();
      runtime.connected = true;
      setView((previous) => ({ ...previous, connection: 'connected', generation: null,
        pending: null, stale: Boolean(previous.snapshot), uncertain: false, error: null }));
      // Sin start automático, sin replay y sin suscripción a una sesión anterior.
    };
    const onDisconnect = () => {
      if (!runtime.live) return;
      runtime.connected = false;
      if (runtime.pending) finish(runtime.pending, { ok: false, error: 'Conexión perdida; no se reenvió el comando.' });
      invalidateIdentity();
      setView((previous) => ({ ...previous, connection: 'disconnected', generation: null,
        pending: null, stale: Boolean(previous.snapshot), uncertain: false,
        error: 'Se perdió la conexión. El servidor finaliza la sesión; reconectar no la reanuda.' }));
    };
    const onConnectError = (error) => {
      if (!runtime.live) return;
      update({ connection: 'disconnected', error: error?.message || 'No fue posible conectar con el motor.' });
    };
    const onFault = (fault) => {
      if (!runtime.live || !runtime.connected) return;
      update({ error: typeof fault?.message === 'string' ? fault.message : 'El motor informó un fallo.' });
    };

    runtime.command = (action, payload = {}) => {
      const reject = (error) => {
        update({ error });
        return Promise.resolve({ ok: false, error });
      };
      if (!runtime.connected || !socket.connected) return reject('Sin conexión: el comando no fue enviado.');
      if (runtime.pending) return reject('Hay un comando pendiente; espera su confirmación.');
      if (runtime.uncertain) return reject('Resultado anterior desconocido. Reconecta para cerrar la sesión antes de continuar.');
      const validation = validatePayload(action, payload);
      if (validation) return reject(validation);
      if (!SESSION_ACTIONS.includes(action) && runtime.generation === null) return reject('Primero inicia una sesión.');
      if (action === 'start' && runtime.generation !== null
        && !TERMINAL_STATUSES.includes(runtime.snapshot?.status)) {
        return reject('Hay una sesión activa. Usa reiniciar para cerrarla y crear otra.');
      }
      let id;
      try {
        id = globalThis.crypto.randomUUID();
      } catch {
        return reject('El navegador requiere un contexto seguro con crypto.randomUUID para enviar comandos.');
      }
      const previousGeneration = runtime.generation;
      const generation = action === 'start' ? null : previousGeneration;
      return new Promise((resolve) => {
        const request = { id, action, previousGeneration, resolve, candidate: null, timer: null };
        runtime.pending = request; // Bloquea dobles clics antes del siguiente render.
        update({ pending: { id, action }, error: null });
        const unknownOutcome = (message) => {
          runtime.uncertain = true;
          update({ error: message, uncertain: true, stale: true });
          finish(request, { ok: false, error: message });
        };
        request.timer = setTimeout(() => {
          if (!runtime.live || runtime.pending !== request) return;
          unknownOutcome('Sin confirmación tras 15 s. El resultado es desconocido; no se reenvió el comando. Reconecta antes de continuar.');
        }, COMMAND_TIMEOUT_MS);
        try {
          // volatile evita que Socket.IO almacene una orden si cae el transporte.
          // El plazo se controla aquí para poder cancelar también la promesa en cleanup.
          socket.volatile.emit('parqueo:command', { id, generation, action, payload }, (ack) => {
            if (!runtime.live || !runtime.connected || runtime.pending !== request) return;
            if (ack?.ok === false) {
              const error = typeof ack.error === 'string' ? ack.error : 'El motor rechazó el comando.';
              update({ error });
              finish(request, { ok: false, error });
              return;
            }
            const createsSession = SESSION_ACTIONS.includes(action);
            if (ack?.ok !== true || !validGeneration(ack.generation)
              || (!createsSession && ack.generation !== generation)
              || (createsSession && previousGeneration !== null && ack.generation === previousGeneration)
              || runtime.retired.has(ack.generation)) {
              unknownOutcome('Confirmación incompatible con la generación solicitada. Reconecta; no se repetirá la orden.');
              return;
            }
            if (createsSession) {
              if (previousGeneration !== null) runtime.retired.add(previousGeneration);
              runtime.generation = ack.generation;
              runtime.sessionId = null;
              runtime.revision = -1;
              runtime.snapshot = null;
              setView((previous) => ({ ...previous, generation: ack.generation, stale: Boolean(previous.snapshot) }));
            }
            if (ack.state) acceptSnapshot(ack.state);
            if (request.candidate) acceptSnapshot(request.candidate);
            finish(request, { ok: true, generation: ack.generation });
          });
        } catch {
          unknownOutcome('No se pudo confirmar el envío. Reconecta antes de continuar; no se repetirá la orden.');
        }
      });
    };
    runtime.reconnect = () => {
      if (!runtime.live) return;
      socket.disconnect(); // Cierra la sesión, incluso si se desconoce el resultado de una orden.
      if (!runtime.connected) invalidateIdentity();
      update({ connection: 'connecting', generation: null, uncertain: false, error: null, stale: true });
      socket.connect();
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('parqueo:state', onState);
    socket.on('parqueo:fault', onFault);
    socket.connect();

    return () => {
      runtime.live = false;
      if (runtime.pending) finish(runtime.pending, { ok: false, error: 'Vista cerrada; comando no reenviado.' });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('parqueo:state', onState);
      socket.off('parqueo:fault', onFault);
      socket.disconnect();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
    };
  }, [apiUrl]);

  const command = useCallback((action, payload) => runtimeRef.current?.command?.(action, payload)
    ?? Promise.resolve({ ok: false, error: 'El motor no está conectado.' }), []);
  const reconnect = useCallback(() => runtimeRef.current?.reconnect?.(), []);
  return { ...view, command, reconnect };
}
