import { useState } from 'react';
import { ACTION_LABELS, MODE_LABELS } from './format';

export function Controls({ connection, generation, snapshot, stale, uncertain, pending, command }) {
  const [capacity, setCapacity] = useState('6');
  const [count, setCount] = useState('2');
  const [duration, setDuration] = useState('3000');
  const [autoRecover, setAutoRecover] = useState(false);
  const [validation, setValidation] = useState(null);
  const unavailable = connection !== 'connected' || Boolean(pending) || uncertain;
  const hasSession = generation !== null;
  const current = !stale && snapshot?.generation === generation ? snapshot : null;
  const running = current?.status === 'running';
  const startDisabled = unavailable || (hasSession && !['stopped', 'failed'].includes(current?.status));
  const configuration = (mode) => ({ mode, capacity: Number(capacity), autoRecover });
  const sendSession = (action, mode) => {
    const value = Number(capacity);
    if (!Number.isInteger(value) || value < 2 || value > 12) {
      setValidation('La capacidad debe ser un entero entre 2 y 12.');
      return;
    }
    setValidation(null);
    void command(action, configuration(mode));
  };
  const add = (event) => {
    event.preventDefault();
    const amount = Number(count);
    const ms = Number(duration);
    if (!Number.isInteger(amount) || amount < 1 || amount > 12
      || !Number.isInteger(ms) || ms < 500 || ms > 30_000) {
      setValidation('Vehículos: 1–12. Duración: 500–30000 ms, en números enteros.');
      return;
    }
    setValidation(null);
    void command('add', { count: amount, durationMs: ms });
  };

  return (
    <section className="card border-0 shadow-sm rounded-4 p-3 p-md-4" aria-labelledby="parqueo-controls">
      <h2 id="parqueo-controls" className="h5 fw-bold">Control de la sesión</h2>
      <p className="small pq-secondary">Los cambios de configuración se aplican al iniciar o reiniciar. Las demostraciones reinician si ya existe una sesión.</p>
      {validation && <p role="alert" className="pq-notice">{validation}</p>}
      <fieldset disabled={unavailable}>
        <legend className="visually-hidden">Configuración para la próxima sesión</legend>
        <label htmlFor="pq-capacity" className="form-label">Capacidad (2–12 plazas)</label>
        <input id="pq-capacity" className="form-control mb-3" type="number" min="2" max="12" step="1"
          value={capacity} onChange={(event) => setCapacity(event.target.value)} />
        <div className="form-check mb-3">
          <input id="pq-autorecover" className="form-check-input" type="checkbox" checked={autoRecover}
            onChange={(event) => setAutoRecover(event.target.checked)} aria-describedby="pq-recovery-help" />
          <label htmlFor="pq-autorecover" className="form-check-label">Recuperación automática</label>
        </div>
        <p id="pq-recovery-help" className="small pq-secondary">Se envía al motor al crear la sesión; no cambia retroactivamente una sesión activa.</p>
        <button type="button" className="btn btn-success w-100" disabled={startDisabled}
          onClick={() => sendSession('start', 'normal')}>Iniciar operación normal</button>
        <h3 className="h6 fw-bold mt-4">Demostraciones con dos vehículos</h3>
        <div className="d-grid gap-2">
          {['race', 'protected', 'deadlock'].map((mode) => (
            <button key={mode} type="button" className="btn btn-outline-secondary"
              onClick={() => sendSession(hasSession ? 'reset' : 'start', mode)}>
              {MODE_LABELS[mode]}{hasSession ? ' · reiniciar' : ''}
            </button>
          ))}
        </div>
      </fieldset>
      <hr />
      <form onSubmit={add}>
        <fieldset disabled={unavailable || !running || current?.mode !== 'normal'}>
          <legend className="h6 fw-bold">Agregar vehículos · modo normal</legend>
          <label htmlFor="pq-count" className="form-label">Cantidad (1–12)</label>
          <input id="pq-count" className="form-control mb-3" type="number" min="1" max="12" step="1"
            required value={count} onChange={(event) => setCount(event.target.value)} />
          <label htmlFor="pq-duration" className="form-label">Duración por vehículo (ms)</label>
          <input id="pq-duration" className="form-control mb-3" type="number" min="500" max="30000" step="1"
            required value={duration} onChange={(event) => setDuration(event.target.value)} />
          <button className="btn btn-outline-success w-100" type="submit">Agregar vehículos</button>
        </fieldset>
      </form>
      <p className="small pq-secondary mt-2">Máximo 12 vehículos totales por ejecución. Las demostraciones crean dos participantes. El servidor valida cuotas; un envío no garantiza la admisión.</p>
      <div className="d-flex flex-wrap gap-2 mt-3">
        <button type="button" className="btn btn-outline-secondary" disabled={unavailable || !running || !current?.incident || current.incident.recovered}
          onClick={() => { void command('recover', {}); }}>Recuperar incidente</button>
        <button type="button" className="btn btn-outline-danger" disabled={unavailable || !hasSession || ['stopped', 'failed'].includes(current?.status)}
          onClick={() => { void command('stop', {}); }}>Detener</button>
        <button type="button" className="btn btn-outline-secondary" disabled={unavailable || !hasSession}
          onClick={() => sendSession('reset', current?.mode || 'normal')}>Reiniciar sesión</button>
      </div>
      <p className="small pq-secondary mt-3 mb-0" role="status">
        {pending ? `Pendiente: ${ACTION_LABELS[pending.action]}. Esperando confirmación (máximo 15 s).`
          : hasSession ? 'Reiniciar cierra la generación anterior y crea una nueva.' : 'Conectarse no crea una sesión. Inicia una de forma explícita.'}
      </p>
    </section>
  );
}
