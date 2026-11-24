import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { serviceSchema } from '../../src/content/schema';

const root = path.join(import.meta.dirname, '../..');
const read = async (file: string) => (await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');
const loadOne = async () => JSON.parse(await read('src/content/services/squai-one.json')) as Record<string, unknown>;
const parseOne = async () => serviceSchema.parse(await loadOne());

const formOf = async (node: string) => {
  const pages = await read('.pages.yml');
  const start = pages.indexOf(`- name: ${node}`);
  expect(start).toBeGreaterThan(-1);
  const end = pages.indexOf('\n      - name:', start + 10);
  return end === -1 ? pages.slice(start) : pages.slice(start, end);
};

describe('Que vas a lograr', () => {
  it('los datos son los de landing-design', async () => {
    const { outcomes } = await parseOne();
    expect(outcomes?.title).toBe('Lo que vas a lograr.');
    expect(outcomes?.pills).toEqual([
      'Pedirle bien a la IA',
      'Revisar lo que responde',
      'Cuidar tus datos',
      'Elegir la herramienta',
      'Armar tus rutinas',
    ]);
  });

  it('es opcional: los servicios sin la seccion siguen validando', async () => {
    const { outcomes: _outcomes, ...rest } = await loadOne();
    expect(serviceSchema.safeParse(rest).success).toBe(true);
  });

  it('exige al menos una etiqueta', async () => {
    const outcomes = { title: 'T', lead: 'L', pills: [] };
    expect(serviceSchema.safeParse({ ...(await loadOne()), outcomes }).success).toBe(false);
  });

  it('el CMS edita los mismos campos', async () => {
    const form = await formOf('one-logros');
    for (const field of ['outcomes', 'title', 'lead', 'pills']) expect(form).toContain(`- name: ${field}`);
  });
});

describe('Franja de datos', () => {
  it('las dos cintas tienen contenido', async () => {
    const { marquee } = await parseOne();
    expect(marquee?.lineA.length).toBeGreaterThan(0);
    expect(marquee?.lineB).toEqual([
      '8 sesiones en vivo',
      'Grabación de cada clase',
      'Guía por sesión',
      'Certificado',
      'PSE, Nequi, Bancolombia o tarjeta',
    ]);
  });

  it('fecha y horario salen de la cohorte, no del texto editorial', async () => {
    const { marquee } = await parseOne();
    expect(marquee?.lineA.map((item) => item.cohort)).toEqual(['dates', 'schedule']);
    expect(marquee?.lineA.every((item) => item.text === undefined)).toBe(true);
  });

  it('un item sin texto ni cohorte se rechaza', async () => {
    const marquee = { lineA: [{ text: '', cohort: '' }], lineB: ['x'] };
    expect(serviceSchema.safeParse({ ...(await loadOne()), marquee }).success).toBe(false);
  });

  it('el CMS edita los mismos campos', async () => {
    const form = await formOf('one-franja');
    for (const field of ['marquee', 'title', 'lineA', 'lineB', 'text', 'cohort']) expect(form).toContain(`- name: ${field}`);
  });
});

describe('Mentores: sello, cita y cifras', () => {
  it('cada fundador tiene sello y cita', async () => {
    const { team } = await parseOne();
    expect(team?.mentors?.map((mentor) => mentor.name)).toEqual(['Laura Villada', 'Sebastián Rico']);
    expect(team?.mentors?.map((mentor) => mentor.badge)).toEqual(['Cofundadora', 'Cofundador']);
    expect(team?.mentors?.every((mentor) => mentor.quote.length > 0)).toBe(true);
  });

  it('son tres cifras con su etiqueta', async () => {
    const { team } = await parseOne();
    expect(team?.stats).toEqual([
      { value: '1.200+', label: 'personas formadas' },
      { value: '85', label: 'charlas dictadas' },
      { value: '30', label: 'organizaciones atendidas' },
    ]);
  });

  it('sello, cita y cifras son opcionales', async () => {
    expect(serviceSchema.safeParse({ ...(await loadOne()), team: { title: 'T', closing: 'C' } }).success).toBe(true);
  });

  it('el CMS edita los mismos campos', async () => {
    const form = await formOf('one-equipo');
    for (const field of ['mentors', 'badge', 'quote', 'stats', 'value', 'label']) expect(form).toContain(`- name: ${field}`);
  });
});

describe('orden de las secciones en la pagina', () => {
  it('sigue el de landing-design', async () => {
    const page = await read('src/pages/servicios/[slug].astro');
    const at = (needle: string) => {
      const index = page.indexOf(needle);
      expect(index, needle).toBeGreaterThan(-1);
      return index;
    };
    const order = ['<AudienceFit', '<OneOutcomes', '<HowItWorks', '<Syllabus', '<OneMarquee', '<OneTeam', '<OneTestimonials'].map(at);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});

describe('Que vas a lograr: componente', () => {
  it('se identifica y se etiqueta con su titulo', async () => {
    const source = await read('src/components/OneOutcomes.astro');
    expect(source).toContain('id="logros"');
    expect(source).toContain('aria-labelledby="one-outcomes-title"');
    expect(source).toContain('id="one-outcomes-title"');
  });

  it('el escenario conserva la proporcion del diseno', async () => {
    const source = await read('src/components/OneOutcomes.astro');
    expect(source).toContain('aspect-ratio: 1840 / 760');
    expect(source).toContain('aspect-ratio: 834 / 560');
    expect(source).toContain('aspect-ratio: 402 / 570');
  });

  it('entra con el resorte del motor, retardo de 72 ms y margen del 25 % superior', async () => {
    const source = await read('src/components/OneOutcomes.astro');
    expect(source).toContain('springs.outcomeLabel');
    expect(source).toContain('* 0.072');
    expect(source).toContain("'0px 0px -75% 0px'");
  });

  it('el texto de la etiqueta usa --fs-h2 como la regla sin capa del diseno y no redefine tokens', async () => {
    const source = await read('src/components/OneOutcomes.astro');
    const text = source.slice(source.indexOf('.outcome-text {'), source.indexOf('}', source.indexOf('.outcome-text {')));
    expect(text).toContain('font-size: var(--fs-h2)');
    expect(source).not.toMatch(/--(fs-label|label-r|label-px|label-py):/);
  });

  it('respeta el movimiento reducido y solo empuja con puntero fino', async () => {
    const source = await read('src/components/OneOutcomes.astro');
    expect(source).toContain('prefersReducedMotion');
    expect(source).toContain('(hover: hover) and (pointer: fine)');
  });
});

describe('Franja de datos: componente', () => {
  it('inclina las cintas -1.8 y 1.4 grados con 26 y 30 segundos', async () => {
    const source = await read('src/components/OneMarquee.astro');
    expect(source).toMatch(/tilt=\{-1\.8\}/);
    expect(source).toMatch(/tilt=\{1\.4\}/);
    expect(source).toMatch(/duration=\{26\}/);
    expect(source).toMatch(/duration=\{30\}/);
    expect(source).toContain('reverse');
  });

  it('reutiliza el Marquee comun en lugar de duplicarlo', async () => {
    expect(await read('src/components/OneMarquee.astro')).toContain("import Marquee from './Marquee.astro'");
  });

  it('la seccion lleva nombre accesible', async () => {
    expect(await read('src/components/OneMarquee.astro')).toContain('aria-labelledby=');
  });
});

describe('Mentores: componente', () => {
  it('el sello va girado 6 grados', async () => {
    const source = await read('src/components/OneTeam.astro');
    expect(source).toContain('class="mentor-stamp"');
    expect(source).toMatch(/\.mentor-stamp \{[^}]*rotate: 6deg/);
  });

  it('la cita lleva comillas tipograficas y la fila de cifras es una lista de definiciones', async () => {
    const source = await read('src/components/OneTeam.astro');
    expect(source).toContain('“');
    expect(source).toContain('<dl class="mentor-stats"');
    expect(source).toMatch(/\.mentor-stat:nth-child\(2\) \{[^}]*rotate: -1\.5deg/);
    expect(source).toMatch(/\.mentor-stat:nth-child\(3\) \{[^}]*rotate: 1\.8deg/);
  });
});
