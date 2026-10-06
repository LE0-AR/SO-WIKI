'use strict';

const { parentPort, workerData } = require('node:worker_threads');
const { H, V, S, attachShared, vehicleIndex, copyLocked, snapshotFromCopy } = require('./shared-state');
const { withMonitor } = require('./sync');
const { buildGraph, revalidateCycleLocked, vehicleNumber } = require('./rag');

const shared = attachShared(workerData.shared);
let incident = null;
let recoveryRequested = false;
let closed = false;
let timer;

function copy() {
  return withMonitor(shared, () => copyLocked(shared), { ignoreCancel: true, mutate: false });
}

function startRecovery() {
  if (!incident || incident.recovered || recoveryRequested) return false;
  const valid = withMonitor(shared, () => {
    if (!revalidateCycleLocked(shared, incident.cycle)) return false;
    Atomics.store(shared.a, vehicleIndex(shared, incident.victim, V.CANCEL), 1);
    return true;
  }, { ignoreCancel: true }); // unlock despierta: validación y aborto sin TOCTOU.
  if (!valid) return false;
  recoveryRequested = true;
  parentPort.postMessage({ type: 'recovery-started', victim: incident.victim });
  return true;
}

function capture() {
  let raw = copy();
  let capturedAt = new Date().toISOString();
  let snapshot = snapshotFromCopy(raw, shared, workerData.mode);
  let graph = buildGraph(snapshot);
  if (!incident && graph.cycle.length && !Atomics.load(shared.a, H.STOP)) {
    // Revalidar las aristas con el monitor y conservar esa misma copia.
    // Nada de DFS, serialización o postMessage dentro de la sección crítica.
    const confirmed = withMonitor(shared, () => revalidateCycleLocked(shared, graph.cycle)
      ? copyLocked(shared) : null, { ignoreCancel: true, mutate: false });
    if (confirmed) {
      raw = confirmed;
      capturedAt = new Date().toISOString();
      snapshot = snapshotFromCopy(raw, shared, workerData.mode);
      graph = buildGraph(snapshot);
      const victim = Math.max(...graph.cycle.map(vehicleNumber).filter(Boolean));
      incident = {
        detectedAt: new Date().toISOString(), cycle: [...graph.cycle], victim,
        graph: structuredClone(graph), recovered: false,
      };
      parentPort.postMessage({ type: 'incident', victim, cycle: incident.cycle });
      if (workerData.autoRecover) startRecovery();
    } else {
      // El candidato obsoleto NO se presenta como un ciclo confirmado.
      graph.cycle = [];
    }
  } else if (graph.cycle.length) {
    const valid = withMonitor(shared, () => revalidateCycleLocked(shared, graph.cycle), {
      ignoreCancel: true, mutate: false,
    });
    if (!valid) graph.cycle = [];
  }
  if (incident && recoveryRequested && !incident.recovered) {
    const victimDone = raw.rows[incident.victim - 1][V.DONE] === 1;
    const survivors = [...new Set(incident.cycle.map(vehicleNumber).filter(id => id && id !== incident.victim))];
    const progressed = survivors.every(id => {
      const row = raw.rows[id - 1];
      return row[V.STATE] === S.CIRCULATING || row[V.STATE] === S.FINISHED;
    });
    if (victimDone && !graph.cycle.length && progressed) {
      incident.recovered = true;
      parentPort.postMessage({ type: 'recovered', victim: incident.victim });
    }
  }
  const result = { ...snapshot, graph, incident, capturedAt };
  parentPort.postMessage({ type: 'snapshot', snapshot: result });
  return result;
}

function fatal(error) {
  if (closed) return;
  closed = true;
  clearInterval(timer);
  parentPort.postMessage({ type: 'fatal', message: error.message });
  parentPort.close();
  process.exitCode = 1;
}

parentPort.on('message', message => {
  if (closed) return;
  try {
    if (message.type === 'recover') {
      capture();
      const started = startRecovery();
      parentPort.postMessage({
        type: 'reply', requestId: message.requestId,
        ok: started || recoveryRequested || Boolean(incident && incident.recovered),
        message: 'No hay un interbloqueo vigente que recuperar',
      });
      capture();
    } else if (message.type === 'capture') {
      capture();
    } else if (message.type === 'finish') {
      capture();
      closed = true;
      clearInterval(timer);
      parentPort.postMessage({ type: 'done' });
      parentPort.close();
    }
  } catch (error) { fatal(error); }
});

try {
  capture();
  timer = setInterval(() => { try { capture(); } catch (error) { fatal(error); } }, 50);
} catch (error) { fatal(error); }
