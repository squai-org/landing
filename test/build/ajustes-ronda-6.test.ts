import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.join(import.meta.dirname, '../..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const styleOf = (source: string) => [...source.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join('\n');
const rulesOf = (css: string, selector: string) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => (match[1] ?? '').split(',').some((part) => part.trim() === selector))
    .map((match) => match[2] ?? '');

describe('franja inferior del pie', () => {
  const footer = read('src/components/Footer.astro');
  const css = styleOf(footer);

  it('tiene el padding de landing-design: 20px arriba y abajo en movil y 24px desde 640px, sin reservar hueco para los botones flotantes', () => {
    const [mobile, wide] = rulesOf(css, '.footer-bottom');
    expect(mobile).toContain('padding: 20px var(--gutter);');
    expect(wide).toContain('padding: 24px 96px;');
    expect(footer).not.toContain('--float-clearance');
  });

  it('nadie define un hueco para los botones flotantes que el pie ya no usa', () => {
    expect(read('src/styles/motion.css')).not.toContain('--float-clearance');
    expect(read('src/components/WhatsAppButton.astro')).not.toContain('--float-clearance');
  });

  it('el texto es de 14px con 20px de interlineado, como text-sm', () => {
    const [inner] = rulesOf(css, '.footer-bottom-inner');
    expect(inner).toContain('font-size: 14px;');
    expect(inner).toContain('line-height: 20px;');
  });
});

describe('animacion del hero de la pagina principal', () => {
  const hero = read('src/components/Hero.astro');

  it('no tiene boton propio de pausa', () => {
    expect(hero).not.toContain('hero-animation-toggle');
    expect(hero).not.toContain('animation-paused');
  });

  it('la escritura de palabras solo avanza mientras el boton flotante no la pausa y no hay movimiento reducido', () => {
    expect(hero).toMatch(/import \{[^}]*\bmotionAllowed\b[^}]*\} from '\.\.\/lib\/motion'/);
    expect(hero).toMatch(/if \(motionAllowed\(\)\) remaining -= now - previous;/);
  });
});

const ownerFacts = [
  ['Programa virtual con sesiones en vivo', 'Entras desde donde estés a sesiones en directo, sin videos pregrabados.'],
  ['Terminas en 4 semanas', 'Son 2 sesiones por semana, de 2 horas y media cada una, con tiempo para practicar.'],
  ['Sesiones grabadas', 'Si faltas a una sesión, la ves grabada y no te quedas atrás.'],
  ['Sin conocimientos previos', 'No necesitas haber usado la IA antes, porque explicamos todo desde las bases y sin palabras raras.'],
  ['Grupo de máximo 30 personas', 'Aprendes en comunidad y con casos de otras personas, y cada sesión tiene espacio para tus dudas.'],
  ['Comunidad en WhatsApp', 'Resuelves tus dudas entre sesiones y aprendes también de las preguntas de las demás personas.'],
  ['Fundamentos que sirven con cualquier IA', 'Entiendes cómo funciona la IA, así que no dependes de una sola aplicación.'],
  ['Mentores que saben explicar y aplicar', 'Combinamos años dando clase con años en empresas, así que te explicamos cómo usar la IA en la práctica.'],
  ['Guías y recursos', 'Material de apoyo para repasar por tu cuenta.'],
  ['Certificado al terminar', 'Lo sumas a tu hoja de vida o lo guardas como prueba de un reto cumplido.'],
];

describe('Lo que necesitas saber (Squai One)', () => {
  const one = JSON.parse(read('src/content/services/squai-one.json')) as {
    keyFacts: { cards: { title: string; description: string; illustration: string }[] };
  };
  const cards = one.keyFacts.cards;

  it('tiene las 10 tarjetas del dueno, en su orden y sin punto final en el titulo', () => {
    expect(cards.map((card) => [card.title, card.description])).toEqual(ownerFacts);
  });

  it('cada tarjeta tiene una ilustracion distinta que existe en public/', () => {
    const illustrations = cards.map((card) => card.illustration);
    expect(new Set(illustrations).size).toBe(10);
    for (const illustration of illustrations) expect(() => read(`public${illustration}`)).not.toThrow();
  });

  it('el contrato editorial y el CMS admiten las tarjetas con su ilustracion', () => {
    const schema = read('src/content/schema.ts');
    expect(schema).toMatch(/cards: z\.array\(z\.object\(\{ title: text, description: text, illustration: z\.enum\(factIllustrations\) \}\)\)/);
    const cms = read('.pages.yml');
    const keyFacts = cms.slice(cms.indexOf('- name: keyFacts'));
    expect(keyFacts.slice(0, keyFacts.indexOf('- name: one-tarjeta'))).toContain('- name: cards');
  });

  it('las ilustraciones nuevas no llevan comentarios del generador', () => {
    for (const card of cards) expect(read(`public${card.illustration}`)).not.toMatch(/<!--|<metadata|<desc/);
  });

  it('reutiliza el carrusel de Sesiones en lugar de duplicarlo', () => {
    const facts = read('src/components/OneKeyFacts.astro');
    const syllabus = read('src/components/Syllabus.astro');
    for (const source of [facts, syllabus]) {
      expect(source).toContain('<CarouselArrows');
      expect(source).toMatch(/import \{ bindSessionCarousels \} from '\.\.\/lib\/session-carousel-client'/);
    }
    expect(syllabus).not.toContain("track.addEventListener('pointerdown'");
  });
});
