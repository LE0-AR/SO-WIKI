import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Controls } from './Controls';

afterEach(cleanup);
const props = (extra = {}) => ({ connection: 'connected', generation: null, snapshot: null,
  stale: false, uncertain: false, pending: null, command: vi.fn(), ...extra });

describe('Controls', () => {
  it('inicia explícitamente y solicita confirmación al motor', () => {
    const value = props();
    render(<Controls {...value} />);
    expect(value.command).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar operación normal' }));
    expect(value.command).toHaveBeenCalledWith('start', { mode: 'normal', capacity: 6, autoRecover: false });
  });
  it('una demostración reinicia una sesión previa', () => {
    const value = props({ generation: 'g1', snapshot: { generation: 'g1', status: 'running', mode: 'normal' } });
    render(<Controls {...value} />);
    fireEvent.click(screen.getByRole('button', { name: /Carrera sin protección/ }));
    expect(value.command).toHaveBeenCalledWith('reset', { mode: 'race', capacity: 6, autoRecover: false });
  });
  it('bloquea órdenes sin conexión y mientras hay confirmación pendiente', () => {
    const value = props({ connection: 'disconnected' });
    const view = render(<Controls {...value} />);
    const start = screen.getByRole('button', { name: 'Iniciar operación normal' });
    expect(start.disabled).toBe(true);
    expect(start.closest('fieldset').disabled).toBe(true);
    view.rerender(<Controls {...value} connection="connected" pending={{ action: 'start' }} />);
    expect(screen.getByRole('button', { name: /Reserva protegida/ }).closest('fieldset').disabled).toBe(true);
    expect(value.command).not.toHaveBeenCalled();
  });
  it('valida capacidad antes de enviar un escenario', () => {
    const value = props();
    render(<Controls {...value} />);
    fireEvent.change(screen.getByLabelText(/Capacidad/), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar operación normal' }));
    expect(value.command).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('entre 2 y 12');
  });
});
