import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useParqueo } from '../hooks/useParqueo';
import { GrafoRecursos } from '../components/parqueo/GrafoRecursos';
import { Controls } from '../components/parqueo/Controls';
import { MODE_LABELS as MODES, bytes as memory, dateTime as time } from '../components/parqueo/format';
import directrices from '../../../definici_n_del_proyecto_2.md?raw';
import propuesta from '../../../propuesta_parqueo.md?raw';
import '../components/parqueo/parqueo.css';

const STATUS = { running: 'En ejecución', stopping: 'Deteniendo', stopped: 'Detenido', failed: 'Error' };

function Panel({ title, children, className = '' }) {
  return <section className={`card border-0 shadow-sm rounded-4 p-4 mb-4 ${className}`}><h2 className="h5 fw-bold mb-3">{title}</h2>{children}</section>;
}

export function Parqueo() {
  const engine = useParqueo();
  const [tab, setTab] = useState('laboratorio');
  const [document, setDocument] = useState('propuesta');
  const state = engine.snapshot;
  const labels = new Map((state?.resources ?? []).map(resource => [resource.id, resource.label]));
  const resourceName = id => labels.get(id) ?? id;
  const attemptCount = state?.race?.attempts.length ?? 0;

  return <main className="parqueo-page bg-light min-vh-100 py-5">
    <div className="container">
      <header className="mb-4">
        <p className="text-secondary fw-semibold small mb-2">PROYECTO 2 · CONCURRENCIA Y SINCRONIZACIÓN</p>
        <h1 className="fw-bold text-dark">Parqueo concurrente</h1>
        <p className="text-secondary mb-3">Vehículos ejecutados en hilos reales. Recursos compartidos, reservas y recuperación de interbloqueos desde el servidor.</p>
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <span className={`badge ${engine.connection === 'connected' ? 'text-bg-success' : 'text-bg-secondary'}`} role="status">{engine.connection === 'connected' ? '● Motor conectado' : engine.connection === 'connecting' ? '○ Conectando' : '○ Sin conexión'}</span>
          {state && <span className="badge text-bg-light border">{STATUS[state.status] ?? state.status}</span>}
          {state && <span className="small text-secondary">Última lectura: {time(state.capturedAt)}</span>}
        </div>
      </header>

      <div className="d-flex flex-wrap gap-2 mb-4" role="group" aria-label="Secciones del parqueo">
        <button className={`btn rounded-pill ${tab === 'laboratorio' ? 'btn-dark' : 'btn-outline-dark'}`} aria-pressed={tab === 'laboratorio'} onClick={() => setTab('laboratorio')}>Laboratorio</button>
        <button className={`btn rounded-pill ${tab === 'documentacion' ? 'btn-dark' : 'btn-outline-dark'}`} aria-pressed={tab === 'documentacion'} onClick={() => setTab('documentacion')}>Propuesta y directrices</button>
      </div>
      {engine.error && <div className="alert alert-warning" role="alert">{engine.error} <button className="btn btn-sm btn-outline-dark ms-2" onClick={engine.reconnect}>Reconectar</button></div>}
      {engine.stale && state && <div className="alert alert-secondary" role="status">Estos datos son la última lectura, no el estado actual. La sesión no se reanuda al reconectar.</div>}
      {state?.status === 'failed' && <div className="alert alert-danger" role="alert">Esta generación falló y se descarta. Las asignaciones mostradas pueden pertenecer a la última captura anterior al fallo; no representan recursos todavía utilizables. Reinicia para crear una ejecución nueva.</div>}
      {engine.pending && <p className="small fw-semibold" role="status">Esperando confirmación del servidor…</p>}

      {tab === 'documentacion' ? <Panel title="Documentos del proyecto">
        <p className="text-secondary">Contenido de los archivos Markdown originales del repositorio. La propuesta define el escenario; las directrices establecen los requisitos de entrega.</p>
        <div className="d-flex gap-2 flex-wrap mb-4">
          <button className={`btn btn-sm ${document === 'propuesta' ? 'btn-dark' : 'btn-outline-dark'}`} aria-pressed={document === 'propuesta'} onClick={() => setDocument('propuesta')}>Propuesta de parqueo</button>
          <button className={`btn btn-sm ${document === 'directrices' ? 'btn-dark' : 'btn-outline-dark'}`} aria-pressed={document === 'directrices'} onClick={() => setDocument('directrices')}>Directrices del Proyecto 2</button>
        </div>
        <article className="parqueo-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{document === 'propuesta' ? propuesta : directrices}</ReactMarkdown></article>
      </Panel> : <div className="row g-4">
        <aside className="col-lg-4">
          <div className="mb-4"><Controls {...engine} /></div>
          <Panel title="Cómo funciona cada escenario">
            <dl className="small mb-0">
              <dt>Operación normal</dt><dd>Agrega vehículos después de iniciar. La capacidad limita el ingreso y las zonas se adquieren en orden A → B.</dd>
              <dt>Carrera sin protección</dt><dd>Dos hilos leen la misma plaza libre antes de reservar sin proteger la operación completa.</dd>
              <dt>Reserva protegida</dt><dd>Un mutex protege comprobación y reserva: solo un hilo confirma.</dd>
              <dt>Interbloqueo</dt><dd className="mb-0">Un hilo conserva A y solicita B; otro conserva B y solicita A. Sin recuperación automática puedes observar el ciclo y recuperar manualmente.</dd>
            </dl>
          </Panel>
          <Panel title="Evidencia del sistema operativo">
            <p className="small">El PID pertenece al proceso Node; cada vehículo tiene un <code>threadId</code> de Node, que <strong>no equivale al TID de Linux</strong>.</p>
            {state ? <dl className="row small mb-2"><dt className="col-5">PID real</dt><dd className="col-7">{state.pid}</dd><dt className="col-5">Plataforma</dt><dd className="col-7">{state.platform}</dd><dt className="col-5">Guardián</dt><dd className="col-7">{state.guardian?.threadId ?? 'Finalizado'}</dd><dt className="col-5">RSS proceso</dt><dd className="col-7">{memory(state.memory?.rss)}<br /><span className="text-secondary">{time(state.memory?.sampledAt)}</span></dd></dl> : <p className="small text-secondary">Todavía no hay una lectura del proceso.</p>}
            <p className="small mb-1">Durante la ejecución en Linux/WSL2:</p>
            <pre className="parqueo-command"><code>{`ps -eLf | grep ${state?.pid ?? '<PID>'}\nls /proc/${state?.pid ?? '<PID>'}/task\nhtop -p ${state?.pid ?? '<PID>'}`}</code></pre>
            <p className="small text-secondary mb-0">Node/V8 también crean hilos internos. Las capturas externas deben obtenerse en Linux real; esta pantalla no reemplaza esa evidencia. Al salir de la página se cierra la sesión.</p>
          </Panel>
        </aside>

        <div className={`col-lg-8 ${engine.stale ? 'parqueo-stale' : ''}`}>
          {!state ? <Panel title="El laboratorio está listo para conectar">
            <p>Inicia una ejecución para observar el parqueo. No se muestran vehículos ni métricas inventadas mientras no haya datos del servidor.</p>
            <p className="small text-secondary">Si el motor no conecta, inicia <code>npm run dev:parqueo</code> dentro de <code>wiki-backend</code> y el frontend con <code>npm run dev</code>. Consulta <code>docs/parqueo.md</code>.</p>
          </Panel> : <>
            <Panel title={`${MODES[state.mode] ?? state.mode} · Parqueo`}>
              <p className="mb-3"><strong>{state.available}</strong> permisos disponibles de <strong>{state.capacity}</strong>. Las plazas muestran su propietario confirmado; permiso y plaza no son el mismo recurso.</p>
              <div className="parqueo-zones mb-3">{state.resources.filter(resource => ['entrada', 'salida', 'zona-a', 'zona-b'].includes(resource.id)).map(resource => <div className="border rounded-3 p-3" key={resource.id} tabIndex="0"><strong className="d-block small">{resource.label}</strong><span className="small">{resource.owners.length ? `Posee: ${resource.owners.map(id => `V${id}`).join(', ')}` : 'Libre'}</span>{resource.waiting.length > 0 && <span className="d-block small">Espera: {resource.waiting.map(id => `V${id}`).join(', ')}</span>}</div>)}</div>
              <div className="parqueo-spaces">{state.spaces.map(space => <div key={space.id} className={`parqueo-space ${space.owner != null && space.owner !== 0 ? 'parqueo-space-occupied' : ''}`} tabIndex="0"><span className="small">Plaza {space.id}</span><strong>{space.owner != null && space.owner !== 0 ? `V${space.owner}` : 'Libre'}</strong></div>)}</div>
              {state.race && <p className="small text-secondary mt-3 mb-0">La demostración de reserva aísla una plaza y no utiliza permisos de ingreso. Los permisos disponibles no contabilizan estas confirmaciones.</p>}
              {state.race && <div className="alert alert-light border mt-3 mb-0"><strong>Reservas confirmadas: {state.race.confirmed} · Máximo correcto: {state.race.expected}</strong><p className="small mb-1">{state.race.confirmed > state.race.expected ? 'Conflicto observado: más de un hilo confirmó la misma plaza.' : attemptCount < 2 ? 'Esperando los dos intentos.' : state.race.confirmed === 1 ? 'Una única reserva confirmada.' : 'No hubo una reserva confirmada; revisa los eventos de la ejecución.'}</p><ul className="small mb-0">{state.race.attempts.map(attempt => <li key={attempt.vehicleId}>Vehículo {attempt.vehicleId}: leyó {attempt.observedOwner === 0 ? 'libre' : `V${attempt.observedOwner}`}; {attempt.confirmed ? 'confirmó reserva' : 'no reservó'}.</li>)}</ul></div>}
            </Panel>
            <Panel title={`Monitor de vehículos (${state.vehicles.length})`}>
              <p className="small text-secondary">Estados del motor, no del planificador de Linux. El heap corresponde al isolate del worker; una muestra puede permanecer antigua mientras espera.</p>
              <div className="table-responsive"><table className="table table-sm align-middle"><caption className="visually-hidden">Hilos reales y recursos del parqueo</caption><thead><tr><th>Vehículo / hilo</th><th>Estado</th><th>Posee</th><th>Solicita</th><th>Heap / muestra</th></tr></thead><tbody>
                {state.vehicles.map(vehicle => <tr key={vehicle.id}><td><strong>{vehicle.name}</strong><br /><span className="small text-secondary">Hilo: {vehicle.threadId ?? '—'}</span></td><td>{vehicle.state}</td><td className="small">{vehicle.heldResources.map(resourceName).join(', ') || 'Ninguno'}</td><td className="small">{vehicle.waitingFor ? resourceName(vehicle.waitingFor) : 'Ninguno'}</td><td className="small text-nowrap">{memory(vehicle.heapUsed)}<br /><span className="text-secondary">{time(vehicle.sampledAt)}</span></td></tr>)}
                {!state.vehicles.length && <tr><td colSpan="5" className="text-secondary py-3">No hay vehículos. Agrégalos desde el panel de control.</td></tr>}
              </tbody></table></div>
              <details><summary className="small fw-semibold">Recursos y mecanismos de sincronización</summary><div className="table-responsive"><table className="table table-sm mt-2"><thead><tr><th>Recurso</th><th>Mecanismo</th><th>Capacidad</th><th>Propietarios</th></tr></thead><tbody>{state.resources.map(resource => <tr key={resource.id}><td>{resource.label}</td><td>{resource.kind === 'semaphore' ? 'Semáforo' : resource.kind === 'mutex' ? 'Mutex' : 'Ocupación protegida'}</td><td>{resource.capacity}</td><td>{resource.owners.map(id => `V${id}`).join(', ') || 'Ninguno'}</td></tr>)}</tbody></table></div></details>
            </Panel>
            <Panel title="Asignación y solicitudes actuales"><GrafoRecursos graph={state.graph} /></Panel>
            {state.incident && <Panel title={state.incident.recovered ? '✓ Recuperación confirmada' : '⚠ Interbloqueo detectado'}>
              <p className="small">Detección: {time(state.incident.detectedAt)} · Víctima: vehículo {state.incident.victim}. {state.incident.recovered ? 'El motor confirmó la recuperación.' : 'El ciclo requiere abortar una transacción para liberar recursos.'}</p>
              <details><summary className="fw-semibold small">Ver evidencia histórica del ciclo (no es el estado actual)</summary><GrafoRecursos graph={state.incident.graph} title="Grafo histórico del interbloqueo" /></details>
            </Panel>}
            <Panel title="Registro de la ejecución">
              <ol className="parqueo-log list-unstyled mb-0" aria-label="Eventos del motor">{state.events.slice().reverse().map(event => <li key={event.id} className="border-bottom py-2"><time className="small text-secondary me-2" dateTime={event.time}>{time(event.time)}</time><span className="small">{event.message}</span></li>)}{!state.events.length && <li className="small text-secondary">Sin eventos todavía.</li>}</ol>
            </Panel>
          </>}
        </div>
      </div>}
    </div>
  </main>;
}
