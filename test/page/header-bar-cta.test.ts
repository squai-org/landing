import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const dist = path.join(import.meta.dirname, '../../dist');
const page = (file: string) => readFile(path.join(dist, file), 'utf8');

const headerOf = (html: string) => {
  const start = html.indexOf('<header class="site-header');
  return html.slice(start, html.indexOf('</header>', start));
};

const ctaElement = (header: string, className: string) => {
  const open = new RegExp(`<(a|button)\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`).exec(header);
  if (!open) return undefined;
  const tag = open[1];
  const end = header.indexOf(`</${tag}>`, open.index);
  return { open: open[0], body: header.slice(open.index, end) };
};

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
const label = (body: string) => /data-split-text[^>]*>([^<]*)</.exec(body)?.[1];

describe('CTA de la barra compacta del header', () => {
  it.each([
    ['index.html', 'Empieza aquí', 'primary', { href: '/#servicios', 'data-scroll-to': 'servicios' }],
    ['terminos-de-servicio.html', 'Empieza aquí', 'primary', { href: '/#servicios', 'data-scroll-to': 'servicios' }],
    ['politica-de-privacidad.html', 'Empieza aquí', 'primary', { href: '/#servicios', 'data-scroll-to': 'servicios' }],
    ['servicios/squai-grow.html', 'Agenda tu llamada', 'primary', { 'data-open-modal': 'grow' }],
    ['servicios/squai-learn.html', 'Agenda tu llamada', 'primary', { 'data-open-modal': 'learn' }],
    ['servicios/squai-one.html', 'Inscribirme', 'dark', { href: '#inscripcion', 'data-scroll-to': 'inscripcion' }],
  ])('%s muestra "%s" con la variante %s y el mismo destino que el CTA de escritorio', async (file, text, variant, target) => {
    const header = headerOf(await page(file));
    const bar = ctaElement(header, 'header-bar-cta');
    const desktop = ctaElement(header, 'nav-cta');
    expect(bar).toBeDefined();
    expect(desktop).toBeDefined();
    expect(label(bar!.body)).toBe(text);
    expect(label(desktop!.body)).toBe(text);
    expect(attr(bar!.open, 'class')?.split(' ')).toContain(`btn-${variant}`);
    for (const [name, value] of Object.entries(target)) {
      expect(attr(bar!.open, name)).toBe(value);
      expect(attr(desktop!.open, name)).toBe(value);
    }
  });

  it('el CTA de la barra es solo texto y el de escritorio conserva la flecha', async () => {
    for (const file of ['index.html', 'servicios/squai-grow.html', 'servicios/squai-one.html']) {
      const header = headerOf(await page(file));
      const bar = ctaElement(header, 'header-bar-cta')!;
      const desktop = ctaElement(header, 'nav-cta')!;
      expect(bar.body).not.toContain('btn-arrow');
      expect(attr(bar.open, 'class')?.split(' ')).not.toContain('btn-split');
      expect(desktop.body).toContain('btn-arrow');
    }
  });

  it('la barra queda en el orden logo, CTA y boton de menu, fuera del panel del menu', async () => {
    const header = headerOf(await page('servicios/squai-grow.html'));
    const logo = header.indexOf('header-logo');
    const bar = header.indexOf('header-bar-cta');
    const toggle = header.indexOf('data-nav-toggle');
    const panel = header.indexOf('data-nav-panel');
    expect(logo).toBeLessThan(bar);
    expect(bar).toBeLessThan(toggle);
    expect(bar).toBeLessThan(panel);
  });

  it('el boton de menu conserva su nombre accesible "Menú"', async () => {
    const header = headerOf(await page('index.html'));
    const toggle = /<button[^>]*data-nav-toggle[\s\S]*?<\/button>/.exec(header)?.[0] ?? '';
    expect(/data-nav-toggle-label[^>]*>([^<]*)</.exec(toggle)?.[1]).toBe('Menú');
  });
});
