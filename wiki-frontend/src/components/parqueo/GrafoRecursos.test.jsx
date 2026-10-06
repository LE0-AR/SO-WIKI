import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GrafoRecursos } from './GrafoRecursos';

afterEach(cleanup);

const graph = {
  nodes: [
    { id: 'vehiculo-1', label: 'Vehículo 1', type: 'vehicle' },
    { id: 'zona-a', label: 'Zona A', type: 'resource' },
  ],
  edges: [{ from: 'zona-a', to: 'vehiculo-1', type: 'assignment' }],
  cycle: [],
};

describe('GrafoRecursos', () => {
  it('no inventa nodos cuando no hay estado', () => {
    const view = render(<GrafoRecursos graph={{ nodes: [], edges: [], cycle: [] }} />);
    expect(view.container.querySelectorAll('svg').length).toBe(0);
    expect(screen.getByText(/publicar|publique/)).toBeTruthy();
  });

  it('representa relaciones y proporciona una tabla equivalente', () => {
    const view = render(<GrafoRecursos graph={graph} />);
    expect(view.container.querySelectorAll('.parqueo-node').length).toBe(2);
    expect(view.container.querySelectorAll('.parqueo-edge').length).toBe(1);
    expect(view.container.querySelector('table').textContent).toContain('Poseído por');
    const node = view.container.querySelector('.parqueo-node');
    fireEvent.focus(node);
    expect(screen.getByRole('status').textContent).toContain('Zona A → Vehículo 1');
  });

  it('resalta solo las aristas incluidas en un ciclo informado por el servidor', () => {
    const view = render(<GrafoRecursos graph={{ ...graph, cycle: ['zona-a', 'vehiculo-1', 'zona-a'] }} />);
    expect(view.container.querySelectorAll('.parqueo-cycle').length).toBe(1);
  });
});
