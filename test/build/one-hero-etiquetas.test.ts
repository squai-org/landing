import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const hero = readFileSync(path.join(import.meta.dirname, '../../src/components/OneHero.astro'), 'utf8').replace(/\r\n/g, '\n');

const block = (opening: string) => {
  const start = hero.indexOf(`${opening} {`);
  if (start < 0) return '';
  let depth = 0;
  for (let index = hero.indexOf('{', start); index < hero.length; index += 1) {
    if (hero[index] === '{') depth += 1;
    if (hero[index] === '}') depth -= 1;
    if (depth === 0) return hero.slice(start, index + 1);
  }
  return '';
};

const rule = (css: string, selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
};

const mobile = block('@media (max-width: 1023px)');
const lowStage = block('@container (max-height: 199px)');

describe('etiquetas del hero de Squai One en movil y tablet', () => {
  it('van juntas en un solo grupo dentro de la foto, para no pisarse entre ellas', () => {
    expect(hero).toMatch(/<div class="one-hero-tags">\s*<p class="one-hero-tag one-hero-tag-note">\{hero\.note\}<\/p>\s*<p class="one-hero-tag one-hero-tag-sticker">\{hero\.sticker\}<\/p>\s*<\/div>/);
    const group = rule(mobile, '.one-hero-tags');
    expect(group).toMatch(/display: flex;/);
    expect(group).toMatch(/flex-direction: column;/);
    expect(rule(mobile, '.one-hero-tag')).toMatch(/position: static;/);
  });

  it('empiezan por debajo de la linea de los hombros, medida sobre el alto de la foto', () => {
    const top = /top: calc\(var\(--photo-h\) \* (0\.\d+)\);/.exec(rule(mobile, '.one-hero-tags'));
    expect(top).not.toBeNull();
    expect(Number(top![1])).toBeGreaterThanOrEqual(0.45);
    expect(Number(top![1])).toBeLessThanOrEqual(0.5);
  });

  it('terminan sobre el torso, medido sobre el ancho de la foto y no sobre el escenario', () => {
    const group = rule(mobile, '.one-hero-tags');
    const right = /right: calc\(var\(--photo-w\) \* (0\.\d+)\);/.exec(group);
    expect(right).not.toBeNull();
    expect(group).toMatch(new RegExp(`width: calc\\(100cqw - var\\(--photo-right\\) - var\\(--photo-w\\) \\* ${right![1]} - var\\(--hero-x\\) - \\d+px\\);`));
    expect(group).not.toMatch(/(top|right): \d+%/);
  });

  it('su ancho va del margen izquierdo de la pantalla al torso y el texto puede partirse', () => {
    const group = rule(mobile, '.one-hero-tags');
    expect(group).toMatch(/width: calc\(100cqw - var\(--photo-right\) - [^;]*var\(--photo-w\)[^;]*var\(--hero-x\)[^;]*\);/);
    const tag = rule(mobile, '.one-hero-tag');
    expect(tag).toMatch(/max-width: 100%;/);
    expect(tag).toMatch(/white-space: normal;/);
  });

  it('la geometria de la foto se calcula una vez y la usan la foto y las etiquetas', () => {
    const person = rule(mobile, '.one-hero-person');
    expect(person).toMatch(/--photo-w: calc\(var\(--photo-h\) \* 768 \/ 1050\);/);
    expect(person).toMatch(/right: var\(--photo-right\);/);
    expect(person).toMatch(/height: var\(--photo-h\);/);
  });

  it('su texto se escala con la unidad local del hero, no con el ancho de la pantalla', () => {
    const scaled = rule(block('@media (max-width: 991px)'), '.one-hero');
    expect(scaled).toMatch(/--fs-tag: max\(15px, calc\(var\(--u\) \* 16\)\);/);
  });

  it('el escenario reserva un alto minimo para las etiquetas', () => {
    const stage = rule(mobile, '.one-hero-stage');
    expect(stage).toMatch(/min-height: \d+px;/);
    expect(stage).not.toMatch(/min-height: 0;/);
  });
});

describe('escenario bajo del hero de Squai One', () => {
  it('con menos de 200px de alto oculta la foto', () => {
    expect(lowStage).not.toBe('');
    expect(rule(lowStage, '.one-hero-photo')).toMatch(/display: none;/);
  });

  it('las etiquetas pasan a flujo normal debajo del horario, en fila', () => {
    expect(rule(lowStage, '.one-hero-person')).toMatch(/position: static;/);
    const group = rule(lowStage, '.one-hero-tags');
    expect(group).toMatch(/position: static;/);
    expect(group).toMatch(/flex-direction: row;/);
    expect(group).toMatch(/flex-wrap: wrap;/);
    expect(group).toMatch(/padding: 0 var\(--gutter\) 0 var\(--hero-x\);/);
  });
});

describe('etiquetas del hero de Squai One en escritorio', () => {
  const desktop = block('@media (min-width: 1024px)');

  it('el grupo no altera la ubicacion de diseno de cada etiqueta', () => {
    expect(rule(hero, '.one-hero-tags')).toMatch(/display: contents;/);
    expect(rule(desktop, '.one-hero-tag-note')).toMatch(/left: -10%; top: 56%;/);
    expect(rule(desktop, '.one-hero-tag-sticker')).toMatch(/left: 59%; top: 70%;/);
    expect(rule(desktop, '.one-hero-tag')).toMatch(/white-space: nowrap;/);
  });
});

describe('etiqueta sticker del hero de Squai One', () => {
  it('desde movil lleva mas padding y un radio redondeado proporcional, no de pildora', () => {
    const sticker = rule(hero, '.one-hero-tag-sticker');

    expect(sticker).toMatch(/padding: calc\(var\(--u\) \* 14\) calc\(var\(--u\) \* 24\);/);
    expect(sticker).toMatch(/border-radius: calc\(var\(--u\) \* 28\);/);
    expect(sticker).not.toMatch(/9999px/);
    expect(rule(block('@media (min-width: 640px)'), '.one-hero-tag-sticker')).toBe('');
  });

  it('en escritorio, que envuelve el texto, mantiene el mismo criterio con mas aire', () => {
    const sticker = rule(block('@media (min-width: 1024px)'), '.one-hero-tag-sticker');

    expect(sticker).toMatch(/padding: calc\(var\(--u\) \* 18\) calc\(var\(--u\) \* 32\);/);
    expect(sticker).toMatch(/border-radius: calc\(var\(--u\) \* 32\);/);
    expect(sticker).toMatch(/max-width: calc\(var\(--u\) \* 390\);/);
  });
});
