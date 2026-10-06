import { StrictMode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({ sockets: [] }));
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    const handlers = new Map();
    const socket = {
      connected: false, calls: [],
      on(event, callback) { handlers.set(event, callback); return socket; },
      off(event, callback) { if (handlers.get(event) === callback) handlers.delete(event); return socket; },
      connect() { socket.connected = true; handlers.get('connect')?.(); },
      disconnect() { const wasConnected = socket.connected; socket.connected = false; if (wasConnected) handlers.get('disconnect')?.(); },
      trigger(event, value) { handlers.get(event)?.(value); },
      listenerCount() { return handlers.size; },
    };
    socket.volatile = { emit(event, payload, acknowledge) { socket.calls.push({ event, payload, acknowledge }); } };
    fake.sockets.push(socket);
    return socket;
  }),
}));

import { useParqueo, parqueoOrigin } from './useParqueo';

function snapshot(generation = 'generation-1', revision = 1, extra = {}) {
  return { sessionId: `session-${generation}`, generation, revision, mode: 'normal', status: 'running',
    vehicles: [], resources: [], spaces: [], events: [], graph: { nodes: [], edges: [], cycle: [] }, ...extra };
}
const settings = { mode: 'normal', capacity: 6, autoRecover: true };

beforeEach(() => {
  fake.sockets.length = 0;
  let sequence = 0;
  vi.stubGlobal('crypto', { randomUUID: () => `test-request-${++sequence}` });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('useParqueo', () => {
  it('limpia listeners bajo StrictMode y no crea sesiones al conectar', async () => {
    const view = renderHook(() => useParqueo(), { wrapper: StrictMode });
    await waitFor(() => expect(view.result.current.connection).toBe('connected'));
    expect(fake.sockets.length).toBe(2);
    expect(fake.sockets[0].listenerCount()).toBe(0);
    expect(fake.sockets[0].connected).toBe(false);
    expect(fake.sockets.every(socket => socket.calls.length === 0)).toBe(true);
    view.unmount();
    expect(fake.sockets.at(-1).listenerCount()).toBe(0);
    expect(fake.sockets.at(-1).connected).toBe(false);
  });

  it('acepta una sesión confirmada y rechaza datos de generaciones anteriores', async () => {
    const { result } = renderHook(() => useParqueo());
    const socket = fake.sockets.at(-1);
    let pending;
    act(() => { pending = result.current.command('start', settings); });
    act(() => socket.trigger('parqueo:state', snapshot()));
    expect(result.current.snapshot).toBe(null);
    await act(async () => {
      socket.calls[0].acknowledge({ ok: true, generation: 'generation-1', state: snapshot() });
      await pending;
    });
    expect(result.current.snapshot.generation).toBe('generation-1');
    act(() => { pending = result.current.command('reset', settings); });
    await act(async () => {
      socket.calls[1].acknowledge({ ok: true, generation: 'generation-2', state: snapshot('generation-2') });
      await pending;
    });
    act(() => socket.trigger('parqueo:state', snapshot('generation-1', 99)));
    expect(result.current.snapshot.generation).toBe('generation-2');
  });

  it('marca lecturas antiguas al desconectar y no reproduce comandos al reconectar', async () => {
    const { result } = renderHook(() => useParqueo());
    const socket = fake.sockets.at(-1);
    let pending;
    act(() => { pending = result.current.command('start', settings); });
    await act(async () => {
      socket.calls[0].acknowledge({ ok: true, generation: 'generation-1', state: snapshot() });
      await pending;
    });
    act(() => socket.disconnect());
    expect(result.current.stale).toBe(true);
    expect(result.current.generation).toBe(null);
    await act(async () => { expect((await result.current.command('add', { count: 1, durationMs: 1000 })).ok).toBe(false); });
    act(() => socket.connect());
    expect(socket.calls.length).toBe(1);
    expect(result.current.stale).toBe(true);
    expect(result.current.generation).toBe(null);
  });

  it('propaga errores de confirmación y elimina el estado pendiente', async () => {
    const { result } = renderHook(() => useParqueo());
    const socket = fake.sockets.at(-1);
    let pending;
    act(() => { pending = result.current.command('start', settings); });
    await act(async () => {
      socket.calls[0].acknowledge({ ok: false, error: 'Límite de hilos' });
      expect((await pending).ok).toBe(false);
    });
    expect(result.current.pending).toBe(null);
    expect(result.current.error).toBe('Límite de hilos');
  });

  it('rechaza dobles órdenes antes del render y no reenvía una confirmación vencida', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useParqueo());
    const socket = fake.sockets.at(-1);
    let pending;
    await act(async () => {
      pending = result.current.command('start', settings);
      expect((await result.current.command('start', settings)).ok).toBe(false);
    });
    expect(socket.calls.length).toBe(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15001);
      expect((await pending).ok).toBe(false);
    });
    expect(result.current.uncertain).toBe(true);
    act(() => socket.calls[0].acknowledge({ ok: true, generation: 'generation-1', state: snapshot() }));
    expect(result.current.generation).toBe(null);
  });

  it('normaliza solo orígenes HTTP y HTTPS', () => {
    expect(parqueoOrigin('https://example.test/api')).toBe('https://example.test');
    expect(parqueoOrigin('')).toBe('');
    expect(() => parqueoOrigin('javascript:alert(1)')).toThrow();
  });
});
