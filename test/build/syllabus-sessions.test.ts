import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { serviceSchema } from '../../src/content/schema';
import { normalizedDistance, slideTransform, sessionSlideMotion } from '../../src/lib/session-carousel';

const root = path.join(import.meta.dirname, '../..');

const loadRaw = async () => JSON.parse(await readFile(path.join(root, 'src/content/services/squai-one.json'), 'utf8'));

const loadSyllabus = async () => serviceSchema.parse(await loadRaw()).syllabus!;

describe('temario por modulos', () => {
  it('cada modulo es una tarjeta con titulo, temas e ilustracion propia', async () => {
    const { modules } = await loadSyllabus();

    expect(modules.length).toBeGreaterThan(0);
    expect(modules.every((module) => module.t.length > 0 && module.topics.length > 0 && module.alt.length > 0)).toBe(true);
    expect(new Set(modules.map((module) => module.illustration)).size).toBe(modules.length);
  });
});

describe('esquema de las sesiones y la presentacion', () => {
  it('las etiquetas de las flechas llevan valor por defecto', async () => {
    const syllabus = await loadSyllabus();

    expect(syllabus.prevLabel).toBe('Ver sesiones anteriores');
    expect(syllabus.nextLabel).toBe('Ver sesiones siguientes');
  });

  it('el video admite texto lateral y boton opcionales', async () => {
    const raw = await loadRaw();
    const parsed = serviceSchema.parse(raw);

    expect(parsed.video?.lead).toBeTruthy();
    expect(parsed.video?.cta?.target).toBe('inscripcion');

    const bare = { ...raw, video: { title: 'T', playLabel: 'P', iframeTitle: 'I', caption: 'C', posterAlt: 'A' } };
    expect(serviceSchema.safeParse(bare).success).toBe(true);
  });
});

describe('movimiento del carrusel', () => {
  it('hay un giro y un desplazamiento fijos para cada una de las ocho tarjetas', () => {
    expect(sessionSlideMotion).toHaveLength(8);
    expect(sessionSlideMotion[0]).toEqual({ rotate: -2.2, y: -6.5 });
  });

  it('la tarjeta centrada queda recta', () => {
    const { rotate, y } = slideTransform(0, { rotate: -2.2, y: -6.5 });

    expect(Math.abs(rotate)).toBe(0);
    expect(Math.abs(y)).toBe(0);
  });

  it('la intensidad sigue sin(norm * 1.2)', () => {
    const { rotate, y } = slideTransform(1, { rotate: 2.6, y: 4.2 });

    expect(rotate).toBeCloseTo(Math.sin(1.2) * 2.6, 5);
    expect(y).toBeCloseTo(Math.sin(1.2) * 4.2, 5);
  });

  it('la distancia al centro se acota a dos veces el ancho medio', () => {
    expect(normalizedDistance({ itemCenter: 1000, center: 500, maxDistance: 250 })).toBe(2);
    expect(normalizedDistance({ itemCenter: -900, center: 500, maxDistance: 250 })).toBe(-2);
    expect(normalizedDistance({ itemCenter: 625, center: 500, maxDistance: 250 })).toBeCloseTo(0.5, 5);
  });
});
