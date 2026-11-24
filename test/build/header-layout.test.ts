import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const header = readFileSync('src/components/Header.astro', 'utf8');
const socialLinks = readFileSync('src/components/SocialLinks.astro', 'utf8');

const headerStyles = header.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
const socialStyles = socialLinks.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';

const rule = (css: string, selector: string) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => (match[1] ?? '').split(',').some((part) => part.trim() === selector))
    .map((match) => match[2] ?? '')
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
    expect(rule(desktop, '.header-brand')).toContain('flex: 0 1 240px');
    expect(rule(desktop, '.site-header-social')).toContain('flex: 0 1 240px');
    const mobile = mediaBlock(headerStyles, '(max-width: 1023px)');
    const outsideMobile = headerStyles.replace(mobile, '');
    expect(rule(outsideMobile, '.site-header-social')).not.toContain('display: none');
  });

  it('las ranuras ceden ancho a la vez si el nav no cabe, sin sacar las redes de la pantalla', () => {
    expect(rule(headerStyles, '.header-brand')).not.toContain('flex-shrink: 0');
    expect(rule(headerStyles, '.site-header-social')).not.toContain('flex-shrink: 0');
    expect(rule(headerStyles, '.site-nav')).not.toContain('flex-shrink: 1');
  });

  it('desde 1280px la ranura derecha no crece con su contenido para que el nav quede centrado', () => {
    const wide = mediaBlock(headerStyles, '(min-width: 1280px)');
    expect(rule(wide, '.site-header-social')).toContain('min-width: 0');
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

  it('el CTA de la barra solo se ve por debajo de 1024px y el panel del menu movil no lo repite', () => {
    const mobile = mediaBlock(headerStyles, '(max-width: 1023px)');
    const outsideMobile = headerStyles.replace(mobile, '');
    expect(rule(outsideMobile, '.header-bar-cta')).toContain('display: none');
    expect(rule(mobile, '.header-bar-cta')).toContain('display: inline-flex');
    expect(rule(mobile, '.nav-cta-wrap')).toContain('display: none');
  });

  it('el CTA de la barra se alinea a la derecha junto al menu y queda sobre el fondo del menu abierto', () => {
    const mobile = mediaBlock(headerStyles, '(max-width: 1023px)');
    const bar = rule(mobile, '.header-bar-cta');
    expect(bar).toContain('margin-left: auto');
    expect(bar).toContain('z-index: 2');
  });

  it('por debajo de 640px el boton de menu es solo icono y su texto sigue como nombre accesible', () => {
    const phone = mediaBlock(headerStyles, '(max-width: 639px)');
    const hiddenText = rule(phone, '.nav-toggle .btn-text');
    expect(hiddenText).toContain('position: absolute');
    expect(hiddenText).toContain('clip: rect(0 0 0 0)');
    expect(hiddenText).not.toContain('display: none');
    expect(hiddenText).not.toContain('visibility: hidden');
    const tablet = mediaBlock(headerStyles, '(max-width: 1023px)');
    expect(rule(tablet, '.nav-toggle .btn-text')).toBe('');
  });

  it('el nav usa 14px entre pildoras y solo lo reduce entre 1024px y 1279px para que quepan las redes', () => {
    expect(rule(headerStyles, '.site-nav-list')).toContain('gap: 14px');
    const tight = mediaBlock(headerStyles, '(min-width: 1024px) and (max-width: 1279px)');
    expect(rule(tight, '.site-nav-list')).toContain('gap: 8px');
    expect(tight).not.toContain('display: none');
  });
  it('por debajo de 1024px el navbar oculto sube fuera de la pantalla con transicion, y en escritorio no se oculta', () => {
    const mobile = mediaBlock(headerStyles, '(max-width: 1023px)');
    expect(rule(mobile, ".site-header[data-hidden='true']")).toContain('translate: 0 -100%');
    expect(rule(mobile, '.site-header')).toContain('transition: translate');
    expect(headerStyles.replace(mobile, '')).not.toContain('data-hidden');
  });

  it('con movimiento reducido el navbar aparece y se oculta sin transicion', () => {
    const reduced = mediaBlock(headerStyles, '(prefers-reduced-motion: reduce)');
    expect(rule(reduced, '.site-header')).toContain('transition: none');
  });
});
