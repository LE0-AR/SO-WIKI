import { useId, useState } from 'react';

/** La geometría es de presentación; nodos, aristas y ciclos llegan del motor. */
export function GrafoRecursos({ graph, title = 'Grafo de asignación de recursos' }) {
  const marker = useId().replace(/:/g, '');
  const [selected, setSelected] = useState(null);
  if (!graph?.nodes?.length) return <p className="text-secondary">El grafo aparecerá cuando el motor publique sus recursos.</p>;
  const vehicles = graph.nodes.filter(node => node.type === 'vehicle');
  const resources = graph.nodes.filter(node => node.type === 'resource');
  const height = Math.max(180, Math.max(vehicles.length, resources.length) * 76 + 40);
  const positions = new Map();
  vehicles.forEach((node, index) => positions.set(node.id, { x: 160, y: 48 + index * 76 }));
  resources.forEach((node, index) => positions.set(node.id, { x: 620, y: 48 + index * 76 }));
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const cycleEdges = new Set((graph.cycle ?? []).slice(0, -1).map((id, index) => `${id}|${graph.cycle[index + 1]}`));
  // Algunos detectores entregan el ciclo sin repetir el primer nodo.
  if (graph.cycle?.length > 1 && graph.cycle[0] !== graph.cycle.at(-1)) {
    cycleEdges.add(`${graph.cycle.at(-1)}|${graph.cycle[0]}`);
  }
  const edges = graph.edges.filter(edge => positions.has(edge.from) && positions.has(edge.to));
  const detail = selected && nodes.has(selected)
    ? edges.filter(edge => edge.from === selected || edge.to === selected)
    : [];

  return <section aria-label={title}>
    <p className="small text-secondary">Círculo: vehículo · Rectángulo: recurso. Flecha continua: asignación (recurso → vehículo). Discontinua: solicitud (vehículo → recurso). Trazo grueso: ciclo confirmado.</p>
    <div className="parqueo-graph-scroll">
      <svg className="parqueo-graph" viewBox={`0 0 780 ${height}`} role="img" aria-label={title}>
        <title>{title}</title>
        <defs>
          <marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker>
        </defs>
        {edges.map((edge, index) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          const direction = to.x > from.x ? 1 : -1;
          const x1 = from.x + direction * 100;
          const x2 = to.x - direction * 100;
          const cycle = cycleEdges.has(`${edge.from}|${edge.to}`);
          return <path key={`${edge.from}-${edge.to}-${index}`} d={`M${x1},${from.y} C390,${from.y} 390,${to.y} ${x2},${to.y}`}
            className={cycle ? 'parqueo-edge parqueo-cycle' : 'parqueo-edge'}
            strokeDasharray={edge.type === 'request' ? '7 5' : undefined} markerEnd={`url(#${marker})`}>
            <title>{nodes.get(edge.from)?.label} → {nodes.get(edge.to)?.label}: {edge.type === 'assignment' ? 'asignación' : 'solicitud'}{cycle ? ' (ciclo)' : ''}</title>
          </path>;
        })}
        {graph.nodes.map(node => {
          const position = positions.get(node.id);
          if (!position) return null;
          return <g key={node.id} transform={`translate(${position.x},${position.y})`} tabIndex="0"
            aria-label={node.label} className="parqueo-node" onFocus={() => setSelected(node.id)} onMouseEnter={() => setSelected(node.id)}>
            {node.type === 'vehicle' ? <ellipse rx="96" ry="23" /> : <rect x="-96" y="-24" width="192" height="48" rx="5" />}
            <text textAnchor="middle" dominantBaseline="central">{node.label.length > 24 ? `${node.label.slice(0, 22)}…` : node.label}</text>
            <title>{node.label}</title>
          </g>;
        })}
      </svg>
    </div>
    {selected && nodes.has(selected) && <p className="small mt-2 mb-2" role="status"><strong>{nodes.get(selected).label}:</strong> {detail.length ? detail.map(edge => `${nodes.get(edge.from)?.label} → ${nodes.get(edge.to)?.label}`).join('; ') : 'sin asignaciones ni solicitudes.'}</p>}
    <details className="mt-3">
      <summary className="fw-semibold">Ver relaciones en tabla ({edges.length})</summary>
      <div className="table-responsive"><table className="table table-sm mt-2"><caption className="visually-hidden">Relaciones del grafo</caption><thead><tr><th>Origen</th><th>Relación</th><th>Destino</th><th>Ciclo</th></tr></thead><tbody>
        {edges.map((edge, index) => <tr key={index}><td>{nodes.get(edge.from)?.label}</td><td>{edge.type === 'assignment' ? 'Poseído por' : 'Solicita'}</td><td>{nodes.get(edge.to)?.label}</td><td>{cycleEdges.has(`${edge.from}|${edge.to}`) ? 'Sí' : 'No'}</td></tr>)}
        {!edges.length && <tr><td colSpan="4">No hay relaciones activas.</td></tr>}
      </tbody></table></div>
    </details>
  </section>;
}
