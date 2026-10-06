export const MODE_LABELS = {
  normal: 'Operación normal', race: 'Carrera sin protección',
  protected: 'Reserva protegida', deadlock: 'Interbloqueo',
};
export const STATUS_LABELS = {
  running: 'En ejecución', stopping: 'Deteniendo', stopped: 'Detenida', failed: 'Fallida',
};
export const ACTION_LABELS = {
  start: 'Iniciar', reset: 'Reiniciar', add: 'Agregar vehículos', recover: 'Recuperar', stop: 'Detener',
};
export const KIND_LABELS = { mutex: 'Mutex', semaphore: 'Semáforo', space: 'Plaza física' };
export const number = (value) => Number.isFinite(value) ? value.toLocaleString('es-GT') : 'Sin dato';
export const bytes = (value) => Number.isFinite(value) && value >= 0
  ? `${(value / 1024 / 1024).toLocaleString('es-GT', { maximumFractionDigits: 2 })} MiB` : 'Sin muestra';
export const dateTime = (value) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString('es-GT') : 'Sin fecha';
export function sampleAge(value, now) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Antigüedad desconocida';
  const seconds = Math.floor((now - timestamp) / 1000);
  if (seconds < 0) return 'Fecha futura según el reloj local';
  if (seconds < 60) return `Hace ${seconds} s`;
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  return `Hace ${Math.floor(seconds / 3600)} h`;
}
export function vehicleName(id, vehicles = []) {
  const vehicle = vehicles.find((item) => item.id === id);
  return vehicle ? `${vehicle.name} (#${id})` : `Vehículo #${id}`;
}
export const resourceName = (id, resources = []) => resources.find((item) => item.id === id)?.label || id;
