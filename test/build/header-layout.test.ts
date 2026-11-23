import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const header = readFileSync('src/components/Header.astro', 'utf8');
const socialLinks = readFileSync('src/components/SocialLinks.astro', 'utf8');

const headerStyles = header.match(/<style>([\s\S]*?)<\/style>/)![1];
const socialStyles = socialLinks.match(/<style>([\s\S]*?)<\/style>/)![1];

const rule = (css: string, selector: string) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => match[1].split(',').some((part) => part.trim() === selector))
    .map((match) => match[2])
    .join(' ');

const mediaBlock = (css: string, query: string) => {
  const start = css.indexOf(`@media ${query}`);
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  return '';
};

describe('fila del header', () => {
  it('es una sola fila sin salto de linea en la ranura de redes ni en las redes', () => {
    expect(rule(headerStyles, '.site-header-social')).not.toContain('wrap');
    expect(rule(headerStyles, '.site-header-list')).not.toContain('wrap');
    expect(rule(socialStyles, '.social-links')).not.toContain('wrap');
    expect(rule(socialStyles, '.social-links')).toContain('gap: 10px');
  });

  it('las dos ranuras laterales miden 240px desde 1024px, sin ocultar la ranura de redes', () => {
    const desktop = mediaBlock(headerStyles, '(min-width: 1024px)');
    expect(rule(desktop, '.header-brand')).toContain('width: 240px');
    expect(rule(desktop, '.site-header-social')).toContain('width: 240px');
    expect(headerStyles).not.toMatch(/\(max-width: 1279px\)/);
    const mobile = mediaBlock(headerStyles, '(max-width: 1023px)');
    const outsideMobile = headerStyles.replace(mobile, '');
    expect(rule(outsideMobile, '.site-header-social')).not.toContain('display: none');
  });

  it('las ranuras de 240px no se encogen para que el nav quede centrado', () => {
    expect(rule(headerStyles, '.header-brand')).toContain('flex-shrink: 0');
    expect(rule(headerStyles, '.site-header-social')).toContain('flex-shrink: 0');
  });

  it('la lista de la ranura derecha es una sola lista flex con 14px entre elementos', () => {
    expect(header).toContain('class="site-header-list"');
    const list = rule(headerStyles, '.site-header-list');
    expect(list).toContain('display: flex');
    expect(list).toContain('gap: 14px');
  });

  it('la pildora de empresa mide lo mismo que las pildoras del menu', () => {
    const company = rule(headerStyles, '.company-pill');
    expect(company).not.toContain('--social');
    expect(company).not.toContain('height');
  });

  it('el nav usa el mismo espacio entre pildoras en todos los anchos de escritorio', () => {
    expect(rule(headerStyles, '.site-nav-list')).toContain('gap: 14px');
    expect(mediaBlock(headerStyles, '(min-width: 1024px) and (max-width: 1279px)')).toBe('');
  });
});
