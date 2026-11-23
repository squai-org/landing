import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { serviceSchema } from '../../src/content/schema';
import { sessionsOf } from '../../src/lib/syllabus-sessions';
import { normalizedDistance, slideTransform, sessionSlideMotion } from '../../src/lib/session-carousel';

const root = path.join(import.meta.dirname, '../..');

const loadRaw = async () => JSON.parse(await readFile(path.join(root, 'src/content/services/squai-one.json'), 'utf8'));

const loadSyllabus = async () => serviceSchema.parse(await loadRaw()).syllabus!;

describe('sesiones del temario', () => {
  it('reparte los modulos en ocho sesiones numeradas de corrido', async () => {
    const sessions = sessionsOf(await loadSyllabus());

    expect(sessions.map((session) => session.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(sessions.map((session) => session.moduleNumber)).toEqual([1, 2, 2, 3, 4, 5, 5, 6]);
  });

  it('cada sesion conserva su foco aprobado como titulo', async () => {
    const syllabus = await loadSyllabus();
    const sessions = sessionsOf(syllabus);

    expect(sessions.map((session) => session.focus)).toEqual(syllabus.modules.flatMap((module) => module.sessions));
  });

  it('no pierde ningun tema del temario al repartirlos', async () => {
    const syllabus = await loadSyllabus();
    const sessions = sessionsOf(syllabus);

    syllabus.modules.forEach((module, index) => {
      const own = sessions.filter((session) => session.moduleNumber === index + 1);
      expect(own.flatMap((session) => session.topics)).toEqual(module.topics);
    });
  });

  it('las ocho sesiones tienen una ilustracion distinta', async () => {
    const sessions = sessionsOf(await loadSyllabus());

    expect(new Set(sessions.map((session) => session.illustration)).size).toBe(8);
    expect(sessions.every((session) => session.alt.length > 0)).toBe(true);
  });

  it('reparte los temas cuando sobran o faltan frente a las sesiones', () => {
    const base = { d: 'd', illustration: '/illustrations/sesiones/sesion-1.svg', alt: 'a' } as const;
    const syllabus = {
      modules: [
        { ...base, t: 'A', topics: ['1', '2', '3'], sessions: ['x', 'y'] },
        { ...base, t: 'B', topics: ['1'], sessions: ['x', 'y'] },
      ],
    } as Parameters<typeof sessionsOf>[0];

    expect(sessionsOf(syllabus).map((session) => session.topics)).toEqual([['1', '2'], ['3'], ['1'], ['1']]);
  });
});

describe('esquema de las sesiones y la presentacion', () => {
  it('acepta ilustraciones propias por sesion y las nuevas del carrusel', async () => {
    const raw = await loadRaw();
    raw.syllabus.modules[1].sessionArt = [
      { illustration: '/illustrations/sesiones/sesion-3.svg', alt: 'Persona escribe en su celular' },
      { illustration: '/illustrations/sesiones/sesion-6.svg', alt: 'Persona junto a un escudo' },
    ];

    expect(serviceSchema.safeParse(raw).success).toBe(true);
  });

  it('las etiquetas de las flechas llevan valor por defecto', async () => {
    const syllabus = await loadSyllabus();

    expect(syllabus.prevLabel).toBe('Ver sesiones anteriores');
    expect(syllabus.nextLabel).toBe('Ver sesiones siguientes');
  });

  it('el video admite texto lateral, boton y logos opcionales', async () => {
    const raw = await loadRaw();
    const parsed = serviceSchema.parse(raw);

    expect(parsed.video?.lead).toBeTruthy();
    expect(parsed.video?.body).toBeTruthy();
    expect(parsed.video?.cta?.target).toBe('equipo-one');
    expect(parsed.video?.logos?.length).toBeGreaterThan(0);

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
