import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const dist = path.join(import.meta.dirname, '../../dist');

const readDist = async (file: string) => {
  try {
    return await readFile(path.join(dist, file), 'utf8');
  } catch {
    throw new Error(`Falta dist/${file}: ejecuta pnpm build antes de pnpm test:dist`);
  }
};

const jsonLdNodes = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap((block) => {
    const parsed = JSON.parse(block[1] ?? '');
    return parsed['@graph'] ?? [parsed];
  }) as Record<string, unknown>[];

const faqSection = (html: string) => {
  const start = html.indexOf('<section id="faq"');
  return html.slice(start, html.indexOf('</section>', start));
};

describe('Squai One: preguntas frecuentes por categoria', () => {
  let page = '';

  beforeAll(async () => {
    page = await readDist('servicios/squai-one.html');
  });

  it('agrupa las preguntas bajo un encabezado por categoria', () => {
    const section = faqSection(page);
    const groups = [...section.matchAll(/<h3 id="faq-group-\d+-title"[^>]*>([^<]+)</g)].map((match) => match[1]);

    expect(groups).toEqual(['Programa', 'Requisitos', 'Inscripción y pagos']);
    expect(section.match(/<h4\b/g)?.length).toBe(section.match(/data-faq-toggle=/g)?.length);
  });

  it('cada pregunta enlaza su boton con su panel y los indices no se repiten', () => {
    const section = faqSection(page);
    const toggles = [...section.matchAll(/data-faq-toggle="(\d+)"[^>]*aria-controls="faq-panel-(\d+)"/g)];
    const panels = [...section.matchAll(/data-faq-panel="(\d+)"/g)].map((match) => match[1]);

    expect(toggles.length).toBeGreaterThan(0);
    expect(toggles.every((match) => match[1] === match[2])).toBe(true);
    expect(new Set(panels).size).toBe(panels.length);
    expect(panels.sort()).toEqual(toggles.map((match) => match[1]).sort());
  });

  it('enlaza cada categoria desde la lista lateral', () => {
    const section = faqSection(page);
    const links = [...section.matchAll(/<a class="[^"]*faq-category[^"]*" href="#(faq-group-\d+)"/g)].map((match) => match[1]);

    expect(links).toHaveLength(3);
    links.forEach((id) => expect(section).toContain(`id="${id}"`));
  });

  it('la pregunta de las clases ya no dice 5 horas semanales ni escribe fechas', () => {
    const answer = faqSection(page);

    expect(answer).not.toMatch(/5 horas/);
    expect(answer).toMatch(/4 semanas/);
    expect(answer).toMatch(/2 horas y media/);
    expect(answer).not.toMatch(/\b(enero|febrero|marzo)\b/i);
  });

  it('el JSON-LD de preguntas frecuentes no publica fechas, horarios ni precios', () => {
    const faq = jsonLdNodes(page).find((node) => node['@type'] === 'FAQPage');
    const text = JSON.stringify(faq);

    expect(faq).toBeDefined();
    expect(text).not.toMatch(/\$|COP|USD|\d{1,2}:\d{2}|\b(?:lunes|martes|jueves|enero|febrero|2026|2027)\b/i);
  });

  it('no deja secciones duplicadas del orden de Notion', () => {
    const ids = ['para-quien', 'como-funciona', 'temario', 'inscripcion', 'faq'];
    const positions = ids.map((id) => page.indexOf(`id="${id}"`));

    expect(positions.every((position) => position > -1)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    ids.forEach((id) => expect(page.match(new RegExp(`<section id="${id}"`, 'g'))?.length ?? 1).toBe(1));
    expect(page).not.toMatch(/class="[^"]*(?:payback-shell|capabilities-grid|service-bento-grid)/);
  });
});

describe('Inicio: preguntas frecuentes sin categorias', () => {
  it('conserva la lista plana de siempre', async () => {
    const section = faqSection(await readDist('index.html'));

    expect(section).not.toContain('faq-group-');
    expect(section).not.toContain('faq-categories');
    expect(section.match(/data-faq-toggle=/g)?.length).toBeGreaterThan(3);
  });
});
