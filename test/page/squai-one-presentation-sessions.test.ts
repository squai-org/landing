import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const dist = path.join(import.meta.dirname, '../../dist');
const root = path.join(import.meta.dirname, '../..');

const sectionOf = (html: string, id: string) => {
  const start = html.indexOf(`<section id="${id}"`);
  if (start === -1) throw new Error(`Sin <section id="${id}"> en el HTML`);
  return html.slice(start, html.indexOf('</section>', start));
};

const count = (fragment: string, pattern: RegExp) => fragment.match(pattern)?.length ?? 0;

const classed = (name: string) => new RegExp(`class="(?:[^"]* )?${name}(?: [^"]*)?"`, 'g');

const publishedCss = async () => {
  const page = await readFile(path.join(dist, 'servicios/squai-one.html'), 'utf8');
  const files = await readdir(path.join(dist, '_astro'));
  const sheets = await Promise.all(files.filter((file) => file.endsWith('.css')).map((file) => readFile(path.join(dist, '_astro', file), 'utf8')));
  return [page, ...sheets].join('\n');
};

describe('Squai One: presentacion', () => {
  let page = '';
  let section = '';

  beforeAll(async () => {
    page = await readFile(path.join(dist, 'servicios/squai-one.html'), 'utf8');
    section = sectionOf(page, 'presentacion');
  });

  it('usa la escala --u y el titulo de la escala de la referencia', () => {
    expect(section).toMatch(/<section id="presentacion" class="[^"]*\bone-u\b/);
    expect(section).toMatch(/<h2 [^>]*class="[^"]*\bone-h2\b/);
    expect(section).not.toMatch(/\bd-h2\b/);
  });

  it('pone el texto a la izquierda y la figura a la derecha en una rejilla', () => {
    const grid = section.indexOf('video-grid');
    const copy = section.indexOf('video-copy');
    const figure = section.indexOf('<figure');

    expect(grid).toBeGreaterThan(-1);
    expect(copy).toBeGreaterThan(grid);
    expect(figure).toBeGreaterThan(copy);
  });

  it('muestra el manuscrito, el texto principal, el de apoyo, el boton y los logos', () => {
    expect(section).toContain('Laura y Sebastián te lo cuentan');
    expect(count(section, classed('video-lead'))).toBe(1);
    expect(count(section, classed('video-body'))).toBe(1);
    expect(section).toMatch(/<a [^>]*href="#equipo-one"[^>]*>/);
    expect(section).toContain('Conocer a Laura y Sebastián');
    expect(count(section, classed('video-logo'))).toBe(4);
  });

  it('la figura lleva el titulo y el apunte del pie', () => {
    const figure = section.slice(section.indexOf('<figure'), section.indexOf('</figure>'));

    expect(figure).toContain('Video de presentación');
    expect(figure).toContain('Muy pronto, con subtítulos');
  });

  it('el fondo es la forma que respira de las secciones nuevas', () => {
    expect(count(section, /data-one-backdrop/g)).toBe(1);
    expect(section).not.toMatch(/class="backdrop\b/);
  });

  it('la figura usa el reproductor con interrogacion del paso 3 de Como funciona, el mismo archivo', async () => {
    const figure = section.slice(section.indexOf('<figure'), section.indexOf('</figure>'));
    const step = sectionOf(page, 'como-funciona');

    expect(figure).toMatch(/<img[^>]*class="video-poster"[^>]*src="\/illustrations\/pasos\/paso-4\.svg"/);
    expect(step).toContain('src="/illustrations/pasos/paso-4.svg"');
    const shared = await readFile(path.join(root, 'public/illustrations/pasos/paso-4.svg'), 'utf8');
    expect(existsSync(path.join(root, 'src/assets/illustrations/presentacion-video.svg'))).toBe(false);
    expect(shared).toContain('viewBox="-60 -145 1400 1365"');
  });

  it('dos personajes decorativos rodean la tarjeta, sin texto alternativo y servidos desde el sitio', () => {
    const peeps = [...section.matchAll(/<img[^>]*class="video-peep[^"]*"[^>]*>/g)].map((match) => match[0]);

    expect(peeps).toHaveLength(2);
    const sources = peeps.map((tag) => /src="([^"]+)"/.exec(tag)?.[1]);
    expect(sources).toEqual(['/illustrations/peeps/peep-standing-14.svg', '/illustrations/peeps/peep-standing-30.svg']);
    peeps.forEach((tag) => {
      expect(tag).toMatch(/\balt=""/);
      expect(tag).toMatch(/aria-hidden="true"/);
    });
  });

  it('los personajes miran al lado contrario del dibujo original', async () => {
    const css = await publishedCss();

    expect(css).toMatch(/\.video-peep[^{]*\{[^}]*scale:\s*-1 1|\.video-peep[^{]*\{[^}]*scaleX\(-1\)/);
  });

  it('los archivos de los personajes existen y estan en los creditos con su licencia', async () => {
    const credits = await readFile(path.join(root, 'CREDITOS.md'), 'utf8');

    for (const name of ['peep-standing-14.svg', 'peep-standing-30.svg']) {
      expect((await readFile(path.join(root, 'public/illustrations/peeps', name), 'utf8')).startsWith('<svg')).toBe(true);
      expect(credits).toContain(`public/illustrations/peeps/${name}`);
    }
    expect(credits).toMatch(/CC0/);
  });

  it('sin URL de YouTube muestra la ilustracion con texto alternativo y no el boton de reproducir', () => {
    expect(section).not.toMatch(/data-video-play/);
    expect(section).toMatch(/<img[^>]*\balt="[^"]+"/);
  });
});

describe('Squai One: sesiones en carrusel', () => {
  let page = '';
  let section = '';

  beforeAll(async () => {
    page = await readFile(path.join(dist, 'servicios/squai-one.html'), 'utf8');
    section = sectionOf(page, 'temario');
  });

  it('usa la escala --u y los titulos de la referencia', () => {
    expect(section).toMatch(/<section id="temario" class="[^"]*\bone-u\b/);
    expect(section).toMatch(/<h2 [^>]*class="[^"]*\bone-h2\b/);
    expect(section).not.toMatch(/\bd-h[123]\b/);
  });

  it('el carrusel es una region con ocho tarjetas, teclado y arrastre', () => {
    const track = /<div[^>]*data-sessions-track[^>]*>/.exec(section)?.[0] ?? '';

    expect(track).toContain('role="region"');
    expect(track).toContain('aria-roledescription="carrusel"');
    expect(track).toContain('aria-label="Las 8 sesiones del programa"');
    expect(track).toContain('tabindex="0"');
    expect(count(section, classed('session-slide'))).toBe(8);
  });

  it('las flechas anterior y siguiente tienen nombre y la anterior parte desactivada', () => {
    const arrows = [...section.matchAll(/<button[^>]*class="slider-arrow[^"]*"[^>]*>/g)].map((match) => match[0]);

    expect(arrows).toHaveLength(2);
    expect(arrows[0]).toContain('aria-label="Ver sesiones anteriores"');
    expect(arrows[0]).toContain('disabled');
    expect(arrows[1]).toContain('aria-label="Ver sesiones siguientes"');
  });

  it('cada tarjeta enlaza a la inscripcion con un nombre que dice la sesion', () => {
    const links = [...section.matchAll(/<a[^>]*class="session-slide-link"[^>]*>/g)].map((match) => match[0]);

    expect(links).toHaveLength(8);
    links.forEach((link, index) => {
      expect(link).toContain('href="#inscripcion"');
      expect(link).toContain(`sesión ${index + 1}`);
    });
  });

  it('cada tarjeta lleva ilustracion con texto alternativo, titulo y temas', () => {
    const slides = section.split('<li class="session-slide').slice(1);

    expect(slides).toHaveLength(8);
    slides.forEach((slide) => {
      expect(slide).toMatch(/<img[^>]*width="1400"[^>]*height="1365"[^>]*\balt="[^"]+"|<img[^>]*\balt="[^"]+"[^>]*width="1400"/);
      expect(slide).toMatch(/<h3\b/);
      expect(count(slide, classed('session-slide-topics'))).toBe(1);
    });
  });

  it('las ocho ilustraciones son distintas', () => {
    const sources = [...section.matchAll(/<img[^>]*class="session-slide-art"[^>]*src="([^"]+)"/g)].map((match) => match[1]);

    expect(new Set(sources).size).toBe(8);
  });

  it('no repite los seis modulos ni el cierre bajo el carrusel y conserva el boton de inscripcion', () => {
    expect(count(section, classed('syllabus-module'))).toBe(0);
    expect(section).not.toContain('Entiendes cómo funciona la IA por dentro');
    expect(section).not.toContain('syllabus-outcome');
    expect(section).not.toContain('Vas a desarrollar la habilidad de usar cualquier IA');
    expect(section).toMatch(/<a[^>]*href="#inscripcion"[^>]*>[\s\S]*Inscribirme al programa/);
  });

  it('el CSS publicado define los tokens del carrusel', async () => {
    const files = await readdir(path.join(dist, '_astro'));
    const sheets = await Promise.all(files.filter((file) => file.endsWith('.css')).map((file) => readFile(path.join(dist, '_astro', file), 'utf8')));
    const css = [page, ...sheets].join('\n');

    expect(css).toContain('--slider-btn');
    expect(css).toContain('--books-item-w');
  });

  it('el minificador conserva el giro y el aplastamiento de los botones del carrusel', async () => {
    const files = await readdir(path.join(dist, '_astro'));
    const sheets = await Promise.all(files.filter((file) => file.endsWith('.css')).map((file) => readFile(path.join(dist, '_astro', file), 'utf8')));
    const css = [page, ...sheets].join('\n');

    expect(css).toMatch(/\.btn-text\{[^}]*--cta-turn:-16deg/);
    expect(css).toMatch(/rotate:var\(--cta-turn,\s*0deg\)/);
    expect(css).toMatch(/\.slider-arrow-bg[^{]*\{[^}]*--arrow-squash:\.955 \.925/);
    expect(css).toMatch(/scale:var\(--arrow-squash,\s*1\)/);
  });
});
