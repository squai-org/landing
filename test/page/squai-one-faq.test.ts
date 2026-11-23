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

  it('cubre todo el ancho: la seccion no va dentro de un contenedor con ancho maximo', () => {
    const before = page.slice(0, page.indexOf('<section id="faq"'));
    const opening = before.slice(before.lastIndexOf('<div'));

    expect(opening).not.toContain('content-shell');
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

  it('filtra por categoria con botones, empezando por Todas', () => {
    const section = faqSection(page);
    const filters = [...section.matchAll(/<button[^>]*data-faq-filter="([^"]*)"[^>]*aria-pressed="(true|false)"[^>]*>/g)];

    expect(filters.map((match) => match[1])).toEqual(['all', 'faq-group-0', 'faq-group-1', 'faq-group-2']);
    expect(filters.map((match) => match[2])).toEqual(['true', 'false', 'false', 'false']);
    expect(section).not.toMatch(/<a class="[^"]*faq-category/);
    filters.slice(1).forEach((match) => expect(section).toContain(`id="${match[1]}"`));
  });

  it('la primera pregunta llega abierta y las demas cerradas', () => {
    const section = faqSection(page);
    const states = [...section.matchAll(/data-faq-toggle="\d+"[^>]*aria-expanded="(true|false)"/g)].map((match) => match[1]);

    expect(states[0]).toBe('true');
    expect(states.slice(1).every((state) => state === 'false')).toBe(true);
    expect(section.match(/data-faq-panel="\d+"[^>]*\bhidden\b/g)?.length).toBe(states.length - 1);
  });

  it('el signo es un icono que gira y no cambia de caracter', () => {
    const section = faqSection(page);

    expect(section).not.toMatch(/data-faq-sign="\d+"[^>]*>\s*[+−]\s*</);
    expect(section.match(/data-faq-sign=/g)?.length).toBe(section.match(/data-faq-toggle=/g)?.length);
  });

  it('la seccion lleva el fondo que respira y la escala de la pagina', () => {
    const start = page.indexOf('<section id="faq"');
    const open = page.slice(start, page.indexOf('>', start));

    expect(open).toContain('one-u');
    expect(faqSection(page)).toContain('data-one-backdrop');
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
    expect(section).not.toContain('data-faq-filter');
    expect(section.match(/data-faq-toggle=/g)?.length).toBeGreaterThan(3);
  });
});
