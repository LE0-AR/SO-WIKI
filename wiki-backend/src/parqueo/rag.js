'use strict';

const { H, V, R, vehicleIndex, resourceCode } = require('./shared-state');

function buildGraph({ vehicles, resources }) {
  const nodes = [
    ...vehicles.map(vehicle => ({ id: `vehiculo-${vehicle.id}`, label: vehicle.name, type: 'vehicle' })),
    ...resources.map(resource => ({ id: resource.id, label: resource.label, type: 'resource' })),
  ];
  const edges = resources.flatMap(resource => [
    ...resource.owners.map(id => ({ from: resource.id, to: `vehiculo-${id}`, type: 'assignment' })),
    ...resource.waiting.map(id => ({ from: `vehiculo-${id}`, to: resource.id, type: 'request' })),
  ]);
  const graph = { nodes, edges, cycle: [] };
  graph.cycle = findCycle(graph, resources);
  return graph;
}

// Un ciclo RAG con recursos multicapacidad NO es prueba de interbloqueo.
// Se conservan sus aristas en la vista, pero se excluyen del DFS detector.
function findCycle(graph, resources) {
  const single = new Set(resources.filter(resource => resource.capacity === 1).map(resource => resource.id));
  const allowed = new Set(graph.nodes.filter(node => node.type === 'vehicle' || single.has(node.id)).map(node => node.id));
  const adjacency = new Map([...allowed].map(id => [id, []]));
  for (const edge of graph.edges) {
    if (allowed.has(edge.from) && allowed.has(edge.to)) adjacency.get(edge.from).push(edge.to);
  }
  const colors = new Map();
  const stack = [];
  function visit(id) {
    colors.set(id, 1);
    stack.push(id);
    for (const next of adjacency.get(id)) {
      if (colors.get(next) === 1) return [...stack.slice(stack.indexOf(next)), next];
      if (!colors.has(next)) {
        const cycle = visit(next);
        if (cycle.length) return cycle;
      }
    }
    stack.pop();
    colors.set(id, 2);
    return [];
  }
  for (const id of allowed) {
    if (!colors.has(id)) {
      const cycle = visit(id);
      if (cycle.length) return cycle;
    }
  }
  return [];
}

function vehicleNumber(node) {
  const match = /^vehiculo-([1-9]\d*)$/.exec(node);
  return match ? Number(match[1]) : null;
}

function validShape(cycle) {
  return Array.isArray(cycle) && cycle.length >= 3 && cycle[0] === cycle[cycle.length - 1]
    && new Set(cycle.slice(0, -1)).size === cycle.length - 1;
}

// Versión pura para comprobar que aristas históricas siguen presentes.
function revalidateCycle(cycle, snapshot) {
  if (!validShape(cycle)) return false;
  const resources = new Map(snapshot.resources.map(resource => [resource.id, resource]));
  for (let n = 0; n < cycle.length - 1; n++) {
    const fromVehicle = vehicleNumber(cycle[n]);
    const toVehicle = vehicleNumber(cycle[n + 1]);
    if (fromVehicle && !toVehicle) {
      const resource = resources.get(cycle[n + 1]);
      if (!resource || resource.capacity !== 1 || !resource.waiting.includes(fromVehicle)) return false;
    } else if (!fromVehicle && toVehicle) {
      const resource = resources.get(cycle[n]);
      if (!resource || resource.capacity !== 1 || !resource.owners.includes(toVehicle)) return false;
    } else return false;
  }
  return true;
}

// El guardián llama esto con el monitor retenido DESPUÉS del DFS. Consulta
// únicamente las aristas candidatas; jamás ejecuta DFS ni construye JSON aquí.
function revalidateCycleLocked(shared, cycle) {
  if (!validShape(cycle) || Atomics.load(shared.a, H.STOP)) return false;
  for (let n = 0; n < cycle.length - 1; n++) {
    const fromVehicle = vehicleNumber(cycle[n]);
    const toVehicle = vehicleNumber(cycle[n + 1]);
    const id = fromVehicle || toVehicle;
    if (!id || id > shared.maxVehicles || Boolean(fromVehicle) === Boolean(toVehicle)) return false;
    const base = vehicleIndex(shared, id);
    if (!shared.a[base + V.ACTIVE] || shared.a[base + V.DONE]
      || Atomics.load(shared.a, base + V.CANCEL)) return false;
    const code = resourceCode(fromVehicle ? cycle[n + 1] : cycle[n]);
    if (code < 0 || code >= 6 + shared.capacity || (code === R.CAPACITY && shared.capacity !== 1)) return false;
    if (fromVehicle) {
      if (shared.a[base + V.WAIT] !== code + 1) return false;
    } else {
      const owns = code === R.CAPACITY ? shared.a[base + V.PERMIT] === 1
        : code < 5 ? shared.a[shared.locksOffset + code] === id
          : Atomics.load(shared.a, shared.spacesOffset + code - 6) === id;
      if (!owns) return false;
    }
  }
  return true;
}

module.exports = { buildGraph, findCycle, revalidateCycle, revalidateCycleLocked, vehicleNumber };
