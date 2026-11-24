import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(path.join(import.meta.dirname, '../..', file), 'utf8').replace(/\r\n/g, '\n');

const hero = read('src/components/OneHero.astro');

const mediaBlock = (query: string) => {
  const start = hero.indexOf(`@media ${query} {`);
  if (start < 0) return '';
  let depth = 0;
  for (let index = hero.indexOf('{', start); index < hero.length; index += 1) {
    if (hero[index] === '{') depth += 1;
    if (hero[index] === '}') depth -= 1;
    if (depth === 0) return hero.slice(start, index + 1);
  }
  return '';
};

const rule = (block: string, selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped} \\{([^}]*)\\}`).exec(block)?.[1] ?? '';
};

const mobile = mediaBlock('(max-width: 1023px)');

describe('hero de Squai One a pantalla completa en movil y tablet', () => {
  it('mide una pantalla con un minimo de 560px, para crecer en celulares horizontales', () => {
    const section = rule(mobile, '.one-hero');
    expect(section).toMatch(/height: 100svh;/);
    expect(section).toMatch(/min-height: 560px;/);
  });

  it('el escenario de la foto ocupa el alto restante y es un contenedor de tamano', () => {
    const stage = rule(mobile, '.one-hero-stage');
    expect(stage).toMatch(/flex: 1;/);
    expect(stage).toMatch(/container-type: size;/);
  });

  it('la foto se apoya abajo y su alto es el menor entre el escenario y lo que permite el ancho', () => {
    const person = rule(mobile, '.one-hero-person');
    expect(person).toMatch(/bottom: 0;/);
    expect(person).toMatch(/--photo-h: min\(100cqh, calc\(100cqw \* 1050 \/ 768\)\);/);
    expect(person).toMatch(/height: var\(--photo-h\);/);
  });

  it('la foto no se desplaza con el scroll', () => {
    expect(rule(mobile, '.one-hero-person')).toMatch(/translate: none;/);
  });

  it('en escritorio la foto baja con el scroll y su base sube lo mismo que baja, para no recortarse', () => {
    const range = /scrollRange\(hero, 'start-start', \[(-?\d+), (-?\d+)\]/.exec(hero);
    expect(range).not.toBeNull();
    expect([Number(range![1]), Number(range![2])]).toEqual([0, 1]);
    expect(hero).toMatch(/setProperty\('--person-progress'/);
    const desktop = rule(mediaBlock('(min-width: 1024px)'), '.one-hero-person');
    expect(desktop).toMatch(/--person-drift: calc\(var\(--u\) \* \d+\);/);
    expect(desktop).toMatch(/bottom: var\(--person-drift\);/);
    expect(desktop).toMatch(/translate: -50% calc\(var\(--person-progress, 0\) \* var\(--person-drift\)\);/);
  });

  it('el titulo arranca bajo el navbar con un respiro de 24 a 32px', () => {
    const copy = rule(mobile, '.one-hero-copy');
    expect(copy).toMatch(/padding-top: calc\(var\(--header-pt\) \+ var\(--pill-h\) \+ clamp\(24px, [^;]+, 32px\)\);/);
  });

  it('el titulo y los espacios se escalan con el menor entre el ancho y el alto', () => {
    const section = rule(mobile, '.one-hero');
    expect(section).toMatch(/--hero-fit: max\(100svh, 560px\);/);
    const phone = rule(mediaBlock('(max-width: 767px)'), '.one-hero');
    expect(phone).toMatch(/--u: min\(calc\(100vw \/ 402\), calc\(var\(--hero-fit\) \/ \d+\)\);/);
    expect(phone).toMatch(/--fs-h1: calc\(var\(--u\) \* 52\);/);
    const tablet = rule(mediaBlock('(min-width: 768px) and (max-width: 991px)'), '.one-hero');
    expect(tablet).toMatch(/--u: min\(calc\(100vw \/ 834\), calc\(var\(--hero-fit\) \/ \d+\)\);/);
    expect(tablet).toMatch(/--fs-h1: calc\(var\(--u\) \* 96\);/);
    const scaled = rule(mediaBlock('(max-width: 991px)'), '.one-hero');
    expect(scaled).toMatch(/--hero-gap-title: calc\(var\(--u\) \* 16\);/);
    expect(scaled).toMatch(/--btn-h: max\(44px, calc\(var\(--u\) \* 48\)\);/);
  });

  it('el texto de cuerpo nunca baja de 16px', () => {
    expect(rule(hero, '.one-hero-lead')).toMatch(/font-size: var\(--hero-p-fs\);/);
    const scaled = rule(mediaBlock('(max-width: 991px)'), '.one-hero');
    expect(scaled).toMatch(/--hero-p-fs: max\(16px, calc\(var\(--u\) \* 18\)\);/);
    expect(scaled).toMatch(/--fs-small: max\(16px, calc\(var\(--u\) \* 16\)\);/);
    expect(scaled).toMatch(/--btn-fs: max\(16px, /);
    expect(mobile).not.toMatch(/\.one-hero-(lead|schedule) \{[^}]*font-size/);
  });
});
