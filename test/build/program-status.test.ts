import { describe, expect, it } from 'vitest';
import { programStatusLabel } from '../../src/lib/program-status';

const labels = { upcoming: 'Próximamente', open: 'Inscripciones abiertas', closed: 'Inscripciones cerradas' };

describe('programStatusLabel', () => {
  it('muestra el texto del estado calculado del programa', () => {
    expect(programStatusLabel('upcoming', labels)).toBe('Próximamente');
    expect(programStatusLabel('open', labels)).toBe('Inscripciones abiertas');
    expect(programStatusLabel('closed', labels)).toBe('Inscripciones cerradas');
  });

  it('no muestra nada si el estado es desconocido o falta', () => {
    expect(programStatusLabel(undefined, labels)).toBeNull();
    expect(programStatusLabel('toString', labels)).toBeNull();
    expect(programStatusLabel(42, labels)).toBeNull();
  });

  it('no muestra un texto vacio', () => {
    expect(programStatusLabel('open', { ...labels, open: '' })).toBeNull();
  });
});
