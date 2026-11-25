import { describe, expect, it } from 'vitest';
import { headerToneAt, headerToneOfCard, type ToneBand } from '../../src/lib/header-tone';

const fullWidth = { left: 0, right: 1440 };

const bands: ToneBand[] = [
  { ...fullWidth, top: 0, bottom: 800, tone: 'brand' },
  { ...fullWidth, top: 800, bottom: 1600, tone: 'light' },
  { ...fullWidth, top: 1600, bottom: 2400, tone: 'dark' },
];

describe('tono del header segun lo que tiene debajo el logo', () => {
  it('toma el tono de la seccion que contiene el logo', () => {
    expect(headerToneAt(bands, { x: 100, y: 40 })).toBe('brand');
    expect(headerToneAt(bands, { x: 100, y: 900 })).toBe('light');
    expect(headerToneAt(bands, { x: 100, y: 2000 })).toBe('dark');
  });

  it('en el limite entre dos secciones gana la de abajo', () => {
    expect(headerToneAt(bands, { x: 100, y: 800 })).toBe('light');
  });

  it('si hay regiones anidadas gana la ultima en el documento', () => {
    const nested: ToneBand[] = [
      { ...fullWidth, top: 0, bottom: 1000, tone: 'dark' },
      { left: 0, right: 500, top: 0, bottom: 400, tone: 'brand' },
    ];
    expect(headerToneAt(nested, { x: 100, y: 50 })).toBe('brand');
    expect(headerToneAt(nested, { x: 800, y: 50 })).toBe('dark');
    expect(headerToneAt(nested, { x: 100, y: 700 })).toBe('dark');
  });

  it('una seccion en tarjeta no cuenta si el logo queda fuera de ella, sobre el fondo de la pagina', () => {
    const card: ToneBand[] = [{ left: 180, right: 1260, top: 0, bottom: 900, tone: 'dark' }];
    expect(headerToneAt(card, { x: 110, y: 50 })).toBe('light');
    expect(headerToneAt(card, { x: 400, y: 50 })).toBe('dark');
  });

  it('fuera de toda region el logo esta sobre el fondo claro de la pagina', () => {
    expect(headerToneAt(bands, { x: 100, y: 5000 })).toBe('light');
    expect(headerToneAt([], { x: 10, y: 10 })).toBe('light');
  });
});

describe('tono del header sobre tarjetas de color', () => {
  it('las tarjetas periwinkle, teal y doradas piden el logo monocromo', () => {
    expect(headerToneOfCard('peri')).toBe('brand');
    expect(headerToneOfCard('teal')).toBe('brand');
    expect(headerToneOfCard('gold')).toBe('brand');
  });

  it('las tarjetas oscuras piden el logo con letras claras', () => {
    expect(headerToneOfCard('dark')).toBe('dark');
  });

  it('las tarjetas sin color heredan el tono de su seccion', () => {
    expect(headerToneOfCard('')).toBeUndefined();
  });
});
