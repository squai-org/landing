import { describe, expect, it } from 'vitest';
import { headerToneAt, type ToneBand } from '../../src/lib/header-tone';

const bands: ToneBand[] = [
  { top: 0, bottom: 800, tone: 'brand' },
  { top: 800, bottom: 1600, tone: 'light' },
  { top: 1600, bottom: 2400, tone: 'dark' },
];

describe('tono del header segun la seccion que tiene debajo', () => {
  it('toma el tono de la seccion que contiene la linea del header', () => {
    expect(headerToneAt(bands, 40, 'light')).toBe('brand');
    expect(headerToneAt(bands, 900, 'brand')).toBe('light');
    expect(headerToneAt(bands, 2000, 'light')).toBe('dark');
  });

  it('en el limite entre dos secciones gana la de abajo', () => {
    expect(headerToneAt(bands, 800, 'brand')).toBe('light');
  });

  it('si hay secciones anidadas gana la ultima en el documento', () => {
    const nested: ToneBand[] = [
      { top: 0, bottom: 1000, tone: 'light' },
      { top: 200, bottom: 600, tone: 'brand' },
    ];
    expect(headerToneAt(nested, 300, 'dark')).toBe('brand');
    expect(headerToneAt(nested, 700, 'dark')).toBe('light');
  });

  it('fuera de toda seccion conserva el tono actual', () => {
    expect(headerToneAt(bands, 5000, 'dark')).toBe('dark');
    expect(headerToneAt([], 10, 'brand')).toBe('brand');
  });
});
